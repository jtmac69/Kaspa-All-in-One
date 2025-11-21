/**
 * Integration tests for documentation reorganization
 * 
 * Tests the complete end-to-end reorganization process including:
 * - File categorization and moving
 * - Reference updates
 * - Index generation
 * - Error handling and rollback
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { DocumentationReorganizer } = require('./reorganize.js');
const { RollbackManager } = require('./rollback.js');

describe('DocumentationReorganizer Integration Tests', () => {
  let testDir;
  let reorganizer;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'doc-reorg-test-'));
    
    // Create test markdown files
    createTestFiles(testDir);
    
    // Initialize reorganizer with test directory
    reorganizer = new DocumentationReorganizer({
      rootDir: testDir,
      verbose: false,
      createBackups: true
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('complete reorganization process', async () => {
    // Run the reorganization
    const result = await reorganizer.run();
    
    // Verify overall success
    assert.strictEqual(result.success, true, 'Reorganization should succeed');
    assert.ok(result.filesScanned > 0, 'Should scan files');
    assert.ok(result.filesMoved > 0, 'Should move files');
    
    // Verify essential files stayed at root
    assert.ok(fs.existsSync(path.join(testDir, 'README.md')), 'README.md should stay at root');
    assert.ok(fs.existsSync(path.join(testDir, 'CONTRIBUTING.md')), 'CONTRIBUTING.md should stay at root');
    
    // Verify wizard files moved to correct location
    const wizardFile = path.join(testDir, 'docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md');
    assert.ok(fs.existsSync(wizardFile), 'Wizard file should be moved');
    
    // Verify dashboard files moved
    const dashboardFile = path.join(testDir, 'docs/implementation-summaries/dashboard/DASHBOARD_ENHANCEMENT_SUMMARY.md');
    assert.ok(fs.existsSync(dashboardFile), 'Dashboard file should be moved');
    
    // Verify testing files moved
    const testingFile = path.join(testDir, 'docs/implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md');
    assert.ok(fs.existsSync(testingFile), 'Testing file should be moved');
    
    // Verify work logs moved
    const workLogFile = path.join(testDir, 'docs/work-logs/SESSION_SUMMARY_2025-11-13.md');
    assert.ok(fs.existsSync(workLogFile), 'Work log should be moved');
    
    // Verify quick references moved
    const quickRefFile = path.join(testDir, 'docs/quick-references/TESTING_QUICK_REFERENCE.md');
    assert.ok(fs.existsSync(quickRefFile), 'Quick reference should be moved');
    
    // Verify index was generated
    const indexFile = path.join(testDir, 'docs/DOCUMENTATION_INDEX.md');
    assert.ok(fs.existsSync(indexFile), 'Documentation index should be created');
    assert.ok(result.indexGenerated, 'Index generation should be marked as successful');
    
    // Verify backup was created
    const backupDir = path.join(testDir, '.backup');
    assert.ok(fs.existsSync(backupDir), 'Backup directory should exist');
    
    // Verify transaction log was created
    const backupContents = fs.readdirSync(backupDir);
    const logFile = backupContents.find(f => f.startsWith('reorganize-log-'));
    assert.ok(logFile, 'Transaction log should be created');
  });

  test('reference updates work correctly', async () => {
    // Create a file with references to files that will be moved
    const refFile = path.join(testDir, 'docs/test-references.md');
    fs.mkdirSync(path.dirname(refFile), { recursive: true });
    fs.writeFileSync(refFile, `
# Test References

See [Wizard Implementation](../WIZARD_IMPLEMENTATION_COMPLETE.md) for details.

Also check \`DASHBOARD_ENHANCEMENT_SUMMARY.md\` for dashboard info.

For testing, see TESTING_COVERAGE_AUDIT.md.
    `.trim(), 'utf8');
    
    // Run reorganization
    const result = await reorganizer.run();
    
    assert.strictEqual(result.success, true, 'Reorganization should succeed');
    assert.ok(result.referencesUpdated > 0, 'Should update references');
    
    // Read the reference file and verify updates
    const updatedContent = fs.readFileSync(refFile, 'utf8');
    
    // Check that references were updated to new paths
    assert.ok(
      updatedContent.includes('implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md'),
      'Wizard reference should be updated'
    );
  });

  test('no broken links after reorganization', async () => {
    // Create a file with references to files that will be moved
    const refFile = path.join(testDir, 'docs/test-links.md');
    fs.mkdirSync(path.dirname(refFile), { recursive: true });
    fs.writeFileSync(refFile, `
# Test Links

See [Wizard](../WIZARD_IMPLEMENTATION_COMPLETE.md) for details.
    `.trim(), 'utf8');
    
    // Run reorganization
    const result = await reorganizer.run();
    
    assert.strictEqual(result.success, true, 'Reorganization should succeed');
    
    // Read the updated file and verify the reference was updated
    const updatedContent = fs.readFileSync(refFile, 'utf8');
    
    // The reference should now point to the new location
    assert.ok(
      updatedContent.includes('implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md'),
      'Reference should be updated to new location'
    );
    
    // Verify the referenced file exists at the new location
    const newWizardPath = path.join(testDir, 'docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md');
    assert.ok(fs.existsSync(newWizardPath), 'Referenced file should exist at new location');
  });

  test('rollback restores files correctly', async () => {
    // Run reorganization
    const result = await reorganizer.run();
    assert.strictEqual(result.success, true, 'Reorganization should succeed');
    
    // Verify files were moved
    const wizardFile = path.join(testDir, 'WIZARD_IMPLEMENTATION_COMPLETE.md');
    assert.ok(!fs.existsSync(wizardFile), 'Wizard file should be moved from root');
    
    // Get the backup path
    const rollbackManager = new RollbackManager({ rootDir: testDir });
    const backups = rollbackManager.listBackups();
    assert.ok(backups.length > 0, 'Should have at least one backup');
    
    // Perform rollback
    const rollbackResult = rollbackManager.rollback(backups[0].path);
    
    assert.strictEqual(rollbackResult.success, true, 'Rollback should succeed');
    assert.ok(rollbackResult.filesRestored > 0, 'Should restore files');
    
    // Verify files are back at root
    assert.ok(fs.existsSync(wizardFile), 'Wizard file should be restored to root');
  });

  test('dry run mode does not modify files', async () => {
    // Create reorganizer in dry run mode
    const dryRunReorganizer = new DocumentationReorganizer({
      rootDir: testDir,
      dryRun: true,
      verbose: false
    });
    
    // Get initial file list
    const initialFiles = fs.readdirSync(testDir);
    
    // Run reorganization in dry run mode
    const result = await dryRunReorganizer.run();
    
    assert.strictEqual(result.success, true, 'Dry run should succeed');
    
    // Verify files are still at root
    const wizardFile = path.join(testDir, 'WIZARD_IMPLEMENTATION_COMPLETE.md');
    assert.ok(fs.existsSync(wizardFile), 'Wizard file should still be at root');
    
    // Verify no new directories were created
    const finalFiles = fs.readdirSync(testDir);
    const newDirs = finalFiles.filter(f => !initialFiles.includes(f));
    
    // Only .backup directory might be created for transaction log
    const nonBackupDirs = newDirs.filter(d => d !== '.backup');
    assert.strictEqual(nonBackupDirs.length, 0, 'No new directories should be created in dry run');
  });

  test('handles errors gracefully', async () => {
    // Create a file with invalid permissions to trigger an error
    const problematicFile = path.join(testDir, 'PROBLEMATIC_FILE.md');
    fs.writeFileSync(problematicFile, '# Test', 'utf8');
    
    // Make the file read-only (this might not work on all systems)
    try {
      fs.chmodSync(problematicFile, 0o444);
    } catch (e) {
      // Skip this test if we can't change permissions
      return;
    }
    
    // Try to run reorganization
    const result = await reorganizer.run();
    
    // Should complete but may have warnings
    assert.ok(result.transactions.length > 0, 'Should have transaction log');
    
    // Clean up
    try {
      fs.chmodSync(problematicFile, 0o644);
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});

/**
 * Creates test markdown files in the test directory
 * 
 * @param {string} testDir - Test directory path
 */
