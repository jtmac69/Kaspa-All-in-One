/**
 * Wizard Navigation Module
 * Handles navigation between Dashboard and Wizard with context preservation
 */

import { APIClient } from './api-client.js';

export class WizardNavigation {
    constructor() {
        this.api = new APIClient();
        this.crossLaunchNavigator = null;
        this.initializeCrossLaunchNavigator();
    }

    /**
     * Initialize the cross-launch navigator
     */
    initializeCrossLaunchNavigator() {
        // Simple cross-launch navigator implementation
        this.crossLaunchNavigator = {
            getWizardUrl: (context = {}) => {
                const baseUrl = 'http://localhost:3000';
                
                if (!context || Object.keys(context).length === 0) {
                    return baseUrl;
                }

                const params = new URLSearchParams();
                
                if (context.action) {
                    params.set('action', context.action);
                }
                
                if (context.profile) {
                    params.set('profile', context.profile);
                }
                
                if (context.service) {
                    params.set('service', context.service);
                }
                
                if (context.returnUrl) {
                    params.set('returnUrl', encodeURIComponent(context.returnUrl));
                }

                return `${baseUrl}?${params.toString()}`;
            },

            getDashboardUrl: () => {
                return window.location.origin;
            },

            getReconfigureUrl: () => {
                return this.getWizardUrl({
                    action: 'modify',
                    returnUrl: this.getDashboardUrl()
                });
            },

            getAddProfileUrl: (profileName) => {
                return this.getWizardUrl({
                    action: 'add',
                    profile: profileName,
                    returnUrl: this.getDashboardUrl()
                });
            },

            getModifyProfileUrl: (profileName) => {
                return this.getWizardUrl({
                    action: 'modify',
                    profile: profileName,
                    returnUrl: this.getDashboardUrl()
                });
            }
        };
    }

    /**
     * Initialize wizard navigation
     */
    init() {
        this.setupEventListeners();
        this.loadContextActions();
    }

