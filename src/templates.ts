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

**Instructions:**  
- Describe what the code does and how it works.  
- Keep the explanation concise and in plain language (no code output).  
- Do **not** modify or rewrite the code; only explain it.`,
  },
  {
    name: "document",
    category: TemplateCategory.DOCUMENTATION,
    description: "Add Comments (Document Code) - Insert explanatory comments into the code",
    prompt: `**Goal:** Document the code by adding helpful comments explaining each major section or logic.

**Context:**  
{code}

**Instructions:**  
- Insert concise comments or docstrings in the code to clarify its functionality.  
- Preserve the original code logic and formatting.  
- Mark new comments clearly (e.g., start lines with \`//\` or \`#\` as appropriate).  
- Return the updated code with the new comments and no other alterations.`,
  },

  // Refactoring & Improvement Templates
  {
    name: "refactor",
    category: TemplateCategory.REFACTORING,
    description: "Refactor for Readability - Improve clarity and maintainability without changing behavior",
    prompt: `**Goal:** Refactor the following code to improve readability and maintainability while preserving its behavior.

**Context:**  
{code}

**Instructions:**  
- Simplify and restructure the code for clarity (e.g. break up complex functions, improve naming).  
- Do **not** change any functionality or introduce new bugs.  
- Ensure the output format is a unified diff or the full updated code with changes, so that modifications can be applied easily.  
- Do not include explanatory text—only provide the refactored code or diff.`,
  },
  {
    name: "optimize",
    category: TemplateCategory.REFACTORING,
    description: "Optimize for Performance - Improve code efficiency without changing behavior",
    prompt: `**Goal:** Optimize the following code for performance while keeping its output and behavior unchanged.

**Context:**  
{code}

**Instructions:**  
- Identify any inefficiencies or slow operations and refactor them for speed or lower resource usage.  
- Preserve the code's functionality and results exactly.  
- Present the optimized code changes (preferably as a diff or clearly marked modifications).  
- Only output the code changes; avoid extra commentary.`,
  },
  {
    name: "fix",
    category: TemplateCategory.REFACTORING,
    description: "Identify and Fix Issues - Find potential bugs or issues and fix them",
    prompt: `**Goal:** Review the following code for bugs or issues and fix them.

**Context:**  
{code}

**Instructions:**  
- Analyze the code for logical errors, bugs, or any edge cases that might fail.  
- For each identified issue, modify the code to fix the problem. Ensure that fixes do not introduce new bugs.  
- Output the corrected code (or a diff of changes) with all fixes applied.  
- Exclude any explanatory text aside from necessary comments for the fixes.`,
  },

  // Code Generation Templates
  {
    name: "test",
    category: TemplateCategory.GENERATION,
    description: "Generate Unit Tests - Create tests for the given code",
    prompt: `**Goal:** Write unit tests to cover the functionality of the code below.

**Context:**  
{code}

**Instructions:**  
- Generate a set of unit tests that thoroughly exercise the code's functions and critical paths.  
- Use an appropriate testing framework and assume the code above is imported or accessible.  
- Ensure tests are comprehensive and readable (cover normal cases, edge cases, and error conditions if applicable).  
- Output only the test code (e.g., in a file with test functions), without additional explanation.`,
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
 * Load user-defined templates from a file
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
