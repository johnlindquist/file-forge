import { describe, expect, test } from "vitest";
import { runCLI } from "../utils/runCLI.js";

describe("help flag", () => {
  test("should display help text with examples", async () => {
    const { stdout } = await runCLI(["--help"]);

    // Verify key sections are present
    expect(stdout).toContain("ffg [options] <include...>");
    expect(stdout).toContain("Options:");
    expect(stdout).toContain("Examples:");

    // Verify important options are documented
    expect(stdout).toContain("--repo");
    expect(stdout).toContain("--path");
    expect(stdout).toContain("--include");
    expect(stdout).toContain("--exclude");
    expect(stdout).toContain("--find");
    expect(stdout).toContain("--require");
    expect(stdout).toContain("--branch");
    expect(stdout).toContain("--commit");
    expect(stdout).toContain("--graph");
    expect(stdout).toContain("--bulk");
    expect(stdout).toContain("--verbose");
    expect(stdout).toContain("--clipboard");
    expect(stdout).toContain("--pipe");
    expect(stdout).toContain("--debug");
  });

  test("should display help text with -h alias", async () => {
    const { stdout } = await runCLI(["-h"]);
    expect(stdout).toContain("ffg [options] <include...>");
    expect(stdout).toContain("Options:");
    expect(stdout).toContain("Examples:");
  });
});
