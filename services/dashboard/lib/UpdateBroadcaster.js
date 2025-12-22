const EventEmitter = require('events');

/**
 * Update Broadcaster for real-time data broadcasting
 * Handles periodic updates, selective subscriptions, and frequency throttling
 */
class UpdateBroadcaster extends EventEmitter {
    constructor(wsManager, serviceMonitor, resourceMonitor) {
        super();
        this.wsManager = wsManager;
        this.serviceMonitor = serviceMonitor;
        this.resourceMonitor = resourceMonitor;
        
        // Configuration
        this.UPDATE_INTERVAL = 5000; // 5 seconds
        this.HIDDEN_TAB_INTERVAL = 20000; // 20 seconds for hidden tabs
        
        // State tracking
        this.intervals = new Map();
        this.lastServiceUpdate = null;
        this.lastResourceUpdate = null;
        this.isRunning = false;
        
        // Bind methods
        this.handleClientConnected = this.handleClientConnected.bind(this);
        this.handleClientDisconnected = this.handleClientDisconnected.bind(this);
        
        this.initialize();
    }

    /**
     * Initialize the broadcaster
     */
    initialize() {
        // Listen for WebSocket client events
        this.wsManager.on('client-connected', this.handleClientConnected);
        this.wsManager.on('client-disconnected', this.handleClientDisconnected);
        
        console.log('Update Broadcaster initialized');
    }

    /**
     * Start broadcasting updates
     */
    start() {
        if (this.isRunning) {
            console.log('Update Broadcaster already running');
            return;
        }

        this.isRunning = true;
        
        // Start main update loop
        this.startUpdateLoop();
        
        console.log('Update Broadcaster started');
    }

    /**
     * Stop broadcasting updates
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        // Clear all intervals
        this.intervals.forEach((interval, key) => {
            clearInterval(interval);
        });
        this.intervals.clear();
        
        console.log('Update Broadcaster stopped');
    }

    /**
     * Start the main update loop
     */
    startUpdateLoop() {
        // Service status updates
        const serviceInterval = setInterval(async () => {
            try {
                await this.broadcastServiceUpdates();
            } catch (error) {
                console.error('Service update broadcast error:', error);
            }
        }, this.UPDATE_INTERVAL);
        
        this.intervals.set('services', serviceInterval);

        // Resource metrics updates
        const resourceInterval = setInterval(async () => {
            try {
                await this.broadcastResourceUpdates();
            } catch (error) {
                console.error('Resource update broadcast error:', error);
            }
        }, this.UPDATE_INTERVAL);
        
        this.intervals.set('resources', resourceInterval);

        // Combined updates for clients that want both
        const combinedInterval = setInterval(async () => {
            try {
                await this.broadcastCombinedUpdates();
            } catch (error) {
                console.error('Combined update broadcast error:', error);
            }
        }, this.UPDATE_INTERVAL);
        
        this.intervals.set('combined', combinedInterval);
    }

    /**
     * Broadcast service status updates
     */
    async broadcastServiceUpdates() {
        if (!this.serviceMonitor) {
            return;
        }

        try {
            const services = await this.serviceMonitor.checkAllServices();
            
            // Check if services have changed
            const servicesChanged = this.hasServicesChanged(services);
            
            if (servicesChanged || this.shouldForceUpdate('services')) {
                this.lastServiceUpdate = {
                    data: services,
                    timestamp: new Date().toISOString()
                };
                
                const sentCount = this.wsManager.broadcastServiceUpdate(services);
                
                if (sentCount > 0) {
                    this.emit('services-broadcasted', { services, sentCount });
                }
            }
        } catch (error) {
            console.error('Failed to broadcast service updates:', error);
        }
    }

    /**
     * Broadcast resource metrics updates
     */
    async broadcastResourceUpdates() {
        if (!this.resourceMonitor) {
            return;
        }

        try {
            const resources = await this.resourceMonitor.getSystemResources();
            
            // Check if resources have significantly changed
            const resourcesChanged = this.hasResourcesChanged(resources);
            
            if (resourcesChanged || this.shouldForceUpdate('resources')) {
                this.lastResourceUpdate = {
                    data: resources,
                    timestamp: new Date().toISOString()
                };
                
                const sentCount = this.wsManager.broadcastResourceUpdate(resources);
                
                if (sentCount > 0) {
                    this.emit('resources-broadcasted', { resources, sentCount });
                }
            }
        } catch (error) {
            console.error('Failed to broadcast resource updates:', error);
        }
    }

    /**
     * Broadcast combined updates for efficiency
     */
    async broadcastCombinedUpdates() {
        try {
            const [services, resources] = await Promise.all([
                this.serviceMonitor ? this.serviceMonitor.checkAllServices() : [],
                this.resourceMonitor ? this.resourceMonitor.getSystemResources() : {}
            ]);

            const message = {
                type: 'combined_update',
                data: {
                    services,
                    resources,
                    timestamp: new Date().toISOString()
                }
            };

            // Send to clients subscribed to combined updates
            const sentCount = this.wsManager.broadcastToSubscribers('updates:combined', message);
            
            if (sentCount > 0) {
                this.emit('combined-broadcasted', { services, resources, sentCount });
            }
        } catch (error) {
            console.error('Failed to broadcast combined updates:', error);
        }
    }

