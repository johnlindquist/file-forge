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

    // Helper to extract the help text after any debug lines
    function extractHelpText(output: string): string {
      // Find the first line that looks like the help header
      const match = output.match(/(^|\n)\s*f\w* \[options\] <path\|repo>/);
      if (!match) return output;
      return output.slice(match.index!).trim();
    }

    const helpText = extractHelpText(helpResult.stdout);
    const hAliasText = extractHelpText(hAliasResult.stdout);

    // Test 1: Verify full help output
    expect(helpText).toContain("[options] <path|repo>");
    expect(helpText).toContain("Options:");
    expect(helpText).toContain("Examples:");

    // Verify common options are present
    expect(helpText).toContain("--include");
    expect(helpText).toContain("--exclude");
    expect(helpText).toContain("--find");
    expect(helpText).toContain("--verbose");
    expect(helpText).toContain("--no-token-count");

    // Verify examples are present
    expect(helpText).toMatch(/Analyze a local project directory|--path/);
    expect(helpText).toMatch(/Clone and analyze a GitHub repository|--repo/);

    // Test 2: Verify -h alias provides the same output
    expect(hAliasText).toContain("[options] <path|repo>");
    expect(hAliasText).toContain("Options:");
    expect(hAliasText).toContain("Examples:");

    // Make sure both outputs are identical (ignoring debug lines)
    expect(helpText).toEqual(hAliasText);
  });
});
