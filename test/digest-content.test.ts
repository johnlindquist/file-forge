import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCLI } from "./test-helpers";
import { expect, it, describe } from "vitest";

describe("Digest File Content", () => {
  it("includes all file names and file contents by default", async () => {
    // Run without verbose flag
    const { stdout, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--pipe",
    ]);
    expect(exitCode).toBe(0);

    // Extract the saved file path using the marker
    const markerMatch = stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(markerMatch).toBeTruthy();
    const digestPath = markerMatch ? markerMatch[1].trim() : "";

    // Read the digest file
    const digestContent = readFileSync(resolve(digestPath), "utf8");

    // Assert that the digest contains a directory structure section
    expect(digestContent).toContain("## Directory Structure");

    // Assert that it contains the "Files Content" section (full file content)
    expect(digestContent).toContain("## Files Content");

    // Check for content from sample-project files
    expect(digestContent).toContain("sample-project");
    expect(digestContent).toContain(".ts"); // Should show TypeScript files
  });

  it("console output respects verbose flag while file contains everything", async () => {
    // Run without verbose flag first
    const { stdout: nonVerboseStdout } = await runCLI([
      "test/fixtures/sample-project",
      "--pipe",
    ]);

    // Run with verbose flag
    const { stdout: verboseStdout } = await runCLI([
      "test/fixtures/sample-project",
      "--pipe",
      "--verbose",
    ]);

    // Verbose output should be longer as it includes file contents
    expect(verboseStdout.length).toBeGreaterThan(nonVerboseStdout.length);

    // Both runs should have saved files with full content
    const nonVerboseMatch = nonVerboseStdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    const verboseMatch = verboseStdout.match(/RESULTS_SAVED:\s*(.+\.md)/);

    expect(nonVerboseMatch).toBeTruthy();
    expect(verboseMatch).toBeTruthy();

    const nonVerboseDigest = readFileSync(
      resolve(nonVerboseMatch![1].trim()),
      "utf8"
    );
    const verboseDigest = readFileSync(
      resolve(verboseMatch![1].trim()),
      "utf8"
    );

    // Both files should contain the same sections
    expect(nonVerboseDigest).toContain("## Directory Structure");
    expect(nonVerboseDigest).toContain("## Files Content");
    expect(verboseDigest).toContain("## Directory Structure");
    expect(verboseDigest).toContain("## Files Content");

    // File contents should be roughly the same size
    expect(
      Math.abs(nonVerboseDigest.length - verboseDigest.length)
    ).toBeLessThan(250);
  });
});
