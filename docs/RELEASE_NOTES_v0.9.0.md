# Kaspa All-in-One v0.9.0 - Test Release

## ⚠️ This is a Test Release

This is a pre-production version for testing purposes. Please report any issues!

## Release Description

Kaspa All-in-One v0.9.0-test represents a major milestone in making Kaspa infrastructure accessible to everyone. This test release introduces a revolutionary web-based installation wizard that transforms the complex process of deploying Kaspa services into a simple, guided experience.

### What is Kaspa All-in-One?

Kaspa All-in-One is a comprehensive deployment system that enables anyone to run Kaspa infrastructure on their own hardware. Whether you're a node operator, developer, or community member, this system provides everything you need to participate in the Kaspa network.

### Why This Test Release Matters

Before we release v1.0 to the broader community, we need your help to:

- **Validate the installation process** across different platforms and configurations
- **Identify and fix bugs** before they affect production users
- **Improve documentation** based on real user experiences
- **Ensure reliability** for mission-critical Kaspa infrastructure
- **Gather feedback** on user experience and feature requests

Your participation directly shapes the final product and helps make Kaspa infrastructure more accessible to the entire community.

### Key Innovations in This Release

**🧙‍♂️ Web-Based Installation Wizard**
- Intuitive browser-based interface guides you through every step
- Real-time progress tracking and status updates
- Automatic prerequisite checking and validation
- Smart configuration recommendations based on your use case

**🎯 Multiple Deployment Profiles**
- **Core Profile**: Essential Kaspa node for network participation
- **Kaspa User Applications**: User-facing apps (Kasia, K-Social, Kaspa Explorer)
- **Indexer Services**: High-performance blockchain indexing infrastructure
- **Custom Configurations**: Mix and match services for your specific needs

**🔄 Advanced Service Management**
- One-command service restart, stop, and status checking
- Fresh start capability for clean testing iterations
- Automatic backup and recovery systems
- Graceful error handling and recovery mechanisms

**📊 Real-Time Monitoring**
- Live installation progress with detailed status information
- Service health monitoring and diagnostics
- Resource usage tracking and optimization recommendations
- Comprehensive logging for troubleshooting

**🛡️ Production-Ready Architecture**
- Docker-based containerization for isolation and reliability
- Database-per-service architecture for optimal performance
- Automatic SSL/TLS configuration for secure communications
- Built-in backup and disaster recovery capabilities

### What You'll Experience

**Simple Getting Started (< 5 minutes)**
1. Download and extract the test package
2. Run `./start-test.sh` - that's it!
3. Your browser opens automatically to the installation wizard
4. Follow the guided setup process

**Comprehensive Testing Scenarios**
- **Scenario 1**: Core Profile installation (15 minutes)
- **Scenario 2**: Kaspa User Applications deployment (20 minutes)
- **Scenario 3**: Indexer Services setup (25 minutes)
- **Scenario 4**: Error handling and recovery testing
- **Scenario 5**: Reconfiguration and service management

**Robust Service Management**
- `./restart-services.sh` - Restart all services
- `./stop-services.sh` - Stop services (preserve data)
- `./fresh-start.sh` - Clean slate for new tests
- `./status.sh` - Check what's running
- `./cleanup-test.sh` - Complete cleanup when done

### Target Audience for Testing

**Primary Testers**:
- Kaspa node operators and enthusiasts
- Developers building on Kaspa
- Community members interested in running Kaspa services
- System administrators evaluating Kaspa infrastructure

**Technical Requirements**:
- Basic command line familiarity
- Docker and Node.js installed (or willingness to install them)
- 4GB RAM and 20GB disk space available
- Stable internet connection

**No Kaspa Expertise Required**: The wizard is designed to guide newcomers through the entire process.

### Testing Goals and Success Criteria

**Our Goals for This Test**:
- Achieve 90% installation success rate across all platforms
- Validate average installation time under 15 minutes for Core Profile
- Ensure zero critical bugs that prevent basic functionality
- Gather comprehensive feedback on user experience
- Test on Linux, macOS, and Windows/WSL2 platforms

**How Success is Measured**:
- Installation completion rates by profile type
- Time-to-completion metrics for each scenario
- Bug severity and frequency analysis
- Documentation clarity ratings from testers
- Platform compatibility validation

### Known Limitations (This Test Release)

**Expected Behaviors**:
- **Node sync takes 4-8 hours**: This is normal blockchain synchronization
- **Kasia app build takes 5-10 minutes**: Complex Rust compilation process
- **Windows requires WSL2**: Native Windows support planned for v1.0
- **Dashboard not included**: Use `docker ps` and `./status.sh` for monitoring

