import { describe, it, expect } from "vitest";
import { isGitHubURL } from "../src/index";

describe("isGitHubURL", () => {
	it("should identify full GitHub URLs", () => {
		expect(isGitHubURL("https://github.com/microsoft/vscode").isValid).toBe(
			true,
		);
		expect(isGitHubURL("http://github.com/microsoft/vscode").isValid).toBe(
			true,
		);
		expect(isGitHubURL("https://www.github.com/microsoft/vscode").isValid).toBe(
			true,
		);
	});

	it("should identify github.com URLs without protocol", () => {
		expect(isGitHubURL("github.com/microsoft/vscode").isValid).toBe(true);
	});

	it("should reject anything that doesn't explicitly contain github.com", () => {
		expect(isGitHubURL("microsoft/vscode").isValid).toBe(false);
		expect(isGitHubURL("/Users/me/dev/project").isValid).toBe(false);
		expect(isGitHubURL("./dev/project").isValid).toBe(false);
		expect(isGitHubURL("dev/project").isValid).toBe(false);
		expect(isGitHubURL("../project").isValid).toBe(false);
		expect(isGitHubURL("C:\\Users\\me\\dev\\project").isValid).toBe(false);
		expect(isGitHubURL("github/microsoft/vscode").isValid).toBe(false);
		expect(isGitHubURL("github.org/microsoft/vscode").isValid).toBe(false);
	});

	it("should normalize URLs correctly", () => {
		expect(isGitHubURL("github.com/microsoft/vscode").url).toBe(
			"https://github.com/microsoft/vscode",
		);
		expect(isGitHubURL("https://github.com/microsoft/vscode").url).toBe(
			"https://github.com/microsoft/vscode",
		);
	});
});
