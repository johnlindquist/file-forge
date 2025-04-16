import { describe, it, expect } from "vitest";
import { isGitUrl } from "../src/repo.js";

describe("isGitUrl", () => {
  it("should identify full GitHub URLs", () => {
    expect(isGitUrl("https://github.com/microsoft/vscode")).toBe(true);
  });

  it("should identify github.com URLs without protocol", () => {
    expect(isGitUrl("github.com/microsoft/vscode")).toBe(true);
  });

  it("should reject anything that doesn't explicitly contain github.com", () => {
    expect(isGitUrl("microsoft/vscode")).toBe(false);
    expect(isGitUrl("/Users/me/dev/project")).toBe(false);
    expect(isGitUrl("./dev/project")).toBe(false);
    expect(isGitUrl("dev/project")).toBe(false);
    expect(isGitUrl("../project")).toBe(false);
    expect(isGitUrl("C:\\Users\\me\\dev\\project")).toBe(false);
    expect(isGitUrl("github/microsoft/vscode")).toBe(false);
    expect(isGitUrl("github.org/microsoft/vscode")).toBe(false);
  });

  it("should normalize URLs correctly", () => {
    expect(isGitUrl("github.com/microsoft/vscode")).toBe(true);
  });
});
