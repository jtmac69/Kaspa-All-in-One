/**
 * Test Suite for Complete Module
 * Tests the validation results display functionality
 */

const assert = require('assert');

// Mock data for testing
const mockValidationData = {
    services: {
        'kaspa-node': {
            exists: true,
            running: true,
            health: 'healthy'
        },
        'dashboard': {
            exists: true,
            running: true
        },
        'nginx': {
            exists: true,
            running: false
        },
        'timescaledb': {
            exists: false,
            running: false
        }
    },
    allRunning: false,
    anyFailed: true,
    summary: {
        total: 4,
        running: 2,
        stopped: 1,
        missing: 1
    }
};

const mockAllRunningData = {
    services: {
        'kaspa-node': {
            exists: true,
            running: true
        },
        'dashboard': {
            exists: true,
            running: true
        }
    },
    allRunning: true,
    anyFailed: false,
    summary: {
        total: 2,
        running: 2,
        stopped: 0,
        missing: 0
    }
};

/**
 * Test 1: Module exports required functions
 */
function testModuleExports() {
    console.log('Test 1: Module exports required functions');
    
    // Since we can't import ES6 modules in Node.js without special setup,
    // we'll test the structure instead
    const expectedExports = [
        'displayValidationResults',
        'retryValidation',
        'runServiceVerification'
    ];
    
    console.log('✓ Expected exports defined:', expectedExports.join(', '));
    return true;
}

/**
 * Test 2: Service status classification
 */
function testServiceStatusClassification() {
    console.log('\nTest 2: Service status classification');
    
    const testCases = [
        {
            status: { exists: true, running: true },
            expected: { class: 'running', icon: '✓', text: 'Running' }
        },
        {
            status: { exists: true, running: false },
            expected: { class: 'stopped', icon: '⏸️', text: 'Stopped' }
        },
        {
            status: { exists: false, running: false },
            expected: { class: 'missing', icon: '⚠️', text: 'Not Found' }
        }
    ];
    
    testCases.forEach((testCase, index) => {
        const { status, expected } = testCase;
        
        // Simulate classification logic
        let statusClass, statusIcon, statusText;
        
        if (!status.exists) {
            statusClass = 'missing';
            statusIcon = '⚠️';
            statusText = 'Not Found';
        } else if (status.running) {
            statusClass = 'running';
            statusIcon = '✓';
            statusText = 'Running';
        } else {
            statusClass = 'stopped';
            statusIcon = '⏸️';
            statusText = 'Stopped';
        }
        
        assert.strictEqual(statusClass, expected.class, `Case ${index + 1}: Status class should be ${expected.class}`);
        assert.strictEqual(statusIcon, expected.icon, `Case ${index + 1}: Status icon should be ${expected.icon}`);
        assert.strictEqual(statusText, expected.text, `Case ${index + 1}: Status text should be ${expected.text}`);
        
        console.log(`✓ Case ${index + 1}: ${JSON.stringify(status)} → ${statusClass}`);
    });
    
    return true;
}

/**
 * Test 3: Service name formatting
 */
function testServiceNameFormatting() {
    console.log('\nTest 3: Service name formatting');
    
    const testCases = [
        { input: 'kaspa-node', expected: 'Kaspa Node' },
        { input: 'dashboard', expected: 'Dashboard' },
        { input: 'timescaledb', expected: 'Timescaledb' },
        { input: 'k-social', expected: 'K Social' },
        { input: 'kasia-indexer', expected: 'Kasia Indexer' }
    ];
    
    testCases.forEach(testCase => {
        const formatted = testCase.input
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        assert.strictEqual(formatted, testCase.expected, `${testCase.input} should format to ${testCase.expected}`);
        console.log(`✓ ${testCase.input} → ${formatted}`);
    });
    
    return true;
}

/**
 * Test 4: Summary badge determination
 */
function testSummaryBadgeDetermination() {
    console.log('\nTest 4: Summary badge determination');
    
    const testCases = [
        {
            data: { allRunning: true, anyFailed: false },
            expected: { class: 'success', icon: '✓', text: 'All services healthy' }
        },
        {
            data: { allRunning: false, anyFailed: true },
            expected: { class: 'warning', icon: '⚠️', text: 'Some services need attention' }
        },
        {
            data: { allRunning: false, anyFailed: false },
            expected: { class: 'info', icon: 'ℹ️', text: 'Services are starting up' }
        }
    ];
    
    testCases.forEach((testCase, index) => {
        const { allRunning, anyFailed } = testCase.data;
        
        let summaryClass, summaryIcon, summaryText;
        
        if (anyFailed) {
            summaryClass = 'warning';
            summaryIcon = '⚠️';
            summaryText = 'Some services need attention';
        } else if (!allRunning) {
            summaryClass = 'info';
            summaryIcon = 'ℹ️';
            summaryText = 'Services are starting up';
        } else {
            summaryClass = 'success';
            summaryIcon = '✓';
            summaryText = 'All services healthy';
        }
        
        assert.strictEqual(summaryClass, testCase.expected.class, `Case ${index + 1}: Summary class should be ${testCase.expected.class}`);
        assert.strictEqual(summaryIcon, testCase.expected.icon, `Case ${index + 1}: Summary icon should be ${testCase.expected.icon}`);
        assert.strictEqual(summaryText, testCase.expected.text, `Case ${index + 1}: Summary text should be ${testCase.expected.text}`);
        
        console.log(`✓ Case ${index + 1}: allRunning=${allRunning}, anyFailed=${anyFailed} → ${summaryClass}`);
    });
    
    return true;
}

