#!/usr/bin/env node

/**
 * DockerManager Phase 3 Test Runner
 * 
 * Tests the updated DockerManager with new 8-profile architecture
 */

const DockerManager = require('./src/utils/docker-manager');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, message = '') {
  stats.total++;
  if (passed) {
    stats.passed++;
    log(`  ✓ ${name}`, 'green');
    if (message) log(`    ${message}`, 'cyan');
  } else {
    stats.failed++;
    log(`  ✗ ${name}`, 'red');
    if (message) log(`    ${message}`, 'red');
  }
}

function logSection(title) {
  log(`\n${title}`, 'bright');
  log('─'.repeat(70), 'blue');
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function testNewProfiles(dockerManager) {
  logSection('New Profile IDs');
  
  // Test 1: kaspa-node
  const test1 = dockerManager.getContainerNamesForProfiles(['kaspa-node']);
  logTest(
    'kaspa-node → kaspa-node container',
    arraysEqual(test1, ['kaspa-node']),
    `Got: ${test1.join(', ')}`
  );
  
  // Test 2: kasia-app
  const test2 = dockerManager.getContainerNamesForProfiles(['kasia-app']);
  logTest(
    'kasia-app → kasia-app container',
    arraysEqual(test2, ['kasia-app']),
    `Got: ${test2.join(', ')}`
  );
  
  // Test 3: k-social-app (CRITICAL)
  const test3 = dockerManager.getContainerNamesForProfiles(['k-social-app']);
  logTest(
    'k-social-app → k-social container (NOT k-social-app)',
    arraysEqual(test3, ['k-social']) && !test3.includes('k-social-app'),
    `Got: ${test3.join(', ')}`
  );
  
  // Test 4: kaspa-explorer-bundle
  const test4 = dockerManager.getContainerNamesForProfiles(['kaspa-explorer-bundle']);
  logTest(
    'kaspa-explorer-bundle → 3 containers',
    test4.length === 3 &&
    test4.includes('kaspa-explorer') &&
    test4.includes('simply-kaspa-indexer') &&
    test4.includes('timescaledb-explorer'),
    `Got: ${test4.join(', ')}`
  );
  
  // Test 5: kasia-indexer
  const test5 = dockerManager.getContainerNamesForProfiles(['kasia-indexer']);
  logTest(
    'kasia-indexer → kasia-indexer container',
    arraysEqual(test5, ['kasia-indexer']),
    `Got: ${test5.join(', ')}`
  );
  
  // Test 6: k-indexer-bundle
  const test6 = dockerManager.getContainerNamesForProfiles(['k-indexer-bundle']);
  logTest(
    'k-indexer-bundle → 2 containers',
    test6.length === 2 &&
    test6.includes('k-indexer') &&
    test6.includes('timescaledb-kindexer'),
    `Got: ${test6.join(', ')}`
  );
  
  // Test 7: kaspa-archive-node
  const test7 = dockerManager.getContainerNamesForProfiles(['kaspa-archive-node']);
  logTest(
    'kaspa-archive-node → kaspa-archive-node container',
    arraysEqual(test7, ['kaspa-archive-node']),
    `Got: ${test7.join(', ')}`
  );
  
  // Test 8: kaspa-stratum
  const test8 = dockerManager.getContainerNamesForProfiles(['kaspa-stratum']);
  logTest(
    'kaspa-stratum → kaspa-stratum container',
    arraysEqual(test8, ['kaspa-stratum']),
    `Got: ${test8.join(', ')}`
  );
}

function testLegacyProfiles(dockerManager) {
  logSection('Legacy Profile IDs (Backward Compatibility)');
  
  // Test 1: core
  const test1 = dockerManager.getContainerNamesForProfiles(['core']);
  logTest(
    'core → kaspa-node container',
    arraysEqual(test1, ['kaspa-node']),
    `Got: ${test1.join(', ')}`
  );
  
  // Test 2: kaspa-user-applications
  const test2 = dockerManager.getContainerNamesForProfiles(['kaspa-user-applications']);
  logTest(
    'kaspa-user-applications → 3 containers',
    test2.length === 3 &&
    test2.includes('kasia-app') &&
    test2.includes('k-social') &&
    test2.includes('kaspa-explorer'),
    `Got: ${test2.join(', ')}`
  );
  
  // Test 3: indexer-services
  const test3 = dockerManager.getContainerNamesForProfiles(['indexer-services']);
  logTest(
    'indexer-services → 5 containers',
    test3.length === 5 &&
    test3.includes('kasia-indexer') &&
    test3.includes('k-indexer') &&
    test3.includes('simply-kaspa-indexer') &&
    test3.includes('timescaledb-kindexer') &&
    test3.includes('timescaledb-explorer'),
    `Got: ${test3.join(', ')}`
  );
  
  // Test 4: archive-node
  const test4 = dockerManager.getContainerNamesForProfiles(['archive-node']);
  logTest(
    'archive-node → kaspa-archive-node container',
    arraysEqual(test4, ['kaspa-archive-node']),
    `Got: ${test4.join(', ')}`
  );
  
  // Test 5: mining
  const test5 = dockerManager.getContainerNamesForProfiles(['mining']);
  logTest(
    'mining → kaspa-stratum container',
    arraysEqual(test5, ['kaspa-stratum']),
    `Got: ${test5.join(', ')}`
  );
}

function testMultipleProfiles(dockerManager) {
  logSection('Multiple Profiles');
  
  // Test 1: Multiple new profiles
  const test1 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kasia-app',
    'k-social-app'
  ]);
  logTest(
    'Multiple new profiles return unique containers',
    test1.length === 3 &&
    test1.includes('kaspa-node') &&
    test1.includes('kasia-app') &&
    test1.includes('k-social'),
    `Got ${test1.length} containers: ${test1.join(', ')}`
  );
  
  // Test 2: Duplicate profiles
  const test2 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'core'  // Both map to kaspa-node
  ]);
  logTest(
    'Duplicate profiles do not create duplicate containers',
    arraysEqual(test2, ['kaspa-node']),
    `Got: ${test2.join(', ')}`
  );
  
  // Test 3: Mixed new and legacy
  const test3 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kaspa-user-applications'
  ]);
  logTest(
    'Mixed new and legacy profiles work together',
    test3.length === 4 &&
    test3.includes('kaspa-node') &&
    test3.includes('kasia-app') &&
    test3.includes('k-social') &&
    test3.includes('kaspa-explorer'),
    `Got ${test3.length} containers`
  );
  
  // Test 4: Complex template (kaspa-sovereignty)
  const test4 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kasia-app',
    'kasia-indexer',
    'k-social-app',
    'k-indexer-bundle',
    'kaspa-explorer-bundle'
  ]);
  const uniqueCount = new Set(test4).size;
  logTest(
    'Complex template with overlapping profiles',
    test4.length === uniqueCount && test4.length >= 9,
    `Got ${test4.length} unique containers`
  );
}

