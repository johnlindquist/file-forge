#!/usr/bin/env node

/**
 * ghi – GitHub Ingest
 *
 * This version uses async file system operations with parallelization,
 * leverages simple‑git by default for Git operations (or, if the flag is set,
 * uses direct system Git via execSync), and avoids top‑level return statements.
 */

import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import * as p from "@clack/prompts";
import { format } from "date-fns";
import { mkdirp } from "mkdirp";
import envPaths from "env-paths";
import Conf from "conf";
import { resolve, basename, join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { globby } from "globby";
import ignore from "ignore";
import { fileURLToPath } from "node:url";
import clipboard from "clipboardy";
import { promises as fs } from "fs";
import simpleGit from "simple-git";
import { execSync } from "node:child_process";

/** Read package.json for version info */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, "..", "package.json");
let packageJson: { version: string } = { version: "0.0.0" };
try {
	const pkgContent = await fs.readFile(packagePath, "utf8");
	packageJson = JSON.parse(pkgContent);
} catch {
	// fallback version
}

/** Constants */
const RESULTS_SAVED_MARKER = "RESULTS_SAVED:";
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_LOG_DIR = envPaths("ghi").log;
const DEFAULT_SEARCHES_DIR = envPaths("ghi").config;
const DEFAULT_IGNORE = [
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
];
const ARTIFACT_FILES = [
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"*.min.js",
	"*.bundle.js",
	"*.chunk.js",
	"*.map",
	"*.mp4",
	"*.mov",
	"*.avi",
	"*.mkv",
	"*.iso",
	"*.tar",
	"*.tar.gz",
	"*.zip",
	"*.rar",
	"*.7z",
	"*.sqlite",
	"*.db",
	"*.pdf",
	"*.docx",
	"*.xlsx",
	"*.pptx",
];

const DIR_MAX_DEPTH = 20;
const DIR_MAX_FILES = 10000;
const DIR_MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_EDITOR_SIZE = 5 * 1024 * 1024; // 5 MB

/** Types */
type EditorConfig = {
	command: string | null;
	skipEditor: boolean;
};

type IngestFlags = {
	include?: string[];
	exclude?: string[];
	branch?: string;
	commit?: string;
	maxSize?: number;
	pipe?: boolean;
	debug?: boolean;
	bulk?: boolean;
	ignore?: boolean;
	skipArtifacts?: boolean;
	clipboard?: boolean;
	noEditor?: boolean;
	find?: string[];
	require?: string[];
	useRegularGit?: boolean;
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
	parent?: TreeNode;
}

/** Global configuration for editor settings */
const config = new Conf<{ editor: EditorConfig }>({
	projectName: "ghi",
});

