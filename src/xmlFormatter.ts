import { format } from "date-fns";
import { DigestResult, PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "./constants.js";

interface XMLOutputOptions {
    name?: string | undefined;
    template?: string | undefined;
    bulk?: boolean | undefined;
    verbose?: boolean | undefined;
}

/**
 * Escapes special characters in XML content
 */
function escapeXML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Wraps content in CDATA if it contains special characters
 */
function wrapInCDATA(content: string): string {
    if (/[<>&'"]/.test(content)) {
        return `<![CDATA[${content}]]>`;
    }
    return content;
}

/**
 * Builds XML output for File Forge analysis
 */
export function buildXMLOutput(
    digest: DigestResult,
    source: string,
    timestamp: string,
    options: XMLOutputOptions
): string {
    const projectName = options.name || "FileForgeAnalysis";
    const generatedDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<analysis name="${escapeXML(projectName)}" generated="${generatedDate}">\n`;

    // Project metadata
    xml += `  <project>\n`;
    xml += `    <source>${escapeXML(source)}</source>\n`;
    xml += `    <timestamp>${escapeXML(timestamp)}</timestamp>\n`;
    xml += `  </project>\n`;

    // Summary section
    xml += `  <summary>\n`;
    xml += `    ${wrapInCDATA(digest[PROP_SUMMARY] || "")}\n`;
    xml += `  </summary>\n`;

    // Directory structure
    xml += `  <directoryTree>\n`;
    xml += `    ${wrapInCDATA(digest[PROP_TREE] || "")}\n`;
    xml += `  </directoryTree>\n`;

    // File contents (if verbose or saving to file)
    if (options.verbose) {
        xml += `  <files>\n`;
        // Split content by file sections and wrap each in a file tag
        const fileContents = (digest[PROP_CONTENT] || "").split(/(?=^=+\nFile: .*\n=+\n)/m);
        for (const fileContent of fileContents) {
            if (!fileContent.trim()) continue;

            // Extract filename from the content using the actual header format
            const headerMatch = fileContent.match(/^=+\nFile: (.*)\n=+\n/);
            if (!headerMatch || !headerMatch[1]) continue;

            const filename = headerMatch[1].trim();
            // Remove the header to get the file content
            const content = fileContent.replace(/^=+\nFile: .*\n=+\n/, "").trim();

            xml += `    <file path="${escapeXML(filename)}">\n`;
            xml += `      ${wrapInCDATA(content)}\n`;
            xml += `    </file>\n`;
        }
        xml += `  </files>\n`;
    }

    // AI instructions if bulk mode is enabled
    if (options.bulk) {
        xml += `  <aiInstructions>\n`;
        xml += `    <instruction>When I provide a set of files with paths and content, please return **one single shell script**</instruction>\n`;
        xml += `    <instruction>Use \`#!/usr/bin/env bash\` at the start</instruction>\n`;
        xml += `  </aiInstructions>\n`;
    }

    // Template section if specified
    if (options.template) {
        xml += `  <template>\n`;
        xml += `    <name>${escapeXML(options.template)}</name>\n`;
        xml += `  </template>\n`;
    }

    xml += `</analysis>`;
    return xml;
} 