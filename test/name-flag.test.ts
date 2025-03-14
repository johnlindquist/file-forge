import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli.js";
import { ingestDirectory } from "../src/ingest.js";
import { join } from "path";
import { buildOutput } from "../src/outputFormatter.js";
import { format } from "date-fns";

describe("name flag", () => {
  it("should use custom name in header and wrap output in XML tags", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      name: "EXAMPLE_PROJECT",
      pipe: false,
      test: true,
    };

    const digest = await ingestDirectory(flags._[0] as string, flags);
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const output = buildOutput(digest, flags._[0] as string, timestamp, flags);

    // Check that the name is used in the header
    expect(output).toContain("# EXAMPLE_PROJECT");

    // Check that the content is wrapped in XML tags
    expect(output).toMatch(/^<EXAMPLE_PROJECT>\n/);
    expect(output).toMatch(/\n<\/EXAMPLE_PROJECT>$/);
  });

  it("should use custom name in header but not wrap output when piping", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      name: "EXAMPLE_PROJECT",
      pipe: true,
      test: true,
    };

    const digest = await ingestDirectory(flags._[0] as string, flags);
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const output = buildOutput(digest, flags._[0] as string, timestamp, flags);

    // Check that the name is used in the header
    expect(output).toContain("# EXAMPLE_PROJECT");

    // Check that the content is NOT wrapped in XML tags
    expect(output).not.toMatch(/^<EXAMPLE_PROJECT>\n/);
    expect(output).not.toMatch(/\n<\/EXAMPLE_PROJECT>$/);
  });

  it("should use default header and no XML tags when name is not provided", async () => {
    const flags = {
      ...runCli(),
      _: [join(__dirname, "fixtures/sample-project")],
      pipe: false,
      test: true,
    };

    const digest = await ingestDirectory(flags._[0] as string, flags);
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const output = buildOutput(digest, flags._[0] as string, timestamp, flags);

    // Check that the default header is used
    expect(output).toContain("# File Forge Analysis");

    // Check that the content is NOT wrapped in XML tags
    expect(output).not.toMatch(/^<[A-Z_]+>\n/);
    expect(output).not.toMatch(/\n<\/[A-Z_]+>$/);
  });
});
