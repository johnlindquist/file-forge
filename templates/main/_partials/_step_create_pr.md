**Step 4: Create Pull Request**

- **Goal:** Request review for "{{TASK_DESCRIPTION}}".
- **Action:** Create PR.

  1.  **Prep Desc File:** Use `edit_file` tool for `./.temp/pr-description.md`:

      ```markdown
      ## Desc

      Implemented {{TASK_DESCRIPTION}}.

      Structured commits:

      - Commit 1: [Summary Step 1]
      - Commit 2: [Summary Step 2]
      - (Add more)

      ## Changes

      - Main change 1
      - Main change 2

      ## Testing

      - How tested (unit, manual). All tests pass.
      ```

      _(Agent: Fill commit summaries from plan.)_

  2.  **Create PR:**
      ```bash
      # Option 1: GitHub CLI
      gh pr create --title "{{TASK_DESCRIPTION}}" --body-file ./.temp/pr-description.md --base main
      rm ./.temp/pr-description.md
      ```
  3.  **Alt: Web UI:** `https://github.com/USERNAME/REPO/pull/new/{{BRANCH_NAME}}` (Paste description).

- **Verify:** Confirm PR created (URL). Check description accuracy.

---
