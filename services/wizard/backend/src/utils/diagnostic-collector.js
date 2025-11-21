const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * DiagnosticCollector - Collects system diagnostic information for troubleshooting
 * 
 * Features:
 * - System information (OS, CPU, memory, disk)
 * - Docker status and configuration
 * - Service status and logs
 * - Configuration files (sanitized)
 * - Error history
 * - Network connectivity
 */
class DiagnosticCollector {
  constructor() {
    this.sensitivePatterns = [
      /password[=:]\s*[^\s]+/gi,
      /api[_-]?key[=:]\s*[^\s]+/gi,
      /secret[=:]\s*[^\s]+/gi,
      /token[=:]\s*[^\s]+/gi,
      /auth[=:]\s*[^\s]+/gi,
      /(postgres|mysql|db)[_-]?password[=:]\s*[^\s]+/gi
    ];
  }

  /**
   * Collect all diagnostic information
   */
  async collectAll() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: await this.collectSystemInfo(),
      docker: await this.collectDockerInfo(),
      services: await this.collectServiceInfo(),
      configuration: await this.collectConfigInfo(),
      errors: await this.collectErrorHistory(),
      network: await this.collectNetworkInfo()
    };

    return diagnostics;
  }

  /**
   * Collect system information
   */
  async collectSystemInfo() {
    try {
      const info = {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        cpus: {
          count: os.cpus().length,
          model: os.cpus()[0]?.model || 'unknown'
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          totalGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
          freeGB: (os.freemem() / (1024 ** 3)).toFixed(2)
        }
      };

      // Get disk space
      try {
        const { stdout } = await execAsync('df -h . | tail -1');
        const parts = stdout.trim().split(/\s+/);
        info.disk = {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usePercent: parts[4]
        };
      } catch (error) {
        info.disk = { error: 'Unable to retrieve disk information' };
      }

      return info;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Collect Docker information
   */
  async collectDockerInfo() {
    const info = {
      version: null,
      composeVersion: null,
      running: false,
      containers: [],
      images: [],
      volumes: [],
      networks: []
    };

    try {
      // Docker version
      const { stdout: dockerVersion } = await execAsync('docker --version');
      info.version = dockerVersion.trim();
      info.running = true;
    } catch (error) {
      info.error = 'Docker not installed or not running';
      return info;
    }

    try {
      // Docker Compose version
      const { stdout: composeVersion } = await execAsync('docker compose version');
      info.composeVersion = composeVersion.trim();
    } catch (error) {
      info.composeError = 'Docker Compose not available';
    }

    try {
      // List containers
      const { stdout: containers } = await execAsync('docker ps -a --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}"');
      info.containers = containers.trim().split('\n')
        .filter(line => line)
        .map(line => {
          const [id, name, status, image] = line.split('|');
          return { id, name, status, image };
        });
    } catch (error) {
      info.containersError = error.message;
    }

    try {
      // List images
      const { stdout: images } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}|{{.Size}}"');
      info.images = images.trim().split('\n')
        .filter(line => line)
        .map(line => {
          const [name, size] = line.split('|');
          return { name, size };
        });
    } catch (error) {
      info.imagesError = error.message;
    }

    try {
      // List volumes
      const { stdout: volumes } = await execAsync('docker volume ls --format "{{.Name}}"');
      info.volumes = volumes.trim().split('\n').filter(line => line);
    } catch (error) {
      info.volumesError = error.message;
    }

    try {
      // List networks
      const { stdout: networks } = await execAsync('docker network ls --format "{{.Name}}|{{.Driver}}"');
      info.networks = networks.trim().split('\n')
        .filter(line => line)
        .map(line => {
          const [name, driver] = line.split('|');
          return { name, driver };
        });
    } catch (error) {
      info.networksError = error.message;
    }

    return info;
  }

  /**
   * Collect service information
   */
  async collectServiceInfo() {
    const services = [];

    try {
      // Get running services from docker-compose
      const { stdout } = await execAsync('docker compose ps --format json', {
        cwd: path.join(__dirname, '../../../../../')
      });
      
      const lines = stdout.trim().split('\n').filter(line => line);
      for (const line of lines) {
        try {
          const service = JSON.parse(line);
          services.push({
            name: service.Name,
            service: service.Service,
            status: service.State,
            health: service.Health || 'unknown',
            ports: service.Publishers || []
          });
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      return { error: 'Unable to retrieve service information', message: error.message };
    }

    return services;
  }

  /**
   * Collect configuration information (sanitized)
   */
  async collectConfigInfo() {
    const config = {
      envFile: null,
      dockerCompose: null,
      profiles: []
    };

    try {
      // Read .env file (sanitized)
      const envPath = path.join(__dirname, '../../../../../.env');
      try {
        const envContent = await fs.readFile(envPath, 'utf-8');
        config.envFile = this.sanitizeContent(envContent);
      } catch (error) {
        config.envFile = { error: '.env file not found or not readable' };
      }

      // Read docker-compose.yml (basic info only)
      const composePath = path.join(__dirname, '../../../../../docker-compose.yml');
      try {
        const composeContent = await fs.readFile(composePath, 'utf-8');
        // Extract service names only
        const serviceMatches = composeContent.match(/^\s{2}[a-z-]+:/gm);
        if (serviceMatches) {
          config.dockerCompose = {
            services: serviceMatches.map(s => s.trim().replace(':', ''))
          };
        }
      } catch (error) {
        config.dockerCompose = { error: 'docker-compose.yml not found' };
      }

      // Get active profiles
      try {
        const { stdout } = await execAsync('docker compose config --profiles', {
          cwd: path.join(__dirname, '../../../../../')
        });
        config.profiles = stdout.trim().split('\n').filter(line => line);
      } catch (error) {
        config.profiles = { error: 'Unable to retrieve profiles' };
      }

    } catch (error) {
      config.error = error.message;
    }

    return config;
  }

  /**
   * Collect error history from logs
   */
  async collectErrorHistory() {
    const errors = [];

    try {
      // Get recent container logs with errors
      const { stdout } = await execAsync('docker compose logs --tail=100 2>&1 | grep -i "error\\|fail\\|exception" || true', {
        cwd: path.join(__dirname, '../../../../../')
      });

      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        errors.push(...lines.slice(0, 50)); // Limit to 50 most recent errors
      }
    } catch (error) {
      return { error: 'Unable to retrieve error logs', message: error.message };
    }

    return errors.length > 0 ? errors : ['No recent errors found'];
  }

  /**
   * Collect network connectivity information
   */
  async collectNetworkInfo() {
    const network = {
      interfaces: [],
      connectivity: {}
    };

    try {
      // Get network interfaces
      const interfaces = os.networkInterfaces();
      for (const [name, addrs] of Object.entries(interfaces)) {
        const ipv4 = addrs.find(addr => addr.family === 'IPv4' && !addr.internal);
        if (ipv4) {
          network.interfaces.push({
            name,
            address: ipv4.address,
            netmask: ipv4.netmask
          });
        }
      }

      // Test connectivity to key services
      const tests = [
        { name: 'Internet', host: '8.8.8.8', port: 53 },
        { name: 'Docker Hub', host: 'registry-1.docker.io', port: 443 },
        { name: 'GitHub', host: 'github.com', port: 443 }
      ];

      for (const test of tests) {
        try {
          await this.testConnection(test.host, test.port, 5000);
          network.connectivity[test.name] = 'OK';
        } catch (error) {
          network.connectivity[test.name] = 'Failed';
        }
      }

    } catch (error) {
      network.error = error.message;
    }

    return network;
  }

  /**
   * Test network connection to a host:port
   */
  testConnection(host, port, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      }, timeout);

      socket.connect(port, host, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Sanitize content by removing sensitive information
   */
  sanitizeContent(content) {
    let sanitized = content;

    // Replace sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        const parts = match.split(/[=:]/);
        return `${parts[0]}=***REDACTED***`;
      });
    }

    return sanitized;
  }

  /**
   * Generate human-readable diagnostic report
   */
  async generateReport() {
    const diagnostics = await this.collectAll();
    
    let report = '# Kaspa All-in-One Diagnostic Report\n\n';
    report += `Generated: ${diagnostics.timestamp}\n\n`;

    // System Information
    report += '## System Information\n\n';
    if (diagnostics.system.error) {
      report += `Error: ${diagnostics.system.error}\n\n`;
    } else {
      report += `- Platform: ${diagnostics.system.platform} ${diagnostics.system.arch}\n`;
      report += `- OS Release: ${diagnostics.system.release}\n`;
      report += `- Hostname: ${diagnostics.system.hostname}\n`;
      report += `- Uptime: ${Math.floor(diagnostics.system.uptime / 3600)} hours\n`;
      report += `- CPU: ${diagnostics.system.cpus.count} cores (${diagnostics.system.cpus.model})\n`;
      report += `- Memory: ${diagnostics.system.memory.totalGB} GB total, ${diagnostics.system.memory.freeGB} GB free\n`;
      if (diagnostics.system.disk && !diagnostics.system.disk.error) {
        report += `- Disk: ${diagnostics.system.disk.size} total, ${diagnostics.system.disk.available} available (${diagnostics.system.disk.usePercent} used)\n`;
      }
      report += '\n';
    }

    // Docker Information
    report += '## Docker Information\n\n';
    if (diagnostics.docker.error) {
      report += `Error: ${diagnostics.docker.error}\n\n`;
    } else {
      report += `- Docker Version: ${diagnostics.docker.version}\n`;
      report += `- Docker Compose Version: ${diagnostics.docker.composeVersion || 'Not available'}\n`;
      report += `- Running: ${diagnostics.docker.running ? 'Yes' : 'No'}\n`;
      report += `- Containers: ${diagnostics.docker.containers?.length || 0}\n`;
      report += `- Images: ${diagnostics.docker.images?.length || 0}\n`;
      report += `- Volumes: ${diagnostics.docker.volumes?.length || 0}\n`;
      report += '\n';

      if (diagnostics.docker.containers && diagnostics.docker.containers.length > 0) {
        report += '### Containers\n\n';
        for (const container of diagnostics.docker.containers) {
          report += `- ${container.name}: ${container.status}\n`;
        }
        report += '\n';
      }
    }

    // Service Information
    report += '## Services\n\n';
    if (Array.isArray(diagnostics.services)) {
      if (diagnostics.services.length === 0) {
        report += 'No services running\n\n';
      } else {
        for (const service of diagnostics.services) {
          report += `- ${service.name}: ${service.status} (Health: ${service.health})\n`;
        }
        report += '\n';
      }
    } else if (diagnostics.services.error) {
      report += `Error: ${diagnostics.services.error}\n\n`;
    }

    // Configuration
    report += '## Configuration\n\n';
    if (diagnostics.configuration.profiles && Array.isArray(diagnostics.configuration.profiles)) {
      report += `Active Profiles: ${diagnostics.configuration.profiles.join(', ') || 'None'}\n\n`;
    }

    // Recent Errors
    report += '## Recent Errors\n\n';
    if (Array.isArray(diagnostics.errors)) {
      if (diagnostics.errors.length === 1 && diagnostics.errors[0] === 'No recent errors found') {
        report += 'No recent errors found\n\n';
      } else {
        report += '```\n';
        report += diagnostics.errors.slice(0, 20).join('\n');
        report += '\n```\n\n';
      }
    }

    // Network Connectivity
    report += '## Network Connectivity\n\n';
    if (diagnostics.network.connectivity) {
      for (const [name, status] of Object.entries(diagnostics.network.connectivity)) {
        report += `- ${name}: ${status}\n`;
      }
      report += '\n';
    }

    report += '---\n\n';
    report += '*Note: Sensitive information (passwords, API keys, tokens) has been redacted from this report.*\n';

    return report;
  }

  /**
   * Generate JSON diagnostic data
   */
  async generateJSON() {
    return await this.collectAll();
  }
}

module.exports = DiagnosticCollector;
