import { runDirectCLI } from '../utils/directTestRunner.js';
import { describe, it, expect } from 'vitest';
import path from 'path';

// Use the sample-project fixture for a predictable set of files
const fixturePath = path.join(__dirname, 'fixtures', 'sample-project');

describe('--show-tokens-per-file flag', () => {
    it('should output token counts for each file', async () => {
        const { stdout } = await runDirectCLI([
            fixturePath,
            '--show-tokens-per-file',
            '--pipe',
        ]);
        // Should include the section header
        expect(stdout).toMatch(/Token counts per file/);
        // Should mention at least one file from the fixture with a token count
        expect(stdout).toMatch(/src\/index\.ts: \d+ tokens/);
    });
}); 