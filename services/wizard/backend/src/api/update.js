const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const DockerManager = require('../utils/docker-manager');
const StateManager = require('../utils/state-manager');

const dockerManager = new DockerManager();
const stateManager = new StateManager();

/**
 * GET /api/wizard/updates/available
 * Check for available service updates
 * Returns list of services with version information
 */
router.get('/available', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Load installation state to get current versions
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'No installation state found',
        message: 'System must be installed before checking for updates'
      });
    }
    
    // Get current service versions from installation state
    const currentServices = installationState.services || [];
    
    // Check for available updates (in real implementation, this would query GitHub releases)
    // For now, we'll simulate with mock data
    const updates = await checkForUpdates(currentServices);
    
    res.json({
      success: true,
      updates,
      hasUpdates: updates.some(u => u.updateAvailable)
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for updates',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/updates/apply
 * Apply selected service updates
 * Handles backup, update, and rollback on failure
 */
router.post('/apply', async (req, res) => {
  try {
    const { updates, createBackup = true } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid updates array'
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    
    // Load installation state
    let installationState = null;
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      installationState = JSON.parse(stateContent);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'No installation state found'
      });
    }
    
    // Create comprehensive backup if requested
    let backupInfo = null;
    if (createBackup) {
      try {
        backupInfo = await createConfigurationBackup(projectRoot, 'Before applying updates');
      } catch (error) {
        console.error('Error creating backup:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create backup',
          message: error.message
        });
      }
    }
    
    // Apply updates one by one
    const results = [];
    let allSuccessful = true;
    
    for (const update of updates) {
      try {
        const result = await applyServiceUpdate(update, projectRoot);
        results.push(result);
        
        if (!result.success) {
          allSuccessful = false;
          
          // If update fails, offer rollback
          if (createBackup && backupInfo) {
            result.rollbackAvailable = true;
            result.backupTimestamp = backupInfo.timestamp;
          }
        }
      } catch (error) {
        console.error(`Error updating ${update.service}:`, error);
        results.push({
          service: update.service,
          success: false,
          error: error.message,
          rollbackAvailable: createBackup && backupInfo !== null,
          backupTimestamp: backupInfo?.timestamp
        });
        allSuccessful = false;
      }
    }
    
    // Update installation state with new versions
    if (allSuccessful) {
      for (const result of results) {
        if (result.success) {
          const serviceIndex = installationState.services.findIndex(s => s.name === result.service);
          if (serviceIndex >= 0) {
            installationState.services[serviceIndex].version = result.newVersion;
            installationState.services[serviceIndex].lastUpdated = new Date().toISOString();
          }
        }
      }
      
      // Add to history
      if (!installationState.history) {
        installationState.history = [];
      }
      
      installationState.history.push({
        timestamp: new Date().toISOString(),
        action: 'update',
        changes: results.filter(r => r.success).map(r => `${r.service}: ${r.oldVersion} → ${r.newVersion}`),
        backupTimestamp: backupInfo?.timestamp
      });
      
      installationState.lastModified = new Date().toISOString();
      
      // Save updated installation state
      await fs.writeFile(installationStatePath, JSON.stringify(installationState, null, 2));
    }
    
    res.json({
      success: allSuccessful,
      results,
      backup: backupInfo,
      message: allSuccessful 
        ? 'All updates applied successfully' 
        : 'Some updates failed. Rollback available.'
    });
  } catch (error) {
    console.error('Error applying updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply updates',
      message: error.message
    });
  }
});

/**
 * POST /api/wizard/updates/rollback
 * Rollback to previous configuration after failed update
 */
