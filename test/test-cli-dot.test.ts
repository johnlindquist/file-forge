// test/test-cli-dot.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import envPaths from "env-paths";
import { runCLI } from "./test-helpers";

describe("CLI: ingest current directory with '.'", () => {
  it("should include files from the current directory and not throw 'No files found'", async () => {
    // Use the test fixtures directory instead of the whole project
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--debug",
      "--pipe",
      "--skip-artifacts=false",
      "--verbose",
    ]);

    console.log("CLI STDOUT:\n", stdout);
    console.log("CLI STDERR:\n", stderr);

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("No files found or directory is empty");

    // Extract the saved file path from the output
    const savedMatch = stdout.match(/RESULTS_SAVED: (.+\.md)/);
    if (!savedMatch) {
      console.log("Full stdout:", stdout);
      throw new Error("Could not find RESULTS_SAVED marker in output");
    }
    expect(savedMatch).toBeTruthy();

    const [, savedPath] = savedMatch;
    const searchesDir = envPaths("ghi").config;
    const fullPath = resolve(searchesDir, savedPath.split("/").pop()!);
    const savedContent = readFileSync(fullPath, "utf8");

    // Now check the actual content of the saved file
    expect(savedContent).toMatch(/hello\.js/);
    expect(savedContent).toMatch(/test\.ts/);
    expect(savedContent).toContain("Directory Structure");
    expect(savedContent).toContain("Files Content");
  }, 15000); // Keep the timeout just in case
});
