#!/usr/bin/env node

/**
 * Test Field Visibility Resolver
 * 
 * Verifies that the field visibility resolver correctly handles:
 * - Deprecated fields
 * - Frontend-only fields
 * - Backend field filtering
 * - UI field filtering
 */

const FieldVisibilityResolver = require('./src/utils/field-visibility-resolver');

console.log('='.repeat(60));
console.log('Field Visibility Resolver Tests');
console.log('='.repeat(60));

const resolver = new FieldVisibilityResolver();

// Test 1: Backend fields exclude frontendOnly
console.log('\n1. Testing backend fields exclude frontendOnly...');
const backendFields = resolver.getBackendFields(['kaspa-node']);
const hasWalletSetupMode = backendFields.some(f => f.key === 'WALLET_SETUP_MODE');
console.log(`   Backend has WALLET_SETUP_MODE: ${hasWalletSetupMode}`);
console.log(`   ✓ Expected: false, Got: ${hasWalletSetupMode}`);
if (hasWalletSetupMode) {
  console.log('   ✗ FAIL: Frontend-only field should not be in backend fields');
} else {
  console.log('   ✓ PASS: Frontend-only field correctly excluded');
}

// Test 2: UI fields include frontendOnly
console.log('\n2. Testing UI fields include frontendOnly...');
const uiFields = resolver.getUIFields(['kaspa-node']);
const uiHasWalletSetupMode = uiFields.some(f => f.key === 'WALLET_SETUP_MODE');
console.log(`   UI has WALLET_SETUP_MODE: ${uiHasWalletSetupMode}`);
console.log(`   ✓ Expected: true, Got: ${uiHasWalletSetupMode}`);
if (!uiHasWalletSetupMode) {
  console.log('   ✗ FAIL: Frontend-only field should be in UI fields');
} else {
  console.log('   ✓ PASS: Frontend-only field correctly included');
}

// Test 3: Deprecated fields excluded
console.log('\n3. Testing deprecated fields excluded...');
const hasDeprecated = backendFields.some(f => f.key === 'WALLET_ENABLED');
console.log(`   Has deprecated WALLET_ENABLED: ${hasDeprecated}`);
console.log(`   ✓ Expected: false, Got: ${hasDeprecated}`);
if (hasDeprecated) {
  console.log('   ✗ FAIL: Deprecated field should not be in backend fields');
} else {
  console.log('   ✓ PASS: Deprecated field correctly excluded');
}

// Test 4: Config filtering
console.log('\n4. Testing config filtering...');
const fullConfig = {
  WALLET_CONNECTIVITY_ENABLED: true,
  WALLET_SETUP_MODE: 'generate',  // frontendOnly
  MINING_ADDRESS: 'kaspa:qr...',
  WALLET_SEED_PHRASE: 'should not be here'  // deprecated
};

const filtered = resolver.filterForBackend(fullConfig, ['kaspa-node']);
console.log('   Filtered config keys:', Object.keys(filtered));
console.log('   Full config keys:', Object.keys(fullConfig));

const hasWalletConnectivity = 'WALLET_CONNECTIVITY_ENABLED' in filtered;
const hasMiningAddress = 'MINING_ADDRESS' in filtered;
const hasSetupMode = 'WALLET_SETUP_MODE' in filtered;
const hasSeedPhrase = 'WALLET_SEED_PHRASE' in filtered;

console.log(`   Has WALLET_CONNECTIVITY_ENABLED: ${hasWalletConnectivity} (should be true)`);
console.log(`   Has MINING_ADDRESS: ${hasMiningAddress} (should be true)`);
console.log(`   Has WALLET_SETUP_MODE: ${hasSetupMode} (should be false - frontendOnly)`);
console.log(`   Has WALLET_SEED_PHRASE: ${hasSeedPhrase} (should be false - deprecated)`);

if (hasWalletConnectivity && hasMiningAddress && !hasSetupMode && !hasSeedPhrase) {
  console.log('   ✓ PASS: Config filtering works correctly');
} else {
  console.log('   ✗ FAIL: Config filtering has issues');
}

// Test 5: Get deprecated fields
console.log('\n5. Testing getDeprecatedFields...');
const deprecatedFields = resolver.getDeprecatedFields();
console.log(`   Found ${deprecatedFields.length} deprecated fields`);
if (deprecatedFields.length > 0) {
  console.log('   Deprecated field keys:');
  deprecatedFields.forEach(f => {
    console.log(`     - ${f.key}`);
  });
  console.log('   ✓ PASS: Can retrieve deprecated fields');
} else {
  console.log('   ⚠ WARNING: No deprecated fields found (check configuration-fields.js)');
}

// Test 6: isBackendField check
console.log('\n6. Testing isBackendField...');
const isWalletConnectivityBackend = resolver.isBackendField('WALLET_CONNECTIVITY_ENABLED', ['kaspa-node']);
const isWalletSetupModeBackend = resolver.isBackendField('WALLET_SETUP_MODE', ['kaspa-node']);
console.log(`   WALLET_CONNECTIVITY_ENABLED is backend field: ${isWalletConnectivityBackend} (should be true)`);
console.log(`   WALLET_SETUP_MODE is backend field: ${isWalletSetupModeBackend} (should be false)`);

if (isWalletConnectivityBackend && !isWalletSetupModeBackend) {
  console.log('   ✓ PASS: isBackendField works correctly');
} else {
  console.log('   ✗ FAIL: isBackendField has issues');
}

// Test 7: Profile ID normalization
console.log('\n7. Testing profile ID normalization...');
const legacyFields = resolver.getBackendFields(['core']); // legacy ID
const newFields = resolver.getBackendFields(['kaspa-node']); // new ID
console.log(`   Fields for legacy 'core': ${legacyFields.length}`);
console.log(`   Fields for new 'kaspa-node': ${newFields.length}`);
if (legacyFields.length === newFields.length) {
  console.log('   ✓ PASS: Legacy and new profile IDs return same fields');
} else {
  console.log('   ⚠ WARNING: Legacy and new profile IDs return different field counts');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log('All critical tests completed. Review output above for any failures.');
console.log('');