router.post('/rollback', async (req, res) => {
  try {
    const { backupTimestamp } = req.body;
    
    if (!backupTimestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing backupTimestamp'
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
    const backupDir = path.join(projectRoot, '.kaspa-backups', backupTimestamp.toString());
    
    // Verify backup exists
    try {
      await fs.access(backupDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found',
        message: `No backup found at timestamp ${backupTimestamp}`
      });
    }
    
    // Stop services before rollback
    await dockerManager.stopAllServices();
    
    // Wait for services to stop
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Restore files from backup
    const filesToRestore = [
      { src: '.env', dest: '.env' },
      { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
      { src: 'docker-compose.override.yml', dest: 'docker-compose.override.yml', optional: true },
      { src: 'installation-state.json', dest: '.kaspa-aio/installation-state.json' }
    ];
    
    const restoredFiles = [];
    const errors = [];
    
    for (const file of filesToRestore) {
      const srcPath = path.join(backupDir, file.src);
      const destPath = path.join(projectRoot, file.dest);
      
      try {
        await fs.access(srcPath);
        await fs.copyFile(srcPath, destPath);
        restoredFiles.push(file.dest);
      } catch (error) {
        if (!file.optional) {
          errors.push({ file: file.dest, error: error.message });
        }
      }
    }
    
    // Restart services with restored configuration
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    let profiles = [];
    
    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      const installationState = JSON.parse(stateContent);
      profiles = installationState.profiles?.selected || [];
    } catch (error) {
      console.error('Error loading profiles from restored state:', error);
    }
    
    // Start services
    if (profiles.length > 0) {
      await dockerManager.startServices(profiles);
    }
    
    res.json({
      success: true,
      message: 'Rollback completed successfully',
      restoredFiles,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error during rollback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollback',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/updates/changelog/:service/:version
 * Get changelog for a specific service version
 */
router.get('/changelog/:service/:version', async (req, res) => {
  try {
    const { service, version } = req.params;
    
    // In real implementation, this would fetch from GitHub releases
    // For now, return mock changelog
    const changelog = await getServiceChangelog(service, version);
    
    res.json({
      success: true,
      service,
      version,
      changelog
    });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch changelog',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Check for available updates for services
 * In production, this would query GitHub releases or update server
 */
async function checkForUpdates(currentServices) {
  const updates = [];
  
  // Service repository mapping
  const serviceRepos = {
    'kaspa-node': 'kaspanet/kaspad',
    'kasia-app': 'argonmining/kasia',
    'kasia-indexer': 'argonmining/kasia-indexer',
    'k-social': 'kaspa-social/k-social',
    'k-indexer': 'kaspa-social/k-indexer',
    'simply-kaspa-indexer': 'simplykaspa/indexer',
    'kaspa-stratum': 'kaspanet/kaspa-stratum-bridge',
    'dashboard': 'local/dashboard'
  };
  
  for (const service of currentServices) {
    const repo = serviceRepos[service.name];
    
    if (!repo) {
      continue;
    }
    
    // In production, query GitHub API for latest release
    // For now, simulate with mock data
    const latestVersion = await getLatestVersion(repo);
    const updateAvailable = latestVersion && latestVersion !== service.version;
    
    updates.push({
      service: service.name,
      currentVersion: service.version || 'unknown',
      latestVersion: latestVersion || 'unknown',
      updateAvailable,
      repository: repo,
      breaking: false, // Would be determined from release notes
      releaseDate: new Date().toISOString()
    });
  }
  
  return updates;
}

/**
 * Get latest version for a service from repository
 * In production, this would query GitHub API
 */
async function getLatestVersion(repo) {
  // Mock implementation
  // In production: const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
  
  // Return mock version
  return '1.0.1';
}

/**
 * Apply update to a specific service
 */
async function applyServiceUpdate(update, projectRoot) {
  const { service, version } = update;
  
  try {
    // Get current version
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    const stateContent = await fs.readFile(installationStatePath, 'utf8');
    const installationState = JSON.parse(stateContent);
    
    const serviceState = installationState.services.find(s => s.name === service);
    const oldVersion = serviceState?.version || 'unknown';
    
    // Stop the service
    await dockerManager.stopService(service);
    
    // Update docker-compose.yml with new version
    await updateDockerComposeVersion(service, version, projectRoot);
    
    // Pull new image
    await dockerManager.pullImage(service, version);
    
    // Start service with new version
    await dockerManager.startService(service);
    
    // Wait for service to be healthy
    const healthy = await waitForServiceHealth(service, 60000); // 60 second timeout
    
    if (!healthy) {
      throw new Error(`Service ${service} failed health check after update`);
    }
    
    return {
      service,
      success: true,
      oldVersion,
      newVersion: version,
      message: `Successfully updated ${service} from ${oldVersion} to ${version}`
    };
  } catch (error) {
    return {
      service,
      success: false,
      error: error.message,
      message: `Failed to update ${service}: ${error.message}`
    };
  }
}

/**
 * Update docker-compose.yml with new service version
 */
async function updateDockerComposeVersion(service, version, projectRoot) {
  const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
  
  try {
    let content = await fs.readFile(dockerComposePath, 'utf8');
    
    // Update image version for the service
    // This is a simple regex replacement - in production, use a YAML parser
    const servicePattern = new RegExp(`(${service}:.*image:\\s*[^:]+:)([^\\s]+)`, 'g');
    content = content.replace(servicePattern, `$1${version}`);
    
    await fs.writeFile(dockerComposePath, content);
  } catch (error) {
    console.error(`Error updating docker-compose.yml for ${service}:`, error);
    throw error;
  }
}

/**
 * Wait for service to become healthy after update
 */
async function waitForServiceHealth(service, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const health = await dockerManager.checkServiceHealth(service);
      
      if (health.healthy) {
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

/**
 * Get changelog for a service version
 * In production, this would fetch from GitHub releases
 */
async function getServiceChangelog(service, version) {
  // Mock implementation
  // In production: fetch from GitHub API
  
  return {
    version,
    releaseDate: new Date().toISOString(),
    changes: [
      'Bug fixes and performance improvements',
      'Updated dependencies',
      'Security patches'
    ],
    breaking: false,
    notes: 'This is a minor update with bug fixes and improvements.'
  };
}

/**
 * Create comprehensive backup of configuration
 */
async function createConfigurationBackup(projectRoot, reason) {
  const timestamp = Date.now();
  const backupDir = path.join(projectRoot, '.kaspa-backups', timestamp.toString());
  
  // Create backup directory
  await fs.mkdir(backupDir, { recursive: true });
  
  const backedUpFiles = [];
  const errors = [];
  
  // Files to backup
  const filesToBackup = [
    { src: '.env', dest: '.env' },
    { src: 'docker-compose.yml', dest: 'docker-compose.yml' },
    { src: 'docker-compose.override.yml', dest: 'docker-compose.override.yml', optional: true },
    { src: '.kaspa-aio/installation-state.json', dest: 'installation-state.json', optional: true },
    { src: '.kaspa-aio/wizard-state.json', dest: 'wizard-state.json', optional: true }
  ];
  
  // Backup each file
  for (const file of filesToBackup) {
    const srcPath = path.join(projectRoot, file.src);
    const destPath = path.join(backupDir, file.dest);
    
    try {
      await fs.access(srcPath);
      await fs.copyFile(srcPath, destPath);
      backedUpFiles.push(file.src);
    } catch (error) {
      if (!file.optional) {
        errors.push({ file: file.src, error: error.message });
      }
    }
  }
  
  // Create backup metadata
  const metadata = {
    timestamp,
    date: new Date(timestamp).toISOString(),
    reason,
    files: backedUpFiles,
    errors: errors.length > 0 ? errors : undefined
  };
  
  await fs.writeFile(
    path.join(backupDir, 'backup-metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  return {
    timestamp,
    backupDir,
    files: backedUpFiles,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = router;
