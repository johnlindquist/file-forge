// test/test-helpers.ts
import { execSync, spawn } from "node:child_process";
import { beforeEach, vi } from "vitest";
import { getHashedSource } from "../src/utils.js";

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

type ExecResult = {
  stdout?: Buffer;
  stderr?: Buffer;
  status?: number;
};

export async function runCLI(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
  hashedSource: string;
}> {
  return new Promise((resolve) => {
    const proc = spawn("pnpm", ["node", "dist/index.js", ...args], {
      env: { ...process.env, VITEST: "1", NO_COLOR: "1", NO_INTRO: "1" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      const hashedSource = getHashedSource(String(args[0]));

      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
        hashedSource,
      });
    });
  });
}

export function runCLISync(args: string[]): {
  stdout: string;
  stderr: string;
  exitCode: number;
  hashedSource: string;
} {
  try {
    const result = execSync(`pnpm node dist/index.js ${args.join(" ")}`, {
      env: { ...process.env, VITEST: "1", NO_COLOR: "1", NO_INTRO: "1" },
    }) as ExecResult;

    const hashedSource = getHashedSource(String(args[0]));

    return {
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
      exitCode: result.status ?? 0,
      hashedSource,
    };
  } catch (error: unknown) {
    const execResult = error as ExecResult;
    return {
      stdout: execResult.stdout?.toString() ?? "",
      stderr: execResult.stderr?.toString() ?? "",
      exitCode: execResult.status ?? 1,
      hashedSource: getHashedSource(String(args[0])),
    };
  }
}
