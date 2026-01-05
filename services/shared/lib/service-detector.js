const Docker = require('dockerode');

/**
 * ServiceDetector - Detects Docker container status for installed services
 * 
 * This class provides methods to query Docker for container status, using health checks
 * when available and falling back to running state otherwise. It handles Docker
 * unavailability gracefully.
 */
class ServiceDetector {
  constructor() {
    this.docker = new Docker();
    this.lastDockerCheck = null;
    this.dockerAvailable = null;
  }

  /**
   * Get status of all installed services
   * @param {string[]} serviceNames - Names of services to check
   * @returns {Promise<ServiceStatus[]>} Status of each service
   */
  async getServiceStatus(serviceNames) {
    if (!Array.isArray(serviceNames)) {
      throw new Error('serviceNames must be an array');
    }

    const results = [];
    
    // Check if Docker is available first
    const dockerAvailable = await this.isDockerAvailable();
    if (!dockerAvailable) {
      // Return not_found status for all services when Docker is unavailable
      return serviceNames.map(name => ({
        name,
        status: 'not_found',
        containerName: name,
        healthCheck: false,
        lastChecked: new Date().toISOString(),
        error: 'Docker not available'
      }));
    }

    // Get status for each service
    for (const serviceName of serviceNames) {
      try {
        const status = await this.getServiceDetail(serviceName);
        results.push(status);
      } catch (error) {
        results.push({
          name: serviceName,
          status: 'not_found',
          containerName: serviceName,
          healthCheck: false,
          lastChecked: new Date().toISOString(),
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get detailed status of a single service
   * @param {string} serviceName - Service name
   * @returns {Promise<ServiceStatus>} Detailed status
   */
  async getServiceDetail(serviceName) {
    if (!serviceName || typeof serviceName !== 'string') {
      throw new Error('serviceName must be a non-empty string');
    }

    const lastChecked = new Date().toISOString();

    try {
      // List containers with the given name (both running and stopped)
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [serviceName] }
      });

      if (containers.length === 0) {
        return {
          name: serviceName,
          status: 'not_found',
          containerName: serviceName,
          healthCheck: false,
          lastChecked
        };
      }

      // Get the first matching container
      const containerInfo = containers[0];
      const containerName = containerInfo.Names[0].replace(/^\//, ''); // Remove leading slash

      // Determine status based on container state and health
      let status = 'stopped';
      let healthCheck = false;
      let uptime = undefined;

      if (containerInfo.State === 'running') {
        // Check if container has health check
        if (containerInfo.Status.includes('(healthy)')) {
          status = 'healthy';
          healthCheck = true;
        } else if (containerInfo.Status.includes('(unhealthy)')) {
          status = 'unhealthy';
          healthCheck = true;
        } else if (containerInfo.Status.includes('(starting)')) {
          status = 'starting';
          healthCheck = true;
        } else {
          // No health check, but container is running
          status = 'healthy'; // Assume healthy if running without health check
          healthCheck = false;
        }

        // Extract uptime from status string
        const uptimeMatch = containerInfo.Status.match(/Up (.+?)(?:\s|$)/);
        if (uptimeMatch) {
          uptime = uptimeMatch[1];
        }
      }

      return {
        name: serviceName,
        status,
        containerName,
        uptime,
        healthCheck,
        lastChecked
      };

    } catch (error) {
      return {
        name: serviceName,
        status: 'not_found',
        containerName: serviceName,
        healthCheck: false,
        lastChecked,
        error: error.message
      };
    }
  }

  /**
   * Check if Docker is available
   * @returns {Promise<boolean>} True if Docker is accessible
   */
  async isDockerAvailable() {
    // Cache the result for 30 seconds to avoid repeated checks
    const now = Date.now();
    if (this.lastDockerCheck && (now - this.lastDockerCheck) < 30000) {
      return this.dockerAvailable;
    }

    try {
      // Try to ping Docker daemon
      await this.docker.ping();
      this.dockerAvailable = true;
      this.lastDockerCheck = now;
      return true;
    } catch (error) {
      this.dockerAvailable = false;
      this.lastDockerCheck = now;
      return false;
    }
  }

  /**
   * Clear Docker availability cache (for testing)
   */
  clearCache() {
    this.lastDockerCheck = null;
    this.dockerAvailable = null;
  }
}

module.exports = { ServiceDetector };