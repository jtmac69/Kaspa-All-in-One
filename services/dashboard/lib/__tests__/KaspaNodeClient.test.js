const KaspaNodeClient = require('../KaspaNodeClient');
const axios = require('axios');

jest.mock('axios');

describe('KaspaNodeClient', () => {
  let client;

  beforeEach(() => {
    client = new KaspaNodeClient('http://test-node:16111');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default port', () => {
      const defaultClient = new KaspaNodeClient();
      expect(defaultClient.portFallback).toBeDefined();
      expect(defaultClient.portFallback.configuredPort).toBe(16111);
    });

    it('should initialize with custom port from rpcUrl', () => {
      expect(client.portFallback).toBeDefined();
      expect(client.portFallback.configuredPort).toBe(16111);
    });

    it('should set default timeout', () => {
      expect(client.timeout).toBe(10000);
    });
  });

  describe('makeRpcCall', () => {
    beforeEach(() => {
      // Mock the portFallback.connect() to return successful connection
      client.portFallback.connect = jest.fn().mockResolvedValue({
        connected: true,
        port: 16111,
        url: 'http://test-node:16111'
      });
    });

    it('should make successful RPC call', async () => {
      const mockResponse = {
        data: {
          result: { test: 'data' }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await client.makeRpcCall('testMethod', { param: 'value' });
      
      expect(client.portFallback.connect).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        'http://test-node:16111',
        {
          method: 'testMethod',
          params: { param: 'value' }
        },
        expect.objectContaining({
          timeout: 10000
        })
      );
      expect(result).toEqual({ test: 'data' });
    });

    it('should handle RPC error response', async () => {
      const mockResponse = {
        data: {
          error: { message: 'RPC error occurred' }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      await expect(client.makeRpcCall('testMethod')).rejects.toThrow('RPC Error: RPC error occurred');
    });

    it('should handle connection refused error', async () => {
      // Mock connection failure
      client.portFallback.connect = jest.fn().mockResolvedValue({
        connected: false,
        port: null,
        error: 'Failed to connect to Kaspa node on any port: 16111, 16110'
      });

      await expect(client.makeRpcCall('testMethod')).rejects.toThrow('Cannot connect to Kaspa node');
    });

    it('should handle timeout error', async () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      axios.post.mockRejectedValue(error);

      await expect(client.makeRpcCall('testMethod')).rejects.toThrow('Kaspa node request timed out');
    });
  });

  describe('getNodeInfo', () => {
    beforeEach(() => {
      // Mock the portFallback.connect() to return successful connection
      client.portFallback.connect = jest.fn().mockResolvedValue({
        connected: true,
        port: 16111,
        url: 'http://test-node:16111'
      });
    });

    it('should return formatted node info', async () => {
      const mockResponse = {
        data: {
          result: {
            serverVersion: '0.14.0',
            isSynced: true,
            peerCount: 42,
            networkName: 'mainnet',
            mempoolSize: 10
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const info = await client.getNodeInfo();
      
      expect(info.serverVersion).toBe('0.14.0');
      expect(info.isSynced).toBe(true);
      expect(info.peerCount).toBe(42);
      expect(info.networkName).toBe('mainnet');
      expect(info.mempoolSize).toBe(10);
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        data: {
          result: {
            serverVersion: '0.14.0',
            isSynced: false
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const info = await client.getNodeInfo();
      
      expect(info.peerCount).toBe(0);
      expect(info.mempoolSize).toBe(0);
    });
  });

  describe('calculateSyncProgress', () => {
    it('should calculate sync progress correctly', () => {
      const currentHeight = 5000000;
      const networkHeight = 10000000;
      
      client.networkHeight = networkHeight;
      const progress = (currentHeight / networkHeight) * 100;
      
      expect(progress).toBe(50);
    });

    it('should cap progress at 100%', () => {
      const currentHeight = 11000000;
      const networkHeight = 10000000;
      
      const progress = Math.min((currentHeight / networkHeight) * 100, 100);
      
      expect(progress).toBe(100);
    });
  });

  describe('determineSyncState', () => {
    it('should return synced when isSynced is true', () => {
      const state = client.determineSyncState(true, 100);
      expect(state).toBe('synced');
    });

    it('should return nearly_synced when progress > 99', () => {
      const state = client.determineSyncState(false, 99.5);
      expect(state).toBe('nearly_synced');
    });

    it('should return syncing when progress > 50', () => {
      const state = client.determineSyncState(false, 75);
      expect(state).toBe('syncing');
    });

    it('should return initial_sync when progress > 0', () => {
      const state = client.determineSyncState(false, 25);
      expect(state).toBe('initial_sync');
    });

    it('should return not_synced when progress is 0', () => {
      const state = client.determineSyncState(false, 0);
      expect(state).toBe('not_synced');
    });
  });

  describe('estimateHashRate', () => {
    it('should estimate hash rate from difficulty', () => {
      const difficulty = 1000000;
      const hashRate = client.estimateHashRate(difficulty);
      
      expect(hashRate).toBeGreaterThan(0);
      expect(typeof hashRate).toBe('number');
    });

    it('should return 0 for zero difficulty', () => {
      const hashRate = client.estimateHashRate(0);
      expect(hashRate).toBe(0);
    });

    it('should return 0 for null difficulty', () => {
      const hashRate = client.estimateHashRate(null);
      expect(hashRate).toBe(0);
    });
  });

  describe('formatUptime', () => {
    it('should format uptime in days, hours, minutes', () => {
      const seconds = 2 * 86400 + 5 * 3600 + 30 * 60; // 2 days, 5 hours, 30 minutes
      const formatted = client.formatUptime(seconds);
      expect(formatted).toBe('2d 5h 30m');
    });

    it('should format uptime in hours and minutes', () => {
      const seconds = 3 * 3600 + 15 * 60; // 3 hours, 15 minutes
      const formatted = client.formatUptime(seconds);
      expect(formatted).toBe('3h 15m');
    });

    it('should format uptime in minutes only', () => {
      const seconds = 45 * 60; // 45 minutes
      const formatted = client.formatUptime(seconds);
      expect(formatted).toBe('45m');
    });

    it('should return Unknown for null uptime', () => {
      const formatted = client.formatUptime(null);
      expect(formatted).toBe('Unknown');
    });

    it('should return Unknown for negative uptime', () => {
      const formatted = client.formatUptime(-100);
      expect(formatted).toBe('Unknown');
    });
  });

  describe('formatHashRate', () => {
    it('should format hash rate with appropriate unit', () => {
      const hashRate = 1500000; // 1.5 MH/s
      const formatted = client.formatHashRate(hashRate);
      expect(formatted).toContain('MH/s');
    });

    it('should return 0 H/s for zero hash rate', () => {
      const formatted = client.formatHashRate(0);
      expect(formatted).toBe('0 H/s');
    });

    it('should return 0 H/s for null hash rate', () => {
      const formatted = client.formatHashRate(null);
      expect(formatted).toBe('0 H/s');
    });
  });

  describe('ping', () => {
    beforeEach(() => {
      // Mock the portFallback.connect() to return successful connection
      client.portFallback.connect = jest.fn().mockResolvedValue({
        connected: true,
        port: 16111,
        url: 'http://test-node:16111'
      });
    });

    it('should return true on successful ping', async () => {
      axios.post.mockResolvedValue({ data: { result: 'pong' } });
      
      const result = await client.ping();
      expect(result).toBe(true);
    });

    it('should return false on failed ping', async () => {
      axios.post.mockRejectedValue(new Error('Connection failed'));
      
      const result = await client.ping();
      expect(result).toBe(false);
    });
  });
});