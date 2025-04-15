---
name: branch
category: generation
description: Plan work on a new branch with MANDATORY commits per step (code & tests), no PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---
<executive_summary>
Generate a guide starting with creating a new branch, enforcing **strict commit-per-step verification** for code and test changes. Ends before push/PR creation. Includes returning to the main branch.
</executive_summary>

<instructions>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% comment %} No Push or PR steps included {% endcomment %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task> 