// src/repo.ts

import { resolve } from "node:path";
import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";
import { simpleGit as createGit } from "simple-git";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import * as p from "@clack/prompts";
import { fileExists } from "./utils.js";
import { IngestFlags } from "./types.js";
import { resetGitRepo } from "./gitUtils.js";

/** Check if a string looks like a GitHub URL or a local file URL */
export function isGitHubURL(input: string): { isValid: boolean; url: string } {
  const str = input.trim();
  if (/^https?:\/\/(www\.)?github\.com\//i.test(str)) {
    return { isValid: true, url: str };
  }
  if (str.startsWith("github.com/")) {
    return { isValid: true, url: `https://${str}` };
  }
  if (str.startsWith("file://")) {
    return { isValid: true, url: str };
  }
  return { isValid: false, url: "" };
}

/**
 * Get a cached repository path or clone (or update) if needed.
 *
 * For local paths, just verify they exist.
 */
export async function getRepoPath(
  source: string,
  _hashedSource: string,
  flags: IngestFlags,
  isLocal: boolean
): Promise<string> {
  // For local paths
  if (isLocal || source.startsWith("file://")) {
    const localPath = resolve(
      source.startsWith("file://") ? source.slice(7) : source
    );
    if (!(await fileExists(localPath))) {
      throw new Error(`Local path not found: ${localPath}`);
    }
    return localPath;
  }

  const cacheDir = envPaths("ghi").cache;
  const repoDir = resolve(cacheDir, `ingest-${_hashedSource}`);

  if (await fileExists(repoDir)) {
    const spinner = p.spinner();
    spinner.start("Repository exists, updating...");
    try {
      if (flags.useRegularGit) {
        execSync("git fetch --all", { cwd: repoDir, stdio: "pipe" });
      } else {
        const git = createGit(repoDir);
        await git.fetch(["--all"]);
      }

      await resetGitRepo(
        repoDir,
        flags.branch,
        flags.commit,
        flags.useRegularGit
      );
      spinner.stop("Repository updated successfully.");
      return repoDir;
    } catch {
      spinner.stop("Update failed, recloning...");
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  }

  const spinner = p.spinner();
  spinner.start("Cloning repository...");
  try {
    await mkdirp(repoDir);
    if (flags.useRegularGit) {
      let cmd = "git clone";
      if (!flags.commit) {
        cmd += " --depth=1";
        if (flags.branch) cmd += ` --branch ${flags.branch}`;
      }
      cmd += ` ${source} ${repoDir}`;
      execSync(cmd, { stdio: "pipe" });
    } else {
      const git = createGit();
      if (flags.commit) {
        await git.clone(source, repoDir);
      } else {
        const cloneOptions = ["--depth=1"];
        if (flags.branch) {
          cloneOptions.push("--branch", flags.branch);
        }
        await git.clone(source, repoDir, cloneOptions);
      }
    }
    spinner.stop("Repository cloned successfully.");
    return repoDir;
  } catch (err) {
    spinner.stop("Clone failed.");
    throw err;
  }
}
