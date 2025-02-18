// test/test-helpers.ts
import { execSync, spawn } from "node:child_process";
import { beforeEach, vi } from "vitest";
import { getHashedSource } from "../src/utils.js";
import * as os from "node:os";
import * as path from "node:path";

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

// Helper function to set up a test directory with files
export async function setupTestDirectory(
  dirPath: string,
  files: Record<string, string>
): Promise<void> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  // Create the directory
  await fs.mkdir(dirPath, { recursive: true });

  // Create each file with its content
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dirPath, filePath);
    // Create parent directory if it doesn't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}

// Helper function to clean up a test directory
export async function cleanupTestDirectory(dirPath: string): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs.rm(dirPath, { recursive: true, force: true });
}

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

export function getTestTempFilePath(filename: string): string {
  return path.join(os.tmpdir(), `ffg-test-${filename}`);
}

export function isOnMainBranch(): boolean {
  try {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
    return currentBranch === "main";
  } catch {
    // If git command fails, assume we're not on main branch
    return false;
  }
}
