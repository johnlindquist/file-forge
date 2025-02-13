import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli.js";
import { ingestDirectory } from "../src/ingest.js";
import { setupTestDirectory, cleanupTestDirectory } from "./test-helpers.js";
import { PROP_CONTENT } from "../src/constants.js";
import path from "path";
import { IngestFlags } from "../src/types.js";

describe("extension flag", () => {
  const testDir = "test-extension-flag";

  it("should only include files with specified extensions", async () => {
    // Setup test directory with mixed file types
    await setupTestDirectory(testDir, {
      "file1.ts": "typescript content",
      "file2.js": "javascript content",
      "file3.json": "json content",
      "file4.ts": "more typescript",
    });

    try {
      const argv = {
        ...runCli(),
        path: path.join(process.cwd(), testDir),
        extension: [".ts"],
        pipe: true,
        noColor: true,
        noIntro: true,
      } as IngestFlags;

      const result = await ingestDirectory(
        path.join(process.cwd(), testDir),
        argv
      );

      // Should include .ts files
      expect(result[PROP_CONTENT]).toContain("file1.ts");
      expect(result[PROP_CONTENT]).toContain("file4.ts");

      // Should not include other extensions
      expect(result[PROP_CONTENT]).not.toContain("file2.js");
      expect(result[PROP_CONTENT]).not.toContain("file3.json");
    } finally {
      await cleanupTestDirectory(testDir);
    }
  });

  it("should combine with find flag to only search in files with matching extensions", async () => {
    // Setup test directory with mixed file types, both containing "hello"
    await setupTestDirectory(testDir, {
      "src/test.ts": "console.log('hello world')",
      "src/main.js": "console.log('hello universe')",
      "src/other.js": "console.log('goodbye')",
    });

    try {
      const argv = {
        ...runCli(),
        path: path.join(process.cwd(), testDir),
        extension: [".js"],
        find: ["hello"],
        pipe: true,
        noColor: true,
        noIntro: true,
      } as IngestFlags;

      const result = await ingestDirectory(
        path.join(process.cwd(), testDir),
        argv
      );

      // Should include .js file with "hello"
      expect(result[PROP_CONTENT]).toContain("main.js");
      expect(result[PROP_CONTENT]).toContain("hello universe");

      // Should not include .ts file even though it has "hello"
      expect(result[PROP_CONTENT]).not.toContain("test.ts");
      expect(result[PROP_CONTENT]).not.toContain("hello world");

      // Should not include .js file without "hello"
      expect(result[PROP_CONTENT]).not.toContain("other.js");
      expect(result[PROP_CONTENT]).not.toContain("goodbye");
    } finally {
      await cleanupTestDirectory(testDir);
    }
  });
});
