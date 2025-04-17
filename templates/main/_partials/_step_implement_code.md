**Step 1: Implement Core Code**

- **Goal:** Modify code file(s) for core logic of "{{TASK_DESCRIPTION}}".
- **Action & Attempt Cycle (Max 3 Attempts):**

  1.  **Attempt 1:** Edit relevant file(s) (e.g., `src/feature.ts`). **Show complete changed code blocks (before/after).**

      ```typescript
      // Example: Show minimal BEFORE/AFTER blocks for code file(s)
      // === BEFORE in src/file.ts ===
      // export function X(...) { ... }

      // === AFTER in src/file.ts (Attempt 1) ===
      // import changes...
      // export function X(...) { ... // Updated logic }
      ```

      _Self-Correction: Does this affect test mocks (e.g., network, `process.exit`)? Prep for test updates._

  2.  **Verify (Mandatory):** Run checks below.
  3.  **If Verify Fails:** Analyze errors. Announce **Attempt 2**.
      - Modify code again. Show changes. Re-Verify.
  4.  **If Verify Fails Again:** Analyze errors. Announce **Attempt 3**.
      - Make final modifications. Show changes. Re-Verify.
  5.  **If Verify Fails on Attempt 3:** **STOP.** Report: "Code verification failed after 3 attempts (Step 1). Plan revision needed." Do not commit.

- **Impact Analysis (Mandatory Pre-Commit):** How changes affect other parts (tests, components, types, docs)?

  - **Files Potentially Impacted:** `[File Path]` - Reason: [Why]
  - Acknowledge in commit message.

- **Verification (Mandatory - After EACH attempt. DO NOT COMMIT until passed):**

  1.  **Lint & Type Check:** Fix _all_ issues.
      ```bash
      # Adapt command
      pnpm lint && pnpm build:check
      ```
  2.  **Run Relevant Tests:** Analyze failures. Fix unexpected ones. (Ok if tests fail due to _intended_ change - fix in Step 2).
      - **If verification fails:** Return to Action Cycle. Use debuggers/logs. Check Impact Analysis.
      ```bash
      # Adapt command (run specific tests or full suite)
      pnpm test
      ```
  3.  **(Optional) Manual Check:** Briefly check behavior.
  4.  **Progress:** If passed, state: "Verification OK for Step 1 on Attempt X."

- **Commit (Only After Success on Attempt 1, 2, or 3):**
  ```bash
  # 1. Add only files modified THIS STEP
  git add <path/to/modified/code/files>
  # 2. Commit (Use ONE type: feat/fix/refactor...)
  git commit -m "<type>: Core logic for {{TASK_DESCRIPTION}} (Step 1)" -m "Desc: [Specific changes]" -m "Verify: Passed lint, types, tests on Attempt [1/2/3]." -m "Impact: Acknowledged potential impact."
  ```

---
