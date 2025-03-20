// src/templates.ts

/**
 * Prompt templates for different AI tasks.
 * These templates are structured to guide the AI for specific coding tasks.
 */

export interface PromptTemplate {
  name: string;
  category: string;
  description: string;
  prompt: string;
}

/**
 * Available template categories
 */
export enum TemplateCategory {
  DOCUMENTATION = "documentation",
  REFACTORING = "refactoring",
  GENERATION = "generation",
}

/**
 * Collection of prompt templates
 */
export let TEMPLATES: PromptTemplate[] = [
  // Documentation & Explanation Templates
  {
    name: "explain",
    category: TemplateCategory.DOCUMENTATION,
    description: "Explain/Summarize Code - Summarize what a code file does in plain language",
    prompt: `**Goal:** Provide a clear explanation of the following code's functionality and purpose.

**Context:**  
{code}

<instructions>
- Describe what the code does and how it works.  
- Keep the explanation concise and in plain language (no code output).  
- Do **not** modify or rewrite the code; only explain it.
</instructions>

<task>
Provide a clear and concise explanation of what this code does and how it works in plain language.
</task>`,
  },
  {
    name: "document",
    category: TemplateCategory.DOCUMENTATION,
    description: "Add Comments (Document Code) - Insert explanatory comments into the code",
    prompt: `**Goal:** Document the code by adding helpful comments explaining each major section or logic.

**Context:**  
{code}

<instructions>
- Insert concise comments or docstrings in the code to clarify its functionality.  
- Preserve the original code logic and formatting.  
- Mark new comments clearly (e.g., start lines with \`//\` or \`#\` as appropriate).  
- Return the updated code with the new comments and no other alterations.
</instructions>

<task>
Add clear, helpful comments to the code that explain each major section, function, or logic flow.
</task>`,
  },
  {
    name: "project",
    category: TemplateCategory.DOCUMENTATION,
    description: "Add project.mdc file - Create a Cursor Rules file for project documentation",
    prompt: `**Goal:** Create a project.mdc file that provides a high-level overview of the codebase structure.

**Context:**  
{code}

<instructions>
Add a "./cursor/rules/project.mdc" file that follows the same style as the example block below. Make sure to mimic the structure and formatting for consistency.

The file should:
1. Include a brief description of the project
2. List and describe key files and their purposes
3. Outline core features and functionality
4. Explain main components and their interactions
5. Describe any relevant development workflows or patterns

<example>
---
description: 
globs: 
alwaysApply: true
---

# GHX - GitHub Code Search CLI

## Key Files

- src/index.ts: Main entry point that defines the CLI commands, search functionality, and result handling
- src/constants.ts: Contains shared constants used across the codebase
- package.json: Project configuration, dependencies, and scripts
- test/index.test.ts: Test suite for verifying functionality
- .husky/pre-commit: Git hooks for ensuring code quality before commits

## Core Features

1. **GitHub Code Search**:
   - Searches GitHub code using the GitHub API
   - Uses the GitHub CLI for authentication
   - Supports advanced search qualifiers

2. **Result Processing**:
   - Formats search results into readable markdown
   - Provides context around code matches
   - Saves results to local filesystem

3. **Editor Integration**:
   - Configurable editor support
   - Prompts for editor preference on first run
   - Opens search results directly in preferred editor

4. **CLI Options**:
   - Customizable search limits
   - Context line configuration
   - Support for GitHub search qualifiers
   - Output piping capabilities

5. **Configuration Management**:
   - Persistent config via Conf package
   - Editor preferences
   - Cross-platform config location

## Main Components

- **Search Logic**: Handles API queries and result processing
- **Output Formatting**: Converts API results to human-readable format
- **Configuration**: Manages user preferences and settings
- **CLI Interface**: Parses command line arguments via yargs

## Development Workflow

- TypeScript-based codebase
- Build process using tsc
- Testing with Vitest
- Semantic versioning and releases
</example>
</instructions>

<task>
Generate the project.mdc content in a markdown codefence for easy copy/paste:

\`\`\`markdown
[Your generated project.mdc content here]
\`\`\`
</task>`,
  },

  // Refactoring & Improvement Templates
  {
    name: "refactor",
    category: TemplateCategory.REFACTORING,
    description: "Refactor for Readability - Improve clarity and maintainability without changing behavior",
    prompt: `**Goal:** Refactor the following code to improve readability and maintainability while preserving its behavior.

**Context:**  
{code}

<instructions>
- Simplify and restructure the code for clarity (e.g. break up complex functions, improve naming).  
- Do **not** change any functionality or introduce new bugs.  
- Ensure the output format is a unified diff or the full updated code with changes, so that modifications can be applied easily.  
- Do not include explanatory text—only provide the refactored code or diff.
</instructions>

<task>
Refactor this code to improve readability and maintainability while preserving the exact same behavior.
</task>`,
  },
  {
    name: "optimize",
    category: TemplateCategory.REFACTORING,
    description: "Optimize for Performance - Improve code efficiency without changing behavior",
    prompt: `**Goal:** Optimize the following code for performance while keeping its output and behavior unchanged.

**Context:**  
{code}

<instructions>
- Identify any inefficiencies or slow operations and refactor them for speed or lower resource usage.  
- Preserve the code's functionality and results exactly.  
- Present the optimized code changes (preferably as a diff or clearly marked modifications).  
- Only output the code changes; avoid extra commentary.
</instructions>

<task>
Optimize this code for better performance while maintaining the exact same behavior and output.
</task>`,
  },
  {
    name: "fix",
    category: TemplateCategory.REFACTORING,
    description: "Identify and Fix Issues - Find potential bugs or issues and fix them",
    prompt: `**Goal:** Review the following code for bugs or issues and fix them.

**Context:**  
{code}

<instructions>
- Analyze the code for logical errors, bugs, or any edge cases that might fail.  
- For each identified issue, modify the code to fix the problem. Ensure that fixes do not introduce new bugs.  
- Output the corrected code (or a diff of changes) with all fixes applied.  
- Exclude any explanatory text aside from necessary comments for the fixes.
</instructions>

<task>
Identify and fix any bugs, logical errors, or issues in this code.
</task>`,
  },

  // Code Generation Templates
  {
    name: "test",
    category: TemplateCategory.GENERATION,
    description: "Generate Unit Tests - Create tests for the given code",
    prompt: `**Goal:** Write unit tests to cover the functionality of the code below.

**Context:**  
{code}

<instructions>
- Generate a set of unit tests that thoroughly exercise the code's functions and critical paths.  
- Use an appropriate testing framework and assume the code above is imported or accessible.  
- Ensure tests are comprehensive and readable (cover normal cases, edge cases, and error conditions if applicable).  
- Output only the test code (e.g., in a file with test functions), without additional explanation.
</instructions>

<task>
Generate comprehensive unit tests for this code that cover both normal scenarios and edge cases.
</task>`,
  },

  {
    name: "plan",
    category: TemplateCategory.GENERATION,
    description: "Create an implementation plan - Generate step-by-step instructions with task tags",
    prompt: `**Goal:** Create a detailed implementation plan for the provided code.

**Context:**  
{code}

<instructions>
- Begin with a high-level summary clearly describing the goal of the task.
- Step 0 must always instruct the junior developer to create a new branch using standard GitHub workflows specifically addressing the <task/>.
- The numbered steps should be concise, explicit, and unambiguous.
- Each step must contain a code snippet, command, or clear action that directly modifies the codebase.
- Ensure each step is small, focused, and individually verifiable.
- Verify:
  - Include instructions to programmatically verify each commit.
  - If tests exist, please add a test.
  - If tests don't exist, add manual instructions to verify.
- End each step by clearly instructing the junior developer to commit their changes using standard GitHub workflows.
- IMPORTANT: NEVER use newline characters in Git commit messages as they can break workflows. Always use multiple '- m' parameters instead.
- git and gh commands should always be run with "| cat" to avoid pager behavior

- **High-Level Summary:**
  - Clearly describe the overall goal of completing the <task/>.

- **Step 0: Create a New Branch**
  - **Action:** Create and switch to a new branch specifically for the <task/>:
    ~~~bash
    git checkout -b feature/<short-description-of-task>
    ~~~
  - **Verification:** Confirm the branch was created successfully:
    ~~~bash
    git branch | cat
    ~~~
  - **Commit:** No commit required at this stage.

- **Step 1: Implement Code Changes**
  - **Action:** Modify the relevant files to address the <task/>:
    ~~~bash
    # Example: edit necessary file
    vim path/to/file.js
    ~~~
  - **Verification:** Run the existing application or relevant commands to verify functionality.
  - **Commit:** Stage and commit changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Implement changes for <task/>" -m "brief description" -m "additional context if needed"
    ~~~

- **Step 2: Add or Update Tests**
  - **Action:** Add new tests or update existing ones covering the changes made:
    ~~~bash
    vim path/to/tests/test_file.js
    ~~~
  - **Verification:** Ensure tests pass:
    ~~~bash
    npm test
    ~~~
  - **Commit:** Stage and commit test changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Add/update tests for <task/>" -m "verify feature behavior"
    ~~~

- **Step 3: Push Branch**
  - **Action:** Push your branch to GitHub:
    ~~~bash
    git push -u origin feature/<short-description-of-task>
    ~~~
  - **Verification:** Confirm your branch was pushed successfully:
    ~~~bash
    git branch -vv | cat
    ~~~
  - **Commit:** No commit required for this step.

- **Step 4: Create Pull Request with GitHub CLI**
  - **Action:** First, create a PR description file (ALWAYS use a bodyfile for PRs):
  - Create the body file in the /tmp directory using the "edit tool":
  - Example: /tmp/pr-description.md
~~~markdown
## Summary
[Provide a clear, concise overview of what changes were made and why]

## Changes Made
- [List the key changes implemented]
- [Include any architectural decisions]
- [Mention files modified]

## Justification
- [Explain the rationale behind implementation choices]
- [Reference any relevant issues or requirements]

## Testing
- [Describe how the changes were tested]
- [Include test results if applicable]

## Dependencies
- [List any dependencies added or modified]
- [Note any version changes]

## Additional Notes
- [Include any other relevant information]
- [Mention any follow-up work needed]
~~~
    
    Then, use the file to create the PR:
    ~~~bash
    # ALWAYS use bodyfile for PR descriptions to avoid newline issues
    gh pr create --title "feat/fix: Implement <task/>" --body-file /tmp/pr-description.md | cat
    
    # Clean up the temporary file
    rm /tmp/pr-description.md
    ~~~
  - **Verification:** Confirm the PR was created successfully by checking the URL provided in the output.

- **Step 5: Return to Main Branch**
  - **Action:** Switch back to the main branch:
    ~~~bash
    git checkout main
    ~~~
  - **Verification:** Confirm you've returned to the main branch:
    ~~~bash
    git branch --show-current | cat
    ~~~
  - **Commit:** No commit required; your task is now complete.
</instructions>


<task>
The user needs to replace this text with their task. If they forget to replace this text, prompt them with: "Please describe your task "
</task>`,
  },
  {
    name: "plan-no-branch",
    category: TemplateCategory.GENERATION,
    description: "Create an implementation plan without branch creation - Generate step-by-step instructions with task tags",
    prompt: `**Goal:** Create a detailed implementation plan for the provided code.

**Context:**  
{code}

<instructions>
- Begin with a high-level summary clearly describing the goal of the task.
- The numbered steps should be concise, explicit, and unambiguous.
- Each step must contain a code snippet, command, or clear action that directly modifies the codebase.
- Ensure each step is small, focused, and individually verifiable.
- Verify:
  - Include instructions to programmatically verify each commit.
  - If tests exist, please add a test.
  - If tests don't exist, add manual instructions to verify.
- End each step by clearly instructing the developer to commit their changes using standard GitHub workflows.
- IMPORTANT: NEVER use newline characters in Git commit messages as they can break workflows. Always use multiple '- m' parameters instead.

- **High-Level Summary:**
  - Clearly describe the overall goal of completing the <task/>.

- **Step 1: Implement Code Changes**
  - **Action:** Modify the relevant files to address the <task/>:
    ~~~bash
    # Example: edit necessary file
    vim path/to/file.js
    ~~~
  - **Verification:** Run the existing application or relevant commands to verify functionality.
  - **Commit:** Stage and commit changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Implement changes for <task/>" -m "brief description" -m "additional context if needed"
    ~~~

- **Step 2: Add or Update Tests**
  - **Action:** Add new tests or update existing ones covering the changes made:
    ~~~bash
    vim path/to/tests/test_file.js
    ~~~
  - **Verification:** Ensure tests pass:
    ~~~bash
    npm test
    ~~~
  - **Commit:** Stage and commit test changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Add/update tests for <task/>" -m "verify feature behavior"
    ~~~

- **Step 3: Push Changes**
  - **Action:** Push your changes:
    ~~~bash
    git push
    ~~~
  - **Verification:** Open GitHub and confirm your changes are visible.
  - **Commit:** No commit required; pushing completes your task.
</instructions>

<task>
The user needs to replace this text with their task. If they forget to replace this text, prompt them with: "Please describe your task "
</task>`,
  },
  {
    name: "worktree",
    category: TemplateCategory.GENERATION,
    description: "Create an implementation plan for a Git worktree - Generate step-by-step instructions for a specific branch",
    prompt: `**Goal:** Create a detailed implementation plan for the provided code, assuming you're already in a dedicated branch or worktree.

**Context:**  
{code}

<instructions>
- Begin with a high-level summary clearly describing the goal of the task.
- The plan assumes you're already in a dedicated branch or worktree for this task.
- The numbered steps should be concise, explicit, and unambiguous.
- Each step must contain a code snippet, command, or clear action that directly modifies the codebase.
- Ensure each step is small, focused, and individually verifiable.
- Verify:
  - Include instructions to programmatically verify each commit.
  - If tests exist, please add a test.
  - If tests don't exist, add manual instructions to verify.
- End each step by clearly instructing the developer to commit their changes using standard GitHub workflows.
- IMPORTANT: NEVER use newline characters in Git commit messages as they can break workflows. Always use multiple '- m' parameters instead.
- git and gh commands should always be run with "| cat" to avoid pager behavior

- **High-Level Summary:**
  - Clearly describe the overall goal of completing the <task/>.

- **Step 1: Verify Current Branch**
  - **Action:** Confirm you're in the correct branch for this task:
    ~~~bash
    git branch --show-current
    ~~~
  - **Verification:** The output should show your current branch name. If incorrect, switch to the appropriate branch before proceeding.

- **Step 2: Implement Code Changes**
  - **Action:** Modify the relevant files to address the <task/>:
    ~~~bash
    # Example: edit necessary file
    vim path/to/file.js
    ~~~
  - **Verification:** Run the existing application or relevant commands to verify functionality.
  - **Commit:** Stage and commit changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Implement changes for <task/>" -m "brief description" -m "additional context if needed"
    ~~~

- **Step 3: Add or Update Tests**
  - **Action:** Add new tests or update existing ones covering the changes made:
    ~~~bash
    vim path/to/tests/test_file.js
    ~~~
  - **Verification:** Ensure tests pass:
    ~~~bash
    npm test
    ~~~
  - **Commit:** Stage and commit test changes with a semantic commit message:
    ~~~bash
    # IMPORTANT: Always use multiple -m parameters instead of newlines
    git add .
    git commit -m "fix/feat/etc: Add/update tests for <task/>" -m "verify feature behavior"
    ~~~

- **Step 4: Push Changes**
  - **Action:** Push your changes to the remote repository:
    ~~~bash
    git push
    ~~~
  - **Verification:** Open GitHub and confirm your changes are visible.
  - **Commit:** No commit required; pushing completes your task.

- **Step 4: Create Pull Request with GitHub CLI**
  - **Action:** First, create a PR description file (ALWAYS use a bodyfile for PRs):
  - Create the body file in the /tmp directory using the "edit tool":
  - Example: /tmp/pr-description.md
~~~markdown
## Summary
[Provide a clear, concise overview of what changes were made and why]

## Changes Made
- [List the key changes implemented]
- [Include any architectural decisions]
- [Mention files modified]

## Justification
- [Explain the rationale behind implementation choices]
- [Reference any relevant issues or requirements]

## Testing
- [Describe how the changes were tested]
- [Include test results if applicable]

## Dependencies
- [List any dependencies added or modified]
- [Note any version changes]

## Additional Notes
- [Include any other relevant information]
- [Mention any follow-up work needed]
~~~
    
    Then, use the file to create the PR:
    ~~~bash
    # ALWAYS use bodyfile for PR descriptions to avoid newline issues
    gh pr create --title "feat/fix: Implement <task/>" --body-file /tmp/pr-description.md | cat
    
    # Clean up the temporary file
    rm /tmp/pr-description.md
    ~~~
  - **Verification:** Confirm the PR was created successfully by checking the URL provided in the output.
    
</instructions>

<task>
The user needs to replace this text with their task. If they forget to replace this text, prompt them with: "Please describe your task "
</task>`,
  },
];

