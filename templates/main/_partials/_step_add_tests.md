**Step 2: Add or Update Tests**

- **Goal:** Ensure code changes from Step 1 are covered by automated tests. Add new tests or update existing ones.
- **Action & Attempt Cycle:**

  1.  Announce **"Attempt 1"** for this step.
  2.  Add new tests or update existing ones in relevant test file(s) (e.g., `test/feature.test.ts`). **Show complete test blocks (`describe` or `it`) including any setup/mocking changes.**

      _Example for file `test/auth.test.ts`:_

      ```typescript
      // === BEFORE CHANGES in test/auth.test.ts ===
      // Show complete relevant 'describe' or 'it' blocks

      import { authenticate } from "../src/auth";
      // (Mock setup might exist here)

      describe("Authentication", () => {
        it("should return true for valid credentials", () => {
          expect(authenticate("admin", "password123")).toBe(true);
        });

        // Maybe other tests exist
        it("should return false for invalid password", () => {
          expect(authenticate("admin", "wrongpassword")).toBe(false);
        });
      });

      // === AFTER CHANGES in test/auth.test.ts (Attempt 1) ===
      // Replace or add complete test blocks, including updated mocks/setup

      import { authenticate } from "../src/auth";
      // Mock the new dependency if needed by the code change
      // import { isAccountLocked } from '../src/accountStatus';
      // jest.mock('../src/accountStatus');
      // const mockedIsAccountLocked = isAccountLocked as jest.Mock;

      describe("Authentication", () => {
        // (Optional setup before each test)
        // beforeEach(() => {
        //   mockedIsAccountLocked.mockReturnValue(false); // Default mock state
        // });

        it("should return true for valid credentials when account is not locked", () => {
          // mockedIsAccountLocked.mockReturnValue(false); // Ensure not locked
          expect(authenticate("admin", "password123")).toBe(true);
        });

        // (Existing test potentially updated if behavior changed)
        it("should return false for invalid password", () => {
          expect(authenticate("admin", "wrongpassword")).toBe(false);
        });

        // New test: Added based on code changes in previous step
        it("should return false if username or password is empty", () => {
          expect(authenticate("", "password123")).toBe(false);
          expect(authenticate("admin", "")).toBe(false);
          expect(authenticate("", "")).toBe(false);
        });

        // New test: Added based on code changes in previous step
        it("should return false for valid credentials if account is locked", () => {
          // Setup mock for locked account scenario for this test
          // mockedIsAccountLocked.mockReturnValue(true);
          expect(authenticate("admin", "password123")).toBe(false);
        });
      });
      ```

  3.  Proceed immediately to **Verification (Mandatory)** below.
  4.  **If Verification Fails:**
      - Analyze the failure messages _thoroughly_. Is it a new test failing or an _existing_ test (regression)?
      - Announce **"Attempt 2"**.
      - **If a new test fails:** Debug the test logic _and_ the code from Step 1 it tests. Modify the test file(s) and potentially amend the code from Step 1 (`git add <file>; git commit --amend --no-edit`). Show changes.
      - **If an existing test fails (regression):** Investigate why the Step 1 code change broke it. Amend the Step 1 code (`git add <file>; git commit --amend --no-edit`) or, if the _new_ behavior is correct, update the _old_ test. Show changes.
      - Re-run **Verification**.
  5.  **If Verification Fails Again:**
      - Analyze the new failure messages.
      - Announce **"Attempt 3"**.
      - Make final modifications (tests and/or amended code from Step 1). Show changes.
      - Re-run **Verification**.
  6.  **If Verification Fails on Attempt 3:** **STOP.** Announce: "Verification failed after 3 attempts for Step 2 (Add Tests). Recommend plan revision." Do not proceed to commit.

- **Context & Impact:** Test changes might impact mock setups (`jest.setup.js`), test utilities (`test/utils.ts`), or CI config.

  - *Agent Note: List any specific test setup/utility files potentially affected by *this step's* test changes.*
  - **Files Potentially Impacted by _this step's_ test changes:**
    - `[Test Util File Path]` - Reason: [e.g., Modified shared test helper]
    - `[Mock Setup File Path]` - Reason: [e.g., Added new global mock]
    - _(Add more as needed)_

- **Verification (Mandatory Before Commit):** **Run these checks after EACH attempt. DO NOT COMMIT until all verification steps pass.**

  1.  **Lint & Type Check:** Run linters/type checkers on _test files_ and any _amended code files_. Fix all issues.
      ```bash # Adapt command if needed
      # Target changed test files and potentially amended code files
      pnpm lint <path/to/test/files> [<path/to/amended/code/files>] && pnpm build:check
      ```
  2.  **Run Full Test Suite:** Execute the _entire_ suite. Ensure new/updated tests PASS and **NO existing tests fail (regress)**.
      - **If tests fail, return to the Action & Attempt Cycle above.** Carefully analyze the output per the instructions there.
      - **Do not proceed if any tests are unexpectedly failing.**
      ```bash # Adapt command if needed
      pnpm test
      ```
  3.  **Progress Check:** If all checks pass, state: "Verification successful for Step 2 on Attempt X. Full test suite passed."

- **Commit (Only After Successful Verification on Attempt 1, 2, or 3):** Stage and commit _only_ the changes related to tests (and any amended code changes from Step 1 fixed during this step).
  ```bash
  # 1. Add test files and any amended code files fixed for regressions
  git add <path/to/test/files> [<path/to/amended/code/files>]
  # 2. Use a clear, structured commit message
  #    Example: git commit -m "test: Add tests for login validation (Step 2)" -m "Description: Added tests covering empty inputs for authenticate. Fixed regression in X test by amending Step 1 code." -m "Verification: Passed lint, types, full test suite on Attempt X." | cat
  git commit -m "test: Add/update tests for {{TASK_DESCRIPTION}} (Step 2)" -m "Description: [Specific tests added/updated, mention any amended code fixes]" -m "Verification: Passed lint, types, full test suite on Attempt [1/2/3]." | cat
  ```

---