**Features Not Ready for Testing**:
- **Archival Node & Mining Stratum profiles**: Visible in wizard but untested/incomplete
- **Advanced reconfiguration**: Basic state management only, no service addition/removal
- **Management dashboard**: Not included in this test release

**Platform Support**:
- ✅ Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+)
- ✅ macOS (11.0+)
- ✅ Windows via WSL2
- ❌ Native Windows (coming in v1.0)

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for complete details and workarounds.

### Your Feedback Shapes v1.0

Every bug report, suggestion, and piece of feedback you provide directly influences the final v1.0 release. We're particularly interested in:

- **Installation experience**: What was smooth? What was confusing?
- **Documentation clarity**: Were instructions clear and complete?
- **Error handling**: Did error messages help you resolve issues?
- **Performance**: How long did installations take on your system?
- **Feature requests**: What would make this more useful for you?

### Post-Testing Roadmap

**After This Test Period**:
1. **Analysis Phase** (1 week): Review all feedback and metrics
2. **Bug Fix Phase** (1-2 weeks): Address critical issues found
3. **Additional Testing** (if needed): Release v0.9.1-test with fixes
4. **v1.0 Preparation** (2-3 weeks): Final polish and production readiness
5. **v1.0 Release**: Official production release to the community

**Success Criteria for v1.0**:
- 90% installation success rate achieved
- Zero critical bugs remaining
- Average installation time under 15 minutes
- Positive feedback from 80% of testers
- All major platforms validated

### Thank You, Testers!

This test release represents months of development work, and your participation is the final crucial step before we can confidently release v1.0 to the broader Kaspa community. Every minute you spend testing, every bug you report, and every suggestion you make helps ensure that Kaspa infrastructure becomes more accessible to everyone.

Together, we're building the foundation for Kaspa's decentralized future. Thank you for being part of this journey!

## What's New

### 🧙‍♂️ Web-Based Installation Wizard
- **Browser-based interface**: Intuitive web UI that guides you through every step
- **Automatic browser launch**: Opens automatically when you run `./start-test.sh`
- **Real-time progress tracking**: Live updates during installation and configuration
- **Smart validation**: Automatic prerequisite checking and system validation
- **Test release banner**: Clear identification of pre-release status with feedback links

### 🚀 One-Command Quick Start
- **`./start-test.sh`**: Single command to start the entire testing experience
- **Platform detection**: Automatically detects Linux, macOS, or Windows/WSL2
- **Prerequisite checking**: Validates Docker, Docker Compose, and Node.js versions
- **Automatic dependency installation**: Installs wizard dependencies automatically
- **Browser auto-launch**: Opens the wizard in your default browser

### 🎯 Multiple Deployment Profiles
- **Core Profile**: Essential Kaspa node for network participation
- **Kaspa User Applications**: User-facing apps (Kasia, K-Social, Kaspa Explorer)
- **Indexer Services**: High-performance blockchain indexing infrastructure
- **Custom Configurations**: Mix and match services for your specific needs
- **Profile-specific optimization**: Tailored resource allocation and configuration

### 🔧 Advanced Service Management Scripts
- **`./restart-services.sh`**: Restart all services while preserving data
- **`./stop-services.sh`**: Gracefully stop services without data loss
- **`./fresh-start.sh`**: Clean slate testing with optional volume preservation
- **`./status.sh`**: Comprehensive service status and resource monitoring
- **`./cleanup-test.sh`**: Complete cleanup with user data protection options

### 📊 Real-Time Monitoring and Progress
- **Live installation progress**: Detailed status updates during deployment
- **Service health monitoring**: Real-time health checks and diagnostics
- **Resource usage tracking**: CPU, memory, and disk usage monitoring
- **Port conflict detection**: Automatic detection and resolution of port conflicts
- **Comprehensive logging**: Detailed logs for troubleshooting and debugging

### 🛡️ Production-Ready Architecture
- **Docker containerization**: Complete isolation and reliability
- **Database-per-service**: Separate TimescaleDB instances for optimal performance
- **Automatic SSL/TLS**: Secure communications configuration
- **Built-in backup system**: Automatic backup and disaster recovery
- **Graceful error handling**: Comprehensive error recovery mechanisms

### 📖 Comprehensive Testing Framework
- **TESTING.md**: Step-by-step testing scenarios and instructions
- **5 test scenarios**: Core Profile, User Apps, Indexer Services, Error Handling, Reconfiguration
- **Time estimates**: Clear expectations for each testing scenario
- **KNOWN_ISSUES.md**: Documented limitations and workarounds
- **Glossary**: Clear definitions of all technical terms

