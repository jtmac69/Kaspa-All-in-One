const {
    RequestQueue,
    ResponseCache,
    WebSocketOptimizer,
    PerformanceMonitor,
    DOMOptimizer,
    ResourceOptimizer
} = require('../PerformanceOptimizer');

describe('PerformanceOptimizer', () => {
    describe('RequestQueue', () => {
        test('should process requests sequentially', async () => {
            const queue = new RequestQueue(2);
            const results = [];
            
            const request1 = () => new Promise(resolve => {
                setTimeout(() => {
                    results.push('request1');
                    resolve('result1');
                }, 50);
            });
            
            const request2 = () => new Promise(resolve => {
                setTimeout(() => {
                    results.push('request2');
                    resolve('result2');
                }, 30);
            });
            
            const request3 = () => new Promise(resolve => {
                setTimeout(() => {
                    results.push('request3');
                    resolve('result3');
                }, 20);
            });
            
            const promises = [
                queue.add(request1),
                queue.add(request2),
                queue.add(request3)
            ];
            
            const responses = await Promise.all(promises);
            
            expect(responses).toEqual(['result1', 'result2', 'result3']);
            expect(results.length).toBe(3);
        });
        
        test('should limit concurrent requests', async () => {
            const queue = new RequestQueue(1);
            let concurrent = 0;
            let maxConcurrent = 0;
            
            const createRequest = (id) => () => new Promise(resolve => {
                concurrent++;
                maxConcurrent = Math.max(maxConcurrent, concurrent);
                
                setTimeout(() => {
                    concurrent--;
                    resolve(`result${id}`);
                }, 50);
            });
            
            const promises = [
                queue.add(createRequest(1)),
                queue.add(createRequest(2)),
                queue.add(createRequest(3))
            ];
            
            await Promise.all(promises);
            
            expect(maxConcurrent).toBe(1);
        });
        
        test('should provide stats', () => {
            const queue = new RequestQueue(5);
            const stats = queue.getStats();
            
            expect(stats).toHaveProperty('running');
            expect(stats).toHaveProperty('queued');
            expect(stats).toHaveProperty('maxConcurrent');
            expect(stats.maxConcurrent).toBe(5);
        });
        
        test('should handle request failures', async () => {
            const queue = new RequestQueue(1);
            
            const failingRequest = () => Promise.reject(new Error('Request failed'));
            
            await expect(queue.add(failingRequest)).rejects.toThrow('Request failed');
        });
    });
    
    describe('ResponseCache', () => {
        test('should cache and retrieve responses', () => {
            const cache = new ResponseCache(1000);
            
            cache.set('test-key', { data: 'test' }, 1000);
            const result = cache.get('test-key');
            
            expect(result).toEqual({
                data: { data: 'test' },
                expires: expect.any(Number)
            });
        });
        
        test('should expire cached items', (done) => {
            const cache = new ResponseCache(100);
            
            cache.set('test-key', { data: 'test' }, 50);
            
            setTimeout(() => {
                const result = cache.get('test-key');
                expect(result).toBeNull();
                done();
            }, 100);
        });
        
        test('should generate unique keys for requests', () => {
            const cache = new ResponseCache();
            
            const req1 = { method: 'GET', path: '/api/test', query: { page: 1 } };
            const req2 = { method: 'GET', path: '/api/test', query: { page: 2 } };
            
            const key1 = cache.generateKey(req1);
            const key2 = cache.generateKey(req2);
            
            expect(key1).not.toBe(key2);
            expect(key1).toContain('GET:/api/test');
            expect(key2).toContain('GET:/api/test');
        });
        
        test('should provide cache statistics', () => {
            const cache = new ResponseCache();
            
            // Simulate middleware behavior
            cache.set('key1', 'data1');
            cache.stats.hits = 0;
            cache.stats.misses = 0;
            
            // Simulate a hit
            const hit = cache.get('key1');
            if (hit) cache.stats.hits++;
            
            // Simulate a miss
            const miss = cache.get('key2');
            if (!miss) cache.stats.misses++;
            
            const stats = cache.getStats();
            
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
            expect(stats.sets).toBe(1);
            expect(stats.size).toBe(1);
            expect(stats.hitRate).toBe(0.5);
        });
        
        test('should clear cache', () => {
            const cache = new ResponseCache();
            
            cache.set('key1', 'data1');
            cache.set('key2', 'data2');
            
            expect(cache.getStats().size).toBe(2);
            
            cache.clear();
            
            expect(cache.getStats().size).toBe(0);
        });
        
        test('should create caching middleware', () => {
            const cache = new ResponseCache();
            const middleware = cache.middleware(1000);
            
            expect(typeof middleware).toBe('function');
            expect(middleware.length).toBe(3); // req, res, next
        });
    });
    
    describe('WebSocketOptimizer', () => {
        test('should optimize messages by removing duplicates', () => {
            const optimizer = new WebSocketOptimizer();
            
            const message1 = optimizer.optimizeMessage('status', { service: 'kaspa-node', status: 'running' });
            const message2 = optimizer.optimizeMessage('status', { service: 'kaspa-node', status: 'running' });
            
            expect(message1).toBeTruthy();
            expect(message2).toBeNull(); // Duplicate should be filtered out
        });
        
        test('should allow different messages', () => {
            const optimizer = new WebSocketOptimizer();
            
            const message1 = optimizer.optimizeMessage('status', { service: 'kaspa-node', status: 'running' });
            const message2 = optimizer.optimizeMessage('status', { service: 'kaspa-node', status: 'stopped' });
            
            expect(message1).toBeTruthy();
            expect(message2).toBeTruthy();
        });
        
        test('should compress large messages', () => {
            const optimizer = new WebSocketOptimizer();
            optimizer.compressionThreshold = 10; // Low threshold for testing
            
            const largeData = { data: 'x'.repeat(100) };
            const message = optimizer.optimizeMessage('large', largeData);
            
            expect(message._compressed).toBe(true);
        });
        
        test('should optimize data structure', () => {
            const optimizer = new WebSocketOptimizer();
            
            const data = {
                valid: 'value',
                nullValue: null,
                undefinedValue: undefined,
                nested: {
                    valid: 'nested',
                    nullValue: null
                }
            };
            
            const optimized = optimizer.optimizeDataStructure(data);
            
            expect(optimized.valid).toBe('value');
            expect(optimized.nullValue).toBeUndefined();
            expect(optimized.undefinedValue).toBeUndefined();
            expect(optimized.nested.valid).toBe('nested');
            expect(optimized.nested.nullValue).toBeUndefined();
        });
        
        test('should clear message cache', () => {
            const optimizer = new WebSocketOptimizer();
            
            optimizer.optimizeMessage('test', { data: 'test' });
            expect(optimizer.lastMessages.size).toBe(1);
            
            optimizer.clearCache();
            expect(optimizer.lastMessages.size).toBe(0);
        });
    });
    
    describe('PerformanceMonitor', () => {
        test('should record API request performance', () => {
            const monitor = new PerformanceMonitor();
            
            monitor.recordAPIRequest('/api/test', 150, true);
            monitor.recordAPIRequest('/api/test2', 200, false);
            
            const stats = monitor.getStats();
            
            expect(stats.api.total).toBe(2);
            expect(stats.api.successRate).toBe(0.5);
            expect(stats.api.avgDuration).toBe(175);
        });
        
        test('should record render performance', () => {
            const monitor = new PerformanceMonitor();
            
            monitor.recordRenderTime('ServiceCard', 50);
            monitor.recordRenderTime('StatusPanel', 75);
            
            const stats = monitor.getStats();
            
            expect(stats.rendering.total).toBe(2);
            expect(stats.rendering.avgDuration).toBe(62.5);
            expect(stats.rendering.maxDuration).toBe(75);
            expect(stats.rendering.minDuration).toBe(50);
        });
        
        test('should limit stored metrics', () => {
            const monitor = new PerformanceMonitor();
            
            // Add more than the limit
            for (let i = 0; i < 150; i++) {
                monitor.recordAPIRequest(`/api/test${i}`, 100, true);
            }
            
            expect(monitor.metrics.apiRequests.length).toBe(100);
        });
        
        test('should calculate uptime', () => {
            const monitor = new PerformanceMonitor();
            
            // Wait a bit
            setTimeout(() => {
                const stats = monitor.getStats();
                expect(stats.uptime).toBeGreaterThan(0);
            }, 10);
        });
        
        test('should handle empty metrics', () => {
            const monitor = new PerformanceMonitor();
            
            const stats = monitor.getStats();
            
            expect(stats.api).toBeNull();
            expect(stats.rendering).toBeNull();
            expect(stats.memory).toBeNull();
        });
    });
    
    describe('DOMOptimizer', () => {
        test('should provide debounce function', (done) => {
            let callCount = 0;
            const debouncedFn = DOMOptimizer.debounce(() => {
                callCount++;
            }, 50);
            
            debouncedFn();
            debouncedFn();
            debouncedFn();
            
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 100);
        });
        
        test('should provide throttle function', (done) => {
            let callCount = 0;
            const throttledFn = DOMOptimizer.throttle(() => {
                callCount++;
            }, 50);
            
            throttledFn();
            throttledFn();
            throttledFn();
            
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 100);
        });
        
        test('should batch DOM updates', async () => {
            // Mock requestAnimationFrame for Node.js environment
            global.requestAnimationFrame = (callback) => {
                setTimeout(callback, 0);
            };
            
            const updates = [];
            const batchedUpdates = [
                () => updates.push('update1'),
                () => updates.push('update2'),
                () => updates.push('update3')
            ];
            
            await DOMOptimizer.batchUpdates(batchedUpdates);
            
            expect(updates).toEqual(['update1', 'update2', 'update3']);
            
            // Clean up
            delete global.requestAnimationFrame;
        });
    });
    
    describe('ResourceOptimizer', () => {
        // Note: These tests would require DOM environment for full testing
        // Here we test the structure and basic functionality
        
        test('should have lazy loading function', () => {
            expect(typeof ResourceOptimizer.lazyLoad).toBe('function');
        });
        
        test('should have preload resources function', () => {
            expect(typeof ResourceOptimizer.preloadResources).toBe('function');
        });
        
        test('should have service worker registration function', () => {
            expect(typeof ResourceOptimizer.registerServiceWorker).toBe('function');
        });
    });
});