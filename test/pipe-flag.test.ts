// test/pipe-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --pipe", () => {
	it("outputs to stdout when --pipe is used", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// With --pipe, we expect the full output in stdout
		expect(stdout).toContain("# ghi");
		expect(stdout).toContain("## Summary");
		expect(stdout).toContain("## Directory Structure");
	});
});
