// test/ignore-flag.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { execa } from "execa";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { promises as fs } from 'node:fs';
import { runCLI } from "./test-helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, "../dist/cli.js");
const fixturesDir = join(__dirname, "fixtures");

describe("CLI --ignore", () => {
  const ignoreTestDir = join(fixturesDir, "ignore-test");

  beforeAll(async () => {
    const ignoredJsPath = join(ignoreTestDir, "ignored.js");
    try {
        // Try to access the file, if it fails (ENOENT), create it.
        await fs.access(ignoredJsPath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log(`[CI FIX] Creating missing ignored.js for test in ${ignoreTestDir}`);
            await fs.writeFile(ignoredJsPath, '// Empty file created by test setup\n');
        } else {
            // Rethrow unexpected errors
            throw error;
        }
    }
  });

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
