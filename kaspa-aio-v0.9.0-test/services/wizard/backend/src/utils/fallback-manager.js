/**
 * Fallback Manager
 * 
 * Manages fallback strategies for service failures:
 * - Node failure detection
 * - User choice dialogs (Continue with public / Troubleshoot / Retry)
 * - Automatic fallback to public Kaspa network
 * - Indexer fallback to public endpoints
 * - Fallback configuration generation for docker-compose
 * 
 * Requirements: 2, 6, 8, 14
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class FallbackManager {
  constructor(dockerManager, profileManager) {
    this.dockerManager = dockerManager;
    this.profileManager = profileManager;
    
    // Public Kaspa network endpoints
    this.publicEndpoints = {
      kaspaNode: {
        rpc: 'https://api.kaspa.org',
        grpc: 'grpc://api.kaspa.org:16110',
        description: 'Public Kaspa mainnet node'
      },
      indexers: {
        kasia: 'https://api.kasia.io',
        kSocial: 'https://api.k-social.io',
        simplyKaspa: 'https://api.simplykaspa.io'
      }
    };
    
    // Health check configuration
    this.healthCheckConfig = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      timeout: 30000, // 30 seconds
      requiredChecks: {
        node: ['rpc', 'p2p'],
        indexer: ['api', 'database']
      }
    };
    
    // Fallback strategies
    this.strategies = {
      node: {
        continueWithPublic: 'continue-public',
        troubleshoot: 'troubleshoot',
        retry: 'retry',
        skipNode: 'skip-node'
      },
      indexer: {
        usePublicEndpoints: 'use-public',
        troubleshoot: 'troubleshoot',
        retry: 'retry'
      }
    };
  }

  /**
   * Detect node failure and determine if fallback is needed
   * @param {string} nodeService - Node service name (kaspa-node or kaspa-archive-node)
   * @param {string[]} dependentServices - Services that depend on this node
   * @returns {Object} Failure detection result
   */
  async detectNodeFailure(nodeService, dependentServices = []) {
    try {
      // Check if node container is running
      const status = await this.dockerManager.getServiceStatus(nodeService);
      
      if (!status.exists) {
        return {
          failed: true,
          reason: 'container_not_found',
          message: `${nodeService} container does not exist`,
          severity: 'critical',
          dependentServices
        };
      }
      
      if (!status.running) {
        return {
          failed: true,
          reason: 'container_not_running',
          message: `${nodeService} container is not running (${status.state})`,
          severity: 'critical',
          dependentServices
        };
      }
      
      // Perform health checks
      const healthCheck = await this.performNodeHealthCheck(nodeService);
      
      if (!healthCheck.healthy) {
        return {
          failed: true,
          reason: 'health_check_failed',
          message: `${nodeService} failed health checks`,
          details: healthCheck.failures,
          severity: 'high',
          dependentServices
        };
      }
      
      return {
        failed: false,
        message: `${nodeService} is healthy`,
        healthCheck
      };
      
    } catch (error) {
      return {
        failed: true,
        reason: 'detection_error',
        message: `Error detecting node failure: ${error.message}`,
        severity: 'critical',
        dependentServices
      };
    }
  }

  /**
   * Perform health checks on a Kaspa node
   * @param {string} nodeService - Node service name
   * @returns {Object} Health check results
   */
  async performNodeHealthCheck(nodeService) {
    const checks = {
      rpc: false,
      p2p: false,
      sync: false
    };
    
    const failures = [];
    
    try {
      // Check RPC endpoint
      const rpcCheck = await this.checkNodeRPC(nodeService);
      checks.rpc = rpcCheck.success;
      if (!rpcCheck.success) {
        failures.push({
          check: 'rpc',
          message: rpcCheck.error || 'RPC endpoint not responding'
        });
      }
      
      // Check P2P connectivity
      const p2pCheck = await this.checkNodeP2P(nodeService);
      checks.p2p = p2pCheck.success;
      if (!p2pCheck.success) {
        failures.push({
          check: 'p2p',
          message: p2pCheck.error || 'P2P connectivity failed'
        });
      }
      
      // Check sync status (if RPC is available)
      if (checks.rpc) {
        const syncCheck = await this.checkNodeSync(nodeService);
        checks.sync = syncCheck.synced;
        if (!syncCheck.synced) {
          failures.push({
            check: 'sync',
            message: `Node is syncing (${syncCheck.progress}%)`,
            warning: true // Not a failure, just a warning
          });
        }
      }
      
    } catch (error) {
      failures.push({
        check: 'general',
        message: `Health check error: ${error.message}`
      });
    }
    
    const healthy = checks.rpc && checks.p2p;
    
    return {
      healthy,
      checks,
      failures,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check node RPC endpoint
   * @param {string} nodeService - Node service name
   * @returns {Object} RPC check result
   */
  async checkNodeRPC(nodeService) {
    try {
      // Try to get block DAG info via RPC
      const cmd = `docker exec ${nodeService} curl -s -X POST http://localhost:16110 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"getBlockDagInfo","params":[],"id":1}'`;
      
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: this.healthCheckConfig.timeout
      });
      
      if (stderr) {
        return { success: false, error: stderr };
      }
      
      const response = JSON.parse(stdout);
      if (response.error) {
        return { success: false, error: response.error.message };
      }
      
      return { success: true, data: response.result };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check node P2P connectivity
   * @param {string} nodeService - Node service name
   * @returns {Object} P2P check result
   */
  async checkNodeP2P(nodeService) {
    try {
      // Check if P2P port is listening
      const cmd = `docker exec ${nodeService} netstat -tuln | grep 16110 || echo "not_listening"`;
      
      const { stdout } = await execAsync(cmd, {
        timeout: this.healthCheckConfig.timeout
      });
      
      if (stdout.includes('not_listening')) {
        return { success: false, error: 'P2P port not listening' };
      }
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check node sync status
   * @param {string} nodeService - Node service name
   * @returns {Object} Sync status
   */
  async checkNodeSync(nodeService) {
    try {
      const cmd = `docker exec ${nodeService} curl -s -X POST http://localhost:16110 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"getBlockDagInfo","params":[],"id":1}'`;
      
      const { stdout } = await execAsync(cmd, {
        timeout: this.healthCheckConfig.timeout
      });
      
      const response = JSON.parse(stdout);
      if (response.error) {
        return { synced: false, error: response.error.message };
      }
      
      const info = response.result;
      const synced = info.isSynced || false;
      const progress = info.blockCount && info.headerCount 
        ? Math.round((info.blockCount / info.headerCount) * 100)
        : 0;
      
      return {
        synced,
        progress,
        blockCount: info.blockCount,
        headerCount: info.headerCount
      };
      
    } catch (error) {
      return { synced: false, error: error.message };
    }
  }

  /**
   * Generate user choice dialog for node failure
   * @param {string} nodeService - Failed node service
   * @param {Object} failureInfo - Failure detection result
   * @returns {Object} User choice dialog configuration
   */
  generateNodeFailureDialog(nodeService, failureInfo) {
    const nodeName = nodeService.includes('archive') ? 'Archive Node' : 'Kaspa Node';
    
    return {
      title: `${nodeName} Health Check Failed`,
      message: failureInfo.message,
      details: failureInfo.details,
      severity: failureInfo.severity,
      dependentServices: failureInfo.dependentServices,
      options: [
        {
          id: this.strategies.node.continueWithPublic,
          label: 'Continue with Public Network',
          description: 'Services will use public Kaspa nodes instead of your local node',
          recommended: true,
          action: 'fallback',
          icon: '🌐'
        },
        {
          id: this.strategies.node.troubleshoot,
          label: 'Troubleshoot Local Node',
          description: 'View logs and diagnostic information to fix the issue',
          recommended: false,
          action: 'troubleshoot',
          icon: '🔧'
        },
        {
          id: this.strategies.node.retry,
          label: 'Retry Health Check',
          description: 'Wait and check the node status again',
          recommended: false,
          action: 'retry',
          icon: '🔄'
        },
        {
          id: this.strategies.node.skipNode,
          label: 'Skip Node Installation',
          description: 'Continue without a local node (all services use public network)',
          recommended: false,
          action: 'skip',
          icon: '⏭️'
        }
      ],
      defaultOption: this.strategies.node.continueWithPublic,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Configure automatic fallback to public Kaspa network
   * @param {string[]} dependentServices - Services that need fallback
   * @param {Object} currentConfig - Current configuration
   * @returns {Object} Updated configuration with fallback
   */
  async configurePublicNetworkFallback(dependentServices, currentConfig = {}) {
    const fallbackConfig = { ...currentConfig };
    
    // Configure services to use public Kaspa network
    fallbackConfig.KASPA_NODE_RPC_URL = this.publicEndpoints.kaspaNode.rpc;
    fallbackConfig.KASPA_NODE_GRPC_URL = this.publicEndpoints.kaspaNode.grpc;
    fallbackConfig.USE_PUBLIC_KASPA_NODE = 'true';
    fallbackConfig.LOCAL_NODE_ENABLED = 'false';
    
    // Add fallback metadata
    fallbackConfig._fallback = {
      enabled: true,
      reason: 'local_node_failure',
      timestamp: new Date().toISOString(),
      affectedServices: dependentServices,
      publicEndpoint: this.publicEndpoints.kaspaNode.rpc
    };
    
    return fallbackConfig;
  }

  /**
   * Configure indexer fallback to public endpoints
   * @param {string[]} indexers - Indexer services that need fallback
   * @param {Object} currentConfig - Current configuration
   * @returns {Object} Updated configuration with indexer fallback
   */
  async configureIndexerFallback(indexers, currentConfig = {}) {
    const fallbackConfig = { ...currentConfig };
    
    // Map indexer services to public endpoints
    const indexerEndpoints = {
      'kasia-indexer': this.publicEndpoints.indexers.kasia,
      'k-indexer': this.publicEndpoints.indexers.kSocial,
      'simply-kaspa-indexer': this.publicEndpoints.indexers.simplyKaspa
    };
    
    for (const indexer of indexers) {
      const endpoint = indexerEndpoints[indexer];
      if (endpoint) {
        const envKey = `${indexer.toUpperCase().replace(/-/g, '_')}_URL`;
        fallbackConfig[envKey] = endpoint;
        fallbackConfig[`${envKey}_FALLBACK`] = 'true';
      }
    }
    
    // Add fallback metadata
    fallbackConfig._indexerFallback = {
      enabled: true,
      reason: 'local_indexer_failure',
      timestamp: new Date().toISOString(),
      affectedIndexers: indexers,
      publicEndpoints: indexers.map(i => indexerEndpoints[i]).filter(Boolean)
    };
    
    return fallbackConfig;
  }

  /**
   * Generate fallback docker-compose configuration
   * @param {Object} fallbackConfig - Fallback configuration
   * @param {string[]} profiles - Selected profiles
   * @returns {Object} Docker compose override configuration
   */
  async generateFallbackDockerCompose(fallbackConfig, profiles) {
    const override = {
      version: '3.8',
      services: {}
    };
    
    // If using public Kaspa network, disable local node
    if (fallbackConfig.USE_PUBLIC_KASPA_NODE === 'true') {
      // Remove kaspa-node from startup
      override.services['kaspa-node'] = {
        profiles: ['disabled'] // Move to disabled profile
      };
      
      // Configure dependent services to use public endpoint
      const dependentServices = this.getDependentServices(profiles, 'kaspa-node');
      for (const service of dependentServices) {
        if (!override.services[service]) {
          override.services[service] = {};
        }
        
        if (!override.services[service].environment) {
          override.services[service].environment = {};
        }
        
        override.services[service].environment.KASPA_NODE_RPC_URL = fallbackConfig.KASPA_NODE_RPC_URL;
        override.services[service].environment.KASPA_NODE_GRPC_URL = fallbackConfig.KASPA_NODE_GRPC_URL;
      }
    }
    
    // If using public indexers, configure applications
    if (fallbackConfig._indexerFallback?.enabled) {
      const apps = ['kasia-app', 'k-social-app', 'kaspa-explorer'];
      
      for (const app of apps) {
        if (!override.services[app]) {
          override.services[app] = {};
        }
        
        if (!override.services[app].environment) {
          override.services[app].environment = {};
        }
        
        // Configure public indexer endpoints
        if (fallbackConfig.KASIA_INDEXER_URL) {
          override.services[app].environment.KASIA_INDEXER_URL = fallbackConfig.KASIA_INDEXER_URL;
        }
        if (fallbackConfig.K_INDEXER_URL) {
          override.services[app].environment.K_INDEXER_URL = fallbackConfig.K_INDEXER_URL;
        }
        if (fallbackConfig.SIMPLY_KASPA_INDEXER_URL) {
          override.services[app].environment.SIMPLY_KASPA_INDEXER_URL = fallbackConfig.SIMPLY_KASPA_INDEXER_URL;
        }
      }
    }
    
    return override;
  }

  /**
   * Get services that depend on a specific service
   * @param {string[]} profiles - Selected profiles
   * @param {string} targetService - Service to find dependents for
   * @returns {string[]} Dependent service names
   */
  getDependentServices(profiles, targetService) {
    const dependents = [];
    
    // Services that depend on kaspa-node
    if (targetService === 'kaspa-node' || targetService === 'kaspa-archive-node') {
      const indexerProfiles = profiles.filter(p => p === 'indexer-services');
      if (indexerProfiles.length > 0) {
        dependents.push('kasia-indexer', 'k-indexer', 'simply-kaspa-indexer');
      }
      
      const miningProfiles = profiles.filter(p => p === 'mining');
      if (miningProfiles.length > 0) {
        dependents.push('kaspa-stratum');
      }
    }
    
    // Services that depend on indexers
    if (targetService.includes('indexer')) {
      const appProfiles = profiles.filter(p => p === 'kaspa-user-applications');
      if (appProfiles.length > 0) {
        dependents.push('kasia-app', 'k-social-app', 'kaspa-explorer');
      }
    }
    
    return dependents;
  }

  /**
   * Get troubleshooting information for a failed service
   * @param {string} service - Failed service name
   * @param {Object} failureInfo - Failure information
   * @returns {Object} Troubleshooting guide
   */
  async getTroubleshootingInfo(service, failureInfo) {
    const troubleshooting = {
      service,
      failure: failureInfo,
      steps: [],
      logs: null,
      diagnostics: {}
    };
    
    // Get service logs
    try {
      const logsResult = await this.dockerManager.getLogs(service, 100);
      if (logsResult.success) {
        troubleshooting.logs = logsResult.logs;
      }
    } catch (error) {
      troubleshooting.logs = `Error retrieving logs: ${error.message}`;
    }
    
    // Generate troubleshooting steps based on failure reason
    switch (failureInfo.reason) {
      case 'container_not_found':
        troubleshooting.steps = [
          {
            step: 1,
            title: 'Verify Docker Compose Configuration',
            description: 'Check that the service is defined in docker-compose.yml',
            command: 'docker compose config'
          },
          {
            step: 2,
            title: 'Check Profile Selection',
            description: 'Ensure the correct profile is selected for this service',
            action: 'review_profiles'
          },
          {
            step: 3,
            title: 'Rebuild Service',
            description: 'Try rebuilding the service from scratch',
            command: `docker compose build ${service}`
          }
        ];
        break;
        
      case 'container_not_running':
        troubleshooting.steps = [
          {
            step: 1,
            title: 'Check Container Logs',
            description: 'Review logs for error messages',
            action: 'view_logs'
          },
          {
            step: 2,
            title: 'Check Resource Availability',
            description: 'Ensure system has sufficient CPU, memory, and disk space',
            action: 'check_resources'
          },
          {
            step: 3,
            title: 'Restart Service',
            description: 'Try restarting the service',
            command: `docker compose restart ${service}`
          }
        ];
        break;
        
      case 'health_check_failed':
        troubleshooting.steps = [
          {
            step: 1,
            title: 'Review Health Check Failures',
            description: 'Check which specific health checks failed',
            details: failureInfo.details
          },
          {
            step: 2,
            title: 'Check Network Connectivity',
            description: 'Verify network configuration and port availability',
            action: 'check_network'
          },
          {
            step: 3,
            title: 'Wait for Service Initialization',
            description: 'Some services take time to fully initialize',
            action: 'wait_and_retry'
          }
        ];
        break;
        
      default:
        troubleshooting.steps = [
          {
            step: 1,
            title: 'Review Error Message',
            description: failureInfo.message,
            action: 'review_error'
          },
          {
            step: 2,
            title: 'Check Documentation',
            description: 'Consult service-specific documentation',
            action: 'view_docs'
          },
          {
            step: 3,
            title: 'Contact Support',
            description: 'If issue persists, contact support with diagnostic information',
            action: 'export_diagnostics'
          }
        ];
    }
    
    // Get system diagnostics
    troubleshooting.diagnostics = await this.getSystemDiagnostics();
    
    return troubleshooting;
  }

  /**
   * Get system diagnostics for troubleshooting
   * @returns {Object} System diagnostic information
   */
  async getSystemDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      docker: {},
      system: {},
      network: {}
    };
    
    try {
      // Docker version
      const dockerVersion = await execAsync('docker --version');
      diagnostics.docker.version = dockerVersion.stdout.trim();
      
      // Docker compose version
      const composeVersion = await execAsync('docker compose version');
      diagnostics.docker.composeVersion = composeVersion.stdout.trim();
      
      // Running containers
      const containers = await this.dockerManager.getRunningServices();
      diagnostics.docker.runningContainers = containers.length;
      
      // System resources
      const df = await execAsync('df -h /');
      diagnostics.system.diskSpace = df.stdout;
      
      // Network connectivity
      const ping = await execAsync('ping -c 1 8.8.8.8 || echo "offline"');
      diagnostics.network.internetConnectivity = !ping.stdout.includes('offline');
      
    } catch (error) {
      diagnostics.error = error.message;
    }
    
    return diagnostics;
  }

  /**
   * Retry health check with exponential backoff
   * @param {string} service - Service to check
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Object} Final health check result
   */
  async retryHealthCheck(service, maxRetries = 3) {
    let lastResult = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Health check attempt ${attempt}/${maxRetries} for ${service}`);
      
      if (service.includes('node')) {
        lastResult = await this.performNodeHealthCheck(service);
      } else {
        // For other services, use basic status check
        const status = await this.dockerManager.getServiceStatus(service);
        lastResult = {
          healthy: status.running,
          checks: { running: status.running },
          failures: status.running ? [] : [{ check: 'status', message: 'Service not running' }]
        };
      }
      
      if (lastResult.healthy) {
        return {
          success: true,
          attempt,
          result: lastResult
        };
      }
      
      // Wait before next retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = this.healthCheckConfig.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      attempts: maxRetries,
      result: lastResult
    };
  }

  /**
   * Save fallback configuration to file
   * @param {Object} fallbackConfig - Fallback configuration
   * @param {string} outputPath - Output file path
   * @returns {Object} Save result
   */
  async saveFallbackConfiguration(fallbackConfig, outputPath = '.kaspa-aio/fallback-config.json') {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save configuration
      await fs.writeFile(
        outputPath,
        JSON.stringify(fallbackConfig, null, 2),
        'utf-8'
      );
      
      return {
        success: true,
        path: outputPath,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load fallback configuration from file
   * @param {string} inputPath - Input file path
   * @returns {Object} Loaded configuration
   */
  async loadFallbackConfiguration(inputPath = '.kaspa-aio/fallback-config.json') {
    try {
      const data = await fs.readFile(inputPath, 'utf-8');
      const config = JSON.parse(data);
      
      return {
        success: true,
        config,
        timestamp: config._fallback?.timestamp || null
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FallbackManager;
