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
import { APP_SYSTEM_ID } from "../src/constants";
import { isOnMainBranch } from "./test-helpers";

// Helper: compute a short MD5 hash from the source URL/path
function hashSource(source: string): string {
  return createHash("md5").update(String(source)).digest("hex").slice(0, 6);
}

// Determine the cache directory from envPaths
const cacheDir = envPaths(APP_SYSTEM_ID).cache;

// Only run these tests on main branch
if (isOnMainBranch()) {
  describe("getRepoPath cloning behavior", () => {
    let tempRoot: string;
    let repo1Path: string;
    let repo2Path: string;

    beforeEach(async () => {
      // Create a temporary root directory for our test repositories
      tempRoot = join(tmpdir(), "test-repo-clone-" + Date.now());
      await mkdirp(tempRoot);

      // Create both repos in parallel
      repo1Path = join(tempRoot, "repo1");
      repo2Path = join(tempRoot, "repo2");

      await Promise.all([
        (async () => {
          // Setup repo1
          await mkdirp(repo1Path);
          const git1 = createGit(repo1Path);
          await git1.init();
          await git1.addConfig("user.name", "Test User");
          await git1.addConfig("user.email", "test@example.com");
          await fs.writeFile(join(repo1Path, "repo1.txt"), "Repo 1");
          await git1.add("repo1.txt");
          await git1.commit("Initial commit in repo1");
        })(),
        (async () => {
          // Setup repo2
          await mkdirp(repo2Path);
          const git2 = createGit(repo2Path);
          await git2.init();
          await git2.addConfig("user.name", "Test User");
          await git2.addConfig("user.email", "test@example.com");
          await fs.writeFile(join(repo2Path, "repo2.txt"), "Repo 2");
          await git2.add("repo2.txt");
          await git2.commit("Initial commit in repo2");
        })()
      ]);
    });

    afterEach(async () => {
      // Calculate cache directories
      const repo1CacheDir = join(cacheDir, `ingest-${hashSource(repo1Path)}`);
      const repo2CacheDir = join(cacheDir, `ingest-${hashSource(repo2Path)}`);

      // Remove temp and cache directories in parallel
      await Promise.all([
        // Remove the temporary repositories
        fs.rm(tempRoot, { recursive: true, force: true }),

        // Also remove the cache directories used by getRepoPath for each repo.
        (async () => {
          if (await fileExists(repo1CacheDir)) {
            await fs.rm(repo1CacheDir, { recursive: true, force: true });
          }
        })(),

        (async () => {
          if (await fileExists(repo2CacheDir)) {
            await fs.rm(repo2CacheDir, { recursive: true, force: true });
          }
        })()
      ]);
    });

    it("clones distinct repositories based on their source paths", async () => {
      // Use simpleGit for cloning
      const flags = { useRegularGit: false };

      // Ensure directories exist (should already exist from beforeEach)
      await Promise.all([
        mkdirp(repo1Path),
        mkdirp(repo2Path)
      ]);

      // Call getRepoPath for each repository in parallel
      const [repo1Cache, repo2Cache] = await Promise.all([
        getRepoPath(
          repo1Path,
          hashSource(repo1Path),
          flags,
          /* isLocal */ false
        ),
        getRepoPath(
          repo2Path,
          hashSource(repo2Path),
          flags,
          /* isLocal */ false
        )
      ]);

      // Verify that both returned cache directories are defined and distinct
      expect(repo1Cache).toBeDefined();
      expect(repo2Cache).toBeDefined();
      expect(repo1Cache).not.toEqual(repo2Cache);

      // Read file contents in parallel
      const [repo1FileExists, repo2FileExists, content1, content2] = await Promise.all([
        fileExists(join(repo1Cache, "repo1.txt")),
        fileExists(join(repo2Cache, "repo2.txt")),
        fs.readFile(join(repo1Cache, "repo1.txt"), "utf8"),
        fs.readFile(join(repo2Cache, "repo2.txt"), "utf8")
      ]);

      // Verify file existence and content
      expect(repo1FileExists).toBe(true);
      expect(repo2FileExists).toBe(true);
      expect(content1).toBe("Repo 1");
      expect(content2).toBe("Repo 2");
    });
  });
} else {
  describe.skip("getRepoPath cloning behavior (skipped: not on main branch)", () => {
    it("placeholder test", () => {
      expect(true).toBe(true);
    });
  });
}
