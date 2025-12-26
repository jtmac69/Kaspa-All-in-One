const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Error Remediation Manager
 * Automatically detects and fixes common installation errors
 */
class ErrorRemediationManager {
  constructor() {
    this.errorPatterns = this.loadErrorPatterns();
    this.remediationStrategies = this.loadRemediationStrategies();
  }

  /**
   * Load error patterns for detection
   */
  loadErrorPatterns() {
    return {
      portConflict: {
        patterns: [
          /port.*already.*in.*use/i,
          /bind.*address.*already.*in.*use/i,
          /EADDRINUSE/i,
          /cannot.*bind.*port/i
        ],
        category: 'port_conflict',
        severity: 'medium',
        autoFixable: true
      },
      permissionDenied: {
        patterns: [
          /permission.*denied/i,
          /EACCES/i,
          /access.*denied/i,
          /cannot.*access/i,
          /dial.*unix.*permission.*denied/i
        ],
        category: 'permission_error',
        severity: 'high',
        autoFixable: true
      },
      outOfMemory: {
        patterns: [
          /out.*of.*memory/i,
          /OOM/i,
          /cannot.*allocate.*memory/i,
          /memory.*limit.*exceeded/i,
          /killed.*by.*signal.*9/i
        ],
        category: 'resource_limit',
        severity: 'high',
        autoFixable: true
      },
      diskSpace: {
        patterns: [
          /no.*space.*left/i,
          /disk.*full/i,
          /ENOSPC/i,
          /insufficient.*disk.*space/i
        ],
        category: 'disk_space',
        severity: 'high',
        autoFixable: false
      },
      dockerNotRunning: {
        patterns: [
          /cannot.*connect.*to.*docker.*daemon/i,
          /docker.*daemon.*not.*running/i,
          /is.*the.*docker.*daemon.*running/i,
          /docker.*not.*found/i
        ],
        category: 'docker_not_running',
        severity: 'critical',
        autoFixable: true
      },
      networkError: {
        patterns: [
          /network.*timeout/i,
          /connection.*refused/i,
          /ETIMEDOUT/i,
          /ECONNREFUSED/i,
          /failed.*to.*pull.*image/i
        ],
        category: 'network_error',
        severity: 'medium',
        autoFixable: true
      },
      imageNotFound: {
        patterns: [
          /image.*not.*found/i,
          /manifest.*not.*found/i,
          /repository.*does.*not.*exist/i
        ],
        category: 'image_not_found',
        severity: 'medium',
        autoFixable: false
      }
    };
  }

  /**
   * Load remediation strategies
   */
  loadRemediationStrategies() {
    return {
      port_conflict: {
        name: 'Port Conflict Resolution',
        steps: [
          'detect_conflicting_port',
          'identify_process',
          'suggest_alternative_port',
          'offer_kill_process'
        ],
        autoFix: true
      },
      permission_error: {
        name: 'Permission Fix',
        steps: [
          'detect_permission_issue',
          'check_docker_group',
          'suggest_group_add',
          'suggest_socket_permissions'
        ],
        autoFix: true
      },
      resource_limit: {
        name: 'Resource Limit Adjustment',
        steps: [
          'detect_resource_issue',
          'check_available_resources',
          'suggest_limit_reduction',
          'suggest_remote_node'
        ],
        autoFix: true
      },
      docker_not_running: {
        name: 'Docker Service Start',
        steps: [
          'check_docker_installed',
          'attempt_start_docker',
          'verify_docker_running'
        ],
        autoFix: true
      },
      network_error: {
        name: 'Network Retry',
        steps: [
          'check_internet_connection',
          'retry_with_backoff',
          'suggest_alternative_registry'
        ],
        autoFix: true
      }
    };
  }

