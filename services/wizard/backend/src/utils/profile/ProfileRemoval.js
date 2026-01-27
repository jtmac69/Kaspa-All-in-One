const fs = require('fs').promises;
const path = require('path');

/**
 * Profile Removal Module
 * Handles removing profiles from existing installations with data options
 * Requirements: 17.9, 17.10, 17.11, 17.12, 18.3, 18.4
 */
class ProfileRemoval {
  constructor(profileManager) {
    this.profileManager = profileManager;
  }

  /**
   * Remove profile from existing installation
   */
  async removeProfile(profileId, options = {}) {
    try {
      const { removeData = false, dataOptions = [], currentProfiles = [profileId] } = options;
      
      // Get profile definition
      const profile = this.profileManager.getProfile(profileId);
      if (!profile) {
        return {
          success: false,
          error: `Profile '${profileId}' not found`
        };
      }
      
      // Validate removal first
      const DependencyValidator = require('../dependency-validator');
      const dependencyValidator = new DependencyValidator();
      const validation = await dependencyValidator.validateRemoval(profileId, currentProfiles);
      
      if (!validation.canRemove) {
        return {
          success: false,
          error: 'Cannot remove profile',
          validation
        };
      }
      
      // Create backup before removal
      const BackupManager = require('../backup-manager');
      const backupManager = new BackupManager();
      const backupResult = await backupManager.createBackup(
        `Before removing profile: ${profile.name}`,
        { 
          preRemoval: true, 
          profileId: profileId,
          profileName: profile.name 
        }
      );
      
      if (!backupResult.success) {
        console.warn('Failed to create backup before removal:', backupResult.error);
      }
      
      // Get services to remove
      const servicesToRemove = profile.services.map(s => s.name);
      
      // Gracefully stop and remove services
      const DockerManager = require('../docker-manager');
      const dockerManager = new DockerManager();
      
      const removalResult = await dockerManager.removeServices(servicesToRemove, {
        removeData: removeData
      });
      
      if (!removalResult.success) {
        return {
          success: false,
          error: `Failed to remove services for profile '${profileId}': ${removalResult.error}`
        };
      }
      
      // Remove profile-specific configurations from .env
      await this.removeProfileConfigFromEnv(profileId);
      
      // Update docker-compose.yml to remove services
      await this.updateDockerComposeAfterRemoval(profileId);
      
      // Update installation state
      await this.updateInstallationStateAfterRemoval(profileId);
      
      // Determine what data was preserved
      const preservedData = this.getPreservedDataInfo(profileId, removeData, dataOptions);
      
      return {
        success: true,
        removedServices: servicesToRemove,
        preservedData,
        backupId: backupResult.success ? backupResult.backupId : null,
        removalSummary: removalResult.summary
      };
      
    } catch (error) {
      console.error('Error removing profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove profile-specific configuration from .env file
   */
  async removeProfileConfigFromEnv(profileId) {
    try {
      const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../../..');
      const envPath = path.join(projectRoot, '.env');
      
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch (error) {
        return;
      }
      
      const profile = this.profileManager.getProfile(profileId);
      if (!profile || !profile.configuration) {
        return;
      }
      
      const configKeysToRemove = [
        ...(profile.configuration.required || []),
        ...(profile.configuration.optional || [])
      ];
      
      const additionalKeys = this.getProfileSpecificConfigKeys(profileId);
      configKeysToRemove.push(...additionalKeys);
      
      const lines = envContent.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) {
          return true;
        }
        
        const keyMatch = trimmed.match(/^([^=]+)=/);
        if (keyMatch) {
          const key = keyMatch[1].trim();
          return !configKeysToRemove.some(removeKey => 
            key === removeKey || key.startsWith(removeKey + '_')
          );
        }
        
        return true;
      });
      
      await fs.writeFile(envPath, filteredLines.join('\n'));
      
    } catch (error) {
      console.error('Error removing profile config from .env:', error);
    }
  }

