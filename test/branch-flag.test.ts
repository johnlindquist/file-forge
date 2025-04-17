import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCLI, isOnMainBranch } from "./test-helpers";
import { runDirectCLI } from "../utils/directTestRunner.js";
import { createTempGitRepo, TempGitRepoResult } from "./helpers/createTempGitRepo.js";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

// Only run these tests on main branch
if (isOnMainBranch()) {
  describe.concurrent.skip("CLI --branch", () => {
    let tempRepo: TempGitRepoResult;

    beforeAll(async () => {
      tempRepo = await createTempGitRepo({ initialBranch: 'main' });

      const { git, repoPath } = tempRepo;

      await fs.writeFile(resolve(repoPath, "main.js"), "console.log('main')");
      await git.add("main.js");
      await git.commit("Initial commit");

      await fs.rm(resolve(repoPath, "main.js"));
      await git.rm("main.js");
      await git.commit("Remove main.js");

      await git.checkoutLocalBranch("some-feature-branch");
      await fs.writeFile(resolve(repoPath, "feature.js"), "console.log('feature')");
      await git.add("feature.js");
      await git.commit("Feature commit");
    }, 30000);

    afterAll(async () => {
      if (tempRepo) {
        await tempRepo.cleanup();
      }
    });

    it("attempts to clone the specified branch from a Git repository", async () => {
      const { stdout, exitCode } = await runCLI([
        "--repo",
        tempRepo.repoPath,
        "--branch",
        "some-feature-branch",
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Branch: some-feature-branch/i);
      expect(stdout).toContain("feature.js");

      const directoryTreeMatch = stdout.match(
        /<directoryTree>([\s\S]*?)<\/directoryTree>/,
      );
      expect(directoryTreeMatch).not.toBeNull();
      const directoryTreeContent = directoryTreeMatch ? directoryTreeMatch[1] : "";

      expect(directoryTreeContent).not.toContain("main.js");
    });

    it("attempts to clone the specified branch using direct execution", async () => {
      const { stdout, exitCode } = await runDirectCLI([
        "--repo",
        tempRepo.repoPath,
        "--branch",
        "some-feature-branch",
        "--pipe",
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Branch: some-feature-branch/i);
      expect(stdout).toContain("feature.js");

      const directoryTreeMatch = stdout.match(
        /<directoryTree>([\s\S]*?)<\/directoryTree>/,
      );
      expect(directoryTreeMatch).not.toBeNull();
      const directoryTreeContent = directoryTreeMatch ? directoryTreeMatch[1] : "";

      expect(directoryTreeContent).not.toContain("main.js");
    });
  });
} else {
  describe.skip("CLI --branch (skipped: not on main branch)", () => {
    it("placeholder test", () => {
      expect(true).toBe(true);
    });
  });
}
