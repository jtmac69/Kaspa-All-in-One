#!/usr/bin/env node

/**
 * Test script for resource calculation with deduplication
 * Tests the new calculateCombinedResources functionality
 */

const ResourceChecker = require('./src/utils/resource-checker');

const resourceChecker = new ResourceChecker();

// Mock system resources for testing
const mockSystemResources = {
  platform: 'linux',
  timestamp: new Date().toISOString(),
  memory: {
    total: 17179869184,
    free: 8589934592,
    totalGB: '16.00',
    freeGB: '8.00',
    available: 10737418240,
    availableGB: '10.00'
  },
  cpu: {
    count: 8,
    model: 'Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz',
    speed: 3600
  },
  disk: {
    total: 1099511627776,
    free: 549755813888,
    totalGB: '1024.00',
    freeGB: '512.00',
    type: 'SSD'
  },
  docker: {
    memoryLimit: 17179869184,
    memoryLimitGB: '16.00',
    hasLimit: true
  }
};

async function runTests() {
  console.log('='.repeat(80));
  console.log('Resource Calculation with Deduplication - Test Suite');
  console.log('='.repeat(80));
  console.log();

  // Test 1: Single profile (Core)
  console.log('Test 1: Single Profile (Core)');
  console.log('-'.repeat(80));
  const test1 = await resourceChecker.calculateCombinedResources(['core'], mockSystemResources);
  console.log('Profiles:', test1.profiles);
  console.log('Requirements:', test1.requirements);
  console.log('Services:', test1.services.length);
  console.log('Shared Resources:', test1.sharedResources.length);
  console.log('Sufficient:', test1.sufficient);
  console.log('Warnings:', test1.warnings.length);
  console.log();

  // Test 2: Multiple profiles with shared resources (Core + Explorer)
  console.log('Test 2: Multiple Profiles with Shared Resources (Core + Explorer)');
  console.log('-'.repeat(80));
  const test2 = await resourceChecker.calculateCombinedResources(['core', 'explorer'], mockSystemResources);
  console.log('Profiles:', test2.profiles);
  console.log('Requirements:', test2.requirements);
  console.log('Services:', test2.services.length);
  console.log('Shared Resources:', test2.sharedResources.length);
  if (test2.sharedResources.length > 0) {
    console.log('Shared Services:');
    test2.sharedResources.forEach(s => {
      console.log(`  - ${s.name}: shared by ${s.usedBy.join(', ')}`);
    });
  }
  console.log('Sufficient:', test2.sufficient);
  console.log('Warnings:', test2.warnings.length);
  if (test2.warnings.length > 0) {
    console.log('Warnings:');
    test2.warnings.forEach(w => {
      console.log(`  - [${w.severity}] ${w.message}`);
    });
  }
  console.log();

  // Test 3: Profile breakdown
  console.log('Test 3: Profile Breakdown (Core + Production)');
  console.log('-'.repeat(80));
  const test3 = await resourceChecker.calculateCombinedResources(['core', 'production'], mockSystemResources);
  console.log('Profiles:', test3.profiles);
  console.log('Total Requirements:');
  console.log(`  RAM: ${test3.requirements.minRAM}GB min, ${test3.requirements.recommendedRAM}GB recommended`);
  console.log(`  Disk: ${test3.requirements.minDisk}GB`);
  console.log(`  CPU: ${test3.requirements.minCPU} cores`);
  console.log();
  console.log('Profile Breakdown:');
  test3.profileBreakdown.forEach(pb => {
    console.log(`  ${pb.profileName}:`);
    console.log(`    RAM: ${pb.minRAM}GB min, ${pb.recommendedRAM}GB recommended`);
    console.log(`    Disk: ${pb.minDisk}GB`);
    console.log(`    Components: ${pb.components.length}`);
    pb.components.forEach(c => {
      const sharedTag = c.shared ? ' [SHARED]' : '';
      console.log(`      - ${c.name}${sharedTag}`);
    });
  });
  console.log();

  // Test 4: Resource comparison
  console.log('Test 4: Resource Comparison (All Profiles)');
  console.log('-'.repeat(80));
  const test4 = await resourceChecker.calculateCombinedResources(
    ['core', 'explorer', 'production', 'mining'],
    mockSystemResources
  );
  console.log('Profiles:', test4.profiles);
  console.log();
  console.log('Resource Comparison:');
  console.log('  RAM:');
  console.log(`    Required: ${test4.comparison.ram.required.toFixed(1)}GB`);
  console.log(`    Recommended: ${test4.comparison.ram.recommended.toFixed(1)}GB`);
  console.log(`    Available: ${test4.comparison.ram.available.toFixed(1)}GB`);
  console.log(`    Meets Min: ${test4.comparison.ram.meetsMin ? '✓' : '✗'}`);
  console.log(`    Meets Recommended: ${test4.comparison.ram.meetsRecommended ? '✓' : '✗'}`);
  console.log('  Disk:');
  console.log(`    Required: ${test4.comparison.disk.required.toFixed(1)}GB`);
  console.log(`    Available: ${test4.comparison.disk.available.toFixed(1)}GB`);
  console.log(`    Meets Min: ${test4.comparison.disk.meetsMin ? '✓' : '✗'}`);
  console.log('  CPU:');
  console.log(`    Required: ${test4.comparison.cpu.required} cores`);
  console.log(`    Available: ${test4.comparison.cpu.available} cores`);
  console.log(`    Meets Min: ${test4.comparison.cpu.meetsMin ? '✓' : '✗'}`);
  console.log();
  console.log('Overall Sufficient:', test4.sufficient);
  console.log();

  // Test 5: Optimization recommendations
  console.log('Test 5: Optimization Recommendations (Insufficient Resources)');
  console.log('-'.repeat(80));
  const lowResourceSystem = {
    ...mockSystemResources,
    memory: {
      ...mockSystemResources.memory,
      availableGB: '4.00'
    },
    disk: {
      ...mockSystemResources.disk,
      freeGB: '50.00'
    }
  };
  const test5 = await resourceChecker.calculateCombinedResources(
    ['core', 'explorer'],
    lowResourceSystem
  );
  console.log('System Resources: 4GB RAM, 50GB Disk');
  console.log('Selected Profiles:', test5.profiles);
  console.log('Sufficient:', test5.sufficient);
  console.log();
  console.log('Warnings:', test5.warnings.length);
  test5.warnings.forEach(w => {
    console.log(`  [${w.severity.toUpperCase()}] ${w.message}`);
    if (w.recommendation) {
      console.log(`    → ${w.recommendation}`);
    }
  });
  console.log();
  console.log('Optimizations:', test5.optimizations.length);
  test5.optimizations.forEach(opt => {
    console.log(`  [${opt.priority.toUpperCase()}] ${opt.title}`);
    console.log(`    ${opt.description}`);
    if (opt.savings) {
      console.log(`    Savings: RAM ${opt.savings.ram}, Disk ${opt.savings.disk}`);
    }
    console.log(`    Action: ${opt.action}`);
  });
  console.log();

  // Test 6: Empty profile list
  console.log('Test 6: Error Handling (Empty Profile List)');
  console.log('-'.repeat(80));
  const test6 = await resourceChecker.calculateCombinedResources([], mockSystemResources);
  console.log('Success:', test6.success);
  console.log('Error:', test6.error);
  console.log();

  // Test 7: Deduplication verification
  console.log('Test 7: Deduplication Verification');
  console.log('-'.repeat(80));
  const test7a = await resourceChecker.calculateCombinedResources(['core'], mockSystemResources);
  const test7b = await resourceChecker.calculateCombinedResources(['core', 'explorer'], mockSystemResources);
  
  console.log('Core only:');
  console.log(`  Total RAM: ${test7a.requirements.minRAM}GB`);
  console.log(`  Services: ${test7a.services.length}`);
  console.log();
  console.log('Core + Explorer:');
  console.log(`  Total RAM: ${test7b.requirements.minRAM}GB`);
  console.log(`  Services: ${test7b.services.length}`);
  console.log(`  Shared Resources: ${test7b.sharedResources.length}`);
  console.log();
  
  // Calculate what the RAM would be without deduplication
  const explorerProfile = resourceChecker.getProfileRequirements()['explorer'];
  const naiveTotal = test7a.requirements.minRAM + explorerProfile.minRAM;
  const actualTotal = test7b.requirements.minRAM;
  const savings = naiveTotal - actualTotal;
  
  console.log('Deduplication Analysis:');
  console.log(`  Naive total (without deduplication): ${naiveTotal}GB`);
  console.log(`  Actual total (with deduplication): ${actualTotal}GB`);
  console.log(`  Savings from deduplication: ${savings}GB`);
  console.log();

  console.log('='.repeat(80));
  console.log('All tests completed!');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
