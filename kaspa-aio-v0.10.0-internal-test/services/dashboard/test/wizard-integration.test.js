const WizardIntegration = require('../lib/WizardIntegration');
const ConfigurationSynchronizer = require('../lib/ConfigurationSynchronizer');
const axios = require('axios');
const fs = require('fs').promises;
const { exec } = require('child_process');

// Import test setup
require('./setup');

describe('Wizard Integration Tests', () => {
    let wizardIntegration;
    let configSynchronizer;

    beforeEach(() => {
        wizardIntegration = new WizardIntegration();
        configSynchronizer = new ConfigurationSynchronizer();
        
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('Wizard Launch from Dashboard', () => {
        test('should launch wizard with current configuration', async () => {
            // Mock configuration export
            const mockConfig = {
                environment: {
                    KASPA_NODE_URL: 'http://kaspa-node:16111',
                    KASIA_INDEXER_URL: 'http://api.kaspa.org'
                },
                activeProfiles: ['core', 'kaspa-user-applications'],
                serviceStatus: [
                    { name: 'kaspa-node', status: 'healthy' },
                    { name: 'kasia-app', status: 'healthy' }
                ]
            };

            // Mock file operations
            fs.readFile.mockResolvedValueOnce('KASPA_NODE_URL=http://kaspa-node:16111\nKASIA_INDEXER_URL=http://api.kaspa.org');
            fs.readFile.mockResolvedValueOnce(JSON.stringify({ version: '1.0.0' }));

            // Mock Docker commands
            global.mockExecAsync((command) => {
                if (command.includes('docker ps')) {
                    return { stdout: 'kaspa-node\tUp 2 hours\trunning\nkasia-app\tUp 1 hour\trunning' };
                }
                return { stdout: '', stderr: '' };
            });

            // Mock wizard availability and launch
            axios.get.mockResolvedValueOnce({ status: 200 }); // Wizard is running
            axios.post.mockResolvedValueOnce({ 
                status: 200, 
                data: { sessionId: 'test-session-123' } 
            });

            const result = await wizardIntegration.launchWizard({
                mode: 'reconfiguration',
                context: { includeSuggestions: true }
            });

            expect(result.success).toBe(true);
            expect(result.mode).toBe('reconfiguration');
            expect(result.sessionId).toBe('test-session-123');
            expect(result.wizardUrl).toContain('mode=reconfiguration');
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/dashboard/launch'),
                expect.objectContaining({
                    mode: 'reconfiguration',
                    currentConfig: expect.any(Object),
                    suggestions: expect.any(Array)
                }),
                expect.any(Object)
            );
        });

        test('should generate configuration suggestions before launch', async () => {
            // Mock healthy local indexers
            global.mockExecAsync((command) => {
                if (command.includes('docker ps')) {
                    return { 
                        stdout: 'kaspa-node\tUp 2 hours\trunning\nk-indexer\tUp 1 hour\trunning\nkasia-app\tUp 1 hour\trunning' 
                    };
                }
                return { stdout: '', stderr: '' };
            });

            // Mock configuration with public indexers
            fs.readFile.mockResolvedValueOnce('KASIA_INDEXER_URL=http://api.kaspa.org');

            const suggestions = await wizardIntegration.generateConfigurationSuggestions();

            expect(suggestions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'switch-to-local-indexers',
                        title: 'Switch to Local Indexers',
                        priority: 'high',
                        category: 'performance'
                    })
                ])
            );
        });

        test('should handle wizard launch failure gracefully', async () => {
            // Mock wizard not running
            axios.get.mockRejectedValue(new Error('Connection refused'));
            
            // Mock wizard start failure
            global.mockExecAsync(() => {
                throw new Error('Failed to start wizard');
            });

            await expect(wizardIntegration.launchWizard()).rejects.toThrow('Wizard launch failed');
        });
    });

    describe('Configuration Passing to Wizard', () => {
        test('should export complete configuration with profile status', async () => {
            // Mock file reads
            fs.readFile
                .mockResolvedValueOnce('KASPA_NODE_URL=http://kaspa-node:16111\nRESOURCE_MONITORING_ENABLED=true')
                .mockResolvedValueOnce(JSON.stringify({ 
                    version: '1.0.0',
                    profiles: ['core', 'indexer-services']
                }));

            // Mock Docker status - need to handle multiple calls
            let callCount = 0;
            global.mockExecAsync((command) => {
                if (command.includes('docker ps --format "{{.Names}}"')) {
                    return { stdout: 'kaspa-node\nk-indexer\nindexer-db' };
                }
                if (command.includes('docker ps --format "{{.Names}}\\t{{.Status}}\\t{{.State}}"')) {
                    return { stdout: 'kaspa-node\tUp 2 hours\trunning\nk-indexer\tUp 1 hour\trunning\nindexer-db\tUp 1 hour\trunning' };
                }
                return { stdout: '', stderr: '' };
            });

            const config = await wizardIntegration.exportCurrentConfiguration();

            expect(config).toMatchObject({
                environment: expect.objectContaining({
                    KASPA_NODE_URL: 'http://kaspa-node:16111',
                    RESOURCE_MONITORING_ENABLED: 'true'
                }),
                activeProfiles: expect.arrayContaining(['core', 'indexer-services']),
                serviceStatus: expect.any(Array)
            });
            
            // Check that profileStatus was added
            expect(config.profileStatus).toBeDefined();
            expect(config.profileStatus['core']).toBeDefined();
            expect(config.profileStatus['indexer-services']).toBeDefined();
        });

        test('should pass target profile context to wizard', async () => {
            axios.get.mockResolvedValueOnce({ status: 200 });
            axios.post.mockResolvedValueOnce({ 
                status: 200, 
                data: { sessionId: 'test-session' } 
            });

            const result = await wizardIntegration.launchWizard({
                mode: 'reconfiguration',
                targetProfile: 'kaspa-user-applications'
            });

            expect(result.wizardUrl).toContain('profile=kaspa-user-applications');
            expect(axios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    context: expect.objectContaining({
                        targetProfile: 'kaspa-user-applications'
                    })
                }),
                expect.any(Object)
            );
        });
    });

    describe('Wizard Status Polling', () => {
        test('should poll wizard status until completion', async () => {
            const sessionId = 'test-session-123';
            
            // Mock polling responses
            axios.get
                .mockResolvedValueOnce({ data: { completed: false, progress: 25 } })
                .mockResolvedValueOnce({ data: { completed: false, progress: 50 } })
                .mockResolvedValueOnce({ data: { completed: false, progress: 75 } })
                .mockResolvedValueOnce({ 
                    data: { 
                        completed: true, 
                        changes: { services: ['kasia-app'] },
                        newConfig: { environment: { KASIA_INDEXER_URL: 'http://kasia-indexer:8080' } }
                    } 
                });

            const finalStatus = await wizardIntegration.startWizardStatusPolling(sessionId, {
                interval: 100, // Fast polling for test
                timeout: 5000
            });

            expect(finalStatus.completed).toBe(true);
            expect(finalStatus.changes).toEqual({ services: ['kasia-app'] });
            expect(axios.get).toHaveBeenCalledTimes(4);
        });

        test('should handle wizard polling timeout', async () => {
            const sessionId = 'test-session-timeout';
            
            // Mock never-completing responses
            axios.get.mockResolvedValue({ data: { completed: false, progress: 10 } });

            await expect(
                wizardIntegration.startWizardStatusPolling(sessionId, {
                    interval: 100,
                    timeout: 500 // Short timeout for test
                })
            ).rejects.toThrow('Wizard status polling timeout');
        });

        test('should handle wizard failure during polling', async () => {
            const sessionId = 'test-session-failed';
            
            axios.get.mockResolvedValueOnce({ 
                data: { 
                    failed: true, 
                    error: 'Configuration validation failed' 
                } 
            });

            await expect(
                wizardIntegration.startWizardStatusPolling(sessionId)
            ).rejects.toThrow('Wizard failed: Configuration validation failed');
        });
    });

    describe('Dashboard Refresh After Reconfiguration', () => {
        test('should handle wizard completion and refresh dashboard', async () => {
            const completionData = {
                changes: { services: ['kasia-app', 'k-social'] },
                newConfig: { 
                    environment: { KASIA_INDEXER_URL: 'http://kasia-indexer:8080' },
                    activeProfiles: ['core', 'kaspa-user-applications', 'indexer-services']
                },
                restartRequired: true,
                mode: 'reconfiguration',
                profileChanges: {
                    'indexer-services': { action: 'added', services: ['k-indexer', 'indexer-db'] }
                },
                configurationDiff: {
                    KASIA_INDEXER_URL: { 
                        action: 'modified', 
                        oldValue: 'http://api.kaspa.org', 
                        newValue: 'http://kasia-indexer:8080' 
                    }
                }
            };

            // Mock service restart
            global.mockExecAsync((command) => {
                if (command.includes('docker restart')) {
                    return { stdout: 'Service restarted successfully' };
                }
                if (command.includes('chmod +x')) {
                    return { stdout: 'Permissions set' };
                }
                if (command.includes('pgrep')) {
                    return { stdout: '12345' }; // Monitoring running
                }
                return { stdout: '', stderr: '' };
            });

            // Mock file operations for resource monitoring
            fs.access.mockResolvedValue(); // Scripts exist
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();
            
            // Mock configuration file reads for suggestions
            fs.readFile
                .mockResolvedValueOnce('KASIA_INDEXER_URL=http://kasia-indexer:8080')
                .mockResolvedValueOnce('{"version": "1.0.0"}');

            const result = await wizardIntegration.handleWizardCompletion(completionData);

            expect(result.success).toBe(true);
            expect(result.mode).toBe('reconfiguration');
            expect(result.changeSummary).toMatchObject({
                profiles: expect.objectContaining({
                    added: expect.arrayContaining([
                        expect.objectContaining({ name: 'indexer-services' })
                    ])
                }),
                configuration: expect.objectContaining({
                    modified: expect.arrayContaining([
                        expect.objectContaining({ key: 'KASIA_INDEXER_URL' })
                    ])
                })
            });
            expect(result.resourceMonitoring).toBeDefined();
            expect(result.resourceMonitoring.enabled).toBe(true);
        });

        test('should restart only changed services selectively', async () => {
            const changedServices = ['kasia-app', 'k-social'];
            const profileChanges = {
                'kaspa-user-applications': { action: 'modified', services: changedServices }
            };

            // Mock successful restarts
            global.mockExecAsync((command) => {
                if (command.includes('docker restart')) {
                    return { stdout: 'Service restarted' };
                }
                return { stdout: '', stderr: '' };
            });

            const result = await wizardIntegration.restartChangedServicesSelectively(
                changedServices, 
                profileChanges
            );

            expect(result.restarted).toEqual(expect.arrayContaining(changedServices));
            expect(result.failed).toHaveLength(0);
        });
    });

    describe('Resource Monitoring Integration', () => {
        test('should setup resource monitoring for indexer services', async () => {
            const profileChanges = {
                'indexer-services': { action: 'added', services: ['k-indexer', 'indexer-db'] }
            };
            const newConfig = {
                environment: { RESOURCE_MONITORING_ENABLED: 'true' },
                activeProfiles: ['core', 'indexer-services']
            };

            // Mock script setup
            fs.access.mockResolvedValue(); // Scripts exist
            global.mockExecAsync((command) => {
                if (command.includes('chmod +x')) {
                    return { stdout: 'Permissions set' };
                }
                if (command.includes('pgrep')) {
                    return { stdout: '12345' }; // Monitoring is running
                }
                return { stdout: '', stderr: '' };
            });

            // Mock file operations
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            const result = await wizardIntegration.handleResourceMonitoringIntegration(
                profileChanges, 
                newConfig
            );

            expect(result.enabled).toBe(true);
            expect(result.configured).toBe(true);
            expect(result.started).toBe(true);
            expect(result.status).toBe('active');
        });

        test('should respect user preference to disable monitoring', async () => {
            const profileChanges = {
                'indexer-services': { action: 'added' }
            };
            const newConfig = {
                environment: { RESOURCE_MONITORING_ENABLED: 'false' },
                activeProfiles: ['core', 'indexer-services']
            };

            const result = await wizardIntegration.handleResourceMonitoringIntegration(
                profileChanges, 
                newConfig
            );

            expect(result.enabled).toBe(false);
            expect(result.status).toBe('disabled-by-user');
        });

        test('should get resource monitoring status', async () => {
            // Mock monitoring is running
            global.mockExecAsync((command) => {
                if (command.includes('pgrep -f "resource-monitor"')) {
                    return { stdout: '12345\n' };
                }
                return { stdout: '', stderr: '' };
            });

            // Mock config file exists
            fs.access.mockResolvedValue();

            const status = await wizardIntegration.getResourceMonitoringStatus();

            expect(status.enabled).toBe(true);
            expect(status.running).toBe(true);
            expect(status.status).toBe('active');
        });
    });

    describe('Configuration Synchronization', () => {
        test('should detect configuration changes', async () => {
            // Mock initial file content
            fs.readFile.mockResolvedValueOnce('KASPA_NODE_URL=http://kaspa-node:16111');
            
            await configSynchronizer.updateConfigurationHashes();
            
            // Mock changed file content
            fs.readFile.mockResolvedValueOnce('KASPA_NODE_URL=http://kaspa-node:16111\nNEW_SETTING=true');
            
            const currentHashes = await configSynchronizer.calculateConfigurationHashes();
            const changes = configSynchronizer.detectChanges(currentHashes);
            
            expect(changes).toHaveLength(1);
            expect(changes[0].type).toBe('environment');
            expect(changes[0].file).toBe('.env');
        });

        test('should validate configuration after changes', async () => {
            // Mock valid configuration files
            fs.readFile
                .mockResolvedValueOnce('KASPA_NODE_URL=http://kaspa-node:16111\nVALID_VAR=true')
                .mockResolvedValueOnce('{}') // docker-compose content
                .mockResolvedValueOnce('{"version": "1.0.0"}'); // installation state
                
            global.mockExecAsync((command) => {
                if (command.includes('docker-compose config')) {
                    return { stdout: 'Configuration is valid' };
                }
                return { stdout: '', stderr: '' };
            });

            const validation = await configSynchronizer.validateConfiguration();

            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should track configuration history with attribution', async () => {
            // Initialize config history properly
            configSynchronizer.configHistory = [];
            
            const changes = [
                { type: 'environment', file: '.env', newHash: 'abc123' }
            ];
            const diffAnalysis = {
                timestamp: new Date().toISOString(),
                changes: changes,
                impact: 'medium'
            };

            // Mock wizard not running (manual change)
            global.mockExecAsync((command) => {
                if (command.includes('pgrep -f "wizard"')) {
                    throw new Error('No process found');
                }
                return { stdout: '', stderr: '' };
            });

            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            await configSynchronizer.recordConfigurationChange(changes, diffAnalysis);

            expect(configSynchronizer.configHistory).toHaveLength(1);
            expect(configSynchronizer.configHistory[0]).toMatchObject({
                changes,
                diffAnalysis,
                attribution: expect.objectContaining({
                    source: 'manual'
                })
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle wizard connection loss during polling', async () => {
            const sessionId = 'test-session-connection-lost';
            
            axios.get
                .mockResolvedValueOnce({ data: { completed: false, progress: 50 } })
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' });

            await expect(
                wizardIntegration.startWizardStatusPolling(sessionId, { interval: 100 })
            ).rejects.toThrow('Wizard connection lost');
        });

        test('should handle service restart failures gracefully', async () => {
            const changedServices = ['failing-service', 'working-service'];
            
            global.mockExecAsync((command) => {
                if (command.includes('failing-service')) {
                    throw new Error('Service restart failed');
                }
                return { stdout: 'Service restarted' };
            });

            const result = await wizardIntegration.restartChangedServicesSelectively(changedServices, {});

            expect(result.restarted).toContain('working-service');
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0]).toMatchObject({
                service: 'failing-service',
                error: 'Service restart failed'
            });
        });

        test('should handle missing monitoring scripts gracefully', async () => {
            // Mock scripts don't exist
            fs.access.mockRejectedValue(new Error('File not found'));

            const result = await wizardIntegration.setupMonitoringScripts();

            expect(result.success).toBe(true); // Should succeed even if some scripts are missing
        });

        test('should handle configuration file read errors', async () => {
            fs.readFile.mockRejectedValue(new Error('Permission denied'));

            const config = await wizardIntegration.exportCurrentConfiguration();

            expect(config.environment).toEqual({});
            expect(config.installationState).toEqual({});
        });
    });

    describe('Integration Test Scenarios', () => {
        test('should complete full wizard workflow from launch to completion', async () => {
            // Step 1: Launch wizard
            axios.get.mockResolvedValueOnce({ status: 200 }); // Wizard running
            axios.post.mockResolvedValueOnce({ 
                status: 200, 
                data: { sessionId: 'integration-test-session' } 
            });

            const launchResult = await wizardIntegration.launchWizard({
                mode: 'reconfiguration',
                targetProfile: 'indexer-services'
            });

            expect(launchResult.success).toBe(true);

            // Step 2: Poll status until completion
            axios.get.mockResolvedValueOnce({ 
                data: { 
                    completed: true,
                    changes: { services: ['k-indexer'] },
                    newConfig: { 
                        environment: { RESOURCE_MONITORING_ENABLED: 'true' },
                        activeProfiles: ['core', 'indexer-services']
                    },
                    profileChanges: {
                        'indexer-services': { action: 'added', services: ['k-indexer'] }
                    }
                } 
            });

            const statusResult = await wizardIntegration.pollWizardStatus(launchResult.sessionId);
            expect(statusResult.completed).toBe(true);

            // Step 3: Handle completion
            global.mockExecAsync((command) => {
                if (command.includes('docker restart')) {
                    return { stdout: 'Restarted' };
                }
                if (command.includes('chmod +x')) {
                    return { stdout: 'Permissions set' };
                }
                if (command.includes('pgrep')) {
                    return { stdout: '12345' }; // Monitoring running
                }
                return { stdout: '', stderr: '' };
            });

            fs.access.mockResolvedValue(); // Scripts exist
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            const completionResult = await wizardIntegration.handleWizardCompletion(statusResult);

            expect(completionResult.success).toBe(true);
            expect(completionResult.resourceMonitoring.enabled).toBe(true);
            expect(completionResult.changeSummary.profiles.added).toHaveLength(1);
        });
    });
});