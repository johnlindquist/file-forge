// src/graph.ts
import madge from "madge";
import { promises as fs } from "node:fs";
import { resolve, dirname, isAbsolute, basename } from "node:path";
import { isLikelyTextFile } from "./ingest.js";
import { IngestFlags } from "./types.js";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Recursively build a tree string from the dependency graph
function buildDependencyTree(
  deps: { [key: string]: string[] },
  current: string,
  visited = new Set<string>(),
  prefix = ""
): string {
  let treeStr = prefix + current + "\n";
  visited.add(current);
  const children = deps[current] || [];
  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    const connector = isLast ? "└── " : "├── ";
    if (visited.has(child)) {
      treeStr += prefix + "  " + connector + child + " (circular)\n";
    } else {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      treeStr +=
        prefix +
        connector +
        buildDependencyTree(
          deps,
          child,
          new Set(visited),
          newPrefix
        ).trimStart();
    }
  });
  return treeStr;
}

// Gather file contents for the files in the dependency graph
async function gatherGraphFiles(
  files: string[],
  maxSize: number
): Promise<{ [filePath: string]: string }> {
  const fileContents: { [filePath: string]: string } = {};
  const seenPaths = new Set<string>();

  for (const file of files) {
    // Get the original relative path for storing in the result
    const relativePath = file.replace(process.cwd() + "/", "");

    if (seenPaths.has(relativePath)) continue;
    seenPaths.add(relativePath);

    try {
      const stat = await fs.stat(file);
      if (stat.size > maxSize) {
        fileContents[relativePath] = "[Content ignored: file too large]";
      } else if (await isLikelyTextFile(file)) {
        const content = await fs.readFile(file, "utf8");
        fileContents[relativePath] = content;
      } else {
        fileContents[relativePath] = "[Content ignored or non‑text file]";
      }
    } catch (error) {
      console.error(`[DEBUG] Error reading file ${file}:`, error);
      fileContents[relativePath] = "[Error reading file]";
    }
  }
  return fileContents;
}

// Main function to ingest the dependency graph
export async function ingestGraph(
  entryFile: string,
  flags: IngestFlags
): Promise<{ summary: string; treeStr: string; contentStr: string }> {
  console.log("[DEBUG] Starting ingestGraph with entry file:", entryFile);
  const resolvedEntry = resolve(entryFile);
  const baseDir = dirname(resolvedEntry);
  console.log("[DEBUG] Resolved entry path:", resolvedEntry);
  console.log("[DEBUG] Base directory:", baseDir);

  let madgeResult;
  try {
    console.log("[DEBUG] Running madge analysis...");
    madgeResult = await madge(resolvedEntry, {
      fileExtensions: ["js", "jsx", "ts", "tsx"],
      detectiveOptions: {
        es6: { mixedImports: true },
        ts: { mixedImports: true },
      },
    });
    console.log("[DEBUG] Madge analysis complete");
    console.log("[DEBUG] Raw madge result:", madgeResult);
  } catch (error) {
    console.error("[DEBUG] Madge failed:", error);
    throw new Error(`Madge failed: ${error}`);
  }

  const deps = madgeResult.obj();
  console.log("[DEBUG] Dependencies object:", JSON.stringify(deps, null, 2));

  // Normalize all paths to be relative to cwd
  const normalizedDeps: { [key: string]: string[] } = {};
  for (const [key, value] of Object.entries(deps)) {
    const normalizedKey = key.includes(process.cwd())
      ? key.replace(process.cwd() + "/", "")
      : key;
    const normalizedValues = (value as string[]).map((dep) =>
      dep.includes(process.cwd()) ? dep.replace(process.cwd() + "/", "") : dep
    );
    normalizedDeps[normalizedKey] = normalizedValues;
  }

  // Collect all files from the normalized graph
  const allFilesSet = new Set<string>(Object.keys(normalizedDeps));
  Object.values(normalizedDeps).forEach((deps) => {
    deps.forEach((dep) => allFilesSet.add(dep));
  });

  const allFiles = Array.from(allFilesSet);
  console.log("[DEBUG] All files found:", allFiles);

  const treeStr = buildDependencyTree(normalizedDeps, basename(entryFile));
  console.log("[DEBUG] Generated tree structure:\n", treeStr);

  const fileContents = await gatherGraphFiles(
    allFiles.map((f) => (isAbsolute(f) ? f : resolve(baseDir, f))),
    flags.maxSize || DEFAULT_MAX_SIZE
  );
  console.log(
    "[DEBUG] Gathered file contents for",
    Object.keys(fileContents).length,
    "files"
  );

  let contentStr = "";
  for (const file of allFiles) {
    const resolvedFile = isAbsolute(file) ? file : resolve(baseDir, file);
    const relativePath = resolvedFile.replace(process.cwd() + "/", "");
    console.log(
      "[DEBUG] Processing file content for:",
      file,
      "resolved to:",
      relativePath
    );
    contentStr += `================================\nFile: ${file}\n================================\n`;
    contentStr +=
      (fileContents[relativePath] || "[File content not found]") + "\n\n";
  }

  const summary = `# ghi\n\nDependency Graph Analysis starting from: ${entryFile}\nFiles analyzed: ${allFiles.length}`;
  console.log("[DEBUG] Generated summary:", summary);

  return { summary, treeStr, contentStr };
}
