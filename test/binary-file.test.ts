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
        await fs.unlink(textFilePath).catch(() => {
            // Ignore errors if file doesn't exist
        });
        await fs.unlink(largeTextFilePath).catch(() => {
            // Ignore errors if file doesn't exist
        });
        await fs.unlink(largeBinaryFilePath).catch(() => {
            // Ignore errors if file doesn't exist
        });
        await fs.unlink(join(testDir, "debug_output.txt")).catch(() => {
            // Ignore errors if file doesn't exist
        });
    });

    it("should exclude binary files by default", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            // No --ignore=false flag, so default exclusions apply
        ]);

        expect(exitCode).toBe(0);

        // The text file should be listed in the directory structure
        expect(stdout).toContain("test-file.txt");

        // The PNG file should NOT be listed in the directory structure
        expect(stdout).not.toContain("docs.png");
    });

    it("should include binary files in the directory structure when ignore=false", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            "--ignore=false", // Don't ignore any files, including PNGs
        ]);

        expect(exitCode).toBe(0);

        // Both files should be listed in the directory structure
        expect(stdout).toContain("docs.png");
        expect(stdout).toContain("test-file.txt");

        // The binary file should be marked as excluded in the tree
        expect(stdout).toContain("docs.png (excluded - binary)");

        // Without the verbose flag, file contents aren't included in the output
    });

    it("should exclude binary file contents when using verbose flag", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            "--verbose",
            "--ignore=false", // Don't ignore any files, including PNGs
        ]);

        expect(exitCode).toBe(0);

        // The text file should be included in the output
        expect(stdout).toContain("This is a text file");

        // The binary file should be marked as excluded in the tree
        expect(stdout).toContain("docs.png (excluded - binary)");

        // Binary files are excluded from the content section
        // We don't expect to see "Binary file - content not displayed" in the output

        // Make sure we don't have any error messages for the PNG file
        expect(stdout).not.toContain("Error reading file");
    });

    it("should correctly label files based on size and binary status", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            testDir,
            "--pipe",
            "--ignore=false", // Don't ignore any files
            "--max-size",
            "10240", // 10MB max size
        ]);

        expect(exitCode).toBe(0);

        // Regular text file should have no special label
        expect(stdout).toContain("test-file.txt");
        expect(stdout).not.toContain("test-file.txt [");
        expect(stdout).not.toContain("test-file.txt (excluded");

        // Large text file should be labeled as too large but not binary
        expect(stdout).toContain("large-text-file.txt [11.00 MB - too large]");
        expect(stdout).not.toContain("large-text-file.txt [11.00 MB - too large] (excluded - binary)");

        // Binary file should be labeled as binary (may also include size info)
        expect(stdout).toContain("docs.png");
        expect(stdout).toContain("(excluded - binary)");

        // Large binary file should be labeled as both too large and binary
        expect(stdout).toContain("large-binary-file.bin [11.00 MB - too large] (excluded - binary)");
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