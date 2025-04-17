---
name: branch
category: generation
description: Plan on NEW branch; MANDATORY commits/step (code/tests); no PR.
variables:
  - TASK_DESCRIPTION
  - BRANCH_NAME
---

<goal>Execute the request in the `<task>` tag: Create branch `{{BRANCH_NAME}}`, implement+commit code & tests with strict verification per `<instructions>`, then return to main.</goal>

<instructions>
{% include '_header.md' %}
{% include '_step_create_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_step_return_to_main.md' %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
