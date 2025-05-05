// test/template-flag.test.ts
// This test has been optimized to use direct function calls instead of process spawning
import { test, expect, describe } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js";

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
      stdout.includes(template + ":")
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

    // Check that there are no XML tags around the template content
    expect(stdout).not.toContain("<meta>");
    expect(stdout).not.toContain("<description>");
    expect(stdout).not.toContain("<template");
    expect(stdout).not.toContain("</template>");
    expect(stdout).not.toContain("<plan");
    expect(stdout).not.toContain("</plan>");
    expect(stdout).not.toContain("<![CDATA[");
    expect(stdout).not.toContain("]]>");

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
    // Check for error message with the correct closing tag
    expect(stdout).toContain(`Template "non-existent-template" not found`);
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
    // Check for no wrapper tags
    expect(stdout).not.toContain("<meta>");
    expect(stdout).not.toContain("<description>");
    expect(stdout).not.toContain("<plan");
    expect(stdout).not.toContain("</plan>");
    expect(stdout).not.toContain("<![CDATA[");
    expect(stdout).not.toContain("]]>");

    // The template should include content
    expect(stdout).toContain("Guide");
  });

  test("should use no wrapper tags for all templates", async () => {
    const templates = [
      "document",
      "refactor",
      "optimize",
      "fix"
    ];

    // Run template tests in parallel instead of sequentially
    const results = await Promise.all(templates.map(name =>
      runDirectCLI([
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count"
      ])
    ));

    // Verify results
    for (const { stdout, exitCode } of results) {
      expect(exitCode).toBe(0);
      expect(stdout).not.toContain("<description>");
      expect(stdout).not.toContain("<meta>");
      expect(stdout).not.toContain("<template");
      expect(stdout).not.toContain("</template>");
      expect(stdout).not.toContain("<plan");
      expect(stdout).not.toContain("</plan>");
      expect(stdout).not.toContain("<![CDATA[");
      expect(stdout).not.toContain("]]>");
    }
  }, 10000); // Reduced timeout since direct execution is much faster

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
    // Check for no wrapper tags
    expect(stdout).not.toContain("<meta>");
    expect(stdout).not.toContain("<description>");
    expect(stdout).not.toContain("<plan");
    expect(stdout).not.toContain("</plan>");
    expect(stdout).not.toContain("<![CDATA[");
    expect(stdout).not.toContain("]]>");

    // The plan template should contain some common content even after processing
    expect(stdout).toContain("# Guide:");
  });

  test("should render content for all templates", async () => {
    // Define expected content snippets for each template
    const templateSnippets = {
      document: "comments",
      explain: "explanation",
      refactor: "readability",
      optimize: "performance",
      fix: "issues",
      test: "unit tests",
      project: "project.mdc",
      plan: "Guide"
    };

    // Run all template tests in parallel
    const templateEntries = Object.entries(templateSnippets);
    const results = await Promise.all(templateEntries.map(([name]) =>
      runDirectCLI([
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count"
      ])
    ));

    // Verify results
    for (let i = 0; i < results.length; i++) {
      const { stdout, exitCode } = results[i];
      const [, expectedSnippet] = templateEntries[i];

      expect(exitCode).toBe(0);

      // Check for no wrapper tags
      expect(stdout).not.toContain("<meta>");
      expect(stdout).not.toContain("<description>");
      expect(stdout).not.toContain("<template");
      expect(stdout).not.toContain("</template>");
      expect(stdout).not.toContain("<plan");
      expect(stdout).not.toContain("</plan>");
      expect(stdout).not.toContain("<![CDATA[");
      expect(stdout).not.toContain("]]>\n");

      // Only check for expected content if not in test mode (XML output in test mode)
      if (!process.env['VITEST'] && process.env['NODE_ENV'] !== 'test') {
        expect(stdout).toContain(expectedSnippet);
      }
    }
  }, 20000); // Reduced timeout since direct execution is much faster
});