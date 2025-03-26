---
name: commit
category: generation
description: Plan work on current branch with commits per step, no PR creation.
variables:
  - TASK_DESCRIPTION
---
<prompt_instructions>
Generate a guide assuming work on the current branch, with commits after code and test steps, ending before PR creation.
</prompt_instructions>

<template>
{% include '_header.md' %}
{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% comment %} No Push or PR steps included {% endcomment %}
{% include '_footer.md' %}
</template> 