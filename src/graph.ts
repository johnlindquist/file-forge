// src/graph.ts
import madge from "madge";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
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
        buildDependencyTree(deps, child, new Set(visited), newPrefix).trimStart();
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
  for (const file of files) {
    try {
      const stat = await fs.stat(file);
      if (stat.size > maxSize) {
        fileContents[file] = "[Content ignored: file too large]";
      } else if (await isLikelyTextFile(file)) {
        const content = await fs.readFile(file, "utf8");
        fileContents[file] = content;
      } else {
        fileContents[file] = "[Content ignored or non‑text file]";
      }
    } catch {
      fileContents[file] = "[Error reading file]";
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
  console.log("[DEBUG] Resolved entry path:", resolvedEntry);
  
  let madgeResult;
  try {
    console.log("[DEBUG] Running madge analysis...");
    madgeResult = await madge(resolvedEntry, { 
      fileExtensions: ["js", "jsx", "ts", "tsx"],
      detectiveOptions: {
        es6: { mixedImports: true },
        ts: { mixedImports: true }
      }
    });
    console.log("[DEBUG] Madge analysis complete");
    console.log("[DEBUG] Raw madge result:", madgeResult);
  } catch (error) {
    console.error("[DEBUG] Madge failed:", error);
    throw new Error(`Madge failed: ${error}`);
  }
  
  const deps = madgeResult.obj();
  console.log("[DEBUG] Dependencies object:", JSON.stringify(deps, null, 2));
  
  // Collect all files from the graph (keys and values)
  const allFilesSet = new Set<string>(Object.keys(deps));
  Object.values(deps).forEach((value) => {
    const arr = value as string[];
    arr.forEach((dep) => {
      const resolvedFile = resolve(dep);
      console.log("[DEBUG] Adding dependency:", dep, "->", resolvedFile);
      allFilesSet.add(resolvedFile);
    });
  });
  
  const allFiles = Array.from(allFilesSet);
  console.log("[DEBUG] All files found:", allFiles);
  
  const treeStr = buildDependencyTree(deps, resolvedEntry);
  console.log("[DEBUG] Generated tree structure:\n", treeStr);
  
  const fileContents = await gatherGraphFiles(
    allFiles,
    flags.maxSize || DEFAULT_MAX_SIZE
  );
  console.log("[DEBUG] Gathered file contents for", Object.keys(fileContents).length, "files");
  
  let contentStr = "";
  for (const file of allFiles) {
    console.log("[DEBUG] Processing file content for:", file);
    const relativePath = file.replace(process.cwd() + "/", "");
    contentStr += `================================\nFile: ${relativePath}\n================================\n`;
    contentStr += fileContents[file] + "\n\n";
  }
  
  const summary = `Dependency Graph Analysis starting from: ${resolvedEntry}\nFiles analyzed: ${allFiles.length}`;
  console.log("[DEBUG] Generated summary:", summary);
  
  return { summary, treeStr, contentStr };
} 