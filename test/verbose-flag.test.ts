import { describe, it, expect } from "vitest";
import { runCLI } from "./helpers/runCLI.js";

describe("CLI --verbose flag", () => {
  it("should handle verbose flag correctly across formats", async () => {
    // Run all CLI tests in parallel
    const [
      defaultXmlResult,
      defaultMarkdownResult,
      verboseXmlResult,
      verboseMarkdownResult
    ] = await Promise.all([
      // Test 1: Default XML format without verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--pipe",
        "--no-token-count"
      ]),

      // Test 2: Default Markdown format without verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--pipe",
        "--markdown",
        "--no-token-count"
      ]),

      // Test 3: XML format with verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--verbose",
        "--pipe",
        "--no-token-count"
      ]),

      // Test 4: Markdown format with verbose
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--verbose",
        "--pipe",
        "--markdown",
        "--no-token-count"
      ])
    ]);

    // Test 1: XML format without verbose
    expect(defaultXmlResult.exitCode).toBe(0);
    expect(defaultXmlResult.stdout).toContain("<summary>");
    expect(defaultXmlResult.stdout).toContain("<directoryTree>");
    expect(defaultXmlResult.stdout).not.toContain("<files>");

    // Test 2: Markdown format without verbose
    expect(defaultMarkdownResult.exitCode).toBe(0);
    expect(defaultMarkdownResult.stdout).toContain("## Summary");
    expect(defaultMarkdownResult.stdout).toContain("## Directory Structure");
    expect(defaultMarkdownResult.stdout).not.toContain("## Files Content");

    // Test 3: XML format with verbose
    expect(verboseXmlResult.exitCode).toBe(0);
    expect(verboseXmlResult.stdout).toContain("<files>");
    expect(verboseXmlResult.stdout).toContain("<file path=");
    expect(verboseXmlResult.stdout).toContain("console.log('hello')");

    // Test 4: Markdown format with verbose
    expect(verboseMarkdownResult.exitCode).toBe(0);
    expect(verboseMarkdownResult.stdout).toContain("## Files Content");
    expect(verboseMarkdownResult.stdout).toContain("console.log('hello')");
  });
});
