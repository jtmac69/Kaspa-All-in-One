# Resource Checker Feature - Development Task

## Overview

Add an intelligent resource checker to the installation process that detects system capabilities and guides non-technical users to appropriate configuration choices.

## Problem Statement

Users with limited system resources (RAM, CPU, disk) may attempt to run components that will fail or cause system instability. The current installation doesn't check resources or warn users, leading to:

- Containers repeatedly restarting due to OOM (Out of Memory)
- Poor performance and system instability
- Frustration and confusion for non-technical users
- Time wasted on troubleshooting resource issues

**Real Example**: Kaspa node requires 4-8GB RAM during sync, but user had only 4GB total system RAM, causing constant restarts.

## Proposed Solution

Create a pre-installation resource checker script that:
1. Detects available system resources
2. Compares against component requirements
3. Provides clear recommendations
4. Offers automatic configuration based on resources
5. Guides users to appropriate deployment profiles

## User Stories

### Story 1: Resource Detection
**As a** non-technical user  
**I want** the installer to check my system resources  
**So that** I know what components I can safely run

**Acceptance Criteria:**
- Script detects total RAM, available RAM, CPU cores, and disk space
- Results displayed in user-friendly format
- Works on Linux, macOS, and Windows (WSL)

### Story 2: Component Recommendations
**As a** user with limited resources  
**I want** recommendations on which components to install  
**So that** I don't waste time on configurations that won't work

**Acceptance Criteria:**
- Script compares resources against component requirements
- Provides "Recommended", "Possible", and "Not Recommended" ratings
- Explains why certain components aren't recommended
- Suggests alternatives (e.g., remote node instead of local)

### Story 3: Automatic Configuration
**As a** user who wants a quick setup  
**I want** the installer to auto-configure based on my resources  
**So that** I get a working setup without manual configuration

**Acceptance Criteria:**
- Offers "Auto-configure" option based on detected resources
- Generates appropriate .env file
- Selects suitable deployment profile
- Configures remote vs local node automatically

### Story 4: Profile Selection Guidance
**As a** user choosing deployment profiles  
**I want** to know if my system can handle each profile  
**So that** I make informed decisions

**Acceptance Criteria:**
- Shows resource requirements for each profile
- Indicates which profiles are suitable for user's system
- Warns about profiles that may cause issues
- Suggests profile combinations that work together

## Technical Requirements

### Resource Detection

**System Information to Detect:**
```bash
- Total RAM
- Available RAM
- Docker memory limit
- CPU cores
- Available disk space
- Disk type (SSD vs HDD)
- Operating system
- Docker version
- Docker Compose version
```

**Detection Methods:**
- **Linux**: `/proc/meminfo`, `free`, `df`, `lscpu`
- **macOS**: `sysctl`, `vm_stat`, `df`, `system_profiler`
- **Windows/WSL**: `wmic`, `systeminfo`, PowerShell commands

### Component Requirements Matrix

| Component | Min RAM | Recommended RAM | Min Disk | CPU Cores | Notes |
|-----------|---------|-----------------|----------|-----------|-------|
| Dashboard | 100MB | 256MB | 100MB | 1 | Always safe |
| Kaspa Node (sync) | 4GB | 8GB | 50GB | 2 | High memory during sync |
| Kaspa Node (synced) | 2GB | 4GB | 50GB | 2 | Lower after sync |
| Kasia Indexer | 1GB | 2GB | 10GB | 1 | Moderate |
| K-Indexer | 1GB | 2GB | 20GB | 1 | Moderate |
| Simply Kaspa | 1GB | 2GB | 30GB | 1 | Moderate |
| TimescaleDB | 2GB | 4GB | 50GB | 2 | Database heavy |
| Archive DB | 4GB | 8GB | 200GB | 4 | Very heavy |
| Nginx | 50MB | 128MB | 10MB | 1 | Lightweight |
| Portainer | 100MB | 256MB | 100MB | 1 | Lightweight |

### Profile Requirements

