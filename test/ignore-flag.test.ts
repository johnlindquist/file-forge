// test/ignore-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --ignore", () => {
  it("defaults to using .gitignore if --ignore is true", async () => {
    // See also examples in your existing tests for ignoring .js
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/ignore-test",
      "--ignore",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // We expect 'ignored.js' to not appear
    expect(stdout).not.toMatch(/ignored\.js/);
    // We do expect 'kept.ts'
    expect(stdout).toMatch(/kept\.ts/);
  });

  it("bypasses .gitignore if --ignore=false", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/ignore-test",
      "--ignore=false",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // 'ignored.js' is now included
    expect(stdout).toMatch(/ignored\.js/);
  });
});
