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
            checkpoints: []
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
}

// Create singleton instance
export const stateManager = new StateManager();
