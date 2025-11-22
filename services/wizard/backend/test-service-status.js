/**
 * Test Suite for Service Status Functions
 * Tests the service status display, sync checking, log viewing, and management guide
 * 
 * Note: This is a verification test that checks implementation completeness.
 * Full functional tests are in test-service-status.html (browser-based).
 */

const fs = require('fs');
const path = require('path');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✓ ${message}`);
        testsPassed++;
    } else {
        console.error(`✗ ${message}`);
        testsFailed++;
    }
}

console.log('Running Service Status Implementation Tests...\n');

// Test 1: complete.js file exists
console.log('Test 1: complete.js file exists');
const completeJsPath = path.join(__dirname, '../frontend/public/scripts/modules/complete.js');
assert(fs.existsSync(completeJsPath), 'complete.js file should exist');

// Test 2: complete.js contains checkSyncStatus function
console.log('\nTest 2: complete.js contains checkSyncStatus function');
const completeJsContent = fs.readFileSync(completeJsPath, 'utf8');
assert(completeJsContent.includes('export async function checkSyncStatus()'), 'checkSyncStatus function should be exported');
assert(completeJsContent.includes('window.checkSyncStatus = checkSyncStatus'), 'checkSyncStatus should be globally exported');

// Test 3: complete.js contains viewLogs function
console.log('\nTest 3: complete.js contains viewLogs function');
assert(completeJsContent.includes('export async function viewLogs('), 'viewLogs function should be exported');
assert(completeJsContent.includes('window.viewLogs = viewLogs'), 'viewLogs should be globally exported');

// Test 4: complete.js contains showServiceManagementGuide function
console.log('\nTest 4: complete.js contains showServiceManagementGuide function');
assert(completeJsContent.includes('export function showServiceManagementGuide()'), 'showServiceManagementGuide function should be exported');
assert(completeJsContent.includes('window.showServiceManagementGuide = showServiceManagementGuide'), 'showServiceManagementGuide should be globally exported');

// Test 5: complete.js contains openDashboard function
console.log('\nTest 5: complete.js contains openDashboard function');
assert(completeJsContent.includes('export function openDashboard()'), 'openDashboard function should be exported');
assert(completeJsContent.includes('window.openDashboard = openDashboard'), 'openDashboard should be globally exported');

// Test 6: complete.js contains showLogsModal helper
console.log('\nTest 6: complete.js contains showLogsModal helper function');
assert(completeJsContent.includes('function showLogsModal('), 'showLogsModal helper function should exist');

// Test 7: complete.js contains formatServiceName helper
console.log('\nTest 7: complete.js contains formatServiceName helper function');
assert(completeJsContent.includes('function formatServiceName('), 'formatServiceName helper function should exist');

// Test 8: Test HTML file exists
console.log('\nTest 8: test-service-status.html file exists');
const testHtmlPath = path.join(__dirname, '../frontend/test-service-status.html');
assert(fs.existsSync(testHtmlPath), 'test-service-status.html file should exist');

// Test 9: wizard-refactored.js placeholders removed
console.log('\nTest 9: Placeholder functions removed from wizard-refactored.js');
const wizardJsPath = path.join(__dirname, '../frontend/public/scripts/wizard-refactored.js');
const wizardJsContent = fs.readFileSync(wizardJsPath, 'utf8');
assert(!wizardJsContent.includes('showNotification(\'Service management guide coming soon\''), 'showServiceManagementGuide placeholder should be removed');
assert(!wizardJsContent.includes('showNotification(\'Log viewer coming soon\''), 'viewLogs placeholder should be removed');

// Test 10: API endpoints used
console.log('\nTest 10: API endpoints are correctly referenced');
assert(completeJsContent.includes('/install/status/'), 'Should use /install/status/ endpoint');
assert(completeJsContent.includes('/install/logs/'), 'Should use /install/logs/ endpoint');

// Test 11: Error handling implemented
console.log('\nTest 11: Error handling implemented');
assert(completeJsContent.includes('try {') && completeJsContent.includes('catch (error)'), 'Functions should have try-catch error handling');
assert(completeJsContent.includes('showNotification'), 'Should show notifications for user feedback');

// Test 12: Modal styling implemented
console.log('\nTest 12: Modal styling implemented');
assert(completeJsContent.includes('modal-overlay'), 'Should create modal overlay');
assert(completeJsContent.includes('cssText'), 'Should include inline styles for modals');

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed === 0) {
    console.log('\n✓ All implementation tests passed!');
    console.log('\nFor functional tests, open:');
    console.log('  http://localhost:3000/test-service-status.html');
    process.exit(0);
} else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
}
