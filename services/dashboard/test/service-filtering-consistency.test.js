/**
 * Property-Based Test: Service Filtering Consistency
 * 
 * Property 9: Service Filtering Consistency
 * For any service filter selection, the Dashboard SHALL display only services matching 
 * the selected filter criteria, and the filter dropdown SHALL contain accurate service 
 * counts for each filter option.
 * 
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { SharedStateManager } = require('../../shared/lib/state-manager');

describe('Property Test: Service Filtering Consistency', () => {
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

        // Service to profile mapping (NEW profile IDs)
        const serviceToProfile = {
            'kaspa-node': 'kaspa-node',
            'kaspa-archive-node': 'kaspa-archive-node',
            'kasia-app': 'kasia-app',
            'k-social': 'k-social-app',
            'kaspa-explorer': 'kaspa-explorer-bundle',
            'simply-kaspa-indexer': 'kaspa-explorer-bundle',
            'timescaledb-explorer': 'kaspa-explorer-bundle',
            'kasia-indexer': 'kasia-indexer',
            'k-indexer': 'k-indexer-bundle',
            'timescaledb-kindexer': 'k-indexer-bundle',
            'kaspa-stratum': 'kaspa-stratum',
            'portainer': 'management',
            'pgadmin': 'management',
            // Legacy mappings for test compatibility
            'timescaledb': 'k-indexer-bundle',
            'indexer-db': 'k-indexer-bundle',
            'dashboard': 'management',
            'wallet': 'kaspa-node',
            'kaspa-nginx': 'management'
        };
        
        // Service to type mapping
        const serviceToType = {
            'kaspa-node': 'Node',
            'kaspa-archive-node': 'Node',
            'kasia-app': 'Application',
            'k-social': 'Application',
            'kaspa-explorer': 'Application',
            'kasia-indexer': 'Indexer',
            'k-indexer': 'Indexer',
            'simply-kaspa-indexer': 'Indexer',
            'timescaledb-explorer': 'Database',
            'timescaledb-kindexer': 'Database',
            'timescaledb': 'Database',
            'indexer-db': 'Database',
            'kaspa-stratum': 'Mining',
            'portainer': 'Management',
            'pgadmin': 'Management',
            'dashboard': 'Management',
            'wallet': 'Wallet',
            'kaspa-nginx': 'Proxy'
        };

        // Add test endpoint that mimics Dashboard's profiles API
        app.get('/api/profiles', async (req, res) => {
            try {
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json([]);
                }
                
                const services = installationState.services || [];
                const filterOptions = [];
                
                // Always include "All Services" option
                filterOptions.push({
                    name: 'All Services',
                    value: 'all',
                    count: services.length
                });
                
                // Group by service type
                const serviceTypes = {};
                services.forEach(service => {
                    const type = service.type || serviceToType[service.name] || 'Other';
                    serviceTypes[type] = (serviceTypes[type] || 0) + 1;
                });
                
                // Add service type filters
                Object.entries(serviceTypes).forEach(([type, count]) => {
                    filterOptions.push({
                        name: type,
                        value: `type:${type}`,
                        count: count
                    });
                });
                
                // Group by profile
                const profiles = {};
                services.forEach(service => {
                    const profile = service.profile || serviceToProfile[service.name];
                    if (profile) {
                        profiles[profile] = (profiles[profile] || 0) + 1;
                    }
                });
                
                // Add profile filters
                Object.entries(profiles).forEach(([profile, count]) => {
                    filterOptions.push({
                        name: `${profile} Profile`,
                        value: `profile:${profile}`,
                        count: count
                    });
                });
                
                res.json(filterOptions);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Add test endpoint that mimics Dashboard's service filtering logic
        app.get('/api/services/filtered', async (req, res) => {
            try {
                const { filter = 'all' } = req.query;
                const installationState = await stateManager.readState();
                
                if (!installationState) {
                    return res.json({ services: [] });
                }
                
                let filteredServices = installationState.services || [];
                
                if (filter !== 'all') {
                    if (filter.startsWith('type:')) {
                        // Filter by service type
                        const type = filter.substring(5);
                        filteredServices = filteredServices.filter(s => {
                            const serviceType = s.type || serviceToType[s.name] || 'Other';
                            return serviceType === type;
                        });
                    } else if (filter.startsWith('profile:')) {
                        // Filter by profile
                        const profile = filter.substring(8);
                        filteredServices = filteredServices.filter(s => {
                            const serviceProfile = s.profile || serviceToProfile[s.name];
                            return serviceProfile === profile;
                        });
                    } else {
                        // Legacy profile filtering (for backward compatibility)
                        filteredServices = filteredServices.filter(s => {
                            const serviceProfile = s.profile || serviceToProfile[s.name];
                            return serviceProfile === filter;
                        });
                    }
                }
                
                res.json({ 
                    services: filteredServices,
                    filter: filter,
                    totalServices: installationState.services.length
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
    const knownServiceArbitrary = fc.constantFrom(
        'kaspa-node', 'kaspa-archive-node', 'kasia-app', 'k-social',
        'kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer',
        'kasia-indexer', 'k-indexer', 'timescaledb-kindexer',
        'kaspa-stratum', 'portainer', 'pgadmin',
        // Legacy service names for backward compatibility testing
        'timescaledb', 'indexer-db', 'dashboard', 'wallet', 'kaspa-nginx'
    );

    const serviceEntryArbitrary = fc.record({
        name: knownServiceArbitrary,
        displayName: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
        profile: fc.option(fc.constantFrom(
            'kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle',
            'kasia-indexer', 'k-indexer-bundle', 'kaspa-archive-node', 'kaspa-stratum', 'management'
        )),
        type: fc.option(fc.constantFrom('Node', 'Management', 'Wallet', 'Database', 'Indexer', 'Application', 'Proxy', 'Mining')),
        running: fc.boolean(),
        exists: fc.boolean(),
        containerName: fc.option(fc.string({ minLength: 5, maxLength: 25 })),
        ports: fc.option(fc.array(fc.integer({ min: 1000, max: 65535 }), { maxLength: 3 }))
    });

    /**
     * Generator for valid installation states with diverse service combinations
     */
    const installationStateArbitrary = fc.record({
        version: fc.constant('1.0.0'),
        installedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        lastModified: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        phase: fc.constantFrom('pending', 'installing', 'complete', 'error'),
        profiles: fc.record({
            selected: fc.array(fc.constantFrom(
                'kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle',
                'kasia-indexer', 'k-indexer-bundle', 'kaspa-archive-node', 'kaspa-stratum', 'management'
            ), { minLength: 1, maxLength: 9 }),
            count: fc.integer({ min: 1, max: 9 })
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
     * Property Test: Service Filter Options Generation
     * Feature: wizard-dashboard-unification, Property 9: Service Filtering Consistency
     */
    test('Property 9a: Filter dropdown contains accurate service counts for each filter option', async () => {
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
                
                // Get filter options from API
                const response = await request(app).get('/api/profiles');
                
                // Verify response is successful
                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                
                const filterOptions = response.body;
                
                // Property: "All Services" option should have count equal to total services
                const allServicesOption = filterOptions.find(opt => opt.value === 'all');
                expect(allServicesOption).toBeDefined();
                expect(allServicesOption.count).toBe(uniqueServices.length);
                
                // Property: Type filter counts should sum correctly
                const typeOptions = filterOptions.filter(opt => opt.value.startsWith('type:'));
                let totalTypeCount = 0;
                
                for (const typeOption of typeOptions) {
                    const type = typeOption.value.substring(5);
                    
                    // Count services of this type manually
                    const expectedCount = uniqueServices.filter(service => {
                        const serviceType = service.type || getServiceType(service.name) || 'Other';
                        return serviceType === type;
                    }).length;
                    
                    expect(typeOption.count).toBe(expectedCount);
                    expect(typeOption.count).toBeGreaterThan(0); // Should only include types that exist
                    totalTypeCount += typeOption.count;
                }
                
                // All services should be categorized by type
                expect(totalTypeCount).toBe(uniqueServices.length);
                
                // Property: Profile filter counts should be accurate
                const profileOptions = filterOptions.filter(opt => opt.value.startsWith('profile:'));
                
                for (const profileOption of profileOptions) {
                    const profile = profileOption.value.substring(8);
                    
                    // Count services of this profile manually
                    const expectedCount = uniqueServices.filter(service => {
                        const serviceProfile = service.profile || getServiceProfile(service.name);
                        return serviceProfile === profile;
                    }).length;
                    
                    expect(profileOption.count).toBe(expectedCount);
                    expect(profileOption.count).toBeGreaterThan(0); // Should only include profiles that exist
                }
            }),
            { 
                numRuns: 100,
                timeout: 30000,
                verbose: true
            }
        );
    });

    /**
     * Property Test: Service Filtering by Type
     * Feature: wizard-dashboard-unification, Property 9: Service Filtering Consistency
     */
    test('Property 9b: Type-based filtering displays only services matching the selected type', async () => {
        await fc.assert(
            fc.asyncProperty(
                installationStateArbitrary,
                fc.constantFrom('Node', 'Management', 'Wallet', 'Database', 'Indexer', 'Application', 'Proxy', 'Mining'),
                async (installationState, filterType) => {
                    // Ensure service names are unique and we have services of the filter type
                    const uniqueServices = [];
                    const seenNames = new Set();
                    
                    for (const service of installationState.services) {
                        if (!seenNames.has(service.name)) {
                            seenNames.add(service.name);
                            uniqueServices.push(service);
                        }
                    }
                    
                    // Only proceed if we have services of the target type
                    const servicesOfType = uniqueServices.filter(service => {
                        const serviceType = service.type || getServiceType(service.name) || 'Other';
                        return serviceType === filterType;
                    });
                    
                    // Skip if no services of this type
                    fc.pre(servicesOfType.length > 0);
                    
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
                    
                    // Filter services by type
                    const response = await request(app)
                        .get('/api/services/filtered')
                        .query({ filter: `type:${filterType}` });
                    
                    // Verify response is successful
                    expect(response.status).toBe(200);
                    
                    const filteredServices = response.body.services;
                    
                    // Property: All returned services should match the filter type
                    for (const service of filteredServices) {
                        const serviceType = service.type || getServiceType(service.name) || 'Other';
                        expect(serviceType).toBe(filterType);
                    }
                    
                    // Property: Should return exactly the services of this type
                    expect(filteredServices).toHaveLength(servicesOfType.length);
                    
                    // Property: Should contain all services of this type
                    const filteredServiceNames = new Set(filteredServices.map(s => s.name));
                    const expectedServiceNames = new Set(servicesOfType.map(s => s.name));
                    expect(filteredServiceNames).toEqual(expectedServiceNames);
                }
            ),
            { 
                numRuns: 50,
                timeout: 30000
            }
        );
    });

    /**
     * Property Test: Service Filtering by Profile
     * Feature: wizard-dashboard-unification, Property 9: Service Filtering Consistency
     */
    test('Property 9c: Profile-based filtering displays only services matching the selected profile', async () => {
        await fc.assert(
            fc.asyncProperty(
                installationStateArbitrary,
                fc.constantFrom(
                    'kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle',
                    'kasia-indexer', 'k-indexer-bundle', 'kaspa-archive-node', 'kaspa-stratum', 'management'
                ),
                async (installationState, filterProfile) => {
                    // Ensure service names are unique and we have services of the filter profile
                    const uniqueServices = [];
                    const seenNames = new Set();
                    
                    for (const service of installationState.services) {
                        if (!seenNames.has(service.name)) {
                            seenNames.add(service.name);
                            uniqueServices.push(service);
                        }
                    }
                    
                    // Only proceed if we have services of the target profile
                    const servicesOfProfile = uniqueServices.filter(service => {
                        const serviceProfile = service.profile || getServiceProfile(service.name);
                        return serviceProfile === filterProfile;
                    });
                    
                    // Skip if no services of this profile
                    fc.pre(servicesOfProfile.length > 0);
                    
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
                    
                    // Filter services by profile
                    const response = await request(app)
                        .get('/api/services/filtered')
                        .query({ filter: `profile:${filterProfile}` });
                    
                    // Verify response is successful
                    expect(response.status).toBe(200);
                    
                    const filteredServices = response.body.services;
                    
                    // Property: All returned services should match the filter profile
                    for (const service of filteredServices) {
                        const serviceProfile = service.profile || getServiceProfile(service.name);
                        expect(serviceProfile).toBe(filterProfile);
                    }
                    
                    // Property: Should return exactly the services of this profile
                    expect(filteredServices).toHaveLength(servicesOfProfile.length);
                    
                    // Property: Should contain all services of this profile
                    const filteredServiceNames = new Set(filteredServices.map(s => s.name));
                    const expectedServiceNames = new Set(servicesOfProfile.map(s => s.name));
                    expect(filteredServiceNames).toEqual(expectedServiceNames);
                }
            ),
            { 
                numRuns: 50,
                timeout: 30000
            }
        );
    });

    /**
     * Property Test: "All Services" Filter
     * Feature: wizard-dashboard-unification, Property 9: Service Filtering Consistency
     */
    test('Property 9d: "All Services" filter displays all installed services', async () => {
        await fc.assert(
            fc.asyncProperty(installationStateArbitrary, async (installationState) => {
                // Ensure service names are unique
                const uniqueServices = [];
                const seenNames = new Set();
                
                for (const service of installationState.services) {
                    if (!seenNames.has(service.name)) {
                        seenNames.add(service.name);
                        uniqueServices.push(service);
                    }
                }
                
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
                
                // Filter services with "all" filter
                const response = await request(app)
                    .get('/api/services/filtered')
                    .query({ filter: 'all' });
                
                // Verify response is successful
                expect(response.status).toBe(200);
                
                const filteredServices = response.body.services;
                
                // Property: "All Services" should return all services
                expect(filteredServices).toHaveLength(uniqueServices.length);
                
                // Property: Should contain exactly the same services
                const filteredServiceNames = new Set(filteredServices.map(s => s.name));
                const expectedServiceNames = new Set(uniqueServices.map(s => s.name));
                expect(filteredServiceNames).toEqual(expectedServiceNames);
            }),
            { 
                numRuns: 50,
                timeout: 30000
            }
        );
    });

    /**
     * Helper methods for service type and profile mapping
     */
    function getServiceType(serviceName) {
        const serviceToType = {
            'kaspa-node': 'Node',
            'kaspa-archive-node': 'Node',
            'kasia-app': 'Application',
            'k-social': 'Application',
            'kaspa-explorer': 'Application',
            'kasia-indexer': 'Indexer',
            'k-indexer': 'Indexer',
            'simply-kaspa-indexer': 'Indexer',
            'timescaledb-explorer': 'Database',
            'timescaledb-kindexer': 'Database',
            'timescaledb': 'Database',
            'indexer-db': 'Database',
            'kaspa-stratum': 'Mining',
            'portainer': 'Management',
            'pgadmin': 'Management',
            'dashboard': 'Management',
            'wallet': 'Wallet',
            'kaspa-nginx': 'Proxy'
        };
        return serviceToType[serviceName] || 'Other';
    }

    function getServiceProfile(serviceName) {
        const serviceToProfile = {
            'kaspa-node': 'kaspa-node',
            'kaspa-archive-node': 'kaspa-archive-node',
            'kasia-app': 'kasia-app',
            'k-social': 'k-social-app',
            'kaspa-explorer': 'kaspa-explorer-bundle',
            'simply-kaspa-indexer': 'kaspa-explorer-bundle',
            'timescaledb-explorer': 'kaspa-explorer-bundle',
            'kasia-indexer': 'kasia-indexer',
            'k-indexer': 'k-indexer-bundle',
            'timescaledb-kindexer': 'k-indexer-bundle',
            'kaspa-stratum': 'kaspa-stratum',
            'portainer': 'management',
            'pgadmin': 'management',
            // Legacy
            'timescaledb': 'k-indexer-bundle',
            'indexer-db': 'k-indexer-bundle',
            'dashboard': 'management',
            'wallet': 'kaspa-node',
            'kaspa-nginx': 'management'
        };
        return serviceToProfile[serviceName];
    }
});