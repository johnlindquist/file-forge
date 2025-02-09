// test/max-size-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { FILE_SIZE_MESSAGE } from "../src/constants.js";

describe("CLI --max-size", () => {
  it("skips showing file content if file exceeds max-size bytes", async () => {
    // Create a temporary large file
    const testDir = "test/fixtures/large-file-project";
    const largeFilePath = join(testDir, "large-file.txt");

    // Create a file that's 1MB
    const oneKB = "x".repeat(1024);
    const oneMB = oneKB.repeat(1024);
    await fs.writeFile(largeFilePath, oneMB);

    try {
      const { stdout, exitCode } = await runCLI([
        "--path",
        testDir,
        "--max-size",
        "500000", // 500KB
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      // The large file's content is replaced with the size message
      expect(stdout).toContain(FILE_SIZE_MESSAGE(1024 * 1024));

      // Clean up
      await fs.unlink(largeFilePath);
    } catch (error) {
      // Clean up even if test fails
      await fs.unlink(largeFilePath);
      throw error;
    }
  });

  it("shows file size in tree structure for files that are too large", async () => {
    // Create a temporary large file
    const testDir = "test/fixtures/large-file-project";
    const largeFilePath = join(testDir, "large-file.txt");

    // Create a file that's 1MB
    const oneKB = "x".repeat(1024);
    const oneMB = oneKB.repeat(1024);
    await fs.writeFile(largeFilePath, oneMB);

    try {
      const { stdout, exitCode } = await runCLI([
        "--path",
        testDir,
        "--max-size",
        "500000", // 500KB
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      // Check that the tree structure shows the file size
      expect(stdout).toContain("large-file.txt [1.00 MB - too large]");

      // Clean up
      await fs.unlink(largeFilePath);
    } catch (error) {
      // Clean up even if test fails
      await fs.unlink(largeFilePath);
      throw error;
    }
  });
});
