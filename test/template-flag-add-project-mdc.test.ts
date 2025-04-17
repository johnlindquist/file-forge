// test/template-flag-add-project-mdc.test.ts
import { test, expect, describe } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --template project", () => {
    test("should apply project template with correct instructions", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            "--template",
            "project",
            "--pipe",
            "--no-token-count"
        ]);

        expect(exitCode).toBe(0);

        // Check that the output contains the updated template instructions
        expect(stdout).toContain("<instructions>");
        // Updated assertion for the primary instruction
        expect(stdout).toContain("Create \"./cursor/rules/project.mdc\" file following the style/structure");
        // Keep other checks if they are still relevant based on the new template content
        expect(stdout).toContain("Include: Brief project desc, key files/purpose");
        expect(stdout).toContain("</instructions>");

        // Check for example section
        expect(stdout).toContain("<example>");
        expect(stdout).toContain("</example>");

        // Check for updated task tags
        expect(stdout).toContain("<task>");
        // Updated assertion for the task content
        expect(stdout).toContain("Generate project.mdc content in markdown codefence:");
        expect(stdout).toContain("</task>");
    });
}); 