import { promises as fs } from "node:fs";
import { FILE_SIZE_MESSAGE } from "./constants.js";

/**
 * Simple check to determine if a file is likely binary
 * by examining the first few bytes for null bytes or non-printable characters
 * 
 * @param buffer - The buffer to check
 * @returns True if the file is likely binary, false otherwise
 */
export function isBinaryFile(buffer: Buffer): boolean {
  // Check for null bytes or non-printable characters in the first 1024 bytes
  const sampleSize = Math.min(buffer.length, 1024);
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Check for null bytes or control characters (except common ones like newline, tab, etc.)
    if (byte !== undefined && (byte === 0 || (byte < 32 && ![9, 10, 13].includes(byte)))) {
      return true;
    }
  }
  return false;
}

/**
 * Reads the content of a file with standardized header and
 * checks: if the file exceeds maxSize or is binary.
 *
 * @param filePath - The absolute (or resolved) file path to read.
 * @param maxSize - Maximum file size in bytes.
 * @param displayPath - The path to display in the header (relative or full path).
 * @returns A Promise resolving to a string with the file header and either its content or an appropriate placeholder.
 */
export async function getFileContent(
  filePath: string,
  maxSize: number,
  displayPath: string
): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);

    if (stat.size > maxSize) {
      if (process.env["DEBUG"]) {
        console.log(
          `[DEBUG] File too large: ${filePath} (${stat.size} bytes > ${maxSize} bytes)`
        );
      }
      return `================================\nFile: ${displayPath}\n================================\n[${FILE_SIZE_MESSAGE(
        stat.size
      )}]`;
    }

    // Read file as buffer first to check if it's binary
    const buffer = await fs.readFile(filePath);

    // Check if the file is binary
    if (isBinaryFile(buffer)) {
      if (process.env["DEBUG"]) {
        console.log(`[DEBUG] Binary file detected: ${filePath}`);
      }
      return `================================\nFile: ${displayPath}\n================================\n[Binary file - content not displayed]`;
    }

    // If not binary, convert to string
    const content = buffer.toString('utf8');
    return `================================\nFile: ${displayPath}\n================================\n${content}`;
  } catch (error) {
    if (process.env["DEBUG"]) {
      console.error(`[DEBUG] Error reading file ${filePath}:`, error);
    }
    return `================================\nFile: ${displayPath}\n================================\n[Error reading file: ${error instanceof Error ? error.message : String(error)
      }]`;
  }
}