/** CLI Argument Parsing */
const argv = yargs(hideBin(process.argv))
	.scriptName("ghi")
	.usage("$0 [options] <repo-or-path>")
	.version("version", "Show version number", packageJson.version)
	.alias("version", "v")
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
	.option("find", {
		alias: "f",
		array: true,
		type: "string",
		describe: "Find files containing ANY of these terms (OR).",
	})
	.option("require", {
		alias: "r",
		array: true,
		type: "string",
		describe: "Find files containing ALL of these terms (AND).",
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
	.option("ignore", {
		type: "boolean",
		default: true,
		describe: "Whether to respect .gitignore files",
	})
	.option("skip-artifacts", {
		type: "boolean",
		default: true,
		describe: "Skip dependency files, build artifacts, and generated assets",
	})
	.option("clipboard", {
		alias: "y",
		type: "boolean",
		describe: "Copy results to clipboard",
	})
	.option("no-editor", {
		alias: "n",
		type: "boolean",
		describe: "Save results to file but don't open in editor",
	})
	.option("use-regular-git", {
		type: "boolean",
		default: false,
		describe:
			"Use regular system Git commands (authenticated git) instead of simple-git",
	})
	.help()
	.alias("help", "h")
	.parseSync();

const flags: IngestFlags = {
	include: parsePatterns(argv.include),
	exclude: parsePatterns(argv.exclude),
	branch: argv.branch,
	commit: argv.commit,
	maxSize: argv["max-size"],
	pipe: argv.pipe,
	debug: argv.debug,
	bulk: argv.bulk,
	ignore: Boolean(argv.ignore),
	skipArtifacts: Boolean(argv["skip-artifacts"]),
	clipboard: Boolean(argv.clipboard),
	noEditor: Boolean(argv["no-editor"]),
	find: parsePatterns(argv.find),
	require: parsePatterns(argv.require),
	useRegularGit: Boolean(argv["use-regular-git"]),
};

let [source] = argv._;
if (!source) {
	source = process.cwd();
	if (flags.debug)
		console.log("[DEBUG] No source provided, using current directory:", source);
}

await mkdirp(DEFAULT_LOG_DIR);
await mkdirp(DEFAULT_SEARCHES_DIR);

const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
const hashedSource = createHash("md5")
	.update(String(source))
	.digest("hex")
	.slice(0, 6);
const resultFilename = `ghi-${hashedSource}-${timestamp}.md`;
const resultFilePath = resolve(DEFAULT_SEARCHES_DIR, resultFilename);

if (flags.debug)
	console.log("[DEBUG] Ingesting from:", source, "Flags:", flags);

const introLines = ["🔍 ghi Analysis", `\nAnalyzing: ${source}`];
if (flags.find?.length)
	introLines.push(`Finding files containing: ${flags.find.join(", ")}`);
if (flags.include?.length)
	introLines.push(`Including patterns: ${flags.include.join(", ")}`);
if (flags.exclude?.length)
	introLines.push(`Excluding patterns: ${flags.exclude.join(", ")}`);
if (flags.branch) introLines.push(`Using branch: ${flags.branch}`);
if (flags.commit) introLines.push(`At commit: ${flags.commit}`);
if (flags.maxSize && flags.maxSize !== DEFAULT_MAX_SIZE)
	introLines.push(`Max file size: ${Math.round(flags.maxSize / 1024)}KB`);
if (flags.skipArtifacts)
	introLines.push("Skipping build artifacts and generated files");
if (!flags.ignore) introLines.push("Ignoring .gitignore rules");
p.intro(introLines.join("\n"));

let finalPath: string;
let cleanupDir: string | null = null;

// --- CLONE STEP ---
if (isGitHubURL(String(source)).isValid) {
	const spinner = p.spinner();
	spinner.start("Cloning repository...");
	try {
		const tempDir = resolve(
			envPaths("ghi").cache,
			`ingest-${hashedSource}-${Date.now()}`,
		);
		await mkdirp(tempDir);
		const { url } = isGitHubURL(String(source));
		if (flags.useRegularGit) {
			// Use direct git commands via execSync
			let cmd = "git clone";
			if (!flags.commit) {
				cmd += " --depth=1";
				if (flags.branch) cmd += ` --branch ${flags.branch}`;
			}
			cmd += ` ${url} ${tempDir}`;
			execSync(cmd, { stdio: "pipe" });
		} else {
			const git = simpleGit();
			if (flags.commit) {
				await git.clone(url, tempDir);
			} else {
				const cloneOptions = ["--depth=1"];
				if (flags.branch) {
					cloneOptions.push("--branch", flags.branch);
				}
				await git.clone(url, tempDir, cloneOptions);
			}
		}
		spinner.stop("Repository cloned successfully.");
		finalPath = tempDir;
		cleanupDir = tempDir;
	} catch (err: any) {
		spinner.stop("Clone failed.");
		p.cancel(err.message || String(err));
		if (!process.env["VITEST"]) process.exit(1);
		else throw err;
	}
} else {
	// Local directory
	const localPath = resolve(String(source));
	if (!(await fileExists(localPath))) {
		p.cancel(`Local path not found: ${localPath}`);
		if (!process.env["VITEST"]) process.exit(1);
		else throw new Error(`Local path not found: ${localPath}`);
	}
	finalPath = localPath;
	cleanupDir = null;
}

// --- BUILD DIGEST ---
const spinner2 = p.spinner();
spinner2.start("Building text digest...");
let digest: { summary: string; treeStr: string; contentStr: string };
try {
	digest = await ingestDirectory(finalPath, flags);
	spinner2.stop("Text digest built.");
} catch (err: any) {
	spinner2.stop("Digest build failed.");
	p.cancel(`Error: ${err.message}`);
	if (!process.env["VITEST"]) process.exit(1);
	else throw err;
}

const output = [
	"# ghi\n",
	`**Source**: \`${String(source)}\`\n`,
	`**Timestamp**: ${new Date().toString()}\n`,
	"## Summary\n",
	`${digest.summary}\n`,
	"## Directory Structure\n",
	"```\n" + digest.treeStr + "\n```\n",
	"## Files Content\n",
	"```\n" + digest.contentStr + "\n```\n",
].join("\n");

// Log summary and tree structure to console
const summaryOutput = [
	"# ghi\n",
	`**Source**: \`${String(source)}\`\n`,
	`**Timestamp**: ${new Date().toString()}\n`,
	"## Summary\n",
	`${digest.summary}\n`,
	"## Directory Structure\n",
	"```\n" + digest.treeStr + "\n```\n",
].join("\n");

console.log(summaryOutput);

try {
	await fs.writeFile(resultFilePath, output, "utf8");
} catch (err: any) {
	p.cancel(`Error writing output file: ${err.message}`);
	if (!process.env["VITEST"]) process.exit(1);
}

const fileSize = Buffer.byteLength(output, "utf8");
if (fileSize > MAX_EDITOR_SIZE) {
	p.note(
		`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
		`Results saved to file (${Math.round(fileSize / 1024 / 1024)}MB). File too large for editor, open it manually.`,
	);
	if (!process.env["VITEST"]) process.exit(0);
} else {
	if (flags.clipboard) {
		try {
			await clipboard.write(output);
			p.note("Results copied to clipboard!");
		} catch (err: any) {
			p.note(`Failed to copy to clipboard: ${err.message}`);
		}
	}
	if (flags.pipe) {
		console.log(output);
		console.log(`\n${RESULTS_SAVED_MARKER} ${resultFilePath}`);
	} else if (flags.noEditor) {
		p.note(
			`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
			"Results saved to file.",
		);
	} else {
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
			p.note(
				`${RESULTS_SAVED_MARKER} ${resultFilePath}`,
				"You can open the file manually.",
			);
		}
	}
}

