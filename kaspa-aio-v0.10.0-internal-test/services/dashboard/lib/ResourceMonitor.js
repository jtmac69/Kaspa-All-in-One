const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class ResourceMonitor {
    constructor() {
        this.historyFile = '/app/data/resource-history.json';
        this.historyRetentionHours = 24;
        this.maxHistoryEntries = 1440; // 24 hours * 60 minutes
        this.alertThresholds = {
            cpu: { warning: 80, critical: 90 },
            memory: { warning: 85, critical: 90 },
            disk: { warning: 80, critical: 90 },
            load: { warning: 8.0, critical: 10.0 }
        };
        this.monitoringScripts = {
            resourceMonitor: './scripts/monitoring/resource-monitor.sh',
            emergencyStop: './scripts/monitoring/emergency-stop.sh',
            quickCheck: './scripts/monitoring/quick-check.sh'
        };
        
        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        try {
            await fs.mkdir('/app/data', { recursive: true });
        } catch (error) {
            console.warn('Failed to create data directory:', error.message);
        }
    }

    async getSystemResources() {
        try {
            const [cpu, memory, disk, loadAverage, uptime] = await Promise.all([
                this.getCpuUsage(),
                this.getMemoryUsage(),
                this.getDiskUsage(),
                this.getLoadAverage(),
                this.getSystemUptime()
            ]);

            const metrics = {
                cpu,
                memory,
                disk,
                loadAverage,
                uptime,
                timestamp: new Date().toISOString()
            };

            // Generate alerts based on thresholds
            metrics.alerts = this.checkAlertThresholds(metrics);

            // Save to history
            await this.saveToHistory(metrics);

            return metrics;
        } catch (error) {
            throw new Error(`Failed to get system resources: ${error.message}`);
        }
    }

    async getCpuUsage() {
        try {
            // Get CPU usage from /proc/stat
            const { stdout } = await execAsync(
                "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'"
            );
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            // Fallback to top command
            try {
                const { stdout } = await execAsync(
                    "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
                );
                return parseFloat(stdout.trim()) || 0;
            } catch (fallbackError) {
                console.warn('Failed to get CPU usage:', error.message);
                return 0;
            }
        }
    }

    async getMemoryUsage() {
        try {
            const { stdout } = await execAsync(
                "free | grep Mem | awk '{print ($3/$2) * 100.0}'"
            );
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            console.warn('Failed to get memory usage:', error.message);
            return 0;
        }
    }

    async getDiskUsage() {
        try {
            const { stdout } = await execAsync(
                "df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1"
            );
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            console.warn('Failed to get disk usage:', error.message);
            return 0;
        }
    }

    async getLoadAverage() {
        try {
            const { stdout } = await execAsync(
                "uptime | awk -F'load average:' '{print $2}'"
            );
            const loads = stdout.trim().split(',').map(x => parseFloat(x.trim()));
            return {
                '1min': loads[0] || 0,
                '5min': loads[1] || 0,
                '15min': loads[2] || 0
            };
        } catch (error) {
            console.warn('Failed to get load average:', error.message);
            return { '1min': 0, '5min': 0, '15min': 0 };
        }
    }

    async getSystemUptime() {
        try {
            const { stdout } = await execAsync("cat /proc/uptime | awk '{print $1}'");
            return parseFloat(stdout.trim()) || 0;
        } catch (error) {
            console.warn('Failed to get system uptime:', error.message);
            return 0;
        }
    }

    async getPerServiceResources() {
        try {
            const { stdout } = await execAsync(
                "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'"
            );

            const resources = new Map();
            const lines = stdout.trim().split('\n').slice(1); // Skip header

            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length >= 5) {
                    const [name, cpu, memPerc, memUsage, netIO, blockIO] = parts;
                    resources.set(name, {
                        cpu: parseFloat(cpu.replace('%', '')) || 0,
                        memory: parseFloat(memPerc.replace('%', '')) || 0,
                        memoryUsage: memUsage || '0B / 0B',
                        networkIO: netIO || '0B / 0B',
                        blockIO: blockIO || '0B / 0B'
                    });
                }
            });

            return resources;
        } catch (error) {
            console.warn('Failed to get per-service resources:', error.message);
            return new Map();
        }
    }

    async getDockerResourceLimits() {
        try {
            const { stdout } = await execAsync(
                "docker inspect $(docker ps -q) --format '{{.Name}}\t{{.HostConfig.Memory}}\t{{.HostConfig.CpuQuota}}\t{{.HostConfig.CpuPeriod}}' 2>/dev/null || echo ''"
            );

            const limits = new Map();
            
            if (stdout.trim()) {
                stdout.trim().split('\n').forEach(line => {
                    const [name, memory, cpuQuota, cpuPeriod] = line.split('\t');
                    if (name) {
                        const cleanName = name.replace('/', '');
                        const memoryLimit = parseInt(memory) || null;
                        const cpuLimit = (cpuQuota && cpuPeriod && parseInt(cpuQuota) > 0) 
                            ? (parseInt(cpuQuota) / parseInt(cpuPeriod)) * 100 
                            : null;

                        limits.set(cleanName, {
                            memory: memoryLimit,
                            cpu: cpuLimit,
                            memoryFormatted: memoryLimit ? this.formatBytes(memoryLimit) : 'No limit',
                            cpuFormatted: cpuLimit ? `${cpuLimit.toFixed(1)}%` : 'No limit'
                        });
                    }
                });
            }

            return limits;
        } catch (error) {
            console.warn('Failed to get Docker resource limits:', error.message);
            return new Map();
        }
    }

    async getDetailedResourceMetrics() {
        try {
            const [systemResources, serviceResources, resourceLimits] = await Promise.all([
                this.getSystemResources(),
                this.getPerServiceResources(),
                this.getDockerResourceLimits()
            ]);

            return {
                system: systemResources,
                services: Object.fromEntries(serviceResources),
                limits: Object.fromEntries(resourceLimits),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to get detailed resource metrics: ${error.message}`);
        }
    }

    checkAlertThresholds(metrics) {
        const alerts = [];

        // CPU alerts
        if (metrics.cpu >= this.alertThresholds.cpu.critical) {
            alerts.push({
                type: 'cpu',
                level: 'critical',
                message: `CPU usage critical: ${metrics.cpu.toFixed(1)}%`,
                threshold: this.alertThresholds.cpu.critical,
                current: metrics.cpu,
                action: 'emergency_stop_available'
            });
        } else if (metrics.cpu >= this.alertThresholds.cpu.warning) {
            alerts.push({
                type: 'cpu',
                level: 'warning',
                message: `CPU usage high: ${metrics.cpu.toFixed(1)}%`,
                threshold: this.alertThresholds.cpu.warning,
                current: metrics.cpu
            });
        }

        // Memory alerts
        if (metrics.memory >= this.alertThresholds.memory.critical) {
            alerts.push({
                type: 'memory',
                level: 'critical',
                message: `Memory usage critical: ${metrics.memory.toFixed(1)}%`,
                threshold: this.alertThresholds.memory.critical,
                current: metrics.memory,
                action: 'emergency_stop_available'
            });
        } else if (metrics.memory >= this.alertThresholds.memory.warning) {
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: `Memory usage high: ${metrics.memory.toFixed(1)}%`,
                threshold: this.alertThresholds.memory.warning,
                current: metrics.memory
            });
        }

        // Disk alerts
        if (metrics.disk >= this.alertThresholds.disk.critical) {
            alerts.push({
                type: 'disk',
                level: 'critical',
                message: `Disk usage critical: ${metrics.disk.toFixed(1)}%`,
                threshold: this.alertThresholds.disk.critical,
                current: metrics.disk
            });
        } else if (metrics.disk >= this.alertThresholds.disk.warning) {
            alerts.push({
                type: 'disk',
                level: 'warning',
                message: `Disk usage high: ${metrics.disk.toFixed(1)}%`,
                threshold: this.alertThresholds.disk.warning,
                current: metrics.disk
            });
        }

        // Load average alerts
        const load1min = metrics.loadAverage['1min'];
        if (load1min >= this.alertThresholds.load.critical) {
            alerts.push({
                type: 'load',
                level: 'critical',
                message: `Load average critical: ${load1min.toFixed(2)}`,
                threshold: this.alertThresholds.load.critical,
                current: load1min,
                action: 'emergency_stop_available'
            });
        } else if (load1min >= this.alertThresholds.load.warning) {
            alerts.push({
                type: 'load',
                level: 'warning',
                message: `Load average high: ${load1min.toFixed(2)}`,
                threshold: this.alertThresholds.load.warning,
                current: load1min
            });
        }

        return alerts;
    }

    async executeEmergencyStop() {
        try {
            console.log('Executing emergency stop...');
            const { stdout, stderr } = await execAsync(this.monitoringScripts.emergencyStop, {
                timeout: 30000 // 30 seconds timeout
            });

            return {
                success: true,
                output: stdout,
                errors: stderr,
                timestamp: new Date().toISOString(),
                message: 'Emergency stop executed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                message: 'Emergency stop failed'
            };
        }
    }

    async executeQuickCheck() {
        try {
            const { stdout, stderr } = await execAsync(this.monitoringScripts.quickCheck, {
                timeout: 15000 // 15 seconds timeout
            });

            return {
                success: true,
                output: stdout,
                errors: stderr,
                timestamp: new Date().toISOString(),
                message: 'Quick check completed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                message: 'Quick check failed'
            };
        }
    }

    async startResourceMonitoring() {
        try {
            // Check if monitoring script exists
            await fs.access(this.monitoringScripts.resourceMonitor);
            
            const { stdout, stderr } = await execAsync(`nohup ${this.monitoringScripts.resourceMonitor} > /dev/null 2>&1 &`);

            return {
                success: true,
                output: stdout,
                errors: stderr,
                timestamp: new Date().toISOString(),
                message: 'Resource monitoring started'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                message: 'Failed to start resource monitoring'
            };
        }
    }

    async stopResourceMonitoring() {
        try {
            // Kill any running resource monitor processes
            await execAsync("pkill -f 'resource-monitor.sh' || true");

            return {
                success: true,
                timestamp: new Date().toISOString(),
                message: 'Resource monitoring stopped'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                message: 'Failed to stop resource monitoring'
            };
        }
    }

    async getMonitoringStatus() {
        try {
            // Check if resource monitor is running
            const { stdout } = await execAsync("pgrep -f 'resource-monitor.sh' | wc -l");
            const isRunning = parseInt(stdout.trim()) > 0;

            // Get last check time from history
            const history = await this.getResourceHistory(1);
            const lastCheck = history.length > 0 ? history[0].timestamp : null;

            // Count current alerts
            const currentMetrics = await this.getSystemResources();
            const criticalAlerts = currentMetrics.alerts.filter(alert => alert.level === 'critical').length;
            const totalAlerts = currentMetrics.alerts.length;

            return {
                enabled: true, // Always enabled in this implementation
                running: isRunning,
                lastCheck,
                alertCount: totalAlerts,
                criticalAlerts,
                scriptsAvailable: await this.checkScriptAvailability()
            };
        } catch (error) {
            return {
                enabled: false,
                running: false,
                lastCheck: null,
                alertCount: 0,
                criticalAlerts: 0,
                error: error.message
            };
        }
    }

    async checkScriptAvailability() {
        const scripts = {};
        
        for (const [name, scriptPath] of Object.entries(this.monitoringScripts)) {
            try {
                await fs.access(scriptPath);
                scripts[name] = true;
            } catch (error) {
                scripts[name] = false;
            }
        }

        return scripts;
    }

    async saveToHistory(metrics) {
        try {
            const history = await this.getResourceHistory();
            
            // Add new entry
            history.unshift({
                timestamp: metrics.timestamp,
                cpu: metrics.cpu,
                memory: metrics.memory,
                disk: metrics.disk,
                loadAverage: metrics.loadAverage,
                alertCount: metrics.alerts.length,
                criticalAlerts: metrics.alerts.filter(a => a.level === 'critical').length
            });

            // Trim to max entries
            const trimmedHistory = history.slice(0, this.maxHistoryEntries);

            await fs.writeFile(this.historyFile, JSON.stringify(trimmedHistory, null, 2));
        } catch (error) {
            console.warn('Failed to save resource history:', error.message);
        }
    }

    async getResourceHistory(limit = null) {
        try {
            const historyData = await fs.readFile(this.historyFile, 'utf-8');
            const history = JSON.parse(historyData);
            
            return limit ? history.slice(0, limit) : history;
        } catch (error) {
            return [];
        }
    }

    async getResourceTrends(hours = 1) {
        try {
            const history = await this.getResourceHistory();
            const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
            
            const recentHistory = history.filter(entry => 
                new Date(entry.timestamp) >= cutoffTime
            );

            if (recentHistory.length < 2) {
                return {
                    cpu: 'stable',
                    memory: 'stable',
                    disk: 'stable',
                    load: 'stable'
                };
            }

            const latest = recentHistory[0];
            const oldest = recentHistory[recentHistory.length - 1];

            return {
                cpu: this.calculateTrend(oldest.cpu, latest.cpu),
                memory: this.calculateTrend(oldest.memory, latest.memory),
                disk: this.calculateTrend(oldest.disk, latest.disk),
                load: this.calculateTrend(oldest.loadAverage['1min'], latest.loadAverage['1min'])
            };
        } catch (error) {
            return {
                cpu: 'unknown',
                memory: 'unknown',
                disk: 'unknown',
                load: 'unknown'
            };
        }
    }

    calculateTrend(oldValue, newValue) {
        const threshold = 5; // 5% change threshold
        const change = ((newValue - oldValue) / oldValue) * 100;

        if (Math.abs(change) < threshold) {
            return 'stable';
        } else if (change > 0) {
            return 'increasing';
        } else {
            return 'decreasing';
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
}

module.exports = ResourceMonitor;