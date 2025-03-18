#!/usr/bin/env node
// src/index.ts

import { format } from "date-fns";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import { resolve, dirname } from "node:path";
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
  PROP_SUMMARY,
  PROP_TREE,
  PROP_CONTENT,
  DigestResult,
} from "./constants.js";
import { listTemplates } from "./templates.js";
import clipboard from "clipboardy";
import {
  formatDebugMessage,
  formatErrorMessage,
  formatIntroMessage,
  formatSpinnerMessage,
  formatClipboardMessage,
  formatSaveMessage,
  formatTokenCountMessage,
} from "./formatter.js";
import { buildOutput } from "./outputFormatter.js";
import { getHashedSource } from "./utils.js";
import { writeFile, mkdir } from "node:fs/promises";
import { countTokens } from "./tokenCounter.js";

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

// Export handleOutput for testing
export async function handleOutput(
  digest: DigestResult | null,
  source: string,
  resultFilePath: string,
  argv: IngestFlags
) {
  const timestamp = format(new Date(), "yyyyMMdd-HHmmss");

  // If digest is null, create an empty digest
  const safeDigest = digest || {
    [PROP_SUMMARY]: "No files found or directory is empty",
    [PROP_TREE]: "",
    [PROP_CONTENT]: ""
  };

  // For file output, always include everything
  const fileOutput = buildOutput(safeDigest, source, timestamp, {
    ...argv,
    verbose: true, // Always include file contents in file output
    pipe: false, // Never pipe for file output to ensure XML wrapping works
  });

  // For console output, respect the verbose flag and preserve the name property
  const consoleOutput = buildOutput(safeDigest, source, timestamp, {
    ...argv,
    // Preserve name property for header
  });

  // Only count tokens if not disabled
  let tokenCount = 0;

  try {
    // Create the directory if it doesn't exist
    await mkdir(dirname(resultFilePath), { recursive: true });
    await writeFile(resultFilePath, fileOutput);
    if (argv.debug)
      console.log(formatDebugMessage("Results saved to: " + resultFilePath));
  } catch (error) {
    console.error(formatErrorMessage("Failed to save results: " + error));
    if (!process.env["VITEST"]) {
      process.exit(1);
    }
    return;
  }

  if (argv.test || process.env["NO_INTRO"]) {
    process.stdout.write(consoleOutput);
    if (argv.clipboard) {
      clipboard.writeSync(consoleOutput);
      console.log("\n" + formatClipboardMessage());
    }
    if (argv.pipe) {
      process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
    }
  } else if (argv.pipe) {
    process.stdout.write(consoleOutput);
    if (argv.clipboard) {
      clipboard.writeSync(consoleOutput);
      console.log("\n" + formatClipboardMessage());
    }
    process.stdout.write(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
  } else {
    // Normal mode with pretty formatting (fallback)
    p.intro(safeDigest[PROP_SUMMARY]);
    console.log("\nDirectory Structure:\n");
    console.log(safeDigest[PROP_TREE]);
    if (argv.verbose || argv.debug) {
      console.log("\nFiles Content:\n");
      console.log(safeDigest[PROP_CONTENT]);
    }
    if (argv.clipboard) {
      clipboard.writeSync(consoleOutput);
      console.log("\n" + formatClipboardMessage());
    }
  }

  // Check both the parsed argv and the raw process.argv for the --no-token-count flag
  const hasNoTokenCountFlag = argv.noTokenCount || process.argv.includes("--no-token-count");

  // Display token count information if not disabled
  if (!hasNoTokenCountFlag) {
    // Only calculate tokens if we're going to display them
    tokenCount = countTokens(fileOutput);
    console.log(formatTokenCountMessage(tokenCount));
  }

  if (!argv.test && !process.env["NO_INTRO"] && !argv.pipe) {
    formatSaveMessage(resultFilePath, true);
  }
}

// Main function that handles the CLI flow
export async function main() {
  // Parse CLI arguments
  const argv = await runCli() as IngestFlags & { _: (string | number)[] };

  // Set up paths
  const paths = envPaths(APP_SYSTEM_ID);
  const DEFAULT_CONFIG_DIR = paths.config;
  const DEFAULT_LOG_DIR = resolve(DEFAULT_CONFIG_DIR, "logs");
  const DEFAULT_SEARCHES_DIR = resolve(DEFAULT_CONFIG_DIR, "searches");

  // Load user templates if they exist
  try {
    const userTemplatesPath = resolve(DEFAULT_CONFIG_DIR, "templates.yaml");
    const { loadUserTemplates } = await import("./templates.js");
    await loadUserTemplates(userTemplatesPath);
    if (argv.debug) {
      console.log(formatDebugMessage(`Checked for user templates at: ${userTemplatesPath}`));
    }
  } catch (error) {
    if (argv.debug) {
      console.log(formatDebugMessage(`Error loading user templates: ${error}`));
    }
  }

  // Handle template listing
  if (argv.listTemplates) {
    console.log("\nAvailable prompt templates:\n");
    const templates = listTemplates();

    // Group templates by category
    const categorized = templates.reduce((acc, template) => {
      const category = template.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    // Print templates by category
    for (const [category, categoryTemplates] of Object.entries(categorized)) {
      console.log(`\n## ${category.charAt(0).toUpperCase() + category.slice(1)}`);
      categoryTemplates.forEach(template => {
        console.log(`  - ${template.name}: ${template.description}`);
      });
    }

    console.log("\nUse --template <name> to apply a template to your analysis");
    return;
  }

  if (argv.debug) {
    console.log(formatDebugMessage(`CLI Arguments:`));
    console.log(formatDebugMessage(`argv.repo = ${argv.repo}`));
    console.log(formatDebugMessage(`argv.path = ${argv.path}`));
    console.log(
      formatDebugMessage(`All argv: ${JSON.stringify(argv, null, 2)}`)
    );
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
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
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
        return;
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
        if (!process.env["VITEST"]) {
          process.exit(1);
        }
        return;
      }

      return;
    } catch (error) {
      p.cancel(formatErrorMessage(`Graph analysis failed: ${error}`));
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
    }
  }

  if (argv.repo && argv.path) {
    console.error("Error: Please provide either --repo or --path, not both.");
    if (!process.env["VITEST"]) {
      process.exit(1);
    }
    return;
  }

  if (argv.repo) {
    source = argv.repo;
    try {
      const hashedSource = getHashedSource(source);
      finalPath = await getRepoPath(source, hashedSource, argv, false);
    } catch {
      p.cancel(formatErrorMessage("Failed to clone repository"));
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
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
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
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
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
    }
  }

  await mkdirp(DEFAULT_LOG_DIR);
  await mkdirp(DEFAULT_SEARCHES_DIR);

  const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
  const hashedSource = getHashedSource(source);
  resultFilePath = resolve(
    DEFAULT_SEARCHES_DIR,
    `ghi-${hashedSource}-${timestamp}.md`
  );

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
      if (!process.env["VITEST"]) {
        process.exit(1);
      }
      return;
    }
  }

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

  // After getting digest, call handleOutput
  await handleOutput(digest, source, resultFilePath, argv);
}

// Helper function to check if we're the main module
function isMainModule(): boolean {
  const importPath = new URL(import.meta.url).pathname;
  const execPath = process.argv[1];
  if (!execPath) return false;
  // Compare last 3 path segments (e.g., '@org/package/dist/index.js')
  return importPath.endsWith(execPath.split('/').slice(-3).join('/'));
}

// Only run main if this is the main module
if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
