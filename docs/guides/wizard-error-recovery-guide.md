# Wizard Error Recovery Guide

This guide provides comprehensive procedures for recovering from errors during template selection, installation, and configuration in the Kaspa All-in-One Installation Wizard.

## 🚨 Quick Recovery Actions

### Immediate Steps for Any Error
1. **Don't Panic**: Most errors are recoverable
2. **Note the Error**: Take a screenshot or copy the error message
3. **Check System Resources**: Ensure adequate CPU, RAM, and disk space
4. **Verify Docker**: Confirm Docker is running and accessible
5. **Use Built-in Help**: Click "Need Help?" in the wizard for immediate assistance

### Emergency Recovery
If the wizard becomes completely unresponsive:
```bash
# Stop the wizard
docker compose --profile wizard down

# Clear any stuck containers
docker system prune -f

# Restart the wizard
docker compose --profile wizard up -d

# Access at http://localhost:3000
```

## 🎯 Template-Specific Error Recovery

### Template Loading Failures

#### Symptoms
- Templates don't appear in the selection screen
- "Failed to load templates" error message
- Blank template cards or loading indicators that never complete

#### Causes
- Network connectivity issues
- Backend API service problems
- Corrupted template data
- Insufficient system resources

#### Recovery Steps

**Step 1: Check Network Connectivity**
```bash
# Test internet connection
ping -c 4 google.com

# Test local wizard connectivity
curl -f http://localhost:3000/api/health
```

**Step 2: Restart Wizard Services**
```bash
# Restart wizard with fresh containers
docker compose --profile wizard down
docker compose --profile wizard pull
docker compose --profile wizard up -d
```

**Step 3: Clear Browser Cache**
- Hard refresh: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache and cookies for localhost:3000
- Try a different browser or incognito/private mode

**Step 4: Use Fallback Option**
If templates still won't load:
1. Click "Build Custom" to bypass template loading
2. Select services manually from the custom setup grid
3. Continue with manual configuration

### Template Application Failures

#### Symptoms
- "Failed to apply template" error after clicking "Use Template"
- Template appears to apply but configuration step shows errors
- Services listed in template don't appear in configuration

#### Causes
- Template validation failures
- Resource conflicts with existing services
- Configuration incompatibilities
- Backend processing errors

#### Recovery Steps

**Step 1: Validate System Resources**
```bash
# Check available resources
docker system df
free -h
df -h
```

**Step 2: Clear Conflicting Services**
```bash
# Stop any running Kaspa services
docker compose down

# Remove any conflicting containers
docker container prune -f

# Remove unused networks
docker network prune -f
```

**Step 3: Try Alternative Template**
1. Go back to template selection
2. Choose a lighter template (e.g., Home Node instead of Explorer)
3. Verify the alternative template applies successfully

**Step 4: Switch to Custom Setup**
If template application continues to fail:
1. Click "Build Custom" in the template selection screen
2. Manually select the services from your desired template
3. Configure each service individually

### Template Configuration Errors

#### Symptoms
- Configuration fields show validation errors
- "Invalid configuration" messages
- Unable to proceed from configuration step
- Missing or incorrect default values

#### Causes
- Template configuration conflicts
- Invalid default values
- Resource allocation problems
- Network port conflicts

#### Recovery Steps

**Step 1: Reset Configuration**
1. Click "Reset to Defaults" in the configuration step
2. Allow the wizard to reload template defaults
3. Verify all fields show valid values

**Step 2: Manual Configuration Fix**
1. Review each configuration field with errors
2. Use the field help text to understand requirements
3. Adjust values to meet validation requirements
4. Test configuration before proceeding

**Step 3: Port Conflict Resolution**
```bash
# Check for port conflicts
netstat -tulpn | grep -E ':(3000|8080|16111|5432)'

# Stop conflicting services if found
sudo systemctl stop [conflicting-service]
```

**Step 4: Resource Adjustment**
1. Reduce resource allocations if system warnings appear
2. Disable optional services to reduce resource usage
3. Consider switching to a lighter template

## ⚙️ Custom Setup Error Recovery

### Service Selection Issues

#### Symptoms
- Services don't appear in the custom setup grid
- Unable to select or deselect services
- "Invalid service combination" errors
- Missing dependency warnings