function testErrorHandling(dockerManager) {
  logSection('Error Handling');
  
  // Test 1: Unknown profile
  const consoleSpy = [];
  const originalWarn = console.warn;
  console.warn = (...args) => consoleSpy.push(args.join(' '));
  
  const test1 = dockerManager.getContainerNamesForProfiles(['invalid-profile']);
  const warningLogged = consoleSpy.some(msg => msg.includes('Unknown profile ID'));
  
  console.warn = originalWarn;
  
  logTest(
    'Unknown profile logs warning',
    warningLogged && test1.length === 0,
    warningLogged ? 'Warning logged correctly' : 'No warning logged'
  );
  
  // Test 2: Mix of valid and invalid
  const test2 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'invalid-profile',
    'kasia-app'
  ]);
  logTest(
    'Mix of valid and invalid profiles returns valid containers',
    test2.length === 2 &&
    test2.includes('kaspa-node') &&
    test2.includes('kasia-app'),
    `Got: ${test2.join(', ')}`
  );
  
  // Test 3: Empty array
  const test3 = dockerManager.getContainerNamesForProfiles([]);
  logTest(
    'Empty profiles array returns empty containers',
    test3.length === 0,
    'Returned empty array'
  );
}

function testRealWorldScenarios(dockerManager) {
  logSection('Real-World Scenarios');
  
  // Scenario 1: Personal Node
  const scenario1 = dockerManager.getContainerNamesForProfiles(['kaspa-node']);
  logTest(
    'Personal Node',
    arraysEqual(scenario1, ['kaspa-node']),
    `Containers: ${scenario1.join(', ')}`
  );
  
  // Scenario 2: Productivity Suite
  const scenario2 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kasia-app',
    'k-social-app'
  ]);
  logTest(
    'Productivity Suite',
    scenario2.length === 3 &&
    scenario2.includes('kaspa-node') &&
    scenario2.includes('kasia-app') &&
    scenario2.includes('k-social'),
    `${scenario2.length} containers`
  );
  
  // Scenario 3: Kaspa Sovereignty
  const scenario3 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kasia-app',
    'kasia-indexer',
    'k-social-app',
    'k-indexer-bundle',
    'kaspa-explorer-bundle'
  ]);
  logTest(
    'Kaspa Sovereignty (full stack)',
    scenario3.length >= 9 &&
    scenario3.includes('kaspa-node') &&
    scenario3.includes('kasia-app') &&
    scenario3.includes('k-social') &&
    scenario3.includes('kasia-indexer') &&
    scenario3.includes('k-indexer') &&
    scenario3.includes('kaspa-explorer'),
    `${scenario3.length} containers`
  );
  
  // Scenario 4: Mining Setup
  const scenario4 = dockerManager.getContainerNamesForProfiles([
    'kaspa-node',
    'kaspa-stratum'
  ]);
  logTest(
    'Mining Setup',
    scenario4.length === 2 &&
    scenario4.includes('kaspa-node') &&
    scenario4.includes('kaspa-stratum'),
    `Containers: ${scenario4.join(', ')}`
  );
  
  // Scenario 5: Archive Node
  const scenario5 = dockerManager.getContainerNamesForProfiles(['kaspa-archive-node']);
  logTest(
    'Archive Node',
    arraysEqual(scenario5, ['kaspa-archive-node']),
    `Containers: ${scenario5.join(', ')}`
  );
}

