// test/test-cli-dot.test.ts
import { spawn } from "node:child_process";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Helper to spawn the CLI and capture output
function runCLI(args: string[]) {
	return new Promise<{ stdout: string; stderr: string; exitCode: number }>(
		(resolve) => {
			const proc = spawn("pnpm", ["node", "index.ts", ...args], {
				cwd: process.cwd(), // or path.resolve(__dirname, "../..") if needed
			});

			let stdout = "";
			let stderr = "";

			proc.stdout.on("data", (chunk) => {
				stdout += chunk;
			});

			proc.stderr.on("data", (chunk) => {
				stderr += chunk;
			});

			proc.on("close", (code) => {
				resolve({ stdout, stderr, exitCode: code ?? 0 });
			});
		},
	);
}

describe("CLI: ingest current directory with '.'", () => {
	it("should include files from the current directory and not throw 'No files found'", async () => {
		// Use the test fixtures directory instead of the whole project
		const { stdout, stderr, exitCode } = await runCLI([
			"test/fixtures/sample-project",
			"--debug",
			"--pipe",
		]);

		console.log("CLI STDOUT:\n", stdout);
		console.log("CLI STDERR:\n", stderr);

		expect(exitCode).toBe(0);
		expect(stdout).not.toContain("No files found or directory is empty");

		// Extract the saved file path from the output
		const savedMatch = stdout.match(/RESULTS_SAVED: (.+\.md)/);
		if (!savedMatch) {
			console.log("Full stdout:", stdout);
			throw new Error("Could not find RESULTS_SAVED marker in output");
		}
		expect(savedMatch).toBeTruthy();

		const [, savedPath] = savedMatch;
		const savedContent = readFileSync(savedPath, "utf8");

		// Now check the actual content of the saved file
		expect(savedContent).toMatch(/hello\.js/);
		expect(savedContent).toMatch(/test\.ts/);
		expect(savedContent).toContain("Directory Structure");
		expect(savedContent).toContain("Files Content");
	}, 15000); // Keep the timeout just in case
});