#### Recovery Steps

**Step 1: Refresh Service List**
1. Refresh the browser page
2. Clear browser cache if services still don't appear
3. Check browser console for JavaScript errors

**Step 2: Dependency Resolution**
1. Review dependency warnings carefully
2. Add required services highlighted in warnings
3. Remove conflicting services if indicated
4. Use the "Auto-resolve Dependencies" button if available

**Step 3: Start with Minimal Setup**
1. Select only Kaspa Node and Management Dashboard
2. Verify this minimal setup works
3. Add additional services one at a time
4. Test each addition before proceeding

### Custom Configuration Complexity

#### Symptoms
- Overwhelmed by configuration options
- Unsure about service interactions
- Configuration validation errors
- Performance concerns

#### Recovery Steps

**Step 1: Use Template as Reference**
1. Open a new browser tab with the wizard
2. Select a similar template to see its configuration
3. Use template values as reference for custom setup
4. Copy successful template configurations

**Step 2: Simplify Configuration**
1. Use default values for most settings
2. Only customize essential settings (ports, passwords)
3. Leave advanced options at defaults initially
4. Optimize later after successful installation

**Step 3: Seek Community Help**
1. Use the wizard's "Need Help?" feature
2. Generate a diagnostic report (sensitive data redacted)
3. Share configuration questions in Discord or GitHub Discussions
4. Reference template documentation for guidance

## 🔧 Installation Error Recovery

### Installation Failures

#### Symptoms
- Installation progress stops or fails
- Services fail to start after installation
- "Installation failed" error messages
- Partial installation with some services missing

#### Causes
- Insufficient system resources
- Network connectivity issues
- Docker daemon problems
- Service configuration errors
- Port conflicts

#### Recovery Steps

**Step 1: Check Installation Logs**
1. Review the installation progress log in the wizard
2. Look for specific error messages or failed services
3. Note which phase of installation failed

**Step 2: Resource Verification**
```bash
# Check system resources during installation
docker stats
htop  # or top
df -h
```

**Step 3: Manual Service Recovery**
```bash
# Check service status
docker compose ps

# Restart failed services
docker compose restart [service-name]

# View service logs
docker compose logs [service-name]
```

**Step 4: Clean Installation Retry**
```bash
# Stop all services
docker compose down

# Clean up containers and networks
docker system prune -f

# Restart installation from wizard
# Use same configuration but monitor resources
```

### Partial Installation Recovery

#### Symptoms
- Some services running, others failed
- Mixed service states in Management Dashboard
- Incomplete functionality

#### Recovery Steps

**Step 1: Identify Failed Services**
```bash
# List all containers and their status
docker compose ps -a

# Check logs for failed services
docker compose logs [failed-service]
```

**Step 2: Targeted Service Recovery**
```bash
# Restart specific failed services
docker compose up -d [service-name]

# Force recreate if needed
docker compose up -d --force-recreate [service-name]
```

**Step 3: Configuration Verification**
1. Check service configuration in `.env` file
2. Verify port assignments don't conflict
3. Ensure resource limits are appropriate
4. Validate service dependencies are met

**Step 4: Incremental Recovery**
1. Start with core services (Kaspa Node, Dashboard)
2. Verify core services are healthy
3. Add additional services one at a time
4. Test each service before adding the next

## 🌐 Network and Connectivity Issues

### Network Configuration Errors

#### Symptoms
- Services can't communicate with each other
- External access not working
- Port binding failures
- DNS resolution issues

#### Recovery Steps

**Step 1: Network Diagnostics**
```bash
# Check Docker networks
docker network ls

# Inspect service network configuration
docker network inspect kaspa-aio_default

# Test internal connectivity
docker exec kaspa-node ping kaspa-dashboard
```

**Step 2: Port Conflict Resolution**
```bash
# Find processes using required ports
sudo netstat -tulpn | grep -E ':(3000|8080|16111)'

# Stop conflicting processes
sudo systemctl stop [conflicting-service]
sudo kill [process-id]
```

**Step 3: Firewall Configuration**
```bash
# Check firewall status
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-all  # CentOS/RHEL

# Allow required ports
sudo ufw allow 8080/tcp
sudo ufw allow 16111/tcp
```

