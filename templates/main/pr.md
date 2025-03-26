---
name: pr
category: generation
description: Full plan - new branch, commits per step, push, and PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---
<prompt_instructions>
Generate a full step-by-step guide: new branch, implement, test (with commits), push, create PR, return to main.
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