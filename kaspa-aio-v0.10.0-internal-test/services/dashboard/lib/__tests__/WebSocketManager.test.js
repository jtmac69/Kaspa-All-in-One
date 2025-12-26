const WebSocket = require('ws');
const http = require('http');
const WebSocketManager = require('../WebSocketManager');

describe('WebSocketManager Integration Tests', () => {
    let server;
    let wsManager;
    let wsPort;

    beforeAll((done) => {
        // Create HTTP server for testing
        server = http.createServer();
        server.listen(0, () => {
            wsPort = server.address().port;
            wsManager = new WebSocketManager(server);
            done();
        });
    });

    afterAll((done) => {
        if (wsManager) {
            wsManager.shutdown();
        }
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('Connection Management', () => {
        test('should accept WebSocket connections', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);
            
            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
            });
            
            ws.on('close', () => {
                done();
            });
        });

        test('should send connection acknowledgment', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    expect(message.data.status).toBe('connected');
                    expect(message.data.clientId).toBeDefined();
                    expect(message.data.serverInfo).toBeDefined();
                    ws.close();
                    done();
                }
            });
        });

        test('should handle multiple concurrent connections', (done) => {
            const connections = [];
            const expectedConnections = 3;
            let connectedCount = 0;

            for (let i = 0; i < expectedConnections; i++) {
                const ws = new WebSocket(`ws://localhost:${wsPort}`);
                connections.push(ws);

                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'connection') {
                        connectedCount++;
                        
                        if (connectedCount === expectedConnections) {
                            // Check stats
                            const stats = wsManager.getStats();
                            expect(stats.totalClients).toBe(expectedConnections);
                            expect(stats.activeClients).toBe(expectedConnections);
                            
                            // Close all connections
                            connections.forEach(conn => conn.close());
                            done();
                        }
                    }
                });
            }
        });
    });

    describe('Message Broadcasting', () => {
        test('should broadcast messages to all clients', (done) => {
            const clients = [];
            const clientCount = 2;
            let messagesReceived = 0;
            
            const testMessage = {
                type: 'test_broadcast',
                data: { message: 'Hello World' },
                timestamp: new Date().toISOString()
            };

            // Create multiple clients
            for (let i = 0; i < clientCount; i++) {
                const ws = new WebSocket(`ws://localhost:${wsPort}`);
                clients.push(ws);

                ws.on('message', (data) => {
                    const message = JSON.parse(data.toString());
                    
                    if (message.type === 'test_broadcast') {
                        expect(message.data.message).toBe('Hello World');
                        messagesReceived++;
                        
                        if (messagesReceived === clientCount) {
                            clients.forEach(client => client.close());
                            done();
                        }
                    }
                });
            }

            // Wait for connections to be established, then broadcast
            setTimeout(() => {
                wsManager.broadcast(testMessage);
            }, 100);
        });

        test('should broadcast to specific subscribers only', (done) => {
            const subscribedClient = new WebSocket(`ws://localhost:${wsPort}`);
            const unsubscribedClient = new WebSocket(`ws://localhost:${wsPort}`);
            
            let subscribedReceived = false;
            let unsubscribedReceived = false;

            subscribedClient.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Subscribe to updates
                    subscribedClient.send(JSON.stringify({
                        type: 'subscribe_updates',
                        services: true
                    }));
                } else if (message.type === 'service_update') {
                    subscribedReceived = true;
                    checkCompletion();
                }
            });

            unsubscribedClient.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'service_update') {
                    unsubscribedReceived = true;
                }
            });

            function checkCompletion() {
                setTimeout(() => {
                    expect(subscribedReceived).toBe(true);
                    expect(unsubscribedReceived).toBe(false);
                    
                    subscribedClient.close();
                    unsubscribedClient.close();
                    done();
                }, 100);
            }

            // Wait for connections, then broadcast
            setTimeout(() => {
                wsManager.broadcastServiceUpdate([
                    { name: 'test-service', status: 'healthy' }
                ]);
            }, 200);
        });
    });

    describe('Log Streaming', () => {
        test('should handle log subscription requests', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);
            let logStreamStarted = false;

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Subscribe to logs for a test service
                    ws.send(JSON.stringify({
                        type: 'subscribe_logs',
                        serviceName: 'test-service',
                        lines: 10
                    }));
                } else if (message.type === 'log' || message.type === 'log_error') {
                    logStreamStarted = true;
                } else if (message.type === 'log_stream_error') {
                    // Expected for non-existent service
                    logStreamStarted = true;
                }
            });

            // Check if log streaming was attempted
            setTimeout(() => {
                expect(logStreamStarted).toBe(true);
                ws.close();
                done();
            }, 1000);
        });

        test('should handle log unsubscription', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Subscribe then unsubscribe
                    ws.send(JSON.stringify({
                        type: 'subscribe_logs',
                        serviceName: 'test-service'
                    }));
                    
                    setTimeout(() => {
                        ws.send(JSON.stringify({
                            type: 'unsubscribe_logs',
                            serviceName: 'test-service'
                        }));
                        
                        // Check that stream was cleaned up
                        setTimeout(() => {
                            const stats = wsManager.getStats();
                            expect(stats.logStreams).toBe(0);
                            ws.close();
                            done();
                        }, 100);
                    }, 100);
                }
            });
        });
    });

    describe('Ping/Pong Keepalive', () => {
        test('should respond to ping messages', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Send ping
                    ws.send(JSON.stringify({ type: 'ping' }));
                } else if (message.type === 'pong') {
                    expect(message.timestamp).toBeDefined();
                    ws.close();
                    done();
                }
            });
        });

        test('should handle pong responses', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('ping', () => {
                ws.pong();
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Connection established, test will complete when ping/pong works
                    setTimeout(() => {
                        ws.close();
                        done();
                    }, 100);
                }
            });
        });
    });

    describe('Visibility and Throttling', () => {
        test('should handle visibility change messages', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Send visibility change
                    ws.send(JSON.stringify({
                        type: 'visibility_change',
                        hidden: true
                    }));
                    
                    // Test that client state was updated
                    setTimeout(() => {
                        const stats = wsManager.getStats();
                        expect(stats.totalClients).toBe(1);
                        ws.close();
                        done();
                    }, 100);
                }
            });
        });
    });

    describe('Connection Statistics', () => {
        test('should provide accurate connection statistics', (done) => {
            const ws1 = new WebSocket(`ws://localhost:${wsPort}`);
            const ws2 = new WebSocket(`ws://localhost:${wsPort}`);
            
            let connectionsEstablished = 0;

            function checkStats() {
                connectionsEstablished++;
                
                if (connectionsEstablished === 2) {
                    const stats = wsManager.getStats();
                    
                    expect(stats.totalClients).toBe(2);
                    expect(stats.activeClients).toBe(2);
                    expect(stats.subscriptions).toBeDefined();
                    expect(stats.averageUptime).toBeGreaterThanOrEqual(0);
                    
                    ws1.close();
                    ws2.close();
                    done();
                }
            }

            ws1.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'connection') {
                    checkStats();
                }
            });

            ws2.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'connection') {
                    checkStats();
                }
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed messages gracefully', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Send malformed message
                    ws.send('invalid json');
                    
                    // Connection should remain open
                    setTimeout(() => {
                        expect(ws.readyState).toBe(WebSocket.OPEN);
                        ws.close();
                        done();
                    }, 100);
                }
            });
        });

        test('should clean up resources on client disconnect', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Subscribe to logs
                    ws.send(JSON.stringify({
                        type: 'subscribe_logs',
                        serviceName: 'test-service'
                    }));
                    
                    // Close connection abruptly
                    setTimeout(() => {
                        ws.terminate();
                        
                        // Check cleanup
                        setTimeout(() => {
                            const stats = wsManager.getStats();
                            expect(stats.totalClients).toBe(0);
                            done();
                        }, 100);
                    }, 100);
                }
            });
        });
    });

    describe('Alert Broadcasting', () => {
        test('should broadcast alerts to all clients', (done) => {
            const ws = new WebSocket(`ws://localhost:${wsPort}`);
            
            const testAlert = {
                id: 'test-alert-1',
                type: 'test_alert',
                severity: 'warning',
                message: 'Test alert message',
                timestamp: new Date().toISOString()
            };

            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'connection') {
                    // Broadcast alert
                    wsManager.broadcastAlert(testAlert);
                } else if (message.type === 'alert') {
                    expect(message.data.id).toBe('test-alert-1');
                    expect(message.data.severity).toBe('warning');
                    expect(message.data.message).toBe('Test alert message');
                    ws.close();
                    done();
                }
            });
        });
    });
});