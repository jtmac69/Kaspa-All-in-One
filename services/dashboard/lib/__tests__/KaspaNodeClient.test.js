let mockClient;
let mockWrapper;

jest.mock('kaspa-rpc-client', () => {
  mockClient = {
    getInfo: jest.fn(),
    ping: jest.fn(),
    url: 'localhost:16110',
  };
  mockWrapper = {
    initialize: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockResolvedValue(mockClient),
    destroy: jest.fn(),
  };
  return {
    ClientWrapper: jest.fn().mockImplementation(() => mockWrapper),
  };
});

const KaspaNodeClient = require('../KaspaNodeClient');

describe('KaspaNodeClient', () => {
  let client;

  beforeEach(() => {
    client = new KaspaNodeClient({ host: 'test-node', port: 16110 });
    mockClient.getInfo.mockReset();
    mockClient.ping.mockReset();
    mockWrapper.initialize.mockReset().mockResolvedValue(undefined);
    mockWrapper.getClient.mockReset().mockResolvedValue(mockClient);
    mockWrapper.destroy.mockReset();
  });

  afterEach(() => {
    client.destroy();
  });

  describe('constructor', () => {
    it('should include configured host in hosts list', () => {
      expect(client.hosts).toBeDefined();
      expect(client.hosts.length).toBeGreaterThan(0);
      expect(client.hosts[0]).toContain('test-node');
    });

    it('should start disconnected', () => {
      expect(client.connected).toBe(false);
      expect(client.connectionStatus.connected).toBe(false);
    });

    it('should use default host and port when no options given', () => {
      const defaultClient = new KaspaNodeClient();
      expect(defaultClient.hosts[0]).toContain('localhost');
      defaultClient.destroy();
    });
  });

  describe('initialize', () => {
    it('should connect using ClientWrapper', async () => {
      await client.initialize();
      expect(mockWrapper.initialize).toHaveBeenCalled();
      expect(mockWrapper.getClient).toHaveBeenCalled();
      expect(client.connected).toBe(true);
    });

    it('should set connected status on success', async () => {
      await client.initialize();
      expect(client.connectionStatus.connected).toBe(true);
      expect(client.connectionStatus.error).toBeNull();
    });

    it('should set error status on failure', async () => {
      mockWrapper.initialize.mockRejectedValue(new Error('Connection refused'));
      await expect(client.initialize()).rejects.toThrow('Failed to initialize');
      expect(client.connected).toBe(false);
      expect(client.connectionStatus.connected).toBe(false);
    });

    it('should not re-initialize if already connected', async () => {
      await client.initialize();
      await client.initialize(); // second call should be no-op
      expect(mockWrapper.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNodeInfo', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should return formatted node info', async () => {
      mockClient.getInfo.mockResolvedValue({
        serverVersion: '0.14.0',
        isSynced: true,
        peerCount: 42,
        networkName: 'mainnet',
        mempoolSize: 10,
        hasUtxoIndex: true,
      });

      const info = await client.getNodeInfo();

      expect(info.serverVersion).toBe('0.14.0');
      expect(info.isSynced).toBe(true);
      expect(info.peerCount).toBe(42);
      expect(info.networkName).toBe('mainnet');
      expect(info.mempoolSize).toBe(10);
    });

    it('should default missing optional fields to 0/false', async () => {
      mockClient.getInfo.mockResolvedValue({
        serverVersion: '0.14.0',
        isSynced: false,
      });

      const info = await client.getNodeInfo();

      expect(info.peerCount).toBe(0);
      expect(info.mempoolSize).toBe(0);
      expect(info.hasUtxoIndex).toBe(false);
    });

    it('should throw when getInfo fails', async () => {
      mockClient.getInfo.mockRejectedValue(new Error('RPC error'));
      await expect(client.getNodeInfo()).rejects.toThrow('Failed to get node info');
    });
  });

  describe('ping', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('should return true on successful ping', async () => {
      mockClient.ping.mockResolvedValue(undefined);
      expect(await client.ping()).toBe(true);
    });

    it('should return false on failed ping', async () => {
      mockClient.ping.mockRejectedValue(new Error('Connection failed'));
      expect(await client.ping()).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return disconnected status before init', () => {
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.hosts).toBeDefined();
    });

    it('should return connected status after init', async () => {
      await client.initialize();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
    });
  });

  describe('forceReconnect', () => {
    it('should reconnect and return connected status', async () => {
      await client.initialize();
      const result = await client.forceReconnect();
      expect(result.connected).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error status when reconnect fails', async () => {
      mockWrapper.initialize.mockRejectedValue(new Error('Network unreachable'));
      const result = await client.forceReconnect();
      expect(result.connected).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('determineSyncState', () => {
    it('should return synced when isSynced is true', () => {
      expect(client.determineSyncState(true, 100)).toBe('synced');
    });

    it('should return nearly_synced when progress > 99', () => {
      expect(client.determineSyncState(false, 99.5)).toBe('nearly_synced');
    });

    it('should return syncing when progress > 50', () => {
      expect(client.determineSyncState(false, 75)).toBe('syncing');
    });

    it('should return initial_sync when progress > 0', () => {
      expect(client.determineSyncState(false, 25)).toBe('initial_sync');
    });

    it('should return not_synced when progress is 0', () => {
      expect(client.determineSyncState(false, 0)).toBe('not_synced');
    });
  });

  describe('estimateHashRate', () => {
    it('should estimate hash rate from difficulty', () => {
      const hashRate = client.estimateHashRate(1000000);
      expect(hashRate).toBeGreaterThan(0);
      expect(typeof hashRate).toBe('number');
    });

    it('should return 0 for zero difficulty', () => {
      expect(client.estimateHashRate(0)).toBe(0);
    });

    it('should return 0 for null difficulty', () => {
      expect(client.estimateHashRate(null)).toBe(0);
    });
  });

  describe('formatUptime', () => {
    it('should format days, hours, minutes', () => {
      expect(client.formatUptime(2 * 86400 + 5 * 3600 + 30 * 60)).toBe('2d 5h 30m');
    });

    it('should format hours and minutes', () => {
      expect(client.formatUptime(3 * 3600 + 15 * 60)).toBe('3h 15m');
    });

    it('should format minutes only', () => {
      expect(client.formatUptime(45 * 60)).toBe('45m');
    });

    it('should return Unknown for null', () => {
      expect(client.formatUptime(null)).toBe('Unknown');
    });

    it('should return Unknown for negative', () => {
      expect(client.formatUptime(-100)).toBe('Unknown');
    });
  });

  describe('formatHashRate', () => {
    it('should format with MH/s unit', () => {
      expect(client.formatHashRate(1500000)).toContain('MH/s');
    });

    it('should return 0 H/s for zero', () => {
      expect(client.formatHashRate(0)).toBe('0 H/s');
    });

    it('should return 0 H/s for null', () => {
      expect(client.formatHashRate(null)).toBe('0 H/s');
    });
  });
});
