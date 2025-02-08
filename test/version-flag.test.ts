import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --version flag", () => {
  it("should output a version string", async () => {
    // Run the CLI with --version flag
    const { stdout, exitCode } = await runCLI(["--version"]);
    expect(exitCode).toBe(0);
    // Ensure that the output is a valid version string
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+(?:-development)?$/);
  });
});
