#!/usr/bin/env node

/**
 * Test script for Resource Checker
 * Tests resource detection and recommendation engine
 */

const ResourceChecker = require('./src/utils/resource-checker');

async function testResourceChecker() {
  console.log('='.repeat(70));
  console.log('Resource Checker Test');
  console.log('='.repeat(70));
  console.log();

  const checker = new ResourceChecker();

  // Test 1: Detect Resources
  console.log('Test 1: Detecting System Resources');
  console.log('-'.repeat(70));
  try {
    const resources = await checker.detectResources();
    console.log('✓ Resource detection successful');
    console.log();
    console.log('System Resources:');
    console.log(`  Platform: ${resources.platform}`);
    console.log(`  RAM: ${resources.memory.totalGB} GB total, ${resources.memory.availableGB} GB available`);
    console.log(`  CPU: ${resources.cpu.count} cores (${resources.cpu.model})`);
    console.log(`  Disk: ${resources.disk.freeGB} GB free (${resources.disk.type})`);
    if (resources.docker.hasLimit) {
      console.log(`  Docker Limit: ${resources.docker.memoryLimitGB} GB`);
    }
    console.log();

    // Test 2: Get Requirements
    console.log('Test 2: Component Requirements');
    console.log('-'.repeat(70));
    const components = checker.getComponentRequirements();
    console.log(`✓ Loaded ${Object.keys(components).length} component definitions`);
    console.log();
    console.log('Sample Components:');
    console.log(`  Dashboard: ${components.dashboard.minRAM}GB RAM, ${components.dashboard.minDisk}GB disk`);
    console.log(`  Kaspa Node (sync): ${components['kaspa-node-sync'].minRAM}GB RAM, ${components['kaspa-node-sync'].minDisk}GB disk`);
    console.log(`  TimescaleDB: ${components.timescaledb.minRAM}GB RAM, ${components.timescaledb.minDisk}GB disk`);
    console.log();

    // Test 3: Profile Requirements
    console.log('Test 3: Profile Requirements');
    console.log('-'.repeat(70));
    const profiles = checker.getProfileRequirements();
    console.log(`✓ Loaded ${Object.keys(profiles).length} profile definitions`);
    console.log();
    console.log('Profiles:');
    for (const [key, profile] of Object.entries(profiles)) {
      console.log(`  ${profile.name}: ${profile.minRAM}GB RAM, ${profile.minDisk}GB disk`);
      console.log(`    ${profile.description}`);
    }
    console.log();

    // Test 4: Check Component Compatibility
    console.log('Test 4: Component Compatibility Check');
    console.log('-'.repeat(70));
    const dashboardCompat = checker.checkComponentCompatibility(resources, 'dashboard');
    const nodeCompat = checker.checkComponentCompatibility(resources, 'kaspa-node-sync');
    console.log(`Dashboard: ${dashboardCompat.rating} - ${dashboardCompat.recommendation}`);
    console.log(`Kaspa Node: ${nodeCompat.rating} - ${nodeCompat.recommendation}`);
    console.log();

    // Test 5: Check Profile Compatibility
    console.log('Test 5: Profile Compatibility Check');
    console.log('-'.repeat(70));
    for (const profileKey of ['core', 'core-remote', 'core-local', 'explorer', 'production']) {
      const compat = checker.checkProfileCompatibility(resources, profileKey);
      const icon = compat.rating === 'recommended' ? '✓' : 
                   compat.rating === 'possible' ? '⚠' : '✗';
      console.log(`${icon} ${compat.profile}: ${compat.rating}`);
      console.log(`  ${compat.recommendation}`);
    }
    console.log();

    // Test 6: Generate Recommendations
    console.log('Test 6: Generate Recommendations');
    console.log('-'.repeat(70));
    const recommendations = checker.generateRecommendations(resources);
    console.log('Primary Recommendation:');
    console.log(`  Profile: ${recommendations.primary.profile}`);
    console.log(`  Reason: ${recommendations.primary.reason}`);
    console.log(`  Use Remote Node: ${recommendations.primary.useRemoteNode}`);
    console.log();
    
    if (recommendations.alternatives.length > 0) {
      console.log('Alternative Profiles:');
      recommendations.alternatives.forEach(alt => {
        console.log(`  - ${alt.profile}: ${alt.reason}`);
      });
      console.log();
    }
    
    if (recommendations.warnings.length > 0) {
      console.log('⚠ Warnings:');
      recommendations.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
      console.log();
    }
    
    if (recommendations.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      recommendations.suggestions.forEach(suggestion => {
        console.log(`  - ${suggestion}`);
      });
      console.log();
    }

    // Test 7: Generate Auto-Configuration
    console.log('Test 7: Auto-Configuration');
    console.log('-'.repeat(70));
    const config = await checker.generateAutoConfiguration(resources);
    console.log('Generated Configuration:');
    console.log(`  Profile: ${config.profile}`);
    console.log(`  Use Remote Node: ${config.useRemoteNode}`);
    console.log('  Environment Variables:');
    for (const [key, value] of Object.entries(config.envVars)) {
      console.log(`    ${key}=${value}`);
    }
    console.log();

    console.log('='.repeat(70));
    console.log('✓ All tests completed successfully');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testResourceChecker().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
