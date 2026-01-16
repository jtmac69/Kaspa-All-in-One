/**
 * Main Dashboard Controller
 * Coordinates all dashboard modules and handles application logic
 */

import { APIClient } from './modules/api-client.js';
import { WebSocketManager } from './modules/websocket-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { WizardNavigation } from './modules/wizard-navigation.js';
import IconManager from './modules/icon-manager.js';

class Dashboard {
    constructor() {
        this.api = new APIClient();
        this.ws = new WebSocketManager();
        this.ui = new UIManager();
        this.wizardNav = new WizardNavigation();
        this.iconManager = IconManager;
        
        this.currentFilter = 'all';
        this.updateInterval = null;
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        console.log('Initializing Kaspa Dashboard...');

        // Initialize icon system first
        this.iconManager.init();

        // Initialize UI
        this.ui.init();

        // Initialize wizard navigation
        this.wizardNav.init();

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
            refreshBtn.addEventListener('click', () => this.manualRefresh());
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

        // Resource monitoring controls
        const monitoringBtn = document.getElementById('monitoring-status');
        if (monitoringBtn) {
            monitoringBtn.addEventListener('click', () => this.toggleResourceMonitoring());
        }

        const quickCheckBtn = document.getElementById('quick-check-btn');
        if (quickCheckBtn) {
            quickCheckBtn.addEventListener('click', () => this.quickResourceCheck());
        }

        const dockerLimitsBtn = document.getElementById('docker-limits-btn');
        if (dockerLimitsBtn) {
            dockerLimitsBtn.addEventListener('click', () => this.showDockerLimits());
        }

        const containerCountEl = document.getElementById('container-count');
        if (containerCountEl) {
            this.updateContainerCount();
        }
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

        // Handle configuration changes from state file watching
        this.ws.on('configuration_changed', (data) => {
            console.log('Configuration changed:', data);
            
            // Show enhanced notification about the change with refresh option
            const message = data.error 
                ? `Configuration changed but refresh failed: ${data.error}`
                : data.message || 'Configuration updated';
            
            if (data.error) {
                this.ui.showConfigurationChangeNotification(message, true);
            } else {
                this.ui.showConfigurationChangeNotification(message, false);
            }
            
            // Update services display
            if (data.hasInstallation) {
                this.ui.updateServices(data.services || [], this.currentFilter);
                // Reload profiles to get updated counts
                this.loadProfiles();
            } else {
                this.ui.showNoInstallation();
            }
            
            // Update installation state info if available
            if (data.installationState) {
                this.updateInstallationInfo(data.installationState);
            }
        });

        // Handle dashboard refresh requests
        this.ws.on('dashboard_refresh_needed', (data) => {
            console.log('Dashboard refresh needed:', data);
            
            // Show notification with refresh button
            this.ui.showConfigurationChangeNotification('Configuration changed - click to refresh dashboard', false);
            
            // Auto-refresh after a short delay to allow file operations to complete
            setTimeout(() => {
                this.refreshServices();
                this.ui.showAutoRefreshNotification();
            }, 2000);
        });

        // Handle manual refresh completion
        this.ws.on('manual_refresh_completed', (data) => {
            console.log('Manual refresh completed:', data);
            
            // Show success notification
            this.ui.showNotification('Dashboard refreshed successfully', 'success');
            
            // Update services display
            if (data.hasInstallation) {
                this.ui.updateServices(data.services || [], this.currentFilter);
                // Reload profiles to get updated counts
                this.loadProfiles();
            } else {
                this.ui.showNoInstallation();
            }
            
            // Update installation state info if available
            if (data.installationState) {
                this.updateInstallationInfo(data.installationState);
            }
        });

        // Handle state watch errors
        this.ws.on('state_watch_error', (data) => {
            console.error('State watch error:', data);
            this.ui.showNotification('Error monitoring configuration changes', 'error');
        });

        // Handle Kaspa node connection events
        this.ws.on('kaspa_node_unavailable', (data) => {
            console.log('Kaspa node unavailable:', data);
            this.ui.showNotification('Kaspa node unavailable - retrying connection...', 'warning');
            
            // Update node status to show unavailable
            this.ui.updateNodeStatus({ error: 'Node unavailable' }, { 
                connected: false, 
                error: data.error,
                status: 'disconnected'
            });
        });

        this.ws.on('kaspa_node_reconnected', (data) => {
            console.log('Kaspa node reconnected:', data);
            this.ui.showNotification(`Kaspa node reconnected on port ${data.port}`, 'success');
            
            // Refresh Kaspa info to show updated status
            setTimeout(() => {
                this.loadKaspaInfo();
            }, 2000); // Wait 2 seconds for connection to stabilize
        });

        this.ws.on('kaspa_node_restored', (data) => {
            console.log('Kaspa node connection restored:', data);
            this.ui.showNotification('Kaspa node connection restored', 'success');
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
            // Load installation state first to check wizard running status
            await this.loadInstallationState();

            // Load services
            await this.refreshServices();

            // Load profiles for filter dropdown
            await this.loadProfiles();

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
     * Load installation state
     */
    async loadInstallationState() {
        try {
            const response = await this.api.getInstallationState();
            if (response.exists && response.state) {
                this.updateInstallationInfo(response.state);
            }
        } catch (error) {
            console.warn('Failed to load installation state:', error);
        }
    }

    /**
     * Load profiles for filter dropdown
     */
    async loadProfiles() {
        try {
            const profiles = await this.api.getProfiles();
            this.ui.updateProfileFilter(profiles);
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    }

    /**
     * Refresh services
     */
    async refreshServices() {
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
            
            // IMPORTANT: After services are rendered, immediately update Kaspa node sync status
            // This prevents flickering between Docker status and actual sync status
            try {
                const syncStatus = await this.api.getKaspaSyncStatus();
                if (syncStatus) {
                    this.ui.updateKaspaServiceCardSync(syncStatus);
                }
            } catch (syncError) {
                // Sync status update failed, but don't break the service refresh
                console.warn('Failed to update Kaspa sync status:', syncError);
            }
        } catch (error) {
            console.error('Failed to refresh services:', error);
            // Still update timestamp even on error to show when last attempt was made
            const timestamp = new Date().toISOString();
            this.ui.updateLastStatusCheck(timestamp);
        }
    }

    /**
     * Manual refresh - calls the backend refresh endpoint
     */
    async manualRefresh() {
        try {
            this.ui.showNotification('Refreshing dashboard...', 'info');
            
            const response = await this.api.post('/api/installation/refresh');
            
            if (response.success) {
                // The WebSocket will handle the actual UI update via manual_refresh_completed event
                console.log('Manual refresh initiated successfully');
            } else {
                this.ui.showNotification('Failed to refresh dashboard', 'error');
            }
        } catch (error) {
            console.error('Failed to manually refresh:', error);
            this.ui.showNotification('Failed to refresh dashboard', 'error');
        }
    }

    /**
     * Update installation info display
     */
    updateInstallationInfo(installationState) {
        // Update any installation-specific UI elements
        if (installationState.wizardRunning) {
            this.ui.showNotification('Configuration in progress - some operations may be disabled', 'warning');
        }
        
        // Update wizard running indicator
        this.wizardNav.updateWizardRunningIndicator(installationState.wizardRunning || false);
        
        // Update profile filter when profiles change
        if (installationState.profiles && installationState.profiles.selected) {
            this.loadProfiles(); // Reload profiles to get updated counts
        }
        
        // Update last modified timestamp if there's a display element for it
        const lastModified = document.getElementById('last-modified');
        if (lastModified && installationState.lastModified) {
            const date = new Date(installationState.lastModified);
            lastModified.textContent = `Last updated: ${date.toLocaleString()}`;
        }
    }

    /**
     * Load Kaspa info
     */
    async loadKaspaInfo() {
        try {
            // Load enhanced network data with all stats
            const enhancedNetworkData = await this.api.getEnhancedNetworkStats();
            if (!enhancedNetworkData.error) {
                this.ui.updateEnhancedNetworkStats(enhancedNetworkData);
            } else {
                // Fallback to basic network data
                const publicNetworkData = await this.api.getPublicKaspaNetwork();
                this.ui.updateKaspaNetworkStats(publicNetworkData);
            }

            // Load enhanced node status
            const enhancedNodeStatus = await this.api.getEnhancedNodeStatus();
            if (!enhancedNodeStatus.error) {
                this.ui.updateLocalNodeStatus(enhancedNodeStatus);
            }

            // Load log-based sync status (more reliable than RPC)
            const syncStatus = await this.api.getKaspaSyncStatus();
            this.ui.updateNodeSyncStatus(syncStatus);
            
            // Update Services Status card
            this.ui.updateKaspaServiceCardSync(syncStatus);

            // Try to load additional node data if RPC is available
            const [info, stats, connectionStatus] = await Promise.all([
                this.api.getKaspaNodeInfo(),
                this.api.getKaspaNodeStats(),
                this.api.getKaspaConnectionStatus()
            ]);

            if (!info.error) {
                // Merge RPC data with log-based sync status
                const mergedStatus = { ...syncStatus, ...info };
                this.ui.updateNodeStatus(mergedStatus, connectionStatus);
            } else {
                // Use only log-based sync status
                this.ui.updateNodeStatus(syncStatus, connectionStatus);
            }

            if (!stats.error) {
                this.ui.updateLocalKaspaStats(stats);
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
        const toggleBtn = document.getElementById('toggle-view');
        
        if (grid) {
            grid.classList.toggle('list-view');
            
            // Update button text to reflect current view
            if (toggleBtn) {
                const isListView = grid.classList.contains('list-view');
                toggleBtn.textContent = isListView ? '📊 Grid View' : '📋 List View';
                toggleBtn.title = isListView ? 'Switch to grid view' : 'Switch to list view';
            }
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
     * Test Kaspa connection
     */
    async testKaspaConnection() {
        try {
            this.ui.showNotification('Testing Kaspa node connection...', 'info');
            
            const result = await this.api.testKaspaConnection();
            
            if (result.success) {
                this.ui.showNotification('Connection test successful!', 'success');
                // Refresh Kaspa info to show updated connection status
                await this.loadKaspaInfo();
            } else {
                this.ui.showNotification(`Connection test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.ui.showNotification('Connection test failed', 'error');
        }
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

        // Start service status refresh every 10 seconds (Requirements 7.7)
        this.startServiceStatusRefresh();
        
        // Start Kaspa info refresh every 15 seconds
        this.startKaspaInfoRefresh();
        
        // FIX 3: Start independent network data refresh every 30 seconds
        this.startNetworkDataRefresh();
    }

    /**
     * FIX 3: Start independent network data refresh
     * Updates public network stats independently of local node status
     */
    startNetworkDataRefresh() {
        this.networkDataInterval = setInterval(async () => {
            await this.loadPublicNetworkData();
        }, 30000); // 30 seconds for public network data
    }

    /**
     * FIX 3: Load public network data independently
     */
    async loadPublicNetworkData() {
        try {
            // Try enhanced endpoint first
            const enhancedNetworkData = await this.api.getEnhancedNetworkStats();
            if (!enhancedNetworkData.error) {
                this.ui.updateEnhancedNetworkStats(enhancedNetworkData);
            } else {
                // Fallback to basic network data
                const publicNetworkData = await this.api.getPublicKaspaNetwork();
                this.ui.updateKaspaNetworkStats(publicNetworkData);
            }
        } catch (error) {
            console.error('Failed to load public network data:', error);
        }
    }

    /**
     * Start service status refresh every 10 seconds
     * Requirements 7.7: THE Dashboard SHALL refresh service status every 10 seconds
     */
    startServiceStatusRefresh() {
        this.serviceStatusInterval = setInterval(async () => {
            await this.refreshServiceStatus();
        }, 10000); // 10 seconds as per requirements 7.7
    }

    /**
     * Start Kaspa info refresh every 15 seconds
     * Keeps network status and node sync status updated
     */
    startKaspaInfoRefresh() {
        this.kaspaInfoInterval = setInterval(async () => {
            await this.loadKaspaInfo();
        }, 15000); // 15 seconds for Kaspa info
    }

    /**
     * Refresh service status and update timestamp
     * Requirements 7.7, 7.8: Refresh every 10 seconds and display timestamp
     */
    async refreshServiceStatus() {
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
            
            // IMPORTANT: After services are rendered, immediately update Kaspa node sync status
            // This prevents flickering between Docker status and actual sync status
            try {
                const syncStatus = await this.api.getKaspaSyncStatus();
                if (syncStatus) {
                    this.ui.updateKaspaServiceCardSync(syncStatus);
                }
            } catch (syncError) {
                // Sync status update failed, but don't break the service refresh
                console.warn('Failed to update Kaspa sync status:', syncError);
            }
        } catch (error) {
            console.error('Failed to refresh service status:', error);
            // Still update timestamp even on error to show when last attempt was made
            const timestamp = new Date().toISOString();
            this.ui.updateLastStatusCheck(timestamp);
        }
    }

    /**
     * Toggle resource monitoring on/off
     */
    async toggleResourceMonitoring() {
        const monitoringBtn = document.getElementById('monitoring-status');
        if (!monitoringBtn) return;

        const isCurrentlyOff = monitoringBtn.textContent.includes('Off');
        
        try {
            if (isCurrentlyOff) {
                // Turn monitoring ON
                this.ui.showNotification('Starting resource monitoring...', 'info');
                const result = await this.api.post('/api/wizard/monitoring/start');
                
                if (result.success) {
                    monitoringBtn.textContent = '🟢 Monitoring: On';
                    monitoringBtn.classList.add('monitoring-active');
                    this.ui.showNotification('Resource monitoring started', 'success');
                    
                    // Show historical data sections
                    this.showResourceHistorySections(true);
                    
                    // Update icon
                    this.iconManager.updateMonitoringStatus(true);
                } else {
                    throw new Error(result.message || 'Failed to start monitoring');
                }
            } else {
                // Turn monitoring OFF
                this.ui.showNotification('Stopping resource monitoring...', 'info');
                monitoringBtn.textContent = '🔴 Monitoring: Off';
                monitoringBtn.classList.remove('monitoring-active');
                this.ui.showNotification('Resource monitoring stopped', 'success');
                
                // Hide historical data sections
                this.showResourceHistorySections(false);
                
                // Update icon
                this.iconManager.updateMonitoringStatus(false);
            }
        } catch (error) {
            console.error('Failed to toggle resource monitoring:', error);
            this.ui.showNotification('Failed to toggle monitoring: ' + error.message, 'error');
        }
    }

    /**
     * Show or hide resource history sections
     */
    showResourceHistorySections(show) {
        const serviceResources = document.getElementById('service-resources');
        const resourceTrends = document.getElementById('resource-trends');
        
        if (serviceResources) {
            serviceResources.style.display = show ? 'block' : 'none';
        }
        
        if (resourceTrends) {
            resourceTrends.style.display = show ? 'block' : 'none';
        }
        
        if (show) {
            // Load historical data when showing
            this.loadResourceHistory();
        }
    }

    /**
     * Load resource history and trends
     */
    async loadResourceHistory() {
        try {
            // This would load historical data from the backend
            // For now, just show a placeholder message
            this.ui.showNotification('Historical data collection starting...', 'info');
            
            // TODO: Implement actual historical data loading
            // - Fetch per-service resource usage
            // - Fetch resource trends for charts
            // - Render charts using Chart.js or similar
        } catch (error) {
            console.error('Failed to load resource history:', error);
        }
    }

    /**
     * Show Docker container resource limits
     */
    async showDockerLimits() {
        try {
            this.ui.showNotification('Loading Docker container limits...', 'info');
            
            // Fetch Docker limits from the backend
            const response = await this.api.request('/api/system/docker-limits');
            
            if (response.error) {
                throw new Error(response.error);
            }

            // Create modal content
            const limitsHtml = this.createDockerLimitsModal(response.limits || []);
            
            // Show in a modal
            this.ui.showDockerLimitsModal(limitsHtml);
            
        } catch (error) {
            console.error('Failed to load Docker limits:', error);
            this.ui.showNotification('Failed to load Docker limits: ' + error.message, 'error');
        }
    }

    /**
     * Create Docker limits modal HTML
     */
    createDockerLimitsModal(limits) {
        if (!limits || limits.length === 0) {
            return '<p>No Docker containers found or limits not configured.</p>';
        }

        let html = '<div class="docker-limits-table"><table><thead><tr>';
        html += '<th>Container</th><th>Memory Limit</th><th>CPU Limit</th>';
        html += '</tr></thead><tbody>';

        limits.forEach(limit => {
            html += '<tr>';
            html += `<td>${limit.name}</td>`;
            html += `<td>${limit.memoryLimit || 'Unlimited'}</td>`;
            html += `<td>${limit.cpuLimit || 'Unlimited'}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    /**
     * Update container count
     */
    async updateContainerCount() {
        try {
            const response = await this.api.request('/api/system/container-count');
            const count = response.count || 0;
            
            const containerCountEl = document.getElementById('container-count');
            if (containerCountEl) {
                containerCountEl.textContent = count;
            }
        } catch (error) {
            console.warn('Failed to get container count:', error);
            const containerCountEl = document.getElementById('container-count');
            if (containerCountEl) {
                containerCountEl.textContent = '-';
            }
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.serviceStatusInterval) {
            clearInterval(this.serviceStatusInterval);
        }
        if (this.kaspaInfoInterval) {
            clearInterval(this.kaspaInfoInterval);
        }
        if (this.networkDataInterval) {
            clearInterval(this.networkDataInterval);
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
