// test/test-helpers.ts
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { beforeEach, vi } from "vitest";

// Mock process.exit to prevent it from actually exiting during tests
beforeEach(() => {
	const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
		// Don't throw on any exit code, just return
		return undefined as never;
	});

	return () => {
		exitSpy.mockRestore();
	};
});

interface ExecError extends Error {
	stdout?: Buffer;
	stderr?: Buffer;
	status?: number;
}

export async function runCLI(args: string[]) {
	const cliPath = resolve(__dirname, "..", "index.ts");
	const cmd = `pnpm node ${cliPath} ${args.join(" ")}`;

	try {
		const stdout = execSync(cmd, {
			encoding: "utf8",
			env: {
				...process.env,
				NODE_NO_WARNINGS: "1", // Suppress experimental warnings
				FORCE_COLOR: "0", // Disable colors in output
				VITEST: "1", // Indicate we're running in Vitest
			},
			stdio: ["ignore", "pipe", "pipe"], // Capture both stdout and stderr
		});
		return { stdout, exitCode: 0 };
	} catch (err) {
		if (err instanceof Error && "stdout" in err) {
			const execErr = err as ExecError;
			return {
				stdout: execErr.stdout?.toString() || "",
				exitCode: execErr.status || 1,
			};
		}
		throw err;
	}
}
