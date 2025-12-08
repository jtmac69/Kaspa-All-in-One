class KaspaDashboard {
    constructor() {
        this.updateInterval = null;
        this.ws = null;
        this.connectionStatus = document.getElementById('connection-status');
        this.activeProfiles = new Set(['core']);
        this.logStreams = new Map();
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
            this.updateServicesStatus(data.services);
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
                this.loadDependencies()
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

            // Update node info
            document.getElementById('node-version').textContent = info.serverVersion || '-';
            document.getElementById('sync-status').textContent = info.isSynced ? 'Synced' : 'Syncing';
            
            // Update network stats
            if (stats.blockDag) {
                document.getElementById('block-height').textContent = 
                    this.formatNumber(stats.blockDag.virtualSelectedParentBlueScore);
                document.getElementById('difficulty').textContent = 
                    this.formatNumber(stats.blockDag.difficulty);
            }

            // Update peer count
            document.getElementById('peer-count').textContent = info.peerCount || '0';

            // Calculate uptime (mock for now)
            document.getElementById('uptime').textContent = this.formatUptime(Date.now() - 86400000);

        } catch (error) {
            console.error('Failed to update Kaspa stats:', error);
        }
    }

    updateServicesStatus(services) {
        const servicesGrid = document.getElementById('services-grid');
        const selectedProfile = document.getElementById('profile-filter')?.value || 'all';
        
        const filteredServices = services.filter(service => 
            selectedProfile === 'all' || service.profile === selectedProfile
        );
        
        servicesGrid.innerHTML = filteredServices.map(service => `
            <div class="service-card ${service.status === 'healthy' ? '' : service.status === 'stopped' ? 'stopped' : 'unhealthy'}">
                <div class="service-header">
                    <h3>${service.displayName}</h3>
                    <span class="profile-badge">${service.profile}</span>
                </div>
                <div class="service-status ${service.status}">
                    <span class="indicator"></span>
                    <span>${this.getStatusText(service.status)}</span>
                </div>
                <small>Last check: ${new Date(service.lastCheck).toLocaleTimeString()}</small>
                ${service.error ? `<div class="error-msg">${service.error}</div>` : ''}
                <div class="service-actions">
                    ${service.status === 'stopped' ? 
                        `<button onclick="dashboard.startService('${service.name}')" class="btn-small btn-success">Start</button>` :
                        `<button onclick="dashboard.stopService('${service.name}')" class="btn-small btn-danger">Stop</button>`
                    }
                    <button onclick="dashboard.restartService('${service.name}')" class="btn-small">Restart</button>
                    <button onclick="dashboard.viewServiceLogs('${service.name}')" class="btn-small">Logs</button>
                </div>
                ${this.renderDependencies(service.name)}
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

    getStatusText(status) {
        const statusMap = {
            'healthy': 'Running',
            'unhealthy': 'Unhealthy',
            'stopped': 'Stopped'
        };
        return statusMap[status] || status;
    }

    updateSystemResources(resources) {
        this.updateResourceBar('cpu', resources.cpu);
        this.updateResourceBar('memory', resources.memory);
        this.updateResourceBar('disk', resources.disk);
    }

    updateResourceBar(type, percentage) {
        const progress = document.getElementById(`${type}-progress`);
        const text = document.getElementById(`${type}-text`);
        
        if (!progress || !text) return;
        
        progress.style.width = `${percentage}%`;
        text.textContent = `${percentage.toFixed(1)}%`;

        // Update color based on usage
        progress.className = 'progress';
        if (percentage > 80) {
            progress.classList.add('danger');
        } else if (percentage > 60) {
            progress.classList.add('warning');
        }
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
    }

    async openConfigModal() {
        const modal = document.getElementById('config-modal');
        const configForm = document.getElementById('config-form');
        
        modal.style.display = 'block';
        configForm.innerHTML = '<p>Loading configuration...</p>';
        
        try {
            const config = await fetch('/api/config').then(r => r.json());
            configForm.innerHTML = Object.entries(config).map(([key, value]) => `
                <div class="config-item">
                    <label for="config-${key}">${key}</label>
                    <input type="text" id="config-${key}" name="${key}" value="${value}">
                </div>
            `).join('');
            
            configForm.innerHTML += `
                <div class="config-actions">
                    <button type="button" onclick="dashboard.saveConfig()" class="btn-primary">Save</button>
                    <button type="button" onclick="dashboard.closeConfigModal()" class="btn-secondary">Cancel</button>
                </div>
            `;
        } catch (error) {
            configForm.innerHTML = `<p class="error">Failed to load configuration: ${error.message}</p>`;
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
        document.getElementById('config-modal').style.display = 'none';
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
    
    if (event.target === logsModal) {
        logsModal.style.display = 'none';
    }
    if (event.target === configModal) {
        configModal.style.display = 'none';
    }
}

// Global dashboard instance
let dashboard;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new KaspaDashboard();
});
