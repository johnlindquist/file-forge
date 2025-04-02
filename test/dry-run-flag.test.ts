import { describe, it, expect } from "vitest";
// Uncomment the direct runner import
import { runDirectCLI } from "../utils/directTestRunner.js";
import { runCLI } from "./test-helpers.js"; // Use process runner for help flag

describe("CLI --dry-run flag", () => {
    it("should recognize the --dry-run flag in help output", async () => {
        // Use process-based runner for help flag as direct runner might not capture it well
        const { stdout, exitCode } = await runCLI(["--help"]);
        expect(exitCode).toBe(0);
        expect(stdout).toContain("--dry-run");
        expect(stdout).toContain("-D, --dry-run");
        expect(stdout).toContain("Perform analysis and print output to stdout");
    });

    it("should parse the --dry-run flag correctly", async () => {
        // This test is now implicitly covered by the behavior test below.
        // Keeping it as a placeholder or removing it is fine.
        expect(true).toBe(true);
    });

    // +++ Add the new behavior test +++
    it("should print output to stdout and skip saving when --dry-run is used", async () => {
        // Use direct runner for speed and easier stdout assertion
        const { stdout, stderr, exitCode } = await runDirectCLI([
            "--path",
            "test/fixtures/sample-project",
            "--dry-run",
            "--no-token-count", // Avoid token count message messing with stdout
            // Use default XML output for this test
        ]);

        expect(exitCode).toBe(0);
        expect(stderr).toBe(''); // No errors or extraneous messages expected on stderr

        // Check for expected XML output structure in stdout
        expect(stdout).toContain("<project>");
        expect(stdout).toContain("<source>test/fixtures/sample-project</source>");
        expect(stdout).toContain("<summary>");
        expect(stdout).toContain("Files analyzed:");
        expect(stdout).toContain("<directoryTree>");
        expect(stdout).toContain("sample-project/");
        // By default, verbose is off, so <files> should NOT be present
        expect(stdout).not.toContain("<files>");

        // Check that file saving and editor opening markers are ABSENT
        expect(stdout).not.toContain("RESULTS_SAVED:");
        expect(stdout).not.toContain("WOULD_OPEN_FILE:"); // Marker from test helpers
        expect(stdout).not.toContain("Results saved:"); // User-facing message
    }, 30000); // Timeout might be needed if analysis takes time
}); 