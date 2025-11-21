const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Installation Guide Manager
 * Provides OS-specific installation guides for Docker and dependencies
 */
class InstallationGuideManager {
  constructor() {
    this.guides = this.loadInstallationGuides();
  }

  /**
   * Detect operating system and Docker type
   */
  async detectSystem() {
    const platform = os.platform();
    const release = os.release();
    
    const system = {
      platform,
      release,
      os: 'unknown',
      dockerType: 'unknown',
      distribution: null,
      version: null
    };

    // Detect OS type
    if (platform === 'darwin') {
      system.os = 'macos';
      system.dockerType = 'docker-desktop';
      
      // Get macOS version
      try {
        const { stdout } = await execAsync('sw_vers -productVersion');
        system.version = stdout.trim();
      } catch (error) {
        // Ignore error
      }
    } else if (platform === 'win32') {
      system.os = 'windows';
      system.dockerType = 'docker-desktop';
      
      // Check if WSL
      try {
        const { stdout } = await execAsync('wsl --status');
        if (stdout) {
          system.wsl = true;
        }
      } catch (error) {
        system.wsl = false;
      }
    } else if (platform === 'linux') {
      system.os = 'linux';
      system.dockerType = 'docker-engine';
      
      // Detect Linux distribution
      try {
        const { stdout } = await execAsync('cat /etc/os-release');
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('ID=')) {
            system.distribution = line.split('=')[1].replace(/"/g, '');
          }
          if (line.startsWith('VERSION_ID=')) {
            system.version = line.split('=')[1].replace(/"/g, '');
          }
        }
      } catch (error) {
        // Try alternative method
        try {
          const { stdout } = await execAsync('lsb_release -is');
          system.distribution = stdout.trim().toLowerCase();
        } catch (err) {
          // Ignore error
        }
      }
    }

    return system;
  }

  /**
   * Get installation guide for detected system
   */
  async getInstallationGuide(component = 'docker') {
    const system = await this.detectSystem();
    
    if (component === 'docker') {
      return this.getDockerGuide(system);
    } else if (component === 'docker-compose') {
      return this.getDockerComposeGuide(system);
    }
    
    return null;
  }

