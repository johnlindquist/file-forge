**Step 2: Add or Update Tests**

*   **Goal:** Ensure the code changes from the previous step are covered by automated tests. This includes adding new tests or updating existing ones to reflect the new/changed behavior.
*   **Action:** Add new tests or update existing ones in the relevant test file(s) (e.g., `test/feature.test.ts`, `src/auth.spec.js`). **Ensure you show complete test blocks (`describe` or `it`) including any necessary setup/mocking changes.**

    *Example for file `test/auth.test.ts`:*
    ```typescript
    // === BEFORE CHANGES in test/auth.test.ts ===
    // Show the complete relevant 'describe' or 'it' blocks

    import { authenticate } from '../src/auth';
    // (Mock setup might exist here)

    describe('Authentication', () => {
      it('should return true for valid credentials', () => {
        expect(authenticate('admin', 'password123')).toBe(true);
      });

      // Maybe other tests exist
      it('should return false for invalid password', () => {
        expect(authenticate('admin', 'wrongpassword')).toBe(false);
      });
    });

    // === AFTER CHANGES in test/auth.test.ts ===
    // Replace or add complete test blocks, including updated mocks/setup

    import { authenticate } from '../src/auth';
    // Mock the new dependency if needed by the code change
    // import { isAccountLocked } from '../src/accountStatus';
    // jest.mock('../src/accountStatus');
    // const mockedIsAccountLocked = isAccountLocked as jest.Mock;

    describe('Authentication', () => {
      // (Optional setup before each test)
      // beforeEach(() => {
      //   mockedIsAccountLocked.mockReturnValue(false); // Default mock state
      // });

      it('should return true for valid credentials when account is not locked', () => {
        // mockedIsAccountLocked.mockReturnValue(false); // Ensure not locked
        expect(authenticate('admin', 'password123')).toBe(true);
      });

      // (Existing test potentially updated if behavior changed)
      it('should return false for invalid password', () => {
        expect(authenticate('admin', 'wrongpassword')).toBe(false);
      });

      // New test: Added based on code changes in previous step
      it('should return false if username or password is empty', () => {
        expect(authenticate('', 'password123')).toBe(false);
        expect(authenticate('admin', '')).toBe(false);
        expect(authenticate('', '')).toBe(false);
      });

      // New test: Added based on code changes in previous step
      it('should return false for valid credentials if account is locked', () => {
        // Setup mock for locked account scenario for this test
        // mockedIsAccountLocked.mockReturnValue(true);
        expect(authenticate('admin', 'password123')).toBe(false);
      });
    });
    ```
*   **Context & Impact:** Tests verify code logic. Changes here might impact mock setup files (`jest.setup.js`), test utilities (`test/utils.ts`), or CI configuration if test commands change.
    *   *Agent Note: List any specific test setup/utility files potentially affected by these test changes.*
    *   **Files Potentially Impacted by *this step's* test changes:**
        *   `[Test Util File Path]` - Reason: [e.g., Modified shared test helper]
        *   `[Mock Setup File Path]` - Reason: [e.g., Added new global mock]
        *   *(Add more as needed)*

*   **Verification (Mandatory Before Commit):** **DO NOT COMMIT until all verification steps pass.**
    1.  **Lint & Type Check:** Run linters and type checkers on the *test files* you changed. Fix all reported issues.
        ```bash # Adapt command if needed
        # Adapt to your project's scripts, potentially targeting test files
        pnpm lint <path/to/test/files> && pnpm build:check
        ```
    2.  **Run Full Test Suite:** Execute the *entire* test suite. Ensure your new/updated tests PASS and **NO existing tests have regressed (broken)**. **If tests fail:**
        *   Analyze the output: Is it your new test failing, or an old one?
        *   If a new test fails, debug the test logic and the code it's testing (using techniques from the previous step).
        *   If an *existing* test fails (regression), investigate why the code change from Step 1 broke it. You might need to adjust the code from Step 1 (amend the previous commit: `git add <file>; git commit --amend --no-edit`) or adjust the older test if the *new* behavior is correct.
        *   **Do not proceed if any tests are unexpectedly failing.**
        ```bash # Adapt command if needed
        pnpm test
        ```

*   **Commit (Only After Successful Verification):** Stage and commit *only* the changes related to tests (and potentially amended code changes if regressions were fixed).
    ```bash
    # 1. Add test files and any amended code files from Step 1 regressions
    git add <path/to/test/files> [<path/to/amended/code/files>]
    # 2. Use a clear, structured commit message
    #    Example: git commit -m "test: Add tests for login validation (Step 2)" -m "Description: Added tests covering empty inputs and locked accounts for authenticate function." -m "Verification: Passed lint, types, and full test suite." | cat
    git commit -m "test: Add/update tests for {{TASK_DESCRIPTION}} (Step 2)" -m "Description: [Specific tests added/updated]" -m "Verification: Passed lint, types, and full test suite." | cat
    ```

--- 