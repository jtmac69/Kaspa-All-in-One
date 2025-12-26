const EventEmitter = require('events');

/**
 * Alert Manager for generating and broadcasting system alerts
 * Handles service failures, resource thresholds, and sync status changes
 */
class AlertManager extends EventEmitter {
    constructor(wsManager) {
        super();
        this.wsManager = wsManager;
        
        // Alert configuration
        this.alertThresholds = {
            cpu: { warning: 80, critical: 90 },
            memory: { warning: 85, critical: 90 },
            disk: { warning: 80, critical: 90 },
            load: { warning: 8.0, critical: 10.0 }
        };
        
        // Alert state tracking
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.maxHistorySize = 1000;
        this.lastServiceStates = new Map();
        this.lastResourceState = null;
        this.lastSyncState = null;
        
        // Alert priorities
        this.PRIORITIES = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4
        };
        
        // Alert severities
        this.SEVERITIES = {
            INFO: 'info',
            WARNING: 'warning',
            CRITICAL: 'critical'
        };
        
        console.log('Alert Manager initialized');
    }

    /**
     * Process service status updates and generate alerts
     */
    processServiceUpdates(services) {
        services.forEach(service => {
            const lastState = this.lastServiceStates.get(service.name);
            
            // Check for service state changes
            if (lastState && lastState.status !== service.status) {
                this.handleServiceStateChange(service, lastState);
            }
            
            // Check for service failures
            if (service.status === 'unhealthy' || service.status === 'stopped') {
                this.handleServiceFailure(service);
            }
            
            // Check for service recovery
            if (service.status === 'healthy' && lastState && 
                (lastState.status === 'unhealthy' || lastState.status === 'stopped')) {
                this.handleServiceRecovery(service, lastState);
            }
            
            this.lastServiceStates.set(service.name, {
                status: service.status,
                state: service.state,
                error: service.error,
                timestamp: new Date()
            });
        });
    }

    /**
     * Process resource metrics and generate alerts
     */
    processResourceUpdates(resources) {
        const alerts = [];
        
        // CPU alerts
        if (resources.cpu >= this.alertThresholds.cpu.critical) {
            alerts.push(this.createResourceAlert('cpu', 'critical', resources.cpu, this.alertThresholds.cpu.critical));
        } else if (resources.cpu >= this.alertThresholds.cpu.warning) {
            alerts.push(this.createResourceAlert('cpu', 'warning', resources.cpu, this.alertThresholds.cpu.warning));
        }
        
        // Memory alerts
        if (resources.memory >= this.alertThresholds.memory.critical) {
            alerts.push(this.createResourceAlert('memory', 'critical', resources.memory, this.alertThresholds.memory.critical));
        } else if (resources.memory >= this.alertThresholds.memory.warning) {
            alerts.push(this.createResourceAlert('memory', 'warning', resources.memory, this.alertThresholds.memory.warning));
        }
        
        // Disk alerts
        if (resources.disk >= this.alertThresholds.disk.critical) {
            alerts.push(this.createResourceAlert('disk', 'critical', resources.disk, this.alertThresholds.disk.critical));
        } else if (resources.disk >= this.alertThresholds.disk.warning) {
            alerts.push(this.createResourceAlert('disk', 'warning', resources.disk, this.alertThresholds.disk.warning));
        }
        
        // Load average alerts
        if (resources.loadAverage && resources.loadAverage[0] >= this.alertThresholds.load.critical) {
            alerts.push(this.createResourceAlert('load', 'critical', resources.loadAverage[0], this.alertThresholds.load.critical));
        } else if (resources.loadAverage && resources.loadAverage[0] >= this.alertThresholds.load.warning) {
            alerts.push(this.createResourceAlert('load', 'warning', resources.loadAverage[0], this.alertThresholds.load.warning));
        }
        
        // Process new alerts
        alerts.forEach(alert => {
            this.processAlert(alert);
        });
        
        // Check for resource recovery
        if (this.lastResourceState) {
            this.checkResourceRecovery(resources);
        }
        
        this.lastResourceState = {
            ...resources,
            timestamp: new Date()
        };
    }

    /**
     * Process sync status updates and generate alerts
     */
    processSyncStatusUpdates(syncStatus) {
        const wasSynced = this.lastSyncState ? this.lastSyncState.isSynced : null;
        
        // Check for sync loss
        if (wasSynced === true && syncStatus.isSynced === false) {
            const alert = {
                id: this.generateAlertId(),
                type: 'sync_lost',
                severity: this.SEVERITIES.CRITICAL,
                priority: this.PRIORITIES.CRITICAL,
                title: 'Kaspa Node Lost Sync',
                message: 'Kaspa node has lost synchronization with the network',
                source: 'kaspa-node',
                data: {
                    currentHeight: syncStatus.currentHeight,
                    networkHeight: syncStatus.networkHeight,
                    progress: syncStatus.progress
                },
                timestamp: new Date().toISOString(),
                acknowledged: false
            };
            
            this.processAlert(alert);
        }
        
        // Check for sync recovery
        if (wasSynced === false && syncStatus.isSynced === true) {
            const alert = {
                id: this.generateAlertId(),
                type: 'sync_recovered',
                severity: this.SEVERITIES.INFO,
                priority: this.PRIORITIES.MEDIUM,
                title: 'Kaspa Node Sync Recovered',
                message: 'Kaspa node has successfully synchronized with the network',
                source: 'kaspa-node',
                data: {
                    currentHeight: syncStatus.currentHeight,
                    networkHeight: syncStatus.networkHeight
                },
                timestamp: new Date().toISOString(),
                acknowledged: false
            };
            
            this.processAlert(alert);
            
            // Clear any active sync-related alerts
            this.clearAlertsOfType('sync_lost');
        }
        
        this.lastSyncState = {
            ...syncStatus,
            timestamp: new Date()
        };
    }

    /**
     * Handle service state changes
     */
    handleServiceStateChange(service, lastState) {
        const alert = {
            id: this.generateAlertId(),
            type: 'service_state_change',
            severity: this.getServiceChangeSeverity(service.status, lastState.status),
            priority: this.getServicePriority(service),
            title: `Service State Changed: ${service.displayName}`,
            message: `${service.displayName} changed from ${lastState.status} to ${service.status}`,
            source: service.name,
            data: {
                serviceName: service.name,
                displayName: service.displayName,
                previousStatus: lastState.status,
                currentStatus: service.status,
                error: service.error
            },
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.processAlert(alert);
    }

    /**
     * Handle service failures
     */
    handleServiceFailure(service) {
        const alertKey = `service_failure_${service.name}`;
        
        // Don't create duplicate alerts for the same failure
        if (this.activeAlerts.has(alertKey)) {
            return;
        }
        
        const alert = {
            id: this.generateAlertId(),
            type: 'service_failure',
            severity: service.status === 'stopped' ? this.SEVERITIES.WARNING : this.SEVERITIES.CRITICAL,
            priority: this.getServicePriority(service),
            title: `Service ${service.status === 'stopped' ? 'Stopped' : 'Unhealthy'}: ${service.displayName}`,
            message: this.getServiceFailureMessage(service),
            source: service.name,
            data: {
                serviceName: service.name,
                displayName: service.displayName,
                status: service.status,
                state: service.state,
                error: service.error,
                profile: service.profile
            },
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.processAlert(alert);
        this.activeAlerts.set(alertKey, alert);
    }

    /**
     * Handle service recovery
     */
    handleServiceRecovery(service, lastState) {
        const alertKey = `service_failure_${service.name}`;
        
        // Clear the failure alert
        if (this.activeAlerts.has(alertKey)) {
            this.activeAlerts.delete(alertKey);
        }
        
        const alert = {
            id: this.generateAlertId(),
            type: 'service_recovery',
            severity: this.SEVERITIES.INFO,
            priority: this.getServicePriority(service),
            title: `Service Recovered: ${service.displayName}`,
            message: `${service.displayName} has recovered and is now healthy`,
            source: service.name,
            data: {
                serviceName: service.name,
                displayName: service.displayName,
                previousStatus: lastState.status,
                currentStatus: service.status,
                downtime: new Date() - lastState.timestamp
            },
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.processAlert(alert);
    }

    /**
     * Create resource alert
     */
    createResourceAlert(resource, severity, currentValue, threshold) {
        return {
            id: this.generateAlertId(),
            type: 'resource_threshold',
            severity: severity,
            priority: severity === 'critical' ? this.PRIORITIES.CRITICAL : this.PRIORITIES.HIGH,
            title: `${resource.toUpperCase()} Usage ${severity === 'critical' ? 'Critical' : 'High'}`,
            message: `${resource.toUpperCase()} usage is ${currentValue.toFixed(1)}${resource === 'load' ? '' : '%'}, exceeding ${severity} threshold of ${threshold}${resource === 'load' ? '' : '%'}`,
            source: 'system',
            data: {
                resource: resource,
                currentValue: currentValue,
                threshold: threshold,
                severity: severity
            },
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
    }

    /**
     * Check for resource recovery
     */
    checkResourceRecovery(currentResources) {
        const recoveryThreshold = 5; // 5% below warning threshold for recovery
        
        // Check CPU recovery
        if (this.lastResourceState.cpu >= this.alertThresholds.cpu.warning &&
            currentResources.cpu < (this.alertThresholds.cpu.warning - recoveryThreshold)) {
            this.createRecoveryAlert('cpu', currentResources.cpu);
        }
        
        // Check memory recovery
        if (this.lastResourceState.memory >= this.alertThresholds.memory.warning &&
            currentResources.memory < (this.alertThresholds.memory.warning - recoveryThreshold)) {
            this.createRecoveryAlert('memory', currentResources.memory);
        }
        
        // Check disk recovery
        if (this.lastResourceState.disk >= this.alertThresholds.disk.warning &&
            currentResources.disk < (this.alertThresholds.disk.warning - recoveryThreshold)) {
            this.createRecoveryAlert('disk', currentResources.disk);
        }
        
        // Check load recovery
        if (this.lastResourceState.loadAverage && currentResources.loadAverage &&
            this.lastResourceState.loadAverage[0] >= this.alertThresholds.load.warning &&
            currentResources.loadAverage[0] < (this.alertThresholds.load.warning - 1.0)) {
            this.createRecoveryAlert('load', currentResources.loadAverage[0]);
        }
    }

    /**
     * Create recovery alert
     */
    createRecoveryAlert(resource, currentValue) {
        const alert = {
            id: this.generateAlertId(),
            type: 'resource_recovery',
            severity: this.SEVERITIES.INFO,
            priority: this.PRIORITIES.MEDIUM,
            title: `${resource.toUpperCase()} Usage Normalized`,
            message: `${resource.toUpperCase()} usage has returned to normal levels: ${currentValue.toFixed(1)}${resource === 'load' ? '' : '%'}`,
            source: 'system',
            data: {
                resource: resource,
                currentValue: currentValue
            },
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.processAlert(alert);
        
        // Clear related threshold alerts
        this.clearResourceAlerts(resource);
    }

    /**
     * Process and broadcast alert
     */
    processAlert(alert) {
        // Add to history
        this.alertHistory.unshift(alert);
        
        // Trim history if too large
        if (this.alertHistory.length > this.maxHistorySize) {
            this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
        }
        
        // Broadcast alert
        if (this.wsManager) {
            this.wsManager.broadcastAlert(alert);
        }
        
        // Emit event for other components
        this.emit('alert', alert);
        
        console.log(`Alert generated: ${alert.title} (${alert.severity})`);
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            
            // Broadcast acknowledgment
            if (this.wsManager) {
                this.wsManager.broadcast({
                    type: 'alert_acknowledged',
                    data: { alertId, acknowledgedAt: alert.acknowledgedAt },
                    timestamp: new Date().toISOString()
                });
            }
            
            return true;
        }
        return false;
    }

    /**
     * Clear alerts of specific type
     */
    clearAlertsOfType(type) {
        const keysToDelete = [];
        this.activeAlerts.forEach((alert, key) => {
            if (alert.type === type) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => {
            this.activeAlerts.delete(key);
        });
    }

    /**
     * Clear resource alerts for specific resource
     */
    clearResourceAlerts(resource) {
        const keysToDelete = [];
        this.activeAlerts.forEach((alert, key) => {
            if (alert.type === 'resource_threshold' && alert.data.resource === resource) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => {
            this.activeAlerts.delete(key);
        });
    }

    /**
     * Get service failure message
     */
    getServiceFailureMessage(service) {
        if (service.status === 'stopped') {
            return `${service.displayName} is not running. This may affect system functionality.`;
        } else if (service.status === 'unhealthy') {
            const errorMsg = service.error ? ` Error: ${service.error}` : '';
            return `${service.displayName} is running but not responding to health checks.${errorMsg}`;
        }
        return `${service.displayName} has an unknown issue.`;
    }

    /**
     * Get service change severity
     */
    getServiceChangeSeverity(currentStatus, previousStatus) {
        if (currentStatus === 'healthy' && previousStatus !== 'healthy') {
            return this.SEVERITIES.INFO;
        } else if (currentStatus === 'unhealthy') {
            return this.SEVERITIES.CRITICAL;
        } else if (currentStatus === 'stopped') {
            return this.SEVERITIES.WARNING;
        }
        return this.SEVERITIES.INFO;
    }

    /**
     * Get service priority based on criticality
     */
    getServicePriority(service) {
        if (service.critical || service.profile === 'core') {
            return this.PRIORITIES.CRITICAL;
        } else if (service.profile === 'prod') {
            return this.PRIORITIES.HIGH;
        } else if (service.profile === 'explorer') {
            return this.PRIORITIES.MEDIUM;
        }
        return this.PRIORITIES.LOW;
    }

    /**
     * Generate unique alert ID
     */
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get alert statistics
     */
    getStats() {
        const now = new Date();
        const last24Hours = now.getTime() - (24 * 60 * 60 * 1000);
        
        const recent = this.alertHistory.filter(a => new Date(a.timestamp).getTime() > last24Hours);
        
        return {
            totalAlerts: this.alertHistory.length,
            activeAlerts: this.activeAlerts.size,
            recentAlerts: recent.length,
            alertsByType: this.getAlertsByType(recent),
            alertsBySeverity: this.getAlertsBySeverity(recent),
            unacknowledged: this.alertHistory.filter(a => !a.acknowledged).length
        };
    }

    /**
     * Get alerts grouped by type
     */
    getAlertsByType(alerts) {
        const byType = {};
        alerts.forEach(alert => {
            byType[alert.type] = (byType[alert.type] || 0) + 1;
        });
        return byType;
    }

    /**
     * Get alerts grouped by severity
     */
    getAlertsBySeverity(alerts) {
        const bySeverity = {};
        alerts.forEach(alert => {
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        });
        return bySeverity;
    }

    /**
     * Get alert history with optional filtering
     */
    getAlertHistory(options = {}) {
        let alerts = [...this.alertHistory];
        
        if (options.severity) {
            alerts = alerts.filter(a => a.severity === options.severity);
        }
        
        if (options.type) {
            alerts = alerts.filter(a => a.type === options.type);
        }
        
        if (options.source) {
            alerts = alerts.filter(a => a.source === options.source);
        }
        
        if (options.unacknowledged) {
            alerts = alerts.filter(a => !a.acknowledged);
        }
        
        if (options.limit) {
            alerts = alerts.slice(0, options.limit);
        }
        
        return alerts;
    }

    /**
     * Update alert thresholds
     */
    updateThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
        console.log('Alert thresholds updated:', this.alertThresholds);
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        console.log('Shutting down Alert Manager...');
        
        // Clear active alerts
        this.activeAlerts.clear();
        
        // Clear state tracking
        this.lastServiceStates.clear();
        this.lastResourceState = null;
        this.lastSyncState = null;
        
        console.log('Alert Manager shutdown complete');
    }
}

module.exports = AlertManager;