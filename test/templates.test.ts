import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllTemplates, applyTemplate } from '../src/templates';

// Add new describe block for applyTemplate tests
describe('applyTemplate', () => {
    beforeAll(async () => {
        // Ensure templates (including partials) are loaded before tests
        await loadAllTemplates();
        // Mock loading user templates if necessary for the test context
        // await loadUserTemplates('/path/to/mock/user/templates');
    });

    it('should ignore <task> tags within the input code when rendering TASK_DESCRIPTION', async () => {
        const templateContent = 'Template Task: <task>{{TASK_DESCRIPTION}}</task> Branch: {{BRANCH_NAME}}';
        const inputCodeWithTaskTag = 'File content with <task>This Should Be Ignored</task> tag.';
        const expectedTaskDescription = 'Describe the task via CLI/config'; // Current hardcoded value
        const expectedBranchNamePart = 'describe-the-task-via-cliconfig'; // Derived from the hardcoded value

        const result = await applyTemplate(templateContent, inputCodeWithTaskTag);

        // Check that the hardcoded description is used
        expect(result).toContain(`<task>${expectedTaskDescription}</task>`);
        // Check that the branch name is derived from the hardcoded description
        expect(result).toContain(`Branch: feature/${expectedBranchNamePart}`);
        // Explicitly check that the ignored text is NOT present
        expect(result).not.toContain('This Should Be Ignored');
    });

    // Add more tests for applyTemplate as needed
}); 