  /**
   * Analyze error and determine remediation
   */
  async analyzeError(error) {
    const errorMessage = typeof error === 'string' ? error : error.message || error.toString();
    
    const analysis = {
      originalError: errorMessage,
      category: 'unknown',
      severity: 'unknown',
      autoFixable: false,
      detectedPatterns: [],
      remediation: null,
      timestamp: new Date().toISOString()
    };

    // Check against all error patterns
    for (const [key, pattern] of Object.entries(this.errorPatterns)) {
      for (const regex of pattern.patterns) {
        if (regex.test(errorMessage)) {
          analysis.category = pattern.category;
          analysis.severity = pattern.severity;
          analysis.autoFixable = pattern.autoFixable;
          analysis.detectedPatterns.push(key);
          break;
        }
      }
      if (analysis.category !== 'unknown') break;
    }

    // Get remediation strategy
    if (analysis.category !== 'unknown') {
      analysis.remediation = this.remediationStrategies[analysis.category];
    }

    // Extract specific details
    analysis.details = await this.extractErrorDetails(errorMessage, analysis.category);

    return analysis;
  }

  /**
   * Extract specific details from error message
   */
  async extractErrorDetails(errorMessage, category) {
    const details = {};

    switch (category) {
      case 'port_conflict':
        // Extract port number
        const portMatch = errorMessage.match(/port[:\s]+(\d+)/i) || 
                         errorMessage.match(/(\d+).*already.*in.*use/i);
        if (portMatch) {
          details.port = parseInt(portMatch[1]);
          details.process = await this.findProcessOnPort(details.port);
        }
        break;

      case 'permission_error':
        // Extract file/socket path
        const pathMatch = errorMessage.match(/\/[^\s]+/);
        if (pathMatch) {
          details.path = pathMatch[0];
        }
        details.isDockerSocket = errorMessage.includes('docker.sock');
        break;

      case 'resource_limit':
        // Extract memory info if available
        const memMatch = errorMessage.match(/(\d+)\s*(MB|GB|KB)/i);
        if (memMatch) {
          details.memory = memMatch[0];
        }
        break;

      case 'network_error':
        // Extract URL or image name
        const urlMatch = errorMessage.match(/https?:\/\/[^\s]+/) ||
                        errorMessage.match(/image[:\s]+([^\s]+)/i);
        if (urlMatch) {
          details.url = urlMatch[0];
        }
        break;
    }

    return details;
  }

