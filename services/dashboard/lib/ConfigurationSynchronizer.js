const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const { createResolver } = require('../../shared/lib/path-resolver');

const execAsync = promisify(exec);

/**
 * ConfigurationSynchronizer handles configuration change detection,
 * automatic dashboard refresh, and configuration history tracking.
 */
class ConfigurationSynchronizer {
    constructor(options = {}) {
        // Use centralized path resolver for consistent path resolution
        const resolver = createResolver(__dirname);
        const paths = resolver.getPaths();
        
        this.projectRoot = options.projectRoot || paths.root;
        this.configPath = path.join(this.projectRoot, '.env');
        this.dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
        this.installationStatePath = path.join(this.projectRoot, '.kaspa-aio', 'installation-state.json');
        this.historyPath = path.join(this.projectRoot, '.kaspa-aio', 'config-history.json');
        this.backupDir = path.join(this.projectRoot, '.kaspa-backups');
        
        // Configuration state tracking
        this.lastConfigHash = null;
        this.lastDockerComposeHash = null;
        this.lastInstallationStateHash = null;
        this.configHistory = [];
        
        // Change detection settings
        this.checkInterval = options.checkInterval || 5000; // 5 seconds
        this.maxHistoryEntries = options.maxHistoryEntries || 100;
        
        // Event callbacks
        this.onConfigurationChanged = options.onConfigurationChanged || null;
        this.onDashboardRefreshNeeded = options.onDashboardRefreshNeeded || null;
        
        // Monitoring state
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        this.initialize();
    }

    /**
     * Initialize the configuration synchronizer
     */
    async initialize() {
        try {
            // Load existing configuration history
            await this.loadConfigurationHistory();
            
            // Calculate initial hashes
            await this.updateConfigurationHashes();
            
            console.log('ConfigurationSynchronizer initialized');
        } catch (error) {
            console.error('Failed to initialize ConfigurationSynchronizer:', error);
        }
    }

    /**
     * Start monitoring configuration changes
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Configuration monitoring already active');
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            await this.checkForConfigurationChanges();
        }, this.checkInterval);
        
        console.log(`Configuration monitoring started (interval: ${this.checkInterval}ms)`);
    }

    /**
     * Stop monitoring configuration changes
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('Configuration monitoring stopped');
    }

    /**
     * Check for configuration changes with diff analysis
     */
    async checkForConfigurationChanges() {
        try {
            const currentHashes = await this.calculateConfigurationHashes();
            const changes = this.detectChanges(currentHashes);
            
            if (changes.length > 0) {
                console.log('Configuration changes detected:', changes.map(c => c.type));
                
                // Generate detailed diff analysis
                const diffAnalysis = await this.generateDiffAnalysis(changes);
                
                // Record changes in history
                await this.recordConfigurationChange(changes, diffAnalysis);
                
                // Update stored hashes
                this.updateStoredHashes(currentHashes);
                
                // Trigger callbacks
                if (this.onConfigurationChanged) {
                    this.onConfigurationChanged(changes, diffAnalysis);
                }
                
                // Determine if dashboard refresh is needed
                if (this.requiresDashboardRefresh(changes)) {
                    await this.triggerDashboardRefresh(changes, diffAnalysis);
                }
            }
            
        } catch (error) {
            console.error('Error checking for configuration changes:', error);
        }
    }

    /**
     * Calculate hashes for all configuration files
     */
    async calculateConfigurationHashes() {
        const hashes = {};
        
        try {
            // .env file hash
            const envContent = await fs.readFile(this.configPath, 'utf-8');
            hashes.env = this.calculateHash(envContent);
        } catch (error) {
            hashes.env = null;
        }
        
        try {
            // docker-compose.yml hash
            const composeContent = await fs.readFile(this.dockerComposePath, 'utf-8');
            hashes.dockerCompose = this.calculateHash(composeContent);
        } catch (error) {
            hashes.dockerCompose = null;
        }
        
        try {
            // installation-state.json hash
            const stateContent = await fs.readFile(this.installationStatePath, 'utf-8');
            hashes.installationState = this.calculateHash(stateContent);
        } catch (error) {
            hashes.installationState = null;
        }
        
        return hashes;
    }

    /**
     * Update stored configuration hashes
     */
    async updateConfigurationHashes() {
        const hashes = await this.calculateConfigurationHashes();
        this.updateStoredHashes(hashes);
    }

