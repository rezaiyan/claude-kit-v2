#!/bin/sh
# claudekit uninstaller — no runtime dependencies required
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/uninstall.sh | sh
#   — or —
#   sh ~/.claudekit-src/uninstall.sh

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
skip()   { printf "  ${DIM}–${RESET} %s\n" "$1"; }
info()   { printf "  ${CYAN}→${RESET} %s\n" "$1"; }
warn()   { printf "  ${YELLOW}!${RESET} %s\n" "$1"; }
section() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
  printf "${DIM}%s${RESET}\n" "$(printf '%0.s─' $(seq 1 ${#1}))"
}

SETTINGS="$HOME/.claude/settings.json"
ZSHRC="$HOME/.zshrc"
MARKER="# added by claudekit"
REMOVED_COUNT=0

# ── Banner ────────────────────────────────────────────────────────────────────

printf "\n"
printf "  ${BOLD}claudekit — uninstaller${RESET}\n"
printf "  ${DIM}Removing plugin, command, and PATH entries${RESET}\n\n"

# ── 1. Claude Code settings ───────────────────────────────────────────────────

section "Claude Code Settings"

if [ ! -f "$SETTINGS" ]; then
  skip "~/.claude/settings.json not found — nothing to remove"
elif ! command -v python3 >/dev/null 2>&1; then
  warn "python3 not found — skipping settings.json cleanup"
  warn "Manually remove 'claude-kit-v2' entries from $SETTINGS"
else
  python3 - "$SETTINGS" <<'PYEOF'
import json, sys

path = sys.argv[1]
with open(path) as f:
    settings = json.load(f)

removed = []

mp = settings.get("extraKnownMarketplaces", {})
if "claude-kit-v2" in mp:
    old_path = mp["claude-kit-v2"].get("source", {}).get("path", "?")
    del mp["claude-kit-v2"]
    removed.append(f"extraKnownMarketplaces.claude-kit-v2  ({old_path})")

ep = settings.get("enabledPlugins", {})
for key in list(ep.keys()):
    if "claude-kit-v2" in key:
        del ep[key]
        removed.append(f"enabledPlugins.{key}")

if removed:
    with open(path, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")
    print(f"  \033[0;32m✓\033[0m Cleaned up settings.json")
    for r in removed:
        print(f"    \033[2m- {r}\033[0m")
else:
    print(f"  \033[2m–\033[0m No claudekit entries found in settings.json")
PYEOF
fi

# ── 2. claudekit command ──────────────────────────────────────────────────────

section "Command"

FOUND_CMD=false
for d in "$HOME/.local/bin" "$HOME/bin" "$HOME/.bun/bin"; do
  if [ -f "$d/claudekit" ]; then
    rm "$d/claudekit"
    ok "Removed command"
    detail "$d/claudekit"
    FOUND_CMD=true
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  fi
done

if [ "$FOUND_CMD" = false ]; then
  skip "No claudekit command found in standard bin directories"
fi

# ── 3. PATH entry ─────────────────────────────────────────────────────────────

section "Shell PATH"

if [ ! -f "$ZSHRC" ]; then
  skip "~/.zshrc not found"
elif ! grep -q "$MARKER" "$ZSHRC" 2>/dev/null; then
  skip "No claudekit PATH entry in ~/.zshrc"
elif ! command -v python3 >/dev/null 2>&1; then
  warn "python3 not found — skipping .zshrc cleanup"
  warn "Manually remove lines containing '$MARKER' from $ZSHRC"
else
  python3 - "$ZSHRC" "$MARKER" <<'PYEOF'
import sys, re

path, marker = sys.argv[1], sys.argv[2]
with open(path) as f:
    content = f.read()

# Capture what we're removing for the detail line
match = re.search(r'\n' + re.escape(marker) + r'\n(export PATH=.*)\n', content)
removed_line = match.group(1) if match else None

cleaned = re.sub(r'\n' + re.escape(marker) + r'\nexport PATH=.*\n', '\n', content)
if cleaned != content:
    with open(path, 'w') as f:
        f.write(cleaned)
    print(f"  \033[0;32m✓\033[0m Removed PATH entry from ~/.zshrc")
    if removed_line:
        print(f"    \033[2m- {removed_line}\033[0m")
else:
    print(f"  \033[2m–\033[0m Marker found but no matching PATH line — ~/.zshrc unchanged")
PYEOF
fi

# ── 4. Source directory ───────────────────────────────────────────────────────

section "Source Directory"

REPO_DIR="$HOME/.claudekit-src"
if [ ! -d "$REPO_DIR" ]; then
  skip "~/.claudekit-src not found"
else
  printf "  ${DIM}Found source directory at${RESET} ${CYAN}$REPO_DIR${RESET}\n"
  printf "  ${YELLOW}Remove it?${RESET} ${DIM}(keeps TUI deps and git history)${RESET} [y/N] "
  read -r ans
  case "$ans" in
    [yY]*)
      rm -rf "$REPO_DIR"
      ok "Removed source directory"
      detail "$REPO_DIR"
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
      ;;
    *)
      skip "Kept $REPO_DIR"
      ;;
  esac
fi

# ── Summary ───────────────────────────────────────────────────────────────────

printf "\n"
printf "${RED}${BOLD}  ╔══════════════════════════════════╗${RESET}\n"
printf "${RED}${BOLD}  ║   claudekit uninstalled          ║${RESET}\n"
printf "${RED}${BOLD}  ╚══════════════════════════════════╝${RESET}\n"
printf "\n"
printf "  ${BOLD}Restart Claude Code${RESET} for hook changes to take effect.\n"
printf "\n"
printf "  ${DIM}Changed your mind? Reinstall anytime:${RESET}\n"
printf "  ${DIM}curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/install.sh | sh${RESET}\n"
printf "\n"
