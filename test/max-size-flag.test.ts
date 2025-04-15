// test/max-size-flag.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI } from "./test-helpers";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { FILE_SIZE_MESSAGE } from "../src/constants.js";

describe("CLI --max-size", () => {
  const testDir = "test/fixtures/large-file-project";
  const largeFilePath = join(testDir, "large-file.txt");

  // Setup: Create a large file before all tests
  beforeAll(async () => {
    // Create a file that's 1MB
    const oneKB = "x".repeat(1024);
    const oneMB = oneKB.repeat(1024);
    await fs.mkdir(testDir, { recursive: true }).catch(() => { });
    await fs.writeFile(largeFilePath, oneMB);
  });

  // Cleanup: Remove the large file after tests
  afterAll(async () => {
    await fs.unlink(largeFilePath).catch(() => { });
  });

  it("should handle large files correctly with max-size setting", async () => {
    // Run the same command twice to test different aspects
    const result = await runCLI([
      "--path",
      testDir,
      "--max-size",
      "500000", // 500KB
      "--pipe",
    ]);

    expect(result.exitCode).toBe(0);

    // Test 1: The large file's content is replaced with the size message
    expect(result.stdout).toContain(FILE_SIZE_MESSAGE(1024 * 1024));

    // Test 2: Check that the tree structure shows the file size
    expect(result.stdout).toContain("large-file.txt [1.00 MB - too large]");
  });
});
