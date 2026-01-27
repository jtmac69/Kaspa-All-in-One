const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { createResolver } = require('../../shared/lib/path-resolver');

const execAsync = promisify(exec);

/**
 * WizardIntegration handles launching and communicating with the Installation Wizard
 * from the Management Dashboard for reconfiguration operations.
 */
class WizardIntegration {
    constructor() {
        // Use centralized path resolver for consistent path resolution
        const resolver = createResolver(__dirname);
        const paths = resolver.getPaths();
        
        this.wizardPort = process.env.WIZARD_PORT || 3000;
        this.wizardUrl = `http://localhost:${this.wizardPort}`;
        this.projectRoot = paths.root;
        this.configPath = path.join(this.projectRoot, '.env');
        this.dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
        this.installationStatePath = path.join(this.projectRoot, '.kaspa-aio', 'installation-state.json');
    }

    /**
     * Launch the Installation Wizard with current configuration
     * @param {Object} options - Launch options
     * @param {string} options.mode - Launch mode ('reconfiguration', 'update', or 'initial')
     * @param {Object} options.context - Additional context to pass to wizard
     * @param {boolean} options.includeSuggestions - Whether to include configuration suggestions
     * @param {string} options.targetProfile - Specific profile to focus on
     * @returns {Promise<Object>} Launch result with wizard URL
     */
    async launchWizard(options = {}) {
        try {
            const { 
                mode = 'reconfiguration', 
                context = {},
                includeSuggestions = true,
                targetProfile = null
            } = options;
            
            // Export current configuration with detailed analysis
            const currentConfig = await this.exportCurrentConfiguration();
            
            // Add profile installation status
            currentConfig.profileStatus = await this.getProfileInstallationStatus();
            
            // Generate configuration suggestions if requested
            let suggestions = [];
            if (includeSuggestions) {
                suggestions = await this.generateConfigurationSuggestions();
                
                // Filter suggestions by target profile if specified
                if (targetProfile) {
                    suggestions = suggestions.filter(s => 
                        !s.context.targetProfile || s.context.targetProfile === targetProfile
                    );
                }
            }
            
            // Prepare wizard launch data with enhanced context
            const launchData = {
                mode,
                currentConfig,
                suggestions,
                context: {
                    ...context,
                    targetProfile,
                    launchedFrom: 'dashboard',
                    dashboardVersion: process.env.DASHBOARD_VERSION || '1.0.0'
                },
                timestamp: new Date().toISOString()
            };
            
            // Check if wizard is already running
            const isRunning = await this.isWizardRunning();
            
            if (!isRunning) {
                // Start the wizard process
                await this.startWizardProcess();
                
                // Wait for wizard to be ready
                await this.waitForWizardReady();
            }
            
            // Send launch data to wizard
            const wizardResponse = await this.sendLaunchData(launchData);
            
            // Construct wizard URL with mode parameters
            const urlParams = new URLSearchParams({
                mode,
                source: 'dashboard',
                timestamp: Date.now().toString()
            });
            
            if (targetProfile) {
                urlParams.set('profile', targetProfile);
            }
            
            if (suggestions.length > 0) {
                urlParams.set('suggestions', 'true');
            }
            
            return {
                success: true,
                wizardUrl: `${this.wizardUrl}?${urlParams.toString()}`,
                sessionId: wizardResponse.sessionId,
                mode,
                targetProfile,
                suggestionsCount: suggestions.length,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Failed to launch wizard:', error);
            throw new Error(`Wizard launch failed: ${error.message}`);
        }
    }

    /**
     * Export current system configuration
     * @returns {Promise<Object>} Current configuration
     */
    async exportCurrentConfiguration() {
        try {
            const config = {};
            
            // Read .env file
            try {
                const envContent = await fs.readFile(this.configPath, 'utf-8');
                config.environment = this.parseEnvFile(envContent);
            } catch (error) {
                console.warn('Could not read .env file:', error.message);
                config.environment = {};
            }
            
            // Read installation state
            try {
                const stateContent = await fs.readFile(this.installationStatePath, 'utf-8');
                config.installationState = JSON.parse(stateContent);
            } catch (error) {
                console.warn('Could not read installation state:', error.message);
                config.installationState = {};
            }
            
            // Get active Docker profiles
            config.activeProfiles = await this.getActiveProfiles();
            
            // Get service status
            config.serviceStatus = await this.getServiceStatus();
            
            // Add profile installation status
            config.profileStatus = await this.getProfileInstallationStatus();
            
            return config;
            
        } catch (error) {
            console.error('Failed to export configuration:', error);
            throw error;
        }
    }

    /**
     * Generate configuration suggestions based on current setup
     * @returns {Promise<Array>} Array of configuration suggestions
     */
    async generateConfigurationSuggestions() {
        const suggestions = [];
        
        try {
            const config = await this.exportCurrentConfiguration();
            const services = await this.getServiceStatus();
            const profileStatus = await this.getProfileInstallationStatus();
            
            // Check for local indexer optimization
            const hasLocalIndexers = services.some(s => 
                s.name.includes('indexer') && s.status === 'healthy' && !s.name.includes('kasia-indexer')
            );
            const hasAppsUsingPublicIndexers = config.environment.KASIA_INDEXER_URL && 
                config.environment.KASIA_INDEXER_URL.includes('api.kaspa.org');
            
            if (hasLocalIndexers && hasAppsUsingPublicIndexers) {
                suggestions.push({
                    id: 'switch-to-local-indexers',
                    title: 'Switch to Local Indexers',
                    description: 'Your local indexers are running. Switch applications to use local indexers for better performance and reduced latency.',
                    priority: 'high',
                    category: 'performance',
                    action: 'reconfigure',
                    estimatedImpact: 'Significant performance improvement',
                    context: {
                        targetProfile: 'kaspa-user-applications',
                        suggestedChanges: {
                            KASIA_INDEXER_URL: 'http://kasia-indexer:8080',
                            K_SOCIAL_INDEXER_URL: 'http://k-indexer:8080'
                        }
                    }
                });
            }
            
            // Check for wallet configuration
            if (!config.environment.KASPA_WALLET_ENABLED) {
                suggestions.push({
                    id: 'enable-wallet',
                    title: 'Enable Wallet Management',
                    description: 'Enable wallet functionality to manage KAS directly from the dashboard without command-line tools.',
                    priority: 'medium',
                    category: 'feature',
                    action: 'configure',
                    estimatedImpact: 'Enhanced user experience',
                    context: {
                        targetProfile: 'core',
                        suggestedChanges: {
                            KASPA_WALLET_ENABLED: 'true'
                        }
                    }
                });
            }
            
            // Check for resource monitoring
            const hasIndexerServices = profileStatus['indexer-services']?.installed;
            if (hasIndexerServices && !config.environment.RESOURCE_MONITORING_ENABLED) {
                suggestions.push({
                    id: 'enable-resource-monitoring',
                    title: 'Enable Resource Monitoring',
                    description: 'Enable automatic resource monitoring for indexer services to prevent system overload and ensure stable operation.',
                    priority: 'high',
                    category: 'monitoring',
                    action: 'configure',
                    estimatedImpact: 'Improved system stability',
                    context: {
                        targetProfile: 'indexer-services',
                        suggestedChanges: {
                            RESOURCE_MONITORING_ENABLED: 'true',
                            RESOURCE_MONITORING_INTERVAL: '30',
                            RESOURCE_ALERT_THRESHOLDS: 'cpu:80,memory:85,load:10'
                        }
                    }
                });
            }
            
            // Check for SSL/HTTPS configuration
            if (!config.environment.SSL_ENABLED && config.environment.NODE_ENV === 'production') {
                suggestions.push({
                    id: 'enable-ssl',
                    title: 'Enable SSL/HTTPS',
                    description: 'Enable SSL encryption for secure communication in production environment.',
                    priority: 'high',
                    category: 'security',
                    action: 'configure',
                    estimatedImpact: 'Enhanced security',
                    context: {
                        targetProfile: 'core',
                        suggestedChanges: {
                            SSL_ENABLED: 'true',
                            FORCE_HTTPS: 'true'
                        }
                    }
                });
            }
            
            // Check for backup configuration
            if (!config.environment.BACKUP_ENABLED) {
                suggestions.push({
                    id: 'enable-backups',
                    title: 'Enable Automatic Backups',
                    description: 'Enable automatic configuration backups to protect against data loss.',
                    priority: 'medium',
                    category: 'reliability',
                    action: 'configure',
                    estimatedImpact: 'Data protection',
                    context: {
                        targetProfile: 'core',
                        suggestedChanges: {
                            BACKUP_ENABLED: 'true',
                            BACKUP_INTERVAL: 'daily',
                            BACKUP_RETENTION: '7'
                        }
                    }
                });
            }
            
            // Check for developer mode optimization
            const hasDevMode = profileStatus['developer-mode']?.installed;
            const isProduction = config.environment.NODE_ENV === 'production';
            if (hasDevMode && isProduction) {
                suggestions.push({
                    id: 'disable-dev-mode-production',
                    title: 'Disable Developer Mode in Production',
                    description: 'Developer tools are enabled in production environment. Consider disabling for security.',
                    priority: 'medium',
                    category: 'security',
                    action: 'reconfigure',
                    estimatedImpact: 'Improved security',
                    context: {
                        targetProfile: 'developer-mode',
                        suggestedChanges: {
                            DEVELOPER_MODE_ENABLED: 'false'
                        }
                    }
                });
            }
            
            // Check for archive node optimization
            const hasArchiveNode = profileStatus['archive-node']?.installed;
            const hasLimitedStorage = await this.checkStorageSpace();
            if (hasArchiveNode && hasLimitedStorage) {
                suggestions.push({
                    id: 'optimize-archive-storage',
                    title: 'Optimize Archive Storage',
                    description: 'Archive node is running with limited storage. Consider enabling compression or pruning.',
                    priority: 'medium',
                    category: 'storage',
                    action: 'configure',
                    estimatedImpact: 'Reduced storage usage',
                    context: {
                        targetProfile: 'archive-node',
                        suggestedChanges: {
                            ARCHIVE_COMPRESSION_ENABLED: 'true',
                            ARCHIVE_PRUNING_ENABLED: 'true'
                        }
                    }
                });
            }
            
            return suggestions;
            
        } catch (error) {
            console.error('Failed to generate suggestions:', error);
            return [];
        }
    }

    /**
     * Check available storage space
     * @returns {Promise<boolean>} True if storage is limited (< 20GB free)
     */
    async checkStorageSpace() {
        try {
            const { stdout } = await execAsync("df -BG / | tail -1 | awk '{print $4}' | sed 's/G//'");
            const freeSpaceGB = parseInt(stdout.trim());
            return freeSpaceGB < 20; // Consider limited if less than 20GB free
        } catch (error) {
            console.error('Failed to check storage space:', error);
            return false;
        }
    }

    /**
     * Check if wizard is currently running
     * @returns {Promise<boolean>} True if wizard is running
     */
    async isWizardRunning() {
        try {
            const response = await axios.get(`${this.wizardUrl}/health`, { timeout: 2000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Start the wizard process
     * @returns {Promise<void>}
     */
    async startWizardProcess() {
        try {
            const wizardScript = path.join(this.projectRoot, 'services/wizard/start-wizard-if-needed.sh');
            
            // Make sure script is executable
            await execAsync(`chmod +x ${wizardScript}`);
            
            // Start wizard in background
            const { stdout, stderr } = await execAsync(`${wizardScript} &`);
            
            if (stderr && !stderr.includes('already running')) {
                console.warn('Wizard start warning:', stderr);
            }
            
            console.log('Wizard start output:', stdout);
            
        } catch (error) {
            console.error('Failed to start wizard process:', error);
            throw error;
        }
    }

    /**
     * Wait for wizard to be ready to accept requests
     * @param {number} maxWaitTime - Maximum wait time in milliseconds
     * @returns {Promise<void>}
     */
    async waitForWizardReady(maxWaitTime = 30000) {
        const startTime = Date.now();
        const checkInterval = 1000; // Check every second
        
        while (Date.now() - startTime < maxWaitTime) {
            if (await this.isWizardRunning()) {
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error('Wizard failed to start within timeout period');
    }

    /**
     * Send launch data to wizard
     * @param {Object} launchData - Data to send to wizard
     * @returns {Promise<Object>} Wizard response with session ID
     */
    async sendLaunchData(launchData) {
        try {
            const response = await axios.post(`${this.wizardUrl}/api/dashboard/launch`, launchData, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status !== 200) {
                throw new Error(`Wizard rejected launch data: ${response.statusText}`);
            }
            
            return response.data;
            
        } catch (error) {
            console.error('Failed to send launch data to wizard:', error);
            throw error;
        }
    }

    /**
     * Get profile installation status
     * @returns {Promise<Object>} Profile installation status
     */
    async getProfileInstallationStatus() {
        try {
            const activeProfiles = await this.getActiveProfiles();
            const allProfiles = [
                'core',
                'kaspa-user-applications', 
                'indexer-services',
                'archive-node',
                'mining',
                'developer-mode'
            ];
            
            const profileStatus = {};
            
            for (const profile of allProfiles) {
                const isActive = activeProfiles.includes(profile);
                const services = await this.getProfileServices(profile);
                const healthyServices = services.filter(s => s.status === 'healthy').length;
                
                profileStatus[profile] = {
                    installed: isActive,
                    active: isActive,
                    serviceCount: services.length,
                    healthyServices,
                    healthPercentage: services.length > 0 ? (healthyServices / services.length) * 100 : 0,
                    services: services.map(s => ({
                        name: s.name,
                        status: s.status,
                        dockerStatus: s.dockerStatus
                    }))
                };
            }
            
            return profileStatus;
            
        } catch (error) {
            console.error('Failed to get profile installation status:', error);
            return {};
        }
    }

    /**
     * Get services for a specific profile
     * @param {string} profileName - Profile name
     * @returns {Promise<Array>} Services in the profile
     */
    async getProfileServices(profileName) {
        try {
            const allServices = await this.getServiceStatus();
            
            // Map services to profiles (NEW profile IDs)
            const profileServiceMap = {
                // New profile IDs
                'kaspa-node': ['kaspa-node'],
                'kasia-app': ['kasia-app'],
                'k-social-app': ['k-social'],
                'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
                'kasia-indexer': ['kasia-indexer'],
                'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
                'kaspa-archive-node': ['kaspa-archive-node'],
                'kaspa-stratum': ['kaspa-stratum'],
                'management': ['portainer', 'pgadmin'],
                
                // Legacy profile IDs (for backward compatibility)
                'core': ['kaspa-node'],
                'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
                'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
                'archive-node': ['kaspa-archive-node'],
                'mining': ['kaspa-stratum'],
                'developer-mode': ['portainer', 'pgadmin']
            };
            
            const profileServices = profileServiceMap[profileName] || [];
            
            return allServices.filter(service => 
                profileServices.some(ps => service.name.includes(ps) || ps.includes(service.name))
            );
            
        } catch (error) {
            console.error(`Failed to get services for profile ${profileName}:`, error);
            return [];
        }
    }

    /**
     * Poll wizard status for completion
     * @param {string} sessionId - Wizard session ID
     * @returns {Promise<Object>} Completion status
     */
    async pollWizardStatus(sessionId) {
        try {
            const response = await axios.get(`${this.wizardUrl}/api/status/${sessionId}`, {
                timeout: 5000
            });
            
            return response.data;
            
        } catch (error) {
            console.error('Failed to poll wizard status:', error);
            throw error;
        }
    }

    /**
     * Start polling wizard status with reconfiguration awareness
     * @param {string} sessionId - Wizard session ID
     * @param {Object} options - Polling options
     * @param {number} options.interval - Polling interval in milliseconds
     * @param {number} options.timeout - Maximum polling time in milliseconds
     * @param {Function} options.onUpdate - Callback for status updates
     * @returns {Promise<Object>} Final completion status
     */
    async startWizardStatusPolling(sessionId, options = {}) {
        const {
            interval = 2000, // Poll every 2 seconds
            timeout = 300000, // 5 minute timeout
            onUpdate = null
        } = options;
        
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    // Check timeout
                    if (Date.now() - startTime > timeout) {
                        clearInterval(pollInterval);
                        reject(new Error('Wizard status polling timeout'));
                        return;
                    }
                    
                    const status = await this.pollWizardStatus(sessionId);
                    
                    // Call update callback if provided
                    if (onUpdate) {
                        onUpdate(status);
                    }
                    
                    // Check if wizard is complete
                    if (status.completed) {
                        clearInterval(pollInterval);
                        resolve(status);
                        return;
                    }
                    
                    // Check if wizard failed
                    if (status.failed) {
                        clearInterval(pollInterval);
                        reject(new Error(`Wizard failed: ${status.error || 'Unknown error'}`));
                        return;
                    }
                    
                } catch (error) {
                    console.error('Error during wizard status polling:', error);
                    // Continue polling unless it's a critical error
                    if (error.code === 'ECONNREFUSED') {
                        clearInterval(pollInterval);
                        reject(new Error('Wizard connection lost'));
                    }
                }
            }, interval);
        });
    }

    /**
     * Handle wizard completion with reconfiguration awareness
     * @param {Object} completionData - Completion data from wizard
     * @returns {Promise<Object>} Handling result
     */
    async handleWizardCompletion(completionData) {
        try {
            const { 
                changes, 
                newConfig, 
                restartRequired, 
                mode,
                profileChanges = {},
                configurationDiff = {}
            } = completionData;
            
            console.log('Processing wizard completion:', { mode, changes, restartRequired });
            
            // Reload configuration
            await this.reloadConfiguration();
            
            // Handle resource monitoring integration for indexer-services profile
            const resourceMonitoringResult = await this.handleResourceMonitoringIntegration(
                profileChanges, 
                newConfig
            );
            
            // Handle selective service restart for changed services only
            let restartResults = {};
            if (restartRequired && changes.services && changes.services.length > 0) {
                restartResults = await this.restartChangedServicesSelectively(changes.services, profileChanges);
            }
            
            // Update configuration suggestion engine after changes
            const newSuggestions = await this.generateConfigurationSuggestions();
            
            // Generate change summary for reconfiguration
            const changeSummary = this.generateChangeSummary(configurationDiff, profileChanges, changes);
            
            // Refresh dashboard state
            await this.refreshDashboardState();
            
            return {
                success: true,
                mode,
                changes,
                changeSummary,
                restartResults,
                resourceMonitoring: resourceMonitoringResult,
                newSuggestions,
                suggestionsCount: newSuggestions.length,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Failed to handle wizard completion:', error);
            throw error;
        }
    }

    /**
     * Handle resource monitoring integration with wizard completion
     * @param {Object} profileChanges - Profile changes from wizard
     * @param {Object} newConfig - New configuration from wizard
     * @returns {Promise<Object>} Resource monitoring setup result
     */
    async handleResourceMonitoringIntegration(profileChanges, newConfig) {
        const result = {
            enabled: false,
            configured: false,
            started: false,
            status: 'not-applicable',
            message: 'Resource monitoring not needed'
        };
        
        try {
            // Check if indexer-services profile was added or is active
            const indexerServicesAdded = profileChanges['indexer-services']?.action === 'added';
            const indexerServicesActive = newConfig?.activeProfiles?.includes('indexer-services');
            
            if (indexerServicesAdded || indexerServicesActive) {
                console.log('Indexer services detected, setting up resource monitoring...');
                
                // Check if resource monitoring should be enabled
                const shouldEnable = await this.shouldEnableResourceMonitoring(newConfig);
                
                if (shouldEnable) {
                    // Configure resource monitoring
                    const configResult = await this.configureResourceMonitoring(newConfig);
                    result.configured = configResult.success;
                    
                    if (configResult.success) {
                        // Start resource monitoring
                        const startResult = await this.startResourceMonitoring();
                        result.started = startResult.success;
                        result.enabled = true;
                        result.status = 'active';
                        result.message = 'Resource monitoring enabled and started for indexer services';
                    } else {
                        result.status = 'configuration-failed';
                        result.message = `Resource monitoring configuration failed: ${configResult.error}`;
                    }
                } else {
                    result.status = 'disabled-by-user';
                    result.message = 'Resource monitoring disabled by user preference';
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('Failed to handle resource monitoring integration:', error);
            result.status = 'error';
            result.message = `Resource monitoring setup failed: ${error.message}`;
            return result;
        }
    }

    /**
     * Determine if resource monitoring should be enabled
     * @param {Object} config - Configuration object
     * @returns {Promise<boolean>} True if should enable
     */
    async shouldEnableResourceMonitoring(config) {
        try {
            // Check user preference from wizard
            if (config.environment?.RESOURCE_MONITORING_ENABLED === 'false') {
                return false;
            }
            
            // Check if explicitly enabled
            if (config.environment?.RESOURCE_MONITORING_ENABLED === 'true') {
                return true;
            }
            
            // Default to enabled for indexer services (safety first)
            return true;
            
        } catch (error) {
            console.error('Failed to determine resource monitoring preference:', error);
            return true; // Default to enabled for safety
        }
    }

    /**
     * Configure resource monitoring for indexer services
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} Configuration result
     */
    async configureResourceMonitoring(config) {
        try {
            console.log('Configuring resource monitoring...');
            
            // Set up monitoring script permissions
            const scriptsResult = await this.setupMonitoringScripts();
            if (!scriptsResult.success) {
                return scriptsResult;
            }
            
            // Configure monitoring thresholds
            const thresholdsResult = await this.configureMonitoringThresholds(config);
            if (!thresholdsResult.success) {
                return thresholdsResult;
            }
            
            // Create monitoring log directory
            const logDirResult = await this.createMonitoringLogDirectory();
            if (!logDirResult.success) {
                return logDirResult;
            }
            
            return {
                success: true,
                message: 'Resource monitoring configured successfully'
            };
            
        } catch (error) {
            console.error('Failed to configure resource monitoring:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Set up monitoring scripts with appropriate permissions
     * @returns {Promise<Object>} Setup result
     */
    async setupMonitoringScripts() {
        try {
            const scriptsPath = path.join(this.projectRoot, 'scripts/monitoring');
            const scripts = [
                'resource-monitor.sh',
                'emergency-stop.sh',
                'quick-check.sh'
            ];
            
            for (const script of scripts) {
                const scriptPath = path.join(scriptsPath, script);
                
                // Check if script exists
                try {
                    await fs.access(scriptPath);
                } catch (error) {
                    console.warn(`Monitoring script not found: ${script}`);
                    continue;
                }
                
                // Make script executable
                await execAsync(`chmod +x ${scriptPath}`);
                console.log(`Made script executable: ${script}`);
            }
            
            return {
                success: true,
                message: 'Monitoring scripts configured'
            };
            
        } catch (error) {
            console.error('Failed to setup monitoring scripts:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Configure monitoring alert thresholds
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} Configuration result
     */
    async configureMonitoringThresholds(config) {
        try {
            const thresholds = {
                cpu: config.environment?.RESOURCE_CPU_THRESHOLD || '80',
                memory: config.environment?.RESOURCE_MEMORY_THRESHOLD || '85',
                load: config.environment?.RESOURCE_LOAD_THRESHOLD || '10.0',
                disk: config.environment?.RESOURCE_DISK_THRESHOLD || '80'
            };
            
            // Write thresholds to configuration file
            const thresholdsPath = path.join(this.projectRoot, '.kaspa-aio', 'monitoring-thresholds.json');
            await fs.mkdir(path.dirname(thresholdsPath), { recursive: true });
            await fs.writeFile(thresholdsPath, JSON.stringify(thresholds, null, 2));
            
            console.log('Monitoring thresholds configured:', thresholds);
            
            return {
                success: true,
                thresholds,
                message: 'Monitoring thresholds configured'
            };
            
        } catch (error) {
            console.error('Failed to configure monitoring thresholds:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create monitoring log directory and configure log rotation
     * @returns {Promise<Object>} Creation result
     */
    async createMonitoringLogDirectory() {
        try {
            const logDir = path.join(this.projectRoot, '.kaspa-aio', 'monitoring-logs');
            await fs.mkdir(logDir, { recursive: true });
            
            // Create log rotation configuration
            const logrotateConfig = `${logDir}/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}`;
            
            const logrotateConfigPath = path.join(logDir, 'logrotate.conf');
            await fs.writeFile(logrotateConfigPath, logrotateConfig);
            
            console.log('Monitoring log directory created:', logDir);
            
            return {
                success: true,
                logDir,
                message: 'Monitoring log directory configured'
            };
            
        } catch (error) {
            console.error('Failed to create monitoring log directory:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start resource monitoring
     * @returns {Promise<Object>} Start result
     */
    async startResourceMonitoring() {
        try {
            console.log('Starting resource monitoring...');
            
            // Check if monitoring is already running
            const isRunning = await this.isResourceMonitoringRunning();
            if (isRunning) {
                return {
                    success: true,
                    message: 'Resource monitoring already running'
                };
            }
            
            // Start monitoring script
            const monitorScript = path.join(this.projectRoot, 'scripts/monitoring/resource-monitor.sh');
            
            try {
                await fs.access(monitorScript);
            } catch (error) {
                return {
                    success: false,
                    error: 'Resource monitoring script not found'
                };
            }
            
            // Start monitoring in background
            const { stdout, stderr } = await execAsync(`nohup ${monitorScript} > /dev/null 2>&1 &`);
            
            // Wait a moment and check if it started successfully
            await new Promise(resolve => setTimeout(resolve, 2000));
            const startedSuccessfully = await this.isResourceMonitoringRunning();
            
            if (startedSuccessfully) {
                return {
                    success: true,
                    message: 'Resource monitoring started successfully'
                };
            } else {
                return {
                    success: false,
                    error: 'Resource monitoring failed to start'
                };
            }
            
        } catch (error) {
            console.error('Failed to start resource monitoring:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if resource monitoring is currently running
     * @returns {Promise<boolean>} True if running
     */
    async isResourceMonitoringRunning() {
        try {
            const { stdout } = await execAsync('pgrep -f "resource-monitor"');
            return stdout.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get resource monitoring status for wizard completion summary
     * @returns {Promise<Object>} Monitoring status
     */
    async getResourceMonitoringStatus() {
        try {
            const isRunning = await this.isResourceMonitoringRunning();
            const configExists = await this.fileExists(
                path.join(this.projectRoot, '.kaspa-aio', 'monitoring-thresholds.json')
            );
            
            return {
                enabled: configExists,
                running: isRunning,
                status: isRunning ? 'active' : (configExists ? 'configured' : 'not-configured'),
                message: isRunning ? 
                    'Resource monitoring is active' : 
                    (configExists ? 'Resource monitoring configured but not running' : 'Resource monitoring not configured')
            };
            
        } catch (error) {
            console.error('Failed to get resource monitoring status:', error);
            return {
                enabled: false,
                running: false,
                status: 'error',
                message: `Status check failed: ${error.message}`
            };
        }
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
     * Restart services that were changed by wizard selectively
     * @param {Array<string>} changedServices - List of changed service names
     * @param {Object} profileChanges - Profile-level changes
     * @returns {Promise<Object>} Restart results
     */
    async restartChangedServicesSelectively(changedServices, profileChanges = {}) {
        const results = {
            restarted: [],
            failed: [],
            skipped: []
        };
        
        try {
            // Determine which services actually need restart based on change type
            const servicesToRestart = [];
            
            for (const serviceName of changedServices) {
                const changeType = this.determineServiceChangeType(serviceName, profileChanges);
                
                if (changeType === 'configuration' || changeType === 'environment') {
                    servicesToRestart.push(serviceName);
                } else if (changeType === 'profile-added') {
                    // New services will be started by docker-compose, not restarted
                    results.skipped.push({
                        service: serviceName,
                        reason: 'New service - will be started automatically'
                    });
                } else {
                    results.skipped.push({
                        service: serviceName,
                        reason: `Change type '${changeType}' does not require restart`
                    });
                }
            }
            
            // Restart services in dependency order
            const orderedServices = this.orderServicesByDependencies(servicesToRestart);
            
            for (const serviceName of orderedServices) {
                try {
                    console.log(`Restarting changed service: ${serviceName}`);
                    await execAsync(`docker restart ${serviceName}`);
                    results.restarted.push(serviceName);
                    
                    // Wait a moment between restarts to avoid overwhelming the system
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                } catch (error) {
                    console.error(`Failed to restart service ${serviceName}:`, error);
                    results.failed.push({
                        service: serviceName,
                        error: error.message
                    });
                }
            }
            
            return results;
            
        } catch (error) {
            console.error('Failed to restart changed services:', error);
            throw error;
        }
    }

    /**
     * Determine the type of change for a service
     * @param {string} serviceName - Service name
     * @param {Object} profileChanges - Profile changes
     * @returns {string} Change type
     */
    determineServiceChangeType(serviceName, profileChanges) {
        // Check if service is in a newly added profile
        for (const [profile, change] of Object.entries(profileChanges)) {
            if (change.action === 'added' && change.services?.includes(serviceName)) {
                return 'profile-added';
            }
            if (change.action === 'removed' && change.services?.includes(serviceName)) {
                return 'profile-removed';
            }
        }
        
        // Default to configuration change
        return 'configuration';
    }

    /**
     * Order services by their dependencies for restart
     * @param {Array<string>} services - Service names
     * @returns {Array<string>} Ordered service names
     */
    orderServicesByDependencies(services) {
        // Simple dependency ordering - in a real implementation, this would
        // use the actual dependency graph
        const dependencyOrder = [
            'indexer-db',
            'archive-db',
            'kaspa-node',
            'kasia-indexer',
            'k-indexer',
            'simply-kaspa-indexer',
            'archive-indexer',
            'kaspa-stratum',
            'kasia-app',
            'k-social',
            'kaspa-explorer',
            'dashboard',
            'nginx',
            'portainer',
            'pgadmin'
        ];
        
        return services.sort((a, b) => {
            const aIndex = dependencyOrder.findIndex(dep => a.includes(dep));
            const bIndex = dependencyOrder.findIndex(dep => b.includes(dep));
            
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            
            return aIndex - bIndex;
        });
    }

    /**
     * Generate a human-readable change summary
     * @param {Object} configurationDiff - Configuration differences
     * @param {Object} profileChanges - Profile changes
     * @param {Object} changes - General changes
     * @returns {Object} Change summary
     */
    generateChangeSummary(configurationDiff, profileChanges, changes) {
        const summary = {
            profiles: {
                added: [],
                removed: [],
                modified: []
            },
            configuration: {
                added: [],
                modified: [],
                removed: []
            },
            services: {
                restarted: changes.services || [],
                count: (changes.services || []).length
            },
            impact: 'low'
        };
        
        // Process profile changes
        for (const [profile, change] of Object.entries(profileChanges)) {
            if (change.action === 'added') {
                summary.profiles.added.push({
                    name: profile,
                    services: change.services || []
                });
            } else if (change.action === 'removed') {
                summary.profiles.removed.push({
                    name: profile,
                    services: change.services || []
                });
            } else if (change.action === 'modified') {
                summary.profiles.modified.push({
                    name: profile,
                    changes: change.changes || []
                });
            }
        }
        
        // Process configuration changes
        for (const [key, change] of Object.entries(configurationDiff)) {
            if (change.action === 'added') {
                summary.configuration.added.push({
                    key,
                    value: change.newValue
                });
            } else if (change.action === 'modified') {
                summary.configuration.modified.push({
                    key,
                    oldValue: change.oldValue,
                    newValue: change.newValue
                });
            } else if (change.action === 'removed') {
                summary.configuration.removed.push({
                    key,
                    oldValue: change.oldValue
                });
            }
        }
        
        // Determine impact level
        if (summary.profiles.added.length > 0 || summary.profiles.removed.length > 0) {
            summary.impact = 'high';
        } else if (summary.services.count > 3 || summary.configuration.modified.length > 5) {
            summary.impact = 'medium';
        }
        
        return summary;
    }

    /**
     * Refresh dashboard state after reconfiguration
     * @returns {Promise<void>}
     */
    async refreshDashboardState() {
        try {
            // This would typically emit events or call callbacks to refresh
            // various dashboard components
            console.log('Dashboard state refresh triggered');
            
            // In a real implementation, this might:
            // - Emit a 'configuration-changed' event
            // - Trigger service status refresh
            // - Update cached configuration data
            // - Refresh WebSocket connections if needed
            
        } catch (error) {
            console.error('Failed to refresh dashboard state:', error);
            throw error;
        }
    }

    /**
     * Reload configuration after wizard changes
     * @returns {Promise<void>}
     */
    async reloadConfiguration() {
        try {
            // Trigger configuration reload in main application
            // This would typically emit an event or call a callback
            console.log('Configuration reload triggered');
            
        } catch (error) {
            console.error('Failed to reload configuration:', error);
            throw error;
        }
    }

    /**
     * Restart services that were changed by wizard
     * @param {Array<string>} changedServices - List of changed service names
     * @returns {Promise<void>}
     */
    async restartChangedServices(changedServices) {
        try {
            for (const serviceName of changedServices) {
                console.log(`Restarting changed service: ${serviceName}`);
                await execAsync(`docker restart ${serviceName}`);
            }
            
        } catch (error) {
            console.error('Failed to restart changed services:', error);
            throw error;
        }
    }

    /**
     * Parse .env file content into key-value pairs
     * @param {string} content - .env file content
     * @returns {Object} Parsed environment variables
     */
    parseEnvFile(content) {
        const env = {};
        
        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) {
                    env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        return env;
    }

    /**
     * Get active Docker profiles
     * @returns {Promise<Array<string>>} Active profile names
     */
    async getActiveProfiles() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
            const runningServices = stdout.trim().split('\n').filter(line => line);
            
            const profiles = new Set(['core']);
            
            // Map services to profiles based on naming patterns
            runningServices.forEach(serviceName => {
                if (serviceName.includes('kasia') || serviceName.includes('k-social') || serviceName.includes('kaspa-explorer')) {
                    profiles.add('kaspa-user-applications');
                }
                if (serviceName.includes('indexer') || serviceName.includes('indexer-db')) {
                    profiles.add('indexer-services');
                }
                if (serviceName.includes('archive')) {
                    profiles.add('archive-node');
                }
                if (serviceName.includes('stratum')) {
                    profiles.add('mining');
                }
                if (serviceName.includes('portainer') || serviceName.includes('pgadmin')) {
                    profiles.add('developer-mode');
                }
            });
            
            return Array.from(profiles);
            
        } catch (error) {
            console.error('Failed to get active profiles:', error);
            return ['core'];
        }
    }

    /**
     * Get current service status
     * @returns {Promise<Array<Object>>} Service status information
     */
    async getServiceStatus() {
        try {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}\t{{.State}}"');
            const services = [];
            
            stdout.trim().split('\n').filter(line => line).forEach(line => {
                const [name, status, state] = line.split('\t');
                services.push({
                    name,
                    status: state === 'running' ? 'healthy' : 'stopped',
                    dockerStatus: status,
                    state
                });
            });
            
            return services;
            
        } catch (error) {
            console.error('Failed to get service status:', error);
            return [];
        }
    }
}

module.exports = WizardIntegration;