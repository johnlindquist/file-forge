import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("help flag", () => {
  it("should display comprehensive help text with both --help and -h flags", async () => {
    // Run both flag variations in parallel
    const [helpResult, hAliasResult] = await Promise.all([
      // Test 1: Full --help flag
      runCLI(["--help"]),

      // Test 2: -h alias
      runCLI(["-h"])
    ]);

    // Test 1: Verify full help output
    expect(helpResult.stdout).toContain("ffg [options] <path|repo>");
    expect(helpResult.stdout).toContain("Options:");
    expect(helpResult.stdout).toContain("Examples:");

    // Verify common options are present
    expect(helpResult.stdout).toContain("--include");
    expect(helpResult.stdout).toContain("--exclude");
    expect(helpResult.stdout).toContain("--find");
    expect(helpResult.stdout).toContain("--verbose");
    expect(helpResult.stdout).toContain("--no-token-count");

    // Verify examples are present
    expect(helpResult.stdout).toContain("ffg --path /path/to/project");
    expect(helpResult.stdout).toContain("ffg /path/to/project --template");

    // Test 2: Verify -h alias provides the same output
    expect(hAliasResult.stdout).toContain("ffg [options] <path|repo>");
    expect(hAliasResult.stdout).toContain("Options:");
    expect(hAliasResult.stdout).toContain("Examples:");

    // Make sure both outputs are identical
    expect(helpResult.stdout).toEqual(hAliasResult.stdout);
  });
});