/**
 * Get a template by name
 * @param name Template name
 * @returns The template or undefined if not found
 */
export function getTemplateByName(name: string): PromptTemplate | undefined {
  return TEMPLATES.find(template => template.name === name);
}

/**
 * Get templates by category
 * @param category Template category
 * @returns Array of templates in the category
 */
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return TEMPLATES.filter(template => template.category === category);
}

/**
 * List all available templates
 * @returns Array of template names and descriptions
 */
export function listTemplates(): { name: string; category: string; description: string }[] {
  return TEMPLATES.map(({ name, category, description }) => ({ name, category, description }));
}

/**
 * Apply a template to code
 * @param template The template to apply
 * @param code The code to apply the template to
 * @returns The prompt with the code inserted
 */
export function applyTemplate(template: PromptTemplate, code: string): string {
  return template.prompt.replace('{code}', code);
}

/**
 * Load user-defined templates from a file (YAML or JSON)
 * @param filePath Path to the user templates file (YAML or JSON)
 * @returns Combined array of built-in and user templates
 */
export async function loadUserTemplates(filePath: string): Promise<PromptTemplate[]> {
  try {
    const fs = await import('node:fs/promises');
    const yaml = await import('js-yaml');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.log(`No user templates file found at ${filePath}`);
      return TEMPLATES;
    }

    // Read and parse the file
    const content = await fs.readFile(filePath, 'utf8');
    let userTemplates: PromptTemplate[];

    if (filePath.endsWith('.json')) {
      userTemplates = JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      userTemplates = yaml.load(content) as PromptTemplate[];
    } else {
      throw new Error('Unsupported file format. Use .json, .yaml, or .yml');
    }

    // Validate user templates
    const validUserTemplates = userTemplates.filter(template => {
      const isValid =
        typeof template.name === 'string' &&
        typeof template.category === 'string' &&
        typeof template.description === 'string' &&
        typeof template.prompt === 'string';

      if (!isValid) {
        console.warn(`Skipping invalid template: ${template.name || 'unnamed'}`);
      }

      return isValid;
    });

    // Merge with built-in templates, overriding any with the same name
    const mergedTemplates = [...TEMPLATES];

    for (const userTemplate of validUserTemplates) {
      const existingIndex = mergedTemplates.findIndex(t => t.name === userTemplate.name);
      if (existingIndex >= 0) {
        // Override existing template
        mergedTemplates[existingIndex] = userTemplate;
        console.log(`Overriding built-in template: ${userTemplate.name}`);
      } else {
        // Add new template
        mergedTemplates.push(userTemplate);
        console.log(`Adding user template: ${userTemplate.name}`);
      }
    }

    // Update the TEMPLATES array with the merged templates
    TEMPLATES = mergedTemplates;

    return TEMPLATES;
  } catch (error) {
    console.error(`Error loading user templates: ${error}`);
    return TEMPLATES;
  }
}

