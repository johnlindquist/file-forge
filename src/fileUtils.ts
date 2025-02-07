import { promises as fs } from "node:fs";

/**
 * Reads the content of a file with standardized header and
 * checks: if the file exceeds maxSize.
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
): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);

    if (stat.size > maxSize) {
      console.log(
        `[DEBUG] File too large: ${filePath} (${stat.size} bytes > ${maxSize} bytes)`
      );
      return `================================\nFile: ${fileName}\n================================\n[Content ignored: file too large]`;
    }

    const content = await fs.readFile(filePath, "utf8");
    return `================================\nFile: ${fileName}\n================================\n${content}`;
  } catch (error) {
    console.error(`[DEBUG] Error reading file ${filePath}:`, error);
    return `================================\nFile: ${fileName}\n================================\n[Error reading file: ${
      error instanceof Error ? error.message : String(error)
    }]`;
  }
}
