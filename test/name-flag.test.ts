import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("name flag", () => {
  it("should validate name flag behavior across different scenarios", async () => {
    // Run all three tests in parallel
    const [
      customNameResult,
      customNamePipeResult,
      defaultNameResult
    ] = await Promise.all([
      // Test 1: Custom name with XML wrapping
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--name",
        "EXAMPLE_PROJECT",
        "--markdown",
        "--no-token-count"
      ]),

      // Test 2: Custom name with piping (no XML wrapping)
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--name",
        "EXAMPLE_PROJECT",
        "--pipe",
        "--markdown",
        "--no-token-count"
      ]),

      // Test 3: Default name without flag
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--markdown",
        "--no-token-count"
      ])
    ]);

    // Test 1: Custom name with XML wrapping
    expect(customNameResult.exitCode).toBe(0);
    expect(customNameResult.stdout).toContain("# EXAMPLE_PROJECT");
    expect(customNameResult.stdout).toContain("<EXAMPLE_PROJECT>");
    expect(customNameResult.stdout).toContain("</EXAMPLE_PROJECT>");

    // Test 2: Custom name with piping (no XML wrapping)
    expect(customNamePipeResult.exitCode).toBe(0);
    expect(customNamePipeResult.stdout).toContain("# EXAMPLE_PROJECT");
    expect(customNamePipeResult.stdout).not.toContain("<EXAMPLE_PROJECT>");
    expect(customNamePipeResult.stdout).not.toContain("</EXAMPLE_PROJECT>");

    // Test 3: Default name without flag
    expect(defaultNameResult.exitCode).toBe(0);
    expect(defaultNameResult.stdout).toContain("# File Forge Analysis");
    expect(defaultNameResult.stdout).not.toContain("<File Forge Analysis>");
    expect(defaultNameResult.stdout).not.toContain("</File Forge Analysis>");
  });
});
