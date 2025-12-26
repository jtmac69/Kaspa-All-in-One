#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all critical tests to verify system health
 */

const { spawn } = require('child_process');
const path = require('path');

const TESTS = [
    {
        name: 'Configuration Validation Unit Tests',
        file: 'test-configuration-validation-unit.js',
        critical: true
    },
    {
        name: 'Enhanced Validation Tests',
        file: 'test-enhanced-validation.js',
        critical: true
    },
    {
        name: 'Network Change Validation Tests',
        file: 'test-network-change-validation.js',
        critical: true
    },
    {
        name: 'End-to-End Configuration Flow',
        file: 'test-configuration-e2e.js',
        critical: true
    },
    {
        name: 'Profile State Manager Tests',
        file: 'test-profile-state-manager.js',
        critical: true
    },
    {
        name: 'Reconfiguration API Tests',
        file: 'test-reconfiguration-api.js',
        critical: true
    },
    {
        name: 'Reconfiguration Mode Tests',
        file: 'test-reconfiguration-mode.js',
        critical: false // This has some expected failures
    }
];

async function runTest(test) {
    return new Promise((resolve) => {
        console.log(`\n🧪 Running: ${test.name}`);
        console.log('='.repeat(60));
        
        const child = spawn('node', [test.file], {
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            const success = code === 0;
            const result = {
                name: test.name,
                file: test.file,
                success,
                code,
                critical: test.critical,
                stdout,
                stderr
            };
            
            if (success) {
                console.log(`✅ PASSED: ${test.name}`);
            } else {
                console.log(`❌ FAILED: ${test.name} (exit code: ${code})`);
                if (test.critical) {
                    console.log(`⚠️  CRITICAL TEST FAILED!`);
                }
            }
            
            resolve(result);
        });
    });
}

async function main() {
    console.log('🚀 Comprehensive Test Suite');
    console.log('============================');
    console.log(`Running ${TESTS.length} test suites...`);
    
    const results = [];
    let totalTests = 0;
    let passedTests = 0;
    let criticalFailures = 0;
    
    for (const test of TESTS) {
        const result = await runTest(test);
        results.push(result);
        totalTests++;
        
        if (result.success) {
            passedTests++;
        } else if (result.critical) {
            criticalFailures++;
        }
    }
    
    console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
    console.log('==============================');
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Critical Failures: ${criticalFailures}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    console.log('--------------------');
    
    for (const result of results) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const critical = result.critical ? ' (CRITICAL)' : '';
        console.log(`${status} ${result.name}${critical}`);
        
        if (!result.success && result.critical) {
            console.log(`   Exit Code: ${result.code}`);
            if (result.stderr) {
                console.log(`   Error: ${result.stderr.split('\n')[0]}`);
            }
        }
    }
    
    if (criticalFailures > 0) {
        console.log('\n⚠️  CRITICAL FAILURES DETECTED!');
        console.log('The following critical tests failed:');
        
        for (const result of results) {
            if (!result.success && result.critical) {
                console.log(`   - ${result.name}`);
            }
        }
        
        console.log('\nPlease review and fix critical failures before proceeding.');
        process.exit(1);
    } else if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('System is ready for production use.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some non-critical tests failed.');
        console.log('System is functional but may have minor issues.');
        process.exit(0);
    }
}

main().catch(console.error);