| Profile | Total RAM Needed | Disk Space | Recommendation |
|---------|------------------|------------|----------------|
| Core (Dashboard only) | 512MB | 1GB | Always safe |
| Core + Remote Node | 1GB | 2GB | Recommended for <8GB RAM |
| Core + Local Node | 8GB | 60GB | Requires 8GB+ RAM |
| Explorer | 12GB | 150GB | Requires 16GB+ RAM |
| Production | 16GB | 200GB | Requires 16GB+ RAM |
| Archive | 24GB | 500GB | Requires 32GB+ RAM |
| Full Stack | 32GB | 1TB | Server-grade hardware |

## Implementation Design

### Script Structure

```bash
#!/bin/bash
# scripts/check-resources.sh

# 1. Detect system resources
detect_system_resources() {
    # Detect OS, RAM, CPU, disk
}

# 2. Display resource summary
display_resource_summary() {
    # Show what was detected
}

# 3. Check component compatibility
check_component_requirements() {
    # Compare resources vs requirements
}

# 4. Generate recommendations
generate_recommendations() {
    # Suggest configurations
}

# 5. Offer auto-configuration
offer_auto_configuration() {
    # Generate .env based on resources
}

# 6. Interactive mode
interactive_setup() {
    # Guide user through choices
}
```

### User Interface Flow

```
╔══════════════════════════════════════════════════════════════╗
║           Kaspa All-in-One Resource Checker                  ║
╚══════════════════════════════════════════════════════════════╝

Detecting system resources...

System Resources:
  RAM:        4.0 GB total, 2.5 GB available
  CPU:        4 cores
  Disk:       250 GB available (SSD)
  Docker:     4.0 GB memory limit
  OS:         macOS 14.0

╔══════════════════════════════════════════════════════════════╗
║                    Component Analysis                         ║
╚══════════════════════════════════════════════════════════════╝

✅ Dashboard                    [RECOMMENDED]
   Memory: 256 MB | Disk: 100 MB

⚠️  Local Kaspa Node            [NOT RECOMMENDED]
   Memory: 8 GB required, you have 4 GB
   → Recommendation: Use remote node instead

✅ Remote Kaspa Node            [RECOMMENDED]
   Memory: 100 MB | No sync required

⚠️  Explorer Profile            [NOT RECOMMENDED]
   Memory: 12 GB required, you have 4 GB

✅ Dashboard + Remote Node      [RECOMMENDED]
   Total Memory: 512 MB | Disk: 2 GB

╔══════════════════════════════════════════════════════════════╗
║                    Recommendations                            ║
╚══════════════════════════════════════════════════════════════╝

Based on your system resources, we recommend:

1. ✅ Install Dashboard with Remote Node
   - Low memory footprint (512 MB)
   - Instant access to Kaspa network
   - No sync wait time

2. ⚠️  Avoid Local Node
   - Requires 8 GB RAM (you have 4 GB)
   - Will cause system instability
   - Use remote node instead

3. ⚠️  Avoid Explorer/Archive Profiles
   - Require 12+ GB RAM
   - Consider upgrading hardware first

Would you like to:
  [1] Auto-configure (recommended setup)
  [2] Custom configuration
  [3] View detailed requirements
  [4] Exit

Choice:
```

### Auto-Configuration Logic

```bash
auto_configure() {
    local total_ram=$1
    local available_disk=$2
    
    if [ $total_ram -lt 2 ]; then
        # Very limited: Dashboard only, remote node
        configure_minimal
    elif [ $total_ram -lt 8 ]; then
        # Limited: Dashboard + remote node
        configure_remote_node
    elif [ $total_ram -lt 16 ]; then
        # Moderate: Dashboard + local node
        configure_local_node
    elif [ $total_ram -lt 32 ]; then
        # Good: Explorer profile possible
        configure_explorer
    else
        # Excellent: Full stack possible
        configure_full_stack
    fi
}
```

## Integration Points

### 1. Installation Script (`install.sh`)

```bash
#!/bin/bash
# install.sh

echo "Kaspa All-in-One Installation"
echo

# Run resource checker first
if [ -f "scripts/check-resources.sh" ]; then
    echo "Checking system resources..."
    ./scripts/check-resources.sh
    
    # Check if user wants to continue
    read -p "Continue with installation? (y/n): " continue
    if [ "$continue" != "y" ]; then
        exit 0
    fi
fi

# Continue with installation...
```

