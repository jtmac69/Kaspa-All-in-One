const Docker = require('dockerode');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { DockerError, retryOperation, withTimeout } = require('./error-handler');
const { createResolver } = require('../../../../shared/lib/path-resolver');

const execAsync = promisify(exec);

class DockerManager {
  constructor() {
    this.docker = new Docker();
    // Use centralized path resolver for consistent path resolution
    const resolver = createResolver(__dirname);
    this.projectRoot = resolver.getProjectRoot();
    
    // Profile-to-Container-Names Mapping (NEW 8-PROFILE ARCHITECTURE)
    // This maps profile IDs to actual Docker container names
    this.PROFILE_CONTAINER_MAP = {
      // New Profile IDs
      'kaspa-node': ['kaspa-node'],
      'kasia-app': ['kasia-app'],
      'k-social-app': ['k-social'],  // Note: container name is 'k-social'
      'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
      'kasia-indexer': ['kasia-indexer'],
      'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
      'kaspa-archive-node': ['kaspa-archive-node'],
      'kaspa-stratum': ['kaspa-stratum'],
      
      // Legacy Profile IDs (BACKWARD COMPATIBILITY)
      'core': ['kaspa-node'],
      'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
      'indexer-services': ['kasia-indexer', 'k-indexer', 'simply-kaspa-indexer', 'timescaledb-kindexer', 'timescaledb-explorer'],
      'archive-node': ['kaspa-archive-node'],
      'mining': ['kaspa-stratum']
    };
    
    // Keep legacy profileMapping for docker-compose profile compatibility if needed
    this.profileMapping = {
      'kaspa-node': [],  // No docker-compose profile needed
      'kasia-app': [],
      'k-social-app': [],
      'kaspa-explorer-bundle': [],
      'kasia-indexer': [],
      'k-indexer-bundle': [],
      'kaspa-archive-node': [],
      'kaspa-stratum': [],
      
      // Legacy
      'core': [],
      'kaspa-user-applications': [],
      'indexer-services': [],
      'archive-node': [],
      'mining': []
    };
  }

  /**
   * Convert wizard profiles to docker-compose profiles
   * @param {string[]} wizardProfiles - Array of wizard profile names
   * @returns {string[]} Array of docker-compose profile names
   */
  mapProfilesToDockerCompose(wizardProfiles) {
    const dockerProfiles = new Set();
    wizardProfiles.forEach(profile => {
      const mapped = this.profileMapping[profile];
      if (mapped) {
        mapped.forEach(p => dockerProfiles.add(p));
      }
    });
    return Array.from(dockerProfiles);
  }

  /**
   * Check if Docker is available and running
   * @returns {Promise<boolean>} True if Docker is available
   */
  async isDockerAvailable() {
    try {
      // Try to ping Docker daemon
      await this.docker.ping();
      return true;
    } catch (error) {
      console.warn('Docker not available:', error.message);
      return false;
    }
  }

  /**
   * Get container names for given profiles
   * @param {string[]} profiles - Array of profile IDs (new or legacy)
   * @returns {string[]} Array of unique container names
   */
  getContainerNamesForProfiles(profiles) {
    const containerNames = new Set();
    
    profiles.forEach(profileId => {
      const containers = this.PROFILE_CONTAINER_MAP[profileId];
      if (containers) {
        containers.forEach(name => containerNames.add(name));
      } else {
        console.warn(`Unknown profile ID in DockerManager: ${profileId}`);
      }
    });
    
    return Array.from(containerNames);
  }

