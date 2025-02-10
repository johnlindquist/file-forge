import { readFileSync, existsSync } from "node:fs";

export async function waitForFile(
  path: string,
  timeoutMs = 10000,
  intervalMs = 500
): Promise<boolean> {
  const start = Date.now();
  let lastSize = -1;
  let sameCount = 0;
  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) {
      const stats = readFileSync(path).length;
      if (stats === lastSize) {
        sameCount++;
        if (sameCount >= 5) return true;
      } else {
        lastSize = stats;
        sameCount = 0;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}
