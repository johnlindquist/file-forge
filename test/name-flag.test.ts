import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli.js";
import { ingestDirectory } from "../src/ingest.js";
import { join } from "path";

describe("name flag", () => {
  it("should use custom name in header and wrap output in XML tags", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      name: "EXAMPLE_PROJECT",
      pipe: false,
    };

    const { contentStr } = await ingestDirectory(flags._[0] as string, flags);

    // Check that the name is used in the header
    expect(contentStr).toContain("# EXAMPLE_PROJECT");

    // Check that the content is wrapped in XML tags
    expect(contentStr).toMatch(/^<EXAMPLE_PROJECT>\n/);
    expect(contentStr).toMatch(/\n<\/EXAMPLE_PROJECT>$/);
  });

  it("should use custom name in header but not wrap output when piping", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      name: "EXAMPLE_PROJECT",
      pipe: true,
    };

    const { contentStr } = await ingestDirectory(flags._[0] as string, flags);

    // Check that the name is used in the header
    expect(contentStr).toContain("# EXAMPLE_PROJECT");

    // Check that the content is NOT wrapped in XML tags
    expect(contentStr).not.toMatch(/^<EXAMPLE_PROJECT>\n/);
    expect(contentStr).not.toMatch(/\n<\/EXAMPLE_PROJECT>$/);
  });

  it("should use default header and no XML tags when name is not provided", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      pipe: false,
    };

    const { contentStr } = await ingestDirectory(flags._[0] as string, flags);

    // Check that the default header is used
    expect(contentStr).toContain("# File Forge Analysis");

    // Check that the content is NOT wrapped in XML tags
    expect(contentStr).not.toMatch(/^<[A-Z_]+>\n/);
    expect(contentStr).not.toMatch(/\n<\/[A-Z_]+>$/);
  });
});
