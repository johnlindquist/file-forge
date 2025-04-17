---
name: worktree
category: generation
description: Plan in existing worktree; MANDATORY commits/step, PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME # Still needed for push/PR
---

<goal>Execute the request in the `<task>` tag within the existing worktree/branch `{{BRANCH_NAME}}`: Implement+commit code & tests (verified), push, create PR, run retro. Follow `<instructions>` strictly.</goal>

<instructions>
{% include '_header.md' %}

**Important:** Assumes you are _inside_ the worktree for branch `{{BRANCH_NAME}}`. Run commands from worktree dir.

{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_push_branch.md' %}
{% include '_step_create_pr.md' %}
{% include '_step_retro.md' %}
{% comment %} No return to main needed here {% endcomment %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
