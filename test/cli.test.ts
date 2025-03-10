import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { scanDirectory } from "../src/ingest.js";
import { runCLI } from "../utils/runCLI";

interface TreeNode {
	name: string;
	path: string;
	type: "file" | "directory";
	size: number;
	children?: TreeNode[];
	file_count: number;
	dir_count: number;
}

describe("CLI flags", () => {
	const FIXTURES_DIR = resolve(__dirname, "fixtures/sample-project");

	describe("include flag", () => {
		it("should only include TypeScript files when using *.ts pattern", async () => {
			const result = await scanDirectory(FIXTURES_DIR, {
				include: ["*.ts"],
				exclude: [],
				debug: true,
			});

			expect(result).not.toBeNull();

			// Should find test.ts but not hello.js
			const files =
				result?.children?.filter((node) => node.type === "file") ?? [];
			console.log(
				"Root level files:",
				files.map((f) => f.name),
			);
			expect(files).toHaveLength(1);
			expect(files[0].name).toBe("test.ts");
		});

		it("should include files in subdirectories when using **/*.ts pattern", async () => {
			const result = await scanDirectory(FIXTURES_DIR, {
				include: ["**/*.ts"],
				exclude: [],
				debug: true,
			});

			expect(result).not.toBeNull();

			// Helper to collect all .ts files recursively
			function collectTsFiles(node: TreeNode): string[] {
				const files: string[] = [];
				if (node.type === "file" && node.name.endsWith(".ts")) {
					files.push(node.name);
					console.log("Found .ts file:", node.name, "at path:", node.path);
				}
				if (node.children) {
					for (const child of node.children) {
						files.push(...collectTsFiles(child));
					}
				}
				return files;
			}

			const tsFiles = collectTsFiles(result as TreeNode);
			console.log("All found .ts files:", tsFiles);

			// Should find both test.ts and src/math.ts
			expect(tsFiles).toHaveLength(2);
			expect(tsFiles).toContain("test.ts");
			expect(tsFiles).toContain("math.ts");
		});
	});
});

// (adjust the relative import to wherever your "scanDirectory" is)

