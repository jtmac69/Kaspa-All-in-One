# Kaspa All-in-One

A comprehensive Docker-based solution for running a complete Kaspa blockchain ecosystem. This package provides everything needed to run a full Kaspa node with mining capabilities, messaging, social features, and blockchain indexing - all with an intuitive web-based installation wizard.

## ✨ What's New

- **🎯 Template-First Installation** - Choose from pre-configured templates (Home Node, Public Node, etc.) or build custom setups
- **🔍 Smart Resource Detection** - Automatic hardware analysis and template recommendations
- **🛡️ Safety System** - Built-in warnings, confirmations, and automatic backups
- **🚑 Auto-Remediation** - Automatic fixes for common installation issues
- **📊 Diagnostic Tools** - Comprehensive system diagnostics and help system
- **🌐 Multi-OS Support** - Ubuntu, Debian, CentOS, macOS, and Windows (WSL2)
- **📱 Management Dashboard** - Host-based service monitoring and management interface

## 🚀 Architecture Overview

### Two-Tier Configuration System

Kaspa All-in-One uses a flexible two-tier system:

1. **Profiles** (Low-Level) - Docker Compose service groupings that define which services run together
2. **Templates** (High-Level) - User-facing configurations that bundle profiles with pre-configured values

```
┌─────────────────────────────────────────────────────────────┐
│ TEMPLATES (User-Facing)                                     │
│ quick-start │ kaspa-node │ kasia-suite │ solo-miner │ ...  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ PROFILES (Docker Compose)                                   │
│ kaspa-node │ kasia-app │ kasia-indexer │ kaspa-stratum │... │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICES (Containers)                                       │
│ kaspa-node │ kasia-app │ timescaledb │ nginx │ dashboard   │
└─────────────────────────────────────────────────────────────┘
```

### 8 Deployment Profiles

#### Core Profiles
| Profile | Description | Services | Min RAM |
|---------|-------------|----------|---------|
| `kaspa-node` | Standard pruning Kaspa node | kaspa-node | 4GB |
| `kaspa-archive-node` | Full history archive node | kaspa-node (archive mode) | 16GB |

#### Application Profiles
| Profile | Description | Services | Min RAM |
|---------|-------------|----------|---------|
| `kasia-app` | Kasia messaging application | kasia-app | 2GB |
| `k-social-app` | K-Social platform | k-social-app | 2GB |

#### Indexer Profiles
| Profile | Description | Services | Min RAM |
|---------|-------------|----------|---------|
| `kasia-indexer` | Kasia message indexer | kasia-indexer, TimescaleDB | 4GB |
| `k-indexer-bundle` | K-Social indexer bundle | k-indexer, TimescaleDB | 4GB |
| `kaspa-explorer-bundle` | Blockchain explorer | simply-kaspa-indexer, kaspa-explorer, TimescaleDB | 8GB |

#### Mining Profile
| Profile | Description | Services | Min RAM |
|---------|-------------|----------|---------|
| `kaspa-stratum` | Solo mining stratum bridge | kaspa-stratum | 2GB |

**Profile Dependencies:**
- `kasia-indexer` requires `kasia-app`
- `k-indexer-bundle` requires `k-social-app`
- `kaspa-stratum` requires `kaspa-node` OR `kaspa-archive-node`
- `kaspa-node` conflicts with `kaspa-archive-node` (choose one)

### 12 Installation Templates

The wizard offers 12 pre-configured templates for common use cases:

#### Beginner Templates
| Template | Profiles Included | Use Case | Min RAM |
|----------|-------------------|----------|---------|
| `quick-start` | kasia-app, k-social-app | Try Kaspa apps without running a node | 2GB |
| `kaspa-node` | kaspa-node | Run your own Kaspa node | 4GB |

#### Intermediate Templates
| Template | Profiles Included | Use Case | Min RAM |
|----------|-------------------|----------|---------|
| `kasia-suite` | kaspa-node, kasia-app, kasia-indexer | Full Kasia messaging stack | 8GB |
| `k-social-suite` | kaspa-node, k-social-app, k-indexer-bundle | Full K-Social platform | 8GB |
| `kaspa-explorer` | kaspa-node, kaspa-explorer-bundle | Run a blockchain explorer | 12GB |

