// test/include-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --include", () => {
	it("only includes files matching the glob pattern", async () => {
		// We'll only include .ts files
		const { stdout, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--include=**/*.ts",
			"--debug",
			"--pipe",
		]);

		expect(exitCode).toBe(0);
		// Check for the files in the output
		expect(stdout).toContain("test/fixtures/sample-project/test.ts");
		expect(stdout).toContain("test/fixtures/sample-project/src/math.ts");
		expect(stdout).not.toContain("hello.js");
	});
});
