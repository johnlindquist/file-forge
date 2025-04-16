---
name: plan # Renamed from plan-no-commit conceptually
category: generation
description: Plan work on current branch with MANDATORY commits per step, ending before push/PR.
variables:
  - TASK_DESCRIPTION
---
<executive_summary>
Generate a guide assuming work on the current branch, enforcing **strict commit-per-step verification** for code and test changes. Ends before push/PR creation.
</executive_summary>

<instructions>
{% include '_header.md' %}
{% include '_step_verify_current_branch.md' %}
{% include '_step_implement_code.md' %} {% comment %} Uses updated strict version {% endcomment %}
{% include '_step_add_tests.md' %}    {% comment %} Uses updated strict version {% endcomment %}
{% comment %} No Push or PR steps included. Ends after the test commit. {% endcomment %}
{% include '_footer.md' %}         {% comment %} Uses updated version {% endcomment %}
</instructions>

<task>
{{TASK_DESCRIPTION}}
</task>
