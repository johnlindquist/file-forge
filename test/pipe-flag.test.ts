// test/pipe-flag.test.ts
import { describe, it, expect, afterAll } from "vitest";
import { runCLI } from "./test-helpers.js";
import { runDirectCLI } from "../utils/directTestRunner.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

describe("CLI --pipe", () => {
  // Store performance results
  const performanceResults: string[] = [];

  // Write performance results to a file after tests complete
  afterAll(() => {
    if (performanceResults.length > 0) {
      const resultsPath = join(process.cwd(), 'performance-results.txt');
      writeFileSync(resultsPath, performanceResults.join('\n'), 'utf8');
      console.log(`Performance results written to ${resultsPath}`);
    }
  });

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
    performanceResults.push("=== PERFORMANCE COMPARISON ===");

    // Define the test arguments
    const testArgs = [
      "--include",
      "src/index.ts",
      "--pipe",
    ];

    // Run multiple trials for more accurate comparison
    const trials = 3;
    const directTimes: number[] = [];
    const processTimes: number[] = [];

    for (let i = 0; i < trials; i++) {
      performanceResults.push(`\nTrial ${i + 1}/${trials}:`);

      // Direct execution
      const directStart = performance.now();
      const directResult = await runDirectCLI(testArgs);
      const directEnd = performance.now();
      const directTime = directEnd - directStart;
      directTimes.push(directTime);

      // Process execution
      const processStart = performance.now();
      const processResult = await runCLI(testArgs);
      const processEnd = performance.now();
      const processTime = processEnd - processStart;
      processTimes.push(processTime);

      // Verify that both produce similar output
      expect(directResult.exitCode).toBe(processResult.exitCode);
      expect(directResult.stdout).toContain("Text digest built");
      expect(processResult.stdout).toContain("Text digest built");

      // Log the performance difference for this trial
      const speedup = processTime / directTime;
      const trialResult = [
        `  Direct execution:   ${directTime.toFixed(2)}ms`,
        `  Process execution:  ${processTime.toFixed(2)}ms`,
        `  Speedup factor:     ${speedup.toFixed(2)}x`
      ];

      // Add to performance results and log to console
      performanceResults.push(...trialResult);
      console.log(trialResult.join('\n'));
    }

    // Calculate and log the average performance difference
    const avgDirectTime = directTimes.reduce((a, b) => a + b, 0) / trials;
    const avgProcessTime = processTimes.reduce((a, b) => a + b, 0) / trials;
    const avgSpeedup = avgProcessTime / avgDirectTime;

    const summary = [
      "\n=== SUMMARY ===",
      `Average direct execution time:   ${avgDirectTime.toFixed(2)}ms`,
      `Average process execution time:  ${avgProcessTime.toFixed(2)}ms`,
      `Average speedup factor:          ${avgSpeedup.toFixed(2)}x`,
      `Percentage improvement:          ${((avgSpeedup - 1) * 100).toFixed(2)}%`
    ];

    // Add to performance results and log to console
    performanceResults.push(...summary);
    console.log(summary.join('\n'));

    // For clarity in test output, make an assertion based on the performance
    expect(avgDirectTime).toBeLessThan(avgProcessTime);
  });
});
