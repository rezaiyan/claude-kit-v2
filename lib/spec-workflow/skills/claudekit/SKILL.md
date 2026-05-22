---
name: claudekit
description: Manage claude-kit-v2 tools — show current config and toggle memory, notify, quality, or spec on/off
---

# claudekit — Tool Manager

Read `~/.claude-kit/config.json` and show the current state of all tools. If the file doesn't exist, treat all tools as their defaults (memory: on, notify: on, quality: on, spec: off).

## Step 1 — Show current state

Display a table:

| Tool | Status | Default |
|------|--------|---------|
| memory | on/off | on |
| notify | on/off | on |
| quality | on/off | on |
| spec | on/off | off |

## Step 2 — Ask what to change

Ask: "Which tool do you want to toggle, or type 'done' to exit?"

## Step 3 — Apply change

Edit `~/.claude-kit/config.json` to toggle the requested tool. Preserve all other fields. If the file doesn't exist, create it with full defaults then apply the change.

Config structure:

```json
{
  "version": 1,
  "tools": {
    "memory": { "enabled": true },
    "notify": { "enabled": true },
    "quality": { "enabled": true },
    "spec": { "enabled": false }
  }
}
```

After editing, confirm the change and show the updated table. Repeat from Step 2 until user says done.