/**
 * Create a new template file with the given name
 * @param templateName Name of the template to create
 * @param templatesDir Directory where user templates are stored
 * @returns Path to the created template file
 */
export async function createTemplateFile(templateName: string, templatesDir: string): Promise<string> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const yaml = await import('js-yaml');

    // Create templates directory if it doesn't exist
    await fs.mkdir(templatesDir, { recursive: true });

    // Sanitize template name to use as filename
    const sanitizedName = templateName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const templateFilePath = path.resolve(templatesDir, `${sanitizedName}.yaml`);

    // Check if file already exists
    try {
      await fs.access(templateFilePath);
      console.log(`Template file already exists at ${templateFilePath}`);
      return templateFilePath;
    } catch {
      // File doesn't exist, create it
    }

    // Create boilerplate template content
    const templateContent = yaml.dump([{
      name: templateName,
      category: 'documentation',
      description: 'Custom template',
      prompt: `<instructions>
Your instructions here
</instructions>

<task>
Describe your task
</task>`
    }]);

    // Write the template file
    await fs.writeFile(templateFilePath, templateContent, 'utf8');
    console.log(`Created new template file at ${templateFilePath}`);

    return templateFilePath;
  } catch (error) {
    console.error(`Error creating template file: ${error}`);
    throw error;
  }
}

