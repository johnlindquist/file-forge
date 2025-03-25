// import { format } from "date-fns";
import { DigestResult, PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "./constants.js";
import { getTemplateByName } from "./templates.js";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

interface XMLOutputOptions {
    name?: string | undefined;
    template?: string | undefined;
    bulk?: boolean | undefined;
    verbose?: boolean | undefined;
    command?: string | undefined;
    whitespace?: boolean | undefined;
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
    return content;
}

/**
 * Gets Git information for the current directory
 */
function getGitInfo(source: string): Record<string, string> {
    const gitInfo: Record<string, string> = {};

    try {
        // Check if .git directory exists
        if (!existsSync(`${source}/.git`)) {
            return gitInfo;
        }

        // Get current branch
        gitInfo['branch'] = execSync('git rev-parse --abbrev-ref HEAD', { cwd: source }).toString().trim();

        // Get remote URL
        gitInfo['remote'] = execSync('git remote get-url origin', { cwd: source }).toString().trim();

        // Get current commit hash
        gitInfo['commit'] = execSync('git rev-parse HEAD', { cwd: source }).toString().trim();

        // Get commit date
        gitInfo['commitDate'] = execSync('git log -1 --format=%cd', { cwd: source }).toString().trim();

    } catch (error) {
        // If any Git command fails, return empty info
        console.warn('Failed to get Git information:', error);
    }

    return gitInfo;
}

/**
 * Extracts content from tags in a template string
 * @param templateContent The raw template content
 * @param tagName The tag name to extract content from
 * @returns The content within the specified tag or empty string if not found
 */
function extractTagContent(templateContent: string, tagName: string): string {
    // Skip extraction if templateContent is undefined
    if (!templateContent) {
        return '';
    }

    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = templateContent.match(regex);
    return match && match[1] ? match[1].trim() : '';
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
    // const projectName = options.name || "FileForgeAnalysis";
    // const generatedDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // let xml = `<analysis name="${escapeXML(projectName)}" generated="${generatedDate}">\n`;
    let xml = ``;

    // Use conditional indentation
    const indent = options.whitespace ? "  " : "";
    const childIndent = options.whitespace ? "    " : "  ";
    const contentIndent = options.whitespace ? "      " : "    ";

    // Project metadata
    xml += `${indent}<project>\n`;
    xml += `${childIndent}<source>${escapeXML(source)}</source>\n`;
    xml += `${childIndent}<timestamp>${escapeXML(timestamp)}</timestamp>\n`;
    if (options.command) {
        xml += `${childIndent}<command>${escapeXML(options.command)}</command>\n`;
    }

    // Add Git information if available
    const gitInfo = getGitInfo(source);
    if (Object.keys(gitInfo).length > 0) {
        xml += `${childIndent}<git>\n`;
        if (gitInfo['branch']) xml += `${contentIndent}<branch>${escapeXML(gitInfo['branch'])}</branch>\n`;
        if (gitInfo['remote']) xml += `${contentIndent}<remote>${escapeXML(gitInfo['remote'])}</remote>\n`;
        if (gitInfo['commit']) xml += `${contentIndent}<commit>${escapeXML(gitInfo['commit'])}</commit>\n`;
        if (gitInfo['commitDate']) xml += `${contentIndent}<commitDate>${escapeXML(gitInfo['commitDate'])}</commitDate>\n`;
        xml += `${childIndent}</git>\n`;
    }

    xml += `${indent}</project>\n`;

    // Summary section
    xml += `${indent}<summary>\n`;
    xml += `${childIndent}${wrapInCDATA(digest[PROP_SUMMARY] || "")}\n`;
    xml += `${indent}</summary>\n`;

    // Directory structure
    xml += `${indent}<directoryTree>\n`;
    xml += `${childIndent}${wrapInCDATA(digest[PROP_TREE] || "")}\n`;
    xml += `${indent}</directoryTree>\n`;

    // File contents (if verbose or saving to file)
    if (options.verbose) {
        xml += `${indent}<files>\n`;
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

            xml += `${childIndent}<file path="${escapeXML(filename)}">\n`;
            xml += `${contentIndent}${wrapInCDATA(content)}\n`;
            xml += `${childIndent}</file>\n`;
        }
        xml += `${indent}</files>\n`;
    }

    // AI instructions if bulk mode is enabled
    if (options.bulk) {
        xml += `${indent}<aiInstructions>\n`;
        xml += `${childIndent}<instruction>When I provide a set of files with paths and content, please return **one single shell script**</instruction>\n`;
        xml += `${childIndent}<instruction>Use \`#!/usr/bin/env bash\` at the start</instruction>\n`;
        xml += `${indent}</aiInstructions>\n`;
    }

    // Template section if specified
    if (options.template) {
        const template = getTemplateByName(options.template);
        if (template) {
            xml += `\n`;

            // Extract tag content directly from the raw template
            const instructionsContent = extractTagContent(template.templateContent, 'instructions');
            const exampleContent = extractTagContent(template.templateContent, 'example');

            // For the task tag, use a default for the plan template or extract from the template
            let taskContent = "Create a detailed implementation plan with specific steps marked as `<task/>` items.";

            // But for other templates, extract the task content from the template
            if (template.name !== 'plan') {
                const extractedTaskContent = extractTagContent(template.templateContent, 'task');
                if (extractedTaskContent) {
                    taskContent = extractedTaskContent;
                }
            }

            // Add the extracted content to the XML output
            if (instructionsContent) {
                xml += `${indent}<instructions>\n${childIndent}${wrapInCDATA(instructionsContent)}\n${indent}</instructions>\n`;
            }

            if (exampleContent) {
                xml += `${indent}<example>\n${childIndent}${wrapInCDATA(exampleContent)}\n${indent}</example>\n`;
            }

            xml += `${indent}<task>\n${childIndent}${wrapInCDATA(taskContent)}\n${indent}</task>\n`;
        } else {
            xml += `\n${indent}<e>Template "${escapeXML(options.template)}" not found. Use --list-templates to see available templates.</e>\n`;
        }
    }

    return xml;
}
