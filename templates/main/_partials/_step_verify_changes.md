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
*   **Commit After Verification:** 
    ```bash
    # Stage all related changes
    git add <list-all-changed-files-here>
    
    # Commit with a clear message
    git commit -m "feat/fix: Implement {{TASK_DESCRIPTION}}" -m "Detailed description of what was changed and why" -m "Related issues: #XXX (if applicable)"
    ```

--- 