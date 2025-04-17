---
name: pr
category: generation
description: Full plan: new branch, MANDATORY commits/step (code/tests), push, PR.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---

<goal>Execute the request in the `<task>` tag (full workflow): Create branch `{{BRANCH_NAME}}`, implement+commit code & tests (verified), push, create PR, run retro, return main. Follow `<instructions>` strictly.</goal>

<instructions>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_push_branch.md' %}
{% include '_step_create_pr.md' %}
{% include '_step_retro.md' %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
