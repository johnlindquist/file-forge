---
name: plan
category: generation
description: Plan on CURRENT branch; MANDATORY commits/step; ends before push/PR.
variables:
  - TASK_DESCRIPTION
---

<goal>Execute the request in the `<task>` tag on the current branch: Implement+commit code & tests with strict verification per `<instructions>`. Stop before push/PR.</goal>

<instructions>
{% include '_header.md' %}
{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code.md' %}
{% include '_step_add_tests.md' %}
{% include '_footer.md' %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