#### Advanced Templates
| Template | Profiles Included | Use Case | Min RAM |
|----------|-------------------|----------|---------|
| `kaspa-sovereignty` | All profiles | Complete Kaspa infrastructure | 32GB+ |
| `solo-miner` | kaspa-node, kaspa-stratum | Solo mining setup | 6GB |
| `archive-historian` | kaspa-archive-node | Full blockchain history | 16GB |
| `pool-operator` | kaspa-node, kaspa-stratum (pool mode) | Mining pool operation | 8GB |
| `public-infrastructure` | kaspa-archive-node, kaspa-explorer-bundle | Public service provider | 24GB |
| `developer` | kaspa-node + dev tools | Development environment | 8GB |
| `custom-setup` | User-selected | Build your own configuration | Varies |

### Core Infrastructure (Always Active)
- **Management Dashboard** - Host-based web interface for service monitoring and management
- **Nginx Reverse Proxy** - Load balancing, SSL termination, and security headers (when containerized apps are enabled)

## 💻 Hardware Requirements

The installation wizard automatically detects your hardware and recommends the best profile for your system.

### Minimum Requirements (Beginner Templates)
- **CPU**: 2+ cores
- **RAM**: 2-4GB (depending on template)
- **Storage**: 100GB available
- **Network**: Stable internet connection
- **Disk Type**: HDD acceptable (SSD recommended)

**Best for**: `quick-start`, `kaspa-node` templates

### Recommended Configuration (Intermediate Templates)
- **CPU**: 4+ cores
- **RAM**: 8-12GB
- **Storage**: 250GB available (SSD recommended)
- **Network**: 100Mbps+ internet
- **Disk Type**: SSD strongly recommended

**Best for**: `kasia-suite`, `k-social-suite`, `kaspa-explorer` templates

### Optimal Configuration (Advanced Templates)
- **CPU**: 8+ cores
- **RAM**: 16-24GB
- **Storage**: 500GB+ available (NVMe SSD recommended)
- **Network**: Gigabit ethernet
- **Disk Type**: NVMe SSD for best performance

**Best for**: `archive-historian`, `public-infrastructure`, `pool-operator` templates

### High-End Configuration (Sovereignty Template)
- **CPU**: 8+ cores (16+ threads)
- **RAM**: 32GB+
- **Storage**: 1TB+ available (NVMe SSD required)
- **Network**: Gigabit ethernet
- **Disk Type**: NVMe SSD required

**Best for**: `kaspa-sovereignty` template (all services)

### Example Hardware

**Budget Option (~$300-400)**
- Mini PC: Beelink SER5 5560U
- CPU: AMD Ryzen 5 5560U (6 cores)
- RAM: 16GB DDR4
- Storage: 500GB NVMe SSD
- **Best for**: Intermediate templates (`kasia-suite`, `k-social-suite`, `kaspa-explorer`)

**Recommended Option (~$400-500)**
- Mini PC: Beelink SER7 7735HS
- CPU: AMD Ryzen 7 7735HS (8 cores, 16 threads)
- RAM: 32GB DDR5
- Storage: 1TB NVMe SSD
- **Best for**: Advanced templates (`archive-historian`, `public-infrastructure`, `kaspa-sovereignty`)

**Note**: The installation wizard will analyze your hardware and provide specific template recommendations with compatibility ratings (Optimal, Recommended, Possible, Not Recommended).

## 🐧 Supported Operating Systems

### Primary Support
- **Ubuntu 22.04 LTS / 24.04 LTS** (Recommended)
- **Debian 12** (Bookworm)
- **CentOS Stream 9**

### Secondary Support
- **macOS** (Intel and Apple Silicon)
- **Windows 10/11** (via WSL2)
- **Other Linux distributions** with Docker support

The installation wizard automatically detects your OS and provides tailored installation guides.

## ⚡ Quick Start

### 🎯 Recommended: Web Installation Wizard

