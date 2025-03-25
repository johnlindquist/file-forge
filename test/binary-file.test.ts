// test/binary-file.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("Binary file handling", () => {
    const testDir = "test/fixtures/binary-file-project";
    const textFilePath = join(testDir, "test-file.txt");
    const largeTextFilePath = join(testDir, "large-text-file.txt");
    const largeBinaryFilePath = join(testDir, "large-binary-file.bin");

    beforeAll(async () => {
        // Create a text file for comparison
        await fs.writeFile(textFilePath, "This is a text file");

        // Create a large text file (11MB)
        const oneKB = "x".repeat(1024);
        const oneMB = oneKB.repeat(1024);
        const elevenMB = oneMB.repeat(11);
        await fs.writeFile(largeTextFilePath, elevenMB);

        // Create a large binary file (11MB with binary content)
        const binaryContent = Buffer.alloc(11 * 1024 * 1024);
        // Fill with some binary data (including null bytes)
        for (let i = 0; i < binaryContent.length; i++) {
            binaryContent[i] = i % 256;
        }
        await fs.writeFile(largeBinaryFilePath, binaryContent);

        // The PNG file is already copied to the fixtures directory
    });

    afterAll(async () => {
        // Clean up the files we created
        await Promise.all([
            fs.unlink(textFilePath).catch(() => {/* Ignore errors if file doesn't exist */ }),
            fs.unlink(largeTextFilePath).catch(() => {/* Ignore errors if file doesn't exist */ }),
            fs.unlink(largeBinaryFilePath).catch(() => {/* Ignore errors if file doesn't exist */ }),
            fs.unlink(join(testDir, "debug_output.txt")).catch(() => {/* Ignore errors if file doesn't exist */ })
        ]);
    });

    it("should handle binary file operations correctly", async () => {
        // Run all CLI tests in parallel
        const [defaultResult, ignoreResult, verboseResult, sizeResult] = await Promise.all([
            // Test 1: Should exclude binary files by default
            runCLI([
                "--path",
                testDir,
                "--pipe",
                // No --ignore=false flag, so default exclusions apply
            ]),

            // Test 2: Should include binary files when ignore=false
            runCLI([
                "--path",
                testDir,
                "--pipe",
                "--ignore=false", // Don't ignore any files, including PNGs
            ]),

            // Test 3: Should exclude binary contents with verbose flag
            runCLI([
                "--path",
                testDir,
                "--pipe",
                "--verbose",
                "--ignore=false", // Don't ignore any files, including PNGs
            ]),

            // Test 4: Should correctly label files based on size and binary status
            runCLI([
                "--path",
                testDir,
                "--pipe",
                "--ignore=false", // Don't ignore any files
                "--max-size",
                "10240", // 10MB max size
            ])
        ]);

        // Test 1: Should exclude binary files by default
        expect(defaultResult.exitCode).toBe(0);
        expect(defaultResult.stdout).toContain("test-file.txt");
        expect(defaultResult.stdout).not.toContain("docs.png");

        // Test 2: Should include binary files when ignore=false
        expect(ignoreResult.exitCode).toBe(0);
        expect(ignoreResult.stdout).toContain("docs.png");
        expect(ignoreResult.stdout).toContain("test-file.txt");
        expect(ignoreResult.stdout).toContain("docs.png (excluded - binary)");

        // Test 3: Should exclude binary contents with verbose flag
        expect(verboseResult.exitCode).toBe(0);
        expect(verboseResult.stdout).toContain("This is a text file");
        expect(verboseResult.stdout).toContain("docs.png (excluded - binary)");
        expect(verboseResult.stdout).not.toContain("Error reading file");

        // Test 4: Should correctly label files based on size and binary status
        expect(sizeResult.exitCode).toBe(0);
        expect(sizeResult.stdout).toContain("test-file.txt");
        expect(sizeResult.stdout).not.toContain("test-file.txt [");
        expect(sizeResult.stdout).not.toContain("test-file.txt (excluded");
        expect(sizeResult.stdout).toContain("large-text-file.txt [11.00 MB - too large]");
        expect(sizeResult.stdout).not.toContain("large-text-file.txt [11.00 MB - too large] (excluded - binary)");
        expect(sizeResult.stdout).toContain("docs.png");
        expect(sizeResult.stdout).toContain("(excluded - binary)");
        expect(sizeResult.stdout).toContain("large-binary-file.bin [11.00 MB - too large] (excluded - binary)");
    });

    it("should not label large text files as binary", async () => {
        // Create a large text file with a .txt extension
        const largeLogFilePath = join(testDir, "debug_output.txt");

        // Create a 13MB text file (similar to the one in the user's example)
        const oneKB = "x".repeat(1024);
        const oneMB = oneKB.repeat(1024);
        const thirteenMB = oneMB.repeat(13);
        await fs.writeFile(largeLogFilePath, thirteenMB);

        try {
            const { stdout, exitCode } = await runCLI([
                "--path",
                testDir,
                "--pipe",
                "--ignore=false", // Don't ignore any files
                "--max-size",
                "10240", // 10MB max size
            ]);

            expect(exitCode).toBe(0);

            // The large text file should be labeled as too large but NOT as binary
            expect(stdout).toContain("debug_output.txt [13.00 MB - too large]");
            expect(stdout).not.toContain("debug_output.txt [13.00 MB - too large] (excluded - binary)");

            // Clean up
            await fs.unlink(largeLogFilePath);
        } catch (error) {
            // Clean up even if test fails
            await fs.unlink(largeLogFilePath);
            throw error;
        }
    });
}); 