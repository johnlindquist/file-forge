import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCLI, isOnMainBranch } from "./test-helpers";
import { nanoid } from "nanoid"; // or just build your own random string
import { runDirectCLI } from "../utils/directTestRunner.js";

// Only run these tests on main branch
if (isOnMainBranch()) {
  describe.concurrent("CLI --branch", () => {
    let repoPath: string;

    // Use beforeAll instead of beforeEach for one-time setup
    beforeAll(() => {
      // Create a brand new temp directory once for all tests
      const randomFolder = `branch-test-${nanoid()}`;
      repoPath = join(tmpdir(), randomFolder);

      // Wipe if something is leftover (paranoia)
      rmSync(repoPath, { recursive: true, force: true });
      mkdirSync(repoPath, { recursive: true });

      // Only initialize if the repository is not already initialized (i.e. when in a bare repo)
      if (!existsSync(join(repoPath, ".git"))) {
        execSync("git init --template=''", { cwd: repoPath });
      }

      // Now safely init a brand-new repo with no default template
      execSync("git init --template=''", { cwd: repoPath });

      // Create & commit main.js on "main" branch
      execSync("git checkout -b main", { cwd: repoPath });
      writeFileSync(resolve(repoPath, "main.js"), "console.log('main')");
      execSync("git add main.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
        { cwd: repoPath }
      );

      // Switch to a feature branch & commit a different file
      rmSync(resolve(repoPath, "main.js"));
      execSync("git rm main.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Remove main.js"',
        { cwd: repoPath }
      );
      execSync("git checkout -b some-feature-branch", { cwd: repoPath });
      writeFileSync(resolve(repoPath, "feature.js"), "console.log('feature')");
      execSync("git add feature.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Feature commit"',
        { cwd: repoPath }
      );
    });

    // Clean up after all tests
    afterAll(() => {
      // Only attempt cleanup if repoPath is defined
      if (repoPath) {
        try {
          rmSync(repoPath, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Warning: Failed to clean up test directory: ${error}`);
        }
      }
    });

    it("attempts to clone the specified branch from a Git repository", async () => {
      const { stdout, exitCode } = await runCLI([
        "--repo",
        repoPath,
        "--branch",
        "some-feature-branch",
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Text digest built");
      expect(stdout).toMatch(/Branch: some-feature-branch/i);
      expect(stdout).toContain("feature.js");
      expect(stdout).not.toContain("main.js");
    });

    // Add a test using direct execution for comparison
    it("attempts to clone the specified branch using direct execution", async () => {
      const { stdout, exitCode } = await runDirectCLI([
        "--repo",
        repoPath,
        "--branch",
        "some-feature-branch",
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Text digest built");
      expect(stdout).toMatch(/Branch: some-feature-branch/i);
      expect(stdout).toContain("feature.js");
      expect(stdout).not.toContain("main.js");
    });
  });
} else {
  describe.skip("CLI --branch (skipped: not on main branch)", () => {
    it("placeholder test", () => {
      expect(true).toBe(true);
    });
  });
}