**Step 4: Network Reset**
```bash
# Stop all services
docker compose down

# Remove custom networks
docker network prune -f

# Restart services (networks will be recreated)
docker compose up -d
```

### External Access Issues

#### Symptoms
- Can't access services from other machines
- Public node not accessible from internet
- Management Dashboard not reachable externally

#### Recovery Steps

**Step 1: Verify Service Binding**
```bash
# Check which interfaces services are bound to
netstat -tulpn | grep -E ':(8080|16111)'

# Should show 0.0.0.0:port for external access
```

**Step 2: Router/Firewall Configuration**
1. Check router port forwarding settings
2. Verify firewall allows inbound connections
3. Test from external network or online port checker
4. Consider using UPnP if available

**Step 3: Dynamic DNS Setup**
If using dynamic IP:
1. Configure dynamic DNS service
2. Update configuration with DDNS hostname
3. Test external access with hostname

## 🔄 State Recovery and Reset

### Wizard State Issues

#### Symptoms
- Wizard shows incorrect step or state
- Configuration appears corrupted
- Navigation buttons not working
- Progress indicator shows wrong step

#### Recovery Steps

**Step 1: Browser State Reset**
1. Clear browser local storage for localhost:3000
2. Clear browser cookies and cache
3. Hard refresh the page (Ctrl+F5)
4. Try incognito/private browsing mode

**Step 2: Wizard State Reset**
```bash
# Restart wizard to reset server-side state
docker compose --profile wizard restart

# Clear any persistent state files
docker compose --profile wizard down
docker volume rm kaspa-aio_wizard-data 2>/dev/null || true
docker compose --profile wizard up -d
```

**Step 3: Manual State Recovery**
1. Note your current configuration choices
2. Start wizard from beginning
3. Quickly navigate through steps using previous choices
4. Verify state is consistent at each step

### Configuration Persistence Issues

#### Symptoms
- Configuration changes not saved
- Settings revert to defaults
- Installation uses wrong configuration
- State lost between wizard sessions

#### Recovery Steps

**Step 1: Verify Browser Storage**
1. Check browser developer tools → Application → Local Storage
2. Verify wizard state is being saved
3. Clear and reload if storage appears corrupted

**Step 2: Backend State Verification**
```bash
# Check wizard backend logs
docker compose logs wizard-backend

# Look for state save/load errors
docker compose logs wizard-backend | grep -i "state\|config"
```

**Step 3: Manual Configuration Backup**
1. Export current configuration from wizard
2. Save configuration to local file
3. Use saved configuration to restore if needed

## 🛠️ Advanced Recovery Techniques

### Docker Environment Recovery

#### Complete Docker Reset
```bash
# WARNING: This removes ALL Docker data
docker system prune -a --volumes -f

# Restart Docker daemon
sudo systemctl restart docker

# Verify Docker is working
docker run hello-world
```

#### Selective Docker Cleanup
```bash
# Remove only Kaspa-related containers
docker ps -a | grep kaspa | awk '{print $1}' | xargs docker rm -f

# Remove only Kaspa-related images
docker images | grep kaspa | awk '{print $3}' | xargs docker rmi -f

# Remove only Kaspa-related volumes
docker volume ls | grep kaspa | awk '{print $2}' | xargs docker volume rm
```

### System Resource Recovery

#### Memory Issues
```bash
# Clear system caches
sudo sync && sudo sysctl vm.drop_caches=3

# Check for memory leaks
ps aux --sort=-%mem | head -10

# Restart high-memory processes if needed
sudo systemctl restart docker
```

#### Disk Space Issues
```bash
# Clean Docker system
docker system prune -a --volumes -f

# Clean system logs
sudo journalctl --vacuum-time=7d

# Clean package caches
sudo apt clean  # Ubuntu/Debian
sudo yum clean all  # CentOS/RHEL
```

### Configuration File Recovery

#### Backup and Restore
```bash
# Create configuration backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Restore from backup
cp .env.backup.YYYYMMDD_HHMMSS .env

# Verify configuration
docker compose config
```

#### Template Configuration Export
```bash
# Export current configuration
docker compose config > current-config.yml

# Use as reference for manual recovery
# Compare with working configurations
```

## 📊 Diagnostic Tools and Reporting

