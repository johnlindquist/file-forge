import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { readFileSync } from "fs";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function runCli() {
  const argv = yargs(hideBin(process.argv))
    .scriptName("ghi")
    .usage("$0 [options] <repo-or-path>")
    .version("version", "Show version number", getVersion())
    .alias("version", "v")
    .option("include", {
      alias: "i",
      array: true,
      type: "string",
      describe: "Glob or path patterns to include. Comma or multiple flags allowed.",
    })
    .option("exclude", {
      alias: "e",
      array: true,
      type: "string",
      describe: "Glob or path patterns to exclude. Comma or multiple flags allowed.",
    })
    .option("find", {
      alias: "f",
      array: true,
      type: "string",
      describe: "Find files containing ANY of these terms (OR).",
    })
    .option("require", {
      alias: "r",
      array: true,
      type: "string",
      describe: "Find files containing ALL of these terms (AND).",
    })
    .option("branch", {
      alias: "b",
      type: "string",
      describe: "Git branch to clone if using a repo URL",
    })
    .option("commit", {
      alias: "c",
      type: "string",
      describe: "Specific commit SHA to checkout if using a repo URL",
    })
    .option("max-size", {
      alias: "s",
      type: "number",
      default: DEFAULT_MAX_SIZE,
      describe: "Maximum file size to process in bytes (default 10MB)",
    })
    .option("pipe", {
      alias: "p",
      type: "boolean",
      describe: "Pipe final output to stdout instead of opening in editor",
    })
    .option("debug", {
      type: "boolean",
      describe: "Enable debug logging",
    })
    .option("bulk", {
      alias: "k",
      type: "boolean",
      default: false,
      describe: "Add AI processing instructions to the end of the output",
    })
    .option("ignore", {
      type: "boolean",
      default: true,
      describe: "Whether to respect .gitignore files",
    })
    .option("skip-artifacts", {
      type: "boolean",
      default: true,
      describe: "Skip dependency files, build artifacts, and generated assets",
    })
    .option("clipboard", {
      alias: "y",
      type: "boolean",
      default: false,
      describe: "Copy results to clipboard",
    })
    .option("no-editor", {
      alias: "n",
      type: "boolean",
      default: false,
      describe: "Save results to file but don't open in editor",
    })
    .option("use-regular-git", {
      type: "boolean",
      default: false,
      describe: "Use regular system Git commands (authenticated git) instead of simple-git",
    })
    .option("open", {
      alias: "o",
      type: "boolean",
      default: false,
      describe: "Open results in editor",
    })
    .help()
    .alias("help", "h")
    .parseSync();
  return argv;
}

function getVersion(): string {
  try {
    // Synchronously load package.json for version info
    // Note: import is cached, so it's efficient
    const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}