function testStructure(dockerManager) {
  logSection('PROFILE_CONTAINER_MAP Structure');
  
  // Test 1: Map is defined
  logTest(
    'PROFILE_CONTAINER_MAP is defined',
    dockerManager.PROFILE_CONTAINER_MAP !== undefined &&
    typeof dockerManager.PROFILE_CONTAINER_MAP === 'object',
    'Map exists and is an object'
  );
  
  // Test 2: All new profiles present
  const newProfiles = [
    'kaspa-node',
    'kasia-app',
    'k-social-app',
    'kaspa-explorer-bundle',
    'kasia-indexer',
    'k-indexer-bundle',
    'kaspa-archive-node',
    'kaspa-stratum'
  ];
  
  const allNewPresent = newProfiles.every(profile => 
    Array.isArray(dockerManager.PROFILE_CONTAINER_MAP[profile])
  );
  
  logTest(
    'All new profile IDs are in PROFILE_CONTAINER_MAP',
    allNewPresent,
    `${newProfiles.length} profiles checked`
  );
  
  // Test 3: All legacy profiles present
  const legacyProfiles = [
    'core',
    'kaspa-user-applications',
    'indexer-services',
    'archive-node',
    'mining'
  ];
  
  const allLegacyPresent = legacyProfiles.every(profile =>
    Array.isArray(dockerManager.PROFILE_CONTAINER_MAP[profile])
  );
  
  logTest(
    'All legacy profile IDs are in PROFILE_CONTAINER_MAP',
    allLegacyPresent,
    `${legacyProfiles.length} profiles checked`
  );
  
  // Test 4: Critical k-social-app mapping
  logTest(
    'k-social-app maps to k-social (critical mapping)',
    arraysEqual(dockerManager.PROFILE_CONTAINER_MAP['k-social-app'], ['k-social']),
    'Mapping verified'
  );
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(70), 'bright');
  log('DOCKERMANAGER PHASE 3 TESTS', 'bright');
  log('='.repeat(70), 'bright');
  log('Testing updated DockerManager with new 8-profile architecture\n', 'cyan');
  
  const dockerManager = new DockerManager();
  
  try {
    testNewProfiles(dockerManager);
    testLegacyProfiles(dockerManager);
    testMultipleProfiles(dockerManager);
    testErrorHandling(dockerManager);
    testRealWorldScenarios(dockerManager);
    testStructure(dockerManager);
    
    // Print summary
    log('\n' + '='.repeat(70), 'bright');
    log('TEST SUMMARY', 'bright');
    log('='.repeat(70), 'bright');
    log(`Total:  ${stats.total}`, 'cyan');
    log(`Passed: ${stats.passed}`, 'green');
    log(`Failed: ${stats.failed}`, stats.failed > 0 ? 'red' : 'cyan');
    log('='.repeat(70), 'bright');
    
    if (stats.failed === 0) {
      log('\n✅ ALL TESTS PASSED!\n', 'green');
      process.exit(0);
    } else {
      log(`\n❌ ${stats.failed} TEST(S) FAILED\n`, 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('FATAL ERROR', 'red');
    log('='.repeat(70), 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
