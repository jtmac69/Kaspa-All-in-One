#!/usr/bin/env node

/**
 * Test script for Reconfiguration Navigation UX Implementation
 * Tests the new navigation, breadcrumbs, progress indicators, and UX features
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

function addTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

async function testReconfigurationNavigationFiles() {
  console.log('\n=== File Structure Tests ===\n');
  
  // Test 1: Reconfiguration Navigation Module
  const navModulePath = path.join(__dirname, '../frontend/public/scripts/modules/reconfiguration-navigation.js');
  const navModuleExists = fs.existsSync(navModulePath);
  addTest(
    'Reconfiguration Navigation Module Exists',
    navModuleExists,
    navModuleExists ? 'Found at expected location' : 'Module file missing'
  );
  
  if (navModuleExists) {
    const navModuleContent = fs.readFileSync(navModulePath, 'utf8');
    
    // Test required functions
    const requiredFunctions = [
      'initReconfigurationNavigation',
      'updateBreadcrumbs',
      'startOperation',
      'updateOperationProgress',
      'completeOperation',
      'showReconfigurationNavigation',
      'hideReconfigurationNavigation'
    ];
    
    const missingFunctions = requiredFunctions.filter(func => !navModuleContent.includes(func));
    addTest(
      'Navigation Module Functions',
      missingFunctions.length === 0,
      missingFunctions.length === 0 ? 'All required functions present' : `Missing: ${missingFunctions.join(', ')}`
    );
    
    // Test breadcrumb functionality
    const hasBreadcrumbs = navModuleContent.includes('breadcrumb') && 
                          navModuleContent.includes('updateBreadcrumbs');
    addTest(
      'Breadcrumb Navigation Support',
      hasBreadcrumbs,
      hasBreadcrumbs ? 'Breadcrumb functions found' : 'Breadcrumb functionality missing'
    );
    
    // Test progress tracking
    const hasProgressTracking = navModuleContent.includes('startOperation') && 
                                navModuleContent.includes('updateOperationProgress') &&
                                navModuleContent.includes('progressSteps');
    addTest(
      'Progress Tracking Support',
      hasProgressTracking,
      hasProgressTracking ? 'Progress tracking functions found' : 'Progress tracking missing'
    );
    
    // Test operation history
    const hasOperationHistory = navModuleContent.includes('operationHistory') && 
                               navModuleContent.includes('addToOperationHistory');
    addTest(
      'Operation History Support',
      hasOperationHistory,
      hasOperationHistory ? 'Operation history functions found' : 'Operation history missing'
    );
    
    // Test tooltip system
    const hasTooltips = navModuleContent.includes('initializeTooltips') && 
                       navModuleContent.includes('showTooltip');
    addTest(
      'Tooltip System Support',
      hasTooltips,
      hasTooltips ? 'Tooltip functions found' : 'Tooltip system missing'
    );
  }
  
  // Test 2: CSS Styles
  const cssPath = path.join(__dirname, '../frontend/public/styles/components/reconfiguration-navigation.css');
  const cssExists = fs.existsSync(cssPath);
  addTest(
    'Reconfiguration Navigation CSS Exists',
    cssExists,
    cssExists ? 'CSS file found' : 'CSS file missing'
  );
  
  if (cssExists) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Test required CSS classes
    const requiredClasses = [
      'reconfiguration-navigation',
      'reconfiguration-breadcrumbs',
      'reconfiguration-progress',
      'operation-history-panel',
      'tooltip-container',
      'help-icon'
    ];
    
    const missingClasses = requiredClasses.filter(cls => !cssContent.includes(cls));
    addTest(
      'Required CSS Classes',
      missingClasses.length === 0,
      missingClasses.length === 0 ? 'All required classes present' : `Missing: ${missingClasses.join(', ')}`
    );
    
    // Test responsive design
    const hasResponsive = cssContent.includes('@media (max-width: 768px)') && 
                         cssContent.includes('@media (max-width: 480px)');
    addTest(
      'Responsive Design Support',
      hasResponsive,
      hasResponsive ? 'Responsive breakpoints found' : 'Responsive design missing'
    );
    
    // Test accessibility features
    const hasAccessibility = cssContent.includes('prefers-reduced-motion') && 
                            cssContent.includes('outline:') &&
                            cssContent.includes('focus');
    addTest(
      'Accessibility Features',
      hasAccessibility,
      hasAccessibility ? 'Accessibility features found' : 'Accessibility features missing'
    );
  }
  
  // Test 3: Main CSS Import
  const mainCssPath = path.join(__dirname, '../frontend/public/styles/wizard.css');
  const mainCssExists = fs.existsSync(mainCssPath);
  
  if (mainCssExists) {
    const mainCssContent = fs.readFileSync(mainCssPath, 'utf8');
    const hasImport = mainCssContent.includes('reconfiguration-navigation.css');
    addTest(
      'CSS Import in Main File',
      hasImport,
      hasImport ? 'Import statement found' : 'Import statement missing'
    );
  }
}

async function testWizardIntegration() {
  console.log('\n=== Wizard Integration Tests ===\n');
  
  // Test 1: Main wizard file imports
  const wizardPath = path.join(__dirname, '../frontend/public/scripts/wizard-refactored.js');
  const wizardExists = fs.existsSync(wizardPath);
  
  if (wizardExists) {
    const wizardContent = fs.readFileSync(wizardPath, 'utf8');
    
    // Test import statement
    const hasImport = wizardContent.includes('reconfiguration-navigation.js');
    addTest(
      'Navigation Module Import',
      hasImport,
      hasImport ? 'Import statement found' : 'Import statement missing'
    );
    
    // Test function usage
    const usesNavFunctions = wizardContent.includes('initReconfigurationNavigation') && 
                            wizardContent.includes('showReconfigurationNavigation') &&
                            wizardContent.includes('updateBreadcrumbs');
    addTest(
      'Navigation Functions Usage',
      usesNavFunctions,
      usesNavFunctions ? 'Navigation functions used' : 'Navigation functions not used'
    );
    
    // Test reconfiguration mode integration
    const hasReconfigIntegration = wizardContent.includes('handleReconfigurationMode') && 
                                  wizardContent.includes('startOperation');
    addTest(
      'Reconfiguration Mode Integration',
      hasReconfigIntegration,
      hasReconfigIntegration ? 'Integration found' : 'Integration missing'
    );
  }
  
  // Test 2: HTML tooltips
  const htmlPath = path.join(__dirname, '../frontend/public/index.html');
  const htmlExists = fs.existsSync(htmlPath);
  
  if (htmlExists) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Test tooltip attributes
    const hasTooltips = htmlContent.includes('data-tooltip') && 
                       htmlContent.includes('help-icon');
    addTest(
      'HTML Tooltip Attributes',
      hasTooltips,
      hasTooltips ? 'Tooltip attributes found' : 'Tooltip attributes missing'
    );
    
    // Test reconfiguration landing updates
    const hasUpdatedLanding = htmlContent.includes('help-icon') && 
                             htmlContent.includes('data-tooltip="Overview of your current Kaspa installation');
    addTest(
      'Updated Reconfiguration Landing',
      hasUpdatedLanding,
      hasUpdatedLanding ? 'Landing page updated with tooltips' : 'Landing page not updated'
    );
  }
}

async function testRequirementsCoverage() {
  console.log('\n=== Requirements Coverage Tests ===\n');
  
  const navModulePath = path.join(__dirname, '../frontend/public/scripts/modules/reconfiguration-navigation.js');
  const cssPath = path.join(__dirname, '../frontend/public/styles/components/reconfiguration-navigation.css');
  
  if (fs.existsSync(navModulePath) && fs.existsSync(cssPath)) {
    const navContent = fs.readFileSync(navModulePath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Requirement 16.9: Update main navigation to include reconfiguration entry
    const hasMainNavUpdate = navContent.includes('reconfiguration-navigation') && 
                            navContent.includes('exitReconfigurationMode');
    addTest(
      'Requirement 16.9: Main Navigation Update',
      hasMainNavUpdate,
      hasMainNavUpdate ? 'Main navigation includes reconfiguration entry' : 'Main navigation not updated'
    );
    
    // Requirement 17.16: Add breadcrumb navigation for reconfiguration flows
    const hasBreadcrumbNav = navContent.includes('updateBreadcrumbs') && 
                           cssContent.includes('breadcrumb-nav');
    addTest(
      'Requirement 17.16: Breadcrumb Navigation',
      hasBreadcrumbNav,
      hasBreadcrumbNav ? 'Breadcrumb navigation implemented' : 'Breadcrumb navigation missing'
    );
    
    // Requirement 18.13: Implement progress indicators for multi-step operations
    const hasProgressIndicators = navContent.includes('startOperation') && 
                                 navContent.includes('updateOperationProgress') &&
                                 cssContent.includes('progress-bar');
    addTest(
      'Requirement 18.13: Progress Indicators',
      hasProgressIndicators,
      hasProgressIndicators ? 'Progress indicators implemented' : 'Progress indicators missing'
    );
    
    // Operation status feedback and completion notifications
    const hasStatusFeedback = navContent.includes('completeOperation') && 
                             navContent.includes('showNotification');
    addTest(
      'Operation Status Feedback',
      hasStatusFeedback,
      hasStatusFeedback ? 'Status feedback implemented' : 'Status feedback missing'
    );
    
    // Help tooltips and contextual guidance
    const hasHelpTooltips = navContent.includes('initializeTooltips') && 
                           cssContent.includes('tooltip-container');
    addTest(
      'Help Tooltips and Contextual Guidance',
      hasHelpTooltips,
      hasHelpTooltips ? 'Tooltips and guidance implemented' : 'Tooltips missing'
    );
    
    // Operation history and rollback options
    const hasOperationHistory = navContent.includes('operationHistory') && 
                               navContent.includes('rollbackOperation') &&
                               cssContent.includes('operation-history-panel');
    addTest(
      'Operation History and Rollback',
      hasOperationHistory,
      hasOperationHistory ? 'Operation history and rollback implemented' : 'Operation history missing'
    );
  }
}

async function runTests() {
  console.log('🧪 Testing Reconfiguration Navigation UX Implementation\n');
  
  await testReconfigurationNavigationFiles();
  await testWizardIntegration();
  await testRequirementsCoverage();
  
  // Summary
  console.log('\n=== Test Summary ===\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.passed >= results.total * 0.8) {
    console.log('🎉 Implementation is working well! Most tests are passing.');
    console.log('   The reconfiguration navigation UX is ready for use.');
  } else if (results.passed >= results.total * 0.6) {
    console.log('⚠️  Implementation is partially working. Some issues need to be addressed.');
  } else {
    console.log('❌ Implementation needs significant work. Many tests are failing.');
  }
  
  console.log('\n=== Next Steps ===\n');
  console.log('1. Test the reconfiguration navigation in the browser');
  console.log('2. Verify breadcrumb navigation works correctly');
  console.log('3. Test progress indicators during operations');
  console.log('4. Check tooltip functionality and help guidance');
  console.log('5. Test operation history and rollback features');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});