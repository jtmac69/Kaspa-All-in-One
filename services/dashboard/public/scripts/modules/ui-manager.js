/**
 * UI Manager Module
 * Handles all UI updates and DOM manipulation
 */

import IconManager from './icon-manager.js';

/**
 * Sync Phase Definitions with colors and icons
 */
const SYNC_PHASES = {
    starting: { name: 'Starting', icon: '🔄', color: '#888888', order: -1 },
    connecting: { name: 'Connecting', icon: '🌐', color: '#3498db', order: -1 },
    proof: { name: 'Proof', icon: '🔐', color: '#9b59b6', order: 0 },
    headers: { name: 'Headers', icon: '📋', color: '#f39c12', order: 1 },
    utxo: { name: 'UTXO', icon: '💰', color: '#e74c3c', order: 2 },
    blocks: { name: 'Blocks', icon: '📦', color: '#1abc9c', order: 3 },
    virtual: { name: 'Virtual', icon: '🔗', color: '#2ecc71', order: 4 },
    synced: { name: 'Synced', icon: '✅', color: '#27ae60', order: 5 },
    unknown: { name: 'Unknown', icon: '❓', color: '#95a5a6', order: -1 }
};

/**
 * Pipeline phases (visible in the pipeline UI)
 */
const PIPELINE_PHASES = ['proof', 'headers', 'utxo', 'blocks', 'virtual', 'synced'];

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
            lastStatusTimestamp: document.getElementById('last-status-timestamp'),
            
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
        
        // Initialize blocks/hour chart
        this.initBlocksPerHourChart();
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
     * Update service filter dropdown with flexible filtering options
     */
    updateProfileFilter(filterOptions) {
        const profileFilter = this.elements.profileFilter;
        if (!profileFilter) return;

        // Store current selection
        const currentValue = profileFilter.value;

        // Clear existing options
        profileFilter.innerHTML = '';
        
        // Add filter options with counts
        filterOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = `${option.name} (${option.count})`;
            profileFilter.appendChild(optionElement);
        });

        // Restore selection if it still exists, otherwise default to "all"
        const optionExists = Array.from(profileFilter.options).some(option => option.value === currentValue);
        profileFilter.value = optionExists ? currentValue : 'all';
    }

    /**
     * Update services grid with optional grouping
     */
    updateServices(services, filter = 'all', groupBy = null) {
        const grid = this.elements.servicesGrid;
        if (!grid) return;

        let filteredServices = services;
        
        if (filter !== 'all') {
            if (filter.startsWith('type:')) {
                // Filter by service type
                const type = filter.substring(5);
                filteredServices = services.filter(s => (s.type || this.getServiceType(s.name)) === type);
            } else if (filter.startsWith('profile:')) {
                // Filter by profile
                const profile = filter.substring(8);
                filteredServices = services.filter(s => (s.profile || this.getServiceProfile(s.name)) === profile);
            } else {
                // Legacy profile filtering (for backward compatibility)
                filteredServices = services.filter(s => (s.profile || this.getServiceProfile(s.name)) === filter);
            }
        }

        // Determine grouping based on filter or explicit groupBy parameter
        let effectiveGroupBy = groupBy;
        if (!effectiveGroupBy && filter !== 'all') {
            // Auto-detect grouping from filter
            if (filter.startsWith('type:')) {
                effectiveGroupBy = null; // No grouping when filtering by type
            } else if (filter.startsWith('profile:')) {
                effectiveGroupBy = 'type'; // Group by type when filtering by profile
            }
        }

        // Render services with or without grouping
        if (effectiveGroupBy) {
            grid.innerHTML = this.renderGroupedServices(filteredServices, effectiveGroupBy);
        } else {
            grid.innerHTML = `<div class="services-grid">${filteredServices.map(service => this.createServiceCard(service)).join('')}</div>`;
        }
        
        // Update icons in service cards
        this.updateServiceCardIcons();
    }

    /**
     * Render services grouped by a criteria (type or profile)
     */
    renderGroupedServices(services, groupBy) {
        const groups = this.groupServices(services, groupBy);
        
        if (Object.keys(groups).length === 0) {
            return '<div class="no-services-message">No services found</div>';
        }

        let html = '';
        
        // Define group order for consistent display
        const groupOrder = groupBy === 'type' 
            ? ['Node', 'Database', 'Indexer', 'Application', 'Mining', 'Proxy', 'Management', 'Wallet', 'Other']
            : ['core', 'archive-node', 'indexer-services', 'kaspa-user-applications', 'mining', 'management'];

        // Sort groups by predefined order
        const sortedGroups = Object.keys(groups).sort((a, b) => {
            const indexA = groupOrder.indexOf(a);
            const indexB = groupOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        for (const groupName of sortedGroups) {
            const groupServices = groups[groupName];
            const groupDisplayName = this.getGroupDisplayName(groupName, groupBy);
            const groupClass = this.getGroupClass(groupName, groupBy);
            
            html += `
                <div class="service-group" data-group="${groupName}">
                    <div class="service-group-header">
                        <h3 class="service-group-title">
                            <span class="group-badge ${groupClass}">${groupDisplayName}</span>
                            <span class="group-count">(${groupServices.length})</span>
                        </h3>
                    </div>
                    <div class="services-grid">
                        ${groupServices.map(service => this.createServiceCard(service)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Group services by a criteria
     */
    groupServices(services, groupBy) {
        const groups = {};
        
        services.forEach(service => {
            let groupKey;
            
            if (groupBy === 'type') {
                groupKey = service.type || this.getServiceType(service.name);
            } else if (groupBy === 'profile') {
                groupKey = service.profile || this.getServiceProfile(service.name) || 'other';
            } else {
                groupKey = 'all';
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(service);
        });
        
        return groups;
    }

    /**
     * Get display name for a group
     */
    getGroupDisplayName(groupName, groupBy) {
        if (groupBy === 'profile') {
            const profileNames = {
                // New profile IDs
                'kaspa-node': 'Kaspa Node',
                'kasia-app': 'Kasia Application',
                'k-social-app': 'K-Social Application',
                'kaspa-explorer-bundle': 'Kaspa Explorer',
                'kasia-indexer': 'Kasia Indexer',
                'k-indexer-bundle': 'K-Indexer',
                'kaspa-archive-node': 'Archive Node',
                'kaspa-stratum': 'Kaspa Stratum',
                'management': 'Management Tools',
                
                // Legacy profile IDs
                'core': 'Core Services',
                'archive-node': 'Archive Node',
                'indexer-services': 'Indexer Services',
                'kaspa-user-applications': 'User Applications',
                'mining': 'Mining'
            };
            return profileNames[groupName] || groupName;
        }
        return groupName;
    }

    /**
     * Get CSS class for a group badge
     */
    getGroupClass(groupName, groupBy) {
        if (groupBy === 'type') {
            const typeClasses = {
                'Node': 'type-node',
                'Database': 'type-database',
                'Indexer': 'type-indexer',
                'Application': 'type-application',
                'Mining': 'type-mining',
                'Proxy': 'type-proxy',
                'Management': 'type-management',
                'Wallet': 'type-wallet'
            };
            return typeClasses[groupName] || 'type-other';
        } else if (groupBy === 'profile') {
            const profileClasses = {
                // New profile IDs
                'kaspa-node': 'profile-node',
                'kasia-app': 'profile-app',
                'k-social-app': 'profile-app',
                'kaspa-explorer-bundle': 'profile-explorer',
                'kasia-indexer': 'profile-indexer',
                'k-indexer-bundle': 'profile-indexer',
                'kaspa-archive-node': 'profile-archive',
                'kaspa-stratum': 'profile-mining',
                'management': 'profile-management',
                
                // Legacy profile IDs
                'core': 'profile-core',
                'archive-node': 'profile-archive',
                'indexer-services': 'profile-indexer',
                'kaspa-user-applications': 'profile-applications',
                'mining': 'profile-mining'
            };
            return profileClasses[groupName] || 'profile-other';
        }
        return '';
    }

    /**
     * Show no installation message
     */
    showNoInstallation() {
        const grid = this.elements.servicesGrid;
        if (!grid) return;

        grid.innerHTML = `
            <div class="no-installation-message" role="alert">
                <div class="message-icon"></div>
                <h2>No Installation Detected</h2>
                <p>No Kaspa All-in-One installation was found on this system.</p>
                <p>Please run the Installation Wizard to set up your services.</p>
                <div class="message-actions">
                    <button id="launch-wizard-btn" class="btn-primary">
                        Launch Installation Wizard
                    </button>
                </div>
            </div>
        `;
        
        // Add warning icon
        const messageIcon = grid.querySelector('.message-icon');
        if (messageIcon) {
            const icon = IconManager.createIcon('warning', { size: 'xl', color: 'warning' });
            messageIcon.appendChild(icon);
        }
        
        // Add wizard icon to button
        const launchBtn = document.getElementById('launch-wizard-btn');
        if (launchBtn) {
            const icon = IconManager.createIcon('wand', { size: 'sm' });
            launchBtn.insertBefore(icon, launchBtn.firstChild);
            launchBtn.insertBefore(document.createTextNode(' '), launchBtn.childNodes[1]);
            
            launchBtn.addEventListener('click', () => {
                // Use the wizard navigation handler
                if (window.dashboard && window.dashboard.wizardNav) {
                    window.dashboard.wizardNav.openWizard();
                }
            });
        }
    }

    /**
     * Create service card HTML
     */
    createServiceCard(service) {
        const statusClass = service.status === 'healthy' ? 'healthy' : 
                          service.status === 'unhealthy' ? 'unhealthy' : 'stopped';
        
        // Determine service type for badge
        const serviceType = service.type || this.getServiceType(service.name);
        const profile = service.profile || this.getServiceProfile(service.name);
        const typeClass = this.getServiceTypeClass(serviceType);
        const profileClass = this.getProfileClass(profile);
        
        return `
            <article class="service-card ${statusClass}" data-service="${service.name}" role="region" aria-label="${service.displayName} service">
                <div class="service-header">
                    <h3>${service.displayName}</h3>
                    <span class="status-badge ${statusClass}">${service.status}</span>
                </div>
                <div class="service-badges">
                    <span class="service-type-badge ${typeClass}" title="Service Type: ${serviceType}">${serviceType}</span>
                    ${profile ? `<span class="profile-badge ${profileClass}" title="Profile: ${profile}">${this.formatProfileName(profile)}</span>` : ''}
                </div>
                <div class="service-info">
                    ${service.version ? `
                    <div class="info-row">
                        <span class="label">Version:</span>
                        <span class="value">${service.version}</span>
                    </div>
                    ` : ''}
                    ${service.containerName ? `
                    <div class="info-row">
                        <span class="label">Container:</span>
                        <span class="value container-name">${service.containerName}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="service-actions">
                    <button class="btn-small" data-action="start" data-service="${service.name}" 
                            data-original-title="Start ${service.displayName || service.name}"
                            title="Start ${service.displayName || service.name}"
                            ${service.status === 'healthy' ? 'disabled' : ''}>
                        Start
                    </button>
                    <button class="btn-small" data-action="stop" data-service="${service.name}"
                            data-original-title="Stop ${service.displayName || service.name}"
                            title="Stop ${service.displayName || service.name}"
                            ${service.status === 'stopped' ? 'disabled' : ''}>
                        Stop
                    </button>
                    <button class="btn-small" data-action="restart" data-service="${service.name}"
                            data-original-title="Restart ${service.displayName || service.name}"
                            title="Restart ${service.displayName || service.name}"
                            ${service.status === 'stopped' ? 'disabled' : ''}>
                        Restart
                    </button>
                    <button class="btn-small" data-action="logs" data-service="${service.name}"
                            data-original-title="View logs for ${service.displayName || service.name}"
                            title="View logs for ${service.displayName || service.name}">
                        Logs
                    </button>
                </div>
                ${service.error ? `
                <div class="service-error" role="alert">
                    <span class="error-icon"></span>
                    <span class="error-text">${service.error}</span>
                </div>
                ` : ''}
            </article>
        `;
    }

    /**
     * Get CSS class for service type badge
     */
    getServiceTypeClass(serviceType) {
        const typeClasses = {
            'Node': 'type-node',
            'Database': 'type-database',
            'Indexer': 'type-indexer',
            'Application': 'type-application',
            'Mining': 'type-mining',
            'Proxy': 'type-proxy',
            'Management': 'type-management',
            'Wallet': 'type-wallet'
        };
        return typeClasses[serviceType] || 'type-other';
    }

    /**
     * Get CSS class for profile badge
     * Supports both new and legacy profile IDs
     * @param {string} profile - Profile ID
     * @returns {string} CSS class name
     */
    getProfileClass(profile) {
        const profileClasses = {
            // New profile IDs
            'kaspa-node': 'profile-node',
            'kasia-app': 'profile-app',
            'k-social-app': 'profile-app',
            'kaspa-explorer-bundle': 'profile-indexer',
            'kasia-indexer': 'profile-indexer',
            'k-indexer-bundle': 'profile-indexer',
            'kaspa-archive-node': 'profile-archive',
            'kaspa-stratum': 'profile-mining',
            
            // Legacy profile IDs
            'core': 'profile-core',
            'archive-node': 'profile-archive',
            'indexer-services': 'profile-indexer',
            'kaspa-user-applications': 'profile-applications',
            'mining': 'profile-mining',
            'management': 'profile-management'
        };
        return profileClasses[profile] || 'profile-other';
    }

    /**
     * Format profile name for display
     * Supports both new and legacy profile IDs
     * @param {string} profile - Profile ID
     * @returns {string} Formatted display name
     */
    formatProfileName(profile) {
        const profileNames = {
            // New profile IDs
            'kaspa-node': 'Node',
            'kasia-app': 'Kasia',
            'k-social-app': 'K-Social',
            'kaspa-explorer-bundle': 'Explorer',
            'kasia-indexer': 'Kasia Idx',
            'k-indexer-bundle': 'K-Indexer',
            'kaspa-archive-node': 'Archive',
            'kaspa-stratum': 'Mining',
            
            // Legacy profile IDs
            'core': 'Core',
            'archive-node': 'Archive',
            'indexer-services': 'Indexer',
            'kaspa-user-applications': 'Apps',
            'mining': 'Mining',
            'management': 'Mgmt'
        };
        return profileNames[profile] || profile;
    }

    /**
     * Get service type for display
     */
    getServiceType(serviceName) {
        const serviceToType = {
            'kaspa-node': 'Node',
            'kaspa-archive-node': 'Node',
            'dashboard': 'Management',
            'wallet': 'Wallet',
            'timescaledb': 'Database',
            'indexer-db': 'Database',
            'k-indexer': 'Indexer',
            'kasia-indexer': 'Indexer',
            'simply-kaspa-indexer': 'Indexer',
            'archive-indexer': 'Indexer',
            'kasia-app': 'Application',
            'k-social': 'Application',
            'kaspa-explorer': 'Application',
            'kaspa-nginx': 'Proxy',
            'kaspa-stratum': 'Mining',
            'portainer': 'Management',
            'pgadmin': 'Management'
        };
        return serviceToType[serviceName] || 'Other';
    }

    /**
     * Get service profile for display
     */
    getServiceProfile(serviceName) {
        const serviceToProfile = {
            'kaspa-node': 'core',
            'dashboard': 'core',
            'wallet': 'core',
            'kaspa-archive-node': 'archive-node',
            'timescaledb': 'indexer-services',
            'indexer-db': 'indexer-services',
            'k-indexer': 'indexer-services',
            'kasia-indexer': 'indexer-services',
            'simply-kaspa-indexer': 'indexer-services',
            'archive-indexer': 'indexer-services',
            'kasia-app': 'kaspa-user-applications',
            'k-social': 'kaspa-user-applications',
            'kaspa-explorer': 'kaspa-user-applications',
            'kaspa-nginx': 'kaspa-user-applications',
            'kaspa-stratum': 'mining',
            'portainer': 'management',
            'pgadmin': 'management'
        };
        return serviceToProfile[serviceName];
    }

    /**
     * Update service card icons after rendering
     */
    updateServiceCardIcons() {
        const serviceCards = document.querySelectorAll('.service-card');
        serviceCards.forEach(card => {
            IconManager.updateServiceCard(card);
        });
    }

    /**
     * Update public Kaspa network stats (independent of local node)
     */
    updateKaspaNetworkStats(networkData) {
        if (!networkData) return;

        // Update the public network section
        this.updateElement('blockHeight', networkData.blockHeight || 'Fetching...');
        // Fix: API returns 'networkHashrate' not 'networkHashRate'
        const hashrate = networkData.networkHashrate || networkData.networkHashRate;
        this.updateElement('hashRate', this.formatHashRate(hashrate) || 'Fetching...');
        this.updateElement('difficulty', this.formatNumber(networkData.difficulty) || 'Fetching...');
        
        // Show network name - fix field name
        const networkName = networkData.networkName || networkData.network || 'mainnet';
        this.updateElement('networkName', networkName);
        
        // Show data source and timestamp for transparency
        if (networkData.source && networkData.source !== 'error') {
            const sourceElement = document.getElementById('network-source');
            if (sourceElement) {
                sourceElement.textContent = `Source: ${networkData.source}`;
                sourceElement.title = `Last updated: ${networkData.timestamp}`;
            }
        }
    }

    /**
     * Update local Kaspa node stats (separate from public network)
     */
    updateLocalKaspaStats(stats) {
        if (!stats || stats.error) return;

        // These are local node specific stats
        this.updateElement('peerCount', stats.peerCount || '-');
        
        // Update any local-specific network stats if available
        if (stats.blockHeight) {
            this.updateElement('currentHeight', stats.blockHeight);
        }
    }

    /**
     * Update Kaspa node stats (legacy method - keeping for compatibility)
     */
    updateKaspaStats(stats) {
        // This method is now used for local node stats
        this.updateLocalKaspaStats(stats);
    }

    /**
     * Update node status
     */
    updateNodeStatus(status, connectionStatus = null) {
        if (!status || status.error) {
            // Show that node is starting/syncing instead of just "Unavailable"
            if (status && status.error && status.error.includes('Cannot connect')) {
                this.updateElement('syncStatus', 'Node Starting...');
                this.showSyncingState();
            } else {
                this.updateElement('syncStatus', 'Unavailable');
            }
            
            // Show connection troubleshooting if available
            if (status && status.connection && status.connection.troubleshooting) {
                this.showConnectionTroubleshooting(status.connection);
            }
            return;
        }

        const isSynced = status.isSynced;
        this.updateElement('syncStatus', isSynced ? 'Synced ✓' : 'Syncing...');
        
        // Show connection port information
        if (status.connection || connectionStatus) {
            this.updateConnectionInfo(status.connection || connectionStatus);
        }
        
        if (!isSynced && status.progress !== undefined) {
            this.showSyncProgress(status.progress, status.estimatedTimeRemaining);
        } else if (!isSynced) {
            // Show syncing state even without progress info
            this.showSyncingState();
        } else {
            this.hideSyncProgress();
        }

        this.updateElement('currentHeight', status.currentHeight || '-');
        this.updateElement('networkHeight', status.networkHeight || '-');
        this.updateElement('peerCountNode', status.peerCount || '-');
        this.updateElement('nodeVersion', status.version || status.nodeVersion || '-');
        this.updateElement('uptime', this.formatUptime(status.uptime));
    }

    /**
     * Update node sync status from log analysis - ENHANCED VERSION
     * @param {Object} syncStatus - Sync status from /api/kaspa/node/sync-status
     */
    updateNodeSyncStatus(syncStatus) {
        if (!syncStatus) return;

        const phase = syncStatus.syncPhase || 'unknown';
        const phaseConfig = SYNC_PHASES[phase] || SYNC_PHASES.unknown;
        
        // Update sync status text with phase name
        const syncStatusEl = document.getElementById('sync-status') || this.elements.syncStatus;
        if (syncStatusEl) {
            if (syncStatus.isSynced) {
                syncStatusEl.textContent = 'Synced ✓';
                syncStatusEl.style.color = '#27ae60';
                syncStatusEl.classList.remove('syncing');
                syncStatusEl.classList.add('synced');
            } else {
                syncStatusEl.textContent = syncStatus.syncPhaseName || phaseConfig.name;
                syncStatusEl.style.color = phaseConfig.color;
                syncStatusEl.classList.add('syncing');
                syncStatusEl.classList.remove('synced');
            }
        }

        // Update progress bar
        if (syncStatus.progress > 0 && syncStatus.progress < 100 && !syncStatus.isSynced) {
            this.showSyncProgress(syncStatus.progress, syncStatus.estimatedTimeRemaining);
        } else if (syncStatus.isSynced) {
            this.hideSyncProgress();
        } else {
            this.showSyncingState();
        }

        // Update sync detail/activity text
        const detailEl = document.getElementById('sync-detail') || document.getElementById('syncDetails');
        if (detailEl && syncStatus.detail) {
            detailEl.textContent = syncStatus.detail;
        }

        // Update ETA
        const etaEl = document.getElementById('sync-eta');
        if (etaEl) {
            if (syncStatus.isSynced || !syncStatus.estimatedTimeRemaining) {
                etaEl.style.display = 'none';
            } else {
                etaEl.textContent = `ETA: ${syncStatus.estimatedTimeRemaining}`;
                etaEl.style.display = 'inline';
            }
        }

        // Update sync notification/warning
        const notificationEl = document.getElementById('sync-notification') || this.elements.syncNotification;
        if (notificationEl) {
            if (syncStatus.isSynced) {
                notificationEl.style.display = 'none';
            } else {
                notificationEl.style.display = 'flex';
                const textEl = notificationEl.querySelector('.notification-text, span:last-child');
                if (textEl) {
                    textEl.textContent = 'Node is syncing with the network';
                }
            }
        }

        // Render sync pipeline
        this.renderSyncPipeline(phase);

        // Update peer count
        if (syncStatus.peersConnected > 0) {
            this.updateElement('peerCountNode', syncStatus.peersConnected);
            this.updateElement('peer-count-node', syncStatus.peersConnected);
        }

        // Update headers/blocks counts
        if (syncStatus.headersProcessed > 0) {
            this.updateElement('headersProcessed', syncStatus.headersProcessed.toLocaleString());
        }
        if (syncStatus.blocksProcessed > 0) {
            this.updateElement('blocksProcessed', syncStatus.blocksProcessed.toLocaleString());
        }

        // Update last block timestamp
        if (syncStatus.lastBlockTimestamp) {
            const blockDate = new Date(syncStatus.lastBlockTimestamp);
            if (!isNaN(blockDate.getTime())) {
                const timeAgo = this.formatTimeAgo(blockDate);
                this.updateElement('lastBlockTime', `${timeAgo} ago`);
            }
        }

        // Update health indicator
        const syncContainer = document.getElementById('sync-container');
        if (syncContainer) {
            syncContainer.classList.toggle('healthy', syncStatus.isHealthy);
            syncContainer.classList.toggle('syncing', !syncStatus.isSynced);
        }

        // ========================================================================
        // FIX 1: Update Kaspa Node service card with sync status
        // ========================================================================
        this.updateKaspaNodeServiceCard(syncStatus);

        // ========================================================================
        // FIX 2: Populate lower information fields from RPC data
        // ========================================================================
        if (syncStatus.rpc) {
            // Update NODE VERSION
            const versionEl = document.querySelector('[data-node-version]') || document.getElementById('node-version');
            if (versionEl && syncStatus.rpc.serverVersion) {
                versionEl.textContent = syncStatus.rpc.serverVersion;
            }
            
            // Update CONNECTED PEERS
            const peersEl = document.querySelector('[data-connected-peers]') || document.getElementById('peer-count-node');
            if (peersEl && syncStatus.rpc.connectedPeers !== undefined) {
                peersEl.textContent = syncStatus.rpc.connectedPeers || '0';
            }
            
            // Update UPTIME (if available from container stats)
            const uptimeEl = document.querySelector('[data-node-uptime]') || document.getElementById('uptime');
            if (uptimeEl && syncStatus.uptime) {
                uptimeEl.textContent = this.formatUptime(syncStatus.uptime);
            }
            
            // Update MEMPOOL SIZE
            const mempoolEl = document.querySelector('[data-mempool-size]') || document.getElementById('mempool-size');
            if (mempoolEl && syncStatus.rpc.mempoolSize !== undefined) {
                mempoolEl.textContent = syncStatus.rpc.mempoolSize;
            }
        }
        
        if (syncStatus.dag) {
            // Update LOCAL HEIGHT (virtualDaaScore or blockCount)
            const heightEl = document.querySelector('[data-local-height]') || document.getElementById('current-height');
            if (heightEl) {
                if (syncStatus.dag.virtualDaaScore) {
                    const height = typeof syncStatus.dag.virtualDaaScore === 'string' 
                        ? parseInt(syncStatus.dag.virtualDaaScore) 
                        : syncStatus.dag.virtualDaaScore;
                    heightEl.textContent = height.toLocaleString();
                } else if (syncStatus.dag.blockCount) {
                    heightEl.textContent = syncStatus.dag.blockCount.toLocaleString();
                }
            }
            
            // Update LAST BLOCK (if timestamp available)
            const lastBlockEl = document.querySelector('[data-last-block]') || document.getElementById('last-block-time');
            if (lastBlockEl && syncStatus.dag.tipTimestamp) {
                const blockDate = new Date(parseInt(syncStatus.dag.tipTimestamp) * 1000);
                const timeAgo = this.formatTimeAgo(blockDate);
                lastBlockEl.textContent = `${timeAgo} ago`;
            }
        }
        
        // Update blocks per hour with chart
        if (syncStatus.blocksPerHour) {
            const blocksEl = document.getElementById('blocks-per-hour-value');
            if (blocksEl) {
                blocksEl.textContent = this.formatNumber(syncStatus.blocksPerHour.rate || 36000);
            }
            
            if (syncStatus.blocksPerHour.chartData && syncStatus.blocksPerHour.chartData.length > 0) {
                this.drawBlocksChart(syncStatus.blocksPerHour.chartData);
            }
        }
        
        // Update network height from top-level fields
        if (syncStatus.networkHeight) {
            const networkHeightEl = document.getElementById('network-height');
            if (networkHeightEl) {
                networkHeightEl.textContent = this.formatNumber(syncStatus.networkHeight);
            }
        }
        
        // Update local height from top-level fields
        if (syncStatus.localHeight) {
            const localHeightEl = document.getElementById('current-height');
            if (localHeightEl) {
                localHeightEl.textContent = this.formatNumber(syncStatus.localHeight);
            }
        }
        
        // Update connected peers from top-level fields
        if (syncStatus.connectedPeers !== undefined && syncStatus.connectedPeers !== null) {
            const peersEl = document.getElementById('peer-count-node');
            if (peersEl) {
                peersEl.textContent = syncStatus.connectedPeers;
            }
        }
        
        // Update node version from top-level fields
        if (syncStatus.nodeVersion) {
            const versionEl = document.getElementById('node-version');
            if (versionEl) {
                versionEl.textContent = syncStatus.nodeVersion;
            }
        }
    }

    /**
     * FIX 1: Update Kaspa Node service card with sync status
     * @param {Object} syncStatus - Sync status object
     */
    updateKaspaNodeServiceCard(syncStatus) {
        if (!syncStatus) return;

        // Find the Kaspa Node service card
        const kaspaCard = document.querySelector('[data-service="kaspa-node"]') ||
                         Array.from(document.querySelectorAll('.service-card')).find(card => 
                             card.textContent.includes('Kaspa Node') || card.textContent.includes('kaspa-node')
                         );
        
        if (!kaspaCard) return;

        const statusEl = kaspaCard.querySelector('.service-status, .status-badge');
        const detailEl = kaspaCard.querySelector('.service-detail, .service-info');
        
        if (syncStatus.isSynced) {
            // Node is fully synced
            if (statusEl) {
                statusEl.textContent = 'Running - Synced';
                statusEl.className = 'status-badge healthy';
            }
            if (detailEl) {
                detailEl.textContent = 'Node is fully synchronized';
            }
        } else if (syncStatus.syncPhase !== 'unknown') {
            // Node is syncing
            const phaseName = syncStatus.syncPhaseName || 'Syncing';
            if (statusEl) {
                statusEl.textContent = `Running - ${phaseName}`;
                statusEl.className = 'status-badge unhealthy';
            }
            if (detailEl) {
                detailEl.textContent = syncStatus.detail || 'Synchronizing with network';
            }
        }
    }

    /**
     * Show sync progress with percentage and ETA
     */
    showSyncProgress(progress, estimatedTimeRemaining) {
        const progressContainer = document.getElementById('sync-progress-container');
        const progressBar = document.getElementById('sync-progress');
        const progressPercentage = document.getElementById('sync-percentage');
        const progressETA = document.getElementById('sync-eta');

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${progress}%`;
        }

        if (progressETA && estimatedTimeRemaining) {
            const eta = this.formatDuration(estimatedTimeRemaining);
            progressETA.textContent = `ETA: ${eta}`;
        } else if (progressETA) {
            progressETA.textContent = 'Calculating ETA...';
        }
    }

    /**
     * Hide sync progress display
     */
    hideSyncProgress() {
        const progressContainer = document.getElementById('sync-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * Format time ago display
     */
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
        } else {
            return 'moments';
        }
    }

    /**
     * Format duration in milliseconds to human readable
     */
    formatDuration(ms) {
        if (!ms || ms <= 0) return 'Unknown';

        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return '< 1m';
        }
    }

    /**
     * Initialize blocks per hour chart
     */
    initBlocksPerHourChart() {
        const canvas = document.getElementById('blocks-hour-chart');
        if (!canvas) return;
        this.blocksChartCtx = canvas.getContext('2d');
        this.blocksChartData = new Array(60).fill(36000);
    }

    /**
     * Draw blocks per hour chart
     */
    drawBlocksChart(data) {
        const canvas = document.getElementById('blocks-hour-chart');
        if (!canvas || !this.blocksChartCtx) return;
        
        const ctx = this.blocksChartCtx;
        const width = canvas.width, height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        if (!data || data.length === 0) data = this.blocksChartData;
        else this.blocksChartData = data;
        
        const minVal = Math.min(...data) * 0.95;
        const maxVal = Math.max(...data) * 1.05;
        const range = maxVal - minVal || 1;
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(72, 187, 120, 0.4)');
        gradient.addColorStop(1, 'rgba(72, 187, 120, 0.05)');
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - minVal) / range) * height;
            ctx.lineTo(x, y);
        });
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Line
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - minVal) / range) * height;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'rgba(72, 187, 120, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    /**
     * Show syncing state when node is starting up
     */
    showSyncingState() {
        const syncContainer = document.getElementById('sync-container');
        const syncNotification = document.getElementById('sync-notification');
        
        if (syncContainer) {
            syncContainer.classList.add('syncing');
        }
        
        if (syncNotification) {
            syncNotification.style.display = 'block';
            syncNotification.innerHTML = `
                <span class="notification-icon">🔄</span>
                <span class="notification-text">Node is syncing headers with the network</span>
            `;
        }
        
        // Show syncing status instead of "Starting..."
        this.updateElement('syncStatus', 'Syncing...');
        this.updateElement('syncPercentage', '0.0%');
        
        // Show progress bar in indeterminate state
        const progressContainer = document.getElementById('sync-progress-container');
        const progressBar = document.getElementById('sync-progress');
        const progressETA = document.getElementById('sync-eta');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        
        if (progressBar) {
            progressBar.style.width = '25%';
            progressBar.classList.add('indeterminate');
        }
        
        if (progressETA) {
            progressETA.textContent = 'Estimating time remaining...';
        }
    }

    /**
     * Render the sync phase pipeline visualization
     * @param {string} currentPhase - Current sync phase ID
     */
    renderSyncPipeline(currentPhase) {
        const pipelineContainer = document.getElementById('sync-pipeline');
        if (!pipelineContainer) return;

        const currentOrder = SYNC_PHASES[currentPhase]?.order ?? -1;

        let html = '';
        PIPELINE_PHASES.forEach((phaseId, index) => {
            const phase = SYNC_PHASES[phaseId];
            const phaseOrder = phase.order;
            
            let status = 'pending';
            let statusIcon = '○';
            
            if (phaseOrder < currentOrder || currentPhase === 'synced') {
                status = 'completed';
                statusIcon = '✓';
            } else if (phaseOrder === currentOrder) {
                status = 'current';
                statusIcon = '▶';
            }

            html += `
                <div class="pipeline-phase ${status}" data-phase="${phaseId}" title="${phase.name}">
                    <span class="phase-status">${statusIcon}</span>
                    <span class="phase-name">${phase.name}</span>
                </div>
            `;

            // Add connector between phases (except after last)
            if (index < PIPELINE_PHASES.length - 1) {
                html += '<span class="pipeline-connector">→</span>';
            }
        });

        pipelineContainer.innerHTML = html;
    }

    /**
     * Update the Kaspa Node service card with sync status
     * @param {Object} syncStatus - Sync status from API
     */
    updateKaspaServiceCardSync(syncStatus) {
        if (!syncStatus) return;

        // Find the Kaspa Node service card
        const serviceCard = document.querySelector('[data-service="kaspa-node"]') ||
                            document.querySelector('.service-card.kaspa-node') ||
                            document.querySelector('.service-item[data-name="kaspa-node"]');
        
        if (!serviceCard) return;

        const phase = syncStatus.syncPhase || 'unknown';
        const phaseConfig = SYNC_PHASES[phase] || SYNC_PHASES.unknown;

        // Update status badge
        const badgeEl = serviceCard.querySelector('.service-status-badge, .status-badge, .badge');
        if (badgeEl) {
            if (syncStatus.isSynced) {
                badgeEl.textContent = 'healthy';
                badgeEl.className = 'status-badge healthy';
            } else {
                const progressText = syncStatus.progress > 0 ? ` ${syncStatus.progress}%` : '';
                badgeEl.textContent = 'syncing';
                badgeEl.className = 'status-badge unhealthy';
            }
        }

        // Hide/show the error message div based on sync status
        const errorEl = serviceCard.querySelector('.service-error');
        if (errorEl) {
            if (syncStatus.isSynced) {
                // Node is synced - hide the error/warning message
                errorEl.style.display = 'none';
            } else {
                // Node is syncing - show the message with updated text
                errorEl.style.display = 'flex';
                const errorTextEl = errorEl.querySelector('.error-text');
                if (errorTextEl) {
                    errorTextEl.textContent = syncStatus.detail || 'Node is syncing with network';
                }
            }
        }

        // Update warning/sync message (if exists separately)
        const messageEl = serviceCard.querySelector('.service-sync-message, .sync-warning, .service-message');
        if (messageEl) {
            if (syncStatus.isSynced) {
                messageEl.style.display = 'none';
            } else {
                messageEl.style.display = 'flex';
                const textEl = messageEl.querySelector('.warning-text, span:last-child');
                if (textEl) {
                    textEl.textContent = syncStatus.detail || 'Node is syncing with network';
                }
            }
        }

        // Update or create mini progress bar
        let progressContainer = serviceCard.querySelector('.service-progress-container');
        if (!syncStatus.isSynced && syncStatus.progress > 0) {
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'service-progress-container';
                progressContainer.innerHTML = '<div class="service-progress-bar"></div>';
                
                const insertPoint = messageEl || errorEl || serviceCard.querySelector('.service-actions');
                if (insertPoint) {
                    insertPoint.parentNode.insertBefore(progressContainer, insertPoint);
                } else {
                    serviceCard.appendChild(progressContainer);
                }
            }
            
            const progressBar = progressContainer.querySelector('.service-progress-bar');
            if (progressBar) {
                // Calculate overall progress based on phase
                const overallProgress = this.calculateOverallProgress(syncStatus);
                progressBar.style.width = `${overallProgress}%`;
            }
        } else if (progressContainer && syncStatus.isSynced) {
            progressContainer.remove();
        }
    }

    /**
     * Calculate overall sync progress across all phases
     * @param {Object} syncStatus - Sync status object
     * @returns {number} Overall progress 0-100
     */
    calculateOverallProgress(syncStatus) {
        if (syncStatus.isSynced) return 100;
        
        const phase = syncStatus.syncPhase;
        const phaseProgress = syncStatus.progress || 0;
        
        // Phase weights (based on typical duration)
        const weights = {
            starting: 1,
            connecting: 2,
            proof: 5,
            headers: 50,  // Longest phase
            utxo: 5,
            blocks: 25,
            virtual: 12
        };
        
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let completedWeight = 0;
        
        const phaseOrder = ['starting', 'connecting', 'proof', 'headers', 'utxo', 'blocks', 'virtual'];
        const currentIndex = phaseOrder.indexOf(phase);
        
        // Add weight for completed phases
        for (let i = 0; i < currentIndex; i++) {
            completedWeight += weights[phaseOrder[i]] || 0;
        }
        
        // Add partial weight for current phase
        if (weights[phase]) {
            completedWeight += (weights[phase] * phaseProgress / 100);
        }
        
        return Math.round((completedWeight / totalWeight) * 100);
    }

    /**
     * Update connection information display
     */
    updateConnectionInfo(connection) {
        // Find or create connection info element
        let connectionInfo = document.getElementById('kaspa-connection-info');
        if (!connectionInfo) {
            // Create connection info element if it doesn't exist
            const nodeSection = document.querySelector('.kaspa-node-section') || 
                               document.querySelector('#kaspa-stats');
            if (nodeSection) {
                connectionInfo = document.createElement('div');
                connectionInfo.id = 'kaspa-connection-info';
                connectionInfo.className = 'connection-info';
                nodeSection.appendChild(connectionInfo);
            }
        }

        if (connectionInfo && connection) {
            const status = connection.status || (connection.connected ? 'connected' : 'disconnected');
            const port = connection.port || connection.workingPort;
            const url = connection.url || connection.workingUrl;
            
            let html = `<div class="connection-status ${status}">`;
            
            if (status === 'connected') {
                html += `
                    <span class="status-indicator connected">
                        <span class="dot"></span>
                        Connected via port ${port}
                    </span>
                `;
                if (url) {
                    html += `<div class="connection-url">${url}</div>`;
                }
            } else {
                html += `
                    <span class="status-indicator disconnected">
                        <span class="dot"></span>
                        Not Available
                    </span>
                `;
                if (connection.error) {
                    html += `<div class="connection-error">${connection.error}</div>`;
                }
            }
            
            html += '</div>';
            connectionInfo.innerHTML = html;
        }
    }

    /**
     * Show connection troubleshooting information
     */
    showConnectionTroubleshooting(connection) {
        let troubleshootingEl = document.getElementById('kaspa-troubleshooting');
        if (!troubleshootingEl) {
            const nodeSection = document.querySelector('.kaspa-node-section') || 
                               document.querySelector('#kaspa-stats');
            if (nodeSection) {
                troubleshootingEl = document.createElement('div');
                troubleshootingEl.id = 'kaspa-troubleshooting';
                troubleshootingEl.className = 'troubleshooting-info';
                nodeSection.appendChild(troubleshootingEl);
            }
        }

        if (troubleshootingEl && connection.troubleshooting) {
            let html = '<div class="troubleshooting-header">Troubleshooting:</div>';
            html += '<ul class="troubleshooting-list">';
            
            connection.troubleshooting.forEach(tip => {
                html += `<li>${tip}</li>`;
            });
            
            html += '</ul>';
            
            // Add test connection button
            html += `
                <button class="btn btn-secondary test-connection-btn" onclick="dashboard.testKaspaConnection()">
                    Test Connection
                </button>
            `;
            
            troubleshootingEl.innerHTML = html;
        }
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
        if (resources.memoryInfo) {
            this.updateElement('memory-info', resources.memoryInfo);
        }

        // Disk
        if (resources.disk !== undefined) {
            this.updateResourceBar('disk', resources.disk);
            this.updateElement('diskText', `${resources.disk.toFixed(1)}%`);
        }
        if (resources.diskInfo) {
            this.updateElement('disk-info', resources.diskInfo);
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
     * Show Docker limits modal
     */
    showDockerLimitsModal(content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('docker-limits-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'docker-limits-modal';
            modal.className = 'modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-labelledby', 'docker-limits-title');
            modal.setAttribute('aria-hidden', 'true');
            
            modal.innerHTML = `
                <div class="modal-content">
                    <button class="close" id="close-docker-limits-btn" aria-label="Close Docker limits modal">&times;</button>
                    <h2 id="docker-limits-title">Docker Container Resource Limits</h2>
                    <div id="docker-limits-content" class="docker-limits-content">
                        ${content}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add close button handler
            const closeBtn = modal.querySelector('#close-docker-limits-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeModal(modal));
            }
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        } else {
            // Update existing modal content
            const contentEl = modal.querySelector('#docker-limits-content');
            if (contentEl) {
                contentEl.innerHTML = content;
            }
        }
        
        this.showModal('docker-limits-modal');
    }

    /**
     * Show notification with enhanced features for configuration changes
     */
    showNotification(message, type = 'info', options = {}) {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'notification-container';
            notificationContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(notificationContainer);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        
        // Create notification content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const messageEl = document.createElement('span');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
        
        // Add action buttons for configuration change notifications
        if (options.showRefreshButton) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'notification-action btn-small';
            refreshBtn.textContent = 'Refresh Now';
            refreshBtn.setAttribute('aria-label', 'Refresh dashboard now');
            refreshBtn.onclick = () => {
                if (window.dashboard && window.dashboard.manualRefresh) {
                    window.dashboard.manualRefresh();
                }
                notification.remove();
            };
            content.appendChild(refreshBtn);
        }
        
        // Add dismiss button
        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'notification-dismiss';
        dismissBtn.innerHTML = '×';
        dismissBtn.setAttribute('aria-label', 'Dismiss notification');
        dismissBtn.onclick = () => notification.remove();
        content.appendChild(dismissBtn);
        
        notification.appendChild(content);
        notificationContainer.appendChild(notification);

        // Auto-remove after specified time (default 5 seconds, longer for important notifications)
        const autoRemoveTime = options.persistent ? 10000 : (options.duration || 5000);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, autoRemoveTime);
        
        return notification;
    }

    /**
     * Show configuration change notification with refresh option
     * Requirements 10.4: Display notification when state file changes
     */
    showConfigurationChangeNotification(message, hasError = false) {
        const type = hasError ? 'warning' : 'info';
        return this.showNotification(message, type, {
            showRefreshButton: true,
            persistent: true,
            duration: 8000
        });
    }

    /**
     * Show auto-refresh notification
     * Requirements 10.8: Auto-refresh when Wizard completes
     */
    showAutoRefreshNotification() {
        return this.showNotification('Configuration updated - dashboard refreshed automatically', 'success', {
            duration: 3000
        });
    }

    /**
     * Clear all notifications
     */
    clearNotifications() {
        const container = document.getElementById('notification-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * Legacy showNotification method for backward compatibility
     */
    _legacyShowNotification(message, type = 'info') {
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

    /**
     * Update last status check timestamp
     * Requirements 7.8: THE Dashboard SHALL display the last status check timestamp
     */
    updateLastStatusCheck(timestamp) {
        const timestampEl = this.elements.lastStatusTimestamp;
        if (timestampEl && timestamp) {
            // Format timestamp to be user-friendly
            const date = new Date(timestamp);
            const timeString = date.toLocaleTimeString();
            timestampEl.textContent = timeString;
            timestampEl.setAttribute('title', `Last status check: ${date.toLocaleString()}`);
        }
    }

    /**
     * Update enhanced network stats with all new fields
     */
    updateEnhancedNetworkStats(networkData) {
        if (!networkData) return;
        
        this.updateElement('network-tps', networkData.tps || '-');
        this.updateElement('network-bps', networkData.bps || '-');
        this.updateElement('network-mempool', networkData.mempoolSize || 0);
        this.updateElement('hash-rate', networkData.networkHashRate || '-');
        this.updateElement('network-circulating', networkData.circulatingSupply || '-');
        this.updateElement('network-percent-mined', `Mined: ${networkData.percentMined || '-'}`);
        this.updateElement('network-block-reward', `𐤊 ${(networkData.currentBlockReward || 0).toFixed(2)}`);
        
        // Technical Details
        this.updateElement('daa-score', this.formatNumber(networkData.blockHeight));
        this.updateElement('last-block-coinbase', networkData.lastBlockCoinbase 
            ? `𐤊 ${networkData.lastBlockCoinbase.toFixed(2)}` 
            : '-');
        
        // Update source indicator
        const sourceElement = document.getElementById('network-source');
        if (sourceElement && networkData.source) {
            sourceElement.textContent = `Source: ${networkData.source}`;
            sourceElement.title = `Last updated: ${networkData.timestamp}`;
        }
    }

    /**
     * Update local node status with enhanced fields
     */
    updateLocalNodeStatus(nodeStatus) {
        if (!nodeStatus || nodeStatus.error) {
            this.updateElement('current-height', '-');
            this.updateElement('network-height', '-');
            this.updateElement('peer-count-node', '-');
            this.updateElement('node-version', '-');
            this.updateElement('uptime', '-');
            this.updateElement('last-block-time', '-');
            this.updateElement('mempool-size', '-');
            return;
        }
        
        this.updateElement('current-height', this.formatNumber(nodeStatus.localHeight));
        this.updateElement('network-height', this.formatNumber(nodeStatus.networkHeight));
        this.updateElement('peer-count-node', nodeStatus.connectedPeers);
        this.updateElement('node-version', nodeStatus.nodeVersion);
        this.updateElement('uptime', nodeStatus.uptime);
        this.updateElement('last-block-time', nodeStatus.lastBlockTime);
        this.updateElement('mempool-size', nodeStatus.mempoolSize);
    }

    /**
     * Event emitter
     */
    emit(event, data) {
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}
