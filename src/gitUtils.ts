import { execSync } from "node:child_process";
import { simpleGit as createGit } from "simple-git";
import * as p from "@clack/prompts";
import { formatErrorMessage, formatSpinnerMessage } from "./formatter.js";
import { GitResetOptions } from "./types.js";
import {
  CHECKOUT_BRANCH_STATUS,
  CHECKOUT_COMMIT_STATUS,
  REPO_RESET_COMPLETE,
} from "./constants.js";

/**
 * Checks if a branch exists in the repository
 */
async function branchExists(
  repoPath: string,
  branch: string,
  useRegularGit: boolean
): Promise<boolean> {
  try {
    if (useRegularGit) {
      execSync(`git show-ref --verify --quiet refs/heads/${branch}`, {
        cwd: repoPath,
      });
      return true;
    } else {
      const git = createGit(repoPath);
      const branches = await git.branch();
      return branches.all.includes(branch);
    }
  } catch {
    return false;
  }
}

/**
 * Resets and optionally checks out a specific branch or commit in a git repository.
 * Handles both regular git commands and simple-git API.
 *
 * @param options - Git reset options including branch, commit, and git mode
 * @returns A Promise that resolves when the operation is complete
 */
export async function resetGitRepo(options: GitResetOptions = {}) {
  const { branch, commit, useRegularGit, repoPath } = options;

  if (!repoPath) {
    throw new Error("Repository path is required");
  }

  const spinner = p.spinner();
  try {
    if (useRegularGit) {
      if (commit) {
        spinner.start(formatSpinnerMessage(`Checking out commit ${commit}...`));
        try {
          // First try to fetch if this is a cloned repo
          execSync("git fetch", { cwd: repoPath, stdio: "ignore" });
        } catch {
          // Ignore fetch errors for local repos
        }

        execSync(`git -c advice.detachedHead=false checkout ${commit}`, {
          cwd: repoPath,
          stdio: "ignore",
        });
        console.log(CHECKOUT_COMMIT_STATUS(commit));
        spinner.stop(formatSpinnerMessage(CHECKOUT_COMMIT_STATUS(commit)));
      } else if (typeof branch === "string") {
        // Type guard for branch
        spinner.start(formatSpinnerMessage(`Checking out branch ${branch}...`));
        const exists = await branchExists(repoPath, branch, true);
        if (exists) {
          execSync(`git checkout ${branch}`, {
            cwd: repoPath,
            stdio: "ignore",
          });
        } else {
          execSync(`git checkout -b ${branch}`, {
            cwd: repoPath,
            stdio: "ignore",
          });
        }
        console.log(CHECKOUT_BRANCH_STATUS(branch));
        spinner.stop(formatSpinnerMessage(CHECKOUT_BRANCH_STATUS(branch)));
      }
    } else {
      const git = createGit(repoPath);
      if (commit) {
        spinner.start(formatSpinnerMessage(`Checking out commit ${commit}...`));
        try {
          // First try to fetch if this is a cloned repo
          await git.fetch();
        } catch {
          // Ignore fetch errors for local repos
        }

        // Set config before checkout
        await git.addConfig("advice.detachedHead", "false", false, "local");
        await git.checkout(commit);
        console.log(CHECKOUT_COMMIT_STATUS(commit));
        spinner.stop(formatSpinnerMessage(CHECKOUT_COMMIT_STATUS(commit)));
      } else if (typeof branch === "string") {
        // Type guard for branch
        spinner.start(formatSpinnerMessage(`Checking out branch ${branch}...`));
        const exists = await branchExists(repoPath, branch, false);
        if (exists) {
          await git.checkout(branch);
        } else {
          await git.checkoutLocalBranch(branch);
        }
        console.log(CHECKOUT_BRANCH_STATUS(branch));
        spinner.stop(formatSpinnerMessage(CHECKOUT_BRANCH_STATUS(branch)));
      }
    }
    console.log(REPO_RESET_COMPLETE);
    spinner.stop(formatSpinnerMessage(REPO_RESET_COMPLETE));
  } catch (error) {
    spinner.stop(formatErrorMessage(`Failed to reset repository: ${error}`));
    throw error;
  }
}
