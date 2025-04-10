**Step 1: Implement Core Code Changes**

*   **Goal:** Modify the necessary code file(s) to implement the core logic for this part of "{{TASK_DESCRIPTION}}". This step focuses *only* on the primary code changes.
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
    *Self-Correction Prompt: Did you consider how this change interacts with the test environment's mocking (e.g., for `isAccountLocked`, network requests, `process.exit`)? Ensure mocks are updated if necessary.*

*   **Impact Analysis (Crucial!):** Carefully consider how these changes might affect other parts of the project. Updates here might require changes in tests, consuming components, type definitions, or documentation.
    *   *Agent Note: Based on the `TASK_DESCRIPTION` and your knowledge of the codebase, list specific files/modules likely impacted by *these specific code changes* and briefly explain *why*. Be explicit.*
    *   **Files Potentially Impacted by *this step's* changes:**
        *   `[File Path 1]` - Reason: [e.g., Imports the modified function, uses the affected type, handles related UI]
        *   `[File Path 2]` - Reason: [e.g., Contains tests for this code, needs updated mocks]
        *   *(Add more as needed)*
    *   **Action Required:** Review the listed files. Subsequent steps will likely involve updating them, especially tests. Keep this impact in mind.

*   **Verification (Mandatory Before Commit):** **DO NOT COMMIT until all verification steps pass.**
    1.  **Lint & Type Check:** Run linters and type checkers. Fix *all* reported issues.
        ```bash
        # Adapt to your project's scripts
        pnpm lint && pnpm build:check
        ```
    2.  **Run Relevant Tests:** Execute the test suite(s) most relevant to the changes made. Analyze and fix any failures meticulously. **If tests fail:**
        *   Read the error messages carefully.
        *   Use debuggers (`debugger;` statements, IDE breakpoints) or add temporary logging (`console.log`) to trace the logic flow in your code and the affected tests.
        *   Check the "Impact Analysis" above – did you forget something? Does a related file need an update you missed?
        *   If a test *should* fail because the code's behavior changed correctly, update the test in the *next* step. For now, focus on fixing unexpected failures.
        *   **Do not proceed if tests related to this code are unexpectedly failing.**
        ```bash
        # Adapt to run specific tests if possible, or the full suite if granular testing isn't easy:
        # pnpm test
        ```
    3.  **(Optional) Manual Check:** If applicable, run the application or specific commands to manually verify the basic functionality behaves as expected *for this specific change*.

*   **Commit (Only After Successful Verification):** Stage and commit *only* the code changes directly related to *this step's* implementation.
    ```bash
    # Add only the files modified IN THIS STEP
    git add <path/to/modified/code/files> # e.g., git add src/auth.ts
    # Use a clear, structured commit message
    git commit -m "feat/fix/refactor: Implement core logic for {{TASK_DESCRIPTION}} (Step 1)" -m "Description: [Specific changes made, e.g., Added input validation and account lock check in authenticate function]" -m "Verification: Passed lint, types, and relevant tests." -m "(Impact Note: Acknowledged potential impact on listed files - tests to be updated next)"
    ```

--- 