  /**
   * Find process using a specific port
   */
  async findProcessOnPort(port) {
    const platform = os.platform();
    
    try {
      let command;
      if (platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -i :${port} -t`;
      }

      const { stdout } = await execAsync(command);
      
      if (platform === 'win32') {
        // Parse Windows netstat output
        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          const parts = lines[0].trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          return { pid, name: 'Unknown' };
        }
      } else {
        // Parse Unix lsof output
        const pid = stdout.trim().split('\n')[0];
        if (pid) {
          try {
            const { stdout: psOut } = await execAsync(`ps -p ${pid} -o comm=`);
            return { pid, name: psOut.trim() };
          } catch (err) {
            return { pid, name: 'Unknown' };
          }
        }
      }
    } catch (error) {
      // Port might not be in use or command failed
      return null;
    }

    return null;
  }

  /**
   * Auto-fix port conflict
   */
  async fixPortConflict(details, options = {}) {
    const result = {
      success: false,
      action: 'port_conflict_fix',
      message: '',
      suggestions: []
    };

    if (!details.port) {
      result.message = 'Could not determine conflicting port';
      return result;
    }

    // Find alternative port
    const alternativePort = await this.findAlternativePort(details.port);
    
    result.suggestions.push({
      type: 'change_port',
      description: `Use port ${alternativePort} instead of ${details.port}`,
      port: alternativePort,
      autoApply: true
    });

    // If process identified, offer to kill it
    if (details.process && details.process.pid) {
      result.suggestions.push({
        type: 'kill_process',
        description: `Stop process ${details.process.name} (PID: ${details.process.pid}) using port ${details.port}`,
        pid: details.process.pid,
        processName: details.process.name,
        autoApply: false, // Requires user confirmation
        warning: 'This will stop the running process. Make sure it\'s safe to do so.'
      });
    }

    result.success = true;
    result.message = `Found ${result.suggestions.length} solution(s) for port conflict on port ${details.port}`;
    
    return result;
  }

  /**
   * Find alternative available port
   */
  async findAlternativePort(originalPort) {
    // Try ports in range +1 to +10 from original
    for (let offset = 1; offset <= 10; offset++) {
      const testPort = originalPort + offset;
      const isAvailable = await this.isPortAvailable(testPort);
      if (isAvailable) {
        return testPort;
      }
    }
    
    // If no port found in range, return a random high port
    return 30000 + Math.floor(Math.random() * 10000);
  }

  /**
   * Check if port is available
   */
  async isPortAvailable(port) {
    const platform = os.platform();
    
    try {
      let command;
      if (platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else {
        command = `lsof -i :${port}`;
      }

      await execAsync(command);
      return false; // Command succeeded, port is in use
    } catch (error) {
      return true; // Command failed, port is available
    }
  }

  /**
   * Auto-fix permission error
   */
  async fixPermissionError(details, options = {}) {
    const result = {
      success: false,
      action: 'permission_fix',
      message: '',
      suggestions: []
    };

    const platform = os.platform();
    const username = os.userInfo().username;

    if (details.isDockerSocket || (details.path && details.path.includes('docker.sock'))) {
      // Docker socket permission issue
      if (platform === 'linux') {
        result.suggestions.push({
          type: 'add_to_docker_group',
          description: `Add user '${username}' to the docker group`,
          command: `sudo usermod -aG docker ${username}`,
          autoApply: false,
          requiresRestart: true,
          explanation: 'This allows you to run Docker commands without sudo. You\'ll need to log out and back in for this to take effect.'
        });

        result.suggestions.push({
          type: 'fix_socket_permissions',
          description: 'Temporarily fix docker.sock permissions',
          command: 'sudo chmod 666 /var/run/docker.sock',
          autoApply: false,
          warning: 'This is a temporary fix. The proper solution is to add your user to the docker group.'
        });
      } else if (platform === 'darwin') {
        result.suggestions.push({
          type: 'restart_docker_desktop',
          description: 'Restart Docker Desktop',
          explanation: 'Docker Desktop on Mac should handle permissions automatically. Try restarting Docker Desktop.',
          autoApply: false
        });
      }
    } else {
      // Generic permission issue
      result.suggestions.push({
        type: 'check_permissions',
        description: 'Check file/directory permissions',
        explanation: details.path ? 
          `Make sure you have read/write access to: ${details.path}` :
          'Make sure you have the necessary permissions to access the required files.'
      });
    }

    result.success = result.suggestions.length > 0;
    result.message = result.success ? 
      `Found ${result.suggestions.length} solution(s) for permission error` :
      'Could not determine specific permission fix';
    
    return result;
  }

  /**
   * Auto-fix resource limit error
   */
  async fixResourceLimit(details, systemResources) {
    const result = {
      success: false,
      action: 'resource_limit_fix',
      message: '',
      suggestions: []
    };

    // Check available resources
    const availableRAM = systemResources?.memory?.availableGB || 0;
    const totalRAM = systemResources?.memory?.totalGB || 0;

    if (availableRAM < 4) {
      // Very limited RAM - suggest remote node
      result.suggestions.push({
        type: 'use_remote_node',
        description: 'Use a remote Kaspa node instead of running locally',
        explanation: 'Your system has limited RAM. Using a remote node will significantly reduce memory usage.',
        config: {
          KASPA_NODE_MODE: 'remote',
          REMOTE_KASPA_NODE_URL: 'https://api.kaspa.org'
        },
        autoApply: true,
        priority: 'high'
      });
    } else if (availableRAM < 8) {
      // Limited RAM - reduce limits
      result.suggestions.push({
        type: 'reduce_memory_limits',
        description: 'Reduce Docker memory limits',
        explanation: 'Your system has limited RAM. We\'ll reduce memory limits to prevent out-of-memory errors.',
        config: {
          KASPA_NODE_MEMORY_LIMIT: '4g',
          INDEXER_MEMORY_LIMIT: '1g'
        },
        autoApply: true,
        priority: 'medium'
      });

      result.suggestions.push({
        type: 'disable_optional_services',
        description: 'Disable optional services',
        explanation: 'Disable non-essential services to free up memory.',
        services: ['portainer', 'pgadmin'],
        autoApply: false
      });
    } else {
      // Moderate RAM - just reduce limits slightly
      result.suggestions.push({
        type: 'optimize_memory_limits',
        description: 'Optimize memory allocation',
        explanation: 'Adjust memory limits to better fit your system.',
        config: {
          KASPA_NODE_MEMORY_LIMIT: '8g',
          INDEXER_MEMORY_LIMIT: '2g'
        },
        autoApply: true
      });
    }

    // Check Docker memory limit
    if (systemResources?.docker?.hasLimit) {
      const dockerLimit = parseFloat(systemResources.docker.memoryLimitGB);
      if (dockerLimit < totalRAM * 0.8) {
        result.suggestions.push({
          type: 'increase_docker_limit',
          description: 'Increase Docker memory limit',
          explanation: `Docker is limited to ${dockerLimit}GB but your system has ${totalRAM}GB. Increase Docker's memory limit in Docker Desktop settings.`,
          autoApply: false,
          priority: 'high'
        });
      }
    }

    result.success = result.suggestions.length > 0;
    result.message = result.success ? 
      `Found ${result.suggestions.length} solution(s) for resource limit issue` :
      'Could not determine specific resource fix';
    
    return result;
  }

  /**
   * Auto-fix Docker not running
   */
  async fixDockerNotRunning() {
    const result = {
      success: false,
      action: 'docker_start',
      message: '',
      suggestions: []
    };

    const platform = os.platform();

    if (platform === 'linux') {
      result.suggestions.push({
        type: 'start_docker_service',
        description: 'Start Docker service',
        command: 'sudo systemctl start docker',
        autoApply: false,
        explanation: 'This will start the Docker daemon.'
      });

      result.suggestions.push({
        type: 'enable_docker_service',
        description: 'Enable Docker to start on boot',
        command: 'sudo systemctl enable docker',
        autoApply: false
      });
    } else if (platform === 'darwin' || platform === 'win32') {
      result.suggestions.push({
        type: 'start_docker_desktop',
        description: 'Start Docker Desktop',
        explanation: 'Open Docker Desktop application and wait for it to start (look for the whale icon).',
        autoApply: false
      });
    }

    result.success = result.suggestions.length > 0;
    result.message = 'Docker is not running. Please start Docker and try again.';
    
    return result;
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(operation, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result, attempts: attempt };
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Call retry callback if provided
          if (onRetry) {
            await onRetry(attempt, error, delay);
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Increase delay for next retry
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: maxRetries,
      message: `Operation failed after ${maxRetries} attempts`
    };
  }

  /**
   * Apply auto-fix
   */
  async applyAutoFix(analysis, suggestion, context = {}) {
    const result = {
      success: false,
      action: suggestion.type,
      message: '',
      applied: false
    };

    try {
      switch (suggestion.type) {
        case 'change_port':
          // Update configuration with new port
          result.config = { port: suggestion.port };
          result.message = `Port changed from ${analysis.details.port} to ${suggestion.port}`;
          result.success = true;
          result.applied = true;
          break;

        case 'use_remote_node':
          // Update configuration to use remote node
          result.config = suggestion.config;
          result.message = 'Configured to use remote Kaspa node';
          result.success = true;
          result.applied = true;
          break;

        case 'reduce_memory_limits':
        case 'optimize_memory_limits':
          // Update memory limits
          result.config = suggestion.config;
          result.message = 'Memory limits adjusted';
          result.success = true;
          result.applied = true;
          break;

        default:
          result.message = `Auto-fix not implemented for: ${suggestion.type}`;
          result.success = false;
      }
    } catch (error) {
      result.message = `Failed to apply fix: ${error.message}`;
      result.error = error.message;
    }

    return result;
  }
}

module.exports = ErrorRemediationManager;
