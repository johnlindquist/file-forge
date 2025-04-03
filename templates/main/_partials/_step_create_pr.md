**Step 4: Create a Pull Request**

*   **Goal:** Request a code review for your implementation of "{{TASK_DESCRIPTION}}".
*   **Action:** Create a Pull Request using the GitHub CLI or web interface.

    1.  **Prepare Description File:**
        *   Use the `edit_file` tool to create `./.temp/pr-description.md` with the following content:
            ```markdown
            ## Description

            Implemented {{TASK_DESCRIPTION}}.

            ## Changes Made

            - List the key changes here
            - Another change here

            ## Testing

            - Describe how you tested these changes
            ```
            *(Agent Note: Execute the `edit_file` tool with path `./.temp/pr-description.md` and the content above)*

    2.  **Create the PR:**
        ```bash
        # Option 1: Using GitHub CLI (if installed)
        # Assumes ./temp/pr-description.md was created by the edit_file tool in the previous step
        gh pr create --title "{{TASK_DESCRIPTION}}" --body-file ./temp/pr-description.md --base main | cat

        # Clean up the temporary file
        rm ./temp/pr-description.md
        ```

    3.  **Alternative: Use GitHub Web Interface:**
        ```bash
        # Option 2: Use the GitHub web interface
        # Visit https://github.com/USERNAME/REPO/pull/new/{{BRANCH_NAME}}
        # (You will need to manually copy/paste the description content)
        ```
*   **Verification:** Confirm the PR was created successfully by checking the output URL from the `gh pr create` command. Share this URL with your team for code review.

--- 