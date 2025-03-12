// test/template-flag.test.ts
import { test, expect, describe } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCLI } from "./test-helpers";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const cliPath = resolve(__dirname, "../dist/index.js");

describe("CLI --template", () => {
  test("should list available templates with --list-templates", async () => {
    const stdout = execSync(`node ${cliPath} --list-templates`).toString();

    // Check that the output contains template categories
    expect(stdout).toContain("Available prompt templates");
    expect(stdout).toContain("Documentation");
    expect(stdout).toContain("Refactoring");
    expect(stdout).toContain("Generation");

    // Check that the output contains specific templates
    expect(stdout).toContain("explain");
    expect(stdout).toContain("document");
    expect(stdout).toContain("refactor");
    expect(stdout).toContain("optimize");
    expect(stdout).toContain("fix");
    expect(stdout).toContain("test");
  });

  test("should apply a template to the output", async () => {
    const { stdout, stderr, exitCode } = await runCLI([
      "--path",
      __dirname,
      "--template",
      "explain",
      "--pipe"
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");

    // Check that the output contains the template
    expect(stdout).toContain("AI Prompt Template");
    expect(stdout).toContain("Using template: explain");
    expect(stdout).toContain("**Goal:** Provide a clear explanation");
    expect(stdout).toContain("**Context:**");
    expect(stdout).toContain("**Instructions:**");
  });

  test("should show an error for an invalid template", async () => {
    const { stdout, stderr, exitCode } = await runCLI([
      "--path",
      __dirname,
      "--template",
      "nonexistent-template",
      "--pipe"
    ]);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");

    // Check that the output contains an error message
    expect(stdout).toContain("Template Error");
    expect(stdout).toContain("Template \"nonexistent-template\" not found");
  });
});