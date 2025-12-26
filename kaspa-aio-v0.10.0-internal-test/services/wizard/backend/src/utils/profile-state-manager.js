const fs = require('fs').promises;
const path = require('path');
const DockerManager = require('./docker-manager');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * ProfileStateManager - Detects and manages profile installation state (Singleton)
 * 
 * This class provides comprehensive profile state detection by:
 * - Checking docker-compose.yml for active services
 * - Checking .env file for profile-specific configurations
 * - Implementing service health checking for running status
 * - Caching profile state with periodic refresh
 * 
 * Singleton pattern ensures only one instance exists across the application,
 * preventing multiple periodic refresh timers and redundant state checking.
 * 
 * Requirements: 16.5, 16.6, 17.1, 17.2
 */
class ProfileStateManager {
  constructor() {
    // Prevent direct instantiation
    if (ProfileStateManager.instance) {
      return ProfileStateManager.instance;
    }

    this.dockerManager = new DockerManager();
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    
    // Cache for profile states
    this.stateCache = {
      profiles: null,
      lastUpdated: null,
      refreshInterval: 30000, // 30 seconds
      isRefreshing: false
    };
    
    // Track if periodic refresh has been started
    this.periodicRefreshStarted = false;
    
    // Profile definitions with service mappings
    this.profileDefinitions = {
      'core': {
        id: 'core',
        name: 'Core Profile',
        description: 'Kaspa node (public/private) with optional wallet',
        services: ['kaspa-node', 'dashboard', 'nginx'],
        configKeys: ['KASPA_NODE_RPC_PORT', 'KASPA_NODE_P2P_PORT', 'PUBLIC_NODE', 'DASHBOARD_PORT'],
        dockerComposeServices: ['kaspa-node'],
        healthCheckEndpoints: [
          { service: 'kaspa-node', url: 'http://localhost:16110', type: 'rpc' }
        ]
      },
      'kaspa-user-applications': {
        id: 'kaspa-user-applications',
        name: 'Kaspa User Applications',
        description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
        services: ['kasia-app', 'k-social', 'kaspa-explorer'],
        configKeys: ['KASIA_APP_PORT', 'KSOCIAL_APP_PORT', 'KASPA_EXPLORER_PORT'],
        dockerComposeServices: ['kasia-app', 'k-social', 'kaspa-explorer'],
        healthCheckEndpoints: [
          { service: 'kasia-app', url: 'http://localhost:3001', type: 'http' },
          { service: 'k-social', url: 'http://localhost:3002', type: 'http' },
          { service: 'kaspa-explorer', url: 'http://localhost:3003', type: 'http' }
        ]
      },
      'indexer-services': {
        id: 'indexer-services',
        name: 'Indexer Services',
        description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa)',
        services: ['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
        configKeys: ['TIMESCALEDB_PORT', 'KASIA_INDEXER_PORT', 'K_INDEXER_PORT', 'SIMPLY_KASPA_INDEXER_PORT'],
        dockerComposeServices: ['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
        healthCheckEndpoints: [
          { service: 'k-social-db', url: 'postgresql://localhost:5432', type: 'database' },
          { service: 'simply-kaspa-db', url: 'postgresql://localhost:5433', type: 'database' }
        ]
      },
      'archive-node': {
        id: 'archive-node',
        name: 'Archive Node Profile',
        description: 'Non-pruning Kaspa node for complete blockchain history',
        services: ['kaspa-archive-node'],
        configKeys: ['KASPA_ARCHIVE_RPC_PORT', 'KASPA_ARCHIVE_P2P_PORT'],
        dockerComposeServices: ['archive-db', 'archive-indexer'],
        healthCheckEndpoints: [
          { service: 'archive-indexer', url: 'http://localhost:16120', type: 'rpc' }
        ]
      },
      'mining': {
        id: 'mining',
        name: 'Mining Profile',
        description: 'Local mining stratum pointed to local node',
        services: ['kaspa-stratum'],
        configKeys: ['KASPA_STRATUM_PORT', 'MINING_ADDRESS'],
        dockerComposeServices: ['kaspa-stratum'],
        healthCheckEndpoints: [
          { service: 'kaspa-stratum', url: 'http://localhost:5555', type: 'stratum' }
        ]
      }
    };
    
    // Store singleton instance
    ProfileStateManager.instance = this;
    
    // Start periodic refresh only once
    this.startPeriodicRefresh();
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!ProfileStateManager.instance) {
      ProfileStateManager.instance = new ProfileStateManager();
    }
    return ProfileStateManager.instance;
  }

