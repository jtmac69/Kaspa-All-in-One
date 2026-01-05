/**
 * API Client Module
 * Handles all API communication with the dashboard backend
 */

export class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5 seconds
    }

    /**
     * Make an API request with caching support
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}_${url}`;

        // Check cache for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cache GET requests
            if (!options.method || options.method === 'GET') {
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Generic POST request
     */
    async post(endpoint, body = null) {
        return this.request(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : null
        });
    }

    // Service Management
    async getServiceStatus() {
        return this.request('/api/status');
    }

    async getProfiles() {
        return this.request('/api/profiles');
    }

    async startService(serviceName) {
        return this.request(`/api/services/${serviceName}/start`, { method: 'POST' });
    }

    async stopService(serviceName) {
        return this.request(`/api/services/${serviceName}/stop`, { method: 'POST' });
    }

    async restartService(serviceName) {
        return this.request(`/api/services/${serviceName}/restart`, { method: 'POST' });
    }

    async getServiceLogs(serviceName, lines = 100, search = '') {
        const params = new URLSearchParams({ lines, search });
        return this.request(`/api/services/${serviceName}/logs?${params}`);
    }

    // Kaspa Node
    async getKaspaInfo() {
        try {
            return await this.request('/api/kaspa/info');
        } catch (error) {
            return { error: 'Node not available', available: false };
        }
    }

    async getKaspaStats() {
        try {
            return await this.request('/api/kaspa/stats');
        } catch (error) {
            return { error: 'Stats not available', available: false };
        }
    }

    // Enhanced Kaspa Node with port fallback
    async getKaspaNodeInfo() {
        try {
            return await this.request('/api/kaspa/node/info');
        } catch (error) {
            return { error: 'Node not available', available: false };
        }
    }

    async getKaspaNodeStats() {
        try {
            return await this.request('/api/kaspa/node/stats');
        } catch (error) {
            return { error: 'Stats not available', available: false };
        }
    }

    async getKaspaConnectionStatus() {
        try {
            return await this.request('/api/kaspa/connection/status');
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    async testKaspaConnection() {
        try {
            return await this.request('/api/kaspa/connection/test', { method: 'POST' });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Wallet (placeholder)
    async getWalletInfo() {
        try {
            return await this.request('/api/kaspa/wallet');
        } catch (error) {
            return { error: 'Wallet not available', available: false };
        }
    }

    // System Resources
    async getSystemResources() {
        return this.request('/api/system/resources');
    }

    // Updates (placeholder)
    async getAvailableUpdates() {
        try {
            return await this.request('/api/updates/available');
        } catch (error) {
            return { updates: [], message: 'Update checking not available' };
        }
    }

    async checkForUpdates() {
        try {
            return await this.request('/api/updates/check', { method: 'POST' });
        } catch (error) {
            return { updates: [], message: 'Update checking not available' };
        }
    }

    // Configuration
    async getConfig() {
        return this.request('/api/config');
    }

    async getDependencies() {
        return this.request('/api/dependencies');
    }

    // Installation state
    async getInstallationState() {
        return this.request('/api/installation/state');
    }

    // Alerts
    async getAlerts(options = {}) {
        const params = new URLSearchParams(options);
        return this.request(`/api/alerts?${params}`);
    }

    async acknowledgeAlert(alertId) {
        return this.request(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    }

    // Wizard Integration
    async launchWizard(mode = 'reconfiguration', context = {}) {
        return this.request('/api/wizard/launch', {
            method: 'POST',
            body: JSON.stringify({ mode, context })
        });
    }

    async getWizardConfig() {
        return this.request('/api/wizard/config');
    }

    async getConfigSuggestions() {
        return this.request('/api/wizard/suggestions');
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }
}
