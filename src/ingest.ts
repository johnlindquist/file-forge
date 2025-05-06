// src/ingest.ts

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { resolve, basename, join, relative } from "node:path";
import { globby } from "globby";
import ignore from "ignore";
import { fileExists } from "./utils.js";
import { IngestFlags, ScanStats, TreeNode } from "./types.js";
import { getFileContent, isBinaryFile } from "./fileUtils.js";
import { resetGitRepo } from "./gitUtils.js";
import {
  FILE_SIZE_MESSAGE,
  PROP_SUMMARY,
  PROP_TREE,
  PROP_CONTENT,
  DigestResult,
  PERMANENT_IGNORE_PATTERNS,
  PERMANENT_IGNORE_DIRS,
  APPROX_CHARS_PER_TOKEN,
  DEFAULT_MAX_TOKEN_ESTIMATE,
} from "./constants.js";
import { existsSync as fsExistsSync, lstatSync as fsLstatSync } from "fs";
import * as fsSync from 'node:fs';

/** Converts Windows backslashes to POSIX forward slashes */
const toPosixPath = (p: string): string => p.replace(/\\/g, "/");

/** Constants for ingest */
const DEFAULT_MAX_SIZE = 10 * 1024; // 10MB in KB
const DIR_MAX_DEPTH = 20;

// Define a custom error class for clarity
class TokenLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenLimitExceededError";
  }
}
const DIR_MAX_FILES = 10000;
const DIR_MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB
const ARTIFACT_FILES = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "poetry.lock",
  "*.min.js",
  "*.bundle.js",
  "*.chunk.js",
  "*.map",
  // Image formats
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.bmp",
  "*.tiff",
  "*.webp",
  "*.svg",
  "*.ico",
  // Video formats
  "*.mp4",
  "*.mov",
  "*.avi",
  "*.mkv",
  // Other binary formats
  "*.iso",
  "*.tar",
  "*.tar.gz",
  "*.zip",
  "*.rar",
  "*.7z",
  "*.sqlite",
  "*.db",
  "*.pdf",
  "*.docx",
  "*.xlsx",
  "*.pptx",
];
const DEFAULT_IGNORE = [
  "*.pyc",
  "*.pyo",
  "*.pyd",
  "__pycache__",
  ".pytest_cache",
  ".coverage",
  ".tox",
  "node_modules",
  "bower_components",
  "dist",
  "build",
  "venv",
  ".venv",
  ".git",
];

interface FileContent {
  path: string;
  content: string;
  size: number;
}

/**
 * Normalize gitignore patterns for use with globby
 * This handles leading slashes and other gitignore-specific syntax
 */
function normalizeGitignorePatterns(patterns: string[]): string[] {
  return patterns.map(pattern => {
    // Skip negated patterns (those starting with !)
    if (pattern.startsWith('!')) {
      return pattern;
    }

    // Remove leading slash - in gitignore, a leading slash means the pattern is relative to the .gitignore location
    // but globby expects patterns without leading slashes
    if (pattern.startsWith('/')) {
      pattern = pattern.substring(1);
    }

    // If pattern ends with a slash, it's a directory pattern
    // Add ** to match all files inside that directory
    if (pattern.endsWith('/')) {
      pattern = `${pattern}**`;
    }

    // Handle patterns with /** at the end - don't create additional patterns for these
    // as they're already correctly formatted for globby
    if (pattern.endsWith('/**')) {
      return pattern;
    }

    // If pattern doesn't have any glob characters, make it match both the directory and its contents
    // but only if it doesn't contain path separators (which might indicate a specific file path)
    // and doesn't look like a file extension pattern
    if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
      // Don't add /** to patterns that might be file paths, contain path separators,
      // or look like file extension patterns (starting with *)
      if (!pattern.includes('/') && !pattern.startsWith('*')) {
        return pattern;
      }
    }

    return pattern;
  }).flat();
}

/**
 * Core: Ingest a directory or repository.
 * This function builds a digest by scanning the directory,
 * filtering files, and reading file content.
 */
