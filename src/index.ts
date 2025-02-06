#!/usr/bin/env node
// src/index.ts

import { format } from "date-fns";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import clipboard from "clipboardy";
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";

import { runCli } from "./cli.js";
import { getEditorConfig } from "./editor.js";
import { ingestDirectory } from "./ingest.js";
import { ingestGraph } from "./graph.js";
import { isGitHubURL, getRepoPath } from "./repo.js";
import { IngestFlags } from "./types.js";

// Handle uncaught errors
process.on("uncaughtException", (err: unknown) => {
  console.error("Uncaught exception:", err);
  if (process.env["VITEST"]) throw err;
  process.exit(1);
});

/** Read package.json for version info */
const __filename = new URL("", import.meta.url).pathname;
const packagePath = resolve(__filename, "../package.json");
try {
  const pkgContent = await fs.readFile(packagePath, "utf8");
  JSON.parse(pkgContent); // Just validate JSON
} catch {
  // fallback version
}

/** Constants used in the main flow */
const RESULTS_SAVED_MARKER = "RESULTS_SAVED:";
const DEFAULT_LOG_DIR = envPaths("ghi").log;
const DEFAULT_SEARCHES_DIR = envPaths("ghi").config;
const MAX_EDITOR_SIZE = 5 * 1024 * 1024; // 5 MB

// Parse CLI arguments
const argv = runCli() as IngestFlags & { _: (string | number)[] };

let output: string;
let digest: { summary: string; treeStr: string; contentStr: string };
let resultFilePath: string;
let source: string;

