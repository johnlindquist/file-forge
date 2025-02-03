// src/graph.ts
import madge from "madge";
import { resolve, dirname, basename } from "node:path";
import { IngestFlags } from "./types.js";
import { getFileContent } from "./fileUtils.js";

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
): Promise<{
  fileContents: { [filePath: string]: string };
  contentStr: string;
}> {
  const fileContents: { [filePath: string]: string } = {};
  const seenPaths = new Set<string>();

  for (const file of files) {
    // Get the original relative path for storing in the result
    const relativePath = file.replace(process.cwd() + "/", "");

    if (seenPaths.has(relativePath)) continue;
    seenPaths.add(relativePath);

    try {
      fileContents[relativePath] = await getFileContent(
        file,
        maxSize,
        relativePath
      );
    } catch (error) {
      console.error(`[DEBUG] Error reading file ${file}:`, error);
      fileContents[
        relativePath
      ] = `================================\nFile: ${relativePath}\n================================\n[Error reading file]`;
    }
  }

  // Join all file contents with newlines
  let contentStr = "";
  for (const filePath in fileContents) {
    contentStr += fileContents[filePath] + "\n\n";
  }

  return { fileContents, contentStr };
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
    throw error;
  }

  const dependencies = madgeResult.obj();
  console.log(
    "[DEBUG] Dependencies object:",
    JSON.stringify(dependencies, null, 2)
  );

  // Get all unique files from the dependency tree
  const allFiles = new Set<string>();
  for (const [file, deps] of Object.entries(dependencies)) {
    allFiles.add(resolve(baseDir, file));
    for (const dep of deps) {
      allFiles.add(resolve(baseDir, dep));
    }
  }

  console.log("[DEBUG] All files found:", Array.from(allFiles));

  // Build tree structure
  const treeStr = buildDependencyTree(dependencies, basename(entryFile));
  console.log("[DEBUG] Generated tree structure:\n", treeStr);

  // Gather file contents
  const { contentStr } = await gatherGraphFiles(
    Array.from(allFiles),
    flags.maxSize || 10 * 1024 * 1024
  );

  // Build summary
  const summary = `Dependency Graph Analysis starting from: ${entryFile}\nFiles analyzed: ${allFiles.size}`;
  console.log("[DEBUG] Generated summary:", summary);

  console.log("[DEBUG] Graph analysis complete");

  return { summary, treeStr, contentStr };
}
