/**
 * Enhanced Troubleshooting System
 * 
 * Provides guided troubleshooting with context-specific steps,
 * automatic retry mechanisms, and diagnostic export functionality.
 * 
 * Requirements: 6.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const execAsync = promisify(exec);

class TroubleshootingSystem {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    this.diagnosticsDir = path.join(this.projectRoot, '.kaspa-diagnostics');
    
    // Retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2
    };
    
    // Transient error patterns
    this.transientErrorPatterns = [
      /network.*timeout/i,
      /connection.*refused/i,
      /temporary.*failure/i,
      /rate.*limit/i,
      /try.*again/i,
      /service.*unavailable/i,
      /timeout.*exceeded/i,
      /dns.*resolution.*failed/i,
      /no.*route.*to.*host/i,
      /connection.*reset/i
    ];
  }

  /**
   * Get guided troubleshooting steps for a specific error
   * @param {Object} errorContext - Error context information
   * @returns {Promise<Object>} Troubleshooting guide
   */
  async getGuidedTroubleshooting(errorContext) {
    const { stage, error, service, profiles, systemInfo } = errorContext;
    
    const guide = {
      title: `Troubleshooting: ${this.getStageTitle(stage)}`,
      description: this.getStageDescription(stage),
      steps: [],
      quickFixes: [],
      diagnosticCommands: [],
      fallbackOptions: [],
      isTransient: this.isTransientError(error),
      retryRecommended: false,
      estimatedTime: '5-15 minutes'
    };

    // Generate context-specific steps
    guide.steps = await this.generateTroubleshootingSteps(stage, error, service, profiles);
    guide.quickFixes = this.getQuickFixes(stage, error, service);
    guide.diagnosticCommands = this.getDiagnosticCommands(stage, service);
    guide.fallbackOptions = await this.getFallbackOptions(stage, error, service, profiles);
    
    // Determine if retry is recommended
    guide.retryRecommended = guide.isTransient || this.hasQuickFixes(guide.quickFixes);
    
    // Estimate troubleshooting time
    guide.estimatedTime = this.estimateTroubleshootingTime(guide.steps.length, guide.isTransient);
    
    return guide;
  }

  /**
   * Generate context-specific troubleshooting steps
   * @param {string} stage - Installation stage
   * @param {string} error - Error message
   * @param {string} service - Service name (if applicable)
   * @param {string[]} profiles - Selected profiles
   * @returns {Promise<Array>} Troubleshooting steps
   */
  async generateTroubleshootingSteps(stage, error, service, profiles) {
    const steps = [];
    const errorText = (error || '').toLowerCase();

    // Stage-specific troubleshooting
    switch (stage) {
      case 'config':
        steps.push(...await this.getConfigTroubleshootingSteps(errorText));
        break;
      case 'pull':
        steps.push(...await this.getPullTroubleshootingSteps(errorText, service));
        break;
      case 'build':
        steps.push(...await this.getBuildTroubleshootingSteps(errorText, service));
        break;
      case 'deploy':
        steps.push(...await this.getDeployTroubleshootingSteps(errorText, service, profiles));
        break;
      case 'validate':
        steps.push(...await this.getValidationTroubleshootingSteps(errorText, service));
        break;
      case 'syncing':
        steps.push(...await this.getSyncTroubleshootingSteps(errorText, service));
        break;
      default:
        steps.push(...await this.getGenericTroubleshootingSteps(errorText));
    }

    // Add common diagnostic steps
    steps.push(...this.getCommonDiagnosticSteps());

    return steps;
  }

  /**
   * Get configuration troubleshooting steps
   */
  async getConfigTroubleshootingSteps(errorText) {
    const steps = [
      {
        id: 'check-config-values',
        title: 'Verify Configuration Values',
        description: 'Check that all required configuration fields are properly filled',
        actions: [
          'Review IP addresses for valid format (e.g., 192.168.1.100)',
          'Ensure ports are in valid range (1024-65535)',
          'Verify passwords meet minimum requirements (8+ characters)',
          'Check that external IP is reachable if public node is enabled'
        ],
        automated: false,
        estimatedTime: '2-3 minutes'
      }
    ];

    if (errorText.includes('port') || errorText.includes('address')) {
      steps.unshift({
        id: 'check-port-conflicts',
        title: 'Check for Port Conflicts',
        description: 'Verify that configured ports are not already in use',
        actions: [
          'Run: netstat -tulpn | grep :PORT (replace PORT with your configured port)',
          'Stop any services using conflicting ports',
          'Choose different ports if conflicts exist',
          'Update firewall rules if necessary'
        ],
        automated: true,
        command: 'netstat -tulpn',
        estimatedTime: '1-2 minutes'
      });
    }

    if (errorText.includes('ip') || errorText.includes('network')) {
      steps.push({
        id: 'test-network-connectivity',
        title: 'Test Network Connectivity',
        description: 'Verify network configuration and connectivity',
        actions: [
          'Test external IP detection: curl -s https://api.ipify.org',
          'Check DNS resolution: nslookup google.com',
          'Verify internet connectivity: ping -c 3 8.8.8.8',
          'Test Docker network: docker network ls'
        ],
        automated: true,
        command: 'curl -s https://api.ipify.org && nslookup google.com',
        estimatedTime: '1-2 minutes'
      });
    }

    return steps;
  }

  /**
   * Get Docker pull troubleshooting steps
   */
  async getPullTroubleshootingSteps(errorText, service) {
    const steps = [
      {
        id: 'check-docker-status',
        title: 'Verify Docker Status',
        description: 'Ensure Docker daemon is running and accessible',
        actions: [
          'Check Docker status: systemctl status docker',
          'Restart Docker if needed: sudo systemctl restart docker',
          'Verify Docker version: docker --version',
          'Test Docker access: docker ps'
        ],
        automated: true,
        command: 'docker --version && docker ps',
        estimatedTime: '1-2 minutes'
      }
    ];

    if (errorText.includes('network') || errorText.includes('timeout')) {
      steps.push({
        id: 'check-internet-connection',
        title: 'Check Internet Connection',
        description: 'Verify connectivity to Docker registries',
        actions: [
          'Test Docker Hub connectivity: curl -I https://registry-1.docker.io',
          'Check DNS resolution: nslookup registry-1.docker.io',
          'Verify proxy settings if behind corporate firewall',
          'Try alternative DNS servers (8.8.8.8, 1.1.1.1)'
        ],
        automated: true,
        command: 'curl -I https://registry-1.docker.io',
        estimatedTime: '2-3 minutes'
      });
    }

    if (errorText.includes('space') || errorText.includes('disk')) {
      steps.push({
        id: 'check-disk-space',
        title: 'Check Available Disk Space',
        description: 'Ensure sufficient disk space for Docker images',
        actions: [
          'Check disk usage: df -h',
          'Check Docker space usage: docker system df',
          'Clean up unused images: docker image prune -f',
          'Clean up unused containers: docker container prune -f'
        ],
        automated: true,
        command: 'df -h && docker system df',
        estimatedTime: '1-2 minutes'
      });
    }

    if (errorText.includes('rate limit') || errorText.includes('too many requests')) {
      steps.push({
        id: 'handle-rate-limiting',
        title: 'Handle Docker Hub Rate Limiting',
        description: 'Address Docker Hub pull rate limits',
        actions: [
          'Wait 10-15 minutes before retrying',
          'Consider using Docker Hub authentication',
          'Use alternative registries if available',
          'Implement pull retry with exponential backoff'
        ],
        automated: false,
        estimatedTime: '10-15 minutes'
      });
    }

    return steps;
  }

  /**
   * Get Docker build troubleshooting steps
   */
  async getBuildTroubleshootingSteps(errorText, service) {
    const steps = [
      {
        id: 'check-build-context',
        title: 'Verify Build Context',
        description: 'Ensure all required files are present for building',
        actions: [
          'Check Dockerfile exists and is readable',
          'Verify all COPY/ADD source files exist',
          'Check file permissions in build context',
          'Review build logs for specific missing files'
        ],
        automated: true,
        command: `find services/${service} -name "Dockerfile" -o -name "*.sh" -o -name "*.toml"`,
        estimatedTime: '2-3 minutes'
      }
    ];

    if (errorText.includes('permission') || errorText.includes('denied')) {
      steps.push({
        id: 'fix-permissions',
        title: 'Fix File Permissions',
        description: 'Resolve permission issues in build context',
        actions: [
          'Check file ownership: ls -la services/',
          'Fix permissions if needed: chmod +x services/*/build.sh',
          'Ensure Docker has access to build context',
          'Check SELinux/AppArmor policies if applicable'
        ],
        automated: true,
        command: 'ls -la services/ && find services/ -name "*.sh" -exec chmod +x {} \\;',
        estimatedTime: '1-2 minutes'
      });
    }

    if (errorText.includes('network') || errorText.includes('download')) {
      steps.push({
        id: 'check-build-network',
        title: 'Check Build Network Access',
        description: 'Verify network connectivity during build',
        actions: [
          'Test package repository access',
          'Check proxy settings in Dockerfile',
          'Verify DNS resolution in build context',
          'Consider using --network=host for build if needed'
        ],
        automated: false,
        estimatedTime: '3-5 minutes'
      });
    }

    return steps;
  }

  /**
   * Get deployment troubleshooting steps
   */
  async getDeployTroubleshootingSteps(errorText, service, profiles) {
    const steps = [
      {
        id: 'check-service-dependencies',
        title: 'Verify Service Dependencies',
        description: 'Ensure all required services are available',
        actions: [
          'Check docker-compose.yml for service dependencies',
          'Verify dependent services are running: docker ps',
          'Check service health: docker-compose ps',
          'Review startup order and wait conditions'
        ],
        automated: true,
        command: 'docker ps && docker-compose ps',
        estimatedTime: '2-3 minutes'
      }
    ];

    if (errorText.includes('port') || errorText.includes('bind')) {
      steps.push({
        id: 'resolve-port-conflicts',
        title: 'Resolve Port Conflicts',
        description: 'Fix port binding issues',
        actions: [
          'Check which process is using the port: lsof -i :PORT',
          'Stop conflicting services',
          'Update port configuration if needed',
          'Restart services in correct order'
        ],
        automated: true,
        command: 'netstat -tulpn | grep LISTEN',
        estimatedTime: '2-3 minutes'
      });
    }

    if (errorText.includes('volume') || errorText.includes('mount')) {
      steps.push({
        id: 'fix-volume-issues',
        title: 'Fix Volume Mount Issues',
        description: 'Resolve volume and mount problems',
        actions: [
          'Check volume permissions: ls -la /data/',
          'Verify volume paths exist',
          'Check Docker volume status: docker volume ls',
          'Recreate volumes if corrupted: docker volume rm VOLUME_NAME'
        ],
        automated: true,
        command: 'docker volume ls && ls -la /data/ 2>/dev/null || echo "Data directory not found"',
        estimatedTime: '2-3 minutes'
      });
    }

    // Add Core Profile specific troubleshooting
    if (profiles.includes('core') && (service === 'kaspa-node' || !service)) {
      steps.push({
        id: 'troubleshoot-kaspa-node',
        title: 'Troubleshoot Kaspa Node',
        description: 'Diagnose Kaspa node startup issues',
        actions: [
          'Check Kaspa node logs: docker logs kaspa-node',
          'Verify network configuration (mainnet/testnet)',
          'Check RPC and P2P port accessibility',
          'Verify sufficient disk space for blockchain data',
          'Test node connectivity to Kaspa network'
        ],
        automated: true,
        command: 'docker logs kaspa-node --tail 50',
        estimatedTime: '3-5 minutes'
      });
    }

    return steps;
  }

  /**
   * Get validation troubleshooting steps
   */
  async getValidationTroubleshootingSteps(errorText, service) {
    const steps = [
      {
        id: 'check-service-health',
        title: 'Check Service Health',
        description: 'Verify all services are running and healthy',
        actions: [
          'Check container status: docker ps -a',
          'Review service logs: docker-compose logs',
          'Test service endpoints manually',
          'Verify service configuration'
        ],
        automated: true,
        command: 'docker ps -a && docker-compose ps',
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'test-connectivity',
        title: 'Test Service Connectivity',
        description: 'Verify services can communicate with each other',
        actions: [
          'Test internal network connectivity',
          'Check service discovery and DNS',
          'Verify load balancer configuration',
          'Test API endpoints and health checks'
        ],
        automated: true,
        command: 'docker network ls && docker network inspect kaspa-aio_default',
        estimatedTime: '3-5 minutes'
      }
    ];

    if (errorText.includes('timeout') || errorText.includes('connection')) {
      steps.push({
        id: 'diagnose-timeouts',
        title: 'Diagnose Connection Timeouts',
        description: 'Identify and resolve timeout issues',
        actions: [
          'Increase timeout values in configuration',
          'Check network latency and performance',
          'Verify firewall and security group settings',
          'Test with reduced load or simpler configuration'
        ],
        automated: false,
        estimatedTime: '5-10 minutes'
      });
    }

    return steps;
  }

  /**
   * Get sync troubleshooting steps
   */
  async getSyncTroubleshootingSteps(errorText, service) {
    return [
      {
        id: 'check-sync-progress',
        title: 'Check Synchronization Progress',
        description: 'Monitor and diagnose sync issues',
        actions: [
          'Check node sync status and progress',
          'Verify network connectivity to peers',
          'Monitor disk space usage during sync',
          'Check for sync errors in logs'
        ],
        automated: true,
        command: 'docker logs kaspa-node --tail 100 | grep -i sync',
        estimatedTime: '2-3 minutes'
      },
      {
        id: 'optimize-sync-performance',
        title: 'Optimize Sync Performance',
        description: 'Improve synchronization speed and reliability',
        actions: [
          'Ensure sufficient system resources (CPU, RAM)',
          'Check network bandwidth and stability',
          'Consider using snapshot or fast-sync if available',
          'Verify peer connections and quality'
        ],
        automated: false,
        estimatedTime: '5-10 minutes'
      }
    ];
  }

  /**
   * Get generic troubleshooting steps
   */
  async getGenericTroubleshootingSteps(errorText) {
    return [
      {
        id: 'collect-system-info',
        title: 'Collect System Information',
        description: 'Gather basic system diagnostics',
        actions: [
          'Check system resources: free -h && df -h',
          'Verify Docker installation: docker --version',
          'Check system logs: journalctl -n 50',
          'Review process list: ps aux | head -20'
        ],
        automated: true,
        command: 'free -h && df -h && docker --version',
        estimatedTime: '1-2 minutes'
      }
    ];
  }

  /**
   * Get common diagnostic steps
   */
  getCommonDiagnosticSteps() {
    return [
      {
        id: 'export-diagnostics',
        title: 'Export Diagnostic Information',
        description: 'Generate comprehensive diagnostic report',
        actions: [
          'Export system information and logs',
          'Include configuration and error details',
          'Generate diagnostic archive for support',
          'Review diagnostic data before sharing'
        ],
        automated: true,
        command: 'diagnostic-export',
        estimatedTime: '1-2 minutes'
      }
    ];
  }

  /**
   * Get quick fixes for common issues
   */
  getQuickFixes(stage, error, service) {
    const fixes = [];
    const errorText = (error || '').toLowerCase();

    // Docker-related quick fixes
    if (errorText.includes('docker') || errorText.includes('container')) {
      fixes.push({
        id: 'restart-docker',
        title: 'Restart Docker Service',
        description: 'Restart Docker daemon to resolve temporary issues',
        command: 'sudo systemctl restart docker',
        risk: 'low',
        estimatedTime: '30 seconds'
      });
    }

    // Network-related quick fixes
    if (errorText.includes('network') || errorText.includes('dns')) {
      fixes.push({
        id: 'flush-dns',
        title: 'Flush DNS Cache',
        description: 'Clear DNS cache to resolve name resolution issues',
        command: 'sudo systemctl restart systemd-resolved',
        risk: 'low',
        estimatedTime: '10 seconds'
      });
    }

    // Permission-related quick fixes
    if (errorText.includes('permission') || errorText.includes('denied')) {
      fixes.push({
        id: 'fix-permissions',
        title: 'Fix File Permissions',
        description: 'Correct file permissions for Docker access',
        command: 'sudo chown -R $USER:$USER . && chmod +x services/*/build.sh',
        risk: 'medium',
        estimatedTime: '15 seconds'
      });
    }

    // Disk space quick fixes
    if (errorText.includes('space') || errorText.includes('disk')) {
      fixes.push({
        id: 'cleanup-docker',
        title: 'Clean Up Docker Resources',
        description: 'Remove unused Docker images and containers',
        command: 'docker system prune -f',
        risk: 'low',
        estimatedTime: '1-2 minutes'
      });
    }

    return fixes;
  }

  /**
   * Get diagnostic commands for specific context
   */
  getDiagnosticCommands(stage, service) {
    const commands = [
      {
        id: 'system-info',
        title: 'System Information',
        command: 'uname -a && free -h && df -h',
        description: 'Basic system information and resource usage'
      },
      {
        id: 'docker-info',
        title: 'Docker Information',
        command: 'docker --version && docker info && docker ps -a',
        description: 'Docker installation and container status'
      }
    ];

    if (service) {
      commands.push({
        id: 'service-logs',
        title: `${service} Logs`,
        command: `docker logs ${service} --tail 100`,
        description: `Recent logs from ${service} service`
      });
    }

    if (stage === 'deploy' || stage === 'validate') {
      commands.push({
        id: 'network-info',
        title: 'Network Information',
        command: 'docker network ls && netstat -tulpn | grep LISTEN',
        description: 'Docker networks and listening ports'
      });
    }

    return commands;
  }

  /**
   * Get fallback options for Core Profile node failures
   */
  async getFallbackOptions(stage, error, service, profiles) {
    const options = [];

    // Core Profile node fallback options
    if (profiles.includes('core') && (service === 'kaspa-node' || stage === 'syncing')) {
      options.push({
        id: 'use-public-network',
        title: 'Use Public Kaspa Network',
        description: 'Configure services to use public Kaspa nodes instead of local node',
        impact: 'Services will connect to public nodes, reducing local resource usage',
        steps: [
          'Update configuration to use public endpoints',
          'Restart affected services with new configuration',
          'Verify connectivity to public network',
          'Monitor service performance with public nodes'
        ],
        automated: true,
        estimatedTime: '2-3 minutes',
        recommended: true
      });

      options.push({
        id: 'reduce-node-requirements',
        title: 'Reduce Node Resource Requirements',
        description: 'Lower resource usage for Kaspa node to improve stability',
        impact: 'May reduce sync speed but improve reliability on resource-constrained systems',
        steps: [
          'Reduce maximum connections in node configuration',
          'Lower memory limits for node container',
          'Disable non-essential node features',
          'Restart node with reduced configuration'
        ],
        automated: false,
        estimatedTime: '5-10 minutes',
        recommended: false
      });
    }

    // Indexer Services fallback options
    if (profiles.includes('indexer-services')) {
      options.push({
        id: 'use-public-indexers',
        title: 'Use Public Indexer Services',
        description: 'Configure applications to use public indexer endpoints',
        impact: 'Reduces local resource usage but increases external dependencies',
        steps: [
          'Update application configuration with public indexer URLs',
          'Restart applications with new endpoints',
          'Verify connectivity to public indexers',
          'Monitor application performance'
        ],
        automated: true,
        estimatedTime: '2-3 minutes',
        recommended: true
      });
    }

    // General fallback options
    options.push({
      id: 'minimal-configuration',
      title: 'Switch to Minimal Configuration',
      description: 'Use only essential services to ensure basic functionality',
      impact: 'Reduces features but improves stability and resource usage',
      steps: [
        'Identify essential services for selected profiles',
        'Disable optional services and features',
        'Update configuration for minimal setup',
        'Restart with reduced service set'
      ],
      automated: false,
      estimatedTime: '5-10 minutes',
      recommended: false
    });

    return options;
  }

  /**
   * Implement automatic retry mechanism with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} context - Retry context
   * @returns {Promise<Object>} Operation result
   */
  async retryWithBackoff(operation, context = {}) {
    const { maxAttempts = this.retryConfig.maxAttempts, baseDelay = this.retryConfig.baseDelay } = context;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - return result with retry info
        return {
          success: true,
          result,
          attempts: attempt,
          retried: attempt > 1
        };
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }
        
        // Check if error is retryable
        if (!this.isTransientError(error.message)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        console.log(`Retry attempt ${attempt}/${maxAttempts} failed, waiting ${delay}ms:`, error.message);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error: lastError,
      attempts: maxAttempts,
      retried: true
    };
  }

  /**
   * Check if error is transient and retryable
   */
  isTransientError(errorMessage) {
    if (!errorMessage) return false;
    
    return this.transientErrorPatterns.some(pattern => 
      pattern.test(errorMessage)
    );
  }

  /**
   * Generate comprehensive diagnostic export
   * @param {Object} context - Diagnostic context
   * @returns {Promise<Object>} Diagnostic export result
   */
  async generateDiagnosticExport(context = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportId = `kaspa-diagnostics-${timestamp}`;
    
    try {
      // Ensure diagnostics directory exists
      await fs.mkdir(this.diagnosticsDir, { recursive: true });
      
      const diagnostics = {
        exportId,
        timestamp: new Date().toISOString(),
        context,
        system: await this.collectSystemInfo(),
        docker: await this.collectDockerInfo(),
        services: await this.collectServiceInfo(),
        logs: await this.collectLogs(),
        configuration: await this.collectConfigurationInfo(),
        network: await this.collectNetworkInfo(),
        errors: context.errors || []
      };
      
      // Write diagnostic file
      const diagnosticFile = path.join(this.diagnosticsDir, `${exportId}.json`);
      await fs.writeFile(diagnosticFile, JSON.stringify(diagnostics, null, 2));
      
      // Create summary file
      const summary = this.createDiagnosticSummary(diagnostics);
      const summaryFile = path.join(this.diagnosticsDir, `${exportId}-summary.txt`);
      await fs.writeFile(summaryFile, summary);
      
      return {
        success: true,
        exportId,
        files: {
          diagnostic: diagnosticFile,
          summary: summaryFile
        },
        size: await this.getFileSize(diagnosticFile)
      };
      
    } catch (error) {
      console.error('Failed to generate diagnostic export:', error);
      return {
        success: false,
        error: error.message
      };
    }
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
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: process.memoryUsage()
        },
        cpu: os.cpus(),
        loadavg: os.loadavg()
      };
      
      // Add disk usage
      try {
        const { stdout } = await execAsync('df -h');
        info.diskUsage = stdout;
      } catch (error) {
        info.diskUsage = `Error collecting disk usage: ${error.message}`;
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
    try {
      const info = {};
      
      // Docker version
      try {
        const { stdout } = await execAsync('docker --version');
        info.version = stdout.trim();
      } catch (error) {
        info.version = `Error: ${error.message}`;
      }
      
      // Docker info
      try {
        const { stdout } = await execAsync('docker info --format json');
        info.info = JSON.parse(stdout);
      } catch (error) {
        info.info = { error: error.message };
      }
      
      // Container status
      try {
        const { stdout } = await execAsync('docker ps -a --format json');
        info.containers = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch (error) {
        info.containers = { error: error.message };
      }
      
      // Images
      try {
        const { stdout } = await execAsync('docker images --format json');
        info.images = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch (error) {
        info.images = { error: error.message };
      }
      
      return info;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Collect service information
   */
  async collectServiceInfo() {
    try {
      const info = {};
      
      // Docker Compose status
      try {
        const { stdout } = await execAsync('docker-compose ps --format json', {
          cwd: this.projectRoot
        });
        info.composeServices = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch (error) {
        info.composeServices = { error: error.message };
      }
      
      return info;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Collect logs from services
   */
  async collectLogs() {
    const logs = {};
    const services = ['kaspa-node', 'timescaledb', 'nginx', 'wizard', 'dashboard'];
    
    for (const service of services) {
      try {
        const { stdout } = await execAsync(`docker logs ${service} --tail 100`, {
          timeout: 10000 // 10 second timeout per service
        });
        logs[service] = stdout;
      } catch (error) {
        logs[service] = `Error collecting logs: ${error.message}`;
      }
    }
    
    return logs;
  }

  /**
   * Collect configuration information (sanitized)
   */
  async collectConfigurationInfo() {
    try {
      const config = {};
      
      // Read .env file (sanitized)
      try {
        const envPath = path.join(this.projectRoot, '.env');
        const envContent = await fs.readFile(envPath, 'utf8');
        
        // Sanitize sensitive information
        config.environment = envContent
          .split('\n')
          .map(line => {
            if (line.includes('PASSWORD') || line.includes('SECRET') || line.includes('KEY')) {
              const [key] = line.split('=');
              return `${key}=[REDACTED]`;
            }
            return line;
          })
          .join('\n');
      } catch (error) {
        config.environment = `Error reading .env: ${error.message}`;
      }
      
      // Read installation config
      try {
        const configPath = path.join(this.projectRoot, 'installation-config.json');
        const configContent = await fs.readFile(configPath, 'utf8');
        const installConfig = JSON.parse(configContent);
        
        // Sanitize sensitive fields
        if (installConfig.environment) {
          Object.keys(installConfig.environment).forEach(key => {
            if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY')) {
              installConfig.environment[key] = '[REDACTED]';
            }
          });
        }
        
        config.installation = installConfig;
      } catch (error) {
        config.installation = { error: error.message };
      }
      
      return config;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Collect network information
   */
  async collectNetworkInfo() {
    try {
      const info = {};
      
      // Network interfaces
      info.interfaces = os.networkInterfaces();
      
      // Listening ports
      try {
        const { stdout } = await execAsync('netstat -tulpn');
        info.listeningPorts = stdout;
      } catch (error) {
        info.listeningPorts = `Error: ${error.message}`;
      }
      
      // Docker networks
      try {
        const { stdout } = await execAsync('docker network ls --format json');
        info.dockerNetworks = stdout.split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch (error) {
        info.dockerNetworks = { error: error.message };
      }
      
      return info;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Create diagnostic summary
   */
  createDiagnosticSummary(diagnostics) {
    const lines = [
      'KASPA ALL-IN-ONE DIAGNOSTIC SUMMARY',
      '=====================================',
      '',
      `Export ID: ${diagnostics.exportId}`,
      `Timestamp: ${diagnostics.timestamp}`,
      '',
      'SYSTEM INFORMATION',
      '------------------',
      `Platform: ${diagnostics.system.platform} ${diagnostics.system.arch}`,
      `Release: ${diagnostics.system.release}`,
      `Hostname: ${diagnostics.system.hostname}`,
      `Uptime: ${Math.floor(diagnostics.system.uptime / 3600)} hours`,
      `Memory: ${Math.round(diagnostics.system.memory.free / 1024 / 1024 / 1024 * 100) / 100}GB free of ${Math.round(diagnostics.system.memory.total / 1024 / 1024 / 1024 * 100) / 100}GB total`,
      '',
      'DOCKER INFORMATION',
      '------------------',
      `Version: ${diagnostics.docker.version}`,
      `Containers: ${Array.isArray(diagnostics.docker.containers) ? diagnostics.docker.containers.length : 'Error collecting'}`,
      `Images: ${Array.isArray(diagnostics.docker.images) ? diagnostics.docker.images.length : 'Error collecting'}`,
      ''
    ];
    
    if (diagnostics.errors && diagnostics.errors.length > 0) {
      lines.push('ERRORS', '------');
      diagnostics.errors.forEach((error, index) => {
        lines.push(`${index + 1}. ${error.stage || 'Unknown'}: ${error.message || error}`);
      });
      lines.push('');
    }
    
    lines.push(
      'FILES INCLUDED',
      '--------------',
      '- Full diagnostic data (JSON format)',
      '- System information and resource usage',
      '- Docker configuration and container status',
      '- Service logs (last 100 lines per service)',
      '- Network configuration',
      '- Sanitized configuration files',
      '',
      'PRIVACY NOTICE',
      '--------------',
      'Sensitive information (passwords, keys, secrets) has been redacted.',
      'Please review the diagnostic files before sharing with support.',
      '',
      'For support, please provide both the diagnostic JSON file and this summary.'
    );
    
    return lines.join('\n');
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper methods for step generation
   */
  getStageTitle(stage) {
    const titles = {
      'config': 'Configuration Validation',
      'pull': 'Docker Image Download',
      'build': 'Service Building',
      'deploy': 'Service Deployment',
      'validate': 'Installation Validation',
      'syncing': 'Blockchain Synchronization'
    };
    return titles[stage] || 'Installation Process';
  }

  getStageDescription(stage) {
    const descriptions = {
      'config': 'Issues with configuration validation or environment setup',
      'pull': 'Problems downloading Docker images from registries',
      'build': 'Errors during Docker image building process',
      'deploy': 'Issues starting or deploying services',
      'validate': 'Problems with post-installation validation',
      'syncing': 'Issues with blockchain synchronization'
    };
    return descriptions[stage] || 'General installation issues';
  }

  hasQuickFixes(quickFixes) {
    return quickFixes && quickFixes.length > 0;
  }

  estimateTroubleshootingTime(stepCount, isTransient) {
    if (isTransient) {
      return '2-5 minutes (transient error)';
    }
    
    if (stepCount <= 2) {
      return '5-10 minutes';
    } else if (stepCount <= 4) {
      return '10-20 minutes';
    } else {
      return '20-30 minutes';
    }
  }
}

module.exports = TroubleshootingSystem;