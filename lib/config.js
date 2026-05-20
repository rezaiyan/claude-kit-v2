import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".claude-kit");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULTS = {
  version: 1,
  tools: {
    memory: {
      enabled: true,
      recentSessions: 5,
      dbPath: null,
    },
  },
};

export function getConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const data = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      return {
        ...DEFAULTS,
        ...data,
        tools: {
          ...DEFAULTS.tools,
          ...(data.tools ?? {}),
          memory: {
            ...DEFAULTS.tools.memory,
            ...(data.tools?.memory ?? {}),
          },
        },
      };
    }
  } catch {
    // return defaults on any error
  }
  return structuredClone(DEFAULTS);
}

export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

/** Returns true if a tool is enabled (defaults to true if not configured). */
export function isToolEnabled(tool) {
  try {
    return getConfig().tools?.[tool]?.enabled !== false;
  } catch {
    return true;
  }
}
