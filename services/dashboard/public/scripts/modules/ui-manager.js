/**
 * UI Manager Module
 * Handles all UI updates and DOM manipulation
 */

export class UIManager {
    constructor() {
        this.elements = {};
        this.modals = {};
    }

    /**
     * Initialize UI elements
     */
    init() {
        // Cache commonly used elements
        this.elements = {
            connectionStatus: document.getElementById('connection-status'),
            servicesGrid: document.getElementById('services-grid'),
            applicationsGrid: document.getElementById('applications-grid'),
            resourceOverview: document.getElementById('resource-overview'),
            profileFilter: document.getElementById('profile-filter'),
            updateBadge: document.getElementById('update-badge'),
            
            // Kaspa stats
            blockHeight: document.getElementById('block-height'),
            hashRate: document.getElementById('hash-rate'),
            difficulty: document.getElementById('difficulty'),
            peerCount: document.getElementById('peer-count'),
            
            // Node status
            syncStatus: document.getElementById('sync-status'),
            syncProgress: document.getElementById('sync-progress'),
            syncPercentage: document.getElementById('sync-percentage'),
            syncEta: document.getElementById('sync-eta'),
            syncNotification: document.getElementById('sync-notification'),
            currentHeight: document.getElementById('current-height'),
            networkHeight: document.getElementById('network-height'),
            peerCountNode: document.getElementById('peer-count-node'),
            nodeVersion: document.getElementById('node-version'),
            uptime: document.getElementById('uptime'),
            
            // Resources
            cpuProgress: document.getElementById('cpu-progress'),
            cpuText: document.getElementById('cpu-text'),
            memoryProgress: document.getElementById('memory-progress'),
            memoryText: document.getElementById('memory-text'),
            diskProgress: document.getElementById('disk-progress'),
            diskText: document.getElementById('disk-text'),
            loadAverage: document.getElementById('load-average'),
            systemUptime: document.getElementById('system-uptime'),
            
            // Modals
            logsModal: document.getElementById('logs-modal'),
            configModal: document.getElementById('config-modal'),
            updatesModal: document.getElementById('updates-modal')
        };

        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Profile filter
        if (this.elements.profileFilter) {
            this.elements.profileFilter.addEventListener('change', (e) => {
                this.emit('profile-filter-changed', e.target.value);
            });
        }

        // Close modals on background click
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('modal')) {
                element.addEventListener('click', (e) => {
                    if (e.target === element) {
                        this.closeModal(element);
                    }
                });
            }
        });
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(status) {
        const statusEl = this.elements.connectionStatus;
        if (!statusEl) return;

        const dot = statusEl.querySelector('.dot');
        const text = statusEl.querySelector('.text');

        statusEl.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                statusEl.classList.add('connected');
                if (text) text.textContent = 'Connected';
                break;
            case 'disconnected':
                statusEl.classList.add('disconnected');
                if (text) text.textContent = 'Disconnected';
                break;
            case 'error':
                statusEl.classList.add('error');
                if (text) text.textContent = 'Connection Error';
                break;
            default:
                if (text) text.textContent = 'Connecting...';
        }
    }

    /**
     * Update services grid
     */
    updateServices(services, filter = 'all') {
        const grid = this.elements.servicesGrid;
        if (!grid) return;

        const filteredServices = filter === 'all' 
            ? services 
            : services.filter(s => s.profile === filter);

        grid.innerHTML = filteredServices.map(service => this.createServiceCard(service)).join('');
    }

    /**
     * Create service card HTML
     */
    createServiceCard(service) {
        const statusClass = service.status === 'healthy' ? 'healthy' : 
                          service.status === 'unhealthy' ? 'unhealthy' : 'stopped';
        
        return `
            <article class="service-card ${statusClass}" role="region" aria-label="${service.displayName} service">
                <div class="service-header">
                    <h3>${service.displayName}</h3>
                    <span class="status-badge ${statusClass}">${service.status}</span>
                </div>
                <div class="service-info">
                    <div class="info-row">
                        <span class="label">Profile:</span>
                        <span class="value">${service.profile}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Type:</span>
                        <span class="value">${service.type}</span>
                    </div>
                    ${service.version ? `
                    <div class="info-row">
                        <span class="label">Version:</span>
                        <span class="value">${service.version}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="service-actions">
                    <button class="btn-small" data-action="start" data-service="${service.name}" 
                            ${service.status === 'healthy' ? 'disabled' : ''}>
                        ▶️ Start
                    </button>
                    <button class="btn-small" data-action="stop" data-service="${service.name}"
                            ${service.status === 'stopped' ? 'disabled' : ''}>
                        ⏹️ Stop
                    </button>
                    <button class="btn-small" data-action="restart" data-service="${service.name}"
                            ${service.status === 'stopped' ? 'disabled' : ''}>
                        🔄 Restart
                    </button>
                    <button class="btn-small" data-action="logs" data-service="${service.name}">
                        📋 Logs
                    </button>
                </div>
                ${service.error ? `
                <div class="service-error" role="alert">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${service.error}</span>
                </div>
                ` : ''}
            </article>
        `;
    }

    /**
     * Update Kaspa node stats
     */
    updateKaspaStats(stats) {
        if (!stats || stats.error) return;

        this.updateElement('blockHeight', stats.blockHeight || '-');
        this.updateElement('hashRate', this.formatHashRate(stats.hashRate));
        this.updateElement('difficulty', this.formatNumber(stats.difficulty));
        this.updateElement('peerCount', stats.peerCount || '-');
    }

    /**
     * Update node status
     */
    updateNodeStatus(status) {
        if (!status || status.error) {
            this.updateElement('syncStatus', 'Unavailable');
            return;
        }

        const isSynced = status.isSynced;
        this.updateElement('syncStatus', isSynced ? 'Synced ✓' : 'Syncing...');
        
        if (!isSynced && status.progress !== undefined) {
            this.showSyncProgress(status.progress, status.estimatedTimeRemaining);
        } else {
            this.hideSyncProgress();
        }

        this.updateElement('currentHeight', status.currentHeight || '-');
        this.updateElement('networkHeight', status.networkHeight || '-');
        this.updateElement('peerCountNode', status.peerCount || '-');
        this.updateElement('nodeVersion', status.version || '-');
        this.updateElement('uptime', this.formatUptime(status.uptime));
    }

    /**
     * Show sync progress
     */
    showSyncProgress(progress, eta) {
        const container = document.getElementById('sync-progress-container');
        const progressBar = this.elements.syncProgress;
        const percentage = this.elements.syncPercentage;
        const etaEl = this.elements.syncEta;
        const notification = this.elements.syncNotification;

        if (container) container.style.display = 'block';
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentage) percentage.textContent = `${progress.toFixed(1)}%`;
        if (etaEl && eta) etaEl.textContent = `ETA: ${this.formatDuration(eta)}`;
        if (notification) notification.style.display = 'block';
    }

    /**
     * Hide sync progress
     */
    hideSyncProgress() {
        const container = document.getElementById('sync-progress-container');
        const notification = this.elements.syncNotification;

        if (container) container.style.display = 'none';
        if (notification) notification.style.display = 'none';
    }

    /**
     * Update system resources
     */
    updateResources(resources) {
        if (!resources) return;

        // CPU
        if (resources.cpu !== undefined) {
            this.updateResourceBar('cpu', resources.cpu);
            this.updateElement('cpuText', `${resources.cpu.toFixed(1)}%`);
        }
        if (resources.loadAverage && Array.isArray(resources.loadAverage)) {
            this.updateElement('loadAverage', `Load: ${resources.loadAverage[0].toFixed(2)}`);
        }

        // Memory
        if (resources.memory !== undefined) {
            this.updateResourceBar('memory', resources.memory);
            this.updateElement('memoryText', `${resources.memory.toFixed(1)}%`);
        }

        // Disk
        if (resources.disk !== undefined) {
            this.updateResourceBar('disk', resources.disk);
            this.updateElement('diskText', `${resources.disk.toFixed(1)}%`);
        }

        // System uptime
        if (resources.uptime !== undefined) {
            this.updateElement('systemUptime', this.formatUptime(resources.uptime));
        }

        // Show emergency stop if critical
        this.updateEmergencyControls(resources);
    }

    /**
     * Update resource progress bar
     */
    updateResourceBar(type, value) {
        const progressBar = this.elements[`${type}Progress`];
        if (!progressBar) return;

        progressBar.style.width = `${value}%`;
        
        // Update color based on threshold
        progressBar.className = 'progress';
        if (value >= 90) {
            progressBar.classList.add('critical');
        } else if (value >= 80) {
            progressBar.classList.add('warning');
        }
    }

    /**
     * Update emergency controls
     */
    updateEmergencyControls(resources) {
        const emergencyBtn = document.getElementById('emergency-stop');
        const systemStatus = document.getElementById('system-status');

        const isCritical = resources.cpu >= 90 || resources.memory >= 90;

        if (emergencyBtn) {
            emergencyBtn.style.display = isCritical ? 'block' : 'none';
        }

        if (systemStatus) {
            const statusText = systemStatus.querySelector('.status-text');
            if (statusText) {
                if (isCritical) {
                    statusText.textContent = 'System Status: CRITICAL';
                    systemStatus.classList.add('critical');
                } else if (resources.cpu >= 80 || resources.memory >= 85) {
                    statusText.textContent = 'System Status: Warning';
                    systemStatus.classList.add('warning');
                } else {
                    statusText.textContent = 'System Status: Normal';
                    systemStatus.classList.remove('critical', 'warning');
                }
            }
        }
    }

    /**
     * Update element text content
     */
    updateElement(id, value) {
        const element = this.elements[id] || document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Close modal
     */
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Format helpers
     */
    formatHashRate(hashRate) {
        if (!hashRate) return '-';
        if (hashRate > 1e12) return `${(hashRate / 1e12).toFixed(2)} TH/s`;
        if (hashRate > 1e9) return `${(hashRate / 1e9).toFixed(2)} GH/s`;
        if (hashRate > 1e6) return `${(hashRate / 1e6).toFixed(2)} MH/s`;
        return `${hashRate.toFixed(2)} H/s`;
    }

    formatNumber(num) {
        if (!num) return '-';
        return num.toLocaleString();
    }

    formatUptime(seconds) {
        if (!seconds) return '-';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatDuration(seconds) {
        if (!seconds) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    /**
     * Event emitter
     */
    emit(event, data) {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}