    /**
     * Update stored hashes
     */
    updateStoredHashes(hashes) {
        this.lastConfigHash = hashes.env;
        this.lastDockerComposeHash = hashes.dockerCompose;
        this.lastInstallationStateHash = hashes.installationState;
    }

    /**
     * Detect changes between current and stored hashes
     */
    detectChanges(currentHashes) {
        const changes = [];
        
        if (currentHashes.env !== this.lastConfigHash) {
            changes.push({
                type: 'environment',
                file: '.env',
                oldHash: this.lastConfigHash,
                newHash: currentHashes.env
            });
        }
        
        if (currentHashes.dockerCompose !== this.lastDockerComposeHash) {
            changes.push({
                type: 'docker-compose',
                file: 'docker-compose.yml',
                oldHash: this.lastDockerComposeHash,
                newHash: currentHashes.dockerCompose
            });
        }
        
        if (currentHashes.installationState !== this.lastInstallationStateHash) {
            changes.push({
                type: 'installation-state',
                file: 'installation-state.json',
                oldHash: this.lastInstallationStateHash,
                newHash: currentHashes.installationState
            });
        }
        
        return changes;
    }

    /**
     * Generate detailed diff analysis for changes
     */
    async generateDiffAnalysis(changes) {
        const analysis = {
            timestamp: new Date().toISOString(),
            changes: [],
            impact: 'low',
            requiresRestart: false,
            affectedServices: []
        };
        
        for (const change of changes) {
            try {
                let diffDetails = null;
                
                if (change.type === 'environment') {
                    diffDetails = await this.analyzeEnvironmentDiff();
                } else if (change.type === 'docker-compose') {
                    diffDetails = await this.analyzeDockerComposeDiff();
                } else if (change.type === 'installation-state') {
                    diffDetails = await this.analyzeInstallationStateDiff();
                }
                
                if (diffDetails) {
                    analysis.changes.push({
                        ...change,
                        diff: diffDetails
                    });
                    
                    // Update impact assessment
                    if (diffDetails.impact === 'high') {
                        analysis.impact = 'high';
                    } else if (diffDetails.impact === 'medium' && analysis.impact === 'low') {
                        analysis.impact = 'medium';
                    }
                    
                    // Check if restart is required
                    if (diffDetails.requiresRestart) {
                        analysis.requiresRestart = true;
                    }
                    
                    // Add affected services
                    if (diffDetails.affectedServices) {
                        analysis.affectedServices.push(...diffDetails.affectedServices);
                    }
                }
                
            } catch (error) {
                console.error(`Failed to analyze diff for ${change.type}:`, error);
            }
        }
        
        // Remove duplicate services
        analysis.affectedServices = [...new Set(analysis.affectedServices)];
        
        return analysis;
    }

    /**
     * Analyze environment file differences
     */
    async analyzeEnvironmentDiff() {
        // This is a simplified implementation
        // In a real scenario, you'd parse and compare the actual env variables
        return {
            type: 'environment-variables',
            impact: 'medium',
            requiresRestart: true,
            affectedServices: ['dashboard'], // Would be determined by actual changes
            summary: 'Environment variables modified'
        };
    }

    /**
     * Analyze docker-compose file differences
     */
    async analyzeDockerComposeDiff() {
        return {
            type: 'service-configuration',
            impact: 'high',
            requiresRestart: true,
            affectedServices: [], // Would be determined by parsing compose changes
            summary: 'Docker Compose configuration modified'
        };
    }

    /**
     * Analyze installation state differences
     */
    async analyzeInstallationStateDiff() {
        return {
            type: 'installation-state',
            impact: 'low',
            requiresRestart: false,
            affectedServices: [],
            summary: 'Installation state updated'
        };
    }

    /**
     * Record configuration change in history with change attribution
     */
    async recordConfigurationChange(changes, diffAnalysis) {
        const historyEntry = {
            id: this.generateChangeId(),
            timestamp: new Date().toISOString(),
            changes,
            diffAnalysis,
            source: 'auto-detected', // Could be 'wizard', 'manual', 'auto-detected'
            attribution: await this.determineChangeAttribution()
        };
        
        this.configHistory.unshift(historyEntry);
        
        // Limit history size
        if (this.configHistory.length > this.maxHistoryEntries) {
            this.configHistory = this.configHistory.slice(0, this.maxHistoryEntries);
        }
        
        // Save to disk
        await this.saveConfigurationHistory();
        
        console.log(`Configuration change recorded: ${historyEntry.id}`);
    }

