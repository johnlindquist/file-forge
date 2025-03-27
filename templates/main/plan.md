---
name: plan
category: generation
description: Plan work on current branch without commits per step or PR creation.
variables:
  - TASK_DESCRIPTION
---
<executive_summary>
Generate a guide assuming work on the current branch, without commits after code/test steps, ending before push/PR. Includes a final verification step for all changes.
</executive_summary>

<instructions>
{% include '_header.md' %}
{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code_no_commit.md' %}
{% include '_step_add_tests_no_commit.md' %}
{% include '_step_verify_changes_no_commit.md' %}
{% comment %} No Push or PR steps included {% endcomment %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
