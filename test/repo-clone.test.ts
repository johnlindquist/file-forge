// test/repo-clone.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRepoPath } from "../src/repo.js";
import { promises as fs } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import envPaths from "env-paths";
import { mkdirp } from "mkdirp"; 
import { fileExists } from "../src/utils.js";
import { APP_SYSTEM_ID } from "../src/constants";
import { createTempGitRepo, TempGitRepoResult } from "./helpers/createTempGitRepo.js"; 

// Helper: compute a short MD5 hash from the source URL/path
function hashSource(source: string): string {
  return createHash("md5").update(String(source)).digest("hex").slice(0, 6);
}

// Determine the cache directory from envPaths
const cacheDir = envPaths(APP_SYSTEM_ID).cache;

describe("getRepoPath cloning behavior", () => {
  let tempRepo1: TempGitRepoResult | null = null;
  let tempRepo2: TempGitRepoResult | null = null;
  let repo1CacheDir: string | null = null;
  let repo2CacheDir: string | null = null;

  beforeEach(async () => {
    [tempRepo1, tempRepo2] = await Promise.all([
      createTempGitRepo({ files: { "repo1.txt": "Repo 1" } }),
      createTempGitRepo({ files: { "repo2.txt": "Repo 2" } }),
    ]);
  }, 30000);

  afterEach(async () => {
    const repo1Path = tempRepo1?.repoPath;
    const repo2Path = tempRepo2?.repoPath;

    await Promise.all([
        tempRepo1?.cleanup(),
        tempRepo2?.cleanup()
    ]);

    const cleanupTasks: Promise<void>[] = [];
    if (repo1Path) {
      if (!repo1CacheDir) {
        repo1CacheDir = join(cacheDir, `ingest-${hashSource(repo1Path)}`);
      }
      if (repo1CacheDir && await fileExists(repo1CacheDir)) {
         cleanupTasks.push(fs.rm(repo1CacheDir, { recursive: true, force: true }));
      }
    }
    if (repo2Path) {
      if (!repo2CacheDir) {
        repo2CacheDir = join(cacheDir, `ingest-${hashSource(repo2Path)}`);
       }
       if (repo2CacheDir && await fileExists(repo2CacheDir)) {
         cleanupTasks.push(fs.rm(repo2CacheDir, { recursive: true, force: true }));
       }
    }
    await Promise.all(cleanupTasks);

    tempRepo1 = null; 
    tempRepo2 = null;
    repo1CacheDir = null;
    repo2CacheDir = null;
  });

  it("clones distinct repositories based on their source paths", async () => {
    expect(tempRepo1?.repoPath).toBeDefined();
    expect(tempRepo2?.repoPath).toBeDefined();
    const repo1Path = tempRepo1!.repoPath;
    const repo2Path = tempRepo2!.repoPath;

    const flags = { useRegularGit: false };

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

    repo1CacheDir = repo1Cache;
    repo2CacheDir = repo2Cache;

    expect(repo1Cache).toBeDefined();
    expect(repo2Cache).toBeDefined();
    expect(repo1Cache).not.toEqual(repo2Cache);

    const [repo1FileExists, repo2FileExists, content1, content2] = await Promise.all([
      fileExists(join(repo1Cache, "repo1.txt")),
      fileExists(join(repo2Cache, "repo2.txt")),
      fs.readFile(join(repo1Cache, "repo1.txt"), "utf8"),
      fs.readFile(join(repo2Cache, "repo2.txt"), "utf8")
    ]);

    expect(repo1FileExists).toBe(true);
    expect(repo2FileExists).toBe(true);
    expect(content1).toBe("Repo 1");
    expect(content2).toBe("Repo 2");
  });
});
