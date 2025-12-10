#!/usr/bin/env node

/**
 * Test Kaspa Explorer CORS Fix
 * 
 * This script tests that the kaspa-explorer service is properly configured
 * and can be accessed without CORS errors.
 */

const fs = require('fs').promises;
const { spawn } = require('child_process');

async function testKaspaExplorerFix() {
  console.log('='.repeat(80));
  console.log('Testing Kaspa Explorer CORS Fix');
  console.log('='.repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;

  // Test 1: Verify .env has correct profile
  console.log('Test 1: Verify .env has correct profile');
  console.log('-'.repeat(50));
  
  try {
    const envContent = await fs.readFile('services/.env', 'utf8');
    const hasCorrectProfile = envContent.includes('COMPOSE_PROFILES=kaspa-user-applications');
    
    if (hasCorrectProfile) {
      console.log('✅ PASS: .env file has correct profile (kaspa-user-applications)');
      passed++;
    } else {
      console.log('❌ FAIL: .env file does not have correct profile');
      console.log('   Expected: COMPOSE_PROFILES=kaspa-user-applications');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Could not read .env file: ${error.message}`);
    failed++;
  }
  
  console.log();

  // Test 2: Verify docker-compose.yml includes kaspa-explorer
  console.log('Test 2: Verify docker-compose.yml includes kaspa-explorer');
  console.log('-'.repeat(50));
  
  try {
    const composeContent = await fs.readFile('docker-compose.yml', 'utf8');
    const hasKaspaExplorer = composeContent.includes('kaspa-explorer:');
    const hasCorrectProfile = composeContent.includes('- kaspa-user-applications');
    const hasCorrectPort = composeContent.includes('KASPA_EXPLORER_PORT:-3004');
    const hasCorrectBuild = composeContent.includes('context: ./services/kaspa-explorer');
    
    if (hasKaspaExplorer && hasCorrectProfile && hasCorrectPort && hasCorrectBuild) {
      console.log('✅ PASS: docker-compose.yml includes kaspa-explorer service');
      console.log('   - Service definition: ✓');
      console.log('   - Correct profile: ✓');
      console.log('   - Port configuration: ✓');
      console.log('   - Build context: ✓');
      passed++;
    } else {
      console.log('❌ FAIL: docker-compose.yml kaspa-explorer configuration incomplete');
      console.log(`   - Service definition: ${hasKaspaExplorer ? '✓' : '✗'}`);
      console.log(`   - Correct profile: ${hasCorrectProfile ? '✓' : '✗'}`);
      console.log(`   - Port configuration: ${hasCorrectPort ? '✓' : '✗'}`);
      console.log(`   - Build context: ${hasCorrectBuild ? '✓' : '✗'}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Could not read docker-compose.yml: ${error.message}`);
    failed++;
  }
  
  console.log();

  // Test 3: Verify kaspa-explorer service files exist
  console.log('Test 3: Verify kaspa-explorer service files exist');
  console.log('-'.repeat(50));
  
  try {
    await fs.access('services/kaspa-explorer/Dockerfile');
    await fs.access('services/kaspa-explorer/nginx.conf');
    
    console.log('✅ PASS: kaspa-explorer service files exist');
    console.log('   - Dockerfile: ✓');
    console.log('   - nginx.conf: ✓');
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: kaspa-explorer service files missing: ${error.message}`);
    failed++;
  }
  
  console.log();

  // Test 4: Verify nginx.conf has CORS headers
  console.log('Test 4: Verify nginx.conf has CORS headers');
  console.log('-'.repeat(50));
  
  try {
    const nginxContent = await fs.readFile('services/kaspa-explorer/nginx.conf', 'utf8');
    const hasCorsOrigin = nginxContent.includes('Access-Control-Allow-Origin');
    const hasCorsMethods = nginxContent.includes('Access-Control-Allow-Methods');
    const hasCorsHeaders = nginxContent.includes('Access-Control-Allow-Headers');
    
    if (hasCorsOrigin && hasCorsMethods && hasCorsHeaders) {
      console.log('✅ PASS: nginx.conf has CORS headers configured');
      console.log('   - Access-Control-Allow-Origin: ✓');
      console.log('   - Access-Control-Allow-Methods: ✓');
      console.log('   - Access-Control-Allow-Headers: ✓');
      passed++;
    } else {
      console.log('❌ FAIL: nginx.conf missing CORS headers');
      console.log(`   - Access-Control-Allow-Origin: ${hasCorsOrigin ? '✓' : '✗'}`);
      console.log(`   - Access-Control-Allow-Methods: ${hasCorsMethods ? '✓' : '✗'}`);
      console.log(`   - Access-Control-Allow-Headers: ${hasCorsHeaders ? '✓' : '✗'}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Could not read nginx.conf: ${error.message}`);
    failed++;
  }
  
  console.log();

  // Test 5: Verify profile consistency
  console.log('Test 5: Verify profile consistency between .env and docker-compose.yml');
  console.log('-'.repeat(50));
  
  try {
    const envContent = await fs.readFile('services/.env', 'utf8');
    const composeContent = await fs.readFile('docker-compose.yml', 'utf8');
    
    const envProfile = envContent.match(/COMPOSE_PROFILES=(.+)/);
    const profileName = envProfile ? envProfile[1].trim() : null;
    
    const hasMatchingProfile = composeContent.includes(`- ${profileName}`);
    
    if (profileName === 'kaspa-user-applications' && hasMatchingProfile) {
      console.log('✅ PASS: Profile consistency verified');
      console.log(`   - .env profile: ${profileName}`);
      console.log('   - docker-compose.yml has matching profile: ✓');
      passed++;
    } else {
      console.log('❌ FAIL: Profile inconsistency detected');
      console.log(`   - .env profile: ${profileName}`);
      console.log(`   - docker-compose.yml has matching profile: ${hasMatchingProfile ? '✓' : '✗'}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Could not verify profile consistency: ${error.message}`);
    failed++;
  }
  
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
    console.log();
    console.log('Kaspa Explorer CORS fix is complete. Next steps:');
    console.log('1. Run: docker-compose --profile kaspa-user-applications up -d');
    console.log('2. Wait for services to start');
    console.log('3. Access Kaspa Explorer at: http://localhost:3004');
    console.log('4. Verify no CORS errors in browser console');
    console.log();
    return true;
  } else {
    console.log('❌ Some tests failed');
    console.log('The Kaspa Explorer CORS fix is incomplete.');
    console.log();
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  testKaspaExplorerFix().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testKaspaExplorerFix };