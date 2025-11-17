const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const fs = require('fs').promises;
const net = require('net');

const execAsync = promisify(exec);

class SystemChecker {
  async checkDocker() {
    try {
      const { stdout } = await execAsync('docker --version');
      const version = stdout.trim();
      const versionMatch = version.match(/Docker version (\d+\.\d+\.\d+)/);
      
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        message: `Docker is installed: ${version}`
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        message: 'Docker is not installed or not accessible',
        remediation: 'Please install Docker from https://docs.docker.com/get-docker/'
      };
    }
  }

  async checkDockerCompose() {
    try {
      const { stdout } = await execAsync('docker compose version');
      const version = stdout.trim();
      const versionMatch = version.match(/version v?(\d+\.\d+\.\d+)/);
      
      return {
        installed: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        message: `Docker Compose is installed: ${version}`
      };
    } catch (error) {
      return {
        installed: false,
        version: null,
        message: 'Docker Compose is not installed or not accessible',
        remediation: 'Docker Compose v2 is required. Please update Docker Desktop or install Docker Compose plugin'
      };
    }
  }

  async checkSystemResources() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const cpuCount = os.cpus().length;
    
    // Check disk space
    let diskSpace = null;
    try {
      const { stdout } = await execAsync('df -k . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      diskSpace = {
        total: parseInt(parts[1]) * 1024, // Convert KB to bytes
        available: parseInt(parts[3]) * 1024,
        used: parseInt(parts[2]) * 1024
      };
    } catch (error) {
      console.error('Failed to check disk space:', error.message);
    }

    const memoryGB = (totalMemory / (1024 ** 3)).toFixed(2);
    const freeMemoryGB = (freeMemory / (1024 ** 3)).toFixed(2);
    const diskAvailableGB = diskSpace ? (diskSpace.available / (1024 ** 3)).toFixed(2) : 'unknown';

    // Minimum requirements: 4GB RAM, 2 CPU cores, 100GB disk
    const meetsMinimum = {
      memory: totalMemory >= 4 * 1024 ** 3,
      cpu: cpuCount >= 2,
      disk: diskSpace ? diskSpace.available >= 100 * 1024 ** 3 : null
    };

    return {
      memory: {
        total: totalMemory,
        free: freeMemory,
        totalGB: memoryGB,
        freeGB: freeMemoryGB,
        meetsMinimum: meetsMinimum.memory,
        message: meetsMinimum.memory 
          ? `Memory: ${memoryGB} GB total (${freeMemoryGB} GB free) - OK`
          : `Memory: ${memoryGB} GB total - WARNING: Minimum 4GB recommended`
      },
      cpu: {
        count: cpuCount,
        model: os.cpus()[0].model,
        meetsMinimum: meetsMinimum.cpu,
        message: meetsMinimum.cpu
          ? `CPU: ${cpuCount} cores - OK`
          : `CPU: ${cpuCount} cores - WARNING: Minimum 2 cores recommended`
      },
      disk: diskSpace ? {
        total: diskSpace.total,
        available: diskSpace.available,
        used: diskSpace.used,
        availableGB: diskAvailableGB,
        meetsMinimum: meetsMinimum.disk,
        message: meetsMinimum.disk
          ? `Disk: ${diskAvailableGB} GB available - OK`
          : `Disk: ${diskAvailableGB} GB available - WARNING: Minimum 100GB recommended`
      } : {
        message: 'Unable to check disk space'
      }
    };
  }

  async checkPortAvailability(ports) {
    const results = {};
    
    for (const port of ports) {
      results[port] = await this.isPortAvailable(port);
    }
    
    return results;
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve({
            available: false,
            message: `Port ${port} is already in use`,
            remediation: `Please stop the service using port ${port} or choose a different port`
          });
        } else {
          resolve({
            available: false,
            message: `Unable to check port ${port}: ${err.message}`
          });
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve({
          available: true,
          message: `Port ${port} is available`
        });
      });
      
      server.listen(port);
    });
  }

  async runFullCheck(requiredPorts = []) {
    const [docker, dockerCompose, resources, ports] = await Promise.all([
      this.checkDocker(),
      this.checkDockerCompose(),
      this.checkSystemResources(),
      requiredPorts.length > 0 ? this.checkPortAvailability(requiredPorts) : Promise.resolve({})
    ]);

    const allChecks = {
      docker,
      dockerCompose,
      resources,
      ports
    };

    // Determine overall status
    const criticalFailed = !docker.installed || !dockerCompose.installed;
    const warningExists = !resources.memory.meetsMinimum || 
                          !resources.cpu.meetsMinimum || 
                          (resources.disk.meetsMinimum === false);
    
    const portIssues = Object.values(ports).some(p => !p.available);

    allChecks.summary = {
      status: criticalFailed ? 'error' : (warningExists || portIssues ? 'warning' : 'success'),
      message: criticalFailed 
        ? 'Critical requirements not met - Docker and Docker Compose are required'
        : warningExists
        ? 'System meets minimum requirements but some warnings exist'
        : 'All system checks passed',
      canProceed: !criticalFailed
    };

    return allChecks;
  }
}

module.exports = SystemChecker;
