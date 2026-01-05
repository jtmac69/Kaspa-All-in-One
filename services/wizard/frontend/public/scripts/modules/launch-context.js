/**
 * Launch Context Module
 * Handles parsing and processing of launch context from URL parameters
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

/**
 * Parse launch context from URL parameters
 * @returns {LaunchContext|null} Parsed context or null
 */
export function parseLaunchContext() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const context = {};

        // Parse action
        const action = urlParams.get('action');
        if (action && ['add', 'modify', 'remove', 'view'].includes(action)) {
            context.action = action;
        }

        // Parse profile
        const profile = urlParams.get('profile');
        if (profile) {
            context.profile = profile;
        }

        // Parse service
        const service = urlParams.get('service');
        if (service) {
            context.service = service;
        }

        // Parse return URL
        const returnUrl = urlParams.get('returnUrl');
        if (returnUrl) {
            context.returnUrl = decodeURIComponent(returnUrl);
        }

        // Parse current state
        const currentStateParam = urlParams.get('currentState');
        if (currentStateParam) {
            try {
                const stateJson = decodeURIComponent(currentStateParam);
                context.currentState = JSON.parse(stateJson);
            } catch (error) {
                console.warn('Failed to parse current state from URL:', error);
            }
        }

        // Return null if no context found
        return Object.keys(context).length > 0 ? context : null;
    } catch (error) {
        console.warn('Failed to parse launch context:', error);
        return null;
    }
}

/**
 * Process launch context and apply appropriate pre-selections
 * @param {LaunchContext} context - Launch context to process
 */
export function processLaunchContext(context) {
    if (!context) {
        return;
    }

    console.log('Processing launch context:', context);

    // Store context in state manager for later use
    stateManager.set('launchContext', context);

    // Show notification about context
    if (context.action) {
        const actionMessages = {
            'add': 'Launching wizard to add new services',
            'modify': 'Launching wizard to modify configuration',
            'remove': 'Launching wizard to remove services',
            'view': 'Launching wizard to view configuration'
        };
        
        const message = actionMessages[context.action] || 'Launching wizard with context';
        showNotification(message, 'info');
    }

    // Apply context-specific pre-selections
    applyContextPreselections(context);
}

/**
 * Apply pre-selections based on launch context
 * @param {LaunchContext} context - Launch context
 */
function applyContextPreselections(context) {
    // Set reconfiguration mode if action is specified
    if (context.action && context.action !== 'view') {
        stateManager.set('wizardMode', 'reconfigure');
        stateManager.set('reconfigurationAction', context.action);
    }

    // Pre-select profile if specified
    if (context.profile) {
        stateManager.set('contextProfile', context.profile);
        
        // If action is add, mark this profile for addition
        if (context.action === 'add') {
            stateManager.set('profilesToAdd', [context.profile]);
        }
        // If action is remove, mark this profile for removal
        else if (context.action === 'remove') {
            stateManager.set('profilesToRemove', [context.profile]);
        }
        // If action is modify, mark this profile for modification
        else if (context.action === 'modify') {
            stateManager.set('profilesToModify', [context.profile]);
        }
    }

    // Pre-select service if specified
    if (context.service) {
        stateManager.set('contextService', context.service);
    }

    // Store return URL for navigation after completion
    if (context.returnUrl) {
        stateManager.set('returnUrl', context.returnUrl);
    }

    // Apply current state if provided
    if (context.currentState) {
        stateManager.set('dashboardState', context.currentState);
    }
}

/**
 * Get context-aware navigation suggestions
 * @returns {object} Navigation suggestions based on context
 */
export function getContextNavigationSuggestions() {
    const context = stateManager.get('launchContext');
    if (!context) {
        return null;
    }

    const suggestions = {
        showReconfigurationLanding: false,
        skipToProfileSelection: false,
        skipToConfiguration: false,
        preselectedAction: null,
        preselectedProfile: null,
        navigationMessage: null
    };

    // Determine navigation based on action
    switch (context.action) {
        case 'add':
            suggestions.showReconfigurationLanding = true;
            suggestions.preselectedAction = 'add-profiles';
            suggestions.navigationMessage = 'Ready to add new services to your installation';
            break;
            
        case 'modify':
            if (context.profile) {
                suggestions.skipToConfiguration = true;
                suggestions.preselectedProfile = context.profile;
                suggestions.navigationMessage = `Ready to modify ${context.profile} configuration`;
            } else {
                suggestions.showReconfigurationLanding = true;
                suggestions.preselectedAction = 'modify-config';
                suggestions.navigationMessage = 'Ready to modify your configuration';
            }
            break;
            
        case 'remove':
            suggestions.showReconfigurationLanding = true;
            suggestions.preselectedAction = 'remove-profiles';
            suggestions.preselectedProfile = context.profile;
            suggestions.navigationMessage = context.profile 
                ? `Ready to remove ${context.profile}` 
                : 'Ready to remove services';
            break;
            
        case 'view':
            suggestions.showReconfigurationLanding = true;
            suggestions.navigationMessage = 'Viewing current configuration';
            break;
    }

    return suggestions;
}

/**
 * Clear launch context from URL and state
 */
export function clearLaunchContext() {
    // Clear from state
    stateManager.remove('launchContext');
    stateManager.remove('contextProfile');
    stateManager.remove('contextService');
    stateManager.remove('profilesToAdd');
    stateManager.remove('profilesToRemove');
    stateManager.remove('profilesToModify');
    stateManager.remove('dashboardState');

    // Clear from URL without page reload
    if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        const contextParams = ['action', 'profile', 'service', 'returnUrl', 'currentState'];
        
        contextParams.forEach(param => {
            url.searchParams.delete(param);
        });

        window.history.replaceState({}, document.title, url.toString());
    }
}

/**
 * Get return URL for navigation after completion
 * @returns {string|null} Return URL or null
 */
export function getReturnUrl() {
    return stateManager.get('returnUrl') || null;
}

/**
 * Navigate to return URL if available
 * @returns {boolean} True if navigation occurred, false otherwise
 */
export function navigateToReturnUrl() {
    const returnUrl = getReturnUrl();
    if (returnUrl) {
        try {
            window.location.href = returnUrl;
            return true;
        } catch (error) {
            console.error('Failed to navigate to return URL:', error);
            showNotification('Failed to return to previous page', 'error');
        }
    }
    return false;
}

/**
 * Initialize launch context processing
 * Should be called when the wizard loads
 */
export function initializeLaunchContext() {
    const context = parseLaunchContext();
    if (context) {
        processLaunchContext(context);
        return context;
    }
    return null;
}

// Export for global access
if (typeof window !== 'undefined') {
    window.parseLaunchContext = parseLaunchContext;
    window.processLaunchContext = processLaunchContext;
    window.clearLaunchContext = clearLaunchContext;
    window.navigateToReturnUrl = navigateToReturnUrl;
    window.initializeLaunchContext = initializeLaunchContext;
}