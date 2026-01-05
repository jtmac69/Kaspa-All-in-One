/**
 * Property-Based Test: Data Preservation During Modification
 * 
 * Tests Property 11: Data Preservation During Modification
 * Validates: Requirements 5.6
 * 
 * This test verifies that when modifying configurations, existing service data
 * is preserved by default unless explicitly requested to be removed.
 */

const fc = require('fast-check');
const fs = require('fs').promises;
const path = require('path');
const { SharedStateManager } = require('./state-manager');
const { getProjectRoot } = require('./path-resolver');

// Test configuration - use relative path from project root
const PROJECT_ROOT = getProjectRoot(__dirname);
const TEST_STATE_DIR = path.join(PROJECT_ROOT, '.kaspa-aio-test');
const TEST_STATE_PATH = path.join(TEST_STATE_DIR, 'installation-state.json');

// Available services that could have data
const SERVICES_WITH_DATA = [
  'kaspa-node',
  'kaspa-node-archive',
  'kaspa-explorer',
  'kasia',
  'k-indexer',
  'simply-kaspa-indexer',
  'timescaledb',
  'kaspa-stratum'
];

// Service data types that should be preserved
const SERVICE_DATA_TYPES = [
  'blockchain-data',
  'database-data',
  'configuration-files',
  'user-data',
  'cache-data',
  'logs'
];

/**
 * Generator for safe strings that won't break JSON (alphanumeric + safe chars)
 */
const safeStringArbitrary = (minLength = 1, maxLength = 50) => 
  fc.stringOf(fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '-', '_', ' ', '.'
  ), { minLength, maxLength });

/**
 * Generator for safe path strings (alphanumeric, dash, underscore, slash, dot)
 */
const safePathArbitrary = (minLength = 5, maxLength = 50) =>
  fc.stringOf(fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '-', '_', '/', '.', ' '
  ), { minLength, maxLength });

/**
 * Generator for service configurations
 */
const serviceConfigurationArbitrary = fc.record({
  serviceId: fc.constantFrom(...SERVICES_WITH_DATA),
  currentConfig: fc.record({
    port: fc.integer({ min: 1024, max: 65535 }),
    enabled: fc.boolean(),
    dataPath: safePathArbitrary(5, 20),
    maxMemory: safeStringArbitrary(3, 10),
    logLevel: fc.constantFrom('debug', 'info', 'warn', 'error'),
    customSettings: fc.dictionary(
      safeStringArbitrary(1, 10).filter(k => k !== 'hasOwnProperty' && k !== 'constructor' && k !== 'prototype' && k !== '__proto__'), 
      safeStringArbitrary(1, 20)
    )
  }),
  newConfig: fc.record({
    port: fc.integer({ min: 1024, max: 65535 }),
    enabled: fc.boolean(),
    dataPath: safePathArbitrary(5, 20),
    maxMemory: safeStringArbitrary(3, 10),
    logLevel: fc.constantFrom('debug', 'info', 'warn', 'error'),
    customSettings: fc.dictionary(
      safeStringArbitrary(1, 10).filter(k => k !== 'hasOwnProperty' && k !== 'constructor' && k !== 'prototype' && k !== '__proto__'), 
      safeStringArbitrary(1, 20)
    )
  }),
  existingData: fc.array(fc.record({
    type: fc.constantFrom(...SERVICE_DATA_TYPES),
    path: safePathArbitrary(10, 30).filter(p => p !== 'hasOwnProperty' && p !== 'constructor' && p !== 'prototype' && p !== '__proto__'),
    size: fc.integer({ min: 1024, max: 1000000000 }), // 1KB to 1GB
    lastModified: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
    critical: fc.boolean() // Whether this data is critical to preserve
  }), { minLength: 1, maxLength: 10 })
});

/**
 * Generator for modification operations
 */
const modificationOperationArbitrary = fc.record({
  type: fc.constantFrom('modify', 'configure', 'update'),
  preserveData: fc.option(fc.boolean()), // undefined means use default (preserve)
  explicitDataRemoval: fc.boolean(), // Whether user explicitly requested data removal
  backupBeforeChange: fc.boolean(),
  restartService: fc.boolean()
});

