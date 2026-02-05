/**
 * Template Selection Module
 * Handles template selection, customization, and application
 */

import { stateManager } from './state-manager.js';
import { goToStep, updateStepNumbering } from './navigation.js';
import { customSetup } from './custom-setup.js';

/**
 * Profile ID migration mapping (legacy → new)
 */
const LEGACY_TO_NEW_PROFILE = {
    'core': 'kaspa-node',
    'kaspa-user-applications': ['kasia-app', 'k-social-app'],
    'indexer-services': ['kasia-indexer', 'k-indexer-bundle', 'kaspa-explorer-bundle'],
    'archive-node': 'kaspa-archive-node',
    'mining': 'kaspa-stratum'
};

/**
 * New profile IDs (all valid)
 */
const NEW_PROFILE_IDS = [
    'kaspa-node',
    'kasia-app',
    'k-social-app',
    'kaspa-explorer-bundle',
    'kasia-indexer',
    'k-indexer-bundle',
    'kaspa-archive-node',
    'kaspa-stratum'
];

/**
 * Legacy profile IDs (still supported)
 */
const LEGACY_PROFILE_IDS = [
    'core',
    'kaspa-user-applications',
    'indexer-services',
    'archive-node',
    'mining'
];

/**
 * All valid profile IDs (new + legacy)
 */
const ALL_VALID_PROFILE_IDS = [...NEW_PROFILE_IDS, ...LEGACY_PROFILE_IDS];

/**
 * Template ID migration mapping (legacy → new)
 */
const LEGACY_TO_NEW_TEMPLATE = {
    'beginner-setup': 'quick-start',
    'home-node': 'kaspa-node',
    'public-node': 'kaspa-node',
    'full-node': 'kaspa-sovereignty',
    'full-stack': 'kaspa-sovereignty',
    'developer-setup': 'custom-setup',
    'developer': 'custom-setup',
    'mining-rig': 'solo-miner',
    'miner-node': 'solo-miner'
};

/**
 * Profile display names (both new and legacy)
 */
const PROFILE_DISPLAY_NAMES = {
    // New profile IDs
    'kaspa-node': 'Kaspa Node',
    'kasia-app': 'Kasia',
    'k-social-app': 'K-Social',
    'kaspa-explorer-bundle': 'Explorer',
    'kasia-indexer': 'Kasia Indexer',
    'k-indexer-bundle': 'K-Indexer',
    'kaspa-archive-node': 'Archive Node',
    'kaspa-stratum': 'Mining',
    
    // Legacy profile IDs
    'core': 'Core',
    'kaspa-user-applications': 'Apps',
    'indexer-services': 'Indexers',
    'archive-node': 'Archive',
    'mining': 'Mining'
};

/**
 * Check if a profile ID is valid (new or legacy)
 * @param {string} profileId - Profile ID to check
 * @returns {boolean} True if valid
 */
function isValidProfileId(profileId) {
    return ALL_VALID_PROFILE_IDS.includes(profileId);
}

/**
 * Check if a profile matches (handles both new and legacy IDs)
 * @param {string[]} profiles - Array of profile IDs from template
 * @param {string} checkId - Profile ID to check for
 * @returns {boolean} True if profile is included
 */
