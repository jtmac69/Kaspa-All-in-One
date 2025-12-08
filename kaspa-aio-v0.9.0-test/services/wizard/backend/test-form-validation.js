#!/usr/bin/env node

/**
 * Form Validation Test Suite
 * Tests client-side and server-side validation
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    log('\n=== Form Validation Test Suite ===\n', 'cyan');
    
    let passed = 0;
    let failed = 0;
    
    try {
        // Test 1: Valid IP address
        log('Test 1: Valid IP address validation', 'blue');
        const validIpConfig = {
            EXTERNAL_IP: '192.168.1.100',
            POSTGRES_PASSWORD: 'securepassword123456'
        };
        const validIpResponse = await makeRequest('POST', '/api/config/validate', validIpConfig);
        if (validIpResponse.data.valid) {
            log('✓ PASS: Valid IP accepted', 'green');
            passed++;
        } else {
            log('✗ FAIL: Valid IP rejected', 'red');
            console.log('Errors:', validIpResponse.data.errors);
            failed++;
        }
        
        // Test 2: Invalid IP address
        log('\nTest 2: Invalid IP address validation', 'blue');
        const invalidIpConfig = {
            EXTERNAL_IP: '999.999.999.999',
            POSTGRES_PASSWORD: 'securepassword123456'
        };
        const invalidIpResponse = await makeRequest('POST', '/api/config/validate', invalidIpConfig);
        if (!invalidIpResponse.data.valid) {
            log('✓ PASS: Invalid IP rejected', 'green');
            passed++;
        } else {
            log('✗ FAIL: Invalid IP accepted', 'red');
            failed++;
        }
        
        // Test 3: Empty IP (should be valid - optional field)
        log('\nTest 3: Empty IP address (optional field)', 'blue');
        const emptyIpConfig = {
            EXTERNAL_IP: '',
            POSTGRES_PASSWORD: 'securepassword123456'
        };
        const emptyIpResponse = await makeRequest('POST', '/api/config/validate', emptyIpConfig);
        if (emptyIpResponse.data.valid) {
            log('✓ PASS: Empty IP accepted (optional)', 'green');
            passed++;
        } else {
            log('✗ FAIL: Empty IP rejected', 'red');
            console.log('Errors:', emptyIpResponse.data.errors);
            failed++;
        }
        
        // Test 4: Password too short
        log('\nTest 4: Password minimum length validation', 'blue');
        const shortPasswordConfig = {
            POSTGRES_PASSWORD: 'short'
        };
        const shortPasswordResponse = await makeRequest('POST', '/api/config/validate', shortPasswordConfig);
        if (!shortPasswordResponse.data.valid) {
            log('✓ PASS: Short password rejected', 'green');
            passed++;
        } else {
            log('✗ FAIL: Short password accepted', 'red');
            failed++;
        }
        
        // Test 5: Valid password
        log('\nTest 5: Valid password validation', 'blue');
        const validPasswordConfig = {
            POSTGRES_PASSWORD: 'thisisaverysecurepassword123'
        };
        const validPasswordResponse = await makeRequest('POST', '/api/config/validate', validPasswordConfig);
        if (validPasswordResponse.data.valid) {
            log('✓ PASS: Valid password accepted', 'green');
            passed++;
        } else {
            log('✗ FAIL: Valid password rejected', 'red');
            console.log('Errors:', validPasswordResponse.data.errors);
            failed++;
        }
        
        // Test 6: Port number validation
        log('\nTest 6: Port number validation', 'blue');
        const validPortConfig = {
            POSTGRES_PASSWORD: 'securepassword123456',
            KASPA_P2P_PORT: 16110,
            KASPA_RPC_PORT: 16111
        };
        const validPortResponse = await makeRequest('POST', '/api/config/validate', validPortConfig);
        if (validPortResponse.data.valid) {
            log('✓ PASS: Valid ports accepted', 'green');
            passed++;
        } else {
            log('✗ FAIL: Valid ports rejected', 'red');
            console.log('Errors:', validPortResponse.data.errors);
            failed++;
        }
        
        // Test 7: Invalid port number (too low)
        log('\nTest 7: Invalid port number (below 1024)', 'blue');
        const invalidPortConfig = {
            POSTGRES_PASSWORD: 'securepassword123456',
            KASPA_P2P_PORT: 80
        };
        const invalidPortResponse = await makeRequest('POST', '/api/config/validate', invalidPortConfig);
        if (!invalidPortResponse.data.valid) {
            log('✓ PASS: Invalid port rejected', 'green');
            passed++;
        } else {
            log('✗ FAIL: Invalid port accepted', 'red');
            failed++;
        }
        
        // Test 8: Complete valid configuration
        log('\nTest 8: Complete valid configuration', 'blue');
        const completeConfig = {
            PUBLIC_NODE: true,
            EXTERNAL_IP: '203.0.113.42',
            KASPA_P2P_PORT: 16110,
            KASPA_RPC_PORT: 16111,
            DASHBOARD_PORT: 3001,
            POSTGRES_USER: 'kaspa',
            POSTGRES_PASSWORD: 'supersecurepassword123456',
            POSTGRES_DB: 'kaspa_explorer',
            POSTGRES_PORT: 5432,
            ENABLE_MONITORING: true,
            LOG_LEVEL: 'info'
        };
        const completeResponse = await makeRequest('POST', '/api/config/validate', completeConfig);
        if (completeResponse.data.valid) {
            log('✓ PASS: Complete configuration accepted', 'green');
            passed++;
        } else {
            log('✗ FAIL: Complete configuration rejected', 'red');
            console.log('Errors:', completeResponse.data.errors);
            failed++;
        }
        
        // Test 9: Invalid database name (special characters)
        log('\nTest 9: Invalid database name validation', 'blue');
        const invalidDbConfig = {
            POSTGRES_PASSWORD: 'securepassword123456',
            POSTGRES_DB: 'kaspa-explorer!'
        };
        const invalidDbResponse = await makeRequest('POST', '/api/config/validate', invalidDbConfig);
        if (!invalidDbResponse.data.valid) {
            log('✓ PASS: Invalid database name rejected', 'green');
            passed++;
        } else {
            log('✗ FAIL: Invalid database name accepted', 'red');
            failed++;
        }
        
        // Test 10: Invalid log level
        log('\nTest 10: Invalid log level validation', 'blue');
        const invalidLogConfig = {
            POSTGRES_PASSWORD: 'securepassword123456',
            LOG_LEVEL: 'verbose'
        };
        const invalidLogResponse = await makeRequest('POST', '/api/config/validate', invalidLogConfig);
        if (!invalidLogResponse.data.valid) {
            log('✓ PASS: Invalid log level rejected', 'green');
            passed++;
        } else {
            log('✗ FAIL: Invalid log level accepted', 'red');
            failed++;
        }
        
    } catch (error) {
        log(`\n✗ ERROR: ${error.message}`, 'red');
        if (error.code === 'ECONNREFUSED') {
            log('\nMake sure the wizard backend is running:', 'yellow');
            log('  cd services/wizard/backend', 'yellow');
            log('  npm start', 'yellow');
        }
        process.exit(1);
    }
    
    // Summary
    log('\n=== Test Summary ===', 'cyan');
    log(`Total: ${passed + failed}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    
    if (failed === 0) {
        log('\n✓ All tests passed!', 'green');
        process.exit(0);
    } else {
        log('\n✗ Some tests failed', 'red');
        process.exit(1);
    }
}

// Run tests
runTests();
