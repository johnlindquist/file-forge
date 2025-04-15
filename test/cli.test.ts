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
		it("should properly handle TypeScript files with different include patterns", async () => {
			// Run both scan operations in parallel
			const [singleLevelResult, recursiveResult] = await Promise.all([
				scanDirectory(FIXTURES_DIR, {
					include: ["*.ts"],
					exclude: [],
					debug: true,
				}),
				scanDirectory(FIXTURES_DIR, {
					include: ["**/*.ts"],
					exclude: [],
					debug: true,
				})
			]);

			// Test single-level include pattern
			expect(singleLevelResult).not.toBeNull();
			const files = singleLevelResult?.children?.filter((node) => node.type === "file") ?? [];
			console.log(
				"Root level files:",
				files.map((f) => f.name),
			);
			expect(files).toHaveLength(1);
			expect(files[0].name).toBe("test.ts");

			// Test recursive include pattern
			expect(recursiveResult).not.toBeNull();

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

			const tsFiles = collectTsFiles(recursiveResult as TreeNode);
			console.log("All found .ts files:", tsFiles);

			// Should find both test.ts and src/math.ts
			expect(tsFiles).toHaveLength(5);
			expect(tsFiles).toContain("test.ts");
			expect(tsFiles).toContain("math.ts");
		});
	});
});

// (adjust the relative import to wherever your "scanDirectory" is)

describe("exclude logic and .gitignore behavior", () => {
	const FIXTURES_DIR = join(__dirname, "fixtures", "ignore-test");

	it("should handle .gitignore behavior with different ignore settings", async () => {
		// Run the tests in parallel
		const [defaultResult, ignoreDisabledResult, userExcludeResult] = await Promise.all([
			// Default behavior - .gitignore respected
			scanDirectory(FIXTURES_DIR, {
				ignore: true,
				debug: false,
			}),
			// .gitignore disabled behavior
			scanDirectory(FIXTURES_DIR, {
				ignore: false,
				debug: false,
			}),
			// User-supplied exclude patterns
			scanDirectory(FIXTURES_DIR, {
				ignore: true,
				exclude: ["*.md"],
				debug: false,
			})
		]);

		// Test default behavior
		expect(defaultResult).not.toBeNull();
		const defaultFiles = getAllFileNames(defaultResult as TreeNode);
		expect(defaultFiles).not.toContain("ignored.js");
		expect(defaultFiles).toContain("kept.ts");
		expect(defaultFiles).toContain("readme.md");

		// Test ignore:false behavior
		expect(ignoreDisabledResult).not.toBeNull();
		const ignoreDisabledFiles = getAllFileNames(ignoreDisabledResult as TreeNode);
		expect(ignoreDisabledFiles).toContain("ignored.js");
		expect(ignoreDisabledFiles).toContain("kept.ts");
		expect(ignoreDisabledFiles).toContain("readme.md");

		// Test user-supplied exclude patterns
		expect(userExcludeResult).not.toBeNull();
		const userExcludeFiles = getAllFileNames(userExcludeResult as TreeNode);
		expect(userExcludeFiles).not.toContain("ignored.js");
		expect(userExcludeFiles).not.toContain("readme.md");
		expect(userExcludeFiles).toContain("kept.ts");
	});
});

