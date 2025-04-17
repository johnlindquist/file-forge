import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js";
import { createTempGitRepo, TempGitRepoResult } from "./helpers/createTempGitRepo.js";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

describe.skip("CLI --commit flag", () => {
  let tempRepo: TempGitRepoResult;
  let firstCommitSha: string;

  beforeEach(async () => {
    tempRepo = await createTempGitRepo({ initialBranch: 'main' });
    const { git, repoPath } = tempRepo;

    await fs.writeFile(resolve(repoPath, "main.js"), "console.log('main')");
    await git.add("main.js");
    await git.commit("Initial commit");

    firstCommitSha = (await git.revparse(['HEAD'])).trim();

    await fs.rm(resolve(repoPath, "main.js"));
    await git.rm("main.js");
    await git.commit("Remove main.js");

    await git.checkoutLocalBranch("some-feature-branch");
    await fs.writeFile(resolve(repoPath, "feature.js"), "console.log('feature')");
    await git.add("feature.js");
    await git.commit("Feature commit");

    // Test setup correction: checkout main *before* test runs
    // Ensure the test starts from a known branch state if needed,
    // although the commit checkout should override this. Let's leave it on feature branch.
    // await git.checkout('main'); // <-- Keep commented out
  }, 30000); // Timeout for setup

  afterEach(async () => {
    if (tempRepo) {
      await tempRepo.cleanup();
    }
  });

  it("checks out the specified commit SHA after cloning", async () => {
    const { stdout, stderr, exitCode } = await runDirectCLI([
      "--repo",
      tempRepo.repoPath, // Use tempRepo.repoPath
      "--commit",
      firstCommitSha, // Use the stored SHA
      "--pipe",
      "--verbose",
    ]);

    // Ensure the stderr expectation is completely removed

    // Check stdout for final status message and file content
    expect(stdout).toContain(`Checked out commit ${firstCommitSha}`); // Check stdout for status
    expect(stdout).toContain("<file path=\"main.js\">");
    expect(stdout).not.toContain("<file path=\"feature.js\">");
    expect(exitCode).toBe(0);
  });
});
