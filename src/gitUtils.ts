import { execSync } from "node:child_process";
import { simpleGit as createGit, ResetMode } from "simple-git";
import * as p from "@clack/prompts";

/**
 * Resets and optionally checks out a specific branch or commit in a git repository.
 * Handles both regular git commands and simple-git API.
 *
 * @param repoPath - Path to the git repository
 * @param branch - Optional branch to checkout
 * @param commit - Optional commit to checkout
 * @param useRegularGit - Whether to use regular git commands instead of simple-git
 * @returns A Promise that resolves when the operation is complete
 */
export async function resetGitRepo(
  repoPath: string,
  branch?: string,
  commit?: string,
  useRegularGit: boolean = false
): Promise<void> {
  const spinner = p.spinner();

  if (useRegularGit) {
    try {
      spinner.start("Checking out using regular git commands...");
      execSync("git clean -fdx", { cwd: repoPath });
      execSync("git reset --hard", { cwd: repoPath });

      if (branch) {
        spinner.start(`Checking out branch ${branch}...`);
        execSync("git clean -fdx", { cwd: repoPath });
        execSync("git reset --hard", { cwd: repoPath });
        execSync(`git checkout ${branch}`, { cwd: repoPath });
        spinner.stop("Branch checked out.");
        execSync("git clean -fdx", { cwd: repoPath });
        execSync("git reset --hard", { cwd: repoPath });
      }

      if (commit) {
        spinner.start(`Checking out commit ${commit}...`);
        execSync("git clean -fdx", { cwd: repoPath });
        execSync("git reset --hard", { cwd: repoPath });
        execSync(`git checkout ${commit}`, { cwd: repoPath });
        spinner.stop("Checked out commit.");
        execSync("git clean -fdx", { cwd: repoPath });
        execSync("git reset --hard", { cwd: repoPath });
      }
    } catch {
      spinner.stop("Checkout failed");
      throw new Error("Failed to checkout using regular git commands");
    }
  } else {
    const git = createGit(repoPath);
    await git.clean("f", ["-d"]);
    await git.reset(ResetMode.HARD);

    if (branch) {
      spinner.start(`Checking out branch ${branch}...`);
      await git.clean("f", ["-d"]);
      await git.reset(ResetMode.HARD);
      try {
        await git.checkout(branch);
        spinner.stop("Branch checked out.");
      } catch {
        spinner.stop("Branch checkout failed");
        throw new Error("Failed to checkout branch");
      }
      await git.clean("f", ["-d"]);
      await git.reset(ResetMode.HARD);
    }

    if (commit) {
      spinner.start(`Checking out commit ${commit}...`);
      await git.clean("f", ["-d"]);
      await git.reset(ResetMode.HARD);
      try {
        await git.checkout(commit);
        spinner.stop("Checked out commit.");
      } catch {
        spinner.stop("Checkout failed");
        throw new Error("Failed to checkout commit");
      }
      await git.clean("f", ["-d"]);
      await git.reset(ResetMode.HARD);
    }
  }
}
