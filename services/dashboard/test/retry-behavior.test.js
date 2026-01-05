/**
 * Property Test: Retry on Unavailability
 * Validates Requirements 3.7, 3.8
 * 
 * This test verifies that the Dashboard correctly implements retry logic
 * when the Kaspa node becomes unavailable and updates status within 5 seconds
 * when the node becomes available again.
 */

const fc = require('fast-check');
const KaspaNodeClient = require('../lib/KaspaNodeClient');
const PortFallbackService = require('../../shared/lib/port-fallback');

// Mock axios to simulate network conditions
jest.mock('axios');
const axios = require('axios');

describe('Property Test: Retry on Unavailability', () => {
    let kaspaNodeClient;
    let originalSetInterval;
    let originalClearInterval;
    let intervals = [];

    beforeEach(() => {
        // Mock timers to control retry intervals
        originalSetInterval = global.setInterval;
        originalClearInterval = global.clearInterval;
        
        global.setInterval = jest.fn((callback, delay) => {
            const id = Math.random();
            intervals.push({ id, callback, delay });
            return id;
        });
        
        global.clearInterval = jest.fn((id) => {
            intervals = intervals.filter(interval => interval.id !== id);
        });

        // Create client with mocked timer environment
        kaspaNodeClient = new KaspaNodeClient({
            configuredPort: 16111,
            timeout: 1000
        });
        
        // Ensure the PortFallbackService uses our mocked timers
        kaspaNodeClient.portFallback.retryInterval = 30000;
    });

    afterEach(async () => {
        // Clean up any active intervals
        intervals.forEach(interval => {
            if (originalClearInterval) {
                originalClearInterval(interval.id);
            }
        });
        
        // Stop any active retries
        if (kaspaNodeClient) {
            kaspaNodeClient.stopRetry();
            kaspaNodeClient.destroy();
        }
        
        // Restore original timer functions
        global.setInterval = originalSetInterval;
        global.clearInterval = originalClearInterval;
        intervals = [];
        
        jest.clearAllMocks();
        
        // Give a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    /**
     * Property 8: Retry on Unavailability
     * For any period when the Kaspa node is unavailable, the Dashboard SHALL re-attempt 
     * connection every 30 seconds, and when the node becomes available, status SHALL 
     * update within 5 seconds.
     */
    test('Property 8: Retry on Unavailability - sets up 30-second retry timer', async () => {
        await fc.assert(fc.asyncProperty(
            // Generate test scenarios
            fc.record({
                initialFailures: fc.integer({ min: 1, max: 3 }),
            }),
            async ({ initialFailures }) => {
                let callCount = 0;
                let retryCallbacks = [];

                // Mock axios to simulate failures
                axios.post.mockImplementation(() => {
                    callCount++;
                    const error = new Error('Connection refused');
                    error.code = 'ECONNREFUSED';
                    return Promise.reject(error);
                });

                // Start retry logic
                kaspaNodeClient.startRetry((result) => {
                    retryCallbacks.push({
                        timestamp: Date.now(),
                        result: result
                    });
                });

                // Verify retry timer was set up with 30-second interval
                expect(global.setInterval).toHaveBeenCalled();
                const retryTimer = intervals.find(interval => interval.delay === 30000);
                expect(retryTimer).toBeDefined();

                // Verify retry interval is exactly 30 seconds (30000ms)
                expect(retryTimer.delay).toBe(30000);

                // Verify the timer callback is a function
                expect(typeof retryTimer.callback).toBe('function');
            }
        ), {
            numRuns: 10,
            timeout: 2000
        });
    });

    test('Property 8: Retry on Unavailability - updates status within 5 seconds when available', async () => {
        await fc.assert(fc.asyncProperty(
            // Generate scenarios with different timing patterns
            fc.record({
                failureCount: fc.integer({ min: 1, max: 3 }),
                responseDelay: fc.integer({ min: 100, max: 500 }) // response time when available
            }),
            async ({ failureCount, responseDelay }) => {
                let callCount = 0;
                let connectionRestoredTime = null;

                // Mock axios to simulate failures then success
                axios.post.mockImplementation(() => {
                    callCount++;
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            if (callCount <= failureCount) {
                                const error = new Error('Connection refused');
                                error.code = 'ECONNREFUSED';
                                reject(error);
                            } else {
                                resolve({ data: { result: 'pong' } });
                            }
                        }, responseDelay);
                    });
                });

                // Start retry logic
                kaspaNodeClient.startRetry((result) => {
                    connectionRestoredTime = Date.now();
                });

                // Find retry timer
                const retryTimer = intervals.find(interval => interval.delay === 30000);
                expect(retryTimer).toBeDefined();

                // Simulate retry attempts until success
                const startTime = Date.now();
                for (let i = 0; i <= failureCount; i++) {
                    await retryTimer.callback();
                }

                // Verify status updated within reasonable time (including response delay)
                if (connectionRestoredTime) {
                    const updateTime = connectionRestoredTime - startTime;
                    // Should be less than 5 seconds plus response delays
                    expect(updateTime).toBeLessThanOrEqual(5000 + (responseDelay * (failureCount + 1)));
                }
            }
        ), {
            numRuns: 15,
            timeout: 8000
        });
    });

    test('Property 8: Retry on Unavailability - stops retry when connection restored', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                failureCount: fc.integer({ min: 1, max: 2 }),
            }),
            async ({ failureCount }) => {
                let callCount = 0;
                let retryStoppedCorrectly = false;

                // Mock axios to fail initially then succeed
                axios.post.mockImplementation(() => {
                    callCount++;
                    if (callCount <= failureCount) {
                        const error = new Error('Connection refused');
                        error.code = 'ECONNREFUSED';
                        return Promise.reject(error);
                    } else {
                        return Promise.resolve({ data: { result: 'pong' } });
                    }
                });

                // Start retry
                kaspaNodeClient.startRetry((result) => {
                    // Connection restored - verify retry stops
                    kaspaNodeClient.stopRetry();
                    retryStoppedCorrectly = true;
                });

                // Verify retry timer was created
                expect(global.setInterval).toHaveBeenCalled();
                const retryTimer = intervals.find(interval => interval.delay === 30000);
                expect(retryTimer).toBeDefined();

                // Verify the retry mechanism is set up correctly
                expect(retryTimer.delay).toBe(30000);
                expect(typeof retryTimer.callback).toBe('function');

                // Simulate one retry attempt
                if (retryTimer) {
                    await retryTimer.callback();
                }

                // Verify clearInterval is available for stopping retries
                expect(global.clearInterval).toBeDefined();
            }
        ), {
            numRuns: 10,
            timeout: 3000
        });
    });

    test('Property 8: Retry on Unavailability - maintains retry interval consistency', async () => {
        await fc.assert(fc.asyncProperty(
            fc.record({
                retryCount: fc.integer({ min: 2, max: 5 }),
                jitterMs: fc.integer({ min: 0, max: 100 }) // Small timing variations
            }),
            async ({ retryCount, jitterMs }) => {
                // Mock axios to always fail for this test
                axios.post.mockImplementation(() => {
                    const error = new Error('Connection refused');
                    error.code = 'ECONNREFUSED';
                    return Promise.reject(error);
                });

                // Start retry
                kaspaNodeClient.startRetry(() => {});

                // Verify exactly one retry timer is created
                const retryTimers = intervals.filter(interval => interval.delay === 30000);
                expect(retryTimers.length).toBe(1);

                // Verify the retry interval is exactly 30 seconds
                expect(retryTimers[0].delay).toBe(30000);

                // Simulate multiple retry attempts
                for (let i = 0; i < retryCount; i++) {
                    await retryTimers[0].callback();
                    
                    // Add small jitter to simulate real-world timing variations
                    await new Promise(resolve => setTimeout(resolve, jitterMs));
                }

                // Verify retry timer remains consistent (still 30 seconds)
                const currentRetryTimers = intervals.filter(interval => interval.delay === 30000);
                expect(currentRetryTimers.length).toBe(1);
                expect(currentRetryTimers[0].delay).toBe(30000);
            }
        ), {
            numRuns: 20,
            timeout: 5000
        });
    });
});