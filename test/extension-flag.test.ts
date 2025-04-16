import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { runCli } from "../src/cli.js";
import { ingestDirectory } from "../src/ingest.js";
import { setupTestDirectory, cleanupTestDirectory } from "./test-helpers.js";
import { PROP_CONTENT } from "../src/constants.js";
import path from "path";
import { IngestFlags } from "../src/types.js";

describe("extension flag", () => {
  const testDir = "test-extension-flag";

  beforeAll(async () => {
    // Setup test directory with all files needed for both tests
    await setupTestDirectory(testDir, {
      "file1.ts": "typescript content",
      "file2.js": "javascript content",
      "file3.json": "json content",
      "file4.ts": "more typescript",
      "src/test.ts": "console.log('hello world')",
      "src/main.js": "console.log('hello universe')",
      "src/other.js": "console.log('goodbye')",
    });
  });

  afterAll(async () => {
    await cleanupTestDirectory(testDir);
  });

  it("should handle extension filtering correctly with and without find flag", async () => {
    // Run both tests in parallel
    const [basicExtensionResult, combinedWithFindResult] = await Promise.all([
      // Test 1: Basic extension filtering
      (async () => {
        const argv = {
          ...runCli(),
          path: path.join(process.cwd(), testDir),
          extension: [".ts"],
          pipe: true,
          noColor: true,
          noIntro: true,
        } as IngestFlags;

        return ingestDirectory(
          path.join(process.cwd(), testDir),
          argv
        );
      })(),

      // Test 2: Combined with find flag
      (async () => {
        const argv = {
          ...runCli(),
          path: path.join(process.cwd(), testDir),
          extension: [".js"],
          find: ["hello"],
          pipe: true,
          noColor: true,
          noIntro: true,
        } as IngestFlags;

        return ingestDirectory(
          path.join(process.cwd(), testDir),
          argv
        );
      })()
    ]);

    // Verify Test 1: Basic extension filtering
    // Should include .ts files
    expect(basicExtensionResult[PROP_CONTENT]).toContain("file1.ts");
    expect(basicExtensionResult[PROP_CONTENT]).toContain("file4.ts");
    expect(basicExtensionResult[PROP_CONTENT]).toContain("test.ts");

    // Should not include other extensions
    expect(basicExtensionResult[PROP_CONTENT]).not.toContain("file2.js");
    expect(basicExtensionResult[PROP_CONTENT]).not.toContain("file3.json");
    expect(basicExtensionResult[PROP_CONTENT]).not.toContain("main.js");
    expect(basicExtensionResult[PROP_CONTENT]).not.toContain("other.js");

    // Verify Test 2: Combined with find flag
    // Should include .js file with "hello"
    expect(combinedWithFindResult[PROP_CONTENT]).toContain("main.js");
    expect(combinedWithFindResult[PROP_CONTENT]).toContain("hello universe");

    // Should not include .ts file even though it has "hello"
    expect(combinedWithFindResult[PROP_CONTENT]).not.toContain("test.ts");
    expect(combinedWithFindResult[PROP_CONTENT]).not.toContain("hello world");

    // Should not include .js file without "hello"
    expect(combinedWithFindResult[PROP_CONTENT]).not.toContain("other.js");
    expect(combinedWithFindResult[PROP_CONTENT]).not.toContain("goodbye");
  });
});
