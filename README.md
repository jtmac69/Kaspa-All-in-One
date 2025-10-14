# Kaspa All-in-One Mini PC Package

A comprehensive Docker Compose setup for running a complete Kaspa ecosystem on a mini PC. This package provides everything needed to run a full Kaspa node with mining capabilities, messaging, and social features in a single, easy-to-deploy solution.

## 🚀 Components Included

- **Kaspa Node** - Full Kaspa network node with RPC API
- **Kaspa Mining Stratum** - Solo mining stratum (optional)
- **Kasia Messaging App** - Decentralized messaging platform
- **Kasia Indexer** - Message indexing and search service
- **K Social** - Decentralized social media platform
- **K Social Indexer** - Social content indexing service
- **Management Dashboard** - Web-based service management interface
- **Nginx Reverse Proxy** - Load balancing and SSL termination
- **PostgreSQL Databases** - Data storage for indexers

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

### Using the Management Script
```bash
# Start all services
./scripts/manage.sh start

# Check service status
./scripts/manage.sh status

# View logs
./scripts/manage.sh logs -f

# Run health check
./scripts/manage.sh health

# Create backup
./scripts/manage.sh backup

# Update services
./scripts/manage.sh update
```

### Web Dashboard
Access the management dashboard at: `http://localhost:8080`

Features:
- Real-time service monitoring
- Kaspa network statistics
- System resource usage
- Service logs and controls
- Performance metrics

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

### Service Selection
Enable/disable services using Docker Compose profiles:

```bash
# Start with mining enabled
docker compose --profile mining up -d

# Start development environment
docker compose --profile development up -d
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
- **Dashboard**: http://localhost:8080
- **Kasia App**: http://localhost:3001
- **K Social**: http://localhost:3003
- **Kaspa Node RPC**: http://localhost:16111
- **Mining Stratum**: tcp://localhost:5555

## 🔒 Security Features

- Non-root containers for all services
- Network isolation between services
- Rate limiting on public endpoints
- Security headers and HTTPS support
- Automated security scanning
- Signed releases and updates

## 📚 Documentation

- **User Guide**: [docs/user-guide.md](docs/user-guide.md)
- **API Documentation**: [docs/api.md](docs/api.md)
- **Troubleshooting**: [docs/troubleshooting.md](docs/troubleshooting.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 🛠️ Development

### Development Environment
```bash
# Start with development overrides
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Access Portainer for container management
open http://localhost:9000
```

### Building from Source
```bash
# Build all services
docker compose build

# Build specific service
docker compose build kasia-app
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