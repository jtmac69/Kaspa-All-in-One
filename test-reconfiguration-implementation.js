#!/usr/bin/env node

/**
 * Test script for Reconfiguration Mode Landing Page Implementation
 * Tests both backend API and frontend integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function addTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  results.tests.push({
    name,
    passed,
    message
  });
  
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${message ? ': ' + message : ''}`);
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function testBackendAPIs() {
  console.log('\n=== Backend API Tests ===\n');
  
  // Test 1: Wizard Mode Detection
  try {
    const response = await makeRequest(`${API_BASE}/wizard/mode`);
    addTest(
      'Wizard Mode Detection',
      response.status === 200 && response.data.mode === 'reconfigure',
      `Mode: ${response.data.mode}, Reason: ${response.data.reason}`
    );
  } catch (error) {
    addTest('Wizard Mode Detection', false, error.message);
  }
  
  // Test 2: Current Config API
  try {
    const response = await makeRequest(`${API_BASE}/wizard/current-config`);
    addTest(
      'Current Config API',
      response.status === 200 && response.data.success && response.data.hasExistingConfig,
      `Config keys: ${Object.keys(response.data.currentConfig || {}).length}`
    );
  } catch (error) {
    addTest('Current Config API', false, error.message);
  }
  
  // Test 3: Profile State API
  try {
    const response = await makeRequest(`${API_BASE}/wizard/profiles/state`);
    const isValid = response.status === 200 && 
                   response.data.success && 
                   Array.isArray(response.data.profileStates) &&
                   response.data.profileStates.length > 0;
    addTest(
      'Profile State API',
      isValid,
      `Found ${response.data.profileStates?.length || 0} profiles`
    );
  } catch (error) {
    addTest('Profile State API', false, error.message);
  }
  
  // Test 4: Profile State Structure
  try {
    const response = await makeRequest(`${API_BASE}/wizard/profiles/state`);
    if (response.data.success && response.data.profileStates.length > 0) {
      const profile = response.data.profileStates[0];
      const hasRequiredFields = profile.id && profile.name && profile.description && 
                               profile.installationState && profile.canAdd !== undefined;
      addTest(
        'Profile State Structure',
        hasRequiredFields,
        `Profile: ${profile.name}, State: ${profile.installationState}`
      );
    } else {
      addTest('Profile State Structure', false, 'No profile data available');
    }
  } catch (error) {
    addTest('Profile State Structure', false, error.message);
  }
}

async function testFrontendIntegration() {
  console.log('\n=== Frontend Integration Tests ===\n');
  
  // Test 1: Wizard HTML Contains Reconfiguration Step
  try {
    const response = await makeRequest(`${BASE_URL}/?mode=reconfigure`);
    const hasReconfigStep = response.data.includes('step-reconfigure-landing');
    addTest(
      'Reconfiguration Step HTML',
      hasReconfigStep,
      hasReconfigStep ? 'Found in HTML' : 'Not found in HTML'
    );
  } catch (error) {
    addTest('Reconfiguration Step HTML', false, error.message);
  }
  
  // Test 2: Reconfiguration Step Content
  try {
    const response = await makeRequest(`${BASE_URL}/?mode=reconfigure`);
    const hasTitle = response.data.includes('Reconfigure Your Installation');
    const hasActions = response.data.includes('reconfiguration-actions');
    const hasSummary = response.data.includes('current-installation-summary');
    
    addTest(
      'Reconfiguration Step Content',
      hasTitle && hasActions && hasSummary,
      `Title: ${hasTitle}, Actions: ${hasActions}, Summary: ${hasSummary}`
    );
  } catch (error) {
    addTest('Reconfiguration Step Content', false, error.message);
  }
  
  // Test 3: CSS Styles Present
  try {
    const response = await makeRequest(`${BASE_URL}/styles/wizard.css`);
    const hasReconfigStyles = response.data.includes('reconfiguration-options') &&
                             response.data.includes('action-card') &&
                             response.data.includes('profile-status-overview');
    
    addTest(
      'Reconfiguration CSS Styles',
      hasReconfigStyles,
      hasReconfigStyles ? 'All styles found' : 'Some styles missing'
    );
  } catch (error) {
    addTest('Reconfiguration CSS Styles', false, error.message);
  }
  
  // Test 4: JavaScript Functions Present
  try {
    const response = await makeRequest(`${BASE_URL}/scripts/wizard-refactored.js`);
    const hasReconfigFunctions = response.data.includes('showReconfigurationLanding') &&
                                response.data.includes('selectReconfigurationAction') &&
                                response.data.includes('loadReconfigurationData');
    
    addTest(
      'Reconfiguration JavaScript Functions',
      hasReconfigFunctions,
      hasReconfigFunctions ? 'All functions found' : 'Some functions missing'
    );
  } catch (error) {
    addTest('Reconfiguration JavaScript Functions', false, error.message);
  }
}

async function testRequirementCompliance() {
  console.log('\n=== Requirements Compliance Tests ===\n');
  
  // Test Requirements 16.1-16.4 from the task
  
  // 16.1: Add /reconfigure route with dedicated landing page
  try {
    const response = await makeRequest(`${BASE_URL}/?mode=reconfigure`);
    const hasLandingPage = response.data.includes('step-reconfigure-landing');
    addTest(
      'Requirement 16.1: Reconfigure Route',
      hasLandingPage,
      'Landing page accessible via URL parameter'
    );
  } catch (error) {
    addTest('Requirement 16.1: Reconfigure Route', false, error.message);
  }
  
  // 16.2: Display explanation of reconfiguration options
  try {
    const response = await makeRequest(`${BASE_URL}/?mode=reconfigure`);
    const hasExplanation = response.data.includes('What would you like to do?') &&
                          response.data.includes('Choose from the options below');
    addTest(
      'Requirement 16.2: Reconfiguration Options Explanation',
      hasExplanation,
      'Explanation text found in HTML'
    );
  } catch (error) {
    addTest('Requirement 16.2: Reconfiguration Options Explanation', false, error.message);
  }
  
  // 16.3: Show "Currently Installed" vs "Available to Add" profile sections
  try {
    const apiResponse = await makeRequest(`${API_BASE}/wizard/profiles/state`);
    const hasProfileSections = apiResponse.data.success &&
                              apiResponse.data.installedProfiles !== undefined &&
                              apiResponse.data.availableProfiles !== undefined;
    addTest(
      'Requirement 16.3: Profile Sections',
      hasProfileSections,
      `Installed: ${apiResponse.data.installedProfiles?.length || 0}, Available: ${apiResponse.data.availableProfiles?.length || 0}`
    );
  } catch (error) {
    addTest('Requirement 16.3: Profile Sections', false, error.message);
  }
  
  // 16.4: Add visual indicators for installed profiles
  try {
    const response = await makeRequest(`${BASE_URL}/styles/wizard.css`);
    const hasVisualIndicators = response.data.includes('installed-badge') &&
                               response.data.includes('profile-status-badge') &&
                               response.data.includes('profile-installed');
    addTest(
      'Requirement 16.4: Visual Indicators',
      hasVisualIndicators,
      'CSS classes for visual indicators found'
    );
  } catch (error) {
    addTest('Requirement 16.4: Visual Indicators', false, error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Reconfiguration Mode Landing Page Implementation\n');
  
  // Check if server is running
  try {
    await makeRequest(`${BASE_URL}/api/health`);
    console.log('✓ Server is running\n');
  } catch (error) {
    console.log('✗ Server is not running. Please start the wizard backend first.');
    console.log('  Command: cd services/wizard/backend && PROJECT_ROOT=$(pwd)/../../.. npm start\n');
    return;
  }
  
  await testBackendAPIs();
  await testFrontendIntegration();
  await testRequirementCompliance();
  
  // Print summary
  console.log('\n=== Test Summary ===\n');
  console.log(`Total Tests: ${results.total}`);
  console.log(`\x1b[32mPassed: ${results.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${results.failed}\x1b[0m`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n=== Failed Tests ===\n');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`\x1b[31m✗\x1b[0m ${test.name}: ${test.message}`);
    });
  }
  
  console.log('\n=== Implementation Status ===\n');
  
  if (results.passed >= results.total * 0.8) {
    console.log('🎉 Implementation is working well! Most tests are passing.');
    console.log('   The reconfiguration landing page is ready for use.');
  } else if (results.passed >= results.total * 0.6) {
    console.log('⚠️  Implementation is partially working. Some issues need to be addressed.');
  } else {
    console.log('❌ Implementation has significant issues that need to be fixed.');
  }
  
  console.log('\n=== Next Steps ===\n');
  console.log('1. Open http://localhost:3000/?mode=reconfigure to test the UI');
  console.log('2. Verify that the reconfiguration landing page displays correctly');
  console.log('3. Test the action selection and navigation');
  console.log('4. Check browser console for any JavaScript errors');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});