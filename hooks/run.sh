#!/bin/sh
# Bootstrap Bun if not installed, then run a hook script.
# Usage: sh hooks/run.sh <hook-script.js>

export PATH="$HOME/.bun/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  # Install Bun silently — don't pollute hook stdout (Claude reads it as JSON)
  if ! curl -fsSL https://bun.sh/install | sh >/dev/null 2>&1; then
    echo '{"error":"claudekit: Bun install failed. Install manually: https://bun.sh"}' >&2
    exit 0  # exit 0 so Claude Code does not block on hook failure
  fi
  export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo '{"error":"claudekit: bun not found after install. Open a new terminal and try again."}' >&2
  exit 0
fi

exec bun "$@"
