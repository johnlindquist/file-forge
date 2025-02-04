// test/repo-clone.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRepoPath } from "../src/repo.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { simpleGit as createGit } from "simple-git";
import { createHash } from "crypto";
import envPaths from "env-paths";
import { mkdirp } from "mkdirp";
import { fileExists } from "../src/utils.js";

// Helper: compute a short MD5 hash from the source URL/path
function hashSource(source: string): string {
  return createHash("md5").update(String(source)).digest("hex").slice(0, 6);
}

// Determine the cache directory from envPaths
const cacheDir = envPaths("ghi").cache;

describe("getRepoPath cloning behavior", () => {
  let tempRoot: string;
  let repo1Path: string;
  let repo2Path: string;

  beforeEach(async () => {
    // Create a temporary root directory for our test repositories
    tempRoot = join(tmpdir(), "test-repo-clone-" + Date.now());
    await mkdirp(tempRoot);

    // Create repo1 in a temporary directory
    repo1Path = join(tempRoot, "repo1");
    await mkdirp(repo1Path);
    const git1 = createGit(repo1Path);
    await git1.init();
    await git1.addConfig("user.name", "Test User");
    await git1.addConfig("user.email", "test@example.com");
    // Create a file "repo1.txt" with content "Repo 1"
    await fs.writeFile(join(repo1Path, "repo1.txt"), "Repo 1");
    await git1.add("repo1.txt");
    await git1.commit("Initial commit in repo1");

    // Create repo2 in a temporary directory
    repo2Path = join(tempRoot, "repo2");
    await mkdirp(repo2Path);
    const git2 = createGit(repo2Path);
    await git2.init();
    await git2.addConfig("user.name", "Test User");
    await git2.addConfig("user.email", "test@example.com");
    // Create a file "repo2.txt" with content "Repo 2"
    await fs.writeFile(join(repo2Path, "repo2.txt"), "Repo 2");
    await git2.add("repo2.txt");
    await git2.commit("Initial commit in repo2");
  });

  afterEach(async () => {
    // Remove the temporary repositories
    await fs.rm(tempRoot, { recursive: true, force: true });

    // Also remove the cache directories used by getRepoPath for each repo.
    const repo1CacheDir = join(cacheDir, `ingest-${hashSource(repo1Path)}`);
    const repo2CacheDir = join(cacheDir, `ingest-${hashSource(repo2Path)}`);

    if (await fileExists(repo1CacheDir)) {
      await fs.rm(repo1CacheDir, { recursive: true, force: true });
    }
    if (await fileExists(repo2CacheDir)) {
      await fs.rm(repo2CacheDir, { recursive: true, force: true });
    }
  });

  it("clones distinct repositories based on their source paths", async () => {
    // Prepare flags to use regular git cloning.
    // We force cloning by passing isLocal = false.
    const flags = { useRegularGit: true };

    // Call getRepoPath for each repository.
    const repo1Cache = await getRepoPath(
      repo1Path,
      hashSource(repo1Path),
      flags,
      /* isLocal */ false
    );
    const repo2Cache = await getRepoPath(
      repo2Path,
      hashSource(repo2Path),
      flags,
      /* isLocal */ false
    );

    // Verify that both returned cache directories are defined and distinct.
    expect(repo1Cache).toBeDefined();
    expect(repo2Cache).toBeDefined();
    expect(repo1Cache).not.toEqual(repo2Cache);

    // Verify that repo1Cache has the expected file with the proper content.
    const repo1File = join(repo1Cache, "repo1.txt");
    const repo1FileExists = await fileExists(repo1File);
    expect(repo1FileExists).toBe(true);
    const content1 = await fs.readFile(repo1File, "utf8");
    expect(content1).toBe("Repo 1");

    // Verify that repo2Cache has the expected file with the proper content.
    const repo2File = join(repo2Cache, "repo2.txt");
    const repo2FileExists = await fileExists(repo2File);
    expect(repo2FileExists).toBe(true);
    const content2 = await fs.readFile(repo2File, "utf8");
    expect(content2).toBe("Repo 2");
  });
});
