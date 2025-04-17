import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildXMLOutput } from "../src/xmlFormatter.js";
import { DigestResult, PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "../src/constants.js";

describe.skip("XML Formatter", () => {
    const mockGitInfo = {
        branch: "main",
    };

    it("should include command in output when provided", async () => {
        const digest = {
            [PROP_SUMMARY]: "Test summary",
            [PROP_TREE]: "Test tree",
            [PROP_CONTENT]: "Test content"
        };
        const source = "/test/path";
        const timestamp = "20240101-000000";
        const command = "ffg test --verbose";

        const output = await buildXMLOutput(digest, source, timestamp, {
            command,
            verbose: true
        });

        expect(output).toContain(`<command>${command}</command>`);
    });

    it("should not include command tag when command is not provided", async () => {
        const digest = {
            [PROP_SUMMARY]: "Test summary",
            [PROP_TREE]: "Test tree",
            [PROP_CONTENT]: "Test content"
        };
        const source = "/test/path";
        const timestamp = "20240101-000000";

        const output = await buildXMLOutput(digest, source, timestamp, {
            verbose: true
        });

        expect(output).not.toContain("<command>");
    });

    it("should not escape special characters within content tags", async () => {
        const specialContent = `This <contains> & "special" 'chars'.`;
        const digest = {
            [PROP_SUMMARY]: `Summary with ${specialContent}`,
            [PROP_TREE]: `Tree with ${specialContent}`,
            [PROP_CONTENT]: `====================\nFile: src/test & file.ts\n====================\n${specialContent}\nAnother line.`
        };
        const source = "/test/path";
        const timestamp = "20240101-000000";

        const output = await buildXMLOutput(digest, source, timestamp, {
            verbose: true, // Ensure content is included
            whitespace: true // Make checking easier
        });

        // Check summary
        expect(output).toContain(`  <summary>
    Summary with ${specialContent}
  </summary>`);
        // Check tree
        expect(output).toContain(`  <directoryTree>
Tree with ${specialContent}
  </directoryTree>`);
        // Check file content (escaping only in attribute)
        expect(output).toContain(`    <file path="src/test &amp; file.ts">\n${specialContent}\nAnother line.    </file>`);
        // Specifically check that special chars are NOT escaped in content
        expect(output).not.toContain("&lt;contains&gt;");
        expect(output).not.toContain(`&amp; "special" &apos;chars&apos;`);
    });
}); 