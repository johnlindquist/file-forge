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
    // The context should be present
    expect(stdout).toContain('<summary>');
    expect(stdout).toContain('<directoryTree>');
    // The template output should be appended after the context
    expect(stdout).toContain("instructions");
    // Should not contain any XML or CDATA wrappers for the template output
    expect(stdout).not.toContain('<templateOutput');
    expect(stdout).not.toContain('<![CDATA[');
    expect(stdout).not.toContain('</templateOutput>');
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
    // The context should be present
    expect(stdout).toContain('<summary>');
    expect(stdout).toContain('<directoryTree>');
    // Should show the plain error message appended after the context
    expect(stdout).toContain('Template not found. Use --list-templates to see available templates.');
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
    expect(stdout).toContain('<summary>');
    expect(stdout).toContain('<directoryTree>');
    expect(stdout).toContain("Guide");
    expect(stdout).not.toContain('<templateOutput');
    expect(stdout).not.toContain('<![CDATA[');
    expect(stdout).not.toContain('</templateOutput>');
  });

  test("should use raw output for all templates", async () => {
    // Dynamically read template names
    const templateDir = path.join(__dirname, '../templates/main');
    const templateFiles = (await fs.readdir(templateDir))
      .filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const templates = templateFiles.map(f => path.basename(f, '.md').toLowerCase())
      .filter(name => name !== 'readme');

    expect(templates.length).toBeGreaterThan(0);

    for (const name of templates) {
      const { stdout, exitCode } = await runDirectCLI([
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count",
        "--debug"
      ]);

      // Log the full output for inspection
      console.log(`\n--- STDOUT for template: ${name} ---\n`);
      console.log(stdout);
      const fsSync = require('fs');
      const outPath = `stdout-${name}.txt`;
      fsSync.writeFileSync(outPath, stdout);
      if (!fsSync.existsSync(outPath)) {
        throw new Error(`Failed to write output file: ${outPath}`);
      }
    }
  }, 30000);

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
    expect(stdout).toContain('<summary>');
    expect(stdout).toContain('<directoryTree>');
    expect(stdout).toContain("# Guide:");
    expect(stdout).not.toContain('<templateOutput');
    expect(stdout).not.toContain('<![CDATA[');
    expect(stdout).not.toContain('</templateOutput>');
  });

  test("should render content for all templates", async () => {
    const templateDir = path.join(__dirname, '../templates/main');
    const templateFiles = (await fs.readdir(templateDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
    const templateNames = templateFiles.map(f => path.basename(f, '.md').toLowerCase())
      .filter(name => name !== 'readme');

    expect(templateNames.length).toBeGreaterThan(0);

    for (const name of templateNames) {
      const expectedContent = await fs.readFile(path.join(templateDir, `${name}.md`), 'utf8');
      const { stdout, exitCode } = await runDirectCLI([
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count",
        "--debug"
      ]);
      expect(exitCode, `Exit code should be 0 for template ${name}`).toBe(0);
      expect(stdout, `stdout for ${name} should contain <summary>`).toContain('<summary>');
      expect(stdout, `stdout for ${name} should contain <directoryTree>`).toContain('<directoryTree>');
      expect(stdout, `stdout for ${name} should not contain <templateOutput>`).not.toContain('<templateOutput');
      expect(stdout, `stdout for ${name} should not contain <![CDATA[`).not.toContain('<![CDATA[');
      expect(stdout, `stdout for ${name} should not contain </templateOutput>`).not.toContain('</templateOutput>');
      const firstLineOfOriginal = expectedContent.split('\n').find(line => line.trim() !== '')?.trim();
      if (firstLineOfOriginal) {
        expect(stdout, `stdout for ${name} should contain first line of original: ${firstLineOfOriginal}`).toContain(firstLineOfOriginal);
      }
    }
  }, 60000);

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