---
name: plan
category: generation
description: Plan work on current branch without commits per step or PR creation.
variables:
  - TASK_DESCRIPTION
---
<prompt_instructions>
Generate a guide assuming work on the current branch, without commits after each step, ending before PR creation. Emphasize final verification.
</prompt_instructions>

<template>
{% include '_header.md' %}
{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code_no_commit.md' %}
{% include '_step_add_tests_no_commit.md' %}
{% include '_step_verify_changes_no_commit.md' %}
{% comment %} No Push or PR steps included {% endcomment %}
{% include '_footer.md' %}
</template>

<instructions>
Begin with a high-level summary of what we're trying to accomplish with the implementation plan.
Then, break down the task into a step-by-step guide with the following sections:
1. Current branch verification
2. Implementation details (with complete before/after code examples)
3. Test creation/updates
4. Final verification steps

Each step should include clear code snippets where appropriate.
Mark specific tasks that need completion as `<task/>` items.
</instructions>

<task>
{{USER_TASK_HERE}}
</task>