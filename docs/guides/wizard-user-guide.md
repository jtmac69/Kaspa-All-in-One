# Kaspa All-in-One Installation Wizard - Complete User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Installation Walkthrough](#installation-walkthrough)
4. [Reconfiguration Guide](#reconfiguration-guide)
5. [Profile Reference](#profile-reference)
6. [Testing and Validation](#testing-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)
9. [Security Best Practices](#security-best-practices)
10. [FAQ](#faq)

---

## Introduction

The Kaspa All-in-One Installation Wizard is a web-based interface that simplifies the setup and configuration of your Kaspa blockchain infrastructure. Whether you're running a basic node or a full production environment with indexers and applications, the wizard guides you through every step.

### What the Wizard Does

✅ **System Requirements Check** - Automatically verifies Docker, resources, and ports  
✅ **Visual Profile Selection** - Choose from 6 pre-configured deployment profiles  
✅ **Easy Configuration** - Set passwords and options through a web form  
✅ **Real-Time Progress** - Watch installation progress with live updates  
✅ **Post-Installation Validation** - Verify all services started correctly  
✅ **Reconfiguration Support** - Modify your setup anytime without starting over  

### When to Use the Wizard

- **First-time installation** - Easiest way to get started
- **Changing profiles** - Add or remove services
- **Updating configuration** - Modify ports, passwords, or settings
- **Troubleshooting** - Validate system requirements and configuration

---

## Getting Started

### Prerequisites

Before starting the wizard, ensure you have:

1. **Docker** installed and running
   ```bash
   docker --version
   # Should show: Docker version 24.0 or higher
   ```

2. **Docker Compose** installed
   ```bash
   docker compose version
   # Should show: Docker Compose version 2.0 or higher
   ```

3. **Sufficient Resources** (minimum for Core profile)
   - 4GB RAM
   - 100GB disk space
   - 2 CPU cores
   - Stable internet connection

4. **Available Ports** (default ports)
   - 3000 (Wizard)
   - 8080 (Dashboard)
   - 16110 (Kaspa P2P)
   - 16111 (Kaspa RPC)

### Starting the Wizard

#### First-Time Installation

```bash
# Navigate to the project directory
cd kaspa-all-in-one

# Start the wizard
./scripts/wizard.sh start

# Or use the install script
./install.sh
```

The wizard will automatically open at: **http://localhost:3000**

#### Modifying Existing Configuration

```bash
# Start wizard in reconfigure mode
./scripts/wizard.sh reconfigure
```

---

## Installation Walkthrough

### Step 1: Welcome

The welcome screen introduces the wizard and provides an overview of the installation process.

**What to do:**
- Read the introduction
- Click "Get Started" to begin

### Step 2: System Check

The wizard automatically checks your system requirements.

**What's checked:**
- ✅ Docker installation and version
- ✅ Docker Compose installation
- ✅ Available RAM and disk space
- ✅ Port availability
- ✅ Internet connectivity

**If checks fail:**
- Follow the provided remediation steps
- Install missing dependencies
- Free up required ports
- Click "Re-check" after fixing issues

### Step 3: Profile Selection

Choose which services you want to run. See [Profile Reference](#profile-reference) for details.

**Available Profiles:**

| Profile | Services | Resources | Use Case |
|---------|----------|-----------|----------|
| **Core** | Node, Dashboard, Nginx | 4GB RAM, 100GB disk | Basic node operation |
| **Production** | Core + Apps | 8GB RAM, 200GB disk | Full-featured node |
| **Explorer** | Core + Indexers | 16GB RAM, 500GB disk | Blockchain indexing |
| **Archive** | Explorer + Archive DB | 32GB RAM, 1TB+ disk | Long-term retention |
| **Mining** | Core + Stratum | 4GB RAM, 100GB disk | Solo/pool mining |
| **Development** | All + Dev Tools | 16GB RAM, 500GB disk | Development & testing |

**Tips:**
- Start with **Core** if unsure
- You can add more profiles later
- Multiple profiles can be selected
- Resource requirements are cumulative

### Step 4: Configuration

Configure service settings through an easy web form.

**Common Settings:**

**Kaspa Node:**
- P2P Port (default: 16110)
- RPC Port (default: 16111)
- External IP (auto-detected)
- Public node (yes/no)

**Database (if Explorer/Archive selected):**
- PostgreSQL password (auto-generated)
- Database port (default: 5432)

**Dashboard:**
- Port (default: 8080)
- Admin password (auto-generated)

**Tips:**
- Use auto-generated passwords (secure)
- Note down passwords for later use
- External IP is auto-detected
- Click "Generate Password" for secure passwords

### Step 5: Review

Review your configuration before installation.

**What to check:**
- Selected profiles
- Service ports
- Resource requirements
- Generated passwords (save these!)

**Actions:**
- Click "Back" to make changes
- Click "Install" to proceed
- Click "Export Config" to save settings

### Step 6: Installation

Watch real-time installation progress.

**What happens:**
1. Configuration files generated
2. Docker images pulled
3. Containers created
4. Services started
5. Health checks performed

**Progress indicators:**
- Overall progress bar
- Current step description
- Real-time logs (expandable)
- Estimated time remaining

**Typical duration:**
- Core profile: 5-10 minutes
- Production profile: 10-20 minutes
- Explorer profile: 15-30 minutes

**If installation fails:**
- Review error messages
- Check logs for details
- Click "Retry" to try again
- See [Troubleshooting](#troubleshooting)

### Step 7: Complete

Installation complete! Review the summary and next steps.

**What's shown:**
- ✅ Services started successfully
- 🔗 Access URLs for each service
- 📝 Next steps and recommendations
- 📚 Links to documentation

**Next steps:**
1. Access the dashboard: http://localhost:8080
2. Check service status: `docker ps`
3. View logs: `docker logs kaspa-node`
4. Stop the wizard: `./scripts/wizard.sh stop`

---

## Reconfiguration Guide

### When to Reconfigure

- Add or remove services
- Change ports or passwords
- Enable/disable public node
- Update resource allocations
- Switch between profiles

### How to Reconfigure

```bash
# Start wizard in reconfigure mode
./scripts/wizard.sh reconfigure
```

### Reconfiguration Process

1. **Load Current Configuration**
   - Wizard reads your existing `.env` file
   - Shows currently active profiles
   - Displays running services

2. **Make Changes**
   - Select/deselect profiles
   - Modify configuration values
   - Update passwords or ports

3. **Review Changes**
   - See what will change
   - Review affected services
   - Confirm modifications

4. **Apply Configuration**
   - Backup created automatically
   - New configuration generated
   - Services restarted as needed

5. **Validation**
   - Health checks performed
   - Service status verified
   - Summary displayed

### Backup and Restore

**Automatic Backups:**
- Created before each reconfiguration
- Stored in `.env.backup.TIMESTAMP`
- Kept for 30 days

**Manual Backup:**
```bash
cp .env .env.backup.manual
```

**Restore from Backup:**
```bash
# List available backups
ls -la .env.backup.*

# Restore specific backup
cp .env.backup.2024-11-17_10-30-00 .env

# Restart services
docker compose down
docker compose --profile core up -d
```

---

## Profile Reference

### Core Profile (Recommended for Beginners)

**Services:**
- Kaspa Node (rusty-kaspad)
- Management Dashboard
- Nginx Reverse Proxy

**Resources:**
- RAM: 4GB minimum, 8GB recommended
- Disk: 100GB minimum, 200GB recommended
- CPU: 2 cores minimum, 4 cores recommended

**Use Cases:**
- Running a basic Kaspa node
- Participating in the network
- Learning about Kaspa
- Home node operation

**Access:**
- Dashboard: http://localhost:8080
- Kaspa RPC: localhost:16111

### Production Profile

**Services:**
- Everything in Core, plus:
- Kasia Messaging App
- K-Social Platform
- Mining Stratum Bridge

**Resources:**
- RAM: 8GB minimum, 16GB recommended
- Disk: 200GB minimum, 500GB recommended
- CPU: 4 cores minimum, 8 cores recommended

**Use Cases:**
- Full-featured node with applications
- Running messaging and social apps
- Mining operations
- Production deployments

**Access:**
- All Core services, plus:
- Kasia App: http://localhost:3001
- K-Social: http://localhost:3002
- Stratum: localhost:5555

### Explorer Profile

**Services:**
- Everything in Core, plus:
- Kasia Indexer
- K-Social Indexer
- Simply Kaspa Indexer
- TimescaleDB

**Resources:**
- RAM: 16GB minimum, 32GB recommended
- Disk: 500GB minimum, 1TB recommended
- CPU: 8 cores minimum, 16 cores recommended

**Use Cases:**
- Blockchain data indexing
- Running explorer services
- API development
- Data analysis

**Access:**
- All Core services, plus:
- Kasia Indexer API: http://localhost:3002
- K-Social Indexer: http://localhost:3003
- Simply Kaspa API: http://localhost:3004
- TimescaleDB: localhost:5432

### Archive Profile

**Services:**
- Everything in Explorer, plus:
- Archive Database
- Long-term retention policies

**Resources:**
- RAM: 32GB minimum, 64GB recommended
- Disk: 1TB minimum, 2TB+ recommended
- CPU: 16 cores minimum, 32 cores recommended

**Use Cases:**
- Long-term data retention
- Historical data analysis
- Archive node operation
- Research and analytics

**Access:**
- All Explorer services, plus:
- Archive DB: localhost:5433

### Mining Profile

**Services:**
- Everything in Core, plus:
- Kaspa Stratum Bridge

**Resources:**
- RAM: 4GB minimum, 8GB recommended
- Disk: 100GB minimum, 200GB recommended
- CPU: 2 cores minimum, 4 cores recommended

**Use Cases:**
- Solo mining
- Pool mining
- Mining pool operation
- Mining development

**Access:**
- All Core services, plus:
- Stratum: localhost:5555

### Development Profile

**Services:**
- All services from all profiles, plus:
- Portainer (Docker management)
- pgAdmin (Database management)

**Resources:**
- RAM: 16GB minimum, 32GB recommended
- Disk: 500GB minimum, 1TB recommended
- CPU: 8 cores minimum, 16 cores recommended

**Use Cases:**
- Development and testing
- Debugging services
- Database management
- Container management

**Access:**
- All services, plus:
- Portainer: http://localhost:9000
- pgAdmin: http://localhost:5050

---

## Testing and Validation

### Automated Testing

The wizard includes comprehensive automated tests to validate the installation.

#### Run Complete Test Suite

```bash
# Run all wizard tests
./test-wizard-integration.sh
```

**What's tested:**
- ✅ Wizard script functionality
- ✅ Docker Compose configuration
- ✅ Backend API endpoints
- ✅ Frontend accessibility
- ✅ All 6 profiles
- ✅ Reconfiguration mode
- ✅ Error handling
- ✅ Security headers

**Test sections:**
1. Basic Integration Tests (15 tests)
2. Profile Testing (18 tests - 3 per profile)
3. Reconfiguration Mode (3 tests)
4. Error Handling and Recovery (8 tests)

**Expected output:**
```
╔══════════════════════════════════════════════════════════════╗
║                  ✓ All tests passed!                         ║
╚══════════════════════════════════════════════════════════════╝

Tests Run:    44
Tests Passed: 44
Tests Failed: 0
Pass Rate:    100%
```

#### Run Specific Test Sections

```bash
# Verbose output
./test-wizard-integration.sh --verbose

# Skip cleanup (for debugging)
./test-wizard-integration.sh --no-cleanup

# Show help
./test-wizard-integration.sh --help
```

### Manual Validation

#### Check Wizard Status

```bash
./scripts/wizard.sh status
```

**Expected output:**
```
Wizard Status: Running
Health: Healthy
Mode: install
Port: 3000
URL: http://localhost:3000
```

#### Verify Services

```bash
# List running containers
docker ps

# Check specific service
docker logs kaspa-node
docker logs kaspa-dashboard

# Check service health
docker inspect kaspa-node | grep Health
```

#### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# System check
curl http://localhost:3000/api/system-check

# Profiles
curl http://localhost:3000/api/profiles

# Wizard mode
curl http://localhost:3000/api/wizard/mode
```

### Validation Checklist

After installation, verify:

- [ ] Wizard accessible at http://localhost:3000
- [ ] Dashboard accessible at http://localhost:8080
- [ ] Kaspa node is syncing (`docker logs kaspa-node`)
- [ ] All selected services are running (`docker ps`)
- [ ] No error messages in logs
- [ ] Ports are accessible (if public node)
- [ ] Configuration saved to `.env`
- [ ] Wizard state file created (`.wizard-state`)

---

## Troubleshooting

### Common Issues

#### Wizard Won't Start

**Symptom:** `./scripts/wizard.sh start` fails or wizard not accessible

**Solutions:**

1. **Check if port 3000 is in use:**
   ```bash
   lsof -i :3000
   # If in use, kill the process or use different port
   export WIZARD_PORT=3001
   ./scripts/wizard.sh start
   ```

2. **Check Docker is running:**
   ```bash
   docker ps
   # If error, start Docker Desktop or Docker service
   ```

3. **Check wizard logs:**
   ```bash
   docker logs kaspa-wizard
   ```

4. **Rebuild wizard image:**
   ```bash
   docker compose --profile wizard build wizard
   ./scripts/wizard.sh start
   ```

#### System Check Fails

**Symptom:** Red X marks on system check screen

**Solutions:**

1. **Docker not found:**
   ```bash
   # Install Docker
   # macOS: Download Docker Desktop
   # Linux: sudo apt-get install docker.io docker-compose
   ```

2. **Insufficient resources:**
   - Close other applications
   - Increase Docker resource limits (Docker Desktop → Settings → Resources)
   - Choose a lighter profile (Core instead of Explorer)

3. **Ports not available:**
   ```bash
   # Find what's using the port
   lsof -i :16110
   lsof -i :8080
   
   # Kill the process or change ports in configuration
   ```

#### Installation Fails

**Symptom:** Installation stops with error message

**Solutions:**

1. **Check disk space:**
   ```bash
   df -h
   # Ensure at least 100GB free
   ```

2. **Check internet connection:**
   ```bash
   ping google.com
   # Docker needs to download images
   ```

3. **View detailed logs:**
   ```bash
   docker logs kaspa-wizard
   docker logs kaspa-node
   ```

4. **Retry installation:**
   - Click "Retry" button in wizard
   - Or restart wizard: `./scripts/wizard.sh restart install`

5. **Clean start:**
   ```bash
   # Stop all services
   docker compose down
   
   # Remove volumes (WARNING: deletes data)
   docker compose down -v
   
   # Restart wizard
   ./scripts/wizard.sh start
   ```

#### Services Won't Start

**Symptom:** Services show as "Exited" in `docker ps -a`

**Solutions:**

1. **Check service logs:**
   ```bash
   docker logs <service-name>
   ```

2. **Check dependencies:**
   ```bash
   # Some services depend on others
   # e.g., indexers need Kaspa node running first
   docker compose --profile core up -d
   # Wait for node to sync, then:
   docker compose --profile explorer up -d
   ```

3. **Check configuration:**
   ```bash
   # Verify .env file
   cat .env
   
   # Check for syntax errors
   docker compose config
   ```

4. **Restart services:**
   ```bash
   docker compose restart <service-name>
   ```

#### Cannot Access Dashboard

**Symptom:** Browser shows "Connection refused" at http://localhost:8080

**Solutions:**

1. **Check if dashboard is running:**
   ```bash
   docker ps | grep dashboard
   ```

2. **Check dashboard logs:**
   ```bash
   docker logs kaspa-dashboard
   ```

3. **Check port mapping:**
   ```bash
   docker port kaspa-dashboard
   # Should show: 3000/tcp -> 0.0.0.0:8080
   ```

4. **Try different browser or clear cache**

5. **Check firewall settings**

#### Reconfiguration Doesn't Apply

**Symptom:** Changes made in wizard don't take effect

**Solutions:**

1. **Check if backup was created:**
   ```bash
   ls -la .env.backup.*
   ```

2. **Verify .env was updated:**
   ```bash
   cat .env
   # Check if changes are present
   ```

3. **Restart services manually:**
   ```bash
   docker compose down
   docker compose --profile <your-profile> up -d
   ```

4. **Check for errors:**
   ```bash
   docker logs kaspa-wizard
   ```

### Getting Help

If you're still stuck:

1. **Run diagnostic test:**
   ```bash
   ./test-wizard-integration.sh > wizard-test-results.txt
   ```

2. **Collect logs:**
   ```bash
   docker logs kaspa-wizard > wizard-logs.txt
   docker logs kaspa-node > node-logs.txt
   ```

3. **Check documentation:**
   - [Integration Guide](../services/wizard/INTEGRATION.md)
   - [Quick Start](../services/wizard/QUICKSTART.md)
   - [Main README](../README.md)

4. **Open GitHub issue:**
   - Include test results
   - Include relevant logs
   - Describe your system (OS, Docker version, resources)
   - Describe what you were trying to do

---

## Advanced Usage

### Custom Port Configuration

```bash
# Use different wizard port
export WIZARD_PORT=8888
./scripts/wizard.sh start

# Access at http://localhost:8888
```

### Environment Variables

```bash
# Set wizard mode explicitly
export WIZARD_MODE=reconfigure
./scripts/wizard.sh start

# Disable auto-start
export WIZARD_AUTO_START=false

# Set custom timeout
export WIZARD_TIMEOUT=600  # 10 minutes

# Set max retries
export WIZARD_MAX_RETRIES=5
```

### Manual Configuration

If you prefer not to use the wizard:

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env

# Start services
docker compose --profile core up -d
```

### Development Mode

```bash
# Run backend in development mode
cd services/wizard/backend
npm install
npm run dev

# Serve frontend separately
cd ../frontend/public
python3 -m http.server 3000
```

### Docker Compose Commands

```bash
# Start specific profile
docker compose --profile core up -d

# Start multiple profiles
docker compose --profile core --profile prod up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart kaspa-node

# Remove everything (including volumes)
docker compose down -v
```

---

## Security Best Practices

### 1. Stop Wizard After Configuration

```bash
# Wizard has Docker socket access
# Stop it when not needed
./scripts/wizard.sh stop
```

### 2. Use Strong Passwords

- Use auto-generated passwords
- Don't reuse passwords
- Store passwords securely (password manager)

### 3. Secure Public Nodes

If running a public node:

```bash
# Configure firewall
sudo ufw allow 16110/tcp  # P2P
sudo ufw allow 16111/tcp  # RPC (if needed)
sudo ufw enable

# Use HTTPS for dashboard
# Configure SSL in nginx
```

### 4. Regular Updates

```bash
# Update Docker images
docker compose pull

# Restart services
docker compose down
docker compose --profile <your-profile> up -d
```

### 5. Backup Configuration

```bash
# Regular backups
cp .env .env.backup.$(date +%Y%m%d)

# Backup volumes
docker run --rm -v kaspa-node-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/kaspa-node-backup.tar.gz /data
```

### 6. Monitor Logs

```bash
# Check for errors regularly
docker logs kaspa-node | grep -i error
docker logs kaspa-dashboard | grep -i error

# Set up log rotation
# (Docker handles this automatically)
```

### 7. Limit Wizard Access

```bash
# Only bind to localhost (default)
# Don't expose wizard port publicly

# Use authentication token
export WIZARD_SECURITY_TOKEN=$(openssl rand -hex 32)
```

---

## FAQ

### General Questions

**Q: Do I need to keep the wizard running?**  
A: No. Stop the wizard after configuration to free up resources:
```bash
./scripts/wizard.sh stop
```

**Q: Can I run multiple profiles at once?**  
A: Yes! Select multiple profiles in the wizard or use:
```bash
docker compose --profile core --profile prod up -d
```

**Q: How do I update to the latest version?**  
A: Pull the latest code and rebuild:
```bash
git pull
docker compose pull
docker compose --profile <your-profile> up -d
```

**Q: Where is my configuration stored?**  
A: In the `.env` file in the project root directory.

**Q: Can I edit the configuration manually?**  
A: Yes, edit `.env` directly, then restart services:
```bash
nano .env
docker compose down
docker compose --profile <your-profile> up -d
```

### Profile Questions

**Q: Which profile should I choose?**  
A: Start with **Core** for basic node operation. Add more profiles later as needed.

**Q: Can I change profiles later?**  
A: Yes! Use reconfigure mode:
```bash
./scripts/wizard.sh reconfigure
```

**Q: What's the difference between Explorer and Archive?**  
A: Explorer indexes recent data. Archive keeps all historical data indefinitely.

**Q: Do I need the Development profile?**  
A: Only if you're developing or debugging. It includes extra management tools.

### Technical Questions

**Q: How much disk space do I need?**  
A: Minimum 100GB for Core, 500GB for Explorer, 1TB+ for Archive.

**Q: How long does sync take?**  
A: Initial sync: 2-6 hours depending on internet speed and hardware.

**Q: Can I run this on a Raspberry Pi?**  
A: Core profile works on Pi 4 (8GB RAM). Other profiles need more resources.

**Q: Does this work on Windows?**  
A: Yes, with Docker Desktop and WSL2. See Docker installation guide.

**Q: Can I run this in the cloud?**  
A: Yes! Works on AWS, GCP, Azure, DigitalOcean, etc.

### Troubleshooting Questions

**Q: Wizard shows "Connection refused"**  
A: Check if wizard is running:
```bash
./scripts/wizard.sh status
docker logs kaspa-wizard
```

**Q: Installation keeps failing**  
A: Check disk space, internet connection, and Docker logs:
```bash
df -h
docker logs kaspa-wizard
```

**Q: Services won't start**  
A: Check service logs:
```bash
docker logs <service-name>
```

**Q: How do I reset everything?**  
A: Stop services and remove volumes:
```bash
docker compose down -v
rm .env .wizard-state
./scripts/wizard.sh start
```

---

## Additional Resources

### Documentation

- [Quick Start Guide](../services/wizard/QUICKSTART.md)
- [Integration Guide](../services/wizard/INTEGRATION.md)
- [Testing Guide](../services/wizard/TESTING.md)
- [Main README](../README.md)
- [Deployment Profiles](./deployment-profiles.md)
- [Service Dependencies](./service-dependencies.md)

### Scripts

- `./scripts/wizard.sh` - Wizard management
- `./scripts/manage.sh` - Service management
- `./scripts/health-check.sh` - System health check
- `./test-wizard-integration.sh` - Wizard testing

### Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check docs/ directory
- **Community**: Join Discord/Telegram (links in main README)

---

## Video Tutorial (Planned)

A video tutorial covering the complete installation process is planned for Phase 6.5.3. It will include:

- Installation overview (10 minutes)
- Docker installation guides (macOS, Windows, Linux)
- Profile selection guide
- Post-installation tour
- Common troubleshooting scenarios

Check back soon or watch the GitHub repository for updates!

---

## Conclusion

The Kaspa All-in-One Installation Wizard makes it easy to set up and manage your Kaspa infrastructure. Whether you're running a simple node or a complex multi-service deployment, the wizard guides you through every step.

**Key Takeaways:**

✅ Start with the Core profile if you're new  
✅ Use reconfigure mode to modify your setup  
✅ Run tests to validate your installation  
✅ Stop the wizard when not in use  
✅ Keep your configuration backed up  
✅ Check logs if something goes wrong  

**Need Help?**

- Run `./test-wizard-integration.sh` to diagnose issues
- Check `./scripts/wizard.sh status` for wizard state
- Review logs with `docker logs kaspa-wizard`
- Consult the troubleshooting section above
- Open a GitHub issue with diagnostic information

Happy node running! 🚀
