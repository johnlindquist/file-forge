<prompt_instructions>
You are tasked with generating a step-by-step guide for a junior developer to complete a specific coding task using standard Git and GitHub workflows.

1.  **Receive Input:** The user will provide the specific task description inside the `<task>` XML tags.
2.  **Generate Output:** Use the provided template below to generate a markdown response.
3.  **Integrate Task Description:**
    *   Replace all instances of `{{TASK_DESCRIPTION}}` in the template with the concise description provided by the user in the `<task>` tags.
    *   Generate a suitable branch name (e.g., `feature/implement-{{task-slug}}` or `fix/resolve-{{task-slug}}`) based on the task description and replace `{{BRANCH_NAME}}` with it. Use kebab-case for the descriptive part.
    *   Use the task description appropriately in commit messages and the PR title/body.
4.  **Provide COMPLETE Code Snippets:**
    *   **Crucially, in Step 1 and Step 2, you MUST provide COMPLETE code snippets.** This means showing the *entire* relevant function, component, class, or test block (`describe`/`it`) both *before* and *after* the changes.
    *   Use comments like `// ... existing code ...` ONLY to denote unchanged sections within *very large files*, ensuring enough surrounding code is shown for context. Do NOT use `...` for small or moderately sized blocks.
    *   Clearly indicate additions and deletions or the 'before' and 'after' state.
5.  **Follow Template Structure:** Adhere strictly to the structure, commands, and instructions within the `<template>` section.
6.  **Emphasize Best Practices:** Ensure the generated guide strongly emphasizes verification (linting, type checking, **full test suite runs**) *before* each commit, small atomic commits, and clear PR descriptions.
7.  **Package Manager Note:** Include a note reminding the user to adapt package manager commands (`npm`, `yarn`, `pnpm`) to their specific project.
8.  **Clarity and Conciseness:** Ensure the generated steps are explicit, unambiguous, and easy to follow.
</prompt_instructions>

<template>
# Guide: {{TASK_DESCRIPTION}}

**High-Level Summary:**
This guide outlines the steps to successfully implement "{{TASK_DESCRIPTION}}". It emphasizes a structured workflow using Git, including branching, incremental changes with verification (including COMPLETE code examples), testing, and creating a clear Pull Request on GitHub. Adhering to these steps ensures code quality and smooth integration.