The easiest way to get started - an interactive web-based installer that guides you through the entire process:

```bash
# Clone the repository
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd KaspaAllInOne

# Start the installation wizard
docker compose --profile wizard up -d

# Open your browser to http://localhost:3000
```

The wizard will:
- ✅ Check your system requirements automatically
- ✅ Recommend the best profile for your hardware
- ✅ Guide you through configuration step-by-step
- ✅ Show real-time installation progress
- ✅ Verify everything works correctly
- ✅ Provide troubleshooting help if needed

**Perfect for:** First-time users, non-technical users, anyone who wants a guided experience

### 🚀 Alternative: One-Line Installation

For experienced users who prefer command-line installation:

```bash
curl -fsSL https://raw.githubusercontent.com/jtmac69/Kaspa-All-in-One/main/install.sh | bash
```

This will:
- Check system requirements
- Install Docker and Docker Compose if needed
- Guide you through profile selection
- Configure and start services

### 🛠️ Advanced: Manual Installation

For developers and advanced users:

```bash
# Clone the repository
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd KaspaAllInOne

# Copy and edit configuration
cp .env.example .env
nano .env

# Start services with desired profiles
docker compose --profile core --profile prod up -d

# Check status
docker compose ps
```

### 📋 Pre-Installation Checklist

Before installing, ensure you have:
- ✅ **Docker 24.0+** and **Docker Compose 2.0+** installed
- ✅ **User added to docker group** (required for wizard and management)
  ```bash
  sudo usermod -aG docker $USER
  # Log out and back in for changes to take effect
  ```
- ✅ **4GB+ RAM** (8GB+ recommended)
- ✅ **100GB+ free disk space** (500GB+ for full node)
- ✅ **Stable internet connection**
- ✅ **Open ports** (or ability to configure alternatives)

The installation wizard will check all of these for you automatically!

## 🎛️ Management

### Template-Based Deployment
The system uses templates for easier deployment. Choose from 12 pre-configured templates or create custom setups:

```bash
# Deploy using templates (recommended)
./scripts/manage.sh start --template quick-start        # Beginner: Apps only
./scripts/manage.sh start --template kaspa-node         # Beginner: Node only
./scripts/manage.sh start --template kasia-suite        # Intermediate: Full Kasia
./scripts/manage.sh start --template k-social-suite     # Intermediate: Full K-Social
./scripts/manage.sh start --template kaspa-explorer     # Intermediate: Explorer
./scripts/manage.sh start --template solo-miner         # Advanced: Mining
./scripts/manage.sh start --template archive-historian  # Advanced: Archive node
./scripts/manage.sh start --template public-infrastructure  # Advanced: Public services
./scripts/manage.sh start --template kaspa-sovereignty  # Advanced: Everything

# Legacy profile-based deployment (still supported)
./scripts/manage.sh start -p kaspa-node -p kasia-app    # Multiple profiles
```

### Management Commands
```bash
# Template management
./scripts/manage.sh templates                     # List available templates
./scripts/manage.sh start --template home-node   # Deploy template
./scripts/manage.sh status --template explorer   # Check template services
./scripts/manage.sh logs --template public-node  # View template logs

# Service management
./scripts/manage.sh start kaspa-node             # Start specific service
./scripts/manage.sh health                       # Run comprehensive health check
./scripts/manage.sh backup                       # Create data backup
./scripts/manage.sh update                       # Update all services
```

### Web Interfaces

#### Installation Wizard
Access at: `http://localhost:3000` (when wizard profile is active)

Features:
- 🎯 Template-first guided installation
- 📊 Real-time system requirements checking
- 🔍 Smart template recommendations based on hardware
- ⚙️ Visual template selection with compatibility ratings
- 📈 Live installation progress tracking
- ✅ Post-installation verification and service health checks
- 🆘 Built-in help system and troubleshooting guides

#### Management Dashboard
Access at: `http://localhost:8080` (host-based service)

