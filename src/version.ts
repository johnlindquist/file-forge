import { readFileSync } from "fs";

export function getVersion(): string {
  try {
    // Use a URL relative to this module to reliably locate package.json
    const pkgPath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0-development";
  } catch {
    return "0.0.0-development";
  }
}
