// test/commit-flag.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

describe("CLI --commit", () => {
	const repoPath = resolve(__dirname, "fixtures/branch-fixture");
	let firstCommitSha: string;

	beforeEach(() => {
		// Clean up any existing directory
		rmSync(repoPath, { recursive: true, force: true });

		// Create test directory and files
		mkdirSync(repoPath, { recursive: true });
		writeFileSync(resolve(repoPath, "main.js"), "console.log('main')");

		// Initialize git repo and create branches
		execSync("git init", { cwd: repoPath });
		execSync("git checkout -b main", { cwd: repoPath }); // Create main branch explicitly
		execSync("git add main.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
			{ cwd: repoPath },
		);

		// Store the first commit SHA
		firstCommitSha = execSync("git rev-parse HEAD", { cwd: repoPath })
			.toString()
			.trim();

		// Remove main.js before creating feature branch
		rmSync(resolve(repoPath, "main.js"));
		execSync("git rm main.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Remove main.js"',
			{ cwd: repoPath },
		);

		// Create feature branch with its own file
		execSync("git checkout -b some-feature-branch", { cwd: repoPath });
		writeFileSync(resolve(repoPath, "feature.js"), "console.log('feature')");
		execSync("git add feature.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Feature commit"',
			{ cwd: repoPath },
		);
	});

	it("checks out the specified commit SHA after cloning", async () => {
		const { stdout, stderr, exitCode } = await runCLI([
			repoPath,
			"--commit",
			firstCommitSha,
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Checked out commit");
		expect(stdout).toMatch(new RegExp(`Commit: ${firstCommitSha}`, "i"));
		expect(stdout).toContain("main.js"); // File from first commit
		expect(stdout).not.toContain("feature.js"); // File from second commit
	});
});
