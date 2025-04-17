# File Forge Templates

Templates for code gen, docs, refactoring used by File Forge.

## Template Structure

Markdown files w/ YAML frontmatter (`name`, `category`, `description`, `variables`).

## Modular Templates

Newer templates use reusable `_partials`:

- `_header.md`: Intro/summary
- `_step_create_branch.md`: Create Git branch
- `_step_verify_current_branch.md`: Verify current branch
- `_step_implement_code.md`: Code step (w/ commit)
- `_step_implement_code_no_commit.md`: Code step (no commit)
- `_step_add_tests.md`: Test step (w/ commit)
- `_step_add_tests_no_commit.md`: Test step (no commit)
- `_step_verify_changes.md`: Verify step (no-commit flow)
- `_step_push_branch.md`: Push branch
- `_step_create_pr.md`: Create PR
- `_step_return_to_main.md`: Return to main
- `_footer.md`: Conclusion

### Main Templates

Use partials for workflows: `plan_modular`, `plan-current-branch`, `plan-no-commit`.

## Usage

`ffg --include <path> --template <template-name>`
Example: `ffg --include src/f.ts --template plan_modular`
List: `ffg --list-templates`

## Creating Custom Templates

1. New `.md` file in templates dir.
2. Add frontmatter.
3. Use `{% include '_filename.md' %}`.
4. Run `ffg`.
