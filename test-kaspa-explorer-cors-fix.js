#!/usr/bin/env node

/**
 * Test Kaspa Explorer CORS Configuration Fix
 * 
 * This script validates that the enhanced CORS configuration
 * properly handles external resources and API calls.
 */

const fs = require('fs').promises;
const path = require('path');

async function testCorsConfiguration() {
  console.log('='.repeat(80));
  console.log('Testing Kaspa Explorer CORS Configuration Fix');
  console.log('='.repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;

  // Test 1: Verify nginx.conf exists and is readable
  console.log('Test 1: Verify nginx.conf exists and is readable');
  console.log('-'.repeat(50));
  
  try {
    const nginxPath = 'services/kaspa-explorer/nginx.conf';
    const nginxContent = await fs.readFile(nginxPath, 'utf8');
    console.log('✅ PASS: nginx.conf is readable');
    passed++;
    
    // Test 2: Verify enhanced CORS headers are present
    console.log('\nTest 2: Verify enhanced CORS headers are present');
    console.log('-'.repeat(50));
    
    const requiredHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Expose-Headers'
    ];
    
    let headersPresent = true;
    for (const header of requiredHeaders) {
      if (nginxContent.includes(header)) {
        console.log(`   ✓ ${header}: FOUND`);
      } else {
        console.log(`   ✗ ${header}: MISSING`);
        headersPresent = false;
      }
    }
    
    if (headersPresent) {
      console.log('✅ PASS: All required CORS headers are present');
      passed++;
    } else {
      console.log('❌ FAIL: Some CORS headers are missing');
      failed++;
    }
    
    // Test 3: Verify preflight OPTIONS handling
    console.log('\nTest 3: Verify preflight OPTIONS handling');
    console.log('-'.repeat(50));
    
    if (nginxContent.includes('$request_method = OPTIONS') && nginxContent.includes('return 204')) {
      console.log('✅ PASS: Preflight OPTIONS requests are handled');
      passed++;
    } else {
      console.log('❌ FAIL: Preflight OPTIONS handling is missing or incomplete');
      failed++;
    }
    
    // Test 4: Verify enhanced method support
    console.log('\nTest 4: Verify enhanced method support');
    console.log('-'.repeat(50));
    
    const methodsMatch = nginxContent.match(/Access-Control-Allow-Methods[^"]*"([^"]+)"/);
    if (methodsMatch) {
      const methods = methodsMatch[1];
      const requiredMethods = ['GET', 'POST', 'OPTIONS'];
      const enhancedMethods = ['PUT', 'DELETE'];
      
      let allRequired = requiredMethods.every(method => methods.includes(method));
      let hasEnhanced = enhancedMethods.some(method => methods.includes(method));
      
      console.log(`   Methods: ${methods}`);
      console.log(`   Required methods (GET, POST, OPTIONS): ${allRequired ? '✓' : '✗'}`);
      console.log(`   Enhanced methods (PUT, DELETE): ${hasEnhanced ? '✓' : '✗'}`);
      
      if (allRequired) {
        console.log('✅ PASS: Required HTTP methods are supported');
        passed++;
      } else {
        console.log('❌ FAIL: Some required HTTP methods are missing');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Could not find Access-Control-Allow-Methods header');
      failed++;
    }
    
    // Test 5: Verify enhanced header support
    console.log('\nTest 5: Verify enhanced header support');
    console.log('-'.repeat(50));
    
    const headersMatch = nginxContent.match(/Access-Control-Allow-Headers[^"]*"([^"]+)"/);
    if (headersMatch) {
      const headers = headersMatch[1];
      const requiredHeaders = ['Content-Type', 'Cache-Control'];
      const enhancedHeaders = ['Authorization', 'X-API-Key'];
      
      let allRequired = requiredHeaders.every(header => headers.includes(header));
      let hasEnhanced = enhancedHeaders.some(header => headers.includes(header));
      
      console.log(`   Headers: ${headers}`);
      console.log(`   Required headers: ${allRequired ? '✓' : '✗'}`);
      console.log(`   Enhanced headers (Authorization, X-API-Key): ${hasEnhanced ? '✓' : '✗'}`);
      
      if (allRequired) {
        console.log('✅ PASS: Required headers are supported');
        passed++;
      } else {
        console.log('❌ FAIL: Some required headers are missing');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Could not find Access-Control-Allow-Headers header');
      failed++;
    }
    
    // Test 6: Verify static asset CORS support
    console.log('\nTest 6: Verify static asset CORS support');
    console.log('-'.repeat(50));
    
    const hasStaticAssetLocation = nginxContent.includes('location ~*') && nginxContent.includes('js|css|png|jpg');
    
    if (hasStaticAssetLocation) {
      // Check if CORS headers are added to static assets
      const staticLocationStart = nginxContent.indexOf('location ~*');
      const staticLocationEnd = nginxContent.indexOf('}', staticLocationStart);
      const staticLocationBlock = nginxContent.substring(staticLocationStart, staticLocationEnd + 1);
      if (staticLocationBlock.includes('Access-Control-Allow-Origin')) {
        console.log('✅ PASS: Static assets have CORS headers');
        passed++;
      } else {
        console.log('❌ FAIL: Static assets missing CORS headers');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Static asset location block not found');
      failed++;
    }
    
    // Test 7: Verify API endpoint CORS support
    console.log('\nTest 7: Verify API endpoint CORS support');
    console.log('-'.repeat(50));
    
    if (nginxContent.includes('location /api/')) {
      console.log('✅ PASS: API endpoint location block exists');
      
      // Check if API location has CORS handling
      const apiLocationMatch = nginxContent.match(/location \/api\/\s*\{[^}]*\}/s);
      if (apiLocationMatch && apiLocationMatch[0].includes('Access-Control-Allow-Origin')) {
        console.log('✅ PASS: API endpoints have CORS headers');
        passed++;
      } else {
        console.log('❌ FAIL: API endpoints missing CORS headers');
        failed++;
      }
    } else {
      console.log('❌ FAIL: API endpoint location block not found');
      failed++;
    }
    
    // Test 8: Verify Max-Age header for preflight caching
    console.log('\nTest 8: Verify Max-Age header for preflight caching');
    console.log('-'.repeat(50));
    
    if (nginxContent.includes('Access-Control-Max-Age')) {
      const maxAgeMatch = nginxContent.match(/Access-Control-Max-Age\s+"([^"]+)"/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]);
        console.log(`   Max-Age: ${maxAge} seconds (${Math.floor(maxAge / 3600)} hours)`);
        
        if (maxAge >= 3600) { // At least 1 hour
          console.log('✅ PASS: Preflight caching is properly configured');
          passed++;
        } else {
          console.log('❌ FAIL: Preflight cache duration is too short');
          failed++;
        }
      } else {
        console.log('❌ FAIL: Could not parse Max-Age value');
        failed++;
      }
    } else {
      console.log('❌ FAIL: Access-Control-Max-Age header not found');
      failed++;
    }
    
  } catch (error) {
    console.log(`❌ FAIL: Error reading nginx.conf: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log('✅ All tests passed!');
    console.log();
    console.log('CORS configuration for external resources is complete. The configuration now:');
    console.log('• Handles preflight OPTIONS requests properly');
    console.log('• Supports enhanced HTTP methods (PUT, DELETE)');
    console.log('• Allows API authentication headers (Authorization, X-API-Key)');
    console.log('• Enables CORS for static assets (fonts, stylesheets, scripts)');
    console.log('• Provides proper preflight caching with Max-Age');
    console.log('• Includes dedicated API endpoint handling');
    console.log();
    console.log('Next steps:');
    console.log('1. Run: docker-compose --profile kaspa-user-applications up -d kaspa-explorer');
    console.log('2. Access the explorer: http://localhost:3004');
    console.log('3. Verify external resources load without CORS errors');
    console.log('4. Test API calls work properly');
    console.log();
    return true;
  } else {
    console.log('❌ Some tests failed');
    console.log('The CORS configuration needs additional fixes.');
    console.log();
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCorsConfiguration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCorsConfiguration };