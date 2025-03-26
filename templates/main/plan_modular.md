---
name: plan_modular
category: generation
description: Full plan with new branch, commits, tests, and PR (modular version).
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---
<prompt_instructions>
You are tasked with generating a step-by-step guide for a junior developer to complete a specific coding task using standard Git and GitHub workflows.

1.  **Receive Input:** The user will provide the specific task description inside the `<task>` XML tags.
2.  **Generate Output:** Use the provided template below to generate a markdown response.
3.  **Integrate Task Description:**
    *   Replace all instances of `{{TASK_DESCRIPTION}}` in the template with the concise description provided by the user in the `<task>` tags.
    *   Generate a suitable branch name (e.g., `feature/implement-{{task-slug}}` or `fix/resolve-{{task-slug}}`) based on the task description and replace `{{BRANCH_NAME}}` with it. Use kebab-case for the descriptive part.
    *   Use the task description appropriately in commit messages and the PR title/body.
4.  **Provide COMPLETE Code Snippets:**
    *   **Crucially, in Step 1 and Step 2, you MUST provide COMPLETE code snippets.** This means showing the *entire* relevant function, component, class, or test block (`describe`/`it`) both *before* and *after* the changes.
    *   Use comments like `// ... existing code ...` ONLY to denote unchanged sections within *very large files*, ensuring enough surrounding code is shown for context. Do NOT use `...` for small or moderately sized blocks.
    *   Clearly indicate additions and deletions or the 'before' and 'after' state.
5.  **Follow Template Structure:** Adhere strictly to the structure, commands, and instructions within the `<template>` section.
6.  **Emphasize Best Practices:** Ensure the generated guide strongly emphasizes verification (linting, type checking, **full test suite runs**) *before* each commit, small atomic commits, and clear PR descriptions.
7.  **Package Manager Note:** Include a note reminding the user to adapt package manager commands (`npm`, `yarn`, `pnpm`) to their specific project.
8.  **Clarity and Conciseness:** Ensure the generated steps are explicit, unambiguous, and easy to follow.
</prompt_instructions>

<template>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_push_branch.md' %}
{% include '_step_create_pr.md' %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</template> 