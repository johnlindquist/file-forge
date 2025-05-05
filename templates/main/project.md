<instructions>
Create "./cursor/rules/project.mdc" file following the style/structure in the `<example>` tag below. The output must be suitable for a project.mdc file.
Include: Brief project desc, key files/purpose, core features, main components/interactions, dev workflows.
Base *only* on the project context provided by the surrounding files/selection relevant to the `<task>` tag content.
</instructions>

**(Generated: {{ GENERATION_DATE }})**

## <example>

description: [Short project desc]
globs: [Relevant globs]
alwaysApply: true

---

# Project Name

## Key Files

- `path/to/file1`: Purpose
- `path/to/file2`: Purpose

## Core Features

- Feature 1: Brief desc
- Feature 2: Brief desc

## Main Components

- Component A: Interaction/role
- Component B: Interaction/role

## Dev Workflow

- Key aspects (language, build, test, conventions)
  </example>

<task>
Generate project.mdc content in markdown codefence:
```markdown
[Generated project.mdc content here]
```
</task>