    /**
     * Handle new client connection
     */
    handleClientConnected(clientId) {
        // Send initial data to new client
        this.sendInitialData(clientId);
        
        // Set up client-specific update frequency if needed
        this.setupClientUpdates(clientId);
    }

    /**
     * Handle client disconnection
     */
    handleClientDisconnected(clientId) {
        // Clean up any client-specific intervals
        const clientInterval = this.intervals.get(`client_${clientId}`);
        if (clientInterval) {
            clearInterval(clientInterval);
            this.intervals.delete(`client_${clientId}`);
        }
    }

    /**
     * Send initial data to a new client
     */
    async sendInitialData(clientId) {
        try {
            const [services, resources] = await Promise.all([
                this.serviceMonitor ? this.serviceMonitor.checkAllServices() : [],
                this.resourceMonitor ? this.resourceMonitor.getSystemResources() : {}
            ]);

            const initialMessage = {
                type: 'initial_data',
                data: {
                    services,
                    resources,
                    timestamp: new Date().toISOString()
                }
            };

            this.wsManager.sendToClient(clientId, initialMessage);
            
            console.log(`Sent initial data to client ${clientId}`);
        } catch (error) {
            console.error(`Failed to send initial data to client ${clientId}:`, error);
        }
    }

    /**
     * Setup client-specific updates based on preferences
     */
    setupClientUpdates(clientId) {
        // This can be extended to handle per-client update frequencies
        // For now, we use the global update mechanism with subscription filtering
    }

    /**
     * Check if services have changed significantly
     */
    hasServicesChanged(newServices) {
        if (!this.lastServiceUpdate) {
            return true;
        }

        const oldServices = this.lastServiceUpdate.data;
        
        // Quick length check
        if (oldServices.length !== newServices.length) {
            return true;
        }

        // Check for status changes
        for (let i = 0; i < newServices.length; i++) {
            const oldService = oldServices[i];
            const newService = newServices[i];
            
            if (!oldService || 
                oldService.status !== newService.status ||
                oldService.state !== newService.state ||
                oldService.error !== newService.error) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if resources have changed significantly
     */
    hasResourcesChanged(newResources) {
        if (!this.lastResourceUpdate) {
            return true;
        }

        const oldResources = this.lastResourceUpdate.data;
        const threshold = 2; // 2% change threshold

        // Check CPU change
        if (Math.abs(oldResources.cpu - newResources.cpu) > threshold) {
            return true;
        }

        // Check memory change
        if (Math.abs(oldResources.memory - newResources.memory) > threshold) {
            return true;
        }

        // Check disk change
        if (Math.abs(oldResources.disk - newResources.disk) > threshold) {
            return true;
        }

        // Check for new alerts
        if (newResources.alerts && newResources.alerts.length > 0) {
            const oldAlertCount = oldResources.alerts ? oldResources.alerts.length : 0;
            if (newResources.alerts.length !== oldAlertCount) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine if we should force an update (periodic full updates)
     */
    shouldForceUpdate(type) {
        const now = Date.now();
        const lastUpdate = type === 'services' ? this.lastServiceUpdate : this.lastResourceUpdate;
        
        if (!lastUpdate) {
            return true;
        }

        const timeSinceLastUpdate = now - new Date(lastUpdate.timestamp).getTime();
        const forceUpdateInterval = 30000; // Force update every 30 seconds
        
        return timeSinceLastUpdate > forceUpdateInterval;
    }

    /**
     * Broadcast custom update to specific subscribers
     */
    broadcastCustomUpdate(subscription, data) {
        const message = {
            type: 'custom_update',
            subscription: subscription,
            data: data,
            timestamp: new Date().toISOString()
        };

        return this.wsManager.broadcastToSubscribers(subscription, message);
    }

    /**
     * Update broadcast frequency for hidden tabs
     */
    updateFrequencyForVisibility() {
        // This is handled per-client in the WebSocketManager
        // The UpdateBroadcaster continues at normal frequency
        // Individual clients throttle based on their visibility state
    }

    /**
     * Get broadcaster statistics
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            activeIntervals: this.intervals.size,
            lastServiceUpdate: this.lastServiceUpdate ? this.lastServiceUpdate.timestamp : null,
            lastResourceUpdate: this.lastResourceUpdate ? this.lastResourceUpdate.timestamp : null,
            updateInterval: this.UPDATE_INTERVAL,
            hiddenTabInterval: this.HIDDEN_TAB_INTERVAL
        };
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        console.log('Shutting down Update Broadcaster...');
        
        this.stop();
        
        // Remove event listeners
        this.wsManager.removeListener('client-connected', this.handleClientConnected);
        this.wsManager.removeListener('client-disconnected', this.handleClientDisconnected);
        
        console.log('Update Broadcaster shutdown complete');
    }
}

module.exports = UpdateBroadcaster;