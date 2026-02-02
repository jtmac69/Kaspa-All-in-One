const ServiceMonitor = require('../ServiceMonitor');

describe('ServiceMonitor', () => {
  let serviceMonitor;

  beforeEach(() => {
    serviceMonitor = new ServiceMonitor();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(serviceMonitor.checkInterval).toBe(5000);
      expect(serviceMonitor.retryAttempts).toBe(3);
      expect(serviceMonitor.serviceDefinitions).toBeDefined();
      expect(serviceMonitor.dependencyGraph).toBeDefined();
    });

    it('should build dependency graph correctly', () => {
      const graph = serviceMonitor.dependencyGraph;
      expect(graph.has('kaspa-node')).toBe(true);
      expect(graph.has('kasia-app')).toBe(true);
      expect(graph.has('k-social')).toBe(true);
      
      // Check kaspa-explorer depends on simply-kaspa-indexer
      const explorerDeps = graph.get('kaspa-explorer');
      expect(explorerDeps.dependencies).toContain('simply-kaspa-indexer');
      
      // Check simply-kaspa-indexer has kaspa-explorer as dependent
      const indexerDeps = graph.get('simply-kaspa-indexer');
      expect(indexerDeps.dependents).toContain('kaspa-explorer');
    });
  });

  describe('topologicalSort', () => {
    it('should sort services in dependency order', () => {
      const services = ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'];
      const sorted = serviceMonitor.topologicalSort(services);
      
      // timescaledb-explorer should come before simply-kaspa-indexer
      const dbIndex = sorted.indexOf('timescaledb-explorer');
      const indexerIndex = sorted.indexOf('simply-kaspa-indexer');
      expect(dbIndex).toBeLessThan(indexerIndex);
      
      // simply-kaspa-indexer should come before kaspa-explorer
      const explorerIndex = sorted.indexOf('kaspa-explorer');
      expect(indexerIndex).toBeLessThan(explorerIndex);
    });

    it('should handle services with no dependencies', () => {
      const services = ['kaspa-node'];
      const sorted = serviceMonitor.topologicalSort(services);
      expect(sorted).toEqual(['kaspa-node']);
    });

    it('should throw error on circular dependencies', () => {
      // Temporarily modify dependency graph to create circular dependency
      const originalGraph = serviceMonitor.dependencyGraph;
      serviceMonitor.dependencyGraph = new Map([
        ['service-a', { dependencies: ['service-b'], dependents: [] }],
        ['service-b', { dependencies: ['service-a'], dependents: [] }]
      ]);

      expect(() => {
        serviceMonitor.topologicalSort(['service-a', 'service-b']);
      }).toThrow('Circular dependency detected');

      // Restore original graph
      serviceMonitor.dependencyGraph = originalGraph;
    });
  });

  describe('getDependencies', () => {
    it('should return dependencies for service', () => {
      const deps = serviceMonitor.getDependencies('kaspa-explorer');
      expect(deps).toContain('simply-kaspa-indexer');
    });

    it('should return empty array for service with no dependencies', () => {
      const deps = serviceMonitor.getDependencies('kaspa-node');
      expect(deps).toEqual([]);
    });
  });

  describe('getDependents', () => {
    it('should return dependents for service', () => {
      const dependents = serviceMonitor.getDependents('simply-kaspa-indexer');
      expect(dependents).toContain('kaspa-explorer');
    });

    it('should return empty array for service with no dependents', () => {
      const dependents = serviceMonitor.getDependents('kasia-app');
      expect(dependents).toEqual([]);
    });
  });

  describe('getServicesByProfile', () => {
    it('should return services for new profile IDs', () => {
      const kaspaNodeServices = serviceMonitor.getServicesByProfile('kaspa-node');
      expect(kaspaNodeServices.some(s => s.name === 'kaspa-node')).toBe(true);
      
      const kasiaAppServices = serviceMonitor.getServicesByProfile('kasia-app');
      expect(kasiaAppServices.some(s => s.name === 'kasia-app')).toBe(true);
      
      const explorerServices = serviceMonitor.getServicesByProfile('kaspa-explorer-bundle');
      expect(explorerServices.some(s => s.name === 'kaspa-explorer')).toBe(true);
      expect(explorerServices.some(s => s.name === 'simply-kaspa-indexer')).toBe(true);
      expect(explorerServices.some(s => s.name === 'timescaledb-explorer')).toBe(true);
    });

    it('should handle legacy profile IDs via migration', () => {
      // 'core' should migrate to 'kaspa-node'
      const coreServices = serviceMonitor.getServicesByProfile('core');
      expect(coreServices.some(s => s.name === 'kaspa-node')).toBe(true);
      
      // 'mining' should migrate to 'kaspa-stratum'
      const miningServices = serviceMonitor.getServicesByProfile('mining');
      expect(miningServices.some(s => s.name === 'kaspa-stratum')).toBe(true);
      
      // 'kaspa-user-applications' should migrate to multiple profiles
      const appServices = serviceMonitor.getServicesByProfile('kaspa-user-applications');
      expect(appServices.some(s => s.name === 'kasia-app')).toBe(true);
      expect(appServices.some(s => s.name === 'k-social')).toBe(true);
    });

    it('should return services for k-indexer-bundle profile', () => {
      const kindexerServices = serviceMonitor.getServicesByProfile('k-indexer-bundle');
      expect(kindexerServices.some(s => s.name === 'k-indexer')).toBe(true);
      expect(kindexerServices.some(s => s.name === 'timescaledb-kindexer')).toBe(true);
    });

    it('should return services for kasia-indexer profile', () => {
      const kasiaIndexerServices = serviceMonitor.getServicesByProfile('kasia-indexer');
      expect(kasiaIndexerServices.some(s => s.name === 'kasia-indexer')).toBe(true);
    });

    it('should return services for kaspa-stratum profile', () => {
      const stratumServices = serviceMonitor.getServicesByProfile('kaspa-stratum');
      expect(stratumServices.some(s => s.name === 'kaspa-stratum')).toBe(true);
    });

    it('should return services for kaspa-archive-node profile', () => {
      const archiveServices = serviceMonitor.getServicesByProfile('kaspa-archive-node');
      expect(archiveServices.some(s => s.name === 'kaspa-archive-node')).toBe(true);
    });
  });

  describe('service definitions', () => {
    it('should have all 8 profile types represented', () => {
      const definitions = serviceMonitor.serviceDefinitions;
      const profiles = new Set(definitions.map(d => d.profile));
      
      expect(profiles.has('kaspa-node')).toBe(true);
      expect(profiles.has('kasia-app')).toBe(true);
      expect(profiles.has('k-social-app')).toBe(true);
      expect(profiles.has('kaspa-explorer-bundle')).toBe(true);
      expect(profiles.has('kasia-indexer')).toBe(true);
      expect(profiles.has('k-indexer-bundle')).toBe(true);
      expect(profiles.has('kaspa-archive-node')).toBe(true);
      expect(profiles.has('kaspa-stratum')).toBe(true);
    });

    it('should have correct container names for k-social (not k-social-app)', () => {
      const definitions = serviceMonitor.serviceDefinitions;
      const kSocialDef = definitions.find(d => d.name === 'k-social');
      
      expect(kSocialDef).toBeDefined();
      expect(kSocialDef.profile).toBe('k-social-app');
      // Container name is 'k-social' but profile ID is 'k-social-app'
    });

    it('should have bundle profiles with multiple services', () => {
      const definitions = serviceMonitor.serviceDefinitions;
      
      // Explorer bundle should have 3 services
      const explorerServices = definitions.filter(d => d.profile === 'kaspa-explorer-bundle');
      expect(explorerServices.length).toBe(3);
      
      // K-Indexer bundle should have 2 services
      const kindexerServices = definitions.filter(d => d.profile === 'k-indexer-bundle');
      expect(kindexerServices.length).toBe(2);
    });

    it('should have correct health check paths', () => {
      const definitions = serviceMonitor.serviceDefinitions;
      
      // HTTP services should have health check paths
      const kasiaApp = definitions.find(d => d.name === 'kasia-app');
      expect(kasiaApp.healthCheckPath).toBe('/health');
      
      // gRPC services should have null health check path
      const kaspaNode = definitions.find(d => d.name === 'kaspa-node');
      expect(kaspaNode.healthCheckPath).toBeNull();
    });

    it('should have critical flag set correctly', () => {
      const definitions = serviceMonitor.serviceDefinitions;
      
      // Node services should be critical
      const kaspaNode = definitions.find(d => d.name === 'kaspa-node');
      expect(kaspaNode.critical).toBe(true);
      
      // App services should not be critical
      const kasiaApp = definitions.find(d => d.name === 'kasia-app');
      expect(kasiaApp.critical).toBe(false);
    });
  });

  describe('PROFILE_MIGRATION constant', () => {
    it('should have migration mappings for all legacy profiles', () => {
      const migration = ServiceMonitor.PROFILE_MIGRATION;
      
      expect(migration['core']).toBe('kaspa-node');
      expect(migration['archive-node']).toBe('kaspa-archive-node');
      expect(migration['mining']).toBe('kaspa-stratum');
      expect(migration['kaspa-user-applications']).toEqual(expect.arrayContaining(['kasia-app', 'k-social-app']));
      expect(migration['indexer-services']).toEqual(expect.arrayContaining(['kasia-indexer', 'k-indexer-bundle']));
    });
  });
});
