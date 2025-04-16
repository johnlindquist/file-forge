**Step 4: Create a Pull Request**

*   **Goal:** Request a code review for your implementation of "{{TASK_DESCRIPTION}}", highlighting the structured approach taken.
*   **Action:** Create a Pull Request using the GitHub CLI or web interface.

    1.  **Prepare Description File:**
        *   Use the `edit_file` tool to create `./.temp/pr-description.md` with the following content:
            ```markdown
            ## Description

            Implemented {{TASK_DESCRIPTION}}.

            This was implemented following a strict commit-per-step process:
            - Commit 1: [Brief summary of Step 1 commit message]
            - Commit 2: [Brief summary of Step 2 commit message]
            - (Add more commits as applicable)

            ## Key Changes Made

            - List the main functional changes here
            - Another change here

            ## Testing

            - Describe how the changes were tested (unit tests added/updated, manual checks performed). Mention that all tests pass.
            ```
            *(Agent Note: Execute the `edit_file` tool with path `./.temp/pr-description.md` and the content above. You should fill in the commit summaries based on the plan generated.)*

    2.  **Create the PR:**
        ```bash
        # Option 1: Using GitHub CLI (if installed)
        # Assumes ./temp/pr-description.md was created by the edit_file tool
        gh pr create --title "{{TASK_DESCRIPTION}}" --body-file ./temp/pr-description.md --base main | cat

        # Clean up the temporary file
        rm ./temp/pr-description.md
        ```

    3.  **Alternative: Use GitHub Web Interface:**
        ```bash
        # Option 2: Use the GitHub web interface
        # Visit https://github.com/USERNAME/REPO/pull/new/{{BRANCH_NAME}}
        # (Manually copy/paste the description content, including commit summaries)
        ```
*   **Verification:** Confirm the PR was created successfully via the output URL. Share this URL for review. Ensure the PR description accurately reflects the work done and the structured commits.

--- 