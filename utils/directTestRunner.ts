import { main } from "../src/index";
import { vi } from "vitest";
import clipboard from "clipboardy";

// Mock process.exit to prevent tests from exiting
vi.mock("process", async () => {
    const actual = await vi.importActual<typeof process>("process");
    return {
        ...actual,
        exit: vi.fn((code) => {
            throw new Error(`EXIT_CODE:${code}`);
        })
    };
});

// Cache the original process.argv
const originalArgv = [...process.argv];

/**
 * Directly execute the main function of the CLI with the given arguments.
 * This avoids spawning a new process, making tests run much faster.
 */
export async function runDirectCLI(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    hashedSource: string;
}> {
    // Mock stdout and stderr to capture output
    let stdoutOutput = "";
    let stderrOutput = "";

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
        stdoutOutput += chunk;
        return true;
    });

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
        stderrOutput += chunk;
        return true;
    });

    // Mock console.log and console.error
    const logSpy = vi.spyOn(console, "log").mockImplementation((...messages) => {
        stdoutOutput += messages.join(" ") + "\n";
    });

    const errorSpy = vi.spyOn(console, "error").mockImplementation((...messages) => {
        stderrOutput += messages.join(" ") + "\n";
    });

    // Mock clipboard
    const clipboardSpy = vi.spyOn(clipboard, "writeSync").mockImplementation(() => { });

    // Set environment variables
    const originalEnv = { ...process.env };
    process.env["VITEST"] = "1";
    process.env["NO_COLOR"] = "1";
    process.env["NO_INTRO"] = "1";
    process.env["TEST_MODE"] = "1";

    // Modify process.argv
    process.argv = ["node", "dist/index.js", ...args];

    let exitCode = 0;
    let hashedSource = "";

    try {
        // Try to extract the source from args for hashing
        if (args.length > 0) {
            const sourceArg = args.find(arg =>
                !arg.startsWith('-') ||
                arg === '.' ||
                arg.includes('/') ||
                arg.includes('\\')
            );

            if (sourceArg) {
                const { getHashedSource } = await import("../src/utils.js");
                hashedSource = getHashedSource(String(sourceArg));
            }
        }

        // Run the main function
        exitCode = await main();
    } catch (error: unknown) {
        // Check for our special exit code pattern
        const errorObj = error as { message?: string };
        const exitCodeMatch = errorObj.message?.match?.(/EXIT_CODE:(\d+)/);
        if (exitCodeMatch) {
            exitCode = parseInt(exitCodeMatch[1], 10);
        } else {
            // For other errors, assume failure
            stderrOutput += String(error);
            exitCode = 1;
        }
    } finally {
        // Restore mocks and original state
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
        logSpy.mockRestore();
        errorSpy.mockRestore();
        clipboardSpy.mockRestore();
        process.argv = originalArgv;
        process.env = originalEnv;
    }

    return {
        stdout: stdoutOutput,
        stderr: stderrOutput,
        exitCode,
        hashedSource
    };
} 