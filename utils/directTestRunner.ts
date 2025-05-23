import { main, getLastCliArgsForTest } from "../src/index";
import { vi } from "vitest";
import clipboard from "clipboardy";
import { IngestFlags, FfgConfig } from "../src/types.js";

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
export async function runDirectCLI(args: string[], configData: FfgConfig | null = null): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    hashedSource: string;
    flags: IngestFlags | null;
    _: string[] | undefined;
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

    // Set up for config data if provided
    if (configData) {
        // This will be detected in main() and used instead of loading from disk
        process.env["FFG_TEST_CONFIG"] = JSON.stringify(configData);
    }

    // Modify process.argv
    process.argv = ["node", "dist/index.js", ...args];

    let exitCode = 0;
    let hashedSource = "";
    let flags: IngestFlags | null = null;
    let positionalArgs: string[] | undefined = undefined;

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

        // Get last CLI args after main execution
        const fullArgv = getLastCliArgsForTest();
        if (fullArgv) {
            // Filter out metadata properties from yargs
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _: __, $0: _$0, ...relevantFlags } = fullArgv;
            flags = relevantFlags as IngestFlags;
            positionalArgs = __;
        } else {
            flags = null;
            positionalArgs = undefined;
        }

    } catch (error: unknown) {
        // Check for our special exit code pattern
        const errorObj = error as { message?: string };
        const exitCodeMatch = errorObj.message?.match?.(/EXIT_CODE:(\d+)/);
        if (exitCodeMatch) {
            exitCode = parseInt(exitCodeMatch[1], 10);
        } else if (errorObj.message?.includes?.('Project exceeds the estimated token limit.')) {
            // Special handling for token limit errors
            exitCode = 1;
            stderrOutput += errorObj.message || 'Error: Project exceeds the estimated token limit.';
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

        // Clear the test config env var if it was set
        if (process.env["FFG_TEST_CONFIG"]) {
            delete process.env["FFG_TEST_CONFIG"];
        }

        process.env = originalEnv;
    }

    return {
        stdout: stdoutOutput,
        stderr: stderrOutput,
        exitCode,
        hashedSource,
        flags,
        _: positionalArgs,
    };
} 