### 🐛 Integrated Feedback System
- **GitHub Issues templates**: Structured bug reports and feature requests
- **GitHub Discussions**: Community feedback and general discussion
- **Direct feedback links**: Easy access from wizard UI and documentation
- **System information collection**: Automatic gathering of relevant diagnostic data
- **Test release labeling**: Automatic categorization of test-related feedback

### 🌐 Multi-Platform Support
- **Linux support**: Ubuntu 20.04+, Debian 11+, RHEL 8+
- **macOS support**: macOS 11.0+
- **Windows/WSL2 support**: Full functionality via Windows Subsystem for Linux
- **Platform-specific instructions**: Tailored setup guidance for each platform
- **Cross-platform scripts**: Unified experience across all supported platforms

### 🔄 Reconfiguration and Recovery
- **Installation detection**: Automatic detection of existing installations
- **Configuration updates**: Modify existing setups without data loss
- **Service addition**: Add new profiles to existing installations
- **Rollback capabilities**: Safe recovery from configuration changes
- **State persistence**: Maintains wizard state across sessions

## Quick Start

### 🚀 Get Started in Under 5 Minutes

**Step 1: Download and Extract**
1. Download `kaspa-aio-v0.9.0-test.tar.gz` from the GitHub release
2. Extract the archive:
   ```bash
   tar -xzf kaspa-aio-v0.9.0-test.tar.gz
   cd kaspa-aio-v0.9.0-test/
   ```

**Step 2: One-Command Start**
```bash
./start-test.sh
```

That's it! The script will:
- ✅ Check your system for prerequisites (Docker, Node.js)
- ✅ Install wizard dependencies automatically
- ✅ Start the installation wizard
- ✅ Open your browser to http://localhost:3000

**Step 3: Follow the Wizard**
- Choose your deployment profile (Core Profile recommended for first test)
- Configure your settings (defaults work great)
- Watch the real-time installation progress
- Access your services when complete

**Step 4: Test and Explore**
- Verify services are running with `./status.sh`
- Try different profiles and configurations
- Test service management scripts
- Report any issues you find

### ⏱️ Time Expectations

- **Setup**: 2-3 minutes (download + extract + start)
- **Core Profile**: 10-15 minutes (basic Kaspa node)
- **User Applications**: 15-25 minutes (includes app builds)
- **Indexer Services**: 20-30 minutes (database setup + sync)

### 🎯 Recommended Testing Path

**First Time? Start Here:**
1. **Core Profile** (15 min) - Get familiar with the wizard
2. **Service Management** (5 min) - Try `./restart-services.sh`, `./status.sh`
3. **Fresh Start** (5 min) - Test `./fresh-start.sh` for clean slate
4. **User Applications** (25 min) - Try the user-facing apps
5. **Provide Feedback** - Tell us what you think!

**Advanced Testers:**
- Test all 5 scenarios in TESTING.md
- Try error conditions and recovery
- Test reconfiguration features
- Explore service management tools

### 🆘 Need Help?

**If Prerequisites Are Missing:**
- The `start-test.sh` script will show you exactly what to install
- Platform-specific instructions are provided automatically
- See TESTING.md for detailed prerequisite installation

**If Something Goes Wrong:**
- Check `./status.sh` to see what's running
- Try `./restart-services.sh` to restart services
- Use `./fresh-start.sh` for a clean slate
- Report issues with our bug report template

