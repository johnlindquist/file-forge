**Step 4: Create a Pull Request**

*   **Goal:** Request a code review for your implementation of "{{TASK_DESCRIPTION}}".
*   **Action:** Create a Pull Request using the GitHub CLI or web interface.
    ```bash
    # Option 1: Using GitHub CLI (if installed)
    # Create a temporary PR description file (uses explicit echo with \n for newlines)
    echo -e "## Description\n\nImplemented {{TASK_DESCRIPTION}}.\n\n## Changes Made\n\n- List the key changes here\n- Another change here\n\n## Testing\n\n- Describe how you tested these changes" > pr_description.txt
    
    # Create the PR using the description file
    gh pr create --title "{{TASK_DESCRIPTION}}" --body-file pr_description.txt --base main | cat
    
    # Clean up the temporary file
    rm pr_description.txt
    
    # Option 2: Use the GitHub web interface
    # Visit https://github.com/USERNAME/REPO/pull/new/{{BRANCH_NAME}}
    ```
*   **Verification:** Confirm the PR was created successfully by checking the output URL. Share this URL with your team for code review.

--- 