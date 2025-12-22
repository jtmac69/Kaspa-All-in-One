class KaspaDashboard {
    constructor() {
        this.updateInterval = null;
        this.ws = null;
        this.connectionStatus = document.getElementById('connection-status');
        this.activeProfiles = new Set(['core']);
        this.logStreams = new Map();
        this.groupedView = true;
        this.lastServicesData = null;
        this.sensitiveVisible = false;
        this.walletInfo = null;
        this.init();
    }

    async init() {
        this.updateConnectionStatus(true);
        await this.loadInitialData();
        this.setupWebSocket();
        this.setupEventListeners();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus(true);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'update') {
                    this.handleRealtimeUpdate(message.data);
                } else if (message.type === 'log') {
                    this.handleLogStream(message);
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected, reconnecting...');
            this.updateConnectionStatus(false);
            setTimeout(() => this.setupWebSocket(), 5000);
        };
    }

    handleRealtimeUpdate(data) {
        if (data.services) {
            this.lastServicesData = data.services; // Store for dependency checking
            this.updateServicesStatus(data.services);
            this.updateApplicationsStatus(data.services);
        }
        if (data.resources) {
            this.updateSystemResources(data.resources);
        }
    }

    handleLogStream(message) {
        const modal = document.getElementById('logs-modal');
        const logsContent = document.getElementById('logs-content');
        
        if (modal.style.display === 'block') {
            logsContent.textContent += message.data;
            logsContent.scrollTop = logsContent.scrollHeight;
        }
    }

    updateConnectionStatus(connected) {
        const statusEl = this.connectionStatus;
        if (connected) {
            statusEl.classList.remove('disconnected');
            statusEl.querySelector('.text').textContent = 'Connected';
        } else {
            statusEl.classList.add('disconnected');
            statusEl.querySelector('.text').textContent = 'Disconnected';
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.updateKaspaStats(),
                this.loadProfiles(),
                this.loadDependencies(),
                this.loadApplications(),
                this.loadWalletInfo(),
                this.loadUpdates()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.updateConnectionStatus(false);
        }
    }

    async loadProfiles() {
        try {
            const profiles = await fetch('/api/profiles').then(r => r.json());
            this.activeProfiles = new Set(profiles);
            this.updateProfileSelector();
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    }

    async loadDependencies() {
        try {
            this.dependencies = await fetch('/api/dependencies').then(r => r.json());
        } catch (error) {
            console.error('Failed to load dependencies:', error);
            this.dependencies = {};
        }
    }

    updateProfileSelector() {
        const selector = document.getElementById('profile-filter');
        if (!selector) return;
        
        selector.innerHTML = `
            <option value="all">All Services</option>
            ${Array.from(this.activeProfiles).map(profile => 
                `<option value="${profile}">${this.capitalizeFirst(profile)}</option>`
            ).join('')}
        `;
    }

    async updateKaspaStats() {
        try {
            const [info, stats] = await Promise.all([
                fetch('/api/kaspa/info').then(r => r.json()),
                fetch('/api/kaspa/stats').then(r => r.json())
            ]);

            this.updateNodeSyncStatus(info, stats);
            this.updateNodeStats(info, stats);
            this.updateNetworkStats(stats);

        } catch (error) {
            console.error('Failed to update Kaspa stats:', error);
            this.showNodeError('Failed to connect to Kaspa node');
        }
    }

    updateNodeSyncStatus(info, stats) {
        const syncStatus = document.getElementById('sync-status');
        const syncContainer = document.getElementById('sync-progress-container');
        const syncNotification = document.getElementById('sync-notification');
        const syncProgress = document.getElementById('sync-progress');
        const syncPercentage = document.getElementById('sync-percentage');
        const syncEta = document.getElementById('sync-eta');

        if (info.isSynced) {
            syncStatus.textContent = 'Synced ✓';
            syncStatus.className = 'sync-value synced';
            syncContainer.style.display = 'none';
            syncNotification.style.display = 'none';
        } else {
            syncStatus.textContent = 'Syncing...';
            syncStatus.className = 'sync-value syncing';
            syncContainer.style.display = 'block';
            syncNotification.style.display = 'block';

            // Calculate sync progress
            const currentHeight = stats.blockDag?.virtualSelectedParentBlueScore || 0;
            const networkHeight = this.estimateNetworkHeight(stats);
            const progress = networkHeight > 0 ? (currentHeight / networkHeight) * 100 : 0;
            
            syncProgress.style.width = `${Math.min(progress, 100)}%`;
            syncPercentage.textContent = `${progress.toFixed(1)}%`;
            
            // Estimate time remaining
            const eta = this.calculateSyncETA(currentHeight, networkHeight, info.syncRate);
            syncEta.textContent = eta;
        }
    }

    updateNodeStats(info, stats) {
        // Update block heights
        const currentHeight = stats.blockDag?.virtualSelectedParentBlueScore || 0;
        const networkHeight = this.estimateNetworkHeight(stats);
        
        document.getElementById('current-height').textContent = this.formatNumber(currentHeight);
        document.getElementById('network-height').textContent = this.formatNumber(networkHeight);
        
        // Update other node stats
        document.getElementById('node-version').textContent = info.serverVersion || '-';
        document.getElementById('peer-count-node').textContent = info.peerCount || '0';
        document.getElementById('mempool-size').textContent = info.mempoolSize || '0';
        
        // Calculate and display uptime
        const uptime = this.calculateNodeUptime(info.startTime);
        document.getElementById('uptime').textContent = uptime;
    }

    updateNetworkStats(stats) {
        if (stats.blockDag) {
            document.getElementById('network-difficulty').textContent = 
                this.formatNumber(stats.blockDag.difficulty);
        }
        
        // Update network hash rate (calculated from difficulty)
        const hashRate = this.calculateHashRate(stats.blockDag?.difficulty);
        document.getElementById('network-hashrate').textContent = hashRate;
        
        // Update the overview section as well
        document.getElementById('block-height').textContent = 
            this.formatNumber(stats.blockDag?.virtualSelectedParentBlueScore);
        document.getElementById('difficulty').textContent = 
            this.formatNumber(stats.blockDag?.difficulty);
        document.getElementById('hash-rate').textContent = hashRate;
        document.getElementById('peer-count').textContent = 
            document.getElementById('peer-count-node').textContent;
    }

    estimateNetworkHeight(stats) {
        // Estimate network height based on tip hashes and difficulty
        // This is a simplified estimation - in reality, you'd query network info
        const currentHeight = stats.blockDag?.virtualSelectedParentBlueScore || 0;
        const tipCount = stats.blockDag?.tipHashes?.length || 1;
        
        // If we have multiple tips, estimate we're behind
        if (tipCount > 1) {
            return currentHeight + (tipCount * 10); // Rough estimation
        }
        
        return currentHeight;
    }

    calculateSyncETA(currentHeight, networkHeight, syncRate) {
        if (!syncRate || syncRate <= 0) {
            return 'Calculating...';
        }
        
        const blocksRemaining = networkHeight - currentHeight;
        if (blocksRemaining <= 0) {
            return 'Almost done';
        }
        
        const secondsRemaining = blocksRemaining / syncRate;
        return this.formatDuration(secondsRemaining * 1000);
    }

    calculateNodeUptime(startTime) {
        if (!startTime) {
            return 'Unknown';
        }
        
        const uptime = Date.now() - new Date(startTime).getTime();
        return this.formatUptime(uptime);
    }

    calculateHashRate(difficulty) {
        if (!difficulty) return '-';
        
        // Simplified hash rate calculation
        // Real calculation would need block time and other factors
        const hashRate = difficulty * 1000000; // Simplified
        
        if (hashRate >= 1e18) return (hashRate / 1e18).toFixed(2) + ' EH/s';
        if (hashRate >= 1e15) return (hashRate / 1e15).toFixed(2) + ' PH/s';
        if (hashRate >= 1e12) return (hashRate / 1e12).toFixed(2) + ' TH/s';
        if (hashRate >= 1e9) return (hashRate / 1e9).toFixed(2) + ' GH/s';
        return (hashRate / 1e6).toFixed(2) + ' MH/s';
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    showNodeError(message) {
        const syncStatus = document.getElementById('sync-status');
        const syncNotification = document.getElementById('sync-notification');
        
        syncStatus.textContent = 'Error';
        syncStatus.className = 'sync-value error';
        
        if (syncNotification) {
            syncNotification.style.display = 'block';
            syncNotification.querySelector('.notification-text').textContent = message;
            syncNotification.querySelector('.notification-icon').textContent = '❌';
        }
    }

    updateServicesStatus(services) {
        const servicesGrid = document.getElementById('services-grid');
        const selectedProfile = document.getElementById('profile-filter')?.value || 'all';
        
        const filteredServices = services.filter(service => 
            selectedProfile === 'all' || service.profile === selectedProfile
        );
        
        // Group services by profile for better organization
        const servicesByProfile = this.groupServicesByProfile(filteredServices);
        
        servicesGrid.innerHTML = Object.entries(servicesByProfile).map(([profile, profileServices]) => `
            <div class="profile-group">
                <h3 class="profile-title">${this.capitalizeFirst(profile)} Profile</h3>
                <div class="profile-services">
                    ${profileServices.map(service => `
                        <div class="service-card ${service.status === 'healthy' ? '' : service.status === 'stopped' ? 'stopped' : 'unhealthy'}">
                            <div class="service-header">
                                <h4>${service.displayName}</h4>
                                <div class="service-badges">
                                    <span class="profile-badge">${service.profile}</span>
                                    ${service.version ? `<span class="version-badge">v${service.version}</span>` : ''}
                                </div>
                            </div>
                            <div class="service-status ${service.status}">
                                <span class="indicator"></span>
                                <span>${this.getStatusText(service.status)}</span>
                                ${service.uptime ? `<span class="uptime">Up: ${this.formatUptime(service.uptime)}</span>` : ''}
                            </div>
                            <small>Last check: ${new Date(service.lastCheck).toLocaleTimeString()}</small>
                            ${service.error ? `<div class="error-msg">${service.error}</div>` : ''}
                            ${this.renderDependencyGraph(service.name, services)}
                            <div class="service-actions">
                                ${service.status === 'stopped' ? 
                                    `<button onclick="dashboard.startService('${service.name}')" class="btn-small btn-success" ${this.canStartService(service.name) ? '' : 'disabled'}>Start</button>` :
                                    `<button onclick="dashboard.stopService('${service.name}')" class="btn-small btn-danger" ${this.canStopService(service.name) ? '' : 'disabled'}>Stop</button>`
                                }
                                <button onclick="dashboard.restartService('${service.name}')" class="btn-small" ${this.canRestartService(service.name) ? '' : 'disabled'}>Restart</button>
                                <button onclick="dashboard.viewServiceLogs('${service.name}')" class="btn-small">Logs</button>
                                <button onclick="dashboard.showDependencyTree('${service.name}')" class="btn-small btn-info">Dependencies</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderDependencies(serviceName) {
        const deps = this.dependencies[serviceName] || [];
        if (deps.length === 0) return '';
        
        return `
            <div class="dependencies">
                <small>Depends on: ${deps.join(', ')}</small>
            </div>
        `;
    }

    groupServicesByProfile(services) {
        const grouped = {};
        services.forEach(service => {
            if (!grouped[service.profile]) {
                grouped[service.profile] = [];
            }
            grouped[service.profile].push(service);
        });
        return grouped;
    }

    renderDependencyGraph(serviceName, allServices) {
        const deps = this.dependencies[serviceName] || [];
        const dependents = this.findDependents(serviceName, allServices);
        
        if (deps.length === 0 && dependents.length === 0) return '';
        
        return `
            <div class="dependency-graph">
                ${deps.length > 0 ? `
                    <div class="dependencies">
                        <span class="dep-label">Requires:</span>
                        ${deps.map(dep => {
                            const depService = allServices.find(s => s.name === dep);
                            const status = depService ? depService.status : 'unknown';
                            return `<span class="dep-item ${status}">${dep}</span>`;
                        }).join('')}
                    </div>
                ` : ''}
                ${dependents.length > 0 ? `
                    <div class="dependents">
                        <span class="dep-label">Required by:</span>
                        ${dependents.map(dep => {
                            const depService = allServices.find(s => s.name === dep);
                            const status = depService ? depService.status : 'unknown';
                            return `<span class="dep-item ${status}">${dep}</span>`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    findDependents(serviceName, allServices) {
        const dependents = [];
        Object.entries(this.dependencies).forEach(([service, deps]) => {
            if (deps.includes(serviceName)) {
                dependents.push(service);
            }
        });
        return dependents;
    }

    canStartService(serviceName) {
        const deps = this.dependencies[serviceName] || [];
        // Check if all dependencies are running
        return deps.every(dep => {
            const depService = this.lastServicesData?.find(s => s.name === dep);
            return depService && depService.status === 'healthy';
        });
    }

    canStopService(serviceName) {
        // Check if any other services depend on this one
        const dependents = this.findDependents(serviceName, this.lastServicesData || []);
        const runningDependents = dependents.filter(dep => {
            const depService = this.lastServicesData?.find(s => s.name === dep);
            return depService && depService.status === 'healthy';
        });
        return runningDependents.length === 0;
    }

    canRestartService(serviceName) {
        // Can restart if we can stop it (no running dependents)
        return this.canStopService(serviceName);
    }

    async showDependencyTree(serviceName) {
        const modal = document.getElementById('dependency-modal') || this.createDependencyModal();
        const content = document.getElementById('dependency-content');
        const title = document.getElementById('dependency-title');
        
        modal.style.display = 'block';
        title.textContent = `${serviceName} Dependencies`;
        
        const tree = this.buildDependencyTree(serviceName);
        content.innerHTML = this.renderDependencyTreeHTML(tree);
    }

    createDependencyModal() {
        const modal = document.createElement('div');
        modal.id = 'dependency-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="dashboard.closeDependencyModal()">&times;</span>
                <h2 id="dependency-title">Service Dependencies</h2>
                <div id="dependency-content" class="dependency-tree-container">
                    Loading dependency tree...
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    buildDependencyTree(serviceName, visited = new Set()) {
        if (visited.has(serviceName)) {
            return { name: serviceName, circular: true };
        }
        
        visited.add(serviceName);
        const deps = this.dependencies[serviceName] || [];
        const dependents = this.findDependents(serviceName, this.lastServicesData || []);
        
        return {
            name: serviceName,
            dependencies: deps.map(dep => this.buildDependencyTree(dep, new Set(visited))),
            dependents: dependents.map(dep => this.buildDependencyTree(dep, new Set(visited))),
            status: this.lastServicesData?.find(s => s.name === serviceName)?.status || 'unknown'
        };
    }

    renderDependencyTreeHTML(tree, level = 0) {
        const indent = '  '.repeat(level);
        const statusClass = tree.status || 'unknown';
        
        let html = `
            <div class="tree-node level-${level}">
                <span class="node-name ${statusClass}">
                    ${tree.circular ? '↻ ' : ''}${tree.name}
                    <span class="status-dot ${statusClass}"></span>
                </span>
        `;
        
        if (tree.dependencies && tree.dependencies.length > 0) {
            html += `
                <div class="tree-section">
                    <span class="section-label">Dependencies:</span>
                    ${tree.dependencies.map(dep => this.renderDependencyTreeHTML(dep, level + 1)).join('')}
                </div>
            `;
        }
        
        if (tree.dependents && tree.dependents.length > 0) {
            html += `
                <div class="tree-section">
                    <span class="section-label">Dependents:</span>
                    ${tree.dependents.map(dep => this.renderDependencyTreeHTML(dep, level + 1)).join('')}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    closeDependencyModal() {
        const modal = document.getElementById('dependency-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    toggleServiceView() {
        this.groupedView = !this.groupedView;
        if (this.lastServicesData) {
            this.updateServicesStatus(this.lastServicesData);
        }
    }

    async refreshServices() {
        try {
            const services = await fetch('/api/status').then(r => r.json());
            this.lastServicesData = services;
            this.updateServicesStatus(services);
            this.updateApplicationsStatus(services);
            this.showNotification('success', 'Services refreshed');
        } catch (error) {
            this.showNotification('error', 'Failed to refresh services');
        }
    }

    async loadApplications() {
        try {
            // Define application configurations
            this.applications = [
                {
                    name: 'kasia-app',
                    displayName: 'Kasia',
                    description: 'Kaspa blockchain explorer and analytics platform',
                    icon: '🔍',
                    url: 'http://localhost:3001',
                    profile: 'kaspa-user-applications',
                    category: 'user'
                },
                {
                    name: 'k-social',
                    displayName: 'K-Social',
                    description: 'Social platform for the Kaspa community',
                    icon: '💬',
                    url: 'http://localhost:3002',
                    profile: 'kaspa-user-applications',
                    category: 'user'
                },
                {
                    name: 'kaspa-explorer',
                    displayName: 'Kaspa Explorer',
                    description: 'Official Kaspa blockchain explorer',
                    icon: '⛏️',
                    url: 'http://localhost:8080',
                    profile: 'kaspa-user-applications',
                    category: 'user'
                },
                {
                    name: 'portainer',
                    displayName: 'Portainer',
                    description: 'Docker container management interface',
                    icon: '🐳',
                    url: 'http://localhost:9000',
                    profile: 'developer-mode',
                    category: 'developer'
                },
                {
                    name: 'pgadmin',
                    displayName: 'pgAdmin',
                    description: 'PostgreSQL database administration tool',
                    icon: '🗄️',
                    url: 'http://localhost:5050',
                    profile: 'developer-mode',
                    category: 'developer'
                }
            ];
            
            this.updateApplicationsDisplay();
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    }

    updateApplicationsDisplay() {
        if (!this.lastServicesData) return;
        this.updateApplicationsStatus(this.lastServicesData);
    }

    updateApplicationsStatus(services) {
        const applicationsGrid = document.getElementById('applications-grid');
        if (!applicationsGrid || !this.applications) return;

        // Filter applications based on active profiles
        const availableApps = this.applications.filter(app => 
            this.activeProfiles.has(app.profile)
        );

        if (availableApps.length === 0) {
            applicationsGrid.innerHTML = `
                <div class="no-applications">
                    <p>No applications are currently deployed.</p>
                    <p>Enable profiles like "Kaspa User Applications" or "Developer Mode" to access applications.</p>
                </div>
            `;
            return;
        }

        // Group applications by category
        const userApps = availableApps.filter(app => app.category === 'user');
        const developerApps = availableApps.filter(app => app.category === 'developer');

        let html = '';

        if (userApps.length > 0) {
            html += `
                <div class="app-category">
                    <h3 class="category-title">User Applications</h3>
                    <div class="app-cards">
                        ${userApps.map(app => this.renderApplicationCard(app, services)).join('')}
                    </div>
                </div>
            `;
        }

        if (developerApps.length > 0) {
            html += `
                <div class="app-category">
                    <h3 class="category-title">Developer Tools</h3>
                    <div class="app-cards">
                        ${developerApps.map(app => this.renderApplicationCard(app, services)).join('')}
                    </div>
                </div>
            `;
        }

        applicationsGrid.innerHTML = html;
    }

    renderApplicationCard(app, services) {
        const service = services.find(s => s.name === app.name);
        const isRunning = service && service.status === 'healthy';
        const isAvailable = service && service.status !== 'stopped';
        
        return `
            <div class="app-card ${isRunning ? 'running' : isAvailable ? 'unhealthy' : 'stopped'}">
                <div class="app-header">
                    <div class="app-icon">${app.icon}</div>
                    <div class="app-info">
                        <h4 class="app-name">${app.displayName}</h4>
                        <p class="app-description">${app.description}</p>
                    </div>
                </div>
                
                <div class="app-status">
                    <span class="status-indicator ${isRunning ? 'running' : isAvailable ? 'unhealthy' : 'stopped'}"></span>
                    <span class="status-text">
                        ${isRunning ? 'Running' : isAvailable ? 'Unhealthy' : 'Stopped'}
                    </span>
                </div>
                
                <div class="app-url">
                    <span class="url-label">URL:</span>
                    <span class="url-value">${app.url}</span>
                    <button class="btn-copy" onclick="dashboard.copyToClipboard('${app.url}')" title="Copy URL">
                        📋
                    </button>
                </div>
                
                <div class="app-actions">
                    <button 
                        class="btn-primary app-launch" 
                        onclick="dashboard.launchApplication('${app.url}')"
                        ${!isRunning ? 'disabled' : ''}
                        title="${!isRunning ? 'Application is not running' : 'Open in new tab'}"
                    >
                        ${isRunning ? '🚀 Launch' : '❌ Unavailable'}
                    </button>
                    
                    ${service ? `
                        <button class="btn-small" onclick="dashboard.viewServiceLogs('${service.name}')">
                            📋 Logs
                        </button>
                        ${isRunning ? `
                            <button class="btn-small btn-danger" onclick="dashboard.stopService('${service.name}')">
                                ⏹️ Stop
                            </button>
                        ` : `
                            <button class="btn-small btn-success" onclick="dashboard.startService('${service.name}')">
                                ▶️ Start
                            </button>
                        `}
                    ` : ''}
                </div>
            </div>
        `;
    }

    launchApplication(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        this.showNotification('info', 'Application opened in new tab');
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('success', 'URL copied to clipboard');
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('success', 'URL copied to clipboard');
        }
    }

    async loadWalletInfo() {
        try {
            const walletInfo = await fetch('/api/kaspa/wallet').then(r => r.json());
            this.walletInfo = walletInfo;
            this.updateWalletDisplay();
        } catch (error) {
            console.error('Failed to load wallet info:', error);
            this.walletInfo = null;
            this.updateWalletDisplay();
        }
    }

    updateWalletDisplay() {
        const walletSection = document.getElementById('wallet-section');
        const walletContainer = document.getElementById('wallet-container');
        
        if (!this.walletInfo || this.walletInfo.error) {
            walletSection.style.display = 'none';
            return;
        }

        walletSection.style.display = 'block';
        walletContainer.innerHTML = this.renderWalletInterface();
    }

    renderWalletInterface() {
        const wallet = this.walletInfo;
        
        return `
            <div class="wallet-grid">
                <!-- Wallet Overview -->
                <div class="wallet-card wallet-overview">
                    <h3>Wallet Overview</h3>
                    <div class="balance-display">
                        <div class="balance-main">
                            <span class="balance-label">Available Balance</span>
                            <div class="balance-value">
                                <span class="amount ${this.sensitiveVisible ? '' : 'masked'}" id="wallet-balance">
                                    ${this.sensitiveVisible ? this.formatKAS(wallet.balance) : '••••••••'}
                                </span>
                                <span class="currency">KAS</span>
                            </div>
                        </div>
                        ${wallet.pendingBalance > 0 ? `
                            <div class="balance-pending">
                                <span class="pending-label">Pending</span>
                                <span class="pending-amount">
                                    ${this.sensitiveVisible ? this.formatKAS(wallet.pendingBalance) : '••••••••'} KAS
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="wallet-address">
                        <span class="address-label">Wallet Address</span>
                        <div class="address-container">
                            <span class="address-value ${this.sensitiveVisible ? '' : 'masked'}" id="wallet-address">
                                ${this.sensitiveVisible ? wallet.address : '••••••••••••••••••••••••••••••••••••••••'}
                            </span>
                            <button class="btn-copy" onclick="dashboard.copyWalletAddress()" title="Copy Address">
                                📋
                            </button>
                        </div>
                    </div>
                    
                    <div class="wallet-controls">
                        <button class="btn-toggle-sensitive" onclick="dashboard.toggleSensitiveInfo()">
                            ${this.sensitiveVisible ? '🙈 Hide' : '👁️ Show'} Sensitive Info
                        </button>
                        <button class="btn-refresh" onclick="dashboard.refreshWallet()">
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                <!-- Send Transaction -->
                <div class="wallet-card send-transaction">
                    <h3>Send Transaction</h3>
                    <form id="send-form" onsubmit="dashboard.sendTransaction(event)">
                        <div class="form-group">
                            <label for="recipient-address">Recipient Address</label>
                            <input 
                                type="text" 
                                id="recipient-address" 
                                name="to" 
                                placeholder="kaspa:qqx..." 
                                required
                                class="form-input"
                            >
                            <small class="form-help">Enter the recipient's Kaspa address</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="send-amount">Amount (KAS)</label>
                            <input 
                                type="number" 
                                id="send-amount" 
                                name="amount" 
                                placeholder="0.00000000" 
                                step="0.00000001" 
                                min="0.00000001"
                                max="${wallet.balance}"
                                required
                                class="form-input"
                            >
                            <small class="form-help">Available: ${this.formatKAS(wallet.balance)} KAS</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="transaction-fee">Fee (KAS)</label>
                            <input 
                                type="number" 
                                id="transaction-fee" 
                                name="fee" 
                                placeholder="0.00001" 
                                step="0.00000001" 
                                min="0.00000001"
                                value="0.00001"
                                class="form-input"
                            >
                            <small class="form-help">Network fee for the transaction</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="wallet-password">Wallet Password</label>
                            <input 
                                type="password" 
                                id="wallet-password" 
                                name="password" 
                                placeholder="Enter wallet password" 
                                required
                                class="form-input"
                            >
                            <small class="form-help">Required to authorize the transaction</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="dashboard.clearSendForm()">
                                Clear
                            </button>
                            <button type="submit" class="btn-primary">
                                💸 Send Transaction
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Transaction History -->
                <div class="wallet-card transaction-history">
                    <h3>Recent Transactions</h3>
                    <div class="transaction-list" id="transaction-list">
                        ${this.renderTransactionHistory(wallet.transactions || [])}
                    </div>
                    <div class="history-actions">
                        <button class="btn-small" onclick="dashboard.refreshTransactions()">
                            🔄 Refresh
                        </button>
                        <button class="btn-small" onclick="dashboard.exportTransactions()">
                            📥 Export
                        </button>
                    </div>
                </div>

                <!-- Wallet Actions -->
                <div class="wallet-card wallet-actions">
                    <h3>Wallet Actions</h3>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="dashboard.createNewWallet()">
                            ➕ Create New Wallet
                        </button>
                        <button class="action-btn" onclick="dashboard.backupWallet()">
                            💾 Backup Wallet
                        </button>
                        <button class="action-btn" onclick="dashboard.importWallet()">
                            📥 Import Wallet
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderTransactionHistory(transactions) {
        if (!transactions || transactions.length === 0) {
            return '<p class="no-transactions">No transactions found</p>';
        }

        return transactions.slice(0, 10).map(tx => `
            <div class="transaction-item ${tx.amount > 0 ? 'received' : 'sent'}">
                <div class="tx-main">
                    <div class="tx-type">
                        <span class="tx-icon">${tx.amount > 0 ? '📥' : '📤'}</span>
                        <span class="tx-label">${tx.amount > 0 ? 'Received' : 'Sent'}</span>
                    </div>
                    <div class="tx-amount">
                        <span class="amount ${this.sensitiveVisible ? '' : 'masked'}">
                            ${this.sensitiveVisible ? this.formatKAS(Math.abs(tx.amount)) : '••••••••'}
                        </span>
                        <span class="currency">KAS</span>
                    </div>
                </div>
                <div class="tx-details">
                    <div class="tx-info">
                        <span class="tx-date">${new Date(tx.timestamp).toLocaleString()}</span>
                        <span class="tx-status ${tx.status}">${tx.status}</span>
                    </div>
                    <div class="tx-id">
                        <span class="tx-hash ${this.sensitiveVisible ? '' : 'masked'}">
                            ${this.sensitiveVisible ? this.truncateHash(tx.txId) : '••••••••••••••••'}
                        </span>
                        ${this.sensitiveVisible ? `
                            <button class="btn-copy-small" onclick="dashboard.copyToClipboard('${tx.txId}')" title="Copy Transaction ID">
                                📋
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatKAS(amount) {
        return parseFloat(amount).toFixed(8);
    }

    truncateHash(hash) {
        if (!hash) return '';
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    }

    toggleSensitiveInfo() {
        this.sensitiveVisible = !this.sensitiveVisible;
        this.updateWalletDisplay();
    }

    async copyWalletAddress() {
        if (!this.walletInfo?.address) return;
        await this.copyToClipboard(this.walletInfo.address);
        this.showNotification('success', 'Wallet address copied to clipboard');
    }

    async refreshWallet() {
        await this.loadWalletInfo();
        this.showNotification('success', 'Wallet information refreshed');
    }

    async sendTransaction(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const transactionData = {
            to: formData.get('to'),
            amount: parseFloat(formData.get('amount')),
            fee: parseFloat(formData.get('fee')),
            password: formData.get('password')
        };

        // Validate transaction
        if (transactionData.amount + transactionData.fee > this.walletInfo.balance) {
            this.showNotification('error', 'Insufficient balance for transaction and fee');
            return;
        }

        try {
            const response = await fetch('/api/kaspa/wallet/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', `Transaction sent! ID: ${result.txId}`);
                this.clearSendForm();
                await this.refreshWallet();
            } else {
                this.showNotification('error', result.error || 'Transaction failed');
            }
        } catch (error) {
            this.showNotification('error', `Transaction failed: ${error.message}`);
        }
    }

    clearSendForm() {
        const form = document.getElementById('send-form');
        if (form) {
            form.reset();
        }
    }

    async refreshTransactions() {
        await this.loadWalletInfo();
        this.showNotification('success', 'Transaction history refreshed');
    }

    async exportTransactions() {
        if (!this.walletInfo?.transactions) {
            this.showNotification('error', 'No transactions to export');
            return;
        }

        const csv = this.transactionsToCsv(this.walletInfo.transactions);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaspa-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Transaction history exported');
    }

    transactionsToCsv(transactions) {
        const headers = ['Date', 'Type', 'Amount', 'Fee', 'Status', 'Transaction ID', 'Address'];
        const rows = transactions.map(tx => [
            new Date(tx.timestamp).toISOString(),
            tx.amount > 0 ? 'Received' : 'Sent',
            Math.abs(tx.amount),
            tx.fee || 0,
            tx.status,
            tx.txId,
            tx.amount > 0 ? tx.from[0] || '' : tx.to[0] || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    async createNewWallet() {
        const password = prompt('Enter a password for the new wallet:');
        if (!password) return;

        const confirmPassword = prompt('Confirm the password:');
        if (password !== confirmPassword) {
            this.showNotification('error', 'Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/kaspa/wallet/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', 'New wallet created successfully');
                await this.loadWalletInfo();
            } else {
                this.showNotification('error', result.error || 'Failed to create wallet');
            }
        } catch (error) {
            this.showNotification('error', `Failed to create wallet: ${error.message}`);
        }
    }

    async backupWallet() {
        try {
            const response = await fetch('/api/kaspa/wallet/backup', { method: 'POST' });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kaspa-wallet-backup-${new Date().toISOString().split('T')[0]}.dat`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                this.showNotification('success', 'Wallet backup downloaded');
            } else {
                this.showNotification('error', 'Failed to create wallet backup');
            }
        } catch (error) {
            this.showNotification('error', `Backup failed: ${error.message}`);
        }
    }

    async importWallet() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.dat,.json';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const password = prompt('Enter the wallet password:');
            if (!password) return;

            const formData = new FormData();
            formData.append('wallet', file);
            formData.append('password', password);

            try {
                const response = await fetch('/api/kaspa/wallet/import', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (response.ok) {
                    this.showNotification('success', 'Wallet imported successfully');
                    await this.loadWalletInfo();
                } else {
                    this.showNotification('error', result.error || 'Failed to import wallet');
                }
            } catch (error) {
                this.showNotification('error', `Import failed: ${error.message}`);
            }
        };

        input.click();
    }

    async loadUpdates() {
        try {
            const updates = await fetch('/api/updates/available').then(r => r.json());
            this.availableUpdates = updates;
            this.updateUpdatesBadge();
            
            // Load update history
            const history = await fetch('/api/updates/history').then(r => r.json());
            this.updateHistory = history;
        } catch (error) {
            console.error('Failed to load updates:', error);
            this.availableUpdates = [];
            this.updateHistory = [];
        }
    }

    updateUpdatesBadge() {
        const badge = document.getElementById('update-badge');
        const updatesBtn = document.getElementById('updates-btn');
        
        if (this.availableUpdates && this.availableUpdates.length > 0) {
            badge.textContent = this.availableUpdates.length;
            badge.style.display = 'block';
            updatesBtn.classList.add('has-updates');
        } else {
            badge.style.display = 'none';
            updatesBtn.classList.remove('has-updates');
        }
    }

    async openUpdatesModal() {
        const modal = document.getElementById('updates-modal');
        const summary = document.getElementById('updates-summary');
        const content = document.getElementById('updates-content');
        const history = document.getElementById('update-history');
        
        this.openModalAccessible('updates-modal');
        
        // Update summary
        if (this.availableUpdates && this.availableUpdates.length > 0) {
            summary.querySelector('.summary-text').textContent = 
                `${this.availableUpdates.length} update(s) available`;
            this.announceToScreenReader(`${this.availableUpdates.length} updates available`);
        } else {
            summary.querySelector('.summary-text').textContent = 'System is up to date';
        }
        
        // Render available updates
        content.innerHTML = this.renderAvailableUpdates();
        
        // Render update history
        history.innerHTML = this.renderUpdateHistory();
    }

    renderAvailableUpdates() {
        if (!this.availableUpdates || this.availableUpdates.length === 0) {
            return `
                <div class="no-updates">
                    <div class="no-updates-icon">✅</div>
                    <h3>All Up to Date</h3>
                    <p>Your system is running the latest versions of all services.</p>
                </div>
            `;
        }

        return `
            <div class="available-updates">
                ${this.availableUpdates.map(update => `
                    <div class="update-item ${update.breaking ? 'breaking' : ''}">
                        <div class="update-header">
                            <div class="update-info">
                                <h4 class="update-service">${update.service}</h4>
                                <div class="version-info">
                                    <span class="current-version">v${update.currentVersion}</span>
                                    <span class="version-arrow">→</span>
                                    <span class="new-version">v${update.availableVersion}</span>
                                </div>
                            </div>
                            <div class="update-badges">
                                ${update.breaking ? '<span class="breaking-badge">⚠️ Breaking</span>' : ''}
                                <span class="release-date">${new Date(update.releaseDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div class="update-changelog">
                            <details>
                                <summary>View Changelog</summary>
                                <div class="changelog-content">
                                    ${this.formatChangelog(update.changelog)}
                                </div>
                            </details>
                        </div>
                        
                        <div class="update-actions">
                            <button class="btn-primary update-btn" onclick="dashboard.applyUpdate('${update.service}')">
                                ${update.breaking ? '⚠️ Update (Breaking)' : '⬆️ Update'}
                            </button>
                            <button class="btn-small" onclick="dashboard.skipUpdate('${update.service}')">
                                Skip
                            </button>
                        </div>
                    </div>
                `).join('')}
                
                <div class="bulk-actions">
                    <button class="btn-primary bulk-update" onclick="dashboard.applyAllUpdates()">
                        ⬆️ Update All Services
                    </button>
                    <button class="btn-secondary" onclick="dashboard.launchWizardForUpdates()">
                        🧙 Use Installation Wizard
                    </button>
                </div>
            </div>
        `;
    }

    formatChangelog(changelog) {
        if (!changelog) return '<p>No changelog available</p>';
        
        // Convert markdown-style changelog to HTML
        return changelog
            .split('\n')
            .map(line => {
                line = line.trim();
                if (line.startsWith('## ')) {
                    return `<h4>${line.substring(3)}</h4>`;
                } else if (line.startsWith('- ')) {
                    return `<li>${line.substring(2)}</li>`;
                } else if (line.startsWith('* ')) {
                    return `<li>${line.substring(2)}</li>`;
                } else if (line) {
                    return `<p>${line}</p>`;
                }
                return '';
            })
            .join('');
    }

    renderUpdateHistory() {
        if (!this.updateHistory || this.updateHistory.length === 0) {
            return '<p class="no-history">No update history available</p>';
        }

        return this.updateHistory.slice(0, 10).map(update => `
            <div class="history-item ${update.success ? 'success' : 'failed'}">
                <div class="history-header">
                    <span class="history-service">${update.service}</span>
                    <span class="history-date">${new Date(update.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-details">
                    <span class="version-change">v${update.fromVersion} → v${update.toVersion}</span>
                    <span class="history-status ${update.success ? 'success' : 'failed'}">
                        ${update.success ? '✅ Success' : '❌ Failed'}
                    </span>
                </div>
                ${update.error ? `<div class="history-error">${update.error}</div>` : ''}
            </div>
        `).join('');
    }

    async checkForUpdates() {
        const summary = document.getElementById('updates-summary');
        const originalText = summary.querySelector('.summary-text').textContent;
        
        summary.querySelector('.summary-text').textContent = 'Checking for updates...';
        
        try {
            const response = await fetch('/api/updates/check', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
                await this.loadUpdates();
                this.openUpdatesModal(); // Refresh the modal content
                this.showNotification('success', 'Update check completed');
            } else {
                this.showNotification('error', result.error || 'Failed to check for updates');
                summary.querySelector('.summary-text').textContent = originalText;
            }
        } catch (error) {
            this.showNotification('error', `Update check failed: ${error.message}`);
            summary.querySelector('.summary-text').textContent = originalText;
        }
    }

    async applyUpdate(serviceName) {
        const update = this.availableUpdates.find(u => u.service === serviceName);
        if (!update) return;

        const confirmMessage = update.breaking 
            ? `This is a breaking update for ${serviceName}. It may require configuration changes. Continue?`
            : `Update ${serviceName} from v${update.currentVersion} to v${update.availableVersion}?`;
            
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch(`/api/updates/apply/${serviceName}`, { 
                method: 'POST' 
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', `Update for ${serviceName} started`);
                this.closeUpdatesModal();
                
                // Refresh updates after a delay
                setTimeout(() => this.loadUpdates(), 5000);
            } else {
                this.showNotification('error', result.error || 'Update failed');
            }
        } catch (error) {
            this.showNotification('error', `Update failed: ${error.message}`);
        }
    }

    async applyAllUpdates() {
        const breakingUpdates = this.availableUpdates.filter(u => u.breaking);
        
        let confirmMessage = `Apply all ${this.availableUpdates.length} available updates?`;
        if (breakingUpdates.length > 0) {
            confirmMessage += `\n\nWarning: ${breakingUpdates.length} breaking update(s) included:`;
            confirmMessage += breakingUpdates.map(u => `\n- ${u.service}`).join('');
        }
        
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch('/api/updates/apply-all', { 
                method: 'POST' 
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', 'Bulk update started');
                this.closeUpdatesModal();
                
                // Refresh updates after a delay
                setTimeout(() => this.loadUpdates(), 10000);
            } else {
                this.showNotification('error', result.error || 'Bulk update failed');
            }
        } catch (error) {
            this.showNotification('error', `Bulk update failed: ${error.message}`);
        }
    }

    async skipUpdate(serviceName) {
        try {
            const response = await fetch(`/api/updates/skip/${serviceName}`, { 
                method: 'POST' 
            });
            
            if (response.ok) {
                this.showNotification('info', `Update for ${serviceName} skipped`);
                await this.loadUpdates();
                this.openUpdatesModal(); // Refresh modal
            } else {
                this.showNotification('error', 'Failed to skip update');
            }
        } catch (error) {
            this.showNotification('error', `Failed to skip update: ${error.message}`);
        }
    }

    async launchWizardForUpdates() {
        try {
            const response = await fetch('/api/wizard/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mode: 'update',
                    updates: this.availableUpdates 
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.open(result.wizardUrl, '_blank');
                this.showNotification('success', 'Installation Wizard launched for updates');
                this.closeUpdatesModal();
            } else {
                this.showNotification('error', result.error || 'Failed to launch wizard');
            }
        } catch (error) {
            this.showNotification('error', `Failed to launch wizard: ${error.message}`);
        }
    }

    closeUpdatesModal() {
        this.closeModalAccessible('updates-modal');
    }

    getStatusText(status) {
        const statusMap = {
            'healthy': 'Running',
            'unhealthy': 'Unhealthy',
            'stopped': 'Stopped'
        };
        return statusMap[status] || status;
    }

    updateSystemResources(resources) {
        this.updateResourceBar('cpu', resources.cpu, resources);
        this.updateResourceBar('memory', resources.memory, resources);
        this.updateResourceBar('disk', resources.disk, resources);
        
        // Update system status
        this.updateSystemStatus(resources);
        
        // Update additional metrics
        this.updateSystemMetrics(resources);
        
        // Update per-service resources if available
        if (resources.perService) {
            this.updatePerServiceResources(resources.perService);
        }
        
        // Store for trend analysis
        this.storeResourceTrend(resources);
    }

    updateResourceBar(type, percentage, resources) {
        const progress = document.getElementById(`${type}-progress`);
        const text = document.getElementById(`${type}-text`);
        const threshold = document.getElementById(`${type}-threshold`);
        
        if (!progress || !text) return;
        
        progress.style.width = `${percentage}%`;
        text.textContent = `${percentage.toFixed(1)}%`;

        // Update color based on usage
        progress.className = 'progress';
        let thresholdText = '';
        
        if (percentage > 90) {
            progress.classList.add('critical');
            thresholdText = 'Critical';
        } else if (percentage > 80) {
            progress.classList.add('danger');
            thresholdText = 'High';
        } else if (percentage > 60) {
            progress.classList.add('warning');
            thresholdText = 'Moderate';
        } else {
            thresholdText = 'Normal';
        }
        
        if (threshold) {
            threshold.textContent = thresholdText;
            threshold.className = `threshold-indicator ${thresholdText.toLowerCase()}`;
        }
        
        // Update additional info
        if (type === 'cpu' && resources.loadAverage) {
            const loadEl = document.getElementById('load-average');
            if (loadEl) {
                loadEl.textContent = `Load: ${resources.loadAverage[0]?.toFixed(2) || '-'}`;
            }
        }
        
        if (type === 'memory' && resources.memoryInfo) {
            const memInfoEl = document.getElementById('memory-info');
            if (memInfoEl) {
                memInfoEl.textContent = `${resources.memoryInfo.used} / ${resources.memoryInfo.total}`;
            }
        }
        
        if (type === 'disk' && resources.diskInfo) {
            const diskInfoEl = document.getElementById('disk-info');
            if (diskInfoEl) {
                diskInfoEl.textContent = `${resources.diskInfo.used} / ${resources.diskInfo.total}`;
            }
        }
    }

    updateSystemStatus(resources) {
        const statusEl = document.getElementById('system-status');
        const statusText = statusEl.querySelector('.status-text');
        const emergencyBtn = document.getElementById('emergency-stop');
        
        const criticalCpu = resources.cpu > 90;
        const criticalMemory = resources.memory > 90;
        const criticalLoad = resources.loadAverage && resources.loadAverage[0] > 10;
        
        const isCritical = criticalCpu || criticalMemory || criticalLoad;
        
        if (isCritical) {
            statusText.textContent = 'System Status: Critical';
            statusText.className = 'status-text critical';
            emergencyBtn.style.display = 'block';
        } else if (resources.cpu > 80 || resources.memory > 85) {
            statusText.textContent = 'System Status: Warning';
            statusText.className = 'status-text warning';
            emergencyBtn.style.display = 'none';
        } else {
            statusText.textContent = 'System Status: Normal';
            statusText.className = 'status-text normal';
            emergencyBtn.style.display = 'none';
        }
    }

    updateSystemMetrics(resources) {
        const uptimeEl = document.getElementById('system-uptime');
        const containerCountEl = document.getElementById('container-count');
        
        if (uptimeEl && resources.uptime) {
            uptimeEl.textContent = this.formatUptime(resources.uptime);
        }
        
        if (containerCountEl && resources.containerCount !== undefined) {
            containerCountEl.textContent = resources.containerCount;
        }
    }

    updatePerServiceResources(perServiceData) {
        const container = document.getElementById('service-resources');
        const grid = document.getElementById('service-resource-grid');
        
        if (!perServiceData || Object.keys(perServiceData).length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        grid.innerHTML = Object.entries(perServiceData).map(([service, resources]) => `
            <div class="service-resource-item">
                <div class="service-name">${service}</div>
                <div class="service-metrics">
                    <div class="metric">
                        <span class="metric-label">CPU:</span>
                        <div class="mini-progress">
                            <div class="mini-progress-bar" style="width: ${resources.cpu}%"></div>
                        </div>
                        <span class="metric-value">${resources.cpu.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Memory:</span>
                        <div class="mini-progress">
                            <div class="mini-progress-bar" style="width: ${resources.memory}%"></div>
                        </div>
                        <span class="metric-value">${resources.memory.toFixed(1)}%</span>
                    </div>
                    <div class="metric-limits">
                        <span class="limits-text">${resources.memoryUsage || 'No limit'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    storeResourceTrend(resources) {
        if (!this.resourceHistory) {
            this.resourceHistory = {
                cpu: [],
                memory: [],
                timestamps: []
            };
        }
        
        const now = Date.now();
        this.resourceHistory.cpu.push(resources.cpu);
        this.resourceHistory.memory.push(resources.memory);
        this.resourceHistory.timestamps.push(now);
        
        // Keep only last hour of data (assuming 5-second intervals)
        const maxPoints = 720; // 1 hour at 5-second intervals
        if (this.resourceHistory.cpu.length > maxPoints) {
            this.resourceHistory.cpu.shift();
            this.resourceHistory.memory.shift();
            this.resourceHistory.timestamps.shift();
        }
        
        // Update trend charts if visible
        if (document.getElementById('resource-trends').style.display !== 'none') {
            this.updateTrendCharts();
        }
    }

    async toggleResourceMonitoring() {
        const statusBtn = document.getElementById('monitoring-status');
        
        try {
            const response = await fetch('/api/monitoring/toggle', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
                const isEnabled = result.enabled;
                statusBtn.textContent = `${isEnabled ? '🟢' : '🔴'} Monitoring: ${isEnabled ? 'On' : 'Off'}`;
                statusBtn.className = `btn-small monitoring-indicator ${isEnabled ? 'enabled' : 'disabled'}`;
                
                this.showNotification('success', `Resource monitoring ${isEnabled ? 'enabled' : 'disabled'}`);
            } else {
                this.showNotification('error', result.error || 'Failed to toggle monitoring');
            }
        } catch (error) {
            this.showNotification('error', `Monitoring toggle failed: ${error.message}`);
        }
    }

    async quickResourceCheck() {
        try {
            const response = await fetch('/api/monitoring/quick-check', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', 'Quick resource check completed');
                
                // Show results in a modal or notification
                if (result.alerts && result.alerts.length > 0) {
                    const alertMsg = result.alerts.map(alert => alert.message).join('\n');
                    alert(`Resource Check Results:\n\n${alertMsg}`);
                }
            } else {
                this.showNotification('error', result.error || 'Quick check failed');
            }
        } catch (error) {
            this.showNotification('error', `Quick check failed: ${error.message}`);
        }
    }

    async emergencyStop() {
        const confirmed = confirm(
            'EMERGENCY STOP will immediately stop all non-essential services to free up system resources.\n\n' +
            'This action should only be used when the system is critically overloaded.\n\n' +
            'Continue with emergency stop?'
        );
        
        if (!confirmed) return;
        
        try {
            const response = await fetch('/api/system/emergency-stop', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('success', 'Emergency stop initiated');
                
                // Show progress or results
                if (result.output) {
                    console.log('Emergency stop output:', result.output);
                }
                
                // Refresh services after a delay
                setTimeout(() => {
                    this.refreshServices();
                }, 5000);
            } else {
                this.showNotification('error', result.error || 'Emergency stop failed');
            }
        } catch (error) {
            this.showNotification('error', `Emergency stop failed: ${error.message}`);
        }
    }

    async showDockerLimits() {
        try {
            const response = await fetch('/api/system/resources/limits');
            const limits = await response.json();
            
            if (response.ok) {
                const limitsText = Object.entries(limits).map(([container, limit]) => 
                    `${container}: CPU: ${limit.cpu || 'No limit'}, Memory: ${limit.memoryFormatted || 'No limit'}`
                ).join('\n');
                
                alert(`Docker Container Limits:\n\n${limitsText}`);
            } else {
                this.showNotification('error', 'Failed to load Docker limits');
            }
        } catch (error) {
            this.showNotification('error', `Failed to load limits: ${error.message}`);
        }
    }

    updateTrendCharts() {
        // Simple trend chart implementation
        // In a real implementation, you'd use a charting library like Chart.js
        const cpuCanvas = document.getElementById('cpu-trend-chart');
        const memoryCanvas = document.getElementById('memory-trend-chart');
        
        if (!cpuCanvas || !memoryCanvas || !this.resourceHistory) return;
        
        this.drawTrendChart(cpuCanvas, this.resourceHistory.cpu, 'CPU Usage', '#4299e1');
        this.drawTrendChart(memoryCanvas, this.resourceHistory.memory, 'Memory Usage', '#48bb78');
    }

    drawTrendChart(canvas, data, title, color) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (data.length < 2) return;
        
        // Draw title
        ctx.fillStyle = '#2d3748';
        ctx.font = '14px sans-serif';
        ctx.fillText(title, 10, 20);
        
        // Draw chart area
        const chartTop = 30;
        const chartHeight = height - 50;
        const chartWidth = width - 40;
        
        // Draw grid
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = chartTop + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(20, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
            
            // Y-axis labels
            ctx.fillStyle = '#718096';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${100 - (i * 25)}%`, 2, y + 3);
        }
        
        // Draw data line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = chartWidth / (data.length - 1);
        
        data.forEach((value, index) => {
            const x = 20 + index * stepX;
            const y = chartTop + chartHeight - (value / 100) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw current value
        ctx.fillStyle = color;
        ctx.font = '12px sans-serif';
        const currentValue = data[data.length - 1];
        ctx.fillText(`${currentValue.toFixed(1)}%`, width - 60, chartTop + 15);
    }

    async startService(serviceName) {
        try {
            const response = await fetch(`/api/services/${serviceName}/start`, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                this.showNotification('success', result.message);
            } else {
                this.showNotification('error', result.error);
            }
        } catch (error) {
            this.showNotification('error', `Failed to start service: ${error.message}`);
        }
    }

    async stopService(serviceName) {
        if (!confirm(`Are you sure you want to stop ${serviceName}?`)) return;
        
        try {
            const response = await fetch(`/api/services/${serviceName}/stop`, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                this.showNotification('success', result.message);
            } else {
                this.showNotification('error', result.error);
            }
        } catch (error) {
            this.showNotification('error', `Failed to stop service: ${error.message}`);
        }
    }

    async restartService(serviceName) {
        if (!confirm(`Are you sure you want to restart ${serviceName}?`)) return;
        
        try {
            const response = await fetch(`/api/services/${serviceName}/restart`, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                this.showNotification('success', result.message);
            } else {
                this.showNotification('error', result.error);
            }
        } catch (error) {
            this.showNotification('error', `Failed to restart service: ${error.message}`);
        }
    }

    async viewServiceLogs(serviceName) {
        const modal = document.getElementById('logs-modal');
        const logsContent = document.getElementById('logs-content');
        const logsTitle = document.getElementById('logs-title');
        
        modal.style.display = 'block';
        logsTitle.textContent = `${serviceName} Logs`;
        logsContent.textContent = 'Loading logs...';
        
        try {
            const response = await fetch(`/api/services/${serviceName}/logs`);
            const data = await response.json();
            logsContent.textContent = data.logs;
            
            // Subscribe to real-time log updates
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'subscribe_logs',
                    serviceName
                }));
            }
        } catch (error) {
            logsContent.textContent = 'Failed to load logs: ' + error.message;
        }
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.ws.readyState !== WebSocket.OPEN) {
                this.setupWebSocket();
            }
        });

        // Profile filter
        const profileFilter = document.getElementById('profile-filter');
        if (profileFilter) {
            profileFilter.addEventListener('change', () => {
                this.loadInitialData();
            });
        }

        // Configuration modal
        const configBtn = document.getElementById('config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.openConfigModal());
        }

        // Keyboard navigation support
        this.setupKeyboardNavigation();
        
        // Modal accessibility
        this.setupModalAccessibility();
        
        // Focus management
        this.setupFocusManagement();
    }

    setupKeyboardNavigation() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Alt + R to refresh services
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                this.refreshServices();
                this.announceToScreenReader('Services refreshed');
            }
            
            // Alt + U to check updates
            if (e.altKey && e.key === 'u') {
                e.preventDefault();
                this.openUpdatesModal();
            }
            
            // Alt + C to open configuration
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                this.openConfigModal();
            }
        });

        // Tab navigation for service cards
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            }
        });

        // Arrow key navigation for grids
        this.setupArrowKeyNavigation();
    }

    setupArrowKeyNavigation() {
        const grids = [
            document.getElementById('services-grid'),
            document.querySelector('.actions-grid'),
            document.querySelector('.resource-cards'),
            document.querySelector('.applications-grid')
        ];

        grids.forEach(grid => {
            if (!grid) return;
            
            grid.addEventListener('keydown', (e) => {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    this.handleArrowNavigation(e, grid);
                }
            });
        });
    }

    handleArrowNavigation(e, grid) {
        const focusableElements = grid.querySelectorAll('button, [tabindex="0"]');
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
        
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        const gridColumns = this.getGridColumns(grid);
        
        switch (e.key) {
            case 'ArrowUp':
                newIndex = Math.max(0, currentIndex - gridColumns);
                break;
            case 'ArrowDown':
                newIndex = Math.min(focusableElements.length - 1, currentIndex + gridColumns);
                break;
            case 'ArrowLeft':
                newIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                newIndex = Math.min(focusableElements.length - 1, currentIndex + 1);
                break;
        }
        
        if (newIndex !== currentIndex) {
            e.preventDefault();
            focusableElements[newIndex].focus();
        }
    }

    getGridColumns(grid) {
        const computedStyle = window.getComputedStyle(grid);
        const gridTemplateColumns = computedStyle.gridTemplateColumns;
        return gridTemplateColumns.split(' ').length;
    }

    setupModalAccessibility() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Set initial aria-hidden
            modal.setAttribute('aria-hidden', 'true');
            
            // Trap focus within modal when open
            modal.addEventListener('keydown', (e) => {
                if (modal.getAttribute('aria-hidden') === 'false') {
                    this.trapFocus(e, modal);
                }
            });
        });
    }

    trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    }

    setupFocusManagement() {
        // Store focus before opening modals
        this.lastFocusedElement = null;
        
        // Restore focus when closing modals
        document.addEventListener('modalClosed', () => {
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
                this.lastFocusedElement = null;
            }
        });
    }

    openModalAccessible(modalId) {
        this.lastFocusedElement = document.activeElement;
        const modal = document.getElementById(modalId);
        
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus first focusable element in modal
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeModalAccessible(modalId) {
        const modal = document.getElementById(modalId);
        
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Dispatch custom event for focus restoration
        document.dispatchEvent(new CustomEvent('modalClosed'));
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                this.closeModalAccessible(modal.id);
            }
        });
    }

    // Announce status changes to screen readers
    announceToScreenReader(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    async openConfigModal() {
        const modal = document.getElementById('config-modal');
        const configForm = document.getElementById('config-form');
        
        this.openModalAccessible('config-modal');
        configForm.innerHTML = '<p>Loading configuration...</p>';
        
        try {
            const config = await fetch('/api/config').then(r => r.json());
            configForm.innerHTML = Object.entries(config).map(([key, value]) => `
                <div class="config-item">
                    <label for="config-${key}">${key}</label>
                    <input type="text" id="config-${key}" name="${key}" value="${value}" aria-describedby="config-${key}-help">
                    <small id="config-${key}-help" class="form-help">Configuration value for ${key}</small>
                </div>
            `).join('');
            
            configForm.innerHTML += `
                <div class="config-actions">
                    <button type="button" onclick="dashboard.saveConfig()" class="btn-primary">Save Configuration</button>
                    <button type="button" onclick="dashboard.closeConfigModal()" class="btn-secondary">Cancel</button>
                </div>
            `;
        } catch (error) {
            configForm.innerHTML = `<p class="error" role="alert">Failed to load configuration: ${error.message}</p>`;
        }
    }

    async saveConfig() {
        const configForm = document.getElementById('config-form');
        const inputs = configForm.querySelectorAll('input');
        const updates = {};
        
        inputs.forEach(input => {
            updates[input.name] = input.value;
        });
        
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            if (response.ok) {
                this.showNotification('success', 'Configuration updated successfully');
                this.closeConfigModal();
            } else {
                this.showNotification('error', result.error);
            }
        } catch (error) {
            this.showNotification('error', `Failed to save configuration: ${error.message}`);
        }
    }

    closeConfigModal() {
        this.closeModalAccessible('config-modal');
    }

    formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num?.toString() || '0';
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m ${seconds % 60}s`;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Global functions for button actions
async function restartAllServices() {
    if (confirm('Are you sure you want to restart all services?')) {
        try {
            const response = await fetch('/api/restart', { method: 'POST' });
            if (response.ok) {
                dashboard.showNotification('success', 'Services restart initiated');
                setTimeout(() => window.location.reload(), 3000);
            } else {
                dashboard.showNotification('error', 'Failed to restart services');
            }
        } catch (error) {
            dashboard.showNotification('error', 'Error: ' + error.message);
        }
    }
}

function closeLogs() {
    document.getElementById('logs-modal').style.display = 'none';
}

async function updateServices() {
    if (confirm('This will update all services to the latest versions. Continue?')) {
        try {
            const response = await fetch('/api/update', { method: 'POST' });
            if (response.ok) {
                dashboard.showNotification('success', 'Update initiated. This may take several minutes.');
            } else {
                dashboard.showNotification('error', 'Failed to start update');
            }
        } catch (error) {
            dashboard.showNotification('error', 'Error: ' + error.message);
        }
    }
}

async function backupData() {
    try {
        const response = await fetch('/api/backup', { method: 'POST' });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kaspa-backup-${new Date().toISOString().split('T')[0]}.tar.gz`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            dashboard.showNotification('error', 'Failed to create backup');
        }
    } catch (error) {
        dashboard.showNotification('error', 'Error: ' + error.message);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const logsModal = document.getElementById('logs-modal');
    const configModal = document.getElementById('config-modal');
    const updatesModal = document.getElementById('updates-modal');
    const dependencyModal = document.getElementById('dependency-modal');
    
    if (event.target === logsModal) {
        logsModal.style.display = 'none';
    }
    if (event.target === configModal) {
        configModal.style.display = 'none';
    }
    if (event.target === updatesModal) {
        updatesModal.style.display = 'none';
    }
    if (event.target === dependencyModal) {
        dependencyModal.style.display = 'none';
    }
}

// Global dashboard instance
let dashboard;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KaspaDashboard();
});
