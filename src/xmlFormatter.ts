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

    // Project metadata
    xml += `  <project>\n`;
    xml += `    <source>${escapeXML(source)}</source>\n`;
    xml += `    <timestamp>${escapeXML(timestamp)}</timestamp>\n`;
    if (options.command) {
        xml += `    <command>${escapeXML(options.command)}</command>\n`;
    }

    // Add Git information if available
    const gitInfo = getGitInfo(source);
    if (Object.keys(gitInfo).length > 0) {
        xml += `    <git>\n`;
        if (gitInfo['branch']) xml += `      <branch>${escapeXML(gitInfo['branch'])}</branch>\n`;
        if (gitInfo['remote']) xml += `      <remote>${escapeXML(gitInfo['remote'])}</remote>\n`;
        if (gitInfo['commit']) xml += `      <commit>${escapeXML(gitInfo['commit'])}</commit>\n`;
        if (gitInfo['commitDate']) xml += `      <commitDate>${escapeXML(gitInfo['commitDate'])}</commitDate>\n`;
        xml += `    </git>\n`;
    }

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
        // ... existing code ...
    }

    // Template section if specified (moved after analysis tag)
    if (options.template) {
        const template = getTemplateByName(options.template);
        if (template) {
            xml += `\n`;

            // Get the processed template - we'll extract data from this
            const processedTemplate = template.prompt.replace('{code}', digest[PROP_CONTENT] || '');

            // Extract instructions from the processed template
            const instructionsMatch = processedTemplate.match(/<instructions>([\s\S]*?)<\/instructions>/);

            // For task tag, we'll use the correct content for the plan template
            let taskContent = "Create a detailed implementation plan with specific steps marked as `<task/>` items.";

            // But for other templates, extract from the template itself
            if (template.name !== 'plan') {
                const taskMatch = processedTemplate.match(/<task>([\s\S]*?)<\/task>/);
                if (taskMatch?.[1]) {
                    taskContent = taskMatch[1].trim();
                }
            }

            if (instructionsMatch?.[1]) {
                xml += `<instructions>\n${wrapInCDATA(instructionsMatch[1].trim())}\n</instructions>\n`;
            }

            xml += `<task>\n${wrapInCDATA(taskContent)}\n</task>\n`;
        } else {
            xml += `\n<e>Template "${escapeXML(options.template)}" not found. Use --list-templates to see available templates.</e>\n`;
        }
    }

    return xml;
}
