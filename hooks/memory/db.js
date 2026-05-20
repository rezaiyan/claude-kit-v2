#!/usr/bin/env bun
/**
 * DB layer — bun:sqlite, no native deps
 * DB: ~/.claude-kit/memory.db
 *
 * Schema (v1) — column names kept compatible with claude-kit v1:
 *   sessions      — one row per Claude Code session
 *   summaries     — one summary per session (written at Stop)
 *   summaries_fts — FTS5 index for full-text search
 *
 * summaries.request   = first user prompt (what they came to do)
 * summaries.completed = last assistant reply + files modified
 * summaries.created_at = when summary was written
 */
import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const DB_DIR = process.env.CLAUDE_KIT_DB_PATH
  ? join(process.env.CLAUDE_KIT_DB_PATH, "..")
  : join(homedir(), ".claude-kit");
const DB_PATH = process.env.CLAUDE_KIT_DB_PATH ?? join(DB_DIR, "memory.db");

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db) {
  const { user_version: v } = db.query("PRAGMA user_version").get();
  if (v >= 1) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT UNIQUE NOT NULL,
      project      TEXT NOT NULL,
      first_prompt TEXT,
      status       TEXT DEFAULT 'active',
      created_at   TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS summaries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      project    TEXT NOT NULL,
      request    TEXT,      -- first user prompt (what they came to do)
      completed  TEXT,      -- last assistant reply + files modified
      tools_used TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
      project, request, completed, tools_used,
      content=summaries,
      content_rowid=id
    )
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS summaries_ai AFTER INSERT ON summaries BEGIN
      INSERT INTO summaries_fts(rowid, project, request, completed, tools_used)
      VALUES (new.id, new.project, new.request, new.completed, new.tools_used);
    END
  `);
  db.run(`
    CREATE TRIGGER IF NOT EXISTS summaries_au AFTER UPDATE ON summaries BEGIN
      INSERT INTO summaries_fts(summaries_fts, rowid, project, request, completed, tools_used)
      VALUES ('delete', old.id, old.project, old.request, old.completed, old.tools_used);
      INSERT INTO summaries_fts(rowid, project, request, completed, tools_used)
      VALUES (new.id, new.project, new.request, new.completed, new.tools_used);
    END
  `);
  db.run(`
    CREATE TRIGGER IF NOT EXISTS summaries_ad AFTER DELETE ON summaries BEGIN
      INSERT INTO summaries_fts(summaries_fts, rowid, project, request, completed, tools_used)
      VALUES ('delete', old.id, old.project, old.request, old.completed, old.tools_used);
    END
  `);

  db.run("PRAGMA user_version = 1");
}

/** Get or create session. Returns the full row (id + first_prompt). */
export function upsertSession(sessionId, project, firstPrompt) {
  const db = getDb();
  db.run(
    `INSERT OR IGNORE INTO sessions (session_id, project, first_prompt)
     VALUES (?, ?, ?)`,
    [sessionId, project, firstPrompt ?? ""],
  );
  return db
    .query("SELECT id, first_prompt FROM sessions WHERE session_id = ?")
    .get(sessionId);
}

/** Mark session complete. */
export function completeSession(sessionId) {
  const db = getDb();
  db.run(
    `UPDATE sessions SET status = 'completed', completed_at = datetime('now')
     WHERE session_id = ?`,
    [sessionId],
  );
}

/** Write session summary. Called once from Stop hook. */
export function saveSummary(
  sessionDbId,
  project,
  request,
  completed,
  toolsUsed,
) {
  const db = getDb();
  db.run(
    `INSERT INTO summaries (session_id, project, request, completed, tools_used)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionDbId, project, request, completed, toolsUsed],
  );
}

/** Fetch last N summaries for a project, newest first. */
export function getRecentSummaries(project, limit = 5) {
  const db = getDb();
  return db
    .query(
      `SELECT project, request, completed, tools_used, created_at AS summary_at
     FROM summaries
     WHERE project = ?
     ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(project, limit);
}

/** FTS search across all summaries. */
export function searchSummaries(query, limit = 10) {
  const db = getDb();
  return db
    .query(
      `SELECT s.project, s.request, s.completed, s.tools_used, s.created_at AS summary_at
     FROM summaries_fts
     JOIN summaries s ON s.id = summaries_fts.rowid
     WHERE summaries_fts MATCH ?
     ORDER BY rank LIMIT ?`,
    )
    .all(query, limit);
}
