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
        // By default, XML should have minimal indentation
        expect(defaultResult.stdout).toContain("<project>");
        expect(defaultResult.stdout).toContain("<source>");

        // With whitespace flag, it should have indentation
        expect(whitespaceResult.stdout).toContain("  <project>");
        expect(whitespaceResult.stdout).toContain("    <source>");

        // The whitespace output should be longer due to added spacing
        expect(whitespaceResult.stdout.length).toBeGreaterThan(defaultResult.stdout.length);
    });
}); 