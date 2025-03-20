// test/template-create-edit-flag.test.ts
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { runCLI } from "./test-helpers.js";
import fs from "node:fs/promises";
import path from "node:path";
import envPaths from "env-paths";
import { APP_SYSTEM_ID } from "../src/constants.js";

// Setup paths for testing
const paths = envPaths(APP_SYSTEM_ID);
const CONFIG_DIR = paths.config;
const TEMPLATES_DIR = CONFIG_DIR;

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
    });

    describe("--create-template flag", () => {
        it("should create a new template file with boilerplate content", async () => {
            const { stdout, exitCode } = await runCLI([
                "--create-template",
                testTemplateName
            ]);

            // Check that the command executed successfully
            expect(exitCode).toBe(0);

            // Verify the output contains the file path
            expect(stdout).toContain(templateFilePath);

            // Check that the file was actually created
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
        });

        it("should report if template file already exists", async () => {
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
        });
    });

    describe("--edit-template flag", () => {
        beforeEach(async () => {
            // Create a template first
            await runCLI([
                "--create-template",
                testTemplateName
            ]);
        });

        it("should find and print the path of an existing template file", async () => {
            const { stdout, exitCode } = await runCLI([
                "--edit-template",
                testTemplateName
            ]);

            expect(exitCode).toBe(0);
            expect(stdout).toContain(templateFilePath);
        });

        it("should report when a template is not found", async () => {
            const { stdout } = await runCLI([
                "--edit-template",
                "non-existent-template"
            ]);

            // Check that the output contains a message about the template not being found
            expect(stdout).toContain("No template file found for 'non-existent-template'");
        });
    });
}); 