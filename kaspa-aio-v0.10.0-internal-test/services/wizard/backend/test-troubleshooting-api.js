/**
 * Test Enhanced Troubleshooting API
 * 
 * Simple test to verify the troubleshooting API endpoints
 */

const express = require('express');
const troubleshootingRouter = require('./src/api/troubleshooting');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/troubleshooting', troubleshootingRouter);

async function testTroubleshootingAPI() {
  console.log('Testing Enhanced Troubleshooting API...\n');
  
  // Start test server
  const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`Test server running on port ${port}`);
    
    // Test endpoints
    testEndpoints(port).then(() => {
      server.close();
      console.log('\nAPI testing complete!');
    }).catch(error => {
      console.error('Test error:', error);
      server.close();
    });
  });
}

async function testEndpoints(port) {
  const baseUrl = `http://localhost:${port}`;
  
  // Test 1: Get troubleshooting guide
  console.log('Test 1: Get troubleshooting guide');
  try {
    const response = await fetch(`${baseUrl}/api/troubleshooting/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'pull',
        error: 'network timeout while pulling image',
        service: 'kaspa-node',
        profiles: ['core']
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Troubleshooting guide API works');
      console.log(`   Guide title: ${data.guide.title}`);
      console.log(`   Steps: ${data.guide.steps.length}`);
      console.log(`   Quick fixes: ${data.guide.quickFixes.length}`);
    } else {
      console.log('❌ Troubleshooting guide API failed:', data);
    }
  } catch (error) {
    console.log('❌ Troubleshooting guide API error:', error.message);
  }
  
  console.log();
  
  // Test 2: System check
  console.log('Test 2: System check');
  try {
    const response = await fetch(`${baseUrl}/api/troubleshooting/system-check`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ System check API works');
      console.log(`   Overall status: ${data.overallStatus}`);
      console.log(`   Checks: ${Object.keys(data.checks).join(', ')}`);
    } else {
      console.log('❌ System check API failed:', data);
    }
  } catch (error) {
    console.log('❌ System check API error:', error.message);
  }
  
  console.log();
  
  // Test 3: Error patterns
  console.log('Test 3: Error patterns');
  try {
    const response = await fetch(`${baseUrl}/api/troubleshooting/error-patterns`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Error patterns API works');
      console.log(`   Patterns: ${data.totalPatterns}`);
      console.log(`   Categories: ${[...new Set(data.patterns.map(p => p.category))].join(', ')}`);
    } else {
      console.log('❌ Error patterns API failed:', data);
    }
  } catch (error) {
    console.log('❌ Error patterns API error:', error.message);
  }
  
  console.log();
  
  // Test 4: Diagnostic export
  console.log('Test 4: Diagnostic export');
  try {
    const response = await fetch(`${baseUrl}/api/troubleshooting/diagnostic-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'test',
        error: 'test error',
        profiles: ['core']
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Diagnostic export API works');
      console.log(`   Export ID: ${data.exportId}`);
      console.log(`   Size: ${data.size} bytes`);
    } else {
      console.log('❌ Diagnostic export API failed:', data);
    }
  } catch (error) {
    console.log('❌ Diagnostic export API error:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testTroubleshootingAPI().catch(console.error);
}

module.exports = { testTroubleshootingAPI };