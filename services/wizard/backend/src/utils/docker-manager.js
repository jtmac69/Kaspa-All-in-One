const Docker = require('dockerode');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { DockerError, retryOperation, withTimeout } = require('./error-handler');

const execAsync = promisify(exec);

class DockerManager {
  constructor() {
    this.docker = new Docker();
    // Use PROJECT_ROOT env var if available (when running in container)
    // Otherwise calculate relative path (for local development)
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../..');
  }

  async pullImages(profiles, progressCallback) {
    const imageMap = {
      core: ['kaspanet/rusty-kaspad:latest', 'nginx:alpine'],
      explorer: ['timescale/timescaledb:latest-pg16'],
      prod: ['kkluster/kasia-indexer:main']
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
    const servicesToBuild = {
      prod: ['k-social', 'k-indexer', 'kasia'],
      explorer: ['simply-kaspa-indexer'],
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
      if (progressCallback) {
        progressCallback({
          stage: 'start',
          message: `Starting services for profiles: ${profiles.join(', ')}...`
        });
      }

      const profileFlags = profiles.map(p => `--profile ${p}`).join(' ');
      const cmd = `cd ${this.projectRoot} && docker compose ${profileFlags} up -d`;
      
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
    const serviceMap = {
      core: ['kaspa-node', 'dashboard', 'nginx'],
      explorer: ['indexer-db', 'simply-kaspa-indexer'],
      prod: ['kasia', 'kasia-indexer', 'k-social', 'k-indexer'],
      archive: ['archive-db', 'archive-indexer'],
      development: ['portainer', 'pgadmin'],
      mining: ['kaspa-stratum']
    };

    const servicesToCheck = new Set();
    profiles.forEach(profile => {
      if (serviceMap[profile]) {
        serviceMap[profile].forEach(svc => servicesToCheck.add(svc));
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
}

module.exports = DockerManager;
