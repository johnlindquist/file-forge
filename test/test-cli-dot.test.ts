// test/test-cli-dot.test.ts
// This test has been optimized to use direct function calls instead of process spawning
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import envPaths from "env-paths";
import { runCLI } from "./test-helpers";
import { runDirectCLI } from "../utils/directTestRunner.js";
import { APP_SYSTEM_ID } from "../src/constants";
import { waitForFile } from "./helpers/fileWaiter";

describe("CLI: ingest current directory with '.'", () => {
  it("should include files from the current directory and not throw 'No files found'", async () => {
    console.log("Starting test...");
    console.log("Current working directory:", process.cwd());

    const fixturesPath = resolve(__dirname, "fixtures/sample-project");
    console.log("Fixtures path:", fixturesPath);

    // Use direct CLI execution
    const { stdout, stderr, exitCode } = await runDirectCLI([
      "--path",
      fixturesPath,
      "--pipe",
      "--no-skip-artifacts",
      "--ignore",
      "false",
      "--verbose",
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

    // Get the filename from the path, handling both absolute and relative paths
    const filename = savedPath.split("/").pop()!;
    const fullPath = resolve(searchesDir, "searches", filename);

    console.log("Waiting for file to exist:", fullPath);
    // Using optimized waitForFile with adaptive polling
    const fileExists = await waitForFile(fullPath, 30000, 50);
    if (!fileExists) {
      throw new Error(`Timeout waiting for file to exist: ${fullPath}`);
    }
    console.log("File exists, proceeding with read");

    const savedContent = readFileSync(fullPath, "utf8");
    console.log("File content length:", savedContent.length);

    // Now check the actual content of the saved file
    expect(savedContent).toContain("hello.js");
    expect(savedContent).toContain("test.ts");
    expect(savedContent).toContain("<directoryTree>");
    expect(savedContent).toContain("<files>");

    console.log("Test completed successfully");
  }, 30000); // Reduced timeout from 60000 to 30000 since direct execution is faster

  it("should produce consistent results between direct and process execution", async () => {
    const fixturesPath = resolve(__dirname, "fixtures/sample-project");

    // Run both implementations sequentially
    // Direct execution first
    const directResult = await runDirectCLI([
      "--path",
      fixturesPath,
      "--pipe",
      "--no-skip-artifacts",
      "--ignore",
      "false"
    ]);

    // Process execution second
    const processResult = await runCLI([
      "--path",
      fixturesPath,
      "--pipe",
      "--no-skip-artifacts",
      "--ignore",
      "false"
    ]);

    // Both should succeed
    expect(directResult.exitCode).toBe(0);
    expect(processResult.exitCode).toBe(0);

    // Both should have the same key markers in output
    const directSavedMatch = directResult.stdout.match(/RESULTS_SAVED: (.+\.md)/);
    const processSavedMatch = processResult.stdout.match(/RESULTS_SAVED: (.+\.md)/);

    expect(directSavedMatch).toBeTruthy();
    expect(processSavedMatch).toBeTruthy();

    // The actual saved files might be different, but they should both exist
    if (directSavedMatch && processSavedMatch) {
      const searchesDir = envPaths(APP_SYSTEM_ID).config;

      const directFilename = directSavedMatch[1].split("/").pop()!;
      const directFullPath = resolve(searchesDir, "searches", directFilename);

      const processFilename = processSavedMatch[1].split("/").pop()!;
      const processFullPath = resolve(searchesDir, "searches", processFilename);

      // Wait for both files sequentially as well
      const directFileExists = await waitForFile(directFullPath, 30000, 50); // Reduced timeout back to 30s
      const processFileExists = await waitForFile(processFullPath, 30000, 50);

      expect(directFileExists).toBe(true);
      expect(processFileExists).toBe(true);
    }
  }); // Removed explicit test timeout
});
