const UpdateBroadcaster = require('../UpdateBroadcaster');
const EventEmitter = require('events');

// Mock WebSocketManager
class MockWebSocketManager extends EventEmitter {
    constructor() {
        super();
        this.broadcastCalls = [];
        this.subscriberCalls = [];
    }

    broadcast(message) {
        this.broadcastCalls.push(message);
        return 1; // Simulate one client
    }

    broadcastToSubscribers(subscription, message) {
        this.subscriberCalls.push({ subscription, message });
        return 1; // Simulate one subscriber
    }

    broadcastServiceUpdate(services) {
        return this.broadcastToSubscribers('updates:services', {
            type: 'service_update',
            data: services,
            timestamp: new Date().toISOString()
        });
    }

    broadcastResourceUpdate(resources) {
        return this.broadcastToSubscribers('updates:resources', {
            type: 'resource_update',
            data: resources,
            timestamp: new Date().toISOString()
        });
    }
}

// Mock ServiceMonitor
class MockServiceMonitor {
    async checkAllServices() {
        return [
            {
                name: 'kaspa-node',
                displayName: 'Kaspa Node',
                status: 'healthy',
                state: 'running'
            },
            {
                name: 'dashboard',
                displayName: 'Dashboard',
                status: 'healthy',
                state: 'running'
            }
        ];
    }
}

// Mock ResourceMonitor
class MockResourceMonitor {
    async getSystemResources() {
        return {
            cpu: 45.5,
            memory: 62.3,
            disk: 78.1,
            loadAverage: [2.1, 1.8, 1.5],
            timestamp: new Date().toISOString()
        };
    }
}

