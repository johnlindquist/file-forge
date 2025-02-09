import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCLI } from "./test-helpers";
import { nanoid } from "nanoid"; // or just build your own random string

describe.concurrent("CLI --branch", () => {
  let repoPath: string;

  beforeEach(() => {
    // Create a brand new temp directory on each test run
    const randomFolder = `branch-test-${nanoid()}`;
    repoPath = join(tmpdir(), randomFolder);

    // Wipe if something is leftover (paranoia)
    rmSync(repoPath, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });

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
});
