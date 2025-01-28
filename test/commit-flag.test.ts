// test/commit-flag.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { runCLI } from "./test-helpers";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

describe("CLI --commit", () => {
	const repoPath = resolve(__dirname, "fixtures/branch-fixture");

	beforeEach(() => {
		// Initialize git repo and create branches
		execSync("git init", { cwd: repoPath });
		execSync("git add main.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Initial commit"',
			{ cwd: repoPath },
		);
		execSync("git checkout -b some-feature-branch", { cwd: repoPath });
		execSync("git add feature.js", { cwd: repoPath });
		execSync(
			'git -c user.name="Test" -c user.email="test@example.com" commit -m "Feature commit"',
			{ cwd: repoPath },
		);
	});

	it("checks out the specified commit SHA after cloning", async () => {
		// Get the first commit SHA (the one with main.js)
		const commitSha = execSync("git rev-parse main", { cwd: repoPath })
			.toString()
			.trim();

		const { stdout, stderr, exitCode } = await runCLI([
			repoPath,
			"--commit",
			commitSha,
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		expect(stdout).toContain("Checked out commit");
		expect(stdout).toMatch(new RegExp(`Commit: ${commitSha}`, "i"));
		expect(stdout).toContain("main.js"); // File from first commit
		expect(stdout).not.toContain("feature.js"); // File from second commit
	});
});
