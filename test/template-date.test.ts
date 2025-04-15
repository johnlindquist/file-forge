// test/template-date.test.ts
import { test, expect, describe } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js"; // Correct path relative to test file

describe("Template Date Injection", () => {
    const dateRegex = /\(\s*Generated on: \d{4}-\d{2}-\d{2}\s*\)/;

    test("should inject the current date into plan templates", async () => {
        // Run ffg with a plan template (e.g., 'plan')
        const { stdout, exitCode } = await runDirectCLI([
            "--path",
            "test/fixtures/sample-project", // Provide a path to avoid path errors
            "--template",
            "plan", // Use one of the plan templates
            "--pipe",
            "--no-token-count"
        ]);

        expect(exitCode).toBe(0);

        // Check for the date string in the output using a regex
        // Matches "(Generated on: YYYY-MM-DD)"
        expect(stdout).toMatch(dateRegex);

        // Optionally, verify it's near the header
        expect(stdout).toContain("# Guide:");
    });

    test("should inject the date into non-plan templates (e.g., explain)", async () => {
        // Run ffg with a non-plan template (e.g., 'explain')
        const { stdout, exitCode } = await runDirectCLI([
            "--path",
            "test/fixtures/sample-project/hello.js", // Target a specific file
            "--template",
            "explain", // Use a non-plan template
            "--pipe",
            "--no-token-count"
        ]);

        expect(exitCode).toBe(0);

        // Check that the date string IS present
        expect(stdout).toMatch(dateRegex);
    });
}); 