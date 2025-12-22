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
      expect(graph.has('dashboard')).toBe(true);
      
      // Check dependencies
      const dashboardDeps = graph.get('dashboard');
      expect(dashboardDeps.dependencies).toContain('kaspa-node');
      
      // Check dependents (reverse dependencies)
      const kaspaNodeDeps = graph.get('kaspa-node');
      expect(kaspaNodeDeps.dependents).toContain('dashboard');
    });
  });

  describe('topologicalSort', () => {
    it('should sort services in dependency order', () => {
      const services = ['nginx', 'dashboard', 'kaspa-node'];
      const sorted = serviceMonitor.topologicalSort(services);
      
      // kaspa-node should come before dashboard
      const kaspaIndex = sorted.indexOf('kaspa-node');
      const dashboardIndex = sorted.indexOf('dashboard');
      expect(kaspaIndex).toBeLessThan(dashboardIndex);
      
      // dashboard should come before nginx
      const nginxIndex = sorted.indexOf('nginx');
      expect(dashboardIndex).toBeLessThan(nginxIndex);
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
    it('should return dependencies for a service', () => {
      const deps = serviceMonitor.getDependencies('dashboard');
      expect(deps).toContain('kaspa-node');
    });

    it('should return empty array for service with no dependencies', () => {
      const deps = serviceMonitor.getDependencies('kaspa-node');
      expect(deps).toEqual([]);
    });

    it('should return empty array for unknown service', () => {
      const deps = serviceMonitor.getDependencies('unknown-service');
      expect(deps).toEqual([]);
    });
  });

  describe('getDependents', () => {
    it('should return dependents for a service', () => {
      const dependents = serviceMonitor.getDependents('kaspa-node');
      expect(dependents.length).toBeGreaterThan(0);
      expect(dependents).toContain('dashboard');
    });

    it('should return empty array for service with no dependents', () => {
      const dependents = serviceMonitor.getDependents('nginx');
      expect(dependents).toEqual([]);
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await serviceMonitor.sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});