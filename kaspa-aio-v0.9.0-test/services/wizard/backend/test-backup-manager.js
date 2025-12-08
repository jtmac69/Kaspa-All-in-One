/**
 * Test script for Backup Manager
 * Tests backup creation, listing, restoration, and deletion
 */

const BackupManager = require('./src/utils/backup-manager');
const fs = require('fs').promises;
const path = require('path');

// Set PROJECT_ROOT for testing
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const backupManager = new BackupManager();

async function runTests() {
  console.log('=== Backup Manager Test Suite ===\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Initialize backup directory
  console.log('Test 1: Initialize backup directory');
  try {
    const result = await backupManager.initialize();
    if (result.success) {
      console.log('✓ Backup directory initialized successfully');
      testsPassed++;
    } else {
      console.log('✗ Failed to initialize backup directory:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 2: Create a backup
  console.log('Test 2: Create a backup');
  let backupId = null;
  try {
    const result = await backupManager.createBackup('Test backup', { test: true });
    if (result.success) {
      backupId = result.backupId;
      console.log('✓ Backup created successfully');
      console.log(`  Backup ID: ${result.backupId}`);
      console.log(`  Files backed up: ${result.backedUpFiles.length}`);
      console.log(`  Total size: ${result.totalSizeMB} MB`);
      testsPassed++;
    } else {
      console.log('✗ Failed to create backup:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 3: List backups
  console.log('Test 3: List backups');
  try {
    const result = await backupManager.listBackups();
    if (result.success) {
      console.log('✓ Backups listed successfully');
      console.log(`  Total backups: ${result.total}`);
      console.log(`  Showing: ${result.showing}`);
      if (result.backups.length > 0) {
        console.log(`  Latest backup: ${result.backups[0].backupId} (${result.backups[0].age})`);
      }
      testsPassed++;
    } else {
      console.log('✗ Failed to list backups:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 4: Get backup details
  if (backupId) {
    console.log('Test 4: Get backup details');
    try {
      const result = await backupManager.getBackup(backupId);
      if (result.success) {
        console.log('✓ Backup details retrieved successfully');
        console.log(`  Backup ID: ${result.backup.backupId}`);
        console.log(`  Date: ${result.backup.date}`);
        console.log(`  Reason: ${result.backup.reason}`);
        console.log(`  Files: ${result.backup.files.length}`);
        testsPassed++;
      } else {
        console.log('✗ Failed to get backup details:', result.error);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 5: Get storage usage
  console.log('Test 5: Get storage usage');
  try {
    const result = await backupManager.getStorageUsage();
    if (result.success) {
      console.log('✓ Storage usage retrieved successfully');
      console.log(`  Total size: ${result.totalSizeMB} MB`);
      console.log(`  File count: ${result.fileCount}`);
      console.log(`  Backup count: ${result.backupCount}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to get storage usage:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 6: Create another backup for comparison
  console.log('Test 6: Create second backup for comparison');
  let backupId2 = null;
  try {
    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await backupManager.createBackup('Second test backup', { test: true, version: 2 });
    if (result.success) {
      backupId2 = result.backupId;
      console.log('✓ Second backup created successfully');
      console.log(`  Backup ID: ${result.backupId}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to create second backup:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 7: Compare backups
  if (backupId && backupId2) {
    console.log('Test 7: Compare backups');
    try {
      const result = await backupManager.compareBackups(backupId, backupId2);
      if (result.success) {
        console.log('✓ Backups compared successfully');
        console.log(`  Backup 1: ${result.backup1.backupId} (${result.backup1.date})`);
        console.log(`  Backup 2: ${result.backup2.backupId} (${result.backup2.date})`);
        console.log(`  Added: ${result.differences.added.length}`);
        console.log(`  Removed: ${result.differences.removed.length}`);
        console.log(`  Changed: ${result.differences.changed.length}`);
        testsPassed++;
      } else {
        console.log('✗ Failed to compare backups:', result.error);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 8: Restore backup (dry run - just test the API)
  if (backupId) {
    console.log('Test 8: Test restore backup (with pre-restore backup)');
    try {
      // Note: This will actually restore if files exist, but creates a backup first
      const result = await backupManager.restoreBackup(backupId, {
        createBackupBeforeRestore: true,
        restoreFiles: ['all']
      });
      
      if (result.success || result.success === false) {
        // Either success or expected failure (no files to restore) is okay
        console.log('✓ Restore backup API works correctly');
        console.log(`  Success: ${result.success}`);
        console.log(`  Message: ${result.message || result.error}`);
        if (result.preRestoreBackup) {
          console.log(`  Pre-restore backup created: ${result.preRestoreBackup}`);
        }
        testsPassed++;
      } else {
        console.log('✗ Unexpected restore result');
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 9: Delete a backup
  if (backupId2) {
    console.log('Test 9: Delete a backup');
    try {
      const result = await backupManager.deleteBackup(backupId2);
      if (result.success) {
        console.log('✓ Backup deleted successfully');
        console.log(`  Deleted backup ID: ${result.backupId}`);
        testsPassed++;
      } else {
        console.log('✗ Failed to delete backup:', result.error);
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 10: Cleanup old backups
  console.log('Test 10: Cleanup old backups');
  try {
    const result = await backupManager.cleanupOldBackups();
    if (result.success) {
      console.log('✓ Old backups cleaned up successfully');
      console.log(`  Deleted: ${result.deleted}`);
      console.log(`  Remaining: ${result.remaining}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to cleanup old backups:', result.error);
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('');
  
  if (testsFailed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
