import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCLI } from "./test-helpers";
import { nanoid } from "nanoid";
import envPaths from "env-paths";

describe("Repository Caching", () => {
	let repoPath: string;
	let cacheDir: string;

	beforeEach(() => {
		// Create a brand new temp directory for the test repo
		const randomFolder = `cache-test-${nanoid()}`;
		repoPath = join(tmpdir(), randomFolder);
		cacheDir = envPaths("ghi").cache;

		// Wipe if something is leftover
		rmSync(repoPath, { recursive: true, force: true });
		mkdirSync(repoPath, { recursive: true });

		// Initialize git repo
		execSync("git init --template=''", { cwd: repoPath });
		execSync("git checkout -b main", { cwd: repoPath });

		// Create & commit initial file
		writeFileSync(resolve(repoPath, "initial.js"), "console.log('initial')");
		execSync("git add initial.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
			{ cwd: repoPath },
		);
	});

	it("handles local repositories without cloning", async () => {
		// First run on local repo
		const result1 = await runCLI([repoPath, "--pipe"]);
		expect(result1.exitCode).toBe(0);
		expect(result1.stdout).toContain("initial.js");
		expect(result1.stdout).not.toContain("Repository cloned");
		expect(result1.stdout).not.toContain("Repository updated");

		// Add a new file
		writeFileSync(resolve(repoPath, "new.js"), "console.log('new')");
		execSync("git add new.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Add new file"',
			{ cwd: repoPath },
		);

		// Second run should see new file without cloning/updating
		const result2 = await runCLI([repoPath, "--pipe"]);
		expect(result2.exitCode).toBe(0);
		expect(result2.stdout).toContain("initial.js");
		expect(result2.stdout).toContain("new.js");
		expect(result2.stdout).not.toContain("Repository cloned");
		expect(result2.stdout).not.toContain("Repository updated");
	}, { timeout: 30000 });

	it("handles remote repositories with caching", async () => {
		// Create a "remote" repo
		const remoteFolder = `remote-${nanoid()}`;
		const remotePath = join(tmpdir(), remoteFolder);
		rmSync(remotePath, { recursive: true, force: true });
		mkdirSync(remotePath, { recursive: true });

		// Initialize a normal repo first
		execSync("git init --template=''", { cwd: remotePath });
		execSync("git checkout -b main", { cwd: remotePath });
		writeFileSync(resolve(remotePath, "initial.js"), "console.log('initial')");
		execSync("git add initial.js", { cwd: remotePath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
			{ cwd: remotePath },
		);

		// First run to clone remote
		const remoteUrl = `file://${remotePath}`;
		const result1 = await runCLI([remoteUrl, "--use-regular-git", "--pipe"]);
		expect(result1.exitCode).toBe(0);

		// Extract the saved file path from the output
		const savedMatch = result1.stdout.match(/RESULTS_SAVED: (.+\.md)/);
		expect(savedMatch).toBeTruthy();
		const [, savedPath] = savedMatch;
		const savedContent = readFileSync(savedPath, "utf8");
		expect(savedContent).toContain("initial.js");

		// Add a new file and push to remote
		writeFileSync(resolve(remotePath, "new.js"), "console.log('new')");
		execSync("git add new.js", { cwd: remotePath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Add new file"',
			{ cwd: remotePath },
		);

		// Second run should update cache
		const result2 = await runCLI([remoteUrl, "--use-regular-git", "--pipe"]);
		expect(result2.exitCode).toBe(0);

		// Check the saved content for the second run
		const savedMatch2 = result2.stdout.match(/RESULTS_SAVED: (.+\.md)/);
		expect(savedMatch2).toBeTruthy();
		const [, savedPath2] = savedMatch2;
		const savedContent2 = readFileSync(savedPath2, "utf8");
		expect(savedContent2).toContain("initial.js");
		expect(savedContent2).toContain("new.js");

		// Corrupt the git repo
		const gitDir = join(cacheDir, `ingest-${result1.hashedSource}`, ".git");
		rmSync(gitDir, { recursive: true, force: true });

		// Third run should detect corruption and reclone
		const result3 = await runCLI([remoteUrl, "--use-regular-git", "--pipe"]);
		expect(result3.exitCode).toBe(0);

		// Extract the saved file path from the output
		const savedMatch3 = result3.stdout.match(/RESULTS_SAVED: (.+\.md)/);
		expect(savedMatch3).toBeTruthy();
		const [, savedPath3] = savedMatch3;
		const savedContent3 = readFileSync(savedPath3, "utf8");
		expect(savedContent3).toContain("initial.js");
		expect(savedContent3).toContain("new.js");
	}, { timeout: 30000 });
});
