// test/binary-file.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";

describe("Binary file handling", () => {
    const testDir = "test/fixtures/binary-file-project";
    const textFilePath = join(testDir, "test-file.txt");

    beforeAll(async () => {
        // Create a text file for comparison
        await fs.writeFile(textFilePath, "This is a text file");

        // The PNG file is already copied to the fixtures directory
    });

    afterAll(async () => {
        // Clean up only the text file we created
        await fs.unlink(textFilePath).catch(() => {
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

        // The PNG file should be marked as binary
        expect(stdout).toContain("Binary file - content not displayed");

        // Make sure we don't have any error messages for the PNG file
        expect(stdout).not.toContain("Error reading file");
    });
}); 