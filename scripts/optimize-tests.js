#!/usr/bin/env node
// scripts/optimize-tests.js

/* global process, console */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// Configuration
const TEST_DIR = resolve(process.cwd(), 'test');
const DIRECT_RUNNER_IMPORT = "import { runDirectCLI } from \"../utils/directTestRunner.js\";";
const MIGRATION_COMMENT = "// This test has been optimized to use direct function calls instead of process spawning";

// Check if a single file was specified
const targetFile = process.argv[2];

// Analyze a test file to see if it uses runCLI
function analyzeTestFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const usesRunCLI = content.includes('runCLI(');
  const alreadyMigrated = content.includes('runDirectCLI');
  
  return {
    path: filePath,
    usesRunCLI,
    alreadyMigrated,
    content
  };
}

// Simple template for converting a test
function generateOptimizedTest(content) {
  // Add the import if it doesn't exist
  if (!content.includes(DIRECT_RUNNER_IMPORT)) {
    content = content.replace(
      /import [^;]*runCLI[^;]*;/,
      match => `${match}\n${DIRECT_RUNNER_IMPORT}`
    );
  }
  
  // Add migration comment at the top
  if (!content.includes(MIGRATION_COMMENT)) {
    content = content.replace(
      /^(\/\/.*?\n|)/, 
      match => `${match}${MIGRATION_COMMENT}\n`
    );
  }
  
  // Replace runCLI with runDirectCLI in test cases
  // This is a basic find/replace that should be manually verified
  content = content.replace(/runCLI\(/g, "runDirectCLI(");
  
  return content;
}

// Measure the execution time of a test file
function measureTestExecutionTime(filePath) {
  const testName = filePath.split('/').pop();
  console.log(`Running test: ${testName}...`);
  
  const start = Date.now();
  try {
    execSync(`pnpm vitest run ${filePath} --silent`, { stdio: 'pipe' });
    const duration = Date.now() - start;
    return { success: true, duration };
  } catch (error) {
    return { success: false, duration: Date.now() - start, error };
  }
}

// Main function
async function main() {
  if (targetFile) {
    // Process a single file
    const fullPath = resolve(process.cwd(), targetFile);
    const fileInfo = analyzeTestFile(fullPath);
    
    if (!fileInfo.usesRunCLI) {
      console.log(`❌ File ${targetFile} doesn't use runCLI`);
      return;
    }
    
    if (fileInfo.alreadyMigrated) {
      console.log(`⚠️ File ${targetFile} is already using runDirectCLI`);
      return;
    }
    
    console.log(`📊 Measuring original execution time for ${targetFile}...`);
    const beforeResult = measureTestExecutionTime(fullPath);
    
    if (!beforeResult.success) {
      console.log(`❌ Test failed before optimization: ${beforeResult.error}`);
      return;
    }
    
    console.log(`⏱️ Original execution time: ${beforeResult.duration}ms`);
    
    // Make a backup
    const backupPath = `${fullPath}.bak`;
    writeFileSync(backupPath, fileInfo.content);
    console.log(`💾 Backup saved to ${backupPath}`);
    
    // Generate and save optimized version
    const optimized = generateOptimizedTest(fileInfo.content);
    writeFileSync(fullPath, optimized);
    console.log(`✅ Optimized version saved to ${fullPath}`);
    
    console.log(`📊 Measuring new execution time...`);
    const afterResult = measureTestExecutionTime(fullPath);
    
    if (!afterResult.success) {
      console.log(`❌ Test failed after optimization: ${afterResult.error}`);
      console.log(`⚠️ Restoring backup...`);
      writeFileSync(fullPath, fileInfo.content);
      console.log(`✅ Original file restored`);
      return;
    }
    
    console.log(`⏱️ New execution time: ${afterResult.duration}ms`);
    console.log(`🚀 Improvement: ${Math.round((1 - afterResult.duration / beforeResult.duration) * 100)}%`);
  } else {
    // Scan all test files and identify candidates for optimization
    const testFiles = readdirSync(TEST_DIR)
      .filter(f => f.endsWith('.test.ts'))
      .map(f => join(TEST_DIR, f));
    
    console.log(`Found ${testFiles.length} test files`);
    
    const candidates = [];
    
    for (const file of testFiles) {
      const fileInfo = analyzeTestFile(file);
      if (fileInfo.usesRunCLI && !fileInfo.alreadyMigrated) {
        candidates.push(file);
      }
    }
    
    console.log(`\n📋 ${candidates.length} files are candidates for optimization:`);
    candidates.forEach((file, i) => {
      console.log(`${i + 1}. ${file.split('/').pop()}`);
    });
    
    console.log(`\nTo optimize a specific file, run: node scripts/optimize-tests.js <filename>`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 