import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --version flag", () => {
  it("should output a version string", async () => {
    // Run the CLI with --version flag
    const { stdout, exitCode } = await runCLI(["--version"]);
    expect(exitCode).toBe(0);

    // Ensure that the output contains a valid version string
    // Extract just the version number from potentially multi-line output
    const versionMatch = stdout.match(/(\d+\.\d+\.\d+(?:-development)?)/);
    expect(versionMatch).not.toBeNull();
    expect(versionMatch![1]).toMatch(/^\d+\.\d+\.\d+(?:-development)?$/);
  });
});