/**
 * Find an existing template file by template name
 * @param templateName Name of the template to find
 * @param templatesDir Directory where user templates are stored
 * @returns Path to the template file, or null if not found
 */
export async function findTemplateFile(templateName: string, templatesDir: string): Promise<string | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // Create templates directory if it doesn't exist
    await fs.mkdir(templatesDir, { recursive: true });

    // Check if the main templates.yaml file exists
    const mainTemplateFile = path.resolve(templatesDir, 'templates.yaml');
    try {
      await fs.access(mainTemplateFile);

      // Read the templates.yaml file
      const content = await fs.readFile(mainTemplateFile, 'utf8');
      const yaml = await import('js-yaml');
      const templates = yaml.load(content) as PromptTemplate[];

      // Check if the template exists in the file
      const templateExists = templates.some(t => t.name === templateName);
      if (templateExists) {
        return mainTemplateFile;
      }
    } catch {
      // Main template file doesn't exist, continue with individual files
    }

    // Look for individual template files
    // First check for exact name
    const sanitizedName = templateName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const yamlPath = path.resolve(templatesDir, `${sanitizedName}.yaml`);
    const jsonPath = path.resolve(templatesDir, `${sanitizedName}.json`);

    try {
      await fs.access(yamlPath);
      return yamlPath;
    } catch {
      // YAML file doesn't exist, try JSON
      try {
        await fs.access(jsonPath);
        return jsonPath;
      } catch {
        // JSON file doesn't exist either
        console.log(`No template file found for '${templateName}'`);
        return null;
      }
    }
  } catch (error) {
    console.error(`Error finding template file: ${error}`);
    return null;
  }
}
