import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { join } from "node:path";
import fs from 'node:fs/promises';
import path from 'path';

describe("XML Output Path Attribute", () => {
    const FIXTURES_DIR = join(__dirname, "fixtures", "sample-project");

    it("should use relative paths in the <file path='...'> attribute for project files", async () => {
        process.stdout.write("=== TEST STARTING ===\n");
        process.stdout.write(`FIXTURES_DIR: ${FIXTURES_DIR}\n`);

        const { stdout, exitCode } = await runCLI([
            "--path",
            FIXTURES_DIR,
            "--pipe",
            "--verbose", // Ensure the <files> section is generated
            "--no-token-count"
        ]);

        // Write to a file to debug
        const tempDir = join(__dirname, '..', '.temp');
        // Ensure temp directory exists
        await fs.mkdir(tempDir, { recursive: true });
        const debugFile = join(tempDir, 'xml-debug-output.txt');
        await fs.writeFile(debugFile, stdout);
        process.stdout.write(`Debug file written to: ${debugFile}\n`);
        process.stdout.write(`Exit code: ${exitCode}\n`);
        process.stdout.write(`Stdout length: ${stdout.length}\n`);

        // Now do checks based on the actual XML format we observed
        expect(exitCode).toBe(0);
        expect(stdout).toContain("<files>");
        expect(stdout).toContain("</files>");

        // Check that filepaths should have the relative path from project root
        // Check for README.md file (should be README.md, not just the basename)
        expect(stdout.includes('<file path="README.md">')).toBe(true);

        // Check for src/index.ts file (should include directory, not just index.ts)
        expect(stdout.includes('<file path="src/index.ts">')).toBe(true);

        // Verify content doesn't have header
        const fileStart = stdout.indexOf('<file path=');
        if (fileStart > 0) {
            const contentStart = stdout.indexOf('>', fileStart) + 1;
            const contentEnd = stdout.indexOf('</file>', contentStart);
            if (contentStart > 0 && contentEnd > 0) {
                const content = stdout.substring(contentStart, contentEnd).trim();
                expect(content.startsWith('===\nFile:')).toBe(false);
            }
        }

        // Verify that no paths with the full directory structure appear outside of tags
        const misplacedPathRegex = /\/fixtures\/sample-project\/[^>]*\n\s*<\/file>/;
        expect(stdout).not.toMatch(misplacedPathRegex);
    }, 30000);

    it("should use absolute paths in the <file path='...'> attribute for external files", async () => {
        const npmrcPath = join(__dirname, '..', '.npmrc');

        process.stdout.write("=== EXTERNAL FILE TEST STARTING ===\n");
        process.stdout.write(`External file path: ${npmrcPath}\n`);
        process.stdout.write(`Working directory: ${process.cwd()}\n`);
        process.stdout.write(`Test directory: ${__dirname}\n`);
        process.stdout.write(`Is absolute path? ${path.isAbsolute(npmrcPath)}\n`);

        const { stdout, exitCode } = await runCLI([
            "--include",
            npmrcPath, // Absolute path to external file
            "--pipe",
            "--verbose", // Ensure the <files> section is generated
            "--debug", // Add debug output
            "--no-token-count"
        ]);

        // Write to a file to debug
        const tempDir = join(__dirname, '..', '.temp');
        await fs.mkdir(tempDir, { recursive: true });
        const debugFile = join(tempDir, 'external-file-debug-output.txt');
        await fs.writeFile(debugFile, stdout);
        process.stdout.write(`Debug file written to: ${debugFile}\n`);

        // Extract all <file path="..."> occurrences
        const pathMatches = stdout.match(/<file path="[^"]*">/g) || [];
        process.stdout.write(`Found ${pathMatches.length} file path entries in XML:\n`);
        pathMatches.forEach(match => {
            process.stdout.write(`  ${match}\n`);
        });

        // Now do checks based on the actual XML format we observed
        expect(exitCode).toBe(0);
        expect(stdout).toContain("<files>");
        expect(stdout).toContain("</files>");

        // The external file should have its full absolute path in the XML
        // Note: We use a path.normalize to ensure consistent path format
        const expectedPathPattern = `<file path="${npmrcPath.replace(/\\/g, '/')}">`;
        process.stdout.write(`Looking for path pattern: ${expectedPathPattern}\n`);
        expect(stdout.includes(expectedPathPattern)).toBe(true);

        // We should NOT have just the basename in the path attribute for external files
        const basenamePathPattern = '<file path=".npmrc">';
        process.stdout.write(`Should NOT find pattern: ${basenamePathPattern}\n`);
        expect(stdout.includes(basenamePathPattern)).toBe(false);
    }, 30000);
});
