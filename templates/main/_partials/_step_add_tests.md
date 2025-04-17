**Step 2: Add/Update Tests**

- **Goal:** Cover Step 1 changes with tests.
- **Action & Attempt Cycle (Max 3 Attempts):**

  1.  **Attempt 1:** Add/update tests in relevant files (e.g., `test/feature.test.ts`). **Show complete changed test blocks (`describe`/`it`), setup/mocks.**

      ```typescript
      // Example: Show minimal BEFORE/AFTER blocks for test file(s)
      // === BEFORE in test/file.test.ts ===
      // it(...) { ... }

      // === AFTER in test/file.test.ts (Attempt 1) ===
      // import/mock changes...
      // describe(...) { it(...) { ... } // Updated/New test
      // }
      ```

  2.  **Verify (Mandatory):** Run checks below.
  3.  **If Verify Fails:** Analyze errors. Announce **Attempt 2**.
      - Fix test logic _and/or_ amend Step 1 code (`git add <file>; git commit --amend --no-edit`). Show changes. Re-Verify.
  4.  **If Verify Fails Again:** Analyze errors. Announce **Attempt 3**.
      - Make final fixes (tests/code). Show changes. Re-Verify.
  5.  **If Verify Fails on Attempt 3:** **STOP.** Report: "Test verification failed after 3 attempts (Step 2). Plan revision needed." Do not commit.

- **Context & Impact:** Note any test setup/util files affected.

  - **Files Potentially Impacted:** `[File Path]` - Reason: [Why]

- **Verification (Mandatory - After EACH attempt. DO NOT COMMIT until passed):**

  1.  **Lint & Type Check:** Fix all issues in changed test/code files.
      ```bash
      # Adapt command
      pnpm lint <test/files> [<amended/code/files>] && pnpm build:check
      ```
  2.  **Run Full Test Suite:** All tests must pass (new & existing).
      - **If fails:** Return to Action Cycle. Analyze output. Fix.
      - **Do not proceed if tests fail.**
      ```bash
      # Adapt command
      pnpm test
      ```
  3.  **Progress:** If passed, state: "Verification OK for Step 2 on Attempt X."

- **Commit (Only After Success on Attempt 1, 2, or 3):**
  ```bash
  # 1. Add test files & any amended code files
  git add <path/to/test/files> [<path/to/amended/code/files>]
  # 2. Commit
  git commit -m "test: Add/update tests for {{TASK_DESCRIPTION}} (Step 2)" -m "Desc: [Specific tests added/updated, mention code fixes]" -m "Verify: Passed lint, types, full test suite on Attempt [1/2/3]."
  ```

---
