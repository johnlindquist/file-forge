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