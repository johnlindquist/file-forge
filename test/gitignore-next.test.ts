import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join, resolve } from "node:path";
import { promises as fs } from "node:fs";
import { scanDirectory } from "../src/ingest.js";
import { runCLI } from "./test-helpers";
import { TreeNode } from "../src/types.js";

describe("gitignore .next directory exclusion", () => {
    const TEST_DIR = resolve(__dirname, "fixtures", "next-test");
    const GITIGNORE_PATH = join(TEST_DIR, ".gitignore");

    beforeAll(async () => {
        // Create test directory structure
        await fs.mkdir(TEST_DIR, { recursive: true });
        await fs.mkdir(join(TEST_DIR, ".next"), { recursive: true });

        // Create some test files
        await fs.writeFile(join(TEST_DIR, "regular.js"), "console.log('regular file')");
        await fs.writeFile(join(TEST_DIR, ".next", "build.js"), "console.log('build file')");

        // Create .gitignore with .next
        await fs.writeFile(GITIGNORE_PATH, "# Next.js build output\n/.next/\n");
    });

    afterAll(async () => {
        // Clean up test directory
        await fs.rm(TEST_DIR, { recursive: true, force: true });
    });

    it("should exclude .next directory when it's in .gitignore", async () => {
        const result = await scanDirectory(TEST_DIR, {
            ignore: true,
            debug: true,
        });

        expect(result).not.toBeNull();

        // Helper function to get all file paths from the tree
        function getAllFilePaths(node: TreeNode): string[] {
            const paths: string[] = [];

            function traverse(node: TreeNode) {
                if (node.type === "file") {
                    paths.push(node.path);
                }

                if (node.children) {
                    for (const child of node.children) {
                        traverse(child);
                    }
                }
            }

            traverse(node);
            return paths;
        }

        const allPaths = getAllFilePaths(result as TreeNode);

        // Should include regular.js
        expect(allPaths.some(path => path.endsWith("regular.js"))).toBe(true);

        // Should NOT include any files from .next directory
        expect(allPaths.some(path => path.includes(".next"))).toBe(false);
    });

    it("should exclude .next directory when using CLI", async () => {
        const { stdout, exitCode } = await runCLI([
            "--path",
            TEST_DIR,
            "--pipe",
            "--debug",
        ]);

        expect(exitCode).toBe(0);

        // Should include regular.js
        expect(stdout).toMatch(/regular\.js/);

        // Should NOT include any files from .next directory
        expect(stdout).not.toMatch(/\.next\/build\.js/);
    });
}); 