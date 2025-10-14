class KaspaDashboard {
    constructor() {
        this.updateInterval = null;
        this.connectionStatus = document.getElementById('connection-status');
        this.init();
    }

    async init() {
        this.updateConnectionStatus(true);
        await this.loadInitialData();
        this.startPeriodicUpdates();
        this.setupEventListeners();
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
                this.updateServicesStatus(),
                this.updateSystemResources()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.updateConnectionStatus(false);
        }
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

    async updateServicesStatus() {
        try {
            const services = await fetch('/api/status').then(r => r.json());
            const servicesGrid = document.getElementById('services-grid');
            
            servicesGrid.innerHTML = services.map(service => `
                <div class="service-card ${service.status === 'healthy' ? '' : 'unhealthy'}">
                    <h3>${service.name}</h3>
                    <div class="service-status ${service.status === 'healthy' ? '' : 'unhealthy'}">
                        <span class="indicator"></span>
                        <span>${service.status === 'healthy' ? 'Running' : 'Stopped'}</span>
                    </div>
                    <small>Last check: ${new Date(service.lastCheck).toLocaleTimeString()}</small>
                    ${service.error ? `<div class="error-msg">${service.error}</div>` : ''}
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to update services status:', error);
        }
    }

    async updateSystemResources() {
        // Mock system resource data - in production, this would come from the backend
        const mockResources = {
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            disk: Math.random() * 100
        };

        this.updateResourceBar('cpu', mockResources.cpu);
        this.updateResourceBar('memory', mockResources.memory);
        this.updateResourceBar('disk', mockResources.disk);
    }

    updateResourceBar(type, percentage) {
        const progress = document.getElementById(`${type}-progress`);
        const text = document.getElementById(`${type}-text`);
        
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

    startPeriodicUpdates() {
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadInitialData();
                this.updateConnectionStatus(true);
            } catch (error) {
                console.error('Periodic update failed:', error);
                this.updateConnectionStatus(false);
            }
        }, 30000); // Update every 30 seconds
    }

    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }
            } else {
                this.startPeriodicUpdates();
            }
        });

        // Handle window beforeunload
        window.addEventListener('beforeunload', () => {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
            }
        });
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
}

// Global functions for button actions
async function restartServices() {
    if (confirm('Are you sure you want to restart all services?')) {
        try {
            const response = await fetch('/api/restart', { method: 'POST' });
            if (response.ok) {
                alert('Services restart initiated');
                setTimeout(() => window.location.reload(), 3000);
            } else {
                alert('Failed to restart services');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}

async function viewLogs() {
    const modal = document.getElementById('logs-modal');
    const logsContent = document.getElementById('logs-content');
    
    modal.style.display = 'block';
    logsContent.textContent = 'Loading logs...';
    
    try {
        const response = await fetch('/api/logs');
        const logs = await response.text();
        logsContent.textContent = logs;
    } catch (error) {
        logsContent.textContent = 'Failed to load logs: ' + error.message;
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
                alert('Update initiated. This may take several minutes.');
            } else {
                alert('Failed to start update');
            }
        } catch (error) {
            alert('Error: ' + error.message);
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
            alert('Failed to create backup');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('logs-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new KaspaDashboard();
});