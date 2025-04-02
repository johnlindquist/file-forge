// test/include-flag.test.ts
import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { ingestDirectory } from "../src/ingest.js";
import { runCLI } from "./test-helpers.js";

describe("include flag functionality", () => {
  const FIXTURE_DIR = join(__dirname, "fixtures", "sample-project");

  it("includes an external file specified by full path", async () => {
    // Create a temporary external file
    const externalFilePath = resolve(__dirname, "external-test.txt");
    const externalContent = "External content for testing";
    await fs.writeFile(externalFilePath, externalContent);

    try {
      const result = await ingestDirectory(FIXTURE_DIR, {
        include: [externalFilePath],
        debug: true,
      });

      // Verify the external file is included in the content
      expect(result.content).toContain(externalFilePath);
      expect(result.content).toContain(externalContent);

      // Verify the summary mentions the external file
      expect(result.summary).toContain("Including external files");
      expect(result.summary).toContain(externalFilePath);

      // Verify the tree structure doesn't include the external file
      expect(result.tree).not.toContain(externalFilePath);
    } finally {
      // Clean up
      await fs.unlink(externalFilePath).catch(() => { });
    }
  });

  it("handles non-existent external files gracefully", async () => {
    const nonExistentPath = resolve(__dirname, "non-existent-file.txt");

    const result = await ingestDirectory(FIXTURE_DIR, {
      include: [nonExistentPath],
      debug: true,
    });

    // Verify the non-existent file doesn't break the process
    expect(result.content).not.toContain(nonExistentPath);
    expect(result.summary).not.toContain("Including external files");
  });

  it("combines internal and external files correctly", async () => {
    // Create a temporary external file
    const externalFilePath = resolve(__dirname, "external-test.txt");
    const externalContent = "External content for testing";
    await fs.writeFile(externalFilePath, externalContent);

    try {
      const result = await ingestDirectory(FIXTURE_DIR, {
        include: ["*.js", externalFilePath], // Include both internal .js files and external file
        debug: true,
      });

      // Verify both internal and external content is present
      expect(result.content).toContain(externalFilePath);
      expect(result.content).toContain(externalContent);
      expect(result.content).toMatch(/hello\.js/); // Corrected assertion

      // Verify the summary includes total file count
      const totalFiles = parseInt(
        result.summary.match(/Files analyzed: (\d+)/)?.[1] || "0"
      );
      expect(totalFiles).toBeGreaterThan(1); // Should have at least the external file and one .js file
    } finally {
      // Clean up
      await fs.unlink(externalFilePath).catch(() => { });
    }
  });

  it("handles multiple --include flags correctly via CLI", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      FIXTURE_DIR,
      "--include",
      "*.js",
      "--include",
      "*.md",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // Check if output contains expected files from both includes
    expect(stdout).toMatch(/hello\.js/); // From *.js
    // Look for the specific line in the directory tree
    expect(stdout).toMatch(/├── README\.md/); // From *.md
    // Check if an excluded file type is not present
    expect(stdout).not.toMatch(/test\.ts/);
  });
});
