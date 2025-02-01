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

let [source] = argv._;
if (!source) {
  source = process.cwd();
  if (argv.debug) console.log("[DEBUG] No source provided, using current directory:", source);
}

await mkdirp(DEFAULT_LOG_DIR);
await mkdirp(DEFAULT_SEARCHES_DIR);

const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
const hashedSource = createHash("md5").update(String(source)).digest("hex").slice(0, 6);
const resultFilename = `ghi-${hashedSource}-${timestamp}.md`;
const resultFilePath = resolve(DEFAULT_SEARCHES_DIR, resultFilename);

if (argv.debug) console.log("[DEBUG] Ingesting from:", source, "Flags:", argv);

// Intro message
const introLines = ["🔍 ghi Analysis", `\nAnalyzing: \${source}`];
if (argv.find?.length) introLines.push(`Finding files containing: \${argv.find.join(", ")}`);
if (argv.include?.length) introLines.push(`Including patterns: \${argv.include.join(", ")}`);
if (argv.exclude?.length) introLines.push(`Excluding patterns: \${argv.exclude.join(", ")}`);
if (argv.branch) introLines.push(`Using branch: \${argv.branch}`);
if (argv.commit) introLines.push(`At commit: \${argv.commit}`);
if (argv.maxSize && argv.maxSize !== undefined)
  introLines.push(`Max file size: \${Math.round(argv.maxSize / 1024)}KB`);
if (argv.skipArtifacts) introLines.push("Skipping build artifacts and generated files");
if (!argv.ignore) introLines.push("Ignoring .gitignore rules");
p.intro(introLines.join("\n"));

let finalPath: string;

// --- CLONE STEP ---
if (isGitHubURL(String(source)).isValid) {
  try {
    const { url } = isGitHubURL(String(source));
    finalPath = await getRepoPath(url, hashedSource, argv, false);
  } catch {
    p.cancel("Failed to clone repository");
    process.exit(1);
  }
} else {
  try {
    finalPath = await getRepoPath(String(source), hashedSource, argv, true);
  } catch (err) {
    p.cancel(err instanceof Error ? err.message : "Failed to access directory");
    process.exit(1);
  }
}

// --- BUILD DIGEST ---
const spinner2 = p.spinner();
spinner2.start("Building text digest...");
let digest: { summary: string; treeStr: string; contentStr: string };
try {
  digest = await ingestDirectory(finalPath, argv);
  spinner2.stop("Text digest built.");
} catch {
  spinner2.stop("Digest build failed.");
  p.cancel("Failed to build digest");
  process.exit(1);
}

const output = [
  "# ghi\n",
  `**Source**: \\\`\${String(source)}\\\`\n`,
  `**Timestamp**: \${new Date().toString()}\n`,
  "## Summary\n",
  `\${digest.summary}\n`,
  "## Directory Structure\n",
  "```\n" + digest.treeStr + "\n```\n",
  "## Files Content\n",
  "```\n" + digest.contentStr + "\n```",
].join("\n");

// Log summary to console
const summaryOutput = [
  "# ghi\n",
  `**Source**: \\\`\${String(source)}\\\`\n`,
  `**Timestamp**: \${new Date().toString()}\n`,
  "## Summary\n",
  `\${digest.summary}\n`,
  "## Directory Structure\n",
  "```\n" + digest.treeStr + "\n```\n",
].join("\n");

console.log(summaryOutput);

try {
  await fs.writeFile(resultFilePath, output, "utf8");
} catch {
  p.cancel("Failed to write output file");
  process.exit(1);
}

const fileSize = Buffer.byteLength(output, "utf8");
if (fileSize > MAX_EDITOR_SIZE) {
  p.note(
    `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
    `Results saved to file (${Math.round(fileSize / 1024 / 1024)}MB). File too large for editor; open it manually.`,
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
  if (argv.pipe) {
    console.log(output);
    console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
  } else if (!argv.open) {
    p.note(`${RESULTS_SAVED_MARKER} ${resultFilePath}`, "Results saved to file.");
  } else {
    const editorConfig = await getEditorConfig();
    if (!editorConfig.skipEditor && editorConfig.command) {
      try {
        execSync(`${editorConfig.command} "${resultFilePath}"`);
        p.note(
          `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
          "Opened in your configured editor.",
        );
      } catch {
        p.note(
          `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
          `Couldn't open with: ${editorConfig.command}`,
        );
      }
    } else {
      p.note(
        `${RESULTS_SAVED_MARKER} ${resultFilePath}`,
        "You can open the file manually.",
      );
    }
  }
  p.outro("Done! 🎉");
}
