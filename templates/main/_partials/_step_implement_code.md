**Step 1: Implement Core Code Changes**

- **Goal:** Modify the necessary code file(s) to implement the core logic for this part of "{{TASK_DESCRIPTION}}". Focus _only_ on primary code changes for this step.
- **Action & Attempt Cycle:**

  1.  Announce **"Attempt 1"** for this step.
  2.  Edit the relevant file(s) (e.g., `src/feature.ts`). **Show the complete relevant code blocks being changed (before/after).**
      _Example for file `src/auth.ts`:_

      ```typescript
      // === BEFORE CHANGES in src/auth.ts ===
      // Show the complete function or relevant block

      // import { someDependency } from './dependency';

      export function authenticate(
        username: string,
        password: string,
      ): boolean {
        // Existing logic...
        const isValid = username === "admin" && password === "password123";
        return isValid;
      }

      // === AFTER CHANGES in src/auth.ts (Attempt 1) ===
      // Replace the previous block with this complete, updated version

      // import { someDependency } from './dependency';
      // import { isAccountLocked } from './accountStatus'; // New dependency

      export function authenticate(
        username: string,
        password: string,
      ): boolean {
        console.log("Attempting authentication with validation..."); // Log change

        if (!username || !password) {
          // Added validation
          console.error("Auth failed: Missing credentials.");
          return false;
        }
        const isValidCredentials =
          username === "admin" && password === "password123";
        // if (isValidCredentials && isAccountLocked(username)) { // Added check
        //   console.warn(`Auth failed: Account '${username}' locked.`);
        //   return false;
        // }
        return isValidCredentials;
      }
      ```

      _Self-Correction Prompt: Does this change impact mocks needed for tests (e.g., `isAccountLocked`, network, `process.exit`)? Prepare for test updates._

  3.  Proceed immediately to **Verification (Mandatory)** below.
  4.  **If Verification Fails:**
      - Analyze the failure messages _thoroughly_.
      - Announce **"Attempt 2"**.
      - Modify the code again, showing the changes clearly (e.g., "=== AFTER CHANGES in src/auth.ts (Attempt 2) ===").
      - Re-run **Verification**.
  5.  **If Verification Fails Again:**
      - Analyze the new failure messages.
      - Announce **"Attempt 3"**.
      - Make final modifications, showing changes.
      - Re-run **Verification**.
  6.  **If Verification Fails on Attempt 3:** **STOP.** Announce: "Verification failed after 3 attempts for Step 1 (Implement Code). Recommend plan revision." Do not proceed to commit.

- **Impact Analysis (Mandatory!):** Before the _first_ commit attempt, consider how these changes might affect _other_ parts of the project. Updates here might require changes in tests, consuming components, types, or docs.

  - *Agent Note: List specific files/modules likely impacted by *these specific code changes* and *why*. Be explicit.*
  - **Files Potentially Impacted by _this step's_ changes:**
    - `[File Path 1]` - Reason: [e.g., Imports the modified function, uses the affected type]
    - `[File Path 2]` - Reason: [e.g., Contains tests for this code, needs updated mocks]
    - _(Add more as needed)_
  - **Action Required:** Acknowledge this analysis in your commit message if you proceed.

- **Verification (Mandatory Before Commit):** **Run these checks after EACH attempt. DO NOT COMMIT until all verification steps pass.**

  1.  **Lint & Type Check:** Run linters/type checkers. Fix _all_ reported issues.
      ```bash
      # Adapt to your project's scripts (e.g., pnpm lint, pnpm build:check)
      pnpm lint && pnpm build:check
      ```
  2.  **Run Relevant Tests:** Execute tests most relevant to the changes. Analyze failures meticulously. **If tests fail unexpectedly:**
      - Use debuggers (`debugger;`, IDE breakpoints) or logging (`console.log`) to trace logic in code and tests.
      - Check the "Impact Analysis" – did you miss updating a related file?
      - If a test _should_ fail due to intended behavior change, that's okay _for now_ – it will be fixed in the _next_ step (Add Tests). Focus on fixing _unexpected_ failures here.
      - **If verification fails, return to the Action & Attempt Cycle above.**
      ```bash
      # Adapt to run specific tests if possible, or the full suite:
      # pnpm test path/to/relevant/tests*
      pnpm test
      ```
  3.  **(Optional) Manual Check:** Briefly run the app/command to manually verify the specific change behaves as expected.
  4.  **Progress Check:** If all checks pass, state: "Verification successful for Step 1 on Attempt X."

- **Commit (Only After Successful Verification on Attempt 1, 2, or 3):** Stage and commit _only_ the code changes directly related to _this step's_ implementation.
  ```bash
  # 1. Add only the files modified IN THIS STEP
  git add <path/to/modified/code/files> # e.g., git add src/auth.ts
  # 2. Use a clear, structured commit message (choose ONE type: feat/fix/refactor/...)
  #    Example: git commit -m "feat: Implement core logic for {{TASK_DESCRIPTION}} (Step 1)" -m "Description: Added input validation in authenticate function." -m "Verification: Passed lint, types, relevant tests on Attempt X." -m "Impact Analysis: Acknowledged potential impact on test files." | cat
  git commit -m "<type>: Implement core logic for {{TASK_DESCRIPTION}} (Step 1)" -m "Description: [Specific changes made]" -m "Verification: Passed lint, types, relevant tests on Attempt [1/2/3]." -m "Impact Analysis: Acknowledged potential impact on listed files." | cat
  ```

---
