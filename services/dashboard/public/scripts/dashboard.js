/**
 * Main Dashboard Controller
 * Coordinates all dashboard modules and handles application logic
 */

import { APIClient } from './modules/api-client.js';
import { WebSocketManager } from './modules/websocket-manager.js';
import { UIManager } from './modules/ui-manager.js';

class Dashboard {
    constructor() {
        this.api = new APIClient();
        this.ws = new WebSocketManager();
        this.ui = new UIManager();
        
        this.currentFilter = 'all';
        this.updateInterval = null;
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        console.log('Initializing Kaspa Dashboard...');

        // Initialize UI
        this.ui.init();

        // Setup event listeners
        this.setupEventListeners();

        // Connect WebSocket
        this.ws.connect();
        this.setupWebSocketListeners();

        // Load initial data
        await this.loadInitialData();

        // Start periodic updates
        this.startPeriodicUpdates();

        console.log('Dashboard initialized successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Service actions
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Service control buttons
            if (target.dataset.action) {
                e.preventDefault();
                this.handleServiceAction(target.dataset.action, target.dataset.service);
            }

            // Modal close buttons
            if (target.classList.contains('close')) {
                const modal = target.closest('.modal');
                if (modal) this.ui.closeModal(modal);
            }
        });

        // Profile filter
        document.addEventListener('profile-filter-changed', (e) => {
            this.currentFilter = e.detail;
            this.refreshServices();
        });

        // Header buttons
        const updateBtn = document.getElementById('updates-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.openUpdatesModal());
        }

        const configBtn = document.getElementById('config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.openConfigModal());
        }

