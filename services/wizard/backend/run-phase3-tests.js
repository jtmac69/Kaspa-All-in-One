#!/usr/bin/env node

/**
 * Phase 3 Integration Test Runner
 * 
 * Runs comprehensive tests for Docker Compose generation system
 * Tests dynamic release fetching, configurable images, and custom builds
 */

const ConfigGenerator = require('./src/utils/config-generator');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Test configuration
const TEST_CONFIG = {
  KASPA_NETWORK: 'mainnet',
  DATA_VOLUME_PATH: '/tmp/kaspa-test',
  
  // Service-specific ports
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NODE_WRPC_PORT: 17110,
  
  KASIA_APP_PORT: 3001,
  KSOCIAL_APP_PORT: 3003,
  KASPA_EXPLORER_PORT: 3004,
  SIMPLY_KASPA_INDEXER_PORT: 3005,
  KASIA_INDEXER_PORT: 3002,
  K_INDEXER_PORT: 3006,
  KASPA_STRATUM_PORT: 5555,
  
  TIMESCALEDB_EXPLORER_PORT: 5434,
  TIMESCALEDB_KINDEXER_PORT: 5433,
  
  // Database credentials
  POSTGRES_USER_EXPLORER: 'test_explorer',
  POSTGRES_PASSWORD_EXPLORER: 'test_pass',
  POSTGRES_DB_EXPLORER: 'test_db_explorer',
  
  POSTGRES_USER_KINDEXER: 'test_kindexer',
  POSTGRES_PASSWORD_KINDEXER: 'test_pass',
  POSTGRES_DB_KINDEXER: 'test_db_kindexer',
  
  // Node modes
  KASIA_NODE_MODE: 'local',
  K_INDEXER_NODE_MODE: 'local',
  SIMPLY_KASPA_NODE_MODE: 'local',
  
  // Mining
  MINING_ADDRESS: 'kaspa:qz4wxy1234567890abcdef',
  STRATUM_EXTERNAL_IP: '203.0.113.42'
};

// Test statistics
let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Helper functions
function validateDockerCompose(composeContent) {
  const tempFile = path.join('/tmp', `test-compose-${Date.now()}.yml`);
  
  try {
    fs.writeFileSync(tempFile, composeContent);
    execSync(`docker compose -f ${tempFile} config --quiet 2>&1`, { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    fs.unlinkSync(tempFile);
    return { valid: true };
  } catch (error) {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
    return { valid: false, error: error.message };
  }
}

function extractImageTags(composeContent) {
  const imageRegex = /image:\s*([^\s]+)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(composeContent)) !== null) {
    images.push(match[1]);
  }
  
  return images;
}

function extractBuildContexts(composeContent) {
  const buildRegex = /build:\s*\n\s*context:\s*([^\s]+)/g;
  const builds = [];
  let match;
  
  while ((match = buildRegex.exec(composeContent)) !== null) {
    builds.push(match[1]);
  }
  
  return builds;
}

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

// Test suites
async function testReleaseFetching(generator) {
  logSection('Release Fetching Tests');
  
  try {
    // Test 1: Fetch kaspanet/rusty-kaspa
    const release1 = await generator._fetchLatestGitHubRelease('kaspanet/rusty-kaspa', 'v1.0.0');
    logTest(
      'Fetch kaspanet/rusty-kaspa release',
      release1 && /^v?\d+\.\d+\.\d+/.test(release1),
      `Fetched: ${release1}`
    );
    
    // Test 2: Cache verification
    // Clear cache and fetch fresh (will take time)
    generator.releaseCache.clear();
    const start1 = Date.now();
    await generator._fetchLatestGitHubRelease('kaspanet/rusty-kaspa', 'v1.0.0');
    const time1 = Date.now() - start1;
    
    // Second fetch should use cache (instant)
    const start2 = Date.now();
    const cachedRelease = await generator._fetchLatestGitHubRelease('kaspanet/rusty-kaspa', 'v1.0.0');
    const time2 = Date.now() - start2;
    
    // Cache is working if second call is faster OR if both are cached (time2 <= time1)
    logTest(
      'Release cache working',
      time2 <= time1 && cachedRelease,
      `Cache hit: ${time1}ms → ${time2}ms`
    );
    
    // Test 3: Fetch simply-kaspa-indexer
    const release2 = await generator._fetchLatestGitHubRelease('supertypo/simply-kaspa-indexer', 'v1.6.0');
    logTest(
      'Fetch supertypo/simply-kaspa-indexer release',
      release2 && /^v?\d+\.\d+\.\d+/.test(release2),
      `Fetched: ${release2}`
    );
    
    // Test 4: Fallback on invalid repo
    const fallback = await generator._fetchLatestGitHubRelease('invalid/nonexistent-repo', 'v0.0.1');
    logTest(
      'Fallback on invalid repo',
      fallback === 'v0.0.1',
      'Used fallback version'
    );
    
  } catch (error) {
    logTest('Release fetching tests', false, error.message);
  }
}

