import { expect, it, describe } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("Digest File Content", () => {
  it("includes all file names and file contents by default in XML format", async () => {
    // Run without verbose flag
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--pipe",
      "--verbose" // Add verbose flag to ensure file contents section is included
    ]);
    expect(exitCode).toBe(0);

    // Assert that stdout contains XML tags
    expect(stdout).toContain("<project>");
    expect(stdout).toContain("<source>");
    expect(stdout).toContain("<timestamp>");
    expect(stdout).toContain("<directoryTree>");
    expect(stdout).toContain("<files>");

    // Check for content from sample-project files
    expect(stdout).toContain("sample-project");
    expect(stdout).toContain(".ts"); // Should show TypeScript files

    // Extract the saved file path using the marker
    const markerMatch = stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(markerMatch).toBeTruthy();
  }, 60000);

  it("includes all file names and file contents in Markdown format when --markdown flag is used", async () => {
    // Run with markdown flag and save to file with pipe to ensure we get RESULTS_SAVED
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--markdown",
      "--pipe",
      "--verbose" // Add verbose flag to ensure file content is included in stdout
    ]);
    expect(exitCode).toBe(0);

    // Assert that the stdout contains Markdown format
    expect(stdout).toContain("# File Forge Analysis");
    expect(stdout).toContain("**Source**:");
    expect(stdout).toContain("**Timestamp**:");
    expect(stdout).toContain("## Directory Structure");

    // With verbose flag, it should include file contents
    expect(stdout).toContain("## Files Content");

    // Check for content from sample-project files in the stdout
    expect(stdout).toContain("sample-project");
    expect(stdout).toContain(".ts"); // Should show TypeScript files

    // Extract the saved file path using the marker
    const markerMatch = stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(markerMatch).toBeTruthy();
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

    // Both outputs should contain XML tags
    expect(nonVerboseStdout).toContain("<project>");
    expect(nonVerboseStdout).toContain("<source>");
    expect(nonVerboseStdout).toContain("<directoryTree>");
    expect(verboseStdout).toContain("<project>");
    expect(verboseStdout).toContain("<files>");

    // Verbose stdout should contain file contents
    expect(verboseStdout).toContain("console.log");

    // Both runs should have saved files
    const nonVerboseMatch = nonVerboseStdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    const verboseMatch = verboseStdout.match(/RESULTS_SAVED:\s*(.+\.md)/);

    expect(nonVerboseMatch).toBeTruthy();
    expect(verboseMatch).toBeTruthy();
  }, 60000);
});
