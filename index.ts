#!/usr/bin/env node

/* 
  gitingest-cli.js

  Example usage:
    $ gitingest --include "*.ts" --exclude "*.test.*,node_modules" https://github.com/owner/repo
    $ gitingest /path/to/local/dir --max-size 500000 --pipe
    $ gitingest --branch develop --include "src/" https://github.com/owner/repo

  1) Installs required libs:
     npm install yargs @clack/prompts conf env-paths date-fns mkdirp node-fetch

  2) Make executable and run:
     chmod +x gitingest-cli.js
     ./gitingest-cli.js [options] [repo or directory path]
*/

import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import * as p from "@clack/prompts";
import { format } from "date-fns";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import Conf from "conf";
import { execSync, spawnSync } from "node:child_process";
import { resolve, basename } from "node:path";
import {
	existsSync,
	lstatSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import * as fs from "node:fs";

/** Constants/Helpers ******************************/

const RESULTS_SAVED_MARKER = "RESULTS_SAVED:";
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_LOG_DIR = envPaths("gitingest").log;
const DEFAULT_SEARCHES_DIR = envPaths("gitingest").config;
const DEFAULT_IGNORE = [
	// Common ignore patterns from the Python version
	"*.pyc",
	"*.pyo",
	"*.pyd",
	"__pycache__",
	".pytest_cache",
	".coverage",
	".tox",
	"node_modules",
	"bower_components",
	"dist",
	"build",
	"venv",
	".venv",
	".git",
	// etc...
];
const DIR_MAX_DEPTH = 20;
const DIR_MAX_FILES = 10000;
const DIR_MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB

type EditorConfig = {
	command: string | null;
	skipEditor: boolean;
};

type IngestFlags = {
	include?: string[] | undefined;
	exclude?: string[] | undefined;
	branch?: string | undefined;
	commit?: string | undefined;
	maxSize?: number | undefined;
	pipe?: boolean | undefined;
	debug?: boolean | undefined;
	bulk?: boolean | undefined;
};

type ScanStats = {
	totalFiles: number;
	totalSize: number;
};

interface TreeNode {
	name: string;
	type: "file" | "directory";
	path: string;
	size: number;
	children?: TreeNode[];
	content?: string;
	file_count: number;
	dir_count: number;
}

const config = new Conf<{ editor: EditorConfig }>({
	projectName: "gitingest-cli",
});

/** YARGS Setup ************************************/

const argv = yargs(hideBin(process.argv))
	.scriptName("gitingest")
	.usage("$0 [options] <repo-or-path>")
	.option("include", {
		alias: "i",
		array: true,
		type: "string",
		describe:
			"Glob or path patterns to include. Comma or multiple flags allowed.",
	})
	.option("exclude", {
		alias: "e",
		array: true,
		type: "string",
		describe:
			"Glob or path patterns to exclude. Comma or multiple flags allowed.",
	})
	.option("branch", {
		alias: "b",
		type: "string",
		describe: "Git branch to clone if using a repo URL",
	})
	.option("commit", {
		alias: "c",
		type: "string",
		describe: "Specific commit SHA to checkout if using a repo URL",
	})
	.option("max-size", {
		alias: "s",
		type: "number",
		default: DEFAULT_MAX_SIZE,
		describe: "Maximum file size to process in bytes (default 10MB)",
	})
	.option("pipe", {
		alias: "p",
		type: "boolean",
		describe: "Pipe final output to stdout instead of opening in editor",
	})
	.option("debug", {
		type: "boolean",
		describe: "Enable debug logging",
	})
	.option("bulk", {
		alias: "k",
		type: "boolean",
		describe: "Add AI processing instructions to the end of the output",
	})
	.example([
		[
			"$0 https://github.com/owner/repo",
			"Ingest a GitHub repo using default settings (exclude patterns, max size=10MB, etc.)",
		],
		[
			"$0 /local/path --include *.ts --exclude *.spec.*",
			"Ingest a local directory with custom patterns",
		],
		[
			"$0 https://github.com/owner/repo --branch develop --max-size 500000 --pipe",
			"Clone the 'develop' branch, limit file size to ~500KB, print output to stdout",
		],
	])
	.help()
	.alias("help", "h")
	.parseSync();

/** Main CLI Logic *********************************/

(async function main() {
	p.intro("🔎 GitIngest CLI");

	// Parse the leftover main argument as the source
	let [source] = argv._;
	if (!source) {
		// If no argument provided, prompt for one
		const promptSource = await p.text({
			message: "Enter a GitHub URL or local directory to ingest:",
			validate(value) {
				if (!value) return "Please provide a URL or local path";
				return undefined;
			},
		});
		if (p.isCancel(promptSource)) {
			p.cancel("Operation cancelled");
			process.exit(0);
		}
		source = promptSource;
	}

	const flags: IngestFlags = {
		include: parsePatterns(argv.include),
		exclude: parsePatterns(argv.exclude),
		branch: argv.branch,
		commit: argv.commit,
		maxSize: argv["max-size"],
		pipe: argv.pipe,
		debug: argv.debug,
		bulk: argv.bulk,
	};

	// Create log directory if needed
	await mkdirp(DEFAULT_LOG_DIR);
	await mkdirp(DEFAULT_SEARCHES_DIR);

	// Build a timestamp for the results
	const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
	const hashedSource = createHash("md5")
		.update(String(source))
		.digest("hex")
		.slice(0, 6);
	const resultFilename = `gitingest-${hashedSource}-${timestamp}.md`;
	const resultFilePath = resolve(DEFAULT_SEARCHES_DIR, resultFilename);

	if (flags.debug)
		console.log("[DEBUG] Ingesting from:", source, "Flags:", flags);

	// 1) If it's a GitHub URL, clone (with optional branch/commit).
	//    Else if local path, verify existence.
	let finalPath: string;
	let cleanupDir: string | null = null;

	if (isGitHubURL(String(source)).isValid) {
		const spinner = p.spinner();
		spinner.start("Cloning repository...");
		try {
			const tempDir = resolve(
				envPaths("gitingest").cache,
				`ingest-${hashedSource}-${Date.now()}`,
			);
			await mkdirp(tempDir);

			// Get normalized URL
			const { url } = isGitHubURL(String(source));

			// Decide how to clone:
			const cloneCommand = buildCloneCommand(
				url,
				tempDir,
				flags.branch,
				flags.commit,
			);

			if (flags.debug)
				console.log("[DEBUG] Running clone:", cloneCommand.join(" "));
			const r = spawnSync("git", cloneCommand.slice(1), {
				cwd: cloneCommand[0],
				stdio: ["ignore", "pipe", "pipe"],
			});
			if (r.status !== 0) {
				throw new Error(
					r.stderr.toString() ||
						"Git clone failed. Check your URL/branch/commit.",
				);
			}

			spinner.stop("Repository cloned successfully.");
			finalPath = tempDir;
			cleanupDir = tempDir; // We'll remove it at the end
		} catch (err) {
			spinner.stop("Clone failed.");
			p.cancel((err as Error).message || String(err));
			process.exit(1);
		}
	} else {
		// local path
		const localPath = resolve(String(source));
		if (!existsSync(localPath)) {
			p.cancel(`Local path not found: ${localPath}`);
			process.exit(1);
		}
		finalPath = localPath;
		cleanupDir = null; // won't remove a local directory
	}

	// 2) Recursively scan directory and build summary
	const spinner2 = p.spinner();
	spinner2.start("Building text digest...");
	try {
		const { summary, treeStr, contentStr } = await ingestDirectory(
			finalPath,
			flags,
		);
		spinner2.stop("Text digest built.");

		// 3) Format final output
		const output = [
			"# GitIngest\n",
			`**Source**: \`${String(source)}\`\n`,
			`**Timestamp**: ${new Date().toString()}\n`,
			"## Summary\n",
			`${summary}\n`,
			"## Directory Structure\n",
			"```\n",
			treeStr,
			"```\n",
			"## Files Content\n",
			"```\n",
			contentStr,
			"```\n",
		].join("\n");

		// 4) If --pipe, just log it all out and save file (but skip editor)
		writeFileSync(resultFilePath, output, "utf8");

		if (flags.pipe) {
			console.log(output);
			console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
		} else {
			// Try opening in editor if not piping
			const editorConfig = await getEditorConfig();
			if (!editorConfig.skipEditor && editorConfig.command) {
				try {
					execSync(`${editorConfig.command} "${resultFilePath}"`);
					p.note(
						`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
						"Opened in your configured editor.",
					);
				} catch {
					p.note(
						`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
						`Couldn't open with: ${editorConfig.command}`,
					);
				}
			} else {
				// Editor disabled or not set
				p.note(
					`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
					"You can open the file manually.",
				);
			}
		}

		// Return the results
		return { summary, treeStr, contentStr };
	} catch (err) {
		spinner2.stop("Digest build failed.");
		p.cancel(`Error: ${(err as Error).message}`);
	} finally {
		// 5) Clean up if we cloned a temp directory
		if (cleanupDir && existsSync(cleanupDir)) {
			try {
				// This removes the cloned repo.
				// Using a sync approach for simplicity:
				execSync(`rm -rf "${cleanupDir}"`);
				if (flags.debug)
					console.log("[DEBUG] Removed temporary dir:", cleanupDir);
			} catch {}
		}
	}

	p.outro("Done! 🎉");
	process.exit(0);
})().catch((err) => {
	p.cancel(`Uncaught error: ${err?.message || String(err)}`);
	process.exit(1);
});

/** Utility: parse user-provided globs/patterns */
function parsePatterns(input?: (string | number)[]): string[] {
	if (!input || input.length === 0) return [];
	// Flatten comma-separated or multi-flag usage
	const splitted: string[] = [];
	for (const val of input) {
		const strVal = String(val);
		if (strVal.includes(",")) {
			splitted.push(
				...strVal
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			);
		} else {
			splitted.push(strVal.trim());
		}
	}
	return splitted.filter(Boolean);
}

/** Utility: build a clone command array. 
    Returns an array: ["git", "clone", ...args].
    Always do shallow clone unless commit is specified. */
function buildCloneCommand(
	url: string,
	dest: string,
	branch?: string,
	commit?: string,
) {
	const base = ".";
	const args = ["clone", "--single-branch"];

	// If commit specified, we need full clone
	if (commit) {
		return [base, ...args, url, dest];
	}

	// Otherwise always do shallow clone
	args.push("--depth=1");

	// Add branch if specified
	if (branch) {
		args.push("--branch", branch);
	}

	args.push(url, dest);
	return [base, ...args];
}

/** Utility: check if a string looks like a GitHub URL and normalize it */
function isGitHubURL(str: string) {
	// Remove any leading/trailing whitespace
	str = str.trim();

	// If it starts with github.com, add https://
	if (str.startsWith("github.com/")) {
		str = "https://" + str;
	}

	// If it's just a path like "owner/repo", add github.com
	if (/^[\w-]+\/[\w-]+$/.test(str)) {
		str = "https://github.com/" + str;
	}

	// Now check if it's a valid GitHub URL
	const isValid = /^https?:\/\/(www\.)?github\.com\//i.test(str);

	// Return both the validity and the normalized URL
	return {
		isValid,
		url: isValid ? str : "",
	};
}

/** Utility: prompt for editor config if not set */
async function getEditorConfig(): Promise<EditorConfig> {
	const saved = config.get("editor");
	if (saved) return saved;

	const useEditor = await p.confirm({
		message: "Would you like to open results in an editor?",
		initialValue: true,
	});
	if (p.isCancel(useEditor)) {
		p.cancel("Setup cancelled");
		return { command: null, skipEditor: true };
	}
	if (!useEditor) {
		const noEditor: EditorConfig = { command: null, skipEditor: true };
		config.set("editor", noEditor);
		return noEditor;
	}

	const editorCommand = await p.text({
		message: "Enter editor command (e.g. 'code', 'vim', 'nano')",
		placeholder: "code",
		validate(value) {
			if (!value) return "Please enter a command";
			return undefined;
		},
	});
	if (p.isCancel(editorCommand)) {
		p.cancel("Setup cancelled");
		return { command: null, skipEditor: true };
	}
	const econf = { command: editorCommand, skipEditor: false };
	config.set("editor", econf);
	return econf;
}

/** Core: Ingest a directory (parsed from local or just-cloned) */
async function ingestDirectory(basePath: string, flags: IngestFlags) {
	// If user specified a commit, let's do the checkout now that we've cloned
	if (flags.commit) {
		const spinner = p.spinner();
		spinner.start(`Checking out commit ${flags.commit}...`);
		const checkout = spawnSync("git", ["checkout", flags.commit], {
			cwd: basePath,
			stdio: ["ignore", "pipe", "pipe"],
		});
		if (checkout.status !== 0) {
			spinner.stop("Checkout failed");
			throw new Error(
				checkout.stderr.toString() || "Failed to checkout commit",
			);
		}
		spinner.stop("Checked out commit.");
	}

	// We'll do a recursive scan
	const stats: ScanStats = { totalFiles: 0, totalSize: 0 };
	const rootNode = await scanDirectory(basePath, flags, 0, stats);

	if (!rootNode) {
		throw new Error("No files found or directory is empty after scanning.");
	}

	// Build summary
	const summaryLines: string[] = [];
	summaryLines.push(`Directory: ${basePath}`);
	summaryLines.push(`Files analyzed: ${rootNode.file_count ?? 0}`);
	if (
		flags.branch &&
		flags.branch.toLowerCase() !== "main" &&
		flags.branch.toLowerCase() !== "master"
	) {
		summaryLines.push(`Branch: ${flags.branch}`);
	}
	if (flags.commit) {
		summaryLines.push(`Commit: ${flags.commit}`);
	}

	// Build tree
	const treeStr = createTree(rootNode, "");

	// Collect file content
	const fileNodes: TreeNode[] = [];
	const maxSize = flags.maxSize ?? DEFAULT_MAX_SIZE;
	gatherFiles(rootNode, fileNodes, maxSize);

	// Merge into a single big string
	let contentStr = "";
	for (const f of fileNodes) {
		contentStr += `================================\nFile: ${f.path.replace(basePath, "")}\n================================\n`;
		contentStr += f.content ?? "[Content ignored or non-text file]\n";
		contentStr += "\n";
	}

	// Build bulk instructions if flag is set
	if (flags.bulk) {
		contentStr +=
			"\n---\nWhen I provide a set of files with paths and content, please return **one single shell script** that does the following:\n\n";
		contentStr += "1. Creates the necessary directories for all files.\n";
		contentStr +=
			"2. Outputs the final content of each file using `cat << 'EOF' > path/filename` ... `EOF`.\n";
		contentStr +=
			"3. Ensures it's a single code fence I can copy and paste into my terminal.\n";
		contentStr += "4. Ends with a success message.\n\n";
		contentStr +=
			"Use `#!/usr/bin/env bash` at the start and make sure each `cat` block ends with `EOF`.\n---\n";
	}

	// If very large, you might want to truncate, but we'll just do it as is
	const summary = summaryLines.join("\n");
	return { summary, treeStr, contentStr };
}

/** Recursively scans a directory, building a TreeNode */
async function scanDirectory(
	dir: string,
	options: IngestFlags,
	depth = 0,
	stats: ScanStats = { totalFiles: 0, totalSize: 0 },
): Promise<TreeNode | null> {
	if (depth > DIR_MAX_DEPTH) {
		if (options.debug) console.log("[DEBUG] Max depth reached:", dir);
		return null;
	}

	const stat = lstatSync(dir);
	if (!stat.isDirectory()) {
		return null;
	}

	if (
		stats.totalFiles >= DIR_MAX_FILES ||
		stats.totalSize >= DIR_MAX_TOTAL_SIZE
	) {
		if (options.debug) {
			console.log(
				"[DEBUG] Max files/size reached:",
				stats.totalFiles,
				stats.totalSize,
			);
		}
		return null;
	}

	const items = readdirSync(dir);
	const node: TreeNode = {
		name: basename(dir),
		path: dir,
		type: "directory",
		size: 0,
		children: [],
		file_count: 0,
		dir_count: 0,
	};

	for (const item of items) {
		const fullPath = resolve(dir, item);
		if (shouldExclude(fullPath, dir, options.exclude ?? [])) {
			continue;
		}

		if (
			(options.include ?? []).length > 0 &&
			!shouldInclude(fullPath, dir, options.include ?? [])
		) {
			continue;
		}

		const childStat = lstatSync(fullPath);
		if (childStat.isDirectory()) {
			const sub = await scanDirectory(fullPath, options, depth + 1, stats);
			if (sub) {
				node.children?.push(sub);
				node.size += sub.size;
				node.dir_count += 1 + (sub.dir_count ?? 0);
				node.file_count += sub.file_count ?? 0;
			}
		} else if (childStat.isFile()) {
			stats.totalFiles++;
			stats.totalSize += childStat.size;

			if (
				stats.totalFiles > DIR_MAX_FILES ||
				stats.totalSize > DIR_MAX_TOTAL_SIZE
			) {
				if (options.debug) {
					console.log(
						"[DEBUG] Max files/size reached:",
						stats.totalFiles,
						stats.totalSize,
					);
				}
				return node;
			}

			try {
				await fs.promises.access(fullPath);
			} catch {
				// File doesn't exist, that's fine
			}

			node.children?.push({
				name: item,
				path: fullPath,
				type: "file",
				size: childStat.size,
				file_count: 0,
				dir_count: 0,
			});
			node.size += childStat.size;
			node.file_count += 1;
		}
	}

	return node;
}

/** Decide if path should be excluded */
function shouldExclude(
	fullPath: string,
	basePath: string,
	excludes: string[],
): boolean {
	const rel = fullPath.replace(basePath, "").replace(/^[/\\]+/, "");
	for (const pattern of [...DEFAULT_IGNORE, ...excludes]) {
		if (matchPattern(rel, pattern)) {
			return true;
		}
	}
	return false;
}

/** Decide if path should be included (if any include patterns) */
function shouldInclude(
	fullPath: string,
	basePath: string,
	includes: string[],
): boolean {
	const rel = fullPath.replace(basePath, "").replace(/^[/\\]+/, "");
	for (const pattern of includes) {
		if (matchPattern(rel, pattern)) {
			return true;
		}
	}
	return false;
}

/** Very basic pattern matching for "fnmatch"-style globs */
function matchPattern(pathStr: string, pattern: string): boolean {
	// Simple wildcard match, e.g. *.js or foo/*.md
	// For brevity, do naive approach:
	const escaped = pattern
		.replace(/\./g, "\\.")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	const regex = new RegExp(`^${escaped}$`, "i");
	return regex.test(pathStr.replace(/\\/g, "/"));
}

/** Recursively traverse the tree to gather file nodes that are textual */
function gatherFiles(root: TreeNode, out: TreeNode[], maxSize: number) {
	if (root.type === "file") {
		// Attempt to read content if size < maxSize and it's likely text
		if (root.size <= maxSize) {
			const likelyText = isLikelyTextFile(root.path);
			if (likelyText) {
				try {
					const data = readFileSync(root.path, { encoding: "utf8" });
					root.content = data;
				} catch (err) {
					root.content = `[Error reading file: ${(err as Error).message}]`;
				}
			} else {
				root.content = "[Non-text file omitted]";
			}
		} else {
			root.content = "[Content ignored: file too large]";
		}
		out.push(root);
	} else if (root.type === "directory" && root.children) {
		for (const c of root.children) {
			gatherFiles(c, out, maxSize);
		}
	}
}

/** Basic check if a file is likely text by checking first few bytes */
function isLikelyTextFile(filePath: string): boolean {
	try {
		const buffer = readFileSync(filePath);
		if (!buffer.length) return false;
		// If we see many non-ASCII chars in first 1024, we assume binary
		const chunk = buffer.slice(0, 1024);
		let nonPrintable = 0;
		for (const currentByte of chunk) {
			if (currentByte === 0) {
				// definitely binary if we see a null
				return false;
			}
			// if below ASCII 9 or above 127 is suspicious
			if (currentByte < 9 || (currentByte > 127 && currentByte < 192)) {
				nonPrintable++;
			}
		}
		// If more than 30% are non-printable, treat as binary
		return nonPrintable / chunk.length < 0.3;
	} catch {
		return false;
	}
}

/** Create a tree-like string (similar to the python `_create_tree_structure`) */
function createTree(node: TreeNode, prefix: string, isLast = true): string {
	let tree = "";

	const branch = isLast ? "└── " : "├── ";
	const treeOutput = [
		prefix,
		branch,
		node.name,
		node.type === "directory" ? "/" : "",
		"\n",
	].join("");
	tree += treeOutput;

	if (node.type === "directory" && node.children && node.children.length > 0) {
		const newPrefix = prefix + (isLast ? "    " : "│   ");
		node.children.forEach((child, idx) => {
			const lastChild = node.children && idx === node.children.length - 1;
			tree += createTree(child, newPrefix, lastChild);
		});
	}

	return tree;
}
// test
// another test
