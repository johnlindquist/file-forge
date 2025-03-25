import { expect, it, describe } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("Digest File Content", () => {
  it("validates file content in different formats", async () => {
    // Run both format tests in parallel
    const [xmlResult, markdownResult] = await Promise.all([
      // Test 1: XML format with verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--pipe",
        "--verbose"
      ]),

      // Test 2: Markdown format with verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--markdown",
        "--pipe",
        "--verbose"
      ])
    ]);

    // Validate XML format
    expect(xmlResult.exitCode).toBe(0);
    expect(xmlResult.stdout).toContain("<project>");
    expect(xmlResult.stdout).toContain("<source>");
    expect(xmlResult.stdout).toContain("<timestamp>");
    expect(xmlResult.stdout).toContain("<directoryTree>");
    expect(xmlResult.stdout).toContain("<files>");
    expect(xmlResult.stdout).toContain("sample-project");
    expect(xmlResult.stdout).toContain(".ts");
    const xmlMarkerMatch = xmlResult.stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(xmlMarkerMatch).toBeTruthy();

    // Validate Markdown format
    expect(markdownResult.exitCode).toBe(0);
    expect(markdownResult.stdout).toContain("# File Forge Analysis");
    expect(markdownResult.stdout).toContain("**Source**:");
    expect(markdownResult.stdout).toContain("**Timestamp**:");
    expect(markdownResult.stdout).toContain("**Command**: `ffg --path test/fixtures/sample-project --markdown --pipe --verbose`");
    expect(markdownResult.stdout).toContain("## Directory Structure");
    expect(markdownResult.stdout).toContain("## Files Content");
    expect(markdownResult.stdout).toContain("sample-project");
    expect(markdownResult.stdout).toContain(".ts");
    const markdownMarkerMatch = markdownResult.stdout.match(/RESULTS_SAVED:\s*(.+\.md)/);
    expect(markdownMarkerMatch).toBeTruthy();
  }, 60000);

  it("console output respects verbose flag while file contains everything", async () => {
    // Run both verbose and non-verbose tests in parallel
    const [nonVerboseResult, verboseResult] = await Promise.all([
      // Test without verbose flag
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--pipe",
      ]),

      // Test with verbose flag
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--pipe",
        "--verbose",
      ])
    ]);

    const nonVerboseStdout = nonVerboseResult.stdout;
    const verboseStdout = verboseResult.stdout;

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