  /**
   * Get Docker installation guide
   */
  getDockerGuide(system) {
    const guide = {
      system,
      component: 'docker',
      title: 'How to Install Docker',
      steps: [],
      troubleshooting: [],
      links: []
    };

    if (system.os === 'macos') {
      guide.title = 'Install Docker Desktop for Mac';
      guide.steps = [
        {
          number: 1,
          title: 'Download Docker Desktop',
          description: 'Visit the Docker website and download Docker Desktop for Mac',
          details: [
            'Go to https://www.docker.com/products/docker-desktop',
            'Click "Download for Mac"',
            'Choose the version for your Mac (Intel or Apple Silicon)'
          ],
          link: 'https://www.docker.com/products/docker-desktop',
          icon: '⬇️'
        },
        {
          number: 2,
          title: 'Install Docker Desktop',
          description: 'Open the downloaded file and drag Docker to Applications',
          details: [
            'Open the Docker.dmg file',
            'Drag the Docker icon to your Applications folder',
            'Wait for the copy to complete'
          ],
          icon: '📦'
        },
        {
          number: 3,
          title: 'Start Docker Desktop',
          description: 'Launch Docker from your Applications folder',
          details: [
            'Open Applications folder',
            'Double-click Docker',
            'Accept the service agreement',
            'Wait for Docker to start (you\'ll see a whale icon in your menu bar)'
          ],
          icon: '🚀'
        },
        {
          number: 4,
          title: 'Verify Installation',
          description: 'Check that Docker is running correctly',
          details: [
            'Open Terminal',
            'Run: docker --version',
            'You should see the Docker version number'
          ],
          command: 'docker --version',
          icon: '✅'
        }
      ];
      
      guide.troubleshooting = [
        {
          issue: 'Docker Desktop won\'t start',
          solutions: [
            'Make sure you have macOS 10.15 or later',
            'Check that you have enough disk space (at least 4GB free)',
            'Try restarting your Mac',
            'Check System Preferences → Security & Privacy for any blocks'
          ]
        },
        {
          issue: 'Permission denied errors',
          solutions: [
            'Docker Desktop should handle permissions automatically',
            'If you see permission errors, try restarting Docker Desktop',
            'Make sure Docker Desktop is running (whale icon in menu bar)'
          ]
        }
      ];
      
      guide.links = [
        {
          title: 'Official Docker Desktop for Mac Documentation',
          url: 'https://docs.docker.com/desktop/install/mac-install/'
        },
        {
          title: 'Docker Desktop System Requirements',
          url: 'https://docs.docker.com/desktop/install/mac-install/#system-requirements'
        }
      ];
      
    } else if (system.os === 'windows') {
      guide.title = 'Install Docker Desktop for Windows';
      guide.steps = [
        {
          number: 1,
          title: 'Check System Requirements',
          description: 'Make sure your Windows system is ready for Docker',
          details: [
            'Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)',
            'OR Windows 11 64-bit: Home, Pro, Enterprise, or Education',
            'Enable WSL 2 feature',
            'Enable Hyper-V and Containers Windows features'
          ],
          icon: '📋'
        },
        {
          number: 2,
          title: 'Enable WSL 2',
          description: 'Windows Subsystem for Linux is required for Docker',
          details: [
            'Open PowerShell as Administrator',
            'Run: wsl --install',
            'Restart your computer when prompted',
            'After restart, set up your Linux username and password'
          ],
          command: 'wsl --install',
          icon: '🐧'
        },
        {
          number: 3,
          title: 'Download Docker Desktop',
          description: 'Get Docker Desktop from the official website',
          details: [
            'Go to https://www.docker.com/products/docker-desktop',
            'Click "Download for Windows"',
            'Save the installer file'
          ],
          link: 'https://www.docker.com/products/docker-desktop',
          icon: '⬇️'
        },
        {
          number: 4,
          title: 'Install Docker Desktop',
          description: 'Run the installer and follow the setup wizard',
          details: [
            'Double-click Docker Desktop Installer.exe',
            'Follow the installation wizard',
            'Make sure "Use WSL 2 instead of Hyper-V" is checked',
            'Click "Ok" to proceed with installation'
          ],
          icon: '📦'
        },
        {
          number: 5,
          title: 'Start Docker Desktop',
          description: 'Launch Docker and accept the agreement',
          details: [
            'Docker Desktop should start automatically',
            'If not, search for "Docker Desktop" in Start menu',
            'Accept the service agreement',
            'Wait for Docker to start (you\'ll see a whale icon in system tray)'
          ],
          icon: '🚀'
        },
        {
          number: 6,
          title: 'Verify Installation',
          description: 'Check that Docker is running correctly',
          details: [
            'Open PowerShell or Command Prompt',
            'Run: docker --version',
            'You should see the Docker version number'
          ],
          command: 'docker --version',
          icon: '✅'
        }
      ];
      
      guide.troubleshooting = [
        {
          issue: 'WSL 2 installation failed',
          solutions: [
            'Make sure Windows is up to date (Windows Update)',
            'Enable "Virtual Machine Platform" in Windows Features',
            'Run: wsl --update in PowerShell as Administrator',
            'Restart your computer and try again'
          ]
        },
        {
          issue: 'Hyper-V not available',
          solutions: [
            'Hyper-V is only available on Windows Pro, Enterprise, or Education',
            'If you have Windows Home, use WSL 2 backend (recommended)',
            'Check BIOS settings - virtualization must be enabled'
          ]
        },
        {
          issue: 'Docker Desktop won\'t start',
          solutions: [
            'Make sure WSL 2 is installed and updated',
            'Check that virtualization is enabled in BIOS',
            'Try running Docker Desktop as Administrator',
            'Check Windows Event Viewer for error details'
          ]
        },
        {
          issue: 'Permission denied errors',
          solutions: [
            'Make sure you\'re in the "docker-users" group',
            'Log out and log back in after installation',
            'Try running PowerShell/Command Prompt as Administrator'
          ]
        }
      ];
      
      guide.links = [
        {
          title: 'Official Docker Desktop for Windows Documentation',
          url: 'https://docs.docker.com/desktop/install/windows-install/'
        },
        {
          title: 'WSL 2 Installation Guide',
          url: 'https://docs.microsoft.com/en-us/windows/wsl/install'
        },
        {
          title: 'Enable Hyper-V on Windows',
          url: 'https://docs.microsoft.com/en-us/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v'
        }
      ];
      
    } else if (system.os === 'linux') {
      guide.title = 'Install Docker Engine for Linux';
      
      // Distribution-specific steps
      if (system.distribution === 'ubuntu' || system.distribution === 'debian') {
        guide.steps = [
          {
            number: 1,
            title: 'Update Package Index',
            description: 'Make sure your package list is up to date',
            details: [
              'Open Terminal',
              'Run the update command',
              'Wait for the update to complete'
            ],
            command: 'sudo apt-get update',
            icon: '🔄'
          },
          {
            number: 2,
            title: 'Install Prerequisites',
            description: 'Install required packages for Docker',
            details: [
              'Install packages to allow apt to use HTTPS',
              'This includes ca-certificates, curl, and gnupg'
            ],
            command: 'sudo apt-get install -y ca-certificates curl gnupg lsb-release',
            icon: '📦'
          },
          {
            number: 3,
            title: 'Add Docker GPG Key',
            description: 'Add Docker\'s official GPG key for package verification',
            details: [
              'Create directory for keyrings',
              'Download and add Docker\'s GPG key'
            ],
            command: 'sudo mkdir -p /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
            icon: '🔑'
          },
          {
            number: 4,
            title: 'Set Up Repository',
            description: 'Add Docker repository to your system',
            details: [
              'Add Docker repository to apt sources',
              'This allows you to install Docker from official sources'
            ],
            command: 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
            icon: '📋'
          },
          {
            number: 5,
            title: 'Install Docker Engine',
            description: 'Install Docker and related packages',
            details: [
              'Update package index again',
              'Install Docker Engine, CLI, and containerd'
            ],
            command: 'sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
            icon: '⬇️'
          },
          {
            number: 6,
            title: 'Add User to Docker Group',
            description: 'Allow running Docker without sudo',
            details: [
              'Add your user to the docker group',
              'Log out and log back in for changes to take effect',
              'This allows you to run Docker commands without sudo'
            ],
            command: 'sudo usermod -aG docker $USER',
            icon: '👤'
          },
          {
            number: 7,
            title: 'Verify Installation',
            description: 'Check that Docker is running correctly',
            details: [
              'Log out and log back in (or restart)',
              'Run docker version command',
              'You should see Docker version information'
            ],
            command: 'docker --version',
            icon: '✅'
          }
        ];
      } else if (system.distribution === 'fedora' || system.distribution === 'centos' || system.distribution === 'rhel') {
        guide.steps = [
          {
            number: 1,
            title: 'Install Prerequisites',
            description: 'Install required packages for Docker',
            details: [
              'Install dnf-plugins-core package'
            ],
            command: 'sudo dnf -y install dnf-plugins-core',
            icon: '📦'
          },
          {
            number: 2,
            title: 'Add Docker Repository',
            description: 'Add Docker\'s official repository',
            details: [
              'Add Docker CE repository to your system'
            ],
            command: 'sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo',
            icon: '📋'
          },
          {
            number: 3,
            title: 'Install Docker Engine',
            description: 'Install Docker and related packages',
            details: [
              'Install Docker Engine, CLI, and containerd'
            ],
            command: 'sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
            icon: '⬇️'
          },
          {
            number: 4,
            title: 'Start Docker Service',
            description: 'Enable and start Docker',
            details: [
              'Start Docker service',
              'Enable Docker to start on boot'
            ],
            command: 'sudo systemctl start docker && sudo systemctl enable docker',
            icon: '🚀'
          },
          {
            number: 5,
            title: 'Add User to Docker Group',
            description: 'Allow running Docker without sudo',
            details: [
              'Add your user to the docker group',
              'Log out and log back in for changes to take effect'
            ],
            command: 'sudo usermod -aG docker $USER',
            icon: '👤'
          },
          {
            number: 6,
            title: 'Verify Installation',
            description: 'Check that Docker is running correctly',
            details: [
              'Log out and log back in (or restart)',
              'Run docker version command'
            ],
            command: 'docker --version',
            icon: '✅'
          }
        ];
      } else {
        // Generic Linux instructions
        guide.steps = [
          {
            number: 1,
            title: 'Visit Docker Documentation',
            description: 'Docker installation varies by Linux distribution',
            details: [
              'Go to Docker\'s official documentation',
              'Find your specific Linux distribution',
              'Follow the distribution-specific instructions'
            ],
            link: 'https://docs.docker.com/engine/install/',
            icon: '📖'
          }
        ];
      }
      
      guide.troubleshooting = [
        {
          issue: 'Permission denied when running Docker',
          solutions: [
            'Make sure you added your user to the docker group: sudo usermod -aG docker $USER',
            'Log out and log back in for group changes to take effect',
            'Check if Docker service is running: sudo systemctl status docker',
            'If still having issues, try: sudo chmod 666 /var/run/docker.sock'
          ],
          why: 'Docker daemon runs as root by default. Adding your user to the docker group allows you to run Docker commands without sudo.'
        },
        {
          issue: 'Docker service won\'t start',
          solutions: [
            'Check service status: sudo systemctl status docker',
            'View logs: sudo journalctl -u docker',
            'Try restarting: sudo systemctl restart docker',
            'Check for port conflicts on port 2375/2376'
          ]
        },
        {
          issue: 'Cannot connect to Docker daemon',
          solutions: [
            'Make sure Docker service is running: sudo systemctl start docker',
            'Check if docker.sock exists: ls -l /var/run/docker.sock',
            'Verify Docker is installed: docker --version',
            'Try running with sudo to test: sudo docker ps'
          ]
        }
      ];
      
      guide.links = [
        {
          title: 'Official Docker Engine Installation',
          url: 'https://docs.docker.com/engine/install/'
        },
        {
          title: 'Post-Installation Steps for Linux',
          url: 'https://docs.docker.com/engine/install/linux-postinstall/'
        }
      ];
    }

    return guide;
  }

