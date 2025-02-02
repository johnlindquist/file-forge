// test/graph-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";
import { join } from "node:path";

const FIXTURES_DIR = join(__dirname, "fixtures", "graph-project");
const ENTRY_FILE = join(FIXTURES_DIR, "index.js");

describe("CLI --graph", () => {
  it("builds dependency graph digest starting from the given file", async () => {
    const { stdout, exitCode } = await runCLI([
      FIXTURES_DIR,
      "--graph",
      ENTRY_FILE,
      "--pipe",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("# ghi");
    expect(stdout).toContain("Files analyzed: 3");
    expect(stdout).toContain("index.js");
    expect(stdout).toContain("module1.js");
    expect(stdout).toContain("module2.js");
    expect(stdout).toContain("================================");
    expect(stdout).toContain("File:");
  });
}); 

