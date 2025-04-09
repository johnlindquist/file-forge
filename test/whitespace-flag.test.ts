// test/whitespace-flag.test.ts
import { describe, it, expect } from "vitest";
import { runCLI } from "./test-helpers";

describe("CLI --whitespace", () => {
    it("should control output indentation and spacing", async () => {
        // Run tests with and without whitespace flag
        const [defaultResult, whitespaceResult] = await Promise.all([
            // Test 1: Default behavior (minimal whitespace)
            runCLI([
                "--path",
                "test/fixtures/sample-project",
                "--pipe"
                // No --whitespace flag
            ]),

            // Test 2: With whitespace flag enabled
            runCLI([
                "--path",
                "test/fixtures/sample-project",
                "--pipe",
                "--whitespace"
            ])
        ]);

        // Both should exit successfully
        expect(defaultResult.exitCode).toBe(0);
        expect(whitespaceResult.exitCode).toBe(0);

        // Check XML indentation differences
        // By default, XML should have minimal indentation (no leading spaces before top-level tags)
        expect(defaultResult.stdout).toContain("<project>"); // Check presence without leading space
        expect(defaultResult.stdout).not.toMatch(/^\s+<project>/m); // Ensure no leading space

        // With whitespace flag, it should have indentation. Check for newline + indent + tag.
        // Use toMatch with regex to be robust against potential preceding output
        expect(whitespaceResult.stdout).toMatch(/ {2}<project>/);
        expect(whitespaceResult.stdout).toMatch(/\n\s{4}<source>/m); // Check for newline + 4 spaces + tag
    });
}); 