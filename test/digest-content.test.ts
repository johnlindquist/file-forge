import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCLI } from "./test-helpers";
import { expect, it, describe } from "vitest";
import envPaths from "env-paths";
import { APP_SYSTEM_ID } from "../src/constants";
import { waitForFile } from "./helpers/fileWaiter";

describe("Digest File Content", () => {
  it("includes all file names and file contents by default", async () => {
    // Run without verbose flag
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--pipe",
    ]);
    expect(exitCode).toBe(0);

    // Extract the saved file path using the marker
    const markerMatch = stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(markerMatch).toBeTruthy();
    const savedPath = markerMatch ? markerMatch[1].trim() : "";
    const searchesDir = envPaths(APP_SYSTEM_ID).config;

    // Get the filename from the path, handling both absolute and relative paths
    const filename = savedPath.split("/").pop()!;
    const fullPath = resolve(searchesDir, "searches", filename);

    console.log("Waiting for file to exist:", fullPath);
    const fileExists = await waitForFile(fullPath, 60000, 1000);
    if (!fileExists) {
      throw new Error(`Timeout waiting for file to exist: ${fullPath}`);
    }
    console.log("File exists, proceeding with read");

    // Read the digest file
    const digestContent = readFileSync(fullPath, "utf8");
    console.log("File content length:", digestContent.length);

    // Assert that the digest contains a directory structure section
    expect(digestContent).toContain("## Directory Structure");

    // Assert that it contains the "Files Content" section (full file content)
    expect(digestContent).toContain("## Files Content");

    // Check for content from sample-project files
    expect(digestContent).toContain("sample-project");
    expect(digestContent).toContain(".ts"); // Should show TypeScript files
  }, 60000);

  it("console output respects verbose flag while file contains everything", async () => {
    // Run without verbose flag first
    const { stdout: nonVerboseStdout } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--pipe",
    ]);

    // Run with verbose flag
    const { stdout: verboseStdout } = await runCLI([
      "--path",
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

    // Get full paths for both files
    const searchesDir = envPaths(APP_SYSTEM_ID).config;

    // Get the filenames from the paths, handling both absolute and relative paths
    const nonVerboseFilename = nonVerboseMatch![1].trim().split("/").pop()!;
    const verboseFilename = verboseMatch![1].trim().split("/").pop()!;

    const nonVerboseFullPath = resolve(searchesDir, "searches", nonVerboseFilename);
    const verboseFullPath = resolve(searchesDir, "searches", verboseFilename);

    // Wait for both files to be written
    console.log("Waiting for non-verbose file to exist:", nonVerboseFullPath);
    const nonVerboseExists = await waitForFile(nonVerboseFullPath, 60000, 1000);
    if (!nonVerboseExists) {
      throw new Error(
        `Timeout waiting for file to exist: ${nonVerboseFullPath}`
      );
    }

    console.log("Waiting for verbose file to exist:", verboseFullPath);
    const verboseExists = await waitForFile(verboseFullPath, 60000, 1000);
    if (!verboseExists) {
      throw new Error(`Timeout waiting for file to exist: ${verboseFullPath}`);
    }

    // Read both files
    const nonVerboseDigest = readFileSync(nonVerboseFullPath, "utf8");
    const verboseDigest = readFileSync(verboseFullPath, "utf8");

    console.log("Non-verbose content length:", nonVerboseDigest.length);
    console.log("Verbose content length:", verboseDigest.length);

    // Both files should contain the same sections
    expect(nonVerboseDigest).toContain("## Directory Structure");
    expect(nonVerboseDigest).toContain("## Files Content");
    expect(verboseDigest).toContain("## Directory Structure");
    expect(verboseDigest).toContain("## Files Content");

    // File contents should be roughly the same size
    expect(
      Math.abs(nonVerboseDigest.length - verboseDigest.length)
    ).toBeLessThan(2000);
  }, 60000);
});
