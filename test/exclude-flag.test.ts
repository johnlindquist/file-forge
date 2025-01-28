// test/exclude-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --exclude", () => {
  it("excludes patterns that match user-supplied glob", async () => {
    // We'll exclude *.md so that readme.md won't show up
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/ignore-test",
      "--exclude",
      "*.md",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // Output shouldn't have 'readme.md'
    expect(stdout).not.toMatch(/readme\.md/);

    // But the .ts file is still present
    expect(stdout).toMatch(/kept\.ts/);
  });
});
