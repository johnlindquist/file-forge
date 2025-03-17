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

    // Check that the output contains the template
    expect(stdout).toContain("AI Prompt Template");
    expect(stdout).toContain("Using template: explain");
    expect(stdout).toContain("**Goal:** Provide a clear explanation of the following code's functionality and purpose.");
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
    expect(stdout).toContain("Template Error");
    expect(stdout).toContain("Template \"non-existent-template\" not found");
    expect(stdout).toContain("Use --list-templates to see available templates");
  });
});