#!/bin/sh
# claude-kit-v2 installer
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/install.sh | sh
#   — or —
#   cd claude-kit-v2 && sh install.sh

set -e

export PATH="$HOME/.bun/bin:$PATH"

# ── 1. Bun ────────────────────────────────────────────────────────────────────

if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | sh
  export PATH="$HOME/.bun/bin:$PATH"
fi

# ── 2. Repo ───────────────────────────────────────────────────────────────────
# When piped from curl, there's no local repo — clone it.

REPO_DIR="$HOME/.claude-kit-v2-src"

if [ ! -f "package.json" ]; then
  echo "Cloning claude-kit-v2..."
  rm -rf "$REPO_DIR"
  git clone --depth 1 https://github.com/rezaiyan/claude-kit-v2.git "$REPO_DIR"
  cd "$REPO_DIR"
fi

# ── 3. Install ────────────────────────────────────────────────────────────────

bun run install
