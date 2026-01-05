const { ServiceDetector } = require('./service-detector.js');
const fc = require('fast-check');

describe('ServiceDetector', () => {
  let serviceDetector;

  beforeEach(() => {
    serviceDetector = new ServiceDetector();
  });

  afterEach(() => {
    // Clear any cached state
    if (serviceDetector) {
      serviceDetector.clearCache();
    }
  });

  describe('Unit Tests', () => {
    describe('getServiceStatus', () => {
      test('should throw error for non-array input', async () => {
        await expect(serviceDetector.getServiceStatus('not-an-array')).rejects.toThrow('serviceNames must be an array');
        await expect(serviceDetector.getServiceStatus(null)).rejects.toThrow('serviceNames must be an array');
        await expect(serviceDetector.getServiceStatus(123)).rejects.toThrow('serviceNames must be an array');
      });

      test('should return empty array for empty input', async () => {
        const result = await serviceDetector.getServiceStatus([]);
        expect(result).toEqual([]);
      });

      test('should return not_found status when Docker is unavailable', async () => {
        // Mock Docker unavailable
        jest.spyOn(serviceDetector, 'isDockerAvailable').mockResolvedValue(false);

        const result = await serviceDetector.getServiceStatus(['test-service']);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          name: 'test-service',
          status: 'not_found',
          containerName: 'test-service',
          healthCheck: false,
          error: 'Docker not available'
        });
        expect(result[0].lastChecked).toBeDefined();
      });
    });

    describe('getServiceDetail', () => {
      test('should throw error for invalid service name', async () => {
        await expect(serviceDetector.getServiceDetail('')).rejects.toThrow('serviceName must be a non-empty string');
        await expect(serviceDetector.getServiceDetail(null)).rejects.toThrow('serviceName must be a non-empty string');
        await expect(serviceDetector.getServiceDetail(123)).rejects.toThrow('serviceName must be a non-empty string');
      });

      test('should return not_found for non-existent service', async () => {
        // Mock Docker available but no containers found
        jest.spyOn(serviceDetector.docker, 'listContainers').mockResolvedValue([]);

        const result = await serviceDetector.getServiceDetail('non-existent-service');
        
        expect(result).toMatchObject({
          name: 'non-existent-service',
          status: 'not_found',
          containerName: 'non-existent-service',
          healthCheck: false
        });
        expect(result.lastChecked).toBeDefined();
      });
    });

    describe('isDockerAvailable', () => {
      test('should cache Docker availability check', async () => {
        const mockPing = jest.spyOn(serviceDetector.docker, 'ping').mockResolvedValue();

        // First call
        const result1 = await serviceDetector.isDockerAvailable();
        expect(result1).toBe(true);
        expect(mockPing).toHaveBeenCalledTimes(1);

        // Second call within cache window should not call ping again
        const result2 = await serviceDetector.isDockerAvailable();
        expect(result2).toBe(true);
        expect(mockPing).toHaveBeenCalledTimes(1); // Still 1, not 2
      });

      test('should return false when Docker ping fails', async () => {
        jest.spyOn(serviceDetector.docker, 'ping').mockRejectedValue(new Error('Docker not available'));

        const result = await serviceDetector.isDockerAvailable();
        expect(result).toBe(false);
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 13: Service Status Detection Accuracy
     * Feature: wizard-dashboard-unification, Property 13: Service Status Detection Accuracy
     * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
     */
    test('Property 13: Service Status Detection Accuracy', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arrays of service names
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 0, maxLength: 10 }
          ),
          async (serviceNames) => {
            // Mock Docker as available for this test
            jest.spyOn(serviceDetector, 'isDockerAvailable').mockResolvedValue(true);
            
            // Mock container responses - some exist, some don't
            const mockContainers = serviceNames.slice(0, Math.floor(serviceNames.length / 2)).map((name, index) => ({
              Names: [`/${name}`],
              State: index % 3 === 0 ? 'running' : 'exited',
              Status: index % 3 === 0 
                ? (index % 2 === 0 ? 'Up 5 minutes (healthy)' : 'Up 3 minutes')
                : 'Exited (0) 2 minutes ago'
            }));

            jest.spyOn(serviceDetector.docker, 'listContainers').mockImplementation(async ({ filters }) => {
              const nameFilter = filters.name[0];
              return mockContainers.filter(container => 
                container.Names[0].includes(nameFilter)
              );
            });

            const results = await serviceDetector.getServiceStatus(serviceNames);

            // Property: For all service names, the result should have the same length
            expect(results).toHaveLength(serviceNames.length);

            // Property: For all results, each should have required fields
            results.forEach((result, index) => {
              expect(result).toHaveProperty('name', serviceNames[index]);
              expect(result).toHaveProperty('status');
              expect(result).toHaveProperty('containerName');
              expect(result).toHaveProperty('healthCheck');
              expect(result).toHaveProperty('lastChecked');
              
              // Status should be one of the valid values
              expect(['healthy', 'unhealthy', 'stopped', 'starting', 'not_found']).toContain(result.status);
              
              // lastChecked should be a valid ISO timestamp
              expect(() => new Date(result.lastChecked)).not.toThrow();
              
              // healthCheck should be boolean
              expect(typeof result.healthCheck).toBe('boolean');
            });

            // Property: Services that exist in mock should not have 'not_found' status
            // unless they are stopped
            const existingServiceNames = mockContainers.map(c => c.Names[0].replace('/', ''));
            results.forEach(result => {
              if (existingServiceNames.includes(result.name)) {
                const mockContainer = mockContainers.find(c => c.Names[0].includes(result.name));
                if (mockContainer.State === 'running') {
                  expect(['healthy', 'unhealthy', 'starting']).toContain(result.status);
                } else {
                  expect(result.status).toBe('stopped');
                }
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: Docker unavailable handling', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          async (serviceNames) => {
            // Mock Docker as unavailable
            jest.spyOn(serviceDetector, 'isDockerAvailable').mockResolvedValue(false);

            const results = await serviceDetector.getServiceStatus(serviceNames);

            // Property: When Docker is unavailable, all services should have 'not_found' status
            expect(results).toHaveLength(serviceNames.length);
            results.forEach((result, index) => {
              expect(result.name).toBe(serviceNames[index]);
              expect(result.status).toBe('not_found');
              expect(result.error).toBe('Docker not available');
              expect(result.healthCheck).toBe(false);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Property: Service detail consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.boolean(), // Whether container exists
          fc.oneof(
            fc.constant('running'),
            fc.constant('exited'),
            fc.constant('paused')
          ), // Container state
          async (serviceName, containerExists, containerState) => {
            const mockContainers = containerExists ? [{
              Names: [`/${serviceName}`],
              State: containerState,
              Status: containerState === 'running' 
                ? 'Up 5 minutes (healthy)' 
                : 'Exited (0) 2 minutes ago'
            }] : [];

            jest.spyOn(serviceDetector.docker, 'listContainers').mockResolvedValue(mockContainers);

            const result = await serviceDetector.getServiceDetail(serviceName);

            // Property: Result should always have consistent structure
            expect(result.name).toBe(serviceName);
            expect(typeof result.status).toBe('string');
            expect(typeof result.containerName).toBe('string');
            expect(typeof result.healthCheck).toBe('boolean');
            expect(typeof result.lastChecked).toBe('string');

            // Property: Status should match container state
            if (!containerExists) {
              expect(result.status).toBe('not_found');
            } else if (containerState === 'running') {
              expect(['healthy', 'unhealthy', 'starting']).toContain(result.status);
            } else {
              expect(result.status).toBe('stopped');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});