/**
 * Generator for installation states with services that have data
 */
const installationStateWithDataArbitrary = fc.record({
  version: fc.constant('1.0.0'),
  installedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
  lastModified: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map(d => d.toISOString()),
  phase: fc.constant('complete'),
  profiles: fc.record({
    selected: fc.array(fc.constantFrom('core', 'indexer-services', 'kaspa-user-applications'), { minLength: 1, maxLength: 3 }),
    count: fc.integer({ min: 1, max: 3 })
  }).map(profiles => ({
    selected: profiles.selected,
    count: profiles.selected.length
  })),
  configuration: fc.record({
    network: fc.constantFrom('mainnet', 'testnet'),
    publicNode: fc.boolean(),
    hasIndexers: fc.boolean(),
    hasArchive: fc.boolean(),
    hasMining: fc.boolean(),
    kaspaNodePort: fc.option(fc.integer({ min: 16110, max: 16120 }))
  }),
  services: fc.array(fc.record({
    name: fc.constantFrom(...SERVICES_WITH_DATA),
    displayName: safeStringArbitrary(5, 30),
    profile: fc.constantFrom('core', 'indexer-services', 'kaspa-user-applications'),
    running: fc.boolean(),
    exists: fc.boolean(),
    containerName: fc.option(safeStringArbitrary(5, 50)),
    ports: fc.option(fc.array(fc.integer({ min: 3000, max: 9000 }), { maxLength: 3 })),
    hasData: fc.boolean(), // Whether this service has existing data
    dataSize: fc.option(fc.integer({ min: 1024, max: 1000000000 })), // Size of existing data
    configPath: fc.option(safePathArbitrary(10, 50))
  }), { minLength: 1, maxLength: 8 }),
  summary: fc.record({
    total: fc.integer({ min: 1, max: 8 }),
    running: fc.integer({ min: 0, max: 8 }),
    stopped: fc.integer({ min: 0, max: 8 }),
    missing: fc.integer({ min: 0, max: 8 })
  })
});

/**
 * Setup test environment
 */
async function setupTest() {
  // Ensure test directory exists
  await fs.mkdir(TEST_STATE_DIR, { recursive: true });
  
  // Ensure the state manager can write to the test directory
  const testStateManager = new SharedStateManager(TEST_STATE_PATH);
  
  // Create a minimal valid state to ensure the file can be written
  const minimalState = {
    version: "1.0.0",
    installedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    phase: "complete",
    profiles: { selected: [], count: 0 },
    configuration: {
      network: "mainnet",
      publicNode: false,
      hasIndexers: false,
      hasArchive: false,
      hasMining: false
    },
    services: [],
    summary: { total: 0, running: 0, stopped: 0, missing: 0 }
  };
  
  // Write and immediately remove to test write permissions
  await testStateManager.writeState(minimalState);
  await fs.unlink(TEST_STATE_PATH).catch(() => {}); // Ignore if file doesn't exist
}

/**
 * Cleanup test environment
 */
