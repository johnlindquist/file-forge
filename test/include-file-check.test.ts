// test/include-file-check.test.ts
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";

describe("Include flag for specific file and directory paths", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for our fixture
    tempDir = mkdtempSync(join(tmpdir(), "include-test-"));
  });

  afterEach(() => {
    // Clean up the temporary directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("should correctly include a single file (package.json)", async () => {
    // Create a package.json file in the temporary directory
    const packageJsonPath = join(tempDir, "package.json");
    const packageJsonContent = '{ "name": "include-test" }';
    await fs.writeFile(packageJsonPath, packageJsonContent, "utf8");

    // Also create another file to ensure only package.json is included
    const otherFilePath = join(tempDir, "index.js");
    await fs.writeFile(otherFilePath, "console.log('hello');", "utf8");

    // Run the CLI with the include flag set to package.json
    const { stdout, exitCode } = await runCLI([
      "--path",
      tempDir,
      "--include",
      "package.json",
      "--pipe",
      "--verbose",
    ]);
    expect(exitCode).toBe(0);

    // The output should contain package.json and its content
    expect(stdout).toContain('<file path="package.json">');
    expect(stdout).toContain(packageJsonContent);

    // The output should not contain the content from index.js
    expect(stdout).not.toContain("index.js");
  });

  it("should correctly include a directory (.github)", async () => {
    // Create a .github directory with a workflow file in the temporary directory
    const githubDir = join(tempDir, ".github");
    await fs.mkdir(githubDir, { recursive: true });
    const workflowFilePath = join(githubDir, "workflow.yml");
    const workflowContent = "name: CI";
    await fs.writeFile(workflowFilePath, workflowContent, "utf8");

    // Also create another file outside the .github folder
    const otherFilePath = join(tempDir, "README.md");
    await fs.writeFile(otherFilePath, "# Readme", "utf8");

    // Run the CLI with the include flag set to .github
    const { stdout, exitCode } = await runCLI([
      "--path",
      tempDir,
      "--include",
      ".github",
      "--pipe",
      "--verbose",
    ]);
    expect(exitCode).toBe(0);

    // The output should include the .github directory and the workflow file content
    expect(stdout).toContain(".github");
    expect(stdout).toContain("workflow.yml");
    expect(stdout).toContain(workflowContent);

    // It should not include the content from files outside .github
    expect(stdout).not.toContain("Readme");
  });
});
