// test/debug-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --debug", () => {
  it("prints extra debug output to STDOUT or STDERR", async () => {
    const { stdout, stderr, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--debug",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // We expect some debug lines
    expect(stdout + stderr).toMatch(/^\[DEBUG\]/m);
  });
});
