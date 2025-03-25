// test/svg-flag.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("SVG file handling", () => {
    const testDir = "test/fixtures/svg-file-project";
    const svgFilePath = join(testDir, "test-icon.svg");
    const textFilePath = join(testDir, "test-file.txt");
    const fileSvgPath = join(testDir, "file.svg");

    beforeAll(async () => {
        // Create test directory
        await fs.mkdir(testDir, { recursive: true });

        // Create a simple SVG file
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
    </svg>`;
        await fs.writeFile(svgFilePath, svgContent);

        // Create another SVG file
        await fs.writeFile(fileSvgPath, svgContent);

        // Create a text file for comparison
        await fs.writeFile(textFilePath, "This is a text file");
    });

    afterAll(async () => {
        // Clean up test files
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it("should handle SVG files correctly with different flags", async () => {
        // Run all three tests in parallel
        const [defaultResult, svgFlagResult, verboseResult] = await Promise.all([
            // Test 1: Default behavior (exclude SVG files)
            runCLI([
                "--path",
                testDir,
                "--pipe",
                // No --svg flag, so SVGs should be excluded
            ]),

            // Test 2: Include SVG files with --svg flag
            runCLI([
                "--path",
                testDir,
                "--pipe",
                "--svg", // Include SVG files
            ]),

            // Test 3: Include SVG content with --svg and --verbose flags
            runCLI([
                "--path",
                testDir,
                "--pipe",
                "--svg", // Include SVG files
                "--verbose", // Include file contents
            ])
        ]);

        // Test 1: Default behavior (exclude SVG files)
        expect(defaultResult.exitCode).toBe(0);
        expect(defaultResult.stdout).toContain("test-file.txt");
        expect(defaultResult.stdout).not.toContain("test-icon.svg");
        expect(defaultResult.stdout).not.toContain("file.svg");

        // Test 2: Include SVG files with --svg flag
        expect(svgFlagResult.exitCode).toBe(0);
        expect(svgFlagResult.stdout).toContain("test-icon.svg");
        expect(svgFlagResult.stdout).toContain("file.svg");
        expect(svgFlagResult.stdout).toContain("test-file.txt");
        expect(svgFlagResult.stdout).not.toContain("test-icon.svg (excluded - svg)");
        expect(svgFlagResult.stdout).not.toContain("file.svg (excluded - svg)");

        // Test 3: Include SVG content with --svg and --verbose flags
        expect(verboseResult.exitCode).toBe(0);
        expect(verboseResult.stdout).toContain("This is a text file");
        expect(verboseResult.stdout).toContain("<svg xmlns");
        expect(verboseResult.stdout).toContain("<circle cx=");
    });
}); 