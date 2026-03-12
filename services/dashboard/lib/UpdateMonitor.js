const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// External Docker services with upstream GitHub repos for version tracking.
// Only services that use a versioned image tag (not 'latest' / 'main') are listed.
const TRACKED_DOCKER_SERVICES = [
    {
        service: 'kaspa-node',
        displayName: 'Kaspa Node',
        containerName: 'kaspa-node',
        githubRepo: 'kaspanet/rusty-kaspa',
    },
    {
        service: 'simply-kaspa-indexer',
        displayName: 'Simply Kaspa Indexer',
        containerName: 'simply-kaspa-indexer',
        githubRepo: 'supertypo/simply-kaspa-indexer',
    },
];

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
            console.error('Failed to create data directory — update history, last-check timestamps, and back-off state will not persist (degraded mode):', error.message);
        }
    }

    async getInstalledVersion() {
        const statePath = path.join(this.projectRoot, '.kaspa-aio', 'installation-state.json');
        try {
            const content = await fs.readFile(statePath, 'utf-8');
            const state = JSON.parse(content);
            return state.version || 'unknown';
        } catch (error) {
            if (error.code === 'ENOENT') {
                return 'unknown'; // Not yet installed — suppress update check silently
            }
            // Parse errors, permissions, etc. — propagate so checkForUpdates can surface them
            throw new Error(`installation-state.json is unreadable (${error.constructor.name}): ${error.message}`);
        }
    }

    async checkForUpdates() {
        let result;
        try {
            const currentVersion = await this.getInstalledVersion();
            const latestRelease = await this.getLatestGitHubRelease(this.repo);

            let aioUpdates = [];
            if (latestRelease.prerelease || latestRelease.draft) {
                console.warn(`[UpdateMonitor] Latest release ${latestRelease.version} is a ${latestRelease.draft ? 'draft' : 'pre-release'} — skipping update notification`);
            } else if (this.isNewer(latestRelease.version, currentVersion)) {
                aioUpdates = [{
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
            }

            // Check each tracked Docker service — failures are non-fatal (logged as warnings)
            const serviceUpdates = await this.checkDockerServiceUpdates();
            result = [...aioUpdates, ...serviceUpdates];
        } catch (error) {
            await this.saveLastCheckTime().catch(err => {
                console.error('checkForUpdates: failed to persist last-check timestamp:', err.message);
            }); // stamp even on failure for disk-persisted back-off
            throw new Error(`Failed to check for updates: ${error.message}`, { cause: error });
        }

        // Stamp timestamp after result is fully constructed — write failure must not discard the result
        // (saveLastCheckTime has its own internal catch and never throws)
        await this.saveLastCheckTime();
        return result;
    }

    /**
     * Get the image tag of a running Docker container.
     * Returns null if the container is not running or not found.
     */
    async getContainerImageVersion(containerName) {
        try {
            const { stdout } = await execAsync(
                `docker inspect ${containerName} --format='{{.Config.Image}}'`,
                { timeout: 5000 }
            );
            const image = stdout.trim().replace(/^'|'$/g, '');
            const tagMatch = image.match(/:([^:/]+)$/);
            return tagMatch ? tagMatch[1] : null;
        } catch {
            return null; // container not running or Docker unavailable
        }
    }

    /**
     * Check each entry in TRACKED_DOCKER_SERVICES for available upstream updates.
     * Individual service failures are logged as warnings and skipped — they do not
     * throw or affect the overall update check result.
     */
    async checkDockerServiceUpdates() {
        const updates = [];
        for (const svc of TRACKED_DOCKER_SERVICES) {
            try {
                const currentTag = await this.getContainerImageVersion(svc.containerName);
                // Skip containers that are not running or use floating tags
                if (!currentTag || currentTag === 'latest' || currentTag === 'main') continue;

                const latestRelease = await this.getLatestGitHubRelease(svc.githubRepo);
                if (latestRelease.prerelease || latestRelease.draft) continue;

                if (this.isNewer(latestRelease.version, currentTag)) {
                    updates.push({
                        service: svc.service,
                        serviceName: svc.displayName,
                        currentVersion: currentTag,
                        availableVersion: latestRelease.version,
                        updateAvailable: true,
                        changelog: latestRelease.changelog,
                        breaking: this.detectBreakingChanges(latestRelease),
                        releaseDate: latestRelease.publishedAt,
                        htmlUrl: latestRelease.htmlUrl,
                        priority: this.calculateUpdatePriority(latestRelease)
                    });
                }
            } catch (err) {
                console.warn(`[UpdateMonitor] Skipping ${svc.service} version check: ${err.message}`);
            }
        }
        return updates;
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

            if (!release.tag_name) {
                throw new Error('GitHub API returned a release with no tag_name — the release may be malformed or a draft');
            }

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
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) throw new Error('GitHub API timeout');
            if (status === 404) throw new Error(`Repository ${repo} not found or has no releases`);
            if (status === 401) throw new Error('GitHub API authentication failed (401)');
            if (status === 403) throw new Error('GitHub API rate limit exceeded (403)');
            if (status === 429) throw new Error('GitHub API secondary rate limit exceeded (429) — retry later');
            if (status >= 500) throw new Error(`GitHub API server error (${status})`);
            if (error.code) throw new Error(`Failed to fetch release info (${error.code}): ${error.message}`);
            throw new Error(`Failed to fetch release info: ${error.message}`);
        }
    }

    cleanVersion(version) {
        return version.replace(/^(version-?|v)/i, '');
    }

    isNewer(availableVersion, currentVersion) {
        if (currentVersion === 'latest') {
            return true; // A tagged release is available; 'latest' is a floating/dev build
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
            'breaking change', 'breaking:', 'incompatible',
            'migration required', 'major version'
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
            priority = priority === 'high' ? 'critical' : 'high';
        }

        return priority;
    }

    async getUpdateHistory() {
        try {
            const historyData = await fs.readFile(this.updateHistoryFile, 'utf-8');
            return JSON.parse(historyData);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Failed to read ${this.updateHistoryFile} (${error.constructor.name}):`, error.message);
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
            console.error(`Failed to write ${this.updateHistoryFile} (${error.constructor.name}):`, error.message);
        }
    }

    async getLastCheckTime() {
        try {
            const checkData = await fs.readFile(this.lastCheckFile, 'utf-8');
            const data = JSON.parse(checkData);
            return data.lastCheck;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Failed to read ${this.lastCheckFile} (${error.constructor.name}):`, error.message);
            }
            return null;
        }
    }

    async saveLastCheckTime() {
        try {
            await fs.writeFile(this.lastCheckFile, JSON.stringify({ lastCheck: new Date().toISOString() }, null, 2));
        } catch (error) {
            console.error(`Failed to write ${this.lastCheckFile} (${error.constructor.name}):`, error.message);
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
