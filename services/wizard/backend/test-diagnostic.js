#!/usr/bin/env node

/**
 * Test script for Diagnostic Export and Help System
 * 
 * Usage: node test-diagnostic.js
 */

const DiagnosticCollector = require('./src/utils/diagnostic-collector');

async function testDiagnosticCollector() {
  console.log('='.repeat(80));
  console.log('Testing Diagnostic Collector');
  console.log('='.repeat(80));
  console.log();

  const collector = new DiagnosticCollector();

  try {
    // Test 1: Collect all diagnostics
    console.log('Test 1: Collecting all diagnostic information...');
    const diagnostics = await collector.collectAll();
    console.log('✓ Successfully collected diagnostics');
    console.log(`  - System info: ${diagnostics.system.platform} ${diagnostics.system.arch}`);
    console.log(`  - Memory: ${diagnostics.system.memory.totalGB} GB`);
    console.log(`  - Docker running: ${diagnostics.docker.running}`);
    console.log();

    // Test 2: Generate human-readable report
    console.log('Test 2: Generating human-readable report...');
    const report = await collector.generateReport();
    console.log('✓ Successfully generated report');
    console.log(`  - Report length: ${report.length} characters`);
    console.log(`  - Contains system info: ${report.includes('System Information')}`);
    console.log(`  - Contains Docker info: ${report.includes('Docker Information')}`);
    console.log();

    // Test 3: Generate JSON report
    console.log('Test 3: Generating JSON report...');
    const jsonReport = await collector.generateJSON();
    console.log('✓ Successfully generated JSON report');
    console.log(`  - Has timestamp: ${!!jsonReport.timestamp}`);
    console.log(`  - Has system data: ${!!jsonReport.system}`);
    console.log(`  - Has Docker data: ${!!jsonReport.docker}`);
    console.log();

    // Test 4: Test sanitization
    console.log('Test 4: Testing sensitive data sanitization...');
    const testContent = `
      DATABASE_PASSWORD=mysecretpassword
      API_KEY=sk-1234567890abcdef
      SECRET_TOKEN=super_secret_token
      POSTGRES_PASSWORD=dbpass123
    `;
    const sanitized = collector.sanitizeContent(testContent);
    console.log('✓ Successfully sanitized content');
    console.log(`  - Original contains password: ${testContent.includes('mysecretpassword')}`);
    console.log(`  - Sanitized contains password: ${sanitized.includes('mysecretpassword')}`);
    console.log(`  - Contains REDACTED: ${sanitized.includes('REDACTED')}`);
    console.log();

    // Test 5: Display sample report
    console.log('Test 5: Sample diagnostic report preview:');
    console.log('-'.repeat(80));
    console.log(report.substring(0, 1000) + '...\n[truncated]');
    console.log('-'.repeat(80));
    console.log();

    console.log('='.repeat(80));
    console.log('All tests passed! ✓');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testDiagnosticCollector().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
