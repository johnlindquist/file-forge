import { promises as fs } from "node:fs";
import { FILE_SIZE_MESSAGE } from "./constants.js";

/**
 * More robust check to determine if a file is likely binary
 * by examining a sample of bytes and checking for binary characteristics
 * 
 * @param buffer - The buffer to check
 * @param filePath - Optional file path to check extension
 * @returns True if the file is likely binary, false otherwise
 */
export function isBinaryFile(buffer: Buffer, filePath?: string): boolean {
  // Check file extension first if path is provided
  if (filePath) {
    const lowerPath = filePath.toLowerCase();
    // Common text file extensions
    const textExtensions = [
      '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.json', '.css', '.scss',
      '.html', '.xml', '.yml', '.yaml', '.toml', '.ini', '.conf', '.sh',
      '.bash', '.zsh', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.cs',
      '.go', '.rs', '.php', '.pl', '.sql', '.graphql', '.prisma', '.vue',
      '.svelte', '.astro', '.mjs', '.cjs', '.log'
    ];

    // If it has a known text extension, it's very likely not binary
    if (textExtensions.some(ext => lowerPath.endsWith(ext))) {
      return false;
    }

    // Common binary file extensions
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff',
      '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.exe', '.dll', '.so',
      '.dylib', '.bin', '.dat', '.db', '.sqlite', '.mp3', '.mp4', '.avi',
      '.mov', '.mkv', '.wav', '.flac', '.ogg', '.woff', '.woff2', '.ttf',
      '.otf', '.eot', '.class', '.pyc', '.o', '.a', '.lib', '.obj'
    ];

    // If it has a known binary extension, it's very likely binary
    if (binaryExtensions.some(ext => lowerPath.endsWith(ext))) {
      return true;
    }
  }

  // For files without recognized extensions or when path isn't provided,
  // analyze content more carefully

  // Sample size - check more bytes for larger files
  const sampleSize = Math.min(buffer.length, 8192); // Check up to 8KB

  if (sampleSize === 0) return false; // Empty file is not binary

  // Count binary characters
  let binaryCharCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Check for null bytes or control characters (except common ones like newline, tab, etc.)
    if (byte !== undefined && (byte === 0 || (byte < 32 && ![9, 10, 13].includes(byte)))) {
      binaryCharCount++;
    }
  }

  // Calculate percentage of binary characters
  const binaryRatio = binaryCharCount / sampleSize;

  // If more than 10% of sampled bytes are binary, consider it a binary file
  // This threshold helps avoid false positives for large text files
  return binaryRatio > 0.1;
}

/**
 * Reads the content of a file with standardized header and
 * checks: if the file exceeds maxSize or is binary.
 *
 * @param filePath - The absolute (or resolved) file path to read.
 * @param maxSize - Maximum file size in bytes.
 * @param displayPath - The path to display in the header (relative or full path).
 * @param options - Optional configuration object
 * @param options.skipHeader - If true, skips adding the file header
 * @returns A Promise resolving to a string with the file header and either its content or an appropriate placeholder.
 */
export async function getFileContent(
  filePath: string,
  maxSize: number,
  displayPath: string,
  options?: { skipHeader?: boolean }
): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);

    if (stat.size > maxSize) {
      if (process.env["DEBUG"]) {
        console.log(
          `[DEBUG] File too large: ${filePath} (${stat.size} bytes > ${maxSize} bytes)`
        );
      }
      return options?.skipHeader
        ? `[${FILE_SIZE_MESSAGE(stat.size)}]`
        : `================================\nFile: ${displayPath}\n================================\n[${FILE_SIZE_MESSAGE(stat.size)}]`;
    }

    // Read file as buffer first to check if it's binary
    const buffer = await fs.readFile(filePath);

    // Check if the file is binary
    if (isBinaryFile(buffer, filePath)) {
      if (process.env["DEBUG"]) {
        console.log(`[DEBUG] Binary file detected: ${filePath}`);
      }
      return options?.skipHeader
        ? `[Binary file - content not displayed]`
        : `================================\nFile: ${displayPath}\n================================\n[Binary file - content not displayed]`;
    }

    // If not binary, convert to string
    const content = buffer.toString('utf8');
    return options?.skipHeader
      ? content
      : `================================\nFile: ${displayPath}\n================================\n${content}`;
  } catch (error) {
    if (process.env["DEBUG"]) {
      console.error(`[DEBUG] Error reading file ${filePath}:`, error);
    }
    return options?.skipHeader
      ? `[Error reading file: ${error instanceof Error ? error.message : String(error)}]`
      : `================================\nFile: ${displayPath}\n================================\n[Error reading file: ${error instanceof Error ? error.message : String(error)}]`;
  }
}
