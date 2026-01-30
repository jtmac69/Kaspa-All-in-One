#!/usr/bin/env node

/**
 * Quick test script to verify profile-to-service mappings
 * Run with: node services/wizard/backend/src/utils/test-profile-mapping.js
 */

const ConfigGenerator = require('./config-generator');

const generator = new ConfigGenerator();

console.log('=== Profile-to-Service Mapping Test ===\n');

// Test new profile IDs
console.log('NEW PROFILE IDs:');
console.log('kaspa-node →', generator.PROFILE_SERVICE_MAP['kaspa-node']);
console.log('kasia-app →', generator.PROFILE_SERVICE_MAP['kasia-app']);
console.log('k-social-app →', generator.PROFILE_SERVICE_MAP['k-social-app']);
console.log('kaspa-explorer-bundle →', generator.PROFILE_SERVICE_MAP['kaspa-explorer-bundle']);
console.log('kasia-indexer →', generator.PROFILE_SERVICE_MAP['kasia-indexer']);
console.log('k-indexer-bundle →', generator.PROFILE_SERVICE_MAP['k-indexer-bundle']);
console.log('kaspa-archive-node →', generator.PROFILE_SERVICE_MAP['kaspa-archive-node']);
console.log('kaspa-stratum →', generator.PROFILE_SERVICE_MAP['kaspa-stratum']);

console.log('\nLEGACY PROFILE IDs (Backward Compatibility):');
console.log('core →', generator.PROFILE_SERVICE_MAP['core']);
console.log('kaspa-user-applications →', generator.PROFILE_SERVICE_MAP['kaspa-user-applications']);
console.log('indexer-services →', generator.PROFILE_SERVICE_MAP['indexer-services']);
console.log('archive-node →', generator.PROFILE_SERVICE_MAP['archive-node']);
console.log('mining →', generator.PROFILE_SERVICE_MAP['mining']);

console.log('\nREVERSE MAPPING (Service → Profiles):');
console.log('kaspa-node →', generator.SERVICE_PROFILE_MAP['kaspa-node']);
console.log('k-social →', generator.SERVICE_PROFILE_MAP['k-social']);
console.log('kaspa-explorer →', generator.SERVICE_PROFILE_MAP['kaspa-explorer']);
console.log('kasia-indexer →', generator.SERVICE_PROFILE_MAP['kasia-indexer']);

console.log('\n=== Test Complete ===');
