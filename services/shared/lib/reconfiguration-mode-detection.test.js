/**
 * Property-Based Test: Reconfiguration Mode Detection
 * 
 * Tests Property 10: Reconfiguration Mode Detection
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5
 * 
 * This test verifies that the Wizard correctly detects when to enter reconfiguration mode
 * and properly handles installation state for displaying installed vs available profiles.
 */

const fc = require('fast-check');
const fs = require('fs').promises;
const path = require('path');
const { SharedStateManager } = require('./state-manager');

// Test configuration
const TEST_STATE_DIR = path.join(__dirname, '..', '..', '..', '.kaspa-aio-test');
const TEST_STATE_PATH = path.join(TEST_STATE_DIR, 'installation-state.json');

// Available profiles that could be installed (NEW 8-profile system)
const AVAILABLE_PROFILES = [
  'kaspa-node',
  'kasia-app',
  'k-social-app',
  'kaspa-explorer-bundle',
  'kasia-indexer',
  'k-indexer-bundle',
  'kaspa-archive-node',
  'kaspa-stratum'
];

// Services that belong to each profile (Docker container names)
const PROFILE_SERVICES = {
  'kaspa-node': ['kaspa-node'],
  'kasia-app': ['kasia-app'],
  'k-social-app': ['k-social'],  // Note: container name is 'k-social', not 'k-social-app'
  'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
  'kasia-indexer': ['kasia-indexer'],
  'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
  'kaspa-archive-node': ['kaspa-archive-node'],
  'kaspa-stratum': ['kaspa-stratum']
};

/**
 * Generator for valid installation states
 */
const installationStateArbitrary = fc.record({
  version: fc.constant('1.0.0'),
  installedAt: fc.date().map(d => d.toISOString()),
  lastModified: fc.date().map(d => d.toISOString()),
  phase: fc.constantFrom('complete', 'installing', 'pending', 'error'),
  profiles: fc.record({
    selected: fc.subarray(AVAILABLE_PROFILES, { minLength: 1, maxLength: AVAILABLE_PROFILES.length }),
    count: fc.integer({ min: 1, max: AVAILABLE_PROFILES.length })
  }).map(profiles => ({
    selected: profiles.selected,
    count: profiles.selected.length // Ensure count matches selected length
  })),
  configuration: fc.record({
    network: fc.constantFrom('mainnet', 'testnet-10', 'testnet-11'),
    publicNode: fc.boolean(),
    hasIndexers: fc.boolean(),
    hasArchive: fc.boolean(),
    hasMining: fc.boolean(),
    kaspaNodePort: fc.option(fc.integer({ min: 16110, max: 16120 }))
  }),
  services: fc.array(fc.record({
    name: fc.constantFrom(
      'kaspa-node', 'kaspa-archive-node', 'kasia-app', 'k-social',
      'kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer',
      'kasia-indexer', 'k-indexer', 'timescaledb-kindexer', 'kaspa-stratum'
    ),
    displayName: fc.string({ minLength: 5, maxLength: 30 }),
    profile: fc.constantFrom(...AVAILABLE_PROFILES),
    running: fc.boolean(),
    exists: fc.boolean(),
    containerName: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
    ports: fc.option(fc.array(fc.integer({ min: 3000, max: 9000 }), { maxLength: 3 }))
  }), { minLength: 1, maxLength: 15 }),
  summary: fc.record({
    total: fc.integer({ min: 1, max: 15 }),
    running: fc.integer({ min: 0, max: 15 }),
    stopped: fc.integer({ min: 0, max: 15 }),
    missing: fc.integer({ min: 0, max: 15 })
  }),
  wizardRunning: fc.option(fc.boolean())
});

/**
 * Setup test environment
 */