Features:
- 📊 Real-time service monitoring across all templates
- 🌐 Kaspa network statistics and node status
- 💻 System resource usage and performance metrics
- 🎛️ Template-specific service controls and logs
- 🔌 Public node accessibility status
- 🔄 Service restart and reconfiguration
- 🚀 Integration with Installation Wizard for easy reconfiguration

## 🎯 Installation Wizard Features

The web-based installation wizard makes setup easy for everyone, from beginners to experts, with a template-first approach that simplifies configuration.

### Template-First Setup
- **Pre-Configured Templates**: Choose from Home Node, Public Node, Explorer, or Mining templates
- **Smart Recommendations**: Wizard analyzes your hardware and suggests the best template
- **Custom Setup Option**: Advanced users can select individual services à la carte
- **One-Click Application**: Templates automatically configure all necessary services

### Smart System Detection
- **Automatic Hardware Analysis**: Detects CPU, RAM, disk space, and disk type
- **OS Detection**: Identifies your operating system and provides tailored instructions
- **Template Compatibility**: Shows which templates will work best on your system
- **Resource Warnings**: Alerts you to potential performance issues

### Guided Installation Process

**Step 1: Pre-Installation Checklist**
- System requirements verification
- Docker installation status
- Port availability checking
- "Help Me Choose" quiz for template selection

**Step 2: System Check**
- Docker and Docker Compose verification
- Resource availability confirmation
- Network connectivity testing
- Automatic issue detection

**Step 3: Template Selection**
- Visual template cards with descriptions and requirements
- Hardware compatibility indicators for each template
- "Build Custom" option for advanced users
- Template preview showing included services

**Step 4: Configuration**
- Template-specific configuration options
- Smart defaults based on your template and system
- Visual configuration forms with real-time validation
- External IP detection and secure password generation

**Step 5: Review**
- Template and configuration summary
- Service overview with resource estimates
- Estimated installation time
- Final confirmation before installation

**Step 6: Installation**
- Real-time progress tracking with template-specific phases
- Phase-by-phase updates showing service deployment
- Detailed status messages and error handling
- WebSocket-based live updates

**Step 7: Completion**
- Installation verification and service health checks
- Template-specific post-installation tour
- Quick start guide for your chosen template
- Direct access links to all deployed services

### Built-In Help System

**Search Common Issues**
- Searchable database of 10+ common problems
- Step-by-step solutions
- Category browsing (Docker, Network, Resources, Permissions)
- Keyword-based search

**Diagnostic Reports**
- One-click system diagnostic generation
- Automatic sensitive data redaction
- Copy to clipboard or download
- Include in support requests

**Community Resources**
- Direct links to Discord, GitHub, Forum
- Pre-filled GitHub issue creation
- Complete documentation access

### Safety Features

**Smart Warnings**
- Resource warnings (4 risk levels)
- Breaking change detection
- Configuration validation
- Port conflict detection

**Automatic Backups**
- Configuration backup before changes
- One-click restore functionality
- Backup history tracking

**Error Recovery**
- Automatic error detection
- Auto-remediation for common issues
- Retry with exponential backoff
- Safe mode fallback

**Confirmation Dialogs**
- "Are you sure?" for critical actions
- Progressive disclosure of risks
- Required acknowledgment checkboxes
- Color-coded warning levels

### Installation Guides

**OS-Specific Instructions**
- macOS: Docker Desktop installation (4 steps)
- Windows: WSL2 + Docker Desktop (6 steps)
- Linux: Distribution-specific commands (Ubuntu, Debian, Fedora, CentOS)
- One-click command copying
- Troubleshooting for each OS

### Accessibility Features

- **Plain Language**: 8th grade reading level throughout
- **Visual Indicators**: Icons, colors, and progress bars
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Dark Mode**: Automatic theme switching
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: Semantic HTML and ARIA labels

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and customize:

```bash
# Mining Configuration
ENABLE_MINING=false
MINING_ADDRESS=solo

# Network Configuration
PUBLIC_NODE=true
KASPA_NODE_RPC_PORT=16111

# Service Ports
DASHBOARD_PORT=8080
KASIA_APP_PORT=3001
KSOCIAL_APP_PORT=3003
```

### Profile-Based Configuration
Configure services based on your deployment needs:

```bash
# Production applications
ENABLE_PROD_PROFILE=true
KASIA_APP_PORT=3001
KSOCIAL_APP_PORT=3003

# Data indexing services
ENABLE_EXPLORER_PROFILE=true
KASIA_INDEXER_PORT=3002
KSOCIAL_INDEXER_PORT=3004
SIMPLY_INDEXER_PORT=3005

# Mining operations
ENABLE_MINING_PROFILE=true
STRATUM_PORT=5555

# Development tools
ENABLE_DEVELOPMENT_PROFILE=true
PORTAINER_PORT=9000
PGADMIN_PORT=9001
```

### Distributed Deployment
For multi-machine setups, configure remote connections:

```bash
# Point applications to remote indexers
REMOTE_KASIA_INDEXER_URL=http://192.168.1.101:3002
REMOTE_KSOCIAL_INDEXER_URL=http://192.168.1.101:3004

# Point indexers to remote node
REMOTE_KASPA_NODE_URL=http://192.168.1.100:16111
```

## 📊 Monitoring & Health Checks

### Automated Health Checks
```bash
# Basic health check
./scripts/health-check.sh

# Verbose output
./scripts/health-check.sh -v

# JSON output for automation
./scripts/health-check.sh -j
```

### Service Endpoints

#### Core Infrastructure
- **Dashboard**: http://localhost:8080
- **Kaspa Node RPC**: http://localhost:16111 (local access only)
- **Kaspa Node P2P**: tcp://localhost:16110 (public access)

#### Production Profile
- **Kasia App**: http://localhost:3001
- **K Social**: http://localhost:3003

#### Explorer Profile
- **Kasia Indexer**: http://localhost:3002
- **K Social Indexer**: http://localhost:3004
- **Simply Kaspa Indexer**: http://localhost:3005
- **PostgreSQL Database**: localhost:5432

#### Archive Profile
- **Archive Indexer**: http://localhost:3006
- **Archive Database**: localhost:5433

#### Mining Profile
- **Mining Stratum**: tcp://localhost:5555

#### Development Profile
- **Portainer**: http://localhost:9000
- **pgAdmin**: http://localhost:9001

## 🔒 Security Features

- Non-root containers for all services
- Network isolation between services
- Rate limiting on public endpoints
- Security headers and HTTPS support
- Automated security scanning
- Signed releases and updates

## 📚 Documentation

### Getting Started
- **Quick Reference**: [docs/quick-reference.md](docs/quick-reference.md) - Essential commands and operations
- **Installation Wizard Guide**: [services/wizard/README.md](services/wizard/README.md) - Complete wizard documentation
- **Component Matrix**: [docs/component-matrix.md](docs/component-matrix.md) - Complete component overview and status
- **Deployment Profiles**: [docs/deployment-profiles.md](docs/deployment-profiles.md) - Profile-based deployment guide
- **Public Node Setup**: [docs/public-node-setup.md](docs/public-node-setup.md) - Network configuration guide

### Installation Wizard
- **Template-First Setup Guide**: [docs/guides/wizard-template-setup-guide.md](docs/guides/wizard-template-setup-guide.md) - Complete template selection and setup guide
- **Wizard Overview**: [services/wizard/README.md](services/wizard/README.md) - Complete wizard features and usage
- **Template vs Custom Setup**: [docs/guides/template-vs-custom-guide.md](docs/guides/template-vs-custom-guide.md) - When to use templates vs custom setup
- **Error Recovery Procedures**: [docs/guides/wizard-error-recovery-guide.md](docs/guides/wizard-error-recovery-guide.md) - Troubleshooting template and installation issues
- **Resource Checker**: [docs/quick-references/RESOURCE_CHECKER_QUICK_REFERENCE.md](docs/quick-references/RESOURCE_CHECKER_QUICK_REFERENCE.md) - Hardware detection and template recommendations
- **Installation Guides**: [docs/quick-references/INSTALLATION_GUIDES_QUICK_REFERENCE.md](docs/quick-references/INSTALLATION_GUIDES_QUICK_REFERENCE.md) - OS-specific installation help
- **Safety System**: [docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md](docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md) - Warnings and confirmations
- **Diagnostic Help**: [services/wizard/DIAGNOSTIC_HELP_QUICK_REFERENCE.md](services/wizard/DIAGNOSTIC_HELP_QUICK_REFERENCE.md) - Troubleshooting and diagnostics

