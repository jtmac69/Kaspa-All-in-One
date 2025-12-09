# Known Issues - Test Release v0.9.0

## Quick Reference

**Most Common Issues Testers Encounter:**
1. 🕐 **Node sync takes hours** → See [Node Sync Time](#node-sync-time) - Use "Continue in background"
2. ⏱️ **Kasia build takes 5-10 minutes** → See [Kasia App Build Time](#kasia-app-build-time) - Normal, be patient
3. 🪟 **Windows users** → See [Windows Native Not Supported](#windows-native-not-supported) - Requires WSL2
4. 🔌 **Port conflicts** → See [Port Conflicts](#port-conflicts) - Change ports in wizard
5. 📊 **Dashboard not available** → See [Dashboard Not Included](#dashboard-not-included-in-test-release) - Use `docker ps` and `./status.sh`

**Before You Start Testing:**
- ✅ Docker 20.10+ installed
- ✅ Docker Compose 2.0+ installed
- ✅ Node.js 18+ installed
- ✅ 4GB RAM, 20GB disk space available
- ✅ Stable internet connection

**Need Help?** See [TESTING.md](TESTING.md) for detailed instructions and troubleshooting.

---

## Critical Issues

None currently.

## High Priority Issues

### Node Sync Time
**Issue**: Kaspa node synchronization can take several hours to complete (typically 4-8 hours depending on network speed and system resources)

**Severity**: High

**Impact**: 
- Initial installation appears to "hang" during sync phase
- Users may think the installation has failed
- Testing cannot proceed until sync completes

**Workaround**: 
- Use the "Continue in background" option in the wizard
- Monitor sync progress via the dashboard at http://localhost:8080
- Check sync status using `./status.sh` script
- The node will continue syncing even if you close the wizard

**Technical Details**:
- The Kaspa blockchain must download and verify all historical blocks
- Sync time varies based on:
  - Internet connection speed (download bandwidth)
  - System CPU and disk I/O performance
  - Current blockchain size (grows over time)
  - Network peer availability

**Status**: By design (blockchain synchronization is required for node operation)

**Expected Behavior**:
- Wizard shows sync progress percentage
- Dashboard displays current block height vs. network height
- Logs show sync activity in real-time
- Services remain healthy during sync

### Kasia App Build Time

**Issue**: ~~The Kasia application fails to build from source~~ **FIXED** - Now builds successfully but takes 5-10 minutes

**Severity**: ~~High~~ **Low** (informational)

**Status**: **FIXED** - Builds successfully by downloading pre-built kaspa-wasm binaries

**What Was Fixed**:
The Kasia v0.6.2 release requires `kaspa-wasm` which wasn't available in the repository. The fix downloads pre-built WASM binaries from the same source used by Kasia's official CI pipeline.

**Solution Implemented**:
- Downloads pre-built `kaspa-wasm` from `IzioDev/rusty-kaspa` releases (v1.0.1-beta1)
- Matches the exact approach used in Kasia's GitHub Actions workflow
- Clones with `--recurse-submodules` for tauri-plugin-biometry dependency
- Builds cipher WASM module and compiles the application

**Build Time Expectations**:
- **First build**: 5-10 minutes (depending on system resources and internet speed)
- **Subsequent builds**: Faster due to Docker layer caching
- Build includes: Rust/WASM compilation, npm dependencies, and application bundling

**What Happens During Build**:
1. Downloads pre-built kaspa-wasm binaries (~2-3 minutes)
2. Installs Rust toolchain and wasm-pack (~1-2 minutes)
3. Builds cipher WASM module (~1 minute)
4. Installs npm dependencies (~1-2 minutes)
5. Compiles TypeScript and bundles application (~2-3 minutes)

**Testing Impact**:
- ✅ Kasia app (port 3001) - **Now builds and works correctly**
- ✅ K-Social app (port 3003) - Works correctly
- ✅ Kaspa Explorer (port 3004) - Works correctly
- ✅ Installation wizard - Completes successfully
- ✅ "Kaspa User Applications" profile - Fully functional

**For Testers**:
- Expect a 5-10 minute build time when Kasia is included in your profile
- The wizard will show "Building kasia-app..." during this time
- This is normal - the build is compiling from source for security and reproducibility
- Subsequent installations will be faster due to Docker caching
- You can monitor build progress in the wizard or check Docker logs

**Why Build from Source**:
- **Security**: You can verify exactly what's being built
- **Reproducibility**: Anyone can build the same image from source
- **Flexibility**: Easy to update to newer Kasia versions
- **No external dependencies**: Doesn't rely on pre-built images that might disappear
- **Matches upstream**: Uses the same approach as Kasia's official CI

**Technical Details**:
- Uses Kasia v0.6.2 stable release
- Downloads kaspa-wasm32-sdk-v1.0.1-beta1.zip from IzioDev/rusty-kaspa
- Builds with Node 20 Alpine base image
- Final image size: ~50MB (nginx + built application)

## Medium Priority Issues

### Windows Native Not Supported
**Issue**: Windows requires WSL2 (Windows Subsystem for Linux) - native Windows is not supported

**Severity**: Medium

**Impact**:
- Cannot run directly on Windows Command Prompt or PowerShell
- Requires additional setup steps for Windows users
- Windows-specific Docker configurations may cause issues

**Requirements for Windows Users**:
1. **Windows 10 version 2004+** or **Windows 11** (required for WSL2)
2. **WSL2** installed and configured
3. **Docker Desktop for Windows** with WSL2 backend enabled
4. **Ubuntu 20.04+** or **Debian** distribution installed in WSL2

**Setup Instructions for Windows**:

1. **Install WSL2**:
   ```powershell
   # Run in PowerShell as Administrator
   wsl --install
   ```
   Or follow detailed guide: https://docs.microsoft.com/en-us/windows/wsl/install

2. **Install a Linux Distribution**:
   ```powershell
   # Install Ubuntu (recommended)
   wsl --install -d Ubuntu
   ```

3. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop
   - During installation, ensure "Use WSL 2 instead of Hyper-V" is selected
   - After installation, go to Settings → General → Enable "Use the WSL 2 based engine"
   - Go to Settings → Resources → WSL Integration → Enable integration with your Ubuntu distribution

4. **Verify Setup**:
   ```bash
   # Open WSL2 terminal (Ubuntu)
   wsl
   
   # Verify Docker works
   docker --version
   docker run hello-world
   ```

5. **Run Kaspa All-in-One**:
   - Extract the test package in your WSL2 home directory (not Windows filesystem)
   - Run all commands from WSL2 terminal: `./start-test.sh`

**Common Windows/WSL2 Issues**:

- **Slow Performance**: Avoid placing files on Windows filesystem (`/mnt/c/`). Use WSL2 home directory (`~/`) instead
- **Docker Not Found**: Ensure Docker Desktop is running and WSL2 integration is enabled
- **Permission Errors**: Run commands from WSL2 terminal, not Windows terminal
- **Network Issues**: Check Windows Firewall settings if services aren't accessible

**Workaround**: 
- Install WSL2 following the instructions above
- Install Docker Desktop for Windows with WSL2 backend
- Run all commands from within WSL2 terminal (Ubuntu/Debian)
- Keep all project files in WSL2 filesystem for best performance

**Status**: Won't fix (architectural decision - Docker-based deployment requires Linux environment)

**Why WSL2 is Required**:
- Kaspa All-in-One uses Docker containers which require a Linux kernel
- WSL2 provides a full Linux kernel on Windows
- Native Windows Docker support (Hyper-V) has compatibility issues with our stack
- Shell scripts (`.sh` files) require a bash environment

## Low Priority Issues

### Port Conflicts
**Issue**: Default ports may conflict with existing services on your system

**Severity**: Low

**Impact**:
- Services may fail to start if ports are already in use
- Error messages like "address already in use" or "bind: address already in use"
- Wizard or services may appear to start but be inaccessible

**Affected Ports and Common Conflicts**:

| Port | Service | Common Conflicts |
|------|---------|------------------|
| 3000 | Installation Wizard | Node.js dev servers, React apps, other web apps |
| 8080 | Dashboard | Jenkins, Tomcat, other web servers, proxy servers |
| 5432 | PostgreSQL/TimescaleDB | Existing PostgreSQL installations |
| 16110 | Kaspa Node RPC | Other Kaspa node instances |
| 16111 | Kaspa Node P2P | Other Kaspa node instances |
| 18787 | Kasia Application | Custom applications |
| 3001 | K-Social Backend | Node.js applications |
| 3002 | Simply Kaspa Indexer | Custom services |

**How to Detect Port Conflicts**:

1. **Before Installation** - Check if ports are in use:
   ```bash
   # Linux/macOS
   sudo lsof -i :3000
   sudo lsof -i :8080
   sudo lsof -i :16110
   
   # Or using netstat
   netstat -tuln | grep -E ':(3000|8080|16110|16111|18787)'
   
   # Or using ss (modern Linux)
   ss -tuln | grep -E ':(3000|8080|16110|16111|18787)'
   ```

2. **During Installation** - Watch for error messages:
   - "Error: listen EADDRINUSE: address already in use"
   - "Cannot start service: port is already allocated"
   - "bind: address already in use"

3. **After Installation** - Use the status script:
   ```bash
   ./status.sh
   ```

**Resolution Options**:

1. **Option 1: Change Ports in Wizard** (Recommended)
   - During the configuration step, the wizard allows you to customize ports
   - Choose alternative ports that don't conflict
   - Example alternatives:
     - Wizard: 3100 instead of 3000
     - Dashboard: 8888 instead of 8080
     - Kaspa RPC: 16210 instead of 16110

2. **Option 2: Stop Conflicting Services**
   ```bash
   # Find what's using the port
   sudo lsof -i :8080
   
   # Stop the conflicting service (example)
   sudo systemctl stop jenkins  # if Jenkins is using 8080
   sudo systemctl stop tomcat   # if Tomcat is using 8080
   
   # Or kill the process directly
   kill <PID>  # Use PID from lsof output
   ```

3. **Option 3: Use Docker Port Mapping**
   - If you're comfortable with Docker, you can modify `docker-compose.yml`
   - Change the external port (left side) while keeping internal port (right side):
     ```yaml
     ports:
       - "8888:8080"  # Access on 8888, internal still 8080
     ```

**Common Scenarios**:

1. **Development Machine with Multiple Projects**:
   - Problem: Port 3000 often used by React/Next.js dev servers
   - Solution: Change wizard port to 3100 or stop dev server temporarily

2. **Server with Existing Web Services**:
   - Problem: Port 8080 commonly used by Jenkins, Tomcat, or other web servers
   - Solution: Use alternative port like 8888 or 9090 for dashboard

3. **Multiple Kaspa Installations**:
   - Problem: Running multiple Kaspa nodes on same machine
   - Solution: Each installation needs unique ports for RPC (16110) and P2P (16111)

4. **PostgreSQL Already Installed**:
   - Problem: System PostgreSQL using port 5432
   - Solution: Docker PostgreSQL will conflict - either stop system PostgreSQL or change Docker port

**Prevention Tips**:

- Run `./status.sh` before starting installation to check current port usage
- Keep a list of ports used by your other services
- Use non-standard port ranges (e.g., 8888-8899) to avoid common conflicts
- Document your port choices for future reference

**Workaround**: 
- Change ports during the configuration step in the wizard
- Stop conflicting services temporarily before installation
- Use `./status.sh` to check which ports are in use
- Modify `docker-compose.yml` for advanced port customization

**Status**: Will improve automatic port detection and conflict resolution in future releases

**Future Improvements Planned**:
- Automatic port conflict detection before installation
- Suggested alternative ports when conflicts detected
- One-click port conflict resolution
- Port availability testing in wizard

## Limitations

These are known limitations of the test release, categorized by their impact on testing and usage.

### System Requirements and Prerequisites

1. **Docker Required** [Severity: High]
   
   The wizard cannot install Docker automatically - you must install it before running the test
   - Docker 20.10+ required
   - Docker Compose 2.0+ required
   - Must have permission to run Docker commands (user must be in `docker` group on Linux)
   
   **Workaround**:
   - **Linux**: Install Docker using official script:
     ```bash
     curl -fsSL https://get.docker.com -o get-docker.sh
     sudo sh get-docker.sh
     sudo usermod -aG docker $USER
     # Log out and back in for group changes to take effect
     ```
   - **macOS**: Download Docker Desktop from https://www.docker.com/products/docker-desktop
   - **Windows**: Install Docker Desktop with WSL2 backend (see Windows/WSL2 issue above)
   - Verify installation: `docker --version && docker-compose --version`

2. **Node.js Required** [Severity: High]
   
   Node.js 18+ must be installed for the wizard backend
   - Cannot be installed automatically by the wizard
   - Required for wizard dependencies (`npm install`)
   
   **Workaround**:
   - **Linux**: Use NodeSource repository:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
   - **macOS**: Use Homebrew:
     ```bash
     brew install node@18
     ```
   - **Windows/WSL2**: Install in WSL2 terminal:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
   - **Alternative**: Use nvm (Node Version Manager) for any platform:
     ```bash
     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
     nvm install 18
     nvm use 18
     ```
   - Verify installation: `node --version` (should show v18.x.x or higher)

3. **Internet Required** [Severity: High]
   
   Initial setup requires internet connection for:
   - Downloading Docker images (can be several GB)
   - Blockchain synchronization (continuous during sync)
   - Installing npm dependencies for wizard
   - Accessing external indexers (if using public indexers option)
   
   **Workaround**:
   - **For slow connections**: Download Docker images in advance during off-peak hours:
     ```bash
     docker-compose pull
     ```
   - **For intermittent connections**: 
     - Docker will resume interrupted downloads automatically
     - Node sync will resume from last checkpoint after reconnection
     - Use `./stop-services.sh` to pause and `./restart-services.sh` to resume
   - **For offline testing**: Not possible for initial setup, but after installation:
     - Services can run offline (except blockchain sync)
     - Dashboard and local applications remain accessible
     - Public indexer features will be unavailable

4. **Resource Usage** [Severity: High]
   
   Minimum system requirements:
   - **RAM**: 4GB minimum (8GB recommended, 16GB+ for multiple profiles)
   - **Disk Space**: 20GB minimum (50GB+ recommended for full node, 100GB+ for archive node)
   - **CPU**: 2 cores minimum (4+ recommended for better performance)
   - **Network**: Stable internet connection (faster is better for blockchain sync)
   
   **Workaround**:
   - **Low RAM systems**: 
     - Choose "Core Profile" only (minimal services)
     - Close other applications during installation
     - Monitor with `./status.sh` to check resource usage
     - Consider adding swap space (Linux):
       ```bash
       sudo fallocate -l 4G /swapfile
       sudo chmod 600 /swapfile
       sudo mkswap /swapfile
       sudo swapon /swapfile
       ```
   - **Low disk space**:
     - Use external drive or network storage for Docker volumes
     - Regularly clean up Docker: `docker system prune -a`
     - Choose profiles without indexers (they require more space)
   - **Slow CPU**:
     - Expect longer sync times
     - Use "Continue in background" option
     - Consider using public indexers instead of running your own

5. **Platform Support** [Severity: Medium]
   
   - **Linux**: Ubuntu 20.04+, Debian 11+, RHEL 8+, Fedora 35+
   - **macOS**: 11.0+ (Big Sur or later)
   - **Windows**: WSL2 only (native Windows not supported)
   - **Architecture**: x86_64/amd64 only (ARM/Apple Silicon may have compatibility issues)

### Deployment and Configuration Limitations

6. **Single Node Only** [Severity: Low]
   
   This release supports single-node deployments only
   - No multi-node configurations
   - No high availability setups
   - No load balancing across multiple nodes
   - No clustering support

7. **Local Deployment Only** [Severity: Low]
   
   Designed for local/single-server deployment
   - No distributed deployment across multiple servers
   - No cloud-native deployment patterns (Kubernetes, etc.)
   - All services must run on the same machine

8. **No Production Hardening** [Severity: Medium]
   
   This is a test release, not production-ready
   - No production-grade security configurations
   - No SSL/TLS certificates (HTTP only by default)
   - No advanced firewall configurations
   - No intrusion detection/prevention
   - Basic authentication only (no OAuth, SAML, etc.)

9. **Limited Monitoring** [Severity: Low]
   
   Basic monitoring only
   - No production-grade monitoring (Prometheus, Grafana, etc.)
   - No alerting system for service failures
   - No performance metrics collection
   - No log aggregation or analysis tools
   - Dashboard provides basic status only

10. **Dashboard Not Included in Test Release** [Severity: Medium]
    
    Management dashboard is not included in this test release
    - Dashboard is still in development and not ready for testing
    - Use `docker ps` to check service status
    - Use `docker logs <container-name>` to view service logs
    - Use `./status.sh` script for quick service overview
    - Wizard at http://localhost:3000 can be used for reconfiguration
    - Dashboard will be included in future releases once fully tested
    
    **Workaround**:
    - **Check service status**:
      ```bash
      # View all running containers
      docker ps
      
      # View all containers (including stopped)
      docker ps -a
      
      # Use the status script
      ./status.sh
      ```
    - **View service logs**:
      ```bash
      # View logs for specific service
      docker logs kaspa-node
      docker logs -f kaspa-node  # Follow logs in real-time
      
      # View logs for all services
      docker-compose logs
      docker-compose logs -f  # Follow all logs
      ```
    - **Check resource usage**:
      ```bash
      # View resource usage for all containers
      docker stats
      
      # View for specific container
      docker stats kaspa-node
      ```

11. **No Backup Automation** [Severity: Low]
    
    Manual backup management only
    - No scheduled automatic backups
    - No backup rotation policies
    - No off-site backup support
    - No backup encryption
    - Backups stored locally only (`.kaspa-backups/` directory)

### Operational Limitations

12. **Node Sync Required** [Severity: High]
    
    Full node profiles require complete blockchain sync before full functionality
    - Can take 4-8 hours or more depending on system and network
    - Cannot skip or accelerate initial sync
    - Services dependent on node won't work until sync completes
    - No snapshot/fast-sync option available
    
    **Workaround**:
    - Use "Continue in background" option in wizard
    - Monitor progress via dashboard or `./status.sh`
    - Test other features while sync continues
    - For testing purposes, consider using "Kaspa User Applications" profile with public indexers (no local node sync required)
    - Leave system running overnight for sync to complete

13. **No Automatic Updates** [Severity: Low]
    
    Updates must be applied manually
    - No automatic update checking
    - No one-click update mechanism
    - Must download new release and reconfigure
    - No rolling updates or zero-downtime upgrades
    
    **Workaround**:
    - Watch GitHub releases: https://github.com/[repo]/releases
    - Subscribe to release notifications (Watch → Custom → Releases)
    - Before updating:
      1. Backup your data: Configuration is in `.kaspa-aio/`
      2. Stop services: `./stop-services.sh`
      3. Download new release
      4. Extract and run: `./start-test.sh`
      5. Wizard will detect existing installation and offer to preserve data

14. **No Migration Tools** [Severity: Low]
    
    No automated migration from other setups
    - Cannot import existing Kaspa node data
    - Cannot migrate from other Docker configurations
    - Fresh installation required
    - Manual data migration if needed

15. **Limited Reconfiguration** [Severity: Medium]
    
    Some changes require full reinstallation
    - Changing profiles may require stopping all services
    - Some configuration changes need container recreation
    - Cannot dynamically add/remove services without restart
    - Profile changes may require data resync
    
    **Workaround**:
    - Use `./stop-services.sh` before making changes
    - Reopen wizard at http://localhost:3000 to reconfigure
    - Wizard will detect existing installation and offer update mode
    - For major changes, use `./fresh-start.sh` to start clean (preserves config)
    - Test configuration changes in a separate directory first

16. **No Commercial Support** [Severity: Low]
    
    Community support only
    - No SLA guarantees
    - No dedicated support team
    - No priority bug fixes
    - Support via GitHub Issues and Discussions only

### Network and Security Limitations

17. **Port Conflicts** [Severity: Medium]
    
    Must manually resolve port conflicts
    - No automatic port conflict detection (planned for future)
    - No automatic port reassignment
    - Must manually check and change conflicting ports
    - Default ports may conflict with existing services

18. **No Advanced Networking** [Severity: Low]
    
    Basic Docker networking only
    - No custom network configurations
    - No VPN integration
    - No advanced routing or firewall rules
    - No network isolation between services (all on same Docker network)

19. **No External Database Support** [Severity: Low]
    
    Uses bundled PostgreSQL/TimescaleDB only
    - Cannot connect to external PostgreSQL instances
    - Cannot use managed database services
    - Database runs in Docker container only
    - No database clustering or replication

20. **Limited Security Features** [Severity: Medium]
    
    Basic security only
    - No rate limiting on most endpoints
    - No DDoS protection
    - No Web Application Firewall (WAF)
    - No security scanning or vulnerability detection
    - No audit logging

### Data and Storage Limitations

21. **No Data Export Tools** [Severity: Low]
    
    Limited data export capabilities
    - No built-in data export functionality
    - No database dump automation
    - Must manually export data if needed
    - No data migration tools
    
    **Workaround**:
    - **Export PostgreSQL data**:
      ```bash
      # Find the postgres container name
      docker-compose ps
      
      # Export database
      docker exec <postgres-container> pg_dump -U postgres <database-name> > backup.sql
      ```
    - **Export configuration**:
      ```bash
      # Configuration stored in .kaspa-aio/
      tar -czf kaspa-config-backup.tar.gz .kaspa-aio/
      ```
    - **Export blockchain data**:
      ```bash
      # Blockchain data in Docker volumes
      docker run --rm -v kaspa-node-data:/data -v $(pwd):/backup ubuntu tar czf /backup/kaspa-node-backup.tar.gz /data
      ```

22. **Local Storage Only** [Severity: Low]
    
    All data stored locally
    - No cloud storage integration
    - No network-attached storage (NAS) support
    - No distributed storage systems
    - Limited by local disk capacity

23. **No Data Retention Policies** [Severity: Low]
    
    Manual data management required
    - No automatic log rotation (Docker handles container logs)
    - No automatic cleanup of old data
    - No configurable retention periods
    - Must manually manage disk space
    
    **Workaround**:
    - **Clean up Docker logs**:
      ```bash
      # View log sizes
      docker ps -q | xargs docker inspect --format='{{.LogPath}}' | xargs ls -lh
      
      # Truncate logs
      docker ps -q | xargs docker inspect --format='{{.LogPath}}' | xargs truncate -s 0
      ```
    - **Clean up Docker system**:
      ```bash
      # Remove unused images, containers, networks
      docker system prune -a
      
      # Remove unused volumes (CAUTION: may delete data)
      docker volume prune
      ```
    - **Monitor disk usage**:
      ```bash
      # Check Docker disk usage
      docker system df
      
      # Check volume sizes
      docker volume ls -q | xargs docker volume inspect --format '{{.Name}}: {{.Mountpoint}}' | xargs du -sh
      ```

### Testing and Development Limitations

24. **Test Release Status** [Severity: Medium]
    
    This is a pre-production test release
    - May contain bugs and issues
    - Features may change before v1.0
    - Not recommended for production use
    - Limited testing period (2-4 weeks)

25. **No Development Mode** [Severity: Low]
    
    No special development/debug mode
    - Cannot easily switch between test and production configs
    - No debug logging levels
    - No development-specific features
    - Must modify files manually for debugging
    
    **Workaround**:
    - **Enable verbose logging**:
      ```bash
      # View container logs in real-time
      docker-compose logs -f <service-name>
      
      # View all logs
      docker-compose logs -f
      ```
    - **Access container for debugging**:
      ```bash
      # Get shell access to container
      docker exec -it <container-name> /bin/bash
      
      # Or use sh if bash not available
      docker exec -it <container-name> /bin/sh
      ```
    - **Check service health**:
      ```bash
      # Inspect container details
      docker inspect <container-name>
      
      # Check resource usage
      docker stats <container-name>
      ```

26. **Limited Customization** [Severity: Low]
    
    Limited ability to customize
    - Cannot easily modify Docker images
    - Cannot add custom services without modifying docker-compose.yml
    - Limited configuration options in wizard
    - Advanced customization requires manual file editing
    
    **Workaround**:
    - **Modify docker-compose.yml**: Edit `docker-compose.yml` directly for advanced changes
      - Add environment variables
      - Change port mappings
      - Add volume mounts
      - Adjust resource limits
    - **Add custom services**: Add new service definitions to `docker-compose.yml`
    - **Override configurations**: Create `docker-compose.override.yml` for local customizations:
      ```yaml
      version: '3.8'
      services:
        kaspa-node:
          environment:
            - CUSTOM_VAR=value
      ```
    - **After changes**: Run `docker-compose up -d` to apply

### Performance Limitations

27. **No Performance Optimization** [Severity: Low]
    
    Basic performance only
    - No performance tuning options
    - No caching configurations
    - No query optimization
    - No connection pooling configuration
    - Default settings may not be optimal for all systems
    
    **Workaround**:
    - **Allocate more resources**: Edit `docker-compose.yml` to add resource limits:
      ```yaml
      services:
        kaspa-node:
          deploy:
            resources:
              limits:
                cpus: '2.0'
                memory: 4G
              reservations:
                cpus: '1.0'
                memory: 2G
      ```
    - **Optimize PostgreSQL**: Add to postgres service environment:
      ```yaml
      environment:
        - POSTGRES_SHARED_BUFFERS=256MB
        - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
        - POSTGRES_WORK_MEM=16MB
      ```
    - **Monitor performance**: Use `./status.sh` to identify bottlenecks

28. **Resource Limits Not Configurable** [Severity: Low]
    
    Fixed resource allocations
    - Cannot set custom memory limits per service
    - Cannot set CPU quotas
    - Cannot prioritize services
    - Docker default resource limits apply

### Documentation and Support Limitations

29. **Limited Documentation** [Severity: Low]
    
    Basic documentation only
    - No advanced configuration guides
    - No troubleshooting flowcharts
    - No video tutorials (planned for future)
    - Limited examples and use cases
    
    **Workaround**:
    - **Check existing documentation**:
      - `TESTING.md` - Testing scenarios and instructions
      - `README.md` - Project overview
      - `QUICK_START.md` - Quick start guide
      - `docs/` directory - Additional documentation
    - **Community resources**:
      - GitHub Discussions: Ask questions and share experiences
      - GitHub Issues: Search for similar problems and solutions
    - **Docker documentation**: https://docs.docker.com/ for Docker-specific questions
    - **Kaspa documentation**: https://kaspa.org/ for Kaspa-specific information

30. **No Training Materials** [Severity: Low]
    
    Self-service learning only
    - No official training courses
    - No certification programs
    - No webinars or workshops
    - Community-driven learning only

31. **English Only** [Severity: Low]
    
    Documentation in English only
    - No internationalization (i18n)
    - No localization (l10n)
    - No multi-language support in wizard
    - Community translations not available

## Fixed in This Version

- ✅ Wizard state persistence across browser sessions
- ✅ Background task management for long-running operations
- ✅ Dashboard integration with real-time service status
- ✅ Automatic backup system before configuration changes
- ✅ Improved error messages and troubleshooting guidance
- ✅ Service management scripts (restart, stop, fresh-start, status)

## Document Updates and Version History

This document is actively maintained and updated as new issues are discovered during testing.

### Update Process

When new issues are discovered:
1. **Categorize** by severity (Critical, High, Medium, Low)
2. **Document** the issue with clear description and impact
3. **Provide workarounds** where available
4. **Update** this document immediately
5. **Notify testers** if the issue is critical

### Version History

**v0.9.0-test (Initial Release)**
- Initial documentation of known issues
- 31 documented limitations across all categories
- Comprehensive workarounds and troubleshooting steps
- Last updated: December 3, 2024

**Future Updates**
- Issues discovered during testing will be added here
- Fixed issues will be moved to "Fixed in This Version" section
- Critical issues will be highlighted at the top

### How to Report Issues Not Listed Here

Found a bug not listed here? Please report it!

**Before Reporting**:
1. Check this list to avoid duplicates
2. Try the suggested workarounds
3. Check the TESTING.md troubleshooting section
4. Search existing GitHub Issues

**How to Report**:
- Use the bug report template: https://github.com/[repo]/issues/new?template=bug_report.md
- Include system information (OS, Docker version, Node.js version)
- Attach relevant logs and screenshots
- Describe steps to reproduce
- Mention if you found a workaround

**What Happens Next**:
1. Issue is triaged by maintainers
2. If confirmed, it's added to this document
3. Severity is assigned
4. Workarounds are documented if available
5. Fix is scheduled based on severity

---

**Note**: This is a test release (v0.9.0). Known issues are expected and help us improve the system before the v1.0 production release. Thank you for your patience and feedback!


---

<!-- 
TEMPLATE FOR ADDING NEW ISSUES
================================

Copy this template when adding a new issue to maintain consistency:

### [Issue Title]
**Issue**: [Brief description of the problem]

**Severity**: [Critical/High/Medium/Low]

**Impact**: 
- [How this affects users]
- [What functionality is impacted]

**Workaround**: 
- [Step-by-step workaround if available]
- [Alternative approaches]

**Status**: [By design/Will fix/Won't fix/Under investigation]

**Technical Details** (if applicable):
- [Additional technical information]
- [Root cause if known]

---

SEVERITY GUIDELINES
===================

**Critical**: System-breaking issues that prevent installation or cause data loss
- Example: Installation fails completely, data corruption

**High**: Major functionality impaired but workarounds exist
- Example: Node sync takes hours, Windows requires WSL2

**Medium**: Noticeable issues with reasonable workarounds
- Example: Port conflicts, dashboard incomplete

**Low**: Minor inconveniences or missing nice-to-have features
- Example: No automatic updates, limited customization

---

CATEGORIES FOR ORGANIZATION
============================

Place new issues in the appropriate section:
- Critical Issues (top priority)
- High Priority Issues
- Medium Priority Issues  
- Low Priority Issues
- Limitations (by subcategory)

Update the Quick Reference section if the issue is commonly encountered.

-->
