#!/usr/bin/env node

/**
 * Test Developer Mode Configuration
 * Tests the developer mode toggle functionality
 */

const ConfigGenerator = require('./src/utils/config-generator');
const fs = require('fs').promises;
const path = require('path');

const configGenerator = new ConfigGenerator();

async function testDeveloperMode() {
  console.log('🧪 Testing Developer Mode Configuration\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Generate default config without developer mode
  console.log('Test 1: Default config without developer mode');
  try {
    const config = configGenerator.generateDefaultConfig(['core', 'explorer']);
    if (config.DEVELOPER_MODE === false && config.LOG_LEVEL === 'info') {
      console.log('✅ PASS: Default config has developer mode disabled\n');
      passed++;
    } else {
      console.log('❌ FAIL: Default config should have developer mode disabled\n');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 2: Apply developer mode to config
  console.log('Test 2: Apply developer mode to config');
  try {
    const baseConfig = {
      PUBLIC_NODE: false,
      LOG_LEVEL: 'info',
      POSTGRES_PASSWORD: 'test123'
    };
    
    const devConfig = configGenerator.applyDeveloperMode(baseConfig, true);
    
    if (devConfig.LOG_LEVEL === 'debug' &&
        devConfig.ENABLE_PORTAINER === 'true' &&
        devConfig.ENABLE_PGADMIN === 'true' &&
        devConfig.PORTAINER_PORT === 9000 &&
        devConfig.PGADMIN_PORT === 5050) {
      console.log('✅ PASS: Developer mode applied correctly');
      console.log(`   - LOG_LEVEL: ${devConfig.LOG_LEVEL}`);
      console.log(`   - ENABLE_PORTAINER: ${devConfig.ENABLE_PORTAINER}`);
      console.log(`   - ENABLE_PGADMIN: ${devConfig.ENABLE_PGADMIN}`);
      console.log(`   - PORTAINER_PORT: ${devConfig.PORTAINER_PORT}`);
      console.log(`   - PGADMIN_PORT: ${devConfig.PGADMIN_PORT}\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Developer mode not applied correctly\n');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 3: Generate .env file with developer mode
  console.log('Test 3: Generate .env file with developer mode');
  try {
    const config = {
      PUBLIC_NODE: false,
      KASPA_P2P_PORT: 16110,
      KASPA_RPC_PORT: 16111,
      DASHBOARD_PORT: 3001,
      POSTGRES_PASSWORD: 'test123',
      LOG_LEVEL: 'debug',
      DEVELOPER_MODE: true,
      ENABLE_PORTAINER: 'true',
      PORTAINER_PORT: 9000,
      ENABLE_PGADMIN: 'true',
      PGADMIN_PORT: 5050,
      PGADMIN_EMAIL: 'admin@kaspa.local',
      PGADMIN_PASSWORD: 'pgadmin123',
      ENABLE_LOG_ACCESS: 'true'
    };
    
    const envContent = await configGenerator.generateEnvFile(config, ['core', 'explorer']);
    
    if (envContent.includes('DEVELOPER_MODE=true') &&
        envContent.includes('LOG_LEVEL=debug') &&
        envContent.includes('ENABLE_PORTAINER=true') &&
        envContent.includes('ENABLE_PGADMIN=true')) {
      console.log('✅ PASS: .env file includes developer mode settings\n');
      passed++;
    } else {
      console.log('❌ FAIL: .env file missing developer mode settings\n');
      console.log('Generated content:\n', envContent);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 4: Generate docker-compose.override.yml
  console.log('Test 4: Generate docker-compose.override.yml');
  try {
    const config = {
      DEVELOPER_MODE: true,
      PORTAINER_PORT: 9000,
      PGADMIN_PORT: 5050,
      PGADMIN_EMAIL: 'admin@kaspa.local',
      PGADMIN_PASSWORD: 'pgadmin123'
    };
    
    const overrideContent = await configGenerator.generateDockerComposeOverride(config, ['core', 'explorer']);
    
    if (overrideContent &&
        overrideContent.includes('portainer:') &&
        overrideContent.includes('pgadmin:') &&
        overrideContent.includes('portainer/portainer-ce:latest') &&
        overrideContent.includes('dpage/pgadmin4:latest') &&
        overrideContent.includes('LOG_LEVEL: debug')) {
      console.log('✅ PASS: docker-compose.override.yml generated correctly');
      console.log('   - Includes Portainer service');
      console.log('   - Includes pgAdmin service');
      console.log('   - Includes debug logging overrides\n');
      passed++;
    } else {
      console.log('❌ FAIL: docker-compose.override.yml not generated correctly\n');
      console.log('Generated content:\n', overrideContent);
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 5: Verify override file is null when developer mode is disabled
  console.log('Test 5: No override file when developer mode disabled');
  try {
    const config = {
      DEVELOPER_MODE: false,
      LOG_LEVEL: 'info'
    };
    
    const overrideContent = await configGenerator.generateDockerComposeOverride(config, ['core']);
    
    if (overrideContent === null) {
      console.log('✅ PASS: No override file generated when developer mode disabled\n');
      passed++;
    } else {
      console.log('❌ FAIL: Override file should be null when developer mode disabled\n');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 6: Verify pgAdmin is only added when database profiles are selected
  console.log('Test 6: pgAdmin only added with database profiles');
  try {
    const config = {
      DEVELOPER_MODE: true,
      PORTAINER_PORT: 9000
    };
    
    const overrideWithoutDB = await configGenerator.generateDockerComposeOverride(config, ['core']);
    const overrideWithDB = await configGenerator.generateDockerComposeOverride(config, ['core', 'explorer']);
    
    if (!overrideWithoutDB.includes('pgadmin:') && overrideWithDB.includes('pgadmin:')) {
      console.log('✅ PASS: pgAdmin only added when database profiles selected');
      console.log('   - Not included with core only');
      console.log('   - Included with explorer profile\n');
      passed++;
    } else {
      console.log('❌ FAIL: pgAdmin inclusion logic incorrect\n');
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════\n');
  
  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
testDeveloperMode().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
