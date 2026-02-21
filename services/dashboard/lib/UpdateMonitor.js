const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class UpdateMonitor {
    constructor() {
        this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours
        const dataDir = process.env.DATA_DIR || './data';
        this.updateHistoryFile = `${dataDir}/update-history.json`;
        this.lastCheckFile = `${dataDir}/last-update-check.json`;
        this.githubApiBase = 'https://api.github.com';
        this.timeout = 10000; // 10 seconds
        this.repo = 'jtmac69/Kaspa-All-in-One';
        this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../..');

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

    async getInstalledVersion() {
        try {
            const statePath = path.join(this.projectRoot, '.kaspa-aio', 'installation-state.json');
            const content = await fs.readFile(statePath, 'utf-8');
            const state = JSON.parse(content);
            return state.version || 'unknown';
        } catch (error) {
            console.warn('Failed to read installation-state.json:', error.message);
            return 'unknown';
        }
    }

    async checkForUpdates() {
        try {
            const currentVersion = await this.getInstalledVersion();
            const latestRelease = await this.getLatestGitHubRelease(this.repo);

            await this.saveLastCheckTime();

            if (!this.isNewer(latestRelease.version, currentVersion)) {
                return [];
            }

            return [{
                service: 'kaspa-aio',
                serviceName: 'Kaspa All-in-One',
                currentVersion,
                availableVersion: latestRelease.version,
                changelog: latestRelease.changelog,
                breaking: this.detectBreakingChanges(latestRelease),
                releaseDate: latestRelease.publishedAt,
                htmlUrl: latestRelease.htmlUrl,
                priority: this.calculateUpdatePriority(latestRelease)
            }];
        } catch (error) {
            throw new Error(`Failed to check for updates: ${error.message}`, { cause: error });
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
                prerelease: release.prerelease,
                draft: release.draft,
                htmlUrl: release.html_url
            };
        } catch (error) {
            const status = error.response?.status;
            if (status === 404) throw new Error(`Repository ${repo} not found or has no releases`);
            if (status === 401) throw new Error('GitHub API authentication failed (401)');
            if (status === 403) throw new Error('GitHub API rate limit exceeded (403)');
            if (status === 429) throw new Error('GitHub API secondary rate limit exceeded (429) — retry later');
            if (status >= 500) throw new Error(`GitHub API server error (${status})`);
            throw new Error(`Failed to fetch release info: ${error.message}`);
        }
    }

    cleanVersion(version) {
        return version.replace(/^(version-?|v)/i, '');
    }

    isNewer(availableVersion, currentVersion) {
        if (currentVersion === 'latest') {
            return true;
        }
        if (currentVersion === 'unknown') {
            return false;
        }

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
            'breaking change', 'breaking', 'incompatible',
            'migration required', 'deprecated', 'removed',
            'major version', 'breaking:'
        ];
        return breakingKeywords.some(keyword => changelog.includes(keyword));
    }

    calculateUpdatePriority(release) {
        let priority = 'medium'; // AIO updates are always at least medium

        const changelog = (release.changelog || '').toLowerCase();
        const securityKeywords = ['security', 'vulnerability', 'cve', 'exploit', 'patch'];
        if (securityKeywords.some(keyword => changelog.includes(keyword))) {
            priority = 'high';
        }

        if (this.detectBreakingChanges(release)) {
            priority = priority === 'high' ? 'critical' : 'medium';
        }

        return priority;
    }

    async getUpdateHistory() {
        try {
            const historyData = await fs.readFile(this.updateHistoryFile, 'utf-8');
            return JSON.parse(historyData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('Failed to read update history:', error.message);
            }
            return [];
        }
    }

    async saveUpdateHistory(update) {
        try {
            const history = await this.getUpdateHistory();
            history.unshift({ ...update, timestamp: new Date().toISOString() });
            const trimmedHistory = history.slice(0, 100);
            await fs.writeFile(this.updateHistoryFile, JSON.stringify(trimmedHistory, null, 2));
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
            if (error.code !== 'ENOENT') {
                console.warn('Failed to read last check time:', error.message);
            }
            return null;
        }
    }

    async saveLastCheckTime() {
        try {
            await fs.writeFile(this.lastCheckFile, JSON.stringify({ lastCheck: new Date().toISOString() }, null, 2));
        } catch (error) {
            console.warn('Failed to save last check time:', error.message);
        }
    }

    scheduleUpdateChecks(callback) {
        this.performScheduledCheck(callback);
        setInterval(() => this.performScheduledCheck(callback), this.checkInterval);
    }

    async performScheduledCheck(callback) {
        try {
            const updates = await this.checkForUpdates();
            if (callback) {
                callback(null, updates);
            }
        } catch (error) {
            console.error('Scheduled update check failed:', error.message);
            if (callback) {
                callback(error, null);
            }
        }
    }

    async getAvailableUpdates() {
        return this.checkForUpdates();
    }

    truncateChangelog(changelog, maxLength = 200) {
        if (!changelog || changelog.length <= maxLength) return changelog;
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
