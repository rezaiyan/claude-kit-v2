#!/bin/sh
# claudekit installer — no runtime dependencies required
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/install.sh | sh
#   — or —
#   cd claude-kit-v2 && sh install.sh

set -e

# ── Colors (skip if not a real terminal) ──────────────────────────────────────

if [ -t 1 ]; then
  BOLD='\033[1m'; DIM='\033[2m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
  YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
else
  BOLD=''; DIM=''; GREEN=''; CYAN=''; YELLOW=''; RED=''; RESET=''
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

ok()     { printf "  ${GREEN}✓${RESET} %s\n" "$1"; }
detail() { printf "    ${DIM}%s${RESET}\n" "$1"; }
info()   { printf "  ${CYAN}→${RESET} %s\n" "$1"; }
warn()   { printf "  ${YELLOW}!${RESET} %s\n" "$1"; }
fail()   {
  printf "\n  ${RED}✗ %s${RESET}\n  ${DIM}%s${RESET}\n\n" "$1" "$2"
  exit 1
}
section() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
  printf "${DIM}%s${RESET}\n" "$(printf '%0.s─' $(seq 1 ${#1}))"
}

REPO_DIR="$HOME/.claudekit-src"
SETTINGS="$HOME/.claude/settings.json"
ZSHRC="$HOME/.zshrc"
MARKER="# added by claudekit"

# ── Banner ────────────────────────────────────────────────────────────────────

printf "\n"
printf "${CYAN}${BOLD}  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗${RESET}\n"
printf "${CYAN}${BOLD} ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝${RESET}\n"
printf "${CYAN}${BOLD} ██║     ██║     ███████║██║   ██║██║  ██║█████╗  ${RESET}\n"
printf "${CYAN}${BOLD} ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ${RESET}\n"
printf "${CYAN}${BOLD} ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗${RESET}\n"
printf "${CYAN}${BOLD}  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝${RESET}\n"
printf "\n"
printf "  ${DIM}Quality-of-life hooks for Claude Code${RESET}\n"
printf "  ${DIM}Memory · Notifications · Quality Guards · TUI${RESET}\n\n"

# ── Prereqs ───────────────────────────────────────────────────────────────────

section "Checking requirements"

command -v python3 >/dev/null 2>&1 \
  && ok "python3 found ($(python3 --version 2>&1 | cut -d' ' -f2))" \
  || fail "python3 not found" "Install Python 3 from https://python.org then re-run"

command -v git >/dev/null 2>&1 \
  && ok "git found ($(git --version | cut -d' ' -f3))" \
  || fail "git not found" "Install git then re-run"

# ── 1. Source ─────────────────────────────────────────────────────────────────

section "Step 1 of 3 — Source"

if [ -f "package.json" ] && grep -q '"claudekit"' package.json 2>/dev/null; then
  REPO_DIR="$(pwd)"
  ok "Using current directory as source"
  detail "$REPO_DIR"
elif [ -d "$REPO_DIR/.git" ]; then
  info "Existing install found — pulling latest changes"
  OLD_HEAD=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  git -C "$REPO_DIR" pull --quiet \
    || fail "Failed to update source" "Try: rm -rf $REPO_DIR and re-run"
  NEW_HEAD=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  ok "Source updated"
  if [ "$OLD_HEAD" != "$NEW_HEAD" ]; then
    detail "$OLD_HEAD → $NEW_HEAD"
  else
    detail "Already at latest ($NEW_HEAD)"
  fi
else
  info "Cloning repository..."
  rm -rf "$REPO_DIR"
  git clone --depth 1 https://github.com/rezaiyan/claude-kit-v2.git "$REPO_DIR" --quiet \
    || fail "Failed to clone repo" "Check your internet connection and try again"
  COMMIT=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  ok "Repository cloned"
  detail "$REPO_DIR  ($COMMIT)"
fi

# ── 2. Register Claude Code plugin ────────────────────────────────────────────

section "Step 2 of 3 — Claude Code Plugin"

mkdir -p "$HOME/.claude"

