// test/commit-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

describe("CLI --commit", () => {
	it("checks out the specified commit SHA after cloning", async () => {
		const repoPath = resolve(__dirname, "fixtures/branch-fixture");
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
