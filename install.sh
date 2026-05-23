#!/bin/sh
# claudekit installer — no runtime dependencies required
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/install.sh | sh
#   — or —
#   cd claude-kit-v2 && sh install.sh

set -e

ok()   { printf "  ✓ %s\n" "$1"; }
info() { printf "  → %s\n" "$1"; }
fail() { printf "\n  ✗ %s\n    %s\n\n" "$1" "$2"; exit 1; }
step() { printf "\n[%s/%s] %s\n" "$1" "$TOTAL_STEPS" "$2"; }

TOTAL_STEPS=3
REPO_DIR="$HOME/.claudekit-src"
SETTINGS="$HOME/.claude/settings.json"

printf "\n╔══════════════════════════════╗\n"
printf   "║   claudekit installer        ║\n"
printf   "╚══════════════════════════════╝\n"

# ── Prereq check ──────────────────────────────────────────────────────────────

if ! command -v python3 >/dev/null 2>&1; then
  fail "python3 not found" "Install Python 3 from https://python.org then re-run"
fi
if ! command -v git >/dev/null 2>&1; then
  fail "git not found" "Install git then re-run"
fi

# ── 1. Source ─────────────────────────────────────────────────────────────────

step 1 "Locating source"

if [ -f "package.json" ] && grep -q '"claudekit"' package.json 2>/dev/null; then
  REPO_DIR="$(pwd)"
  ok "Running from repo directory ($REPO_DIR)"
elif [ -d "$REPO_DIR/.git" ]; then
  info "Updating existing source in $REPO_DIR"
  git -C "$REPO_DIR" pull --quiet \
    || fail "Failed to update source" "Try: rm -rf $REPO_DIR and re-run"
  ok "Source updated"
else
  info "Cloning claudekit into $REPO_DIR"
  rm -rf "$REPO_DIR"
  git clone --depth 1 https://github.com/rezaiyan/claude-kit-v2.git "$REPO_DIR" --quiet \
    || fail "Failed to clone repo" "Check your internet connection and try again"
  ok "Source cloned to $REPO_DIR"
fi

# ── 2. Register Claude Code plugin ────────────────────────────────────────────

step 2 "Registering Claude Code plugin"

mkdir -p "$HOME/.claude"

python3 - "$SETTINGS" "$REPO_DIR" <<'PYEOF'
import json, sys, os

settings_path, repo_dir = sys.argv[1], sys.argv[2]

if os.path.exists(settings_path):
    with open(settings_path) as f:
        settings = json.load(f)
else:
    settings = {}

# Register marketplace pointing to local directory
mp = settings.setdefault("extraKnownMarketplaces", {})
mp["claude-kit-v2"] = {"source": {"source": "directory", "path": repo_dir}}

# Enable plugin
ep = settings.setdefault("enabledPlugins", {})
ep["claudekit@claude-kit-v2"] = True

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
    f.write("\n")

print("  ✓ Registered in ~/.claude/settings.json")
PYEOF

# ── 3. claudekit command ──────────────────────────────────────────────────────

step 3 "Installing claudekit command"

# Pick install dir — prefer first existing PATH location
BIN_DIR=""
for d in "$HOME/.local/bin" "$HOME/bin" "$HOME/.bun/bin"; do
  if [ -d "$d" ]; then
    BIN_DIR="$d"
    break
  fi
done

if [ -z "$BIN_DIR" ]; then
  mkdir -p "$HOME/.local/bin"
  BIN_DIR="$HOME/.local/bin"
fi

# Write shell wrapper — lazy-installs TUI deps on first run
cat > "$BIN_DIR/claudekit" <<WRAPPER
#!/bin/sh
# claudekit TUI wrapper
export PATH="\$HOME/.bun/bin:\$PATH"
if ! command -v bun >/dev/null 2>&1; then
  printf "claudekit: Bun is required for the TUI. Install from https://bun.sh\n" >&2
  exit 1
fi
CKROOT="${REPO_DIR}"
if [ ! -d "\$CKROOT/node_modules" ]; then
  printf "  → Installing TUI dependencies (first run)...\n"
  bun install --cwd "\$CKROOT" --quiet
fi
exec bun "\$CKROOT/bin/tui.js" "\$@"
WRAPPER
chmod +x "$BIN_DIR/claudekit"
ok "claudekit command → $BIN_DIR/claudekit"

# Add to PATH in .zshrc if not already present
ZSHRC="$HOME/.zshrc"
MARKER="# added by claudekit"
if [ -f "$ZSHRC" ] || [ ! -f "$ZSHRC" ]; then
  if ! grep -q "$MARKER" "$ZSHRC" 2>/dev/null && ! grep -qF "$BIN_DIR" "$ZSHRC" 2>/dev/null; then
    printf '\n%s\nexport PATH="%s:$PATH"\n' "$MARKER" "$BIN_DIR" >> "$ZSHRC"
    ok "Added $BIN_DIR to PATH in ~/.zshrc"
  else
    ok "$BIN_DIR already in ~/.zshrc"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────

printf "\n╔══════════════════════════════════════════╗\n"
printf   "║   claudekit installed successfully!      ║\n"
printf   "╚══════════════════════════════════════════╝\n\n"
printf   "  1. Restart Claude Code to activate hooks.\n"
printf   "  2. Open a new terminal, then run:\n\n"
printf   "       claudekit\n\n"
printf   "     to choose which tools to enable.\n\n"