p.outro("Done! 🎉");
if (!process.env["VITEST"]) process.exit(0);

// handle uncaught errors
process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
	if (!process.env["VITEST"]) process.exit(1);
	else throw err;
});

/** Helper: Asynchronously check if a file/directory exists */
async function fileExists(path: string): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

/** Utility: Parse user-supplied globs/patterns */
function parsePatterns(input?: (string | number)[]): string[] {
	if (!input || input.length === 0) return [];
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

/** Utility: Check if a string looks like a GitHub URL */
export function isGitHubURL(input: string) {
	const str = input.trim();
	if (/^https?:\/\/(www\.)?github\.com\//i.test(str))
		return { isValid: true, url: str };
	if (str.startsWith("github.com/"))
		return { isValid: true, url: `https://${str}` };
	return { isValid: false, url: "" };
}

/** Prompt for editor configuration if not set */
async function getEditorConfig(): Promise<EditorConfig> {
	const saved = config.get("editor");
	if (saved) return saved;
	const useEditor = await p.confirm({
		message: "Would you like to open results in an editor?",
		initialValue: true,
	});
	if (p.isCancel(useEditor)) {
		p.cancel("Setup cancelled");
		if (!process.env["VITEST"]) process.exit(1);
		throw new Error("Editor setup cancelled");
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
		if (!process.env["VITEST"]) process.exit(1);
		throw new Error("Editor setup cancelled");
	}
	const econf = { command: editorCommand, skipEditor: false };
	config.set("editor", econf);
	return econf;
}

/** Core: Ingest a directory or repository */
export async function ingestDirectory(basePath: string, flags: IngestFlags) {
	if (flags.branch || flags.commit) {
		const spinner = p.spinner();
		if (!(await fileExists(join(basePath, ".git")))) {
			throw new Error("Cannot checkout branch/commit: not a git repository");
		}
		if (flags.useRegularGit) {
			try {
				spinner.start("Checking out using regular git commands...");
				execSync("git clean -fdx", { cwd: basePath });
				execSync("git reset --hard", { cwd: basePath });
				if (flags.branch) {
					spinner.start(`Checking out branch ${flags.branch}...`);
					execSync("git clean -fdx", { cwd: basePath });
					execSync("git reset --hard", { cwd: basePath });
					execSync(`git checkout ${flags.branch}`, { cwd: basePath });
					spinner.stop("Branch checked out.");
					execSync("git clean -fdx", { cwd: basePath });
					execSync("git reset --hard", { cwd: basePath });
				}
				if (flags.commit) {
					spinner.start(`Checking out commit ${flags.commit}...`);
					execSync("git clean -fdx", { cwd: basePath });
					execSync("git reset --hard", { cwd: basePath });
					execSync(`git checkout ${flags.commit}`, { cwd: basePath });
					spinner.stop("Checked out commit.");
					execSync("git clean -fdx", { cwd: basePath });
					execSync("git reset --hard", { cwd: basePath });
				}
			} catch (error: any) {
				spinner.stop("Checkout failed");
				throw new Error(
					error.message || "Failed to checkout using regular git commands",
				);
			}
		} else {
			const git = simpleGit(basePath);
			await git.clean("f", ["-d"]);
			await git.reset("hard");
			if (flags.branch) {
				spinner.start(`Checking out branch ${flags.branch}...`);
				await git.clean("f", ["-d"]);
				await git.reset("hard");
				try {
					await git.checkout(flags.branch);
					spinner.stop("Branch checked out.");
				} catch (error: any) {
					spinner.stop("Branch checkout failed");
					throw new Error(error.message || "Failed to checkout branch");
				}
				await git.clean("f", ["-d"]);
				await git.reset("hard");
			}
			if (flags.commit) {
				spinner.start(`Checking out commit ${flags.commit}...`);
				await git.clean("f", ["-d"]);
				await git.reset("hard");
				try {
					await git.checkout(flags.commit);
					spinner.stop("Checked out commit.");
				} catch (error: any) {
					spinner.stop("Checkout failed");
					throw new Error(error.message || "Failed to checkout commit");
				}
				await git.clean("f", ["-d"]);
				await git.reset("hard");
			}
		}
	}

	const stats: ScanStats = { totalFiles: 0, totalSize: 0 };
	const rootNode = await scanDirectory(basePath, flags, 0, stats);
	if (!rootNode)
		throw new Error("No files found or directory is empty after scanning.");

	// Sort the tree for consistent ordering
	sortTree(rootNode);

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
	if (flags.commit) summaryLines.push(`Commit: ${flags.commit}`);

	const treeStr = createTree(rootNode, "");
	const maxSize = flags.maxSize ?? DEFAULT_MAX_SIZE;
	const fileNodes = await gatherFiles(rootNode, maxSize);

	let contentStr = "";
	for (const f of fileNodes) {
		contentStr += `================================\nFile: ${f.path.replace(
			basePath,
			"",
		)}\n================================\n`;
		contentStr += f.content ?? "[Content ignored or non-text file]\n";
		contentStr += "\n";
	}

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

	return { summary: summaryLines.join("\n"), treeStr, contentStr };
}

/** Core: Recursively scan a directory using async fs operations */
export async function scanDirectory(
	dir: string,
	options: IngestFlags,
	depth = 0,
	stats: ScanStats = { totalFiles: 0, totalSize: 0 },
): Promise<TreeNode | null> {
	if (depth > DIR_MAX_DEPTH) {
		if (options.debug) console.log("[DEBUG] Max depth reached:", dir);
		return null;
	}
	let stat;
	try {
		stat = await fs.lstat(dir);
	} catch {
		return null;
	}
	if (!stat.isDirectory()) return null;
	if (
		stats.totalFiles >= DIR_MAX_FILES ||
		stats.totalSize >= DIR_MAX_TOTAL_SIZE
	) {
		if (options.debug)
			console.log(
				"[DEBUG] Max files/size reached:",
				stats.totalFiles,
				stats.totalSize,
			);
		return null;
	}

	let gitignorePatterns: string[] = [];
	const gitignorePath = join(dir, ".gitignore");
	if ((await fileExists(gitignorePath)) && options.ignore !== false) {
		try {
			const ig = ignore();
			const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
			ig.add(gitignoreContent);
			gitignorePatterns = gitignoreContent
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => line && !line.startsWith("#"));
		} catch {}
	}

	const patterns = options.include?.length
		? options.include
		: ["**/*", "**/.*"];
	const ignorePatterns =
		options.ignore === false
			? [...(options.exclude ?? [])]
			: [
					...DEFAULT_IGNORE,
					...(options.skipArtifacts ? ARTIFACT_FILES : []),
					...gitignorePatterns,
					...(options.exclude ?? []),
				];

	if (options.debug) {
		console.log("[DEBUG] Globby patterns:", patterns);
		console.log("[DEBUG] Globby ignore patterns:", ignorePatterns);
	}

	const files = await globby(patterns, {
		cwd: dir,
		ignore: ignorePatterns,
		dot: false,
		absolute: true,
		onlyFiles: true,
	});

	let filteredFiles = files;
	if (
		(options.find && options.find.length) ||
		(options.require && options.require.length)
	) {
		filteredFiles = await filterFilesByContent(
			files,
			options.find,
			options.require,
		);
	}

	if (options.debug) {
		console.log("[DEBUG] Globby found files:", filteredFiles);
	}
	if (!filteredFiles.length) return null;

	const node: TreeNode = {
		name: basename(dir),
		path: dir,
		type: "directory",
		size: 0,
		children: [],
		file_count: 0,
		dir_count: 0,
	};

	// Process files sequentially to preserve ordering
	for (const file of filteredFiles) {
		try {
			const fstat = await fs.lstat(file);
			stats.totalFiles++;
			stats.totalSize += fstat.size;
			if (
				stats.totalFiles > DIR_MAX_FILES ||
				stats.totalSize > DIR_MAX_TOTAL_SIZE
			) {
				if (options.debug)
					console.log(
						"[DEBUG] Max files/size reached:",
						stats.totalFiles,
						stats.totalSize,
					);
				break;
			}
			const relPath = file.slice(dir.length + 1);
			const segments = relPath.split(/[/\\]/);
			let currentNode = node;
			for (let i = 0; i < segments.length - 1; i++) {
				const segment = segments[i];
				if (!segment) continue;
				let child = currentNode.children?.find(
					(n) => n.type === "directory" && n.name === segment,
				);
				if (!child) {
					child = {
						name: segment,
						path: resolve(currentNode.path, segment),
						type: "directory",
						size: 0,
						children: [],
						file_count: 0,
						dir_count: 0,
						parent: currentNode,
					};
					currentNode.children = currentNode.children || [];
					currentNode.children.push(child);
					currentNode.dir_count++;
				}
				currentNode = child;
			}
			const fileName = segments[segments.length - 1];
			if (fileName) {
				const fileNode: TreeNode = {
					name: fileName,
					path: file,
					type: "file",
					size: fstat.size,
					file_count: 0,
					dir_count: 0,
					parent: currentNode,
				};
				currentNode.children?.push(fileNode);
				currentNode.file_count++;
				currentNode.size += fstat.size;
				let pNode = currentNode;
				while (pNode && pNode !== node) {
					pNode.size += fstat.size;
					pNode = pNode.parent!;
				}
				node.size += fstat.size;
			}
		} catch (err) {
			if (options.debug)
				console.log("[DEBUG] Error processing file:", file, err);
		}
	}
	node.file_count = stats.totalFiles;
	return node.children && node.children.length > 0 ? node : null;
}

/** Helper: Recursively sort the tree's children alphabetically by name */
function sortTree(node: TreeNode) {
	if (node.children) {
		node.children.sort((a, b) => a.name.localeCompare(b.name));
		for (const child of node.children) {
			if (child.type === "directory") sortTree(child);
		}
	}
}

/** Helper: Filter files by content using async file reads */
async function filterFilesByContent(
	files: string[],
	findTerms: string | string[] = [],
	requireTerms: string | string[] = [],
): Promise<string[]> {
	if (!findTerms?.length && !requireTerms?.length) return files;
	const matchingFiles: Set<string> = new Set();
	const orTerms = Array.isArray(findTerms) ? findTerms : [findTerms];
	const andTerms = Array.isArray(requireTerms) ? requireTerms : [requireTerms];
	const orTermsLower = orTerms.map((t) => t.toLowerCase());
	const andTermsLower = andTerms.map((t) => t.toLowerCase());

	await Promise.all(
		files.map(async (file) => {
			const filenameLower = basename(file).toLowerCase();
			if (orTermsLower.some((term) => filenameLower.includes(term))) {
				matchingFiles.add(file);
				return;
			}
			if (!(await isLikelyTextFile(file))) return;
			let fstat;
			try {
				fstat = await fs.lstat(file);
			} catch {
				return;
			}
			if (fstat.size > DEFAULT_MAX_SIZE) return;
			let content;
			try {
				content = (await fs.readFile(file, "utf8")).toLowerCase();
			} catch (err) {
				return;
			}
			if (orTermsLower.some((term) => content.includes(term))) {
				matchingFiles.add(file);
				return;
			}
			if (
				andTermsLower.length &&
				andTermsLower.every((term) => content.includes(term))
			) {
				matchingFiles.add(file);
			}
		}),
	);
	return Array.from(matchingFiles);
}

/** Helper: Recursively gather file nodes and read their content */
async function gatherFiles(
	root: TreeNode,
	maxSize: number,
): Promise<TreeNode[]> {
	if (root.type === "file") {
		if (root.size > maxSize) {
			root.content = "[Content ignored: file too large]";
		} else if (await isLikelyTextFile(root.path)) {
			try {
				root.content = await fs.readFile(root.path, "utf8");
			} catch (err: any) {
				root.content = `[Error reading file: ${err.message}]`;
			}
		} else {
			root.content = "[Non-text file omitted]";
		}
		return [root];
	} else if (root.type === "directory" && root.children) {
		const results = await Promise.all(
			root.children.map((child) => gatherFiles(child, maxSize)),
		);
		return results.flat();
	}
	return [];
}

/** Helper: Check if a file is likely a text file by reading its first bytes */
async function isLikelyTextFile(filePath: string): Promise<boolean> {
	try {
		const buffer = await fs.readFile(filePath);
		if (!buffer.length) return false;
		const chunk = buffer.slice(0, 1024);
		let nonPrintable = 0;
		for (const byte of chunk) {
			if (byte === 0) return false;
			if (byte < 9 || (byte > 127 && byte < 192)) nonPrintable++;
		}
		return nonPrintable / chunk.length < 0.3;
	} catch {
		return false;
	}
}

/** Create a tree-like string representation of the directory structure */
function createTree(node: TreeNode, prefix: string, isLast = true): string {
	const branch = isLast ? "└── " : "├── ";
	let tree = `${prefix}${branch}${node.name}${
		node.type === "directory" ? "/" : ""
	}\n`;
	if (node.type === "directory" && node.children && node.children.length > 0) {
		const newPrefix = prefix + (isLast ? "    " : "│   ");
		node.children.forEach((child, idx) => {
			const lastChild = idx === node.children!.length - 1;
			tree += createTree(child, newPrefix, lastChild);
		});
	}
	return tree;
}
