**Step 0: Ensure Correct Branch {% if BRANCH_NAME %}(`{{BRANCH_NAME}}`){% else %}(if specified){% endif %}**

*   **Goal:** Ensure you are on the correct branch{% if BRANCH_NAME %} (`{{BRANCH_NAME}}`){% endif %} for "{{TASK_DESCRIPTION}}", creating it **only if necessary** (i.e., if currently on `main` and a `BRANCH_NAME` is provided).
*   **Action 1: Check Current Branch:** Determine your current branch.
    ```bash
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch is: $CURRENT_BRANCH" | cat
    ```
    *(Agent Note: Remember the output `$CURRENT_BRANCH` for the next action.)*

*   **Action 2: Conditional Branch Creation/Check:**
    *   **IF `CURRENT_BRANCH` is exactly `main`:**
        *   **Check if `BRANCH_NAME` is provided:**
            {%- if BRANCH_NAME %}
        *   **Action 2a (Create Branch):** A `BRANCH_NAME` (`{{BRANCH_NAME}}`) was provided. Create and switch to it. Choose `feature/` or `fix/` prefix when defining `{{BRANCH_NAME}}`.
            ```bash
            # Example: git checkout -b feature/add-user-profile | cat
            # Example: git checkout -b fix/login-validation-error | cat
            echo "Currently on main branch. Creating and switching to {{BRANCH_NAME}}..." | cat
            git checkout -b {{BRANCH_NAME}} | cat
            ```
            {%- else %}
        *   **Action 2a (Error - Missing Branch Name):** No `BRANCH_NAME` was provided, but you are on `main`. Branch creation cannot proceed without a name.
            ```bash
            echo "ERROR: Currently on main branch, but no BRANCH_NAME was specified for the new branch. Cannot proceed with branch creation." | cat
            # Halting branch creation step. Agent should review task/template inputs.
            ```
            *(Agent Note: Stop execution of this step. A branch name is required when starting from `main`.)*
            {%- endif %}
    *   **ELSE (if `CURRENT_BRANCH` is NOT `main`):**
        *   You are already on branch `$CURRENT_BRANCH`. **DO NOT CREATE A NEW BRANCH.**
        *   **Proceed with the assumption** that `$CURRENT_BRANCH` is the intended branch for this task{% if BRANCH_NAME %} (ideally, it should match the provided `{{BRANCH_NAME}}`){% endif %}.
        *   *(Self-Correction/Agent Check: If `$CURRENT_BRANCH` differs significantly from expectations or the provided `{{BRANCH_NAME}}` (if any), double-check instructions/context. For this plan, we will proceed on `$CURRENT_BRANCH`.)*
        ```bash
        echo "Not on main branch (currently on $CURRENT_BRANCH). Skipping branch creation." | cat
        # No command needed here, staying on the current branch.
        ```

*   **Verification:** Confirm the working branch status.
    ```bash
    git branch --show-current | cat
    ```
    *(Agent Note:
    - If started on `main` AND `BRANCH_NAME` was provided: Expected output is `{{BRANCH_NAME}}`.
    - If started on `main` BUT `BRANCH_NAME` was missing: Branch creation was skipped/errored; output should still be `main`.
    - If started on a branch other than `main`: Branch creation was skipped; output should be the branch you started on (`$CURRENT_BRANCH`).
    The critical outcome is avoiding nested branches and handling missing names gracefully.)*

*   **Commit:** No commit needed here.

--- 