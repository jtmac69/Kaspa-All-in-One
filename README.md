# Kaspa All-in-One Mini PC Package

A comprehensive Docker Compose setup for running a complete Kaspa ecosystem on a mini PC. This package provides everything needed to run a full Kaspa node with mining capabilities, messaging, and social features in a single, easy-to-deploy solution.

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

### Recommended Configuration
- **Mini PC**: Beelink SER7 7735HS (~$400-450)
- **CPU**: AMD Ryzen 7 7735HS (8 cores, 16 threads)
- **RAM**: 32GB DDR5
- **Storage**: 1TB NVMe SSD
- **Network**: Gigabit Ethernet + WiFi 6

### Minimum Requirements
- **CPU**: AMD Ryzen 5 series or Intel equivalent
- **RAM**: 16GB DDR4
- **Storage**: 500GB SSD
- **Network**: 100Mbps internet connection

## 🐧 Supported Operating Systems

- **Ubuntu Desktop 22.04 LTS** (Recommended)
- **Ubuntu Desktop 24.04 LTS**
- Future support planned for Arch-based distributions

## ⚡ Quick Start

### One-Line Installation
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/kaspa-aio/main/install.sh | bash
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/kaspa-aio.git
cd kaspa-aio

# Run the interactive installer
./install.sh

# Or start services manually
docker compose up -d
```

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

### Web Dashboard
Access the management dashboard at: `http://localhost:8080`

Features:
- Real-time service monitoring across all profiles
- Kaspa network statistics and node status
- System resource usage and performance metrics
- Profile-specific service controls and logs
- Public node accessibility status

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

- **Component Matrix**: [docs/component-matrix.md](docs/component-matrix.md) - Complete component overview and status
- **Deployment Profiles**: [docs/deployment-profiles.md](docs/deployment-profiles.md) - Profile-based deployment guide
- **TimescaleDB Integration**: [docs/timescaledb-integration.md](docs/timescaledb-integration.md) - Time-series database optimization
- **Public Node Setup**: [docs/public-node-setup.md](docs/public-node-setup.md) - Network configuration guide
- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Architecture and file organization
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

### Community Contributions
- **PR Proposals**: [docs/pr-proposals/](docs/pr-proposals/) - TimescaleDB optimization proposals for upstream repositories
  - [K Social Indexer Enhancement](docs/pr-proposals/k-social-indexer-timescaledb-pr.md)
  - [Simply Kaspa Indexer Enhancement](docs/pr-proposals/simply-kaspa-indexer-timescaledb-pr.md)

### Planned Documentation
- **User Guide**: Step-by-step usage instructions
- **API Documentation**: Service API references
- **Troubleshooting**: Common issues and solutions
- **Admin Guide**: System administration procedures

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

### Common Issues

**Services won't start:**
```bash
# Check Docker status
sudo systemctl status docker

# Check logs
./scripts/manage.sh logs

# Restart services
./scripts/manage.sh restart
```

**High resource usage:**
```bash
# Check resource usage
./scripts/manage.sh status

# Monitor in real-time
docker stats
```

**Network connectivity issues:**
```bash
# Test Kaspa node connectivity
curl -X POST -H "Content-Type: application/json" -d '{"method":"ping","params":{}}' http://localhost:16111
```

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

- **Issues**: [GitHub Issues](https://github.com/your-repo/kaspa-aio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/kaspa-aio/discussions)
- **Discord**: [Kaspa Community Discord](https://discord.gg/kaspa)

---

**⚡ Ready to join the Kaspa ecosystem? Get started with the one-line installer above!**