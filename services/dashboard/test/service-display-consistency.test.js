/**
 * Property-Based Test: Dashboard Service Display Consistency
 * 
 * Property 3: Dashboard Service Display Consistency
 * For any installation state, the Dashboard SHALL display exactly the services 
 * listed in the installation state's services array—no more, no less.
 * 
 * Validates: Requirements 1.3, 1.4, 4.1, 4.2
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { SharedStateManager } = require('../../shared/lib/state-manager');

describe('Property Test: Dashboard Service Display Consistency', () => {
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

        // Create a test Express app that mimics Dashboard behavior
        app = express();
        app.use(express.json());

        // Initialize state manager with test path
        stateManager = new SharedStateManager(testStatePath);

        // Add test endpoint that mimics Dashboard's service display logic
        app.get('/api/services', async (req, res) => {
            try {
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json({
                        services: [],
                        message: 'No installation detected'
                    });
                }
                
                // Dashboard should display exactly the services from installation state
                const displayedServices = installationState.services.map(service => ({
                    name: service.name,
                    displayName: service.displayName || service.name,
                    profile: service.profile,
                    running: service.running,
                    exists: service.exists
                }));
                
                res.json({
                    services: displayedServices,
                    profiles: installationState.profiles.selected || []
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

    /**
     * Generator for valid service entries with known service names
     */
    const serviceEntryArbitrary = fc.record({
        name: fc.constantFrom(
            'kaspa-node', 'kaspa-archive-node', 'kasia-app', 'k-social',
            'kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer',
            'kasia-indexer', 'k-indexer', 'timescaledb-kindexer',
            'kaspa-stratum', 'portainer', 'pgadmin'
        ),
        displayName: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
        profile: fc.constantFrom(
            'kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle',
            'kasia-indexer', 'k-indexer-bundle', 'kaspa-archive-node', 'kaspa-stratum',
            'management'
        ),
        running: fc.boolean(),
        exists: fc.boolean(),
        containerName: fc.option(fc.string({ minLength: 5, maxLength: 25 })),
        ports: fc.option(fc.array(fc.integer({ min: 1000, max: 65535 }), { maxLength: 3 }))
    });

    /**
     * Generator for valid installation states with new profile IDs
     */
    const installationStateArbitrary = fc.record({
        version: fc.constant('1.0.0'),
        installedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        lastModified: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        phase: fc.constantFrom('pending', 'installing', 'complete', 'error'),
        profiles: fc.record({
            selected: fc.array(
                fc.constantFrom(
                    'kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle',
                    'kasia-indexer', 'k-indexer-bundle', 'kaspa-archive-node', 'kaspa-stratum'
                ), 
                { minLength: 1, maxLength: 8 }
            ),
            count: fc.integer({ min: 1, max: 8 })
        }),
        configuration: fc.record({
            network: fc.constantFrom('mainnet', 'testnet-10', 'testnet-11'),
            publicNode: fc.boolean(),
            hasIndexers: fc.boolean(),
            hasArchive: fc.boolean(),
            hasMining: fc.boolean(),
            kaspaNodePort: fc.option(fc.integer({ min: 16110, max: 16120 }))
        }),
        services: fc.array(serviceEntryArbitrary, { minLength: 1, maxLength: 15 }),
        summary: fc.record({
            total: fc.integer({ min: 1, max: 15 }),
            running: fc.integer({ min: 0, max: 15 }),
            stopped: fc.integer({ min: 0, max: 15 }),
            missing: fc.integer({ min: 0, max: 15 })
        }),
        wizardRunning: fc.option(fc.boolean())
    });

    /**
     * Property Test: Dashboard Service Display Consistency
     * Feature: wizard-dashboard-unification, Property 3: Dashboard Service Display Consistency
     */
    test('Property 3: Dashboard displays exactly the services from installation state', async () => {
        await fc.assert(
            fc.asyncProperty(installationStateArbitrary, async (installationState) => {
                // Ensure service names are unique to avoid conflicts
                const uniqueServices = [];
                const seenNames = new Set();
                
                for (const service of installationState.services) {
                    if (!seenNames.has(service.name)) {
                        seenNames.add(service.name);
                        uniqueServices.push(service);
                    }
                }
                
                // Update the installation state with unique services
                const stateWithUniqueServices = {
                    ...installationState,
                    services: uniqueServices,
                    summary: {
                        ...installationState.summary,
                        total: uniqueServices.length
                    }
                };
                
                // Write the installation state
                await stateManager.writeState(stateWithUniqueServices);
                
                // Make request to Dashboard API
                const response = await request(app).get('/api/services');
                
                // Verify response is successful
                expect(response.status).toBe(200);
                
                // Extract service names from installation state and response
                const expectedServiceNames = new Set(stateWithUniqueServices.services.map(s => s.name));
                const actualServiceNames = new Set(response.body.services.map(s => s.name));
                
                // Property: Dashboard displays exactly the services from installation state
                // No more, no less
                expect(actualServiceNames).toEqual(expectedServiceNames);
                
                // Verify each service in the response matches the installation state
                for (const displayedService of response.body.services) {
                    const stateService = stateWithUniqueServices.services.find(s => s.name === displayedService.name);
                    expect(stateService).toBeDefined();
                    expect(displayedService.profile).toBe(stateService.profile);
                    expect(displayedService.running).toBe(stateService.running);
                    expect(displayedService.exists).toBe(stateService.exists);
                }
                
                // Verify no extra services are displayed
                expect(response.body.services).toHaveLength(stateWithUniqueServices.services.length);
                
                // Verify profiles are correctly read from installation state
                expect(new Set(response.body.profiles)).toEqual(new Set(stateWithUniqueServices.profiles.selected));
            }),
            { 
                numRuns: 100,
                timeout: 30000,
                verbose: true
            }
        );
    });

    /**
     * Property Test: No Installation State Consistency
     */
    test('Property 3a: Dashboard displays no services when no installation state exists', async () => {
        await fc.assert(
            fc.asyncProperty(fc.constant(null), async () => {
                // Ensure no installation state exists
                try {
                    await fs.unlink(testStatePath);
                } catch (error) {
                    // Ignore if file doesn't exist
                }
                
                // Make request to Dashboard API
                const response = await request(app).get('/api/services');
                
                // Verify response is successful
                expect(response.status).toBe(200);
                
                // Property: When no installation state exists, Dashboard displays no services
                expect(response.body.services).toEqual([]);
                expect(response.body.message).toBe('No installation detected');
            }),
            { 
                numRuns: 10,
                timeout: 10000
            }
        );
    });

    /**
     * Property Test: Empty Services Array Consistency
     */
    test('Property 3b: Dashboard displays no services when installation state has empty services array', async () => {
        await fc.assert(
            fc.asyncProperty(
                installationStateArbitrary.map(state => ({
                    ...state,
                    services: [], // Empty services array
                    summary: {
                        ...state.summary,
                        total: 0,
                        running: 0,
                        stopped: 0,
                        missing: 0
                    }
                })),
                async (installationState) => {
                    // Write the installation state with empty services
                    await stateManager.writeState(installationState);
                    
                    // Make request to Dashboard API
                    const response = await request(app).get('/api/services');
                    
                    // Verify response is successful
                    expect(response.status).toBe(200);
                    
                    // Property: When installation state has empty services array, Dashboard displays no services
                    expect(response.body.services).toEqual([]);
                    expect(response.body.services).toHaveLength(0);
                    
                    // But profiles should still be available
                    expect(response.body.profiles).toEqual(installationState.profiles.selected);
                }
            ),
            { 
                numRuns: 20,
                timeout: 15000
            }
        );
    });
});