function createTestFiles(testDir) {
  // Essential root files
  fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project\n\nTest readme', 'utf8');
  fs.writeFileSync(path.join(testDir, 'CONTRIBUTING.md'), '# Contributing\n\nTest contributing', 'utf8');
  fs.writeFileSync(path.join(testDir, 'LICENSE'), 'MIT License', 'utf8');
  fs.writeFileSync(path.join(testDir, 'QUICK_START.md'), '# Quick Start\n\nTest quick start', 'utf8');
  
  // Wizard implementation files
  fs.writeFileSync(
    path.join(testDir, 'WIZARD_IMPLEMENTATION_COMPLETE.md'),
    '# Wizard Implementation Complete\n\nWizard implementation summary',
    'utf8'
  );
  
  // Dashboard files
  fs.writeFileSync(
    path.join(testDir, 'DASHBOARD_ENHANCEMENT_SUMMARY.md'),
    '# Dashboard Enhancement Summary\n\nDashboard enhancements',
    'utf8'
  );
  
  // Testing files
  fs.writeFileSync(
    path.join(testDir, 'TESTING_COVERAGE_AUDIT.md'),
    '# Testing Coverage Audit\n\nTesting coverage details',
    'utf8'
  );
  
  // Work logs
  fs.writeFileSync(
    path.join(testDir, 'SESSION_SUMMARY_2025-11-13.md'),
    '# Session Summary\n\nWork session summary',
    'utf8'
  );
  
  // Quick references
  fs.writeFileSync(
    path.join(testDir, 'TESTING_QUICK_REFERENCE.md'),
    '# Testing Quick Reference\n\nQuick testing guide',
    'utf8'
  );
  
  // Rollback files
  fs.writeFileSync(
    path.join(testDir, 'ROLLBACK_CLEANUP_SUMMARY.md'),
    '# Rollback Cleanup Summary\n\nRollback cleanup details',
    'utf8'
  );
  
  // Integration files
  fs.writeFileSync(
    path.join(testDir, 'KASIA_INTEGRATION_SUMMARY.md'),
    '# Kasia Integration Summary\n\nKasia integration details',
    'utf8'
  );
  
  // Task files
  fs.writeFileSync(
    path.join(testDir, 'TASK_2.3_COMPLETION_SUMMARY.md'),
    '# Task 2.3 Completion\n\nTask completion details',
    'utf8'
  );
  
  // Create docs directory for existing docs
  const docsDir = path.join(testDir, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    path.join(docsDir, 'existing-doc.md'),
    '# Existing Doc\n\nExisting documentation',
    'utf8'
  );
}
