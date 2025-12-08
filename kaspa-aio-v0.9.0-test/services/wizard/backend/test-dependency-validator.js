#!/usr/bin/env node

/**
 * Test script for DependencyValidator
 * 
 * Tests:
 * - Circular dependency detection
 * - Prerequisite validation
 * - Startup order calculation
 * - Dependency graph building
 * - Conflict detection
 */

const ProfileManager = require('./src/utils/profile-manager');
const DependencyValidator = require('./src/utils/dependency-validator');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, passed) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
}

// Initialize
const profileManager = new ProfileManager();
const validator = new DependencyValidator(profileManager);

let totalTests = 0;
let passedTests = 0;

function runTest(name, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      passedTests++;
      logTest(name, true);
    } else {
      logTest(name, false);
    }
    return result;
  } catch (error) {
    logTest(name, false);
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 1: Valid profile selection
logSection('Test 1: Valid Profile Selection');
runTest('Core profile alone should be valid', () => {
  const result = validator.validateSelection(['core']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return result.valid && result.errors.length === 0;
});

runTest('Core + Kaspa User Applications should be valid', () => {
  const result = validator.validateSelection(['core', 'kaspa-user-applications']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return result.valid && result.errors.length === 0;
});

runTest('Core + Indexer Services should be valid', () => {
  const result = validator.validateSelection(['core', 'indexer-services']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return result.valid && result.errors.length === 0;
});

// Test 2: Prerequisite validation
logSection('Test 2: Prerequisite Validation');
runTest('Mining without Core or Archive should fail', () => {
  const result = validator.validateSelection(['mining']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return !result.valid && result.errors.some(e => e.type === 'missing_prerequisite');
});

runTest('Mining with Core should be valid', () => {
  const result = validator.validateSelection(['core', 'mining']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return result.valid && result.errors.length === 0;
});

runTest('Mining with Archive Node should be valid', () => {
  const result = validator.validateSelection(['archive-node', 'mining']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return result.valid && result.errors.length === 0;
});

// Test 3: Conflict detection
logSection('Test 3: Conflict Detection');
runTest('Core and Archive Node should conflict', () => {
  const result = validator.validateSelection(['core', 'archive-node']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  return !result.valid && result.errors.some(e => e.type === 'profile_conflict');
});

// Test 4: Circular dependency detection
logSection('Test 4: Circular Dependency Detection');
runTest('No circular dependencies in valid profiles', () => {
  const result = validator.validateSelection(['core', 'kaspa-user-applications', 'indexer-services']);
  const cycles = validator.detectCircularDependencies(['core', 'kaspa-user-applications', 'indexer-services']);
  console.log('  Cycles:', JSON.stringify(cycles, null, 2));
  return cycles.length === 0;
});

// Test 5: Startup order calculation
logSection('Test 5: Startup Order Calculation');
runTest('Startup order should be correct', () => {
  const result = validator.validateSelection(['core', 'indexer-services', 'kaspa-user-applications']);
  const startupOrder = result.metadata.startupOrder;
  console.log('  Startup Order:', JSON.stringify(startupOrder, null, 2));
  
  // Verify phases
  const hasPhase1 = startupOrder.grouped[1] && startupOrder.grouped[1].length > 0;
  const hasPhase2 = startupOrder.grouped[2] && startupOrder.grouped[2].length > 0;
  const hasPhase3 = startupOrder.grouped[3] && startupOrder.grouped[3].length > 0;
  
  return hasPhase1 && hasPhase2 && hasPhase3;
});

runTest('Services should be sorted by startup order', () => {
  const result = validator.validateSelection(['core', 'indexer-services', 'kaspa-user-applications']);
  const services = result.metadata.startupOrder.services;
  
  // Check that services are sorted by startupOrder
  for (let i = 1; i < services.length; i++) {
    if (services[i].startupOrder < services[i - 1].startupOrder) {
      return false;
    }
  }
  
  return true;
});

// Test 6: Dependency graph building
logSection('Test 6: Dependency Graph Building');
runTest('Dependency graph should have nodes and edges', () => {
  const result = validator.validateSelection(['core', 'mining']);
  const graph = result.metadata.dependencyGraph;
  console.log('  Graph:', JSON.stringify(graph, null, 2));
  
  return graph.nodes.length > 0 && graph.edges.length >= 0;
});

runTest('Graph should mark selected profiles', () => {
  const result = validator.validateSelection(['core', 'mining']);
  const graph = result.metadata.dependencyGraph;
  
  const coreNode = graph.nodes.find(n => n.id === 'core');
  const miningNode = graph.nodes.find(n => n.id === 'mining');
  
  return coreNode && coreNode.selected && miningNode && miningNode.selected;
});

// Test 7: Resource warnings
logSection('Test 7: Resource Warnings');
runTest('High resource profiles should generate warnings', () => {
  const result = validator.validateSelection(['core', 'archive-node', 'indexer-services', 'kaspa-user-applications']);
  console.log('  Warnings:', JSON.stringify(result.warnings, null, 2));
  
  // Archive node alone requires 16GB, so combined should trigger warnings
  return result.warnings.length > 0;
});

// Test 8: Validation report
logSection('Test 8: Validation Report');
runTest('Validation report should include summary', () => {
  const report = validator.getValidationReport(['core', 'kaspa-user-applications']);
  console.log('  Report:', JSON.stringify(report, null, 2));
  
  return report.summary && 
         report.summary.totalProfiles > 0 &&
         report.requirements &&
         report.recommendations;
});

runTest('Report should include recommendations for errors', () => {
  const report = validator.getValidationReport(['mining']); // Missing prerequisite
  console.log('  Report:', JSON.stringify(report, null, 2));
  
  return report.recommendations && report.recommendations.length > 0;
});

// Test 9: Edge cases
logSection('Test 9: Edge Cases');
runTest('Empty profile list should be invalid', () => {
  const result = validator.validateSelection([]);
  console.log('  Result:', JSON.stringify(result, null, 2));
  
  // Empty selection should have errors (no node profile)
  return !result.valid;
});

runTest('Invalid profile ID should generate error', () => {
  const result = validator.validateSelection(['invalid-profile']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  
  return !result.valid && result.errors.some(e => e.type === 'invalid_profile');
});

runTest('Duplicate profiles should be handled', () => {
  const result = validator.validateSelection(['core', 'core', 'core']);
  console.log('  Result:', JSON.stringify(result, null, 2));
  
  // Should still be valid, just deduplicated
  return result.valid;
});

// Test 10: Complex scenarios
logSection('Test 10: Complex Scenarios');
runTest('Full stack deployment should be valid', () => {
  const result = validator.validateSelection([
    'core',
    'kaspa-user-applications',
    'indexer-services'
  ]);
  console.log('  Result:', JSON.stringify(result, null, 2));
  
  return result.valid && result.errors.length === 0;
});

runTest('Mining + Archive + Indexers should be valid', () => {
  const result = validator.validateSelection([
    'archive-node',
    'mining',
    'indexer-services'
  ]);
  console.log('  Result:', JSON.stringify(result, null, 2));
  
  return result.valid && result.errors.length === 0;
});

// Summary
logSection('Test Summary');
log(`Total Tests: ${totalTests}`, 'blue');
log(`Passed: ${passedTests}`, 'green');
log(`Failed: ${totalTests - passedTests}`, 'red');
log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');

if (passedTests === totalTests) {
  log('\n✓ All tests passed!', 'green');
  process.exit(0);
} else {
  log('\n✗ Some tests failed', 'red');
  process.exit(1);
}
