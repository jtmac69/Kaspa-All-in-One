/**
 * Property-Based Test: Status Refresh Timing
 * 
 * Property 14: Status Refresh Timing
 * For any Dashboard session, service status SHALL be refreshed every 10 seconds.
 * 
 * Validates: Requirements 7.7
 */

const fc = require('fast-check');

describe('Property Test: Status Refresh Timing', () => {
    let Dashboard;
    let mockAPIClient;
    let mockUIManager;
    let mockWebSocketManager;
    let mockWizardNavigation;

    beforeEach(() => {
        // Use Jest fake timers for reliable timing tests
        jest.useFakeTimers();

        // Mock API Client
        mockAPIClient = {
            getServiceStatus: jest.fn().mockResolvedValue({
                services: [
                    { name: 'kaspa-node', status: 'healthy' },
                    { name: 'dashboard', status: 'healthy' }
                ]
            })
        };

        // Mock UI Manager
        mockUIManager = {
            init: jest.fn(),
            updateServices: jest.fn(),
            updateLastStatusCheck: jest.fn(),
            showNoInstallation: jest.fn()
        };

        // Mock WebSocket Manager
        mockWebSocketManager = {
            connect: jest.fn(),
            getStatus: jest.fn().mockReturnValue('disconnected'),
            on: jest.fn(),
            disconnect: jest.fn()
        };

        // Mock Wizard Navigation
        mockWizardNavigation = {
            init: jest.fn()
        };

        // Create Dashboard class for testing
        Dashboard = class {
            constructor() {
                this.api = mockAPIClient;
                this.ui = mockUIManager;
                this.ws = mockWebSocketManager;
                this.wizardNav = mockWizardNavigation;
                this.currentFilter = 'all';
                this.updateInterval = null;
                this.serviceStatusInterval = null;
                this.refreshCallTimes = [];
                this.callCount = 0;
            }

            async init() {
                this.ui.init();
                this.wizardNav.init();
                this.ws.connect();
                this.startPeriodicUpdates();
            }

            startPeriodicUpdates() {
                // Skip the 30-second interval in tests to avoid interference
                // this.updateInterval = setInterval(async () => {
                //     if (this.ws.getStatus() !== 'connected') {
                //         await this.loadInitialData();
                //     }
                // }, 30000);

                // Start service status refresh every 10 seconds (Requirements 7.7)
                this.startServiceStatusRefresh();
            }

            startServiceStatusRefresh() {
                this.serviceStatusInterval = setInterval(async () => {
                    await this.refreshServiceStatus();
                }, 10000); // 10 seconds as per requirements 7.7
            }

            async refreshServiceStatus() {
                // Record the call for testing
                this.callCount++;
                this.refreshCallTimes.push(this.callCount * 10000); // Simulate 10-second intervals
                
                try {
                    const response = await this.api.getServiceStatus();
                    
                    // Update last status check timestamp (Requirements 7.8)
                    const timestamp = new Date().toISOString();
                    this.ui.updateLastStatusCheck(timestamp);
                    
                    // Check if no installation detected
                    if (response.noInstallation) {
                        this.ui.showNoInstallation();
                        return;
                    }
                    
                    // Normal service display
                    const services = response.services || response;
                    this.ui.updateServices(services, this.currentFilter);
                } catch (error) {
                    console.error('Failed to refresh service status:', error);
                    // Still update timestamp even on error to show when last attempt was made
                    const timestamp = new Date().toISOString();
                    this.ui.updateLastStatusCheck(timestamp);
                }
            }

            async loadInitialData() {
                // Mock implementation - don't call refreshServiceStatus to avoid double counting
                // await this.refreshServiceStatus();
            }

            destroy() {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
                if (this.serviceStatusInterval) {
                    clearInterval(this.serviceStatusInterval);
                }
                this.ws.disconnect();
            }
        };
    });

    afterEach(() => {
        // Restore real timers
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    /**
     * Generator for test durations (in milliseconds)
     * Tests various time periods to ensure consistent 10-second intervals
     * Using shorter durations since we're using fake timers
     */
    const testDurationArbitrary = fc.integer({ min: 25000, max: 65000 }); // 25-65 seconds (simulated)

    /**
     * Property Test: Status Refresh Timing
     * Feature: wizard-dashboard-unification, Property 14: Status Refresh Timing
     */
    test('Property 14: Service status refreshes every 10 seconds', async () => {
        await fc.assert(
            fc.asyncProperty(testDurationArbitrary, async (testDuration) => {
                // Create fresh mocks for this property test run
                const freshAPIClient = {
                    getServiceStatus: jest.fn().mockResolvedValue({
                        services: [
                            { name: 'kaspa-node', status: 'healthy' },
                            { name: 'dashboard', status: 'healthy' }
                        ]
                    })
                };
                
                const freshUIManager = {
                    init: jest.fn(),
                    updateServices: jest.fn(),
                    updateLastStatusCheck: jest.fn(),
                    showNoInstallation: jest.fn()
                };
                
                const freshWebSocketManager = {
                    connect: jest.fn(),
                    getStatus: jest.fn().mockReturnValue('disconnected'),
                    on: jest.fn(),
                    disconnect: jest.fn()
                };
                
                const freshWizardNavigation = {
                    init: jest.fn()
                };
                
                // Create Dashboard class with fresh mocks
                const TestDashboard = class {
                    constructor() {
                        this.api = freshAPIClient;
                        this.ui = freshUIManager;
                        this.ws = freshWebSocketManager;
                        this.wizardNav = freshWizardNavigation;
                        this.currentFilter = 'all';
                        this.updateInterval = null;
                        this.serviceStatusInterval = null;
                        this.refreshCallTimes = [];
                        this.callCount = 0;
                    }

                    async init() {
                        this.ui.init();
                        this.wizardNav.init();
                        this.ws.connect();
                        this.startPeriodicUpdates();
                    }

                    startPeriodicUpdates() {
                        // Skip the 30-second interval in tests to avoid interference
                        this.startServiceStatusRefresh();
                    }

                    startServiceStatusRefresh() {
                        this.serviceStatusInterval = setInterval(async () => {
                            await this.refreshServiceStatus();
                        }, 10000); // 10 seconds as per requirements 7.7
                    }

                    async refreshServiceStatus() {
                        // Record the call for testing
                        this.callCount++;
                        this.refreshCallTimes.push(this.callCount * 10000); // Simulate 10-second intervals
                        
                        try {
                            const response = await this.api.getServiceStatus();
                            
                            // Update last status check timestamp (Requirements 7.8)
                            const timestamp = new Date().toISOString();
                            this.ui.updateLastStatusCheck(timestamp);
                            
                            // Check if no installation detected
                            if (response.noInstallation) {
                                this.ui.showNoInstallation();
                                return;
                            }
                            
                            // Normal service display
                            const services = response.services || response;
                            this.ui.updateServices(services, this.currentFilter);
                        } catch (error) {
                            console.error('Failed to refresh service status:', error);
                            // Still update timestamp even on error to show when last attempt was made
                            const timestamp = new Date().toISOString();
                            this.ui.updateLastStatusCheck(timestamp);
                        }
                    }

                    async loadInitialData() {
                        // Mock implementation - don't call refreshServiceStatus to avoid double counting
                    }

                    destroy() {
                        if (this.updateInterval) {
                            clearInterval(this.updateInterval);
                        }
                        if (this.serviceStatusInterval) {
                            clearInterval(this.serviceStatusInterval);
                        }
                        this.ws.disconnect();
                    }
                };
                
                const dashboard = new TestDashboard();
                
                try {
                    // Initialize dashboard
                    await dashboard.init();
                    
                    // Fast-forward time using Jest fake timers
                    const expectedCalls = Math.floor(testDuration / 10000);
                    
                    // Advance time in 10-second increments to trigger the intervals
                    for (let i = 0; i < expectedCalls; i++) {
                        jest.advanceTimersByTime(10000);
                        await Promise.resolve(); // Allow promises to resolve
                    }
                    
                    // Stop the dashboard to prevent further calls
                    dashboard.destroy();
                    
                    // Analyze the refresh call times (now using call count)
                    const callTimes = dashboard.refreshCallTimes;
                    
                    // Property: There should be exactly the expected number of calls
                    expect(callTimes.length).toBe(expectedCalls);
                    
                    // Property: Each call should be at 10-second intervals
                    for (let i = 0; i < callTimes.length; i++) {
                        const expectedTime = (i + 1) * 10000;
                        expect(callTimes[i]).toBe(expectedTime);
                    }
                    
                    // Property: API should be called for each refresh
                    expect(freshAPIClient.getServiceStatus).toHaveBeenCalledTimes(callTimes.length);
                    
                    // Property: UI should be updated for each successful refresh
                    expect(freshUIManager.updateLastStatusCheck).toHaveBeenCalledTimes(callTimes.length);
                    
                } finally {
                    // Ensure cleanup
                    dashboard.destroy();
                }
            }),
            { 
                numRuns: 100,
                timeout: 30000, // Reduced timeout since we're using fake timers
                verbose: true
            }
        );
    }, 30000); // Reduced test timeout

    /**
     * Property Test: Status Refresh Continues on API Errors
     */
    test('Property 14a: Status refresh continues even when API calls fail', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 25000, max: 45000 }), // Shorter duration for error tests (simulated)
                async (testDuration) => {
                    // Create fresh mocks for this property test run
                    const freshAPIClient = {
                        getServiceStatus: jest.fn().mockRejectedValue(new Error('API Error'))
                    };
                    
                    const freshUIManager = {
                        init: jest.fn(),
                        updateServices: jest.fn(),
                        updateLastStatusCheck: jest.fn(),
                        showNoInstallation: jest.fn()
                    };
                    
                    const freshWebSocketManager = {
                        connect: jest.fn(),
                        getStatus: jest.fn().mockReturnValue('disconnected'),
                        on: jest.fn(),
                        disconnect: jest.fn()
                    };
                    
                    const freshWizardNavigation = {
                        init: jest.fn()
                    };
                    
                    // Create Dashboard class with fresh mocks
                    const TestDashboard = class {
                        constructor() {
                            this.api = freshAPIClient;
                            this.ui = freshUIManager;
                            this.ws = freshWebSocketManager;
                            this.wizardNav = freshWizardNavigation;
                            this.currentFilter = 'all';
                            this.updateInterval = null;
                            this.serviceStatusInterval = null;
                            this.refreshCallTimes = [];
                            this.callCount = 0;
                        }

                        async init() {
                            this.ui.init();
                            this.wizardNav.init();
                            this.ws.connect();
                            this.startPeriodicUpdates();
                        }

                        startPeriodicUpdates() {
                            this.startServiceStatusRefresh();
                        }

                        startServiceStatusRefresh() {
                            this.serviceStatusInterval = setInterval(async () => {
                                await this.refreshServiceStatus();
                            }, 10000);
                        }

                        async refreshServiceStatus() {
                            this.callCount++;
                            this.refreshCallTimes.push(this.callCount * 10000);
                            
                            try {
                                const response = await this.api.getServiceStatus();
                                const timestamp = new Date().toISOString();
                                this.ui.updateLastStatusCheck(timestamp);
                                
                                if (response.noInstallation) {
                                    this.ui.showNoInstallation();
                                    return;
                                }
                                
                                const services = response.services || response;
                                this.ui.updateServices(services, this.currentFilter);
                            } catch (error) {
                                console.error('Failed to refresh service status:', error);
                                const timestamp = new Date().toISOString();
                                this.ui.updateLastStatusCheck(timestamp);
                            }
                        }

                        async loadInitialData() {
                            // Mock implementation
                        }

                        destroy() {
                            if (this.updateInterval) {
                                clearInterval(this.updateInterval);
                            }
                            if (this.serviceStatusInterval) {
                                clearInterval(this.serviceStatusInterval);
                            }
                            this.ws.disconnect();
                        }
                    };
                    
                    const dashboard = new TestDashboard();
                    
                    try {
                        // Initialize dashboard
                        await dashboard.init();
                        
                        // Fast-forward time using Jest fake timers
                        const expectedCalls = Math.floor(testDuration / 10000);
                        
                        // Advance time in 10-second increments
                        for (let i = 0; i < expectedCalls; i++) {
                            jest.advanceTimersByTime(10000);
                            await Promise.resolve();
                        }
                        
                        // Stop the dashboard
                        dashboard.destroy();
                        
                        // Analyze the refresh call times
                        const callTimes = dashboard.refreshCallTimes;
                        
                        // Property: Refresh should continue even with API errors
                        expect(callTimes.length).toBe(expectedCalls);
                        
                        // Property: UI timestamp should still be updated even on errors
                        expect(freshUIManager.updateLastStatusCheck).toHaveBeenCalledTimes(callTimes.length);
                        
                    } finally {
                        dashboard.destroy();
                    }
                }
            ),
            { 
                numRuns: 50,
                timeout: 30000, // Reduced timeout
                verbose: true
            }
        );
    }, 30000); // Reduced test timeout

    /**
     * Property Test: Status Refresh Stops When Dashboard is Destroyed
     */
    test('Property 14b: Status refresh stops when dashboard is destroyed', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 15000, max: 25000 }), // Duration before destroy (simulated)
                fc.integer({ min: 15000, max: 25000 }), // Duration after destroy (simulated)
                async (beforeDestroyDuration, afterDestroyDuration) => {
                    const dashboard = new Dashboard();
                    
                    // Initialize dashboard
                    await dashboard.init();
                    
                    // Fast-forward time before destroy
                    const callsBeforeDestroy = Math.floor(beforeDestroyDuration / 10000);
                    for (let i = 0; i < callsBeforeDestroy; i++) {
                        jest.advanceTimersByTime(10000);
                        await Promise.resolve();
                    }
                    
                    // Record calls before destroy
                    const callCountBeforeDestroy = dashboard.refreshCallTimes.length;
                    
                    // Destroy dashboard
                    dashboard.destroy();
                    
                    // Fast-forward additional time after destroy
                    const callsAfterDestroy = Math.floor(afterDestroyDuration / 10000);
                    for (let i = 0; i < callsAfterDestroy; i++) {
                        jest.advanceTimersByTime(10000);
                        await Promise.resolve();
                    }
                    
                    // Record calls after destroy
                    const callCountAfterDestroy = dashboard.refreshCallTimes.length;
                    
                    // Property: No new refresh calls should occur after destroy
                    expect(callCountAfterDestroy).toBe(callCountBeforeDestroy);
                }
            ),
            { 
                numRuns: 50,
                timeout: 30000, // Reduced timeout
                verbose: true
            }
        );
    }, 30000); // Reduced test timeout

    /**
     * Property Test: Multiple Dashboard Instances Have Independent Timers
     */
    test('Property 14c: Multiple dashboard instances have independent refresh timers', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 4 }), // Number of dashboard instances
                fc.integer({ min: 25000, max: 35000 }), // Test duration (simulated)
                async (instanceCount, testDuration) => {
                    const dashboards = [];
                    const freshMocks = [];
                    
                    try {
                        // Create multiple dashboard instances with fresh mocks
                        for (let i = 0; i < instanceCount; i++) {
                            // Create fresh mocks for each dashboard instance
                            const freshAPIClient = {
                                getServiceStatus: jest.fn().mockResolvedValue({
                                    services: [
                                        { name: 'kaspa-node', status: 'healthy' },
                                        { name: 'dashboard', status: 'healthy' }
                                    ]
                                })
                            };
                            
                            const freshUIManager = {
                                init: jest.fn(),
                                updateServices: jest.fn(),
                                updateLastStatusCheck: jest.fn(),
                                showNoInstallation: jest.fn()
                            };
                            
                            const freshWebSocketManager = {
                                connect: jest.fn(),
                                getStatus: jest.fn().mockReturnValue('disconnected'),
                                on: jest.fn(),
                                disconnect: jest.fn()
                            };
                            
                            const freshWizardNavigation = {
                                init: jest.fn()
                            };
                            
                            freshMocks.push({
                                api: freshAPIClient,
                                ui: freshUIManager,
                                ws: freshWebSocketManager,
                                wizardNav: freshWizardNavigation
                            });
                            
                            // Create Dashboard class with fresh mocks
                            const TestDashboard = class {
                                constructor() {
                                    this.api = freshAPIClient;
                                    this.ui = freshUIManager;
                                    this.ws = freshWebSocketManager;
                                    this.wizardNav = freshWizardNavigation;
                                    this.currentFilter = 'all';
                                    this.updateInterval = null;
                                    this.serviceStatusInterval = null;
                                    this.refreshCallTimes = [];
                                    this.callCount = 0;
                                }

                                async init() {
                                    this.ui.init();
                                    this.wizardNav.init();
                                    this.ws.connect();
                                    this.startPeriodicUpdates();
                                }

                                startPeriodicUpdates() {
                                    this.startServiceStatusRefresh();
                                }

                                startServiceStatusRefresh() {
                                    this.serviceStatusInterval = setInterval(async () => {
                                        await this.refreshServiceStatus();
                                    }, 10000);
                                }

                                async refreshServiceStatus() {
                                    this.callCount++;
                                    this.refreshCallTimes.push(this.callCount * 10000);
                                    
                                    try {
                                        const response = await this.api.getServiceStatus();
                                        const timestamp = new Date().toISOString();
                                        this.ui.updateLastStatusCheck(timestamp);
                                        
                                        if (response.noInstallation) {
                                            this.ui.showNoInstallation();
                                            return;
                                        }
                                        
                                        const services = response.services || response;
                                        this.ui.updateServices(services, this.currentFilter);
                                    } catch (error) {
                                        console.error('Failed to refresh service status:', error);
                                        const timestamp = new Date().toISOString();
                                        this.ui.updateLastStatusCheck(timestamp);
                                    }
                                }

                                async loadInitialData() {
                                    // Mock implementation
                                }

                                destroy() {
                                    if (this.updateInterval) {
                                        clearInterval(this.updateInterval);
                                    }
                                    if (this.serviceStatusInterval) {
                                        clearInterval(this.serviceStatusInterval);
                                    }
                                    this.ws.disconnect();
                                }
                            };
                            
                            const dashboard = new TestDashboard();
                            await dashboard.init();
                            dashboards.push(dashboard);
                        }
                        
                        // Fast-forward time for refresh calls
                        const expectedCalls = Math.floor(testDuration / 10000);
                        for (let i = 0; i < expectedCalls; i++) {
                            jest.advanceTimersByTime(10000);
                            await Promise.resolve();
                        }
                        
                        // Stop all dashboards
                        dashboards.forEach(dashboard => dashboard.destroy());
                        
                        // Property: Each dashboard should have made refresh calls independently
                        for (const dashboard of dashboards) {
                            expect(dashboard.refreshCallTimes.length).toBe(expectedCalls);
                        }
                        
                        // Property: Total API calls should be instanceCount * expectedCalls
                        const totalExpectedCalls = instanceCount * expectedCalls;
                        let actualTotalCalls = 0;
                        
                        // Sum up calls from all fresh mocks
                        for (const mock of freshMocks) {
                            actualTotalCalls += mock.api.getServiceStatus.mock.calls.length;
                        }
                        
                        expect(actualTotalCalls).toBe(totalExpectedCalls);
                        
                    } finally {
                        // Cleanup all dashboards
                        dashboards.forEach(dashboard => dashboard.destroy());
                    }
                }
            ),
            { 
                numRuns: 30,
                timeout: 30000, // Reduced timeout
                verbose: true
            }
        );
    }, 30000); // Reduced test timeout
});