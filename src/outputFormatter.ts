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
  markdown?: boolean | undefined;
  command?: string | undefined;
  whitespace?: boolean | undefined;
  isRepoAnalysis?: boolean | undefined;
  [key: string]: unknown;
}

/**
 * Builds the full output for a digest.
 *
 * @param digest - An object containing the summary, tree, and file contents.
 * @param source - The analyzed source path.
 * @param timestamp - A formatted timestamp string.
 * @param options - IngestFlags/options that may affect output (e.g. bulk, name, pipe).
 * @returns Promise of the complete output string in either XML or markdown format.
 */
export async function buildOutput(
  digest: {
    [PROP_SUMMARY]: string;
    [PROP_TREE]: string;
    [PROP_CONTENT]: string;
  },
  source: string,
  timestamp: string,
  options: OutputOptions
): Promise<string> {
  // Use Markdown format only when explicitly requested with --markdown flag
  if (options.markdown) {
    // Use markdown format
    const header = options.name ? `# ${options.name}` : "# File Forge Analysis";

    // Build the content parts
    const contentParts = [
      `**Source**: \`${source}\``,
      `**Timestamp**: ${timestamp}`,
      options.command ? `**Command**: \`${options.command}\`` : null,
      "## Summary",
      digest[PROP_SUMMARY] || "",
      "## Directory Structure",
      "```",
      digest[PROP_TREE] || "",
      "```",
    ].filter(Boolean);

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
        try {
          // Process the template AND apply context (like date)
          const appliedTemplate = await applyTemplate(template.templateContent, digest[PROP_CONTENT]);

          // Add the processed template with proper formatting
          contentParts.push(
            "## AI Prompt Template",
            `Using template: ${template.name} (${template.description})`,
            '```\n' + appliedTemplate + '\n```'
          );
        } catch (error) {
          contentParts.push(
            "## Template Error",
            `Error applying template: ${error instanceof Error ? error.message : String(error)}`
          );
        }
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
    if (options.name && !options.pipe) {
      output = `<${options.name}>\n${output}\n</${options.name}>`;
    }

    return output;
  }

  // Default to XML output (need to handle async/await here too)
  return buildXMLOutput(digest, source, timestamp, {
    name: options.name,
    template: options.template,
    bulk: options.bulk,
    verbose: options.verbose || options.debug || !options.pipe || options.clipboard,
    command: options.command,
    whitespace: options.whitespace,
    isRepoAnalysis: options.isRepoAnalysis,
    digestContent: digest[PROP_CONTENT]
  });
}