**For Detailed Instructions:**
- See [TESTING.md](TESTING.md) for comprehensive testing scenarios
- Check [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for known limitations
- Join [GitHub Discussions](https://github.com/[repo]/discussions) for help

### 🎉 What Success Looks Like

**You'll know it's working when:**
- ✅ Wizard opens in your browser automatically
- ✅ Installation completes without errors
- ✅ Services show as "running" in `./status.sh`
- ✅ You can access the configured services
- ✅ Service management scripts work correctly

**Ready to dive deeper?** Check out the detailed testing scenarios in [TESTING.md](TESTING.md)!

## Prerequisites

Before downloading and testing Kaspa All-in-One, ensure your system meets these requirements. The `start-test.sh` script will check these automatically, but it's helpful to prepare in advance.

### Required Software

**Docker 20.10+**
- Required to run all Kaspa services in isolated containers
- Check if installed: `docker --version`
- Installation guides:
  - **Linux**: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`
  - **macOS**: Download Docker Desktop from https://docs.docker.com/desktop/install/mac-install/
  - **Windows**: Install WSL2 first, then Docker Desktop with WSL2 integration
- Verify it's running: `docker ps` (should show container list, may be empty)

**Docker Compose 2.0+**
- Orchestrates multiple Docker containers
- Check if installed: `docker-compose --version` or `docker compose version`
- **Linux**: Install separately (see official Docker docs)
- **macOS/Windows**: Included with Docker Desktop

**Node.js 18+**
- Required to run the installation wizard backend
- Check if installed: `node --version`
- Installation guides:
  - **Linux (Ubuntu/Debian)**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
  - **macOS**: `brew install node@18` or download from https://nodejs.org/
  - **Windows (WSL2)**: Same as Linux Ubuntu/Debian commands

### System Requirements

**Hardware**:
- **RAM**: Minimum 4GB available (8GB+ recommended)
  - Core Profile: ~2GB
  - Full deployment: 4GB+
- **Disk Space**: Minimum 20GB available (50GB+ recommended)
  - Kaspa blockchain: ~15GB (and growing)
  - Docker images: ~2-5GB
  - Application data: varies
- **CPU**: 2+ cores recommended (node sync is CPU-intensive)

**Network**:
- **Internet Connection**: Required for downloading Docker images and syncing blockchain
- **Ports**: These ports should be available:
  - `3000`: Installation wizard
  - `16110`: Kaspa node RPC
  - `16111`: Kaspa node P2P
  - Additional ports for optional services (wizard will check)

### Supported Platforms

✅ **Fully Supported:**
- Ubuntu 20.04+ (LTS recommended)
- Debian 11+
- macOS 11.0+ (Big Sur or later)
- Windows 10/11 with WSL2

⚠️ **Supported with Limitations:**
- RHEL 8+ / CentOS 8+ / Rocky Linux 8+
- Fedora 35+
- Other Linux distributions (may require manual dependency installation)

❌ **Not Supported:**
- Native Windows (must use WSL2)
- macOS 10.x (Catalina or earlier)
- 32-bit systems
- ARM architecture (experimental, not tested)

### Pre-Installation Checklist

Before running `./start-test.sh`, verify:

- [ ] Docker is installed and running (`docker ps` works)
- [ ] Docker Compose is installed (`docker-compose --version` works)
- [ ] Node.js 18+ is installed (`node --version` shows v18.x.x or higher)
- [ ] You have at least 4GB RAM available
- [ ] You have at least 20GB disk space available
- [ ] Your internet connection is stable
- [ ] Ports 3000 and 16110/16111 are not in use by other applications

### Quick Verification

Run this command to check all prerequisites at once:

```bash
echo "=== Checking Prerequisites ==="
echo ""

# Docker
if command -v docker &> /dev/null; then
    echo "✓ Docker: $(docker --version)"
else
    echo "✗ Docker: Not found"
fi

# Docker Compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    echo "✓ Docker Compose: Found"
else
    echo "✗ Docker Compose: Not found"
fi

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo "✓ Node.js: $(node --version)"
    else
        echo "✗ Node.js: Version too old (need 18+, have $(node --version))"
    fi
else
    echo "✗ Node.js: Not found"
fi

echo ""
echo "=== Ready to test? Run: ./start-test.sh ==="
```

### Getting Help with Prerequisites

If you have trouble installing prerequisites:

1. **Check official documentation** (links provided above)
2. **Search for platform-specific guides** (e.g., "install Docker on Ubuntu 22.04")
3. **Ask in GitHub Discussions**: https://github.com/[repo]/discussions/categories/test-release-feedback
4. **Open an issue**: https://github.com/[repo]/issues/new/choose

**Note**: The `start-test.sh` script will also check prerequisites and provide installation guidance if anything is missing.

**For Complete Details**: See [TESTING.md](TESTING.md) for comprehensive prerequisite installation instructions with platform-specific commands and troubleshooting.

## Feedback

- 🐛 Report bugs: [Issues](https://github.com/[repo]/issues/new/choose)
- 💬 Discuss: [Discussions](https://github.com/[repo]/discussions)
- 📖 Documentation: See TESTING.md

## Known Issues

This test release has several known limitations and issues. Here are the most important ones to be aware of:

### Critical & High Priority Issues

**🕐 Node Sync Time (High Priority)**
- Kaspa node synchronization takes 4-8 hours to complete
- This is normal blockchain synchronization behavior
- **Workaround**: Use "Continue in background" option in wizard
- Monitor progress with `./status.sh` or dashboard

**⏱️ Kasia App Build Time (Fixed - Now Low Priority)**
- Kasia application build takes 5-10 minutes (now builds successfully)
- This is normal compilation time for Rust/WASM components
- **Workaround**: Be patient during build process, it will complete

**🪟 Windows Native Not Supported (Medium Priority)**
- Windows requires WSL2 (Windows Subsystem for Linux)
- Native Windows Command Prompt/PowerShell not supported
- **Workaround**: Install WSL2 and Docker Desktop with WSL2 backend

**🔌 Port Conflicts (Low Priority)**
- Default ports may conflict with existing services
- Common conflicts: 3000 (wizard), 8080 (dashboard), 16110/16111 (Kaspa node)
- **Workaround**: Change ports during wizard configuration step

**📊 Dashboard Not Included (Medium Priority)**
- Management dashboard not included in this test release
- **Workaround**: Use `docker ps`, `docker logs`, and `./status.sh` for monitoring

### System Requirements

**Prerequisites (Cannot be installed automatically)**:
- Docker 20.10+ and Docker Compose 2.0+
- Node.js 18+
- 4GB RAM minimum (8GB+ recommended)
- 20GB disk space minimum (50GB+ recommended)
- Stable internet connection

### Platform Support

**Supported Platforms**:
- ✅ Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+)
- ✅ macOS (11.0+)
- ✅ Windows via WSL2
- ❌ Native Windows (coming in v1.0)
- ❌ ARM/Apple Silicon (may have compatibility issues)

### Features Not Available in This Test Release

**🚧 Coming Soon (Planned for Future Releases)**:
- **Archival Node Profile**: Full blockchain history storage (mentioned in wizard but not implemented)
- **Mining Stratum Profile**: Mining pool infrastructure (mentioned in wizard but not implemented)
- **Advanced Reconfiguration**: Service addition/removal from existing installations
- **Management Dashboard**: Comprehensive service monitoring and control interface
- **Native Windows Support**: Direct Windows installation without WSL2

**⚠️ Incomplete/Untested Features**:
- **Archival Node**: Profile exists in wizard but is untested and may not work correctly
- **Mining Stratum**: Profile exists in wizard but is untested and may not work correctly
- **Advanced Reconfiguration**: Wizard shows basic reconfiguration but advanced features are limited
- **Dashboard Integration**: References to dashboard exist but dashboard is not included in test package

### Deployment Limitations

- **Single node only**: No multi-node or high availability setups
- **Local deployment only**: All services must run on same machine
- **No production hardening**: Basic security configurations only
- **Limited reconfiguration**: Cannot easily modify existing installations
- **No automatic updates**: Manual update process required

### Common Issues and Solutions

**Installation Issues**:
- **"Docker not found"**: Install Docker and ensure it's running
- **"Port already in use"**: Change ports in wizard or stop conflicting services
- **"Permission denied"**: Ensure user is in docker group (Linux)

**Runtime Issues**:
- **Services won't start**: Check port conflicts with `./status.sh`
- **Slow performance**: Ensure adequate RAM and CPU resources
- **Node won't sync**: Check internet connection and firewall settings

**For Complete Details**: See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for comprehensive documentation of all 31+ known limitations, detailed workarounds, and troubleshooting steps.

## Thank You, Testers! 🙏

Thank you for helping test Kaspa All-in-One! Your participation is invaluable in making this project better for everyone in the Kaspa community.

### Your Impact

We genuinely appreciate your time and effort. Every bug you find, every suggestion you make, and every question you ask makes Kaspa All-in-One better for the entire community. Your testing directly determines when we're ready for v1.0!

### What Your Testing Accomplishes

As a tester, you are:

- **An explorer**: Trying different configurations and discovering what works
- **A detective**: Helping us find bugs and issues we might have missed  
- **A teacher**: Telling us what's confusing or could be clearer
- **A partner**: Your feedback directly shapes the final product

### Every Contribution Matters

Whether you:
- Complete just one scenario or test everything
- Find critical bugs or minor improvements
- Provide detailed feedback or quick observations
- Test on Linux, macOS, or Windows/WSL2

**Your contribution is valuable and appreciated.**

### Community Impact

Your testing helps ensure that when v1.0 is released, it will:
- Install successfully for users across all platforms
- Provide clear, understandable documentation
- Handle errors gracefully with helpful guidance
- Deliver a reliable foundation for Kaspa infrastructure

### Thank You for Being Part of This Journey

Together, we're building the foundation for Kaspa's decentralized future. Thank you for being part of this journey and helping make Kaspa infrastructure more accessible to everyone!

**Your feedback shapes the future of Kaspa All-in-One.** 🚀