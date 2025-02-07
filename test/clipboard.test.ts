import { describe, it, expect, vi, beforeEach } from "vitest";
import clipboard from "clipboardy";
import { handleOutput } from "../src/index.js";
import { IngestFlags } from "../src/types.js";

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
      summary: "Test summary",
      treeStr: "Test tree",
      contentStr: "Test content",
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

  it("should not copy to clipboard when -y flag is not used", async () => {
    const digest = {
      summary: "Test summary",
      treeStr: "Test tree",
      contentStr: "Test content",
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
});
