// src/repo.ts

import { join } from "node:path";
import { simpleGit as createGit } from "simple-git";
import { existsSync, rmSync } from "fs";
import * as p from "@clack/prompts";
import envPaths from "env-paths";
import { APP_SYSTEM_ID } from "./constants.js";
import { formatErrorMessage, formatSpinnerMessage } from "./formatter.js";
import { resetGitRepo } from "./gitUtils.js";
import { GitResetOptions } from "./types.js";

/** Check if a string looks like a GitHub URL or a local file URL */
export function isGitUrl(str: string): boolean {
  return (
    str.startsWith("git://") ||
    str.startsWith("git@") ||
    str.startsWith("https://") ||
    str.startsWith("file://") ||
    str.startsWith("github.com/") ||
    str.startsWith("www.github.com/")
  );
}

/** Get the path to a repository, cloning it if necessary */
export async function getRepoPath(
  source: string,
  hash: string,
  argv: GitResetOptions = {},
  isLocal = false
): Promise<string> {
  if (isLocal) {
    return source;
  }

  const spinner = p.spinner();
  const paths = envPaths(APP_SYSTEM_ID);
  const repoPath = join(paths.cache, `ingest-${hash}`);

  try {
    // Check if repo exists and has a valid .git directory
    const repoExists = existsSync(repoPath);
    const isValidRepo = existsSync(join(repoPath, ".git"));
    console.log(
      "Debug: repoExists =",
      repoExists,
      "isValidRepo =",
      isValidRepo,
      "for path",
      repoPath
    );

    // If repo exists but is invalid, remove it
    if (repoExists && !isValidRepo) {
      console.log("Debug: Removing corrupted repository");
      rmSync(repoPath, { recursive: true, force: true });
    }

    if (isValidRepo) {
      spinner.start(formatSpinnerMessage("Updating repository..."));
      try {
        const git = createGit(repoPath);
        await git.fetch(["--all"]);
        await git.pull();
        spinner.stop(formatSpinnerMessage("Repository updated"));
      } catch (error) {
        // If update fails, remove the repo and reclone
        console.log("Debug: Update failed with error:", error);
        rmSync(repoPath, { recursive: true, force: true });
        spinner.stop(
          formatErrorMessage(`Repository update failed, will reclone: ${error}`)
        );

        // Reclone after removing
        spinner.start(formatSpinnerMessage("Recloning repository..."));
        await createGit().clone(source, repoPath);
        spinner.stop(formatSpinnerMessage("Repository recloned"));
      }
    }

    if (!isValidRepo) {
      console.log("Debug: Cloning repository for the first time");
      spinner.start(formatSpinnerMessage("Cloning repository..."));
      await createGit().clone(source, repoPath);
      spinner.stop(formatSpinnerMessage("Repository cloned"));
    }

    // Reset to specific commit/branch if requested
    if (argv.commit || argv.branch) {
      console.log("Debug: Resetting to commit/branch:", {
        commit: argv.commit,
        branch: argv.branch,
      });
      await resetGitRepo({ ...argv, repoPath });
    }

    return repoPath;
  } catch (error) {
    console.log("Debug: Fatal error:", error);
    spinner.stop(formatErrorMessage(`Failed to prepare repository: ${error}`));
    throw error;
  }
}