### Management Dashboard
- **Dashboard Overview**: [services/dashboard/README.md](services/dashboard/README.md) - Complete dashboard features and template-aware management
- **Host-Based Deployment**: [services/dashboard/DEPLOYMENT.md](services/dashboard/DEPLOYMENT.md) - Installation and deployment guide
- **Service Management**: [services/dashboard/SERVICE_MANAGEMENT.md](services/dashboard/SERVICE_MANAGEMENT.md) - Dashboard service management
- **Environment Configuration**: [services/dashboard/ENVIRONMENT_VARIABLES.md](services/dashboard/ENVIRONMENT_VARIABLES.md) - Configuration options

### Architecture and Development
- **Project Structure**: [PROJECT_STRUCTURE.md](docs/uncategorized/PROJECT_STRUCTURE.md) - Architecture and file organization
- **TimescaleDB Integration**: [docs/timescaledb-integration.md](docs/timescaledb-integration.md) - Time-series database optimization
- **Service Dependencies**: [docs/service-dependencies.md](docs/service-dependencies.md) - Service relationships and startup order
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

### Community Contributions
- **PR Proposals**: [docs/pr-proposals/](docs/pr-proposals/) - TimescaleDB optimization proposals for upstream repositories
  - [K Social Indexer Enhancement](docs/pr-proposals/k-social-indexer-timescaledb-pr.md)
  - [Simply Kaspa Indexer Enhancement](docs/pr-proposals/simply-kaspa-indexer-timescaledb-pr.md)

### Operations and Maintenance
- **Troubleshooting Guide**: [docs/troubleshooting.md](docs/troubleshooting.md) - Comprehensive problem diagnosis and solutions
- **Maintenance Guide**: [docs/maintenance.md](docs/maintenance.md) - Maintenance schedules and procedures
- **FAQ**: [docs/faq.md](docs/faq.md) - Frequently asked questions and answers
- **Test Cleanup**: [docs/test-cleanup.md](docs/test-cleanup.md) - Test environment cleanup procedures

### Testing and Verification
- **Installation Testing**: [docs/installation-testing.md](docs/installation-testing.md) - Pre-installation verification and system checks
- **Dashboard Testing**: [docs/dashboard-testing.md](docs/dashboard-testing.md) - Dashboard API and UI testing guide
- **Infrastructure Testing**: [docs/infrastructure-testing.md](docs/infrastructure-testing.md) - Nginx, TimescaleDB, and E2E testing

## 🛠️ Development

### Development Environment
```bash
# Start with development tools
./scripts/manage.sh start -p development

# Full development setup
./scripts/manage.sh start -p prod -p explorer -p development

# Access development tools
open http://localhost:9000  # Portainer
open http://localhost:9001  # pgAdmin
```

### Building from Source
```bash
# Build all services
docker compose build

# Build specific profile services
docker compose --profile prod build
docker compose --profile explorer build

# Build specific service
docker compose build kasia-app
```

### Profile-Based Development
```bash
# Work on production applications
./scripts/manage.sh start -p prod -p development
./scripts/manage.sh logs -f kasia-app

# Work on indexing services
./scripts/manage.sh start -p explorer -p development
./scripts/manage.sh logs -f kasia-indexer

# Test mining functionality
./scripts/manage.sh start -p mining -p development
```

## 🔄 Updates & Maintenance

### How Updates Work

Kaspa All-in-One treats upstream Kaspa services the same way a Linux distro treats packages — **you track one thing: the kaspa-aio release**, not individual upstream services. When kaspa-node, kasia, or any other service publishes a new version, the AIO maintainers incorporate it, test the combination, and publish a new versioned release.

