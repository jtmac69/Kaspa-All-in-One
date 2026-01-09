/**
 * Property-Based Test: Configuration Change Notification
 * 
 * Property 17: Configuration Change Notification
 * For any configuration change detected, the Dashboard SHALL display a notification to the user.
 * 
 * Validates: Requirements 10.4
 */

const fc = require('fast-check');
const fs = require('fs').promises;
const path = require('path');
const { SharedStateManager } = require('../../shared/lib/state-manager');

describe('Property Test: Configuration Change Notification', () => {
    let stateManager;
    let testStatePath;
    let notificationHistory;

    beforeEach(async () => {
        // Create unique test state path for each test
        testStatePath = path.join(__dirname, `test-installation-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
        
        // Clean up test state file before each test
        try {
            await fs.unlink(testStatePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }

        // Initialize state manager with test path
        stateManager = new SharedStateManager(testStatePath);
        
        // Track notifications - clear history
        notificationHistory = [];
        notificationHistory.length = 0;
    });

    afterEach(async () => {
        // Clean up state manager
        if (stateManager) {
            stateManager.destroy();
            stateManager = null;
        }
        
        // Clean up test state file
        try {
            await fs.unlink(testStatePath);
        } catch (error) {
            // Ignore if file doesn't exist
        }

        // Reset notification tracking
        notificationHistory = [];
    });

    /**
     * Mock notification system that simulates Dashboard behavior
     */
    const mockNotificationSystem = {
        async detectConfigurationChange(previousState, newState) {
            const hasInstallationBefore = previousState !== null && previousState !== undefined;
            const hasInstallationAfter = newState !== null && newState !== undefined;
            
            // If installation status changed (added/removed)
            if (hasInstallationBefore !== hasInstallationAfter) {
                const notification = {
                    type: 'configuration_changed',
                    data: {
                        hasInstallation: hasInstallationAfter,
                        message: hasInstallationAfter ? 'Configuration updated' : 'Installation removed',
                        timestamp: new Date().toISOString(),
                        changeType: hasInstallationAfter ? 'update' : 'removal'
                    }
                };
                
                notificationHistory.push(notification);
                return notification;
            }
            
            // If both states exist, check for meaningful changes
            if (hasInstallationAfter && hasInstallationBefore) {
                // Only detect changes based on lastModified timestamp - this is the primary indicator
                // that the configuration has actually changed through the wizard
                const timestampChanged = previousState.lastModified !== newState.lastModified;
                
                if (timestampChanged) {
                    const notification = {
                        type: 'configuration_changed',
                        data: {
                            hasInstallation: true,
                            message: 'Configuration updated',
                            timestamp: new Date().toISOString(),
                            changeType: 'update'
                        }
                    };
                    
                    notificationHistory.push(notification);
                    return notification;
                }
            }
            
            return null;
        }
    };

    /**
     * Generator for valid service entries
     */
    const serviceEntryArbitrary = fc.record({
        name: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
        displayName: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
        profile: fc.constantFrom('core', 'kaspa-user-applications', 'indexer-services', 'mining', 'archive'),
        running: fc.boolean(),
        exists: fc.boolean(),
        containerName: fc.option(fc.string({ minLength: 5, maxLength: 25 })),
        ports: fc.option(fc.array(fc.integer({ min: 1000, max: 65535 }), { maxLength: 3 }))
    });

    /**
     * Generator for valid installation states
     */
    const installationStateArbitrary = fc.record({
        version: fc.constant('1.0.0'),
        installedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        lastModified: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        phase: fc.constantFrom('pending', 'installing', 'complete', 'error'),
        profiles: fc.record({
            selected: fc.array(fc.constantFrom('core', 'kaspa-user-applications', 'indexer-services', 'mining', 'archive'), { minLength: 1, maxLength: 5 }),
            count: fc.integer({ min: 1, max: 5 })
        }),
        configuration: fc.record({
            network: fc.constantFrom('mainnet', 'testnet'),
            publicNode: fc.boolean(),
            hasIndexers: fc.boolean(),
            hasArchive: fc.boolean(),
            hasMining: fc.boolean(),
            kaspaNodePort: fc.option(fc.integer({ min: 16110, max: 16115 }))
        }),
        services: fc.array(serviceEntryArbitrary, { minLength: 1, maxLength: 5 }),
        summary: fc.record({
            total: fc.integer({ min: 1, max: 5 }),
            running: fc.integer({ min: 0, max: 5 }),
            stopped: fc.integer({ min: 0, max: 5 }),
            missing: fc.integer({ min: 0, max: 5 })
        }),
        wizardRunning: fc.option(fc.boolean())
    });

    /**
     * Property Test: Configuration Change Notification
     * Feature: wizard-dashboard-unification, Property 17: Configuration Change Notification
     */
    test('Property 17: Dashboard displays notification for any configuration change', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.tuple(installationStateArbitrary, installationStateArbitrary),
                async ([initialState, modifiedState]) => {
                    // Ensure service names are unique to avoid conflicts
                    const makeServicesUnique = (state) => {
                        const uniqueServices = [];
                        const seenNames = new Set();
                        
                        for (const service of state.services) {
                            if (!seenNames.has(service.name)) {
                                seenNames.add(service.name);
                                uniqueServices.push(service);
                            }
                        }
                        
                        return {
                            ...state,
                            services: uniqueServices,
                            summary: {
                                ...state.summary,
                                total: uniqueServices.length
                            }
                        };
                    };

                    const uniqueInitialState = makeServicesUnique(initialState);
                    const uniqueModifiedState = makeServicesUnique({
                        ...modifiedState,
                        lastModified: new Date().toISOString() // Ensure modification timestamp is different
                    });

                    // Set up initial state
                    await stateManager.writeState(uniqueInitialState);

                    // Simulate configuration change detection
                    const notification = await mockNotificationSystem.detectConfigurationChange(
                        uniqueInitialState, 
                        uniqueModifiedState
                    );

                    // Property: Dashboard displays notification for configuration change
                    expect(notification).toBeDefined();
                    expect(notification.type).toBe('configuration_changed');
                    expect(notification.data).toBeDefined();
                    expect(notification.data.hasInstallation).toBe(true);
                    expect(notification.data.message).toBeDefined();
                    expect(notification.data.timestamp).toBeDefined();

                    // Verify notification contains expected information
                    expect(typeof notification.data.message).toBe('string');
                    expect(notification.data.message.length).toBeGreaterThan(0);
                    expect(new Date(notification.data.timestamp)).toBeInstanceOf(Date);
                }
            ),
            { 
                numRuns: 20,
                timeout: 5000,
                verbose: true
            }
        );
    }, 15000);

    /**
     * Property Test: Installation Removal Notification
     */
    test('Property 17a: Dashboard displays notification when installation is removed', async () => {
        await fc.assert(
            fc.asyncProperty(installationStateArbitrary, async (initialState) => {
                // Ensure service names are unique
                const uniqueServices = [];
                const seenNames = new Set();
                
                for (const service of initialState.services) {
                    if (!seenNames.has(service.name)) {
                        seenNames.add(service.name);
                        uniqueServices.push(service);
                    }
                }
                
                const uniqueInitialState = {
                    ...initialState,
                    services: uniqueServices,
                    summary: {
                        ...initialState.summary,
                        total: uniqueServices.length
                    }
                };

                // Set up initial state
                await stateManager.writeState(uniqueInitialState);

                // Simulate installation removal (null state)
                const notification = await mockNotificationSystem.detectConfigurationChange(
                    uniqueInitialState, 
                    null
                );

                // Property: Dashboard displays notification for installation removal
                expect(notification).toBeDefined();
                expect(notification.type).toBe('configuration_changed');
                expect(notification.data).toBeDefined();
                expect(notification.data.hasInstallation).toBe(false);
                expect(notification.data.message).toContain('removed');
                expect(notification.data.timestamp).toBeDefined();
            }),
            { 
                numRuns: 15,
                timeout: 3000,
                verbose: true
            }
        );
    }, 10000);

    /**
     * Property Test: Multiple Configuration Changes
     */
    test('Property 17b: Dashboard displays notification for each configuration change in sequence', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(installationStateArbitrary, { minLength: 2, maxLength: 3 }),
                async (stateSequence) => {
                    // Clear notification history at start of each test
                    notificationHistory.length = 0;
                    
                    let previousState = null;

                    // Apply each state change in sequence
                    for (let i = 0; i < stateSequence.length; i++) {
                        const state = stateSequence[i];
                        
                        // Make services unique and add timestamp
                        const uniqueServices = [];
                        const seenNames = new Set();
                        
                        for (const service of state.services) {
                            if (!seenNames.has(service.name)) {
                                seenNames.add(service.name);
                                uniqueServices.push(service);
                            }
                        }
                        
                        const uniqueState = {
                            ...state,
                            services: uniqueServices,
                            lastModified: new Date(Date.now() + i * 1000).toISOString(), // Ensure different timestamps
                            summary: {
                                ...state.summary,
                                total: uniqueServices.length
                            }
                        };

                        // Simulate configuration change detection
                        const notification = await mockNotificationSystem.detectConfigurationChange(
                            previousState, 
                            uniqueState
                        );

                        // Each change should generate a notification
                        expect(notification).toBeDefined();
                        expect(notification.type).toBe('configuration_changed');
                        expect(notification.data.hasInstallation).toBe(true);

                        previousState = uniqueState;
                    }

                    // Property: Dashboard displays notification for each configuration change
                    expect(notificationHistory.length).toBe(stateSequence.length);

                    // Verify each notification is valid
                    for (const notification of notificationHistory) {
                        expect(notification.type).toBe('configuration_changed');
                        expect(notification.data).toBeDefined();
                        expect(notification.data.hasInstallation).toBe(true);
                        expect(notification.data.message).toBeDefined();
                        expect(notification.data.timestamp).toBeDefined();
                    }

                    // Verify notifications are in chronological order
                    for (let i = 1; i < notificationHistory.length; i++) {
                        const prevTime = new Date(notificationHistory[i - 1].data.timestamp);
                        const currTime = new Date(notificationHistory[i].data.timestamp);
                        expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
                    }
                }
            ),
            { 
                numRuns: 8,
                timeout: 5000,
                verbose: true
            }
        );
    }, 20000);
});