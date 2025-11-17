# Installation Verification Testing

This document describes the installation verification testing suite for the Kaspa All-in-One project.

## Overview

The installation verification testing suite validates that your system meets all requirements for running Kaspa All-in-One and that the installation process will succeed. It includes two main scripts:

1. **test-installation.sh** - Comprehensive installation verification
2. **scripts/verify-system.sh** - System resource and port availability checker

## test-installation.sh

### Purpose

Validates the complete installation environment including:
- Docker and Docker Compose availability
- System requirements (RAM, disk, CPU, network)
- Port availability
- Environment file creation and validation
- Docker Compose configuration
- Profile system functionality
- Service startup capability
- Management scripts
- Documentation availability
- Directory structure

### Usage

```bash
# Run full installation verification
./test-installation.sh

# The script will automatically:
# - Check all prerequisites
# - Validate configuration files
# - Test service definitions
# - Verify management tools
# - Generate a comprehensive report
```

### Test Categories

#### 1. Docker Availability
- Checks if Docker is installed
- Verifies Docker daemon is running
- Tests user permissions for Docker

#### 2. Docker Compose Availability
- Checks if Docker Compose is installed
- Verifies version compatibility

#### 3. System Requirements
- **RAM**: Minimum 4GB (recommended 8GB+)
- **Disk Space**: Minimum 50GB available
- **CPU**: Minimum 2 cores (recommended 4+)
- **Network**: Internet connectivity required

#### 4. Port Availability
Tests that required ports are not in use:
- 16110 - Kaspa Node P2P
- 16111 - Kaspa Node RPC
- 8080 - Dashboard

#### 5. Environment File Creation
- Tests .env file creation
- Validates required variables
- Backs up existing configuration

#### 6. Docker Compose Validation
- Checks docker-compose.yml exists
- Validates YAML syntax
- Verifies required services are defined

#### 7. Profile System
- Tests profile configuration
- Validates core services
- Checks profile-specific services

#### 8. Service Startup
- Tests service startup capability (dry-run)
- Validates service configuration

#### 9. Management Scripts
- Checks scripts/manage.sh
- Checks scripts/health-check.sh
- Validates script syntax and permissions

#### 10. Documentation
- Verifies README.md
- Checks CONTRIBUTING.md
- Validates docs/ directory

#### 11. Directory Structure
- Validates required directories exist
- Checks services/, config/, scripts/, docs/

#### 12. Resource Monitoring
- Checks availability of monitoring tools
- Validates system utilities

### Output

The script provides:
- Real-time test progress with color-coded output
- Detailed test results for each category
- Summary with pass/fail/warning counts
- Recommendations for addressing issues

### Exit Codes

- **0**: All critical tests passed (warnings allowed)
- **Non-zero**: One or more critical tests failed

## scripts/verify-system.sh

### Purpose

Provides detailed system resource analysis and port availability checking with profile-specific validation.

### Usage

```bash
# Full system verification
./scripts/verify-system.sh

# Check specific profile ports
./scripts/verify-system.sh -p core
./scripts/verify-system.sh -p explorer
./scripts/verify-system.sh -p production
./scripts/verify-system.sh -p mining
./scripts/verify-system.sh -p development
./scripts/verify-system.sh -p all

# Quick check (skip detailed tests)
./scripts/verify-system.sh -q

# Generate system report
./scripts/verify-system.sh -r

# Show help
./scripts/verify-system.sh -h
```

### Options

- `-h, --help` - Show help message
- `-p, --profile PROFILE` - Check ports for specific profile
- `-r, --report` - Generate system verification report
- `-q, --quick` - Quick check (skip detailed tests)

### Profiles

#### Core Profile (Default)
- 16110 - Kaspa Node P2P
- 16111 - Kaspa Node RPC
- 8080 - Dashboard

#### Explorer Profile
- 5432 - PostgreSQL/TimescaleDB

#### Production Profile
- 3000 - Kasia App
- 3001 - K-Social App
- 3002 - Kasia Indexer API
- 3003 - K-Indexer API

#### Mining Profile
- 5555 - Kaspa Stratum Bridge

#### Development Profile
- 9000 - Portainer
- 5050 - pgAdmin

### System Checks

#### RAM Check
- Displays total, used, and available RAM
- Compares against minimum (4GB) and recommended (8GB)
- Shows RAM usage percentage

