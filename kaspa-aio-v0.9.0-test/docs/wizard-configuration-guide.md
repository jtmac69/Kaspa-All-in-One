# Web Installation Wizard Configuration Guide

## Overview

This guide provides comprehensive documentation for all configuration options available in the Kaspa All-in-One Web Installation Wizard. Whether you're setting up a basic node or a complex multi-service deployment, this guide will help you understand and configure each option effectively.

## Table of Contents

- [Configuration Organization](#configuration-organization)
- [Basic vs Advanced Options](#basic-vs-advanced-options)
- [Profile-Specific Configuration](#profile-specific-configuration)
- [Network Configuration](#network-configuration)
- [Kaspa Node Configuration](#kaspa-node-configuration)
- [Database Configuration](#database-configuration)
- [Advanced Options](#advanced-options)
- [Common Configuration Scenarios](#common-configuration-scenarios)
- [Port Configuration Best Practices](#port-configuration-best-practices)
- [Mainnet vs Testnet](#mainnet-vs-testnet)
- [Troubleshooting Configuration Issues](#troubleshooting-configuration-issues)

---

## Configuration Organization

The wizard organizes configuration options into logical sections that appear based on your selected profile(s):

### Configuration Flow

1. **Profile Selection** → Determines which configuration sections appear
2. **Basic Configuration** → Essential settings visible by default
3. **Advanced Options** → Optional settings for power users (collapsible)
4. **Review** → Summary of all configuration choices

### Progressive Disclosure

The wizard uses progressive disclosure to keep the interface simple:

- **Only relevant options are shown** based on your profile selection
- **Basic options are always visible** for quick setup
- **Advanced options are hidden by default** but easily accessible
- **Tooltips and help text** provide context without cluttering the UI

---

## Basic vs Advanced Options

### Basic Options

Basic options are essential settings that most users need to configure:

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| External IP Address | Your server's public IP address | Auto-detected | No |
| Public Node | Whether to expose your node publicly | Off | No |
| Network | Kaspa network (mainnet/testnet) | mainnet | Yes |
| Database Password | Password for database services | Auto-generated | Yes |

**When to use Basic Options:**
- You're setting up a standard deployment
- You want to get started quickly
- You're comfortable with default values
- You don't need custom data directories or ports

### Advanced Options

Advanced options provide fine-grained control for power users:

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| RPC Port | Kaspa node RPC port | 16110 | No |
| P2P Port | Kaspa node P2P port | 16111 | No |
| Data Directories | Custom paths for persistent data | Profile-specific | No |
| Custom Environment Variables | Additional environment variables | None | No |

**When to use Advanced Options:**
- You need custom port configurations
- You want to specify data directory locations
- You're running multiple instances
- You need to set custom environment variables
- You're an experienced user or developer

### Accessing Advanced Options

1. Scroll to the "Advanced Options" section in the configuration step
2. Click to expand the section (may be collapsed by default)
3. Configure the options you need
4. Leave others at their default values

---

## Profile-Specific Configuration

Different profiles expose different configuration options:

### Core Profile Configuration

**Visible Sections:**
- Network Configuration (External IP, Public Node)
- Kaspa Node Settings (Network, Ports)
- Database Configuration (Password)
- Advanced Options (Data Directory, Custom Variables)

**Key Options:**
- **Network Selection**: Choose mainnet or testnet
- **Port Configuration**: Customize RPC (16110) and P2P (16111) ports
- **Data Directory**: Specify where blockchain data is stored (default: `/data/kaspa`)

### Archive Node Profile Configuration

**Visible Sections:**
- Network Configuration (External IP, Public Node)
- Archive Node Settings (Network, Ports)
- Database Configuration (Password)
- Advanced Options (Data Directory, Custom Variables)

**Key Options:**
- **Network Selection**: Choose mainnet or testnet
- **Port Configuration**: Customize RPC (16110) and P2P (16111) ports
- **Data Directory**: Specify where archive data is stored (default: `/data/kaspa-archive`)

**Note:** Archive nodes store complete blockchain history and require significantly more disk space.

### Kaspa User Applications Profile Configuration

**Visible Sections:**
- Network Configuration (External IP, Public Node)
- Indexer Selection (Public vs Local)
- Database Configuration (Password)
- Advanced Options (Custom Variables)

**Key Options:**
- **Indexer Choice**: Use public indexers or deploy local indexers
- **Public Endpoints**: Configure which public indexers to use (if applicable)

**Note:** Kaspa Node Settings only appear if you also select Core or Archive Node profile.

### Indexer Services Profile Configuration

**Visible Sections:**
- Network Configuration (External IP, Public Node)
- Database Configuration (Password, TimescaleDB settings)
- Advanced Options (Data Directory, Custom Variables)

**Key Options:**
- **TimescaleDB Data Directory**: Specify where database data is stored (default: `/data/timescaledb`)
- **Indexer Selection**: Choose which indexers to deploy (Kasia, K-Indexer, Simply-Kaspa)

**Note:** Indexer Services profile automatically includes TimescaleDB as a shared database.

---

## Network Configuration

### External IP Address

**Purpose:** Specifies your server's public IP address for external access.

**Options:**
- **Auto-Detect** (Recommended): Wizard automatically detects your public IP
- **Manual Entry**: Enter your IP address manually

**When to configure:**
- You're running a public node
- You want external services to connect to your node
- Auto-detection fails or returns incorrect IP

**Example:**
```
External IP: 203.0.113.42
```

**Validation:**
- Must be a valid IPv4 address
- Can be left empty for private deployments

### Public Node Toggle

**Purpose:** Determines whether your Kaspa node is accessible from the internet.

**Options:**
- **Off** (Default): Node is private, only accessible locally
- **On**: Node is public, accessible from the internet

**When to enable:**
- You want to contribute to the Kaspa network
- You want to provide RPC access to others
- You have sufficient bandwidth and resources

**When to disable:**
- You're running a private node for personal use
- You're behind a firewall or NAT
- You have limited bandwidth

**Security Considerations:**
- Public nodes are exposed to the internet
- Ensure your firewall is properly configured
- Monitor resource usage and connections
- Consider rate limiting for RPC endpoints

---

## Kaspa Node Configuration

### Network Selection

**Purpose:** Chooses which Kaspa network your node connects to.

**Options:**
- **mainnet** (Default): Production Kaspa network with real KAS
- **testnet**: Test network for development and testing

**Important:** Changing networks requires a fresh installation. Mainnet and testnet data are incompatible.

**When to use mainnet:**
- Production deployments
- Real transactions and mining
- Public node operation
- Application backends

**When to use testnet:**
- Development and testing
- Learning and experimentation
- Testing applications before mainnet deployment
- No risk of losing real KAS

**Switching Networks:**

If you change the network selection, the wizard will show a warning:

```
⚠️ Network Change Warning

Mainnet and testnet data are incompatible.
Changing networks requires a fresh installation.
Existing blockchain data will not work with the new network.

Options:
- Cancel: Keep current network selection
- Change Network: Proceed with network change
```

**Best Practice:** Decide on your network before installation. Switching later requires re-syncing the entire blockchain.

### Port Configuration

**Purpose:** Customizes the ports used by the Kaspa node for RPC and P2P communication.

**Default Ports:**
- **RPC Port**: 16110 (Remote Procedure Call - API access)
- **P2P Port**: 16111 (Peer-to-Peer - network communication)

**Accessing Port Configuration:**
1. In the Kaspa Node Settings section, click "Configure Ports"
2. A modal dialog opens with port input fields
3. Enter your desired ports
4. Click "Save" to apply or "Reset to Defaults" to restore defaults

**Port Requirements:**
- Must be in range 1024-65535 (privileged ports below 1024 are not allowed)
- RPC and P2P ports must be different
- Ports must not conflict with other services
- Ports must not be in use by other applications

**Validation:**

The wizard validates ports in real-time:

✅ **Valid:** Port 16210 (within range, not in use)
❌ **Invalid:** Port 1000 (below minimum 1024)
❌ **Invalid:** Port 70000 (above maximum 65535)
❌ **Invalid:** Same port for RPC and P2P (conflict)

**When to customize ports:**
- Default ports are already in use
- You're running multiple Kaspa instances
- Your firewall requires specific ports
- You have organizational port allocation policies

**Example Custom Configuration:**
```
RPC Port: 16210
P2P Port: 16211
```

**Firewall Configuration:**

If you're running a public node, ensure these ports are open in your firewall:

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 16110/tcp  # RPC
sudo ufw allow 16111/tcp  # P2P

# RHEL/CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=16110/tcp
sudo firewall-cmd --permanent --add-port=16111/tcp
sudo firewall-cmd --reload
```

---

## Database Configuration

### Database Password

**Purpose:** Secures access to database services (PostgreSQL, TimescaleDB).

**Options:**
- **Auto-Generate** (Recommended): Wizard creates a cryptographically secure random password
- **Manual Entry**: Enter your own password

**Password Requirements:**
- Minimum 12 characters (recommended)
- Mix of uppercase, lowercase, numbers, and special characters
- Avoid common passwords or dictionary words

**Best Practices:**
- Use the auto-generate feature for maximum security
- Store the password securely (password manager recommended)
- Don't share the password
- Change the password periodically in production environments

**Example:**
```
Auto-generated: K7#mP9$xL2@nQ5&wR8
```

**Note:** The password is stored in the `.env` file and used by all database services.

---

## Advanced Options

### Data Directory Configuration

**Purpose:** Specifies where persistent data is stored for each service.

**Available for:**
- Core Profile: Kaspa node data directory
- Archive Node Profile: Archive node data directory
- Indexer Services Profile: TimescaleDB data directory

**Default Paths:**
- Kaspa Node: `/data/kaspa`
- Archive Node: `/data/kaspa-archive`
- TimescaleDB: `/data/timescaledb`

**When to customize:**
- You want to use a specific disk or partition
- You have limited space on the default location
- You want to separate data across multiple drives
- You're using network-attached storage (NAS)

**Important:** These are container paths. Docker volumes map these to host directories.

**Example Custom Configuration:**
```
Kaspa Data Directory: /mnt/ssd/kaspa
TimescaleDB Data Directory: /mnt/hdd/timescaledb
```

**Storage Considerations:**
- **Kaspa Node**: ~15GB and growing (SSD recommended for performance)
- **Archive Node**: ~100GB+ (large capacity required)
- **TimescaleDB**: ~10-20GB depending on indexers (SSD recommended)

### Custom Environment Variables

**Purpose:** Allows advanced users to set additional environment variables for services.

**Format:**
```
KEY1=value1
KEY2=value2
KEY3=value3
```

**Common Use Cases:**
- Enable debug logging: `LOG_LEVEL=debug`
- Set custom timeouts: `TIMEOUT=60`
- Configure service-specific options

**Example:**
```
LOG_LEVEL=debug
KASPA_NODE_TIMEOUT=120
ENABLE_METRICS=true
```

**Caution:** Only use this if you know what you're doing. Incorrect values can cause services to fail.

---

## Common Configuration Scenarios

### Scenario 1: Basic Home Node (Recommended for Beginners)

**Goal:** Run a private Kaspa node for personal use.

**Profile:** Core Profile

**Configuration:**
- Network: mainnet
- Public Node: Off
- Ports: Default (16110, 16111)
- Data Directory: Default
- External IP: Not needed (private node)

**Steps:**
1. Select Core Profile
2. Keep all default values
3. Click through to installation

**Time to sync:** 2-4 hours (depending on internet speed)

### Scenario 2: Public Kaspa Node

**Goal:** Run a public node to support the Kaspa network.

**Profile:** Core Profile

**Configuration:**
- Network: mainnet
- Public Node: On
- External IP: Auto-detect
- Ports: Default (16110, 16111) or custom if needed
- Data Directory: Default

**Additional Steps:**
1. Configure firewall to allow ports 16110 and 16111
2. Ensure stable internet connection
3. Monitor resource usage

**Requirements:**
- Stable internet with good upload bandwidth
- Sufficient resources (4GB+ RAM, 20GB+ disk)
- Static IP or dynamic DNS (recommended)

### Scenario 3: Development Environment

**Goal:** Set up a testnet node for development and testing.

**Profile:** Core Profile

**Configuration:**
- Network: **testnet** (important!)
- Public Node: Off
- Ports: Default or custom (e.g., 17110, 17111 to avoid conflicts)
- Data Directory: Custom (e.g., `/data/kaspa-testnet`)

**Why testnet:**
- No risk of losing real KAS
- Faster sync time
- Free testnet KAS for testing
- Experiment without consequences

**Steps:**
1. Select Core Profile
2. Change network to "testnet"
3. Confirm the network change warning
4. Optionally customize ports to avoid conflicts with mainnet node
5. Proceed with installation

### Scenario 4: Full Application Stack

**Goal:** Run Kaspa node + user applications with public indexers.

**Profiles:** Core Profile + Kaspa User Applications

**Configuration:**
- Network: mainnet
- Public Node: Off (unless you want to provide public access)
- Indexer Choice: Use public indexers (faster, less resources)
- Ports: Default
- Data Directory: Default

**Services Deployed:**
- Kaspa node
- Kasia app
- K-Social app
- Kaspa Explorer (if included)

**Access:**
- Kasia: http://localhost:3001
- K-Social: http://localhost:3003
- Explorer: http://localhost:3002

### Scenario 5: Self-Hosted Indexer Infrastructure

**Goal:** Run complete infrastructure with local indexers.

**Profiles:** Core Profile + Indexer Services + Kaspa User Applications

**Configuration:**
- Network: mainnet
- Public Node: Off
- Indexer Choice: Use local indexers
- Ports: Default
- Data Directories: Consider custom paths for better performance

**Services Deployed:**
- Kaspa node
- TimescaleDB
- Simply Kaspa Indexer
- Kasia Indexer
- K-Indexer
- Kasia app
- K-Social app

**Requirements:**
- 8GB+ RAM (indexers are resource-intensive)
- 50GB+ disk space
- Longer setup time (indexers need to sync)

**Benefits:**
- Full control over data
- No external dependencies
- Privacy (data stays local)
- Can customize indexer behavior

### Scenario 6: Multiple Instances on Same Host

**Goal:** Run both mainnet and testnet nodes on the same server.

**Approach:** Run two separate installations with different ports.

**Instance 1 - Mainnet:**
- Network: mainnet
- RPC Port: 16110
- P2P Port: 16111
- Data Directory: `/data/kaspa-mainnet`

**Instance 2 - Testnet:**
- Network: testnet
- RPC Port: 17110
- P2P Port: 17111
- Data Directory: `/data/kaspa-testnet`

**Important:** Use different directories for each installation to avoid conflicts.

---

## Port Configuration Best Practices

### Choosing Ports

**Default Ports (Recommended):**
- Use defaults (16110, 16111) unless you have a specific reason to change
- Defaults are well-known and documented
- Easier for others to connect to your public node

**Custom Ports:**
- Use when defaults are already in use
- Use when running multiple instances
- Use when organizational policies require specific ports

**Port Ranges:**
- **1024-49151**: Registered ports (safe to use)
- **49152-65535**: Dynamic/private ports (also safe)
- **Avoid 1-1023**: Privileged ports (require root access)

### Port Conflicts

**Common Conflicts:**
- Another Kaspa instance using the same ports
- Other applications using ports 16110 or 16111
- Docker containers from previous installations

**Checking for Conflicts:**

```bash
# Linux/macOS
sudo lsof -i :16110
sudo lsof -i :16111

# Check if ports are listening
netstat -tuln | grep 16110
netstat -tuln | grep 16111
```

**Resolving Conflicts:**
1. Stop the conflicting service
2. Choose different ports in the wizard
3. Update firewall rules if needed

### Firewall Configuration

**For Public Nodes:**

Open the ports you configured:

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 16110/tcp comment 'Kaspa RPC'
sudo ufw allow 16111/tcp comment 'Kaspa P2P'

# RHEL/CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=16110/tcp
sudo firewall-cmd --permanent --add-port=16111/tcp
sudo firewall-cmd --reload

# Check firewall status
sudo ufw status  # Ubuntu/Debian
sudo firewall-cmd --list-all  # RHEL/CentOS
```

**For Private Nodes:**

No firewall changes needed (ports only accessible locally).

### Port Forwarding (Router/NAT)

**For Public Nodes Behind NAT:**

Configure port forwarding on your router:

1. Access your router's admin interface
2. Find "Port Forwarding" or "Virtual Server" settings
3. Add rules:
   - External Port: 16110 → Internal IP: [your server] → Internal Port: 16110
   - External Port: 16111 → Internal IP: [your server] → Internal Port: 16111
4. Save and apply changes

**Testing External Access:**

```bash
# From another network
telnet your-public-ip 16110
telnet your-public-ip 16111
```

---

## Mainnet vs Testnet

### Understanding the Networks

**Mainnet (Production Network):**
- Real Kaspa (KAS) with real value
- Production-ready applications
- Larger blockchain size (~15GB+)
- More peers and higher security
- Permanent transactions

**Testnet (Test Network):**
- Test Kaspa (tKAS) with no real value
- Development and testing
- Smaller blockchain size (~5GB)
- Fewer peers
- Can be reset periodically

### When to Use Each Network

**Use Mainnet for:**
- Production deployments
- Real transactions and mining
- Public node operation
- Application backends serving real users
- Contributing to network security

**Use Testnet for:**
- Application development
- Testing new features
- Learning how Kaspa works
- Experimenting without risk
- Integration testing before mainnet deployment

### Key Differences

| Aspect | Mainnet | Testnet |
|--------|---------|---------|
| KAS Value | Real value | No value |
| Blockchain Size | ~15GB+ | ~5GB |
| Sync Time | 2-4 hours | 30-60 minutes |
| Peers | Many | Fewer |
| Stability | Stable | May be reset |
| Use Case | Production | Development |

### Switching Between Networks

**Important:** You cannot switch networks without a fresh installation.

**Why?**
- Mainnet and testnet have different genesis blocks
- Blockchain data is incompatible
- Network parameters differ

**To Switch Networks:**
1. Run cleanup script: `./cleanup-test.sh`
2. Confirm data removal
3. Run wizard again: `./start-test.sh`
4. Select the new network during configuration
5. Complete installation (will sync from scratch)

**Data Loss Warning:**

When switching networks, you will lose:
- All blockchain data from the previous network
- Any local wallet data (backup first!)
- Indexer data (if running local indexers)

**Best Practice:** Decide on your network before installation. If you need both, run separate instances with different ports and data directories.

### Getting Testnet KAS

**Faucets:**
- Testnet faucets provide free tKAS for testing
- Search for "Kaspa testnet faucet" for current options
- Typical amount: 10-100 tKAS per request

**Mining:**
- Testnet mining is easier (lower difficulty)
- Good for testing mining setups
- tKAS has no real value

---

## Troubleshooting Configuration Issues

### Port Validation Errors

**Error:** "Port must be between 1024 and 65535"

**Cause:** Port number is outside the valid range.

**Solution:**
- Use ports between 1024 and 65535
- Avoid privileged ports (1-1023)
- Common safe ranges: 16000-17000, 30000-40000

**Error:** "RPC and P2P ports must be different"

**Cause:** Same port assigned to both RPC and P2P.

**Solution:**
- Choose different ports for RPC and P2P
- Example: RPC=16110, P2P=16111

**Error:** "Port already in use"

**Cause:** Another service is using the port.

**Solution:**
1. Check what's using the port: `sudo lsof -i :16110`
2. Stop the conflicting service or choose a different port
3. If it's a previous Kaspa installation, run cleanup script

### Network Change Issues

**Issue:** Warning appears when changing network

**This is expected behavior!** The warning protects you from accidentally switching networks.

**What to do:**
- If you meant to change networks: Click "Change Network" or "Proceed"
- If you didn't mean to change: Click "Cancel"

**Issue:** Want to switch networks after installation

**Solution:**
1. Backup any important data (wallets, etc.)
2. Run cleanup script: `./cleanup-test.sh`
3. Confirm data removal
4. Start fresh installation with new network

### Configuration Not Saving

**Issue:** Configuration changes don't persist

**Possible Causes:**
- Browser cache issues
- Wizard backend not running
- File permission issues

**Solutions:**
1. Clear browser cache and refresh
2. Check wizard is running: `ps aux | grep node`
3. Check file permissions: `ls -la .kaspa-aio/`
4. Restart wizard: `./restart-wizard.sh`

### Auto-Detect IP Fails

**Issue:** External IP auto-detection returns wrong IP or fails

**Causes:**
- Behind NAT/router
- VPN active
- Multiple network interfaces
- Firewall blocking detection

**Solutions:**
1. Manually enter your public IP
2. Find your public IP: `curl ifconfig.me`
3. If behind NAT, use your router's public IP
4. Disable VPN temporarily during detection

### Data Directory Issues

**Issue:** Custom data directory not accessible

**Causes:**
- Directory doesn't exist
- Permission issues
- Path is incorrect

**Solutions:**
1. Create directory: `sudo mkdir -p /path/to/data`
2. Set permissions: `sudo chown -R $USER:$USER /path/to/data`
3. Verify path is correct (absolute path required)
4. Check disk space: `df -h /path/to/data`

### Database Password Issues

**Issue:** Auto-generated password not working

**This should not happen.** If it does:

**Solutions:**
1. Try generating a new password (click "Generate" again)
2. Manually enter a strong password
3. Report as a bug if problem persists

**Issue:** Forgot database password

**Solution:**
1. Check `.env` file: `cat .kaspa-aio/.env | grep POSTGRES_PASSWORD`
2. If lost, you may need to reset the database (data loss)

---

## Additional Resources

### Documentation

- **Main README**: Overview and quick start
- **TESTING.md**: Detailed testing scenarios
- **Wizard User Guide**: Step-by-step wizard walkthrough
- **Troubleshooting Guide**: Common issues and solutions

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share experiences
- **Community Forums**: Connect with other users

### Related Guides

- **Installation Guide**: Basic installation instructions
- **Service Management**: Managing running services
- **Backup and Recovery**: Protecting your data
- **Performance Tuning**: Optimizing resource usage

---

## Summary

This configuration guide covered:

✅ **Configuration Organization**: How options are structured
✅ **Basic vs Advanced**: When to use each level
✅ **Profile-Specific Options**: What appears for each profile
✅ **Network Configuration**: External IP and public node settings
✅ **Kaspa Node Configuration**: Network selection and port configuration
✅ **Database Configuration**: Password management
✅ **Advanced Options**: Data directories and custom variables
✅ **Common Scenarios**: Real-world configuration examples
✅ **Port Best Practices**: Choosing and managing ports
✅ **Mainnet vs Testnet**: Understanding the networks
✅ **Troubleshooting**: Solving common configuration issues

### Key Takeaways

1. **Start with defaults** - They work for most users
2. **Use progressive disclosure** - Explore advanced options only when needed
3. **Understand your network** - Choose mainnet or testnet carefully
4. **Validate ports** - Ensure no conflicts before installation
5. **Secure your database** - Use strong passwords
6. **Plan data storage** - Consider disk space and performance
7. **Test before production** - Use testnet for development

### Next Steps

- **Ready to install?** Follow the Quick Start guide
- **Need more details?** Check the Wizard User Guide
- **Have questions?** Visit GitHub Discussions
- **Found an issue?** Report it on GitHub Issues

Thank you for using Kaspa All-in-One! 🚀