function hasProfile(profiles, checkId) {
    // Direct match
    if (profiles.includes(checkId)) return true;
    
    // Check if checkId is legacy and any new equivalent is in profiles
    if (LEGACY_TO_NEW_PROFILE[checkId]) {
        const newIds = LEGACY_TO_NEW_PROFILE[checkId];
        const newIdArray = Array.isArray(newIds) ? newIds : [newIds];
        return newIdArray.some(id => profiles.includes(id));
    }
    
    // Check if checkId is new and the legacy equivalent is in profiles
    for (const [legacyId, newIds] of Object.entries(LEGACY_TO_NEW_PROFILE)) {
        const newIdArray = Array.isArray(newIds) ? newIds : [newIds];
        if (newIdArray.includes(checkId) && profiles.includes(legacyId)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check if template has any node profile
 * @param {string[]} profiles - Array of profile IDs
 * @returns {boolean} True if has node profile
 */
function hasNodeProfile(profiles) {
    return hasProfile(profiles, 'kaspa-node') ||
           hasProfile(profiles, 'kaspa-archive-node') ||
           hasProfile(profiles, 'core') ||
           hasProfile(profiles, 'archive-node');
}

/**
 * Check if template has any app profile
 * @param {string[]} profiles - Array of profile IDs
 * @returns {boolean} True if has app profile
 */
function hasAppProfile(profiles) {
    return hasProfile(profiles, 'kasia-app') ||
           hasProfile(profiles, 'k-social-app') ||
           hasProfile(profiles, 'kaspa-user-applications');
}

/**
 * Check if template has any indexer profile
 * @param {string[]} profiles - Array of profile IDs
 * @returns {boolean} True if has indexer profile
 */
function hasIndexerProfile(profiles) {
    return hasProfile(profiles, 'kasia-indexer') ||
           hasProfile(profiles, 'k-indexer-bundle') ||
           hasProfile(profiles, 'kaspa-explorer-bundle') ||
           hasProfile(profiles, 'indexer-services');
}

/**
 * Check if template has mining profile
 * @param {string[]} profiles - Array of profile IDs
 * @returns {boolean} True if has mining profile
 */
function hasMiningProfile(profiles) {
    return hasProfile(profiles, 'kaspa-stratum') ||
           hasProfile(profiles, 'mining');
}

class TemplateSelection {
    constructor() {
        this.templates = [];
        this.selectedTemplate = null;
        this.currentCategory = 'all';
        this.systemResources = null;
        this.useCase = 'personal';
        
        // Profile installation state tracking
        this.profileStates = null;
        this.installedProfiles = [];
        this.wizardMode = 'initial'; // 'initial' or 'reconfigure'
        
        this.initializeEventListeners();
    }

    /**
     * Initialize the template selection step
     */
    async initialize() {
        try {
            console.log('[TEMPLATE] Initializing template selection');
            
            // Load templates from API
            await this.loadTemplates();
            
            // Load profile installation state
            await this.loadProfileStates();
            
            // Apply installation state to templates
            this.applyInstallationStateToTemplates();
            
            // Get system resources for recommendations
            await this.loadSystemResources();
            
            // Get template recommendations
            await this.loadRecommendations();
            
            // Render templates
            this.renderTemplates();
            
            // Set default method selection to template (recommended)
            this.selectTemplateMethod();
            
            // Render reconfiguration banner if in reconfiguration mode
            this.renderReconfigurationBanner();
            
            console.log('[TEMPLATE] Template selection initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize template selection:', error);
            this.handleInitializationFailure(error);
        }
    }

    /**
     * Load templates from the API
     */
    async loadTemplates() {
        try {
            console.log('[TEMPLATE] Loading templates from API');
            const response = await fetch('/api/simple-templates/all');
            
            if (!response.ok) {
                // If templates API is not available, use fallback templates
                console.warn('Templates API not available, using fallback templates');
                this.handleTemplateLoadingFailure('Templates API not available', true);
                this.templates = this.getFallbackTemplates();
                return;
            }
            
            const data = await response.json();
            this.templates = data.templates || data || [];
            
            if (this.templates.length === 0) {
                console.warn('No templates returned from API, using fallback');
                this.handleTemplateLoadingFailure('No templates available from server', true);
                this.templates = this.getFallbackTemplates();
            } else {
                console.log(`[TEMPLATE] Successfully loaded ${this.templates.length} templates`);
            }
        } catch (error) {
            console.error('Failed to load templates from API:', error);
            this.handleTemplateLoadingFailure(error.message, true);
            this.templates = this.getFallbackTemplates();
        }
    }

    /**
     * Load profile installation state from backend
     * @returns {Promise<void>}
     */
    async loadProfileStates() {
        console.log('[TEMPLATE] Loading profile installation state...');
        
        try {
            const response = await fetch('/api/wizard/profiles/state');
            
            if (!response.ok) {
                console.warn('[TEMPLATE] Failed to load profile states, assuming initial installation');
                this.profileStates = null;
                this.installedProfiles = [];
                this.wizardMode = 'initial';
                return;
            }
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn('[TEMPLATE] Profile state API returned error:', data.error);
                this.profileStates = null;
                this.installedProfiles = [];
                this.wizardMode = 'initial';
                return;
            }
            
            // Store profile states
            this.profileStates = data.profiles || [];
            
            // Extract installed profile IDs
            this.installedProfiles = this.profileStates
                .filter(p => p.installationState === 'installed')
                .map(p => p.id);
            
            // Determine wizard mode
            this.wizardMode = this.installedProfiles.length > 0 ? 'reconfigure' : 'initial';
            
            console.log('[TEMPLATE] Profile states loaded:', {
                totalProfiles: this.profileStates.length,
                installedProfiles: this.installedProfiles,
                wizardMode: this.wizardMode
            });
            
        } catch (error) {
            console.error('[TEMPLATE] Error loading profile states:', error);
            // Default to initial mode on error
            this.profileStates = null;
            this.installedProfiles = [];
            this.wizardMode = 'initial';
        }
    }

    /**
     * Check if a template's profiles are already installed
     * @param {Object} template - Template object to check
     * @returns {Object} Installation status with details
     */
    checkTemplateInstallationStatus(template) {
        // If no profile states loaded, assume nothing is installed
        if (!this.profileStates || this.installedProfiles.length === 0) {
            return {
                isInstalled: false,
                isPartial: false,
                installedProfileCount: 0,
                totalProfileCount: template.profiles.length,
                installedProfileNames: [],
                availableProfileNames: template.profiles
            };
        }
        
        const templateProfiles = template.profiles || [];
        const installedCount = templateProfiles.filter(p => 
            this.installedProfiles.includes(p)
        ).length;
        
        const installedNames = templateProfiles.filter(p => 
            this.installedProfiles.includes(p)
        );
        
        const availableNames = templateProfiles.filter(p => 
            !this.installedProfiles.includes(p)
        );
        
        return {
            isInstalled: installedCount === templateProfiles.length && templateProfiles.length > 0,
            isPartial: installedCount > 0 && installedCount < templateProfiles.length,
            installedProfileCount: installedCount,
            totalProfileCount: templateProfiles.length,
            installedProfileNames: installedNames,
            availableProfileNames: availableNames
        };
    }

    /**
     * Apply installation state to all loaded templates
     * Annotates each template with installation status
     */
    applyInstallationStateToTemplates() {
        if (!this.templates || this.templates.length === 0) {
            console.warn('[TEMPLATE] No templates to apply installation state to');
            return;
        }
        
        console.log('[TEMPLATE] Applying installation state to templates...');
        
        this.templates.forEach(template => {
            const status = this.checkTemplateInstallationStatus(template);
            
            // Add installation status to template object
            template._installationStatus = status;
            
            // Log templates that are already installed
            if (status.isInstalled) {
                console.log(`[TEMPLATE] Template "${template.name}" is already installed`);
            } else if (status.isPartial) {
                console.log(`[TEMPLATE] Template "${template.name}" is partially installed (${status.installedProfileCount}/${status.totalProfileCount} profiles)`);
            }
        });
        
        console.log('[TEMPLATE] Installation state applied to all templates');
    }

    /**
     * Render installation status badge for template card
     * @param {Object} status - Installation status object
     * @returns {string} HTML for badge
     */
    renderInstallationBadge(status) {
        if (!status || (!status.isInstalled && !status.isPartial)) {
            return '';
        }
        
        if (status.isInstalled) {
            return `
                <div class="template-installation-badge installed">
                    <span class="badge-icon">✓</span>
                    <span class="badge-text">Already Installed</span>
                </div>
            `;
        }
        
        if (status.isPartial) {
            return `
                <div class="template-installation-badge partial">
                    <span class="badge-icon">⚠</span>
                    <span class="badge-text">Partially Installed (${status.installedProfileCount}/${status.totalProfileCount})</span>
                </div>
            `;
        }
        
        return '';
    }

    /**
     * Show warning when user tries to select an installed template
     * @param {Object} template - Template that's already installed
     */
    showInstalledTemplateWarning(template) {
        const status = template._installationStatus;
        
        // Create or get warning banner element
        let warningBanner = document.querySelector('.template-installed-warning');
        
        if (!warningBanner) {
            warningBanner = document.createElement('div');
            warningBanner.className = 'template-installed-warning info-banner warning';
            warningBanner.innerHTML = `
                <div class="banner-icon">⚠️</div>
                <div class="banner-content">
                    <div class="banner-message"></div>
                    <div class="banner-actions">
                        <button class="btn-secondary btn-small" onclick="window.templateSelection.buildCustomTemplate()">
                            Modify via Custom Setup
                        </button>
                    </div>
                </div>
            `;
            
            const templateGrid = document.getElementById('template-grid');
            if (templateGrid) {
                templateGrid.parentElement.insertBefore(warningBanner, templateGrid);
            }
        }
        
        // Update message
        const messageEl = warningBanner.querySelector('.banner-message');
        messageEl.innerHTML = `
            <strong>${template.name}</strong> is already installed with all its profiles:
            <em>${status.installedProfileNames.join(', ')}</em>.
            Use Custom Setup to modify your existing configuration.
        `;
        
        warningBanner.style.display = 'flex';
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            warningBanner.style.display = 'none';
        }, 8000);
    }

    /**
     * Render reconfiguration mode banner
     * Shows installation summary and mode indicator
     */
    renderReconfigurationBanner() {
        // Only show in reconfiguration mode
        if (this.wizardMode !== 'reconfigure' || this.installedProfiles.length === 0) {
            return;
        }
        
        console.log('[TEMPLATE] Rendering reconfiguration mode banner');
        
        // Create banner element
        const banner = document.createElement('div');
        banner.className = 'reconfiguration-mode-banner';
        banner.id = 'reconfiguration-mode-banner';
        
        const installedCount = this.installedProfiles.length;
        const totalProfiles = 8; // Total available profiles in system
        const availableCount = totalProfiles - installedCount;
        
        banner.innerHTML = `
            <div class="banner-header">
                <div class="banner-icon">🔄</div>
                <div class="banner-title-section">
                    <h3 class="banner-title">Reconfiguration Mode</h3>
                    <p class="banner-subtitle">Modifying existing Kaspa installation</p>
                </div>
            </div>
            
            <div class="banner-stats">
                <div class="stat-item stat-installed">
                    <span class="stat-value">${installedCount}</span>
                    <span class="stat-label">Installed</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item stat-available">
                    <span class="stat-value">${availableCount}</span>
                    <span class="stat-label">Available</span>
                </div>
            </div>
            
            <div class="banner-info">
                <p>
                    <strong>Installed profiles:</strong> 
                    <span class="profile-list">${this.formatProfileList(this.installedProfiles)}</span>
                </p>
                <p class="banner-hint">
                    Templates with already-installed profiles are disabled. 
                    Use <strong>Build Custom Setup</strong> to modify existing profiles or add new ones.
                </p>
            </div>
            
            <div class="banner-actions">
                <button class="btn-secondary btn-small" onclick="window.location.href='/dashboard'">
                    <span class="btn-icon">📊</span>
                    <span class="btn-text">View Dashboard</span>
                </button>
            </div>
        `;
        
        // Insert banner at the top of templates step
        const templateStep = document.getElementById('step-templates');
        if (templateStep) {
            // Insert after the step title/description
            const stepContent = templateStep.querySelector('.step-content') || templateStep;
            stepContent.insertBefore(banner, stepContent.firstChild);
        }
    }

    /**
     * Format profile list for display
     * @param {Array<string>} profiles - Profile IDs
     * @returns {string} Formatted profile names
     */
    formatProfileList(profiles) {
        if (!profiles || profiles.length === 0) return 'None';
        
        // Map profile IDs to human-readable names
        const profileNames = {
            'kaspa-node': 'Kaspa Node',
            'kaspa-archive-node': 'Archive Node',
            'kasia-app': 'Kasia App',
            'k-social-app': 'K-Social',
            'kaspa-explorer-bundle': 'Kaspa Explorer',
            'kasia-indexer': 'Kasia Indexer',
            'k-indexer-bundle': 'K-Indexer Bundle',
            'kaspa-stratum': 'Mining Pool'
        };
        
        return profiles
            .map(id => profileNames[id] || id)
            .join(', ');
    }

    /**
     * Fallback templates for when API is unavailable
     * UPDATED: Now uses new 8-profile architecture with 12 templates
     * @returns {Array} Array of template objects with new profile IDs
     */
    getFallbackTemplates() {
        console.warn('[TEMPLATE] Using fallback templates (API unavailable)');
        
        return [
            {
                id: 'quick-start',
                name: 'Quick Start',
                description: 'Get started instantly with Kaspa applications using public infrastructure',
                category: 'beginner',
                useCase: 'personal',
                profiles: ['kasia-app', 'k-social-app'],  // UPDATED
                icon: '🚀',
                recommended: true,
                resources: { minMemory: 2, minCpu: 1, minDisk: 10 },
                estimatedSetupTime: '5 minutes',
                syncTime: 'Not required',
                features: ['Kasia messaging app', 'K-Social app', 'Uses public indexers'],
                benefits: ['Instant setup', 'No blockchain sync', 'Minimal resources'],
                longDescription: 'Perfect for users who want to start using Kaspa applications immediately without running their own node.'
            },
            {
                id: 'kaspa-node',
                name: 'Kaspa Node',
                description: 'Run your own Kaspa node',
                category: 'beginner',
                useCase: 'personal',
                profiles: ['kaspa-node'],  // UPDATED
                icon: '🖥️',
                resources: { minMemory: 4, minCpu: 2, minDisk: 100 },
                estimatedSetupTime: '10 minutes',
                syncTime: '2-6 hours',
                features: ['Full Kaspa node', 'Network participation', 'Optional wallet'],
                benefits: ['Decentralization', 'Privacy', 'Network support'],
                longDescription: 'Run a standard Kaspa node to participate in the network and have full sovereignty over your transactions.'
            },
            {
                id: 'kasia-lite',
                name: 'Kasia Lite',
                description: 'Run Kasia app using public infrastructure',
                category: 'beginner',
                useCase: 'personal',
                profiles: ['kasia-app'],  // UPDATED
                icon: '💬',
                resources: { minMemory: 1, minCpu: 1, minDisk: 10 },
                estimatedSetupTime: '5 minutes',
                syncTime: 'Not required',
                features: ['Kasia messaging app', 'Uses public indexers', 'Minimal setup'],
                benefits: ['Instant setup', 'No blockchain sync', 'Very low resources'],
                longDescription: 'Run Kasia app using public infrastructure for minimal resource usage.'
            },
            {
                id: 'k-social-lite',
                name: 'K-Social Lite',
                description: 'Run K-Social app using public infrastructure',
                category: 'beginner',
                useCase: 'personal',
                profiles: ['k-social-app'],  // UPDATED
                icon: '👥',
                resources: { minMemory: 1, minCpu: 1, minDisk: 10 },
                estimatedSetupTime: '5 minutes',
                syncTime: 'Not required',
                features: ['K-Social app', 'Uses public indexers', 'Minimal setup'],
                benefits: ['Instant setup', 'No blockchain sync', 'Very low resources'],
                longDescription: 'Run K-Social app using public infrastructure for minimal resource usage.'
            },
            {
                id: 'kaspa-sovereignty',
                name: 'Kaspa Sovereignty',
                description: 'Full self-hosted Kaspa experience with node, apps, and indexer',
                category: 'intermediate',
                useCase: 'personal',
                profiles: ['kaspa-node', 'kasia-app', 'k-social-app', 'kasia-indexer'],  // UPDATED
                icon: '🏛️',
                resources: { minMemory: 12, minCpu: 4, minDisk: 400 },
                estimatedSetupTime: '20 minutes',
                syncTime: '4-12 hours',
                features: ['Full Kaspa node', 'Kasia app', 'K-Social app', 'Kasia indexer'],
                benefits: ['Complete independence', 'Maximum privacy', 'Full control'],
                longDescription: 'Complete self-hosted Kaspa experience with node, applications, and indexer for maximum privacy and control.'
            },
            {
                id: 'kaspa-explorer-setup',
                name: 'Kaspa Explorer Setup',
                description: 'Run Kaspa Explorer with local node',
                category: 'intermediate',
                useCase: 'community',
                profiles: ['kaspa-node', 'kaspa-explorer-bundle'],  // UPDATED
                icon: '🔍',
                resources: { minMemory: 12, minCpu: 4, minDisk: 600 },
                estimatedSetupTime: '20 minutes',
                syncTime: '6-24 hours',
                features: ['Block explorer UI', 'Simply-Kaspa indexer', 'TimescaleDB', 'Full node'],
                benefits: ['Explore blockchain locally', 'API access', 'Historical data'],
                longDescription: 'Run your own Kaspa block explorer with full indexing capabilities and local node.'
            },
            {
                id: 'solo-miner',
                name: 'Solo Miner',
                description: 'Mining setup with local node and stratum',
                category: 'advanced',
                useCase: 'mining',
                profiles: ['kaspa-node', 'kaspa-stratum'],  // UPDATED
                icon: '⛏️',
                resources: { minMemory: 6, minCpu: 4, minDisk: 150 },
                estimatedSetupTime: '15 minutes',
                syncTime: '2-6 hours',
                features: ['Kaspa node', 'Stratum bridge', 'Solo mining'],
                benefits: ['Direct block rewards', 'No pool fees', 'Full control'],
                longDescription: 'Solo mining setup with local node and stratum bridge for direct mining.'
            },
            {
                id: 'kaspa-archive-setup',
                name: 'Archive Node Setup',
                description: 'Run full history archive node',
                category: 'advanced',
                useCase: 'developer',
                profiles: ['kaspa-archive-node'],  // UPDATED
                icon: '🗄️',
                resources: { minMemory: 12, minCpu: 4, minDisk: 1000 },
                estimatedSetupTime: '20 minutes',
                syncTime: '1-4 weeks',
                features: ['Non-pruning node', 'Complete history', 'Research ready'],
                benefits: ['Historical analysis', 'Full blockchain', 'Research capabilities'],
                longDescription: 'Archive node storing complete blockchain history. Ideal for researchers and data analysts.'
            },
            {
                id: 'full-infrastructure',
                name: 'Full Infrastructure',
                description: 'Complete Kaspa ecosystem with all services',
                category: 'advanced',
                useCase: 'community',
                profiles: ['kaspa-node', 'kasia-app', 'k-social-app', 'kaspa-explorer-bundle', 'kasia-indexer', 'k-indexer-bundle'],  // UPDATED
                icon: '🏗️',
                resources: { minMemory: 32, minCpu: 8, minDisk: 1500 },
                estimatedSetupTime: '30 minutes',
                syncTime: '12-48 hours',
                features: ['All apps', 'All indexers', 'Block explorer', 'Full node'],
                benefits: ['Complete independence', 'Maximum privacy', 'Full control'],
                longDescription: 'The ultimate Kaspa setup with every service running locally. Complete digital sovereignty.'
            },
            {
                id: 'pool-operator',
                name: 'Pool Operator',
                description: 'Mining pool with archive node and stratum',
                category: 'advanced',
                useCase: 'mining',
                profiles: ['kaspa-archive-node', 'kaspa-stratum'],  // UPDATED
                icon: '🏊',
                resources: { minMemory: 14, minCpu: 6, minDisk: 1050 },
                estimatedSetupTime: '25 minutes',
                syncTime: '1-4 weeks',
                features: ['Archive node', 'Stratum bridge', 'Pool mining'],
                benefits: ['Complete history', 'Pool operations', 'Full control'],
                longDescription: 'Mining pool setup with archive node and stratum bridge for pool operations.'
            },
            {
                id: 'indexer-operator',
                name: 'Indexer Operator',
                description: 'Run multiple indexers with local node',
                category: 'advanced',
                useCase: 'developer',
                profiles: ['kaspa-node', 'kasia-indexer', 'k-indexer-bundle'],  // UPDATED
                icon: '📊',
                resources: { minMemory: 14, minCpu: 6, minDisk: 600 },
                estimatedSetupTime: '25 minutes',
                syncTime: '6-24 hours',
                features: ['Full node', 'Kasia indexer', 'K-Indexer bundle', 'Multiple databases'],
                benefits: ['Complete indexing', 'API access', 'Data analysis'],
                longDescription: 'Run multiple indexers with local node for complete data indexing and analysis capabilities.'
            },
            {
                id: 'custom-setup',
                name: 'Custom Setup',
                description: 'Build your own custom configuration',
                category: 'advanced',
                useCase: 'developer',
                profiles: [],  // Empty - user selects profiles
                icon: '🔧',
                resources: { minMemory: 0, minCpu: 0, minDisk: 0 },
                estimatedSetupTime: 'Variable',
                syncTime: 'Variable',
                features: ['Select any profiles', 'Full flexibility', 'Expert control'],
                benefits: ['Exactly what you need', 'Modify existing installs', 'Maximum control'],
                longDescription: 'Create a custom configuration by selecting exactly which profiles you want.',
                isDynamic: true
            }
        ];
    }

    /**
     * Load system resources for recommendations
     */
    async loadSystemResources() {
        try {
            const response = await fetch('/api/system-check/resources');
            
            if (!response.ok) {
                console.warn('System check API not available, using defaults');
                this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
                return;
            }
            
            const data = await response.json();
            
            if (data.resources) {
                this.systemResources = {
                    memory: Math.floor(data.resources.memory.total / (1024 * 1024 * 1024)), // Convert to GB
                    cpu: data.resources.cpu.cores || data.resources.cpu.count || 4,
                    disk: Math.floor(data.resources.disk.available / (1024 * 1024 * 1024)) // Convert to GB
                };
            } else {
                this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
            }
        } catch (error) {
            console.warn('Could not load system resources, using defaults:', error);
            this.systemResources = { memory: 8, cpu: 4, disk: 100 }; // Default values
        }
    }

    /**
     * Load template recommendations
     */
    async loadRecommendations() {
        if (!this.systemResources) return;
        
        try {
            const response = await fetch('/api/simple-templates/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    systemResources: this.systemResources,
                    useCase: this.useCase
                })
            });
            
            if (!response.ok) {
                console.warn('Recommendations API not available, using fallback logic');
                this.generateFallbackRecommendations();
                return;
            }
            
            const data = await response.json();
            
            if (data.recommendations) {
                this.recommendations = data.recommendations;
                this.markRecommendedTemplates();
            } else {
                this.generateFallbackRecommendations();
            }
        } catch (error) {
            console.warn('Could not load recommendations, using fallback logic:', error);
            this.generateFallbackRecommendations();
        }
    }

    /**
     * Generate fallback recommendations based on system resources
     */
    generateFallbackRecommendations() {
        if (!this.systemResources || !this.templates) return;
        
        this.recommendations = [];
        
        // Simple recommendation logic
        this.templates.forEach(template => {
            const meetsRequirements = 
                this.systemResources.memory >= template.resources.minMemory &&
                this.systemResources.cpu >= template.resources.minCpu &&
                this.systemResources.disk >= template.resources.minDisk;
            
            if (meetsRequirements) {
                this.recommendations.push({
                    template: template,
                    recommended: true,
                    score: this.calculateRecommendationScore(template),
                    reasons: this.getRecommendationReasons(template)
                });
            }
        });
        
        this.markRecommendedTemplates();
    }

    /**
     * Calculate recommendation score
     */
    calculateRecommendationScore(template) {
        if (!this.systemResources) return 50;
        
        const memoryRatio = this.systemResources.memory / template.resources.minMemory;
        const cpuRatio = this.systemResources.cpu / template.resources.minCpu;
        const diskRatio = this.systemResources.disk / template.resources.minDisk;
        
        return Math.min(100, Math.floor((memoryRatio + cpuRatio + diskRatio) / 3 * 50));
    }

    /**
     * Get recommendation reasons based on template profiles
     * Supports both new and legacy profile IDs
     * @param {Object} template - Template object
     * @returns {string[]} Array of recommendation reasons
     */
    getRecommendationReasons(template) {
        const reasons = [];
        
        if (template.category === 'beginner') {
            reasons.push('Easy to set up and configure');
        }
        
        // Check for app profiles (new or legacy)
        if (hasAppProfile(template.profiles)) {
            reasons.push('Includes user-friendly applications');
        }
        
        // Check for node profiles (new or legacy)
        if (hasNodeProfile(template.profiles)) {
            reasons.push('Provides full node capabilities');
        }
        
        // Check for indexer profiles
        if (hasIndexerProfile(template.profiles)) {
            reasons.push('Includes local indexing for privacy');
        }
        
        // Check for mining profiles
        if (hasMiningProfile(template.profiles)) {
            reasons.push('Enables solo mining capabilities');
        }
        
        // Check for archive node
        if (hasProfile(template.profiles, 'kaspa-archive-node') ||
            hasProfile(template.profiles, 'archive-node')) {
            reasons.push('Stores complete blockchain history');
        }
        
        return reasons;
    }

    /**
     * Mark recommended templates
     */
    markRecommendedTemplates() {
        if (!this.recommendations) return;
        
        this.templates.forEach(template => {
            const recommendation = this.recommendations.find(r => r.template.id === template.id);
            if (recommendation && recommendation.recommended) {
                template.recommended = true;
                template.recommendationScore = recommendation.score;
                template.recommendationReasons = recommendation.reasons;
            }
        });
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Setup method card clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#template-method-card')) {
                this.selectTemplateMethod();
            } else if (e.target.closest('#custom-method-card')) {
                this.selectCustomMethod();
            }
        });

        // Category tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                this.handleCategoryChange(e.target.dataset.category);
            }
        });

        // Template card clicks
        document.addEventListener('click', (e) => {
            const templateCard = e.target.closest('.template-card');
            if (templateCard) {
                this.handleTemplateSelect(templateCard.dataset.templateId);
            }
        });

        // Template action buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('template-btn-primary')) {
                e.stopPropagation();
                const templateCard = e.target.closest('.template-card');
                this.applyTemplate(templateCard.dataset.templateId);
            }
            
            if (e.target.classList.contains('template-btn-secondary')) {
                e.stopPropagation();
                const templateCard = e.target.closest('.template-card');
                this.showTemplateDetails(templateCard.dataset.templateId);
            }
        });

        // Custom template button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'build-custom-btn') {
                this.buildCustomTemplate();
            }
        });

        // Apply template button in modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'apply-template-btn') {
                this.applySelectedTemplate();
            }
        });
    }

    /**
     * Handle category change
     */
    handleCategoryChange(category) {
        this.currentCategory = category;
        
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Re-render templates
        this.renderTemplates();
    }

    /**
     * Handle template selection
     */
    handleTemplateSelect(templateId) {
        // Check if template is already installed
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        const installationStatus = template._installationStatus || { isInstalled: false };
        
        // Prevent selection of fully installed templates
        if (installationStatus.isInstalled) {
            console.warn('[TEMPLATE] Cannot select already-installed template:', templateId);
            this.showInstalledTemplateWarning(template);
            return;
        }
        
        // Warn about partial installation
        if (installationStatus.isPartial) {
            console.warn('[TEMPLATE] Template is partially installed:', {
                templateId,
                installedProfiles: installationStatus.installedProfileNames,
                availableProfiles: installationStatus.availableProfileNames
            });
        }
        
        this.selectedTemplate = templateId;
        
        // Update visual selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.templateId === templateId);
        });
    }

    /**
     * Render templates based on current category
     */
    renderTemplates() {
        const grid = document.getElementById('template-grid');
        if (!grid) return;

        let filteredTemplates = this.templates;
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            filteredTemplates = this.templates.filter(template => 
                template.category === this.currentCategory
            );
        }

        // Sort recommended templates first
        filteredTemplates.sort((a, b) => {
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            if (a.recommended && b.recommended) {
                return (b.recommendationScore || 0) - (a.recommendationScore || 0);
            }
            return 0;
        });

        grid.innerHTML = filteredTemplates.map(template => this.renderTemplateCard(template)).join('');
    }

    /**
     * Render a single template card
     */
    renderTemplateCard(template) {
        const recommendedClass = template.recommended ? 'recommended' : '';
        const selectedClass = this.selectedTemplate === template.id ? 'selected' : '';
        
        // Add installation state classes
        const installationStatus = template._installationStatus || { isInstalled: false, isPartial: false };
        const installedClass = installationStatus.isInstalled ? 'template-installed' : '';
        const partialClass = installationStatus.isPartial ? 'template-partial' : '';
        const disabledClass = installationStatus.isInstalled ? 'template-disabled' : '';
        
        return `
            <div class="template-card ${recommendedClass} ${selectedClass} ${installedClass} ${partialClass} ${disabledClass}"
                 data-template-id="${template.id}"
                 data-is-installed="${installationStatus.isInstalled}"
                 data-is-partial="${installationStatus.isPartial}">
                <div class="template-header">
                    <div class="template-icon">${template.icon}</div>
                    <div>
                        <h3 class="template-title">${template.name}</h3>
                        <div class="template-category">${template.category}</div>
                    </div>
                    ${this.renderInstallationBadge(installationStatus)}
                </div>
                
                <p class="template-description">${template.description}</p>
                
                <div class="template-meta">
                    <div class="template-meta-item">
                        <span class="template-meta-icon">⏱️</span>
                        <span>Setup: ${template.estimatedSetupTime}</span>
                    </div>
                    <div class="template-meta-item">
                        <span class="template-meta-icon">🔄</span>
                        <span>Sync: ${template.syncTime}</span>
                    </div>
                </div>
                
                <div class="template-resources">
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minMemory}GB</span>
                        <span class="template-resource-label">RAM</span>
                    </div>
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minCpu}</span>
                        <span class="template-resource-label">CPU</span>
                    </div>
                    <div class="template-resource">
                        <span class="template-resource-value">${template.resources.minDisk}GB</span>
                        <span class="template-resource-label">Disk</span>
                    </div>
                </div>
                
                <div class="template-profiles">
                    ${template.profiles.map(profile => 
                        `<span class="template-profile-tag">${this.getProfileDisplayName(profile)}</span>`
                    ).join('')}
                </div>
                
                <div class="template-actions">
                    <button class="template-btn template-btn-primary">Use Template</button>
                    <button class="template-btn template-btn-secondary">Details</button>
                </div>
            </div>
        `;
    }

    /**
     * Get display name for profile
     * Supports both new and legacy profile IDs
     * @param {string} profileId - Profile ID
     * @returns {string} Display name
     */
    getProfileDisplayName(profileId) {
        return PROFILE_DISPLAY_NAMES[profileId] || profileId;
    }

    /**
     * Get CSS class for profile tag
     * @param {string} profileId - Profile ID
     * @returns {string} CSS class name
     */
    getProfileTagClass(profileId) {
        const classMap = {
            // New profile IDs
            'kaspa-node': 'profile-tag-node',
            'kasia-app': 'profile-tag-app',
            'k-social-app': 'profile-tag-app',
            'kaspa-explorer-bundle': 'profile-tag-explorer',
            'kasia-indexer': 'profile-tag-indexer',
            'k-indexer-bundle': 'profile-tag-indexer',
            'kaspa-archive-node': 'profile-tag-archive',
            'kaspa-stratum': 'profile-tag-mining',
            
            // Legacy profile IDs
            'core': 'profile-tag-node',
            'kaspa-user-applications': 'profile-tag-app',
            'indexer-services': 'profile-tag-indexer',
            'archive-node': 'profile-tag-archive',
            'mining': 'profile-tag-mining'
        };
        return classMap[profileId] || 'profile-tag-default';
    }

    /**
     * Show template details modal
     */
    async showTemplateDetails(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        const modal = document.getElementById('template-details-modal');
        const title = document.getElementById('template-modal-title');
        const content = document.getElementById('template-details-content');

        title.textContent = template.name;
        content.innerHTML = this.renderTemplateDetails(template);

        // Store template ID for apply button
        document.getElementById('apply-template-btn').dataset.templateId = templateId;

        modal.style.display = 'flex';
    }

    /**
     * Render template details content
     */
    renderTemplateDetails(template) {
        return `
            <div class="template-details-header">
                <div class="template-details-icon">${template.icon}</div>
                <div class="template-details-info">
                    <h3>${template.name}</h3>
                    <div class="template-category">${template.category} • ${template.useCase}</div>
                </div>
            </div>
            
            <div class="template-long-description">
                ${template.longDescription}
            </div>
            
            <div class="template-details-section">
                <h4>📋 Features</h4>
                <ul class="template-features-list">
                    ${template.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            
            <div class="template-details-section">
                <h4>🎯 Benefits</h4>
                <ul class="template-benefits-list">
                    ${template.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                </ul>
            </div>
            
            <div class="template-details-section">
                <h4>💻 Resource Requirements</h4>
                <div class="template-resource-grid">
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minMemory}GB</span>
                        <span class="resource-label">Min RAM</span>
                    </div>
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minCpu}</span>
                        <span class="resource-label">Min CPU</span>
                    </div>
                    <div class="template-resource-item">
                        <span class="resource-value">${template.resources.minDisk}GB</span>
                        <span class="resource-label">Min Disk</span>
                    </div>
                </div>
            </div>
            
            ${template.recommendationReasons ? `
                <div class="template-details-section">
                    <h4>💡 Why This Template?</h4>
                    <ul class="template-benefits-list">
                        ${template.recommendationReasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    /**
     * Apply template from modal
     */
    applySelectedTemplate() {
        const templateId = document.getElementById('apply-template-btn').dataset.templateId;
        this.applyTemplate(templateId);
        this.closeTemplateModal();
    }

    /**
     * Apply template configuration
     */
    async applyTemplate(templateId) {
        try {
            console.log(`[TEMPLATE] Applying template: ${templateId}`);
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Show loading state
            this.showLoading('Applying template...');

            // Step 1: Validate template before application
            console.log(`[TEMPLATE] Validating template: ${templateId}`);
            const validationResponse = await fetch(`/api/simple-templates/${templateId}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!validationResponse.ok) {
                throw new Error('Template validation service unavailable');
            }
            
            const validation = await validationResponse.json();

            if (!validation.valid) {
                this.handleTemplateValidationError(templateId, validation.errors);
                return;
            }

            console.log('[TEMPLATE] Template validation passed');

            // Step 2: Apply template configuration using simple-templates API
            console.log(`[TEMPLATE] Applying template configuration`);
            const applyResponse = await fetch(`/api/simple-templates/${templateId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    baseConfig: stateManager.get('configuration') || {}
                })
            });
            
            if (!applyResponse.ok) {
                const errorData = await applyResponse.json();
                throw new Error(errorData.message || 'Failed to apply template');
            }
            
            const applyResult = await applyResponse.json();

            if (!applyResult.success) {
                throw new Error(applyResult.message || 'Template application failed');
            }

            // Step 3: Validate that template profiles map to existing profile system
            console.log(`[TEMPLATE] Validating profile mapping for profiles:`, template.profiles);
            const invalidProfiles = template.profiles.filter(p => !isValidProfileId(p));
            
            if (invalidProfiles.length > 0) {
                console.warn('[TEMPLATE] Invalid profiles detected:', invalidProfiles);
                // Continue but log warning - this shouldn't break the flow
            }

            // Step 4: Merge configurations properly
            console.log(`[TEMPLATE] Merging template configuration with existing configuration`);
            const existingConfig = stateManager.get('configuration') || {};
            const mergedConfig = {
                ...existingConfig,
                ...applyResult.config,
                // Ensure template-specific settings are preserved
                templateId: templateId,
                templateName: template.name,
                templateProfiles: template.profiles
            };

            // Step 5: Store template selection and configuration in state with proper navigation path
            console.log(`[TEMPLATE] Storing template selection: ${templateId}`);
            console.log(`[TEMPLATE] Selected profiles:`, template.profiles);
            console.log(`[TEMPLATE] Applied configuration:`, mergedConfig);
            
            // Set template data FIRST, then navigation path to avoid state consistency errors
            stateManager.set('selectedTemplate', templateId);
            stateManager.set('selectedProfiles', template.profiles);
            stateManager.set('configuration', mergedConfig);
            stateManager.set('templateApplied', true);
            stateManager.set('developerMode', template.developerMode || false);
            
            // Now set navigation path - state is consistent
            stateManager.setNavigationPath('template');

            // Update step visibility for template path
            updateStepNumbering();

            // Hide loading state
            this.hideLoading();

            // Show success message
            this.showSuccess(`Applied ${template.name} template successfully!`);

            // Step 6: Navigate directly to configuration step (skip profile selection)
            console.log(`[TEMPLATE] Template applied successfully, navigating to Configuration step`);
            setTimeout(() => {
                goToStep(6); // Configure is step 6 - skip profiles (step 5)
            }, 1500);

        } catch (error) {
            console.error('Failed to apply template:', error);
            this.hideLoading();
            this.handleTemplateApplicationFailure(templateId, error);
        }
    }

    /**
     * Build custom template (show custom profile picker)
     */
    async buildCustomTemplate() {
        try {
            console.log('[TEMPLATE] Starting Build Custom workflow');
            
            // Step 1: Clear any existing template state
            console.log('[TEMPLATE] Clearing template selection state');
            stateManager.set('selectedTemplate', null);
            stateManager.set('templateApplied', false);
            
            // Step 2: Clear existing profile selections (will be managed by custom setup)
            console.log('[TEMPLATE] Clearing existing profile selections');
            stateManager.set('selectedProfiles', []);
            
            // Step 3: Set navigation path to 'custom'
            console.log('[TEMPLATE] Setting navigation path to custom');
            stateManager.setNavigationPath('custom');
            
            // Update step visibility
            updateStepNumbering();
            
            // Step 4: Initialize custom setup module
            console.log('[TEMPLATE] Initializing custom setup module');
            await customSetup.initialize();
            
            // Step 5: Show success message
            this.showSuccess('Custom setup mode activated. Select profiles individually.');
            
            // Step 6: Navigate to step 5 and show custom picker
            console.log('[TEMPLATE] Navigating to Profiles step (step 5) with custom picker');
            setTimeout(() => {
                goToStep(5); // Profiles step
                customSetup.show(); // Show custom picker instead of profile cards
            }, 1000);
            
        } catch (error) {
            console.error('Failed to start Build Custom workflow:', error);
            this.showError(`Failed to start custom setup: ${error.message}`);
        }
    }

    /**
     * Select template method (show template grid)
     */
    selectTemplateMethod() {
        console.log('[TEMPLATE] Template method selected');
        
        // Hide custom setup picker if it was shown
        if (window.customSetup || typeof customSetup !== 'undefined') {
            customSetup.hide();
        }
        
        // Show template-related sections
        const templateCategories = document.getElementById('template-categories');
        const templateGrid = document.getElementById('template-grid');
        const customSection = document.getElementById('custom-template-section');
        
        if (templateCategories) templateCategories.style.display = 'block';
        if (templateGrid) templateGrid.style.display = 'grid';
        if (customSection) customSection.style.display = 'none';
        
        // Update method card selection
        this.updateMethodCardSelection('template');
        
        // Render templates if not already rendered
        if (this.templates.length > 0) {
            this.renderTemplates();
        }
    }

    /**
     * Select custom method (show custom setup option)
     */
    selectCustomMethod() {
        console.log('[TEMPLATE] Custom method selected');
        
        // Hide template-related sections and show custom section
        const templateCategories = document.getElementById('template-categories');
        const templateGrid = document.getElementById('template-grid');
        const customSection = document.getElementById('custom-template-section');
        
        if (templateCategories) templateCategories.style.display = 'none';
        if (templateGrid) templateGrid.style.display = 'none';
        if (customSection) customSection.style.display = 'block';
        
        // Update method card selection
        this.updateMethodCardSelection('custom');
    }

    /**
     * Update method card visual selection
     */
    updateMethodCardSelection(selectedMethod) {
        const templateCard = document.getElementById('template-method-card');
        const customCard = document.getElementById('custom-method-card');
        
        // Remove active class from both cards
        if (templateCard) templateCard.classList.remove('active');
        if (customCard) customCard.classList.remove('active');
        
        // Add active class to selected card
        if (selectedMethod === 'template' && templateCard) {
            templateCard.classList.add('active');
        } else if (selectedMethod === 'custom' && customCard) {
            customCard.classList.add('active');
        }
    }

    /**
     * Close template details modal
     */
    closeTemplateModal() {
        const modal = document.getElementById('template-details-modal');
        modal.style.display = 'none';
    }

    /**
     * Show loading message
     */
    showLoading(message) {
        // Create or update loading banner
        let loadingBanner = document.querySelector('.template-loading-banner');
        if (!loadingBanner) {
            loadingBanner = document.createElement('div');
            loadingBanner.className = 'template-loading-banner info-banner';
            loadingBanner.innerHTML = `
                <div class="loading-spinner">⏳</div>
                <div class="loading-content">
                    <div class="loading-title">Processing</div>
                    <div class="loading-message"></div>
                </div>
            `;
            loadingBanner.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #1e40af;
            `;
            document.getElementById('step-templates').insertBefore(
                loadingBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        loadingBanner.querySelector('.loading-message').textContent = message;
        loadingBanner.style.display = 'flex';
    }

    /**
     * Hide loading message
     */
    hideLoading() {
        const loadingBanner = document.querySelector('.template-loading-banner');
        if (loadingBanner) {
            loadingBanner.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message, options = {}) {
        const { showFallback = true, fallbackOptions = [] } = options;
        
        let errorBanner = document.querySelector('.template-error-banner');
        if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.className = 'template-error-banner error-banner';
            errorBanner.innerHTML = `
                <div class="error-icon">❌</div>
                <div class="error-content">
                    <div class="error-title">Template Error</div>
                    <div class="error-message"></div>
                    <div class="error-actions" style="display: none;">
                        <button class="btn-secondary btn-small" onclick="window.templateSelection.buildCustomTemplate()">
                            Use Custom Setup Instead
                        </button>
                    </div>
                </div>
            `;
            errorBanner.style.cssText = `
                display: flex;
                align-items: flex-start;
                gap: 12px;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #991b1b;
            `;
            document.getElementById('step-templates').insertBefore(
                errorBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        errorBanner.querySelector('.error-message').textContent = message;
        
        // Show fallback options if available
        if (showFallback && (fallbackOptions.includes('build-custom') || fallbackOptions.length === 0)) {
            errorBanner.querySelector('.error-actions').style.display = 'block';
        }
        
        errorBanner.style.display = 'flex';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorBanner.style.display = 'none';
        }, 10000);
    }

    /**
     * Handle template loading failure with fallback options
     */
    handleTemplateLoadingFailure(errorMessage, useFallback = true) {
        console.warn('[TEMPLATE] Template loading failed:', errorMessage);
        
        if (useFallback) {
            this.showError(
                `Unable to load templates from server: ${errorMessage}. Using offline templates.`,
                { 
                    showFallback: true,
                    fallbackOptions: ['build-custom']
                }
            );
        } else {
            this.showError(
                `Unable to load templates: ${errorMessage}. You can still create a custom setup.`,
                { 
                    showFallback: true,
                    fallbackOptions: ['build-custom']
                }
            );
        }
        
        // Enable custom setup as primary option when templates fail
        this.enableCustomSetupFallback();
    }

    /**
     * Handle initialization failure
     */
    handleInitializationFailure(error) {
        console.error('[TEMPLATE] Template selection initialization failed:', error);
        
        let errorMessage = 'Failed to initialize template selection.';
        let recoveryOptions = ['build-custom'];
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error prevented loading templates. Check your connection.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Template loading timed out. The server may be busy.';
        } else {
            errorMessage = `Template system error: ${error.message}`;
        }
        
        this.showError(
            `${errorMessage} You can still proceed with custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: recoveryOptions
            }
        );
        
        // Ensure custom setup is available as fallback
        this.enableCustomSetupFallback();
        
        // Try to render fallback templates if possible
        try {
            if (this.templates && this.templates.length > 0) {
                this.renderTemplates();
            } else {
                this.templates = this.getFallbackTemplates();
                this.renderTemplates();
            }
        } catch (renderError) {
            console.error('[TEMPLATE] Failed to render fallback templates:', renderError);
            // Custom setup button should still be available
        }
    }

    /**
     * Enable custom setup as fallback when templates fail
     */
    enableCustomSetupFallback() {
        // Ensure the custom setup button is enabled and prominent
        const customBtn = document.getElementById('build-custom-btn');
        if (customBtn) {
            customBtn.disabled = false;
            customBtn.textContent = 'Continue with Custom Setup';
            customBtn.style.backgroundColor = '#059669'; // Make it more prominent
            customBtn.style.color = 'white';
        }
        
        // Add a fallback message to the custom template section
        const customSection = document.querySelector('.custom-template-section');
        if (customSection) {
            let fallbackMessage = customSection.querySelector('.fallback-message');
            if (!fallbackMessage) {
                fallbackMessage = document.createElement('div');
                fallbackMessage.className = 'fallback-message';
                fallbackMessage.style.cssText = `
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                    color: #166534;
                    font-size: 14px;
                `;
                fallbackMessage.innerHTML = `
                    <strong>✅ Custom Setup Available</strong><br>
                    Templates are having issues, but you can still proceed with manual service selection.
                `;
                customSection.insertBefore(fallbackMessage, customSection.firstChild);
            }
        }
    }

    /**
     * Handle template application failure with recovery options
     */
    handleTemplateApplicationFailure(templateId, error) {
        console.error('[TEMPLATE] Template application failed:', error);
        
        let errorMessage = `Failed to apply ${templateId} template`;
        let recoveryOptions = ['build-custom'];
        
        if (error.message.includes('validation')) {
            errorMessage = `Template validation failed: ${error.message}`;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error during template application. Please check your connection.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Template application timed out. Please try again.';
        } else if (error.message.includes('service unavailable')) {
            errorMessage = 'Template service is currently unavailable.';
        } else {
            errorMessage = `Template application error: ${error.message}`;
        }
        
        this.showError(
            `${errorMessage} You can try a different template or use custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: recoveryOptions
            }
        );
        
        // Clear failed template state
        stateManager.set('selectedTemplate', null);
        stateManager.set('templateApplied', false);
        
        // Enable custom setup as fallback
        this.enableCustomSetupFallback();
    }

    /**
     * Handle template validation errors
     */
    handleTemplateValidationError(templateId, validationErrors) {
        console.error('[TEMPLATE] Template validation errors:', validationErrors);
        
        const errorMessage = `Template "${templateId}" validation failed: ${validationErrors.join(', ')}`;
        
        this.showError(
            `${errorMessage} Please try a different template or use custom setup.`,
            { 
                showFallback: true,
                fallbackOptions: ['build-custom']
            }
        );
        
        // Clear failed template state
        stateManager.set('selectedTemplate', null);
        stateManager.set('templateApplied', false);
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        // Create or update success banner
        let successBanner = document.querySelector('.template-success-banner');
        if (!successBanner) {
            successBanner = document.createElement('div');
            successBanner.className = 'template-success-banner success-banner';
            successBanner.innerHTML = `
                <div class="success-icon">✅</div>
                <div class="success-content">
                    <div class="success-title">Success</div>
                    <div class="success-message"></div>
                </div>
            `;
            successBanner.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(126, 211, 33, 0.1);
                border: 1px solid rgba(126, 211, 33, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                color: #2d5016;
            `;
            document.getElementById('step-templates').insertBefore(
                successBanner, 
                document.querySelector('.template-categories')
            );
        }
        
        successBanner.querySelector('.success-message').textContent = message;
        successBanner.style.display = 'flex';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successBanner.style.display = 'none';
        }, 3000);
    }
}

// Global functions for modal
function closeTemplateModal() {
    if (window.templateSelection) {
        window.templateSelection.closeTemplateModal();
    }
}

// Attach to window for global access
window.closeTemplateModal = closeTemplateModal;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.templateSelection = new TemplateSelection();
});

// Export for module use
export default TemplateSelection;