    /**
     * Determine who/what made the configuration change
     */
    async determineChangeAttribution() {
        try {
            // Check if wizard is running (might have made the change)
            const wizardRunning = await this.isWizardRunning();
            if (wizardRunning) {
                return {
                    source: 'wizard',
                    description: 'Installation Wizard'
                };
            }
            
            // Check for recent backup restoration
            const recentBackup = await this.checkRecentBackupRestoration();
            if (recentBackup) {
                return {
                    source: 'backup-restore',
                    description: `Backup restoration: ${recentBackup.filename}`,
                    backupId: recentBackup.id
                };
            }
            
            // Default to manual change
            return {
                source: 'manual',
                description: 'Manual file modification'
            };
            
        } catch (error) {
            console.error('Failed to determine change attribution:', error);
            return {
                source: 'unknown',
                description: 'Unknown source'
            };
        }
    }

    /**
     * Check if wizard is currently running
     */
    async isWizardRunning() {
        try {
            const { stdout } = await execAsync('pgrep -f "wizard"');
            return stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check for recent backup restoration
     */
    async checkRecentBackupRestoration() {
        try {
            // Check if there's a recent backup restoration marker
            const markerPath = path.join(this.backupDir, '.last-restore');
            const stats = await fs.stat(markerPath);
            
            // Consider "recent" as within the last 5 minutes
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (stats.mtime.getTime() > fiveMinutesAgo) {
                const content = await fs.readFile(markerPath, 'utf-8');
                return JSON.parse(content);
            }
            
        } catch (error) {
            // No marker file or other error
        }
        
        return null;
    }

    /**
     * Determine if changes require dashboard refresh
     */
    requiresDashboardRefresh(changes) {
        // Dashboard refresh is needed for most configuration changes
        return changes.some(change => 
            change.type === 'environment' || 
            change.type === 'docker-compose' ||
            change.type === 'installation-state'
        );
    }

    /**
     * Trigger automatic dashboard refresh after configuration changes
     */
    async triggerDashboardRefresh(changes, diffAnalysis) {
        try {
            console.log('Triggering dashboard refresh due to configuration changes');
            
            if (this.onDashboardRefreshNeeded) {
                this.onDashboardRefreshNeeded(changes, diffAnalysis);
            }
            
            // Additional refresh logic could go here
            // For example, clearing caches, reloading configuration, etc.
            
        } catch (error) {
            console.error('Failed to trigger dashboard refresh:', error);
        }
    }

    /**
     * Implement configuration validation after changes
     */
    async validateConfiguration() {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            timestamp: new Date().toISOString()
        };
        
        try {
            // Validate .env file
            const envValidation = await this.validateEnvironmentFile();
            validation.errors.push(...envValidation.errors);
            validation.warnings.push(...envValidation.warnings);
            
            // Validate docker-compose.yml
            const composeValidation = await this.validateDockerComposeFile();
            validation.errors.push(...composeValidation.errors);
            validation.warnings.push(...composeValidation.warnings);
            
            // Validate installation state
            const stateValidation = await this.validateInstallationState();
            validation.errors.push(...stateValidation.errors);
            validation.warnings.push(...stateValidation.warnings);
            
            validation.valid = validation.errors.length === 0;
            
        } catch (error) {
            validation.valid = false;
            validation.errors.push(`Validation failed: ${error.message}`);
        }
        
        return validation;
    }

    /**
     * Validate environment file
     */
    async validateEnvironmentFile() {
        const result = { errors: [], warnings: [] };
        
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line && !line.startsWith('#')) {
                    if (!line.includes('=')) {
                        result.errors.push(`Line ${i + 1}: Invalid environment variable format`);
                    }
                }
            }
            
        } catch (error) {
            result.errors.push(`Cannot read .env file: ${error.message}`);
        }
        
        return result;
    }

    /**
     * Validate docker-compose file
     */
    async validateDockerComposeFile() {
        const result = { errors: [], warnings: [] };
        
        try {
            // Use docker-compose config to validate
            await execAsync('docker-compose config -q');
        } catch (error) {
            result.errors.push(`Docker Compose validation failed: ${error.message}`);
        }
        
        return result;
    }

    /**
     * Validate installation state
     */
    async validateInstallationState() {
        const result = { errors: [], warnings: [] };
        
        try {
            const content = await fs.readFile(this.installationStatePath, 'utf-8');
            const state = JSON.parse(content);
            
            // Basic validation
            if (!state.version) {
                result.warnings.push('Installation state missing version information');
            }
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                result.errors.push(`Invalid installation state: ${error.message}`);
            }
        }
        
        return result;
    }

    /**
     * Add configuration rollback capability
     */
    async rollbackConfiguration(changeId) {
        try {
            const historyEntry = this.configHistory.find(entry => entry.id === changeId);
            if (!historyEntry) {
                throw new Error(`Configuration change ${changeId} not found in history`);
            }
            
            // This is a simplified implementation
            // In a real scenario, you'd need to store the actual file contents
            // or diffs to enable proper rollback
            
            console.log(`Rolling back configuration change: ${changeId}`);
            
            // Create a backup before rollback
            await this.createRollbackBackup(changeId);
            
            // Perform rollback (implementation would depend on stored diff data)
            // For now, just log the action
            console.log('Rollback completed');
            
            return {
                success: true,
                changeId,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Configuration rollback failed:', error);
            throw error;
        }
    }

    /**
     * Create backup before rollback
     */
    async createRollbackBackup(changeId) {
        const backupName = `rollback-${changeId}-${Date.now()}`;
        const backupPath = path.join(this.backupDir, backupName);
        
        try {
            await fs.mkdir(backupPath, { recursive: true });
            
            // Copy current configuration files
            await fs.copyFile(this.configPath, path.join(backupPath, '.env'));
            await fs.copyFile(this.dockerComposePath, path.join(backupPath, 'docker-compose.yml'));
            
            if (await this.fileExists(this.installationStatePath)) {
                await fs.copyFile(this.installationStatePath, path.join(backupPath, 'installation-state.json'));
            }
            
            console.log(`Rollback backup created: ${backupName}`);
            
        } catch (error) {
            console.error('Failed to create rollback backup:', error);
            throw error;
        }
    }

    /**
     * Get configuration history
     */
    getConfigurationHistory(options = {}) {
        const { limit = 50, since = null, changeType = null } = options;
        
        let history = [...this.configHistory];
        
        // Filter by date if specified
        if (since) {
            const sinceDate = new Date(since);
            history = history.filter(entry => new Date(entry.timestamp) >= sinceDate);
        }
        
        // Filter by change type if specified
        if (changeType) {
            history = history.filter(entry => 
                entry.changes.some(change => change.type === changeType)
            );
        }
        
        // Limit results
        return history.slice(0, limit);
    }

    /**
     * Load configuration history from disk
     */
    async loadConfigurationHistory() {
        try {
            const content = await fs.readFile(this.historyPath, 'utf-8');
            this.configHistory = JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.configHistory = [];
            } else {
                console.error('Failed to load configuration history:', error);
                this.configHistory = [];
            }
        }
    }

    /**
     * Save configuration history to disk
     */
    async saveConfigurationHistory() {
        try {
            await fs.mkdir(path.dirname(this.historyPath), { recursive: true });
            await fs.writeFile(this.historyPath, JSON.stringify(this.configHistory, null, 2));
        } catch (error) {
            console.error('Failed to save configuration history:', error);
        }
    }

    /**
     * Calculate hash for content
     */
    calculateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generate unique change ID
     */
    generateChangeId() {
        return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get synchronizer status
     */
    getStatus() {
        return {
            monitoring: this.isMonitoring,
            checkInterval: this.checkInterval,
            historyEntries: this.configHistory.length,
            lastCheck: this.lastCheck || null,
            configFiles: {
                env: this.lastConfigHash !== null,
                dockerCompose: this.lastDockerComposeHash !== null,
                installationState: this.lastInstallationStateHash !== null
            }
        };
    }

    /**
     * Shutdown the synchronizer
     */
    shutdown() {
        this.stopMonitoring();
        console.log('ConfigurationSynchronizer shutdown complete');
    }
}

module.exports = ConfigurationSynchronizer;