  /**
   * Get Docker Compose installation guide
   */
  getDockerComposeGuide(system) {
    const guide = {
      system,
      component: 'docker-compose',
      title: 'How to Install Docker Compose',
      steps: [],
      troubleshooting: [],
      links: []
    };

    if (system.os === 'macos' || system.os === 'windows') {
      guide.note = 'Docker Compose is included with Docker Desktop. If you have Docker Desktop installed, you already have Docker Compose!';
      guide.steps = [
        {
          number: 1,
          title: 'Verify Docker Compose',
          description: 'Check if Docker Compose is already installed',
          details: [
            'Open Terminal (Mac) or PowerShell (Windows)',
            'Run: docker compose version',
            'If you see a version number, you\'re all set!'
          ],
          command: 'docker compose version',
          icon: '✅'
        }
      ];
    } else if (system.os === 'linux') {
      guide.steps = [
        {
          number: 1,
          title: 'Check if Already Installed',
          description: 'Docker Compose plugin may already be installed',
          details: [
            'If you installed Docker using the official repository, Docker Compose plugin is included',
            'Run: docker compose version',
            'If you see a version, you\'re done!'
          ],
          command: 'docker compose version',
          icon: '✅'
        },
        {
          number: 2,
          title: 'Install Docker Compose Plugin',
          description: 'Install if not already present',
          details: [
            'Update package index',
            'Install docker-compose-plugin package'
          ],
          command: 'sudo apt-get update && sudo apt-get install -y docker-compose-plugin',
          icon: '📦'
        }
      ];
    }

    guide.links = [
      {
        title: 'Official Docker Compose Documentation',
        url: 'https://docs.docker.com/compose/install/'
      }
    ];

    return guide;
  }

  /**
   * Load all installation guides
   */
  loadInstallationGuides() {
    return {
      docker: {
        macos: 'docker-desktop',
        windows: 'docker-desktop',
        linux: 'docker-engine'
      },
      'docker-compose': {
        macos: 'included',
        windows: 'included',
        linux: 'plugin'
      }
    };
  }
}

module.exports = InstallationGuideManager;
