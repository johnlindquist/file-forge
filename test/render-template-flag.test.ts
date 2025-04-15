import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";
import { spawn } from 'node:child_process';

// Mock the spawn function to check editor opening
vi.mock('node:child_process', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:child_process')>();
    return {
        ...actual,
        spawn: vi.fn(() => {
            // Mock minimal child process functionality needed
            const mockProcess = {
                unref: vi.fn(),
                on: vi.fn(),
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
            };
            // Immediately call the close event for testing purposes
            setTimeout(() => {
                const closeHandler = mockProcess.on.mock.calls.find(call => call[0] === 'close');
                if (closeHandler && closeHandler[1]) {
                    closeHandler[1](0); // Simulate successful exit
                }
            }, 0);
            return mockProcess as unknown as ReturnType<typeof spawn>;
        }),
        execSync: actual.execSync // Keep original execSync for other parts
    };
});

describe("CLI --render-template", () => {
    beforeEach(() => {
        vi.clearAllMocks(); // Clear mocks before each test
    });

    it("should not perform analysis when rendering", async () => {
        const { stdout, exitCode } = await runCLI([
            "--render-template",
            "worktree",
            "--path", // Include path flag to ensure it's ignored
            "test/fixtures/sample-project"
        ]);

        // Even if rendering doesn't work in test environment, it should still bypass the analysis
        expect(exitCode).toBe(0);

        // Should NOT contain analysis output
        expect(stdout).not.toContain("<summary>");
        expect(stdout).not.toContain("<directoryTree>");
        expect(stdout).not.toContain("<files>");
    }, 30000);
}); 