const { SharedStateManager } = require('./state-manager.js');
const fs = require('fs/promises');
const path = require('path');
const fc = require('fast-check');

describe('SharedStateManager', () => {
  let stateManager;
  let testStatePath;

  beforeEach(() => {
    // Create a unique test file path for each test
    testStatePath = path.join(__dirname, `test-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
    stateManager = new SharedStateManager(testStatePath);
  });

  afterEach(async () => {
    // Clean up test files and resources
    if (stateManager) {
      stateManager.destroy();
    }
    
    try {
      await fs.unlink(testStatePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  });

  describe('readState', () => {
    test('should return null when state file does not exist', async () => {
      const state = await stateManager.readState();
      expect(state).toBeNull();
    });

    test('should return null when state file is corrupted JSON', async () => {
      await fs.writeFile(testStatePath, 'invalid json content');
      const state = await stateManager.readState();
      expect(state).toBeNull();
    });

    test('should return null when state file is missing required fields', async () => {
      const invalidState = { version: '1.0.0' }; // Missing required fields
      await fs.writeFile(testStatePath, JSON.stringify(invalidState));
      const state = await stateManager.readState();
      expect(state).toBeNull();
    });

    test('should return valid state when file exists and is valid', async () => {
      const validState = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await fs.writeFile(testStatePath, JSON.stringify(validState));
      const state = await stateManager.readState();
      expect(state).toEqual(validState);
    });
  });

  describe('writeState', () => {
    test('should throw error when state is null', async () => {
      await expect(stateManager.writeState(null)).rejects.toThrow('State must be a valid object');
    });

    test('should throw error when state is not an object', async () => {
      await expect(stateManager.writeState('invalid')).rejects.toThrow('State must be a valid object');
    });

    test('should write valid state and update lastModified', async () => {
      const state = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await stateManager.writeState(state);

      // Read back and verify
      const writtenState = await stateManager.readState();
      expect(writtenState).toBeTruthy();
      expect(writtenState.version).toBe('1.0.0');
      expect(writtenState.lastModified).toBeTruthy();
      expect(new Date(writtenState.lastModified)).toBeInstanceOf(Date);
    });
  });

  describe('hasInstallation', () => {
    test('should return false when no state file exists', async () => {
      const hasInstallation = await stateManager.hasInstallation();
      expect(hasInstallation).toBe(false);
    });

    test('should return true when valid state file exists', async () => {
      const validState = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await stateManager.writeState(validState);
      const hasInstallation = await stateManager.hasInstallation();
      expect(hasInstallation).toBe(true);
    });
  });

  describe('updateState', () => {
    test('should throw error when no existing state', async () => {
      await expect(stateManager.updateState({ phase: 'installing' })).rejects.toThrow('Cannot update state: no existing installation state found');
    });

    test('should throw error when updates is not an object', async () => {
      await expect(stateManager.updateState('invalid')).rejects.toThrow('Updates must be a valid object');
    });

    test('should update existing state with new values', async () => {
      // First create a valid state
      const initialState = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await stateManager.writeState(initialState);

      // Update the state
      const updates = {
        phase: 'installing',
        'configuration.hasIndexers': true
      };

      await stateManager.updateState(updates);

      // Verify the update
      const updatedState = await stateManager.readState();
      expect(updatedState.phase).toBe('installing');
      expect(updatedState.lastModified).not.toBe(initialState.lastModified);
    });
  });

  describe('watchState', () => {
    test('should throw error when callback is not a function', () => {
      expect(() => stateManager.watchState('not a function')).toThrow('Callback must be a function');
    });

    test('should return unsubscribe function', () => {
      const callback = () => {};
      const unsubscribe = stateManager.watchState(callback);
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    test('should call callback when state changes', async () => {
      const callbackCalls = [];
      
      const callback = (state, error) => {
        callbackCalls.push({ state, error, timestamp: Date.now() });
      };
      
      const unsubscribe = stateManager.watchState(callback);

      // Create initial state
      const state = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await stateManager.writeState(state);

      // Wait a bit for file watcher to trigger
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify callback was called
      expect(callbackCalls.length).toBeGreaterThan(0);
      
      // Verify the callback received the correct arguments
      const lastCall = callbackCalls[callbackCalls.length - 1];
      expect(lastCall.error).toBeNull();
      expect(lastCall.state).toBeTruthy();
      expect(lastCall.state.version).toBe('1.0.0');
      expect(lastCall.state.phase).toBe('complete');
      
      // Clean up
      unsubscribe();
    }, 10000);

    test('should call multiple callbacks when state changes', async () => {
      const callback1Calls = [];
      const callback2Calls = [];
      
      const callback1 = (state, error) => {
        callback1Calls.push({ state, error });
      };
      
      const callback2 = (state, error) => {
        callback2Calls.push({ state, error });
      };
      
      const unsubscribe1 = stateManager.watchState(callback1);
      const unsubscribe2 = stateManager.watchState(callback2);

      const state = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'complete',
        profiles: {
          selected: ['core'],
          count: 1
        },
        configuration: {
          network: 'mainnet',
          publicNode: false,
          hasIndexers: false,
          hasArchive: false,
          hasMining: false
        },
        services: [],
        summary: {
          total: 0,
          running: 0,
          stopped: 0,
          missing: 0
        }
      };

      await stateManager.writeState(state);

      // Wait for file watcher
      await new Promise(resolve => setTimeout(resolve, 200));

      // Both callbacks should have been called
      expect(callback1Calls.length).toBeGreaterThan(0);
      expect(callback2Calls.length).toBeGreaterThan(0);
      
      // Clean up
      unsubscribe1();
      unsubscribe2();
    }, 10000);

    test('should stop calling callback after unsubscribe', async () => {
      const callbackCalls = [];
      
      const callback = (state, error) => {
        callbackCalls.push({ state, error });
      };
      
      const unsubscribe = stateManager.watchState(callback);

      // Write initial state
      const state1 = {
        version: '1.0.0',
        installedAt: '2025-01-01T00:00:00.000Z',
        lastModified: '2025-01-01T00:00:00.000Z',
        phase: 'installing',
        profiles: { selected: ['core'], count: 1 },
        configuration: { network: 'mainnet', publicNode: false, hasIndexers: false, hasArchive: false, hasMining: false },
        services: [],
        summary: { total: 0, running: 0, stopped: 0, missing: 0 }
      };

      await stateManager.writeState(state1);
      await new Promise(resolve => setTimeout(resolve, 200));

      const callsAfterFirst = callbackCalls.length;
      expect(callsAfterFirst).toBeGreaterThan(0);

      // Unsubscribe
      unsubscribe();

      // Write another state change
      const state2 = { ...state1, phase: 'complete' };
      await stateManager.writeState(state2);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have received additional calls
      expect(callbackCalls.length).toBe(callsAfterFirst);
    }, 10000);
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    describe('Property 1: Installation State Schema Validity', () => {
      test('For any installation state written by the Wizard, it SHALL contain all required fields', async () => {
        // **Feature: wizard-dashboard-unification, Property 1: Installation State Schema Validity**
        // **Validates: Requirements 1.6**
        
        await fc.assert(
          fc.asyncProperty(
            // Generate arbitrary installation states
            fc.record({
              version: fc.string({ minLength: 1 }),
              installedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
              lastModified: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
              phase: fc.constantFrom('pending', 'installing', 'complete', 'error'),
              profiles: fc.record({
                selected: fc.array(fc.string({ minLength: 1 })),
                count: fc.nat()
              }),
              configuration: fc.record({
                network: fc.constantFrom('mainnet', 'testnet'),
                publicNode: fc.boolean(),
                hasIndexers: fc.boolean(),
                hasArchive: fc.boolean(),
                hasMining: fc.boolean(),
                kaspaNodePort: fc.option(fc.integer({ min: 1024, max: 65535 }))
              }),
              services: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                displayName: fc.option(fc.string()),
                profile: fc.string({ minLength: 1 }),
                running: fc.boolean(),
                exists: fc.boolean(),
                containerName: fc.option(fc.string()),
                ports: fc.option(fc.array(fc.integer({ min: 1024, max: 65535 })))
              })),
              summary: fc.record({
                total: fc.nat(),
                running: fc.nat(),
                stopped: fc.nat(),
                missing: fc.nat()
              }),
              wizardRunning: fc.option(fc.boolean())
            }),
            async (generatedState) => {
              // Write the generated state using SharedStateManager
              await stateManager.writeState(generatedState);
              
              // Read it back
              const readState = await stateManager.readState();
              
              // Verify all required fields are present (Requirements 1.6)
              // THE Installation_State SHALL include: version, installedAt, lastModified, phase, 
              // profiles (selected array), configuration, services array, and summary
              
              expect(readState).toBeTruthy();
              
              // Required field: version
              expect(readState).toHaveProperty('version');
              expect(typeof readState.version).toBe('string');
              expect(readState.version.length).toBeGreaterThan(0);
              
              // Required field: installedAt
              expect(readState).toHaveProperty('installedAt');
              expect(typeof readState.installedAt).toBe('string');
              expect(() => new Date(readState.installedAt)).not.toThrow();
              
              // Required field: lastModified
              expect(readState).toHaveProperty('lastModified');
              expect(typeof readState.lastModified).toBe('string');
              expect(() => new Date(readState.lastModified)).not.toThrow();
              
              // Required field: phase
              expect(readState).toHaveProperty('phase');
              expect(['pending', 'installing', 'complete', 'error']).toContain(readState.phase);
              
              // Required field: profiles (with selected array)
              expect(readState).toHaveProperty('profiles');
              expect(readState.profiles).toBeTruthy();
              expect(typeof readState.profiles).toBe('object');
              expect(readState.profiles).toHaveProperty('selected');
              expect(Array.isArray(readState.profiles.selected)).toBe(true);
              expect(readState.profiles).toHaveProperty('count');
              expect(typeof readState.profiles.count).toBe('number');
              
              // Required field: configuration
              expect(readState).toHaveProperty('configuration');
              expect(readState.configuration).toBeTruthy();
              expect(typeof readState.configuration).toBe('object');
              expect(readState.configuration).toHaveProperty('network');
              expect(['mainnet', 'testnet']).toContain(readState.configuration.network);
              expect(readState.configuration).toHaveProperty('publicNode');
              expect(typeof readState.configuration.publicNode).toBe('boolean');
              expect(readState.configuration).toHaveProperty('hasIndexers');
              expect(typeof readState.configuration.hasIndexers).toBe('boolean');
              expect(readState.configuration).toHaveProperty('hasArchive');
              expect(typeof readState.configuration.hasArchive).toBe('boolean');
              expect(readState.configuration).toHaveProperty('hasMining');
              expect(typeof readState.configuration.hasMining).toBe('boolean');
              
              // Required field: services array
              expect(readState).toHaveProperty('services');
              expect(Array.isArray(readState.services)).toBe(true);
              
              // Required field: summary
              expect(readState).toHaveProperty('summary');
              expect(readState.summary).toBeTruthy();
              expect(typeof readState.summary).toBe('object');
              expect(readState.summary).toHaveProperty('total');
              expect(typeof readState.summary.total).toBe('number');
              expect(readState.summary).toHaveProperty('running');
              expect(typeof readState.summary.running).toBe('number');
              expect(readState.summary).toHaveProperty('stopped');
              expect(typeof readState.summary.stopped).toBe('number');
              expect(readState.summary).toHaveProperty('missing');
              expect(typeof readState.summary.missing).toBe('number');
            }
          ),
          { numRuns: 100 } // Run 100 iterations as specified in design document
        );
      }, 30000); // Increase timeout for property-based test
    });
  });
});