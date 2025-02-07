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
 * Resets and optionally checks out a specific branch or commit in a git repository.
 * Handles both regular git commands and simple-git API.
 *
 * @param options - Git reset options including branch, commit, and git mode
 * @returns A Promise that resolves when the operation is complete
 */
export async function resetGitRepo(options: GitResetOptions = {}) {
  const { branch, commit, useRegularGit, repoPath } = options;
  const spinner = p.spinner();
  try {
    if (useRegularGit) {
      spinner.start(formatSpinnerMessage("Resetting repository using git..."));
      if (commit) {
        execSync(`git checkout ${commit}`, { cwd: repoPath, stdio: "ignore" });
        spinner.stop(formatSpinnerMessage(CHECKOUT_COMMIT_STATUS(commit)));
      } else if (branch) {
        execSync(`git checkout ${branch}`, { cwd: repoPath, stdio: "ignore" });
        spinner.stop(formatSpinnerMessage(CHECKOUT_BRANCH_STATUS(branch)));
      }
    } else {
      spinner.start(
        formatSpinnerMessage("Resetting repository using simple-git...")
      );
      const git = createGit(repoPath);
      if (commit) {
        await git.checkout(commit);
        spinner.stop(formatSpinnerMessage(CHECKOUT_COMMIT_STATUS(commit)));
      } else if (branch) {
        await git.checkout(branch);
        spinner.stop(formatSpinnerMessage(CHECKOUT_BRANCH_STATUS(branch)));
      }
    }
    spinner.stop(formatSpinnerMessage(REPO_RESET_COMPLETE));
  } catch (error) {
    spinner.stop(formatErrorMessage(`Failed to reset repository: ${error}`));
    throw error;
  }
}
