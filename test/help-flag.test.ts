import { describe, it, expect } from "vitest";
import { runCLI } from "./helpers/runCLI";

describe("help flag", () => {
  it("should display help text with examples", async () => {
    const { stdout } = await runCLI(["--help"]);

    // Verify key sections are present
    expect(stdout).toContain("ffg [options] <path|repo>");
    expect(stdout).toContain("Options:");
    expect(stdout).toContain("Examples:");

    // Verify common options are present
    expect(stdout).toContain("--include");
    expect(stdout).toContain("--exclude");
    expect(stdout).toContain("--find");
    expect(stdout).toContain("--verbose");
    expect(stdout).toContain("--no-token-count");

    // Verify examples are present
    expect(stdout).toContain("ffg --path /path/to/project");
    expect(stdout).toContain("ffg /path/to/project --template");
  });

  it("should display help text with -h alias", async () => {
    const { stdout } = await runCLI(["-h"]);
    expect(stdout).toContain("ffg [options] <path|repo>");
    expect(stdout).toContain("Options:");
    expect(stdout).toContain("Examples:");
  });
});