describe('UpdateBroadcaster Integration Tests', () => {
    let wsManager;
    let serviceMonitor;
    let resourceMonitor;
    let updateBroadcaster;

    beforeEach(() => {
        wsManager = new MockWebSocketManager();
        serviceMonitor = new MockServiceMonitor();
        resourceMonitor = new MockResourceMonitor();
        updateBroadcaster = new UpdateBroadcaster(wsManager, serviceMonitor, resourceMonitor);
    });

    afterEach(() => {
        if (updateBroadcaster) {
            updateBroadcaster.shutdown();
        }
    });

    describe('Initialization', () => {
        test('should initialize with correct configuration', () => {
            expect(updateBroadcaster.UPDATE_INTERVAL).toBe(5000);
            expect(updateBroadcaster.HIDDEN_TAB_INTERVAL).toBe(20000);
            expect(updateBroadcaster.isRunning).toBe(false);
        });

        test('should listen for WebSocket client events', () => {
            const listeners = wsManager.listeners('client-connected');
            expect(listeners.length).toBeGreaterThan(0);
        });
    });

    describe('Broadcasting Control', () => {
        test('should start broadcasting when start() is called', () => {
            updateBroadcaster.start();
            expect(updateBroadcaster.isRunning).toBe(true);
        });

        test('should stop broadcasting when stop() is called', () => {
            updateBroadcaster.start();
            updateBroadcaster.stop();
            expect(updateBroadcaster.isRunning).toBe(false);
        });

        test('should not start multiple times', () => {
            updateBroadcaster.start();
            const firstState = updateBroadcaster.isRunning;
            updateBroadcaster.start(); // Second call
            expect(updateBroadcaster.isRunning).toBe(firstState);
        });
    });

    describe('Service Updates Broadcasting', () => {
        test('should broadcast service updates', async () => {
            updateBroadcaster.start();
            
            await updateBroadcaster.broadcastServiceUpdates();
            
            expect(wsManager.subscriberCalls.length).toBeGreaterThan(0);
            const serviceCall = wsManager.subscriberCalls.find(
                call => call.message.type === 'service_update'
            );
            expect(serviceCall).toBeDefined();
            expect(serviceCall.message.data).toHaveLength(2);
            expect(serviceCall.message.data[0].name).toBe('kaspa-node');
        });

        test('should detect service changes', async () => {
            updateBroadcaster.start();
            
            // First update
            await updateBroadcaster.broadcastServiceUpdates();
            const initialCallCount = wsManager.subscriberCalls.length;
            
            // Mock service change
            serviceMonitor.checkAllServices = jest.fn().mockResolvedValue([
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy', // Changed status
                    state: 'running'
                }
            ]);
            
            // Second update
            await updateBroadcaster.broadcastServiceUpdates();
            
            expect(wsManager.subscriberCalls.length).toBeGreaterThan(initialCallCount);
        });

        test('should emit services-broadcasted event', (done) => {
            updateBroadcaster.on('services-broadcasted', ({ services, sentCount }) => {
                expect(services).toBeDefined();
                expect(services).toHaveLength(2);
                expect(sentCount).toBe(1);
                done();
            });
            
            updateBroadcaster.start();
            updateBroadcaster.broadcastServiceUpdates();
        });
    });

    describe('Resource Updates Broadcasting', () => {
        test('should broadcast resource updates', async () => {
            updateBroadcaster.start();
            
            await updateBroadcaster.broadcastResourceUpdates();
            
            const resourceCall = wsManager.subscriberCalls.find(
                call => call.message.type === 'resource_update'
            );
            expect(resourceCall).toBeDefined();
            expect(resourceCall.message.data.cpu).toBe(45.5);
            expect(resourceCall.message.data.memory).toBe(62.3);
        });

        test('should detect significant resource changes', async () => {
            updateBroadcaster.start();
            
            // First update
            await updateBroadcaster.broadcastResourceUpdates();
            const initialCallCount = wsManager.subscriberCalls.length;
            
            // Mock significant resource change
            resourceMonitor.getSystemResources = jest.fn().mockResolvedValue({
                cpu: 85.0, // Significant change
                memory: 62.3,
                disk: 78.1,
                loadAverage: [2.1, 1.8, 1.5],
                timestamp: new Date().toISOString()
            });
            
            // Second update
            await updateBroadcaster.broadcastResourceUpdates();
            
            expect(wsManager.subscriberCalls.length).toBeGreaterThan(initialCallCount);
        });

        test('should emit resources-broadcasted event', (done) => {
            updateBroadcaster.on('resources-broadcasted', ({ resources, sentCount }) => {
                expect(resources).toBeDefined();
                expect(resources.cpu).toBe(45.5);
                expect(sentCount).toBe(1);
                done();
            });
            
            updateBroadcaster.start();
            updateBroadcaster.broadcastResourceUpdates();
        });
    });

    describe('Combined Updates Broadcasting', () => {
        test('should broadcast combined updates', async () => {
            updateBroadcaster.start();
            
            await updateBroadcaster.broadcastCombinedUpdates();
            
            const combinedCall = wsManager.subscriberCalls.find(
                call => call.message.type === 'combined_update'
            );
            expect(combinedCall).toBeDefined();
            expect(combinedCall.message.data.services).toBeDefined();
            expect(combinedCall.message.data.resources).toBeDefined();
        });

        test('should emit combined-broadcasted event', (done) => {
            updateBroadcaster.on('combined-broadcasted', ({ services, resources, sentCount }) => {
                expect(services).toBeDefined();
                expect(resources).toBeDefined();
                expect(sentCount).toBe(1);
                done();
            });
            
            updateBroadcaster.start();
            updateBroadcaster.broadcastCombinedUpdates();
        });
    });

    describe('Client Connection Handling', () => {
        test('should handle new client connections', async () => {
            const sendInitialDataSpy = jest.spyOn(updateBroadcaster, 'sendInitialData');
            
            updateBroadcaster.start();
            wsManager.emit('client-connected', 'test-client-1');
            
            expect(sendInitialDataSpy).toHaveBeenCalledWith('test-client-1');
        });

        test('should send initial data to new clients', async () => {
            updateBroadcaster.start();
            
            // Mock sendToClient method
            wsManager.sendToClient = jest.fn();
            
            await updateBroadcaster.sendInitialData('test-client-1');
            
            expect(wsManager.sendToClient).toHaveBeenCalledWith(
                'test-client-1',
                expect.objectContaining({
                    type: 'initial_data',
                    data: expect.objectContaining({
                        services: expect.any(Array),
                        resources: expect.any(Object)
                    })
                })
            );
        });

        test('should handle client disconnections', () => {
            updateBroadcaster.start();
            
            // Simulate client connection and disconnection
            wsManager.emit('client-connected', 'test-client-1');
            wsManager.emit('client-disconnected', 'test-client-1');
            
            // Should not throw errors
            expect(updateBroadcaster.isRunning).toBe(true);
        });
    });

    describe('Change Detection', () => {
        test('should detect service status changes', () => {
            const services1 = [
                { name: 'service1', status: 'healthy', state: 'running' }
            ];
            const services2 = [
                { name: 'service1', status: 'unhealthy', state: 'running' }
            ];
            
            updateBroadcaster.lastServiceUpdate = { data: services1 };
            const hasChanged = updateBroadcaster.hasServicesChanged(services2);
            
            expect(hasChanged).toBe(true);
        });

        test('should detect resource threshold changes', () => {
            const resources1 = { cpu: 45.0, memory: 60.0, disk: 70.0 };
            const resources2 = { cpu: 85.0, memory: 60.0, disk: 70.0 }; // CPU changed significantly
            
            updateBroadcaster.lastResourceUpdate = { data: resources1 };
            const hasChanged = updateBroadcaster.hasResourcesChanged(resources2);
            
            expect(hasChanged).toBe(true);
        });

        test('should not detect minor resource changes', () => {
            const resources1 = { cpu: 45.0, memory: 60.0, disk: 70.0 };
            const resources2 = { cpu: 46.0, memory: 60.5, disk: 70.2 }; // Minor changes
            
            updateBroadcaster.lastResourceUpdate = { data: resources1 };
            const hasChanged = updateBroadcaster.hasResourcesChanged(resources2);
            
            expect(hasChanged).toBe(false);
        });
    });

    describe('Custom Updates', () => {
        test('should broadcast custom updates', () => {
            updateBroadcaster.start();
            
            const customData = { message: 'Custom update' };
            const sentCount = updateBroadcaster.broadcastCustomUpdate('custom:test', customData);
            
            expect(sentCount).toBe(1);
            const customCall = wsManager.subscriberCalls.find(
                call => call.message.type === 'custom_update'
            );
            expect(customCall).toBeDefined();
            expect(customCall.message.subscription).toBe('custom:test');
            expect(customCall.message.data).toEqual(customData);
        });
    });

    describe('Statistics', () => {
        test('should provide broadcaster statistics', () => {
            updateBroadcaster.start();
            
            const stats = updateBroadcaster.getStats();
            
            expect(stats.isRunning).toBe(true);
            expect(stats.activeIntervals).toBeGreaterThan(0);
            expect(stats.updateInterval).toBe(5000);
            expect(stats.hiddenTabInterval).toBe(20000);
        });
    });

    describe('Error Handling', () => {
        test('should handle service monitor errors gracefully', async () => {
            serviceMonitor.checkAllServices = jest.fn().mockRejectedValue(new Error('Service error'));
            
            updateBroadcaster.start();
            
            // Should not throw
            await expect(updateBroadcaster.broadcastServiceUpdates()).resolves.toBeUndefined();
        });

        test('should handle resource monitor errors gracefully', async () => {
            resourceMonitor.getSystemResources = jest.fn().mockRejectedValue(new Error('Resource error'));
            
            updateBroadcaster.start();
            
            // Should not throw
            await expect(updateBroadcaster.broadcastResourceUpdates()).resolves.toBeUndefined();
        });
    });

    describe('Shutdown', () => {
        test('should shutdown cleanly', () => {
            updateBroadcaster.start();
            expect(updateBroadcaster.isRunning).toBe(true);
            
            updateBroadcaster.shutdown();
            
            expect(updateBroadcaster.isRunning).toBe(false);
        });

        test('should remove event listeners on shutdown', () => {
            updateBroadcaster.start();
            const initialListeners = wsManager.listenerCount('client-connected');
            
            updateBroadcaster.shutdown();
            
            const finalListeners = wsManager.listenerCount('client-connected');
            expect(finalListeners).toBeLessThan(initialListeners);
        });
    });
});