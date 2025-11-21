# Kaspa All-in-One

A comprehensive Docker-based solution for running a complete Kaspa blockchain ecosystem. This package provides everything needed to run a full Kaspa node with mining capabilities, messaging, social features, and blockchain indexing - all with an intuitive web-based installation wizard.

## ✨ What's New

- **🎯 Web Installation Wizard** - Interactive guided setup with real-time progress tracking
- **🔍 Smart Resource Detection** - Automatic hardware analysis and profile recommendations
- **🛡️ Safety System** - Built-in warnings, confirmations, and automatic backups
- **🚑 Auto-Remediation** - Automatic fixes for common installation issues
- **📊 Diagnostic Tools** - Comprehensive system diagnostics and help system
- **🌐 Multi-OS Support** - Ubuntu, Debian, CentOS, macOS, and Windows (WSL2)

## 🚀 Components Included

### Core Infrastructure (Always Active)
- **Kaspa Node** - Full Kaspa network node with RPC API and public P2P access
- **Management Dashboard** - Web-based service management and monitoring interface
- **Nginx Reverse Proxy** - Load balancing, SSL termination, and security headers

### Production Profile (`prod`) - User Applications
- **Kasia Messaging App** - Decentralized messaging platform ([K-Kluster/Kasia](https://github.com/K-Kluster/Kasia))
- **K Social App** - Decentralized social media platform ([thesheepcat/K](https://github.com/thesheepcat/K))

### Explorer Profile (`explorer`) - Data Indexing Services
- **Kasia Indexer** - Message indexing with file-based storage (RocksDB) ([K-Kluster/kasia-indexer](https://github.com/K-Kluster/kasia-indexer))
- **K Social Indexer** - Social content indexing with TimescaleDB (Rust) ([thesheepcat/K-indexer](https://github.com/thesheepcat/K-indexer))
- **Simply Kaspa Indexer** - General blockchain indexing with TimescaleDB ([supertypo/simply-kaspa-indexer](https://github.com/supertypo/simply-kaspa-indexer))
- **Shared TimescaleDB** - Time-series optimized PostgreSQL for K-Social and Simply Kaspa indexers

### Archive Profile (`archive`) - Long-term Data Storage
- **Archive Indexer** - Historical data preservation and analysis
- **Archive Database** - Separate PostgreSQL instance for long-term storage with partitioning

### Mining Profile (`mining`) - Mining Operations
- **Kaspa Mining Stratum** - Solo mining stratum bridge ([aglov413/kaspa-stratum-bridge](https://github.com/aglov413/kaspa-stratum-bridge))

### Development Profile (`development`) - Development Tools
- **Portainer** - Container management and monitoring interface
- **pgAdmin** - Database administration and query interface

## 💻 Hardware Requirements

The installation wizard automatically detects your hardware and recommends the best profile for your system.

### Minimum Requirements (Core Profile)
- **CPU**: 2+ cores
- **RAM**: 4GB
- **Storage**: 100GB available
- **Network**: Stable internet connection
- **Disk Type**: HDD acceptable (SSD recommended)

**What you can run**: Kaspa node, management dashboard

### Recommended Configuration (Production Profile)
- **CPU**: 4+ cores
- **RAM**: 8GB
- **Storage**: 250GB available (SSD recommended)
- **Network**: 100Mbps+ internet
- **Disk Type**: SSD strongly recommended

**What you can run**: Node, dashboard, Kasia app, K-Social app

### Optimal Configuration (Explorer Profile)
- **CPU**: 8+ cores
- **RAM**: 16GB+
- **Storage**: 500GB+ available (NVMe SSD recommended)
- **Network**: Gigabit ethernet
- **Disk Type**: NVMe SSD for best performance

**What you can run**: Everything including blockchain indexers with TimescaleDB

### High-End Configuration (Archive Profile)
- **CPU**: 8+ cores (16+ threads)
- **RAM**: 32GB+
- **Storage**: 1TB+ available (NVMe SSD required)
- **Network**: Gigabit ethernet
- **Disk Type**: NVMe SSD required

**What you can run**: Full archive node with long-term data retention

### Example Hardware

**Budget Option (~$300-400)**
- Mini PC: Beelink SER5 5560U
- CPU: AMD Ryzen 5 5560U (6 cores)
- RAM: 16GB DDR4
- Storage: 500GB NVMe SSD
- **Best for**: Core or Production profiles

**Recommended Option (~$400-500)**
- Mini PC: Beelink SER7 7735HS
- CPU: AMD Ryzen 7 7735HS (8 cores, 16 threads)
- RAM: 32GB DDR5
- Storage: 1TB NVMe SSD
- **Best for**: Explorer or Archive profiles

**Note**: The installation wizard will analyze your hardware and provide specific recommendations with compatibility ratings (Optimal, Recommended, Possible, Not Recommended).

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
git clone https://github.com/argonmining/KaspaAllInOne.git
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
curl -fsSL https://raw.githubusercontent.com/argonmining/KaspaAllInOne/main/install.sh | bash
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
git clone https://github.com/argonmining/KaspaAllInOne.git
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
- ✅ **4GB+ RAM** (8GB+ recommended)
- ✅ **100GB+ free disk space** (500GB+ for full node)
- ✅ **Stable internet connection**
- ✅ **Open ports** (or ability to configure alternatives)

The installation wizard will check all of these for you automatically!

## 🎛️ Management

### Profile-Based Deployment
Choose the components you need based on your hardware and requirements:

```bash
# Core services only (node + dashboard)
./scripts/manage.sh start

# Production applications (messaging + social)
./scripts/manage.sh start -p prod

# Data indexing services
./scripts/manage.sh start -p explorer

# Complete setup (all profiles)
./scripts/manage.sh start -p prod -p explorer -p development

# Mining operation
./scripts/manage.sh start -p mining
```

### Management Commands
```bash
# Profile management
./scripts/manage.sh profiles              # List all available profiles
./scripts/manage.sh start -p prod         # Start production profile
./scripts/manage.sh status -p explorer    # Check explorer services
./scripts/manage.sh logs -p development   # View development tools logs

# Service management
./scripts/manage.sh start kaspa-node      # Start specific service
./scripts/manage.sh health                # Run comprehensive health check
./scripts/manage.sh backup                # Create data backup
./scripts/manage.sh update                # Update all services
```

### Web Interfaces

#### Installation Wizard
Access at: `http://localhost:3000` (when wizard profile is active)

Features:
- 🎯 Interactive guided installation
- 📊 Real-time system requirements checking
- 🔍 Smart profile recommendations
- ⚙️ Visual configuration builder
- 📈 Live installation progress tracking
- ✅ Post-installation verification
- 🆘 Built-in help and troubleshooting

#### Management Dashboard
Access at: `http://localhost:8080`

Features:
- 📊 Real-time service monitoring across all profiles
- 🌐 Kaspa network statistics and node status
- 💻 System resource usage and performance metrics
- 🎛️ Profile-specific service controls and logs
- 🔌 Public node accessibility status
- 🔄 Service restart and reconfiguration

## 🎯 Installation Wizard Features

The web-based installation wizard makes setup easy for everyone, from beginners to experts.

### Smart System Detection
- **Automatic Hardware Analysis**: Detects CPU, RAM, disk space, and disk type
- **OS Detection**: Identifies your operating system and provides tailored instructions
- **Resource Recommendations**: Suggests optimal profiles based on your hardware
- **Compatibility Ratings**: Shows which profiles will work best on your system

### Guided Installation Process

**Step 1: Pre-Installation Checklist**
- System requirements verification
- Docker installation status
- Port availability checking
- "Help Me Choose" quiz for profile selection

**Step 2: System Check**
- Docker and Docker Compose verification
- Resource availability confirmation
- Network connectivity testing
- Automatic issue detection

**Step 3: Profile Selection**
- Visual profile cards with descriptions
- Resource requirements for each profile
- Compatibility indicators
- Multiple profile selection support

**Step 4: Configuration**
- Smart defaults based on your system
- Visual configuration forms
- Real-time validation
- External IP detection
- Secure password generation

**Step 5: Review**
- Configuration summary
- Profile overview
- Estimated installation time
- Final confirmation

**Step 6: Installation**
- Real-time progress tracking
- Phase-by-phase updates
- Detailed status messages
- WebSocket-based live updates

**Step 7: Completion**
- Installation verification
- Service health checks
- Interactive post-installation tour
- Quick start guide
- Access to all services

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
- **Wizard Overview**: [services/wizard/README.md](services/wizard/README.md) - Complete wizard features and usage
- **Resource Checker**: [services/wizard/RESOURCE_CHECKER_QUICK_REFERENCE.md](services/wizard/RESOURCE_CHECKER_QUICK_REFERENCE.md) - Hardware detection and recommendations
- **Plain Language Guide**: [PLAIN_LANGUAGE_STYLE_GUIDE.md](PLAIN_LANGUAGE_STYLE_GUIDE.md) - Content writing standards
- **Installation Guides**: [services/wizard/INSTALLATION_GUIDES_QUICK_REFERENCE.md](docs/quick-references/INSTALLATION_GUIDES_QUICK_REFERENCE.md) - OS-specific installation help
- **Error Remediation**: [services/wizard/ERROR_REMEDIATION_QUICK_REFERENCE.md](docs/quick-references/ERROR_REMEDIATION_QUICK_REFERENCE.md) - Automatic error fixing
- **Safety System**: [services/wizard/SAFETY_SYSTEM_QUICK_REFERENCE.md](docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md) - Warnings and confirmations
- **Diagnostic Help**: [services/wizard/DIAGNOSTIC_HELP_QUICK_REFERENCE.md](services/wizard/DIAGNOSTIC_HELP_QUICK_REFERENCE.md) - Troubleshooting and diagnostics
- **Post-Installation Tour**: [services/wizard/POST_INSTALLATION_TOUR_QUICK_REFERENCE.md](docs/quick-references/POST_INSTALLATION_TOUR_QUICK_REFERENCE.md) - Getting started guide

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

### Automatic Updates
The system supports automatic updates for:
- Docker images
- Security patches
- Configuration updates

### Manual Updates
```bash
# Update all services
./scripts/manage.sh update

# Update specific service
docker compose pull kaspa-node
docker compose up -d kaspa-node
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
- **GitHub Issues**: [GitHub Issues](https://github.com/argonmining/KaspaAllInOne/issues) - Bug reports and feature requests
- **GitHub Discussions**: [GitHub Discussions](https://github.com/argonmining/KaspaAllInOne/discussions) - General questions and ideas
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
git clone https://github.com/argonmining/KaspaAllInOne.git
cd KaspaAllInOne
docker compose --profile wizard up -d
# Open http://localhost:3000
```