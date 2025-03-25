import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("Include flag with wildcard should not output file contents to console", () => {
  it("should hide file content in both XML and Markdown formats when not in verbose mode", async () => {
    // Run both format tests in parallel
    const [xmlResult, markdownResult] = await Promise.all([
      // Test 1: XML format
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "**/*.ts",
        "--pipe",
      ]),

      // Test 2: Markdown format
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "**/*.ts",
        "--pipe",
        "--markdown",
      ])
    ]);

    // Test 1: XML format validation
    expect(xmlResult.exitCode).toBe(0);
    // The output should contain the summary and directory tree
    expect(xmlResult.stdout).toContain("<summary>");
    expect(xmlResult.stdout).toContain("<directoryTree>");
    // It should NOT include the files content tags
    expect(xmlResult.stdout).not.toContain("<file path=");
    // No actual file content should be visible
    expect(xmlResult.stdout).not.toContain("console.log(");

    // Test 2: Markdown format validation
    expect(markdownResult.exitCode).toBe(0);
    // The output should contain the summary and directory structure
    expect(markdownResult.stdout).toContain("## Summary");
    expect(markdownResult.stdout).toContain("## Directory Structure");
    // It should NOT include the files content section header
    expect(markdownResult.stdout).not.toContain("## Files Content");
    // No actual file content should be visible
    expect(markdownResult.stdout).not.toContain("console.log(");
  });
});
