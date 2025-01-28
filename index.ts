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
};

type ScanStats = {
	totalFiles: number;
	totalSize: number;
};

type TreeNode = {
	name: string;
	type: "file" | "directory";
	size: number;
	path: string;
	content?: string;
	children?: TreeNode[];
	file_count?: number;
	dir_count?: number;
};

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

	if (isGitHubURL(String(source))) {
		const spinner = p.spinner();
		spinner.start("Cloning repository...");
		try {
			const tempDir = resolve(
				envPaths("gitingest").cache,
				`ingest-${hashedSource}-${Date.now()}`,
			);
			await mkdirp(tempDir);

			// Decide how to clone:
			const cloneCommand = buildCloneCommand(
				String(source),
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
				} catch (error) {
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
})().catch((error) => {
	p.cancel(`Uncaught error: ${error?.message || String(error)}`);
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
    We do shallow clone unless commit is specified. */
function buildCloneCommand(
	url: string,
	dest: string,
	branch?: string,
	commit?: string,
) {
	// We'll spawn "git" with some args
	// But we wrap it in an array so we can see the final command easily
	// The "working directory" will be "." by default, so we do:
	const base = ".";
	// If commit is specified, we do a full clone
	if (commit) {
		return [
			base,
			"clone",
			"--single-branch",
			url,
			dest,
			// We'll handle the checkout after
			// but for simplicity let's do the same approach as the python code:
			// We'll just do a full clone (no --depth=1)
		];
	}
	// If branch is specified and it's not main/master, do a shallow clone
	if (branch && !["main", "master"].includes(branch.toLowerCase())) {
		return [
			base,
			"clone",
			"--depth=1",
			"--single-branch",
			"--branch",
			branch,
			url,
			dest,
		];
	}
	// Otherwise shallow clone on default branch
	return [base, "clone", "--depth=1", "--single-branch", url, dest];
}

/** Utility: check if a string looks like a GitHub URL */
function isGitHubURL(str: string) {
	return /^https?:\/\/(www\.)?github\.com\//i.test(str);
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
	const rootNode = scanDirectory(basePath, basePath, flags, stats, 0);

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

	// If very large, you might want to truncate, but we'll just do it as is
	const summary = summaryLines.join("\n");
	return { summary, treeStr, contentStr };
}

/** Recursively scans a directory, building a TreeNode */
function scanDirectory(
	dirPath: string,
	basePath: string,
	flags: IngestFlags,
	stats: ScanStats,
	depth: number,
): TreeNode | null {
	if (depth > DIR_MAX_DEPTH) {
		if (flags.debug) console.log("[DEBUG] Max depth reached:", dirPath);
		return null;
	}
	if (!existsSync(dirPath)) return null;

	// Avoid re-scanning if we want to handle symlinks or repeated paths,
	// but for simplicity we skip that.
	// If you want, maintain a "seenPaths" set.

	const stat = lstatSync(dirPath);
	if (!stat.isDirectory()) {
		// It's a file, not a directory
		return {
			name: basename(dirPath),
			type: "file",
			size: stat.size,
			path: dirPath,
		};
	}

	// If directory, build node
	const node: TreeNode = {
		name: basename(dirPath),
		type: "directory",
		size: 0,
		path: dirPath,
		children: [],
		file_count: 0,
		dir_count: 0,
	};

	const items = readdirSync(dirPath);
	for (const item of items) {
		const fullPath = resolve(dirPath, item);
		// Exclude checks
		if (shouldExclude(fullPath, basePath, flags.exclude ?? [])) {
			continue;
		}

		// if we have include patterns, skip if it doesn't match any
		if (
			(flags.include ?? []).length > 0 &&
			!shouldInclude(fullPath, basePath, flags.include ?? [])
		) {
			continue;
		}

		// Recurse
		const childStat = lstatSync(fullPath);
		if (childStat.isSymbolicLink()) {
			// Resolve symlink safely
			// For brevity, skip or read real path:
			try {
				readFileSync(fullPath, "utf8");
				// This is naive. Typically you'd do fs.realpathSync.
				// We'll skip symlinks to avoid complexities:
				if (flags.debug) console.log("[DEBUG] Skipping symlink:", fullPath);
				continue;
			} catch {
				continue;
			}
		}

		if (
			stats.totalFiles >= DIR_MAX_FILES ||
			stats.totalSize >= DIR_MAX_TOTAL_SIZE
		) {
			if (flags.debug) console.log("[DEBUG] Max file limit or size reached");
			break;
		}

		if (childStat.isDirectory()) {
			const sub = scanDirectory(fullPath, basePath, flags, stats, depth + 1);
			if (sub) {
				if (node.children) {
					node.children.push(sub);
					node.dir_count = (node.dir_count ?? 0) + 1 + (sub.dir_count ?? 0);
					node.file_count = (node.file_count ?? 0) + (sub.file_count ?? 0);
					node.size += sub.size;
				}
			}
		} else if (childStat.isFile()) {
			// Count it
			stats.totalFiles++;
			stats.totalSize += childStat.size;
			if (
				stats.totalFiles > DIR_MAX_FILES ||
				stats.totalSize > DIR_MAX_TOTAL_SIZE
			) {
				if (flags.debug) console.log("[DEBUG] Exceeded limits, stopping scan");
				break;
			}
			const childNode: TreeNode = {
				name: item,
				type: "file",
				size: childStat.size,
				path: fullPath,
			};
			if (node.children) {
				node.children.push(childNode);
				node.file_count = (node.file_count ?? 0) + 1;
				node.size += childStat.size;
			}
		}
	}

	// Sort children (similar to python logic: README.md first,
	// then normal files, hidden files, normal dirs, hidden dirs)
	node.children = sortChildren(node.children || []);
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

/** Sort children according to the python approach (README, etc.) */
function sortChildren(children: TreeNode[]): TreeNode[] {
	// separate out files vs dirs
	const files = children.filter((c) => c.type === "file");
	const dirs = children.filter((c) => c.type === "directory");

	// readme first
	const readmeFiles = files.filter((f) => f.name.toLowerCase() === "readme.md");
	const otherFiles = files.filter((f) => f.name.toLowerCase() !== "readme.md");

	const regularFiles = otherFiles.filter((f) => !f.name.startsWith("."));
	const hiddenFiles = otherFiles.filter((f) => f.name.startsWith("."));
	const regularDirs = dirs.filter((d) => !d.name.startsWith("."));
	const hiddenDirs = dirs.filter((d) => d.name.startsWith("."));

	// sort each group
	regularFiles.sort((a, b) => a.name.localeCompare(b.name));
	hiddenFiles.sort((a, b) => a.name.localeCompare(b.name));
	regularDirs.sort((a, b) => a.name.localeCompare(b.name));
	hiddenDirs.sort((a, b) => a.name.localeCompare(b.name));

	return [
		...readmeFiles,
		...regularFiles,
		...hiddenFiles,
		...regularDirs,
		...hiddenDirs,
	];
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
