// test/pipe-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --pipe", () => {
  it("outputs entire summary and file contents to STDOUT without launching editor", async () => {
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("# GitIngest");
    expect(stdout).toContain("## Directory Structure");
    expect(stdout).toContain("## Files Content");

    // Usually, you'd see a line like:
    // "RESULTS_SAVED: /Users/you/Library/Preferences/gitingest/config/gitingest-abc123-..."
    expect(stdout).toMatch(/RESULTS_SAVED:/);
  });
});
