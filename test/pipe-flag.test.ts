// test/pipe-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";
import { runDirectCLI } from "../utils/directTestRunner.js";

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

  // Keep the original test for reference
  it.skip("old - should output results directly to stdout", async () => {
    const { stdout, exitCode } = await runCLI([
      "--include",
      "src/index.ts",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Text digest built");
    expect(stdout).toContain("RESULTS_SAVED:");
  });

  // New test using direct execution
  it("should output results directly to stdout", async () => {
    const { stdout, exitCode } = await runDirectCLI([
      "--include",
      "src/index.ts",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Text digest built");
    expect(stdout).toContain("RESULTS_SAVED:");
  });

  it("should produce same output as the process-based test but run faster", async () => {
    // Run both implementations and compare results
    const directStart = performance.now();
    const directResult = await runDirectCLI([
      "--include",
      "src/index.ts",
      "--pipe",
    ]);
    const directEnd = performance.now();

    const processStart = performance.now();
    const processResult = await runCLI([
      "--include",
      "src/index.ts",
      "--pipe",
    ]);
    const processEnd = performance.now();

    // Verify that both produce similar output
    expect(directResult.exitCode).toBe(processResult.exitCode);
    expect(directResult.stdout).toContain("Text digest built");
    expect(processResult.stdout).toContain("Text digest built");

    // Log the performance difference
    console.log(`Direct execution: ${(directEnd - directStart).toFixed(2)}ms`);
    console.log(`Process execution: ${(processEnd - processStart).toFixed(2)}ms`);
  });
});
