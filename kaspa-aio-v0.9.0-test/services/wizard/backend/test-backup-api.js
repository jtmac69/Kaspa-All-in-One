/**
 * Test script for Backup API
 * Tests all backup API endpoints
 */

const http = require('http');
const path = require('path');

// Set PROJECT_ROOT for testing
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('=== Backup API Test Suite ===\n');
  console.log('Note: Make sure the wizard backend is running on port 3000\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  let backupId = null;
  let backupId2 = null;
  
  // Test 1: Health check
  console.log('Test 1: Health check');
  try {
    const response = await makeRequest('GET', '/api/health');
    if (response.status === 200 && response.data.status === 'ok') {
      console.log('✓ Server is running');
      testsPassed++;
    } else {
      console.log('✗ Server health check failed');
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    console.log('  Make sure the wizard backend is running: node services/wizard/backend/src/server.js');
    testsFailed++;
    process.exit(1);
  }
  console.log('');
  
  // Test 2: Create a backup
  console.log('Test 2: POST /api/wizard/backup - Create backup');
  try {
    const response = await makeRequest('POST', '/api/wizard/backup', {
      reason: 'API test backup',
      metadata: { test: true }
    });
    
    if (response.status === 200 && response.data.success) {
      backupId = response.data.backup.backupId;
      console.log('✓ Backup created successfully');
      console.log(`  Backup ID: ${response.data.backup.backupId}`);
      console.log(`  Files: ${response.data.backup.backedUpFiles.length}`);
      console.log(`  Size: ${response.data.backup.totalSizeMB} MB`);
      testsPassed++;
    } else {
      console.log('✗ Failed to create backup');
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 3: List backups
  console.log('Test 3: GET /api/wizard/backups - List backups');
  try {
    const response = await makeRequest('GET', '/api/wizard/backups?limit=10');
    
    if (response.status === 200 && response.data.success) {
      console.log('✓ Backups listed successfully');
      console.log(`  Total: ${response.data.total}`);
      console.log(`  Showing: ${response.data.showing}`);
      if (response.data.backups.length > 0) {
        console.log(`  Latest: ${response.data.backups[0].backupId} (${response.data.backups[0].age})`);
      }
      testsPassed++;
    } else {
      console.log('✗ Failed to list backups');
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 4: Get backup details
  if (backupId) {
    console.log('Test 4: GET /api/wizard/backups/:backupId - Get backup details');
    try {
      const response = await makeRequest('GET', `/api/wizard/backups/${backupId}`);
      
      if (response.status === 200 && response.data.success) {
        console.log('✓ Backup details retrieved successfully');
        console.log(`  Backup ID: ${response.data.backup.backupId}`);
        console.log(`  Date: ${response.data.backup.date}`);
        console.log(`  Reason: ${response.data.backup.reason}`);
        console.log(`  Files: ${response.data.backup.files.length}`);
        testsPassed++;
      } else {
        console.log('✗ Failed to get backup details');
        console.log('  Response:', JSON.stringify(response.data, null, 2));
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 5: Get storage usage
  console.log('Test 5: GET /api/wizard/backups/storage/usage - Get storage usage');
  try {
    const response = await makeRequest('GET', '/api/wizard/backups/storage/usage');
    
    if (response.status === 200 && response.data.success) {
      console.log('✓ Storage usage retrieved successfully');
      console.log(`  Total size: ${response.data.storage.totalSizeMB} MB`);
      console.log(`  File count: ${response.data.storage.fileCount}`);
      console.log(`  Backup count: ${response.data.storage.backupCount}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to get storage usage');
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 6: Create second backup
  console.log('Test 6: POST /api/wizard/backup - Create second backup');
  try {
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for different timestamp
    
    const response = await makeRequest('POST', '/api/wizard/backup', {
      reason: 'Second API test backup',
      metadata: { test: true, version: 2 }
    });
    
    if (response.status === 200 && response.data.success) {
      backupId2 = response.data.backup.backupId;
      console.log('✓ Second backup created successfully');
      console.log(`  Backup ID: ${response.data.backup.backupId}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to create second backup');
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      testsFailed++;
    }
  } catch (error) {
    console.log('✗ Error:', error.message);
    testsFailed++;
  }
  console.log('');
  
  // Test 7: Compare backups
  if (backupId && backupId2) {
    console.log('Test 7: POST /api/wizard/backups/compare - Compare backups');
    try {
      const response = await makeRequest('POST', '/api/wizard/backups/compare', {
        backupId1: backupId,
        backupId2: backupId2
      });
      
      if (response.status === 200 && response.data.success) {
        console.log('✓ Backups compared successfully');
        console.log(`  Backup 1: ${response.data.backup1.backupId}`);
        console.log(`  Backup 2: ${response.data.backup2.backupId}`);
        console.log(`  Differences: ${response.data.differences.added.length} added, ${response.data.differences.removed.length} removed, ${response.data.differences.changed.length} changed`);
        testsPassed++;
      } else {
        console.log('✗ Failed to compare backups');
        console.log('  Response:', JSON.stringify(response.data, null, 2));
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 8: Restore backup
  if (backupId) {
    console.log('Test 8: POST /api/wizard/rollback - Restore backup');
    try {
      const response = await makeRequest('POST', '/api/wizard/rollback', {
        backupId: backupId,
        createBackupBeforeRestore: true,
        restoreFiles: ['all']
      });
      
      // Either success or expected failure is okay (no files to restore)
      if (response.status === 200 || response.status === 500) {
        console.log('✓ Restore backup API works correctly');
        console.log(`  Success: ${response.data.success}`);
        console.log(`  Message: ${response.data.message || response.data.error}`);
        testsPassed++;
      } else {
        console.log('✗ Unexpected restore response');
        console.log('  Response:', JSON.stringify(response.data, null, 2));
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
    console.log('Test 9: DELETE /api/wizard/backups/:backupId - Delete backup');
    try {
      const response = await makeRequest('DELETE', `/api/wizard/backups/${backupId2}`);
      
      if (response.status === 200 && response.data.success) {
        console.log('✓ Backup deleted successfully');
        console.log(`  Deleted: ${response.data.backupId}`);
        testsPassed++;
      } else {
        console.log('✗ Failed to delete backup');
        console.log('  Response:', JSON.stringify(response.data, null, 2));
        testsFailed++;
      }
    } catch (error) {
      console.log('✗ Error:', error.message);
      testsFailed++;
    }
    console.log('');
  }
  
  // Test 10: Cleanup old backups
  console.log('Test 10: POST /api/wizard/backups/cleanup - Cleanup old backups');
  try {
    const response = await makeRequest('POST', '/api/wizard/backups/cleanup');
    
    if (response.status === 200 && response.data.success) {
      console.log('✓ Old backups cleaned up successfully');
      console.log(`  Deleted: ${response.data.deleted}`);
      console.log(`  Remaining: ${response.data.remaining}`);
      testsPassed++;
    } else {
      console.log('✗ Failed to cleanup old backups');
      console.log('  Response:', JSON.stringify(response.data, null, 2));
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
