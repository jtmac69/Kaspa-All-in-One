#!/usr/bin/env node

/**
 * Test Enhanced Configuration Validation
 * 
 * Tests the enhanced validation functionality including:
 * - Port configuration validation (range, conflicts, availability)
 * - Mixed indexer configuration validation
 * - Wallet creation validation (password strength, path validation)
 * - Wallet import validation (file format, key validation)
 * - Mining wallet validation (address format, node connectivity)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}
async function testPortValidation() {
  log('\n=== Testing Port Configuration Validation ===', 'cyan');
  
  try {
    // Test 1: Valid port range
    log('\nTest 1: Valid port range');
    const validPortConfig = {
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16111,
      DASHBOARD_PORT: 3000 // Port 3000 is fine for applications
    };
    const validPortResponse = await makeRequest('POST', '/config/validate', {
      config: validPortConfig,
      profiles: ['core']
    });
    
    if (validPortResponse.data.valid) {
      log('✓ PASS: Valid ports accepted', 'green');
    } else {
      log('✗ FAIL: Valid ports rejected', 'red');
      console.log('Full response:', JSON.stringify(validPortResponse, null, 2));
    }

    // Test 2: Invalid port range (too low)
    log('\nTest 2: Invalid port range (too low)');
    const lowPortConfig = {
      KASPA_NODE_RPC_PORT: 80,
      KASPA_NODE_P2P_PORT: 16111
    };
    const lowPortResponse = await makeRequest('POST', '/config/validate', {
      config: lowPortConfig,
      profiles: ['core']
    });
    
    if (!lowPortResponse.data.valid && lowPortResponse.data.errors.some(e => e.type === 'range')) {
      log('✓ PASS: Low port rejected', 'green');
    } else {
      log('✗ FAIL: Low port not properly rejected', 'red');
      console.log('Response:', lowPortResponse.data);
    }

    // Test 3: Port conflicts
    log('\nTest 3: Port conflicts');
    const conflictPortConfig = {
      KASPA_NODE_RPC_PORT: 16110,
      KASPA_NODE_P2P_PORT: 16110, // Same as RPC port
      DASHBOARD_PORT: 3000
    };
    const conflictPortResponse = await makeRequest('POST', '/config/validate', {
      config: conflictPortConfig,
      profiles: ['core']
    });
    
    if (!conflictPortResponse.data.valid && conflictPortResponse.data.errors.some(e => e.type === 'port_conflict')) {
      log('✓ PASS: Port conflict detected', 'green');
    } else {
      log('✗ FAIL: Port conflict not detected', 'red');
      console.log('Response:', conflictPortResponse.data);
    }

    // Test 4: Reserved port warning
    log('\nTest 4: Reserved port warning');
    const reservedPortConfig = {
      KASPA_NODE_RPC_PORT: 80, // HTTP port
      KASPA_NODE_P2P_PORT: 16111
    };
    const reservedPortResponse = await makeRequest('POST', '/config/validate', {
      config: reservedPortConfig,
      profiles: ['core']
    });
    
    if (reservedPortResponse.data.errors.some(e => e.type === 'port_reserved')) {
      log('✓ PASS: Reserved port warning generated', 'green');
    } else {
      log('✗ FAIL: Reserved port warning not generated', 'red');
      console.log('Response:', reservedPortResponse.data);
    }

  } catch (error) {
    log(`✗ ERROR: Port validation test failed: ${error.message}`, 'red');
  }
}

async function testMixedIndexerValidation() {
  log('\n=== Testing Mixed Indexer Configuration Validation ===', 'cyan');
  
  try {
    // Test 1: Valid mixed indexer configuration (confirmed)
    log('\nTest 1: Valid mixed indexer configuration (confirmed)');
    const validMixedConfig = {
      KASIA_INDEXER_URL: 'http://localhost:8080',
      K_INDEXER_URL: 'https://api.k-social.io',
      MIXED_INDEXER_CONFIRMED: true,
      USE_PUBLIC_KASPA_NETWORK: true,
      K_SOCIAL_DB_PASSWORD: 'securepassword123456',
      SIMPLY_KASPA_DB_PASSWORD: 'securepassword123456'
    };
    const validMixedResponse = await makeRequest('POST', '/config/validate', {
      config: validMixedConfig,
      profiles: ['kaspa-user-applications', 'indexer-services']
    });
    
    if (validMixedResponse.data.valid) {
      log('✓ PASS: Valid mixed indexer configuration accepted', 'green');
    } else {
      log('✗ FAIL: Valid mixed indexer configuration rejected', 'red');
      console.log('Errors:', validMixedResponse.data.errors);
    }

    // Test 2: Mixed indexer configuration without confirmation
    log('\nTest 2: Mixed indexer configuration without confirmation');
    const unconfirmedMixedConfig = {
      KASIA_INDEXER_URL: 'http://localhost:8080',
      K_INDEXER_URL: 'https://api.k-social.io',
      MIXED_INDEXER_CONFIRMED: false
    };
    const unconfirmedMixedResponse = await makeRequest('POST', '/config/validate', {
      config: unconfirmedMixedConfig,
      profiles: ['kaspa-user-applications', 'indexer-services']
    });
    
    if (!unconfirmedMixedResponse.data.valid && unconfirmedMixedResponse.data.errors.some(e => e.type === 'mixed_indexer_confirmation')) {
      log('✓ PASS: Mixed indexer confirmation required', 'green');
    } else {
      log('✗ FAIL: Mixed indexer confirmation not required', 'red');
      console.log('Response:', unconfirmedMixedResponse.data);
    }

    // Test 3: Invalid indexer URL format
    log('\nTest 3: Invalid indexer URL format');
    const invalidUrlConfig = {
      KASIA_INDEXER_URL: 'not-a-valid-url',
      K_INDEXER_URL: 'https://api.k-social.io'
    };
    const invalidUrlResponse = await makeRequest('POST', '/config/validate', {
      config: invalidUrlConfig,
      profiles: ['kaspa-user-applications', 'indexer-services']
    });
    
    if (!invalidUrlResponse.data.valid && invalidUrlResponse.data.errors.some(e => e.type === 'indexer_url_format')) {
      log('✓ PASS: Invalid indexer URL rejected', 'green');
    } else {
      log('✗ FAIL: Invalid indexer URL not rejected', 'red');
      console.log('Response:', invalidUrlResponse.data);
    }

  } catch (error) {
    log(`✗ ERROR: Mixed indexer validation test failed: ${error.message}`, 'red');
  }
}
async function testWalletValidation() {
  log('\n=== Testing Wallet Configuration Validation ===', 'cyan');
  
  try {
    // Test 1: Valid wallet password
    log('\nTest 1: Valid wallet password');
    const validWalletConfig = {
      CREATE_WALLET: true,
      WALLET_PASSWORD: 'SecurePassword123!'
    };
    const validWalletResponse = await makeRequest('POST', '/config/validate', {
      config: validWalletConfig,
      profiles: ['core']
    });
    
    if (validWalletResponse.data.valid) {
      log('✓ PASS: Valid wallet password accepted', 'green');
    } else {
      log('✗ FAIL: Valid wallet password rejected', 'red');
      console.log('Errors:', validWalletResponse.data.errors);
    }

    // Test 2: Weak wallet password
    log('\nTest 2: Weak wallet password');
    const weakPasswordConfig = {
      CREATE_WALLET: true,
      WALLET_PASSWORD: '123'
    };
    const weakPasswordResponse = await makeRequest('POST', '/config/validate', {
      config: weakPasswordConfig,
      profiles: ['core']
    });
    
    console.log('Weak password response:', JSON.stringify(weakPasswordResponse.data, null, 2));
    
    if (!weakPasswordResponse.data.valid && (
      weakPasswordResponse.data.errors.some(e => e.type === 'wallet_password_length') ||
      weakPasswordResponse.data.errors.some(e => e.type === 'walletPassword') ||
      weakPasswordResponse.data.errors.some(e => e.type === 'minLength')
    )) {
      log('✓ PASS: Weak wallet password rejected', 'green');
    } else {
      log('✗ FAIL: Weak wallet password not rejected', 'red');
      console.log('Response:', weakPasswordResponse.data);
    }

    // Test 3: Valid private key
    log('\nTest 3: Valid private key');
    const validKeyConfig = {
      IMPORT_WALLET: true,
      WALLET_PRIVATE_KEY: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };
    const validKeyResponse = await makeRequest('POST', '/config/validate', {
      config: validKeyConfig,
      profiles: ['core']
    });
    
    if (validKeyResponse.data.valid) {
      log('✓ PASS: Valid private key accepted', 'green');
    } else {
      log('✗ FAIL: Valid private key rejected', 'red');
      console.log('Errors:', validKeyResponse.data.errors);
    }

    // Test 4: Invalid private key format
    log('\nTest 4: Invalid private key format');
    const invalidKeyConfig = {
      IMPORT_WALLET: true,
      WALLET_PRIVATE_KEY: 'invalid-key'
    };
    const invalidKeyResponse = await makeRequest('POST', '/config/validate', {
      config: invalidKeyConfig,
      profiles: ['core']
    });
    
    if (!invalidKeyResponse.data.valid && invalidKeyResponse.data.errors.some(e => e.type === 'wallet_key_format')) {
      log('✓ PASS: Invalid private key rejected', 'green');
    } else {
      log('✗ FAIL: Invalid private key not rejected', 'red');
      console.log('Response:', invalidKeyResponse.data);
    }

  } catch (error) {
    log(`✗ ERROR: Wallet validation test failed: ${error.message}`, 'red');
  }
}
async function testMiningWalletValidation() {
  log('\n=== Testing Mining Wallet Validation ===', 'cyan');
  
  try {
    // Test 1: Valid Kaspa address
    log('\nTest 1: Valid Kaspa address');
    const validAddressConfig = {
      MINING_ADDRESS: 'kaspa:qz4wqhgqrpx6h5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5'
    };
    const validAddressResponse = await makeRequest('POST', '/config/validate', {
      config: validAddressConfig,
      profiles: ['mining', 'core']
    });
    
    if (validAddressResponse.data.valid) {
      log('✓ PASS: Valid Kaspa address accepted', 'green');
    } else {
      log('✗ FAIL: Valid Kaspa address rejected', 'red');
      console.log('Errors:', validAddressResponse.data.errors);
    }

    // Test 2: Invalid Kaspa address (missing prefix)
    log('\nTest 2: Invalid Kaspa address (missing prefix)');
    const invalidAddressConfig = {
      MINING_ADDRESS: 'qz4wqhgqrpx6h5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5'
    };
    const invalidAddressResponse = await makeRequest('POST', '/config/validate', {
      config: invalidAddressConfig,
      profiles: ['mining', 'core']
    });
    
    if (!invalidAddressResponse.data.valid && invalidAddressResponse.data.errors.some(e => e.type === 'kaspa_address_prefix')) {
      log('✓ PASS: Invalid Kaspa address rejected', 'green');
    } else {
      log('✗ FAIL: Invalid Kaspa address not rejected', 'red');
      console.log('Response:', invalidAddressResponse.data);
    }

    // Test 3: Mining without local node
    log('\nTest 3: Mining without local node');
    const miningWithoutNodeConfig = {
      MINING_ADDRESS: 'kaspa:qz4wqhgqrpx6h5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5x5'
    };
    const miningWithoutNodeResponse = await makeRequest('POST', '/config/validate', {
      config: miningWithoutNodeConfig,
      profiles: ['mining'] // No core profile
    });
    
    if (!miningWithoutNodeResponse.data.valid && miningWithoutNodeResponse.data.errors.some(e => e.type === 'mining_node_required')) {
      log('✓ PASS: Mining without local node rejected', 'green');
    } else {
      log('✗ FAIL: Mining without local node not rejected', 'red');
      console.log('Response:', miningWithoutNodeResponse.data);
    }

  } catch (error) {
    log(`✗ ERROR: Mining wallet validation test failed: ${error.message}`, 'red');
  }
}

async function main() {
  log('Starting Enhanced Configuration Validation Tests', 'magenta');
  log('='.repeat(50), 'magenta');
  
  await testPortValidation();
  await testMixedIndexerValidation();
  await testWalletValidation();
  await testMiningWalletValidation();
  
  log('\n=== Test Summary ===', 'magenta');
  log('Enhanced configuration validation tests completed.', 'white');
  log('Check the output above for individual test results.', 'white');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testPortValidation,
  testMixedIndexerValidation,
  testWalletValidation,
  testMiningWalletValidation
};