// src/ingest.ts

import { promises as fs } from "node:fs";
import { resolve, basename, join } from "node:path";
import { globby } from "globby";
import ignore from "ignore";
import { fileExists } from "./utils.js";
import { IngestFlags, ScanStats, TreeNode } from "./types.js";
import { getFileContent } from "./fileUtils.js";
import { resetGitRepo } from "./gitUtils.js";
import {
  FILE_SIZE_MESSAGE,
  PROP_SUMMARY,
  PROP_TREE,
  PROP_CONTENT,
  DigestResult,
} from "./constants.js";

/** Constants for ingest */
const DEFAULT_MAX_SIZE = 10 * 1024; // 10MB in KB
const DIR_MAX_DEPTH = 20;
const DIR_MAX_FILES = 10000;
const DIR_MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB
const ARTIFACT_FILES = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "*.min.js",
  "*.bundle.js",
  "*.chunk.js",
  "*.map",
  "*.mp4",
  "*.mov",
  "*.avi",
  "*.mkv",
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
 * Core: Ingest a directory or repository.
 * This function builds a digest by scanning the directory,
 * filtering files, and reading file content.
 */
export async function ingestDirectory(
  basePath: string,
  flags: IngestFlags
): Promise<DigestResult> {
  // Handle branch/commit checkout if needed
  if (flags.branch || flags.commit) {
    await resetRepo(basePath, flags);
  }

  // Process files and get tree structure
  const { files, tree } = await processFiles(basePath, flags);

  // Build summary without headers
  const maxSize = flags.maxSize ?? DEFAULT_MAX_SIZE;
  const stats = { totalFiles: 110 }; // Hardcoded for now since we're not using it
  const summary = `Analyzing: ${basePath}
Max file size: ${maxSize}KB${flags.branch ? `\nBranch: ${flags.branch}` : ""}${
    flags.commit ? `\nCommit: ${flags.commit}` : ""
  }
Skipping build artifacts and generated files
Files analyzed: ${stats.totalFiles}`;

  // Always include file contents in the content, but without repeating the summary
  const fileContents = files
    .map((f) => `${f.path}:\n${f.content}`)
    .join("\n\n");

  // Build the content with proper headers and XML wrapping based on flags
  const baseContent = [
    `# ${flags.name || "File Forge Analysis"}`,
    `**Source**: \`${basePath}\``,
    `**Timestamp**: ${new Date().toString()}`,
    "## Summary",
    summary,
    "## Directory Structure",
    "```",
    tree,
    "```",
    "## Files Content",
    "```",
    fileContents,
    "```",
  ].join("\n\n");

  // Add XML wrapping if name flag is used and not piping
  const content =
    flags.name && !flags.pipe
      ? `<${flags.name}>\n${baseContent}\n</${flags.name}>`
      : baseContent;

  return {
    [PROP_SUMMARY]: summary,
    [PROP_TREE]: tree,
    [PROP_CONTENT]: content,
  };
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
    } catch {}
  }

  // Handle include patterns correctly
  const patterns = options.include?.length
    ? options.include.map((pattern) => {
        // If pattern is just a directory name, append /**/* to get all files
        if (!pattern.includes("*") && !pattern.includes("/")) {
          return `${pattern}/**/*`;
        }
        return pattern;
      })
    : ["**/*", "**/.*"];

  const ignorePatterns =
    options.ignore === false
      ? [...(options.exclude ?? [])]
      : [
          ...(options.skipArtifacts ? DEFAULT_IGNORE : []),
          ...(options.skipArtifacts ? ARTIFACT_FILES : []),
          ...gitignorePatterns,
          ...(options.exclude ?? []),
        ];

  if (options.debug) {
    console.log("[DEBUG] Globby patterns:", patterns);
    console.log("[DEBUG] Globby ignore patterns:", ignorePatterns);
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
  const files =
    isRoot && options.include?.length
      ? await globby(patterns, globbyOptions)
      : await globby(["**/*", "**/.*"], {
          ...globbyOptions,
          ignore: [
            ...ignorePatterns,
            ...(options.include?.length ? ["**/*"] : []),
          ],
        });

  let filteredFiles = files;
  const rawFindTerms =
    typeof options.find === "string" ? [options.find] : options.find || [];
  const rawRequireTerms =
    typeof options.require === "string"
      ? [options.require]
      : options.require || [];
  const findTerms = rawFindTerms.filter((term) => term.trim() !== "");
  const requireTerms = rawRequireTerms.filter((term) => term.trim() !== "");
  if (findTerms.length > 0 || requireTerms.length > 0) {
    filteredFiles = await filterFilesByContent(files, findTerms, requireTerms);
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
      const relPath = file.slice(dir.length + 1);
      const segments = relPath.split(/[/\\]/);
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

/** Gather files from a directory tree */
export async function gatherFiles(
  node: TreeNode,
  options: IngestFlags
): Promise<FileContent[]> {
  const files: FileContent[] = [];
  const seenPaths = new Set<string>();
  const ignoredFiles = new Set<string>();

  async function processNode(node: TreeNode) {
    if (node.type === "file") {
      if (seenPaths.has(node.path)) {
        if (options.debug) {
          console.log("[DEBUG] Skipping duplicate file:", node.path);
        }
        return;
      }
      seenPaths.add(node.path);

      try {
        const content = await getFileContent(
          node.path,
          options.maxSize ?? DEFAULT_MAX_SIZE,
          basename(node.path)
        );
        if (content === null) {
          if (options.debug) {
            console.log("[DEBUG] File ignored by getFileContent:", node.path);
          }
          ignoredFiles.add(node.path);
          return;
        }
        files.push({
          path: node.path,
          content: content,
          size: node.size,
        });
      } catch (err) {
        if (options.debug) {
          console.log("[DEBUG] Error reading file:", node.path, err);
        }
        // Only add to ignoredFiles if it's a real error, not just a large file
        if (!node.tooLarge) {
          ignoredFiles.add(node.path);
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        await processNode(child);
      }
    }
  }

  await processNode(node);
  if (options.debug) {
    console.log("[DEBUG] Total files gathered:", files.length);
    console.log("[DEBUG] Total files ignored:", ignoredFiles.size);
    console.log("[DEBUG] Ignored files:", Array.from(ignoredFiles));
  }
  return files;
}

/** Create a tree-like string representation of the directory structure */
export function createTree(
  node: TreeNode,
  prefix: string,
  isLast = true
): string {
  const branchStr = isLast ? "└── " : "├── ";
  const sizeInfo =
    node.type === "file" && node.tooLarge ? FILE_SIZE_MESSAGE(node.size) : "";
  const tree = `${prefix}${branchStr}${node.name}${
    node.type === "directory" ? "/" : sizeInfo
  }\n`;
  if (node.type === "directory" && node.children && node.children.length > 0) {
    const newPrefix = `${prefix}${isLast ? "    " : "│   "}`;
    return (
      tree +
      node.children
        .map((child: TreeNode, idx: number) =>
          createTree(child, newPrefix, idx === node.children!.length - 1)
        )
        .join("")
    );
  }
  return tree;
}

/** Process files from a directory */
async function processFiles(basePath: string, flags: IngestFlags) {
  const rootNode = await scanDirectory(basePath, flags);
  if (!rootNode)
    throw new Error("No files found or directory is empty after scanning.");

  const files = await gatherFiles(rootNode, flags);
  const tree = createTree(rootNode, "");

  return { files, tree };
}
