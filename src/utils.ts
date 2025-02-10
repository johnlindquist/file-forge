// src/utils.ts

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";

/** Asynchronously check if a file/directory exists */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
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
