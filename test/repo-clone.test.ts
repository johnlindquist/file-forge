// test/repo-clone.test.ts
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "vitest";
import { getRepoPath } from "../src/repo";
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

describe.skip("getRepoPath cloning behavior", () => {
  let tempRepo: TempGitRepoResult | null = null;
  let tempLocalPath: string | null = null;
  let repoCacheDir: string | null = null;

  beforeEach(async () => {
    [tempRepo] = await Promise.all([
      createTempGitRepo({ files: { "repo1.txt": "Repo 1" } }),
    ]);
  }, 30000);

  afterEach(async () => {
    const repoPath = tempRepo?.repoPath;

    await tempRepo?.cleanup();

    const cleanupTasks: Promise<void>[] = [];
    if (repoPath) {
      if (!repoCacheDir) {
        repoCacheDir = join(cacheDir, `ingest-${hashSource(repoPath)}`);
      }
      if (repoCacheDir && await fileExists(repoCacheDir)) {
        cleanupTasks.push(fs.rm(repoCacheDir, { recursive: true, force: true }));
      }
    }
    await Promise.all(cleanupTasks);

    tempRepo = null;
    repoCacheDir = null;
  });

  it("clones distinct repositories based on their source paths", async () => {
    expect(tempRepo?.repoPath).toBeDefined();
    const repoPath = tempRepo!.repoPath;

    const flags = { useRegularGit: false };

    const repoCache = await getRepoPath(
      repoPath,
      hashSource(repoPath),
      flags,
      /* isLocal */ false
    );

    repoCacheDir = repoCache;

    expect(repoCache).toBeDefined();

    const [repoFileExists, content] = await Promise.all([
      fileExists(join(repoCache, "repo1.txt")),
      fs.readFile(join(repoCache, "repo1.txt"), "utf8")
    ]);

    expect(repoFileExists).toBe(true);
    expect(content).toBe("Repo 1");
  });
});
