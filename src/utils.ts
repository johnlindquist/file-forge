// src/utils.ts

import { promises as fsPromises, readFileSync, accessSync } from "node:fs";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { parse } from "jsonc-parser";
import { FfgConfig } from "./types.js";

/** Asynchronously check if a file/directory exists */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fsPromises.access(path);
    return true;
  } catch {
    return false;
  }
}

/** Parse comma‑separated and repeated patterns into an array */
export function parsePatterns(input?: (string | number)[]): string[] {
  if (!input || input.length === 0) return [];
  const splitted: string[] = [];
  for (const val of input) {
    const strVal = String(val);
    if (strVal.includes(",")) {
      splitted.push(
        ...strVal
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } else {
      splitted.push(strVal.trim());
    }
  }
  return splitted.filter(Boolean);
}

/** Get a hashed version of a source string */
export function getHashedSource(source: string): string {
  return createHash("md5").update(String(source)).digest("hex").slice(0, 6);
}

/** Load ffg.config.jsonc or ffg.config.json from the cwd */
export function loadFfgConfig(cwd: string): FfgConfig | null {
  // Check for test environment variable first
  if (process.env["FFG_TEST_CONFIG"]) {
    try {
      return JSON.parse(process.env["FFG_TEST_CONFIG"]) as FfgConfig;
    } catch (error) {
      console.warn(`Warning: Could not parse FFG_TEST_CONFIG: ${error instanceof Error ? error.message : String(error)}`);
      // Continue to file-based loading if parsing fails
    }
  }

  const jsoncPath = path.join(cwd, "ffg.config.jsonc");
  const jsonPath = path.join(cwd, "ffg.config.json");
  let configContent: string | null = null;
  let configPath = "";

  try {
    if (fileExistsSync(jsoncPath)) {
      configContent = readFileSync(jsoncPath, "utf8");
      configPath = jsoncPath;
    } else if (fileExistsSync(jsonPath)) {
      configContent = readFileSync(jsonPath, "utf8");
      configPath = jsonPath;
    }
  } catch (error) {
    console.warn(`Warning: Could not read config file at ${configPath || 'ffg.config.json(c)'}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  if (!configContent) return null;

  try {
    // Use jsonc-parser to handle comments
    return parse(configContent) as FfgConfig;
  } catch (error) {
    console.error(`Error parsing config file ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Helper sync function to check file existence (used only within loadFfgConfig)
function fileExistsSync(filePath: string): boolean {
  try {
    accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}
