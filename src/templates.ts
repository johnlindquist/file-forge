// src/templates.ts

/**
 * Prompt templates for different AI tasks.
 * These templates are structured to guide the AI for specific coding tasks.
 */

import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
export let TEMPLATES: PromptTemplate[] = [];

// Initialize templates at module load time
initTemplates().catch(err => console.error(`Error initializing templates: ${err}`));

/**
 * Initialize the templates by loading them from the template directory
 */
async function initTemplates(): Promise<void> {
  try {
    // Determine the built-in templates directory path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = join(__filename, '..');
    const builtInTemplatesDir = resolve(__dirname, 'templates', 'templates');

    // Load built-in templates
    const templates = await loadTemplatesFromDirectory(builtInTemplatesDir);
    TEMPLATES = templates;

    // Also check for user templates if environment variable is set
    if (process.env['FFG_TEMPLATES_DIR']) {
      const userTemplatesDir = resolve(process.env['FFG_TEMPLATES_DIR'], 'templates');
      try {
        const userTemplates = await loadTemplatesFromDirectory(userTemplatesDir);

        // Merge with the existing templates, user templates override built-in templates
        for (const userTemplate of userTemplates) {
          const existingIndex = TEMPLATES.findIndex(t => t.name === userTemplate.name);
          if (existingIndex >= 0) {
            // Override existing template
            TEMPLATES[existingIndex] = userTemplate;
            console.log(`Overriding built-in template: ${userTemplate.name}`);
          } else {
            // Add new template
            TEMPLATES.push(userTemplate);
            console.log(`Adding user template: ${userTemplate.name}`);
          }
        }
      } catch (error) {
        console.error(`Error loading user templates: ${error}`);
      }
    }
  } catch (error) {
    console.error(`Error initializing templates: ${error}`);
  }
}

/**
 * Load templates from a directory of YAML files
 * @param directoryPath Path to the directory containing template YAML files
 * @returns Array of loaded templates
 */
async function loadTemplatesFromDirectory(directoryPath: string): Promise<PromptTemplate[]> {
  try {
    const fs = await import('node:fs/promises');
    const yaml = await import('js-yaml');
    const templates: PromptTemplate[] = [];

    try {
      // Verify directory exists
      await fs.access(directoryPath);
    } catch {
      console.log(`Templates directory not found: ${directoryPath}`);
      return templates;
    }

    // Read all files in the directory
    const files = await fs.readdir(directoryPath);

    // Load each YAML/YML file
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          const filePath = join(directoryPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = yaml.load(content) as PromptTemplate;

          // Validate template
          if (isValidTemplate(template)) {
            templates.push(template);
          } else {
            console.warn(`Skipping invalid template in file: ${file}`);
          }
        } catch (error) {
          console.error(`Error loading template file ${file}: ${error}`);
        }
      }
    }

    return templates;
  } catch (error) {
    console.error(`Error loading templates from directory ${directoryPath}: ${error}`);
    return [];
  }
}

/**
 * Validate a template to ensure it has all required fields
 * @param template Template to validate
 * @returns Whether the template is valid
 */
function isValidTemplate(template: unknown): template is PromptTemplate {
  return (
    template !== null &&
    typeof template === 'object' &&
    'name' in template &&
    typeof template.name === 'string' &&
    'category' in template &&
    typeof template.category === 'string' &&
    'description' in template &&
    typeof template.description === 'string' &&
    'prompt' in template &&
    typeof template.prompt === 'string'
  );
}

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
    // Import path but don't need to assign it to a variable since we use resolve/join imported above
    await import('node:path');

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