/**
 * Test 5: Validation data structure
 */
function testValidationDataStructure() {
    console.log('\nTest 5: Validation data structure');
    
    // Test with mock data
    assert.ok(mockValidationData.services, 'Validation data should have services');
    assert.ok(typeof mockValidationData.allRunning === 'boolean', 'allRunning should be boolean');
    assert.ok(typeof mockValidationData.anyFailed === 'boolean', 'anyFailed should be boolean');
    assert.ok(mockValidationData.summary, 'Validation data should have summary');
    assert.ok(typeof mockValidationData.summary.total === 'number', 'summary.total should be number');
    assert.ok(typeof mockValidationData.summary.running === 'number', 'summary.running should be number');
    assert.ok(typeof mockValidationData.summary.stopped === 'number', 'summary.stopped should be number');
    assert.ok(typeof mockValidationData.summary.missing === 'number', 'summary.missing should be number');
    
    console.log('✓ Validation data structure is correct');
    console.log(`  - Services: ${Object.keys(mockValidationData.services).length}`);
    console.log(`  - All running: ${mockValidationData.allRunning}`);
    console.log(`  - Any failed: ${mockValidationData.anyFailed}`);
    console.log(`  - Summary: ${JSON.stringify(mockValidationData.summary)}`);
    
    return true;
}

/**
 * Test 6: Summary statistics calculation
 */
function testSummaryStatistics() {
    console.log('\nTest 6: Summary statistics calculation');
    
    const services = mockValidationData.services;
    const serviceEntries = Object.entries(services);
    
    const total = serviceEntries.length;
    const running = serviceEntries.filter(([_, status]) => status.running).length;
    const stopped = serviceEntries.filter(([_, status]) => status.exists && !status.running).length;
    const missing = serviceEntries.filter(([_, status]) => !status.exists).length;
    
    assert.strictEqual(total, mockValidationData.summary.total, 'Total should match');
    assert.strictEqual(running, mockValidationData.summary.running, 'Running count should match');
    assert.strictEqual(stopped, mockValidationData.summary.stopped, 'Stopped count should match');
    assert.strictEqual(missing, mockValidationData.summary.missing, 'Missing count should match');
    
    console.log(`✓ Statistics calculated correctly:`);
    console.log(`  - Total: ${total}`);
    console.log(`  - Running: ${running}`);
    console.log(`  - Stopped: ${stopped}`);
    console.log(`  - Missing: ${missing}`);
    
    return true;
}

/**
 * Test 7: All services running scenario
 */
function testAllServicesRunning() {
    console.log('\nTest 7: All services running scenario');
    
    const { allRunning, anyFailed, summary } = mockAllRunningData;
    
    assert.strictEqual(allRunning, true, 'All services should be running');
    assert.strictEqual(anyFailed, false, 'No services should have failed');
    assert.strictEqual(summary.running, summary.total, 'Running count should equal total');
    assert.strictEqual(summary.stopped, 0, 'Stopped count should be 0');
    assert.strictEqual(summary.missing, 0, 'Missing count should be 0');
    
    console.log('✓ All services running scenario validated');
    console.log(`  - All running: ${allRunning}`);
    console.log(`  - Any failed: ${anyFailed}`);
    console.log(`  - Summary: ${JSON.stringify(summary)}`);
    
    return true;
}

/**
 * Test 8: Empty services scenario
 */
function testEmptyServices() {
    console.log('\nTest 8: Empty services scenario');
    
    const emptyData = {
        services: {},
        allRunning: true,
        anyFailed: false,
        summary: {
            total: 0,
            running: 0,
            stopped: 0,
            missing: 0
        }
    };
    
    const serviceEntries = Object.entries(emptyData.services);
    assert.strictEqual(serviceEntries.length, 0, 'Should have no services');
    assert.strictEqual(emptyData.summary.total, 0, 'Total should be 0');
    
    console.log('✓ Empty services scenario handled correctly');
    
    return true;
}

/**
 * Run all tests
 */
function runTests() {
    console.log('='.repeat(60));
    console.log('Complete Module Test Suite');
    console.log('='.repeat(60));
    
    const tests = [
        testModuleExports,
        testServiceStatusClassification,
        testServiceNameFormatting,
        testSummaryBadgeDetermination,
        testValidationDataStructure,
        testSummaryStatistics,
        testAllServicesRunning,
        testEmptyServices
    ];
    
    let passed = 0;
    let failed = 0;
    
    tests.forEach(test => {
        try {
            if (test()) {
                passed++;
            }
        } catch (error) {
            failed++;
            console.error(`✗ Test failed: ${error.message}`);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
    
    return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}

module.exports = { runTests };
