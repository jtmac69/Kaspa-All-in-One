# Wizard Quick Start Guide

## What is the Wizard?

The Kaspa All-in-One Installation Wizard is a web-based interface that guides you through setting up your Kaspa infrastructure. It provides:

- ✅ Automatic system requirements checking
- ✅ Visual profile selection (Core, Production, Explorer, etc.)
- ✅ Easy service configuration
- ✅ Real-time installation progress
- ✅ Post-installation validation

## Quick Start

### First-Time Installation

```bash
# Start the wizard
./scripts/wizard.sh start

# Open your browser to:
# http://localhost:3000
```

The wizard will guide you through:
1. **Welcome** - Introduction and overview
2. **System Check** - Verify Docker and system resources
3. **Profiles** - Choose which services to run
4. **Configure** - Set passwords and options
5. **Review** - Confirm your choices
6. **Install** - Watch real-time progress
7. **Complete** - Get started with your services

### Modify Existing Configuration

```bash
# Start wizard in reconfigure mode
./scripts/wizard.sh reconfigure

# Your existing settings will be loaded
# Make changes and save
```

## Common Commands

```bash
# Check wizard status
./scripts/wizard.sh status

# View wizard logs
./scripts/wizard.sh logs

# Stop the wizard
./scripts/wizard.sh stop

# Get help
./scripts/wizard.sh help
```

## Profiles Explained

### Core Profile (Recommended for Beginners)
- **Services**: Kaspa Node, Dashboard, Nginx
- **Resources**: 4GB RAM, 100GB disk
- **Use Case**: Basic node operation

### Production Profile
- **Services**: Core + Kasia App, K-Social, Mining
- **Resources**: 8GB RAM, 200GB disk
- **Use Case**: Full-featured node with apps

### Explorer Profile
- **Services**: Core + All Indexers, TimescaleDB
- **Resources**: 16GB RAM, 500GB disk
- **Use Case**: Blockchain data indexing

### Archive Profile
- **Services**: Explorer + Archive Database
- **Resources**: 32GB RAM, 1TB+ disk
- **Use Case**: Long-term data retention

### Mining Profile
- **Services**: Core + Stratum Bridge
- **Resources**: 4GB RAM, 100GB disk
- **Use Case**: Solo or pool mining

### Development Profile
- **Services**: All + Portainer, pgAdmin
- **Resources**: 16GB RAM, 500GB disk
- **Use Case**: Development and testing

## Troubleshooting

### Wizard Won't Start

**Problem**: Port 3000 is already in use

**Solution**:
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or use a different port
export WIZARD_PORT=3001
./scripts/wizard.sh start
```

### Can't Access Wizard

**Problem**: Browser shows "Connection refused"

**Solution**:
```bash
# Check if wizard is running
./scripts/wizard.sh status

# Check wizard logs
./scripts/wizard.sh logs

# Restart wizard
./scripts/wizard.sh stop
./scripts/wizard.sh start
```

### Installation Fails

**Problem**: Services fail to start

**Solution**:
```bash
# Check Docker is running
docker ps

# Check available disk space
df -h

# View detailed logs
docker logs kaspa-wizard

# Try again with fewer services
# (Select Core profile only)
```

## Tips

### 1. Start Small
Begin with the **Core** profile, then add more services later using reconfigure mode.

### 2. Check Resources
Make sure your system meets the requirements for your chosen profile.

### 3. Use Reconfigure
You can always modify your configuration later:
```bash
./scripts/wizard.sh reconfigure
```

### 4. Monitor Progress
The wizard shows real-time progress. Installation can take 10-30 minutes depending on your internet speed and chosen profile.

### 5. Stop When Done
After configuration is complete, stop the wizard to free up resources:
```bash
./scripts/wizard.sh stop
```

## Next Steps After Installation

1. **Access Dashboard**
   ```
   http://localhost:8080
   ```

2. **Check Service Status**
   ```bash
   docker ps
   ```

3. **View Logs**
   ```bash
   docker logs kaspa-node
   docker logs kaspa-dashboard
   ```

4. **Manage Services**
   ```bash
   # Stop all services
   docker-compose down

   # Start specific profile
   docker-compose --profile core up -d

   # View service status
   docker-compose ps
   ```

## Getting Help

- **Documentation**: See `INTEGRATION.md` for detailed information
- **Test Suite**: Run `./test-wizard-complete.sh` to diagnose issues
- **Logs**: Check `docker logs kaspa-wizard` for errors
- **Status**: Run `./scripts/wizard.sh status` to check wizard state

## Security Notes

- The wizard has access to Docker for container management
- Configuration is saved to `.env` file
- Stop the wizard after configuration for security
- Use strong passwords for production deployments
- Consider using HTTPS in production (configure nginx)

## Advanced Usage

### Custom Port

```bash
export WIZARD_PORT=8888
./scripts/wizard.sh start
```

### Development Mode

```bash
cd services/wizard/backend
npm install
npm run dev
```

### Manual Configuration

If you prefer not to use the wizard, you can:
1. Copy `.env.example` to `.env`
2. Edit `.env` with your settings
3. Run `docker-compose --profile <profile> up -d`

## Support

For issues or questions:
1. Check this guide
2. Run diagnostic test: `./test-wizard-complete.sh`
3. View logs: `./scripts/wizard.sh logs`
4. Check integration docs: `INTEGRATION.md`
5. Open an issue on GitHub with diagnostic information
