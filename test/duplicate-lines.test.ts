import { describe, expect, it } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

describe("duplicate lines", () => {
  it("should not have duplicate markdown headers in output", () => {
    // Run the command and capture output
    const output = execSync("node dist/index.js -i src --name MY_PROJECT", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, VITEST: "1" },
    });

    console.log("Full output:", output);

    // Split output into lines and filter to only include markdown headers
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("#")); // Only check markdown headers

    console.log("All markdown headers found:", lines);

    // Create a Set to track unique lines
    const uniqueLines = new Set<string>();
    const duplicates: string[] = [];

    // Check each line for duplicates
    lines.forEach((line) => {
      if (uniqueLines.has(line)) {
        duplicates.push(line);
      }
      uniqueLines.add(line);
    });

    // Log duplicates for debugging if test fails
    if (duplicates.length > 0) {
      console.log("Found duplicate markdown headers:", duplicates);
      console.log("All unique headers:", Array.from(uniqueLines));
    }

    expect(duplicates).toHaveLength(0);
  });

  it("should always include file contents in the output file", async () => {
    // Create a test directory with some files
    const testDir = path.resolve(__dirname, "fixtures/test-project");
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(testDir, "test1.ts"),
      "console.log('test1');"
    );
    await fs.promises.writeFile(
      path.join(testDir, "test2.ts"),
      "console.log('test2');"
    );

    try {
      // Run the command and get the output directly (in test mode)
      const output = execSync(
        `node dist/index.js -i ${testDir} --name TEST_PROJECT --test`,
        {
          cwd: path.resolve(__dirname, ".."),
          encoding: "utf8",
          env: { ...process.env, VITEST: "1" },
        }
      );

      // Verify file contents section exists and has content
      expect(output).toContain("## Files Content");
      expect(output).toContain("```");

      // Verify some actual file content exists
      expect(output).toContain("test1.ts:");
      expect(output).toContain("console.log('test1');");
      expect(output).toContain("test2.ts:");
      expect(output).toContain("console.log('test2');");
    } finally {
      // Clean up test directory
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });
});