  /**
   * Get comprehensive profile states with installation status
   * Uses cache if available and fresh, otherwise refreshes
   */
  async getProfileStates(forceRefresh = false) {
    try {
      // Check if we need to refresh
      const needsRefresh = forceRefresh || 
        !this.stateCache.profiles || 
        !this.stateCache.lastUpdated ||
        (Date.now() - this.stateCache.lastUpdated) > this.stateCache.refreshInterval;

      if (needsRefresh && !this.stateCache.isRefreshing) {
        await this.refreshProfileStates();
      }

      return {
        success: true,
        profiles: this.stateCache.profiles || [],
        lastUpdated: this.stateCache.lastUpdated,
        cached: !forceRefresh && !needsRefresh
      };
    } catch (error) {
      console.error('Error getting profile states:', error);
      return {
        success: false,
        error: error.message,
        profiles: []
      };
    }
  }

  /**
   * Refresh profile states by checking all detection methods
   */
  async refreshProfileStates() {
    if (this.stateCache.isRefreshing) {
      return; // Already refreshing
    }

    this.stateCache.isRefreshing = true;
    
    try {
      console.log('Refreshing profile states...');
      
      // Get current configuration
      const currentConfig = await this.loadCurrentConfiguration();
      
      // Get installation state
      const installationState = await this.loadInstallationState();
      
      // Get running services
      const runningServices = await this.dockerManager.getRunningServices();
      
      // Check docker-compose.yml for configured services
      const dockerComposeServices = await this.getDockerComposeServices();
      
      // Analyze each profile
      const profileStates = [];
      
      for (const [profileId, definition] of Object.entries(this.profileDefinitions)) {
        const state = await this.analyzeProfileState(
          definition,
          currentConfig,
          installationState,
          runningServices,
          dockerComposeServices
        );
        
        profileStates.push(state);
      }
      
      // Update cache
      this.stateCache.profiles = profileStates;
      this.stateCache.lastUpdated = Date.now();
      
      console.log(`Profile states refreshed: ${profileStates.length} profiles analyzed`);
      
    } catch (error) {
      console.error('Error refreshing profile states:', error);
      throw error;
    } finally {
      this.stateCache.isRefreshing = false;
    }
  }

  /**
   * Analyze the state of a specific profile
   */
  async analyzeProfileState(definition, currentConfig, installationState, runningServices, dockerComposeServices) {
    const profileId = definition.id;
    
    // Check installation state (most reliable source)
    const isInInstallationState = this.checkInstallationState(profileId, installationState);
    
    // Check configuration presence
    const isConfigured = this.checkConfigurationPresence(definition, currentConfig);
    
    // Check docker-compose.yml
    const isInDockerCompose = this.checkDockerComposePresence(definition, dockerComposeServices);
    
    // Check running services
    const runningStatus = this.checkRunningServices(definition, runningServices);
    
    // Perform health checks
    const healthStatus = await this.performHealthChecks(definition);
    
    // Determine overall installation state
    const installationState_result = this.determineInstallationState(
      isInInstallationState,
      isConfigured,
      isInDockerCompose,
      runningStatus
    );
    
    // Determine service status
    const serviceStatus = this.determineServiceStatus(runningStatus, healthStatus);
    
    // Get additional metadata
    const metadata = this.getProfileMetadata(profileId, installationState, currentConfig);
    
    return {
      ...definition,
      installationState: installationState_result,
      status: serviceStatus,
      runningServices: runningStatus.runningCount,
      totalServices: definition.services.length,
      healthStatus,
      detectionSources: {
        installationState: isInInstallationState,
        configuration: isConfigured,
        dockerCompose: isInDockerCompose,
        runningServices: runningStatus.runningCount > 0
      },
      ...metadata,
      canModify: installationState_result === 'installed',
      canRemove: installationState_result === 'installed' || installationState_result === 'partial',
      canAdd: installationState_result === 'not-installed'
    };
  }