### Built-in Diagnostic Tools

#### Wizard Diagnostic Report
1. Click "Need Help?" in any wizard step
2. Go to "Diagnostic Report" tab
3. Click "Generate Report"
4. Review report for issues and solutions
5. Copy or download for support requests

#### System Health Check
```bash
# Run comprehensive health check
./scripts/health-check.sh

# Verbose output with details
./scripts/health-check.sh -v

# JSON output for automation
./scripts/health-check.sh -j
```

### Manual Diagnostic Commands

#### System Information
```bash
# System resources
free -h
df -h
lscpu
uname -a

# Docker information
docker version
docker info
docker system df
```

#### Service Status
```bash
# All services status
docker compose ps

# Detailed service information
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Service logs
docker compose logs --tail=50 [service-name]
```

#### Network Diagnostics
```bash
# Network connectivity
ping -c 4 8.8.8.8
curl -I http://localhost:8080

# Port availability
netstat -tulpn | grep -E ':(3000|8080|16111)'

# DNS resolution
nslookup localhost
```

## 🆘 Emergency Contacts and Support

### Immediate Help Resources

#### Built-in Help System
- **Search Common Issues**: Database of 10+ common problems with solutions
- **Diagnostic Reports**: One-click system diagnostics with automatic data redaction
- **Template-Specific Help**: Guidance specific to your chosen template or custom setup
- **Community Links**: Direct access to Discord, GitHub, and forums

#### Self-Service Resources
- **Troubleshooting Guide**: [docs/troubleshooting.md](../troubleshooting.md)
- **FAQ**: [docs/faq.md](../faq.md)
- **Service Documentation**: Individual service documentation in `services/` directories
- **GitHub Issues**: Search existing issues for similar problems

### Community Support

#### Real-Time Help
- **Discord**: [Kaspa Community Discord](https://discord.gg/kaspa) - Active community with experienced users
- **Response Time**: Usually within hours during active periods
- **Best For**: Quick questions, real-time troubleshooting, community discussion

#### Structured Support
- **GitHub Issues**: [GitHub Issues](https://github.com/jtmac69/Kaspa-All-in-One/issues) - Bug reports and feature requests
- **GitHub Discussions**: [GitHub Discussions](https://github.com/jtmac69/Kaspa-All-in-One/discussions) - General questions and ideas
- **Kaspa Forum**: [forum.kaspa.org](https://forum.kaspa.org) - Community Q&A and detailed discussions

### Professional Support

#### Enterprise Support
- **Business Deployments**: Professional support for enterprise installations
- **SLA Options**: Service level agreements for critical deployments
- **Custom Solutions**: Tailored solutions for specific business needs
- **Training**: Professional training for teams and administrators

#### Consulting Services
- **Architecture Review**: Professional review of deployment architecture
- **Performance Optimization**: Expert optimization for high-performance deployments
- **Security Audit**: Security review and hardening recommendations
- **Custom Development**: Professional development of custom templates or services

## 📋 Recovery Checklist

### Before Seeking Help

- [ ] Tried restarting the wizard
- [ ] Checked system resources (CPU, RAM, disk)
- [ ] Verified Docker is running
- [ ] Cleared browser cache and cookies
- [ ] Generated diagnostic report from wizard
- [ ] Checked service logs for specific errors
- [ ] Tried alternative template or custom setup
- [ ] Searched existing GitHub issues and discussions

### Information to Provide When Seeking Help

- [ ] Operating system and version
- [ ] Hardware specifications (CPU, RAM, storage)
- [ ] Docker and Docker Compose versions
- [ ] Template or custom setup being used
- [ ] Specific error messages (screenshots helpful)
- [ ] Diagnostic report from wizard (sensitive data redacted)
- [ ] Steps to reproduce the issue
- [ ] What you've already tried to fix it

### Recovery Success Indicators

- [ ] Wizard loads and navigates properly
- [ ] Template or custom setup applies successfully
- [ ] All selected services start and show healthy status
- [ ] Management Dashboard accessible and shows correct information
- [ ] External access working if configured
- [ ] No error messages in service logs
- [ ] System resources within acceptable ranges

---

**Remember**: Most errors are recoverable, and the community is here to help. Don't hesitate to ask for assistance when you need it!