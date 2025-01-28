import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { scanDirectory } from "../index";

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

			const tsFiles = collectTsFiles(result!);
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
		const allFiles = getAllFileNames(result!);

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
		const allFiles = getAllFileNames(result!);

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
		const allFiles = getAllFileNames(result!);

		// .gitignore says to ignore .js, so 'ignored.js' is excluded
		expect(allFiles).not.toContain("ignored.js");

		// The user-supplied exclude says to ignore .md, so 'readme.md' is excluded
		expect(allFiles).not.toContain("readme.md");

		// 'kept.ts' is still present
		expect(allFiles).toContain("kept.ts");
	});
});

/** Helper to recursively collect file names from your scan TreeNode */
function getAllFileNames(node: any): string[] {
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
