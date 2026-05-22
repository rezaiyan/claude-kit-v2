#!/bin/sh
# Bootstrap Bun if not installed, then run a hook script.
# Usage: sh hooks/run.sh <hook-script.js>
#
# This wrapper is the hook command — Claude Code invokes it via sh,
# so it runs even when bun is not yet on PATH.

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | sh >/dev/null 2>&1
  export PATH="$HOME/.bun/bin:$PATH"
fi

exec bun "$@"
