<template>

<instructions>
- Begin with a high-level summary clearly describing the goal of the task.
- Step 0 must always instruct the junior developer to create a new branch using standard GitHub workflows specifically addressing the <task/>.
- The numbered steps should be concise, explicit, and unambiguous.
- Each step must contain COMPLETE code snippets, commands, or clear actions that directly modify the codebase.
- Ensure each step is small, focused, and individually verifiable.
- **Code Snippets:** 
  - Always provide COMPLETE code for each file being modified, not just fragments.
  - Show the ENTIRE function or component being changed, with context.
  - Clearly indicate what code is being removed and what is being added.
  - For larger files, use comments like `// ... existing code ...` to indicate unchanged sections, but be sure to include sufficient context.
- **Verification:**
  - Include instructions to programmatically verify each step's changes *before* committing.
  - **Run linters and type checks (`npm run lint`, `npm run typecheck`, or similar) frequently.**
  - **Run the *full* relevant test suite (`npm test`, `pnpm test`, or specific suites like `npm test -- --suite integration`) after each significant code change.** Don't rely solely on commit hooks.
  - If tests exist, add or update tests covering the changes. If tests fail, analyze the output carefully to understand the cause before proceeding. Use debuggers or logging if needed.
  - If tests don't exist, add clear manual verification steps, including edge cases.
  - **Be mindful of differences between runtime and test environments (I/O, env vars, `process.exit` mocking). Verify behavior in both contexts if relevant.**
- End each step by clearly instructing the junior developer to commit their changes using standard GitHub workflows *only after successful verification*.
- **Commit Strategy:** Aim for small, atomic commits after each verified step. If a step requires multiple small fixes to pass verification, commit them together for that step. Avoid large commits encompassing unrelated fixes or extensive debugging.
- IMPORTANT: NEVER use newline characters in Git commit messages as they can break workflows. Always use multiple '-m' parameters instead.
- IMPORTANT: NEVER use newline characters in any shell commands. For multiline text in commands, use '\n' escape sequences.
- git and gh commands should always be run with "| cat" to avoid pager behavior.

- **High-Level Summary:**
  - Clearly describe the overall goal of completing the <task/>. Ensure you understand how the changes might interact with other parts of the system, including tests.

- **Step 0: Create a New Branch**
  - **Action:** Create and switch to a new branch specifically for the <task/>:
    ~~~bash
    # Example: feature/update-user-auth or fix/resolve-login-bug
    git checkout -b <type>/<short-description-of-task> | cat
    ~~~
  - **Verification:** Confirm the branch was created successfully:
    ~~~bash
    git branch | cat
    ~~~
  - **Commit:** No commit required at this stage.

- **Step 1: Implement Code Changes**
  - **Action:** Modify the relevant files to address the <task/>. Understand how these changes affect program flow and potential side effects.
    ~~~typescript
    // COMPLETE example showing the ENTIRE function or component:
    
    // Before changes:
    function authenticate(username: string, password: string): boolean {
      // ... existing implementation ...
      return isValid;
    }
    
    // After changes:
    function authenticate(username: string, password: string): boolean {
      if (!username || !password) {
        return false;
      }
      
      // ... existing validation logic ...
      
      return isValid && !isLocked;
    }
    ~~~
    *Self-Correction Prompt: Did you consider how this change interacts with the test environment's mocking (e.g., for `process.exit`, network requests)?*
  - **Verification:**
    1. Run linters and type checkers: `pnpm lint && pnpm build:check` (or equivalent). Fix any errors.
    2. Run the application or relevant commands if applicable to manually check basic functionality.
    3. **Run the full test suite relevant to the changes:** `pnpm test` (or `pnpm test -- <path/to/relevant/tests>`). Analyze and fix any failures.
  - **Commit:** Stage and commit changes *only after all verification steps pass*:
    ~~~bash
    git add <path/to/modified/files>
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git commit -m "feat/fix/refactor: Describe primary change for <task/>" -m "Provide a concise explanation of the 'what' and 'why'." -m "Add context if needed (e.g., 'Addresses issue #123')."
    ~~~

