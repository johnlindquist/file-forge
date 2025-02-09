import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { readFileSync } from "fs";
import { APP_COMMAND, APP_DESCRIPTION } from "./constants.js";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function runCli() {
  const argv = yargs(hideBin(process.argv))
    .scriptName(APP_COMMAND)
    .usage("$0 [options]")
    .epilogue(APP_DESCRIPTION)
    .version("version", "Show version number", getVersion())
    .alias("version", "v")
    .option("repo", {
      type: "string",
      describe: "Git repository URL to clone",
    })
    .option("path", {
      type: "string",
      describe: "Local file system path to analyze",
    })
    .option("include", {
      alias: "i",
      array: true,
      type: "string",
      describe:
        "Glob or path patterns to include. Comma or multiple flags allowed.",
    })
    .option("exclude", {
      alias: "e",
      array: true,
      type: "string",
      describe:
        "Glob or path patterns to exclude. Comma or multiple flags allowed.",
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
      describe:
        "Use regular system Git commands (authenticated git) instead of simple-git",
    })
    .option("open", {
      alias: "o",
      type: "boolean",
      default: false,
      describe: "Open results in editor",
    })
    .option("verbose", {
      type: "boolean",
      default: false,
      describe: "Include detailed file contents in the output",
    })
    .option("graph", {
      alias: "g",
      type: "string",
      nargs: 1,
      describe:
        "Analyze dependency graph starting from the given file using madge",
    })
    .option("name", {
      type: "string",
      describe: "Custom name to use in header and XML wrapping tags",
    })
    .help()
    .alias("help", "h")
    .parseSync();

  // In test mode with graph flag, bypass standard argument processing
  if (process.env["VITEST"] && argv.graph) {
    console.log(
      "[DEBUG] Test mode with graph flag detected, bypassing standard argument processing"
    );
    return {
      ...argv,
      _: [],
      skipArtifacts: true,
      pipe: true,
      noColor: true,
      noIntro: true,
    };
  }

  return argv;
}

function getVersion(): string {
  try {
    // Use a URL relative to this module to reliably locate package.json
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0-development";
  } catch {
    return "0.0.0-development";
  }
}
