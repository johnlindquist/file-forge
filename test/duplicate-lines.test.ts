import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers.js";

describe("duplicate lines", () => {
  it("should validate markdown format and XML tag balance", async () => {
    // Run first two tests in parallel
    const [markdownResult, xmlResult] = await Promise.all([
      // Test 1: Check for duplicate markdown headers
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--markdown",
        "--no-token-count"
      ]),

      // Test 2: Check for properly balanced XML tags
      runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--no-token-count"
      ])
    ]);

    // Test 1: Validate markdown headers
    expect(markdownResult.exitCode).toBe(0);

    // Extract all markdown headers from the output
    const allHeaders = markdownResult.stdout.match(/^#{1,2}\s.+$/gm) || [];

    // We'll only check h1 and h2 level headers, ignoring any headers in file content
    // Create a map to count how many times each header appears in the same output section
    const headerCounts: Record<string, number> = {};
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

    // Test 2: Validate XML tag balance
    expect(xmlResult.exitCode).toBe(0);

    // For self-closing tags like <file path="..." .../>
    const selfClosingTags = (xmlResult.stdout.match(/<([a-zA-Z]+)[^>]*\/>/g) || [])
      .map(tag => tag.match(/<([a-zA-Z]+)/)?.[1])
      .filter(Boolean);

    // For regular opening and closing tags
    const openingTags = (xmlResult.stdout.match(/<([a-zA-Z]+)(?![^>]*\/>)[^>]*>/g) || [])
      .map(tag => tag.match(/<([a-zA-Z]+)/)?.[1])
      .filter(Boolean);

    const closingTags = (xmlResult.stdout.match(/<\/([a-zA-Z]+)>/g) || [])
      .map(tag => tag.match(/<\/([a-zA-Z]+)>/)?.[1])
      .filter(Boolean);

    // Count tags, accounting for self-closing tags that don't need a closing tag
    const tagCounts: Record<string, number> = {};

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

  it("should include file contents in both markdown and XML output", async () => {
    // Run tests for file content inclusion in parallel
    const [markdownResult, xmlResult] = await Promise.all([
      // Test for markdown output file
      runCLI([
        "--path",
        "test/fixtures/test-project",
        "--markdown",
        "--no-token-count"
      ]),

      // Test for XML output file
      runCLI([
        "--path",
        "test/fixtures/test-project",
        "--no-token-count"
      ])
    ]);

    // Check markdown output
    expect(markdownResult.exitCode).toBe(0);
    expect(markdownResult.stdout).toContain("## Files Content");
    expect(markdownResult.stdout).toContain("```");
    expect(markdownResult.stdout).toContain("console.log('test1')");
    expect(markdownResult.stdout).toContain("console.log('test2')");

    // Check XML output
    expect(xmlResult.exitCode).toBe(0);
    expect(xmlResult.stdout).toContain("<files>");
    expect(xmlResult.stdout).toContain("<file");
    expect(xmlResult.stdout).toContain("console.log(&apos;test1&apos;)");
    expect(xmlResult.stdout).toContain("console.log(&apos;test2&apos;)");
  });
});
