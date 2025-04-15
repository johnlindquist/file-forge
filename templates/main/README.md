# File Forge Templates

This directory contains templates for different code generation, documentation, and refactoring tasks used by File Forge.

## Template Structure

Templates are defined using Markdown files with YAML frontmatter. The frontmatter includes:

- `name`: Unique identifier for the template
- `category`: Category of the template (documentation, refactoring, generation)
- `description`: Human-readable description
- `variables`: (Optional) List of variables used in the template

## Modular Templates

Newer templates use a modular approach with the following components:

### Partials (_partials directory)

Reusable components that can be included in multiple templates. All partials are prefixed with an underscore `_` to indicate they are not meant to be used directly.

- `_header.md`: Common introduction and high-level summary
- `_step_create_branch.md`: Instructions for creating a Git branch
- `_step_verify_current_branch.md`: Instructions for verifying the current branch
- `_step_implement_code.md`: Code implementation steps with commits
- `_step_implement_code_no_commit.md`: Code implementation steps without commits
- `_step_add_tests.md`: Testing steps with commits
- `_step_add_tests_no_commit.md`: Testing steps without commits
- `_step_verify_changes.md`: Combined verification step for no-commit workflows
- `_step_push_branch.md`: Instructions for pushing to the remote repository
- `_step_create_pr.md`: Instructions for creating a Pull Request
- `_step_return_to_main.md`: Instructions for returning to the main branch
- `_footer.md`: Common conclusion

### Main Templates

Templates that use the partials to create complete workflows:

- `plan_modular.md`: Full plan with new branch, commits, tests, and PR
- `plan-current-branch.md`: Plan assuming work is done on the current branch
- `plan-no-commit.md`: Plan implementation steps without explicit commit instructions

## Usage

To use these templates with File Forge, run:

```bash
ffg --include <path> --template <template-name>
```

For example:

```bash
ffg --include src/feature.ts --template plan_modular
```

To list available templates:

```bash
ffg --list-templates
```

## Creating Custom Templates

You can create custom templates by:

1. Creating a new Markdown file in your templates directory
2. Adding the appropriate frontmatter
3. Using existing partials with the `{% include '_filename.md' %}` syntax
4. Running `ffg`