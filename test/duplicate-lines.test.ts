import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("duplicate lines", () => {
  it("should not have duplicate markdown headers at the same level when using --markdown", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Extract all markdown headers from the output
    const allHeaders = stdout.match(/^#{1,2}\s.+$/gm) || [];

    // We'll only check h1 and h2 level headers, ignoring any headers in file content
    // Create a map to count how many times each header appears in the same output section
    const headerCounts = {};
    let currentSection = "";

    for (const header of allHeaders) {
      if (header.startsWith("# ")) {
        currentSection = "main";
      } else if (header.startsWith("## ")) {
        // Only count duplicate h2 headers within the same section
        const key = `${currentSection}:${header}`;
        headerCounts[key] = (headerCounts[key] || 0) + 1;
      }
    }

    // Check if any header appears more than once in the same section
    const duplicateHeaders = Object.entries(headerCounts)
      .filter(([, count]) => count > 1)
      .map(([header]) => header.split(":")[1]);

    expect(duplicateHeaders).toEqual([]);
  });

  it("should properly handle XML tags in default output", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // For self-closing tags like <file path="..." .../>
    const selfClosingTags = (stdout.match(/<([a-zA-Z]+)[^>]*\/>/g) || [])
      .map(tag => tag.match(/<([a-zA-Z]+)/)?.[1])
      .filter(Boolean);

    // For regular opening and closing tags
    const openingTags = (stdout.match(/<([a-zA-Z]+)(?![^>]*\/>)[^>]*>/g) || [])
      .map(tag => tag.match(/<([a-zA-Z]+)/)?.[1])
      .filter(Boolean);

    const closingTags = (stdout.match(/<\/([a-zA-Z]+)>/g) || [])
      .map(tag => tag.match(/<\/([a-zA-Z]+)>/)?.[1])
      .filter(Boolean);

    // Count tags, accounting for self-closing tags that don't need a closing tag
    const tagCounts = {};

    // Self-closing tags don't need a matching closing tag
    selfClosingTags.forEach(tag => {
      if (tag) tagCounts[tag] = (tagCounts[tag] || 0);
    });

    openingTags.forEach(tag => {
      if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    closingTags.forEach(tag => {
      if (tag) tagCounts[tag] = (tagCounts[tag] || 0) - 1;
    });

    // Any tag with non-zero count is potentially unbalanced
    const unbalancedTags = Object.entries(tagCounts)
      .filter(([, count]) => count !== 0)
      .map(([tag]) => tag);

    // We expect properly balanced XML (empty array means all balanced)
    expect(unbalancedTags).toEqual([]);
  });

  it("should always include file contents in the markdown output file", async () => {
    // Run FFG against a simple test project
    const { stdout: output, exitCode } = await runCLI([
      "--path",
      "test/fixtures/test-project",
      "--markdown",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Verify file contents section exists and has content
    expect(output).toContain("## Files Content");
    expect(output).toContain("```");
    expect(output).toContain("console.log('test1')");
    expect(output).toContain("console.log('test2')");
  });

  it("should always include file contents in the XML output file", async () => {
    // Run FFG against a simple test project
    const { stdout: output, exitCode } = await runCLI([
      "--path",
      "test/fixtures/test-project",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Verify file contents section exists and has content
    expect(output).toContain("<files>");
    expect(output).toContain("<file");
    expect(output).toContain("console.log('test1')");
    expect(output).toContain("console.log('test2')");
  });
});
