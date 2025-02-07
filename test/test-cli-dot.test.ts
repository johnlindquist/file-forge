// test/test-cli-dot.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import envPaths from "env-paths";
import { runCLI } from "./test-helpers";
import { APP_SYSTEM_ID } from "../src/constants";

// Helper function to wait for file to exist with timeout
async function waitForFile(
  path: string,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

describe("CLI: ingest current directory with '.'", () => {
  it("should include files from the current directory and not throw 'No files found'", async () => {
    console.log("Starting test...");

    // Use the test fixtures directory instead of the whole project
    const { stdout, stderr, exitCode } = await runCLI([
      "test/fixtures/sample-project",
      "--pipe",
      "--no-skip-artifacts",
      "--ignore",
      "false",
    ]);

    console.log("CLI command completed");
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
    const searchesDir = envPaths(APP_SYSTEM_ID).config;
    const fullPath = resolve(searchesDir, savedPath.split("/").pop()!);

    console.log("Waiting for file to exist:", fullPath);
    const fileExists = await waitForFile(fullPath);
    if (!fileExists) {
      throw new Error(`Timeout waiting for file to exist: ${fullPath}`);
    }
    console.log("File exists, proceeding with read");

    const savedContent = readFileSync(fullPath, "utf8");
    console.log("File content length:", savedContent.length);

    // Now check the actual content of the saved file
    expect(savedContent).toMatch(/hello\.js/);
    expect(savedContent).toMatch(/test\.ts/);
    expect(savedContent).toContain("Directory Structure");
    expect(savedContent).toContain("Files Content");

    console.log("Test completed successfully");
  }, 30000); // Increased timeout to be extra safe
});
