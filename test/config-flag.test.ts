// test/config-flag.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";

// Mock dependencies
vi.mock("open", () => ({
    default: vi.fn().mockResolvedValue(undefined),
}));

import open from 'open';

describe("CLI --config flag", () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Reset mocks before each test
    });

    it("should attempt to open the config file path when --config is used", async () => {
        const { stdout, stderr, exitCode } = await runCLI(["--config"]);

        expect(exitCode).toBe(0);
        expect(stderr).toBe(''); // No errors expected

        // Check for a valid config path in the output
        expect(stdout).toContain("Opening configuration file:");
        expect(stdout).toContain("config.json");

        // In test environment, it should log WOULD_OPEN_CONFIG_FILE
        expect(stdout).toContain("WOULD_OPEN_CONFIG_FILE:");

        // Verify that open is not called in test mode
        expect(open).not.toHaveBeenCalled();
    });

    it("should exit normally and not run analysis when --config is used", async () => {
        const { stdout, exitCode } = await runCLI([
            "--config",
            "--path", // Add other flags that would normally trigger analysis
            "test/fixtures/sample-project"
        ]);
        expect(exitCode).toBe(0);
        // Ensure analysis output (like summary, tree) is NOT present
        expect(stdout).not.toContain("<summary>");
        expect(stdout).not.toContain("<directoryTree>");
        expect(stdout).toContain("Opening configuration file:"); // Should still show config opening message
    });
}); 