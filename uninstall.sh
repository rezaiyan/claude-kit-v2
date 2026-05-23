#!/bin/sh
# claudekit uninstaller — no runtime dependencies required
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/uninstall.sh | sh
#   — or —
#   cd claude-kit-v2 && sh uninstall.sh

set -e

ok()   { printf "  ✓ %s\n" "$1"; }
info() { printf "  → %s\n" "$1"; }

SETTINGS="$HOME/.claude/settings.json"
ZSHRC="$HOME/.zshrc"
MARKER="# added by claudekit"

printf "\n╔══════════════════════════════╗\n"
printf   "║   claudekit uninstaller      ║\n"
printf   "╚══════════════════════════════╝\n\n"

# ── 1. Remove from Claude Code settings ──────────────────────────────────────

if [ -f "$SETTINGS" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$SETTINGS" <<'PYEOF'
import json, sys

path = sys.argv[1]
with open(path) as f:
    settings = json.load(f)

changed = False

mp = settings.get("extraKnownMarketplaces", {})
if "claude-kit-v2" in mp:
    del mp["claude-kit-v2"]
    changed = True

ep = settings.get("enabledPlugins", {})
for key in list(ep.keys()):
    if "claude-kit-v2" in key:
        del ep[key]
        changed = True

if changed:
    with open(path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
    print("  ✓ Removed claudekit from ~/.claude/settings.json")
else:
    print("  ✓ claudekit not found in settings.json (already clean)")
PYEOF
  else
    info "python3 not found — skipping settings.json cleanup"
    info "Manually remove 'claude-kit-v2' entries from $SETTINGS"
  fi
else
  ok "settings.json not found (already clean)"
fi

# ── 2. Remove claudekit command ───────────────────────────────────────────────

for d in "$HOME/.local/bin" "$HOME/bin" "$HOME/.bun/bin"; do
  if [ -f "$d/claudekit" ]; then
    rm "$d/claudekit"
    ok "Removed claudekit from $d"
  fi
done

# ── 3. Remove PATH entry from .zshrc ─────────────────────────────────────────

if [ -f "$ZSHRC" ] && grep -q "$MARKER" "$ZSHRC" 2>/dev/null; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$ZSHRC" "$MARKER" <<'PYEOF'
import sys, re

path, marker = sys.argv[1], sys.argv[2]
with open(path) as f:
    content = f.read()
cleaned = re.sub(r'\n' + re.escape(marker) + r'\nexport PATH=.*\n', '\n', content)
if cleaned != content:
    with open(path, 'w') as f:
        f.write(cleaned)
    print("  ✓ Removed PATH entry from ~/.zshrc")
else:
    print("  ✓ No matching PATH entry found in ~/.zshrc")
PYEOF
  fi
fi

# ── 4. Remove source directory (optional) ────────────────────────────────────

REPO_DIR="$HOME/.claudekit-src"
if [ -d "$REPO_DIR" ]; then
  printf "\n  Remove source directory %s? [y/N] " "$REPO_DIR"
  read -r ans
  case "$ans" in
    [yY]*) rm -rf "$REPO_DIR"; ok "Removed $REPO_DIR" ;;
    *)     ok "Kept $REPO_DIR" ;;
  esac
fi

# ── Done ──────────────────────────────────────────────────────────────────────

printf "\nUninstalled. Restart Claude Code for changes to take effect.\n\n"
