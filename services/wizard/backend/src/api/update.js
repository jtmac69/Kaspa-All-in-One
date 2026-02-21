const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const https = require('https');
const DockerManager = require('../utils/docker-manager');
const StateManager = require('../utils/state-manager');
const { authenticateToken } = require('../middleware/security');

const execFileAsync = promisify(execFile);

const dockerManager = new DockerManager();
const stateManager = new StateManager();

/**
 * GET /api/wizard/updates/available
 * Check for available service updates
 * Returns list of services with version information
 */
router.get('/available', async (req, res) => {
  try {
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
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
    
    const updates = await checkForUpdates();
    
    res.json({
      success: true,
      updates,
      hasUpdates: updates.some(u => u.updateAvailable)
    });
  } catch (error) {
    console.error('Error checking for updates:', error.message);
    const isNetworkError = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|rate limit|timeout|Update check failed/i.test(error.message);
    res.status(isNetworkError ? 503 : 500).json({
      success: false,
      error: isNetworkError ? 'Unable to reach GitHub to check for updates' : 'Failed to check for updates',
      message: error.message,
      hint: isNetworkError ? 'Check your internet connection and try again.' : undefined
    });
  }
});

/**
 * POST /api/wizard/updates/apply
 * Apply selected service updates
 * Handles backup, update, and rollback on failure
 * Requires authentication — triggers sudo bash execution of update scripts
 */
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { updates, createBackup = true } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid updates array'
      });
    }

    const ALLOWED_SERVICES = [
      'kaspa-aio', 'dashboard', 'wizard',
      'kaspa-node', 'kasia', 'kasia-indexer',
      'k-social', 'k-indexer', 'simply-kaspa-indexer',
      'kaspa-explorer', 'kaspa-stratum', 'timescaledb'
    ];
    const invalidService = updates.find(u => !ALLOWED_SERVICES.includes(u.service));
    if (invalidService) {
      return res.status(400).json({
        success: false,
        error: `Invalid service name: ${invalidService.service}`
      });
    }
    
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
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
        console.error('Error creating backup:', error.message);
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
        console.error(`Error updating ${update.service}:`, error.message);
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
      try {
        await fs.writeFile(installationStatePath, JSON.stringify(installationState, null, 2));
      } catch (writeErr) {
        console.error('Failed to save updated installation state:', writeErr.message);
        return res.json({
          success: true,
          results,
          backup: backupInfo,
          message: 'Updates applied but installation state could not be saved — run the wizard to sync state',
          stateWriteError: writeErr.message
        });
      }
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
    console.error('Error applying updates:', error.message);
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
 * Requires authentication — restores config files and restarts services
 */
router.post('/rollback', authenticateToken, async (req, res) => {
  try {
    const { backupTimestamp } = req.body;
    
    if (!backupTimestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing backupTimestamp'
      });
    }

    // Validate backupTimestamp is a numeric Unix timestamp to prevent path traversal
    if (!/^\d+$/.test(String(backupTimestamp))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backupTimestamp: must be a numeric Unix timestamp'
      });
    }

    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    const backupDir = path.join(projectRoot, '.kaspa-backups', String(backupTimestamp));
    
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
    const stopResult = await dockerManager.stopAllServices();
    const warnings = [];
    if (stopResult && !stopResult.success) {
      warnings.push(`Services may still be running before rollback: ${stopResult.error || 'unknown error'}`);
    }

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

    // Fail fast if required files could not be restored
    if (errors.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'Rollback incomplete — critical files could not be restored',
        errors,
        restoredFiles
      });
    }

    // Restart services with restored configuration
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    let profiles = [];

    try {
      const stateContent = await fs.readFile(installationStatePath, 'utf8');
      const installationState = JSON.parse(stateContent);
      profiles = installationState.profiles?.selected || [];
    } catch (error) {
      console.error('Error loading profiles from restored state:', error.message);
      warnings.push('Services could not be automatically restarted — start them manually via the dashboard or manage.sh');
    }

    // Start services
    if (profiles.length > 0) {
      try {
        const startResult = await dockerManager.startServices(profiles);
        if (startResult && !startResult.success) {
          warnings.push(`Service restart failed after rollback: ${startResult.error || 'unknown error'} — start them manually`);
        }
      } catch (startErr) {
        warnings.push(`Service restart failed after rollback: ${startErr.message} — start them manually`);
      }
    } else if (!warnings.some(w => w.includes('automatically restarted'))) {
      warnings.push('No profiles found in restored state — services were not restarted');
    }

    res.json({
      success: true,
      message: 'Rollback completed successfully',
      restoredFiles,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    console.error('Error during rollback:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to rollback',
      message: error.message
    });
  }
});

/**
 * GET /api/wizard/updates/changelog/:service/:version
 * Get changelog for a specific service version from GitHub releases
 */
router.get('/changelog/:service/:version', async (req, res) => {
  try {
    const { version: requestedVersion } = req.params;

    const release = await fetchLatestRelease();
    const releaseVersion = (release.tag_name || '').replace(/^(version-?|v)/i, '');

    res.json({
      success: true,
      service: 'kaspa-aio',
      requestedVersion,
      version: releaseVersion,
      note: requestedVersion !== releaseVersion
        ? 'Historical changelogs are not available; returning latest release'
        : undefined,
      changelog: {
        version: releaseVersion,
        releaseDate: release.published_at,
        notes: release.body || 'No changelog available',
        breaking: /breaking/i.test(release.body || ''),
        htmlUrl: release.html_url
      }
    });
  } catch (error) {
    const isNetworkError = error.message.includes('rate limit') || error.message.includes('timeout') || error.message.includes('404');
    console.error('Error fetching changelog:', error.message);
    res.status(isNetworkError ? 503 : 500).json({
      success: false,
      error: 'Failed to fetch changelog',
      message: error.message
    });
  }
});

