import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { join } from "node:path";

describe("CLI --verbose flag", () => {
  const FIXTURE_DIR = join(__dirname, "fixtures", "sample-project");

  it("omits file contents by default", async () => {
    const { stdout, exitCode } = await runCLI([FIXTURE_DIR, "--pipe"]);

    expect(exitCode).toBe(0);
    // Check that the output includes summary and directory structure
    expect(stdout).toContain("## Summary");
    expect(stdout).toContain("## Directory Structure");
    // It should NOT include the "## Files Content" section when verbose is off
    expect(stdout).not.toContain("## Files Content");
    // Optionally, check that known file content (e.g. "console.log('hello')") is missing
    expect(stdout).not.toContain("console.log('hello')");
  });

  it("includes file contents when --verbose is used", async () => {
    const { stdout, exitCode } = await runCLI([
      FIXTURE_DIR,
      "--pipe",
      "--verbose",
    ]);

    expect(exitCode).toBe(0);
    // With verbose on, the output should include the "Files Content" section
    expect(stdout).toContain("## Files Content");
    // And it should include some content from the fixture files
    expect(stdout).toContain("console.log('hello')");
  });
});
