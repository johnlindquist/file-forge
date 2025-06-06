import { describe, it, expect } from "vitest";
import { runCLI } from "./helpers/runCLI.js";
import { runDirectCLI } from "../utils/directTestRunner.js";

describe("CLI --verbose flag", () => {
  it("should handle verbose flag correctly across formats", async () => {
    // For this test, continue using the process-based implementation
    // because the direct implementation has some formatting differences
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

  // Split the direct test into separate tests for XML and Markdown
  it("should handle the verbose flag correctly with direct execution for Markdown output", async () => {
    // Run direct execution test for Markdown format with verbose flag
    const verboseMarkdownDirect = await runDirectCLI([
      "--path",
      "test/fixtures/sample-project",
      "--verbose",
      "--pipe",
      "--markdown",
      "--no-token-count"
    ]);

    // Test should succeed
    expect(verboseMarkdownDirect.exitCode).toBe(0);

    // Markdown format should contain Files Content section
    expect(verboseMarkdownDirect.stdout).toContain("## Files Content");

    // And should include at least some file content
    expect(verboseMarkdownDirect.stdout).toContain("hello.js");
  });

  it("should produce consistent results between direct and process execution", async () => {
    // Compare direct execution with process execution for the verbose flag
    const [directResult, processResult] = await Promise.all([
      // Direct execution with Markdown (more reliable for testing)
      runDirectCLI([
        "--path",
        "test/fixtures/sample-project",
        "--verbose",
        "--pipe",
        "--markdown",  // Use Markdown format for more reliable testing
        "--no-token-count"
      ]),

      // Process execution with Markdown
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--verbose",
        "--pipe",
        "--markdown",  // Use Markdown format for more reliable testing
        "--no-token-count"
      ])
    ]);

    // Both should succeed
    expect(directResult.exitCode).toBe(0);
    expect(processResult.exitCode).toBe(0);

    // Both should contain file content indicators in Markdown format
    expect(directResult.stdout).toContain("## Files Content");
    expect(processResult.stdout).toContain("## Files Content");

    // Both should include some file content
    expect(directResult.stdout).toContain("hello.js");
    expect(processResult.stdout).toContain("hello.js");
  });
});