// Helper functions

const AIO_REPO = 'jtmac69/Kaspa-All-in-One';

/**
 * Fetch the latest GitHub release for the AIO repo
 */
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${AIO_REPO}/releases/latest`,
      headers: {
        'User-Agent': 'Kaspa-AIO-Wizard/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            reject(new Error('No releases found (GitHub 404)'));
            return;
          }
          if (res.statusCode === 403) {
            reject(new Error('GitHub API rate limit exceeded (403)'));
            return;
          }
          if (res.statusCode === 429) {
            reject(new Error('GitHub API secondary rate limit exceeded (429) — retry later'));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`GitHub API returned unexpected status ${res.statusCode}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from GitHub API (status ${res.statusCode}): ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('GitHub API timeout')); });
  });
}

function cleanVersion(v) {
  return v.replace(/^(version-?|v)/i, '');
}

function parseVersion(v) {
  const parts = cleanVersion(v).split('.').map(p => { const m = p.match(/^(\d+)/); return m ? parseInt(m[1], 10) : 0; });
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function isNewer(available, current) {
  if (!current || current === 'unknown') return false; // suppress false positives on fresh installs
  const a = parseVersion(available), c = parseVersion(current);
  if (a.major !== c.major) return a.major > c.major;
  if (a.minor !== c.minor) return a.minor > c.minor;
  return a.patch > c.patch;
}

/**
 * Check for available kaspa-aio updates against real GitHub releases
 */
async function checkForUpdates() {
  const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
  const statePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');

  let currentVersion = 'unknown';
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    currentVersion = JSON.parse(raw).version || 'unknown';
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Failed to read installation-state.json for version check:', err.message);
    }
  }

  let release;
  try {
    release = await fetchLatestRelease();
  } catch (err) {
    console.error('Could not fetch AIO release:', err.message);
    throw new Error(`Update check failed: ${err.message}`);
  }

  const availableVersion = cleanVersion(release.tag_name);

  if (!isNewer(availableVersion, currentVersion)) {
    return [];
  }

  return [{
    service: 'kaspa-aio',
    serviceName: 'Kaspa All-in-One',
    currentVersion,
    latestVersion: availableVersion,
    updateAvailable: true,
    changelog: (release.body || '').substring(0, 500),
    breaking: false,
    releaseDate: release.published_at,
    htmlUrl: release.html_url
  }];
}

/**
 * Apply update to a specific service.
 * - 'dashboard' and 'wizard': executed via local update shell scripts
 * - 'kaspa-aio': runs both dashboard and wizard update scripts
 * - All other services: docker compose pull + up
 */
async function applyServiceUpdate(update, projectRoot) {
  const { service, version } = update;

  try {
    const installationStatePath = path.join(projectRoot, '.kaspa-aio', 'installation-state.json');
    const stateContent = await fs.readFile(installationStatePath, 'utf8');
    const installationState = JSON.parse(stateContent);

    const serviceState = installationState.services?.find(s => s.name === service);
    const oldVersion = serviceState?.version || 'unknown';

    if (service === 'dashboard') {
      const updateScript = path.join(projectRoot, 'services', 'dashboard', 'scripts', 'update.sh');
      await execFileAsync('sudo', ['bash', updateScript], { timeout: 120000 });
      return { service, success: true, oldVersion, newVersion: version || 'latest', message: `Dashboard updated successfully` };
    }

    if (service === 'wizard') {
      const updateScript = path.join(projectRoot, 'services', 'wizard', 'scripts', 'update.sh');
      await execFileAsync('sudo', ['bash', updateScript], { timeout: 120000 });
      return { service, success: true, oldVersion, newVersion: version || 'latest', message: `Wizard updated successfully` };
    }

    if (service === 'kaspa-aio') {
      // Update dashboard first (synchronous — does not kill this process)
      const dashScript = path.join(projectRoot, 'services', 'dashboard', 'scripts', 'update.sh');
      const wizScript = path.join(projectRoot, 'services', 'wizard', 'scripts', 'update.sh');
      await execFileAsync('sudo', ['bash', dashScript], { timeout: 120000 });
      // Schedule wizard self-update asynchronously: running it now would kill this process
      // before the HTTP response can be flushed. The caller should expect a connection drop
      // ~500ms after receiving this response as the wizard restarts.
      setTimeout(() => {
        execFileAsync('sudo', ['bash', wizScript], { timeout: 120000 })
          .catch(err => console.error('Wizard self-update failed:', err.message));
      }, 500);
      return { service, success: true, oldVersion, newVersion: version || 'latest', message: `Kaspa All-in-One update initiated — wizard will restart momentarily` };
    }

    // Docker-based services: pull new image and restart
    await dockerManager.stopService(service);
    await dockerManager.pullImage(service, version);
    await dockerManager.startService(service);

    const healthy = await waitForServiceHealth(service, 60000);
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
    const stderr = error.stderr ? `\nScript stderr: ${error.stderr.trim()}` : '';
    console.error(`applyServiceUpdate failed for ${service} (exit ${error.code ?? 'unknown'}):`, error.message, stderr);
    return {
      service,
      success: false,
      error: error.message,
      stderr: error.stderr || null,
      exitCode: error.code || null,
      message: `Failed to update ${service}: ${error.message}${stderr}`
    };
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
      // Service may not be ready yet; log non-transient errors for diagnosis
      if (error.code && !['ECONNREFUSED', 'ECONNRESET'].includes(error.code)) {
        console.warn(`Health check error for ${service} (${error.code || error.message})`);
      }
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
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
