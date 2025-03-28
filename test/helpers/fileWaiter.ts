import { readFileSync, existsSync } from "node:fs";

/**
 * Wait for a file to exist and stabilize (content stops changing)
 * Uses an adaptive checking interval that starts fast and slows down over time
 * to reduce filesystem polling overhead without sacrificing responsiveness
 */
export async function waitForFile(
  path: string,
  timeoutMs = 15000,
  initialIntervalMs = 50
): Promise<boolean> {
  const start = Date.now();
  let lastSize = -1;
  let sameCount = 0;
  let intervalMs = initialIntervalMs;

  // Exponential backoff constants
  const MAX_INTERVAL = 1000; // Max 1s between checks
  const BACKOFF_FACTOR = 1.5; // Increase interval by 50% each time

  // Number of times the file size must remain stable to consider it complete
  const STABILITY_THRESHOLD = 3;

  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) {
      try {
        const stats = readFileSync(path).length;

        if (stats === lastSize) {
          sameCount++;
          if (sameCount >= STABILITY_THRESHOLD) {
            return true;
          }

          // Increase the interval as we detect stability
          intervalMs = Math.min(intervalMs * BACKOFF_FACTOR, MAX_INTERVAL);
        } else {
          // Reset if the file is still changing
          lastSize = stats;
          sameCount = 0;
          // Reset interval to be more responsive during active changes
          intervalMs = initialIntervalMs;
        }
      } catch (error) {
        // File might exist but not be accessible yet, continue waiting
        console.warn(`Warning: File exists but couldn't be read: ${error}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
