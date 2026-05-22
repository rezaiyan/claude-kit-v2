#!/bin/sh
# claude-kit-v2 installer — works even if Bun is not installed.

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun not found — installing..."
  curl -fsSL https://bun.sh/install | sh
  export PATH="$HOME/.bun/bin:$PATH"
fi

bun run install