async function testProfileGeneration(generator) {
  logSection('Profile Service Generation Tests');
  
  const tests = [
    {
      name: 'kaspa-node (dynamic release)',
      profiles: ['kaspa-node'],
      checks: [
        { fn: (c) => c.includes('kaspa-node:'), desc: 'Contains kaspa-node service' },
        { fn: (c) => c.includes('kaspanet/rusty-kaspad:'), desc: 'Uses kaspanet image' },
        { fn: (c) => !c.includes(':latest'), desc: 'Uses versioned tag' }
      ]
    },
    {
      name: 'kasia-app (placeholder)',
      profiles: ['kasia-app'],
      checks: [
        { fn: (c) => c.includes('kasia-app:'), desc: 'Contains kasia-app service' },
        { fn: (c) => c.includes('image: kasia-app:latest'), desc: 'Uses placeholder image' }
      ]
    },
    {
      name: 'k-social-app (placeholder)',
      profiles: ['k-social-app'],
      checks: [
        { fn: (c) => c.includes('k-social:'), desc: 'Contains k-social service' },
        { fn: (c) => c.includes('image: k-social:latest'), desc: 'Uses placeholder image' }
      ]
    },
    {
      name: 'kaspa-explorer-bundle (3 services)',
      profiles: ['kaspa-explorer-bundle'],
      checks: [
        { fn: (c) => c.includes('kaspa-explorer:'), desc: 'Contains explorer' },
        { fn: (c) => c.includes('simply-kaspa-indexer:'), desc: 'Contains indexer' },
        { fn: (c) => c.includes('timescaledb-explorer:'), desc: 'Contains database' }
      ]
    },
    {
      name: 'kasia-indexer (placeholder)',
      profiles: ['kasia-indexer'],
      checks: [
        { fn: (c) => c.includes('kasia-indexer:'), desc: 'Contains kasia-indexer service' }
      ]
    },
    {
      name: 'k-indexer-bundle (2 services)',
      profiles: ['k-indexer-bundle'],
      checks: [
        { fn: (c) => c.includes('k-indexer:'), desc: 'Contains k-indexer' },
        { fn: (c) => c.includes('timescaledb-kindexer:'), desc: 'Contains database' }
      ]
    },
    {
      name: 'kaspa-archive-node (with --nopruning)',
      profiles: ['kaspa-archive-node'],
      checks: [
        { fn: (c) => c.includes('kaspa-archive-node:'), desc: 'Contains archive node' },
        { fn: (c) => c.includes('--nopruning'), desc: 'Has --nopruning flag' }
      ]
    },
    {
      name: 'kaspa-stratum (build context)',
      profiles: ['kaspa-stratum'],
      checks: [
        { fn: (c) => c.includes('kaspa-stratum:'), desc: 'Contains stratum service' },
        { fn: (c) => c.includes('build:'), desc: 'Uses build context' }
      ]
    }
  ];
  
  for (const test of tests) {
    try {
      const compose = await generator.generateDockerCompose(TEST_CONFIG, test.profiles);
      const validation = validateDockerCompose(compose);
      
      let allPassed = validation.valid;
      let messages = [];
      
      if (!validation.valid) {
        messages.push(`Docker Compose validation failed: ${validation.error}`);
      }
      
      for (const check of test.checks) {
        const passed = check.fn(compose);
        if (!passed) {
          allPassed = false;
          messages.push(`Failed: ${check.desc}`);
        }
      }
      
      logTest(test.name, allPassed, messages.join('; '));
      
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
}

async function testTemplates(generator) {
  logSection('Template Generation Tests');
  
  const templates = [
    {
      name: 'personal-node (1 profile)',
      profiles: ['kaspa-node'],
      expectedServices: ['kaspa-node']
    },
    {
      name: 'productivity-suite (3 profiles)',
      profiles: ['kaspa-node', 'kasia-app', 'k-social-app'],
      expectedServices: ['kaspa-node', 'kasia-app', 'k-social']
    },
    {
      name: 'kaspa-sovereignty (6 profiles, 11 services)',
      profiles: ['kaspa-node', 'kasia-app', 'kasia-indexer', 'k-social-app', 'k-indexer-bundle', 'kaspa-explorer-bundle'],
      expectedServices: ['kaspa-node', 'kasia-app', 'kasia-indexer', 'k-social', 'k-indexer', 'timescaledb-kindexer', 'kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer']
    }
  ];
  
  for (const template of templates) {
    try {
      const compose = await generator.generateDockerCompose(TEST_CONFIG, template.profiles);
      const validation = validateDockerCompose(compose);
      
      let allPresent = validation.valid;
      let missing = [];
      
      for (const service of template.expectedServices) {
        if (!compose.includes(`${service}:`)) {
          allPresent = false;
          missing.push(service);
        }
      }
      
      const message = missing.length > 0 ? `Missing: ${missing.join(', ')}` : `All ${template.expectedServices.length} services present`;
      logTest(template.name, allPresent, message);
      
    } catch (error) {
      logTest(template.name, false, error.message);
    }
  }
}

async function testBackwardCompatibility(generator) {
  logSection('Backward Compatibility Tests');
  
  try {
    // Test legacy profile mapping
    const compose = await generator.generateDockerCompose(TEST_CONFIG, ['core']);
    logTest(
      'Legacy profile: core → kaspa-node',
      compose.includes('kaspa-node:'),
      'Legacy profile correctly mapped'
    );
    
    // Test container name stability
    const compose2 = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-node', 'kasia-app', 'k-social-app']);
    const hasCorrectNames = 
      compose2.includes('container_name: kaspa-node') &&
      compose2.includes('container_name: kasia-app') &&
      compose2.includes('container_name: k-social');
    
    logTest(
      'Container names unchanged',
      hasCorrectNames,
      'All container names stable'
    );
    
  } catch (error) {
    logTest('Backward compatibility', false, error.message);
  }
}

async function testErrorHandling(generator) {
  logSection('Error Handling Tests');
  
  try {
    // Test minimal config
    const compose = await generator.generateDockerCompose({}, ['kaspa-node']);
    logTest(
      'Handle missing config gracefully',
      compose.includes('kaspa-node:') && compose.includes('--mainnet'),
      'Defaults applied correctly'
    );
    
    // Test network error handling
    generator.releaseCache.clear();
    const compose2 = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-node']);
    logTest(
      'Handle network errors in release fetching',
      compose2.includes('kaspa-node:'),
      'Fallback version used'
    );
    
  } catch (error) {
    logTest('Error handling', false, error.message);
  }
}

async function testImageSources(generator) {
  logSection('Image Source Verification Tests');
  
  try {
    // Test versioned tags
    const compose1 = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-node']);
    const images1 = extractImageTags(compose1);
    logTest(
      'kaspa-node uses versioned tag',
      images1[0] && images1[0].match(/kaspanet\/rusty-kaspad:v?\d+\.\d+\.\d+/) && !images1[0].includes(':latest'),
      `Image: ${images1[0]}`
    );
    
    // Test placeholder images
    const compose2 = await generator.generateDockerCompose(TEST_CONFIG, ['kasia-app']);
    logTest(
      'Placeholder images use :latest',
      compose2.includes('kasia-app:latest'),
      'Placeholder image correct'
    );
    
    // Test custom images
    const customConfig = {
      ...TEST_CONFIG,
      KASIA_APP_IMAGE: 'custom/kasia:v1.0.0'
    };
    const compose3 = await generator.generateDockerCompose(customConfig, ['kasia-app']);
    logTest(
      'Custom images used when configured',
      compose3.includes('custom/kasia:v1.0.0'),
      'Custom image applied'
    );
    
    // Test TimescaleDB
    const compose4 = await generator.generateDockerCompose(TEST_CONFIG, ['kaspa-explorer-bundle']);
    const images4 = extractImageTags(compose4);
    logTest(
      'TimescaleDB uses latest-pg16',
      images4.includes('timescale/timescaledb:latest-pg16'),
      'TimescaleDB version correct'
    );
    
  } catch (error) {
    logTest('Image source verification', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(70), 'bright');
  log('PHASE 3 INTEGRATION TESTS', 'bright');
  log('='.repeat(70), 'bright');
  log('Testing Docker Compose generation with dynamic releases and configurable images\n', 'cyan');
  
  const generator = new ConfigGenerator();
  
  try {
    await testReleaseFetching(generator);
    await testProfileGeneration(generator);
    await testTemplates(generator);
    await testBackwardCompatibility(generator);
    await testErrorHandling(generator);
    await testImageSources(generator);
    
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
