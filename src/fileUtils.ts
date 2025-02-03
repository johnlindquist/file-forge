import { promises as fs } from "node:fs";
import { isLikelyTextFile } from "./ingest.js";

/**
 * Reads the content of a file with standardized header and
 * checks: if the file exceeds maxSize, or if it isn't a text file.
 *
 * @param filePath - The absolute (or resolved) file path.
 * @param maxSize - Maximum file size in bytes.
 * @param fileName - The name of the file (for header formatting).
 * @returns A Promise resolving to a string with the file header and either its content or an appropriate placeholder.
 */
export async function getFileContent(
  filePath: string,
  maxSize: number,
  fileName: string
): Promise<string> {
  const header = `================================\nFile: ${fileName}\n================================\n`;
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > maxSize) {
      return header + "[Content ignored: file too large]";
    } else if (await isLikelyTextFile(filePath)) {
      const content = await fs.readFile(filePath, "utf8");
      return header + content;
    } else {
      return header + "[Content ignored or non‑text file]";
    }
  } catch (error) {
    console.error(`[DEBUG] Error reading file ${filePath}:`, error);
    return header + "[Error reading file]";
  }
}
