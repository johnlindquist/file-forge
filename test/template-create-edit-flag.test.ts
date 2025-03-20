// test/template-create-edit-flag.test.ts
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { runCLI } from "./test-helpers.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import envPaths from "env-paths";
import { APP_SYSTEM_ID } from "../src/constants.js";

// Use a temporary directory for templates in tests
const getTempTemplateDir = () => {
    const isCI = process.env.CI === 'true' || process.env.CI === '1';
    if (isCI) {
        // In CI, use a subdirectory in the temp directory
        return path.join(os.tmpdir(), `file-forge-test-templates-${Math.random().toString(36).substring(2, 10)}`);
    } else {
        // In local development, use the actual config dir
        const paths = envPaths(APP_SYSTEM_ID);
        return path.join(paths.config);
    }
};

const TEMPLATES_DIR = getTempTemplateDir();

// Ensure the templates directory exists
beforeEach(async () => {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
});

// Helpers for test cleanup
const cleanupFiles = async (files: string[]) => {
    for (const file of files) {
        try {
            await fs.unlink(file);
            // Also try to remove parent directory if empty
            const dir = path.dirname(file);
            const dirContents = await fs.readdir(dir);
            if (dirContents.length === 0) {
                await fs.rmdir(dir);
            }
        } catch {
            // Ignore errors if file doesn't exist
        }
    }
};

describe("Template Creation and Editing Flags", () => {
    const testTemplateName = "test-template";
    const sanitizedName = testTemplateName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    const templateFilePath = path.resolve(TEMPLATES_DIR, `${sanitizedName}.yaml`);

    // Clean up after each test
    afterEach(async () => {
        await cleanupFiles([templateFilePath]);

        // Clean up the temporary directory in CI
        if (process.env.CI === 'true' || process.env.CI === '1') {
            try {
                await fs.rm(TEMPLATES_DIR, { recursive: true, force: true });
            } catch {
                // Ignore errors if directory doesn't exist or can't be removed
            }
        }
    });

    describe("--create-template flag", () => {
        it("should create a new template file with boilerplate content", async () => {
            // Mock process.env to use our temporary directory
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                FFG_TEMPLATES_DIR: TEMPLATES_DIR
            };

            try {
                const { stdout, exitCode } = await runCLI([
                    "--create-template",
                    testTemplateName
                ]);

                // Check that the command executed successfully
                expect(exitCode).toBe(0);

                // Verify that a template file path was output
                expect(stdout).toContain("template file at:");

                // Check that the file was actually created - we don't check for the exact path
                // since it might be different in CI
                const fileExists = await fs.access(templateFilePath)
                    .then(() => true)
                    .catch(() => false);
                expect(fileExists).toBe(true);

                // Verify file contents
                if (fileExists) {
                    const content = await fs.readFile(templateFilePath, 'utf8');
                    expect(content).toContain(`name: ${testTemplateName}`);
                    expect(content).toContain('category: documentation');
                    expect(content).toContain('description: Custom template');
                    expect(content).toContain('<instructions>');
                    expect(content).toContain('<task>');
                }
            } finally {
                // Restore the original environment
                process.env = originalEnv;
            }
        });

        it("should report if template file already exists", async () => {
            // Mock process.env to use our temporary directory
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                FFG_TEMPLATES_DIR: TEMPLATES_DIR
            };

            try {
                // Create the file first
                await runCLI([
                    "--create-template",
                    testTemplateName
                ]);

                // Try creating it again
                const { stdout, exitCode } = await runCLI([
                    "--create-template",
                    testTemplateName
                ]);

                expect(exitCode).toBe(0);
                expect(stdout).toContain("already exists");
            } finally {
                // Restore the original environment
                process.env = originalEnv;
            }
        });
    });

    describe("--edit-template flag", () => {
        beforeEach(async () => {
            // Mock process.env to use our temporary directory
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                FFG_TEMPLATES_DIR: TEMPLATES_DIR
            };

            try {
                // Create a template first
                await runCLI([
                    "--create-template",
                    testTemplateName
                ]);
            } finally {
                // Restore the original environment
                process.env = originalEnv;
            }
        });

        it("should find and print the path of an existing template file", async () => {
            // Mock process.env to use our temporary directory
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                FFG_TEMPLATES_DIR: TEMPLATES_DIR
            };

            try {
                const { stdout, exitCode } = await runCLI([
                    "--edit-template",
                    testTemplateName
                ]);

                expect(exitCode).toBe(0);
                expect(stdout).toContain("template file for editing");
            } finally {
                // Restore the original environment
                process.env = originalEnv;
            }
        });

        it("should report when a template is not found", async () => {
            // Mock process.env to use our temporary directory
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                FFG_TEMPLATES_DIR: TEMPLATES_DIR
            };

            try {
                const { stdout } = await runCLI([
                    "--edit-template",
                    "non-existent-template"
                ]);

                // Check that the output contains a message about the template not being found
                expect(stdout).toContain("No template file found for 'non-existent-template'");
            } finally {
                // Restore the original environment
                process.env = originalEnv;
            }
        });
    });
}); 