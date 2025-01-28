// test/branch-flag.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

describe("CLI --branch", () => {
	const repoPath = resolve(__dirname, "fixtures/branch-fixture");

	beforeEach(() => {
		// Create test directory and files
		mkdirSync(repoPath, { recursive: true });
		writeFileSync(resolve(repoPath, "main.js"), "console.log('main')");

		// Initialize git repo and create branches
		execSync("git init", { cwd: repoPath });
		execSync("git add main.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
			{ cwd: repoPath },
		);
		execSync("git checkout -b some-feature-branch", { cwd: repoPath });

		// Create and commit feature file
		writeFileSync(resolve(repoPath, "feature.js"), "console.log('feature')");
		execSync("git add feature.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Feature commit"',
			{ cwd: repoPath },
		);
	});

	it("attempts to clone the specified branch from a Git repository", async () => {
		const { stdout, stderr, exitCode } = await runCLI([
			repoPath,
			"--branch",
			"some-feature-branch",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Text digest built");
		expect(stdout).toMatch(/Branch: some-feature-branch/i);
		expect(stdout).toContain("feature.js"); // File only in feature branch
		expect(stdout).not.toContain("main.js"); // File only in main branch
	});
});