  async pullImages(profiles, progressCallback) {
    // Map wizard profiles to pre-built Docker images that need pulling
    // Services with local Dockerfiles are built, not pulled
    const imageMap = {
      // New profile IDs (8-profile architecture)
      'kaspa-node': ['kaspanet/rusty-kaspad:latest'],
      'kasia-app': [],              // Built locally from ./services/kasia
      'k-social-app': [],           // Built locally from ./services/k-social
      'kaspa-explorer-bundle': ['timescale/timescaledb:latest-pg16'],
      'kasia-indexer': ['kkluster/kasia-indexer:main'],
      'k-indexer-bundle': ['timescale/timescaledb:latest-pg16'],
      'kaspa-archive-node': ['kaspanet/rusty-kaspad:latest'],
      'kaspa-stratum': [],          // Built locally from ./services/kaspa-stratum
      // Legacy profile IDs (backward compatibility)
      core: ['kaspanet/rusty-kaspad:latest'],
      'indexer-services': ['timescale/timescaledb:latest-pg16', 'kkluster/kasia-indexer:main'],
      'kaspa-user-applications': [],
      'archive-node': ['kaspanet/rusty-kaspad:latest'],
      mining: []
    };

    const imagesToPull = new Set();
    profiles.forEach(profile => {
      if (imageMap[profile]) {
        imageMap[profile].forEach(img => imagesToPull.add(img));
      }
    });

    const images = Array.from(imagesToPull);
    const results = [];

    for (let i = 0; i < images.length; i++) {
      const imageName = images[i];
      try {
        if (progressCallback) {
          progressCallback({
            stage: 'pull',
            current: i + 1,
            total: images.length,
            image: imageName,
            message: `Pulling image ${imageName}...`
          });
        }

        await this.pullImage(imageName);
        results.push({ image: imageName, success: true });
      } catch (error) {
        results.push({
          image: imageName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async pullImage(imageName) {
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err, stream) => {
        if (err) return reject(err);

        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) return reject(err);
          resolve(output);
        });
      });
    });
  }

  async buildServices(profiles, progressCallback) {
    // Map wizard profiles to docker-compose services that need building
    // Note: Services using pre-built images (kaspanet/rusty-kaspad,
    // timescale/timescaledb, kkluster/kasia-indexer, supertypo/simply-kaspa-indexer)
    // don't need building — only services with local Dockerfiles are built here.
    // Note: dashboard is now host-based, not containerized
    const servicesToBuild = {
      // New profile IDs (8-profile architecture)
      'kaspa-node': [],             // Pre-built image
      'kasia-app': ['kasia-app'],   // Has local Dockerfile in ./services/kasia
      'k-social-app': ['k-social'], // Has local Dockerfile in ./services/k-social
      'kaspa-explorer-bundle': ['kaspa-explorer'], // Has local Dockerfile; simply-kaspa-indexer uses pre-built
      'kasia-indexer': [],          // Uses pre-built kkluster/kasia-indexer image
      'k-indexer-bundle': ['k-indexer'], // Has local Dockerfile in ./services/k-indexer
      'kaspa-archive-node': [],     // Pre-built image
      'kaspa-stratum': ['kaspa-stratum'], // Has local Dockerfile
      // Legacy profile IDs (backward compatibility)
      core: [],
      'kaspa-user-applications': ['kasia-app', 'k-social', 'kaspa-explorer'],
      'indexer-services': ['k-indexer'],
      'archive-node': [],
      mining: ['kaspa-stratum']
    };

    const services = [];
    profiles.forEach(profile => {
      if (servicesToBuild[profile]) {
        services.push(...servicesToBuild[profile]);
      }
    });

    if (services.length === 0) {
      return { success: true, services: [] };
    }

    const results = [];
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      try {
        if (progressCallback) {
          progressCallback({
            stage: 'build',
            current: i + 1,
            total: services.length,
            service,
            message: `Building ${service}...`
          });
        }

        const result = await this.buildService(service);
        results.push({ service, success: true, output: result });
      } catch (error) {
        results.push({
          service,
          success: false,
          error: error.message
        });
      }
    }

    return { success: results.every(r => r.success), services: results };
  }

  async buildService(serviceName) {
    const cmd = `cd ${this.projectRoot} && docker compose build ${serviceName}`;
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    return { stdout, stderr };
  }

  async startServices(profiles, progressCallback) {
    try {
      // Clean up any orphan containers from previous installations/tests
      // This prevents conflicts with containers from different project names
      if (progressCallback) {
        progressCallback({
          stage: 'start',
          message: 'Cleaning up orphan containers...'
        });
      }
      
      try {
        await execAsync(`cd ${this.projectRoot} && docker compose down --remove-orphans`, {
          maxBuffer: 10 * 1024 * 1024
        });
      } catch (cleanupError) {
        console.log('Warning: Cleanup failed, continuing anyway:', cleanupError.message);
      }

      // CRITICAL: Remove containers by name that might conflict from other projects
      // Container names are global in Docker, so we must remove any existing containers
      // with the same names regardless of which project created them
      const containerNames = this.getContainerNamesForProfiles(profiles);
      if (containerNames.length > 0) {
        if (progressCallback) {
          progressCallback({
            stage: 'start',
            message: 'Removing conflicting containers...'
          });
        }
        
        for (const containerName of containerNames) {
          try {
            // Stop and remove container if it exists (ignore errors if it doesn't)
            await execAsync(`docker stop ${containerName} 2>/dev/null || true`);
            await execAsync(`docker rm ${containerName} 2>/dev/null || true`);
          } catch (err) {
            // Ignore errors - container might not exist
            console.log(`Note: Could not remove container ${containerName}: ${err.message}`);
          }
        }
      }

      if (progressCallback) {
        progressCallback({
          stage: 'start',
          message: `Starting services for profiles: ${profiles.join(', ')}...`
        });
      }

      // Map wizard profiles to docker-compose profiles
      const dockerProfiles = this.mapProfilesToDockerCompose(profiles);
      
      // Build the command - if no profiles, just start core services
      let cmd;
      if (dockerProfiles.length > 0) {
        const profileFlags = dockerProfiles.map(p => `--profile ${p}`).join(' ');
        cmd = `cd ${this.projectRoot} && docker compose ${profileFlags} up -d`;
      } else {
        // Core profile - start services without profile flag (they have no profile assigned)
        cmd = `cd ${this.projectRoot} && docker compose up -d`;
      }
      
      // Use retry with timeout
      const result = await retryOperation(
        async () => {
          return await withTimeout(
            execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }),
            120000, // 2 minute timeout
            'Service startup timed out'
          );
        },
        {
          maxRetries: 2,
          initialDelay: 2000,
          onRetry: (attempt, maxRetries, error) => {
            console.log(`Retry ${attempt}/${maxRetries} for starting services:`, error.message);
            if (progressCallback) {
              progressCallback({
                stage: 'start',
                message: `Retrying service startup (${attempt}/${maxRetries})...`
              });
            }
          }
        }
      );

      const { stdout, stderr } = result;

      // Verify that services actually started
      // Wait a moment for containers to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const validation = await this.validateServices(profiles);
      
      // Check if any expected services are missing or failed
      if (validation.summary.missing > 0 || validation.anyFailed) {
        const failedServices = Object.entries(validation.services)
          .filter(([_, status]) => !status.running)
          .map(([name, _]) => name);
        
        throw new DockerError('Some services failed to start', {
          profiles,
          failedServices,
          summary: validation.summary
        });
      }

      if (progressCallback) {
        progressCallback({
          stage: 'start',
          message: 'Services started successfully',
          complete: true
        });
      }

      return {
        success: true,
        output: { stdout, stderr },
        validation
      };
    } catch (error) {
      throw new DockerError('Failed to start services', {
        profiles,
        error: error.message
      });
    }
  }

  async getServiceStatus(serviceName) {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [serviceName] }
      });

      if (containers.length === 0) {
        return { exists: false };
      }

      const container = containers[0];
      return {
        exists: true,
        running: container.State === 'running',
        status: container.Status,
        state: container.State,
        id: container.Id
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  async validateServices(profiles) {
    // Use the new PROFILE_CONTAINER_MAP for validation
    const servicesToCheck = new Set();
    profiles.forEach(profile => {
      const containers = this.PROFILE_CONTAINER_MAP[profile];
      if (containers) {
        containers.forEach(svc => servicesToCheck.add(svc));
      }
    });

    const results = {};
    for (const service of servicesToCheck) {
      results[service] = await this.getServiceStatus(service);
    }

    const allRunning = Object.values(results).every(r => r.running);
    const anyFailed = Object.values(results).some(r => r.exists && !r.running);

    return {
      services: results,
      allRunning,
      anyFailed,
      summary: {
        total: servicesToCheck.size,
        running: Object.values(results).filter(r => r.running).length,
        stopped: Object.values(results).filter(r => r.exists && !r.running).length,
        missing: Object.values(results).filter(r => !r.exists).length
      }
    };
  }

  async stopServices() {
    try {
      const cmd = `cd ${this.projectRoot} && docker compose down`;
      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: { stdout, stderr } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stopAllServices() {
    try {
      const cmd = `cd ${this.projectRoot} && docker compose down`;
      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: { stdout, stderr } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getRunningServices() {
    try {
      const containers = await this.docker.listContainers({
        all: false, // Only running containers
        filters: {
          label: ['com.docker.compose.project=all-in-one']
        }
      });

      return containers.map(container => ({
        id: container.Id,
        name: container.Names[0].replace(/^\//, ''),
        image: container.Image,
        state: container.State,
        status: container.Status,
        ports: container.Ports,
        labels: container.Labels
      }));
    } catch (error) {
      console.error('Error getting running services:', error);
      return [];
    }
  }

  async getLogs(serviceName, lines = 100) {
    try {
      const cmd = `cd ${this.projectRoot} && docker compose logs --tail=${lines} ${serviceName}`;
      const { stdout } = await execAsync(cmd, {
        maxBuffer: 5 * 1024 * 1024
      });
      return { success: true, logs: stdout };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removeAllContainers() {
    try {
      const cmd = `cd ${this.projectRoot} && docker compose down --remove-orphans`;
      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: { stdout, stderr } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removeAllVolumes() {
    try {
      const cmd = `cd ${this.projectRoot} && docker compose down -v`;
      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: { stdout, stderr } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove specific services and optionally their data
   * @param {string[]} serviceNames - Array of service names to remove
   * @param {Object} options - Removal options
   * @param {boolean} options.removeData - Whether to remove associated volumes/data
   * @returns {Promise<Object>} Removal result
   */
  async removeServices(serviceNames, options = {}) {
    try {
      const { removeData = false } = options;
      const results = [];

      // Stop and remove containers for each service
      for (const serviceName of serviceNames) {
        try {
          // Stop the service
          const stopCmd = `cd ${this.projectRoot} && docker compose stop ${serviceName}`;
          await execAsync(stopCmd);

          // Remove the container
          const rmCmd = `cd ${this.projectRoot} && docker compose rm -f ${serviceName}`;
          await execAsync(rmCmd);

          results.push({
            service: serviceName,
            success: true,
            action: 'removed'
          });

        } catch (error) {
          // Service might not exist, which is okay for removal
          if (error.message.includes('No such service') || error.message.includes('not found')) {
            results.push({
              service: serviceName,
              success: true,
              action: 'not_found',
              message: 'Service was not running'
            });
          } else {
            results.push({
              service: serviceName,
              success: false,
              error: error.message
            });
          }
        }
      }

      // Remove volumes if requested
      if (removeData) {
        for (const serviceName of serviceNames) {
          try {
            // Remove named volumes associated with the service
            const volumeName = `all-in-one_${serviceName}-data`;
            const volumeCmd = `docker volume rm ${volumeName} 2>/dev/null || true`;
            await execAsync(volumeCmd);

            results.push({
              service: serviceName,
              success: true,
              action: 'volume_removed'
            });

          } catch (error) {
            // Volume might not exist, which is okay
            results.push({
              service: serviceName,
              success: true,
              action: 'volume_not_found',
              message: 'No volume to remove'
            });
          }
        }
      }

      const allSuccessful = results.every(r => r.success);

      return {
        success: allSuccessful,
        results,
        summary: {
          total: serviceNames.length,
          removed: results.filter(r => r.action === 'removed').length,
          not_found: results.filter(r => r.action === 'not_found').length,
          failed: results.filter(r => !r.success).length,
          volumes_removed: removeData ? results.filter(r => r.action === 'volume_removed').length : 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }
}

module.exports = DockerManager;