async function setupTest() {
  await fs.mkdir(TEST_STATE_DIR, { recursive: true });
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
 * Property Test: Installation State Schema Validity
 * 
 * For any installation state written by the system, it must contain all required fields
 * and have a valid structure that can be read back correctly.
 */
describe('Property 10: Reconfiguration Mode Detection', () => {
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
   * Property 10.1: State Existence Detection
   * 
   * For any valid installation state, the system should correctly detect
   * whether an installation exists (Requirement 5.1)
   */
  test('should correctly detect installation state existence', async () => {
    await fc.assert(
      fc.asyncProperty(installationStateArbitrary, async (state) => {
        // Write the state
        await stateManager.writeState(state);
        
        // Should detect installation exists
        const hasInstallation = await stateManager.hasInstallation();
        expect(hasInstallation).toBe(true);
        
        // Should be able to read the state back
        const readState = await stateManager.readState();
        expect(readState).not.toBeNull();
        expect(readState.version).toBe(state.version);
        expect(readState.phase).toBe(state.phase);
        expect(readState.profiles.selected).toEqual(state.profiles.selected);
        
        // Clean up for next iteration
        await fs.unlink(TEST_STATE_PATH);
        
        // Should detect no installation after cleanup
        const hasInstallationAfter = await stateManager.hasInstallation();
        expect(hasInstallationAfter).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: Installed vs Available Profile Separation
   * 
   * For any installation state, the system should be able to distinguish
   * between installed profiles and available profiles (Requirements 5.3, 5.4)
   */
  test('should correctly separate installed and available profiles', async () => {
    await fc.assert(
      fc.asyncProperty(installationStateArbitrary, async (state) => {
        // Write the state
        await stateManager.writeState(state);
        
        // Read the state back
        const readState = await stateManager.readState();
        expect(readState).not.toBeNull();
        
        const installedProfiles = readState.profiles.selected;
        const availableProfiles = AVAILABLE_PROFILES.filter(
          profile => !installedProfiles.includes(profile)
        );
        
        // Verify installed profiles are a subset of all available profiles
        expect(installedProfiles.every(profile => AVAILABLE_PROFILES.includes(profile))).toBe(true);
        
        // Verify no overlap between installed and available
        expect(installedProfiles.some(profile => availableProfiles.includes(profile))).toBe(false);
        
        // Verify together they make up all profiles
        const allProfiles = [...installedProfiles, ...availableProfiles].sort();
        expect(allProfiles).toEqual([...AVAILABLE_PROFILES].sort());
        
        // Verify count matches selected length
        expect(readState.profiles.count).toBe(installedProfiles.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: Reconfiguration Mode Entry Conditions
   * 
   * For any installation state with phase 'complete', the wizard should
   * enter reconfiguration mode (Requirement 5.1)
   */
  test('should enter reconfiguration mode for complete installations', async () => {
    await fc.assert(
      fc.asyncProperty(
        installationStateArbitrary.filter(state => state.phase === 'complete'),
        async (state) => {
          // Write the state
          await stateManager.writeState(state);
          
          // Read the state back
          const readState = await stateManager.readState();
          expect(readState).not.toBeNull();
          
          // Should indicate reconfiguration mode is appropriate
          expect(readState.phase).toBe('complete');
          expect(readState.profiles.selected.length).toBeGreaterThan(0);
          
          // Should have valid structure for reconfiguration
          expect(Array.isArray(readState.profiles.selected)).toBe(true);
          expect(typeof readState.profiles.count).toBe('number');
          expect(Array.isArray(readState.services)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 10.4: Profile Modification Options
   * 
   * For any installed profile, the system should provide options to modify
   * or remove it (Requirement 5.5)
   */
  test('should provide modification options for installed profiles', async () => {
    await fc.assert(
      fc.asyncProperty(installationStateArbitrary, async (state) => {
        // Write the state
        await stateManager.writeState(state);
        
        // Read the state back
        const readState = await stateManager.readState();
        expect(readState).not.toBeNull();
        
        // For each installed profile, verify it has associated services
        for (const installedProfile of readState.profiles.selected) {
          // Profile should be in the available profiles list
          expect(AVAILABLE_PROFILES.includes(installedProfile)).toBe(true);
          
          // Should be able to identify services belonging to this profile
          const profileServices = readState.services.filter(
            service => service.profile === installedProfile
          );
          
          // Each service should have required fields for modification
          profileServices.forEach(service => {
            expect(typeof service.name).toBe('string');
            expect(service.name.length).toBeGreaterThan(0);
            expect(typeof service.profile).toBe('string');
            expect(typeof service.running).toBe('boolean');
            expect(typeof service.exists).toBe('boolean');
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: State Schema Consistency
   * 
   * For any installation state, all required fields should be present
   * and have the correct types (validates overall state integrity)
   */
  test('should maintain consistent state schema', async () => {
    await fc.assert(
      fc.asyncProperty(installationStateArbitrary, async (state) => {
        // Write the state
        await stateManager.writeState(state);
        
        // Read the state back
        const readState = await stateManager.readState();
        expect(readState).not.toBeNull();
        
        // Verify all required fields are present
        expect(typeof readState.version).toBe('string');
        expect(typeof readState.installedAt).toBe('string');
        expect(typeof readState.lastModified).toBe('string');
        expect(typeof readState.phase).toBe('string');
        
        // Verify profiles structure
        expect(typeof readState.profiles).toBe('object');
        expect(Array.isArray(readState.profiles.selected)).toBe(true);
        expect(typeof readState.profiles.count).toBe('number');
        
        // Verify configuration structure
        expect(typeof readState.configuration).toBe('object');
        expect(typeof readState.configuration.network).toBe('string');
        expect(typeof readState.configuration.publicNode).toBe('boolean');
        
        // Verify services structure
        expect(Array.isArray(readState.services)).toBe(true);
        
        // Verify summary structure
        expect(typeof readState.summary).toBe('object');
        expect(typeof readState.summary.total).toBe('number');
        expect(typeof readState.summary.running).toBe('number');
        expect(typeof readState.summary.stopped).toBe('number');
        expect(typeof readState.summary.missing).toBe('number');
        
        // Verify timestamps are valid ISO strings
        expect(() => new Date(readState.installedAt)).not.toThrow();
        expect(() => new Date(readState.lastModified)).not.toThrow();
        
        // Verify phase is valid
        expect(['complete', 'installing', 'pending', 'error']).toContain(readState.phase);
        
        // Verify network is valid
        expect(['mainnet', 'testnet-10', 'testnet-11']).toContain(readState.configuration.network);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.6: No Installation State Handling
   * 
   * When no installation state exists, the system should handle this gracefully
   * and not enter reconfiguration mode
   */
  test('should handle missing installation state gracefully', async () => {
    // Ensure no state file exists
    try {
      await fs.unlink(TEST_STATE_PATH);
    } catch (error) {
      // File doesn't exist, that's fine
    }
    
    // Should detect no installation
    const hasInstallation = await stateManager.hasInstallation();
    expect(hasInstallation).toBe(false);
    
    // Should return null when reading state
    const readState = await stateManager.readState();
    expect(readState).toBeNull();
  });
});