    /**
     * Setup event listeners for wizard navigation
     */
    setupEventListeners() {
        // Wizard link
        const wizardLink = document.getElementById('wizard-link');
        if (wizardLink) {
            wizardLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openWizard();
            });
        }

        // Reconfigure button
        const reconfigureBtn = document.getElementById('reconfigure-btn');
        if (reconfigureBtn) {
            reconfigureBtn.addEventListener('click', () => {
                this.openReconfiguration();
            });
        }

        // Dismiss suggestions button
        const dismissBtn = document.getElementById('dismiss-suggestions');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.dismissSuggestions();
            });
        }
    }

    /**
     * Open the Wizard with current context
     */
    async openWizard() {
        try {
            // Get current installation state for context
            const currentState = await this.getCurrentInstallationState();
            const context = {
                action: 'view',
                returnUrl: window.location.href
            };
            
            const wizardUrl = this.crossLaunchNavigator.getWizardUrl(context);
            this.navigateToWizard(wizardUrl);
        } catch (error) {
            console.error('Failed to get current state for wizard launch:', error);
            // Fallback to basic wizard URL
            const wizardUrl = this.crossLaunchNavigator.getWizardUrl();
            this.navigateToWizard(wizardUrl);
        }
    }

    /**
     * Open Wizard in reconfiguration mode with current state context
     */
    async openReconfiguration() {
        try {
            // Get current installation state for context
            const currentState = await this.getCurrentInstallationState();
            const context = {
                action: 'modify',
                returnUrl: window.location.href,
                currentState: currentState
            };
            
            const reconfigureUrl = this.crossLaunchNavigator.getWizardUrl(context);
            this.navigateToWizard(reconfigureUrl);
        } catch (error) {
            console.error('Failed to get current state for reconfiguration:', error);
            // Fallback to basic reconfiguration URL
            const reconfigureUrl = this.crossLaunchNavigator.getReconfigureUrl();
            this.navigateToWizard(reconfigureUrl);
        }
    }

    /**
     * Open Wizard to add a specific profile with context
     * @param {string} profileName - Name of profile to add
     */
    async openAddProfile(profileName) {
        try {
            // Get current installation state for context
            const currentState = await this.getCurrentInstallationState();
            const context = {
                action: 'add',
                profile: profileName,
                returnUrl: window.location.href,
                currentState: currentState
            };
            
            const addUrl = this.crossLaunchNavigator.getWizardUrl(context);
            this.navigateToWizard(addUrl);
        } catch (error) {
            console.error('Failed to get current state for add profile:', error);
            // Fallback to basic add profile URL
            const addUrl = this.crossLaunchNavigator.getAddProfileUrl(profileName);
            this.navigateToWizard(addUrl);
        }
    }

    /**
     * Open Wizard to modify a specific profile with context
     * @param {string} profileName - Name of profile to modify
     */
    async openModifyProfile(profileName) {
        try {
            // Get current installation state for context
            const currentState = await this.getCurrentInstallationState();
            const context = {
                action: 'modify',
                profile: profileName,
                returnUrl: window.location.href,
                currentState: currentState
            };
            
            const modifyUrl = this.crossLaunchNavigator.getWizardUrl(context);
            this.navigateToWizard(modifyUrl);
        } catch (error) {
            console.error('Failed to get current state for modify profile:', error);
            // Fallback to basic modify profile URL
            const modifyUrl = this.crossLaunchNavigator.getModifyProfileUrl(profileName);
            this.navigateToWizard(modifyUrl);
        }
    }

    /**
     * Load and display context-specific actions
     */
    async loadContextActions() {
        try {
            // Get configuration suggestions from the API
            const suggestions = await this.api.getConfigSuggestions();
            
            if (suggestions && suggestions.length > 0) {
                this.displayContextActions(suggestions);
            }
        } catch (error) {
            console.warn('Failed to load configuration suggestions:', error);
        }
    }

    /**
     * Display context-specific quick actions
     * @param {Array} suggestions - Array of configuration suggestions
     */
    displayContextActions(suggestions) {
        const contextActions = document.getElementById('context-actions');
        const contextActionsGrid = document.getElementById('context-actions-grid');
        
        if (!contextActions || !contextActionsGrid) {
            return;
        }

        // Clear existing actions
        contextActionsGrid.innerHTML = '';

        // Create action buttons for each suggestion
        suggestions.forEach(suggestion => {
            const actionBtn = this.createContextActionButton(suggestion);
            contextActionsGrid.appendChild(actionBtn);
        });

        // Show the context actions section
        contextActions.style.display = 'block';
    }

    /**
     * Create a context action button
     * @param {Object} suggestion - Configuration suggestion
     * @returns {HTMLElement} Button element
     */
    createContextActionButton(suggestion) {
        const button = document.createElement('a');
        button.className = 'context-action-btn';
        button.href = '#';
        
        button.innerHTML = `
            <div class="icon">${suggestion.icon || '⚙️'}</div>
            <div class="content">
                <div class="title">${suggestion.title}</div>
                <div class="description">${suggestion.description}</div>
            </div>
        `;

        button.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleContextAction(suggestion);
        });

        return button;
    }

    /**
     * Handle context action click
     * @param {Object} suggestion - Configuration suggestion
     */
    async handleContextAction(suggestion) {
        switch (suggestion.action) {
            case 'add_profile':
                await this.openAddProfile(suggestion.profile);
                break;
            case 'modify_profile':
                await this.openModifyProfile(suggestion.profile);
                break;
            case 'reconfigure':
                await this.openReconfiguration();
                break;
            default:
                // Generic reconfiguration
                await this.openReconfiguration();
        }
    }

    /**
     * Get current installation state for context passing
     * @returns {Object|null} Current installation state or null
     */
    async getCurrentInstallationState() {
        try {
            const response = await this.api.getInstallationState();
            return response.exists ? response.state : null;
        } catch (error) {
            console.warn('Failed to get current installation state:', error);
            return null;
        }
    }

    /**
     * Navigate to wizard using URL parameters instead of window.open
     * @param {string} wizardUrl - URL to navigate to
     */
    navigateToWizard(wizardUrl) {
        // Create a clickable link element and show it to the user
        // This avoids popup blockers and follows requirement 6.4 and 6.5
        this.showWizardNavigationDialog(wizardUrl);
    }

    /**
     * Show wizard navigation dialog with clickable link
     * @param {string} wizardUrl - URL to navigate to
     */
    showWizardNavigationDialog(wizardUrl) {
        // Remove any existing dialog
        const existingDialog = document.getElementById('wizard-nav-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.id = 'wizard-nav-dialog';
        overlay.className = 'wizard-nav-overlay';
        overlay.innerHTML = `
            <div class="wizard-nav-dialog">
                <div class="wizard-nav-header">
                    <h3>Launch Installation Wizard</h3>
                    <button class="wizard-nav-close" aria-label="Close">&times;</button>
                </div>
                <div class="wizard-nav-content">
                    <p>Click the link below to open the Installation Wizard:</p>
                    <div class="wizard-nav-link-container">
                        <a href="${wizardUrl}" target="_blank" class="wizard-nav-link">
                            🧙‍♂️ Open Installation Wizard
                        </a>
                    </div>
                    <p class="wizard-nav-note">
                        <small>The wizard will open in a new tab. Return to this dashboard when configuration is complete.</small>
                    </p>
                </div>
                <div class="wizard-nav-actions">
                    <button class="wizard-nav-cancel">Cancel</button>
                    <a href="${wizardUrl}" target="_blank" class="wizard-nav-primary">Open Wizard</a>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .wizard-nav-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .wizard-nav-dialog {
                background: var(--card-bg, white);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow: auto;
            }
            
            .wizard-nav-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
            }
            
            .wizard-nav-header h3 {
                margin: 0;
                color: var(--text-primary, #333);
            }
            
            .wizard-nav-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary, #666);
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .wizard-nav-close:hover {
                color: var(--text-primary, #333);
            }
            
            .wizard-nav-content {
                padding: 1.5rem;
            }
            
            .wizard-nav-content p {
                margin: 0 0 1rem 0;
                color: var(--text-primary, #333);
            }
            
            .wizard-nav-link-container {
                text-align: center;
                margin: 1.5rem 0;
            }
            
            .wizard-nav-link {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background: var(--primary-color, #70C7BA);
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            
            .wizard-nav-link:hover {
                background: var(--primary-dark, #49C8B5);
                text-decoration: none;
                color: white;
            }
            
            .wizard-nav-note {
                font-size: 0.9rem;
                color: var(--text-secondary, #666);
                text-align: center;
            }
            
            .wizard-nav-actions {
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--border-color, #e0e0e0);
            }
            
            .wizard-nav-cancel {
                padding: 0.5rem 1rem;
                background: none;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 4px;
                cursor: pointer;
                color: var(--text-secondary, #666);
            }
            
            .wizard-nav-cancel:hover {
                background: var(--hover-bg, #f5f5f5);
            }
            
            .wizard-nav-primary {
                padding: 0.5rem 1rem;
                background: var(--primary-color, #70C7BA);
                color: white;
                text-decoration: none;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: 500;
            }
            
            .wizard-nav-primary:hover {
                background: var(--primary-dark, #49C8B5);
                text-decoration: none;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Add event listeners
        const closeBtn = overlay.querySelector('.wizard-nav-close');
        const cancelBtn = overlay.querySelector('.wizard-nav-cancel');
        
        const closeDialog = () => {
            overlay.remove();
            style.remove();
        };

        closeBtn.addEventListener('click', closeDialog);
        cancelBtn.addEventListener('click', closeDialog);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog();
            }
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Dismiss configuration suggestions
     */
    dismissSuggestions() {
        const contextActions = document.getElementById('context-actions');
        if (contextActions) {
            contextActions.style.display = 'none';
        }
    }

    /**
     * Update wizard running indicator
     * @param {boolean} isRunning - Whether wizard is running
     */
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

    /**
     * Update service control buttons state based on wizard running status
     * @param {boolean} wizardRunning - Whether wizard is running
     */
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

    /**
     * Generate sample configuration suggestions for testing
     * @returns {Array} Array of sample suggestions
     */
    generateSampleSuggestions() {
        return [
            {
                title: 'Add Mining Profile',
                description: 'Set up Kaspa mining with stratum server',
                icon: '⛏️',
                action: 'add_profile',
                profile: 'mining'
            },
            {
                title: 'Add Archive Node',
                description: 'Enable full blockchain archival',
                icon: '📚',
                action: 'add_profile',
                profile: 'archive-node'
            },
            {
                title: 'Configure Indexers',
                description: 'Set up blockchain indexing services',
                icon: '🔍',
                action: 'add_profile',
                profile: 'indexer-services'
            }
        ];
    }
}