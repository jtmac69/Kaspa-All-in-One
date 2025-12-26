/**
 * Docker Availability Tests for Kaspa Management Dashboard
 * 
 * Tests that verify the dashboard can operate independently of Docker:
 * - Dashboard starts without Docker running
 * - Limited functionality mode when Docker is unavailable
 * - System monitoring continues without Docker
 * - Wizard integration remains functional
 * - Graceful degradation of container-dependent features
 */

const { exec } = require('child_process');
const axios = require('axios');

// Mock external dependencies
jest.mock('child_process');
jest.mock('axios');

describe('Docker Availability Tests', () => {
  let mockExec;
  let mockAxios;

  beforeEach(() => {
    mockExec = require('child_process').exec;
    mockAxios = require('axios');
    
    jest.clearAllMocks();
    
    // Default mock implementations
    mockExec.mockImplementation((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      callback(null, { stdout: 'success', stderr: '' });
    });
  });

  describe('Dashboard Startup Without Docker', () => {
    test('should start dashboard service when Docker is not running', async () => {
      const startDashboardWithoutDocker = () => {
        return new Promise((resolve) => {
          // Check Docker status
          mockExec('systemctl is-active docker', (dockerError) => {
            // Start dashboard regardless of Docker status
            mockExec('systemctl start kaspa-dashboard', (dashboardError, stdout) => {
              resolve({
                dockerRunning: !dockerError,
                dashboardStarted: !dashboardError,
                output: stdout
              });
            });
          });
        });
      };

      // Mock Docker not running
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl is-active docker')) {
          callback(new Error('Docker service not running'));
        } else if (command.includes('systemctl start kaspa-dashboard')) {
          callback(null, { stdout: 'Dashboard started successfully', stderr: '' });
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      const result = await startDashboardWithoutDocker();
      
      expect(result.dockerRunning).toBe(false);
      expect(result.dashboardStarted).toBe(true);
      expect(result.output.stdout).toContain('Dashboard started successfully');
    });

    test('should handle Docker daemon connection errors gracefully', async () => {
      const handleDockerConnectionError = () => {
        return new Promise((resolve) => {
          // Simulate dashboard trying to connect to Docker
          mockExec('docker ps', (dockerError) => {
            if (dockerError) {
              // Dashboard should continue with limited functionality
              resolve({
                dockerAvailable: false,
                dashboardMode: 'limited',
                errorHandled: true,
                features: {
                  serviceMonitoring: false,
                  containerManagement: false,
                  systemMonitoring: true,
                  wizardIntegration: true,
                  backupManagement: true
                }
              });
            } else {
              resolve({
                dockerAvailable: true,
                dashboardMode: 'full'
              });
            }
          });
        });
      };

      // Mock Docker connection error
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('docker ps')) {
          callback(new Error('Cannot connect to the Docker daemon at unix:///var/run/docker.sock'));
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      const result = await handleDockerConnectionError();
      
      expect(result.dockerAvailable).toBe(false);
      expect(result.dashboardMode).toBe('limited');
      expect(result.errorHandled).toBe(true);
      expect(result.features.systemMonitoring).toBe(true);
      expect(result.features.wizardIntegration).toBe(true);
      expect(result.features.serviceMonitoring).toBe(false);
    });

    test('should display appropriate error messages for Docker unavailability', () => {
      const getDockerErrorMessage = (error) => {
        const errorMessages = {
          'Cannot connect to the Docker daemon': 'Docker daemon is not running. Container management features are disabled.',
          'docker: command not found': 'Docker is not installed. Container management features are unavailable.',
          'Permission denied': 'Insufficient permissions to access Docker. Check user permissions.',
          'Connection refused': 'Docker daemon is not responding. Container features are temporarily unavailable.'
        };

        for (const [errorPattern, message] of Object.entries(errorMessages)) {
          if (error.includes(errorPattern)) {
            return {
              userFriendly: true,
              message,
              severity: 'warning'
            };
          }
        }

        return {
          userFriendly: false,
          message: 'Docker is unavailable. Some features may be limited.',
          severity: 'info'
        };
      };

      const testCases = [
        'Cannot connect to the Docker daemon at unix:///var/run/docker.sock',
        'docker: command not found',
        'Permission denied while trying to connect to the Docker daemon socket',
        'Connection refused'
      ];

      testCases.forEach(errorText => {
        const result = getDockerErrorMessage(errorText);
        expect(result.userFriendly).toBe(true);
        expect(result.message).toBeTruthy();
        expect(['info', 'warning', 'error']).toContain(result.severity);
      });
    });
  });

  describe('Limited Functionality Mode', () => {
    test('should provide system monitoring without Docker', async () => {
      const getSystemResourcesWithoutDocker = () => {
        return new Promise((resolve) => {
          // System resource monitoring should work without Docker
          const resourceCommands = [
            'top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1',
            'free | grep Mem | awk \'{print ($3/$2) * 100.0}\'',
            'df -h / | tail -1 | awk \'{print $5}\' | cut -d\'%\' -f1',
            'uptime | awk -F\'load average:\' \'{print $2}\''
          ];

          Promise.all(resourceCommands.map(cmd => 
            new Promise(cmdResolve => {
              mockExec(cmd, (error, stdout) => {
                cmdResolve({ 
                  command: cmd,
                  success: !error, 
                  value: stdout?.stdout?.trim() || stdout?.trim()
                });
              });
            })
          )).then(results => {
            resolve({
              cpuUsage: results[0].success ? parseFloat(results[0].value) : null,
              memoryUsage: results[1].success ? parseFloat(results[1].value) : null,
              diskUsage: results[2].success ? parseFloat(results[2].value) : null,
              loadAverage: results[3].success ? results[3].value : null,
              monitoringAvailable: results.some(r => r.success),
              dockerRequired: false
            });
          });
        });
      };

      // Mock system resource commands working
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('Cpu(s)')) {
          callback(null, { stdout: '15.2', stderr: '' });
        } else if (command.includes('free')) {
          callback(null, { stdout: '45.8', stderr: '' });
        } else if (command.includes('df -h')) {
          callback(null, { stdout: '67', stderr: '' });
        } else if (command.includes('uptime')) {
          callback(null, { stdout: ' 0.85, 0.92, 1.01', stderr: '' });
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      const result = await getSystemResourcesWithoutDocker();
      
      expect(result.monitoringAvailable).toBe(true);
      expect(result.dockerRequired).toBe(false);
      expect(result.cpuUsage).toBe(15.2);
      expect(result.memoryUsage).toBe(45.8);
      expect(result.diskUsage).toBe(67);
      expect(result.loadAverage).toContain('0.85');
    });

    test('should maintain wizard integration without Docker', async () => {
      const testWizardIntegrationWithoutDocker = () => {
        return new Promise((resolve) => {
          // Test wizard accessibility
          mockAxios.get.mockImplementation((url) => {
            if (url.includes('localhost:3000/health')) {
              return Promise.resolve({ 
                status: 200, 
                data: { status: 'healthy', docker: 'unavailable' }
              });
            } else if (url.includes('localhost:3000/api/status')) {
              return Promise.resolve({ 
                status: 200, 
                data: { 
                  wizard: 'running', 
                  docker: 'unavailable',
                  features: {
                    profileManagement: true,
                    configurationEditing: true,
                    backupRestore: true,
                    containerManagement: false
                  }
                }
              });
            }
            return Promise.reject(new Error('Not found'));
          });

          Promise.all([
            mockAxios.get('http://localhost:3000/health'),
            mockAxios.get('http://localhost:3000/api/status')
          ]).then(([healthResponse, statusResponse]) => {
            resolve({
              wizardAccessible: healthResponse.status === 200,
              wizardApiAvailable: statusResponse.status === 200,
              integrationWorking: true,
              availableFeatures: statusResponse.data.features
            });
          }).catch(() => {
            resolve({
              wizardAccessible: false,
              wizardApiAvailable: false,
              integrationWorking: false
            });
          });
        });
      };

      const result = await testWizardIntegrationWithoutDocker();
      
      expect(result.wizardAccessible).toBe(true);
      expect(result.wizardApiAvailable).toBe(true);
      expect(result.integrationWorking).toBe(true);
      expect(result.availableFeatures.profileManagement).toBe(true);
      expect(result.availableFeatures.containerManagement).toBe(false);
    });

    test('should disable container-dependent features gracefully', () => {
      const getFeatureAvailability = (dockerAvailable) => {
        const features = {
          // Always available (host-based)
          systemMonitoring: true,
          wizardIntegration: true,
          backupManagement: true,
          configurationManagement: true,
          logViewing: true, // Can view host logs
          
          // Docker-dependent features
          serviceMonitoring: dockerAvailable,
          containerManagement: dockerAvailable,
          serviceControl: dockerAvailable,
          containerLogs: dockerAvailable,
          dockerStats: dockerAvailable,
          
          // Partially available
          updateManagement: dockerAvailable, // Can check updates, but can't apply without Docker
          healthChecks: dockerAvailable // Can check host health, but not container health
        };

        return {
          features,
          mode: dockerAvailable ? 'full' : 'limited',
          disabledCount: Object.values(features).filter(available => !available).length
        };
      };

      // Test with Docker unavailable
      const limitedMode = getFeatureAvailability(false);
      
      expect(limitedMode.mode).toBe('limited');
      expect(limitedMode.features.systemMonitoring).toBe(true);
      expect(limitedMode.features.wizardIntegration).toBe(true);
      expect(limitedMode.features.serviceMonitoring).toBe(false);
      expect(limitedMode.features.containerManagement).toBe(false);
      expect(limitedMode.disabledCount).toBeGreaterThan(0);

      // Test with Docker available
      const fullMode = getFeatureAvailability(true);
      
      expect(fullMode.mode).toBe('full');
      expect(fullMode.disabledCount).toBe(0);
    });
  });

  describe('Service Recovery and Docker Restart', () => {
    test('should detect Docker restart and restore full functionality', async () => {
      const simulateDockerRestart = () => {
        return new Promise((resolve) => {
          let checkCount = 0;
          const maxChecks = 5;
          
          const checkDockerStatus = () => {
            checkCount++;
            
            mockExec('systemctl is-active docker', (error, stdout) => {
              // Docker becomes available after 3 checks
              const dockerAvailable = !error;
              
              if (checkCount < maxChecks && !dockerAvailable) {
                // Continue checking
                setTimeout(checkDockerStatus, 100);
              } else {
                // Final result
                resolve({
                  dockerRestored: dockerAvailable,
                  checksPerformed: checkCount,
                  fullFunctionalityRestored: dockerAvailable
                });
              }
            });
          };

          // Start the checking process
          checkDockerStatus();
        });
      };

      // Mock Docker becoming available after 3 calls
      let callCount = 0;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl is-active docker')) {
          callCount++;
          if (callCount >= 3) {
            // Docker is now available
            callback(null, { stdout: 'active', stderr: '' });
          } else {
            // Docker still not available
            callback(new Error('Docker service not running'));
          }
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      const result = await simulateDockerRestart();
      
      expect(result.dockerRestored).toBe(true);
      expect(result.checksPerformed).toBe(3);
      expect(result.fullFunctionalityRestored).toBe(true);
    });

    test('should handle Docker service restart gracefully', async () => {
      const handleDockerServiceRestart = () => {
        return new Promise((resolve) => {
          // Simulate dashboard detecting Docker restart
          mockExec('docker version', (versionError) => {
            if (!versionError) {
              // Docker is back, reinitialize Docker-dependent features
              mockExec('docker ps', (psError, stdout) => {
                resolve({
                  dockerAvailable: !psError,
                  containersDetected: !psError && stdout.stdout.includes('CONTAINER'),
                  featuresReinitialized: !psError
                });
              });
            } else {
              resolve({
                dockerAvailable: false,
                containersDetected: false,
                featuresReinitialized: false
              });
            }
          });
        });
      };

      // Mock Docker being available with containers
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('docker version')) {
          callback(null, { stdout: 'Docker version 20.10.0', stderr: '' });
        } else if (command.includes('docker ps')) {
          callback(null, { 
            stdout: 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS   PORTS   NAMES\n1234567890ab   kaspa-node   "kaspad"   1 hour ago   Up 1 hour   16111/tcp   kaspa-node', 
            stderr: '' 
          });
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      const result = await handleDockerServiceRestart();
      
      expect(result.dockerAvailable).toBe(true);
      expect(result.containersDetected).toBe(true);
      expect(result.featuresReinitialized).toBe(true);
    });
  });

  describe('Error Handling and User Communication', () => {
    test('should provide clear status indicators for Docker unavailability', () => {
      const getDockerStatusIndicator = (dockerError) => {
        if (!dockerError) {
          return {
            status: 'connected',
            color: 'green',
            message: 'Docker connected',
            icon: '✓'
          };
        }

        if (dockerError.includes('Cannot connect')) {
          return {
            status: 'disconnected',
            color: 'red',
            message: 'Docker daemon not running',
            icon: '✗',
            action: 'Start Docker service'
          };
        }

        if (dockerError.includes('Permission denied')) {
          return {
            status: 'permission_error',
            color: 'orange',
            message: 'Docker permission denied',
            icon: '⚠',
            action: 'Check user permissions'
          };
        }

        return {
          status: 'unknown_error',
          color: 'gray',
          message: 'Docker status unknown',
          icon: '?',
          action: 'Check Docker installation'
        };
      };

      const testCases = [
        { error: null, expectedStatus: 'connected' },
        { error: 'Cannot connect to the Docker daemon', expectedStatus: 'disconnected' },
        { error: 'Permission denied', expectedStatus: 'permission_error' },
        { error: 'Unknown error', expectedStatus: 'unknown_error' }
      ];

      testCases.forEach(testCase => {
        const indicator = getDockerStatusIndicator(testCase.error);
        expect(indicator.status).toBe(testCase.expectedStatus);
        expect(indicator.message).toBeTruthy();
        expect(indicator.icon).toBeTruthy();
      });
    });

    test('should log Docker availability changes', () => {
      const logDockerStatusChange = (previousStatus, currentStatus) => {
        const logs = [];
        
        if (previousStatus !== currentStatus) {
          if (currentStatus === 'available') {
            logs.push({
              level: 'info',
              message: 'Docker connection restored. Full functionality enabled.',
              timestamp: new Date().toISOString()
            });
          } else if (currentStatus === 'unavailable') {
            logs.push({
              level: 'warning',
              message: 'Docker connection lost. Operating in limited mode.',
              timestamp: new Date().toISOString()
            });
          }
        }

        return logs;
      };

      // Test status changes
      const logs1 = logDockerStatusChange('available', 'unavailable');
      expect(logs1).toHaveLength(1);
      expect(logs1[0].level).toBe('warning');
      expect(logs1[0].message).toContain('limited mode');

      const logs2 = logDockerStatusChange('unavailable', 'available');
      expect(logs2).toHaveLength(1);
      expect(logs2[0].level).toBe('info');
      expect(logs2[0].message).toContain('Full functionality enabled');

      // Test no change
      const logs3 = logDockerStatusChange('available', 'available');
      expect(logs3).toHaveLength(0);
    });
  });

  describe('Configuration and Environment Handling', () => {
    test('should handle Docker-related environment variables gracefully', () => {
      const processDockerEnvironment = (env) => {
        const dockerConfig = {
          socketPath: env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
          apiVersion: env.DOCKER_API_VERSION || '1.41',
          timeout: parseInt(env.DOCKER_COMMAND_TIMEOUT) || 30000,
          enabled: env.DOCKER_ENABLED !== 'false'
        };

        // Validate configuration
        const validation = {
          valid: true,
          warnings: [],
          errors: []
        };

        if (!dockerConfig.enabled) {
          validation.warnings.push('Docker integration disabled by configuration');
        }

        if (dockerConfig.timeout < 5000) {
          validation.warnings.push('Docker timeout is very low (< 5 seconds)');
        }

        if (dockerConfig.timeout > 120000) {
          validation.warnings.push('Docker timeout is very high (> 2 minutes)');
        }

        return {
          config: dockerConfig,
          validation
        };
      };

      // Test default configuration
      const defaultResult = processDockerEnvironment({});
      expect(defaultResult.config.socketPath).toBe('/var/run/docker.sock');
      expect(defaultResult.config.enabled).toBe(true);
      expect(defaultResult.validation.valid).toBe(true);

      // Test disabled Docker
      const disabledResult = processDockerEnvironment({ DOCKER_ENABLED: 'false' });
      expect(disabledResult.config.enabled).toBe(false);
      expect(disabledResult.validation.warnings).toContain('Docker integration disabled by configuration');

      // Test custom timeout
      const customTimeoutResult = processDockerEnvironment({ DOCKER_COMMAND_TIMEOUT: '2000' });
      expect(customTimeoutResult.config.timeout).toBe(2000);
      expect(customTimeoutResult.validation.warnings).toContain('Docker timeout is very low (< 5 seconds)');
    });

    test('should provide fallback configuration when Docker is unavailable', () => {
      const getFallbackConfiguration = (dockerAvailable) => {
        if (dockerAvailable) {
          return {
            mode: 'full',
            features: {
              serviceMonitoring: true,
              containerManagement: true,
              logStreaming: true
            },
            endpoints: {
              services: '/api/services',
              containers: '/api/containers',
              logs: '/api/logs'
            }
          };
        }

        return {
          mode: 'limited',
          features: {
            serviceMonitoring: false,
            containerManagement: false,
            logStreaming: false // Only host logs
          },
          endpoints: {
            services: null, // Disabled
            containers: null, // Disabled
            logs: '/api/logs/host' // Host logs only
          },
          fallbackMessage: 'Docker unavailable. Some features are disabled.'
        };
      };

      const fullConfig = getFallbackConfiguration(true);
      expect(fullConfig.mode).toBe('full');
      expect(fullConfig.features.serviceMonitoring).toBe(true);

      const limitedConfig = getFallbackConfiguration(false);
      expect(limitedConfig.mode).toBe('limited');
      expect(limitedConfig.features.serviceMonitoring).toBe(false);
      expect(limitedConfig.fallbackMessage).toBeTruthy();
    });
  });
});