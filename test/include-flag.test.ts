// test/include-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --include", () => {
  it("includes only the specified patterns", async () => {
    // In this example, we ingest the sample-project fixture
    // but only want to see .ts files
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--include",
      "*.ts",
      "--pipe",
    ]);

    expect(exitCode).toBe(0);
    // we expect the final output to mention `test.ts` but not `hello.js`
    expect(stdout).toMatch(/test\.ts/);
    expect(stdout).not.toMatch(/hello\.js/);

    // You could also confirm that the final output file was saved
    // and check its contents as needed (similar to `test-cli-dot.test.ts`).
  });
});
