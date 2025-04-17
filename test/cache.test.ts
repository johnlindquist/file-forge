import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCLI, isOnMainBranch } from "./test-helpers";
import { nanoid } from "nanoid";
import envPaths from "env-paths";
import { APP_SYSTEM_ID } from "../src/constants.js";

// Only run these tests on main branch
if (isOnMainBranch()) {
  describe.skip("Repository Caching", () => {
    let repoPath: string;
    let cacheDir: string;

    beforeEach(() => {
      // Create a brand new temp directory for the test repo
      const randomFolder = `cache-test-${nanoid()}`;
      repoPath = join(tmpdir(), randomFolder);
      cacheDir = envPaths(APP_SYSTEM_ID).cache;

      // Wipe if something is leftover
      rmSync(repoPath, { recursive: true, force: true });
      mkdirSync(repoPath, { recursive: true });

      // Initialize git repo
      execSync("git init --template=''", { cwd: repoPath });
      try {
        // Try creating a new "main" branch
        execSync("git checkout -b main", { cwd: repoPath });
      } catch {
        // If the branch already exists (common in a worktree), simply check it out
        execSync("git checkout main", { cwd: repoPath });
      }

      // Create & commit initial file
      writeFileSync(resolve(repoPath, "initial.js"), "console.log('initial')");
      execSync("git add initial.js", { cwd: repoPath });
      execSync(
        'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
        { cwd: repoPath }
      );
    });

    it(
      "handles local repositories without cloning",
      async () => {
        // First run on local repo
        const result1 = await runCLI(["--path", repoPath, "--pipe"]);
        expect(result1.exitCode).toBe(0);
        expect(result1.stdout).toContain("initial.js");
        expect(result1.stdout).not.toContain("Repository cloned");
        expect(result1.stdout).not.toContain("Repository updated");

        // Add a new file
        writeFileSync(resolve(repoPath, "new.js"), "console.log('new')");
        execSync("git add new.js", { cwd: repoPath });
        execSync(
          'git -c user.name="Test" -c user.email="test@example.com" commit -m "Add new file"',
          { cwd: repoPath }
        );

        // Second run should see new file without cloning/updating
        const result2 = await runCLI(["--path", repoPath, "--pipe"]);
        expect(result2.exitCode).toBe(0);
        expect(result2.stdout).toContain("initial.js");
        expect(result2.stdout).toContain("new.js");
        expect(result2.stdout).not.toContain("Repository cloned");
        expect(result2.stdout).not.toContain("Repository updated");
      },
      { timeout: 30000 }
    );

    it(
      "handles remote repositories with caching",
      async () => {
        // Create a "remote" repo
        const remoteFolder = `remote-${nanoid()}`;
        const remotePath = join(tmpdir(), remoteFolder);
        rmSync(remotePath, { recursive: true, force: true });
        mkdirSync(remotePath, { recursive: true });

        // Initialize a normal repo first
        execSync("git init --template=''", { cwd: remotePath });
        execSync("git checkout -b main", { cwd: remotePath });
        writeFileSync(
          resolve(remotePath, "initial.js"),
          "console.log('initial')"
        );
        execSync("git add initial.js", { cwd: remotePath });
        execSync(
          'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
          { cwd: remotePath }
        );

        // Run a series of CLI commands to test caching
        const remoteUrl = `file://${remotePath}`;

        // First run to clone remote
        const result1 = await runCLI([
          "--repo",
          remoteUrl,
          "--use-regular-git",
          "--pipe",
        ]);
        expect(result1.exitCode).toBe(0);

        // Extract the saved file path from the output
        const savedMatch = result1.stdout.match(/RESULTS_SAVED: (.+\.md)/);
        if (!savedMatch) {
          throw new Error("Could not find RESULTS_SAVED marker in output");
        }
        const [, savedPath] = savedMatch;
        const savedContent = readFileSync(savedPath, "utf8");
        expect(savedContent).toContain("initial.js");

        // Add a new file and push to remote
        writeFileSync(resolve(remotePath, "new.js"), "console.log('new')");
        execSync("git add new.js", { cwd: remotePath });
        execSync(
          'git -c user.name="Test" -c user.email="test@example.com" commit -m "Add new file"',
          { cwd: remotePath }
        );

        // Get hash for later corruption
        const gitDir = join(cacheDir, `ingest-${result1.hashedSource}`, ".git");

        // Run the second and third CLI calls in parallel
        // For the third call, we need to corrupt the git repo first
        const runSecondCLI = async () => {
          // Second run should update cache
          return runCLI([
            "--repo",
            remoteUrl,
            "--use-regular-git",
            "--pipe",
          ]);
        };

        const runThirdCLI = async () => {
          // Wait for some time to ensure the second run has started
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Corrupt the git repo
          rmSync(gitDir, { recursive: true, force: true });

          // Third run should detect corruption and reclone
          return runCLI([
            "--repo",
            remoteUrl,
            "--use-regular-git",
            "--pipe",
          ]);
        };

        // Run the second CLI call
        const result2 = await runSecondCLI();
        expect(result2.exitCode).toBe(0);

        // Check the saved content for the second run
        const savedMatch2 = result2.stdout.match(/RESULTS_SAVED: (.+\.md)/);
        expect(savedMatch2).toBeTruthy();
        if (!savedMatch2)
          throw new Error("Could not find RESULTS_SAVED marker in output");
        const [, savedPath2] = savedMatch2;
        const savedContent2 = readFileSync(savedPath2, "utf8");
        expect(savedContent2).toContain("initial.js");
        expect(savedContent2).toContain("new.js");

        // Run the third CLI call separately as it's dependent on the corruption
        const result3 = await runThirdCLI();
        expect(result3.exitCode).toBe(0);

        // Extract the saved file path from the output
        const savedMatch3 = result3.stdout.match(/RESULTS_SAVED: (.+\.md)/);
        expect(savedMatch3).toBeTruthy();
        if (!savedMatch3) {
          throw new Error("Could not find RESULTS_SAVED marker in output");
        }
        const [, savedPath3] = savedMatch3;
        const savedContent3 = readFileSync(savedPath3, "utf8");
        expect(savedContent3).toContain("initial.js");
        expect(savedContent3).toContain("new.js");
      },
      { timeout: 30000 }
    );
  });
} else {
  describe.skip("Repository Caching (skipped: not on main branch)", () => {
    it("placeholder test", () => {
      expect(true).toBe(true);
    });
  });
}
