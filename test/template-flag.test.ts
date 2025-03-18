// test/template-flag.test.ts
import { test, expect, describe } from "vitest";
import { runCLI } from "./test-helpers";


describe("CLI --template", () => {
  test("should list available templates with --list-templates", async () => {
    const { stdout, exitCode } = await runCLI(["--list-templates"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Available prompt templates");
    expect(stdout).toContain("explain");
    expect(stdout).toContain("refactor");
    expect(stdout).toContain("document");
    expect(stdout).toContain("optimize");
    expect(stdout).toContain("test");
    expect(stdout).toContain("fix");
    expect(stdout).toContain("plan");
  });

  test("should apply a template to the output", async () => {
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "explain",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);

    // We're not checking stderr for token counting errors since we've disabled it

    // Check that the output contains the template instructions in XML format
    expect(stdout).toContain("<instructions>");
    expect(stdout).toContain("Describe what the code does and how it works");
    expect(stdout).toContain("</instructions>");
  });

  test("should show an error for an invalid template", async () => {
    const { stdout, exitCode } = await runCLI([
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
    const { stdout, exitCode } = await runCLI([
      "--path",
      "test/fixtures/sample-project",
      "--template",
      "plan",
      "--pipe",
      "--no-token-count"
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("<instructions>");
    expect(stdout).toContain("Using the provided codebase");
    expect(stdout).toContain("</instructions>");
    expect(stdout).toContain("<task>");
    expect(stdout).toContain("</task>");
  });

  test("should use <instructions> tags in all templates", async () => {
    const templates = [
      "document",
      "refactor",
      "optimize",
      "fix",
      "test"
    ];

    for (const name of templates) {
      const { stdout, exitCode } = await runCLI([
        "--path",
        "test/fixtures/sample-project",
        "--template",
        name,
        "--pipe",
        "--no-token-count"
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain("<instructions>");
      expect(stdout).toContain("</instructions>");
    }
  }, 30000);
});