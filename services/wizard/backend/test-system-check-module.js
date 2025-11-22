#!/usr/bin/env node

/**
 * Test script for system-check.js module
 * Verifies the module can be loaded and functions work correctly
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TESTS = [];
let passedTests = 0;
let failedTests = 0;

// Helper to make HTTP requests
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// Test 1: Module file is accessible
TESTS.push({
    name: 'Module file is accessible',
    async run() {
        const content = await makeRequest('/scripts/modules/system-check.js');
        if (typeof content === 'string' && content.includes('runFullSystemCheck')) {
            return { success: true, message: 'Module file found and contains expected functions' };
        }
        throw new Error('Module file missing or incomplete');
    }
});

// Test 2: API endpoint works
TESTS.push({
    name: 'System check API endpoint works',
    async run() {
        const result = await makeRequest('/api/system-check?ports=8080,3000');
        if (result.docker && result.dockerCompose && result.resources && result.summary) {
            return { 
                success: true, 
                message: `API returned valid data (Docker: ${result.docker.installed}, Compose: ${result.dockerCompose.installed})` 
            };
        }
        throw new Error('API response missing required fields');
    }
});

// Test 3: API returns proper structure
TESTS.push({
    name: 'API response has correct structure',
    async run() {
        const result = await makeRequest('/api/system-check?ports=8080,3000');
        
        const requiredFields = [
            'docker.installed',
            'docker.version',
            'docker.message',
            'dockerCompose.installed',
            'dockerCompose.version',
            'dockerCompose.message',
            'resources.memory.totalGB',
            'resources.memory.meetsMinimum',
            'resources.cpu.count',
            'resources.cpu.meetsMinimum',
            'ports',
            'summary.status',
            'summary.canProceed'
        ];
        
        const missing = [];
        for (const field of requiredFields) {
            const parts = field.split('.');
            let obj = result;
            for (const part of parts) {
                if (obj[part] === undefined) {
                    missing.push(field);
                    break;
                }
                obj = obj[part];
            }
        }
        
        if (missing.length === 0) {
            return { success: true, message: 'All required fields present' };
        }
        throw new Error(`Missing fields: ${missing.join(', ')}`);
    }
});

// Test 4: Wizard main page loads
TESTS.push({
    name: 'Wizard main page loads',
    async run() {
        const content = await makeRequest('/');
        if (typeof content === 'string' && content.includes('step-system-check')) {
            return { success: true, message: 'Main wizard page contains system check step' };
        }
        throw new Error('Main page missing system check step');
    }
});

// Test 5: Wizard refactored script loads
TESTS.push({
    name: 'Wizard refactored script loads',
    async run() {
        const content = await makeRequest('/scripts/wizard-refactored.js');
        if (typeof content === 'string' && 
            content.includes('runFullSystemCheck') && 
            content.includes('step-system-check')) {
            return { success: true, message: 'Wizard script properly imports and uses system-check module' };
        }
        throw new Error('Wizard script missing system check integration');
    }
});

// Test 6: All required modules are accessible
TESTS.push({
    name: 'All required modules are accessible',
    async run() {
        const modules = [
            '/scripts/modules/system-check.js',
            '/scripts/modules/api-client.js',
            '/scripts/modules/state-manager.js',
            '/scripts/modules/utils.js'
        ];
        
        for (const module of modules) {
            const content = await makeRequest(module);
            if (typeof content !== 'string' || content.length < 100) {
                throw new Error(`Module ${module} not accessible or too small`);
            }
        }
        
        return { success: true, message: 'All required modules are accessible' };
    }
});

// Run all tests
async function runTests() {
    console.log('\n🧪 System Check Module Test Suite\n');
    console.log('='.repeat(60));
    
    for (const test of TESTS) {
        try {
            const result = await test.run();
            passedTests++;
            console.log(`✅ PASS: ${test.name}`);
            if (result.message) {
                console.log(`   ${result.message}`);
            }
        } catch (error) {
            failedTests++;
            console.log(`❌ FAIL: ${test.name}`);
            console.log(`   Error: ${error.message}`);
        }
    }
    
    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${passedTests} passed, ${failedTests} failed out of ${TESTS.length} tests\n`);
    
    if (failedTests === 0) {
        console.log('✅ All tests passed! System check module is working correctly.\n');
        process.exit(0);
    } else {
        console.log('❌ Some tests failed. Please review the errors above.\n');
        process.exit(1);
    }
}

// Check if server is running
http.get(`${BASE_URL}/api/health`, (res) => {
    if (res.statusCode === 200) {
        runTests();
    } else {
        console.error('❌ Server is not responding correctly');
        process.exit(1);
    }
}).on('error', (error) => {
    console.error('❌ Cannot connect to server. Make sure the wizard backend is running on port 3000.');
    console.error(`   Error: ${error.message}`);
    console.error('\n   Start the server with: cd services/wizard/backend && npm start\n');
    process.exit(1);
});
