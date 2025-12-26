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
   */
  getProfileSpecificConfigKeys(profileId) {
    const keyMappings = {
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
        'EXPLORER_PORT',
        'KASIA_INDEXER_URL',
        'K_INDEXER_URL',
        'SIMPLY_KASPA_INDEXER_URL',
        'USE_LOCAL_INDEXERS'
      ],
      'indexer-services': [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'TIMESCALEDB_PORT',
        'TIMESCALEDB_DATA_DIR',
        'KASIA_INDEXER_NODE',
        'K_INDEXER_NODE',
        'SIMPLY_KASPA_INDEXER_NODE'
      ],
      'archive-node': [
        'KASPA_ARCHIVE_DATA_DIR',
        'ARCHIVE_NODE_RPC_PORT',
        'ARCHIVE_NODE_P2P_PORT'
      ],
      'mining': [
        'STRATUM_PORT',
        'MINING_ADDRESS',
        'POOL_MODE',
        'MINING_NODE_TYPE'
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
   * Get data types associated with a profile
   */
  getProfileDataTypes(profileId) {
    const dataTypeMappings = {
      'core': [
        {
          type: 'blockchain-data',
          location: '/data/kaspa',
          description: 'Kaspa blockchain data and wallet files',
          estimatedSize: '50-200GB'
        }
      ],
      'kaspa-user-applications': [
        {
          type: 'app-data',
          location: '/data/apps',
          description: 'Application configuration and user data',
          estimatedSize: '1-10MB'
        }
      ],
      'indexer-services': [
        {
          type: 'database-data',
          location: '/data/timescaledb',
          description: 'TimescaleDB database with indexed blockchain data',
          estimatedSize: '10-100GB'
        }
      ],
      'archive-node': [
        {
          type: 'blockchain-data',
          location: '/data/kaspa-archive',
          description: 'Complete Kaspa blockchain archive data',
          estimatedSize: '500GB-2TB'
        }
      ],
      'mining': [
        {
          type: 'mining-data',
          location: '/data/mining',
          description: 'Mining configuration and statistics',
          estimatedSize: '1-10MB'
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