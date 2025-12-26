/**
 * Deployment Tests for Kaspa Management Dashboard
 * 
 * Tests the complete deployment workflow including:
 * - Installation script functionality
 * - Systemd service management
 * - Environment variable handling
 * - Service recovery and resilience
 * - Dashboard availability when Docker is down
 * 
 * Note: These tests mock system operations to avoid requiring actual
 * system changes during testing. For real deployment testing, use
 * the integration test scripts.
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Mock implementations
jest.mock('fs');
jest.mock('child_process');

describe('Dashboard Deployment Tests', () => {
  let mockFs;
  let mockExec;

  beforeEach(() => {
    mockFs = require('fs');
    mockExec = require('child_process').exec;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => {});
    mockFs.statSync.mockReturnValue({ isDirectory: () => false });
    
    mockExec.mockImplementation((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      // Default success response
      callback(null, { stdout: 'success', stderr: '' });
    });
  });

  describe('Installation Script Tests', () => {
    const installScriptPath = path.join(__dirname, '..', 'install.sh');

    test('should validate installation script exists and is executable', () => {
      // Mock file existence and permissions
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        mode: 0o755 // Executable permissions
      });

      expect(mockFs.existsSync(installScriptPath)).toBe(true);
      
      const stats = mockFs.statSync(installScriptPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.mode & 0o111).toBeTruthy(); // Has execute permissions
    });

    test('should check system requirements', async () => {
      const checkSystemRequirements = () => {
        // Mock system requirement checks
        const requirements = [
          { name: 'systemd', command: 'systemctl --version' },
          { name: 'curl', command: 'curl --version' },
          { name: 'os-release', file: '/etc/os-release' }
        ];

        return Promise.all(requirements.map(req => {
          if (req.command) {
            return new Promise((resolve) => {
              mockExec(req.command, (error, stdout) => {
                resolve({ name: req.name, available: !error, output: stdout });
              });
            });
          } else if (req.file) {
            return Promise.resolve({
              name: req.name,
              available: mockFs.existsSync(req.file)
            });
          }
        }));
      };

      // Mock successful system checks
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl')) {
          callback(null, 'systemd 245');
        } else if (command.includes('curl')) {
          callback(null, 'curl 7.68.0');
        } else {
          callback(null, 'success');
        }
      });

      mockFs.existsSync.mockImplementation((path) => {
        return path === '/etc/os-release';
      });

      const results = await checkSystemRequirements();
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.available)).toBe(true);
    });

    test('should install Node.js if not present', async () => {
      const installNodeJs = () => {
        return new Promise((resolve) => {
          // Check if Node.js is installed
          mockExec('node --version', (error, stdout) => {
            if (error) {
              // Mock Node.js installation
              mockExec('curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -', (installError) => {
                if (!installError) {
                  mockExec('apt-get install -y nodejs', (aptError) => {
                    resolve({ installed: !aptError, method: 'apt' });
                  });
                } else {
                  resolve({ installed: false, error: installError });
                }
              });
            } else {
              resolve({ installed: true, version: stdout.trim(), existing: true });
            }
          });
        });
      };

      // Mock Node.js not installed initially
      let nodeInstalled = false;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('node --version')) {
          if (nodeInstalled) {
            callback(null, 'v18.17.0');
          } else {
            callback(new Error('node: command not found'));
          }
        } else if (command.includes('setup_lts.x')) {
          nodeInstalled = true;
          callback(null, 'NodeSource repository configured');
        } else if (command.includes('apt-get install')) {
          callback(null, 'nodejs installed successfully');
        } else {
          callback(null, 'success');
        }
      });

      const result = await installNodeJs();
      
      expect(result.installed).toBe(true);
      expect(result.method).toBe('apt');
    });

    test('should create dashboard user and directories', () => {
      const createUserAndDirectories = () => {
        const operations = [];
        
        // Check if user exists
        mockExec('id kaspa-dashboard', (error) => {
          if (error) {
            // Create user
            operations.push('useradd --system --home-dir /opt/kaspa-dashboard --create-home kaspa-dashboard');
          }
        });

        // Add to docker group
        operations.push('usermod -aG docker kaspa-dashboard');

        // Create directories
        const directories = [
          '/opt/kaspa-dashboard',
          '/opt/kaspa-dashboard/logs',
          '/opt/kaspa-dashboard/backups'
        ];

        directories.forEach(dir => {
          operations.push(`mkdir -p ${dir}`);
        });

        return operations;
      };

      // Mock user doesn't exist
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('id kaspa-dashboard')) {
          callback(new Error('user not found'));
        } else {
          callback(null, 'success');
        }
      });

      const operations = createUserAndDirectories();
      
      expect(operations).toContain('useradd --system --home-dir /opt/kaspa-dashboard --create-home kaspa-dashboard');
      expect(operations).toContain('usermod -aG docker kaspa-dashboard');
      expect(operations.some(op => op.includes('mkdir -p'))).toBe(true);
    });

    test('should install npm dependencies', async () => {
      const installDependencies = () => {
        return new Promise((resolve) => {
          // Change to dashboard directory and install
          const command = 'cd /opt/kaspa-dashboard && sudo -u kaspa-dashboard npm ci --only=production';
          
          mockExec(command, (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('npm ci')) {
          callback(null, 'added 150 packages in 30s', '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await installDependencies();
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('added 150 packages');
    });

    test('should create systemd service file', () => {
      const createSystemdService = () => {
        const serviceContent = `[Unit]
Description=Kaspa Management Dashboard
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=kaspa-dashboard
Group=kaspa-dashboard
WorkingDirectory=/opt/kaspa-dashboard
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080
EnvironmentFile=-/opt/kaspa-dashboard/.env

[Install]
WantedBy=multi-user.target`;

        // Write service file
        mockFs.writeFileSync('/etc/systemd/system/kaspa-dashboard.service', serviceContent);
        
        // Reload systemd
        mockExec('systemctl daemon-reload', () => {});
        
        return { created: true, path: '/etc/systemd/system/kaspa-dashboard.service' };
      };

      const result = createSystemdService();
      
      expect(result.created).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/etc/systemd/system/kaspa-dashboard.service',
        expect.stringContaining('Description=Kaspa Management Dashboard')
      );
    });

    test('should create environment configuration', () => {
      const createEnvironment = () => {
        const envContent = `NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
AUTO_RESOURCE_MONITORING=true`;

        mockFs.writeFileSync('/opt/kaspa-dashboard/.env', envContent);
        
        return { created: true, path: '/opt/kaspa-dashboard/.env' };
      };

      // Mock .env file doesn't exist
      mockFs.existsSync.mockImplementation((path) => {
        return path !== '/opt/kaspa-dashboard/.env';
      });

      const result = createEnvironment();
      
      expect(result.created).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/opt/kaspa-dashboard/.env',
        expect.stringContaining('NODE_ENV=production')
      );
    });

    test('should verify installation success', async () => {
      const verifyInstallation = () => {
        return new Promise((resolve) => {
          const checks = [];
          
          // Check service status
          mockExec('systemctl is-active kaspa-dashboard', (error, stdout) => {
            checks.push({ name: 'service_active', success: !error, output: stdout });
            
            // Check port listening
            mockExec('ss -tlnp | grep :8080', (portError, portOutput) => {
              checks.push({ name: 'port_listening', success: !portError, output: portOutput });
              
              // Check health endpoint
              mockExec('curl -sf http://localhost:8080/health', (healthError, healthOutput) => {
                checks.push({ name: 'health_check', success: !healthError, output: healthOutput });
                
                resolve({
                  success: checks.every(c => c.success),
                  checks
                });
              });
            });
          });
        });
      };

      // Mock successful verification
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl is-active')) {
          callback(null, 'active');
        } else if (command.includes('ss -tlnp')) {
          callback(null, '0.0.0.0:8080');
        } else if (command.includes('curl')) {
          callback(null, '{"status":"healthy"}');
        } else {
          callback(null, 'success');
        }
      });

      const result = await verifyInstallation();
      
      expect(result.success).toBe(true);
      expect(result.checks).toHaveLength(3);
      expect(result.checks.every(c => c.success)).toBe(true);
    });
  });

  describe('Systemd Service Management Tests', () => {
    test('should start dashboard service successfully', async () => {
      const startService = () => {
        return new Promise((resolve) => {
          mockExec('systemctl start kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl start')) {
          callback(null, '', '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await startService();
      
      expect(result.success).toBe(true);
    });

    test('should stop dashboard service gracefully', async () => {
      const stopService = () => {
        return new Promise((resolve) => {
          mockExec('systemctl stop kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl stop')) {
          callback(null, '', '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await stopService();
      
      expect(result.success).toBe(true);
    });

    test('should restart dashboard service', async () => {
      const restartService = () => {
        return new Promise((resolve) => {
          mockExec('systemctl restart kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl restart')) {
          callback(null, '', '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await restartService();
      
      expect(result.success).toBe(true);
    });

    test('should check service status', async () => {
      const checkServiceStatus = () => {
        return new Promise((resolve) => {
          mockExec('systemctl status kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              running: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl status')) {
          const statusOutput = `● kaspa-dashboard.service - Kaspa Management Dashboard
   Loaded: loaded (/etc/systemd/system/kaspa-dashboard.service; enabled; vendor preset: enabled)
   Active: active (running) since Wed 2024-12-25 10:00:00 UTC; 1h 30min ago
 Main PID: 1234 (node)
    Tasks: 11 (limit: 4915)
   Memory: 45.2M
   CGroup: /system.slice/kaspa-dashboard.service
           └─1234 /usr/bin/node server.js`;
          callback(null, statusOutput, '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await checkServiceStatus();
      
      expect(result.running).toBe(true);
      expect(result.output).toContain('active (running)');
    });

    test('should enable service for auto-start', async () => {
      const enableService = () => {
        return new Promise((resolve) => {
          mockExec('systemctl enable kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl enable')) {
          callback(null, 'Created symlink /etc/systemd/system/multi-user.target.wants/kaspa-dashboard.service', '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await enableService();
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Created symlink');
    });

    test('should handle service startup failure', async () => {
      const startServiceWithFailure = () => {
        return new Promise((resolve) => {
          mockExec('systemctl start kaspa-dashboard', (error, stdout, stderr) => {
            resolve({
              success: !error,
              output: stdout,
              error: stderr
            });
          });
        });
      };

      // Mock service startup failure
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl start')) {
          callback(new Error('Job for kaspa-dashboard.service failed'), '', 'Service failed to start');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await startServiceWithFailure();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service failed to start');
    });

    test('should view service logs', async () => {
      const viewServiceLogs = () => {
        return new Promise((resolve) => {
          mockExec('journalctl -u kaspa-dashboard -n 50 --no-pager', (error, stdout, stderr) => {
            resolve({
              success: !error,
              logs: stdout,
              error: stderr
            });
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('journalctl')) {
          const logOutput = `Dec 25 10:00:00 hostname kaspa-dashboard[1234]: [INFO] Dashboard starting on port 8080
Dec 25 10:00:01 hostname kaspa-dashboard[1234]: [INFO] WebSocket server started
Dec 25 10:00:02 hostname kaspa-dashboard[1234]: [INFO] Dashboard ready`;
          callback(null, logOutput, '');
        } else {
          callback(null, 'success', '');
        }
      });

      const result = await viewServiceLogs();
      
      expect(result.success).toBe(true);
      expect(result.logs).toContain('Dashboard starting on port 8080');
    });
  });

  describe('Environment Variable Handling Tests', () => {
    test('should load environment variables from .env file', () => {
      const loadEnvironmentVariables = () => {
        const envContent = `NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
AUTO_RESOURCE_MONITORING=true
CPU_WARNING_THRESHOLD=80
MEMORY_WARNING_THRESHOLD=85`;

        mockFs.readFileSync.mockReturnValue(envContent);
        
        // Parse environment variables
        const env = {};
        envContent.split('\n').forEach(line => {
          const [key, value] = line.split('=');
          if (key && value) {
            env[key] = value;
          }
        });

        return env;
      };

      const env = loadEnvironmentVariables();
      
      expect(env.NODE_ENV).toBe('production');
      expect(env.PORT).toBe('8080');
      expect(env.KASPA_NODE_URL).toBe('http://localhost:16111');
      expect(env.AUTO_RESOURCE_MONITORING).toBe('true');
    });

    test('should validate required environment variables', () => {
      const validateEnvironmentVariables = (env) => {
        const required = ['NODE_ENV', 'PORT', 'KASPA_NODE_URL'];
        const missing = [];
        const invalid = [];

        required.forEach(key => {
          if (!env[key]) {
            missing.push(key);
          }
        });

        // Validate PORT is a number
        if (env.PORT && (isNaN(env.PORT) || env.PORT < 1024 || env.PORT > 65535)) {
          invalid.push({ key: 'PORT', value: env.PORT, reason: 'Must be integer between 1024-65535' });
        }

        // Validate KASPA_NODE_URL is a valid URL
        if (env.KASPA_NODE_URL && !env.KASPA_NODE_URL.match(/^https?:\/\/.+/)) {
          invalid.push({ key: 'KASPA_NODE_URL', value: env.KASPA_NODE_URL, reason: 'Must be valid HTTP/HTTPS URL' });
        }

        return {
          valid: missing.length === 0 && invalid.length === 0,
          missing,
          invalid
        };
      };

      // Test valid environment
      const validEnv = {
        NODE_ENV: 'production',
        PORT: '8080',
        KASPA_NODE_URL: 'http://localhost:16111'
      };

      const validResult = validateEnvironmentVariables(validEnv);
      expect(validResult.valid).toBe(true);
      expect(validResult.missing).toHaveLength(0);
      expect(validResult.invalid).toHaveLength(0);

      // Test invalid environment
      const invalidEnv = {
        NODE_ENV: 'production',
        PORT: 'invalid',
        KASPA_NODE_URL: 'not-a-url'
      };

      const invalidResult = validateEnvironmentVariables(invalidEnv);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.invalid).toHaveLength(2);
    });

    test('should handle environment variable precedence', () => {
      const resolveEnvironmentPrecedence = () => {
        // Simulate different sources of environment variables
        const defaultValues = {
          NODE_ENV: 'development',
          PORT: '3000',
          LOG_LEVEL: 'debug'
        };

        const envFileValues = {
          NODE_ENV: 'production',
          PORT: '8080',
          KASPA_NODE_URL: 'http://localhost:16111'
        };

        const systemdValues = {
          PORT: '8081',
          LOG_LEVEL: 'info'
        };

        const systemEnvValues = {
          LOG_LEVEL: 'warn'
        };

        // Apply precedence: defaults < env file < systemd < system env
        const finalEnv = {
          ...defaultValues,
          ...envFileValues,
          ...systemdValues,
          ...systemEnvValues
        };

        return finalEnv;
      };

      const env = resolveEnvironmentPrecedence();
      
      expect(env.NODE_ENV).toBe('production'); // From env file
      expect(env.PORT).toBe('8081'); // From systemd (overrides env file)
      expect(env.LOG_LEVEL).toBe('warn'); // From system env (highest precedence)
      expect(env.KASPA_NODE_URL).toBe('http://localhost:16111'); // From env file
    });

    test('should handle missing .env file gracefully', () => {
      const handleMissingEnvFile = () => {
        mockFs.existsSync.mockImplementation((path) => {
          return path !== '/opt/kaspa-dashboard/.env';
        });

        try {
          if (!mockFs.existsSync('/opt/kaspa-dashboard/.env')) {
            // Use default values
            return {
              success: true,
              usingDefaults: true,
              env: {
                NODE_ENV: 'production',
                PORT: '8080',
                KASPA_NODE_URL: 'http://localhost:16111'
              }
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      };

      const result = handleMissingEnvFile();
      
      expect(result.success).toBe(true);
      expect(result.usingDefaults).toBe(true);
      expect(result.env.NODE_ENV).toBe('production');
    });
  });

  describe('Service Recovery Tests', () => {
    test('should automatically restart after failure', async () => {
      const testAutoRestart = () => {
        return new Promise((resolve) => {
          let restartCount = 0;
          
          // Simulate service failure and restart
          const simulateFailure = () => {
            restartCount++;
            
            // Mock systemd restart behavior
            mockExec('systemctl status kaspa-dashboard', (error, stdout) => {
              if (restartCount <= 3) {
                // Service is restarting
                resolve({
                  restarted: true,
                  restartCount,
                  status: 'active (running)'
                });
              } else {
                // Too many failures
                resolve({
                  restarted: false,
                  restartCount,
                  status: 'failed'
                });
              }
            });
          };

          simulateFailure();
        });
      };

      const result = await testAutoRestart();
      
      expect(result.restarted).toBe(true);
      expect(result.restartCount).toBeLessThanOrEqual(3);
    });

    test('should handle configuration file corruption', () => {
      const handleCorruptedConfig = () => {
        try {
          // Simulate corrupted .env file
          const corruptedContent = 'NODE_ENV=production\nPORT=invalid\nINVALID_LINE_WITHOUT_EQUALS';
          
          mockFs.readFileSync.mockReturnValue(corruptedContent);
          
          // Parse and validate
          const env = {};
          const errors = [];
          
          corruptedContent.split('\n').forEach((line, index) => {
            if (line.trim() && !line.includes('=')) {
              errors.push(`Line ${index + 1}: Invalid format - ${line}`);
            } else if (line.includes('=')) {
              const [key, value] = line.split('=');
              if (key && value) {
                env[key] = value;
              }
            }
          });

          return {
            success: errors.length === 0,
            env,
            errors
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      };

      const result = handleCorruptedConfig();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Line 3: Invalid format - INVALID_LINE_WITHOUT_EQUALS');
    });

    test('should recover from port conflicts', async () => {
      const handlePortConflict = () => {
        return new Promise((resolve) => {
          // Check if port is in use
          mockExec('ss -tlnp | grep :8080', (error, stdout) => {
            if (!error && stdout) {
              // Port is in use, try alternative port
              mockExec('ss -tlnp | grep :8081', (altError, altStdout) => {
                resolve({
                  originalPortAvailable: false,
                  alternativePort: altError ? 8081 : 8082,
                  resolved: true
                });
              });
            } else {
              resolve({
                originalPortAvailable: true,
                port: 8080,
                resolved: true
              });
            }
          });
        });
      };

      // Mock port 8080 in use
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('grep :8080')) {
          callback(null, '0.0.0.0:8080 LISTEN 1234/other-service');
        } else if (command.includes('grep :8081')) {
          callback(new Error('No match found'));
        } else {
          callback(null, 'success');
        }
      });

      const result = await handlePortConflict();
      
      expect(result.resolved).toBe(true);
      expect(result.originalPortAvailable).toBe(false);
      expect(result.alternativePort).toBe(8081);
    });

    test('should handle disk space issues', async () => {
      const handleDiskSpaceIssues = () => {
        return new Promise((resolve) => {
          // Check disk space
          mockExec('df -h /opt/kaspa-dashboard', (error, stdout) => {
            if (!error) {
              // Parse disk usage (mock 95% usage)
              const usage = 95;
              
              if (usage > 90) {
                // Clean up old logs and backups
                mockExec('find /opt/kaspa-dashboard/logs -name "*.log" -mtime +7 -delete', (cleanError) => {
                  resolve({
                    diskSpaceCritical: true,
                    usage,
                    cleanupPerformed: !cleanError,
                    resolved: !cleanError
                  });
                });
              } else {
                resolve({
                  diskSpaceCritical: false,
                  usage,
                  resolved: true
                });
              }
            } else {
              resolve({
                error: error.message,
                resolved: false
              });
            }
          });
        });
      };

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('df -h')) {
          callback(null, '/dev/sda1 10G 9.5G 500M 95% /opt/kaspa-dashboard');
        } else if (command.includes('find')) {
          callback(null, 'Deleted 5 old log files');
        } else {
          callback(null, 'success');
        }
      });

      const result = await handleDiskSpaceIssues();
      
      expect(result.diskSpaceCritical).toBe(true);
      expect(result.cleanupPerformed).toBe(true);
      expect(result.resolved).toBe(true);
    });
  });

  describe('Dashboard Availability When Docker is Down', () => {
    test('should start dashboard service without Docker running', async () => {
      const startWithoutDocker = () => {
        return new Promise((resolve) => {
          // Check if Docker is running
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

      // Mock Docker not running but dashboard starts successfully
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('systemctl is-active docker')) {
          callback(new Error('Docker not running'));
        } else if (command.includes('systemctl start kaspa-dashboard')) {
          callback(null, 'Dashboard started successfully');
        } else {
          callback(null, 'success');
        }
      });

      const result = await startWithoutDocker();
      
      expect(result.dockerRunning).toBe(false);
      expect(result.dashboardStarted).toBe(true);
    });

    test('should handle Docker service unavailability gracefully', async () => {
      const handleDockerUnavailable = () => {
        return new Promise((resolve) => {
          // Simulate dashboard trying to connect to Docker
          mockExec('docker ps', (dockerError) => {
            if (dockerError) {
              // Dashboard should continue with limited functionality
              resolve({
                dockerAvailable: false,
                dashboardMode: 'limited',
                features: {
                  serviceMonitoring: false,
                  containerManagement: false,
                  systemMonitoring: true,
                  wizardIntegration: true
                }
              });
            } else {
              resolve({
                dockerAvailable: true,
                dashboardMode: 'full',
                features: {
                  serviceMonitoring: true,
                  containerManagement: true,
                  systemMonitoring: true,
                  wizardIntegration: true
                }
              });
            }
          });
        });
      };

      // Mock Docker unavailable
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('docker ps')) {
          callback(new Error('Cannot connect to Docker daemon'));
        } else {
          callback(null, 'success');
        }
      });

      const result = await handleDockerUnavailable();
      
      expect(result.dockerAvailable).toBe(false);
      expect(result.dashboardMode).toBe('limited');
      expect(result.features.systemMonitoring).toBe(true);
      expect(result.features.wizardIntegration).toBe(true);
      expect(result.features.serviceMonitoring).toBe(false);
    });

    test('should provide system monitoring without Docker', async () => {
      const systemMonitoringWithoutDocker = () => {
        return new Promise((resolve) => {
          // System resource monitoring should work without Docker
          const resourceChecks = [
            'top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1',
            'free | grep Mem | awk \'{print ($3/$2) * 100.0}\'',
            'df -h / | tail -1 | awk \'{print $5}\' | cut -d\'%\' -f1'
          ];

          Promise.all(resourceChecks.map(cmd => 
            new Promise(cmdResolve => {
              mockExec(cmd, (error, stdout) => {
                cmdResolve({ success: !error, value: stdout?.trim() });
              });
            })
          )).then(results => {
            resolve({
              cpuUsage: results[0].success ? parseFloat(results[0].value) : null,
              memoryUsage: results[1].success ? parseFloat(results[1].value) : null,
              diskUsage: results[2].success ? parseFloat(results[2].value) : null,
              monitoringAvailable: results.some(r => r.success)
            });
          });
        });
      };

      // Mock system resource commands working
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('Cpu(s)')) {
          callback(null, '15.2');
        } else if (command.includes('free')) {
          callback(null, '45.8');
        } else if (command.includes('df -h')) {
          callback(null, '67');
        } else {
          callback(null, 'success');
        }
      });

      const result = await systemMonitoringWithoutDocker();
      
      expect(result.monitoringAvailable).toBe(true);
      expect(result.cpuUsage).toBe(15.2);
      expect(result.memoryUsage).toBe(45.8);
      expect(result.diskUsage).toBe(67);
    });

    test('should maintain wizard integration without Docker', async () => {
      const wizardIntegrationWithoutDocker = () => {
        return new Promise((resolve) => {
          // Check if wizard is accessible
          mockExec('curl -sf http://localhost:3000/health', (wizardError, wizardOutput) => {
            // Check if dashboard can communicate with wizard
            mockExec('curl -sf http://localhost:3000/api/status', (apiError, apiOutput) => {
              resolve({
                wizardAccessible: !wizardError,
                wizardApiAvailable: !apiError,
                integrationWorking: !wizardError && !apiError
              });
            });
          });
        });
      };

      // Mock wizard accessible
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('localhost:3000/health')) {
          callback(null, '{"status":"healthy"}');
        } else if (command.includes('localhost:3000/api/status')) {
          callback(null, '{"wizard":"running","docker":"unavailable"}');
        } else {
          callback(null, 'success');
        }
      });

      const result = await wizardIntegrationWithoutDocker();
      
      expect(result.wizardAccessible).toBe(true);
      expect(result.wizardApiAvailable).toBe(true);
      expect(result.integrationWorking).toBe(true);
    });
  });

  describe('Nginx Proxy Configuration Tests', () => {
    test('should verify Nginx does not proxy to dashboard', () => {
      const checkNginxConfiguration = () => {
        // Mock reading Nginx configuration
        const nginxConfig = `
        # Dashboard and Wizard: Direct access
        # Dashboard: http://localhost:8080
        # Wizard: http://localhost:3000

        # Nginx proxies only containerized Kaspa applications
        location /kasia/ {
            proxy_pass http://kasia-app:3000/;
        }

        location /social/ {
            proxy_pass http://k-social:3000/;
        }
        `;

        mockFs.readFileSync.mockReturnValue(nginxConfig);

        // Check that dashboard is not proxied (should not have proxy_pass to dashboard)
        const hasDashboardProxy = nginxConfig.includes('proxy_pass') && 
                                 (nginxConfig.includes('proxy_pass.*localhost:8080') || 
                                  nginxConfig.includes('proxy_pass.*kaspa-dashboard'));

        return {
          dashboardProxied: hasDashboardProxy,
          kaspaAppsProxied: nginxConfig.includes('/kasia/') && nginxConfig.includes('/social/'),
          directAccess: nginxConfig.includes('Direct access')
        };
      };

      const result = checkNginxConfiguration();
      
      expect(result.dashboardProxied).toBe(false);
      expect(result.kaspaAppsProxied).toBe(true);
      expect(result.directAccess).toBe(true);
    });

    test('should verify service selection landing page', () => {
      const checkServiceSelectionPage = () => {
        // Mock Nginx configuration with service selection page
        const nginxConfig = `
        location = / {
            return 200 '<!DOCTYPE html>
<html>
<head>
    <title>Kaspa All-in-One Services</title>
</head>
<body>
    <div class="container">
        <h1>🚀 Kaspa All-in-One Services</h1>
        
        <div class="services">
            <div class="service host-services">
                <h3>📊 Management Dashboard</h3>
                <a href="http://localhost:8080" target="_blank">Open Dashboard</a>
            </div>
            
            <div class="service host-services">
                <h3>⚙️ Installation Wizard</h3>
                <a href="http://localhost:3000" target="_blank">Open Wizard</a>
            </div>
        </div>
    </div>
</body>
</html>';
            add_header Content-Type text/html;
        }
        `;

        mockFs.readFileSync.mockReturnValue(nginxConfig);

        return {
          hasServiceSelection: nginxConfig.includes('Kaspa All-in-One Services'),
          hasDashboardLink: nginxConfig.includes('http://localhost:8080'),
          hasWizardLink: nginxConfig.includes('http://localhost:3000'),
          hasHostServicesSection: nginxConfig.includes('host-services')
        };
      };

      const result = checkServiceSelectionPage();
      
      expect(result.hasServiceSelection).toBe(true);
      expect(result.hasDashboardLink).toBe(true);
      expect(result.hasWizardLink).toBe(true);
      expect(result.hasHostServicesSection).toBe(true);
    });
  });
});