// test/pipe-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("CLI --pipe", () => {
  it("should handle different output formats when piping", async () => {
    // Run both format tests in parallel
    const [defaultResult, markdownResult] = await Promise.all([
      // Test 1: Default XML output
      runCLI(["--path", "test/fixtures/sample-project", "--pipe", "--no-token-count"]),

      // Test 2: Markdown output
      runCLI(["--path", "test/fixtures/sample-project", "--pipe", "--markdown", "--no-token-count"])
    ]);

    // Test 1: Default XML output
    expect(defaultResult.exitCode).toBe(0);
    expect(defaultResult.stdout).toContain("<project>");
    expect(defaultResult.stdout).toContain("<source>");
    expect(defaultResult.stdout).toContain("<timestamp>");
    expect(defaultResult.stdout).toContain("<directoryTree>");
    expect(defaultResult.stdout).toContain("<command>");

    // Test 2: Markdown output
    expect(markdownResult.exitCode).toBe(0);
    expect(markdownResult.stdout).toContain("# File Forge Analysis");
    expect(markdownResult.stdout).toContain("**Source**:");
    expect(markdownResult.stdout).toContain("**Timestamp**:");
    expect(markdownResult.stdout).toContain("**Command**:");
    expect(markdownResult.stdout).toContain("## Directory Structure");
  });
});
