import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("name flag", () => {
  it("should use custom name in header and wrap output in XML tags", async () => {
    const { exitCode, stdout } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--name",
      "EXAMPLE_PROJECT",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Check that the name is used in the header
    expect(stdout).toContain("# EXAMPLE_PROJECT");

    // Check that the content is wrapped in XML tags
    expect(stdout).toContain("<EXAMPLE_PROJECT>");
    expect(stdout).toContain("</EXAMPLE_PROJECT>");
  });

  it("should use custom name in header but not wrap output when piping", async () => {
    const { exitCode, stdout } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--name",
      "EXAMPLE_PROJECT",
      "--pipe",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Check that the name is used in the header
    expect(stdout).toContain("# EXAMPLE_PROJECT");

    // Check that the content is NOT wrapped in XML tags
    expect(stdout).not.toContain("<EXAMPLE_PROJECT>");
    expect(stdout).not.toContain("</EXAMPLE_PROJECT>");
  });

  it("should use default header and no XML tags when name is not provided", async () => {
    const { exitCode, stdout } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Check that the default header is used
    expect(stdout).toContain("# File Forge Analysis");

    // Check that the content is NOT wrapped in XML tags
    expect(stdout).not.toContain("<File Forge Analysis>");
    expect(stdout).not.toContain("</File Forge Analysis>");
  });
});
