import { describe, it, expect } from "vitest";
import {
  formatIntroMessage,
  formatErrorMessage,
  formatSpinnerMessage,
  formatDebugMessage,
} from "../src/formatter";

describe("Formatter Module", () => {
  describe("formatIntroMessage", () => {
    it("should format intro messages with a bold green header", () => {
      const message = "Analyzing: /path/to/repo";
      const formatted = formatIntroMessage(message);
      expect(formatted).toEqual(
        "\x1b[1m\x1b[32m🔍 Analyzing: /path/to/repo\x1b[0m"
      );
    });
  });

  describe("formatErrorMessage", () => {
    it("should format error messages with red text and error prefix", () => {
      const message = "Failed to clone repository";
      const formatted = formatErrorMessage(message);
      expect(formatted).toEqual(
        "\x1b[31m❌ Error: Failed to clone repository\x1b[0m"
      );
    });
  });

  describe("formatSpinnerMessage", () => {
    it("should format spinner messages with a consistent prefix", () => {
      const message = "Building text digest...";
      const formatted = formatSpinnerMessage(message);
      expect(formatted).toEqual("⚡ Building text digest...");
    });
  });

  describe("formatDebugMessage", () => {
    it("should format debug messages with a [DEBUG] prefix", () => {
      const message = "Starting graph analysis";
      const formatted = formatDebugMessage(message);
      expect(formatted).toEqual(
        "\x1b[90m[DEBUG] Starting graph analysis\x1b[0m"
      );
    });
  });
});
