import { expect, test, describe, beforeAll } from 'vitest';
import { loadAllTemplates, getTemplateByName, TEMPLATES } from '../src/templates';

describe('Template File Loading', () => {
    beforeAll(async () => {
        // Make sure templates are loaded
        await loadAllTemplates();
    });

    test('should load all templates successfully', () => {
        // Check that TEMPLATES array has been populated
        expect(TEMPLATES.length).toBeGreaterThan(0);

        // Check for expected templates
        expect(getTemplateByName('explain')).toBeDefined();
        expect(getTemplateByName('document')).toBeDefined();
        expect(getTemplateByName('refactor')).toBeDefined();
        expect(getTemplateByName('optimize')).toBeDefined();
        expect(getTemplateByName('fix')).toBeDefined();
        expect(getTemplateByName('test')).toBeDefined();
        expect(getTemplateByName('project')).toBeDefined();
        expect(getTemplateByName('plan')).toBeDefined();
    });

    test('templates should contain the expected structure', () => {
        const explainTemplate = getTemplateByName('explain');
        expect(explainTemplate).toBeDefined();
        if (explainTemplate) {
            // Check template structure
            expect(explainTemplate.name).toBe('explain');
            expect(explainTemplate.category).toBe('documentation');
            expect(explainTemplate.description).toBe('Explain/Summarize Code - Summarize what a code file does in plain language');

            // Check that the template compiles and renders correctly
            const rendered = explainTemplate.compiledPrompt({ code: 'test code' });
            expect(rendered).toContain('**Goal:**');
            expect(rendered).toContain('**Context:**');
            expect(rendered).toContain('<instructions>');
            expect(rendered).toContain('<task>');
            expect(rendered).toContain('Provide a clear and concise explanation');

            // Ensure code placeholder is replaced
            expect(rendered).toContain('test code');
            expect(rendered).not.toContain('{{code}}');

            // Check that there are no leftover partial placeholders
            expect(rendered).not.toContain('{{>');
        }
    });

    test('project template should have an example section', async () => {
        const projectTemplate = getTemplateByName('project');
        expect(projectTemplate).toBeDefined();
        if (projectTemplate) {
            // Check for the example section which should be injected from a partial
            const rendered = projectTemplate.compiledPrompt({ code: 'test code' });
            expect(rendered).toContain('<example>');
            expect(rendered).toContain('# GHX - GitHub Code Search CLI');
            expect(rendered).toContain('## Key Files');

            // Check that the example is properly closed
            expect(rendered).toContain('</example>');
        }
    });

    test('parameter replacement in partials works correctly', async () => {
        const explainTemplate = getTemplateByName('explain');
        expect(explainTemplate).toBeDefined();
        if (explainTemplate) {
            // Check that parameters in the header partial are replaced
            const rendered = explainTemplate.compiledPrompt({ code: 'test code' });
            expect(rendered).toContain("**Goal:** Provide a clear explanation of the following code&#x27;s functionality and purpose.");
        }

        const refactorTemplate = getTemplateByName('refactor');
        expect(refactorTemplate).toBeDefined();
        if (refactorTemplate) {
            const rendered = refactorTemplate.compiledPrompt({ code: 'test code' });
            expect(rendered).toContain('Refactor the code to improve readability and maintainability.');
        }
    });
}); 