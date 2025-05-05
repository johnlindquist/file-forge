// test/template-flag.test.ts
// This test has been optimized to use direct function calls instead of process spawning
import { test, expect, describe } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js";
import fs from 'node:fs/promises';
import path from 'node:path';

describe("CLI --template", () => {
  test("should list available templates with --list-templates", async () => {
    const { stdout, exitCode } = await runDirectCLI(["--list-templates"]);

    expect(exitCode).toBe(0);

    // Check for the general header
    expect(stdout).toContain("Available prompt templates");

    // Check for specific categories (case-insensitive check for robustness)
    expect(stdout.toLowerCase()).toMatch(/documentation|refactoring|generation/i);

    // Check for at least some of these known template names
    const knownTemplates = ["explain", "refactor", "plan", "test", "document"];
    const foundTemplates = knownTemplates.filter(template =>
      stdout.includes(`${template}:`)
    );

    // There should be at least one template found
    expect(foundTemplates.length).toBeGreaterThan(0);

    // Check for usage message
    expect(stdout).toContain("Use --template");
  });

  test("should apply a template to the output", async () => {
    const { stdout, exitCode } = await runDirectCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "explain",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // Check that the template output IS wrapped in XML tags when piped
    expect(stdout).toContain('<templateOutput name="explain">');
    expect(stdout).toContain('<![CDATA[');
    expect(stdout).toContain(']]>');
    expect(stdout).toContain('</templateOutput>');

    // The template should include some content like instructions
    expect(stdout).toContain("instructions");
  });

  test("should show an error for an invalid template", async () => {
    const { stdout, exitCode } = await runDirectCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "non-existent-template",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // Check for error message wrapped in the templateOutput tag
    expect(stdout).toContain('<templateOutput name="non-existent-template">');
    expect(stdout).toContain('<error>Template not found. Use --list-templates to see available templates.</error>');
    expect(stdout).toContain('</templateOutput>');
  });

  test("should apply plan template with instruction and task tags", async () => {
    const { stdout, exitCode } = await runDirectCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "plan",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // Check for XML wrapper tags
    expect(stdout).toContain('<templateOutput name="plan">');
    expect(stdout).toContain('<![CDATA[');
    expect(stdout).toContain(']]>');
    expect(stdout).toContain('</templateOutput>');

    // The template should include content
    expect(stdout).toContain("Guide");
  });

  test("should use XML wrapper tags for all templates", async () => {
    // Dynamically read template names
    const templateDir = path.join(__dirname, '../templates/main');
    const templateFiles = (await fs.readdir(templateDir))
      .filter(f => f.endsWith('.md') && !f.startsWith('_')); // Exclude partials
    const templates = templateFiles.map(f => path.basename(f, '.md').toLowerCase())
      .filter(name => name !== 'readme'); // Exclude readme

    expect(templates.length).toBeGreaterThan(0); // Ensure we found some templates

    // Removed Promise.all - process sequentially
    for (const name of templates) { // Iterate over dynamic list
      // console.log(`[TEST_DEBUG] Running test for template: ${name}`); // Optional debug logging
      const { stdout, exitCode } = await runDirectCLI([ // Await individually
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count"
      ]);

      // console.log(`[TEST_DEBUG] Exit code for ${name}: ${exitCode}`); // Optional debug logging
      // console.log(`[TEST_DEBUG] Stdout for ${name} (first 300 chars): ${stdout.slice(0, 300)}`); // Optional debug logging

      expect(exitCode, `Exit code should be 0 for template ${name}`).toBe(0);
      // Expect XML wrapper tags for the specific template being tested
      expect(stdout, `stdout for ${name} should contain <templateOutput name="${name}">`).toContain(`<templateOutput name="${name}">`);
      expect(stdout, `stdout for ${name} should contain <![CDATA[`).toContain('<![CDATA[');
      expect(stdout, `stdout for ${name} should contain ]]>`).toContain(']]>');
      expect(stdout, `stdout for ${name} should contain </templateOutput>`).toContain('</templateOutput>'); // Use single quotes
    }
  }, 30000); // Increased timeout for sequential runs

  test("should render correct content for plan template", async () => {
    const { stdout, exitCode } = await runDirectCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "plan",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    // Check for XML wrapper tags
    expect(stdout).toContain('<templateOutput name="plan">');
    expect(stdout).toContain('<![CDATA[');
    expect(stdout).toContain(']]>');
    expect(stdout).toContain('</templateOutput>');

    // The plan template should contain some common content even after processing
    expect(stdout).toContain("# Guide:");
  });

  test("should render content for all templates", async () => {
    // Dynamically read template names and their content
    const templateDir = path.join(__dirname, '../templates/main');
    const templateFiles = (await fs.readdir(templateDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const templateNames = templateFiles.map(f => path.basename(f, '.md').toLowerCase())
      .filter(name => name !== 'readme'); // Exclude readme

    expect(templateNames.length).toBeGreaterThan(0); // Ensure we found some templates

    // Removed Promise.all - process sequentially
    for (const name of templateNames) { // Iterate over dynamic list
      // Read content only when needed
      const expectedContent = await fs.readFile(path.join(templateDir, `${name}.md`), 'utf8');

      // console.log(`[TEST_DEBUG] Running render test for template: ${name}`); // Optional debug logging

      const { stdout, exitCode } = await runDirectCLI([ // Await individually
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count",
        "--verbose", // Keep verbose to get content
      ]);

      // console.log(`[TEST_DEBUG] Render exit code for ${name}: ${exitCode}`); // Optional debug logging
      // console.log(`[TEST_DEBUG] Render stdout for ${name} (first 300 chars): ${stdout.slice(0, 300)}`); // Optional debug logging

      expect(exitCode, `Exit code should be 0 for template ${name}`).toBe(0);

      // Check for XML wrapper tags
      expect(stdout, `stdout for ${name} should contain <templateOutput name="${name}">`).toContain(`<templateOutput name="${name}">`);
      expect(stdout, `stdout for ${name} should contain <![CDATA[`).toContain('<![CDATA[');
      expect(stdout, `stdout for ${name} should contain ]]>`).toContain(']]>');
      expect(stdout, `stdout for ${name} should contain </templateOutput>`).toContain('</templateOutput>'); // Use single quotes

      // Check that *some* content exists within the CDATA section
      // Corrected Regex: Match <templateOutput name="<name>">, then CDATA, then </templateOutput>
      const cdataRegex = new RegExp(`<templateOutput name="${name}">\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/templateOutput>`, 's');
      const cdataMatch = stdout.match(cdataRegex);

      expect(cdataMatch, `CDATA section not found for template ${name}`).toBeTruthy();
      // Use optional chaining for safety
      const cdataContent = cdataMatch?.[1]?.trim();
      expect(cdataContent, `CDATA content should not be empty for template ${name}`).not.toBe("");

      if (cdataContent) { // Check if cdataContent is truthy before proceeding
        // More specific check: ensure *some* part of the original template content exists
        // Taking the first non-empty line of the original template
        const firstLineOfOriginal = expectedContent.split('\n').find(line => line.trim() !== '')?.trim();
        if (firstLineOfOriginal) {
          // Escape potential regex special characters in the first line before using it in toContain
          const escapedFirstLine = firstLineOfOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expect(cdataContent, `CDATA for ${name} should contain first line of original: ${firstLineOfOriginal}`).toContain(escapedFirstLine);
        } else {
          // Handle cases where original template might be empty or only whitespace
          console.warn(`[TEST_DEBUG] Template ${name} original content seems empty or whitespace-only.`);
        }
      } else {
        // Log if CDATA match failed or content was empty unexpectedly
        console.warn(`[TEST_DEBUG] CDATA regex failed or content empty for template ${name}. Stdout (first 500): ${stdout.slice(0, 500)}`);
      }
    }
  }, 60000); // Increased timeout for sequential runs

  test("LiquidJS engine should remove comments", async () => {
    // Dynamically import applyTemplate only within this test
    const { applyTemplate } = await import('../src/templates.js');

    // Only include the content that applyTemplate will actually render
    const templateContentWithComment = `
        Inside template tag.
        {% comment %} Another comment {% endcomment %}
        Still inside.
    `;
    // const expectedOutput = `
    //   This is before the comment.
    //   
    //   This is after the comment.
    //   
    //     Inside template tag.
    //     
    //     Still inside.
    //   
    // `;\

    // Use the same function ffg uses internally to process templates
    const renderedOutput = await applyTemplate(templateContentWithComment, ''); // Pass empty code context

    // Assert that the comments are NOT present
    expect(renderedOutput).not.toContain("{% comment %}");
    expect(renderedOutput).not.toContain("{% endcomment %}");
    expect(renderedOutput).not.toContain("This is a Liquid comment");
    expect(renderedOutput).not.toContain("Another comment");

    // Assert that the surrounding text IS present (approximate check)
    // Remove assertions for text outside the original <template> tags
    expect(renderedOutput).toContain("Inside template tag.");
    expect(renderedOutput).toContain("Still inside."); // Add assertion for the other line inside
  });
});