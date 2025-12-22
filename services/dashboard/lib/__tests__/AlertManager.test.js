const AlertManager = require('../AlertManager');

// Mock WebSocketManager
class MockWebSocketManager {
    constructor() {
        this.broadcastCalls = [];
        this.alertCalls = [];
    }

    broadcast(message) {
        this.broadcastCalls.push(message);
        return 1;
    }

    broadcastAlert(alert) {
        this.alertCalls.push(alert);
        return 1;
    }
}

describe('AlertManager Integration Tests', () => {
    let wsManager;
    let alertManager;

    beforeEach(() => {
        wsManager = new MockWebSocketManager();
        alertManager = new AlertManager(wsManager);
    });

    afterEach(() => {
        if (alertManager) {
            alertManager.shutdown();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default thresholds', () => {
            expect(alertManager.alertThresholds.cpu.warning).toBe(80);
            expect(alertManager.alertThresholds.cpu.critical).toBe(90);
            expect(alertManager.alertThresholds.memory.warning).toBe(85);
            expect(alertManager.alertThresholds.memory.critical).toBe(90);
        });

        test('should initialize with empty alert history', () => {
            expect(alertManager.alertHistory).toHaveLength(0);
            expect(alertManager.activeAlerts.size).toBe(0);
        });
    });

    describe('Service Failure Alerts', () => {
        test('should generate alert for unhealthy service', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    error: 'Connection timeout',
                    profile: 'core',
                    critical: true
                }
            ];

            alertManager.processServiceUpdates(services);

            expect(wsManager.alertCalls).toHaveLength(1);
            const alert = wsManager.alertCalls[0];
            expect(alert.type).toBe('service_failure');
            expect(alert.severity).toBe('critical');
            expect(alert.data.serviceName).toBe('kaspa-node');
        });

        test('should generate alert for stopped service', () => {
            const services = [
                {
                    name: 'dashboard',
                    displayName: 'Dashboard',
                    status: 'stopped',
                    state: 'exited',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);

            expect(wsManager.alertCalls).toHaveLength(1);
            const alert = wsManager.alertCalls[0];
            expect(alert.type).toBe('service_failure');
            expect(alert.severity).toBe('warning');
        });

        test('should not generate duplicate failure alerts', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            alertManager.processServiceUpdates(services); // Second call

            // Should only have one alert (first failure)
            expect(wsManager.alertCalls).toHaveLength(1);
        });
    });

    describe('Service Recovery Alerts', () => {
        test('should generate recovery alert when service becomes healthy', () => {
            const unhealthyServices = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            const healthyServices = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'healthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(unhealthyServices);
            wsManager.alertCalls = []; // Clear previous alerts
            alertManager.processServiceUpdates(healthyServices);

            const recoveryAlert = wsManager.alertCalls.find(a => a.type === 'service_recovery');
            expect(recoveryAlert).toBeDefined();
            expect(recoveryAlert.severity).toBe('info');
            expect(recoveryAlert.data.currentStatus).toBe('healthy');
        });
    });

    describe('Resource Threshold Alerts', () => {
        test('should generate critical CPU alert', () => {
            const resources = {
                cpu: 95.0,
                memory: 60.0,
                disk: 70.0,
                loadAverage: [2.0, 1.8, 1.5]
            };

            alertManager.processResourceUpdates(resources);

            const cpuAlert = wsManager.alertCalls.find(
                a => a.type === 'resource_threshold' && a.data.resource === 'cpu'
            );
            expect(cpuAlert).toBeDefined();
            expect(cpuAlert.severity).toBe('critical');
            expect(cpuAlert.data.currentValue).toBe(95.0);
        });

        test('should generate warning memory alert', () => {
            const resources = {
                cpu: 50.0,
                memory: 87.0,
                disk: 70.0,
                loadAverage: [2.0, 1.8, 1.5]
            };

            alertManager.processResourceUpdates(resources);

            const memoryAlert = wsManager.alertCalls.find(
                a => a.type === 'resource_threshold' && a.data.resource === 'memory'
            );
            expect(memoryAlert).toBeDefined();
            expect(memoryAlert.severity).toBe('warning');
        });

        test('should generate load average alert', () => {
            const resources = {
                cpu: 50.0,
                memory: 60.0,
                disk: 70.0,
                loadAverage: [11.0, 10.5, 9.8]
            };

            alertManager.processResourceUpdates(resources);

            const loadAlert = wsManager.alertCalls.find(
                a => a.type === 'resource_threshold' && a.data.resource === 'load'
            );
            expect(loadAlert).toBeDefined();
            expect(loadAlert.severity).toBe('critical');
        });
    });

    describe('Resource Recovery Alerts', () => {
        test('should generate recovery alert when CPU normalizes', () => {
            const highResources = {
                cpu: 95.0,
                memory: 60.0,
                disk: 70.0,
                loadAverage: [2.0, 1.8, 1.5]
            };

            const normalResources = {
                cpu: 50.0,
                memory: 60.0,
                disk: 70.0,
                loadAverage: [2.0, 1.8, 1.5]
            };

            alertManager.processResourceUpdates(highResources);
            wsManager.alertCalls = [];
            alertManager.processResourceUpdates(normalResources);

            const recoveryAlert = wsManager.alertCalls.find(
                a => a.type === 'resource_recovery' && a.data.resource === 'cpu'
            );
            expect(recoveryAlert).toBeDefined();
            expect(recoveryAlert.severity).toBe('info');
        });
    });

    describe('Sync Status Alerts', () => {
        test('should generate alert when node loses sync', () => {
            const syncedStatus = {
                isSynced: true,
                currentHeight: 1000000,
                networkHeight: 1000000,
                progress: 100
            };

            const unsyncedStatus = {
                isSynced: false,
                currentHeight: 999000,
                networkHeight: 1000000,
                progress: 99.9
            };

            alertManager.processSyncStatusUpdates(syncedStatus);
            wsManager.alertCalls = [];
            alertManager.processSyncStatusUpdates(unsyncedStatus);

            const syncLostAlert = wsManager.alertCalls.find(a => a.type === 'sync_lost');
            expect(syncLostAlert).toBeDefined();
            expect(syncLostAlert.severity).toBe('critical');
        });

        test('should generate alert when node recovers sync', () => {
            const unsyncedStatus = {
                isSynced: false,
                currentHeight: 999000,
                networkHeight: 1000000,
                progress: 99.9
            };

            const syncedStatus = {
                isSynced: true,
                currentHeight: 1000000,
                networkHeight: 1000000,
                progress: 100
            };

            alertManager.processSyncStatusUpdates(unsyncedStatus);
            wsManager.alertCalls = [];
            alertManager.processSyncStatusUpdates(syncedStatus);

            const syncRecoveredAlert = wsManager.alertCalls.find(a => a.type === 'sync_recovered');
            expect(syncRecoveredAlert).toBeDefined();
            expect(syncRecoveredAlert.severity).toBe('info');
        });
    });

    describe('Alert Acknowledgment', () => {
        test('should acknowledge alerts', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            const alert = alertManager.alertHistory[0];
            
            const success = alertManager.acknowledgeAlert(alert.id);
            
            expect(success).toBe(true);
            expect(alert.acknowledged).toBe(true);
            expect(alert.acknowledgedAt).toBeDefined();
        });

        test('should broadcast acknowledgment', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            const alert = alertManager.alertHistory[0];
            
            wsManager.broadcastCalls = [];
            alertManager.acknowledgeAlert(alert.id);
            
            const ackBroadcast = wsManager.broadcastCalls.find(
                b => b.type === 'alert_acknowledged'
            );
            expect(ackBroadcast).toBeDefined();
        });

        test('should return false for non-existent alert', () => {
            const success = alertManager.acknowledgeAlert('non-existent-id');
            expect(success).toBe(false);
        });
    });

    describe('Alert History', () => {
        test('should maintain alert history', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            
            expect(alertManager.alertHistory.length).toBeGreaterThan(0);
            expect(alertManager.alertHistory[0].type).toBe('service_failure');
        });

        test('should filter alert history by severity', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            
            const criticalAlerts = alertManager.getAlertHistory({ severity: 'critical' });
            expect(criticalAlerts.length).toBeGreaterThan(0);
            expect(criticalAlerts.every(a => a.severity === 'critical')).toBe(true);
        });

        test('should filter alert history by type', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            
            const failureAlerts = alertManager.getAlertHistory({ type: 'service_failure' });
            expect(failureAlerts.length).toBeGreaterThan(0);
            expect(failureAlerts.every(a => a.type === 'service_failure')).toBe(true);
        });

        test('should limit alert history size', () => {
            const alerts = alertManager.getAlertHistory({ limit: 5 });
            expect(alerts.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Alert Statistics', () => {
        test('should provide alert statistics', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            
            const stats = alertManager.getStats();
            
            expect(stats.totalAlerts).toBeGreaterThan(0);
            expect(stats.alertsByType).toBeDefined();
            expect(stats.alertsBySeverity).toBeDefined();
            expect(stats.unacknowledged).toBeGreaterThan(0);
        });
    });

    describe('Threshold Updates', () => {
        test('should update alert thresholds', () => {
            const newThresholds = {
                cpu: { warning: 70, critical: 85 }
            };

            alertManager.updateThresholds(newThresholds);
            
            expect(alertManager.alertThresholds.cpu.warning).toBe(70);
            expect(alertManager.alertThresholds.cpu.critical).toBe(85);
        });
    });

    describe('Service Priority', () => {
        test('should assign critical priority to core services', () => {
            const service = {
                name: 'kaspa-node',
                profile: 'core',
                critical: true
            };

            const priority = alertManager.getServicePriority(service);
            expect(priority).toBe(alertManager.PRIORITIES.CRITICAL);
        });

        test('should assign high priority to prod services', () => {
            const service = {
                name: 'kasia-app',
                profile: 'prod'
            };

            const priority = alertManager.getServicePriority(service);
            expect(priority).toBe(alertManager.PRIORITIES.HIGH);
        });
    });

    describe('Shutdown', () => {
        test('should shutdown cleanly', () => {
            const services = [
                {
                    name: 'kaspa-node',
                    displayName: 'Kaspa Node',
                    status: 'unhealthy',
                    state: 'running',
                    profile: 'core'
                }
            ];

            alertManager.processServiceUpdates(services);
            alertManager.shutdown();
            
            expect(alertManager.activeAlerts.size).toBe(0);
            expect(alertManager.lastServiceStates.size).toBe(0);
        });
    });
});