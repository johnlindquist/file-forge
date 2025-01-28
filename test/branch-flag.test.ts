// test/branch-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { resolve } from "node:path";

describe("CLI --branch", () => {
	it("attempts to clone the specified branch from a Git repository", async () => {
		const repoPath = resolve(__dirname, "fixtures/branch-fixture");
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
