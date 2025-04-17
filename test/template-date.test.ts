// test/template-date.test.ts
import { test, expect, describe } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js"; // Correct path relative to test file

describe("Template Date Injection", () => {
    // Regex for the format in _header.md: (YYYY-MM-DD)
    const headerDateRegex = /\(\d{4}-\d{2}-\d{2}\)/;
    // Regex for the format in explain.md: **(Generated: YYYY-MM-DD)**
    const generatedDateRegex = /\*\*\(Generated: \d{4}-\d{2}-\d{2}\)\*\*/;

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

        // Check for the date string in the output using the updated regex
        expect(stdout).toMatch(headerDateRegex);

        // Optionally, verify it's near the header (Adjust if needed)
        // expect(stdout).toContain("# Guide:"); // Keep or remove based on desired strictness
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

        // Check that the date string IS present using the generated date regex
        expect(stdout).toMatch(generatedDateRegex);
    });
}); 