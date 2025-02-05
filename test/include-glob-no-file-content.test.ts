import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("Include flag with wildcard should not output file contents to console", () => {
  it("should hide file content in console output when not in verbose mode", async () => {
    // Run the CLI with an include glob but without verbose/debug flags.
    const { stdout, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--include=**/*.ts",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // The output should contain the summary and directory structure.
    expect(stdout).toContain("## Summary");
    expect(stdout).toContain("## Directory Structure");

    // It should NOT include the files content section header.
    expect(stdout).not.toContain("## Files Content");

    // Also, no actual file content should be visible (for example, no 'console.log(').
    expect(stdout).not.toContain("console.log(");
  });
});
