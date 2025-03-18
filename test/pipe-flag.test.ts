// test/pipe-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./helpers/runCLI.js";
import { APP_HEADER } from "../src/constants.js";

describe("CLI --pipe", () => {
  it("outputs to stdout when --pipe is used with default XML format", async () => {
    const { exitCode, stdout } = await runCLI(["--path", "test/fixtures/sample-project", "--pipe", "--no-token-count"]);

    expect(exitCode).toBe(0);
    // With --pipe, we expect the full output in stdout
    expect(stdout).toContain("<project>");
    expect(stdout).toContain("<summary>");
    expect(stdout).toContain("<directoryTree>");

    // Results are also saved
    expect(stdout).toContain("RESULTS_SAVED:");
  });

  it("outputs markdown to stdout when --pipe and --markdown are used", async () => {
    const { exitCode, stdout } = await runCLI(["--path", "test/fixtures/sample-project", "--pipe", "--markdown", "--no-token-count"]);

    expect(exitCode).toBe(0);
    // With --pipe and --markdown, we expect markdown format in stdout
    expect(stdout).toContain(APP_HEADER);
    expect(stdout).toContain("## Summary");
    expect(stdout).toContain("## Directory Structure");

    // Results are also saved
    expect(stdout).toContain("RESULTS_SAVED:");
  });
});