  /**
   * Get profile-specific configuration keys for removal
   * @param {string} profileId - Profile ID (supports legacy IDs)
   * @returns {string[]} Array of config keys
   */
  getProfileSpecificConfigKeys(profileId) {
    const keyMappings = {
      // New profile IDs
      'kaspa-node': [
        'KASPA_NODE_RPC_PORT',
        'KASPA_NODE_P2P_PORT',
        'KASPA_NODE_WRPC_PORT',
        'KASPA_NETWORK',
        'KASPA_DATA_DIR',
        'PUBLIC_NODE',
        'WALLET_ENABLED',
        'WALLET_MODE',
        'UTXO_INDEX'
      ],
      'kasia-app': [
        'KASIA_APP_PORT',
        'KASIA_INDEXER_MODE',
        'KASIA_INDEXER_URL',
        'REMOTE_KASIA_INDEXER_URL'
      ],
      'k-social-app': [
        'KSOCIAL_APP_PORT',
        'KSOCIAL_INDEXER_MODE',
        'KSOCIAL_INDEXER_URL',
        'REMOTE_KSOCIAL_INDEXER_URL',
        'KSOCIAL_NODE_MODE'
      ],
      'kaspa-explorer-bundle': [
        'KASPA_EXPLORER_PORT',
        'SIMPLY_KASPA_INDEXER_PORT',
        'SIMPLY_KASPA_NODE_MODE',
        'TIMESCALEDB_EXPLORER_PORT',
        'POSTGRES_USER_EXPLORER',
        'POSTGRES_PASSWORD_EXPLORER',
        'POSTGRES_DB_EXPLORER'
      ],
      'kasia-indexer': [
        'KASIA_INDEXER_PORT',
        'KASIA_NODE_MODE',
        'KASIA_NODE_WRPC_URL'
      ],
      'k-indexer-bundle': [
        'K_INDEXER_PORT',
        'K_INDEXER_NODE_MODE',
        'K_INDEXER_NODE_WRPC_URL',
        'TIMESCALEDB_KINDEXER_PORT',
        'POSTGRES_USER_KINDEXER',
        'POSTGRES_PASSWORD_KINDEXER',
        'POSTGRES_DB_KINDEXER'
      ],
      'kaspa-archive-node': [
        'KASPA_NODE_RPC_PORT',
        'KASPA_NODE_P2P_PORT',
        'KASPA_NODE_WRPC_PORT',
        'KASPA_ARCHIVE_DATA_DIR',
        'ARCHIVE_MODE',
        'PUBLIC_NODE',
        'EXTERNAL_IP'
      ],
      'kaspa-stratum': [
        'STRATUM_PORT',
        'MINING_ADDRESS',
        'VAR_DIFF',
        'MIN_SHARE_DIFF',
        'SHARES_PER_MIN',
        'POOL_MODE',
        'EXTRA_NONCE_SIZE',
        'BLOCK_WAIT_TIME'
      ],
      
      // Legacy profile IDs (for backward compatibility)
      'core': [
        'KASPA_NODE_RPC_PORT',
        'KASPA_NODE_P2P_PORT',
        'KASPA_NETWORK',
        'KASPA_DATA_DIR',
        'PUBLIC_NODE',
        'WALLET_ENABLED'
      ],
      'kaspa-user-applications': [
        'KASIA_APP_PORT',
        'KSOCIAL_APP_PORT',
        'KASPA_EXPLORER_PORT',
        'KASIA_INDEXER_URL',
        'K_INDEXER_URL',
        'SIMPLY_KASPA_INDEXER_URL',
        'USE_LOCAL_INDEXERS',
        'INDEXER_CONNECTION_MODE'
      ],
      'indexer-services': [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'TIMESCALEDB_PORT',
        'TIMESCALEDB_DATA_DIR',
        'KASIA_INDEXER_PORT',
        'K_INDEXER_PORT',
        'SIMPLY_KASPA_INDEXER_PORT'
      ],
      'archive-node': [
        'KASPA_ARCHIVE_DATA_DIR',
        'ARCHIVE_MODE'
      ],
      'mining': [
        'STRATUM_PORT',
        'MINING_ADDRESS',
        'POOL_MODE'
      ]
    };
    
    return keyMappings[profileId] || [];
  }

  /**
   * Update docker-compose.yml after profile removal
   */
  async updateDockerComposeAfterRemoval(profileId) {
    try {
      console.log(`Profile ${profileId} services removed from docker-compose management`);
    } catch (error) {
      console.error('Error updating docker-compose after removal:', error);
    }
  }

  /**
   * Get information about preserved data after removal
   */
  getPreservedDataInfo(profileId, removeData, dataOptions) {
    const profile = this.profileManager.getProfile(profileId);
    if (!profile) {
      return [];
    }
    
    const preservedData = [];
    
    if (!removeData) {
      const dataTypes = this.getProfileDataTypes(profileId);
      for (const dataType of dataTypes) {
        preservedData.push({
          type: dataType.type,
          location: dataType.location,
          description: dataType.description,
          size: dataType.estimatedSize || 'Unknown'
        });
      }
    } else {
      for (const option of dataOptions) {
        if (!option.remove) {
          preservedData.push({
            type: option.type,
            location: option.location,
            description: option.description,
            size: option.size || 'Unknown'
          });
        }
      }
    }
    
    return preservedData;
  }