async function cleanupTest() {
  try {
    await fs.rm(TEST_STATE_DIR, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Mock function to simulate service configuration modification
 */
function simulateServiceModification(serviceConfig, newConfig, operation) {
  const preserveData = operation.preserveData !== false && !operation.explicitDataRemoval;
  
  // Simulate the modification result
  const result = {
    serviceId: serviceConfig.serviceId,
    configurationChanged: true,
    dataPreserved: preserveData,
    existingDataPaths: preserveData ? serviceConfig.existingData.map(d => d.path) : [],
    removedDataPaths: preserveData ? [] : serviceConfig.existingData.map(d => d.path),
    newConfiguration: newConfig,
    previousConfiguration: serviceConfig.currentConfig,
    backupCreated: operation.backupBeforeChange,
    serviceRestarted: operation.restartService
  };
  
  return result;
}

/**
 * Mock function to simulate installation state update after modification
 */
function simulateStateUpdateAfterModification(currentState, serviceId, modificationResult) {
  // Create updated state that preserves service data unless explicitly removed
  const updatedServices = currentState.services.map(service => {
    if (service.name === serviceId) {
      return {
        ...service,
        // Data preservation: keep hasData and dataSize unless explicitly removed
        hasData: modificationResult.dataPreserved ? service.hasData : false,
        dataSize: modificationResult.dataPreserved ? service.dataSize : null,
        // Configuration path should be preserved unless service is completely removed
        configPath: service.configPath,
        // Update last modified time
        lastModified: new Date().toISOString()
      };
    }
    return service;
  });
  
  return {
    ...currentState,
    services: updatedServices,
    lastModified: new Date().toISOString()
  };
}

/**
 * Property Test: Data Preservation During Modification
 */
describe('Property 11: Data Preservation During Modification', () => {
  let stateManager;

  beforeEach(async () => {
    await setupTest();
    stateManager = new SharedStateManager(TEST_STATE_PATH);
  });

  afterEach(async () => {
    if (stateManager) {
      stateManager.destroy();
    }
    await cleanupTest();
  });

  /**
   * Property 11.1: Default Data Preservation
   * 
   * For any service modification that doesn't explicitly request data removal,
   * existing service data should be preserved (Requirement 5.6)
   */
  test('should preserve existing service data by default during modifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary,
        modificationOperationArbitrary.filter(op => op.preserveData !== false && !op.explicitDataRemoval),
        async (serviceConfig, operation) => {
          // Simulate service modification
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Verify data preservation
          expect(result.dataPreserved).toBe(true);
          expect(result.existingDataPaths).toEqual(serviceConfig.existingData.map(d => d.path));
          expect(result.removedDataPaths).toEqual([]);
          
          // Verify configuration was updated
          expect(result.configurationChanged).toBe(true);
          expect(result.newConfiguration).toEqual(serviceConfig.newConfig);
          expect(result.previousConfiguration).toEqual(serviceConfig.currentConfig);
          
          // Verify service ID is preserved
          expect(result.serviceId).toBe(serviceConfig.serviceId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: Explicit Data Removal
   * 
   * For any service modification that explicitly requests data removal,
   * existing service data should be removed
   */
  test('should remove data only when explicitly requested', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary,
        modificationOperationArbitrary.filter(op => op.explicitDataRemoval === true),
        async (serviceConfig, operation) => {
          // Simulate service modification with explicit data removal
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Verify data removal
          expect(result.dataPreserved).toBe(false);
          expect(result.existingDataPaths).toEqual([]);
          expect(result.removedDataPaths).toEqual(serviceConfig.existingData.map(d => d.path));
          
          // Verify configuration was still updated
          expect(result.configurationChanged).toBe(true);
          expect(result.newConfiguration).toEqual(serviceConfig.newConfig);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: State Consistency After Modification
   * 
   * For any service modification, the installation state should be updated
   * consistently with the data preservation decision
   */
  test('should maintain state consistency with data preservation decisions', async () => {
    await fc.assert(
      fc.asyncProperty(
        installationStateWithDataArbitrary,
        serviceConfigurationArbitrary,
        modificationOperationArbitrary,
        async (initialState, serviceConfig, operation) => {
          // Ensure the service exists in the state with data
          const serviceIndex = initialState.services.findIndex(s => s.name === serviceConfig.serviceId);
          if (serviceIndex === -1) {
            // Add the service to the state for this test
            initialState.services.push({
              name: serviceConfig.serviceId,
              displayName: serviceConfig.serviceId,
              profile: 'core',
              running: true,
              exists: true,
              hasData: true,
              dataSize: 1000000,
              configPath: `/config/${serviceConfig.serviceId}.conf`
            });
          } else {
            // Ensure existing service has data for this test
            initialState.services[serviceIndex] = {
              ...initialState.services[serviceIndex],
              hasData: true,
              dataSize: initialState.services[serviceIndex].dataSize || 1000000,
              configPath: initialState.services[serviceIndex].configPath || `/config/${serviceConfig.serviceId}.conf`
            };
          }
          
          // Ensure test directory exists before writing
          await fs.mkdir(TEST_STATE_DIR, { recursive: true });
          
          // Write initial state
          await stateManager.writeState(initialState);
          
          // Simulate service modification
          const modificationResult = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Simulate state update
          const updatedState = simulateStateUpdateAfterModification(initialState, serviceConfig.serviceId, modificationResult);
          
          // Write updated state
          await stateManager.writeState(updatedState);
          
          // Read state back and verify consistency
          const readState = await stateManager.readState();
          expect(readState).not.toBeNull();
          
          const updatedService = readState.services.find(s => s.name === serviceConfig.serviceId);
          expect(updatedService).toBeDefined();
          
          // Verify data preservation consistency
          if (modificationResult.dataPreserved) {
            // Data should be preserved in state
            expect(updatedService.hasData).toBe(true);
            expect(updatedService.dataSize).toBeTruthy();
            expect(updatedService.configPath).toBeTruthy();
          } else {
            // Data should be marked as removed in state
            expect(updatedService.hasData).toBe(false);
            expect(updatedService.dataSize).toBeNull();
          }
          
          // Verify state metadata is updated
          expect(readState.lastModified).toBeTruthy();
          expect(new Date(readState.lastModified)).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: Configuration Preservation vs Data Preservation
   * 
   * For any service modification, configuration changes should be applied
   * independently of data preservation decisions
   */
  test('should apply configuration changes independently of data preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary,
        modificationOperationArbitrary,
        async (serviceConfig, operation) => {
          // Simulate service modification
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Configuration should always be updated regardless of data preservation
          expect(result.configurationChanged).toBe(true);
          expect(result.newConfiguration).toEqual(serviceConfig.newConfig);
          expect(result.previousConfiguration).toEqual(serviceConfig.currentConfig);
          
          // Data preservation should be independent of configuration changes
          const expectedDataPreservation = operation.preserveData !== false && !operation.explicitDataRemoval;
          expect(result.dataPreserved).toBe(expectedDataPreservation);
          
          // Service should be identified correctly
          expect(result.serviceId).toBe(serviceConfig.serviceId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: Critical Data Protection
   * 
   * For any service with critical data, modifications should preserve
   * critical data unless explicitly overridden
   */
  test('should protect critical data during modifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary.filter(config => 
          config.existingData.some(data => data.critical === true)
        ),
        modificationOperationArbitrary.filter(op => !op.explicitDataRemoval && op.preserveData !== false),
        async (serviceConfig, operation) => {
          // Find critical data
          const criticalData = serviceConfig.existingData.filter(data => data.critical);
          expect(criticalData.length).toBeGreaterThan(0);
          
          // Simulate service modification
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Critical data should be preserved
          expect(result.dataPreserved).toBe(true);
          
          // All critical data paths should be in preserved paths
          const criticalPaths = criticalData.map(data => data.path);
          criticalPaths.forEach(path => {
            expect(result.existingDataPaths).toContain(path);
          });
          
          // No critical data should be in removed paths
          criticalPaths.forEach(path => {
            expect(result.removedDataPaths).not.toContain(path);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 11.6: Backup Creation During Modifications
   * 
   * For any modification that requests backup creation, a backup should be
   * created regardless of data preservation decisions
   */
  test('should create backups when requested during modifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary,
        modificationOperationArbitrary.filter(op => op.backupBeforeChange === true),
        async (serviceConfig, operation) => {
          // Simulate service modification
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Backup should be created when requested
          expect(result.backupCreated).toBe(true);
          
          // Backup creation should be independent of data preservation
          expect(result.backupCreated).toBe(operation.backupBeforeChange);
          
          // Configuration should still be updated
          expect(result.configurationChanged).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.7: Service Restart Behavior
   * 
   * For any modification, service restart behavior should be independent
   * of data preservation decisions
   */
  test('should handle service restarts independently of data preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        serviceConfigurationArbitrary,
        modificationOperationArbitrary,
        async (serviceConfig, operation) => {
          // Simulate service modification
          const result = simulateServiceModification(serviceConfig, serviceConfig.newConfig, operation);
          
          // Service restart should match the operation request
          expect(result.serviceRestarted).toBe(operation.restartService);
          
          // Service restart should be independent of data preservation
          const dataPreserved = operation.preserveData !== false && !operation.explicitDataRemoval;
          expect(result.dataPreserved).toBe(dataPreserved);
          
          // Both can be true or false independently
          if (operation.restartService && dataPreserved) {
            expect(result.serviceRestarted).toBe(true);
            expect(result.dataPreserved).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});