export async function ingestDirectory(
  basePath: string,
  flags: IngestFlags
): Promise<DigestResult> {
  if (flags.debug) {
    console.log("[DEBUG] ingestDirectory: Starting ingest for", basePath);
    console.log("[DEBUG] Flags:", flags);
  }

  if (flags.branch || flags.commit) {
    await resetRepo(basePath, flags);
  }

  const absoluteIncludes = (flags.include || []).filter((p) => path.isAbsolute(p));
  const externalPaths = new Set(absoluteIncludes);

  try {
    // Process internal structure first
    const { files: internalFiles, tree } = await processFiles(basePath, flags, externalPaths);

    // Process external files
    const externalFiles: FileContent[] = [];
    for (const absPath of absoluteIncludes) {
      try {
        const stat = await fs.stat(absPath);
        if (!stat.isFile()) continue; // Skip directories if specified absolutely

        const content = await getFileContent(
          absPath,
          flags.maxSize ?? DEFAULT_MAX_SIZE,
          absPath, // Use the full absolute path for display
          { skipHeader: false }
        );
        if (content !== null) {
          externalFiles.push({
            path: absPath,
            content,
            size: stat.size,
          });
        }
      } catch (error) {
        if (flags.debug) console.error(`[DEBUG] Error processing external file ${absPath}:`, error);
      }
    }

    const uniqueFiles = [...externalFiles, ...internalFiles];

    // Build summary and content string from uniqueFiles...
    const maxSize = flags.maxSize ?? DEFAULT_MAX_SIZE;
    const stats = { totalFiles: uniqueFiles.length };
    let summary = `Analyzing: ${basePath}
  Max file size: ${maxSize / 1024}KB${flags.branch ? `\nBranch: ${flags.branch}` : ""}${flags.commit ? `\nCommit: ${flags.commit}` : ""}
  ${flags.skipArtifacts ? 'Skipping build artifacts and generated files\n' : ''}Files analyzed: ${stats.totalFiles}`;

    if (absoluteIncludes.length > 0) {
      summary += `\nIncluding external files:\n${absoluteIncludes.join("\n")}`;
    }

    const fileContents = uniqueFiles
      .map((f) => f.content)
      .join("\n\n"); // Use double newline for better separation

    return {
      [PROP_SUMMARY]: summary,
      [PROP_TREE]: tree,
      [PROP_CONTENT]: fileContents,
    };
  } catch (error) {
    // Handle token limit exceeded error
    if (error instanceof TokenLimitExceededError) {
      console.error(`\n❌ Error: Project exceeds the estimated token limit.`);
      console.error(`   ${error.message}`);
      console.error(`   Use the --allow-large flag to process this project anyway.`);
      // Exit gracefully in a way tests can catch
      if (process.env['VITEST'] || process.env['TEST_MODE']) {
        throw new Error(`EXIT_CODE:1: ${error.message}`); // Throw error that test runner can catch
      } else {
        process.exit(1); // Exit normally for CLI usage
      }
    }

    // Re-throw other errors
    if (flags.debug) console.error("[DEBUG] Error in ingestDirectory:", error);
    throw error;
  }
}

/** Reset a Git repository to a specific state */
export async function resetRepo(
  repoPath: string,
  flags: IngestFlags
): Promise<void> {
  await resetGitRepo({
    branch: flags.branch,
    commit: flags.commit,
    useRegularGit: flags.useRegularGit,
    repoPath,
  });
}

