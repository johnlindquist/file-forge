**Step 0: Verify Current Branch**

*   **Goal:** Confirm you're on the correct branch for implementing "{{TASK_DESCRIPTION}}".
*   **Action:** Check which branch you're currently on.
    ```bash
    git branch --show-current | cat
    ```
*   **Note:** If the output shows a branch other than where you want to implement this feature, switch to the appropriate branch or create a new one.
    ```bash
    # Option 1: Switch to existing branch
    git checkout [branch-name] | cat
    
    # Option 2: Create and switch to a new branch
    git checkout -b [branch-name] | cat
    ```

--- 