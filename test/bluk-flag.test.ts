// test/bulk-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --bulk", () => {
	it("appends AI usage instructions to the end of the output", async () => {
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--bulk",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// At the very end of the output we should see the instructions
		expect(stdout).toContain(
			"When I provide a set of files with paths and content, please return **one single shell script**",
		);
		expect(stdout).toContain("Use `#!/usr/bin/env bash` at the start");
	});
});
