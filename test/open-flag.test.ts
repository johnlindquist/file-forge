// test/open-flag.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";

// Mock the 'open' package - we're not checking the mock directly, 
// but mocking it prevents actual file opens during tests
vi.mock("open", () => ({
    default: vi.fn().mockResolvedValue(undefined), // Mock the default export
}));

describe("CLI --open flag", () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Reset mocks before each test
    });

    it("should attempt to open the results file in editor when --open is used", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            "--open", // Use the flag without a value
            "--no-token-count",
        ]);

        expect(exitCode).toBe(0);
        // Look for content that actually appears in the output
        expect(stdout).toContain("<project>");
        expect(stdout).toContain("<source>test/fixtures/sample-project</source>");

        // Check for the WOULD_OPEN_FILE marker that indicates the file would be opened
        expect(stdout).toContain("WOULD_OPEN_FILE:");
        // Should not have WITH_COMMAND when no command is specified
        expect(stdout).not.toContain("WITH_COMMAND:");
    });

    it("should attempt to open with specific editor command when passed to --open", async () => {
        const editorCmd = "code-insiders";
        const { stdout, exitCode } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            `--open=${editorCmd}`, // Pass command like this
            "--no-token-count",
        ]);

        expect(exitCode).toBe(0);
        // Check for marker indicating specific command was used
        expect(stdout).toContain(`WOULD_OPEN_FILE:`);
        expect(stdout).toContain(`WITH_COMMAND: ${editorCmd}`);
    });

    it("should NOT open the editor when --pipe is used", async () => {
        const { stdout } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            "--open",
            "--pipe", // Conflicting flag
            "--no-token-count",
        ]);

        // Verify that WOULD_OPEN_FILE is NOT in the output
        expect(stdout).not.toContain("WOULD_OPEN_FILE:");
    });

    it("should NOT open the editor by default (without --open)", async () => {
        const { stdout } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            // No --open flag
            "--no-token-count",
        ]);

        // Verify that WOULD_OPEN_FILE is NOT in the output
        expect(stdout).not.toContain("WOULD_OPEN_FILE:");
    });

    // Add a test case combining --open and --clipboard
    it("should open the editor AND copy to clipboard when --open and --clipboard are used", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            "test/fixtures/sample-project",
            "--open",
            "--clipboard", // Combine flags
            "--no-token-count",
        ]);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("✨ Copied to clipboard");

        // Check for the WOULD_OPEN_FILE marker
        expect(stdout).toContain("WOULD_OPEN_FILE:");
    });
}); 