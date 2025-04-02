---
name: worktree
category: generation
description: Plan work assuming user is already in a Git worktree for the task, with commits per step and PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME # Still useful for push/PR commands, even if branch exists
---
<executive_summary>
Generate a step-by-step guide for implementing a task **assuming you are already working inside the relevant Git worktree and on the correct feature branch.** This guide covers code implementation, testing (with commits per step), pushing the branch, and creating a Pull Request.
</executive_summary>

<instructions>
{% include '_header.md' %}

**Important:** This guide assumes you are currently working *inside* the Git worktree associated with the branch `{{BRANCH_NAME}}` (or the relevant branch for "{{TASK_DESCRIPTION}}"). All commands should be run from within this worktree's directory.

{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_push_branch.md' %}
{% include '_step_create_pr.md' %}
{% comment %} No '_step_return_to_main.md' needed as the main checkout is separate {% endcomment %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>