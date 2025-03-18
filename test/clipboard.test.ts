import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleOutput } from "../src/index.js";
import { IngestFlags } from "../src/types.js";
import { PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "../src/constants.js";
import { getTestTempFilePath } from "./test-helpers.js";
import { runCLI } from "./test-helpers.js";

// Mock the clipboardy module - this is hoisted to the top of the file
vi.mock("clipboardy", () => ({
  default: {
    writeSync: vi.fn(),
  },
}));

// Import clipboardy after mocking
import clipboard from "clipboardy";

describe("clipboard flag", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should copy output to clipboard when -y flag is used", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "Test content",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = getTestTempFilePath("result.md");
    const argv = {
      clipboard: true,
      pipe: true,
      test: true,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).toHaveBeenCalledTimes(1);
  });

  it("should copy content when name flag is used", async () => {
    const { exitCode, stdout } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--name",
      "MY_PROJECT",
      "--clipboard",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("✨ Copied to clipboard");
  });

  it("should not copy to clipboard when -y flag is not used", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "Test content",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = getTestTempFilePath("result.md");
    const argv = {
      pipe: true,
      test: true,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).not.toHaveBeenCalled();
  });

  it("should copy file output without verbose flag", async () => {
    const { exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--clipboard",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
  });
});
