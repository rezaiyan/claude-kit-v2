#!/bin/sh
# claude-kit-v2 uninstaller
# Works piped from curl or run from inside the cloned repo.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rezaiyan/claude-kit-v2/main/uninstall.sh | sh
#   — or —
#   cd claude-kit-v2 && sh uninstall.sh

set -e

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun not found — installing to run uninstall script..."
  curl -fsSL https://bun.sh/install | sh
  export PATH="$HOME/.bun/bin:$PATH"
fi

REPO_DIR="$HOME/.claude-kit-v2-src"

if [ ! -f "package.json" ]; then
  if [ -d "$REPO_DIR" ]; then
    cd "$REPO_DIR"
  else
    echo "Cloning claude-kit-v2..."
    git clone --depth 1 https://github.com/rezaiyan/claude-kit-v2.git "$REPO_DIR"
    cd "$REPO_DIR"
  fi
fi

bun run uninstall
