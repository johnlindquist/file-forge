import { PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "./constants.js";
import { getTemplateByName, applyTemplate } from "./templates.js";
import { buildXMLOutput } from "./xmlFormatter.js";

interface OutputOptions {
  bulk?: boolean | undefined;
  name?: string | undefined;
  pipe?: boolean | undefined;
  verbose?: boolean | undefined;
  debug?: boolean | undefined;
  template?: string | undefined;
  clipboard?: boolean | undefined;
  xml?: boolean | undefined;
  [key: string]: unknown;
}

/**
 * Builds the full output for a digest.
 *
 * @param digest - An object containing the summary, tree, and file contents.
 * @param source - The analyzed source path.
 * @param timestamp - A formatted timestamp string.
 * @param options - IngestFlags/options that may affect output (e.g. bulk, name, pipe).
 * @returns The complete output string in either XML or markdown format.
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
  // If XML output is explicitly requested and not piping to console, use XML formatter
  if (options.xml && !options.pipe) {
    return buildXMLOutput(digest, source, timestamp, {
      name: options.name,
      template: options.template,
      bulk: options.bulk,
      verbose: options.verbose || options.debug || !options.pipe || options.clipboard,
    });
  }

  // Otherwise use markdown format
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

  // Add file contents section if verbose is enabled, saving to file, or clipboard is enabled
  if (options.verbose || options.debug || !options.pipe || options.clipboard) {
    contentParts.push(
      "## Files Content",
      "```",
      digest[PROP_CONTENT] || "",
      "```"
    );
  }

  // Append AI instructions if bulk mode is enabled
  if (options.bulk) {
    contentParts.push(
      "## AI Instructions",
      "When I provide a set of files with paths and content, please return **one single shell script**",
      "Use `#!/usr/bin/env bash` at the start"
    );
  }

  // Apply template if specified, but only after the standard content
  if (options.template) {
    const template = getTemplateByName(options.template);
    if (template) {
      // Combine all content for the template
      const allContent = [
        digest[PROP_SUMMARY] || "",
        "```",
        digest[PROP_TREE] || "",
        "```",
        digest[PROP_CONTENT] || ""
      ].join("\n\n");

      // Apply the template to the content
      const promptContent = applyTemplate(template, allContent);

      contentParts.push(
        "## AI Prompt Template",
        `Using template: ${template.name} (${template.description})`,
        promptContent
      );
    } else {
      contentParts.push(
        "## Template Error",
        `Template "${options.template}" not found. Use --list-templates to see available templates.`
      );
    }
  }

  // Combine header and content
  let output = `${header}\n\n${contentParts.join("\n\n")}`;

  // Wrap in XML tags if name is provided and not piping
  if (options.name && !options.pipe && !options.xml) {
    output = `<${options.name}>\n${output}\n</${options.name}>`;
  }

  return output;
}