- **Step 2: Add or Update Tests**
  - **Action:** Add new tests or update existing ones in the relevant test files (e.g., `test/auth.test.ts`) to cover the changes made in Step 1, including edge cases and potential regressions.
    ~~~typescript
    // COMPLETE test example:
    
    // Before changes:
    describe('Authentication', () => {
      it('should return true for valid credentials', () => {
        expect(authenticate('admin', 'password123')).toBe(true);
      });
    });
    
    // After changes:
    describe('Authentication', () => {
      it('should return true for valid credentials', () => {
        expect(authenticate('admin', 'password123')).toBe(true);
      });
      
      it('should handle invalid credentials gracefully', () => {
        expect(authenticate('', 'password123')).toBe(false);
        expect(authenticate('admin', '')).toBe(false);
        expect(authenticate('', '')).toBe(false);
      });
      
      it('should reject locked accounts even with valid credentials', () => {
        // Setup locked account state
        mockAccountLocked(true);
        expect(authenticate('admin', 'password123')).toBe(false);
        // Teardown
        mockAccountLocked(false);
      });
    });
    ~~~
  - **Verification:**
    1. Run linters and type checkers: `pnpm lint && pnpm build:check` (or equivalent). Fix any errors.
    2. **Run the full test suite, ensuring the new/updated tests pass and no existing tests regressed:** `pnpm test`. Analyze and fix any failures.
  - **Commit:** Stage and commit test changes *only after all verification steps pass*:
    ~~~bash
    git add <path/to/test/files>
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git commit -m "test: Add/update tests for <task/>" -m "Verify core behavior and edge cases."
    ~~~

- **Step 3: Push Branch**
  - **Action:** Push your verified branch to the remote repository:
    ~~~bash
    git push -u origin <type>/<short-description-of-task> | cat
    ~~~
  - **Verification:** Confirm your branch was pushed successfully and is tracking the remote:
    ~~~bash
    git branch -vv | cat
    ~~~
  - **Commit:** No commit required for this step.

- **Step 4: Create Pull Request with GitHub CLI**
  - **Action:**
    1.  Create a detailed PR description file (`/tmp/pr-description.md`) using the `edit tool`. Ensure it accurately reflects the *final* state of the branch.
~~~markdown
## Summary
[Provide a clear, concise overview of what changes were made and why. Reference the original <task/>.]

## Changes Made
- [List the key code changes implemented in Step 1]
- [Mention the tests added/updated in Step 2]
- [Note any significant refactoring or architectural decisions]

## Justification
- [Explain the rationale behind the implementation]
- [Reference any relevant issues (e.g., Closes #123)]

## Testing
- [Describe the verification steps performed (linting, type checks, full test suite run)]
- [Confirm all tests passed]
- [Mention any manual verification steps if applicable]

## Dependencies
- [List any dependencies added, removed, or updated]

## Additional Notes
- [Include any other relevant information, potential follow-up work, or considerations for the reviewer]
~~~
    2.  Use the file to create the PR:
    ~~~bash
    # ALWAYS use --body-file for PR descriptions to avoid newline issues
    gh pr create --title "feat/fix/refactor: Implement <task/>" --body-file /tmp/pr-description.md | cat
    ~~~
    3.  Clean up the temporary file:
    ~~~bash
    rm /tmp/pr-description.md
    ~~~
  - **Verification:** Confirm the PR was created successfully by checking the URL provided in the output. Check the PR details on GitHub.

- **Step 5: Return to Main Branch**
  - **Action:** Switch back to the main branch locally:
    ~~~bash
    git checkout main | cat
    ~~~
  - **Verification:** Confirm you've returned to the main branch:
    ~~~bash
    git branch --show-current | cat
    ~~~
  - **Commit:** No commit required; your task is now complete pending PR review.
</instructions>


<task>
Please describe your task
</task>
</template>