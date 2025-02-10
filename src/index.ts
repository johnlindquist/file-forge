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
import { getRepoPath } from "./repo.js";
import { IngestFlags } from "./types.js";
import {
  APP_ANALYSIS_HEADER,
  APP_HEADER,
  APP_SYSTEM_ID,
  FILE_SIZE_MESSAGE,
  PROP_SUMMARY,
  PROP_TREE,
  PROP_CONTENT,
  DigestResult,
} from "./constants.js";
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

if (argv.debug) {
  console.log(formatDebugMessage(`CLI Arguments:`));
  console.log(formatDebugMessage(`argv.repo = ${argv.repo}`));
  console.log(formatDebugMessage(`argv.path = ${argv.path}`));
  console.log(formatDebugMessage(`All argv: ${JSON.stringify(argv, null, 2)}`));
}

let output: string;
let digest: DigestResult | null = null;
let resultFilePath: string;
let source = "";
let finalPath: string;

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
    if (argv.verbose || argv.debug || contentStr.includes("MB - too large")) {
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
  if (argv.repo && argv.path) {
    console.error("Error: Please provide either --repo or --path, not both.");
    process.exit(1);
  } else if (argv.repo) {
    source = argv.repo;
    try {
      finalPath = await getRepoPath(
        source,
        createHash("md5").update(String(source)).digest("hex").slice(0, 6),
        argv,
        false
      );
    } catch {
      p.cancel(formatErrorMessage("Failed to clone repository"));
      process.exit(1);
    }
  } else if (argv.path) {
    source = argv.path;
    try {
      finalPath = await getRepoPath(
        source,
        createHash("md5").update(String(source)).digest("hex").slice(0, 6),
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
  } else {
    // Default to the current working directory if neither flag is provided
    source = process.cwd();
    if (argv.debug)
      console.log(
        formatDebugMessage(
          "No source provided, using current directory: " + source
        )
      );
    try {
      finalPath = await getRepoPath(
        source,
        createHash("md5").update(String(source)).digest("hex").slice(0, 6),
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
  } catch (error) {
    spinner2.stop(formatSpinnerMessage("Digest build failed."));
    // Only exit with error if it's not just a large file
    if (error instanceof Error && error.message.includes("too large")) {
      spinner2.stop(
        formatSpinnerMessage("Text digest built with size limits.")
      );
    } else {
      p.cancel(formatErrorMessage("Failed to build digest"));
      process.exit(1);
    }
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
  const introLines = [APP_ANALYSIS_HEADER];
  if (argv.find?.length)
    introLines.push(`Finding files containing: ${argv.find.join(", ")}`);
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
  digest: DigestResult | null,
  source: string,
  resultFilePath: string,
  argv: IngestFlags
) {
  // When using name flag and not piping, use the content directly as it includes XML tags
  if (argv.name) {
    const fileOutput = digest?.[PROP_CONTENT] || "";

    // Save content to file
    try {
      await fs.writeFile(resultFilePath, fileOutput, "utf8");
      if (argv.debug)
        console.log(formatDebugMessage("Results saved to: " + resultFilePath));
    } catch (err) {
      console.error(formatErrorMessage("Failed to save results: " + err));
      process.exit(1);
    }

    // Handle console output
    if (argv.test || process.env["NO_INTRO"]) {
      process.stdout.write(fileOutput);
      if (argv.clipboard) {
        clipboard.writeSync(fileOutput);
        console.log("\n" + formatClipboardMessage());
      }
      if (argv.pipe) {
        process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
      }
    } else {
      // Normal mode with pretty formatting
      if (argv.debug)
        console.log(formatDebugMessage("Normal mode, using formatted output"));
      p.intro(digest?.[PROP_SUMMARY] || "");
      console.log("\nDirectory Structure:\n");
      console.log(digest?.[PROP_TREE] || "");

      if (
        argv.verbose ||
        argv.debug ||
        digest?.[PROP_CONTENT].includes(
          FILE_SIZE_MESSAGE(0).replace("0.00", "")
        )
      ) {
        console.log("\nFiles Content:\n");
        console.log(digest?.[PROP_CONTENT] || "");
      }

      if (argv.clipboard) {
        clipboard.writeSync(fileOutput);
        console.log("\n" + formatClipboardMessage());
      }
    }
    return;
  }

  // Base output parts that are always included in both file and console output
  const baseOutputParts = [
    APP_HEADER,
    `**Source**: \`${String(source)}\``,
    `**Timestamp**: ${new Date().toString()}`,
    "## Summary",
    digest?.[PROP_SUMMARY] || "",
    "## Directory Structure",
    "```",
    digest?.[PROP_TREE] || "",
    "```",
  ];

  // Add bulk mode instructions if flag is set
  if (argv.bulk) {
    baseOutputParts.push(
      "## AI Instructions",
      "When I provide a set of files with paths and content, please return **one single shell script**",
      "Use `#!/usr/bin/env bash` at the start"
    );
  }

  // File output always includes everything
  const fileOutput = [
    ...baseOutputParts,
    "## Files Content",
    "```",
    digest?.[PROP_CONTENT] || "",
    "```",
  ].join("\n\n");

  // Console output varies based on verbose flag
  const consoleOutputParts = [...baseOutputParts];
  if (
    argv.verbose ||
    argv.debug ||
    digest?.[PROP_CONTENT].includes(FILE_SIZE_MESSAGE(0).replace("0.00", ""))
  ) {
    consoleOutputParts.push(
      "## Files Content",
      "```",
      digest?.[PROP_CONTENT] || "",
      "```"
    );
  }
  const consoleOutput = consoleOutputParts.join("\n\n");

  // Save content to file
  try {
    await fs.writeFile(resultFilePath, fileOutput, "utf8");
    if (argv.debug)
      console.log(formatDebugMessage("Results saved to: " + resultFilePath));
  } catch (err) {
    console.error(formatErrorMessage("Failed to save results: " + err));
    process.exit(1);
  }

  // Console output
  if (argv.test || process.env["NO_INTRO"]) {
    process.stdout.write(consoleOutput);
    if (argv.clipboard) {
      clipboard.writeSync(fileOutput);
      console.log("\n" + formatClipboardMessage());
    }
    if (argv.pipe) {
      process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
    }
  } else if (argv.pipe) {
    process.stdout.write(consoleOutput);
    if (argv.clipboard) {
      clipboard.writeSync(fileOutput);
      console.log("\n" + formatClipboardMessage());
    }
    process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
  } else {
    // Normal mode with pretty formatting
    if (argv.debug)
      console.log(formatDebugMessage("Normal mode, using formatted output"));
    p.intro(digest?.[PROP_SUMMARY] || "");
    console.log("\nDirectory Structure:\n");
    console.log(digest?.[PROP_TREE] || "");

    if (
      argv.verbose ||
      argv.debug ||
      digest?.[PROP_CONTENT].includes(FILE_SIZE_MESSAGE(0).replace("0.00", ""))
    ) {
      console.log("\nFiles Content:\n");
      console.log(digest?.[PROP_CONTENT] || "");
    }

    if (argv.clipboard) {
      clipboard.writeSync(fileOutput);
      console.log("\n" + formatClipboardMessage());
    }
  }

  // Always show the file path unless in test mode or pipe mode
  if (!argv.test && !process.env["NO_INTRO"] && !argv.pipe) {
    formatSaveMessage(resultFilePath, true);
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
