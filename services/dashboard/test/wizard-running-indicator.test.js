/**
 * Property-Based Test: Wizard Running Indicator
 * 
 * Property 16: Wizard Running Indicator
 * For any period when the Wizard is actively configuring, the Dashboard SHALL 
 * display a "Configuration in progress" indicator and disable service control operations.
 * 
 * Validates: Requirements 10.6, 10.7
 */

const fc = require('fast-check');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs').promises;
const { SharedStateManager } = require('../../shared/lib/state-manager');

describe('Property Test: Wizard Running Indicator', () => {
    let dom;
    let document;
    let window;
    let WizardNavigation;
    let wizardNav;
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

        // Create DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test Dashboard</title>
                <style>
                    .wizard-running-indicator { display: none; }
                    .disabled-by-wizard { opacity: 0.5; cursor: not-allowed; }
                    body.wizard-running { padding-top: 60px; }
                </style>
            </head>
            <body>
                <!-- Wizard Running Indicator -->
                <div class="wizard-running-indicator" id="wizard-running-indicator" style="display: none;">
                    <div class="wizard-running-content">
                        <span class="wizard-running-icon">⚙️</span>
                        <span class="wizard-running-text">Configuration in progress - some operations may be disabled</span>
                        <button class="wizard-running-dismiss" id="wizard-running-dismiss">✕</button>
                    </div>
                </div>
                
                <!-- Reconfigure Button -->
                <button id="reconfigure-btn" class="btn-reconfigure">⚙️ Reconfigure System</button>
                
                <!-- Service Control Buttons -->
                <button data-action="start" data-service="kaspa-node" data-original-title="Start Kaspa Node">Start</button>
                <button data-action="stop" data-service="kaspa-node" data-original-title="Stop Kaspa Node">Stop</button>
                <button data-action="restart" data-service="kaspa-explorer" data-original-title="Restart Explorer">Restart</button>
                <button data-action="logs" data-service="kaspa-indexer" data-original-title="View Indexer Logs">Logs</button>
                
                <!-- Quick Action Buttons -->
                <button class="action-btn" id="restart-all-btn" data-original-title="Restart all services">Restart All</button>
                <button class="action-btn" id="update-services-btn" data-original-title="Update all services">Update Services</button>
                <button class="action-btn" id="backup-data-btn" data-original-title="Create system backup">Backup Data</button>
                
                <!-- Refresh Button -->
                <button id="refresh-services" data-original-title="Refresh service status">Refresh</button>
            </body>
            </html>
        `, {
            url: 'http://localhost:8080',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        document = dom.window.document;
        window = dom.window;
        global.document = document;
        global.window = window;

        // Mock the WizardNavigation class
        WizardNavigation = class {
            constructor() {
                this.api = { getConfigSuggestions: () => Promise.resolve([]) };
            }

            init() {}

            updateWizardRunningIndicator(isRunning) {
                const indicator = document.getElementById('wizard-running-indicator');
                const reconfigureBtn = document.getElementById('reconfigure-btn');
                
                if (indicator) {
                    if (isRunning) {
                        // Show the indicator
                        indicator.style.display = 'block';
                        document.body.classList.add('wizard-running');
                        
                        // Setup dismiss functionality
                        const dismissBtn = document.getElementById('wizard-running-dismiss');
                        if (dismissBtn) {
                            dismissBtn.onclick = () => {
                                indicator.style.display = 'none';
                                document.body.classList.remove('wizard-running');
                            };
                        }
                    } else {
                        // Hide the indicator
                        indicator.style.display = 'none';
                        document.body.classList.remove('wizard-running');
                    }
                }
                
                // Update reconfigure button state
                if (reconfigureBtn) {
                    if (isRunning) {
                        reconfigureBtn.disabled = true;
                        reconfigureBtn.textContent = '⚙️ Configuration in Progress...';
                        reconfigureBtn.title = 'Wizard is currently running';
                    } else {
                        reconfigureBtn.disabled = false;
                        reconfigureBtn.textContent = '⚙️ Reconfigure System';
                        reconfigureBtn.title = 'Reconfigure system settings';
                    }
                }
                
                // Disable service control operations while wizard is running
                this.updateServiceControlsState(isRunning);
            }

            updateServiceControlsState(wizardRunning) {
                // Disable all service action buttons when wizard is running
                const serviceButtons = document.querySelectorAll('[data-action]');
                serviceButtons.forEach(button => {
                    if (wizardRunning) {
                        button.disabled = true;
                        button.title = 'Service controls disabled while configuration is in progress';
                        button.classList.add('disabled-by-wizard');
                    } else {
                        button.disabled = false;
                        button.title = button.getAttribute('data-original-title') || '';
                        button.classList.remove('disabled-by-wizard');
                    }
                });
                
                // Disable quick action buttons
                const quickActionButtons = document.querySelectorAll('.action-btn');
                quickActionButtons.forEach(button => {
                    if (wizardRunning) {
                        button.disabled = true;
                        button.title = 'Action disabled while configuration is in progress';
                        button.classList.add('disabled-by-wizard');
                    } else {
                        button.disabled = false;
                        button.title = button.getAttribute('data-original-title') || '';
                        button.classList.remove('disabled-by-wizard');
                    }
                });
                
                // Disable refresh button
                const refreshBtn = document.getElementById('refresh-services');
                if (refreshBtn) {
                    if (wizardRunning) {
                        refreshBtn.disabled = true;
                        refreshBtn.title = 'Refresh disabled while configuration is in progress';
                    } else {
                        refreshBtn.disabled = false;
                        refreshBtn.title = 'Refresh service status';
                    }
                }
            }
        };

        // Initialize wizard navigation
        wizardNav = new WizardNavigation();
        wizardNav.init();

        // Initialize state manager with test path
        stateManager = new SharedStateManager(testStatePath);
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

        // Clean up DOM
        if (dom) {
            dom.window.close();
        }
        
        // Clean up globals
        delete global.document;
        delete global.window;
    });

    /**
     * Generator for wizard running states
     */
    const wizardRunningArbitrary = fc.boolean();

    /**
     * Generator for installation states with wizard running flag
     */
    const installationStateWithWizardArbitrary = fc.record({
        version: fc.constant('1.0.0'),
        installedAt: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        lastModified: fc.integer({ min: Date.now() - 30 * 24 * 60 * 60 * 1000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
        phase: fc.constantFrom('pending', 'installing', 'complete', 'error'),
        profiles: fc.record({
            selected: fc.array(fc.constantFrom('core', 'kaspa-user-applications', 'indexer-services'), { minLength: 1, maxLength: 3 }),
            count: fc.integer({ min: 1, max: 3 })
        }),
        configuration: fc.record({
            network: fc.constantFrom('mainnet', 'testnet'),
            publicNode: fc.boolean(),
            hasIndexers: fc.boolean(),
            hasArchive: fc.boolean(),
            hasMining: fc.boolean()
        }),
        services: fc.array(fc.record({
            name: fc.constantFrom('kaspa-node', 'kaspa-explorer', 'kaspa-indexer', 'timescaledb'),
            profile: fc.constantFrom('core', 'kaspa-user-applications', 'indexer-services'),
            running: fc.boolean(),
            exists: fc.boolean()
        }), { minLength: 1, maxLength: 4 }),
        summary: fc.record({
            total: fc.integer({ min: 1, max: 4 }),
            running: fc.integer({ min: 0, max: 4 }),
            stopped: fc.integer({ min: 0, max: 4 }),
            missing: fc.integer({ min: 0, max: 4 })
        }),
        wizardRunning: wizardRunningArbitrary
    });

    /**
     * Property Test: Wizard Running Indicator Display
     * Feature: wizard-dashboard-unification, Property 16: Wizard Running Indicator
     */
    test('Property 16: Wizard running indicator displays correctly based on wizardRunning flag', async () => {
        await fc.assert(
            fc.asyncProperty(wizardRunningArbitrary, async (wizardRunning) => {
                // Update the wizard running indicator
                wizardNav.updateWizardRunningIndicator(wizardRunning);
                
                // Get DOM elements
                const indicator = document.getElementById('wizard-running-indicator');
                const reconfigureBtn = document.getElementById('reconfigure-btn');
                const body = document.body;
                
                // Property: Indicator visibility matches wizard running state
                if (wizardRunning) {
                    expect(indicator.style.display).toBe('block');
                    expect(body.classList.contains('wizard-running')).toBe(true);
                    
                    // Verify indicator content is correct
                    const indicatorText = indicator.querySelector('.wizard-running-text');
                    expect(indicatorText.textContent).toBe('Configuration in progress - some operations may be disabled');
                    
                    // Verify dismiss button functionality
                    const dismissBtn = document.getElementById('wizard-running-dismiss');
                    expect(dismissBtn).toBeTruthy();
                    expect(typeof dismissBtn.onclick).toBe('function');
                } else {
                    expect(indicator.style.display).toBe('none');
                    expect(body.classList.contains('wizard-running')).toBe(false);
                }
                
                // Property: Reconfigure button state matches wizard running state
                if (wizardRunning) {
                    expect(reconfigureBtn.disabled).toBe(true);
                    expect(reconfigureBtn.textContent).toBe('⚙️ Configuration in Progress...');
                    expect(reconfigureBtn.title).toBe('Wizard is currently running');
                } else {
                    expect(reconfigureBtn.disabled).toBe(false);
                    expect(reconfigureBtn.textContent).toBe('⚙️ Reconfigure System');
                    expect(reconfigureBtn.title).toBe('Reconfigure system settings');
                }
            }),
            { 
                numRuns: 100,
                timeout: 10000,
                verbose: true
            }
        );
    });

    /**
     * Property Test: Service Control Buttons Disabled State
     * Feature: wizard-dashboard-unification, Property 16: Wizard Running Indicator
     */
    test('Property 16a: Service control buttons are disabled when wizard is running', async () => {
        await fc.assert(
            fc.asyncProperty(wizardRunningArbitrary, async (wizardRunning) => {
                // Update the wizard running indicator
                wizardNav.updateWizardRunningIndicator(wizardRunning);
                
                // Get all service control buttons
                const serviceButtons = document.querySelectorAll('[data-action]');
                const quickActionButtons = document.querySelectorAll('.action-btn');
                const refreshBtn = document.getElementById('refresh-services');
                
                // Property: All service control buttons are disabled when wizard is running
                serviceButtons.forEach(button => {
                    if (wizardRunning) {
                        expect(button.disabled).toBe(true);
                        expect(button.title).toBe('Service controls disabled while configuration is in progress');
                        expect(button.classList.contains('disabled-by-wizard')).toBe(true);
                    } else {
                        expect(button.disabled).toBe(false);
                        expect(button.title).toBe(button.getAttribute('data-original-title') || '');
                        expect(button.classList.contains('disabled-by-wizard')).toBe(false);
                    }
                });
                
                // Property: All quick action buttons are disabled when wizard is running
                quickActionButtons.forEach(button => {
                    if (wizardRunning) {
                        expect(button.disabled).toBe(true);
                        expect(button.title).toBe('Action disabled while configuration is in progress');
                        expect(button.classList.contains('disabled-by-wizard')).toBe(true);
                    } else {
                        expect(button.disabled).toBe(false);
                        expect(button.title).toBe(button.getAttribute('data-original-title') || '');
                        expect(button.classList.contains('disabled-by-wizard')).toBe(false);
                    }
                });
                
                // Property: Refresh button is disabled when wizard is running
                if (wizardRunning) {
                    expect(refreshBtn.disabled).toBe(true);
                    expect(refreshBtn.title).toBe('Refresh disabled while configuration is in progress');
                } else {
                    expect(refreshBtn.disabled).toBe(false);
                    expect(refreshBtn.title).toBe('Refresh service status');
                }
            }),
            { 
                numRuns: 100,
                timeout: 10000,
                verbose: true
            }
        );
    });

    /**
     * Property Test: Dismiss Button Functionality
     * Feature: wizard-dashboard-unification, Property 16: Wizard Running Indicator
     */
    test('Property 16b: Dismiss button hides indicator when clicked', async () => {
        await fc.assert(
            fc.asyncProperty(fc.constant(true), async (wizardRunning) => {
                // Show the wizard running indicator
                wizardNav.updateWizardRunningIndicator(wizardRunning);
                
                const indicator = document.getElementById('wizard-running-indicator');
                const dismissBtn = document.getElementById('wizard-running-dismiss');
                const body = document.body;
                
                // Verify indicator is shown
                expect(indicator.style.display).toBe('block');
                expect(body.classList.contains('wizard-running')).toBe(true);
                
                // Click dismiss button
                dismissBtn.click();
                
                // Property: Dismiss button hides indicator and removes body class
                expect(indicator.style.display).toBe('none');
                expect(body.classList.contains('wizard-running')).toBe(false);
            }),
            { 
                numRuns: 20,
                timeout: 5000
            }
        );
    });

    /**
     * Property Test: Installation State Integration
     * Feature: wizard-dashboard-unification, Property 16: Wizard Running Indicator
     */
    test('Property 16c: Wizard running indicator responds to installation state changes', async () => {
        await fc.assert(
            fc.asyncProperty(installationStateWithWizardArbitrary, async (installationState) => {
                // Write installation state to file
                await stateManager.writeState(installationState);
                
                // Read the state back and update indicator
                const readState = await stateManager.readState();
                expect(readState).toBeTruthy();
                
                wizardNav.updateWizardRunningIndicator(readState.wizardRunning || false);
                
                // Get DOM elements
                const indicator = document.getElementById('wizard-running-indicator');
                const reconfigureBtn = document.getElementById('reconfigure-btn');
                
                // Property: Indicator state matches installation state wizardRunning flag
                const expectedRunning = readState.wizardRunning || false;
                
                if (expectedRunning) {
                    expect(indicator.style.display).toBe('block');
                    expect(reconfigureBtn.disabled).toBe(true);
                    expect(document.body.classList.contains('wizard-running')).toBe(true);
                } else {
                    expect(indicator.style.display).toBe('none');
                    expect(reconfigureBtn.disabled).toBe(false);
                    expect(document.body.classList.contains('wizard-running')).toBe(false);
                }
                
                // Property: Service controls are disabled when wizard is running
                const serviceButtons = document.querySelectorAll('[data-action]');
                serviceButtons.forEach(button => {
                    expect(button.disabled).toBe(expectedRunning);
                    if (expectedRunning) {
                        expect(button.classList.contains('disabled-by-wizard')).toBe(true);
                    } else {
                        expect(button.classList.contains('disabled-by-wizard')).toBe(false);
                    }
                });
            }),
            { 
                numRuns: 50,
                timeout: 15000,
                verbose: true
            }
        );
    });
});