if (argv.graph) {
  const entryFile = String(argv.graph);
  try {
    await fs.access(entryFile);
  } catch {
    console.error(`Graph entry file not found: ${entryFile}`);
    process.exit(1);
  }

  try {
    console.log("[DEBUG] Starting graph analysis for:", entryFile);
    const { summary, treeStr, contentStr } = await ingestGraph(entryFile, {
      maxSize: argv.maxSize,
      verbose: argv.verbose,
      debug: argv.debug,
    });
    console.log("[DEBUG] Graph analysis complete");

    // Save results
    resultFilePath = resolve(
      DEFAULT_SEARCHES_DIR,
      `ghi-${createHash("md5")
        .update(String(entryFile))
        .digest("hex")
        .slice(0, 6)}-${format(new Date(), "yyyyMMdd-HHmmss")}.md`
    );

    // In test mode or when NO_INTRO is set, output exactly what the test expects
    if (argv.test || process.env["NO_INTRO"]) {
      output = [
        "# ghi",
        `**Source**: \`${String(entryFile)}\``,
        `**Timestamp**: ${new Date().toString()}`,
        "## Summary",
        summary,
        "## Directory Structure",
        "```",
        treeStr,
        "```",
        "## Files Content",
        "```",
        contentStr,
        "```",
      ].join("\n\n");

      process.stdout.write(output);
      if (argv.pipe) {
        process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
      }
      process.exit(0);
    }

    // Normal mode with pretty formatting
    console.log("[DEBUG] Normal mode, using formatted output");
    p.intro(summary);
    console.log("\nDirectory Structure:\n");
    console.log(treeStr);
    if (argv.verbose || argv.debug) {
      console.log("\nFiles Content:\n");
      console.log(contentStr);
    }
    if (argv.pipe) {
      console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
    }

    // Save results to file
    output = `# Graph Analysis

${summary}

## Directory Structure

\`\`\`
${treeStr}
\`\`\`
`;

    // Show file contents in output if verbose/debug OR if there are large files to notify about
    if (
      argv.verbose ||
      argv.debug ||
      contentStr.includes("[Content ignored: file too large]")
    ) {
      output += `
## Files Content

\`\`\`
${contentStr}
\`\`\`
`;
    }

    try {
      await fs.writeFile(resultFilePath, output, "utf8");
      console.log("[DEBUG] Results saved to:", resultFilePath);
    } catch (err) {
      console.error("[DEBUG] Failed to save results:", err);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    p.cancel(`Graph analysis failed: ${error}`);
    process.exit(1);
  }
} else {
  let [srcArg] = argv._;
  if (!srcArg) {
    srcArg = process.cwd();
    if (argv.debug)
      console.log(
        "[DEBUG] No source provided, using current directory:",
        srcArg
      );
  }
  const srcStr = String(srcArg);
  if (isGitHubURL(srcStr).isValid) {
    try {
      const { url } = isGitHubURL(srcStr);
      source = url;
      var finalPath = await getRepoPath(
        url,
        createHash("md5").update(String(srcStr)).digest("hex").slice(0, 6),
        argv,
        false
      );
    } catch {
      p.cancel("Failed to clone repository");
      process.exit(1);
    }
  } else {
    try {
      source = srcStr;
      finalPath = await getRepoPath(
        srcStr,
        createHash("md5").update(String(srcStr)).digest("hex").slice(0, 6),
        argv,
        true
      );
    } catch (err) {
      p.cancel(
        err instanceof Error ? err.message : "Failed to access directory"
      );
      process.exit(1);
    }
  }
  const spinner2 = p.spinner();
  spinner2.start("Building text digest...");
  try {
    digest = await ingestDirectory(finalPath, argv);
    spinner2.stop("Text digest built.");
  } catch {
    spinner2.stop("Digest build failed.");
    p.cancel("Failed to build digest");
    process.exit(1);
  }
}

await mkdirp(DEFAULT_LOG_DIR);
await mkdirp(DEFAULT_SEARCHES_DIR);

const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
const hashedSource = createHash("md5")
  .update(String(source))
  .digest("hex")
  .slice(0, 6);
resultFilePath = resolve(
  DEFAULT_SEARCHES_DIR,
  `ghi-${hashedSource}-${timestamp}.md`
);

// Only show intro message if not in test mode or NO_INTRO is not set
if (!process.env["VITEST"] && !process.env["NO_INTRO"] && !argv.test) {
  const introLines = ["🔍 ghi Analysis", `\nAnalyzing: ${source}`];
  if (argv.find?.length)
    introLines.push(`Finding files containing: ${argv.find.join(", ")}`);
  if (argv.include?.length)
    introLines.push(`Including patterns: ${argv.include.join(", ")}`);
  if (argv.exclude?.length)
    introLines.push(`Excluding patterns: ${argv.exclude.join(", ")}`);
  if (argv.branch) introLines.push(`Using branch: ${argv.branch}`);
  if (argv.commit) introLines.push(`At commit: ${argv.commit}`);
  if (argv.maxSize && argv.maxSize !== undefined)
    introLines.push(`Max file size: ${Math.round(argv.maxSize / 1024)}KB`);
  if (argv.skipArtifacts)
    introLines.push("Skipping build artifacts and generated files");
  if (!argv.ignore) introLines.push("Ignoring .gitignore rules");
  p.intro(introLines.join("\n"));
}

const outputParts = [
  "# ghi",
  `**Source**: \`${String(source)}\``,
  `**Timestamp**: ${new Date().toString()}`,
  "## Summary",
  digest.summary,
  "## Directory Structure",
  "```",
  digest.treeStr,
  "```",
  "## Files Content",
  "```",
  digest.contentStr,
  "```",
];

output = outputParts.join("\n\n");

// Add bulk instructions after the main output
if (argv.bulk) {
  output +=
    "\n\n---\nWhen I provide a set of files with paths and content, please return **one single shell script** that does the following:\n\n";
  output += "1. Creates the necessary directories for all files.\n\n";
  output +=
    "2. Outputs the final content of each file using `cat << 'EOF' > path/filename` ... `EOF`.\n\n";
  output +=
    "3. Ensures it's a single code fence I can copy and paste into my terminal.\n\n";
  output += "4. Ends with a success message.\n\n";
  output +=
    "Use `#!/usr/bin/env bash` at the start and make sure each `cat` block ends with `EOF`.\n---\n";
}

try {
  await fs.writeFile(resultFilePath, output, "utf8");
  if (argv.debug) console.log("[DEBUG] Results saved to:", resultFilePath);
} catch (err) {
  console.error("[DEBUG] Failed to save results:", err);
  process.exit(1);
}

// In test mode or when NO_INTRO is set, output exactly what the test expects
if (argv.test || process.env["NO_INTRO"]) {
  const testOutputParts = [
    "# ghi",
    `**Source**: \`${String(source)}\``,
    `**Timestamp**: ${new Date().toString()}`,
    "## Summary",
    digest.summary,
    "## Directory Structure",
    "```",
    digest.treeStr,
    "```",
  ];

  // Show file contents in console only if verbose/debug is on OR if there are large files to notify about
  if (
    argv.verbose ||
    argv.debug ||
    digest.contentStr.includes("[Content ignored: file too large]")
  ) {
    testOutputParts.push("## Files Content", "```", digest.contentStr, "```");
  }

  // Add bulk instructions if bulk flag is set
  if (argv.bulk) {
    testOutputParts.push(
      "---",
      "When I provide a set of files with paths and content, please return **one single shell script** that does the following:",
      "",
      "1. Creates the necessary directories for all files.",
      "",
      "2. Outputs the final content of each file using `cat << 'EOF' > path/filename` ... `EOF`.",
      "",
      "3. Ensures it's a single code fence I can copy and paste into my terminal.",
      "",
      "4. Ends with a success message.",
      "",
      "Use `#!/usr/bin/env bash` at the start and make sure each `cat` block ends with `EOF`.",
      "---"
    );
  }

  // Write output to stdout
  process.stdout.write(testOutputParts.join("\n\n"));
  if (argv.pipe) {
    process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
  }
  process.exit(0);
}

// Normal mode with pretty formatting
if (argv.debug) console.log("[DEBUG] Normal mode, using formatted output");
p.intro(digest.summary);
console.log("\nDirectory Structure:\n");
console.log(digest.treeStr);

// Show file contents in console only if verbose/debug is on OR if there are large files to notify about
if (
  argv.verbose ||
  argv.debug ||
  digest.contentStr.includes("[Content ignored: file too large]")
) {
  console.log("\nFiles Content:\n");
  console.log(digest.contentStr);
}

if (argv.pipe) {
  console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
}

// Always include file contents in the saved file
output = [
  "# ghi",
  `**Source**: \`${String(source)}\``,
  `**Timestamp**: ${new Date().toString()}`,
  "## Summary",
  digest.summary,
  "## Directory Structure",
  "```",
  digest.treeStr,
  "```",
  "## Files Content",
  "```",
  digest.contentStr,
  "```",
].join("\n\n");

// Add bulk instructions after the main output
if (argv.bulk) {
  output +=
    "\n\n---\nWhen I provide a set of files with paths and content, please return **one single shell script** that does the following:\n\n";
  output += "1. Creates the necessary directories for all files.\n\n";
  output +=
    "2. Outputs the final content of each file using `cat << 'EOF' > path/filename` ... `EOF`.\n\n";
  output +=
    "3. Ensures it's a single code fence I can copy and paste into my terminal.\n\n";
  output += "4. Ends with a success message.\n\n";
  output +=
    "Use `#!/usr/bin/env bash` at the start and make sure each `cat` block ends with `EOF`.\n---\n";
}

const fileSize = Buffer.byteLength(output, "utf8");
if (fileSize > MAX_EDITOR_SIZE) {
  p.note(
    `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
    `Results saved to file (${Math.round(
      fileSize / 1024 / 1024
    )}MB). File too large for editor; open it manually.`
  );
  p.outro("Done! 🎉");
  process.exit(0);
} else {
  if (argv.clipboard) {
    try {
      await clipboard.write(output);
      p.note("Results copied to clipboard!");
    } catch {
      p.note("Failed to copy to clipboard");
    }
  }
  if (!argv.open) {
    p.note(
      `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
      "Results saved to file."
    );
  } else {
    const editorConfig = await getEditorConfig();
    if (!editorConfig.skipEditor && editorConfig.command) {
      try {
        execSync(`${editorConfig.command} "${resultFilePath}"`);
        p.note(
          `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
          "Opened in your configured editor."
        );
      } catch {
        p.note(
          `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
          `Couldn't open with: ${editorConfig.command}`
        );
      }
    } else {
      p.note(
        `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
        "You can open the file manually."
      );
    }
  }
  p.outro("Done! 🎉");
}
