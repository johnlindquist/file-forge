---
name: pr
category: generation
description: Full plan - new branch, commits per step, push, and PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---
<executive_summary>
Generate a full step-by-step guide: create a new branch, implement code, add tests (with commits after each), push the branch, create a Pull Request, and return to the main branch.
</executive_summary>

<instructions>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_push_branch.md' %}
{% include '_step_create_pr.md' %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>