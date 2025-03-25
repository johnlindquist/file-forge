// test/ignore-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --ignore", () => {
  it("should test .gitignore behavior with different settings", async () => {
    // Run both tests in parallel
    const [defaultResult, bypassResult] = await Promise.all([
      // Test 1: Default behavior with --ignore
      runCLI([
        "--path",
        "test/fixtures/ignore-test",
        "--ignore",
        "--pipe",
      ]),

      // Test 2: Bypass .gitignore with --ignore=false
      runCLI([
        "--path",
        "test/fixtures/ignore-test",
        "--ignore=false",
        "--pipe",
      ])
    ]);

    // Test 1: Default behavior with --ignore
    expect(defaultResult.exitCode).toBe(0);
    // We expect 'ignored.js' to not appear when respecting .gitignore
    expect(defaultResult.stdout).not.toMatch(/ignored\.js/);
    // We do expect 'kept.ts'
    expect(defaultResult.stdout).toMatch(/kept\.ts/);

    // Test 2: Bypass .gitignore with --ignore=false
    expect(bypassResult.exitCode).toBe(0);
    // 'ignored.js' is now included when bypassing .gitignore
    expect(bypassResult.stdout).toMatch(/ignored\.js/);
  });
});
