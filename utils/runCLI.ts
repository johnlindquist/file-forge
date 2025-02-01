import { execSync } from "node:child_process";
import { resolve } from "node:path";

interface ExecError extends Error {
	stdout?: Buffer;
	stderr?: Buffer;
	status?: number;
}

export async function runCLI(
	args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		const cliPath = resolve(__dirname, "../dist/index.js");
		const command = `pnpm node ${cliPath} ${args.join(" ")}`;

		const result = execSync(command, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		});

		return {
			stdout: result.toString(),
			stderr: "",
			exitCode: 0,
		};
	} catch (error: unknown) {
		const err = error as ExecError;
		return {
			stdout: err.stdout?.toString() || "",
			stderr: err.stderr?.toString() || "",
			exitCode: err.status || 1,
		};
	}
}
