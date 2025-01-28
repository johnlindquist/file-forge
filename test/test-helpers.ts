// test/test-helpers.ts
import { spawn } from "node:child_process";

export function runCLI(args: string[]) {
	return new Promise<{ stdout: string; stderr: string; exitCode: number }>(
		(resolve) => {
			const proc = spawn("pnpm", ["node", "index.ts", ...args], {
				cwd: process.cwd(),
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
