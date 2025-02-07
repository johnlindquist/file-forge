import { describe, it, expect, vi, beforeEach } from "vitest";
import clipboard from "clipboardy";
import { handleOutput } from "../src/index.js";
import { IngestFlags } from "../src/types.js";
import { PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "../src/constants.js";

vi.mock("clipboardy", () => ({
  default: {
    writeSync: vi.fn(),
  },
}));

describe("clipboard flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should copy output to clipboard when -y flag is used", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "Test content",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = "test-result.md";
    const argv = {
      clipboard: true,
      pipe: true,
      test: true,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).toHaveBeenCalledTimes(1);
    expect(clipboard.writeSync).toHaveBeenCalledWith(
      expect.stringContaining("Test summary")
    );
  });

  it("should copy XML-wrapped content when name flag is used", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "<MY_PROJECT>\nTest content\n</MY_PROJECT>",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = "test-result.md";
    const argv = {
      clipboard: true,
      name: "MY_PROJECT",
      test: true,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).toHaveBeenCalledTimes(1);
    expect(clipboard.writeSync).toHaveBeenCalledWith(
      expect.stringContaining("<MY_PROJECT>")
    );
    expect(clipboard.writeSync).toHaveBeenCalledWith(
      expect.stringContaining("</MY_PROJECT>")
    );
  });

  it("should not copy to clipboard when -y flag is not used", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "Test content",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = "test-result.md";
    const argv = {
      pipe: true,
      test: true,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).not.toHaveBeenCalled();
  });

  it("should copy complete file output to clipboard even without verbose flag", async () => {
    const digest = {
      [PROP_SUMMARY]: "Test summary",
      [PROP_TREE]: "Test tree",
      [PROP_CONTENT]: "Test content",
    };

    const source = "test/fixtures/sample-project";
    const resultFilePath = "test-result.md";
    const argv = {
      clipboard: true,
      pipe: true,
      test: true,
      verbose: false,
    } as IngestFlags;

    await handleOutput(digest, source, resultFilePath, argv);

    expect(clipboard.writeSync).toHaveBeenCalledTimes(1);

    const clipboardContent = vi.mocked(clipboard.writeSync).mock.calls[0][0];

    expect(clipboardContent).toContain("Test summary");
    expect(clipboardContent).toContain("Test tree");
    expect(clipboardContent).toContain("Test content");
    expect(clipboardContent).toContain("## Files Content");
  });
});
