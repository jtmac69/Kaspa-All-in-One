#!/usr/bin/env node

/**
 * Test script for ProfileStateManager
 * Tests profile state detection, caching, and API endpoints
 */

const path = require('path');
const fs = require('fs').promises;

// Set up environment
process.env.PROJECT_ROOT = path.resolve(__dirname, '../../..');

const ProfileStateManager = require('./src/utils/profile-state-manager');

async function testProfileStateManager() {
  console.log('🧪 Testing ProfileStateManager...\n');
  
  const manager = ProfileStateManager.getInstance();
  
  // Test 1: Basic profile state detection
  console.log('📋 Test 1: Basic profile state detection');
  try {
    const result = await manager.getProfileStates();
    console.log('✅ Profile states retrieved successfully');
    console.log(`   Found ${result.profiles.length} profiles`);
    console.log(`   Cache status: ${result.cached ? 'cached' : 'fresh'}`);
    
    // Show profile states
    result.profiles.forEach(profile => {
      console.log(`   - ${profile.name}: ${profile.installationState} (${profile.status})`);
      console.log(`     Running: ${profile.runningServices}/${profile.totalServices} services`);
      console.log(`     Detection sources: ${Object.entries(profile.detectionSources)
        .filter(([_, value]) => value)
        .map(([key, _]) => key)
        .join(', ') || 'none'}`);
    });
  } catch (error) {
    console.log('❌ Failed to get profile states:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Grouped profiles
  console.log('📊 Test 2: Grouped profiles by state');
  try {
    const result = await manager.getProfilesByState();
    console.log('✅ Grouped profiles retrieved successfully');
    console.log(`   Installed: ${result.summary.installed}`);
    console.log(`   Partial: ${result.summary.partial}`);
    console.log(`   Available: ${result.summary.available}`);
    console.log(`   Total: ${result.summary.total}`);
  } catch (error) {
    console.log('❌ Failed to get grouped profiles:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Individual profile state
  console.log('🔍 Test 3: Individual profile state');
  try {
    const result = await manager.getProfileState('core');
    if (result.success) {
      console.log('✅ Core profile state retrieved successfully');
      console.log(`   State: ${result.profile.installationState}`);
      console.log(`   Status: ${result.profile.status}`);
      console.log(`   Health: ${result.profile.healthStatus.healthyCount}/${result.profile.healthStatus.totalCount} healthy`);
    } else {
      console.log('❌ Failed to get core profile state:', result.error);
    }
  } catch (error) {
    console.log('❌ Failed to get core profile state:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Cache functionality
  console.log('💾 Test 4: Cache functionality');
  try {
    const cacheStatus = manager.getCacheStatus();
    console.log('✅ Cache status retrieved successfully');
    console.log(`   Cached: ${cacheStatus.cached}`);
    console.log(`   Last updated: ${cacheStatus.lastUpdated ? new Date(cacheStatus.lastUpdated).toISOString() : 'never'}`);
    console.log(`   Age: ${cacheStatus.age ? Math.round(cacheStatus.age / 1000) + 's' : 'n/a'}`);
    console.log(`   Refresh interval: ${cacheStatus.refreshInterval / 1000}s`);
    console.log(`   Is refreshing: ${cacheStatus.isRefreshing}`);
  } catch (error) {
    console.log('❌ Failed to get cache status:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 5: Force refresh
  console.log('🔄 Test 5: Force refresh');
  try {
    console.log('   Forcing refresh...');
    const result = await manager.forceRefresh();
    console.log('✅ Force refresh completed successfully');
    console.log(`   Profiles: ${result.profiles.length}`);
    console.log(`   Last updated: ${new Date(result.lastUpdated).toISOString()}`);
  } catch (error) {
    console.log('❌ Failed to force refresh:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 6: Configuration detection
  console.log('⚙️  Test 6: Configuration detection');
  try {
    const config = await manager.loadCurrentConfiguration();
    console.log('✅ Configuration loaded successfully');
    console.log(`   Keys found: ${Object.keys(config).length}`);
    
    if (Object.keys(config).length > 0) {
      console.log('   Sample keys:');
      Object.keys(config).slice(0, 5).forEach(key => {
        console.log(`     - ${key}=${config[key]}`);
      });
    }
  } catch (error) {
    console.log('❌ Failed to load configuration:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 7: Installation state detection
  console.log('📄 Test 7: Installation state detection');
  try {
    const installationState = await manager.loadInstallationState();
    if (installationState) {
      console.log('✅ Installation state loaded successfully');
      console.log(`   Version: ${installationState.version || 'unknown'}`);
      console.log(`   Installed at: ${installationState.installedAt || 'unknown'}`);
      console.log(`   Last modified: ${installationState.lastModified || 'unknown'}`);
      
      if (installationState.profiles) {
        if (Array.isArray(installationState.profiles)) {
          console.log(`   Profiles: ${installationState.profiles.join(', ')}`);
        } else if (installationState.profiles.selected) {
          console.log(`   Profiles: ${installationState.profiles.selected.join(', ')}`);
        }
      }
    } else {
      console.log('ℹ️  No installation state found (fresh system)');
    }
  } catch (error) {
    console.log('❌ Failed to load installation state:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 8: Docker Compose service detection
  console.log('🐳 Test 8: Docker Compose service detection');
  try {
    const services = await manager.getDockerComposeServices();
    console.log('✅ Docker Compose services detected successfully');
    console.log(`   Services found: ${services.length}`);
    
    if (services.length > 0) {
      console.log('   Services:');
      services.forEach(service => {
        console.log(`     - ${service}`);
      });
    }
  } catch (error) {
    console.log('❌ Failed to detect Docker Compose services:', error.message);
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('🎉 ProfileStateManager testing completed!');
  
  // Don't exit immediately to allow periodic refresh to run once
  console.log('\n⏱️  Waiting 5 seconds to test periodic refresh...');
  setTimeout(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  }, 5000);
}

// Test API endpoints if running as HTTP server
async function testAPIEndpoints() {
  console.log('🌐 Testing API endpoints...\n');
  
  const express = require('express');
  const reconfigureRouter = require('./src/api/reconfigure');
  
  const app = express();
  app.use(express.json());
  app.use('/api/wizard', reconfigureRouter);
  
  const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`Test server running on port ${port}`);
    
    // Test endpoints
    testEndpoint(port, '/api/wizard/profiles/state', 'Profile states');
    testEndpoint(port, '/api/wizard/profiles/grouped', 'Grouped profiles');
    testEndpoint(port, '/api/wizard/profiles/cache-status', 'Cache status');
    
    setTimeout(() => {
      server.close();
      console.log('✅ API endpoint testing completed');
    }, 3000);
  });
}

async function testEndpoint(port, endpoint, description) {
  try {
    const response = await fetch(`http://localhost:${port}${endpoint}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${description}: OK`);
    } else {
      console.log(`❌ ${description}: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

// Run tests
if (require.main === module) {
  testProfileStateManager().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testProfileStateManager, testAPIEndpoints };