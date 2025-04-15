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

// Parse command-line arguments
const targetFile = process.argv[2];
const batchMode = process.argv.includes('--batch');
const skipMeasure = process.argv.includes('--skip-measure');
const dryRun = process.argv.includes('--dry-run');
const forceMode = process.argv.includes('--force');

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

// Process a single file
async function processFile(fullPath, options = { skipMeasure: false, dryRun: false, force: false }) {
  const fileInfo = analyzeTestFile(fullPath);
  
  if (!fileInfo.usesRunCLI) {
    console.log(`❌ File ${fullPath} doesn't use runCLI`);
    return { success: false, reason: 'no-runcli' };
  }
  
  if (fileInfo.alreadyMigrated && !options.force) {
    console.log(`⚠️ File ${fullPath} is already using runDirectCLI (use --force to override)`);
    return { success: false, reason: 'already-migrated' };
  }
  
  let beforeResult = { success: true, duration: 0 };
  
  if (!options.skipMeasure) {
    console.log(`📊 Measuring original execution time for ${fullPath}...`);
    beforeResult = measureTestExecutionTime(fullPath);
    
    if (!beforeResult.success) {
      console.log(`❌ Test failed before optimization: ${beforeResult.error}`);
      return { success: false, reason: 'test-failed-before' };
    }
    
    console.log(`⏱️ Original execution time: ${beforeResult.duration}ms`);
  }
  
  // Make a backup
  const backupPath = `${fullPath}.bak`;
  if (!options.dryRun) {
    writeFileSync(backupPath, fileInfo.content);
    console.log(`💾 Backup saved to ${backupPath}`);
  } else {
    console.log(`💾 [DRY RUN] Would save backup to ${backupPath}`);
  }
  
  // Generate and save optimized version
  const optimized = generateOptimizedTest(fileInfo.content);
  
  if (!options.dryRun) {
    writeFileSync(fullPath, optimized);
    console.log(`✅ Optimized version saved to ${fullPath}`);
  } else {
    console.log(`✅ [DRY RUN] Would save optimized version to ${fullPath}`);
    return { success: true, beforeTime: beforeResult.duration, afterTime: 0 };
  }
  
  if (!options.skipMeasure) {
    console.log(`📊 Measuring new execution time...`);
    const afterResult = measureTestExecutionTime(fullPath);
    
    if (!afterResult.success) {
      console.log(`❌ Test failed after optimization: ${afterResult.error}`);
      console.log(`⚠️ Restoring backup...`);
      
      if (!options.dryRun) {
        writeFileSync(fullPath, fileInfo.content);
        console.log(`✅ Original file restored`);
      } else {
        console.log(`✅ [DRY RUN] Would restore original file`);
      }
      
      return { success: false, reason: 'test-failed-after' };
    }
    
    console.log(`⏱️ New execution time: ${afterResult.duration}ms`);
    const improvement = Math.round((1 - afterResult.duration / beforeResult.duration) * 100);
    console.log(`🚀 Improvement: ${improvement}%`);
    
    return { 
      success: true, 
      beforeTime: beforeResult.duration, 
      afterTime: afterResult.duration,
      improvement 
    };
  }
  
  return { success: true };
}

// Main function
async function main() {
  if (batchMode) {
    // Batch mode: convert multiple files
    const candidates = [];
    const results = [];
    
    // Analyze all test files
    const testFiles = readdirSync(TEST_DIR)
      .filter(f => f.endsWith('.test.ts'))
      .map(f => join(TEST_DIR, f));
    
    console.log(`Found ${testFiles.length} test files`);
    
    // Find candidates for optimization
    for (const file of testFiles) {
      const fileInfo = analyzeTestFile(file);
      if (fileInfo.usesRunCLI && (!fileInfo.alreadyMigrated || forceMode)) {
        candidates.push(file);
      }
    }
    
    console.log(`\n📋 Processing ${candidates.length} files for optimization:`);
    
    // Process each candidate
    for (let i = 0; i < candidates.length; i++) {
      const file = candidates[i];
      console.log(`\n[${i + 1}/${candidates.length}] Processing: ${file.split('/').pop()}`);
      
      const result = await processFile(file, { 
        skipMeasure, 
        dryRun,
        force: forceMode
      });
      
      results.push({
        file: file.split('/').pop(),
        ...result
      });
    }
    
    // Show summary
    console.log('\n=== SUMMARY ===');
    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully processed: ${succeeded.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    
    if (!skipMeasure && succeeded.length > 0) {
      const totalBefore = succeeded.reduce((sum, r) => sum + (r.beforeTime || 0), 0);
      const totalAfter = succeeded.reduce((sum, r) => sum + (r.afterTime || 0), 0);
      const avgImprovement = Math.round((1 - totalAfter / totalBefore) * 100);
      
      console.log(`\n⏱️ Total before: ${totalBefore}ms`);
      console.log(`⏱️ Total after: ${totalAfter}ms`);
      console.log(`🚀 Average improvement: ${avgImprovement}%`);
    }
    
    if (failed.length > 0) {
      console.log('\nFailed files:');
      failed.forEach(f => console.log(`- ${f.file}: ${f.reason}`));
    }
  } else if (targetFile) {
    // Process a single file
    const fullPath = resolve(process.cwd(), targetFile);
    await processFile(fullPath, { skipMeasure, dryRun, force: forceMode });
  } else {
    // Just show candidates
    const testFiles = readdirSync(TEST_DIR)
      .filter(f => f.endsWith('.test.ts'))
      .map(f => join(TEST_DIR, f));
    
    console.log(`Found ${testFiles.length} test files`);
    
    const candidates = [];
    
    for (const file of testFiles) {
      const fileInfo = analyzeTestFile(file);
      if (fileInfo.usesRunCLI && (!fileInfo.alreadyMigrated || forceMode)) {
        candidates.push(file);
      }
    }
    
    console.log(`\n📋 ${candidates.length} files are candidates for optimization:`);
    candidates.forEach((file, i) => {
      console.log(`${i + 1}. ${file.split('/').pop()}`);
    });
    
    console.log(`\nOptions:`);
    console.log(`- Process a single file: node scripts/optimize-tests.js <filename>`);
    console.log(`- Process all files: node scripts/optimize-tests.js --batch`);
    console.log(`- Skip performance measuring: add --skip-measure`);
    console.log(`- Dry run (no changes): add --dry-run`);
    console.log(`- Force update already migrated files: add --force`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 