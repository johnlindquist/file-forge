import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { APP_COMMAND, APP_DESCRIPTION } from "./constants.js";
import { getVersion } from "./version.js";
import { FfgConfig } from "./types.js";
import { formatDebugMessage } from "./formatter.js";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function runCli(configData: FfgConfig | null) {
  // --- Define yargs options --- Start
  const yargsInstanceWithOptions = yargs(hideBin(process.argv))
    .scriptName(APP_COMMAND)
    .usage(`${APP_COMMAND} [options] <path|repo>`)
    .positional("path", {
      describe: "Path to directory or file to analyze",
      type: "string",
    })
    .epilogue(APP_DESCRIPTION)
    .version("version", "Show version number", getVersion())
    .alias("version", "v")
    .option("repo", {
      type: "string",
      describe: "Git repository URL to clone and analyze",
    })
    .option("path", {
      type: "string",
      describe: "Local file system path to analyze",
    })
    .option("include", {
      type: "array",
      describe: "Glob patterns for files/directories to include",
      default: [], // Initialize as empty array for potential merging
    })
    .option("exclude", {
      alias: "e",
      type: "array",
      describe: "Glob patterns for files/directories to exclude",
      default: [], // Initialize as empty array for potential merging
    })
    .option("extension", {
      alias: "x",
      type: "array",
      describe: "File extensions to include (e.g., .ts, .js)",
      default: [],
    })
    .option("find", {
      alias: "f",
      type: "array",
      describe: "Search for files containing ANY of the provided terms",
      default: [],
    })
    .option("require", {
      alias: "r",
      type: "array",
      describe: "Require files to contain ALL of the provided terms",
      default: [],
    })
    .option("branch", {
      alias: "b",
      type: "string",
      describe: "Specify a Git branch to analyze (when using a repo URL)",
    })
    .option("commit", {
      alias: "c",
      type: "string",
      describe: "Checkout a specific commit (when using a repo URL)",
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
      default: false,
      describe: "Pipe output to stdout instead of opening in an editor",
    })
    .option("debug", {
      type: "boolean",
      default: false,
      describe: "Enable debug logging for troubleshooting",
    })
    .option("bulk", {
      alias: "k",
      type: "boolean",
      default: false,
      describe: "Append AI processing instructions to the output",
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
      describe: "Copy the analysis result to the clipboard",
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
      type: "string",
      describe: "Open results in editor, optionally specify editor command (e.g., --open=code)",
    })
    .option("config", {
      type: "boolean",
      default: false,
      describe: "Open the configuration file in the default editor",
    })
    .option("verbose", {
      type: "boolean",
      default: false,
      describe: "Include detailed file contents in the output",
    })
    .option("graph", {
      alias: "g",
      type: "string",
      describe: "Generate a dependency graph starting from the given file",
    })
    .option("name", {
      type: "string",
      describe: "Custom name to use in header and XML wrapping tags",
    })
    .option("svg", {
      type: "boolean",
      default: false,
      describe: "Include SVG files in the output (excluded by default)",
    })
    .option("template", {
      alias: "t",
      type: "string",
      describe: "Apply a prompt template to the output (use --list-templates to see available templates)",
    })
    .option("list-templates", {
      type: "boolean",
      default: false,
      describe: "List all available prompt templates",
    })
    .option("create-template", {
      type: "string",
      describe: "Create a new template file with the given name in the user templates directory",
    })
    .option("edit-template", {
      type: "string",
      describe: "Find an existing template by name and display its file path for editing",
    })
    .option("markdown", {
      type: "boolean",
      description: "Output in Markdown format (default output is XML)",
      default: false,
    })
    .option("no-token-count", {
      describe: "Disable token counting in the output",
      type: "boolean",
      default: false,
    })
    .option("whitespace", {
      type: "boolean",
      default: false,
      describe: "Enable extra indentation and spacing in output",
    })
    .option("render-template", {
      type: "string",
      describe: "Render a template (including partials) and open it in the editor, skipping analysis. Provide template name.",
    })
    .option("dry-run", {
      alias: "D",
      type: "boolean",
      default: false,
      describe: "Perform analysis and print output to stdout without saving to file or opening editor."
    })
    .option("use", {
      alias: "config-name",
      type: "string",
      describe: "Use a named command defined in ffg.config.jsonc"
    })
    .option("save", {
      type: "boolean",
      default: false,
      describe: "Save the current flags as the default command in ffg.config.jsonc"
    })
    .option("save-as", {
      type: "string",
      describe: "Save the current flags as a named command in ffg.config.jsonc (e.g., --save-as my-query)"
    })
    .example("$0 --path /path/to/project", "Analyze a local project directory")
    .example(
      "$0 https://github.com/owner/repo --branch develop",
      "Clone and analyze a GitHub repository on the 'develop' branch"
    )
    .example(
      '$0 /path/to/project --include "**/*.ts" --exclude "*.spec.ts"',
      "Include all TypeScript files but exclude test files"
    )
    .example(
      '$0 /path/to/project --find "console,debug" --require "log"',
      "Find files containing either 'console' or 'debug' and require them to contain 'log'"
    )
    .example(
      '$0 /path/to/project --template "refactor"',
      "Analyze a project and apply the 'refactor' prompt template for AI processing"
    )
    .example(
      '$0 /path/to/project --open code-insiders',
      "Analyze project and open results in VS Code Insiders"
    )
    .example(
      '$0 --config',
      "Open the File Forge configuration file"
    )
    .example(
      '$0 --render-template worktree',
      "Render the 'worktree' template and open it in the editor"
    )
    .help()
    .alias("help", "h");
  // --- Define yargs options --- End

  // Minimal parse just to check for config-related flags and user input presence
  const initialArgs = yargs(hideBin(process.argv))
    .option('use', { type: 'string' })
    .help(false) // Prevent this minimal instance from handling --help
    .version(false) // Prevent this minimal instance from handling --version
    .parseSync();

  let configToApply = {};
  let appliedConfigType = 'none'; // 'none', 'default', 'named'

  // Determine which config settings to apply as defaults
  if (configData) {
    // 1. Check for --use flag
    if (initialArgs.use && configData.commands && configData.commands[initialArgs.use]) {
      const commandName = initialArgs.use as string;
      configToApply = { ...configData.commands[commandName] };
      appliedConfigType = 'named';
      if (initialArgs['debug']) {
        console.log(formatDebugMessage(`Applying config from named command: ${commandName}`));
        console.log(formatDebugMessage(`Named command flags: ${JSON.stringify(configToApply, null, 2)}`));
      }
    }
    // 2. If --use was NOT provided, apply defaultCommand if it exists as base defaults
    else if (!initialArgs.use && configData.defaultCommand) {
      configToApply = { ...configData.defaultCommand };
      appliedConfigType = 'default';
      if (initialArgs['debug']) {
        console.log(formatDebugMessage("Applying config from defaultCommand as base defaults"));
        console.log(formatDebugMessage(`Default command flags: ${JSON.stringify(configToApply, null, 2)}`));
      }
    }
  }

  // Apply the determined config as defaults BEFORE the final parse
  // Yargs will handle precedence: command line > config defaults > yargs option default
  // Note: yargs merges defaults shallowly. For deep merge, other methods or libraries might be needed,
  // but for CLI flags, shallow merging + command line override is usually sufficient.
  // Arrays from defaults are NOT automatically merged by yargs' .default().
  // We need a custom approach if we want CLI array flags to ADD to config array flags.

  // Apply config defaults
  const yargsInstanceWithDefaults = yargsInstanceWithOptions.default(configToApply);

  // Parse the actual command line arguments ONCE
  let argv = await yargsInstanceWithDefaults.parse();

  // --- Manual Array Merging --- Start
  // Merge arrays if a config was applied (default or named)
  if (appliedConfigType !== 'none') {
    // Keep track of the actual user input for arrays before defaults were applied
    const initialArrayArgs: { [key: string]: string[] } = {};
    for (const key of ['include', 'exclude', 'extension', 'find', 'require']) {
      // Check initialArgs directly to see if user provided the flag
      if (initialArgs[key] !== undefined) {
        // Ensure it's always an array, even if a single string was passed via CLI
        initialArrayArgs[key] = Array.isArray(initialArgs[key]) ? initialArgs[key] : [initialArgs[key] as string];
      }
    }

    for (const key of ['include', 'exclude', 'extension', 'find', 'require']) {
      const configValue = configToApply[key as keyof typeof configToApply];
      const userProvidedValue = initialArrayArgs[key]; // User input BEFORE defaults

      // Only merge if user actually provided the flag AND the config also has it (as an array)
      if (userProvidedValue && Array.isArray(configValue)) {
        const mergedArray = [...new Set([...configValue, ...userProvidedValue])];
        argv[key] = mergedArray; // Update the final argv
        if (initialArgs['debug']) console.log(formatDebugMessage(`Manually merged array flag --${key}: ${JSON.stringify(mergedArray)} (Config: ${JSON.stringify(configValue)}, User: ${JSON.stringify(userProvidedValue)})`));
      }
      // If user did NOT provide the flag, argv[key] already holds the config value via .default(), so do nothing.
      // If user provided the flag but config did NOT have it, argv[key] already holds the user value via parsing, so do nothing.
    }
  }
  // --- Manual Array Merging --- End

  // --- Original Logic - Slightly Modified --- Start
  // In test mode with graph flag, bypass standard argument processing (Remains the same)
  if (process.env["VITEST"] && argv.graph) {
    console.log(
      "[DEBUG] Test mode with graph flag detected, bypassing standard argument processing"
    );
    return {
      ...argv,
      _: [], // Ensure _ is empty here
      skipArtifacts: true,
      pipe: true,
      noColor: true,
      noIntro: true,
    };
  }

  // Map --list-templates to listTemplates for consistency (Remains the same)
  if (argv["list-templates"]) {
    const result = { ...argv, listTemplates: argv["list-templates"] };
    return result;
  }

  // Convert kebab-case options to camelCase
  const parsedArgs = {
    ...argv,
    // Remove explicit boolean fallbacks - rely on yargs .default() and configToApply
    // pipe: argv.pipe ?? false, // Removed
    // debug: argv.debug ?? false, // Removed
    // bulk: argv.bulk ?? false, // Removed
    // ignore: argv.ignore ?? true, // Removed
    // skipArtifacts: argv.skipArtifacts ?? true, // Removed
    // clipboard: argv.clipboard ?? false, // Removed
    // noEditor: argv["no-editor"] ?? false, // Removed
    // useRegularGit: argv["use-regular-git"] ?? false, // Removed
    // config: argv.config ?? false, // Removed
    // verbose: argv.verbose ?? false, // Removed
    // svg: argv.svg ?? false, // Removed
    // markdown: argv.markdown ?? false, // Removed
    // noTokenCount: argv["no-token-count"] ?? false, // Removed
    // whitespace: argv.whitespace ?? false, // Removed
    // dryRun: argv["dry-run"] ?? false, // Removed
    // Map kebab-case aliases correctly
    createTemplate: argv["create-template"],
    editTemplate: argv["edit-template"],
    renderTemplate: argv["render-template"],
    useConfigName: argv["config-name"],
    use: argv["use"],
    // Ensure these aliases are mapped if they exist
    noTokenCount: argv["no-token-count"],
    dryRun: argv["dry-run"],
    noEditor: argv["no-editor"],
    useRegularGit: argv["use-regular-git"],
  };

  // If 'path' wasn't provided as an option, check the first positional arg
  if (!parsedArgs.path && argv._ && argv._.length > 0) {
    // Check if the first positional arg doesn't look like another flag
    const firstPositional = String(argv._[0]);
    if (!firstPositional.startsWith('-')) {
      parsedArgs.path = firstPositional;
      if (initialArgs['debug']) console.log(formatDebugMessage(`Using first positional argument as path: ${parsedArgs.path}`));
    }
  }

  // Ensure array types are always arrays, even if empty
  for (const key of ['include', 'exclude', 'extension', 'find', 'require']) {
    // Use bracket notation with a type assertion for dynamic access
    const typedKey = key as keyof typeof parsedArgs;
    if (!Array.isArray(parsedArgs[typedKey])) {
      // Assert that the property exists and can be assigned an array
      (parsedArgs as Record<keyof typeof parsedArgs, unknown>)[typedKey] = [];
    }
  }

  // Add final debug logging after all merging is done
  if (argv.debug) {
    console.log(formatDebugMessage(`Final merged configuration type: ${appliedConfigType}`));
    console.log(formatDebugMessage("Final merged argv after config and CLI processing:"));
    console.log(formatDebugMessage(JSON.stringify(argv, null, 2)));
  }

  return parsedArgs;
}