  /**
   * Check if profile is in installation state
   */
  checkInstallationState(profileId, installationState) {
    if (!installationState || !installationState.profiles) {
      return false;
    }
    
    // Check both old and new format
    if (Array.isArray(installationState.profiles)) {
      return installationState.profiles.includes(profileId);
    }
    
    if (installationState.profiles.selected) {
      return installationState.profiles.selected.includes(profileId);
    }
    
    return false;
  }

  /**
   * Check if profile configuration is present in .env
   */
  checkConfigurationPresence(definition, currentConfig) {
    if (!currentConfig || Object.keys(currentConfig).length === 0) {
      return false;
    }
    
    // Check if any of the profile's config keys are present
    return definition.configKeys.some(key => 
      currentConfig.hasOwnProperty(key) && currentConfig[key] !== ''
    );
  }

  /**
   * Check if profile services are in docker-compose.yml
   */
  checkDockerComposePresence(definition, dockerComposeServices) {
    if (!dockerComposeServices || dockerComposeServices.length === 0) {
      return false;
    }
    
    // Check if any of the profile's docker services are configured
    return definition.dockerComposeServices.some(service =>
      dockerComposeServices.includes(service)
    );
  }

  /**
   * Check running services for this profile
   */
  checkRunningServices(definition, runningServices) {
    const runningServiceNames = runningServices.map(s => s.name);
    const profileServices = definition.dockerComposeServices;
    
    const runningCount = profileServices.filter(service =>
      runningServiceNames.includes(service)
    ).length;
    
    return {
      runningCount,
      totalCount: profileServices.length,
      runningServices: profileServices.filter(service =>
        runningServiceNames.includes(service)
      ),
      stoppedServices: profileServices.filter(service =>
        !runningServiceNames.includes(service)
      )
    };
  }

  /**
   * Perform health checks for profile services
   */
  async performHealthChecks(definition) {
    const healthResults = {};
    
    for (const endpoint of definition.healthCheckEndpoints) {
      try {
        const result = await this.performSingleHealthCheck(endpoint);
        healthResults[endpoint.service] = result;
      } catch (error) {
        healthResults[endpoint.service] = {
          healthy: false,
          error: error.message,
          type: endpoint.type
        };
      }
    }
    
    const healthyCount = Object.values(healthResults).filter(r => r.healthy).length;
    const totalCount = Object.keys(healthResults).length;
    
    return {
      results: healthResults,
      healthyCount,
      totalCount,
      allHealthy: healthyCount === totalCount,
      anyHealthy: healthyCount > 0
    };
  }

  /**
   * Perform a single health check
   */
  async performSingleHealthCheck(endpoint) {
    const timeout = 5000; // 5 second timeout
    
    try {
      switch (endpoint.type) {
        case 'http':
          return await this.httpHealthCheck(endpoint.url, timeout);
        case 'rpc':
          return await this.rpcHealthCheck(endpoint.url, timeout);
        case 'database':
          return await this.databaseHealthCheck(endpoint.url, timeout);
        case 'stratum':
          return await this.stratumHealthCheck(endpoint.url, timeout);
        default:
          throw new Error(`Unknown health check type: ${endpoint.type}`);
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        type: endpoint.type
      };
    }
  }

