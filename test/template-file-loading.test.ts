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

            // Check that partials are correctly injected
            expect(explainTemplate.prompt).toContain('**Goal:**');
            expect(explainTemplate.prompt).toContain('**Context:**');
            expect(explainTemplate.prompt).toContain('<instructions>');
            expect(explainTemplate.prompt).toContain('<task>');
            expect(explainTemplate.prompt).toContain('Provide a clear and concise explanation');

            // Ensure placeholder is present
            expect(explainTemplate.prompt).toContain('{code}');

            // Check that there are no leftover partial placeholders
            expect(explainTemplate.prompt).not.toContain('{{>');
        }
    });

    test('project template should have an example section', async () => {
        const projectTemplate = getTemplateByName('project');
        expect(projectTemplate).toBeDefined();
        if (projectTemplate) {
            // Check for the example section which should be injected from a partial
            expect(projectTemplate.prompt).toContain('<example>');
            expect(projectTemplate.prompt).toContain('# GHX - GitHub Code Search CLI');
            expect(projectTemplate.prompt).toContain('## Key Files');

            // Check that the example is properly closed
            expect(projectTemplate.prompt).toContain('</example>');
        }
    });

    test('parameter replacement in partials works correctly', async () => {
        const explainTemplate = getTemplateByName('explain');
        expect(explainTemplate).toBeDefined();
        if (explainTemplate) {
            // Check that parameters in the header partial are replaced
            expect(explainTemplate.prompt).toContain("Provide a clear explanation of the following code's functionality and purpose.");
        }

        const refactorTemplate = getTemplateByName('refactor');
        expect(refactorTemplate).toBeDefined();
        if (refactorTemplate) {
            expect(refactorTemplate.prompt).toContain('Refactor the following code to improve readability and maintainability while preserving its behavior.');
        }
    });
}); 