```
Upstream release (kaspa-node v1.2.3)
  → Maintainer bumps version + tests
    → New kaspa-aio release (v0.9.x)
      → New Docker images published to ghcr.io
        → Your dashboard notifies you
          → Update via wizard
```

### Automatic Dependency Tracking (Dependabot)

This repository uses [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot) to automatically track and update dependencies on a weekly basis:

| Ecosystem | What's tracked |
|-----------|----------------|
| **Docker base images** | `node`, `nginx`, `golang`, `rust`, `alpine` in all service Dockerfiles |
| **Upstream service images** | `supertypo/simply-kaspa-indexer` and other pre-built images |
| **npm packages** | Wizard, dashboard, and shared library dependencies |
| **GitHub Actions** | CI/CD workflow action versions |

When Dependabot detects a newer version, it automatically opens a pull request. After CI passes, the maintainer merges and publishes a new kaspa-aio release — which your dashboard will then offer as an update.

### Updating Your Installation

When a new kaspa-aio release is available, the management dashboard will display a notification badge. Click it to launch the update wizard, which will:

1. Pull the updated Docker images from `ghcr.io`
2. Perform a rolling restart of affected services
3. Verify health before completing

```bash
# Manual update (if not using the dashboard)
# Download the latest release, then:
./install.sh --update
```

### Manual Docker Image Updates
```bash
# Pull latest images for running services
docker compose pull

# Restart services with new images
docker compose up -d
```

## 💾 Backup & Recovery

### Create Backup
```bash
# Full system backup
./scripts/manage.sh backup

# Manual backup
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine tar czf /backup/kaspa-backup.tar.gz -C /data .
```

### Restore from Backup
```bash
# Restore from backup file
./scripts/manage.sh restore kaspa-backup-20241014.tar.gz
```

## 🐛 Troubleshooting

For comprehensive troubleshooting guidance, see [docs/troubleshooting.md](docs/troubleshooting.md).

### Quick Diagnostics

```bash
# Run automated health check
./scripts/health-check.sh

# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]
```

### Common Issues

- **Services won't start**: Check Docker status, disk space, and port conflicts
- **Node won't sync**: Verify firewall settings and peer connections
- **High resource usage**: Monitor with `docker stats` and optimize configuration
- **Database errors**: Check connection settings and run database maintenance

See the [Troubleshooting Guide](docs/troubleshooting.md) for detailed solutions to these and many other issues.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Kaspa Network](https://kaspa.org) - The underlying blockchain technology
- [K-Kluster](https://github.com/K-Kluster) - Kasia messaging platform
- [thesheepcat](https://github.com/thesheepcat) - K Social platform
- Community contributors and testers

## 📞 Support

### Built-In Help System

The installation wizard includes a comprehensive help system:
- **Search Common Issues**: 10+ pre-configured solutions with step-by-step instructions
- **Diagnostic Reports**: One-click system diagnostics with automatic data redaction
- **Community Links**: Direct access to Discord, GitHub, Forum, and documentation

Access the help system by clicking "Need Help?" on any wizard step.

### Community Support

- **Discord**: [Kaspa Community Discord](https://discord.gg/kaspa) - Real-time help and discussions
- **GitHub Issues**: [GitHub Issues](https://github.com/jtmac69/Kaspa-All-in-One/issues) - Bug reports and feature requests
- **GitHub Discussions**: [GitHub Discussions](https://github.com/jtmac69/Kaspa-All-in-One/discussions) - General questions and ideas
- **Kaspa Forum**: [forum.kaspa.org](https://forum.kaspa.org) - Community Q&A

### Reporting Issues

When reporting issues, use the wizard's diagnostic export feature:
1. Click "Need Help?" in the wizard
2. Go to "Diagnostic Report" tab
3. Click "Generate Report"
4. Copy or download the report
5. Include it in your GitHub issue or support request

The diagnostic report includes system info, Docker status, service health, and recent errors - with all sensitive data automatically redacted.

---

**⚡ Ready to join the Kaspa ecosystem? Get started with the web installation wizard!**

```bash
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd KaspaAllInOne
docker compose --profile wizard up -d
# Open http://localhost:3000
```