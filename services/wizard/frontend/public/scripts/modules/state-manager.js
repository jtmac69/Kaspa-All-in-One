/**
 * State Manager Module
 * Centralized state management with persistence
 */

export class StateManager {
    constructor() {
        this.state = this.loadState();
        this.listeners = new Map();
    }
    
    /**
     * Get initial state structure
     */
    getInitialState() {
        return {
            currentStep: 1,
            checklist: {
                requirements: { status: 'pending', data: null },
                docker: { status: 'pending', data: null },
                compose: { status: 'pending', data: null },
                ports: { status: 'pending', data: null },
                quiz: { status: 'optional', data: null }
            },
            systemCheck: {},
            selectedProfiles: [],
            configuration: {},
            installationProgress: {},
            profileData: {},
            versionHistory: [],
            checkpoints: [],
            // Navigation path state
            navigationPath: null, // 'template' | 'custom' | null
            selectedTemplate: null,
            templateApplied: false,
            navigationHistory: []
        };
    }
    
    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('wizardState');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with initial state to ensure all keys exist
                return { ...this.getInitialState(), ...parsed };
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
        return this.getInitialState();
    }
    
    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem('wizardState', JSON.stringify(this.state));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    /**
     * Get state value
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Set state value
     */
    set(key, value) {
        this.state[key] = value;
        this.saveState();
        this.notify(key, value);
    }
    
    /**
     * Update nested state
     */
    update(key, updates) {
        this.state[key] = { ...this.state[key], ...updates };
        this.saveState();
        this.notify(key, this.state[key]);
    }
    
    /**
     * Delete a specific state key
     */
    delete(key) {
        if (key in this.state) {
            delete this.state[key];
            this.saveState();
            this.notify(key, undefined);
        }
    }
    
    /**
     * Reset state
     */
    reset() {
        this.state = this.getInitialState();
        localStorage.removeItem('wizardState');
        this.notify('reset', this.state);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify listeners of state change
     */
    notify(key, value) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => callback(value));
        
        // Also notify 'all' listeners
        const allCallbacks = this.listeners.get('all') || [];
        allCallbacks.forEach(callback => callback(key, value));
    }
    
    /**
     * Get entire state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Navigation history management
     */
    addToHistory(stepNumber) {
        const history = this.get('navigationHistory') || [];
        history.push(stepNumber);
        this.set('navigationHistory', history);
        console.log(`[STATE] Added step ${stepNumber} to navigation history`);
    }
    
    getLastStep() {
        const history = this.get('navigationHistory') || [];
        return history.length > 0 ? history[history.length - 1] : 1;
    }
    
    clearHistory() {
        this.set('navigationHistory', []);
        console.log('[STATE] Cleared navigation history');
    }
    
    /**
     * Navigation path management
     */
    setNavigationPath(path) {
        const currentPath = this.get('navigationPath');
        
        // Only clear conflicting state if actually switching paths
        if (currentPath !== path) {
            this.clearConflictingState(path);
        }
        
        this.set('navigationPath', path);
        console.log(`[STATE] Navigation path set to: ${path}`);
        
        // Validate state after setting path
        const validation = this.validateStateConsistency();
        if (!validation.valid) {
            console.warn('[STATE] State inconsistency detected after setting navigation path:', validation.errors);
        }
    }
    
    getNavigationPath() {
        return this.get('navigationPath');
    }
    
    isTemplatePathActive() {
        return this.get('navigationPath') === 'template';
    }
    
    isCustomPathActive() {
        return this.get('navigationPath') === 'custom';
    }
    
    /**
     * Template state management
     */
    setTemplateApplied(applied) {
        this.set('templateApplied', applied);
        
        // If template is applied, ensure template path is active
        if (applied && this.get('navigationPath') !== 'template') {
            console.log('[STATE] Template applied - setting navigation path to template');
            this.setNavigationPath('template');
        }
        
        console.log(`[STATE] Template applied: ${applied}`);
    }
    
    isTemplateApplied() {
        return this.get('templateApplied') === true;
    }
    
    /**
     * Set selected template and ensure state consistency
     */
    setSelectedTemplate(templateId) {
        this.set('selectedTemplate', templateId);
        
        // If template is selected, clear custom path state
        if (templateId && this.get('navigationPath') === 'custom') {
            console.log('[STATE] Template selected - clearing custom path state');
            this.clearConflictingState('template');
        }
        
        console.log(`[STATE] Selected template: ${templateId}`);
    }
    
    /**
     * Set selected profiles and ensure state consistency
     */
    setSelectedProfiles(profiles) {
        this.set('selectedProfiles', profiles);
        
        // If profiles are selected manually, ensure custom path
        if (profiles && profiles.length > 0 && this.get('navigationPath') === 'template') {
            console.log('[STATE] Profiles selected manually - clearing template path state');
            this.clearConflictingState('custom');
            this.setNavigationPath('custom');
        }
        
        console.log(`[STATE] Selected profiles:`, profiles);
    }
    
    /**
     * Ensure only one navigation path is active
     */
    ensureSinglePathActive() {
        const navigationPath = this.get('navigationPath');
        const selectedTemplate = this.get('selectedTemplate');
        const templateApplied = this.get('templateApplied');
        const selectedProfiles = this.get('selectedProfiles') || [];
        
        // Determine which path should be active based on current state
        let correctPath = null;
        
        if (selectedTemplate && templateApplied) {
            correctPath = 'template';
        } else if (selectedProfiles.length > 0 && !templateApplied) {
            correctPath = 'custom';
        }
        
        // If we determined a correct path and it's different from current, fix it
        if (correctPath && correctPath !== navigationPath) {
            console.log(`[STATE] Correcting navigation path from ${navigationPath} to ${correctPath}`);
            this.setNavigationPath(correctPath);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get navigation history as array
     */
    getNavigationHistory() {
        return this.get('navigationHistory') || [];
    }
    
    /**
     * Remove last step from navigation history
     */
    removeLastFromHistory() {
        const history = this.get('navigationHistory') || [];
        if (history.length > 0) {
            history.pop();
            this.set('navigationHistory', history);
            console.log('[STATE] Removed last step from navigation history');
        }
    }
    
    /**
     * Get previous step from history without removing it
     */
    getPreviousStep() {
        const history = this.get('navigationHistory') || [];
        return history.length > 1 ? history[history.length - 2] : 1;
    }
    
    /**
     * State consistency validation
     */
    validateStateConsistency() {
        const navigationPath = this.get('navigationPath');
        const selectedTemplate = this.get('selectedTemplate');
        const templateApplied = this.get('templateApplied');
        const selectedProfiles = this.get('selectedProfiles') || [];
        
        const errors = [];
        const warnings = [];
        
        // Check for conflicting states
        if (navigationPath === 'template') {
            if (!selectedTemplate) {
                errors.push('Template path active but no template selected');
            }
            if (!templateApplied && selectedTemplate) {
                warnings.push('Template selected but not yet applied');
            }
            if (selectedProfiles.length > 0 && !templateApplied) {
                errors.push('Template path active but profiles manually selected');
            }
        } else if (navigationPath === 'custom') {
            if (selectedTemplate && templateApplied) {
                errors.push('Custom path active but template is applied');
            }
            if (selectedProfiles.length === 0) {
                warnings.push('Custom path active but no profiles selected yet');
            }
        } else if (navigationPath === null) {
            // No path selected yet - this is valid for initial state
            if (selectedTemplate && templateApplied) {
                warnings.push('Template applied but navigation path not set');
            }
            if (selectedProfiles.length > 0) {
                warnings.push('Profiles selected but navigation path not set');
            }
        }
        
        if (errors.length > 0) {
            console.warn('[STATE] State consistency errors:', errors);
        }
        if (warnings.length > 0) {
            console.info('[STATE] State consistency warnings:', warnings);
        }
        
        return { 
            valid: errors.length === 0, 
            errors, 
            warnings,
            canProceed: errors.length === 0
        };
    }
    
    /**
     * Clear conflicting state when switching between paths
     */
    clearConflictingState(newPath) {
        if (newPath === 'template') {
            // Only clear custom selection state if we're switching FROM custom TO template
            // Don't clear if we're applying a template (which sets both template and profiles)
            const hasTemplateApplied = this.get('templateApplied');
            const hasSelectedTemplate = this.get('selectedTemplate');
            
            if (!hasTemplateApplied && !hasSelectedTemplate) {
                // We're switching to template mode without a template applied - clear custom profiles
                this.set('selectedProfiles', []);
                console.log('[STATE] Cleared custom selection state for template path');
            } else {
                // We're applying a template - keep the profiles that the template sets
                console.log('[STATE] Template being applied - preserving template profiles');
            }
        } else if (newPath === 'custom') {
            // Clear template selection state
            this.set('selectedTemplate', null);
            this.set('templateApplied', false);
            console.log('[STATE] Cleared template selection state for custom path');
        }
    }
    
    /**
     * Recover from invalid state by attempting to fix inconsistencies
     */
    recoverFromInvalidState() {
        const validation = this.validateStateConsistency();
        
        if (validation.valid) {
            console.log('[STATE] State is already valid, no recovery needed');
            return { recovered: false, actions: [] };
        }
        
        const actions = [];
        const navigationPath = this.get('navigationPath');
        const selectedTemplate = this.get('selectedTemplate');
        const templateApplied = this.get('templateApplied');
        const selectedProfiles = this.get('selectedProfiles') || [];
        
        // Recovery strategies
        if (navigationPath === 'template') {
            if (!selectedTemplate && selectedProfiles.length > 0) {
                // Template path but only profiles selected - switch to custom
                this.setNavigationPath('custom');
                actions.push('Switched to custom path due to profile selection');
            } else if (!selectedTemplate && !templateApplied) {
                // Template path but no template - clear path
                this.set('navigationPath', null);
                actions.push('Cleared navigation path due to missing template');
            }
        } else if (navigationPath === 'custom') {
            if (selectedTemplate && templateApplied && selectedProfiles.length === 0) {
                // Custom path but template applied - switch to template
                this.setNavigationPath('template');
                actions.push('Switched to template path due to applied template');
            }
        } else if (navigationPath === null) {
            // No path set but state exists - determine path from state
            if (selectedTemplate && templateApplied) {
                this.setNavigationPath('template');
                actions.push('Set navigation path to template based on applied template');
            } else if (selectedProfiles.length > 0) {
                this.setNavigationPath('custom');
                actions.push('Set navigation path to custom based on selected profiles');
            }
        }
        
        // Final validation
        const finalValidation = this.validateStateConsistency();
        
        console.log('[STATE] Recovery completed:', {
            recovered: actions.length > 0,
            actions,
            finalValid: finalValidation.valid
        });
        
        return {
            recovered: actions.length > 0,
            actions,
            finalValid: finalValidation.valid,
            remainingErrors: finalValidation.errors
        };
    }
    
    /**
     * Validate state before proceeding to configuration step
     */
    validateBeforeConfiguration() {
        const validation = this.validateStateConsistency();
        const navigationPath = this.get('navigationPath');
        const currentStep = this.get('currentStep');
        
        // Additional checks for configuration step
        const configurationErrors = [];
        
        if (!navigationPath) {
            configurationErrors.push('No navigation path selected - user must choose template or custom setup');
        }
        
        if (navigationPath === 'template') {
            const selectedTemplate = this.get('selectedTemplate');
            const templateApplied = this.get('templateApplied');
            
            if (!selectedTemplate) {
                configurationErrors.push('Template path selected but no template chosen');
            }
            if (!templateApplied) {
                configurationErrors.push('Template selected but not applied');
            }
        } else if (navigationPath === 'custom') {
            const selectedProfiles = this.get('selectedProfiles') || [];
            
            if (selectedProfiles.length === 0) {
                configurationErrors.push('Custom path selected but no profiles chosen');
            }
        }
        
        return {
            valid: validation.valid && configurationErrors.length === 0,
            errors: [...validation.errors, ...configurationErrors],
            warnings: validation.warnings || [],
            canProceedToConfiguration: validation.valid && configurationErrors.length === 0,
            navigationPath,
            currentStep
        };
    }
}

// Create singleton instance
export const stateManager = new StateManager();