/** Recursively scan a directory using async fs operations */
export async function scanDirectory(
  dir: string,
  options: IngestFlags,
  depth = 0,
  stats: ScanStats = { totalFiles: 0, totalSize: 0 }
): Promise<TreeNode | null> {
  if (depth > DIR_MAX_DEPTH) {
    if (options.debug) console.log("[DEBUG] Max depth reached:", dir);
    return null;
  }
  let stat;
  try {
    stat = await fs.lstat(dir);
  } catch {
    return null;
  }
  if (!stat.isDirectory()) return null;
  if (
    stats.totalFiles >= DIR_MAX_FILES ||
    stats.totalSize >= DIR_MAX_TOTAL_SIZE
  ) {
    if (options.debug)
      console.log(
        "[DEBUG] Max files/size reached:",
        stats.totalFiles,
        stats.totalSize
      );
    return null;
  }

  let gitignorePatterns: string[] = [];
  const gitignorePath = join(dir, ".gitignore");
  if ((await fileExists(gitignorePath)) && options.ignore !== false) {
    try {
      const ig = ignore();
      const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
      ig.add(gitignoreContent);
      gitignorePatterns = gitignoreContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));

      // Normalize gitignore patterns for use with globby
      gitignorePatterns = normalizeGitignorePatterns(gitignorePatterns);

      if (options.debug) {
        console.log("[DEBUG] Raw gitignore patterns:", gitignorePatterns);
      }
    } catch { }
  }

  // Handle include patterns correctly
  const patterns = options.include?.length
    ? options.include.map((pattern) => {
      const posixPattern = toPosixPath(pattern); // Convert input pattern first
      // If pattern already contains a star, leave it unchanged.
      if (posixPattern.includes("*")) {
        return posixPattern;
      }

      // Resolve the pattern relative to the base path
      const resolvedPath = resolve(dir, pattern); // Use original pattern for resolving

      // Check if the resolved path exists
      if (fsExistsSync(resolvedPath)) { // Use explicit sync import
        try {
          const stats = fsLstatSync(resolvedPath); // Use explicit sync import
          if (stats.isFile()) {
            // For files, use the exact POSIX path
            return toPosixPath(resolvedPath);
          } else if (stats.isDirectory()) {
            // For directories, include all files within using POSIX path
            return toPosixPath(join(pattern, "**/*")); // Use original pattern for join
          }
        } catch (error) {
          // If an error occurs (e.g., permission error), fallback to default behavior.
          if (options.debug) {
            console.log("[DEBUG] Error checking path:", resolvedPath, error);
          }
          return toPosixPath(join(pattern, "**/*")); // Use original pattern for join
        }
      }

      // Fallback: if the path does not exist, use the heuristic:
      // If pattern does not contain a slash, assume it's a directory.
      // Use the POSIX version for the check
      if (!posixPattern.includes("/")) {
        return toPosixPath(join(pattern, "**/*")); // Use original pattern for join
      }

      return posixPattern; // Return the POSIX version of the original pattern
    })
    : ["**/*", "**/.*"];

  const ignorePatterns =
    options.ignore === false
      ? [...(options.exclude?.map(toPosixPath) ?? [])] // Convert excludes
      : [
        // Always exclude these directories regardless of nesting
        ...PERMANENT_IGNORE_PATTERNS,
        ...(options.skipArtifacts ? DEFAULT_IGNORE.filter(p =>
          !PERMANENT_IGNORE_DIRS.includes(p as typeof PERMANENT_IGNORE_DIRS[number])
        ) : []),
        ...(options.skipArtifacts
          ? ARTIFACT_FILES.filter(pattern => {
            // If the svg flag is true, don't exclude SVG files
            if (options.svg && pattern === "*.svg") {
              return false;
            }
            return true;
          })
          : []),
        ...gitignorePatterns,
        ...(options.exclude?.map(toPosixPath) ?? []), // Convert excludes
      ];

  // Special handling for SVG files - we want to include them in the tree even when excluded
  const svgPatterns = options.svg ? [] : ["*.svg"];

  if (options.debug) {
    console.log("[DEBUG] Globby patterns:", patterns);
    console.log("[DEBUG] Globby ignore patterns:", ignorePatterns);
    if (!options.svg) {
      console.log("[DEBUG] SVG patterns:", svgPatterns);
    }
  }

  // If we're at the root directory and have include patterns, adjust the search
  const isRoot = depth === 0;
  const searchDir = dir;
  const globbyOptions = {
    cwd: searchDir,
    ignore: ignorePatterns,
    dot: true,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  };

  // For root directory with include patterns, only search in those directories
  const filesRaw =
    isRoot && options.include?.length
      ? await globby(patterns, globbyOptions)
      : await globby(["**/*", "**/.*"], {
        ...globbyOptions,
        ignore: [
          ...ignorePatterns,
          ...(options.include?.length ? ["**/*"] : []),
        ],
      });

  // Normalize file paths returned by globby
  const files = filesRaw.map(toPosixPath);

  // Find SVG files separately if they're excluded but we want to show them in the tree
  let svgFilesRaw: string[] = [];
  if (!options.svg) {
    svgFilesRaw = await globby(["**/*.svg"], {
      cwd: searchDir,
      dot: true,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ignorePatterns,
    });

    if (options.debug) {
      console.log("[DEBUG] Found raw SVG files:", svgFilesRaw);
    }
  }

  // Normalize SVG file paths
  const svgFiles = svgFilesRaw.map(toPosixPath);

  // Combine regular files and SVG files
  const allFiles = [...files, ...svgFiles];

  let filteredFiles = allFiles;

  // Filter out SVG files from the TypeScript files when using include patterns
  if (options.include?.some(pattern => pattern.includes('.ts'))) {
    filteredFiles = filteredFiles.filter(file => !file.toLowerCase().endsWith('.svg'));
  }

  const rawFindTerms =
    typeof options.find === "string" ? [options.find] : options.find || [];
  const rawRequireTerms =
    typeof options.require === "string"
      ? [options.require]
      : options.require || [];
  const findTerms = rawFindTerms.filter((term) => term.trim() !== "");
  const requireTerms = rawRequireTerms.filter((term) => term.trim() !== "");

  // Filter by extension if specified
  if (options.extension?.length) {
    filteredFiles = filteredFiles.filter((file) => {
      const fileExt = file.slice(file.lastIndexOf("."));
      return options.extension!.some((ext) => {
        // Ensure extensions start with a dot
        const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
        return fileExt === normalizedExt;
      });
    });
  }

  if (findTerms.length > 0 || requireTerms.length > 0) {
    filteredFiles = await filterFilesByContent(
      filteredFiles,
      findTerms,
      requireTerms
    );
  }

  if (options.debug) {
    console.log("[DEBUG] Globby found files:", filteredFiles);
  }
  if (!filteredFiles.length) return null;

  const node: TreeNode = {
    name: basename(dir),
    path: dir,
    type: "directory",
    size: 0,
    children: [],
    file_count: 0,
    dir_count: 0,
  };

  // Process files sequentially for ordering
  for (const file of filteredFiles) {
    try {
      const fstat = await fs.lstat(file);
      stats.totalFiles++;
      stats.totalSize += fstat.size;
      if (
        stats.totalFiles > DIR_MAX_FILES ||
        stats.totalSize > DIR_MAX_TOTAL_SIZE
      ) {
        if (options.debug)
          console.log(
            "[DEBUG] Max files/size reached:",
            stats.totalFiles,
            stats.totalSize
          );
        break;
      }
      // Ensure relPath uses POSIX separators before splitting
      const relPath = toPosixPath(relative(dir, file)); // Use toPosixPath here
      const segments = relPath.split("/"); // Now only split by forward slash
      let currentNode = node;
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (!segment) continue;
        let child = currentNode.children?.find(
          (n) => n.type === "directory" && n.name === segment
        );
        if (!child) {
          child = {
            name: segment,
            path: resolve(currentNode.path, segment),
            type: "directory",
            size: 0,
            children: [],
            file_count: 0,
            dir_count: 0,
            parent: currentNode,
          };
          currentNode.children = currentNode.children || [];
          currentNode.children.push(child);
          currentNode.dir_count++;
        }
        currentNode = child;
      }
      const fileName = segments[segments.length - 1];
      if (fileName) {
        const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
        const fileNode: TreeNode = {
          name: fileName,
          path: file,
          type: "file",
          size: fstat.size,
          parent: currentNode,
          file_count: 0,
          dir_count: 0,
          tooLarge: fstat.size > maxSize,
        };

        // Set isSvgIncluded flag for SVG files
        if (fileName.toLowerCase().endsWith('.svg')) {
          fileNode.isSvgIncluded = !!options.svg;
        }

        currentNode.children = currentNode.children || [];
        currentNode.children.push(fileNode);
        currentNode.file_count++;
        currentNode.size += fstat.size;
        let pNode = currentNode;
        while (pNode && pNode.parent) {
          pNode.parent.size += fstat.size;
          pNode = pNode.parent;
        }
        node.size += fstat.size;
      }
    } catch (error) {
      if (options.debug) {
        console.log("[DEBUG] Error processing file:", file, error);
      }
    }
  }
  node.file_count = stats.totalFiles;
  return node.children && node.children.length > 0 ? node : null;
}

