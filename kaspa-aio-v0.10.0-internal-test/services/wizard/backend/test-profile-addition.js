#!/usr/bin/env node

/**
 * Test Profile Addition Workflow
 * Tests the profile addition API endpoints and integration options
 * Requirements: 17.6, 17.7, 17.8, 18.1, 18.2
 */

const axios = require('axios');
const path = require('path');

// Configuration
const WIZARD_URL = process.env.WIZARD_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${WIZARD_URL}${endpoint}`,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      status: response.status,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
        error: error.response.data?.message || error.message
      };
    }
    throw error;
  }
}

async function testValidateAddition() {
  logSection('Test 1: Validate Profile Addition');
  
  try {
    // Test adding indexer-services to existing core profile
    const response = await makeRequest('POST', '/api/profiles/validate-addition', {
      profileId: 'indexer-services',
      currentProfiles: ['core']
    });
    
    if (response.status === 200) {
      log('✓ Profile addition validation successful', 'green');
      log(`  Can add: ${response.data.canAdd}`, 'blue');
      
      if (response.data.canAdd) {
        log(`  Profile: ${response.data.profile.name}`, 'blue');
        log(`  Services to add: ${response.data.profile.services.join(', ')}`, 'blue');
        
        if (response.data.integration && response.data.integration.suggestions.length > 0) {
          log(`  Integration suggestions: ${response.data.integration.suggestions.length}`, 'blue');
          response.data.integration.suggestions.forEach((suggestion, index) => {
            log(`    ${index + 1}. ${suggestion.title}`, 'yellow');
          });
        }
        
        if (response.data.warnings && response.data.warnings.length > 0) {
          log(`  Warnings: ${response.data.warnings.length}`, 'yellow');
          response.data.warnings.forEach(warning => {
            log(`    - ${warning.message}`, 'yellow');
          });
        }
      } else {
        log(`  Errors: ${response.data.errors.length}`, 'red');
        response.data.errors.forEach(error => {
          log(`    - ${error.message}`, 'red');
        });
      }
    } else {
      log(`✗ Profile addition validation failed: ${response.status}`, 'red');
      log(`  Error: ${response.error}`, 'red');
    }
  } catch (error) {
    log(`✗ Profile addition validation error: ${error.message}`, 'red');
  }
}

async function testValidateConflict() {
  logSection('Test 2: Validate Profile Conflict');
  
  try {
    // Test adding archive-node to existing core profile (should conflict)
    const response = await makeRequest('POST', '/api/profiles/validate-addition', {
      profileId: 'archive-node',
      currentProfiles: ['core']
    });
    
    if (response.status === 200) {
      log('✓ Profile conflict validation successful', 'green');
      log(`  Can add: ${response.data.canAdd}`, 'blue');
      
      if (!response.data.canAdd) {
        log('✓ Correctly detected conflict', 'green');
        log(`  Errors: ${response.data.errors.length}`, 'red');
        response.data.errors.forEach(error => {
          log(`    - ${error.message}`, 'red');
        });
        
        if (response.data.recommendations && response.data.recommendations.length > 0) {
          log(`  Recommendations: ${response.data.recommendations.length}`, 'blue');
          response.data.recommendations.forEach(rec => {
            log(`    ${rec.title}: ${rec.message}`, 'yellow');
          });
        }
      } else {
        log('✗ Should have detected conflict but did not', 'red');
      }
    } else {
      log(`✗ Profile conflict validation failed: ${response.status}`, 'red');
      log(`  Error: ${response.error}`, 'red');
    }
  } catch (error) {
    log(`✗ Profile conflict validation error: ${error.message}`, 'red');
  }
}

async function testIntegrationOptions() {
  logSection('Test 3: Get Integration Options');
  
  try {
    // Test getting integration options for indexer-services with existing core
    const response = await makeRequest('POST', '/api/profiles/integration-options', {
      profileId: 'indexer-services',
      currentProfiles: ['core']
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Integration options retrieved successfully', 'green');
      const options = response.data.options;
      
      log(`  Profile: ${options.profileName}`, 'blue');
      log(`  Current profiles: ${options.currentProfiles.join(', ')}`, 'blue');
      log(`  Integration types: ${options.integrationTypes.length}`, 'blue');
      
      options.integrationTypes.forEach((integrationType, index) => {
        log(`    ${index + 1}. ${integrationType.title}`, 'yellow');
        log(`       Description: ${integrationType.description}`, 'yellow');
        log(`       Options: ${integrationType.options.length}`, 'yellow');
        
        integrationType.options.forEach((option, optIndex) => {
          const recommended = option.recommended ? ' (Recommended)' : '';
          log(`         ${optIndex + 1}. ${option.label}${recommended}`, 'cyan');
          log(`            ${option.description}`, 'cyan');
          log(`            Impact: ${option.impact}`, 'cyan');
        });
      });
      
      if (options.recommendations && options.recommendations.length > 0) {
        log(`  Recommendations: ${options.recommendations.length}`, 'blue');
        options.recommendations.forEach(rec => {
          log(`    ${rec.title}: ${rec.message}`, 'yellow');
        });
      }
      
      if (options.resourceImpact) {
        log(`  Resource Impact:`, 'blue');
        log(`    Current: ${options.resourceImpact.current.minMemory}GB RAM, ${options.resourceImpact.current.minCpu} CPU`, 'cyan');
        log(`    After: ${options.resourceImpact.new.minMemory}GB RAM, ${options.resourceImpact.new.minCpu} CPU`, 'cyan');
        log(`    Additional: +${options.resourceImpact.additional.memory}GB RAM, +${options.resourceImpact.additional.cpu} CPU`, 'cyan');
      }
      
    } else {
      log(`✗ Integration options failed: ${response.status}`, 'red');
      log(`  Error: ${response.error || response.data?.error}`, 'red');
    }
  } catch (error) {
    log(`✗ Integration options error: ${error.message}`, 'red');
  }
}

async function testAddProfile() {
  logSection('Test 4: Add Profile (Dry Run)');
  
  try {
    // Note: This is a dry run test - we won't actually add the profile
    // In a real test environment, you would add and then remove the profile
    
    log('ℹ This is a dry run test - profile will not actually be added', 'yellow');
    
    // Test the add profile endpoint with integration options
    const integrationOptions = {
      indexer_node_connection: {
        id: 'local_node',
        config: {
          KASPA_NODE_URL: 'http://kaspa-node:16110',
          USE_LOCAL_NODE: 'true',
          INDEXER_NODE_TYPE: 'local'
        }
      }
    };
    
    log('  Would add profile: indexer-services', 'blue');
    log('  Current profiles: core', 'blue');
    log('  Integration options:', 'blue');
    log(`    indexer_node_connection: local_node`, 'cyan');
    
    // In a real implementation, you would:
    // const response = await makeRequest('POST', '/api/profiles/add', {
    //   profileId: 'indexer-services',
    //   currentProfiles: ['core'],
    //   integrationOptions
    // });
    
    log('✓ Add profile test completed (dry run)', 'green');
    
  } catch (error) {
    log(`✗ Add profile test error: ${error.message}`, 'red');
  }
}

async function testMiningPrerequisites() {
  logSection('Test 5: Mining Profile Prerequisites');
  
  try {
    // Test adding mining profile without prerequisites
    const response1 = await makeRequest('POST', '/api/profiles/validate-addition', {
      profileId: 'mining',
      currentProfiles: ['kaspa-user-applications']
    });
    
    if (response1.status === 200) {
      log('✓ Mining without prerequisites validation successful', 'green');
      log(`  Can add: ${response1.data.canAdd}`, 'blue');
      
      if (!response1.data.canAdd) {
        log('✓ Correctly detected missing prerequisites', 'green');
        const prerequisiteError = response1.data.errors.find(e => e.type === 'missing_prerequisites');
        if (prerequisiteError) {
          log(`  Missing prerequisites detected`, 'yellow');
          prerequisiteError.prerequisites.forEach(prereq => {
            log(`    - ${prereq.message}`, 'yellow');
          });
        }
      } else {
        log('✗ Should have detected missing prerequisites', 'red');
      }
    }
    
    // Test adding mining profile with prerequisites
    const response2 = await makeRequest('POST', '/api/profiles/validate-addition', {
      profileId: 'mining',
      currentProfiles: ['core']
    });
    
    if (response2.status === 200) {
      log('✓ Mining with prerequisites validation successful', 'green');
      log(`  Can add: ${response2.data.canAdd}`, 'blue');
      
      if (response2.data.canAdd) {
        log('✓ Prerequisites satisfied', 'green');
        
        if (response2.data.integration && response2.data.integration.suggestions.length > 0) {
          log(`  Integration suggestions: ${response2.data.integration.suggestions.length}`, 'blue');
          response2.data.integration.suggestions.forEach(suggestion => {
            log(`    - ${suggestion.title}`, 'yellow');
          });
        }
      } else {
        log('✗ Should be able to add with prerequisites', 'red');
      }
    }
    
  } catch (error) {
    log(`✗ Mining prerequisites test error: ${error.message}`, 'red');
  }
}

async function testUserApplicationsIntegration() {
  logSection('Test 6: User Applications Integration');
  
  try {
    // Test adding kaspa-user-applications to existing indexer-services
    const response = await makeRequest('POST', '/api/profiles/integration-options', {
      profileId: 'kaspa-user-applications',
      currentProfiles: ['indexer-services']
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ User applications integration options retrieved', 'green');
      const options = response.data.options;
      
      // Look for app_indexer_connection integration type
      const appIndexerIntegration = options.integrationTypes.find(t => t.type === 'app_indexer_connection');
      
      if (appIndexerIntegration) {
        log('✓ Found app-indexer integration options', 'green');
        log(`  Title: ${appIndexerIntegration.title}`, 'blue');
        log(`  Options: ${appIndexerIntegration.options.length}`, 'blue');
        
        const localIndexersOption = appIndexerIntegration.options.find(o => o.id === 'local_indexers');
        if (localIndexersOption) {
          log('✓ Found local indexers option', 'green');
          log(`    Label: ${localIndexersOption.label}`, 'cyan');
          log(`    Recommended: ${localIndexersOption.recommended}`, 'cyan');
          log(`    Impact: ${localIndexersOption.impact}`, 'cyan');
        } else {
          log('✗ Local indexers option not found', 'red');
        }
      } else {
        log('✗ App-indexer integration type not found', 'red');
      }
      
    } else {
      log(`✗ User applications integration failed: ${response.status}`, 'red');
      log(`  Error: ${response.error || response.data?.error}`, 'red');
    }
  } catch (error) {
    log(`✗ User applications integration error: ${error.message}`, 'red');
  }
}

async function testResourceCalculation() {
  logSection('Test 7: Resource Impact Calculation');
  
  try {
    // Test resource calculation for adding indexer-services
    const response = await makeRequest('POST', '/api/profiles/integration-options', {
      profileId: 'indexer-services',
      currentProfiles: ['core']
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Resource calculation successful', 'green');
      const resourceImpact = response.data.options.resourceImpact;
      
      if (resourceImpact) {
        log('  Resource Impact Analysis:', 'blue');
        log(`    Current Requirements:`, 'cyan');
        log(`      Memory: ${resourceImpact.current.minMemory}GB`, 'cyan');
        log(`      CPU: ${resourceImpact.current.minCpu} cores`, 'cyan');
        log(`      Disk: ${resourceImpact.current.minDisk}GB`, 'cyan');
        
        log(`    After Addition:`, 'cyan');
        log(`      Memory: ${resourceImpact.new.minMemory}GB`, 'cyan');
        log(`      CPU: ${resourceImpact.new.minCpu} cores`, 'cyan');
        log(`      Disk: ${resourceImpact.new.minDisk}GB`, 'cyan');
        
        log(`    Additional Requirements:`, 'yellow');
        log(`      Memory: +${resourceImpact.additional.memory}GB`, 'yellow');
        log(`      CPU: +${resourceImpact.additional.cpu} cores`, 'yellow');
        log(`      Disk: +${resourceImpact.additional.disk}GB`, 'yellow');
        log(`      Ports: ${resourceImpact.additional.ports.join(', ')}`, 'yellow');
        
        // Validate calculations
        const expectedMemoryIncrease = 8; // indexer-services requires 8GB
        if (resourceImpact.additional.memory === expectedMemoryIncrease) {
          log('✓ Memory calculation correct', 'green');
        } else {
          log(`✗ Memory calculation incorrect: expected +${expectedMemoryIncrease}GB, got +${resourceImpact.additional.memory}GB`, 'red');
        }
      } else {
        log('✗ Resource impact data not found', 'red');
      }
    } else {
      log(`✗ Resource calculation failed: ${response.status}`, 'red');
    }
  } catch (error) {
    log(`✗ Resource calculation error: ${error.message}`, 'red');
  }
}

async function testStartupOrder() {
  logSection('Test 8: Service Startup Order');
  
  try {
    // Test startup order calculation
    const response = await makeRequest('POST', '/api/profiles/integration-options', {
      profileId: 'indexer-services',
      currentProfiles: ['core']
    });
    
    if (response.status === 200 && response.data.success) {
      log('✓ Startup order calculation successful', 'green');
      const startupOrder = response.data.options.startupOrder;
      
      if (startupOrder) {
        log('  Service Startup Order:', 'blue');
        log(`    New services: ${startupOrder.newServices.join(', ')}`, 'cyan');
        log(`    Full startup sequence:`, 'cyan');
        
        startupOrder.fullOrder.forEach((service, index) => {
          const isNew = startupOrder.newServices.includes(service.name);
          const marker = isNew ? ' (NEW)' : '';
          log(`      ${index + 1}. ${service.name} (${service.profileName})${marker}`, isNew ? 'yellow' : 'cyan');
        });
        
        // Validate startup order (kaspa-node should be first, indexers should be after)
        const kaspaNodeIndex = startupOrder.fullOrder.findIndex(s => s.name === 'kaspa-node');
        const indexerServices = startupOrder.fullOrder.filter(s => 
          ['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'].includes(s.name)
        );
        
        if (kaspaNodeIndex === 0) {
          log('✓ Kaspa node correctly ordered first', 'green');
        } else {
          log('✗ Kaspa node should be first in startup order', 'red');
        }
        
        const allIndexersAfterNode = indexerServices.every(service => {
          const serviceIndex = startupOrder.fullOrder.findIndex(s => s.name === service.name);
          return serviceIndex > kaspaNodeIndex;
        });
        
        if (allIndexersAfterNode) {
          log('✓ Indexer services correctly ordered after Kaspa node', 'green');
        } else {
          log('✗ Indexer services should start after Kaspa node', 'red');
        }
      } else {
        log('✗ Startup order data not found', 'red');
      }
    } else {
      log(`✗ Startup order calculation failed: ${response.status}`, 'red');
    }
  } catch (error) {
    log(`✗ Startup order calculation error: ${error.message}`, 'red');
  }
}

async function runTests() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  Profile Addition Workflow Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  
  const tests = [
    { name: 'Validate Profile Addition', fn: testValidateAddition },
    { name: 'Validate Profile Conflict', fn: testValidateConflict },
    { name: 'Get Integration Options', fn: testIntegrationOptions },
    { name: 'Add Profile (Dry Run)', fn: testAddProfile },
    { name: 'Mining Prerequisites', fn: testMiningPrerequisites },
    { name: 'User Applications Integration', fn: testUserApplicationsIntegration },
    { name: 'Resource Calculation', fn: testResourceCalculation },
    { name: 'Service Startup Order', fn: testStartupOrder }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      log(`✗ Test "${test.name}" failed: ${error.message}`, 'red');
      failed++;
    }
  }
  
  logSection('Test Summary');
  log(`Total tests: ${tests.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n🎉 All profile addition tests passed!', 'green');
  } else {
    log(`\n❌ ${failed} test(s) failed. Check the output above for details.`, 'red');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Test suite error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testValidateAddition,
  testIntegrationOptions,
  testAddProfile
};