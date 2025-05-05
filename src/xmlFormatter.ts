// import { format } from "date-fns";
import { DigestResult, PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "./constants.js";
import { getTemplateByName, applyTemplate } from "./templates.js";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { formatDebugMessage } from "./formatter.js";

/** Converts Windows backslashes to POSIX forward slashes */
const toPosixPath = (p: string) => p.replace(/\\/g, "/");

interface XMLOutputOptions {
    name?: string | undefined;
    template?: string | undefined;
    bulk?: boolean | undefined;
    verbose?: boolean | undefined;
    command?: string | undefined;
    whitespace?: boolean | undefined;
    isRepoAnalysis?: boolean | undefined;
    digestContent?: string | undefined;
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
 * Gets Git information for the current directory
 */
function getGitInfo(source: string): Record<string, string> {
    const gitInfo: Record<string, string> = {};
    const gitDirPath = join(source, ".git");

    // Only proceed if source appears to be a git repository
    if (!existsSync(gitDirPath)) {
        if (process.env['DEBUG']) {
            console.log(formatDebugMessage(`No .git directory found in ${source}, skipping Git info.`));
        }
        return gitInfo;
    }

    try {
        // Use --quiet to reduce stderr noise and || true to prevent non-zero exit codes from throwing
        gitInfo['branch'] = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null || true', { cwd: source }).toString().trim();
        gitInfo['remote'] = execSync('git remote get-url origin 2>/dev/null || true', { cwd: source }).toString().trim();
        gitInfo['commit'] = execSync('git rev-parse HEAD 2>/dev/null || true', { cwd: source }).toString().trim();
        gitInfo['commitDate'] = execSync('git log -1 --format=%cd 2>/dev/null || true', { cwd: source }).toString().trim();

        // Clean up empty strings if commands failed silently
        for (const key in gitInfo) {
            if (!gitInfo[key]) {
                delete gitInfo[key];
            }
        }
    } catch (error) {
        // Log error only in debug mode
        if (process.env['DEBUG']) {
            console.log(formatDebugMessage(`Failed to get Git information for ${source}: ${error instanceof Error ? error.message : String(error)}`));
        }
        // Return whatever info was successfully gathered, or empty object
    }

    return gitInfo;
}

/**
 * Builds XML output for File Forge analysis
 */
export async function buildXMLOutput(
    digest: DigestResult,
    source: string,
    timestamp: string,
    options: XMLOutputOptions
): Promise<string> {
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

    // Add Git information ONLY if it was a repo analysis or explicitly requested
    if (options.isRepoAnalysis) {
        const gitInfo = getGitInfo(source);
        if (Object.keys(gitInfo).length > 0) {
            xml += `${childIndent}<git>\n`;
            if (gitInfo['branch']) xml += `${contentIndent}<branch>${escapeXML(gitInfo['branch'])}</branch>\n`;
            if (gitInfo['remote']) xml += `${contentIndent}<remote>${escapeXML(gitInfo['remote'])}</remote>\n`;
            if (gitInfo['commit']) xml += `${contentIndent}<commit>${escapeXML(gitInfo['commit'])}</commit>\n`;
            if (gitInfo['commitDate']) xml += `${contentIndent}<commitDate>${escapeXML(gitInfo['commitDate'])}</commitDate>\n`;
            xml += `${childIndent}</git>\n`;
        }
    }

    xml += `${indent}</project>\n`;

    // Summary section
    xml += `${indent}<summary>\n`;
    xml += `${childIndent}${digest[PROP_SUMMARY] || ""}\n`;
    xml += `${indent}</summary>\n`;

    // Directory structure
    xml += `${indent}<directoryTree>\n`;
    xml += `${digest[PROP_TREE] || ""}\n`;
    xml += `${indent}</directoryTree>\n`;

    // File contents (if verbose or saving to file)
    if (options.verbose) {
        xml += `${indent}<files>\n`;
        // Split content by file sections and wrap each in a file tag
        const fileContents = (digest[PROP_CONTENT] || "").split(/(?=^=+\nFile: .*\n=+\n)/m);

        if (process.env["DEBUG"]) {
            console.log(`[DEBUG] XML Formatter: Found ${fileContents.length} file content blocks`);
        }

        for (const fileContent of fileContents) {
            if (!fileContent.trim()) continue;

            // Extract filename from the content using the actual header format
            const headerMatch = fileContent.match(/^=+\nFile: (.*)\n=+\n/);
            if (!headerMatch || !headerMatch[1]) {
                if (process.env["DEBUG"]) {
                    console.log(`[DEBUG] XML Formatter: No header match found in content: ${fileContent.substring(0, 100)}...`);
                }
                continue;
            }

            const fullPath = headerMatch[1].trim();
            const posixPath = toPosixPath(fullPath); // Convert to POSIX path

            if (process.env["DEBUG"]) {
                console.log(`[DEBUG] XML Formatter: Processing file path: ${posixPath}`); // Log posixPath
            }

            // Remove the header to get the file content
            const content = fileContent.replace(/^=+\nFile: .*\n=+\n/, "");

            xml += `${childIndent}<file path="${escapeXML(posixPath)}">\n`; // Use posixPath
            xml += `${content}`;
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
            xml += `\n${indent}<templateOutput name="${escapeXML(options.template)}">\n`; // Add opening tag

            try {
                // Ensure digestContent is passed and is a string
                const contentToApply = typeof options.digestContent === 'string' ? options.digestContent : '';
                const appliedTemplate = await applyTemplate(template.templateContent, contentToApply);

                // Wrap the applied template content in CDATA to handle potential special characters
                xml += `${childIndent}<![CDATA[\n${appliedTemplate}\n${childIndent}]]>\n`;

            } catch (error) {
                // Use escapeXML for the error message content as well
                xml += `${childIndent}<error>Error applying template: ${escapeXML(error instanceof Error ? error.message : String(error))}</error>\n`;
            }
            xml += `${indent}</templateOutput>\n`; // Add closing tag
        } else {
            // Also wrap the "not found" error for consistency
            xml += `\n${indent}<templateOutput name="${escapeXML(options.template)}">\n`;
            xml += `${childIndent}<error>Template not found. Use --list-templates to see available templates.</error>\n`;
            xml += `${indent}</templateOutput>\n`;
        }
    }

    // xml += `</analysis>`;
    return xml;
}
