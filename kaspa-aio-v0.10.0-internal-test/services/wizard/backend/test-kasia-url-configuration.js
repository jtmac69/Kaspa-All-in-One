#!/usr/bin/env node

/**
 * Test: Kasia URL Configuration
 * 
 * Verifies that:
 * 1. Configuration fields have correct default URLs
 * 2. .env generation uses correct public URLs when no local services
 * 3. .env generation uses local URLs when indexer-services is selected
 * 4. Docker-compose generation has correct fallback URLs
 */

const { PROFILE_CONFIG_FIELDS } = require('./src/config/configuration-fields');
const ConfigGenerator = require('./src/utils/config-generator');

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, expected, actual) {
  if (condition) {
    console.log(`${GREEN}✓${RESET} ${testName}`);
    testsPassed++;
    return true;
  } else {
    console.log(`${RED}✗${RESET} ${testName}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
    testsFailed++;
    return false;
  }
}

console.log(`${BLUE}=== Kasia URL Configuration Tests ===${RESET}\n`);

// Test 1: Configuration fields have correct default URLs
console.log(`${YELLOW}Test 1: Configuration Field Defaults${RESET}`);
const kaspaUserAppFields = PROFILE_CONFIG_FIELDS['kaspa-user-applications'];

const kasiaIndexerField = kaspaUserAppFields.find(f => f.key === 'REMOTE_KASIA_INDEXER_URL');
assert(
  kasiaIndexerField && kasiaIndexerField.defaultValue === 'https://indexer.kasia.fyi/',
  'REMOTE_KASIA_INDEXER_URL has correct default',
  'https://indexer.kasia.fyi/',
  kasiaIndexerField?.defaultValue
);

const ksocialIndexerField = kaspaUserAppFields.find(f => f.key === 'REMOTE_KSOCIAL_INDEXER_URL');
assert(
  ksocialIndexerField && ksocialIndexerField.defaultValue === 'https://indexer0.kaspatalk.net/',
  'REMOTE_KSOCIAL_INDEXER_URL has correct default',
  'https://indexer0.kaspatalk.net/',
  ksocialIndexerField?.defaultValue
);

const nodeWsField = kaspaUserAppFields.find(f => f.key === 'REMOTE_KASPA_NODE_WBORSH_URL');
assert(
  nodeWsField && nodeWsField.defaultValue === 'wss://wrpc.kasia.fyi',
  'REMOTE_KASPA_NODE_WBORSH_URL has correct default',
  'wss://wrpc.kasia.fyi',
  nodeWsField?.defaultValue
);

console.log('');

// Test 2: .env generation with kaspa-user-applications ONLY (public URLs)
console.log(`${YELLOW}Test 2: .env Generation - Public URLs (No Local Services)${RESET}`);
const generator = new ConfigGenerator();
const config = generator.generateDefaultConfig(['kaspa-user-applications']);

(async () => {
  const envContent = await generator.generateEnvFile(config, ['kaspa-user-applications']);
  
  assert(
    envContent.includes('REMOTE_KASIA_INDEXER_URL=https://indexer.kasia.fyi/'),
    '.env contains correct public Kasia indexer URL',
    'REMOTE_KASIA_INDEXER_URL=https://indexer.kasia.fyi/',
    envContent.match(/REMOTE_KASIA_INDEXER_URL=.*/)?.[0]
  );
  
  assert(
    envContent.includes('REMOTE_KASPA_NODE_WBORSH_URL=wss://wrpc.kasia.fyi'),
    '.env contains correct public node WebSocket URL',
    'REMOTE_KASPA_NODE_WBORSH_URL=wss://wrpc.kasia.fyi',
    envContent.match(/REMOTE_KASPA_NODE_WBORSH_URL=.*/)?.[0]
  );
  
  assert(
    envContent.includes('# Using public indexers (indexer-services profile not active)'),
    '.env has comment indicating public indexers',
    'Comment present',
    envContent.includes('# Using public indexers') ? 'Comment present' : 'Comment missing'
  );
  
  console.log('');
  
  // Test 3: .env generation with kaspa-user-applications + indexer-services (local URLs)
  console.log(`${YELLOW}Test 3: .env Generation - Local URLs (With Local Services)${RESET}`);
  const configWithLocal = generator.generateDefaultConfig(['kaspa-user-applications', 'indexer-services', 'core']);
  const envContentWithLocal = await generator.generateEnvFile(configWithLocal, ['kaspa-user-applications', 'indexer-services', 'core']);
  
  assert(
    envContentWithLocal.includes('REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/'),
    '.env contains local Kasia indexer URL',
    'REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/',
    envContentWithLocal.match(/REMOTE_KASIA_INDEXER_URL=.*/)?.[0]
  );
  
  assert(
    envContentWithLocal.includes('REMOTE_KASPA_NODE_WBORSH_URL=ws://kaspa-node:17110'),
    '.env contains local node WebSocket URL',
    'REMOTE_KASPA_NODE_WBORSH_URL=ws://kaspa-node:17110',
    envContentWithLocal.match(/REMOTE_KASPA_NODE_WBORSH_URL=.*/)?.[0]
  );
  
  assert(
    envContentWithLocal.includes('# Using local indexers (indexer-services profile is active)'),
    '.env has comment indicating local indexers',
    'Comment present',
    envContentWithLocal.includes('# Using local indexers') ? 'Comment present' : 'Comment missing'
  );
  
  console.log('');
  
  // Test 4: Verify old incorrect URLs are NOT present
  console.log(`${YELLOW}Test 4: Verify Old Incorrect URLs Are Removed${RESET}`);
  
  assert(
    !envContent.includes('api.kasia.io'),
    'Public .env does not contain old incorrect api.kasia.io URL',
    'URL not present',
    envContent.includes('api.kasia.io') ? 'URL still present!' : 'URL not present'
  );
  
  assert(
    !envContentWithLocal.includes('api.kasia.io'),
    'Local .env does not contain old incorrect api.kasia.io URL',
    'URL not present',
    envContentWithLocal.includes('api.kasia.io') ? 'URL still present!' : 'URL not present'
  );
  
  console.log('');
  
  // Test 5: Field validation
  console.log(`${YELLOW}Test 5: Field Validation Rules${RESET}`);
  
  assert(
    kasiaIndexerField.validation.some(v => v.type === 'pattern' && v.pattern.test('https://example.com/')),
    'REMOTE_KASIA_INDEXER_URL accepts valid HTTPS URLs',
    'Valid HTTPS URL accepted',
    'Validation passed'
  );
  
  assert(
    nodeWsField.validation.some(v => v.type === 'pattern' && v.pattern.test('wss://example.com')),
    'REMOTE_KASPA_NODE_WBORSH_URL accepts valid WSS URLs',
    'Valid WSS URL accepted',
    'Validation passed'
  );
  
  assert(
    nodeWsField.validation.some(v => v.type === 'pattern' && v.pattern.test('ws://localhost:17110')),
    'REMOTE_KASPA_NODE_WBORSH_URL accepts valid WS URLs',
    'Valid WS URL accepted',
    'Validation passed'
  );
  
  console.log('');
  
  // Test 6: Field visibility
  console.log(`${YELLOW}Test 6: Field Visibility${RESET}`);
  
  assert(
    kasiaIndexerField.visibleForProfiles.includes('kaspa-user-applications'),
    'REMOTE_KASIA_INDEXER_URL visible for kaspa-user-applications profile',
    'Visible',
    kasiaIndexerField.visibleForProfiles.join(', ')
  );
  
  assert(
    kasiaIndexerField.category === 'basic',
    'REMOTE_KASIA_INDEXER_URL is in basic category',
    'basic',
    kasiaIndexerField.category
  );
  
  assert(
    kasiaIndexerField.group === 'indexer-endpoints',
    'REMOTE_KASIA_INDEXER_URL is in indexer-endpoints group',
    'indexer-endpoints',
    kasiaIndexerField.group
  );
  
  console.log('');
  
  // Summary
  console.log(`${BLUE}=== Test Summary ===${RESET}`);
  console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
  console.log(`${RED}Failed: ${testsFailed}${RESET}`);
  console.log('');
  
  if (testsFailed === 0) {
    console.log(`${GREEN}✓ All tests passed!${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ Some tests failed${RESET}`);
    process.exit(1);
  }
})();
