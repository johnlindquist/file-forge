<instructions>
- Begin with a high-level summary clearly describing the goal of the task.
- Step 0 must always instruct the junior developer to create a new branch using standard GitHub workflows specifically addressing the <task/>.
- The numbered steps should be concise, explicit, and unambiguous.
- Each step must contain a complete, ready-to-implement code snippet, command, or clear action that directly modifies the codebase.
- Code snippets must be complete, showing exactly what needs to be added, removed, or modified in the file, including necessary context.
- When modifying existing files, include:
  - The full path to the file
  - The original code block being modified (with surrounding context)
  - The complete new code block that should replace it
  - Any imports or dependencies that need to be added
- Ensure each step is small, focused, and individually verifiable.
- Verify:
  - Include instructions to programmatically verify each commit.
  - If tests exist, please add a test.
  - If tests don't exist, add manual instructions to verify.
- End each step by clearly instructing the junior developer to commit their changes using standard GitHub workflows.
- IMPORTANT: NEVER use newline characters in Git commit messages as they can break workflows. Always use multiple '-m' parameters instead.
- IMPORTANT: NEVER use newline characters in any shell commands. For multiline text in commands, use '\n' escape sequences.
- git and gh commands should always be run with "| cat" to avoid pager behavior

- **High-Level Summary:**
  - Clearly describe the overall goal of completing the <task/>.

- **Step 0: Create a New Branch**
  - **Action:** Create and switch to a new branch specifically for the <task/>:
    ~~~bash
    git checkout -b feature/<short-description-of-task>
    ~~~
  - **Verification:** Confirm the branch was created successfully:
    ~~~bash
    git branch | cat
    ~~~
  - **Commit:** No commit required at this stage.

- **Step 1: Implement Code Changes**
  - **Action:** Modify the relevant files to address the <task/>. 
    
    Include the exact file path and complete code snippets showing:
    ~~~
    // FILE: path/to/file.js
    
    // BEFORE:
    function existingFunction() {
      // Show the complete original code block with enough context
      // ...
    }
    
    // AFTER:
    function existingFunction() {
      // Show the complete modified code with all necessary changes
      // ...
      // Include any new imports, variables, or dependencies needed
    }
    ~~~
    
  - **Verification:** Run the existing application or relevant commands to verify functionality.
  - **Commit:** Stage and commit changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    # For multiline echo commands, use \n instead of actual newlines
    git add .
    git commit -m "fix/feat/etc: Implement changes for <task/>" -m "brief description" -m "additional context if needed"
    ~~~

- **Step 2: Add or Update Tests**
  - **Action:** Add new tests or update existing ones covering the changes made:
    
    Include the exact file path and complete test code:
    ~~~
    // FILE: path/to/tests/test_file.js
    
    // Complete test code with imports, test setup, assertions, etc.
    import { ... } from '...';
    
    describe('Feature being tested', () => {
      it('should behave as expected', () => {
        // Complete test implementation
        // ...
        expect(...).toBe(...);
      });
    });
    ~~~
    
  - **Verification:** Ensure tests pass:
    ~~~bash
    npm test
    ~~~
  - **Commit:** Stage and commit test changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    # For multiline echo commands, use \n instead of actual newlines
    git add .
    git commit -m "fix/feat/etc: Add/update tests for <task/>" -m "verify feature behavior"
    ~~~

- **Step 3: Push Branch**
  - **Action:** Push your branch to GitHub:
    ~~~bash
    git push -u origin feature/<short-description-of-task>
    ~~~
  - **Verification:** Confirm your branch was pushed successfully:
    ~~~bash
    git branch -vv | cat
    ~~~
  - **Commit:** No commit required for this step.

- **Step 4: Create Pull Request with GitHub CLI**
  - **Action:** First, create a PR description file (ALWAYS use a bodyfile for PRs):
  - Create the body file in the /tmp directory using the "edit tool":
  - Example: /tmp/pr-description.md
~~~markdown
## Summary
[Provide a clear, concise overview of what changes were made and why]

## Changes Made
- [List the key changes implemented]
- [Include any architectural decisions]
- [Mention files modified]

## Justification
- [Explain the rationale behind implementation choices]
- [Reference any relevant issues or requirements]

## Testing
- [Describe how the changes were tested]
- [Include test results if applicable]

## Dependencies
- [List any dependencies added or modified]
- [Note any version changes]

## Additional Notes
- [Include any other relevant information]
- [Mention any follow-up work needed]
~~~
    
    Then, use the file to create the PR:
    ~~~bash
    # ALWAYS use bodyfile for PR descriptions to avoid newline issues
    gh pr create --title "feat/fix: Implement <task/>" --body-file /tmp/pr-description.md | cat
    
    # Clean up the temporary file
    rm /tmp/pr-description.md
    ~~~
  - **Verification:** Confirm the PR was created successfully by checking the URL provided in the output.

- **Step 5: Return to Main Branch**
  - **Action:** Switch back to the main branch:
    ~~~bash
    git checkout main
    ~~~
  - **Verification:** Confirm you've returned to the main branch:
    ~~~bash
    git branch --show-current | cat
    ~~~
  - **Commit:** No commit required; your task is now complete.
</instructions>


<task>
The user needs to replace this text with their task. If they forget to replace this text, prompt them with: "Please describe your task "
</task>