        const toggleViewBtn = document.getElementById('toggle-view');
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', () => this.toggleServiceView());
        }

        const refreshBtn = document.getElementById('refresh-services');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshServices());
        }

        // Quick actions
        this.setupQuickActions();
    }

    /**
     * Setup quick action buttons
     */
    setupQuickActions() {
        const actions = document.querySelectorAll('.action-btn');
        actions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = btn.textContent.trim();
                if (text.includes('Restart All')) {
                    this.restartAllServices();
                } else if (text.includes('Update')) {
                    this.updateServices();
                } else if (text.includes('Backup')) {
                    this.backupData();
                }
            });
        });
    }

    /**
     * Setup WebSocket listeners
     */
    setupWebSocketListeners() {
        this.ws.on('connection-status', (data) => {
            this.ui.updateConnectionStatus(data.status);
        });

        this.ws.on('update', (data) => {
            if (data.services) {
                this.ui.updateServices(data.services, this.currentFilter);
            }
            if (data.resources) {
                this.ui.updateResources(data.resources);
            }
        });

        this.ws.on('alert', (data) => {
            this.handleAlert(data);
        });

        this.ws.on('log', (data) => {
            this.handleLogStream(data);
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load services
            await this.refreshServices();

            // Load Kaspa info
            await this.loadKaspaInfo();

            // Load system resources
            await this.loadSystemResources();

            // Load updates
            await this.loadUpdates();

            // Load wallet info
            await this.loadWalletInfo();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.ui.showNotification('Failed to load dashboard data', 'error');
        }
    }

    /**
     * Refresh services
     */
    async refreshServices() {
        try {
            const services = await this.api.getServiceStatus();
            this.ui.updateServices(services, this.currentFilter);
        } catch (error) {
            console.error('Failed to refresh services:', error);
        }
    }

    /**
     * Load Kaspa info
     */
    async loadKaspaInfo() {
        try {
            const [info, stats] = await Promise.all([
                this.api.getKaspaInfo(),
                this.api.getKaspaStats()
            ]);

            if (!info.error) {
                this.ui.updateNodeStatus(info);
            }

            if (!stats.error) {
                this.ui.updateKaspaStats(stats);
            }
        } catch (error) {
            console.error('Failed to load Kaspa info:', error);
        }
    }

    /**
     * Load system resources
     */
    async loadSystemResources() {
        try {
            const resources = await this.api.getSystemResources();
            this.ui.updateResources(resources);
        } catch (error) {
            console.error('Failed to load system resources:', error);
        }
    }

    /**
     * Load updates
     */
    async loadUpdates() {
        try {
            const result = await this.api.getAvailableUpdates();
            const updates = result.updates || [];
            
            const badge = document.getElementById('update-badge');
            if (badge) {
                if (updates.length > 0) {
                    badge.textContent = updates.length;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to load updates:', error);
        }
    }

    /**
     * Load wallet info
     */
    async loadWalletInfo() {
        try {
            const wallet = await this.api.getWalletInfo();
            if (wallet.available) {
                // Show wallet section
                const walletSection = document.getElementById('wallet-section');
                if (walletSection) {
                    walletSection.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to load wallet info:', error);
        }
    }

    /**
     * Handle service action
     */
    async handleServiceAction(action, serviceName) {
        try {
            let result;
            switch (action) {
                case 'start':
                    result = await this.api.startService(serviceName);
                    break;
                case 'stop':
                    if (!confirm(`Stop ${serviceName}?`)) return;
                    result = await this.api.stopService(serviceName);
                    break;
                case 'restart':
                    if (!confirm(`Restart ${serviceName}?`)) return;
                    result = await this.api.restartService(serviceName);
                    break;
                case 'logs':
                    await this.showServiceLogs(serviceName);
                    return;
            }

            if (result && result.success) {
                this.ui.showNotification(result.message, 'success');
                await this.refreshServices();
            }
        } catch (error) {
            console.error(`Service action failed: ${action} ${serviceName}`, error);
            this.ui.showNotification(`Failed to ${action} service`, 'error');
        }
    }

    /**
     * Show service logs
     */
    async showServiceLogs(serviceName) {
        try {
            const result = await this.api.getServiceLogs(serviceName);
            const logsContent = document.getElementById('logs-content');
            const logsTitle = document.getElementById('logs-title');
            
            if (logsTitle) {
                logsTitle.textContent = `${serviceName} Logs`;
            }
            
            if (logsContent) {
                logsContent.textContent = result.logs || 'No logs available';
            }
            
            this.ui.showModal('logs-modal');
        } catch (error) {
            console.error('Failed to load logs:', error);
            this.ui.showNotification('Failed to load logs', 'error');
        }
    }

    /**
     * Handle alert
     */
    handleAlert(alert) {
        this.ui.showNotification(alert.message, alert.severity);
    }

    /**
     * Handle log stream
     */
    handleLogStream(data) {
        const logsContent = document.getElementById('logs-content');
        if (logsContent && data.serviceName) {
            logsContent.textContent += '\n' + data.data;
            logsContent.scrollTop = logsContent.scrollHeight;
        }
    }

    /**
     * Open updates modal
     */
    async openUpdatesModal() {
        this.ui.showModal('updates-modal');
        await this.loadUpdates();
    }

    /**
     * Open config modal
     */
    async openConfigModal() {
        this.ui.showModal('config-modal');
        // Load config
    }

    /**
     * Close modals
     */
    closeUpdatesModal() {
        this.ui.closeModal('updates-modal');
    }

    closeConfigModal() {
        this.ui.closeModal('config-modal');
    }

    /**
     * Toggle service view
     */
    toggleServiceView() {
        const grid = document.getElementById('services-grid');
        if (grid) {
            grid.classList.toggle('list-view');
        }
    }

    /**
     * Quick actions
     */
    async restartAllServices() {
        if (!confirm('Restart all services? This may cause temporary downtime.')) {
            return;
        }
        this.ui.showNotification('Restarting all services...', 'info');
        // Implement restart all
    }

    async updateServices() {
        this.ui.showNotification('Checking for updates...', 'info');
        await this.loadUpdates();
        this.openUpdatesModal();
    }

    async backupData() {
        this.ui.showNotification('Creating backup...', 'info');
        // Implement backup
    }

    /**
     * Emergency stop
     */
    async emergencyStop() {
        if (!confirm('EMERGENCY STOP: This will stop all services immediately. Continue?')) {
            return;
        }
        this.ui.showNotification('Executing emergency stop...', 'error');
        // Implement emergency stop
    }

    /**
     * Resource monitoring
     */
    async toggleResourceMonitoring() {
        // Implement monitoring toggle
    }

    async quickResourceCheck() {
        this.ui.showNotification('Running quick resource check...', 'info');
        await this.loadSystemResources();
    }

    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        // Update every 30 seconds when not using WebSocket
        this.updateInterval = setInterval(async () => {
            if (this.ws.getStatus() !== 'connected') {
                await this.loadInitialData();
            }
        }, 30000);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.ws.disconnect();
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dashboard = new Dashboard();
        window.dashboard.init();
    });
} else {
    window.dashboard = new Dashboard();
    window.dashboard.init();
}

// Export for external access
export default Dashboard;