describe("exclude logic and .gitignore behavior", () => {
	const FIXTURES_DIR = join(__dirname, "fixtures", "ignore-test");

	it("should exclude *.js by default when .gitignore is present", async () => {
		/**
		 * By default, we want .gitignore patterns to be applied,
		 * so our 'ignored.js' should *not* appear in the scan results.
		 */
		const result = await scanDirectory(FIXTURES_DIR, {
			// No "exclude" specified => we rely on reading .gitignore by default
			ignore: true, // or whatever your default is
			debug: false,
		});

		expect(result).not.toBeNull();
		// Flatten out file names:
		const allFiles = getAllFileNames(result as TreeNode);

		// We expect 'ignored.js' to be missing
		expect(allFiles).not.toContain("ignored.js");

		// We *do* expect 'kept.ts' and 'readme.md'
		expect(allFiles).toContain("kept.ts");
		expect(allFiles).toContain("readme.md");
	});

	it("should not exclude *.js if we pass `ignore: false`", async () => {
		/**
		 * If the user sets ignore: false (or similar),
		 * we skip reading .gitignore altogether.
		 */
		const result = await scanDirectory(FIXTURES_DIR, {
			ignore: false, // <-- now .gitignore is ignored
			debug: false,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);

		// Now 'ignored.js' is included, because .gitignore is skipped
		expect(allFiles).toContain("ignored.js");
		expect(allFiles).toContain("kept.ts");
		expect(allFiles).toContain("readme.md");
	});

	it("should also respect user-supplied exclude patterns (e.g., ignoring *.md)", async () => {
		/**
		 * Suppose the user wants to exclude "*.md" in addition to .gitignore.
		 */
		const result = await scanDirectory(FIXTURES_DIR, {
			ignore: true, // still read .gitignore
			exclude: ["*.md"], // user-supplied exclude
			debug: false,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);

		// .gitignore says to ignore .js, so 'ignored.js' is excluded
		expect(allFiles).not.toContain("ignored.js");

		// The user-supplied exclude says to ignore .md, so 'readme.md' is excluded
		expect(allFiles).not.toContain("readme.md");

		// 'kept.ts' is still present
		expect(allFiles).toContain("kept.ts");
	});
});

describe("find flag", () => {
	const FIXTURES_DIR = resolve(__dirname, "fixtures/sample-project");

	it("should find files containing the search term in their name (case-insensitive)", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["test"],
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found with 'test':", allFiles);

		// Should find test.ts but not hello.js or math.ts
		expect(allFiles).toContain("test.ts");
		expect(allFiles).not.toContain("hello.js");
		expect(allFiles).not.toContain("math.ts");
	});

	it("should work with exclude patterns", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["test"],
			exclude: ["*.ts"],
			debug: true,
		});

		// When all matching files are excluded, we expect null
		expect(result).toBeNull();
	});

	it("should be case-insensitive", async () => {
		// First let's scan with lowercase
		const resultLower = await scanDirectory(FIXTURES_DIR, {
			find: ["test"],
			debug: true,
		});

		// Then with uppercase
		const resultUpper = await scanDirectory(FIXTURES_DIR, {
			find: ["TEST"],
			debug: true,
		});

		const filesLower = getAllFileNames(resultLower as TreeNode);
		const filesUpper = getAllFileNames(resultUpper as TreeNode);

		console.log("Files found with lowercase 'test':", filesLower);
		console.log("Files found with uppercase 'TEST':", filesUpper);

		// Both searches should find the same files
		expect(filesLower).toEqual(filesUpper);
		expect(filesLower).toContain("test.ts");
	});

	it("should work with directory-scoped includes", async () => {
		// First scan without include to show we have multiple matches
		const resultAll = await scanDirectory(FIXTURES_DIR, {
			find: ["math"],
			debug: true,
		});

		expect(resultAll).not.toBeNull();
		const allFiles = getAllFileNames(resultAll as TreeNode);
		console.log("All files found with 'math':", allFiles);

		// Now scan with include to scope to src directory
		const resultScoped = await scanDirectory(FIXTURES_DIR, {
			find: ["math"],
			include: ["src/**"],
			debug: true,
		});

		expect(resultScoped).not.toBeNull();
		const scopedFiles = getAllFileNames(resultScoped as TreeNode);
		console.log("Files found with 'math' in src/:", scopedFiles);

		// Should only find math.ts in src/, not any other math files
		expect(scopedFiles).toContain("math.ts");
		expect(scopedFiles.length).toBe(1);
		expect(scopedFiles.every((file) => file.startsWith("math"))).toBe(true);
	});

	it("should find files containing the search term in their content", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["console"],
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found with content 'console':", allFiles);

		// Should find test.ts and hello.js since they both have console.log
		expect(allFiles).toContain("test.ts");
		expect(allFiles).toContain("hello.js");
		expect(allFiles).not.toContain("math.ts"); // math.ts doesn't have console in it
	});

	it("should work with include patterns when searching content", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["console"],
			include: ["*.ts"],
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found with content 'console' in .ts files:", allFiles);

		// Should only find test.ts since we're only including .ts files
		expect(allFiles).toContain("test.ts");
		expect(allFiles).not.toContain("hello.js"); // Excluded by *.ts pattern
		expect(allFiles).not.toContain("math.ts"); // Doesn't contain console
	});

	it("should support multiple find flags to match ANY term", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["console", "math"], // One term matches hello.js/test.ts, other matches math.ts
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found with either 'console' or 'math':", allFiles);

		// Should find:
		// - test.ts and hello.js (have console)
		// - math.ts (has math in name)
		expect(allFiles).toContain("test.ts");
		expect(allFiles).toContain("hello.js");
		expect(allFiles).toContain("math.ts");
	});

	it("should match any term in filenames but require all terms in content", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["test", "nonexistent"],
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log(
			"Files found with 'test' in name or all terms in content:",
			allFiles,
		);

		// Should find test.ts because it matches in filename, even though content doesn't have 'nonexistent'
		expect(allFiles).toContain("test.ts");
		// But shouldn't find files that only match one term in content
		expect(allFiles).not.toContain("hello.js");
	});

	it("should handle empty or undefined find flags", async () => {
		const resultEmpty = await scanDirectory(FIXTURES_DIR, {
			find: [],
			debug: true,
		});

		const resultUndefined = await scanDirectory(FIXTURES_DIR, {
			debug: true,
		});

		// Both should return all files since no filtering
		expect(getAllFileNames(resultEmpty as TreeNode)).toEqual(
			getAllFileNames(resultUndefined as TreeNode),
		);
	});

	it("should support multiple -f flags from command line", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"-f",
			"console",
			"-f",
			"log",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// Should find both test.ts and hello.js since they have console.log
		expect(stdout).toContain("test.ts");
		expect(stdout).toContain("hello.js");
		// But not math.ts which doesn't have console.log
		expect(stdout).not.toContain("math.ts");
	});

	it("should support comma-separated find values with OR behavior", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--find=console,math",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// Should find both console.log files and math.ts
		expect(stdout).toContain("test.ts");
		expect(stdout).toContain("hello.js");
		expect(stdout).toContain("math.ts");
	});

	it("should support require flag for AND behavior", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			require: ["console", "log"], // Must have both terms
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found with BOTH 'console' AND 'log':", allFiles);

		// Should find test.ts and hello.js since they both have console.log
		expect(allFiles).toContain("test.ts");
		expect(allFiles).toContain("hello.js");
		// But not math.ts which has neither
		expect(allFiles).not.toContain("math.ts");
	});

	it("should support both find and require flags together", async () => {
		const result = await scanDirectory(FIXTURES_DIR, {
			find: ["math"], // Files with math OR
			require: ["console", "log"], // Files with both console AND log
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files with 'math' OR (both 'console' AND 'log'):", allFiles);

		// Should find:
		// - math.ts (matches 'math')
		// - test.ts and hello.js (have both console AND log)
		expect(allFiles).toContain("math.ts"); // Has 'math'
		expect(allFiles).toContain("test.ts"); // Has console.log
		expect(allFiles).toContain("hello.js"); // Has console.log
	});

	it("should support comma-separated require values", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--require=console,log",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// Should only find files with both console AND log
		expect(stdout).toContain("test.ts");
		expect(stdout).toContain("hello.js");
		expect(stdout).not.toContain("math.ts");
	});

	it("should handle complex combinations of find and require", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--find=math",
			"--require=console,log",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// Should find files with 'math' OR (both 'console' AND 'log')
		expect(stdout).toContain("math.ts"); // Has 'math'
		expect(stdout).toContain("test.ts"); // Has console.log
		expect(stdout).toContain("hello.js"); // Has console.log
	});
});

describe("default directory behavior", () => {
	it("should use current directory when no source is provided", async () => {
		const cwd = process.cwd();
		const result = await scanDirectory(cwd, {
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("Files found in current directory:", allFiles);

		// Should find at least the test file itself
		expect(allFiles).toContain("cli.test.ts");
	});

	it("should work with other flags when using default directory", async () => {
		const cwd = process.cwd();
		const result = await scanDirectory(cwd, {
			include: ["*.ts"],
			debug: true,
		});

		expect(result).not.toBeNull();
		const allFiles = getAllFileNames(result as TreeNode);
		console.log("TypeScript files found in current directory:", allFiles);

		// Should only find TypeScript files
		expect(allFiles.every((file) => file.endsWith(".ts"))).toBe(true);
	});
});

/** Helper to recursively collect file names from your scan TreeNode */
function getAllFileNames(node: TreeNode): string[] {
	let names: string[] = [];
	if (node.type === "file") {
		names.push(node.name);
	}
	if (node.children && node.children.length > 0) {
		for (const child of node.children) {
			names = names.concat(getAllFileNames(child));
		}
	}
	return names;
}
