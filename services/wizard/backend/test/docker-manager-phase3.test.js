/**
 * Phase 3 DockerManager Tests
 * 
 * Tests for the updated DockerManager with new 8-profile architecture
 */

const DockerManager = require('../src/utils/docker-manager');

describe('DockerManager Phase 3: Profile Container Mapping', () => {
  let dockerManager;
  
  beforeEach(() => {
    dockerManager = new DockerManager();
  });

  describe('New Profile IDs', () => {
    test('kaspa-node maps to kaspa-node container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-node']);
      expect(containers).toEqual(['kaspa-node']);
    });

    test('kasia-app maps to kasia-app container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kasia-app']);
      expect(containers).toEqual(['kasia-app']);
    });

    test('k-social-app maps to k-social container (NOT k-social-app)', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['k-social-app']);
      expect(containers).toEqual(['k-social']);
      expect(containers).not.toContain('k-social-app');
    });

    test('kaspa-explorer-bundle maps to 3 containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-explorer-bundle']);
      expect(containers).toHaveLength(3);
      expect(containers).toContain('kaspa-explorer');
      expect(containers).toContain('simply-kaspa-indexer');
      expect(containers).toContain('timescaledb-explorer');
    });

    test('kasia-indexer maps to kasia-indexer container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kasia-indexer']);
      expect(containers).toEqual(['kasia-indexer']);
    });

    test('k-indexer-bundle maps to 2 containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['k-indexer-bundle']);
      expect(containers).toHaveLength(2);
      expect(containers).toContain('k-indexer');
      expect(containers).toContain('timescaledb-kindexer');
    });

    test('kaspa-archive-node maps to kaspa-archive-node container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-archive-node']);
      expect(containers).toEqual(['kaspa-archive-node']);
    });

    test('kaspa-stratum maps to kaspa-stratum container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-stratum']);
      expect(containers).toEqual(['kaspa-stratum']);
    });
  });

  describe('Legacy Profile IDs (Backward Compatibility)', () => {
    test('core maps to kaspa-node container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['core']);
      expect(containers).toEqual(['kaspa-node']);
    });

    test('kaspa-user-applications maps to 3 containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-user-applications']);
      expect(containers).toHaveLength(3);
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('k-social');
      expect(containers).toContain('kaspa-explorer');
    });

    test('indexer-services maps to 5 containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['indexer-services']);
      expect(containers).toHaveLength(5);
      expect(containers).toContain('kasia-indexer');
      expect(containers).toContain('k-indexer');
      expect(containers).toContain('simply-kaspa-indexer');
      expect(containers).toContain('timescaledb-kindexer');
      expect(containers).toContain('timescaledb-explorer');
    });

    test('archive-node maps to kaspa-archive-node container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['archive-node']);
      expect(containers).toEqual(['kaspa-archive-node']);
    });

    test('mining maps to kaspa-stratum container', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['mining']);
      expect(containers).toEqual(['kaspa-stratum']);
    });
  });

  describe('Multiple Profiles', () => {
    test('Multiple new profiles return unique containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kasia-app',
        'k-social-app'
      ]);
      
      expect(containers).toHaveLength(3);
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('k-social');
    });

    test('Duplicate profiles do not create duplicate containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'core'  // Both map to kaspa-node
      ]);
      
      expect(containers).toEqual(['kaspa-node']);
    });

    test('Mixed new and legacy profiles work together', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kaspa-user-applications'
      ]);
      
      expect(containers).toHaveLength(4);
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('k-social');
      expect(containers).toContain('kaspa-explorer');
    });

    test('Complex template with overlapping profiles', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kasia-app',
        'kasia-indexer',
        'k-social-app',
        'k-indexer-bundle',
        'kaspa-explorer-bundle'
      ]);
      
      // Should have all unique containers
      const uniqueContainers = new Set(containers);
      expect(containers.length).toBe(uniqueContainers.size);
      
      // Verify key containers present
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('kasia-indexer');
      expect(containers).toContain('k-social');
      expect(containers).toContain('k-indexer');
      expect(containers).toContain('timescaledb-kindexer');
      expect(containers).toContain('kaspa-explorer');
      expect(containers).toContain('simply-kaspa-indexer');
      expect(containers).toContain('timescaledb-explorer');
    });
  });

  describe('Error Handling', () => {
    test('Unknown profile logs warning and returns empty for that profile', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const containers = dockerManager.getContainerNamesForProfiles(['invalid-profile']);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown profile ID in DockerManager: invalid-profile')
      );
      expect(containers).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    test('Mix of valid and invalid profiles returns valid containers', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'invalid-profile',
        'kasia-app'
      ]);
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(containers).toHaveLength(2);
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      
      consoleSpy.mockRestore();
    });

    test('Empty profiles array returns empty containers', () => {
      const containers = dockerManager.getContainerNamesForProfiles([]);
      expect(containers).toEqual([]);
    });
  });

  describe('PROFILE_CONTAINER_MAP Structure', () => {
    test('PROFILE_CONTAINER_MAP is defined', () => {
      expect(dockerManager.PROFILE_CONTAINER_MAP).toBeDefined();
      expect(typeof dockerManager.PROFILE_CONTAINER_MAP).toBe('object');
    });

    test('All new profile IDs are in PROFILE_CONTAINER_MAP', () => {
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
      
      newProfiles.forEach(profile => {
        expect(dockerManager.PROFILE_CONTAINER_MAP[profile]).toBeDefined();
        expect(Array.isArray(dockerManager.PROFILE_CONTAINER_MAP[profile])).toBe(true);
      });
    });

    test('All legacy profile IDs are in PROFILE_CONTAINER_MAP', () => {
      const legacyProfiles = [
        'core',
        'kaspa-user-applications',
        'indexer-services',
        'archive-node',
        'mining'
      ];
      
      legacyProfiles.forEach(profile => {
        expect(dockerManager.PROFILE_CONTAINER_MAP[profile]).toBeDefined();
        expect(Array.isArray(dockerManager.PROFILE_CONTAINER_MAP[profile])).toBe(true);
      });
    });

    test('k-social-app maps to k-social (critical mapping)', () => {
      expect(dockerManager.PROFILE_CONTAINER_MAP['k-social-app']).toEqual(['k-social']);
    });
  });

  describe('Integration with ConfigGenerator', () => {
    test('Container names match ConfigGenerator service names', () => {
      // These should match the service names generated by ConfigGenerator
      const allContainers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kasia-app',
        'k-social-app',
        'kaspa-explorer-bundle',
        'kasia-indexer',
        'k-indexer-bundle',
        'kaspa-archive-node',
        'kaspa-stratum'
      ]);
      
      // Verify all expected containers are present
      const expectedContainers = [
        'kaspa-node',
        'kasia-app',
        'k-social',
        'kaspa-explorer',
        'simply-kaspa-indexer',
        'timescaledb-explorer',
        'kasia-indexer',
        'k-indexer',
        'timescaledb-kindexer',
        'kaspa-archive-node',
        'kaspa-stratum'
      ];
      
      expectedContainers.forEach(container => {
        expect(allContainers).toContain(container);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    test('Scenario: Personal Node', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-node']);
      expect(containers).toEqual(['kaspa-node']);
    });

    test('Scenario: Productivity Suite', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kasia-app',
        'k-social-app'
      ]);
      
      expect(containers).toHaveLength(3);
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('k-social');
    });

    test('Scenario: Kaspa Sovereignty (full stack)', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kasia-app',
        'kasia-indexer',
        'k-social-app',
        'k-indexer-bundle',
        'kaspa-explorer-bundle'
      ]);
      
      // Should have 9 unique containers
      expect(containers.length).toBeGreaterThanOrEqual(9);
      
      // Verify all key services
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kasia-app');
      expect(containers).toContain('kasia-indexer');
      expect(containers).toContain('k-social');
      expect(containers).toContain('k-indexer');
      expect(containers).toContain('timescaledb-kindexer');
      expect(containers).toContain('kaspa-explorer');
      expect(containers).toContain('simply-kaspa-indexer');
      expect(containers).toContain('timescaledb-explorer');
    });

    test('Scenario: Mining Setup', () => {
      const containers = dockerManager.getContainerNamesForProfiles([
        'kaspa-node',
        'kaspa-stratum'
      ]);
      
      expect(containers).toHaveLength(2);
      expect(containers).toContain('kaspa-node');
      expect(containers).toContain('kaspa-stratum');
    });

    test('Scenario: Archive Node', () => {
      const containers = dockerManager.getContainerNamesForProfiles(['kaspa-archive-node']);
      expect(containers).toEqual(['kaspa-archive-node']);
    });
  });
});

// Export for standalone execution
if (require.main === module) {
  console.log('Running DockerManager Phase 3 tests...');
  console.log('Use Jest to run these tests: npm test test/docker-manager-phase3.test.js');
}

module.exports = { DockerManager };