/** Recursively sort the tree's children alphabetically by name */
export function sortTree(node: TreeNode): void {
  if (node.children) {
    node.children.sort((a: TreeNode, b: TreeNode) =>
      a.name.localeCompare(b.name)
    );
    for (const child of node.children) {
      if (child.type === "directory") sortTree(child);
    }
  }
}

/** Filter files by content using async file reads */
export async function filterFilesByContent(
  files: string[],
  findTerms: string[] = [],
  requireTerms: string[] = []
): Promise<string[]> {
  if (!findTerms.length && !requireTerms.length) return files;

  console.log(`[DEBUG] Filtering files with terms:`, {
    findTerms,
    requireTerms,
  });

  // Split any comma-separated terms and flatten the arrays
  const orTermsLower = findTerms
    .flatMap((t) => t.split(","))
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t !== "");

  const andTermsLower = requireTerms
    .flatMap((t) => t.split(","))
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t !== "");

  const matchingFiles: Set<string> = new Set();

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const fileNameLower = basename(file).toLowerCase();

      // First check filename matches for OR terms
      if (orTermsLower.some((term: string) => fileNameLower.includes(term))) {
        console.log(`[DEBUG] File matched by name: ${file}`);
        return file;
      }

      try {
        const content = (await fs.readFile(file, "utf8")).toLowerCase();

        // Check content for OR terms
        const matchesFind =
          orTermsLower.length &&
          orTermsLower.some((term: string) => content.includes(term));

        // Check content for AND terms - only if we have require terms
        const matchesRequire =
          andTermsLower.length &&
          andTermsLower.every((term: string) => content.includes(term));

        // Return the file if it matches either condition
        if (matchesFind || matchesRequire) {
          console.log(`[DEBUG] File matched by content: ${file}`);
          return file;
        }
        return null;
      } catch (error) {
        if (error instanceof Error) {
          console.error(`[DEBUG] Error reading file ${file}:`, error.message);
        }
        return null;
      }
    })
  );

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value) {
      matchingFiles.add(result.value);
    }
  });

  console.log(`[DEBUG] Found ${matchingFiles.size} matching files`);
  return Array.from(matchingFiles);
}

