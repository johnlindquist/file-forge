// test/svg-flag.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("SVG file handling", () => {
    const testDir = "test/fixtures/svg-file-project";
    const svgFilePath = join(testDir, "test-icon.svg");
    const textFilePath = join(testDir, "test-file.txt");

    beforeAll(async () => {
        // Create test directory
        await fs.mkdir(testDir, { recursive: true });

        // Create a simple SVG file
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
    </svg>`;
        await fs.writeFile(svgFilePath, svgContent);

        // Create a text file for comparison
        await fs.writeFile(textFilePath, "This is a text file");
    });

    afterAll(async () => {
        // Clean up test files
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should exclude SVG files by default", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            // No --svg flag, so SVGs should be excluded
        ]);

        expect(exitCode).toBe(0);

        // The text file should be listed in the directory structure
        expect(stdout).toContain("test-file.txt");

        // The SVG file should NOT be listed in the directory structure
        expect(stdout).not.toContain("test-icon.svg");
    });

    it("should include SVG files when using --svg flag", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            "--svg", // Include SVG files
        ]);

        expect(exitCode).toBe(0);

        // Both files should be listed in the directory structure
        expect(stdout).toContain("test-icon.svg");
        expect(stdout).toContain("test-file.txt");
    });

    it("should include SVG file contents when using --svg and --verbose flags", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            "--svg", // Include SVG files
            "--verbose", // Include file contents
        ]);

        expect(exitCode).toBe(0);

        // The text file should be included in the output
        expect(stdout).toContain("This is a text file");

        // The SVG file content should be included in the output
        expect(stdout).toContain("<svg xmlns");
        expect(stdout).toContain("<circle cx=");
    });
}); 