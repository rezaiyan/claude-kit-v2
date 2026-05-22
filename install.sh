#!/bin/sh
# claudekit installer
# Works piped from curl or run from inside the cloned repo.

set -e

# ── helpers ───────────────────────────────────────────────────────────────────

ok()   { printf "  ✓ %s\n" "$1"; }
info() { printf "  → %s\n" "$1"; }
fail() { printf "\n  ✗ %s\n\n  %s\n\n" "$1" "$2"; exit 1; }
step() { printf "\n[%s/%s] %s\n" "$1" "$TOTAL_STEPS" "$2"; }

TOTAL_STEPS=3

printf "\n╔══════════════════════════════╗\n"
printf   "║   claudekit installer        ║\n"
printf   "╚══════════════════════════════╝\n"

# ── 1. Bun ────────────────────────────────────────────────────────────────────

step 1 "Checking Bun runtime"
export PATH="$HOME/.bun/bin:$PATH"

if command -v bun >/dev/null 2>&1; then
  ok "Bun $(bun --version) found"
else
  info "Bun not found — installing now (this takes ~10 seconds)"
  if ! curl -fsSL https://bun.sh/install | sh; then
    fail "Bun install failed" "Install manually: https://bun.sh — then re-run this script"
  fi
  export PATH="$HOME/.bun/bin:$PATH"
  if ! command -v bun >/dev/null 2>&1; then
    fail "Bun installed but not found in PATH" "Open a new terminal and re-run: sh install.sh"
  fi
  ok "Bun $(bun --version) installed"
fi

# ── 2. Repo ───────────────────────────────────────────────────────────────────

step 2 "Locating source"
REPO_DIR="$HOME/.claudekit-src"

if [ -f "package.json" ] && grep -q '"claudekit"' package.json 2>/dev/null; then
  ok "Running from repo directory"
else
  if [ -d "$REPO_DIR/.git" ]; then
    info "Updating existing source in $REPO_DIR"
    if ! git -C "$REPO_DIR" pull --quiet; then
      fail "Failed to update source" "Try: rm -rf $REPO_DIR and re-run"
    fi
    ok "Source updated"
  else
    info "Cloning claudekit into $REPO_DIR"
    rm -rf "$REPO_DIR"
    if ! git clone --depth 1 https://github.com/rezaiyan/claudekit.git "$REPO_DIR" --quiet; then
      fail "Failed to clone repo" "Check your internet connection and try again"
    fi
    ok "Source cloned"
  fi
  cd "$REPO_DIR"
fi

# ── 3. Install ────────────────────────────────────────────────────────────────

step 3 "Installing claudekit"

if ! bun run install; then
  fail "Installation failed" "Check the error above. For help: https://github.com/rezaiyan/claudekit/issues"
fi
