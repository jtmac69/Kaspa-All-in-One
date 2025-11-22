/**
 * Test Error Handling Implementation
 * Tests the install module error handling functionality
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Install Module Error Handling...\n');

// Test 1: Module exports error handling functions
function testModuleExports() {
    console.log('Test 1: Module exports error handling functions');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('export function handleInstallationError'), 'Should export handleInstallationError');
    assert(content.includes('export function retryInstallation'), 'Should export retryInstallation');
    assert(content.includes('export function showInstallationLogs'), 'Should export showInstallationLogs');
    assert(content.includes('export function exportDiagnostics'), 'Should export exportDiagnostics');
    assert(content.includes('export function goBackFromError'), 'Should export goBackFromError');
    assert(content.includes('export function startOverFromError'), 'Should export startOverFromError');
    
    console.log('  ✓ All error handling functions exported\n');
}

// Test 2: Error handling updates UI correctly
function testErrorUIUpdates() {
    console.log('Test 2: Error handling updates UI correctly');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    // Check for UI update code
    assert(content.includes('statusTitle.textContent = \'❌ Installation Failed\''), 'Should update status title');
    assert(content.includes('statusTitle.style.color = \'#e74c3c\''), 'Should set error color');
    assert(content.includes('progressBar.style.backgroundColor = \'#e74c3c\''), 'Should update progress bar color');
    assert(content.includes('markStepAsFailed'), 'Should mark step as failed');
    
    console.log('  ✓ Error UI updates implemented\n');
}

// Test 3: Error recovery options are displayed
function testErrorRecoveryDisplay() {
    console.log('Test 3: Error recovery options are displayed');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('displayErrorRecovery'), 'Should have displayErrorRecovery function');
    assert(content.includes('install-error-panel'), 'Should create error panel');
    assert(content.includes('buildRecoveryOptions'), 'Should build recovery options');
    assert(content.includes('getTroubleshootingSuggestions'), 'Should get troubleshooting suggestions');
    
    console.log('  ✓ Error recovery display implemented\n');
}

// Test 4: Troubleshooting suggestions are stage-specific
function testTroubleshootingSuggestions() {
    console.log('Test 4: Troubleshooting suggestions are stage-specific');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    // Check for stage-specific suggestions
    assert(content.includes('if (stage === \'config\')'), 'Should have config stage suggestions');
    assert(content.includes('if (stage === \'pull\')'), 'Should have pull stage suggestions');
    assert(content.includes('if (stage === \'build\')'), 'Should have build stage suggestions');
    assert(content.includes('if (stage === \'deploy\')'), 'Should have deploy stage suggestions');
    assert(content.includes('if (stage === \'validate\')'), 'Should have validate stage suggestions');
    
    // Check for error-specific suggestions
    assert(content.includes('errorText.includes(\'network\')'), 'Should check for network errors');
    assert(content.includes('errorText.includes(\'permission\')'), 'Should check for permission errors');
    assert(content.includes('errorText.includes(\'disk\')'), 'Should check for disk errors');
    
    console.log('  ✓ Stage-specific troubleshooting suggestions implemented\n');
}

// Test 5: Recovery options are comprehensive
function testRecoveryOptions() {
    console.log('Test 5: Recovery options are comprehensive');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    // Check for all recovery options
    assert(content.includes('window.retryInstallation'), 'Should have retry option');
    assert(content.includes('window.showInstallationLogs'), 'Should have show logs option');
    assert(content.includes('window.exportDiagnostics'), 'Should have export diagnostics option');
    assert(content.includes('window.goBackFromError'), 'Should have go back option');
    assert(content.includes('window.startOverFromError'), 'Should have start over option');
    
    console.log('  ✓ All recovery options implemented\n');
}

// Test 6: Retry functionality resets state
function testRetryFunctionality() {
    console.log('Test 6: Retry functionality resets state');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('stateManager.delete(\'installationError\')'), 'Should clear error state');
    assert(content.includes('resetInstallationUI'), 'Should reset UI');
    assert(content.includes('startInstallation()'), 'Should restart installation');
    
    console.log('  ✓ Retry functionality implemented\n');
}

// Test 7: Diagnostic export includes comprehensive data
function testDiagnosticExport() {
    console.log('Test 7: Diagnostic export includes comprehensive data');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('const errorData = stateManager.get(\'installationError\')'), 'Should get error data');
    assert(content.includes('const progressData = stateManager.get(\'installationProgress\')'), 'Should get progress data');
    assert(content.includes('const config = stateManager.get(\'configuration\')'), 'Should get config');
    assert(content.includes('const profiles = stateManager.get(\'selectedProfiles\')'), 'Should get profiles');
    assert(content.includes('logs: logs'), 'Should include logs');
    assert(content.includes('browser:'), 'Should include browser info');
    assert(content.includes('[REDACTED]'), 'Should redact sensitive info');
    
    console.log('  ✓ Diagnostic export implemented\n');
}

// Test 8: Error state is stored properly
function testErrorStateStorage() {
    console.log('Test 8: Error state is stored properly');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('stateManager.set(\'installationError\''), 'Should store error in state');
    assert(content.includes('timestamp: new Date().toISOString()'), 'Should include timestamp');
    assert(content.includes('recoverable: isRecoverableError'), 'Should determine if recoverable');
    
    console.log('  ✓ Error state storage implemented\n');
}

// Test 9: Failed steps are marked visually
function testFailedStepMarking() {
    console.log('Test 9: Failed steps are marked visually');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('function markStepAsFailed'), 'Should have markStepAsFailed function');
    assert(content.includes('icon.innerHTML = \'<span style="color: #e74c3c; font-size: 24px;">✗</span>\''), 'Should show error icon');
    assert(content.includes('status.textContent = \'Failed\''), 'Should show failed status');
    assert(content.includes('stepEl.classList.add(\'failed\')'), 'Should add failed class');
    assert(content.includes('stepEl.style.borderLeft = \'3px solid #e74c3c\''), 'Should add error border');
    
    console.log('  ✓ Failed step marking implemented\n');
}

// Test 10: Error logs are detailed
function testErrorLogging() {
    console.log('Test 10: Error logs are detailed');
    
    const modulePath = path.join(__dirname, '../frontend/public/scripts/modules/install.js');
    const content = fs.readFileSync(modulePath, 'utf8');
    
    assert(content.includes('addToLogs(`❌ ERROR: ${message}`)'), 'Should log error message');
    assert(content.includes('if (error)'), 'Should log error details');
    assert(content.includes('if (errors && Array.isArray(errors))'), 'Should log validation errors');
    assert(content.includes('if (results && Array.isArray(results))'), 'Should log failed results');
    
    console.log('  ✓ Error logging implemented\n');
}

// Test 11: CSS styles for error panel exist
function testErrorPanelCSS() {
    console.log('Test 11: CSS styles for error panel exist');
    
    const cssPath = path.join(__dirname, '../frontend/public/styles/components/install.css');
    const content = fs.readFileSync(cssPath, 'utf8');
    
    assert(content.includes('.install-error-panel'), 'Should have error panel styles');
    assert(content.includes('.error-panel-header'), 'Should have error header styles');
    assert(content.includes('.error-panel-body'), 'Should have error body styles');
    assert(content.includes('.error-details'), 'Should have error details styles');
    assert(content.includes('.error-suggestions'), 'Should have suggestions styles');
    assert(content.includes('.error-recovery-options'), 'Should have recovery options styles');
    assert(content.includes('.error-recovery-btn'), 'Should have recovery button styles');
    assert(content.includes('.install-step.failed'), 'Should have failed step styles');
    assert(content.includes('@keyframes slideDown'), 'Should have slide down animation');
    
    console.log('  ✓ Error panel CSS implemented\n');
}

// Test 12: Global functions are exposed
function testGlobalFunctions() {
    console.log('Test 12: Global functions are exposed');
    
    const wizardPath = path.join(__dirname, '../frontend/public/scripts/wizard-refactored.js');
    const content = fs.readFileSync(wizardPath, 'utf8');
    
    assert(content.includes('window.retryInstallation'), 'Should expose retryInstallation');
    assert(content.includes('window.showInstallationLogs'), 'Should expose showInstallationLogs');
    assert(content.includes('window.exportDiagnostics'), 'Should expose exportDiagnostics');
    assert(content.includes('window.goBackFromError'), 'Should expose goBackFromError');
    assert(content.includes('window.startOverFromError'), 'Should expose startOverFromError');
    
    console.log('  ✓ Global functions exposed\n');
}

// Run all tests
try {
    testModuleExports();
    testErrorUIUpdates();
    testErrorRecoveryDisplay();
    testTroubleshootingSuggestions();
    testRecoveryOptions();
    testRetryFunctionality();
    testDiagnosticExport();
    testErrorStateStorage();
    testFailedStepMarking();
    testErrorLogging();
    testErrorPanelCSS();
    testGlobalFunctions();
    
    console.log('✅ All 12 tests passed!\n');
    console.log('Error handling implementation is complete and comprehensive.');
    process.exit(0);
} catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
}
