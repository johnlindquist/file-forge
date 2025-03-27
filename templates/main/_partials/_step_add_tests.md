**Step 2: Add or Update Tests**

*   **Goal:** Ensure the changes made for "{{TASK_DESCRIPTION}}" are covered by automated tests to prevent regressions and verify behavior, including edge cases.
*   **Action:** Add new tests or update existing ones in the relevant test file(s) (e.g., `test/feature.test.ts`, `src/auth.spec.js`). **Ensure you show complete test blocks (`describe` or `it`).**

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
    // Replace or add complete test blocks

    import { authenticate } from '../src/auth';
    // Mock the new dependency if needed
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

      it('should return false for invalid password', () => {
        expect(authenticate('admin', 'wrongpassword')).toBe(false);
      });

      // New test: Added input validation checks
      it('should return false if username or password is empty', () => {
        expect(authenticate('', 'password123')).toBe(false);
        expect(authenticate('admin', '')).toBe(false);
        expect(authenticate('', '')).toBe(false);
      });

      // New test: Added check for locked accounts
      it('should return false for valid credentials if account is locked', () => {
        // Setup mock for locked account scenario
        // mockedIsAccountLocked.mockReturnValue(true);
        expect(authenticate('admin', 'password123')).toBe(false);
      });
    });
    ```
*   **Verification (Mandatory Before Commit):**
    1.  **Lint & Type Check:** Run linters and type checkers. Fix all reported issues.
        ```bash
        # Adapt to your project's scripts
        pnpm lint && pnpm build:check
        ```
    2.  **Run Tests:** Execute the *full* test suite again. Ensure your new/updated tests pass and **no existing tests have regressed**. Analyze and fix any failures.
        ```bash
        # Adapt to your project's scripts
        pnpm test
        ```
*   **Commit (Only After Successful Verification):** Stage and commit *only* the changes related to tests.
    ```bash
    git add <path/to/test/files> # e.g., git add test/auth.test.ts
    git commit -m "test: Add tests for {{TASK_DESCRIPTION}}" -m "Added tests for input validation and locked account scenarios"
    ```

--- 