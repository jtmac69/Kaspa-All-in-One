#!/usr/bin/env node

/**
 * Test: Kaspa User Applications Configuration Visibility Fix
 * 
 * Verifies that Kaspa User Applications profile does NOT show:
 * - Database configuration (POSTGRES_PASSWORD, etc.)
 * - Kaspa Node configuration (RPC/P2P ports, etc.)
 * 
 * These should ONLY appear when indexer-services or core/archive-node profiles are selected.
 */

const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');
const ConfigGenerator = require('./src/utils/config-generator');

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
const generator = new ConfigGenerator();

let passCount = 0;
let failCount = 0;

// Test 1: Kaspa User Applications alone should NOT show database fields
logSection('Test 1: Kaspa User Applications - No Database Fields');
if (runTest('Should NOT show database configuration fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  logInfo('Visible fields:');
  logInfo(JSON.stringify(fields.metadata, null, 2));
  
  // Check that no database group exists
  const hasDbGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['database']
  );
  
  if (hasDbGroup) {
    logError('Found database group in visible fields!');
    return false;
  }
  
  // Check that POSTGRES_PASSWORD is not in visible fields
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const hasPasswordField = allFields.some(f => f.key === 'POSTGRES_PASSWORD');
  if (hasPasswordField) {
    logError('Found POSTGRES_PASSWORD in visible fields!');
    return false;
  }
  
  logSuccess('No database fields found');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 2: Kaspa User Applications alone should NOT show Kaspa Node fields
logSection('Test 2: Kaspa User Applications - No Kaspa Node Fields');
if (runTest('Should NOT show Kaspa Node configuration fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  // Check that no kaspa-node group exists
  const hasNodeGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['kaspa-node']
  );
  
  if (hasNodeGroup) {
    logError('Found kaspa-node group in visible fields!');
    return false;
  }
  
  // Check that node-related fields are not present
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const nodeFields = ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT', 'KASPA_NETWORK'];
  const hasNodeFields = allFields.some(f => nodeFields.includes(f.key));
  
  if (hasNodeFields) {
    logError('Found Kaspa Node fields in visible fields!');
    const foundFields = allFields.filter(f => nodeFields.includes(f.key));
    logError(`Found: ${foundFields.map(f => f.key).join(', ')}`);
    return false;
  }
  
  logSuccess('No Kaspa Node fields found');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 3: Kaspa User Applications alone should NOT generate database config
logSection('Test 3: Kaspa User Applications - No Database Config Generated');
if (runTest('Should NOT generate database configuration', () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  
  logInfo('Generated config keys:');
  logInfo(Object.keys(config).join(', '));
  
  const dbKeys = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
  const hasDbKeys = dbKeys.some(key => config.hasOwnProperty(key));
  
  if (hasDbKeys) {
    logError('Found database keys in generated config!');
    const foundKeys = dbKeys.filter(key => config.hasOwnProperty(key));
    logError(`Found: ${foundKeys.join(', ')}`);
    return false;
  }
  
  logSuccess('No database configuration generated');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 4: Kaspa User Applications alone should NOT generate node config
logSection('Test 4: Kaspa User Applications - No Node Config Generated');
if (runTest('Should NOT generate Kaspa Node configuration', () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  
  const nodeKeys = ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT', 'KASPA_NETWORK'];
  const hasNodeKeys = nodeKeys.some(key => config.hasOwnProperty(key));
  
  if (hasNodeKeys) {
    logError('Found Kaspa Node keys in generated config!');
    const foundKeys = nodeKeys.filter(key => config.hasOwnProperty(key));
    logError(`Found: ${foundKeys.join(', ')}`);
    return false;
  }
  
  logSuccess('No Kaspa Node configuration generated');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 5: Indexer Services SHOULD show database fields
logSection('Test 5: Indexer Services - Database Fields Present');
if (runTest('Should show database configuration fields', () => {
  const fields = resolver.getVisibleFields(['indexer-services']);
  
  // Check that database group exists
  const hasDbGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['database']
  );
  
  if (!hasDbGroup) {
    logError('Database group NOT found in visible fields!');
    return false;
  }
  
  // Check that POSTGRES_PASSWORD is in visible fields
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const hasPasswordField = allFields.some(f => f.key === 'POSTGRES_PASSWORD');
  if (!hasPasswordField) {
    logError('POSTGRES_PASSWORD NOT found in visible fields!');
    return false;
  }
  
  logSuccess('Database fields correctly shown for indexer-services');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 6: Core Profile SHOULD show Kaspa Node fields
logSection('Test 6: Core Profile - Kaspa Node Fields Present');
if (runTest('Should show Kaspa Node configuration fields', () => {
  const fields = resolver.getVisibleFields(['core']);
  
  // Check that kaspa-node group exists
  const hasNodeGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['kaspa-node']
  );
  
  if (!hasNodeGroup) {
    logError('Kaspa Node group NOT found in visible fields!');
    return false;
  }
  
  // Check that node fields are present
  const allFields = [];
  Object.values(fields.categories).forEach(category => {
    Object.values(category.groups || {}).forEach(group => {
      allFields.push(...(group.fields || []));
    });
  });
  
  const nodeFields = ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT'];
  const hasAllNodeFields = nodeFields.every(key => 
    allFields.some(f => f.key === key)
  );
  
  if (!hasAllNodeFields) {
    logError('Not all Kaspa Node fields found!');
    const foundFields = allFields.filter(f => nodeFields.includes(f.key));
    logInfo(`Found: ${foundFields.map(f => f.key).join(', ')}`);
    return false;
  }
  
  logSuccess('Kaspa Node fields correctly shown for core profile');
  return true;
})) {
  passCount++;
} else {
  failCount++;
}

// Test 7: Combined profiles should show appropriate fields
logSection('Test 7: Combined Profiles - Correct Field Visibility');
if (runTest('Kaspa User Applications + Indexer Services should show database but not node fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications', 'indexer-services']);
  
  // Should have database group
  const hasDbGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['database']
  );
  
  if (!hasDbGroup) {
    logError('Database group NOT found!');
    return false;
  }
  
  // Should NOT have kaspa-node group
  const hasNodeGroup = Object.values(fields.categories).some(category => 
    category.groups && category.groups['kaspa-node']
  );
  
  if (hasNodeGroup) {
    logError('Kaspa Node group found (should not be present)!');
    return false;
  }
  
  logSuccess('Correct field visibility for combined profiles');
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
