**Step 3: Verify All Changes Together**

*   **Goal:** Ensure all changes made for "{{TASK_DESCRIPTION}}" work together correctly and pass all quality checks.
*   **Action:** Review the changes you've made across all files and verify them as a complete feature/fix.
    ```bash
    # Review the status of your working directory
    git status | cat
    
    # See a summary of your changes
    git diff --stat | cat
    
    # Review the full diff of your changes
    git diff | cat
    ```
*   **Comprehensive Verification:**
    1.  **Lint & Type Check:** Run linters and type checkers across the entire codebase.
        ```bash
        # Adapt to your project's scripts
        pnpm lint && pnpm build:check
        ```
    2.  **Run All Tests:** Execute the complete test suite to verify overall project integrity.
        ```bash
        # Adapt to your project's scripts
        pnpm test
        ```
    3.  **(Optional) Build & Run:** If applicable, build the project and perform a quick manual verification.
        ```bash
        # Adapt to your project's scripts
        pnpm build && pnpm start
        ```
*   **Ready for Commit:** At this point, all your changes are verified and ready to be committed. You can proceed to commit them according to your project's workflow.

--- 