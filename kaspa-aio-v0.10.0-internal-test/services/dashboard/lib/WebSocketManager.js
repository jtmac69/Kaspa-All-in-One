const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * WebSocket Manager for robust real-time communication
 * Handles connection state management, reconnection, and broadcasting
 */
class WebSocketManager extends EventEmitter {
    constructor(server) {
        super();
        this.server = server;
        this.wss = null;
        this.clients = new Map();
        this.pingInterval = null;
        this.updateInterval = null;
        this.logStreams = new Map();
        
        // Configuration
        this.PING_INTERVAL = 30000; // 30 seconds
        this.UPDATE_INTERVAL = 5000; // 5 seconds
        this.CONNECTION_TIMEOUT = 60000; // 60 seconds
        
        this.initialize();
    }

    /**
     * Initialize WebSocket server
     */
    initialize() {
        this.wss = new WebSocket.Server({ 
            server: this.server,
            clientTracking: true
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket Server Error:', error);
            this.emit('error', error);
        });

        // Start ping/pong keepalive mechanism
        this.startPingPong();
        
        // Start periodic cleanup of inactive streams
        this.startPeriodicCleanup();
        
        console.log('WebSocket Manager initialized');
    }

    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            isAlive: true,
            connectedAt: new Date(),
            lastPong: new Date(),
            subscriptions: new Set(),
            updateFrequency: this.UPDATE_INTERVAL,
            isHidden: false
        };

        this.clients.set(clientId, clientInfo);
        
        console.log(`WebSocket client connected: ${clientId} (${this.clients.size} total)`);

        // Send connection acknowledgment
        this.sendToClient(clientId, {
            type: 'connection',
            data: {
                clientId: clientId,
                status: 'connected',
                timestamp: new Date().toISOString(),
                serverInfo: {
                    pingInterval: this.PING_INTERVAL,
                    updateInterval: this.UPDATE_INTERVAL
                }
            }
        });

        // Set up client event handlers
        ws.on('message', (message) => {
            this.handleMessage(clientId, message);
        });

        ws.on('pong', () => {
            this.handlePong(clientId);
        });

        ws.on('close', (code, reason) => {
            this.handleDisconnection(clientId, code, reason);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket client error (${clientId}):`, error);
            this.handleDisconnection(clientId, 1006, 'error');
        });

        // Send initial data
        this.emit('client-connected', clientId);
    }

    /**
     * Handle incoming messages from clients
     */
    handleMessage(clientId, message) {
        try {
            const data = JSON.parse(message.toString());
            const client = this.clients.get(clientId);
            
            if (!client) return;

            switch (data.type) {
                case 'subscribe_logs':
                    this.handleLogSubscription(clientId, data);
                    break;
                    
                case 'unsubscribe_logs':
                    this.handleLogUnsubscription(clientId, data);
                    break;
                    
                case 'subscribe_updates':
                    this.handleUpdateSubscription(clientId, data);
                    break;
                    
                case 'visibility_change':
                    this.handleVisibilityChange(clientId, data);
                    break;
                    
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;
                    
                default:
                    console.warn(`Unknown message type from client ${clientId}:`, data.type);
            }
        } catch (error) {
            console.error(`Failed to parse message from client ${clientId}:`, error);
        }
    }

    /**
     * Handle log subscription requests
     */
    handleLogSubscription(clientId, data) {
        const { serviceName, lines = 50 } = data;
        const client = this.clients.get(clientId);
        
        if (!client) return;

        // Add to client subscriptions
        client.subscriptions.add(`logs:${serviceName}`);
        
        // Start log stream if not already active
        const streamKey = `logs:${serviceName}`;
        if (!this.logStreams.has(streamKey)) {
            this.startLogStream(serviceName, lines);
        }

        console.log(`Client ${clientId} subscribed to logs for ${serviceName}`);
    }

    /**
     * Handle log unsubscription requests
     */
    handleLogUnsubscription(clientId, data) {
        const { serviceName } = data;
        const client = this.clients.get(clientId);
        
        if (!client) return;

        client.subscriptions.delete(`logs:${serviceName}`);
        
        // Check if any other clients are subscribed to this log stream
        const hasOtherSubscribers = Array.from(this.clients.values())
            .some(c => c.id !== clientId && c.subscriptions.has(`logs:${serviceName}`));
            
        if (!hasOtherSubscribers) {
            this.stopLogStream(serviceName);
        }

        console.log(`Client ${clientId} unsubscribed from logs for ${serviceName}`);
    }

    /**
     * Handle update subscription preferences
     */
    handleUpdateSubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { services, resources, frequency } = data;
        
        if (services !== undefined) {
            if (services) {
                client.subscriptions.add('updates:services');
            } else {
                client.subscriptions.delete('updates:services');
            }
        }
        
        if (resources !== undefined) {
            if (resources) {
                client.subscriptions.add('updates:resources');
            } else {
                client.subscriptions.delete('updates:resources');
            }
        }
        
        if (frequency && frequency >= 1000) {
            client.updateFrequency = frequency;
        }
    }

    /**
     * Handle tab visibility changes for throttling
     */
    handleVisibilityChange(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.isHidden = data.hidden || false;
        
        // Adjust update frequency based on visibility
        if (client.isHidden) {
            client.updateFrequency = Math.max(this.UPDATE_INTERVAL * 4, 20000); // Reduce to 20s when hidden
        } else {
            client.updateFrequency = this.UPDATE_INTERVAL;
        }

        console.log(`Client ${clientId} visibility changed: ${client.isHidden ? 'hidden' : 'visible'}`);
    }

    /**
     * Handle pong responses
     */
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.isAlive = true;
            client.lastPong = new Date();
        }
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason})`);

        // Clean up log streams for this client
        client.subscriptions.forEach(subscription => {
            if (subscription.startsWith('logs:')) {
                const serviceName = subscription.replace('logs:', '');
                const hasOtherSubscribers = Array.from(this.clients.values())
                    .some(c => c.id !== clientId && c.subscriptions.has(subscription));
                    
                if (!hasOtherSubscribers) {
                    this.stopLogStream(serviceName);
                }
            }
        });

        this.clients.delete(clientId);
        this.emit('client-disconnected', clientId);
    }

    /**
     * Start periodic cleanup of inactive streams
     */
    startPeriodicCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveStreams();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Start ping/pong keepalive mechanism
     */
    startPingPong() {
        this.pingInterval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (!client.isAlive) {
                    console.log(`Terminating unresponsive client: ${clientId}`);
                    client.ws.terminate();
                    this.clients.delete(clientId);
                    return;
                }

                client.isAlive = false;
                
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            });
        }, this.PING_INTERVAL);
    }

    /**
     * Start log streaming for a service with enhanced multiplexing
     */
    startLogStream(serviceName, lines = 50) {
        const { exec } = require('child_process');
        const streamKey = `logs:${serviceName}`;
        
        // Check if stream already exists
        if (this.logStreams.has(streamKey)) {
            console.log(`Log stream for ${serviceName} already active`);
            return;
        }
        
        try {
            const logProcess = exec(`docker logs -f --tail=${lines} ${serviceName}`);
            
            // Track stream metadata
            const streamInfo = {
                process: logProcess,
                serviceName: serviceName,
                startedAt: new Date(),
                subscriberCount: 0,
                linesStreamed: 0,
                lastActivity: new Date()
            };
            
            logProcess.stdout.on('data', (chunk) => {
                streamInfo.linesStreamed++;
                streamInfo.lastActivity = new Date();
                
                const logMessage = {
                    type: 'log',
                    serviceName: serviceName,
                    data: chunk.toString(),
                    timestamp: new Date().toISOString(),
                    stream: 'stdout'
                };
                
                const sentCount = this.broadcastToSubscribers(`logs:${serviceName}`, logMessage);
                streamInfo.subscriberCount = sentCount;
            });

            logProcess.stderr.on('data', (chunk) => {
                streamInfo.linesStreamed++;
                streamInfo.lastActivity = new Date();
                
                const logMessage = {
                    type: 'log',
                    serviceName: serviceName,
                    data: chunk.toString(),
                    level: 'error',
                    timestamp: new Date().toISOString(),
                    stream: 'stderr'
                };
                
                const sentCount = this.broadcastToSubscribers(`logs:${serviceName}`, logMessage);
                streamInfo.subscriberCount = sentCount;
            });

            logProcess.on('error', (error) => {
                console.error(`Log stream error for ${serviceName}:`, error);
                
                const errorMessage = {
                    type: 'log_error',
                    serviceName: serviceName,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                this.broadcastToSubscribers(`logs:${serviceName}`, errorMessage);
                
                // Clean up failed stream
                this.logStreams.delete(streamKey);
            });

            logProcess.on('exit', (code, signal) => {
                console.log(`Log stream for ${serviceName} exited (code: ${code}, signal: ${signal})`);
                
                const exitMessage = {
                    type: 'log_stream_ended',
                    serviceName: serviceName,
                    exitCode: code,
                    signal: signal,
                    timestamp: new Date().toISOString()
                };
                
                this.broadcastToSubscribers(`logs:${serviceName}`, exitMessage);
                
                // Clean up stream
                this.logStreams.delete(streamKey);
            });

            this.logStreams.set(streamKey, streamInfo);
            console.log(`Started log stream for ${serviceName}`);
            
        } catch (error) {
            console.error(`Failed to start log stream for ${serviceName}:`, error);
            
            const errorMessage = {
                type: 'log_stream_error',
                serviceName: serviceName,
                error: error.message,
                timestamp: new Date().toISOString()
            };
            
            this.broadcastToSubscribers(`logs:${serviceName}`, errorMessage);
        }
    }

    /**
     * Stop log streaming for a service with proper cleanup
     */
    stopLogStream(serviceName) {
        const streamKey = `logs:${serviceName}`;
        const streamInfo = this.logStreams.get(streamKey);
        
        if (streamInfo) {
            console.log(`Stopping log stream for ${serviceName} (${streamInfo.linesStreamed} lines streamed)`);
            
            // Send stream end notification
            const endMessage = {
                type: 'log_stream_stopped',
                serviceName: serviceName,
                stats: {
                    linesStreamed: streamInfo.linesStreamed,
                    duration: new Date() - streamInfo.startedAt,
                    lastActivity: streamInfo.lastActivity
                },
                timestamp: new Date().toISOString()
            };
            
            this.broadcastToSubscribers(`logs:${serviceName}`, endMessage);
            
            // Kill the process
            if (streamInfo.process && !streamInfo.process.killed) {
                streamInfo.process.kill('SIGTERM');
                
                // Force kill if it doesn't respond within 5 seconds
                setTimeout(() => {
                    if (!streamInfo.process.killed) {
                        streamInfo.process.kill('SIGKILL');
                    }
                }, 5000);
            }
            
            this.logStreams.delete(streamKey);
            console.log(`Stopped log stream for ${serviceName}`);
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error(`Failed to send message to client ${clientId}:`, error);
                return false;
            }
        }
        return false;
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message) {
        let sentCount = 0;
        this.clients.forEach((client, clientId) => {
            if (this.sendToClient(clientId, message)) {
                sentCount++;
            }
        });
        return sentCount;
    }

    /**
     * Broadcast to clients subscribed to specific topic
     */
    broadcastToSubscribers(subscription, message) {
        let sentCount = 0;
        this.clients.forEach((client, clientId) => {
            if (client.subscriptions.has(subscription)) {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            }
        });
        return sentCount;
    }

    /**
     * Broadcast service status updates
     */
    broadcastServiceUpdate(services) {
        const message = {
            type: 'service_update',
            data: services,
            timestamp: new Date().toISOString()
        };
        
        return this.broadcastToSubscribers('updates:services', message);
    }

    /**
     * Broadcast resource metrics updates
     */
    broadcastResourceUpdate(resources) {
        const message = {
            type: 'resource_update',
            data: resources,
            timestamp: new Date().toISOString()
        };
        
        return this.broadcastToSubscribers('updates:resources', message);
    }

    /**
     * Broadcast alert messages
     */
    broadcastAlert(alert) {
        const message = {
            type: 'alert',
            data: alert,
            timestamp: new Date().toISOString()
        };
        
        return this.broadcast(message);
    }

    /**
     * Get log stream statistics
     */
    getLogStreamStats() {
        const stats = {};
        
        this.logStreams.forEach((streamInfo, streamKey) => {
            const serviceName = streamKey.replace('logs:', '');
            stats[serviceName] = {
                linesStreamed: streamInfo.linesStreamed,
                subscriberCount: streamInfo.subscriberCount,
                startedAt: streamInfo.startedAt,
                lastActivity: streamInfo.lastActivity,
                uptime: new Date() - streamInfo.startedAt
            };
        });
        
        return stats;
    }

    /**
     * Clean up inactive log streams
     */
    cleanupInactiveStreams() {
        const now = new Date();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
        
        this.logStreams.forEach((streamInfo, streamKey) => {
            const timeSinceActivity = now - streamInfo.lastActivity;
            const hasSubscribers = Array.from(this.clients.values())
                .some(client => client.subscriptions.has(streamKey));
            
            if (!hasSubscribers && timeSinceActivity > inactivityThreshold) {
                const serviceName = streamKey.replace('logs:', '');
                console.log(`Cleaning up inactive log stream for ${serviceName}`);
                this.stopLogStream(serviceName);
            }
        });
    }
    getStats() {
        const now = new Date();
        const clients = Array.from(this.clients.values());
        
        return {
            totalClients: clients.length,
            activeClients: clients.filter(c => c.ws.readyState === WebSocket.OPEN).length,
            logStreams: this.logStreams.size,
            logStreamStats: this.getLogStreamStats(),
            subscriptions: {
                logs: clients.reduce((acc, c) => {
                    return acc + Array.from(c.subscriptions).filter(s => s.startsWith('logs:')).length;
                }, 0),
                updates: clients.reduce((acc, c) => {
                    return acc + Array.from(c.subscriptions).filter(s => s.startsWith('updates:')).length;
                }, 0)
            },
            averageUptime: clients.length > 0 ? 
                clients.reduce((acc, c) => acc + (now - c.connectedAt), 0) / clients.length : 0
        };
    }

    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        console.log('Shutting down WebSocket Manager...');
        
        // Clear intervals
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Stop all log streams
        this.logStreams.forEach((streamInfo, key) => {
            const serviceName = key.replace('logs:', '');
            this.stopLogStream(serviceName);
        });
        this.logStreams.clear();
        
        // Close all client connections
        this.clients.forEach((client, clientId) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close(1001, 'Server shutdown');
            }
        });
        this.clients.clear();
        
        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
        }
        
        console.log('WebSocket Manager shutdown complete');
    }
}

module.exports = WebSocketManager;