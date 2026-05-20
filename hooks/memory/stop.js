#!/usr/bin/env bun
/**
 * Stop hook — parse transcript → write summary to DB (no API calls)
 * Input (stdin): { session_id, cwd, transcript_path }
 *
 * request   = first_prompt from sessions table (what the user came to do)
 * completed = last assistant reply + files modified during session
 */
import { getConfig, isToolEnabled } from "../../lib/config.js";
import { homedir } from "os";
import { basename } from "path";
import { readFileSync } from "fs";

if (!isToolEnabled("memory")) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

const cfg = getConfig();
if (cfg.tools.memory.dbPath) {
  process.env.CLAUDE_KIT_DB_PATH = cfg.tools.memory.dbPath.replace(
    /^~/,
    homedir(),
  );
}

const { upsertSession, saveSummary, completeSession } = await import("./db.js");

const input = JSON.parse(await Bun.stdin.text().catch(() => "{}"));
const { session_id, cwd, transcript_path } = input;

if (!session_id || !transcript_path) {
  console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

try {
  const project = basename(cwd ?? process.cwd());

  const lines = readFileSync(transcript_path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // All assistant tool uses
  const allToolUses = lines
    .filter((l) => l.type === "assistant")
    .flatMap((l) => {
      const content = l.message?.content ?? l.content ?? [];
      return Array.isArray(content)
        ? content.filter((b) => b?.type === "tool_use")
        : [];
    });

  const toolNames = [
    ...new Set(allToolUses.map((b) => b.name).filter(Boolean)),
  ].join(", ");

  // Files modified — from Write/Edit/NotebookEdit tool inputs
  const writeTools = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
  const filesModified = [
    ...new Set(
      allToolUses
        .filter((b) => writeTools.has(b.name))
        .map((b) => b.input?.file_path || b.input?.path || "")
        .filter(Boolean),
    ),
  ];

  // Last assistant reply (strip system-reminder noise)
  const asstMsgs = lines.filter((l) => l.type === "assistant");
  const lastAsstText =
    extractText(asstMsgs.at(-1)?.message ?? asstMsgs.at(-1))
      ?.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
      ?.trim()
      ?.slice(0, 600) ?? "";

  let completed = lastAsstText;
  if (filesModified.length > 0) {
    completed += `\n\nFiles modified: ${filesModified.join(", ")}`;
  }
  completed = completed.slice(0, 1000);

  // request = first_prompt recorded at session init (what they came to do)
  const row = upsertSession(session_id, project, "");
  const request = row.first_prompt ?? "";

  saveSummary(row.id, project, request, completed, toolNames);
  completeSession(session_id);
} catch {
  // silent — never block session end
}

console.log(JSON.stringify({ continue: true, suppressOutput: true }));

function extractText(msg) {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) {
    return msg
      .filter((b) => b?.type === "text")
      .map((b) => b.text ?? "")
      .join(" ")
      .trim();
  }
  if (msg.content) return extractText(msg.content);
  if (msg.text) return msg.text;
  return "";
}
