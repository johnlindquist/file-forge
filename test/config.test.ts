import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { runDirectCLI } from "../utils/directTestRunner.js";
import { promises as fs } from "node:fs";
import { mkdtempSync, rmdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFfgConfig } from "../src/utils.js";
import { execSync } from 'node:child_process';

const fixturesDir = join(__dirname, "fixtures/config-save");

describe("Config Reading & Merging Tests", () => {
    let testDir = "";
    let originalCwd = "";

    beforeEach(async () => {
        originalCwd = process.cwd();
        // Create a temp directory for each test
        testDir = mkdtempSync(join(tmpdir(), "ffg-config-test-"));
        // Change CWD for the test, as ffg looks for config in CWD
        process.chdir(testDir);
    });

    afterEach(async () => {
        // Restore CWD
        if (originalCwd && process.cwd() !== originalCwd) {
            process.chdir(originalCwd);
        }
        // Cleanup
        if (testDir && existsSync(testDir)) { // Check existence before removing
            try {
                // Use rmdirSync for potentially faster cleanup on simple structures
                rmdirSync(testDir, { recursive: true });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
                // Fallback for complex cases or permission issues
                await fs.rm(testDir, { recursive: true, force: true });
            }
            testDir = ""; // Reset for safety
        }
    });

    it("should use defaultCommand from config when no flags are provided", async () => {
        // Copy fixture config
        await fs.copyFile(
            join(fixturesDir, "with-defaults", "ffg.config.jsonc"),
            join(testDir, "ffg.config.jsonc")
        );

        // Load config from the test directory
        const configData = loadFfgConfig(testDir);

        // Run CLI with no args in the temp dir (implicitly uses testDir as CWD)
        const { flags, exitCode } = await runDirectCLI([], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assertions based on the fixture config: { verbose: true, include: ["src"], exclude: ["**/*.test.ts"] }
        expect(flags?.verbose).toBe(true);
        expect(flags?.include).toEqual(["src"]);
        expect(flags?.exclude).toEqual(["**/*.test.ts"]);
        // Check for falsy values instead of undefined since yargs sets defaults for boolean flags
        expect(flags?.markdown).toBeFalsy();
    });

    it("should use a named command from config when --use flag is provided", async () => {
        // Copy fixture config
        await fs.copyFile(
            join(fixturesDir, "with-named", "ffg.config.jsonc"),
            join(testDir, "ffg.config.jsonc")
        );

        // Load config from the test directory
        const configData = loadFfgConfig(testDir);

        // Run CLI with --use docs-only
        const { flags, exitCode } = await runDirectCLI(["--use", "docs-only"], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assertions based on the named command: { markdown: true, exclude: ["*.ts", "*.js"] }
        expect(flags?.markdown).toBe(true);
        expect(flags?.exclude).toEqual(["*.ts", "*.js"]);
        // Check for falsy values instead of undefined for boolean flags
        expect(flags?.verbose).toBeFalsy();
        // For array values, they'll be empty arrays rather than undefined
        expect(flags?.include).toEqual([]);
    });

    it("should override config defaults with user-provided flags", async () => {
        // Copy fixture config with defaults
        await fs.copyFile(
            join(fixturesDir, "with-defaults", "ffg.config.jsonc"),
            join(testDir, "ffg.config.jsonc")
        );

        // Load config from the test directory
        const configData = loadFfgConfig(testDir);

        // Run CLI with flags that override/merge with defaults
        const { flags, exitCode } = await runDirectCLI([
            "--verbose=false", // Explicitly override default verbose: true
            "--include", "lib", // Override default include: ["src"]
            "--exclude", "*.log", // Add to default exclude: ["**/*.test.ts"]
            "--markdown" // Add a new flag
        ], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assertions: User flags take precedence or merge
        expect(flags?.verbose).toBe(false); // User override
        // For array merging, when user provides include/exclude/etc, CLI merges them with config
        expect(flags?.include).toEqual(["src", "lib"]); // src is from config, lib is from user
        expect(flags?.exclude).toEqual(["**/*.test.ts", "*.log"]); // User flags are merged with config arrays
        expect(flags?.markdown).toBe(true); // User adds new flag
    });

    it("should merge user flags with a named command", async () => {
        // Copy fixture config with named commands
        await fs.copyFile(
            join(fixturesDir, "with-named", "ffg.config.jsonc"),
            join(testDir, "ffg.config.jsonc")
        );

        // Load config from the test directory
        const configData = loadFfgConfig(testDir);

        // Run CLI using named command + overrides
        const { flags, exitCode } = await runDirectCLI([
            "--use", "docs-only",
            "--exclude", "*.md", // Add to named command's exclude: ["*.ts", "*.js"]
            "--verbose"          // Add a flag not in the named command
        ], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assertions based on merging named command + user flags
        expect(flags?.markdown).toBe(true); // From named command
        expect(flags?.exclude).toEqual(["*.ts", "*.js", "*.md"]); // Merged excludes
        expect(flags?.verbose).toBe(true); // From user flag
    });

    it("should capture arguments after --", async () => {
        // Copy fixture config with defaults
        await fs.copyFile(
            join(fixturesDir, "with-defaults", "ffg.config.jsonc"),
            join(testDir, "ffg.config.jsonc")
        );

        // Load config from the test directory
        const configData = loadFfgConfig(testDir);

        // Run CLI with flags before and arguments after --
        const { flags, _, exitCode } = await runDirectCLI([
            "--verbose=false", // Flag before --
            "--",              // Separator
            "extra-arg",       // Argument after --
            "--after-flag",    // Another argument after --
            "value"            // Yet another argument after --
        ], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();

        // Assert flags before -- are processed correctly
        expect(flags?.verbose).toBe(false); // User override before --
        expect(flags?.include).toEqual(["src"]); // From default config

        // Assert arguments after -- are captured in the '_' property
        expect(_).toBeDefined(); // Ensure array exists
        expect(_).toEqual([
            "extra-arg",
            "--after-flag",
            "value"
        ]);
    });

    it("should handle an empty config file gracefully", async () => {
        // Create an empty config file
        await fs.writeFile(join(testDir, "ffg.config.jsonc"), "{}");

        // Load config (should be an empty object or null depending on parser leniency)
        const configData = loadFfgConfig(testDir);

        // Run CLI with some basic flags (these should not be overridden)
        const { flags, exitCode } = await runDirectCLI([
            "--path", "some/path",
            "--verbose" // Provide a flag to check
        ], configData); // Pass potentially empty config

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assert that the CLI flag is used, and no defaults from a non-existent defaultCommand are applied
        expect(flags?.verbose).toBe(true);
        expect(flags?.path).toBe("some/path");
        // Check that arrays are empty by default when no config applies
        expect(flags?.include).toEqual([]);
        expect(flags?.exclude).toEqual([]);
    });

    it("should fallback to default/CLI args when --use specifies a non-existent command", async () => {
        // Copy fixture config that has named commands but NOT the one we'll use
        await fs.copyFile(
            join(fixturesDir, "with-named", "ffg.config.jsonc"), // Has 'docs-only'
            join(testDir, "ffg.config.jsonc")
        );

        // Load config
        const configData = loadFfgConfig(testDir);

        // Run CLI using a non-existent named command + a CLI flag
        const { flags, exitCode } = await runDirectCLI([
            "--use", "non-existent-command",
            "--markdown=true" // Provide a CLI flag
        ], configData);

        expect(exitCode).toBe(0);
        expect(flags).toBeDefined();
        // Assertions: Since 'non-existent-command' doesn't exist, it should behave as if no config was applied.
        // The --markdown flag provided via CLI should be respected.
        expect(flags?.markdown).toBe(true);
        // Other flags should have their default yargs values or be absent/empty
        expect(flags?.exclude).toEqual([]);
        expect(flags?.verbose).toBeFalsy();
    });

    it("should prioritize FFG_TEST_CONFIG env var over physical config file", async () => {
        // Create a physical config file with some defaults
        await fs.writeFile(join(testDir, "ffg.config.jsonc"), JSON.stringify({
            defaultCommand: { verbose: false, include: ["physical_config"] }
        }));

        // Define config data for the environment variable
        const envConfigData = {
            defaultCommand: { verbose: true, include: ["env_config"] }
        };

        // Set the environment variable
        process.env.FFG_TEST_CONFIG = JSON.stringify(envConfigData);

        try {
            // Load config (should load from env var due to logic in loadFfgConfig)
            const configData = loadFfgConfig(testDir);

            // Run CLI with no args (should use defaults from env var config)
            const { flags, exitCode } = await runDirectCLI([], configData);

            expect(exitCode).toBe(0);
            expect(flags).toBeDefined();
            // Assertions should match the env var config, not the physical file config
            expect(flags?.verbose).toBe(true); // From env_config
            expect(flags?.include).toEqual(["env_config"]); // From env_config
        } finally {
            // Clean up the environment variable
            delete process.env.FFG_TEST_CONFIG;
        }
    });
});

describe("ffg --use flag on local directories", () => {
    let testDir = "";
    let originalCwd = "";

    beforeEach(async () => {
        originalCwd = process.cwd();
        testDir = mkdtempSync(join(tmpdir(), "ffg-use-local-test-"));
        process.chdir(testDir);
        // Create a dummy src directory and file for include testing
        await fs.mkdir(join(testDir, "src"));
        await fs.writeFile(join(testDir, "src", "local.ts"), "console.log('local');");
        await fs.writeFile(join(testDir, "other.js"), "console.log('other');");
    });

    afterEach(async () => {
        if (originalCwd && process.cwd() !== originalCwd) {
            process.chdir(originalCwd);
        }
        if (testDir && existsSync(testDir)) { // Check existence before removing
            try {
                // Use rmdirSync for potentially faster cleanup on simple structures
                rmdirSync(testDir, { recursive: true });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
                // Fallback for complex cases or permission issues
                await fs.rm(testDir, { recursive: true, force: true });
            }
            testDir = "";
        }
    });

    it("should run analysis on CWD using named command without Git errors (non-Git dir)", async () => {
        // Setup config file
        const config = {
            commands: {
                localSrc: { include: ["src"], verbose: true }
            }
        };
        await fs.writeFile(join(testDir, "ffg.config.jsonc"), JSON.stringify(config));
        const configData = loadFfgConfig(testDir);

        // Run ffg --use localSrc (no path specified, should use CWD)
        // Use --pipe to check stdout easily, --no-token-count to simplify output
        const { stdout, stderr, exitCode, flags } = await runDirectCLI(
            ["--use", "localSrc", "--pipe", "--no-token-count", "--debug"],
            configData
        );

        expect(exitCode).toBe(0);
        // Crucially, no Git errors should appear in stderr
        expect(stderr).not.toContain("No such remote");
        expect(stderr).not.toContain("Failed to get Git information");
        expect(stdout).not.toContain("Failed to get Git information"); // Check stdout too

        // Verify logging shows the command being used
        expect(stdout).toContain("Applying config from named command: localSrc");

        // Verify flags were applied (verbose: true means <files> tag should be present)
        expect(flags?.include).toEqual(["src"]);
        expect(flags?.verbose).toBe(true);
        expect(stdout).toContain("<files>");
        expect(stdout).toContain('src/local.ts'); // Check included file is present

        // Verify files outside 'src' were excluded by the include rule
        expect(stdout).not.toContain('other.js');

        // Verify no <git> block is present in the XML output
        expect(stdout).not.toContain("<git>");
    });

    it("should run analysis on CWD using named command without Git errors (Git dir, no remote)", async () => {
        // Initialize Git repo but don't add a remote
        execSync("git init", { cwd: testDir });
        execSync("git add .", { cwd: testDir });
        try { // Add try/catch for commit resilience
            execSync('git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit for local test" --allow-empty', { cwd: testDir });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
            console.warn("Initial commit might have failed (e.g., nothing to commit), continuing test...");
        }

        // Setup config file
        const config = {
            commands: {
                localGit: { exclude: ["*.js"], markdown: true } // Different flags
            }
        };
        await fs.writeFile(join(testDir, "ffg.config.jsonc"), JSON.stringify(config));
        const configData = loadFfgConfig(testDir);

        // Run ffg --use localGit
        const { stdout, stderr, exitCode, flags } = await runDirectCLI(
            ["--use", "localGit", "--pipe", "--no-token-count", "--debug"],
            configData
        );

        expect(exitCode).toBe(0);
        // No "No such remote 'origin'" error expected because getGitInfo is skipped
        expect(stderr).not.toContain("No such remote");
        expect(stdout).not.toContain("No such remote"); // Check stdout too
        expect(stderr).not.toContain("Failed to get Git information");
        expect(stdout).not.toContain("Failed to get Git information"); // Check stdout too

        // Verify logging shows the command being used
        expect(stdout).toContain("Applying config from named command: localGit");

        // Verify flags were applied
        expect(flags?.exclude).toEqual(["*.js"]);
        expect(flags?.markdown).toBe(true);
        expect(stdout).toContain("## Summary"); // Markdown output

        // Verify *.js files were excluded
        expect(stdout).not.toContain('other.js');
        expect(stdout).toContain('src/local.ts'); // .ts file should still be there
    });
}); 