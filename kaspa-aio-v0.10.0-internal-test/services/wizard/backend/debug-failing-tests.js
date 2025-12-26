#!/usr/bin/env node

const ConfigurationValidator = require('./src/utils/configuration-validator');

const validator = new ConfigurationValidator();

console.log('Debug: Testing TimescaleDB data directory validation');
console.log('===================================================');

const config1 = {
  TIMESCALEDB_DATA_DIR: '/data/timescaledb',
  POSTGRES_USER: 'kaspa',
  POSTGRES_PASSWORD: 'securepassword123'
};

const result1 = validator.validateConfiguration(config1, ['indexer-services']);
console.log('Result valid:', result1.valid);
console.log('Errors:', JSON.stringify(result1.errors, null, 2));
console.log('Warnings:', JSON.stringify(result1.warnings, null, 2));

console.log('\n\nDebug: Testing configuration with all profiles');
console.log('==============================================');

const config2 = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet',
  KASPA_DATA_DIR: '/data/kaspa',
  TIMESCALEDB_DATA_DIR: '/data/timescaledb',
  POSTGRES_USER: 'kaspa',
  POSTGRES_PASSWORD: 'securepassword123'
};

const result2 = validator.validateConfiguration(config2, ['core', 'indexer-services']);
console.log('Result valid:', result2.valid);
console.log('Errors:', JSON.stringify(result2.errors, null, 2));
console.log('Warnings:', JSON.stringify(result2.warnings, null, 2));