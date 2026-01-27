const fs = require('fs').promises;
const path = require('path');

/**
 * Profile Addition Module
 * Handles adding profiles to existing installations with integration options
 * Requirements: 17.6, 17.7, 17.8, 18.1, 18.2
 */
class ProfileAddition {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Add profile to existing installation
   */
  async addProfile(profileId, options = {}) {
    try {
      const { currentProfiles = [], integrationOptions = {} } = options;
      
      // Get profile definition
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) {
        return {
          success: false,
          error: `Profile '${profileId}' not found`
        };
      }
      
      // Validate addition first
      const DependencyValidator = require('../dependency-validator');
      const dependencyValidator = new DependencyValidator();
      const validation = await dependencyValidator.validateAddition(profileId, currentProfiles);
      
      if (!validation.canAdd) {
        return {
          success: false,
          error: 'Cannot add profile',
          validation
        };
      }
      
      // Get services to add
      const servicesToAdd = profile.services.map(s => s.name);
      
      // Generate updated configuration
      const updatedProfiles = [...currentProfiles, profileId];
      const ConfigGenerator = require('../config-generator');
      const configGenerator = new ConfigGenerator();
      
      // Load current configuration
      const currentConfig = await this.loadCurrentConfiguration();
      
      // Apply integration options to configuration
      const integratedConfig = this.applyIntegrationOptions(
        currentConfig, 
        profileId, 
        currentProfiles, 
        integrationOptions
      );
      
      // Generate new configuration for all profiles
      const newConfig = await configGenerator.generateConfig(updatedProfiles, integratedConfig);
      
      // Save updated configuration
      const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../../..');
      const envPath = path.join(projectRoot, '.env');
      const envContent = await configGenerator.generateEnvFile(newConfig, updatedProfiles);
      
      await configGenerator.saveEnvFile(envContent, envPath);
      
      // Update docker-compose configuration incrementally
      const DockerManager = require('../docker-manager');
      const dockerManager = new DockerManager();
      
      // Start new services
      const startResult = await dockerManager.startServices([profileId]);
      
      if (!startResult.success) {
        return {
          success: false,
          error: `Failed to start services for profile '${profileId}': ${startResult.error}`
        };
      }
      
      // Update installation state
      await this.updateInstallationStateAfterAddition(profileId, currentProfiles, integrationOptions);
      
      // Determine integration changes made
      const integrationChanges = this.calculateIntegrationChanges(
        currentConfig, 
        integratedConfig, 
        profileId, 
        currentProfiles
      );
      
      return {
        success: true,
        addedServices: servicesToAdd,
        integrationChanges,
        requiresRestart: integrationChanges.length > 0,
        newConfiguration: newConfig
      };
      
    } catch (error) {
      console.error('Error adding profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get integration options for adding a profile to existing installation
   */
  async getIntegrationOptions(profileId, currentProfiles) {
    try {
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) {
        throw new Error(`Profile '${profileId}' not found`);
      }

      const options = {
        profileId,
        profileName: profile.name,
        currentProfiles,
        integrationTypes: [],
        recommendations: []
      };

      // Indexer Services integration with existing Core profile
      if (profileId === 'indexer-services' && currentProfiles.includes('core')) {
        options.integrationTypes.push({
          type: 'indexer_node_connection',
          title: 'Indexer Node Connection',
          description: 'Configure how indexers connect to your local Kaspa node',
          required: true,
          options: [
            {
              id: 'local_node',
              label: 'Connect to Local Node',
              description: 'All indexers will connect to your local Kaspa node',
              recommended: true,
              impact: 'Reduces external dependencies, improves performance',
              config: {
                KASPA_NODE_URL: 'http://kaspa-node:16110',
                USE_LOCAL_NODE: 'true',
                INDEXER_NODE_TYPE: 'local'
              }
            },
            {
              id: 'public_network',
              label: 'Use Public Network',
              description: 'Indexers will connect to public Kaspa network',
              recommended: false,
              impact: 'Maintains current setup, relies on external services',
              config: {
                USE_LOCAL_NODE: 'false',
                INDEXER_NODE_TYPE: 'public'
              }
            },
            {
              id: 'mixed',
              label: 'Mixed Configuration',
              description: 'Some indexers use local node, others use public network',
              recommended: false,
              impact: 'Flexible but more complex configuration',
              config: {
                KASIA_INDEXER_NODE: 'local',
                K_INDEXER_NODE: 'public',
                SIMPLY_KASPA_INDEXER_NODE: 'local'
              }
            }
          ]
        });

        options.recommendations.push({
          priority: 'high',
          title: 'Use Local Node Connection',
          message: 'Connecting indexers to your local node will improve performance and reduce external dependencies.',
          action: 'Select "Connect to Local Node" option'
        });
      }

      // Kaspa User Applications integration with existing Indexer Services
      if (profileId === 'kaspa-user-applications' && currentProfiles.includes('indexer-services')) {
        options.integrationTypes.push({
          type: 'app_indexer_connection',
          title: 'Application Indexer Connection',
          description: 'Configure which indexers your applications will use',
          required: true,
          options: [
            {
              id: 'local_indexers',
              label: 'Use Local Indexers',
              description: 'Applications will connect to your local indexer services',
              recommended: true,
              impact: 'Faster response times, no external API limits',
              config: {
                KASIA_INDEXER_URL: 'http://kasia-indexer:3004',
                K_INDEXER_URL: 'http://k-indexer:3005',
                SIMPLY_KASPA_INDEXER_URL: 'http://simply-kaspa-indexer:3006',
                USE_LOCAL_INDEXERS: 'true'
              }
            },
            {
              id: 'public_apis',
              label: 'Use Public APIs',
              description: 'Applications will use public indexer APIs',
              recommended: false,
              impact: 'Relies on external services, may have rate limits',
              config: {
                USE_LOCAL_INDEXERS: 'false',
                KASIA_INDEXER_URL: 'https://api.kasia.io',
                K_INDEXER_URL: 'https://api.k-social.io',
                SIMPLY_KASPA_INDEXER_URL: 'https://api.simplykaspa.io'
              }
            },
            {
              id: 'mixed_indexers',
              label: 'Mixed Configuration',
              description: 'Some apps use local indexers, others use public APIs',
              recommended: false,
              impact: 'Flexible configuration, partial local optimization',
              config: {
                KASIA_APP_INDEXER: 'local',
                K_SOCIAL_INDEXER: 'local',
                KASPA_EXPLORER_INDEXER: 'public'
              }
            }
          ]
        });

        options.recommendations.push({
          priority: 'high',
          title: 'Use Local Indexers',
          message: 'Your local indexer services can provide faster and more reliable data to applications.',
          action: 'Select "Use Local Indexers" option'
        });
      }

      // Mining integration with existing Core/Archive Node
      if (profileId === 'mining' && (currentProfiles.includes('core') || currentProfiles.includes('archive-node'))) {
        const nodeType = currentProfiles.includes('core') ? 'Core' : 'Archive';
        
        options.integrationTypes.push({
          type: 'mining_node_connection',
          title: 'Mining Node Connection',
          description: `Configure mining connection to your local ${nodeType} node`,
          required: true,
          options: [
            {
              id: 'local_node',
              label: `Connect to Local ${nodeType} Node`,
              description: `Mining will connect directly to your local ${nodeType} node`,
              recommended: true,
              impact: 'Direct connection, optimal mining performance',
              config: {
                KASPA_NODE_URL: 'http://kaspa-node:16110',
                MINING_NODE_TYPE: nodeType.toLowerCase(),
                USE_LOCAL_NODE: 'true'
              }
            }
          ]
        });

        options.recommendations.push({
          priority: 'high',
          title: `Connect to Local ${nodeType} Node`,
          message: `Mining directly from your local ${nodeType} node provides the best performance and reliability.`,
          action: 'Local node connection is automatically configured'
        });
      }

      // Core profile integration with existing services
      if (profileId === 'core' && currentProfiles.length > 0) {
        const hasIndexers = currentProfiles.includes('indexer-services');
        const hasApps = currentProfiles.includes('kaspa-user-applications');
        
        if (hasIndexers || hasApps) {
          const affectedServices = [];
          if (hasIndexers) affectedServices.push('indexer services');
          if (hasApps) affectedServices.push('user applications');
          
          options.integrationTypes.push({
            type: 'node_service_integration',
            title: 'Existing Service Integration',
            description: `Configure how your existing ${affectedServices.join(' and ')} will integrate with the new local node`,
            required: true,
            options: [
              {
                id: 'integrate_all',
                label: 'Integrate with All Services',
                description: 'Reconfigure existing services to use the new local node',
                recommended: true,
                impact: 'Optimizes all services to use local node, improves performance',
                config: {
                  RECONFIGURE_EXISTING: 'true',
                  NODE_INTEGRATION: 'full',
                  UPDATE_INDEXER_CONNECTIONS: hasIndexers ? 'true' : 'false',
                  UPDATE_APP_CONNECTIONS: hasApps ? 'true' : 'false'
                }
              },
              {
                id: 'keep_separate',
                label: 'Keep Services Independent',
                description: 'Run local node independently, existing services keep current configuration',
                recommended: false,
                impact: 'No changes to existing services, less optimization',
                config: {
                  NODE_INTEGRATION: 'none',
                  RECONFIGURE_EXISTING: 'false'
                }
              }
            ]
          });

          options.recommendations.push({
            priority: 'medium',
            title: 'Integrate with Existing Services',
            message: `Your existing ${affectedServices.join(' and ')} can be optimized to use the new local node.`,
            action: 'Consider selecting "Integrate with All Services" for best performance'
          });
        }
      }

      // Service startup order considerations
      const startupOrder = this.profileManager.getStartupOrder([...currentProfiles, profileId]);
      const newServices = profile.services.map(s => s.name);
      
      options.startupOrder = {
        newServices,
        fullOrder: startupOrder,
        dependencies: this.getServiceDependencies(profileId, currentProfiles)
      };

      // Resource impact
      const ProfileValidation = require('./ProfileValidation');
      const validation = new ProfileValidation(this.profileManager);
      const currentRequirements = validation.calculateResourceRequirements(currentProfiles);
      const newRequirements = validation.calculateResourceRequirements([...currentProfiles, profileId]);
      
      options.resourceImpact = {
        current: currentRequirements,
        new: newRequirements,
        additional: {
          memory: newRequirements.minMemory - currentRequirements.minMemory,
          cpu: Math.max(0, newRequirements.minCpu - currentRequirements.minCpu),
          disk: newRequirements.minDisk - currentRequirements.minDisk,
          ports: profile.ports
        }
      };

      return {
        success: true,
        options
      };

    } catch (error) {
      console.error('Error getting integration options:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply integration options to configuration
   */
  applyIntegrationOptions(currentConfig, profileId, currentProfiles, integrationOptions) {
    const config = { ...currentConfig };
    
    // Apply each integration option
    for (const [integrationType, selectedOption] of Object.entries(integrationOptions)) {
      if (selectedOption && selectedOption.config) {
        Object.assign(config, selectedOption.config);
      }
    }
    
    // Apply profile-specific defaults
    const profile = this.profileManager.getProfile(profileId);
    if (profile && profile.configuration && profile.configuration.required) {
      for (const requiredKey of profile.configuration.required) {
        if (!config[requiredKey]) {
          config[requiredKey] = this.getDefaultConfigValue(requiredKey, profileId);
        }
      }
    }
    
    return config;
  }

  /**
   * Get default configuration value for a key
   */
  getDefaultConfigValue(key, profileId) {
    const defaults = {
      'KASPA_NODE_RPC_PORT': 16110,
      'KASPA_NODE_P2P_PORT': 16111,
      'KASPA_NETWORK': 'mainnet',
      'POSTGRES_USER': 'kaspa_user',
      'POSTGRES_PASSWORD': this.generateSecurePassword(),
      'TIMESCALEDB_PORT': 5432,
      'KASIA_APP_PORT': 3002,
      'KSOCIAL_APP_PORT': 3003,
      'EXPLORER_PORT': 3008,
      'STRATUM_PORT': 5555,
      'MINING_ADDRESS': 'kaspa:qz...' // Placeholder
    };
    
    return defaults[key] || '';
  }

  /**
   * Generate secure random password
   */
  generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get service dependencies for a profile
   */
  getServiceDependencies(profileId, currentProfiles) {
    const dependencies = [];
    const profile = this.profileManager.getProfile(profileId);
    
    if (!profile) return dependencies;
    
    for (const currentProfileId of currentProfiles) {
      const currentProfile = this.profileManager.getProfile(currentProfileId);
      if (!currentProfile) continue;
      
      if (profile.dependencies && profile.dependencies.includes(currentProfileId)) {
        dependencies.push({
          type: 'depends_on',
          profile: currentProfileId,
          name: currentProfile.name,
          services: currentProfile.services.map(s => s.name)
        });
      }
      
      if (profile.prerequisites && profile.prerequisites.includes(currentProfileId)) {
        dependencies.push({
          type: 'prerequisite_for',
          profile: currentProfileId,
          name: currentProfile.name,
          services: currentProfile.services.map(s => s.name)
        });
      }
    }
    
    return dependencies;
  }

  /**
   * Load current configuration from .env file
   */
  async loadCurrentConfiguration() {
    try {
      const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../../..');
      const envPath = path.join(projectRoot, '.env');
      
      const envContent = await fs.readFile(envPath, 'utf8');
      return this.parseEnvFile(envContent);
    } catch (error) {
      return {};
    }
  }

  /**
   * Parse .env file content into configuration object
   */
  parseEnvFile(content) {
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
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
   * Calculate integration changes made during profile addition
   */
  calculateIntegrationChanges(oldConfig, newConfig, profileId, currentProfiles) {
    const changes = [];
    
    for (const [key, newValue] of Object.entries(newConfig)) {
      const oldValue = oldConfig[key];
      if (oldValue !== newValue) {
        changes.push({
          type: oldValue === undefined ? 'added' : 'modified',
          key,
          oldValue,
          newValue,
          affectedProfile: this.getProfileForConfigKey(key, [...currentProfiles, profileId])
        });
      }
    }
    
    return changes;
  }

  /**
   * Get which profile a configuration key belongs to
   * @param {string} key - Configuration key
   * @param {string[]} profiles - Active profiles
   * @returns {string} Profile ID
   */
  getProfileForConfigKey(key, profiles) {
    const keyMappings = {
      // Node-related keys
      'KASPA_NODE_': ['kaspa-node', 'kaspa-archive-node'],
      'KASPA_NETWORK': ['kaspa-node', 'kaspa-archive-node'],
      'PUBLIC_NODE': ['kaspa-node', 'kaspa-archive-node'],
      'WALLET_': ['kaspa-node'],
      'UTXO_INDEX': ['kaspa-node', 'kaspa-archive-node'],
      'ARCHIVE_': ['kaspa-archive-node'],
      
      // Kasia-related keys
      'KASIA_APP_': ['kasia-app'],
      'KASIA_INDEXER_MODE': ['kasia-app'],
      'REMOTE_KASIA_': ['kasia-app'],
      'KASIA_INDEXER_PORT': ['kasia-indexer'],
      'KASIA_NODE_': ['kasia-indexer'],
      
      // K-Social related keys
      'KSOCIAL_': ['k-social-app'],
      'REMOTE_KSOCIAL_': ['k-social-app'],
      
      // Explorer bundle keys
      'KASPA_EXPLORER_': ['kaspa-explorer-bundle'],
      'SIMPLY_KASPA_': ['kaspa-explorer-bundle'],
      'POSTGRES_USER_EXPLORER': ['kaspa-explorer-bundle'],
      'POSTGRES_PASSWORD_EXPLORER': ['kaspa-explorer-bundle'],
      'TIMESCALEDB_EXPLORER_': ['kaspa-explorer-bundle'],
      
      // K-Indexer bundle keys
      'K_INDEXER_': ['k-indexer-bundle'],
      'POSTGRES_USER_KINDEXER': ['k-indexer-bundle'],
      'POSTGRES_PASSWORD_KINDEXER': ['k-indexer-bundle'],
      'TIMESCALEDB_KINDEXER_': ['k-indexer-bundle'],
      
      // Mining keys
      'STRATUM_': ['kaspa-stratum'],
      'MINING_': ['kaspa-stratum'],
      'VAR_DIFF': ['kaspa-stratum'],
      'POOL_MODE': ['kaspa-stratum'],
      'SHARES_PER_MIN': ['kaspa-stratum'],
      
      // Legacy mappings (for backward compat)
      'POSTGRES_USER': ['k-indexer-bundle', 'kaspa-explorer-bundle'],
      'POSTGRES_PASSWORD': ['k-indexer-bundle', 'kaspa-explorer-bundle'],
      'TIMESCALEDB_PORT': ['k-indexer-bundle', 'kaspa-explorer-bundle'],
      'TIMESCALEDB_DATA_DIR': ['k-indexer-bundle', 'kaspa-explorer-bundle']
    };
    
    for (const [prefix, profileIds] of Object.entries(keyMappings)) {
      if (key.startsWith(prefix) || key === prefix) {
        return profileIds.find(p => profiles.includes(p)) || profileIds[0];
      }
    }
    
    return 'unknown';
  }

  /**
   * Update installation state after profile addition
   */
  async updateInstallationStateAfterAddition(profileId, currentProfiles, integrationOptions) {
    try {
      const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../../..');
      const statePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
      
      let installationState = {};
      try {
        const stateContent = await fs.readFile(statePath, 'utf8');
        installationState = JSON.parse(stateContent);
      } catch (error) {
        installationState = {
          version: '1.0.0',
          installedAt: new Date().toISOString()
        };
      }
      
      const updatedProfiles = [...currentProfiles, profileId];
      if (installationState.profiles) {
        if (Array.isArray(installationState.profiles)) {
          installationState.profiles = updatedProfiles;
        } else if (installationState.profiles.selected) {
          installationState.profiles.selected = updatedProfiles;
        }
      } else {
        installationState.profiles = {
          selected: updatedProfiles
        };
      }
      
      installationState.lastModified = new Date().toISOString();
      
      if (!installationState.history) {
        installationState.history = [];
      }
      
      installationState.history.push({
        timestamp: new Date().toISOString(),
        action: 'add-profile',
        profileId: profileId,
        integrationOptions: Object.keys(integrationOptions),
        source: 'wizard-reconfiguration'
      });
      
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      await fs.writeFile(statePath, JSON.stringify(installationState, null, 2));
      
    } catch (error) {
      console.error('Error updating installation state after addition:', error);
    }
  }
}

module.exports = ProfileAddition;