  /**
   * HTTP health check
   */
  async httpHealthCheck(url, timeout) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const cmd = `curl -f -s --max-time ${timeout/1000} ${url} > /dev/null`;
      await execAsync(cmd);
      return { healthy: true, type: 'http' };
    } catch (error) {
      return { healthy: false, error: 'HTTP request failed', type: 'http' };
    }
  }

  /**
   * RPC health check
   */
  async rpcHealthCheck(url, timeout) {
    // For Kaspa RPC, we can try a simple getInfo call
    try {
      const cmd = `curl -f -s --max-time ${timeout/1000} -X POST -H "Content-Type: application/json" -d '{"method":"getInfo","params":[],"id":1}' ${url} > /dev/null`;
      await execAsync(cmd);
      return { healthy: true, type: 'rpc' };
    } catch (error) {
      return { healthy: false, error: 'RPC request failed', type: 'rpc' };
    }
  }

  /**
   * Database health check
   */
  async databaseHealthCheck(url, timeout) {
    // For PostgreSQL, we can try a simple connection test
    // This is a simplified check - in production you might want to use a proper client
    try {
      const port = url.includes(':5432') ? '5432' : '5433';
      const cmd = `nc -z localhost ${port}`;
      await execAsync(cmd);
      return { healthy: true, type: 'database' };
    } catch (error) {
      return { healthy: false, error: 'Database connection failed', type: 'database' };
    }
  }

  /**
   * Stratum health check
   */
  async stratumHealthCheck(url, timeout) {
    try {
      const port = url.split(':').pop();
      const cmd = `nc -z localhost ${port}`;
      await execAsync(cmd);
      return { healthy: true, type: 'stratum' };
    } catch (error) {
      return { healthy: false, error: 'Stratum connection failed', type: 'stratum' };
    }
  }

  /**
   * Determine overall installation state
   */
  determineInstallationState(isInInstallationState, isConfigured, isInDockerCompose, runningStatus) {
    // Priority order: installation state > docker compose > configuration > running services
    
    if (isInInstallationState) {
      return 'installed';
    }
    
    if (isInDockerCompose) {
      return 'installed';
    }
    
    if (isConfigured) {
      return 'installed';
    }
    
    if (runningStatus.runningCount === runningStatus.totalCount && runningStatus.runningCount > 0) {
      return 'installed';
    }
    
    if (runningStatus.runningCount > 0) {
      return 'partial';
    }
    
    return 'not-installed';
  }

  /**
   * Determine service status
   */
  determineServiceStatus(runningStatus, healthStatus) {
    if (runningStatus.runningCount === 0) {
      return 'stopped';
    }
    
    if (runningStatus.runningCount === runningStatus.totalCount) {
      if (healthStatus.allHealthy) {
        return 'healthy';
      } else if (healthStatus.anyHealthy) {
        return 'degraded';
      } else {
        return 'unhealthy';
      }
    }
    
    return 'partial';
  }

  /**
   * Get profile metadata
   */
  getProfileMetadata(profileId, installationState, currentConfig) {
    let version = null;
    let lastModified = null;
    let dataSize = null;
    
    if (installationState) {
      version = installationState.version || '1.0.0';
      lastModified = installationState.lastModified || installationState.installedAt;
    }
    
    return {
      version,
      lastModified,
      dataSize // TODO: Calculate actual data size if needed
    };
  }

  /**
   * Load current configuration from .env file
   */
  async loadCurrentConfiguration() {
    try {
      const envPath = path.join(this.projectRoot, '.env');
      const envContent = await fs.readFile(envPath, 'utf8');
      return this.parseEnvFile(envContent);
    } catch (error) {
      // .env doesn't exist or can't be read
      return {};
    }
  }

  /**
   * Load installation state from .kaspa-aio/installation-state.json
   */
  async loadInstallationState() {
    try {
      const statePath = path.join(this.projectRoot, '.kaspa-aio', 'installation-state.json');
      const stateContent = await fs.readFile(statePath, 'utf8');
      return JSON.parse(stateContent);
    } catch (error) {
      // Installation state doesn't exist
      return null;
    }
  }

  /**
   * Get services configured in docker-compose.yml
   */
  async getDockerComposeServices() {
    try {
      const composePath = path.join(this.projectRoot, 'docker-compose.yml');
      const composeContent = await fs.readFile(composePath, 'utf8');
      
      // Parse YAML to extract service names under the 'services' section
      const lines = composeContent.split('\n');
      const services = [];
      let inServicesSection = false;
      let currentIndent = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check if we're entering the services section
        if (trimmed === 'services:') {
          inServicesSection = true;
          currentIndent = line.indexOf('services:');
          continue;
        }
        
        // If we're in services section
        if (inServicesSection) {
          // Check if we've left the services section (same or less indentation)
          const lineIndent = line.length - line.trimStart().length;
          if (trimmed && lineIndent <= currentIndent) {
            inServicesSection = false;
            continue;
          }
          
          // Look for service definitions (one level deeper than 'services:')
          if (trimmed && lineIndent === currentIndent + 2 && trimmed.endsWith(':')) {
            const serviceName = trimmed.replace(':', '');
            // Filter out common YAML keys that aren't services
            if (!['version', 'volumes', 'networks', 'configs', 'secrets'].includes(serviceName)) {
              services.push(serviceName);
            }
          }
        }
      }
      
      return services;
        
    } catch (error) {
      // docker-compose.yml doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Parse .env file content into key-value object
   */
  parseEnvFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse key=value
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        config[key] = value;
      }
    }
    
    return config;
  }

  /**
   * Start periodic refresh of profile states (singleton-safe)
   */
  startPeriodicRefresh() {
    // Only start if not already started
    if (this.periodicRefreshStarted) {
      console.log('ProfileStateManager: Periodic refresh already started');
      return;
    }

    // Refresh every 30 seconds
    setInterval(async () => {
      try {
        await this.refreshProfileStates();
      } catch (error) {
        console.error('Error in periodic profile state refresh:', error);
      }
    }, this.stateCache.refreshInterval);
    
    this.periodicRefreshStarted = true;
    console.log('ProfileStateManager: Started periodic refresh every 30 seconds');
  }

  /**
   * Get profile state for a specific profile
   */
  async getProfileState(profileId) {
    const states = await this.getProfileStates();
    if (!states.success) {
      return states;
    }
    
    const profile = states.profiles.find(p => p.id === profileId);
    if (!profile) {
      return {
        success: false,
        error: `Profile not found: ${profileId}`
      };
    }
    
    return {
      success: true,
      profile,
      lastUpdated: states.lastUpdated
    };
  }

  /**
   * Get profiles grouped by installation state
   */
  async getProfilesByState() {
    const states = await this.getProfileStates();
    if (!states.success) {
      return states;
    }
    
    const grouped = {
      installed: states.profiles.filter(p => p.installationState === 'installed'),
      partial: states.profiles.filter(p => p.installationState === 'partial'),
      'not-installed': states.profiles.filter(p => p.installationState === 'not-installed')
    };
    
    return {
      success: true,
      grouped,
      summary: {
        installed: grouped.installed.length,
        partial: grouped.partial.length,
        available: grouped['not-installed'].length,
        total: states.profiles.length
      },
      lastUpdated: states.lastUpdated
    };
  }

  /**
   * Force refresh of profile states
   */
  async forceRefresh() {
    return await this.getProfileStates(true);
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      cached: this.stateCache.profiles !== null,
      lastUpdated: this.stateCache.lastUpdated,
      age: this.stateCache.lastUpdated ? Date.now() - this.stateCache.lastUpdated : null,
      refreshInterval: this.stateCache.refreshInterval,
      isRefreshing: this.stateCache.isRefreshing
    };
  }
}

// Static property to hold singleton instance
ProfileStateManager.instance = null;

module.exports = ProfileStateManager;