/** Gather file content for a tree node */
export async function gatherFiles(
  node: TreeNode,
  options: IngestFlags,
  basePath: string,
  externalPaths: Set<string> // Use this to skip content generation
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  const ignoredFiles = new Set<string>();
  const binaryFiles = new Set<string>();
  const svgFiles = new Set<string>();
  let estimatedTokenCount = 0; // Initialize token counter
  const tokenLimit = DEFAULT_MAX_TOKEN_ESTIMATE; // Use constant

  async function processNode(currentNode: TreeNode) { // Changed param name for clarity
    // --- Token Limit Check --- START
    // Check *before* processing the node's content or children
    if (!options.allowLarge && estimatedTokenCount > tokenLimit) {
      // If limit is already exceeded, stop processing further down this branch
      return;
    }
    // --- Token Limit Check --- END

    if (currentNode.type === "file") {
      // Skip content generation if it's an external file (path matches absolute include)
      if (externalPaths.has(currentNode.path)) {
        if (options.debug) {
          console.log(`[DEBUG] gatherFiles: Skipping content generation for external file: ${currentNode.path}`);
        }
        // Still process flags for the tree view
        try {
          const buffer = await fs.readFile(currentNode.path);
          currentNode.isBinary = isBinaryFile(buffer, currentNode.path);
          if (currentNode.name.toLowerCase().endsWith('.svg')) {
            currentNode.isSvgIncluded = !!options.svg;
            if (!currentNode.isSvgIncluded) svgFiles.add(currentNode.path);
          }
          if (currentNode.isBinary) binaryFiles.add(currentNode.path);

          const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
          if (currentNode.isBinary && currentNode.size <= maxSize) {
            currentNode.tooLarge = false; // Override tooLarge if binary & within size
          }
        } catch (error) {
          if (options.debug) console.log(`[DEBUG] gatherFiles: Error stat-ing external file ${currentNode.path} for flags:`, error);
          ignoredFiles.add(currentNode.path);
        }
        return; // Skip content retrieval
      }

      // Handle SVG exclusion for internal files
      if (currentNode.name.toLowerCase().endsWith('.svg')) {
        if (!options.svg) {
          if (options.debug) {
            console.log("[DEBUG] SVG file excluded (internal):", currentNode.path);
          }
          svgFiles.add(currentNode.path);
          currentNode.isSvgIncluded = false;
          // We still need to check if it's binary for the tree view, but skip content
          try {
            const buffer = await fs.readFile(currentNode.path);
            currentNode.isBinary = isBinaryFile(buffer, currentNode.path);
            if (currentNode.isBinary) binaryFiles.add(currentNode.path);
            const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
            if (currentNode.isBinary && currentNode.size <= maxSize) currentNode.tooLarge = false;
          } catch (error) {
            if (options.debug) console.log(`[DEBUG] gatherFiles: Error stat-ing internal SVG ${currentNode.path} for flags:`, error);
            ignoredFiles.add(currentNode.path);
          }
          return; // Skip content if SVG is excluded
        } else {
          currentNode.isSvgIncluded = true; // Mark included if flag is set
        }
      }

      // Process internal file content
      try {
        const buffer = await fs.readFile(currentNode.path);
        const isBinary = isBinaryFile(buffer, currentNode.path);
        currentNode.isBinary = isBinary;

        const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
        if (isBinary && currentNode.size <= maxSize) {
          currentNode.tooLarge = false;
        }

        if (isBinary) {
          if (options.debug) {
            console.log("[DEBUG] Binary file detected (internal):", currentNode.path);
          }
          binaryFiles.add(currentNode.path);
          return; // Skip content for binary files
        }

        currentNode.isBinary = false;

        // Use RELATIVE path for display for internal files
        const relativePath = relative(basePath, currentNode.path);
        const content = await getFileContent(
          currentNode.path,
          maxSize,
          relativePath, // Correct display path for internal files
          { skipHeader: false }
        );
        if (content === null) {
          if (options.debug) {
            console.log("[DEBUG] File ignored by getFileContent (internal):", currentNode.path);
          }
          ignoredFiles.add(currentNode.path);
          return;
        }

        // --- Token Estimation and Limit Check --- START
        // Estimate tokens for this file's content
        const fileTokenEstimate = Math.ceil(content.length / APPROX_CHARS_PER_TOKEN);
        estimatedTokenCount += fileTokenEstimate;

        if (options.debug) {
          console.log(`[DEBUG] gatherFiles: Processed ${relativePath}, Size: ${content.length}, Tokens: ~${fileTokenEstimate}, Total Tokens: ~${estimatedTokenCount}`);
        }

        // Check if the limit is exceeded *after* adding this file's tokens
        if (!options.allowLarge && estimatedTokenCount > tokenLimit) {
          if (options.debug) {
            console.log(`[DEBUG] gatherFiles: Token limit exceeded (${estimatedTokenCount} > ${tokenLimit}) while processing ${relativePath}. Aborting.`);
          }
          // Throw specific error to be caught upstream
          throw new TokenLimitExceededError(
            `Estimated token count (~${estimatedTokenCount}) exceeds the limit of ${tokenLimit}.`
          );
        }
        // --- Token Estimation and Limit Check --- END

        files.push({ path: currentNode.path, content: content, size: currentNode.size });
      } catch (error) {
        // If it's the token limit error, re-throw it
        if (error instanceof TokenLimitExceededError) {
          throw error;
        }
        // Handle other file processing errors
        if (options.debug) {
          console.log("[DEBUG] Error processing internal file:", currentNode.path, error);
        }
        ignoredFiles.add(currentNode.path);
      }
    } else if (currentNode.type === "directory" && currentNode.children) {
      // Ensure children are sorted before processing for consistent output
      sortTree(currentNode); // Sort children here if not done in scanDirectory
      for (const child of currentNode.children) {
        // Propagate the check: if the limit was exceeded in a previous sibling, this won't run
        if (!options.allowLarge && estimatedTokenCount > tokenLimit) {
          break; // Stop processing children of this directory if limit exceeded
        }
        await processNode(child);
      }
    }
  }

  await processNode(node);

  if (options.debug) {
    console.log(`[DEBUG] gatherFiles: Final estimated token count: ~${estimatedTokenCount}`);
    console.log("[DEBUG] gatherFiles: Internal files content gathered:", files.length);
    console.log("[DEBUG] gatherFiles: Binary files marked:", binaryFiles.size);
    console.log("[DEBUG] gatherFiles: SVG files marked:", svgFiles.size);
    console.log("[DEBUG] gatherFiles: Files ignored (errors/size):", ignoredFiles.size);
  }

  // DEBUG: Print and write the ingested file list
  const fileList = files.map(f => f.path).join('\n');
  const marker = '[INGEST_DEBUG]';
  if (process.env['INGEST_DEBUG']) {
    console.error(`${marker} Ingested files for basePath: ${basePath}\n${fileList}`);
    try {
      fsSync.writeFileSync('/tmp/ingested-files.log', `${marker} Ingested files for basePath: ${basePath}\n${fileList}`);
    } catch (e) {
      console.error(`${marker} Failed to write ingested files log:`, e);
    }
  }

  return files;
}

