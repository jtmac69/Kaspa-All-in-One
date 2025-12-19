#!/usr/bin/env node

/**
 * Test: Kaspa User Applications Indexer Endpoint Fields
 * 
 * Verifies that Kaspa User Applications profile shows the correct indexer endpoint fields:
 * - REMOTE_KASIA_INDEXER_URL
 * - REMOTE_KSOCIAL_INDEXER_URL  
 * - REMOTE_KASPA_NODE_WBORSH_URL
 */

const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function logSection(message) {
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  console.log(`${BLUE}${message}${RESET}`);
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);
}

function logTest(message) {
  console.log(`${YELLOW}Test:${RESET} ${message}`);
}

function logSuccess(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
}

function logError(message) {
  console.log(`${RED}✗${RESET} ${message}`);
}

function logInfo(message) {
  console.log(`  ${message}`);
}

function runTest(description, testFn) {
  logTest(description);
  try {
    const result = testFn();
    if (result) {
      logSuccess('PASS');
      return true;
    } else {
      logError('FAIL');
      return false;
    }
  } catch (error) {
    logError(`FAIL: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Initialize utilities
const resolver = new FieldVisibilityResolver();

let passCount = 0;
let failCount = 0;

// Test 1: Kaspa User Applications should show indexer endpoint fields
logSection('Test 1: Kaspa User Applications - Indexer Endpoint Fields');
if (runTest('Should show REMOTE_KASIA_INDEXER_URL field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  // Get all fields
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const kasiaField = allFields.find(f => f.key === 'REMOTE_KASIA_INDEXER_URL');
  
  if (!kasiaField) {
    logError('REMOTE_KASIA_INDEXER_URL field not found!');
    return false;
  }
  
  logInfo(`Label: ${kasiaField.label}`);
  logInfo(`Default: ${kasiaField.defaultValue}`);
  logInfo(`Group: ${kasiaField.group}`);
  
  if (kasiaField.defaultValue !== 'https://api.kasia.io/') {
    logError(`Wrong default value: ${kasiaField.defaultValue}`);
    return false;
  }
  
  if (kasiaField.group !== 'indexer-endpoints') {
    logError(`Wrong group: ${kasiaField.group}`);
    return false;
  }
  
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

if (runTest('Should show REMOTE_KSOCIAL_INDEXER_URL field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const ksocialField = allFields.find(f => f.key === 'REMOTE_KSOCIAL_INDEXER_URL');
  
  if (!ksocialField) {
    logError('REMOTE_KSOCIAL_INDEXER_URL field not found!');
    return false;
  }
  
  logInfo(`Label: ${ksocialField.label}`);
  logInfo(`Default: ${ksocialField.defaultValue}`);
  logInfo(`Group: ${ksocialField.group}`);
  
  if (ksocialField.defaultValue !== 'https://indexer0.kaspatalk.net/') {
    logError(`Wrong default value: ${ksocialField.defaultValue}`);
    return false;
  }
  
  if (ksocialField.group !== 'indexer-endpoints') {
    logError(`Wrong group: ${ksocialField.group}`);
    return false;
  }
  
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

if (runTest('Should show REMOTE_KASPA_NODE_WBORSH_URL field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const wsField = allFields.find(f => f.key === 'REMOTE_KASPA_NODE_WBORSH_URL');
  
  if (!wsField) {
    logError('REMOTE_KASPA_NODE_WBORSH_URL field not found!');
    return false;
  }
  
  logInfo(`Label: ${wsField.label}`);
  logInfo(`Default: ${wsField.defaultValue}`);
  logInfo(`Group: ${wsField.group}`);
  
  if (wsField.defaultValue !== 'wss://api.kasia.io/ws') {
    logError(`Wrong default value: ${wsField.defaultValue}`);
    return false;
  }
  
  if (wsField.group !== 'indexer-endpoints') {
    logError(`Wrong group: ${wsField.group}`);
    return false;
  }
  
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 2: Kaspa User Applications should NOT show network fields
logSection('Test 2: Kaspa User Applications - No Network Fields');
if (runTest('Should NOT show EXTERNAL_IP field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const externalIpField = allFields.find(f => f.key === 'EXTERNAL_IP');
  
  if (externalIpField) {
    logError('EXTERNAL_IP field found (should not be visible)!');
    return false;
  }
  
  logSuccess('EXTERNAL_IP field correctly hidden');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

if (runTest('Should NOT show PUBLIC_NODE field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const publicNodeField = allFields.find(f => f.key === 'PUBLIC_NODE');
  
  if (publicNodeField) {
    logError('PUBLIC_NODE field found (should not be visible)!');
    return false;
  }
  
  logSuccess('PUBLIC_NODE field correctly hidden');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 3: Verify indexer-endpoints group exists
logSection('Test 3: Indexer Endpoints Group');
if (runTest('Should have indexer-endpoints group', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  let hasIndexerGroup = false;
  Object.values(fields.categories).forEach(category => {
    if (category.groups && category.groups['indexer-endpoints']) {
      hasIndexerGroup = true;
      logInfo(`Group label: ${category.groups['indexer-endpoints'].label}`);
      logInfo(`Group description: ${category.groups['indexer-endpoints'].description}`);
      logInfo(`Field count: ${category.groups['indexer-endpoints'].fields.length}`);
    }
  });
  
  if (!hasIndexerGroup) {
    logError('indexer-endpoints group not found!');
    return false;
  }
  
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 4: Core profile should still show PUBLIC_NODE
logSection('Test 4: Core Profile - Network Fields');
if (runTest('Core profile should show PUBLIC_NODE field', () => {
  const fields = resolver.getVisibleFields(['core']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const publicNodeField = allFields.find(f => f.key === 'PUBLIC_NODE');
  
  if (!publicNodeField) {
    logError('PUBLIC_NODE field not found for core profile!');
    return false;
  }
  
  logInfo(`Label: ${publicNodeField.label}`);
  logInfo(`Group: ${publicNodeField.group}`);
  
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 5: Combined profiles
logSection('Test 5: Combined Profiles');
if (runTest('Kaspa User Applications + Core should show both indexer and node fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications', 'core']);
  
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const hasKasiaIndexer = allFields.some(f => f.key === 'REMOTE_KASIA_INDEXER_URL');
  const hasNodeRpc = allFields.some(f => f.key === 'KASPA_NODE_RPC_PORT');
  const hasPublicNode = allFields.some(f => f.key === 'PUBLIC_NODE');
  
  if (!hasKasiaIndexer) {
    logError('Missing REMOTE_KASIA_INDEXER_URL');
    return false;
  }
  
  if (!hasNodeRpc) {
    logError('Missing KASPA_NODE_RPC_PORT');
    return false;
  }
  
  if (!hasPublicNode) {
    logError('Missing PUBLIC_NODE');
    return false;
  }
  
  logSuccess('All expected fields present');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Summary
logSection('Test Summary');
console.log(`Total Tests: ${passCount + failCount}`);
console.log(`${GREEN}Passed: ${passCount}${RESET}`);
console.log(`${RED}Failed: ${failCount}${RESET}`);

if (failCount === 0) {
  console.log(`\n${GREEN}All tests passed!${RESET}`);
  process.exit(0);
} else {
  console.log(`\n${RED}Some tests failed!${RESET}`);
  process.exit(1);
}
