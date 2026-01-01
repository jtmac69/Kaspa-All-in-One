const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class UpdateMonitor {
    constructor() {
        this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours
        const dataDir = process.env.DATA_DIR || './data';
        this.updateHistoryFile = `${dataDir}/update-history.json`;
        this.lastCheckFile = `${dataDir}/last-update-check.json`;
        this.githubApiBase = 'https://api.github.com';
        this.timeout = 10000; // 10 seconds
        
        // Service repository mappings
        this.serviceRepositories = new Map([
            ['kaspa-node', 'kaspanet/rusty-kaspa'],
            ['kasia-app', 'aspectron/kasia'],
            ['kasia-indexer', 'aspectron/kasia-indexer'],
            ['k-social', 'kaspa-live/k-social'],
            ['k-indexer', 'kaspa-live/k-indexer'],
            ['simply-kaspa-indexer', 'simply-kaspa/indexer'],
            ['kaspa-explorer', 'kaspanet/kaspa-explorer'],
            ['kaspa-stratum', 'kaspanet/kaspa-stratum-bridge'],
            ['kaspa-aio', 'kaspa-live/kaspa-all-in-one'] // The main project
        ]);

        this.ensureDataDirectory();
    }

    async ensureDataDirectory() {
        try {
            const dataDir = process.env.DATA_DIR || './data';
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            console.warn('Failed to create data directory:', error.message);
        }
    }

    async getCurrentVersions() {
        const versions = new Map();
        
        try {
            // Get versions from Docker images
            const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(kaspa|kasia|k-social|k-indexer|simply-kaspa)"');
            
            stdout.trim().split('\n').filter(line => line).forEach(line => {
                const [image, tag] = line.split(':');
                const serviceName = this.extractServiceName(image);
                if (serviceName && tag !== '<none>') {
                    versions.set(serviceName, tag);
                }
            });
        } catch (error) {
            console.warn('Failed to get current versions from Docker:', error.message);
        }

        // Add fallback versions for services that might not be running
        this.serviceRepositories.forEach((repo, service) => {
            if (!versions.has(service)) {
                versions.set(service, 'unknown');
            }
        });

        return versions;
    }

    extractServiceName(imageName) {
        const imageMap = {
            'kaspa-node': 'kaspa-node',
            'kasia-app': 'kasia-app',
            'kasia-indexer': 'kasia-indexer',
            'k-social': 'k-social',
            'k-indexer': 'k-indexer',
            'simply-kaspa-indexer': 'simply-kaspa-indexer',
            'kaspa-explorer': 'kaspa-explorer',
            'kaspa-stratum': 'kaspa-stratum',
            'kaspa-aio': 'kaspa-aio'
        };

        for (const [key, value] of Object.entries(imageMap)) {
            if (imageName.includes(key)) {
                return value;
            }
        }

        return null;
    }

    async checkForUpdates() {
        try {
            const currentVersions = await this.getCurrentVersions();
            const updates = [];

            for (const [service, repo] of this.serviceRepositories) {
                try {
                    const latestRelease = await this.getLatestGitHubRelease(repo);
                    const currentVersion = currentVersions.get(service) || 'unknown';
                    
                    if (this.isNewer(latestRelease.version, currentVersion)) {
                        const update = {
                            service,
                            serviceName: this.getServiceDisplayName(service),
                            currentVersion,
                            availableVersion: latestRelease.version,
                            changelog: latestRelease.changelog,
                            breaking: this.detectBreakingChanges(latestRelease),
                            releaseDate: latestRelease.publishedAt,
                            downloadUrl: latestRelease.downloadUrl,
                            repository: repo,
                            priority: this.calculateUpdatePriority(service, latestRelease)
                        };
                        updates.push(update);
                    }
                } catch (error) {
                    console.warn(`Failed to check updates for ${service}:`, error.message);
                }
            }

            // Save last check time
            await this.saveLastCheckTime();
            
            return updates;
        } catch (error) {
            throw new Error(`Failed to check for updates: ${error.message}`);
        }
    }

    async getLatestGitHubRelease(repo) {
        try {
            const response = await axios.get(
                `${this.githubApiBase}/repos/${repo}/releases/latest`,
                { 
                    timeout: this.timeout,
                    headers: {
                        'User-Agent': 'Kaspa-AIO-Dashboard/1.0',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            const release = response.data;
            
            return {
                version: this.cleanVersion(release.tag_name),
                changelog: release.body || 'No changelog available',
                publishedAt: release.published_at,
                downloadUrl: release.assets?.[0]?.browser_download_url || release.html_url,
                prerelease: release.prerelease,
                draft: release.draft,
                htmlUrl: release.html_url
            };
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`Repository ${repo} not found or has no releases`);
            } else if (error.response?.status === 403) {
                throw new Error('GitHub API rate limit exceeded');
            }
            throw new Error(`Failed to fetch release info: ${error.message}`);
        }
    }

    cleanVersion(version) {
        // Remove common prefixes like 'v', 'version-', etc.
        return version.replace(/^(version-?|v)/i, '');
    }

    isNewer(availableVersion, currentVersion) {
        if (currentVersion === 'unknown' || currentVersion === 'latest') {
            return true; // Always show updates for unknown versions
        }

        // Simple version comparison - in production, use a proper semver library
        const available = this.parseVersion(availableVersion);
        const current = this.parseVersion(currentVersion);

        if (available.major > current.major) return true;
        if (available.major < current.major) return false;
        
        if (available.minor > current.minor) return true;
        if (available.minor < current.minor) return false;
        
        if (available.patch > current.patch) return true;
        
        return false;
    }

    parseVersion(version) {
        const cleaned = this.cleanVersion(version);
        const parts = cleaned.split('.').map(part => {
            // Extract numeric part from strings like "1.2.3-beta"
            const match = part.match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        });

        return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0,
            original: version
        };
    }

    detectBreakingChanges(release) {
        const changelog = (release.changelog || '').toLowerCase();
        const breakingKeywords = [
            'breaking change',
            'breaking',
            'incompatible',
            'migration required',
            'deprecated',
            'removed',
            'major version',
            'breaking:'
        ];

        return breakingKeywords.some(keyword => changelog.includes(keyword));
    }

    calculateUpdatePriority(service, release) {
        let priority = 'low';

        // Critical services get higher priority
        const criticalServices = ['kaspa-node', 'dashboard', 'nginx'];
        if (criticalServices.includes(service)) {
            priority = 'medium';
        }

        // Security updates get highest priority
        const changelog = (release.changelog || '').toLowerCase();
        const securityKeywords = ['security', 'vulnerability', 'cve', 'exploit', 'patch'];
        if (securityKeywords.some(keyword => changelog.includes(keyword))) {
            priority = 'high';
        }

        // Breaking changes get special attention
        if (this.detectBreakingChanges(release)) {
            priority = priority === 'high' ? 'critical' : 'medium';
        }

        return priority;
    }

    getServiceDisplayName(service) {
        const displayNames = {
            'kaspa-node': 'Kaspa Node',
            'kasia-app': 'Kasia Application',
            'kasia-indexer': 'Kasia Indexer',
            'k-social': 'K Social',
            'k-indexer': 'K Indexer',
            'simply-kaspa-indexer': 'Simply Kaspa Indexer',
            'kaspa-explorer': 'Kaspa Explorer',
            'kaspa-stratum': 'Kaspa Stratum Bridge',
            'kaspa-aio': 'Kaspa All-in-One'
        };

        return displayNames[service] || service;
    }

    async getUpdateHistory() {
        try {
            const historyData = await fs.readFile(this.updateHistoryFile, 'utf-8');
            return JSON.parse(historyData);
        } catch (error) {
            // Return empty history if file doesn't exist
            return [];
        }
    }

    async saveUpdateHistory(update) {
        try {
            const history = await this.getUpdateHistory();
            history.unshift({
                ...update,
                timestamp: new Date().toISOString()
            });

            // Keep only last 100 entries
            const trimmedHistory = history.slice(0, 100);
            
            await fs.writeFile(
                this.updateHistoryFile, 
                JSON.stringify(trimmedHistory, null, 2)
            );
        } catch (error) {
            console.warn('Failed to save update history:', error.message);
        }
    }

    async getLastCheckTime() {
        try {
            const checkData = await fs.readFile(this.lastCheckFile, 'utf-8');
            const data = JSON.parse(checkData);
            return data.lastCheck;
        } catch (error) {
            return null;
        }
    }

    async saveLastCheckTime() {
        try {
            const data = {
                lastCheck: new Date().toISOString()
            };
            await fs.writeFile(this.lastCheckFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('Failed to save last check time:', error.message);
        }
    }

    scheduleUpdateChecks(callback) {
        // Initial check
        this.performScheduledCheck(callback);

        // Schedule periodic checks
        setInterval(() => {
            this.performScheduledCheck(callback);
        }, this.checkInterval);
    }

    async performScheduledCheck(callback) {
        try {
            const updates = await this.checkForUpdates();
            if (updates.length > 0 && callback) {
                callback(updates);
            }
        } catch (error) {
            console.error('Scheduled update check failed:', error.message);
        }
    }

    async getAvailableUpdates() {
        try {
            const updates = await this.checkForUpdates();
            
            // Sort by priority and date
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            
            return updates.sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                
                // If same priority, sort by release date (newest first)
                return new Date(b.releaseDate) - new Date(a.releaseDate);
            });
        } catch (error) {
            throw new Error(`Failed to get available updates: ${error.message}`);
        }
    }

    // Format update information for display
    formatUpdateInfo(update) {
        return {
            ...update,
            formattedReleaseDate: new Date(update.releaseDate).toLocaleDateString(),
            changelogPreview: this.truncateChangelog(update.changelog),
            versionComparison: `${update.currentVersion} → ${update.availableVersion}`,
            priorityBadge: this.getPriorityBadge(update.priority),
            breakingBadge: update.breaking ? '⚠️ Breaking Changes' : null
        };
    }

    truncateChangelog(changelog, maxLength = 200) {
        if (!changelog || changelog.length <= maxLength) {
            return changelog;
        }
        
        return changelog.substring(0, maxLength) + '...';
    }

    getPriorityBadge(priority) {
        const badges = {
            'critical': '🚨 Critical',
            'high': '🔴 High',
            'medium': '🟡 Medium',
            'low': '🟢 Low'
        };
        
        return badges[priority] || '⚪ Unknown';
    }
}

module.exports = UpdateMonitor;