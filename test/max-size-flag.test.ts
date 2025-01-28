// test/max-size-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --max-size", () => {
  it("skips showing file content if file exceeds max-size bytes", async () => {
    // Suppose we have a big file in fixtures or you generate one
    // For demonstration, we check that the content shows
    // "[Content ignored: file too large]" if a file is big
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/large-file-project", // you'd create a fixture with a big file
      "--max-size",
      "10", // 10 bytes for testing
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // The large file's content is replaced
    expect(stdout).toContain("[Content ignored: file too large]");
  });
});
