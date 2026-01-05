/**
 * Installation State Integration Tests
 * Tests the Dashboard's integration with SharedStateManager
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { SharedStateManager } = require('../../shared/lib/state-manager');

describe('Installation State Integration', () => {
    let app;
    let stateManager;
    let testStatePath;

    beforeEach(async () => {
        // Create unique test state path for each test
        testStatePath = path.join(__dirname, `test-installation-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
        
        // Clean up test state file before each test
        try {
            await fs.unlink(testStatePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }

        // Create a test Express app with minimal setup
        app = express();
        app.use(express.json());

        // Initialize state manager with test path
        stateManager = new SharedStateManager(testStatePath);

        // Add test endpoints
        app.get('/api/status', async (req, res) => {
            try {
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json({
                        noInstallation: true,
                        message: 'No installation detected',
                        services: []
                    });
                }
                
                // Mock service data
                const mockServices = [
                    { name: 'kaspa-node', status: 'healthy' },
                    { name: 'dashboard', status: 'healthy' }
                ];
                
                const installedServiceNames = new Set(installationState.services.map(s => s.name));
                const filteredServices = mockServices.filter(service => 
                    installedServiceNames.has(service.name)
                );
                
                res.json({
                    noInstallation: false,
                    services: filteredServices,
                    installationState: {
                        version: installationState.version,
                        installedAt: installationState.installedAt,
                        lastModified: installationState.lastModified,
                        profiles: installationState.profiles
                    }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/profiles', async (req, res) => {
            try {
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json([]);
                }
                
                res.json(installationState.profiles.selected || []);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/installation/state', async (req, res) => {
            try {
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json({
                        exists: false,
                        message: 'No installation detected'
                    });
                }
                
                res.json({
                    exists: true,
                    state: installationState
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    });

    afterEach(async () => {
        // Clean up test state file
        if (stateManager) {
            stateManager.destroy();
            stateManager = null;
        }
        
        try {
            await fs.unlink(testStatePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    });

    describe('No Installation Detected', () => {
        test('should return noInstallation when state file does not exist', async () => {
            const response = await request(app).get('/api/status');
            
            expect(response.status).toBe(200);
            expect(response.body.noInstallation).toBe(true);
            expect(response.body.message).toBe('No installation detected');
            expect(response.body.services).toEqual([]);
        });

        test('should return empty profiles when state file does not exist', async () => {
            const response = await request(app).get('/api/profiles');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        test('should return exists: false for installation state endpoint', async () => {
            const response = await request(app).get('/api/installation/state');
            
            expect(response.status).toBe(200);
            expect(response.body.exists).toBe(false);
            expect(response.body.message).toBe('No installation detected');
        });
    });

    describe('With Installation State', () => {
        beforeEach(async () => {
            // Create a valid installation state
            const testState = {
                version: '1.0.0',
                installedAt: '2025-01-01T00:00:00.000Z',
                lastModified: '2025-01-01T00:00:00.000Z',
                phase: 'complete',
                profiles: {
                    selected: ['core', 'indexer-services'],
                    count: 2
                },
                configuration: {
                    network: 'mainnet',
                    publicNode: false,
                    hasIndexers: true,
                    hasArchive: false,
                    hasMining: false
                },
                services: [
                    { name: 'kaspa-node', profile: 'core', running: true, exists: true },
                    { name: 'dashboard', profile: 'core', running: true, exists: true },
                    { name: 'k-indexer', profile: 'indexer-services', running: true, exists: true }
                ],
                summary: {
                    total: 3,
                    running: 3,
                    stopped: 0,
                    missing: 0
                }
            };
            
            await stateManager.writeState(testState);
        });

        test('should return only installed services', async () => {
            const response = await request(app).get('/api/status');
            
            expect(response.status).toBe(200);
            expect(response.body.noInstallation).toBe(false);
            expect(response.body.services).toHaveLength(2); // Only kaspa-node and dashboard from mock
            expect(response.body.installationState).toBeDefined();
            expect(response.body.installationState.version).toBe('1.0.0');
        });

        test('should return installed profiles', async () => {
            const response = await request(app).get('/api/profiles');
            
            expect(response.status).toBe(200);
            expect(response.body).toEqual(['core', 'indexer-services']);
        });

        test('should return installation state with exists: true', async () => {
            const response = await request(app).get('/api/installation/state');
            
            expect(response.status).toBe(200);
            expect(response.body.exists).toBe(true);
            expect(response.body.state).toBeDefined();
            expect(response.body.state.version).toBe('1.0.0');
            expect(response.body.state.profiles.selected).toEqual(['core', 'indexer-services']);
        });

        test('should filter services based on installation state', async () => {
            const response = await request(app).get('/api/status');
            
            expect(response.status).toBe(200);
            
            // Should only include services that are in the installation state
            const serviceNames = response.body.services.map(s => s.name);
            expect(serviceNames).toContain('kaspa-node');
            expect(serviceNames).toContain('dashboard');
            
            // Should not include services not in installation state
            expect(serviceNames).not.toContain('k-indexer'); // Not in mock services
        });
    });

    describe('Error Handling', () => {
        test('should handle corrupted state file gracefully', async () => {
            // Write invalid JSON
            await fs.writeFile(testStatePath, 'invalid json{', 'utf8');
            
            const response = await request(app).get('/api/status');
            
            expect(response.status).toBe(200);
            expect(response.body.noInstallation).toBe(true);
        });

        test('should handle missing required fields in state', async () => {
            // Write state with missing fields
            const invalidState = {
                version: '1.0.0',
                // Missing other required fields
            };
            
            await fs.writeFile(testStatePath, JSON.stringify(invalidState), 'utf8');
            
            const response = await request(app).get('/api/status');
            
            expect(response.status).toBe(200);
            expect(response.body.noInstallation).toBe(true);
        });
    });
});
