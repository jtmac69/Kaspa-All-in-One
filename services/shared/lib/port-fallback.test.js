const PortFallbackService = require('./port-fallback.js');
const axios = require('axios');
const fc = require('fast-check');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('PortFallbackService', () => {
  let portFallback;

  beforeEach(() => {
    jest.clearAllMocks();
    portFallback = new PortFallbackService({
      configuredPort: 16110,
      timeout: 1000,
      retryInterval: 1000 // Shorter for testing
    });
  });

  afterEach(() => {
    if (portFallback) {
      portFallback.destroy();
    }
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      const service = new PortFallbackService();
      expect(service.configuredPort).toBe(16110);
      expect(service.fallbackPorts).toEqual([16110, 16111]);
      expect(service.cachedPort).toBeNull();
      expect(service.retryInterval).toBe(30000);
    });

    test('should initialize with custom values', () => {
      const service = new PortFallbackService({
        configuredPort: 16111,
        retryInterval: 5000,
        timeout: 2000,
        host: 'remote-host'
      });
      expect(service.configuredPort).toBe(16111);
      expect(service.retryInterval).toBe(5000);
      expect(service.timeout).toBe(2000);
      expect(service.host).toBe('remote-host');
    });

    test('should build correct port chain with configured port first', () => {
      const service = new PortFallbackService({ configuredPort: 16111 });
      expect(service.getPortChain()).toEqual([16111, 16110]);
    });

    test('should not duplicate configured port in chain', () => {
      const service = new PortFallbackService({ configuredPort: 16110 });
      expect(service.getPortChain()).toEqual([16110, 16111]);
    });
  });

  describe('connect - core functionality', () => {
    test('should connect on first port when available', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { result: 'pong' } });

      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16110);
      expect(result.url).toBe('http://localhost:16110');
      expect(portFallback.getWorkingPort()).toBe(16110);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:16110',
        { method: 'ping', params: {} },
        expect.objectContaining({ timeout: 1000 })
      );
    });

    test('should fallback to second port when first fails', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockResolvedValueOnce({ data: { result: 'pong' } });

      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16111);
      expect(result.url).toBe('http://localhost:16111');
      expect(portFallback.getWorkingPort()).toBe(16111);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    test('should return failure when all ports fail', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' });

      const result = await portFallback.connect();

      expect(result.connected).toBe(false);
      expect(result.port).toBeNull();
      expect(result.error).toContain('Failed to connect to Kaspa node on any port: 16110, 16111');
      expect(portFallback.getWorkingPort()).toBeNull();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    test('should use cached port when available', async () => {
      // First connection
      mockedAxios.post.mockResolvedValueOnce({ data: { result: 'pong' } });
      await portFallback.connect();
      expect(portFallback.getWorkingPort()).toBe(16110);

      // Second connection should use cached port
      mockedAxios.post.mockResolvedValueOnce({ data: { result: 'pong' } });
      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16110);
      // Should call axios twice total (once for initial, once for cached)
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    test('should clear cache and retry full chain when cached port fails', async () => {
      // First connection succeeds on port 16110
      mockedAxios.post.mockResolvedValueOnce({ data: { result: 'pong' } });
      await portFallback.connect();
      expect(portFallback.getWorkingPort()).toBe(16110);

      // Second connection: cached port fails, fallback succeeds
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' }) // Cached port fails
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' }) // First port in chain fails
        .mockResolvedValueOnce({ data: { result: 'pong' } }); // Second port succeeds

      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16111);
      expect(portFallback.getWorkingPort()).toBe(16111);
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // 1 initial + 3 retry
    });

    test('should handle RPC errors as successful connections', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'RPC error' } }
      });

      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16110);
    });

    test('should handle timeout errors as connection failures', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' });

      const result = await portFallback.connect();

      expect(result.connected).toBe(false);
      expect(result.port).toBeNull();
    });

    test('should try configured port first even if different from fallback ports', async () => {
      const customService = new PortFallbackService({ configuredPort: 16112 });
      
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' }) // 16112 fails
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' }) // 16110 fails  
        .mockResolvedValueOnce({ data: { result: 'pong' } }); // 16111 succeeds

      const result = await customService.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16111);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
      
      // Verify the order of calls
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, 'http://localhost:16112', expect.any(Object), expect.any(Object));
      expect(mockedAxios.post).toHaveBeenNthCalledWith(2, 'http://localhost:16110', expect.any(Object), expect.any(Object));
      expect(mockedAxios.post).toHaveBeenNthCalledWith(3, 'http://localhost:16111', expect.any(Object), expect.any(Object));
      
      customService.destroy();
    });
  });

  describe('port management', () => {
    test('should get working port', () => {
      expect(portFallback.getWorkingPort()).toBeNull();
      portFallback.cachedPort = 16111;
      expect(portFallback.getWorkingPort()).toBe(16111);
    });

    test('should get working URL', () => {
      expect(portFallback.getWorkingUrl()).toBeNull();
      portFallback.cachedPort = 16111;
      expect(portFallback.getWorkingUrl()).toBe('http://localhost:16111');
    });

    test('should clear cache', () => {
      portFallback.cachedPort = 16111;
      portFallback.clearCache();
      expect(portFallback.getWorkingPort()).toBeNull();
    });

    test('should set configured port and rebuild chain', () => {
      portFallback.setConfiguredPort(16112);
      expect(portFallback.configuredPort).toBe(16112);
      expect(portFallback.getPortChain()).toEqual([16112, 16110, 16111]);
      expect(portFallback.getWorkingPort()).toBeNull(); // Cache should be cleared
    });

    test('should check if port is in chain', () => {
      expect(portFallback.hasPort(16110)).toBe(true);
      expect(portFallback.hasPort(16111)).toBe(true);
      expect(portFallback.hasPort(16112)).toBe(false);
    });
  });

  describe('retry functionality', () => {
    test('should start and stop retry', () => {
      const onConnect = jest.fn();
      
      portFallback.startRetry(onConnect);
      expect(portFallback.retryTimer).not.toBeNull();
      
      portFallback.stopRetry();
      expect(portFallback.retryTimer).toBeNull();
    });

    test('should call onConnect when retry succeeds', async () => {
      const onConnect = jest.fn();
      mockedAxios.post.mockResolvedValue({ data: { result: 'pong' } });
      
      portFallback.startRetry(onConnect);
      
      // Wait for retry interval
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(onConnect).toHaveBeenCalledWith(expect.objectContaining({
        connected: true,
        port: 16110
      }));
      
      portFallback.stopRetry();
    });

    test('should not call onConnect when retry fails', async () => {
      const onConnect = jest.fn();
      mockedAxios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
      
      portFallback.startRetry(onConnect);
      
      // Wait for retry interval
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(onConnect).not.toHaveBeenCalled();
      
      portFallback.stopRetry();
    });

    test('should clear existing retry timer when starting new retry', () => {
      const onConnect1 = jest.fn();
      const onConnect2 = jest.fn();
      
      portFallback.startRetry(onConnect1);
      const firstTimer = portFallback.retryTimer;
      
      portFallback.startRetry(onConnect2);
      const secondTimer = portFallback.retryTimer;
      
      expect(firstTimer).not.toBe(secondTimer);
      expect(portFallback.retryTimer).toBe(secondTimer);
      
      portFallback.stopRetry();
    });
  });

  describe('status and utility methods', () => {
    test('should get status summary', () => {
      const status = portFallback.getStatus();
      expect(status).toEqual({
        configuredPort: 16110,
        cachedPort: null,
        portChain: [16110, 16111],
        retryActive: false,
        retryInterval: 1000
      });
    });

    test('should get port chain', () => {
      const chain = portFallback.getPortChain();
      expect(chain).toEqual([16110, 16111]);
      // Should return a copy, not the original
      chain.push(16112);
      expect(portFallback.getPortChain()).toEqual([16110, 16111]);
    });

    test('should destroy and cleanup resources', () => {
      portFallback.startRetry(() => {});
      expect(portFallback.retryTimer).not.toBeNull();
      
      portFallback.destroy();
      expect(portFallback.retryTimer).toBeNull();
    });
  });

  describe('error handling edge cases', () => {
    test('should handle unexpected axios errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Unexpected network error'));

      const result = await portFallback.connect();

      expect(result.connected).toBe(false);
      expect(result.error).toContain('Failed to connect to Kaspa node on any port');
    });

    test('should handle mixed success and failure responses', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
        .mockRejectedValueOnce({ response: { status: 404 } }); // HTTP error but port accessible

      const result = await portFallback.connect();

      expect(result.connected).toBe(true);
      expect(result.port).toBe(16111);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 6: Port Fallback Chain Order
     * For any configured port, the port chain SHALL always start with that port,
     * followed by the standard fallback ports (16110, 16111) in correct order.
     * 
     * Feature: wizard-dashboard-unification, Property 6: Port Fallback Chain
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    test('Property 6: Port Fallback Chain - configured port always comes first', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 16000, max: 17000 }),
          (configuredPort) => {
            const service = new PortFallbackService({ configuredPort });
            
            try {
              const portChain = service.getPortChain();
              
              // REQUIREMENT 3.1: Configured port comes first
              expect(portChain[0]).toBe(configuredPort);
              
              // REQUIREMENT 3.2 & 3.3: Chain contains fallback ports 16110 and 16111
              expect(portChain).toContain(16110);
              expect(portChain).toContain(16111);
              
              // Chain should have no duplicates
              const uniquePorts = [...new Set(portChain)];
              expect(uniquePorts.length).toBe(portChain.length);
              
              // Chain should be exactly 3 ports (configured + 2 fallbacks)
              expect(portChain.length).toBe(3);
              
              // If configured port is not 16110 or 16111, verify order
              if (configuredPort !== 16110 && configuredPort !== 16111) {
                expect(portChain).toEqual([configuredPort, 16110, 16111]);
              }
            } finally {
              service.destroy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7: Port Caching After Success
     * For any successful Kaspa node connection, subsequent connection attempts SHALL use 
     * the cached working port until explicitly cleared or connection fails.
     * 
     * Feature: wizard-dashboard-unification, Property 7: Port Caching After Success
     * Validates: Requirements 3.4
     */
    test('Property 7: Port Caching After Success - cached port used for subsequent connections', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 16000, max: 17000 }),
          (configuredPort) => {
            const service = new PortFallbackService({ 
              configuredPort,
              timeout: 100 // Fast timeout for testing
            });
            
            try {
              // REQUIREMENT 3.4: Test that successful connections cache the working port
              
              // Initially no cached port
              expect(service.getWorkingPort()).toBeNull();
              
              // Simulate a successful connection by directly setting the cache
              // (This tests the caching mechanism itself, not the network connection)
              service.cachedPort = configuredPort;
              
              // REQUIREMENT 3.4: Working port should now be cached
              expect(service.getWorkingPort()).toBe(configuredPort);
              
              // Test that getWorkingUrl returns correct URL when cached
              expect(service.getWorkingUrl()).toBe(`http://localhost:${configuredPort}`);
              
              // Test cache clearing
              service.clearCache();
              expect(service.getWorkingPort()).toBeNull();
              expect(service.getWorkingUrl()).toBeNull();
              
              // Test that setting a different configured port clears cache
              service.cachedPort = configuredPort;
              expect(service.getWorkingPort()).toBe(configuredPort);
              
              const newPort = configuredPort === 16000 ? 16001 : 16000;
              service.setConfiguredPort(newPort);
              expect(service.getWorkingPort()).toBeNull(); // Cache should be cleared
              
              return true;
              
            } finally {
              service.destroy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});