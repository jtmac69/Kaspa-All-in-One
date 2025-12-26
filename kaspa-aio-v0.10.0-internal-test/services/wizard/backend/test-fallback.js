#!/usr/bin/env node

/**
 * Fallback Manager Test Suite
 * 
 * Tests fallback strategies for service failures:
 * - Node failure detection
 * - User choice dialog generation
 * - Public network fallback configuration
 * - Indexer fallback configuration
 * - Docker compose override generation
 * - Troubleshooting information
 * - Health check retry logic
 */

const FallbackManager = require('./src/utils/fallback-manager');
const DockerManager = require('./src/utils/docker-manager');
const ProfileManager = require('./src/utils/profile-manager');

// Colors for output
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

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function runTests() {
  log('\n🧪 Fallback Manager Test Suite\n', 'cyan');
  
  const dockerManager = new DockerManager();
  const profileManager = new ProfileManager();
  const fallbackManager = new FallbackManager(dockerManager, profileManager);
  
  let passed = 0;
  let failed = 0;

  // Test 1: Node Failure Detection
  logTest('Node Failure Detection');
  try {
    const failureInfo = await fallbackManager.detectNodeFailure('kaspa-node', ['kasia-indexer', 'k-indexer']);
    
    if (failureInfo && typeof failureInfo.failed === 'boolean') {
      logSuccess('Node failure detection returned valid result');
      logInfo(`Failed: ${failureInfo.failed}`);
      logInfo(`Reason: ${failureInfo.reason || 'N/A'}`);
      logInfo(`Message: ${failureInfo.message}`);
      logInfo(`Dependent services: ${failureInfo.dependentServices?.join(', ') || 'none'}`);
      passed++;
    } else {
      logError('Invalid failure detection result');
      failed++;
    }
  } catch (error) {
    logError(`Node failure detection failed: ${error.message}`);
    failed++;
  }

  // Test 2: Generate Node Failure Dialog
  logTest('Generate Node Failure Dialog');
  try {
    const mockFailure = {
      failed: true,
      reason: 'health_check_failed',
      message: 'Kaspa node failed health checks',
      severity: 'high',
      dependentServices: ['kasia-indexer', 'k-indexer'],
      details: [
        { check: 'rpc', message: 'RPC endpoint not responding' }
      ]
    };
    
    const dialog = fallbackManager.generateNodeFailureDialog('kaspa-node', mockFailure);
    
    if (dialog && dialog.title && dialog.options && Array.isArray(dialog.options)) {
      logSuccess('Dialog generated successfully');
      logInfo(`Title: ${dialog.title}`);
      logInfo(`Options: ${dialog.options.length}`);
      
      dialog.options.forEach((opt, idx) => {
        logInfo(`  ${idx + 1}. ${opt.label} (${opt.id})`);
        logInfo(`     ${opt.description}`);
        logInfo(`     Recommended: ${opt.recommended ? 'Yes' : 'No'}`);
      });
      
      passed++;
    } else {
      logError('Invalid dialog structure');
      failed++;
    }
  } catch (error) {
    logError(`Dialog generation failed: ${error.message}`);
    failed++;
  }

  // Test 3: Configure Public Network Fallback
  logTest('Configure Public Network Fallback');
  try {
    const currentConfig = {
      KASPA_NODE_P2P_PORT: '16110',
      KASPA_NODE_RPC_PORT: '16111'
    };
    
    const fallbackConfig = await fallbackManager.configurePublicNetworkFallback(
      ['kasia-indexer', 'k-indexer'],
      currentConfig
    );
    
    if (fallbackConfig && fallbackConfig.USE_PUBLIC_KASPA_NODE === 'true') {
      logSuccess('Public network fallback configured');
      logInfo(`RPC URL: ${fallbackConfig.KASPA_NODE_RPC_URL}`);
      logInfo(`GRPC URL: ${fallbackConfig.KASPA_NODE_GRPC_URL}`);
      logInfo(`Fallback enabled: ${fallbackConfig._fallback?.enabled}`);
      logInfo(`Affected services: ${fallbackConfig._fallback?.affectedServices?.join(', ')}`);
      passed++;
    } else {
      logError('Invalid fallback configuration');
      failed++;
    }
  } catch (error) {
    logError(`Public network fallback failed: ${error.message}`);
    failed++;
  }

  // Test 4: Configure Indexer Fallback
  logTest('Configure Indexer Fallback');
  try {
    const currentConfig = {};
    
    const fallbackConfig = await fallbackManager.configureIndexerFallback(
      ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
      currentConfig
    );
    
    if (fallbackConfig && fallbackConfig._indexerFallback?.enabled) {
      logSuccess('Indexer fallback configured');
      logInfo(`Kasia URL: ${fallbackConfig.KASIA_INDEXER_URL || 'N/A'}`);
      logInfo(`K-Indexer URL: ${fallbackConfig.K_INDEXER_URL || 'N/A'}`);
      logInfo(`Simply Kaspa URL: ${fallbackConfig.SIMPLY_KASPA_INDEXER_URL || 'N/A'}`);
      logInfo(`Affected indexers: ${fallbackConfig._indexerFallback?.affectedIndexers?.join(', ')}`);
      passed++;
    } else {
      logError('Invalid indexer fallback configuration');
      failed++;
    }
  } catch (error) {
    logError(`Indexer fallback failed: ${error.message}`);
    failed++;
  }

  // Test 5: Generate Fallback Docker Compose
  logTest('Generate Fallback Docker Compose');
  try {
    const fallbackConfig = {
      USE_PUBLIC_KASPA_NODE: 'true',
      KASPA_NODE_RPC_URL: 'https://api.kaspa.org',
      KASPA_NODE_GRPC_URL: 'grpc://api.kaspa.org:16110'
    };
    
    const profiles = ['core', 'indexer-services'];
    
    const dockerCompose = await fallbackManager.generateFallbackDockerCompose(
      fallbackConfig,
      profiles
    );
    
    if (dockerCompose && dockerCompose.version && dockerCompose.services) {
      logSuccess('Docker compose override generated');
      logInfo(`Version: ${dockerCompose.version}`);
      logInfo(`Services configured: ${Object.keys(dockerCompose.services).length}`);
      
      Object.keys(dockerCompose.services).forEach(service => {
        logInfo(`  - ${service}`);
      });
      
      passed++;
    } else {
      logError('Invalid docker compose structure');
      failed++;
    }
  } catch (error) {
    logError(`Docker compose generation failed: ${error.message}`);
    failed++;
  }

  // Test 6: Get Dependent Services
  logTest('Get Dependent Services');
  try {
    const profiles = ['core', 'indexer-services', 'kaspa-user-applications', 'mining'];
    
    const nodeDependents = fallbackManager.getDependentServices(profiles, 'kaspa-node');
    const indexerDependents = fallbackManager.getDependentServices(profiles, 'kasia-indexer');
    
    logSuccess('Dependent services retrieved');
    logInfo(`Node dependents: ${nodeDependents.join(', ') || 'none'}`);
    logInfo(`Indexer dependents: ${indexerDependents.join(', ') || 'none'}`);
    
    if (nodeDependents.includes('kasia-indexer') && nodeDependents.includes('kaspa-stratum')) {
      logSuccess('Correct node dependencies detected');
      passed++;
    } else {
      logError('Incorrect node dependencies');
      failed++;
    }
  } catch (error) {
    logError(`Get dependent services failed: ${error.message}`);
    failed++;
  }

  // Test 7: Get Troubleshooting Info
  logTest('Get Troubleshooting Info');
  try {
    const mockFailure = {
      failed: true,
      reason: 'container_not_running',
      message: 'Container is not running',
      severity: 'high'
    };
    
    const troubleshooting = await fallbackManager.getTroubleshootingInfo('kaspa-node', mockFailure);
    
    if (troubleshooting && troubleshooting.steps && Array.isArray(troubleshooting.steps)) {
      logSuccess('Troubleshooting info generated');
      logInfo(`Service: ${troubleshooting.service}`);
      logInfo(`Steps: ${troubleshooting.steps.length}`);
      
      troubleshooting.steps.forEach((step, idx) => {
        logInfo(`  ${step.step}. ${step.title}`);
        logInfo(`     ${step.description}`);
        if (step.command) {
          logInfo(`     Command: ${step.command}`);
        }
      });
      
      passed++;
    } else {
      logError('Invalid troubleshooting structure');
      failed++;
    }
  } catch (error) {
    logError(`Troubleshooting info failed: ${error.message}`);
    failed++;
  }

  // Test 8: Public Endpoints
  logTest('Public Endpoints Configuration');
  try {
    const endpoints = fallbackManager.publicEndpoints;
    
    if (endpoints && endpoints.kaspaNode && endpoints.indexers) {
      logSuccess('Public endpoints configured');
      logInfo(`Kaspa Node RPC: ${endpoints.kaspaNode.rpc}`);
      logInfo(`Kaspa Node GRPC: ${endpoints.kaspaNode.grpc}`);
      logInfo(`Kasia Indexer: ${endpoints.indexers.kasia}`);
      logInfo(`K-Social Indexer: ${endpoints.indexers.kSocial}`);
      logInfo(`Simply Kaspa Indexer: ${endpoints.indexers.simplyKaspa}`);
      passed++;
    } else {
      logError('Invalid public endpoints structure');
      failed++;
    }
  } catch (error) {
    logError(`Public endpoints test failed: ${error.message}`);
    failed++;
  }

  // Test 9: Save and Load Fallback Configuration
  logTest('Save and Load Fallback Configuration');
  try {
    const testConfig = {
      USE_PUBLIC_KASPA_NODE: 'true',
      KASPA_NODE_RPC_URL: 'https://api.kaspa.org',
      _fallback: {
        enabled: true,
        reason: 'test',
        timestamp: new Date().toISOString()
      }
    };
    
    const testPath = '.kaspa-aio/test-fallback-config.json';
    
    // Save
    const saveResult = await fallbackManager.saveFallbackConfiguration(testConfig, testPath);
    
    if (saveResult.success) {
      logSuccess('Configuration saved successfully');
      logInfo(`Path: ${saveResult.path}`);
      
      // Load
      const loadResult = await fallbackManager.loadFallbackConfiguration(testPath);
      
      if (loadResult.success && loadResult.config.USE_PUBLIC_KASPA_NODE === 'true') {
        logSuccess('Configuration loaded successfully');
        logInfo(`Loaded config matches saved config`);
        passed++;
      } else {
        logError('Configuration load failed or mismatch');
        failed++;
      }
    } else {
      logError('Configuration save failed');
      failed++;
    }
  } catch (error) {
    logError(`Save/load configuration failed: ${error.message}`);
    failed++;
  }

  // Test 10: Health Check Configuration
  logTest('Health Check Configuration');
  try {
    const config = fallbackManager.healthCheckConfig;
    
    if (config && config.maxRetries && config.timeout) {
      logSuccess('Health check configuration valid');
      logInfo(`Max retries: ${config.maxRetries}`);
      logInfo(`Retry delay: ${config.retryDelay}ms`);
      logInfo(`Timeout: ${config.timeout}ms`);
      logInfo(`Required checks: ${JSON.stringify(config.requiredChecks)}`);
      passed++;
    } else {
      logError('Invalid health check configuration');
      failed++;
    }
  } catch (error) {
    logError(`Health check configuration test failed: ${error.message}`);
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total tests: ${passed + failed}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`, failed > 0 ? 'yellow' : 'green');
  log('='.repeat(60) + '\n', 'cyan');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
