import { describe, it, expect } from "vitest";
import { buildXMLOutput } from "../src/xmlFormatter";
import { PROP_SUMMARY, PROP_TREE, PROP_CONTENT } from "../src/constants";

describe("XML Formatter", () => {
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
}); 