/** Create a tree-like string representation of the directory structure */
export function createTree(
  node: TreeNode,
  prefix: string,
  isLast = true,
  flags: IngestFlags = {}
): string {
  const branchStr = isLast ? "└── " : "├── ";

  // Handle file size and binary information
  let additionalInfo = "";
  if (node.type === "file") {
    // Add file size information if the file is too large
    if (node.tooLarge) {
      additionalInfo = FILE_SIZE_MESSAGE(node.size);
    }

    // Add binary file indication only if the file is actually binary
    // This ensures large text files don't get incorrectly labeled as binary
    if (node.isBinary === true) {
      additionalInfo += " (excluded - binary)";
    }

    // Add indication for SVG files that are excluded
    if (node.name.toLowerCase().endsWith('.svg') && !node.isSvgIncluded) {
      additionalInfo += " (excluded - svg)";
    }
  }

  const tree = `${prefix}${branchStr}${node.name}${node.type === "directory" ? "/" : additionalInfo}\n`;

  if (node.type === "directory" && node.children && node.children.length > 0) {
    // Use conditional whitespace based on the flag
    const indentation = flags.whitespace ? "    " : "  ";
    const divider = flags.whitespace ? "│   " : "│ ";
    const newPrefix = `${prefix}${isLast ? indentation : divider}`;

    return (
      tree +
      node.children
        .map((child: TreeNode, idx: number) =>
          createTree(child, newPrefix, idx === node.children!.length - 1, flags)
        )
        .join("")
    );
  }
  return tree;
}

/** Process files from a directory */
async function processFiles(basePath: string, flags: IngestFlags, externalPaths: Set<string>) {
  const rootNode = await scanDirectory(basePath, flags);
  if (!rootNode) {
    if (flags.debug) console.log("[DEBUG] processFiles: scanDirectory returned null.");
    // If scan is null (e.g., empty dir or only externals matching), return empty results
    return { files: [], tree: "" };
  }

  // Ensure tree is sorted before gathering files or creating tree string
  sortTree(rootNode);

  // Pass externalPaths to gatherFiles so it knows which files to skip content generation for
  const files = await gatherFiles(rootNode, flags, basePath, externalPaths);
  // Log all file paths being ingested for debugging
  if (flags.debug) {
    console.log(`[DEBUG] Ingested files for basePath: ${basePath}`);
    files.forEach(f => console.log(`[DEBUG] Ingested file: ${f.path}`));
  }
  // Create tree string *after* gatherFiles might have updated node flags (like isBinary)
  const tree = createTree(rootNode, "", true, flags);

  return { files, tree };
}