describe("find flag", () => {
	const FIXTURES_DIR = resolve(__dirname, "fixtures/sample-project");

	it("should find files by name and apply exclude patterns correctly", async () => {
		// Run both tests in parallel
		const [findResult, findWithExcludeResult] = await Promise.all([
			scanDirectory(FIXTURES_DIR, {
				find: ["test"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				find: ["test"],
				exclude: ["*.ts"],
				debug: true,
			})
		]);

		// Test basic find
		expect(findResult).not.toBeNull();
		const allFiles = getAllFileNames(findResult as TreeNode);
		console.log("Files found with 'test':", allFiles);

		expect(allFiles).toContain("test.ts");
		expect(allFiles).not.toContain("hello.js");
		expect(allFiles).not.toContain("math.ts");

		// Test find with exclude
		expect(findWithExcludeResult).not.toBeNull();
		const excludeFiles = getAllFileNames(findWithExcludeResult as TreeNode);
		expect(excludeFiles).not.toContain("test.ts");
	});

	it("should handle case sensitivity and directory scopes", async () => {
		// Run tests in parallel
		const [resultLower, resultUpper, resultScoped] = await Promise.all([
			scanDirectory(FIXTURES_DIR, {
				find: ["test"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				find: ["TEST"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				find: ["math"],
				include: ["src/**"],
				debug: true,
			})
		]);

		// Test case insensitivity
		const filesLower = getAllFileNames(resultLower as TreeNode);
		const filesUpper = getAllFileNames(resultUpper as TreeNode);

		console.log("Files found with lowercase 'test':", filesLower);
		console.log("Files found with uppercase 'TEST':", filesUpper);

		expect(filesLower).toEqual(filesUpper);
		expect(filesLower).toContain("test.ts");

		// Test directory scoping
		expect(resultScoped).not.toBeNull();
		const scopedFiles = getAllFileNames(resultScoped as TreeNode);
		console.log("Files found with 'math' in src/:", scopedFiles);

		expect(scopedFiles).toContain("math.ts");
		expect(scopedFiles.length).toBe(1);
		expect(scopedFiles.every((file) => file.startsWith("math"))).toBe(true);
	});

	it("should search file content and handle include patterns", async () => {
		// Run tests in parallel
		const [contentResult, contentWithIncludeResult] = await Promise.all([
			scanDirectory(FIXTURES_DIR, {
				find: ["console"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				find: ["console"],
				include: ["*.ts"],
				debug: true,
			})
		]);

		// Test content search
		expect(contentResult).not.toBeNull();
		const allFiles = getAllFileNames(contentResult as TreeNode);
		console.log("Files found with content 'console':", allFiles);

		expect(allFiles).toContain("test.ts");
		expect(allFiles).toContain("hello.js");
		expect(allFiles).not.toContain("math.ts");

		// Test content search with include pattern
		expect(contentWithIncludeResult).not.toBeNull();
		const includedFiles = getAllFileNames(contentWithIncludeResult as TreeNode);
		console.log("Files found with content 'console' in .ts files:", includedFiles);

		expect(includedFiles).toContain("test.ts");
		expect(includedFiles).not.toContain("hello.js");
		expect(includedFiles).not.toContain("math.ts");
	});

	it("should handle multiple search terms with OR/AND logic", async () => {
		// Run tests in parallel
		const [multipleTermsResult, requireFlagResult, combinedFlagsResult] = await Promise.all([
			scanDirectory(FIXTURES_DIR, {
				find: ["console", "math"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				require: ["console", "log"],
				debug: true,
			}),
			scanDirectory(FIXTURES_DIR, {
				find: ["math"],
				require: ["console", "log"],
				debug: true,
			})
		]);

		// Test multiple find terms (OR behavior)
		expect(multipleTermsResult).not.toBeNull();
		const multiTermFiles = getAllFileNames(multipleTermsResult as TreeNode);
		console.log("Files found with either 'console' or 'math':", multiTermFiles);

		expect(multiTermFiles).toContain("test.ts");
		expect(multiTermFiles).toContain("hello.js");
		expect(multiTermFiles).toContain("math.ts");

		// Test require flag (AND behavior)
		expect(requireFlagResult).not.toBeNull();
		const requireFiles = getAllFileNames(requireFlagResult as TreeNode);
		console.log("Files found with BOTH 'console' AND 'log':", requireFiles);

		expect(requireFiles).toContain("test.ts");
		expect(requireFiles).toContain("hello.js");
		expect(requireFiles).not.toContain("math.ts");

		// Test combined find and require flags
		expect(combinedFlagsResult).not.toBeNull();
		const combinedFiles = getAllFileNames(combinedFlagsResult as TreeNode);
		console.log("Files with 'math' OR (both 'console' AND 'log'):", combinedFiles);

		expect(combinedFiles).toContain("math.ts");
		expect(combinedFiles).toContain("test.ts");
		expect(combinedFiles).toContain("hello.js");
	});

	it("should handle CLI argument variations for find and require", async () => {
		// Run CLI commands in parallel
		const [multipleFlagsResult, commaSeparatedFindResult, commaSeparatedRequireResult, complexCombinationResult] = await Promise.all([
			runCLI([
				"test/fixtures/sample-project",
				"-f",
				"console",
				"-f",
				"log",
				"--pipe",
			]),
			runCLI([
				"test/fixtures/sample-project",
				"--find=console,math",
				"--pipe",
			]),
			runCLI([
				"test/fixtures/sample-project",
				"--require=console,log",
				"--pipe",
			]),
			runCLI([
				"test/fixtures/sample-project",
				"--find=math",
				"--require=console,log",
				"--pipe",
			])
		]);

		// Test multiple -f flags
		expect(multipleFlagsResult.exitCode).toBe(0);
		expect(multipleFlagsResult.stdout).toContain("test.ts");
		expect(multipleFlagsResult.stdout).toContain("hello.js");
		expect(multipleFlagsResult.stdout).not.toContain("math.ts");

		// Test comma-separated find values
		expect(commaSeparatedFindResult.exitCode).toBe(0);
		expect(commaSeparatedFindResult.stdout).toContain("test.ts");
		expect(commaSeparatedFindResult.stdout).toContain("hello.js");
		expect(commaSeparatedFindResult.stdout).toContain("math.ts");

		// Test comma-separated require values
		expect(commaSeparatedRequireResult.exitCode).toBe(0);
		expect(commaSeparatedRequireResult.stdout).toContain("test.ts");
		expect(commaSeparatedRequireResult.stdout).toContain("hello.js");
		expect(commaSeparatedRequireResult.stdout).not.toContain("math.ts");

		// Test complex combinations
		expect(complexCombinationResult.exitCode).toBe(0);
		expect(complexCombinationResult.stdout).toContain("math.ts");
		expect(complexCombinationResult.stdout).toContain("test.ts");
		expect(complexCombinationResult.stdout).toContain("hello.js");
	}, 30000);
});

describe("default directory behavior", () => {
	it("should handle default and filtered directory behaviors", async () => {
		const cwd = process.cwd();
		const [defaultResult, filteredResult] = await Promise.all([
			scanDirectory(cwd, {
				debug: true,
			}),
			scanDirectory(cwd, {
				include: ["*.ts"],
				debug: true,
			})
		]);

		expect(defaultResult).not.toBeNull();
		const allFiles = getAllFileNames(defaultResult as TreeNode);
		console.log("Files found in current directory:", allFiles);
		expect(allFiles).toContain("cli.test.ts");

		expect(filteredResult).not.toBeNull();
		const tsFiles = getAllFileNames(filteredResult as TreeNode);
		console.log("TypeScript files found in current directory:", tsFiles);
		expect(tsFiles.every((file) => file.endsWith(".ts"))).toBe(true);
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
