/**
 * Enhanced Troubleshooting API
 * 
 * Provides guided troubleshooting, automatic retry mechanisms,
 * diagnostic export, and fallback options.
 * 
 * Requirements: 6.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */

const express = require('express');
const TroubleshootingSystem = require('../utils/troubleshooting-system');
const { validateInput } = require('../middleware/security');

const router = express.Router();
const troubleshootingSystem = new TroubleshootingSystem();

/**
 * POST /api/troubleshooting/guide
 * Get guided troubleshooting steps for a specific error
 */
router.post('/guide', validateInput, async (req, res) => {
  try {
    const { stage, error, service, profiles, systemInfo } = req.body;

    // Validate required fields
    if (!stage || !error) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'stage and error are required fields'
      });
    }

    // Generate troubleshooting guide
    const guide = await troubleshootingSystem.getGuidedTroubleshooting({
      stage,
      error,
      service,
      profiles: profiles || [],
      systemInfo
    });

    res.json({
      success: true,
      guide,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Troubleshooting guide error:', error);
    res.status(500).json({
      error: 'Failed to generate troubleshooting guide',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/troubleshooting/retry
 * Retry an operation with automatic backoff
 */
router.post('/retry', validateInput, async (req, res) => {
  try {
    const { operation, context, maxAttempts } = req.body;

    if (!operation) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'operation is required'
      });
    }

    // Define operation functions
    const operations = {
      'docker-pull': async () => {
        const DockerManager = require('../utils/docker-manager');
        const dockerManager = new DockerManager();
        return await dockerManager.pullImages(context.profiles || []);
      },
      'docker-build': async () => {
        const DockerManager = require('../utils/docker-manager');
        const dockerManager = new DockerManager();
        return await dockerManager.buildServices(context.profiles || []);
      },
      'docker-deploy': async () => {
        const DockerManager = require('../utils/docker-manager');
        const dockerManager = new DockerManager();
        return await dockerManager.startServices(context.profiles || []);
      },
      'service-validation': async () => {
        const DockerManager = require('../utils/docker-manager');
        const dockerManager = new DockerManager();
        return await dockerManager.validateServices(context.profiles || []);
      },
      'infrastructure-validation': async () => {
        const InfrastructureValidator = require('../utils/infrastructure-validator');
        const validator = new InfrastructureValidator();
        return await validator.validateInfrastructure(context.profiles || []);
      }
    };

    const operationFn = operations[operation];
    if (!operationFn) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: `Operation '${operation}' is not supported`,
        supportedOperations: Object.keys(operations)
      });
    }

    // Execute retry with backoff
    const result = await troubleshootingSystem.retryWithBackoff(operationFn, {
      maxAttempts: maxAttempts || 3,
      ...context
    });

    res.json({
      success: result.success,
      result: result.result,
      error: result.error?.message,
      attempts: result.attempts,
      retried: result.retried,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Retry operation error:', error);
    res.status(500).json({
      error: 'Failed to retry operation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/troubleshooting/quick-fix
 * Execute a quick fix for common issues
 */
router.post('/quick-fix', validateInput, async (req, res) => {
  try {
    const { fixId, context } = req.body;

    if (!fixId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'fixId is required'
      });
    }

    // Define quick fix implementations
    const quickFixes = {
      'restart-docker': async () => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync('sudo systemctl restart docker');
        return { message: 'Docker service restarted successfully' };
      },
      'flush-dns': async () => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        await execAsync('sudo systemctl restart systemd-resolved');
        return { message: 'DNS cache flushed successfully' };
      },
      'fix-permissions': async () => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const path = require('path');
        
        const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
        await execAsync(`chown -R $USER:$USER ${projectRoot} && chmod +x ${projectRoot}/services/*/build.sh`);
        return { message: 'File permissions fixed successfully' };
      },
      'cleanup-docker': async () => {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync('docker system prune -f');
        return { message: 'Docker resources cleaned up successfully', details: stdout };
      }
    };

    const fixFn = quickFixes[fixId];
    if (!fixFn) {
      return res.status(400).json({
        error: 'Invalid fix ID',
        message: `Quick fix '${fixId}' is not supported`,
        supportedFixes: Object.keys(quickFixes)
      });
    }

    // Execute quick fix
    const result = await fixFn();

    res.json({
      success: true,
      fixId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Quick fix error:', error);
    res.status(500).json({
      error: 'Failed to execute quick fix',
      message: error.message,
      fixId: req.body.fixId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/troubleshooting/diagnostic-export
 * Generate comprehensive diagnostic export
 */
router.post('/diagnostic-export', validateInput, async (req, res) => {
  try {
    const context = req.body;

    // Generate diagnostic export
    const exportResult = await troubleshootingSystem.generateDiagnosticExport(context);

    if (exportResult.success) {
      res.json({
        success: true,
        exportId: exportResult.exportId,
        files: exportResult.files,
        size: exportResult.size,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to generate diagnostic export',
        message: exportResult.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Diagnostic export error:', error);
    res.status(500).json({
      error: 'Failed to generate diagnostic export',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/troubleshooting/diagnostic-export/:exportId
 * Download diagnostic export file
 */
router.get('/diagnostic-export/:exportId', async (req, res) => {
  try {
    const { exportId } = req.params;
    const { type = 'diagnostic' } = req.query;

    if (!exportId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'exportId is required'
      });
    }

    const path = require('path');
    const fs = require('fs').promises;
    
    const projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    const diagnosticsDir = path.join(projectRoot, '.kaspa-diagnostics');
    
    let fileName;
    let contentType;
    
    if (type === 'summary') {
      fileName = `${exportId}-summary.txt`;
      contentType = 'text/plain';
    } else {
      fileName = `${exportId}.json`;
      contentType = 'application/json';
    }
    
    const filePath = path.join(diagnosticsDir, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: `Diagnostic export '${exportId}' not found`
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Diagnostic download error:', error);
    res.status(500).json({
      error: 'Failed to download diagnostic export',
      message: error.message
    });
  }
});

/**
 * POST /api/troubleshooting/fallback
 * Apply fallback configuration for Core Profile node failures
 */
router.post('/fallback', validateInput, async (req, res) => {
  try {
    const { fallbackId, profiles, context } = req.body;

    if (!fallbackId || !Array.isArray(profiles)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'fallbackId and profiles array are required'
      });
    }

    // Define fallback implementations
    const fallbacks = {
      'use-public-network': async () => {
        const ConfigGenerator = require('../utils/config-generator');
        const configGenerator = new ConfigGenerator();
        
        // Update configuration to use public Kaspa network
        const fallbackConfig = {
          KASPA_NODE_ENDPOINT: 'https://api.kaspa.org',
          USE_LOCAL_NODE: 'false',
          FALLBACK_TO_PUBLIC: 'true'
        };
        
        // Generate updated environment file
        const envContent = await configGenerator.generateEnvFile(fallbackConfig, profiles);
        const envPath = require('path').resolve(__dirname, '../../../../.env');
        const saveResult = await configGenerator.saveEnvFile(envContent, envPath);
        
        if (!saveResult.success) {
          throw new Error(`Failed to save fallback configuration: ${saveResult.error}`);
        }
        
        return {
          message: 'Configuration updated to use public Kaspa network',
          changes: fallbackConfig
        };
      },
      
      'use-public-indexers': async () => {
        const ConfigGenerator = require('../utils/config-generator');
        const configGenerator = new ConfigGenerator();
        
        // Update configuration to use public indexer endpoints
        const fallbackConfig = {
          KASIA_INDEXER_URL: 'https://api.kasia.io',
          K_INDEXER_URL: 'https://api.k-social.io',
          SIMPLY_KASPA_INDEXER_URL: 'https://api.simplykaspa.io',
          USE_LOCAL_INDEXERS: 'false'
        };
        
        // Generate updated environment file
        const envContent = await configGenerator.generateEnvFile(fallbackConfig, profiles);
        const envPath = require('path').resolve(__dirname, '../../../../.env');
        const saveResult = await configGenerator.saveEnvFile(envContent, envPath);
        
        if (!saveResult.success) {
          throw new Error(`Failed to save fallback configuration: ${saveResult.error}`);
        }
        
        return {
          message: 'Configuration updated to use public indexer services',
          changes: fallbackConfig
        };
      },
      
      'minimal-configuration': async () => {
        // Identify essential services for selected profiles
        const essentialServices = {
          'core': ['kaspa-node'],
          'kaspa-user-applications': ['kasia-app', 'nginx'],
          'indexer-services': ['timescaledb'],
          'archive-node': ['kaspa-archive-node'],
          'mining': ['kaspa-stratum']
        };
        
        const enabledServices = [];
        profiles.forEach(profile => {
          if (essentialServices[profile]) {
            enabledServices.push(...essentialServices[profile]);
          }
        });
        
        const ConfigGenerator = require('../utils/config-generator');
        const configGenerator = new ConfigGenerator();
        
        const fallbackConfig = {
          ENABLED_SERVICES: enabledServices.join(','),
          MINIMAL_MODE: 'true',
          DEBUG_MODE: 'false'
        };
        
        // Generate updated environment file
        const envContent = await configGenerator.generateEnvFile(fallbackConfig, profiles);
        const envPath = require('path').resolve(__dirname, '../../../../.env');
        const saveResult = await configGenerator.saveEnvFile(envContent, envPath);
        
        if (!saveResult.success) {
          throw new Error(`Failed to save fallback configuration: ${saveResult.error}`);
        }
        
        return {
          message: 'Configuration updated to minimal setup',
          changes: fallbackConfig,
          enabledServices
        };
      }
    };

    const fallbackFn = fallbacks[fallbackId];
    if (!fallbackFn) {
      return res.status(400).json({
        error: 'Invalid fallback ID',
        message: `Fallback '${fallbackId}' is not supported`,
        supportedFallbacks: Object.keys(fallbacks)
      });
    }

    // Execute fallback
    const result = await fallbackFn();

    res.json({
      success: true,
      fallbackId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fallback execution error:', error);
    res.status(500).json({
      error: 'Failed to execute fallback',
      message: error.message,
      fallbackId: req.body.fallbackId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/troubleshooting/system-check
 * Perform comprehensive system health check
 */
router.get('/system-check', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const checks = {
      docker: { status: 'unknown', message: '', details: null },
      diskSpace: { status: 'unknown', message: '', details: null },
      memory: { status: 'unknown', message: '', details: null },
      network: { status: 'unknown', message: '', details: null },
      ports: { status: 'unknown', message: '', details: null }
    };

    // Check Docker
    try {
      const { stdout } = await execAsync('docker --version && docker info --format json');
      const lines = stdout.split('\n');
      const dockerVersion = lines[0];
      const dockerInfo = JSON.parse(lines.slice(1).join('\n'));
      
      checks.docker = {
        status: 'healthy',
        message: `Docker is running (${dockerVersion})`,
        details: {
          version: dockerVersion,
          containers: dockerInfo.Containers,
          images: dockerInfo.Images,
          serverVersion: dockerInfo.ServerVersion
        }
      };
    } catch (error) {
      checks.docker = {
        status: 'error',
        message: `Docker check failed: ${error.message}`,
        details: null
      };
    }

    // Check disk space
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const diskLine = lines[1];
      const parts = diskLine.split(/\s+/);
      const usage = parts[4];
      const usagePercent = parseInt(usage.replace('%', ''));
      
      if (usagePercent > 90) {
        checks.diskSpace = {
          status: 'warning',
          message: `Disk usage is high (${usage})`,
          details: { usage: usagePercent, raw: diskLine }
        };
      } else if (usagePercent > 95) {
        checks.diskSpace = {
          status: 'error',
          message: `Disk usage is critical (${usage})`,
          details: { usage: usagePercent, raw: diskLine }
        };
      } else {
        checks.diskSpace = {
          status: 'healthy',
          message: `Disk usage is normal (${usage})`,
          details: { usage: usagePercent, raw: diskLine }
        };
      }
    } catch (error) {
      checks.diskSpace = {
        status: 'error',
        message: `Disk space check failed: ${error.message}`,
        details: null
      };
    }

    // Check memory
    try {
      const { stdout } = await execAsync('free -m');
      const lines = stdout.split('\n');
      const memLine = lines[1];
      const parts = memLine.split(/\s+/);
      const total = parseInt(parts[1]);
      const available = parseInt(parts[6] || parts[3]); // available or free
      const usagePercent = Math.round(((total - available) / total) * 100);
      
      if (usagePercent > 90) {
        checks.memory = {
          status: 'warning',
          message: `Memory usage is high (${usagePercent}%)`,
          details: { usage: usagePercent, total, available }
        };
      } else if (usagePercent > 95) {
        checks.memory = {
          status: 'error',
          message: `Memory usage is critical (${usagePercent}%)`,
          details: { usage: usagePercent, total, available }
        };
      } else {
        checks.memory = {
          status: 'healthy',
          message: `Memory usage is normal (${usagePercent}%)`,
          details: { usage: usagePercent, total, available }
        };
      }
    } catch (error) {
      checks.memory = {
        status: 'error',
        message: `Memory check failed: ${error.message}`,
        details: null
      };
    }

    // Check network connectivity
    try {
      await execAsync('ping -c 1 -W 5 8.8.8.8');
      checks.network = {
        status: 'healthy',
        message: 'Network connectivity is working',
        details: null
      };
    } catch (error) {
      checks.network = {
        status: 'error',
        message: 'Network connectivity check failed',
        details: { error: error.message }
      };
    }

    // Check common ports
    try {
      const { stdout } = await execAsync('netstat -tulpn | grep LISTEN');
      const listeningPorts = stdout.split('\n')
        .filter(line => line.includes(':'))
        .map(line => {
          const match = line.match(/:(\d+)\s/);
          return match ? parseInt(match[1]) : null;
        })
        .filter(port => port !== null);
      
      const commonPorts = [80, 443, 3000, 5432, 16110, 16111];
      const conflicts = commonPorts.filter(port => listeningPorts.includes(port));
      
      if (conflicts.length > 0) {
        checks.ports = {
          status: 'warning',
          message: `Some common ports are in use: ${conflicts.join(', ')}`,
          details: { conflicts, listeningPorts: listeningPorts.slice(0, 20) }
        };
      } else {
        checks.ports = {
          status: 'healthy',
          message: 'No port conflicts detected',
          details: { listeningPorts: listeningPorts.slice(0, 20) }
        };
      }
    } catch (error) {
      checks.ports = {
        status: 'error',
        message: `Port check failed: ${error.message}`,
        details: null
      };
    }

    // Determine overall status
    const statuses = Object.values(checks).map(check => check.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('error')) {
      overallStatus = 'error';
    } else if (statuses.includes('warning')) {
      overallStatus = 'warning';
    }

    res.json({
      success: true,
      overallStatus,
      checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System check error:', error);
    res.status(500).json({
      error: 'Failed to perform system check',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/troubleshooting/error-patterns
 * Get known error patterns and their solutions
 */
router.get('/error-patterns', (req, res) => {
  try {
    const patterns = [
      {
        pattern: /network.*timeout/i,
        category: 'network',
        title: 'Network Timeout',
        description: 'Network connection timed out',
        solutions: [
          'Check internet connectivity',
          'Verify DNS resolution',
          'Check firewall settings',
          'Retry the operation'
        ],
        transient: true
      },
      {
        pattern: /connection.*refused/i,
        category: 'network',
        title: 'Connection Refused',
        description: 'Service refused the connection',
        solutions: [
          'Check if service is running',
          'Verify port configuration',
          'Check firewall rules',
          'Ensure service is listening on correct interface'
        ],
        transient: false
      },
      {
        pattern: /permission.*denied/i,
        category: 'permissions',
        title: 'Permission Denied',
        description: 'Insufficient permissions to access resource',
        solutions: [
          'Check file permissions',
          'Ensure Docker has necessary permissions',
          'Run with appropriate user privileges',
          'Check SELinux/AppArmor policies'
        ],
        transient: false
      },
      {
        pattern: /no.*space.*left/i,
        category: 'disk',
        title: 'No Space Left',
        description: 'Insufficient disk space',
        solutions: [
          'Free up disk space',
          'Clean up Docker resources',
          'Remove unused files',
          'Expand disk if possible'
        ],
        transient: false
      },
      {
        pattern: /rate.*limit/i,
        category: 'rate-limiting',
        title: 'Rate Limited',
        description: 'Request rate limit exceeded',
        solutions: [
          'Wait before retrying',
          'Implement exponential backoff',
          'Use authentication if available',
          'Consider alternative endpoints'
        ],
        transient: true
      }
    ];

    res.json({
      success: true,
      patterns: patterns.map(p => ({
        category: p.category,
        title: p.title,
        description: p.description,
        solutions: p.solutions,
        transient: p.transient
      })),
      totalPatterns: patterns.length
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get error patterns',
      message: error.message
    });
  }
});

module.exports = router;