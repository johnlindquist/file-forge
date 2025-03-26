#!/usr/bin/env node
/* eslint-disable no-undef */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Liquid } from 'liquidjs';

// Set up paths
const templatesDirPath = join(process.cwd(), 'templates', 'main');
const partialsDirPath = join(templatesDirPath, '_partials');

// Initialize Liquid with our templates directory
const engine = new Liquid({
  root: [templatesDirPath, partialsDirPath],  // Include both main and partials in the search path
  extname: '.md',          // Default extension for includes
  strictFilters: false,    // Don't error on undefined filters
  strictVariables: false   // Don't error on undefined variables
});

// Test variables
const testVariables = {
  TASK_DESCRIPTION: 'Add user authentication to the login form',
  BRANCH_NAME: 'feature/add-user-auth',
};

/**
 * Test a template file
 */
async function testTemplate(templateName) {
  try {
    console.log(`\n=== Testing template: ${templateName} ===\n`);
    
    // Read the template file
    const templatePath = join(templatesDirPath, `${templateName}.md`);
    const templateContent = await readFile(templatePath, 'utf8');
    
    // Extract the template content from within <template> tags
    const templateMatch = templateContent.match(/<template>([\s\S]*?)<\/template>/);
    
    if (!templateMatch) {
      console.error(`No <template> tags found in ${templateName}.md`);
      return;
    }
    
    let template = templateMatch[1];
    
    if (process.env.DEBUG) {
      console.log(`[DEBUG] Template engine settings:`);
      console.log(`[DEBUG] Root paths:`, engine.options.root);
      console.log(`[DEBUG] Template content excerpt (after path fix): ${template.substring(0, 100)}...`);
    }
    
    // Render the template with our test variables
    const result = await engine.parseAndRender(template, testVariables);
    
    // Print the result
    console.log(result);
    console.log('\n=== End of template test ===\n');
  } catch (error) {
    console.error(`Error testing template ${templateName}:`, error);
  }
}

// Main function
async function main() {
  // Determine which templates to test
  const templatesToTest = process.argv.slice(2).length > 0 
    ? process.argv.slice(2) 
    : ['plan_modular', 'plan-current-branch', 'plan-no-commit'];

  // Explicitly test the PR template if no arguments were provided
  if (process.argv.slice(2).length === 0) {
    templatesToTest.push('pr'); // Add pr to the default list
  }
  
  // Test each template
  for (const templateName of templatesToTest) {
    await testTemplate(templateName);
  }
}

main().catch(console.error); 