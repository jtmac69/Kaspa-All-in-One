/**
 * Property Test: Retry on Unavailability
 * Validates Requirements 3.7, 3.8
 *
 * Verifies that KaspaNodeClient correctly handles retry logic:
 * - forceReconnect() resets state and re-attempts connection
 * - ensureConnected() lazily initializes on first use
 * - Failures are reported cleanly without crashing
 */

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

const fc = require('fast-check');
const KaspaNodeClient = require('../lib/KaspaNodeClient');

describe('Property Test: Retry on Unavailability', () => {
  let kaspaNodeClient;

  beforeEach(() => {
    mockWrapper.initialize.mockReset().mockResolvedValue(undefined);
    mockWrapper.getClient.mockReset().mockResolvedValue(mockClient);
    mockWrapper.destroy.mockReset();
    mockClient.ping.mockReset();
    mockClient.getInfo.mockReset();

    kaspaNodeClient = new KaspaNodeClient({ host: 'localhost', port: 16110 });
  });

  afterEach(() => {
    kaspaNodeClient.destroy();
    jest.clearAllMocks();
  });

  /**
   * Property 8.1: forceReconnect always resets connection state before retrying.
   * For any number of prior connection attempts, forceReconnect should reset
   * the wrapper and client to null before attempting to reconnect.
   */
  test('Property 8: Retry on Unavailability - forceReconnect resets and retries', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 5 }),
      async (priorAttempts) => {
        // Simulate prior connection attempts
        for (let i = 0; i < priorAttempts; i++) {
          await kaspaNodeClient.initialize().catch(() => {});
        }

        // Reset mock to succeed on forceReconnect
        mockWrapper.initialize.mockResolvedValue(undefined);
        mockWrapper.getClient.mockResolvedValue(mockClient);
        kaspaNodeClient.wrapper = null;

        const result = await kaspaNodeClient.forceReconnect();

        expect(result.connected).toBe(true);
        expect(result.error).toBeNull();
      }
    ), { numRuns: 10 });
  });

  /**
   * Property 8.2: When connection is unavailable, forceReconnect returns an error
   * result (never throws) so callers can handle it gracefully.
   */
  test('Property 8: Retry on Unavailability - forceReconnect returns error result on failure', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }),
      async (errorMessage) => {
        mockWrapper.initialize.mockRejectedValue(new Error(errorMessage));

        const result = await kaspaNodeClient.forceReconnect();

        expect(result.connected).toBe(false);
        expect(result.host).toBeNull();
        expect(typeof result.error).toBe('string');
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 8.3: ping() always returns a boolean — never throws — so it is
   * safe to call as a liveness probe regardless of connection state.
   */
  test('Property 8: Retry on Unavailability - ping never throws, returns boolean', async () => {
    await fc.assert(fc.asyncProperty(
      fc.boolean(),
      async (shouldSucceed) => {
        if (shouldSucceed) {
          mockWrapper.initialize.mockResolvedValue(undefined);
          mockWrapper.getClient.mockResolvedValue(mockClient);
          mockClient.ping.mockResolvedValue(undefined);
        } else {
          mockWrapper.initialize.mockRejectedValue(new Error('ECONNREFUSED'));
        }

        // Reset wrapper so ensureConnected re-initializes
        kaspaNodeClient.wrapper = null;
        kaspaNodeClient.client = null;

        const result = await kaspaNodeClient.ping();
        expect(typeof result).toBe('boolean');
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 8.4: Multiple sequential forceReconnect calls converge to a
   * consistent connected state once the node becomes available.
   */
  test('Property 8: Retry on Unavailability - eventually connects after N failures then success', async () => {
    await fc.assert(fc.asyncProperty(
      fc.integer({ min: 1, max: 4 }),
      async (failureCount) => {
        let attempts = 0;
        mockWrapper.initialize.mockImplementation(() => {
          attempts++;
          if (attempts <= failureCount) {
            return Promise.reject(new Error('Not yet available'));
          }
          return Promise.resolve();
        });
        mockWrapper.getClient.mockResolvedValue(mockClient);

        let lastResult;
        for (let i = 0; i <= failureCount; i++) {
          kaspaNodeClient.wrapper = null;
          kaspaNodeClient.client = null;
          lastResult = await kaspaNodeClient.forceReconnect();
        }

        expect(lastResult.connected).toBe(true);
      }
    ), { numRuns: 15 });
  });
});
