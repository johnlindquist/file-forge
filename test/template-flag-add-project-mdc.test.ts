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

        // Check that the output contains the template instructions and key elements
        expect(stdout).toContain("<instructions>");
        expect(stdout).toContain("Add a \"./cursor/rules/project.mdc\" file");
        expect(stdout).toContain("1. Include a brief description of the project");
        expect(stdout).toContain("2. List and describe key files and their purposes");
        expect(stdout).toContain("3. Outline core features and functionality");
        expect(stdout).toContain("4. Explain main components and their interactions");
        expect(stdout).toContain("5. Describe any relevant development workflows or patterns");
        expect(stdout).toContain("</instructions>");

        // Check for example section
        expect(stdout).toContain("<example>");
        expect(stdout).toContain("</example>");

        // Check for task tags
        expect(stdout).toContain("<task>");
        expect(stdout).toContain("Generate the project.mdc content in a markdown codefence");
        expect(stdout).toContain("</task>");
    });
}); 