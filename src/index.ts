#!/usr/bin/env node
// src/index.ts

import { format } from "date-fns";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as p from "@clack/prompts";
import { runCli } from "./cli.js";
import { ingestDirectory } from "./ingest.js";
import { ingestGraph } from "./graph.js";
import { isGitUrl, getRepoPath } from "./repo.js";
import { IngestFlags } from "./types.js";
import { APP_ANALYSIS_HEADER, APP_HEADER, APP_SYSTEM_ID } from "./constants.js";
import clipboard from "clipboardy";
import {
  formatDebugMessage,
  formatErrorMessage,
  formatIntroMessage,
  formatSpinnerMessage,
  formatClipboardMessage,
  formatSaveMessage,
} from "./formatter.js";

// Handle uncaught errors
process.on("uncaughtException", (err: unknown) => {
  console.error(formatErrorMessage("Uncaught exception: " + err));
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
const DEFAULT_LOG_DIR = envPaths(APP_SYSTEM_ID).log;
const DEFAULT_SEARCHES_DIR = envPaths(APP_SYSTEM_ID).config;

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
    console.error(
      formatErrorMessage(`Graph entry file not found: ${entryFile}`)
    );
    process.exit(1);
  }

  try {
    console.log(
      formatDebugMessage("Starting graph analysis for: " + entryFile)
    );
    const { summary, treeStr, contentStr } = await ingestGraph(entryFile, {
      maxSize: argv.maxSize,
      verbose: argv.verbose,
      debug: argv.debug,
    });
    console.log(formatDebugMessage("Graph analysis complete"));

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
        APP_HEADER,
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
    console.log(formatDebugMessage("Normal mode, using formatted output"));
    p.intro(formatIntroMessage(summary));
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
      console.log(formatDebugMessage("Results saved to: " + resultFilePath));
    } catch (err) {
      console.error(formatErrorMessage("Failed to save results: " + err));
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    p.cancel(formatErrorMessage(`Graph analysis failed: ${error}`));
    process.exit(1);
  }
} else {
  let [srcArg] = argv._;
  if (!srcArg) {
    srcArg = process.cwd();
    if (argv.debug)
      console.log(
        formatDebugMessage(
          "No source provided, using current directory: " + srcArg
        )
      );
  }
  const srcStr = String(srcArg);
  if (isGitUrl(srcStr)) {
    try {
      source = srcStr;
      var finalPath = await getRepoPath(
        source,
        createHash("md5").update(String(srcStr)).digest("hex").slice(0, 6),
        argv,
        false
      );
    } catch {
      p.cancel(formatErrorMessage("Failed to clone repository"));
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
        formatErrorMessage(
          err instanceof Error ? err.message : "Failed to access directory"
        )
      );
      process.exit(1);
    }
  }
  const spinner2 = p.spinner();
  spinner2.start(formatSpinnerMessage("Building text digest..."));
  try {
    digest = await ingestDirectory(finalPath, argv);
    spinner2.stop(formatSpinnerMessage("Text digest built."));
  } catch {
    spinner2.stop(formatSpinnerMessage("Digest build failed."));
    p.cancel(formatErrorMessage("Failed to build digest"));
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
  const introLines = [APP_ANALYSIS_HEADER, `\nAnalyzing: ${source}`];
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
  formatIntroMessage(
    introLines.join("\n"),
    !argv.test && !process.env["NO_INTRO"]
  );
}

// Export handleOutput for testing
export async function handleOutput(
  digest: { summary: string; treeStr: string; contentStr: string },
  source: string,
  resultFilePath: string,
  argv: IngestFlags
) {
  // Save results to file first
  const outputParts = [
    APP_HEADER,
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

  let output = outputParts.join("\n\n");

  // Add bulk instructions if needed
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

  // Save to file
  try {
    await fs.writeFile(resultFilePath, output, "utf8");
    if (argv.debug)
      console.log(formatDebugMessage("Results saved to: " + resultFilePath));
  } catch (err) {
    console.error(formatErrorMessage("Failed to save results: " + err));
    process.exit(1);
  }

  // Handle different output modes
  if (argv.test || process.env["NO_INTRO"]) {
    // Test mode output
    const testOutputParts = [
      APP_HEADER,
      `**Source**: \`${String(source)}\``,
      `**Timestamp**: ${new Date().toString()}`,
      "## Summary",
      digest.summary,
      "## Directory Structure",
      "```",
      digest.treeStr,
      "```",
    ];

    if (argv.verbose || argv.debug) {
      testOutputParts.push("## Files Content", "```", digest.contentStr, "```");
    } else if (
      digest.contentStr.includes("[Content ignored: file too large]")
    ) {
      testOutputParts.push("[Content ignored: file too large]");
    }

    const testOutput = testOutputParts.join("\n\n");
    process.stdout.write(testOutput);

    // Copy to clipboard if requested
    if (argv.clipboard) {
      clipboard.writeSync(testOutput);
      console.log("\n" + formatClipboardMessage());
    }

    if (argv.pipe) {
      process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
    }

    // Add bulk instructions in test mode too
    if (argv.bulk) {
      process.stdout.write(
        "\n\n---\nWhen I provide a set of files with paths and content, please return **one single shell script** that does the following:\n\n"
      );
      process.stdout.write(
        "1. Creates the necessary directories for all files.\n\n"
      );
      process.stdout.write(
        "2. Outputs the final content of each file using `cat << 'EOF' > path/filename` ... `EOF`.\n\n"
      );
      process.stdout.write(
        "3. Ensures it's a single code fence I can copy and paste into my terminal.\n\n"
      );
      process.stdout.write("4. Ends with a success message.\n\n");
      process.stdout.write(
        "Use `#!/usr/bin/env bash` at the start and make sure each `cat` block ends with `EOF`.\n---\n"
      );
    }
  } else if (argv.pipe) {
    // Pipe mode: output everything to stdout
    process.stdout.write(output);
    // Copy to clipboard if requested
    if (argv.clipboard) {
      clipboard.writeSync(output);
      console.log("\n" + formatClipboardMessage());
    }
  } else {
    // Normal mode with pretty formatting
    if (argv.debug)
      console.log(formatDebugMessage("Normal mode, using formatted output"));
    p.intro(formatIntroMessage(digest.summary));
    console.log("\nDirectory Structure:\n");
    console.log(digest.treeStr);

    // Show file contents based on flags and content state
    if (argv.verbose || argv.debug) {
      console.log("\nFiles Content:\n");
      console.log(digest.contentStr);
    } else {
      // Check for ignored files and show a summary
      const ignoredCount = (
        digest.contentStr.match(
          /^================================\nFile: .+\n================================\n\[Content ignored: (file too large|non‑text file)\]/gm
        ) || []
      ).length;
      if (ignoredCount > 0) {
        console.log("\nContent Summary:");
        console.log(
          `${ignoredCount} file(s) had content ignored due to size or format limitations`
        );
        console.log("Use --verbose to see full content");
      }
    }

    // Copy to clipboard if requested
    if (argv.clipboard) {
      clipboard.writeSync(output);
      console.log("\n" + formatClipboardMessage());
    }
  }

  // Always show the file path unless in test mode
  if (!argv.test && !process.env["NO_INTRO"]) {
    console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
    formatSaveMessage(resultFilePath, !argv.test && !process.env["NO_INTRO"]);
  }
}

// Main function that handles the CLI flow
export async function main() {
  // After getting digest, call handleOutput
  await handleOutput(digest, source, resultFilePath, argv);
  process.exit(0);
}

// Only run main if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
