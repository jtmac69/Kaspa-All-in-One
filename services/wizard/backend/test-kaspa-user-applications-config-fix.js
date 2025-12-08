#!/usr/bin/env node

/**
 * Test Suite: Kaspa User Applications Configuration Fix
 * 
 * Validates that the Kaspa User Applications profile correctly shows/hides
 * configuration fields based on profile selection.
 * 
 * Related: docs/implementation-summaries/wizard/KASPA_USER_APPLICATIONS_CONFIGURATION_FIX.md
 */

const ConfigGenerator = require('./src/utils/config-generator');
const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function logTest(description) {
  testCount++;
  console.log(`\nTest ${testCount}: ${description}`);
}

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ PASS: ${message}`);
    return true;
  } else {
    failCount++;
    console.log(`  ✗ FAIL: ${message}`);
    return false;
  }
}

function runTest(description, testFn) {
  logTest(description);
  try {
    const result = testFn();
    if (result) {
      passCount++;
      console.log('  ✓ PASS');
    } else {
      failCount++;
      console.log('  ✗ FAIL');
    }
    return result;
  } catch (error) {
    failCount++;
    console.log(`  ✗ FAIL: ${error.message}`);
    return false;
  }
}

// Initialize test objects
const generator = new ConfigGenerator();
const resolver = new FieldVisibilityResolver();

// ============================================================================
// Test Suite 1: Database Configuration Logic
// ============================================================================

logSection('Test Suite 1: Database Configuration Logic');

runTest('Kaspa User Applications alone should NOT generate database config', () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  console.log('  Generated config keys:', Object.keys(config));
  
  const hasDbPassword = config.POSTGRES_PASSWORD !== undefined;
  const hasDbUser = config.POSTGRES_USER !== undefined;
  const hasDbName = config.POSTGRES_DB !== undefined;
  
  assert(!hasDbPassword, 'Should not have POSTGRES_PASSWORD');
  assert(!hasDbUser, 'Should not have POSTGRES_USER');
  assert(!hasDbName, 'Should not have POSTGRES_DB');
  
  return !hasDbPassword && !hasDbUser && !hasDbName;
});

runTest('Indexer Services alone SHOULD generate database config', () => {
  const config = generator.generateDefaultConfig(['indexer-services']);
  console.log('  Generated config keys:', Object.keys(config));
  
  const hasDbPassword = config.POSTGRES_PASSWORD !== undefined;
  const hasDbUser = config.POSTGRES_USER !== undefined;
  const hasDbName = config.POSTGRES_DB !== undefined;
  
  assert(hasDbPassword, 'Should have POSTGRES_PASSWORD');
  assert(hasDbUser, 'Should have POSTGRES_USER');
  assert(hasDbName, 'Should have POSTGRES_DB');
  
  return hasDbPassword && hasDbUser && hasDbName;
});

runTest('Kaspa User Applications + Indexer Services SHOULD generate database config', () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications', 'indexer-services']);
  console.log('  Generated config keys:', Object.keys(config));
  
  const hasDbPassword = config.POSTGRES_PASSWORD !== undefined;
  const hasDbUser = config.POSTGRES_USER !== undefined;
  const hasDbName = config.POSTGRES_DB !== undefined;
  
  assert(hasDbPassword, 'Should have POSTGRES_PASSWORD (from indexer-services)');
  assert(hasDbUser, 'Should have POSTGRES_USER (from indexer-services)');
  assert(hasDbName, 'Should have POSTGRES_DB (from indexer-services)');
  
  return hasDbPassword && hasDbUser && hasDbName;
});

// ============================================================================
// Test Suite 2: Field Visibility Logic
// ============================================================================

logSection('Test Suite 2: Field Visibility Logic');

runTest('Kaspa User Applications alone should show NO node configuration fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  console.log('  Visible fields:', JSON.stringify(fields.metadata, null, 2));
  
  // Check for kaspa-node group
  const basicCategory = fields.categories.basic || {};
  const nodeGroup = basicCategory.groups ? basicCategory.groups['kaspa-node'] : null;
  const nodeFields = nodeGroup ? nodeGroup.fields : [];
  
  console.log('  Node fields count:', nodeFields.length);
  assert(nodeFields.length === 0, 'Should have zero node configuration fields');
  
  return nodeFields.length === 0;
});

runTest('Kaspa User Applications alone should show NO database configuration fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  // Check for database group
  const basicCategory = fields.categories.basic || {};
  const dbGroup = basicCategory.groups ? basicCategory.groups['database'] : null;
  const dbFields = dbGroup ? dbGroup.fields : [];
  
  console.log('  Database fields count:', dbFields.length);
  assert(dbFields.length === 0, 'Should have zero database configuration fields');
  
  return dbFields.length === 0;
});

runTest('Kaspa User Applications alone should show NO external IP field', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  
  // Check for EXTERNAL_IP field
  const allFields = [];
  for (const category of Object.values(fields.categories)) {
    for (const group of Object.values(category.groups || {})) {
      allFields.push(...(group.fields || []));
    }
  }
  
  const hasExternalIp = allFields.some(f => f.key === 'EXTERNAL_IP');
  
  console.log('  Has EXTERNAL_IP field:', hasExternalIp);
  assert(!hasExternalIp, 'Should not have EXTERNAL_IP field');
  
  return !hasExternalIp;
});

runTest('Core profile SHOULD show node configuration fields', () => {
  const fields = resolver.getVisibleFields(['core']);
  
  const basicCategory = fields.categories.basic || {};
  const nodeGroup = basicCategory.groups ? basicCategory.groups['kaspa-node'] : null;
  const nodeFields = nodeGroup ? nodeGroup.fields : [];
  
  console.log('  Node fields count:', nodeFields.length);
  assert(nodeFields.length > 0, 'Should have node configuration fields');
  
  return nodeFields.length > 0;
});

runTest('Indexer Services SHOULD show database configuration fields', () => {
  const fields = resolver.getVisibleFields(['indexer-services']);
  
  const basicCategory = fields.categories.basic || {};
  const dbGroup = basicCategory.groups ? basicCategory.groups['database'] : null;
  const dbFields = dbGroup ? dbGroup.fields : [];
  
  console.log('  Database fields count:', dbFields.length);
  assert(dbFields.length > 0, 'Should have database configuration fields');
  
  return dbFields.length > 0;
});

runTest('Core + Kaspa User Applications should show node fields (from Core)', () => {
  const fields = resolver.getVisibleFields(['core', 'kaspa-user-applications']);
  
  const basicCategory = fields.categories.basic || {};
  const nodeGroup = basicCategory.groups ? basicCategory.groups['kaspa-node'] : null;
  const nodeFields = nodeGroup ? nodeGroup.fields : [];
  
  console.log('  Node fields count:', nodeFields.length);
  assert(nodeFields.length > 0, 'Should have node configuration fields from Core profile');
  
  return nodeFields.length > 0;
});

runTest('Indexer Services + Kaspa User Applications should show database fields (from Indexer Services)', () => {
  const fields = resolver.getVisibleFields(['indexer-services', 'kaspa-user-applications']);
  
  const basicCategory = fields.categories.basic || {};
  const dbGroup = basicCategory.groups ? basicCategory.groups['database'] : null;
  const dbFields = dbGroup ? dbGroup.fields : [];
  
  console.log('  Database fields count:', dbFields.length);
  assert(dbFields.length > 0, 'Should have database configuration fields from Indexer Services');
  
  return dbFields.length > 0;
});

// ============================================================================
// Test Suite 3: .env File Generation
// ============================================================================

logSection('Test Suite 3: .env File Generation');

runTest('Kaspa User Applications alone should generate .env with public endpoints', async () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  const envContent = await generator.generateEnvFile(config, ['kaspa-user-applications']);
  
  console.log('  Generated .env excerpt:');
  const lines = envContent.split('\n').filter(l => l.includes('REMOTE_') || l.includes('POSTGRES'));
  lines.forEach(l => console.log('    ' + l));
  
  const hasPublicIndexers = envContent.includes('https://api.kasia.io');
  const hasPublicKaspaNode = envContent.includes('wss://api.kasia.io/ws');
  const hasNoDbConfig = !envContent.includes('POSTGRES_PASSWORD=');
  
  assert(hasPublicIndexers, 'Should use public indexer endpoints');
  assert(hasPublicKaspaNode, 'Should use public Kaspa node WebSocket');
  assert(hasNoDbConfig, 'Should not have database configuration');
  
  return hasPublicIndexers && hasPublicKaspaNode && hasNoDbConfig;
});

runTest('Kaspa User Applications + Indexer Services should generate .env with local endpoints', async () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications', 'indexer-services']);
  const envContent = await generator.generateEnvFile(config, ['kaspa-user-applications', 'indexer-services']);
  
  console.log('  Generated .env excerpt:');
  const lines = envContent.split('\n').filter(l => l.includes('REMOTE_') || l.includes('POSTGRES'));
  lines.forEach(l => console.log('    ' + l));
  
  const hasLocalIndexers = envContent.includes('http://kasia-indexer:8080');
  const hasLocalKaspaNode = envContent.includes('ws://kaspa-node:17110');
  const hasDbConfig = envContent.includes('POSTGRES_PASSWORD=');
  
  assert(hasLocalIndexers, 'Should use local indexer endpoints');
  assert(hasLocalKaspaNode, 'Should use local Kaspa node WebSocket');
  assert(hasDbConfig, 'Should have database configuration (for indexers)');
  
  return hasLocalIndexers && hasLocalKaspaNode && hasDbConfig;
});

runTest('Full stack should generate .env with all configurations', async () => {
  const config = generator.generateDefaultConfig(['core', 'indexer-services', 'kaspa-user-applications']);
  const envContent = await generator.generateEnvFile(config, ['core', 'indexer-services', 'kaspa-user-applications']);
  
  console.log('  Generated .env excerpt:');
  const lines = envContent.split('\n').filter(l => 
    l.includes('KASPA_NODE_') || l.includes('POSTGRES') || l.includes('REMOTE_')
  );
  lines.slice(0, 10).forEach(l => console.log('    ' + l));
  
  const hasNodeConfig = envContent.includes('KASPA_NODE_RPC_PORT=');
  const hasDbConfig = envContent.includes('POSTGRES_PASSWORD=');
  const hasLocalIndexers = envContent.includes('http://kasia-indexer:8080');
  
  assert(hasNodeConfig, 'Should have node configuration (from Core)');
  assert(hasDbConfig, 'Should have database configuration (from Indexer Services)');
  assert(hasLocalIndexers, 'Should use local indexers');
  
  return hasNodeConfig && hasDbConfig && hasLocalIndexers;
});

// ============================================================================
// Test Suite 4: Field Summary Validation
// ============================================================================

logSection('Test Suite 4: Field Summary Validation');

runTest('Kaspa User Applications alone should have minimal field count', () => {
  const summary = resolver.getSummary(['kaspa-user-applications']);
  console.log('  Field summary:', JSON.stringify(summary, null, 2));
  
  // Should only have CUSTOM_ENV_VARS in advanced section
  const totalFields = summary.totalFields;
  const requiredFields = summary.requiredFields;
  
  assert(totalFields <= 1, `Should have at most 1 field (CUSTOM_ENV_VARS), got ${totalFields}`);
  assert(requiredFields === 0, `Should have 0 required fields, got ${requiredFields}`);
  
  return totalFields <= 1 && requiredFields === 0;
});

runTest('Core profile should have multiple node configuration fields', () => {
  const summary = resolver.getSummary(['core']);
  console.log('  Field summary:', JSON.stringify(summary, null, 2));
  
  const nodeFieldCount = summary.groups['kaspa-node'] || 0;
  
  assert(nodeFieldCount >= 3, `Should have at least 3 node fields, got ${nodeFieldCount}`);
  
  return nodeFieldCount >= 3;
});

runTest('Indexer Services should have database configuration fields', () => {
  const summary = resolver.getSummary(['indexer-services']);
  console.log('  Field summary:', JSON.stringify(summary, null, 2));
  
  const dbFieldCount = summary.groups['database'] || 0;
  
  assert(dbFieldCount >= 2, `Should have at least 2 database fields, got ${dbFieldCount}`);
  
  return dbFieldCount >= 2;
});

// ============================================================================
// Test Results Summary
// ============================================================================

logSection('Test Results Summary');

console.log(`\nTotal Tests: ${testCount}`);
console.log(`Passed: ${passCount} (${Math.round(passCount/testCount*100)}%)`);
console.log(`Failed: ${failCount} (${Math.round(failCount/testCount*100)}%)`);

if (failCount === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failCount} test(s) failed`);
  process.exit(1);
}
