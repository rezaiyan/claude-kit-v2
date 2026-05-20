# claude-kit-v2

Claude Code plugin collection. No API calls, no cloud, no tokens wasted.

---

## Plugins

| Plugin | What it does |
|--------|-------------|
| [memory](#memory) | Remembers what you worked on across sessions |

---

## Memory

Cross-session memory for Claude Code. Every time a session ends, it saves what you asked and what Claude did into a local SQLite DB. Next session, the last 5 summaries are injected into context automatically — Claude already knows where you left off.

No LLM calls. No API keys. No token cost at session start.

### How it works

```
Session starts
  └── SessionStart hook fires
        └── Reads last 5 summaries from ~/.claude-kit/memory.db
              └── Injects them as additionalContext (visible to Claude, costs ~200 tokens)

You send first prompt
  └── UserPromptSubmit hook fires
        └── Records your prompt as the session "request" in DB

Claude stops responding
  └── Stop hook fires
        └── Parses transcript → extracts last assistant reply + files modified
              └── Writes summary row to DB

Session closes
  └── SessionEnd hook fires
        └── Marks session as completed
```

### What gets stored

| Field | Content |
|-------|---------|
| `request` | First prompt you sent (truncated to 200 chars) |
| `completed` | Last assistant reply (truncated to 600 chars) + files modified |
| `tools_used` | All tool names used in session (Edit, Bash, Write, …) |
| `project` | Directory name of `cwd` when session started |

DB location: `~/.claude-kit/memory.db`

### What Claude sees at session start

```
## Recent sessions in `myapp`

### Session 1 — 2026-05-20 [Edit, Bash]
**Asked:** implement dark mode via CSS variables
**Done:** Added CSS variable definitions to theme.css and wired them up in App.tsx.

Files modified: src/theme.css, src/App.tsx

### Session 2 — 2026-05-19 [Bash, Read]
**Asked:** why is the login page slow
**Done:** Found N+1 query in UserService.kt. Added eager fetch on roles relation.
```

### Token impact

Memory adds ~200–1700 tokens to every session start (5 summaries × up to 340 tokens each). Sounds like a lot — but Claude Code caches the system prompt, so you only pay full price on turn 1. Turns 2+ are ~10% of that.

The real question is: do you re-brief Claude at the start of sessions? If yes, memory is cheaper — a manual re-brief runs 500–2000 tokens, uncached, every session. If you never give context, memory is pure overhead.

**Rule of thumb:** working on an ongoing project across multiple sessions → memory saves tokens. Quick one-off sessions → it costs a little extra.

### Best practices

**Start sessions with intent.** Your first prompt becomes the `request` field — it's what future-you sees. `fix bug` is useless. `fix the null pointer in PaymentService.processRefund` is useful.

**One task per session when possible.** Memory stores one summary per session. If you switch topics mid-session, only the last assistant reply is captured — the earlier work is invisible.

**Project names are the isolation key.** Memory is scoped by the directory name (not full path). `~/projects/lexicon` and `~/work/lexicon` would share memory. Use distinct directory names per project.

**Check memory before re-explaining context.** Start a session with `what do you know about recent sessions?` to confirm Claude has the right context before diving into a complex task.

**Memory is a hint, not a transcript.** Claude sees a 200-token summary, not a full log. For complex multi-session work, keep a `NOTES.md` in the project for state that needs to survive exactly.

### Inspect the DB

```bash
# Last 5 summaries
sqlite3 ~/.claude-kit/memory.db \
  "SELECT project, request, substr(completed,1,120), created_at FROM summaries ORDER BY created_at DESC LIMIT 5;"

# All sessions for a project
sqlite3 ~/.claude-kit/memory.db \
  "SELECT session_id, status, created_at FROM sessions WHERE project = 'myapp' ORDER BY created_at DESC;"

# Full-text search across all sessions
sqlite3 ~/.claude-kit/memory.db \
  "SELECT project, request FROM summaries_fts WHERE summaries_fts MATCH 'auth login';"
```

### Installation

**Prerequisites:** [Bun](https://bun.sh) — install with `curl -fsSL https://bun.sh/install | bash`.

#### Via Claude Code marketplace (recommended)

Install the plugin through the Claude Code UI. On the first session start, the plugin automatically:

- Installs its dependencies
- Registers the `claudekit` command globally
- Adds `~/.bun/bin` to PATH in `~/.zshrc`

Open a new terminal after that first session, then type `claudekit`.

#### Manual install

```bash
git clone https://github.com/rezaiyan/claude-kit-v2
cd claude-kit-v2
bun install
bun run install
```

Open a new terminal and type `claudekit`.

**Uninstall:**

```bash
bun run uninstall
```

Removes the PATH entry it added and unregisters the command. Never touches PATH config it didn't create.

**Register plugin with Claude Code:**

If installed via the marketplace UI this is automatic. To register manually:

```json
// ~/.claude/settings.json
{
  "extraKnownMarketplaces": {
    "claude-kit-v2": {
      "source": { "source": "directory", "path": "/path/to/claude-kit-v2" }
    }
  },
  "enabledPlugins": {
    "memory@claude-kit-v2": true
  }
}
```

### Run tests

```bash
bun test
```

12 E2E tests. Each spins up an isolated DB in a tmp dir, runs the full hook lifecycle as real child processes, and verifies DB state + hook output.
