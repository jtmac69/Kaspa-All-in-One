# Kaspa All-in-One - Quick Start

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- Docker and Docker Compose v2
- Minimum 4GB RAM (varies by template)
- 100GB+ disk space

## Installation

### Option 1: Web Installation Wizard (Recommended)

```bash
# Clone the repository
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd Kaspa-All-in-One

# Start the installation wizard
./scripts/wizard.sh
```

The wizard will:
- ✅ Check system requirements
- ✅ Guide you through template selection
- ✅ Configure services based on your needs
- ✅ Deploy and start all services

Access the wizard at: **http://your-server:3000**

### Option 2: Quick Deploy (Experienced Users)

```bash
# Clone and configure
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd Kaspa-All-in-One
cp .env.example .env

# Edit .env with your settings
nano .env

# Start with desired profiles
docker compose --profile kaspa-node --profile kasia-app up -d
```

## After Installation

### Access Your Services

- **Dashboard**: http://your-server:8080
- **Kasia App**: http://your-server:3001 (if enabled)
- **K-Social**: http://your-server:3003 (if enabled)
- **Explorer**: http://your-server:3008 (if enabled)

### Common Templates

| I want to... | Use Template | Min RAM |
|--------------|--------------|---------|
| Try Kaspa apps | `quick-start` | 2GB |
| Run my own node | `kaspa-node` | 4GB |
| Use Kasia messaging | `kasia-suite` | 8GB |
| Use K-Social platform | `k-social-suite` | 8GB |
| Run blockchain explorer | `kaspa-explorer` | 12GB |
| Solo mine | `solo-miner` | 6GB |
| Run everything | `kaspa-sovereignty` | 32GB+ |

## Quick Commands

### Service Management

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Restart services
docker compose restart

# Stop all services
docker compose down
```

### Dashboard Access

```bash
# Start dashboard
docker compose up -d dashboard

# View dashboard logs
docker compose logs -f dashboard

# Access dashboard
open http://localhost:8080
```

### Template Deployment

```bash
# Deploy a template
./scripts/manage.sh start --template kasia-suite

# Check template status
./scripts/manage.sh status --template kasia-suite

# View template logs
./scripts/manage.sh logs --template kasia-suite
```

## Next Steps

- **Read deployment-profiles.md** for profile details
- **Check troubleshooting.md** for common issues
- **See maintenance.md** for ongoing maintenance
- **Join the community** on Discord or GitHub Discussions

## Need Help?

- **Built-in Help**: Click "Need Help?" in the wizard
- **Discord**: [Kaspa Community Discord](https://discord.gg/kaspa)
- **GitHub Issues**: [Report bugs](https://github.com/jtmac69/Kaspa-All-in-One/issues)
- **Documentation**: [Full docs](docs/)

---

**⚡ Ready to get started? Launch the wizard and choose your template!**

```bash
./scripts/wizard.sh
```
