---
name: branch
category: generation
description: Plan work on a new branch with commits per step, no PR creation.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---
<prompt_instructions>
Generate a guide starting with creating a new branch, with commits after code and test steps, ending before PR creation.
</prompt_instructions>

<template>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% comment %} No Push or PR steps included {% endcomment %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</template> 