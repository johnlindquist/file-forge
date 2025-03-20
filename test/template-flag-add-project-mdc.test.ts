// test/template-flag-add-project-mdc.test.ts
import { test, expect, describe } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --template add-project-mdc", () => {
    test("should apply add-project-mdc template with correct instructions", async () => {
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
        expect(stdout).toContain("<example>");
        expect(stdout).toContain("# GHX - GitHub Code Search CLI");
        expect(stdout).toContain("## Key Files");
        expect(stdout).toContain("## Core Features");
        expect(stdout).toContain("## Main Components");
        expect(stdout).toContain("## Development Workflow");
        expect(stdout).toContain("</example>");
        expect(stdout).toContain("</instructions>");
    });
}); 