*(Note: Adapt package manager commands like `pnpm run ...` or `npm test` to match your project's setup: `npm`, `yarn`, or `pnpm`.)*

---

**Step 0: Create a New Branch**

*   **Goal:** Isolate your work for "{{TASK_DESCRIPTION}}" on a dedicated branch.
*   **Action:** Create and switch to a new branch. Choose `feature/` for new functionality or `fix/` for bug fixes.
    ```bash
    # Example: git checkout -b feature/add-user-profile | cat
    # Example: git checkout -b fix/login-validation-error | cat
    git checkout -b {{BRANCH_NAME}} | cat
    ```
*   **Verification:** Confirm you are on the new branch.
    ```bash
    git branch --show-current | cat
    # Expected output: {{BRANCH_NAME}}
    ```
*   **Commit:** No commit needed here.

---

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

*   **Verification (Mandatory Before Commit):**
    1.  **Lint & Type Check:** Run linters and type checkers. Fix all reported issues.
        ```bash
        # Adapt to your project's scripts
        pnpm lint && pnpm build:check
        ```
    2.  **Run Tests:** Execute the *full* test suite relevant to your changes. Analyze and fix any failures meticulously. Use debuggers or logging if necessary. Do not rely solely on commit hooks.
        ```bash
        # Adapt to your project's scripts (e.g., npm test, yarn test, pnpm test -- <path/to/tests>)
        pnpm test
        ```
    3.  **(Optional) Manual Check:** If applicable, run the application or specific commands to manually verify the basic functionality behaves as expected.
*   **Commit (Only After Successful Verification):** Stage and commit *only* the changes related to this step.
    ```bash
    git add <path/to/modified/files> # e.g., git add src/auth.ts
    # IMPORTANT: Use multiple -m flags for multi-line commit messages. NO newlines directly in the command.
    git commit -m "feat/fix/refactor: Start implementing {{TASK_DESCRIPTION}}" -m "Description of specific changes made (e.g., Added validation, integrated account lock check)." -m "(Optional) Further context or issue reference (e.g., Part of #123)."
    ```

---

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
*   **Commit (Only After Successful Verification):** Stage and commit *only* the test file changes.
    ```bash
    git add <path/to/test/files> # e.g., git add test/auth.test.ts
    # IMPORTANT: Use multiple -m flags for multi-line commit messages.
    git commit -m "test: Add/update tests for {{TASK_DESCRIPTION}}" -m "Verify new validation logic and account locking behavior."
    ```

---

**Step 3: Push Branch to Remote**

*   **Goal:** Upload your local branch and its commits to the remote repository (e.g., GitHub).
*   **Action:** Push the branch, setting it up to track the remote branch.
    ```bash
    git push -u origin {{BRANCH_NAME}} | cat
    ```
*   **Verification:** Check that the branch was pushed and is tracking the remote.
    ```bash
    git branch -vv | cat
    # Look for your branch: {{BRANCH_NAME}} [origin/{{BRANCH_NAME}}] ...
    ```
*   **Commit:** No commit needed here.

---

**Step 4: Create Pull Request (PR)**

*   **Goal:** Propose your changes for review and merging into the main codebase.
*   **Action:**
    1.  **Prepare Description:** Create a temporary file (e.g., `/tmp/pr-description.md`) with a detailed description of your changes using your preferred text editor. Use the markdown template below. Ensure it reflects the *final state* of your branch.
        ```markdown
        ## Summary
        Implements "{{TASK_DESCRIPTION}}". [Add 1-2 sentences explaining the goal and the solution, e.g., Added input validation and account lock checks to the authentication function.]

        ## Changes Made
        - Modified `src/auth.ts`: [Briefly describe changes, e.g., Added checks for empty username/password and called `isAccountLocked`].
        - Updated `test/auth.test.ts`: [Briefly describe changes, e.g., Added test cases for input validation and locked accounts].
        - [Mention any significant refactoring or design choices]

        ## Justification
        - [Explain why these changes were necessary, e.g., Improves security by preventing authentication attempts with invalid input and locking out compromised accounts.]
        - [Reference related issues, e.g., Closes #123, Addresses #456]

        ## Testing
        - Verified changes using linting (`pnpm lint`) and type checking (`pnpm build:check`).
        - Ran the full test suite (`pnpm test`) after code changes and after adding/updating tests. All tests pass. Confirmed coverage for new logic.
        - [Mention any specific manual verification steps performed, if any]

        ## Dependencies
        - [List any dependencies added, removed, or updated, e.g., Added mock setup for `isAccountLocked` in tests.]

        ## Additional Notes
        - [Any other context for the reviewer, potential follow-up work, etc.]
        ```
    2.  **Create PR:** Use the GitHub CLI (`gh`) and your description file to create the Pull Request. Using `--body-file` avoids issues with newlines and complex formatting in the shell.
        ```bash
        # Update the title appropriately (e.g., feat: Enhance authentication with validation and locking)
        gh pr create --title "feat/fix: Implement {{TASK_DESCRIPTION}}" --body-file /tmp/pr-description.md | cat
        ```
    3.  **Clean Up:** Remove the temporary description file.
        ```bash
        rm /tmp/pr-description.md
        ```
*   **Verification:** Check the output of the `gh pr create` command for the URL of the newly created PR. Visit the URL in your browser to confirm the title, body, and associated changes are correct.
*   **Commit:** No commit needed here.

---

**Step 5: Return to Main Branch**

*   **Goal:** Switch your local repository back to the main branch to keep it updated and ready for future tasks.
*   **Action:** Check out the main branch (commonly `main` or `master`).
    ```bash
    # Use 'main', 'master', or your project's default branch name
    git checkout main | cat
    ```
*   **Verification:** Confirm you are back on the main branch.
    ```bash
    git branch --show-current | cat
    # Expected output: main (or your default branch name)
    ```
*   **Commit:** No commit needed. Your work for "{{TASK_DESCRIPTION}}" is submitted for review via the PR.

---
</template>

<task>
{{USER_TASK_HERE}}
</task>