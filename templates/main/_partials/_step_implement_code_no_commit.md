**Step 1: Implement Code Changes**

*   **Goal:** Modify the necessary code files to implement the core logic for "{{TASK_DESCRIPTION}}".
*   **Action:** Edit the relevant file(s) (e.g., `src/feature.ts`, `lib/utils.js`). **Ensure you replace the entire relevant code block as shown.**

    *Example for file `src/auth.ts`:*
    ```typescript
    // === BEFORE CHANGES in src/auth.ts ===
    // Ensure you show the complete function or relevant block

    // (Optional: Show surrounding code for context if needed)
    // import { someDependency } from './dependency';

    export function authenticate(username: string, password: string): boolean {
      console.log('Attempting authentication...');
      // Example existing logic:
      const isValid = username === 'admin' && password === 'password123';
      // ... potentially more complex logic ...
      return isValid;
    }

    // (Optional: Show other functions/code in the file if relevant context)
    // export function otherAuthFunction() { ... }

    // === AFTER CHANGES in src/auth.ts ===
    // Replace the previous block with this complete, updated version

    // (Optional: Show surrounding code for context if needed)
    // import { someDependency } from './dependency';
    // import { isAccountLocked } from './accountStatus'; // New dependency

    export function authenticate(username: string, password: string): boolean {
      console.log('Attempting authentication with new validation...'); // Updated log

      // Added input validation
      if (!username || !password) {
        console.error('Authentication failed: Username or password missing.');
        return false;
      }

      // Example existing logic:
      const isValidCredentials = username === 'admin' && password === 'password123';

      // Added check for locked account
      if (isValidCredentials && isAccountLocked(username)) {
         console.warn(`Authentication failed: Account '${username}' is locked.`);
         return false;
      }

      // ... potentially more complex logic ...

      return isValidCredentials; // Return based on combined checks
    }

    // (Optional: Show other functions/code in the file if relevant context)
    // export function otherAuthFunction() { ... }
    ```
    *Self-Correction Prompt: Did you consider how this change interacts with the test environment's mocking (e.g., for `isAccountLocked`, network requests, `process.exit`)?*

*   **Verification:**
    1.  **Lint & Type Check:** Run linters and type checkers. Fix all reported issues.
        ```bash
        # Adapt to your project's scripts
        pnpm lint && pnpm build:check
        ```
    2.  **Run Tests:** Execute the *full* test suite relevant to your changes. Analyze and fix any failures meticulously. Use debuggers or logging if necessary.
        ```bash
        # Adapt to your project's scripts (e.g., npm test, yarn test, pnpm test -- <path/to/tests>)
        pnpm test
        ```
    3.  **(Optional) Manual Check:** If applicable, run the application or specific commands to manually verify the basic functionality behaves as expected.

--- 