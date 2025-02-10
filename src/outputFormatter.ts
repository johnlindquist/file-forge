import { PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "./constants.js";

interface OutputOptions {
  bulk?: boolean | undefined;
  name?: string | undefined;
  pipe?: boolean | undefined;
  verbose?: boolean | undefined;
  debug?: boolean | undefined;
  [key: string]: unknown;
}

/**
 * Builds the full markdown output for a digest.
 *
 * @param digest - An object containing the summary, tree, and file contents.
 * @param source - The analyzed source path.
 * @param timestamp - A formatted timestamp string.
 * @param options - IngestFlags/options that may affect output (e.g. bulk, name, pipe).
 * @returns The complete markdown string.
 */
export function buildOutput(
  digest: {
    [PROP_SUMMARY]: string;
    [PROP_TREE]: string;
    [PROP_CONTENT]: string;
  },
  source: string,
  timestamp: string,
  options: OutputOptions
): string {
  // Determine the main header based on name option
  const header = options.name ? `# ${options.name}` : "# File Forge Analysis";

  // Build the content parts
  const contentParts = [
    `**Source**: \`${source}\``,
    `**Timestamp**: ${timestamp}`,
    "## Summary",
    digest[PROP_SUMMARY] || "",
    "## Directory Structure",
    "```",
    digest[PROP_TREE] || "",
    "```",
  ];

  // Append AI instructions if bulk mode is enabled
  if (options.bulk) {
    contentParts.push(
      "## AI Instructions",
      "When I provide a set of files with paths and content, please return **one single shell script**",
      "Use `#!/usr/bin/env bash` at the start"
    );
  }

  // Add file contents section if verbose is enabled
  if (options.verbose || options.debug) {
    contentParts.push(
      "## Files Content",
      "```",
      digest[PROP_CONTENT] || "",
      "```"
    );
  }

  // Combine header and content
  let output = `${header}\n\n${contentParts.join("\n\n")}`;

  // Wrap in XML tags if name is provided and not piping
  if (options.name && !options.pipe) {
    output = `<${options.name}>\n${output}\n</${options.name}>`;
  }

  return output;
}