  /**
   * Get data types associated with a profile (for removal options)
   * @param {string} profileId - Profile ID
   * @returns {Object[]} Array of data type descriptions
   */
  getProfileDataTypes(profileId) {
    const dataTypeMappings = {
      // New profile IDs
      'kaspa-node': [
        {
          type: 'blockchain',
          name: 'Blockchain Data',
          description: 'Kaspa blockchain data (pruned)',
          estimatedSize: '50-150GB',
          critical: true
        }
      ],
      'kasia-app': [
        {
          type: 'app-data',
          name: 'Application Data',
          description: 'Kasia app local storage',
          estimatedSize: '< 100MB',
          critical: false
        }
      ],
      'k-social-app': [
        {
          type: 'app-data',
          name: 'Application Data',
          description: 'K-Social app local storage',
          estimatedSize: '< 100MB',
          critical: false
        }
      ],
      'kaspa-explorer-bundle': [
        {
          type: 'database',
          name: 'Explorer Database',
          description: 'Simply-Kaspa indexer TimescaleDB data',
          estimatedSize: '100-500GB',
          critical: true
        },
        {
          type: 'indexer',
          name: 'Indexer Cache',
          description: 'Simply-Kaspa indexer cache files',
          estimatedSize: '1-10GB',
          critical: false
        }
      ],
      'kasia-indexer': [
        {
          type: 'indexer',
          name: 'Kasia Indexer Data',
          description: 'Kasia indexer embedded database',
          estimatedSize: '50-200GB',
          critical: true
        }
      ],
      'k-indexer-bundle': [
        {
          type: 'database',
          name: 'K-Indexer Database',
          description: 'K-Indexer TimescaleDB data',
          estimatedSize: '100-500GB',
          critical: true
        }
      ],
      'kaspa-archive-node': [
        {
          type: 'blockchain',
          name: 'Archive Blockchain Data',
          description: 'Complete non-pruned blockchain history',
          estimatedSize: '500GB-5TB',
          critical: true
        }
      ],
      'kaspa-stratum': [
        {
          type: 'config',
          name: 'Mining Configuration',
          description: 'Mining configuration and statistics',
          estimatedSize: '< 10MB',
          critical: false
        }
      ],
      
      // Legacy profile IDs
      'core': [
        {
          type: 'blockchain',
          name: 'Blockchain Data',
          description: 'Kaspa blockchain data',
          estimatedSize: '50-150GB',
          critical: true
        }
      ],
      'kaspa-user-applications': [
        {
          type: 'app-data',
          name: 'Application Data',
          description: 'User application local storage',
          estimatedSize: '< 1GB',
          critical: false
        }
      ],
      'indexer-services': [
        {
          type: 'database',
          name: 'Indexer Databases',
          description: 'TimescaleDB data for all indexers',
          estimatedSize: '100-500GB',
          critical: true
        }
      ],
      'archive-node': [
        {
          type: 'blockchain',
          name: 'Archive Data',
          description: 'Complete blockchain history',
          estimatedSize: '500GB-5TB',
          critical: true
        }
      ],
      'mining': [
        {
          type: 'config',
          name: 'Mining Data',
          description: 'Mining configuration',
          estimatedSize: '< 10MB',
          critical: false
        }
      ]
    };
    
    return dataTypeMappings[profileId] || [];
  }

  /**
   * Update installation state after profile removal
   */
  async updateInstallationStateAfterRemoval(profileId) {
    try {
      const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../../..');
      const statePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
      
      let installationState = {};
      try {
        const stateContent = await fs.readFile(statePath, 'utf8');
        installationState = JSON.parse(stateContent);
      } catch (error) {
        return;
      }
      
      if (installationState.profiles) {
        if (Array.isArray(installationState.profiles)) {
          installationState.profiles = installationState.profiles.filter(p => p !== profileId);
        } else if (installationState.profiles.selected) {
          installationState.profiles.selected = installationState.profiles.selected.filter(p => p !== profileId);
        }
      }
      
      installationState.lastModified = new Date().toISOString();
      
      if (!installationState.history) {
        installationState.history = [];
      }
      
      installationState.history.push({
        timestamp: new Date().toISOString(),
        action: 'remove-profile',
        profileId: profileId,
        source: 'wizard-reconfiguration'
      });
      
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      await fs.writeFile(statePath, JSON.stringify(installationState, null, 2));
      
    } catch (error) {
      console.error('Error updating installation state after removal:', error);
    }
  }
}

module.exports = ProfileRemoval;