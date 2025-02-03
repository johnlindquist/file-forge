// src/ingest.ts

import { promises as fs } from "node:fs";
import { resolve, basename, join } from "node:path";
import { globby } from "globby";
import ignore from "ignore";
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import { simpleGit as createGit, ResetMode } from "simple-git";
import { fileExists } from "./utils.js";
import { IngestFlags, ScanStats, TreeNode } from "./types.js";

/** Constants for ingest */
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
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

/**
 * Core: Ingest a directory or repository.
 * This function builds a digest by scanning the directory,
 * filtering files, and reading file content.
 */
export async function ingestDirectory(
  basePath: string,
  flags: IngestFlags
): Promise<{ summary: string; treeStr: string; contentStr: string }> {
  // Handle branch/commit checkout if needed
  if (flags.branch || flags.commit) {
    const spinner = p.spinner();
    if (!(await fileExists(join(basePath, ".git")))) {
      throw new Error("Cannot checkout branch/commit: not a git repository");
    }
    if (flags.useRegularGit) {
      try {
        spinner.start("Checking out using regular git commands...");
        execSync("git clean -fdx", { cwd: basePath });
        execSync("git reset --hard", { cwd: basePath });
        if (flags.branch) {
          spinner.start(`Checking out branch ${flags.branch}...`);
          execSync("git clean -fdx", { cwd: basePath });
          execSync("git reset --hard", { cwd: basePath });
          execSync(`git checkout ${flags.branch}`, { cwd: basePath });
          spinner.stop("Branch checked out.");
          execSync("git clean -fdx", { cwd: basePath });
          execSync("git reset --hard", { cwd: basePath });
        }
        if (flags.commit) {
          spinner.start(`Checking out commit ${flags.commit}...`);
          execSync("git clean -fdx", { cwd: basePath });
          execSync("git reset --hard", { cwd: basePath });
          execSync(`git checkout ${flags.commit}`, { cwd: basePath });
          spinner.stop("Checked out commit.");
          execSync("git clean -fdx", { cwd: basePath });
          execSync("git reset --hard", { cwd: basePath });
        }
      } catch {
        spinner.stop("Checkout failed");
        throw new Error("Failed to checkout using regular git commands");
      }
    } else {
      const git = createGit(basePath);
      await git.clean("f", ["-d"]);
      await git.reset(ResetMode.HARD);
      if (flags.branch) {
        spinner.start(`Checking out branch ${flags.branch}...`);
        await git.clean("f", ["-d"]);
        await git.reset(ResetMode.HARD);
        try {
          await git.checkout(flags.branch);
          spinner.stop("Branch checked out.");
        } catch {
          spinner.stop("Branch checkout failed");
          throw new Error("Failed to checkout branch");
        }
        await git.clean("f", ["-d"]);
        await git.reset(ResetMode.HARD);
      }
      if (flags.commit) {
        spinner.start(`Checking out commit ${flags.commit}...`);
        await git.clean("f", ["-d"]);
        await git.reset(ResetMode.HARD);
        try {
          await git.checkout(flags.commit);
          spinner.stop("Checked out commit.");
        } catch {
          spinner.stop("Checkout failed");
          throw new Error("Failed to checkout commit");
        }
        await git.clean("f", ["-d"]);
        await git.reset(ResetMode.HARD);
      }
    }
  }

  const stats: ScanStats = { totalFiles: 0, totalSize: 0 };
  const rootNode = await scanDirectory(basePath, flags, 0, stats);
  if (!rootNode)
    throw new Error("No files found or directory is empty after scanning.");

  // Sort the tree for consistent ordering
  sortTree(rootNode);

  const summaryLines: string[] = [];
  summaryLines.push(`Directory: ${basePath}`);
  summaryLines.push(`Files analyzed: ${rootNode.file_count ?? 0}`);
  if (
    flags.branch &&
    flags.branch.toLowerCase() !== "main" &&
    flags.branch.toLowerCase() !== "master"
  ) {
    summaryLines.push(`Branch: ${flags.branch}`);
  }
  if (flags.commit) summaryLines.push(`Commit: ${flags.commit}`);

  const treeStr = createTree(rootNode, "");
  const maxSize = flags.maxSize ?? DEFAULT_MAX_SIZE;
  const fileNodes = await gatherFiles(rootNode, maxSize);

  const fileContents: { [filePath: string]: string } = {};
  const seenPaths = new Set<string>();

  for (const file of fileNodes) {
    // Get the original relative path for storing in the result
    const relativePath = file.path.replace(process.cwd() + "/", "");

    if (seenPaths.has(relativePath)) continue;
    seenPaths.add(relativePath);

    try {
      const stat = await fs.stat(file.path);
      if (stat.size > maxSize) {
        fileContents[
          relativePath
        ] = `================================\nFile: ${relativePath}\n================================\n[Content ignored: file too large]`;
      } else if (await isLikelyTextFile(file.path)) {
        const content = await fs.readFile(file.path, "utf8");
        fileContents[
          relativePath
        ] = `================================\nFile: ${relativePath}\n================================\n${content}`;
      } else {
        fileContents[
          relativePath
        ] = `================================\nFile: ${relativePath}\n================================\n[Content ignored or non‑text file]`;
      }
    } catch (error) {
      console.error(`[DEBUG] Error reading file ${file.path}:`, error);
      fileContents[
        relativePath
      ] = `================================\nFile: ${relativePath}\n================================\n[Error reading file]`;
    }
  }

  let contentStr = "";
  for (const filePath in fileContents) {
    contentStr += fileContents[filePath] + "\n";
  }

  return { summary: summaryLines.join("\n"), treeStr, contentStr };
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

  const patterns = options.include?.length
    ? options.include
    : ["**/*", "**/.*"];
  const ignorePatterns =
    options.ignore === false
      ? [...(options.exclude ?? [])]
      : [
          ...DEFAULT_IGNORE,
          ...(options.skipArtifacts ? ARTIFACT_FILES : []),
          ...gitignorePatterns,
          ...(options.exclude ?? []),
        ];

  if (options.debug) {
    console.log("[DEBUG] Globby patterns:", patterns);
    console.log("[DEBUG] Globby ignore patterns:", ignorePatterns);
  }

  const files = await globby(patterns, {
    cwd: dir,
    ignore: ignorePatterns,
    dot: true,
    absolute: true,
    onlyFiles: true,
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
        const fileNode: TreeNode = {
          name: fileName,
          path: file,
          type: "file",
          size: fstat.size,
          file_count: 0,
          dir_count: 0,
          parent: currentNode,
        };
        currentNode.children?.push(fileNode);
        currentNode.file_count++;
        currentNode.size += fstat.size;
        let pNode = currentNode;
        while (pNode && pNode.parent) {
          pNode.parent.size += fstat.size;
          pNode = pNode.parent;
        }
        node.size += fstat.size;
      }
    } catch (err) {
      if (options.debug)
        console.log("[DEBUG] Error processing file:", file, err);
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
        return file;
      }

      // Skip non-text files early
      if (!(await isLikelyTextFile(file))) return null;

      try {
        const fstat = await fs.lstat(file);
        if (fstat.size > DEFAULT_MAX_SIZE) return null;

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
        return matchesFind || matchesRequire ? file : null;
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error reading file ${file}:`, error.message);
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

  return Array.from(matchingFiles);
}

/** Recursively gather file nodes and read their content */
export async function gatherFiles(
  root: TreeNode,
  maxSize: number
): Promise<TreeNode[]> {
  const files: TreeNode[] = [];

  async function traverse(node: TreeNode): Promise<void> {
    if (node.type === "file") {
      if (node.size > maxSize) {
        node.content = "[Content ignored: file too large]";
        files.push(node);
      } else if (await isLikelyTextFile(node.path)) {
        try {
          node.content = await fs.readFile(node.path, "utf8");
          files.push(node);
        } catch {
          node.content = "[Error reading file]";
          files.push(node);
        }
      }
      // Non‑text files are excluded
    } else if (node.children) {
      for (const child of node.children) {
        await traverse(child);
      }
    }
  }

  await traverse(root);
  return files;
}

/** Check if a file is likely a text file by reading its first bytes */
export async function isLikelyTextFile(filePath: string): Promise<boolean> {
  // Common text file extensions
  const textExtensions = [
    ".txt",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".md",
    ".json",
    ".yml",
    ".yaml",
    ".css",
    ".html",
    ".xml",
  ];
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  if (textExtensions.includes(ext)) return true;

  try {
    const buffer = await fs.readFile(filePath);
    if (!buffer.length) return false;
    const chunk = buffer.slice(0, 1024);
    let nonPrintable = 0;
    for (const byte of chunk) {
      if (byte === 0) return false;
      if (byte < 9 || (byte > 127 && byte < 192)) nonPrintable++;
    }
    return nonPrintable / chunk.length < 0.3;
  } catch {
    return false;
  }
}

/** Create a tree-like string representation of the directory structure */
export function createTree(
  node: TreeNode,
  prefix: string,
  isLast = true
): string {
  const branchStr = isLast ? "└── " : "├── ";
  const tree = `${prefix}${branchStr}${node.name}${
    node.type === "directory" ? "/" : ""
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