python3 - "$SETTINGS" "$REPO_DIR" <<'PYEOF'
import json, sys, os

settings_path, repo_dir = sys.argv[1], sys.argv[2]

existed = os.path.exists(settings_path)
if existed:
    with open(settings_path) as f:
        settings = json.load(f)
else:
    settings = {}

mp = settings.setdefault("extraKnownMarketplaces", {})
was_registered = "claude-kit-v2" in mp
mp["claude-kit-v2"] = {"source": {"source": "directory", "path": repo_dir}}

ep = settings.setdefault("enabledPlugins", {})
was_enabled = ep.get("claudekit@claude-kit-v2") is True
ep["claudekit@claude-kit-v2"] = True

with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
    f.write("\n")

action = "Updated" if was_registered else "Added"
print(f"  \033[0;32m✓\033[0m Marketplace registered  \033[2m({action})\033[0m")
print(f"    \033[2mextraKnownMarketplaces.claude-kit-v2 → {repo_dir}\033[0m")

action2 = "Already enabled" if was_enabled else "Enabled"
print(f"  \033[0;32m✓\033[0m Plugin enabled  \033[2m({action2})\033[0m")
print(f"    \033[2menabledPlugins.claudekit@claude-kit-v2 = true\033[0m")
PYEOF

# ── 3. claudekit command ──────────────────────────────────────────────────────

section "Step 3 of 3 — Command"

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
  printf "  Installing TUI dependencies (first run only)...\n"
  bun install --cwd "\$CKROOT" --quiet
fi
exec bun "\$CKROOT/bin/tui.js" "\$@"
WRAPPER
chmod +x "$BIN_DIR/claudekit"

EXISTING=$(command -v claudekit 2>/dev/null || echo "")
ok "Command installed"
detail "$BIN_DIR/claudekit"
if [ -n "$EXISTING" ] && [ "$EXISTING" != "$BIN_DIR/claudekit" ]; then
  warn "Another claudekit exists at $EXISTING — yours at $BIN_DIR/claudekit takes priority if $BIN_DIR comes first in PATH"
fi

# PATH update
PATH_ADDED=false
if ! grep -q "$MARKER" "$ZSHRC" 2>/dev/null && ! grep -qF "$BIN_DIR" "$ZSHRC" 2>/dev/null; then
  printf '\n%s\nexport PATH="%s:$PATH"\n' "$MARKER" "$BIN_DIR" >> "$ZSHRC"
  ok "PATH updated"
  detail "Added to ~/.zshrc: export PATH=\"$BIN_DIR:\$PATH\""
  PATH_ADDED=true
else
  ok "PATH already includes $BIN_DIR"
  detail "~/.zshrc unchanged"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

printf "\n"
printf "${GREEN}${BOLD}  ╔══════════════════════════════════════════╗${RESET}\n"
printf "${GREEN}${BOLD}  ║   claudekit installed successfully!      ║${RESET}\n"
printf "${GREEN}${BOLD}  ╚══════════════════════════════════════════╝${RESET}\n"
printf "\n"
printf "  ${BOLD}What was set up:${RESET}\n"
printf "  ${DIM}├─${RESET} Plugin registered in ${CYAN}~/.claude/settings.json${RESET}\n"
printf "  ${DIM}├─${RESET} Command at ${CYAN}$BIN_DIR/claudekit${RESET}\n"
if [ "$PATH_ADDED" = true ]; then
  printf "  ${DIM}├─${RESET} PATH updated in ${CYAN}~/.zshrc${RESET}\n"
fi
printf "  ${DIM}└─${RESET} Source at ${CYAN}$REPO_DIR${RESET}\n"
printf "\n"
printf "  ${BOLD}Next steps:${RESET}\n"
printf "  ${DIM}1.${RESET} ${BOLD}Restart Claude Code${RESET} to activate hooks\n"
printf "  ${DIM}2.${RESET} Open a new terminal and run ${CYAN}${BOLD}claudekit${RESET} to choose tools\n"
printf "\n"