#### Disk Space Check
- Displays total, used, and available disk space
- Compares against minimum (50GB) and recommended (200GB)
- Detects SSD vs HDD (Linux only)
- Shows disk usage percentage

#### CPU Check
- Displays CPU model and specifications
- Shows number of CPU cores
- Compares against minimum (2) and recommended (4)

#### Network Connectivity
- Tests connectivity to multiple endpoints
- Measures download speed (if curl available)
- Validates internet access

#### Port Availability
- Checks if ports are available or in use
- Identifies processes using ports (if lsof available)
- Profile-specific port validation

#### Docker Environment
- Checks Docker installation and version
- Verifies Docker daemon status
- Tests user permissions
- Validates Docker Compose availability

#### Operating System
- Detects OS name and version
- Shows kernel version
- Displays system architecture
- Validates OS compatibility

### Report Generation

The `-r` flag generates a detailed system verification report saved to `system-verification-report.txt`:

```bash
./scripts/verify-system.sh -r
```

Report includes:
- Operating system details
- Hardware resources summary
- Docker environment status
- Port availability for core profile
- Timestamp and system information

### Cross-Platform Support

Both scripts support:
- **Linux** (Ubuntu, Debian, CentOS, etc.)
- **macOS** (Darwin)
- Automatic detection of platform-specific commands
- Fallback mechanisms for missing utilities

## Integration with Installation Process

### Pre-Installation

Run verification before installation:

```bash
# 1. Verify system meets requirements
./scripts/verify-system.sh

# 2. Run comprehensive installation tests
./test-installation.sh

# 3. If all tests pass, proceed with installation
./install.sh
```

### Post-Installation

After installation, verify services:

```bash
# Test Kaspa node
./test-kaspa-node.sh

# Test dashboard
./test-dashboard.sh

# Test specific services
./test-kasia-indexer.sh
./test-k-social-integration.sh
```

## Troubleshooting

### Docker Not Available

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Start Docker daemon
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Insufficient Resources

**Low RAM:**
- Close unnecessary applications
- Consider upgrading system RAM
- Use lighter profiles (core only)

**Low Disk Space:**
- Free up disk space
- Use external storage
- Enable Docker volume pruning

**Insufficient CPU:**
- Close resource-intensive applications
- Consider hardware upgrade
- Use lighter profiles

### Port Conflicts

If ports are in use:

```bash
# Identify process using port
lsof -i :16110

# Stop conflicting service
sudo systemctl stop <service-name>

# Or use alternative ports in .env file
KASPA_NODE_P2P_PORT=16120
DASHBOARD_PORT=8090
```

### Network Connectivity Issues

```bash
# Test DNS resolution
ping google.com

# Test direct IP connectivity
ping 8.8.8.8

# Check firewall rules
sudo ufw status

# Temporarily disable firewall for testing
sudo ufw disable
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Verify Installation Requirements
  run: |
    chmod +x test-installation.sh
    ./test-installation.sh

- name: Verify System Resources
  run: |
    chmod +x scripts/verify-system.sh
    ./scripts/verify-system.sh -q
```

## Best Practices

1. **Always run verification before installation**
   - Prevents installation failures
   - Identifies issues early
   - Saves time and effort

2. **Check profile-specific ports**
   - Use `-p` flag to check only needed ports
   - Prevents unnecessary port conflicts

3. **Generate reports for troubleshooting**
   - Use `-r` flag to save system state
   - Include in support requests
   - Track system changes over time

4. **Run quick checks regularly**
   - Use `-q` flag for fast validation
   - Monitor system health
   - Detect resource issues early

5. **Review warnings carefully**
   - Warnings indicate potential issues
   - May not prevent installation
   - Could affect performance

## Related Documentation

- [Installation Guide](../README.md#installation)
- [Deployment Profiles](deployment-profiles.md)
- [Troubleshooting Guide](troubleshooting.md)
- [System Requirements](../README.md#system-requirements)
- [Testing Documentation](dashboard-testing.md)

## Support

If you encounter issues with installation verification:

1. Review the test output carefully
2. Check the troubleshooting section above
3. Consult the [FAQ](faq.md)
4. Generate a system report: `./scripts/verify-system.sh -r`
5. Open an issue with the report attached

## Contributing

To improve the installation verification tests:

1. Add new test cases to test-installation.sh
2. Enhance system checks in verify-system.sh
3. Improve cross-platform compatibility
4. Add more detailed error messages
5. Submit pull requests with improvements

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
