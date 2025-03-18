import { describe, it, expect } from "vitest";
import { runCLI } from "./helpers/runCLI.js";

describe("CLI --verbose flag", () => {
  it("omits file contents by default in XML format", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // Check that the output includes summary and directory structure
    expect(stdout).toContain("<summary>");
    expect(stdout).toContain("<directoryTree>");
    // It should NOT include the file tags when verbose is off
    expect(stdout).not.toContain("<files>");
  });

  it("omits file contents by default in Markdown format", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--pipe",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // Check that the output includes summary and directory structure
    expect(stdout).toContain("## Summary");
    expect(stdout).toContain("## Directory Structure");
    // It should NOT include the "## Files Content" section when verbose is off
    expect(stdout).not.toContain("## Files Content");
  });

  it("includes file contents when --verbose is used with XML format", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--verbose",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // With verbose on, the output should include the files section
    expect(stdout).toContain("<files>");
    expect(stdout).toContain("<file path=");
    // And it should include some content from the fixture files
    expect(stdout).toContain("console.log('hello')");
  });

  it("includes file contents when --verbose is used with Markdown format", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--verbose",
      "--pipe",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // With verbose on, the output should include the "Files Content" section
    expect(stdout).toContain("## Files Content");
    // And it should include some content from the fixture files
    expect(stdout).toContain("console.log('hello')");
  });
});