### 2. Docker Compose Profiles

Update docker-compose.yml to include resource hints:

```yaml
# docker-compose.yml
services:
  kaspa-node:
    # Resource requirements: 8GB RAM, 50GB disk
    # Recommended: 16GB RAM, 100GB SSD
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
```

### 3. Environment Configuration

Generate `.env` based on resources:

```bash
# For systems with <8GB RAM
KASPA_NODE_MODE=remote
REMOTE_KASPA_NODE_URL=https://api.kaspa.org

# For systems with 8GB+ RAM
KASPA_NODE_MODE=local
```

## User Experience Improvements

### Warning Messages

```bash
⚠️  WARNING: Insufficient RAM for Local Node

Your system has 4 GB RAM, but Kaspa node requires 8 GB.

Running the local node will cause:
  • Constant container restarts
  • System instability
  • Failed synchronization
  • Poor performance

Recommended Solution:
  ✅ Use remote public node instead
  • No memory issues
  • Instant access
  • Professional infrastructure

Would you like to configure remote node? (y/n):
```

### Success Messages

```bash
✅ Configuration Complete!

Your system is configured for:
  • Dashboard (http://localhost:8080)
  • Remote Kaspa Node (https://api.kaspa.org)
  • Memory usage: ~512 MB

This configuration is optimal for your 4 GB RAM system.

Next steps:
  1. Start services: docker compose up -d
  2. Access dashboard: http://localhost:8080
  3. Run tests: ./test-dashboard.sh --skip-sync-tests
```

## Testing Requirements

### Test Scenarios

1. **Low RAM System** (2-4 GB)
   - Should recommend remote node only
   - Should warn against local node
   - Should auto-configure minimal setup

2. **Moderate RAM System** (8-12 GB)
   - Should allow local node
   - Should recommend explorer profile
   - Should warn about archive profile

3. **High RAM System** (16+ GB)
   - Should allow all profiles
   - Should recommend full stack
   - Should provide optimization tips

4. **Edge Cases**
   - Docker memory limit lower than system RAM
   - Insufficient disk space
   - Slow HDD vs fast SSD
   - Multiple users on same system

## Documentation Requirements

### User Documentation

- `docs/resource-requirements.md` - Detailed requirements for each component
- `docs/system-recommendations.md` - Hardware recommendations
- `docs/troubleshooting-resources.md` - Resource-related issues

### Developer Documentation

- `docs/dev/resource-checker-api.md` - API for resource detection
- `docs/dev/adding-components.md` - How to add requirements for new components

## Future Enhancements

### Phase 2 Features

1. **Runtime Monitoring**
   - Continuous resource monitoring
   - Alerts when approaching limits
   - Automatic profile downgrade suggestions

2. **Cloud Integration**
   - Detect cloud provider (AWS, GCP, Azure)
   - Recommend instance types
   - Estimate costs

3. **Performance Optimization**
   - Suggest Docker memory limits
   - Recommend swap configuration
   - Optimize based on workload

4. **Web UI**
   - Visual resource dashboard
   - Interactive configuration wizard
   - Real-time resource graphs

## Success Metrics

- **Reduced Support Requests**: 50% fewer resource-related issues
- **Faster Setup**: Users complete setup in <5 minutes
- **Higher Success Rate**: 95% of users get working configuration
- **Better UX**: User satisfaction score >4.5/5

## Implementation Priority

**Priority: HIGH**

This feature would have prevented the issues encountered during dashboard testing and significantly improves user experience for non-technical users.

**Estimated Effort**: 2-3 days
- Day 1: Resource detection script
- Day 2: Recommendation engine and auto-configuration
- Day 3: Integration, testing, and documentation

## Related Issues

- Dashboard test failures due to insufficient RAM
- Kaspa node restart loops from OOM
- User confusion about deployment profiles
- Need for better installation guidance

## References

- Docker resource limits: https://docs.docker.com/config/containers/resource_constraints/
- System resource detection: Various OS-specific commands
- User experience best practices for installers
