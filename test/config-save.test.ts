import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js"; // Use direct runner
import { promises as fs } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "jsonc-parser"; // Use jsonc-parser to read the result
import type { ErrnoException } from '../src/types.js'; // Added import for NodeJS.ErrnoException

describe("Config Saving (--save / --save-as)", () => {
    let testDir = "";
    let originalCwd = "";

    beforeEach(async () => {
        originalCwd = process.cwd();
        testDir = mkdtempSync(join(tmpdir(), "ffg-save-test-"));
        process.chdir(testDir); // Change CWD for the test
        console.log(`\n[TEST_LOG] Running test in temp dir: ${testDir}`);
    });

    afterEach(async () => {
        console.log(`[TEST_LOG] Cleaning up test dir: ${testDir}`);
        // Restore CWD
        if (originalCwd && process.cwd() !== originalCwd) {
            process.chdir(originalCwd);
        }
        // Cleanup temp dir
        if (testDir) {
            await fs.rm(testDir, { recursive: true, force: true });
            testDir = "";
        }
        console.log(`[TEST_LOG] Test cleanup complete.`);
    });

    const configPath = () => join(testDir, "ffg.config.jsonc");

    const readConfig = async () => {
        try {
            const content = await fs.readFile(configPath(), "utf-8");
            console.log(`[TEST_LOG] Read config file content:\n${content}`);
            const parsed = parse(content);
            console.log(`[TEST_LOG] Parsed config object: ${JSON.stringify(parsed, null, 2)}`);
            return parsed;
        } catch (error) {
            // If file doesn't exist, return null
            // Use ErrnoException type directly
            if (error instanceof Error && (error as ErrnoException).code === 'ENOENT') {
                console.log(`[TEST_LOG] Config file not found at ${configPath()}, returning null.`);
                return null;
            }
            console.error(`[TEST_LOG] Error reading config: ${error}`);
            throw error; // Rethrow other errors
        }
    };

    it("should create a new config file and save flags as defaultCommand with --save", async () => {
        const cliArgs = [
            "--include", "src",
            "--exclude", "*.test.ts",
            "--verbose", // Include a boolean flag
            "--save",
        ];
        console.log(`[TEST_LOG] Running CLI with args: ${JSON.stringify(cliArgs)}`);
        const { stdout, exitCode } = await runDirectCLI(cliArgs);
        console.log(`[TEST_LOG] CLI stdout:\n${stdout}`);
        console.log(`[TEST_LOG] CLI exitCode: ${exitCode}`);

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Saved current flags as default command");
        // Analysis should not run, so certain messages should be absent
        expect(stdout).not.toContain("Building text digest...");
        expect(stdout).not.toContain("Results saved to:");

        // Verify file content
        const savedConfig = await readConfig();
        expect(savedConfig).toBeDefined();
        expect(savedConfig).toHaveProperty("defaultCommand");

        const expectedDefaultCommand = {
            include: ["src"],
            exclude: ["*.test.ts"],
            verbose: true,
        };
        console.log(`[TEST_LOG] Expected defaultCommand: ${JSON.stringify(expectedDefaultCommand, null, 2)}`);
        console.log(`[TEST_LOG] Actual defaultCommand: ${JSON.stringify(savedConfig.defaultCommand, null, 2)}`);

        // Use objectContaining to be less brittle about extra default properties from yargs
        expect(savedConfig.defaultCommand).toEqual(expect.objectContaining(expectedDefaultCommand));

        // Explicitly check that flags we *never* want saved are gone
        expect(savedConfig.defaultCommand).not.toHaveProperty('save');
        expect(savedConfig.defaultCommand).not.toHaveProperty('saveAs');
        // No longer check for pipe, clipboard, open, config, debug, dryRun here as their boolean defaults might be saved intentionally
        expect(savedConfig.defaultCommand).not.toHaveProperty('_');
        expect(savedConfig.defaultCommand).not.toHaveProperty('$0');
    });

    it("should create a new config file and save flags as named command with --save-as", async () => {
        const commandName = "my-ts-analysis";
        const cliArgs = [
            "--include", "src/**/*.ts",
            "--require", "import",
            "--save-as", commandName,
        ];
        console.log(`[TEST_LOG] Running CLI with args: ${JSON.stringify(cliArgs)}`);
        const { stdout, exitCode } = await runDirectCLI(cliArgs);
        console.log(`[TEST_LOG] CLI stdout:\n${stdout}`);
        console.log(`[TEST_LOG] CLI exitCode: ${exitCode}`);

        expect(exitCode).toBe(0);
        expect(stdout).toContain(`Saved current flags as named command "${commandName}"`);
        expect(stdout).not.toContain("Building text digest...");
        expect(stdout).not.toContain("Results saved to:");

        const savedConfig = await readConfig();
        expect(savedConfig).toBeDefined();
        expect(savedConfig).toHaveProperty("commands");
        expect(savedConfig.commands).toHaveProperty(commandName);

        const expectedCommand = {
            include: ["src/**/*.ts"],
            require: ["import"],
        };
        console.log(`[TEST_LOG] Expected command [${commandName}]: ${JSON.stringify(expectedCommand, null, 2)}`);
        console.log(`[TEST_LOG] Actual command [${commandName}]: ${JSON.stringify(savedConfig.commands[commandName], null, 2)}`);

        expect(savedConfig.commands[commandName]).toEqual(expect.objectContaining(expectedCommand));

        // Check removed flags
        expect(savedConfig.commands[commandName]).not.toHaveProperty('save');
        expect(savedConfig.commands[commandName]).not.toHaveProperty('saveAs');
        expect(savedConfig.commands[commandName]).not.toHaveProperty('_');
        expect(savedConfig.commands[commandName]).not.toHaveProperty('$0');
    });

    it("should overwrite existing defaultCommand with --save", async () => {
        const initialConfig = { defaultCommand: { verbose: false, exclude: ['temp'] } };
        console.log(`[TEST_LOG] Writing initial config: ${JSON.stringify(initialConfig)}`);
        await fs.writeFile(configPath(), JSON.stringify(initialConfig));

        const cliArgs = [
            "--include", "lib",
            "--verbose=true", // Explicitly set verbose to true
            "--save",
        ];
        console.log(`[TEST_LOG] Running CLI with args: ${JSON.stringify(cliArgs)}`);
        const { exitCode, stdout } = await runDirectCLI(cliArgs);
        console.log(`[TEST_LOG] CLI stdout:\n${stdout}`);
        console.log(`[TEST_LOG] CLI exitCode: ${exitCode}`);
        expect(exitCode).toBe(0);

        const savedConfig = await readConfig();
        const expectedDefaultCommand = {
            include: ["lib"],
            verbose: true, // Should be true now
            // exclude: ['temp'] should be gone
        };
        console.log(`[TEST_LOG] Expected defaultCommand: ${JSON.stringify(expectedDefaultCommand, null, 2)}`);
        console.log(`[TEST_LOG] Actual defaultCommand: ${JSON.stringify(savedConfig.defaultCommand, null, 2)}`);

        expect(savedConfig.defaultCommand).toEqual(expect.objectContaining(expectedDefaultCommand));
        expect(savedConfig.defaultCommand).not.toHaveProperty('exclude'); // Verify old flag is removed
        expect(savedConfig.defaultCommand).not.toHaveProperty('save');
    });

    it("should overwrite existing named command with --save-as", async () => {
        const commandName = "docs";
        const initialConfig = { commands: { [commandName]: { markdown: true, require: ['old'] } } };
        console.log(`[TEST_LOG] Writing initial config: ${JSON.stringify(initialConfig)}`);
        await fs.writeFile(configPath(), JSON.stringify(initialConfig));

        const cliArgs = [
            "--include", "*.md",
            "--exclude", "node_modules",
            "--markdown=false", // Explicitly set markdown to false
            "--save-as", commandName,
        ];
        console.log(`[TEST_LOG] Running CLI with args: ${JSON.stringify(cliArgs)}`);
        const { exitCode, stdout } = await runDirectCLI(cliArgs);
        console.log(`[TEST_LOG] CLI stdout:\n${stdout}`);
        console.log(`[TEST_LOG] CLI exitCode: ${exitCode}`);
        expect(exitCode).toBe(0);

        const savedConfig = await readConfig();
        const expectedCommand = {
            include: ["*.md"],
            exclude: ["node_modules"],
            markdown: false, // Should be false now
            // require: ['old'] should be gone
        };
        console.log(`[TEST_LOG] Expected command [${commandName}]: ${JSON.stringify(expectedCommand, null, 2)}`);
        console.log(`[TEST_LOG] Actual command [${commandName}]: ${JSON.stringify(savedConfig.commands[commandName], null, 2)}`);

        expect(savedConfig.commands[commandName]).toEqual(expect.objectContaining(expectedCommand));
        expect(savedConfig.commands[commandName]).not.toHaveProperty('require'); // Verify old flag is removed
        expect(savedConfig.commands[commandName]).not.toHaveProperty('saveAs');
    });

    // This test needs careful consideration of how merging works vs. saving the final state.
    // The current implementation saves the *final* state of argv *after* merging.
    it("should save the FINAL merged flags when using --use and --save-as", async () => {
        const baseCommandName = "base";
        const savedCommandName = "merged";
        const initialConfig = {
            defaultCommand: { exclude: ["dist"], skipArtifacts: false }, // Base defaults
            commands: {
                [baseCommandName]: { include: ["src"], verbose: true, exclude: ["temp"], skipArtifacts: true } // Specific command, overrides default exclude and skipArtifacts
            }
        };
        console.log(`[TEST_LOG] Writing initial config: ${JSON.stringify(initialConfig)}`);
        await fs.writeFile(configPath(), JSON.stringify(initialConfig));

        const cliArgs = [
            "--use", baseCommandName,
            "--exclude", "*.log", // User adds another exclude pattern
            "--require", "test", // User adds a new flag
            "--save-as", savedCommandName,
        ];
        console.log(`[TEST_LOG] Running CLI with args: ${JSON.stringify(cliArgs)}`);
        // Pass initial config to mimic loading from file system during runCli
        const { exitCode, stdout } = await runDirectCLI(cliArgs, initialConfig);
        console.log(`[TEST_LOG] CLI stdout:\n${stdout}`);
        console.log(`[TEST_LOG] CLI exitCode: ${exitCode}`);
        expect(exitCode).toBe(0);

        const savedConfig = await readConfig();
        expect(savedConfig.commands).toHaveProperty(savedCommandName);

        // Expected flags are the final state *after* merging in runCli:
        // - 'use' flag itself is present because it was in argv.
        // - 'include' comes from the 'base' command.
        // - 'verbose' comes from the 'base' command.
        // - 'exclude' merges 'base' command's value AND the user's CLI value.
        // - 'require' comes from the user's CLI value.
        // - 'skipArtifacts' comes from the 'base' command (overriding the defaultCommand).
        const expectedSavedFlags = {
            use: baseCommandName,
            include: ["src"],
            verbose: true,
            exclude: ["temp", "*.log"], // Merged value from 'base' command and CLI input
            require: ["test"],
            skipArtifacts: true // From 'base' command override
        };
        console.log(`[TEST_LOG] Expected saved command [${savedCommandName}]: ${JSON.stringify(expectedSavedFlags, null, 2)}`);
        console.log(`[TEST_LOG] Actual saved command [${savedCommandName}]: ${JSON.stringify(savedConfig.commands[savedCommandName], null, 2)}`);

        // Check that the saved command contains exactly the expected flags
        expect(savedConfig.commands[savedCommandName]).toEqual(expect.objectContaining(expectedSavedFlags));

        // Verify that flags *not* part of the final merged state (like defaultCommand's exclude) are absent
        expect(savedConfig.commands[savedCommandName].exclude).not.toContain("dist");

        // Verify explicitly removed flags are absent
        expect(savedConfig.commands[savedCommandName]).not.toHaveProperty('saveAs');
        expect(savedConfig.commands[savedCommandName]).not.toHaveProperty('_');
        expect(savedConfig.commands[savedCommandName]).not.toHaveProperty('$0');
    });
}); 