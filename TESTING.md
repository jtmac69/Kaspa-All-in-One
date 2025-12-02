# Testing Kaspa All-in-One v0.9.0

## Welcome Testers! 🎉

Thank you for helping test Kaspa All-in-One! Your participation is invaluable in making this project better for everyone in the Kaspa community.

### What is Kaspa All-in-One?

Kaspa All-in-One is a comprehensive deployment system that makes it easy to run Kaspa infrastructure on your own hardware. Whether you want to run a Kaspa node, host user applications, or operate indexer services, this system provides a guided installation wizard that handles all the complexity for you.

### What is This Test Release?

This is **version 0.9.0-test**, a pre-production release designed specifically for testing. Your feedback will help us:

- **Identify bugs** before the official v1.0 release
- **Improve documentation** to make it clearer for all users
- **Validate installation** across different platforms and configurations
- **Enhance user experience** based on real-world usage
- **Ensure reliability** for production deployments

### What You'll Be Testing

During this test, you'll:

1. **Install the system** using our web-based wizard
2. **Deploy Kaspa services** based on different profiles (node, applications, indexers)
3. **Verify functionality** of installed services
4. **Test error handling** and recovery mechanisms
5. **Provide feedback** on your experience

### Your Role as a Tester

As a tester, you are:

- **An explorer**: Try different configurations and see what works
- **A detective**: Help us find bugs and issues we might have missed
- **A teacher**: Tell us what's confusing or could be clearer
- **A partner**: Your feedback directly shapes the final product

You don't need to be a Kaspa expert or a Linux guru. If you can follow instructions and report what you see, you're qualified to help!

### What We Need From You

**Time Commitment**: 30 minutes to 2 hours (depending on which scenarios you test)

**Feedback**: Please report:
- ✅ What worked well
- ❌ What didn't work
- 🤔 What was confusing
- 💡 Ideas for improvement

**Honesty**: We want to hear about problems! Finding issues now helps everyone later.

### Testing Period

- **Start Date**: [To be announced]
- **End Date**: [To be announced]
- **Duration**: Approximately 2 weeks

### What Happens Next?

After the testing period:

1. We'll review all feedback and bug reports
2. Fix critical issues and improve documentation
3. Release additional test versions if needed (v0.9.1-test, etc.)
4. Prepare for the official v1.0 production release

Your testing directly determines when we're ready for v1.0!

### Thank You!

We genuinely appreciate your time and effort. Every bug you find, every suggestion you make, and every question you ask makes Kaspa All-in-One better for the entire community.

Let's get started! 🚀

---

## Prerequisites

Before you begin testing, ensure your system meets the following requirements. The `start-test.sh` script will check these automatically, but it's helpful to prepare in advance.

### Required Software

#### 1. Docker (version 20.10 or higher)

Docker is required to run all Kaspa services in isolated containers.

**Check if installed:**
```bash
docker --version
```

**Installation instructions:**

- **Linux (Ubuntu/Debian)**:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  # Log out and back in for group changes to take effect
  ```
  Official guide: https://docs.docker.com/engine/install/ubuntu/

- **Linux (RHEL/CentOS/Fedora)**:
  ```bash
  sudo dnf install docker-ce docker-ce-cli containerd.io
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker $USER
  ```
  Official guide: https://docs.docker.com/engine/install/centos/

- **macOS**:
  Download and install Docker Desktop from: https://docs.docker.com/desktop/install/mac-install/
  
- **Windows (WSL2 required)**:
  1. Install WSL2: https://docs.microsoft.com/en-us/windows/wsl/install
  2. Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
  3. Enable WSL2 integration in Docker Desktop settings

**Verify Docker is running:**
```bash
docker ps
```
You should see a list of containers (may be empty).

#### 2. Docker Compose (version 2.0 or higher)

Docker Compose orchestrates multiple Docker containers.

**Check if installed:**
```bash
docker-compose --version
# OR
docker compose version
```

**Installation instructions:**

- **Linux**:
  ```bash
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  ```
  Official guide: https://docs.docker.com/compose/install/

- **macOS**: Included with Docker Desktop

- **Windows**: Included with Docker Desktop

#### 3. Node.js (version 18 or higher)

Node.js is required to run the installation wizard backend.

**Check if installed:**
```bash
node --version
```

**Installation instructions:**

- **Linux (Ubuntu/Debian)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **Linux (RHEL/CentOS/Fedora)**:
  ```bash
  curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
  sudo dnf install -y nodejs
  ```

- **macOS**:
  ```bash
  brew install node@18
  ```
  Or download from: https://nodejs.org/

- **Windows (WSL2)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

Official guide: https://nodejs.org/en/download/package-manager/

### System Requirements

#### Hardware

- **RAM**: Minimum 4GB available (8GB+ recommended)
  - Core Profile: ~2GB
  - Full deployment: 4GB+
  
- **Disk Space**: Minimum 20GB available (50GB+ recommended)
  - Kaspa blockchain: ~15GB (and growing)
  - Docker images: ~2-5GB
  - Application data: varies

- **CPU**: 2+ cores recommended
  - Node sync is CPU-intensive
  - More cores = faster sync

#### Network

- **Internet Connection**: Required for:
  - Downloading Docker images
  - Syncing Kaspa blockchain
  - Accessing external indexers (if using public indexers)
  
- **Ports**: The following ports should be available:
  - `3000`: Installation wizard
  - `8080`: Management dashboard
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

### Permissions

You'll need:
- **Docker access**: Ability to run Docker commands (usually via `docker` group membership)
- **File system access**: Write permissions in the directory where you extract the test package
- **Network access**: Ability to bind to local ports (3000, 8080, etc.)

### Pre-Installation Checklist

Before running `./start-test.sh`, verify:

- [ ] Docker is installed and running (`docker ps` works)
- [ ] Docker Compose is installed (`docker-compose --version` or `docker compose version` works)
- [ ] Node.js 18+ is installed (`node --version` shows v18.x.x or higher)
- [ ] You have at least 4GB RAM available
- [ ] You have at least 20GB disk space available
- [ ] Your internet connection is stable
- [ ] Ports 3000 and 8080 are not in use by other applications

### Quick Verification Script

Run this to check all prerequisites at once:

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

# RAM
if command -v free &> /dev/null; then
    AVAILABLE_RAM=$(free -g | awk '/^Mem:/{print $7}')
    if [ "$AVAILABLE_RAM" -ge 4 ]; then
        echo "✓ RAM: ${AVAILABLE_RAM}GB available"
    else
        echo "⚠ RAM: Only ${AVAILABLE_RAM}GB available (4GB+ recommended)"
    fi
fi

# Disk Space
AVAILABLE_DISK=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_DISK" -ge 20 ]; then
    echo "✓ Disk Space: ${AVAILABLE_DISK}GB available"
else
    echo "⚠ Disk Space: Only ${AVAILABLE_DISK}GB available (20GB+ recommended)"
fi

echo ""
echo "=== Ready to test? Run: ./start-test.sh ==="
```

### Getting Help with Prerequisites

If you have trouble installing prerequisites:

1. **Check official documentation** (links provided above)
2. **Search for platform-specific guides** (e.g., "install Docker on Ubuntu 22.04")
3. **Ask in GitHub Discussions**: [Link to be provided]
4. **Open an issue**: [Link to be provided]

**Note**: The `start-test.sh` script will also check prerequisites and provide installation guidance if anything is missing.

---

## Quick Start

Ready to begin testing? Follow these simple steps to get started:

### Step 1: Download the Test Package

Download the test release archive from GitHub:
- Go to: [GitHub Releases](https://github.com/argonmining/kaspa-all-in-one/releases)
- Find the latest test release (tagged as `v0.9.0-test` or similar)
- Download the archive file (`.tar.gz` or `.zip`)

### Step 2: Extract the Archive

Extract the downloaded archive to a directory of your choice:

**Linux/macOS:**
```bash
tar -xzf kaspa-aio-v0.9.0-test.tar.gz
cd kaspa-aio-v0.9.0-test
```

**Windows (WSL2):**
```bash
unzip kaspa-aio-v0.9.0-test.zip
cd kaspa-aio-v0.9.0-test
```

### Step 3: Run the Quick Start Script

Execute the start script to launch the installation wizard:

```bash
./start-test.sh
```

**What this script does:**
- ✓ Checks that all prerequisites are installed
- ✓ Provides installation instructions if anything is missing
- ✓ Installs wizard dependencies automatically
- ✓ Starts the installation wizard
- ✓ Opens your browser to the wizard interface

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Test Release v0.9.0                  ║
║   Thank you for testing!                                   ║
╚════════════════════════════════════════════════════════════╝

Checking prerequisites...
✓ Docker found: Docker version 24.0.0
✓ Docker Compose found
✓ Node.js found: v18.19.1

✓ All prerequisites met!

Installing wizard dependencies...
✓ Dependencies installed

Starting Installation Wizard...

The wizard will open in your browser at: http://localhost:3000

📖 Testing Instructions: See TESTING.md
🐛 Report Issues: https://github.com/[repo]/issues/new/choose

Waiting for wizard to start...
✓ Wizard is ready!

╔════════════════════════════════════════════════════════════╗
║   Wizard Started Successfully!                             ║
║   Follow the wizard to complete installation               ║
║                                                             ║
║   Need help? Check TESTING.md                              ║
╚════════════════════════════════════════════════════════════╝
```

### Step 4: Follow the Wizard

Your browser should automatically open to `http://localhost:3000`. If it doesn't, manually navigate to that URL.

The wizard will guide you through:

1. **System Check**: Verifies your system meets requirements
2. **Profile Selection**: Choose what you want to install
   - Core Profile (Kaspa node only)
   - Kaspa User Applications (Kasia, K-Social, Explorer)
   - Indexer Services (for developers)
   - And more...
3. **Configuration**: Customize settings (or use defaults)
4. **Review**: Confirm your choices
5. **Installation**: Watch as services are deployed
6. **Complete**: Access your installed services

**Tip**: The wizard saves your progress automatically. If something goes wrong, you can resume where you left off.

### Step 5: Test and Provide Feedback

Once installation completes:

1. **Verify services are running**: Check the dashboard at `http://localhost:8080`
2. **Test the scenarios** described in the [Test Scenarios](#test-scenarios) section below
3. **Report your findings**:
   - 🐛 **Found a bug?** [Report it here](https://github.com/argonmining/kaspa-all-in-one/issues/new?template=bug_report.md)
   - 💡 **Have a suggestion?** [Share it here](https://github.com/argonmining/kaspa-all-in-one/issues/new?template=feature_request.md)
   - 💬 **General feedback?** [Join the discussion](https://github.com/argonmining/kaspa-all-in-one/discussions)

### Troubleshooting Quick Start

**Problem**: Script says "Permission denied"
```bash
# Solution: Make the script executable
chmod +x start-test.sh
./start-test.sh
```

**Problem**: Script says "Docker not found" (but Docker is installed)
```bash
# Solution: Ensure Docker daemon is running
sudo systemctl start docker  # Linux
# OR open Docker Desktop (macOS/Windows)
```

**Problem**: Script says "Node.js version too old"
```bash
# Solution: Install Node.js 18+
# See Prerequisites section for installation instructions
```

**Problem**: Browser doesn't open automatically
```bash
# Solution: Manually open your browser to:
http://localhost:3000
```

**Problem**: Wizard shows "Connection refused"
```bash
# Solution: Check if wizard is running
ps aux | grep node

# If not running, check logs:
cat /tmp/kaspa-wizard.log

# Try starting manually:
cd services/wizard/backend
npm install
node src/server.js
```

**Problem**: Port 3000 or 8080 already in use
```bash
# Solution: Find and stop the conflicting process
sudo lsof -i :3000  # Find what's using port 3000
sudo lsof -i :8080  # Find what's using port 8080

# Kill the process or change ports in wizard configuration
```

### What's Next?

After completing the Quick Start:

- **New to testing?** Start with [Scenario 1: Core Profile Installation](#scenario-1-core-profile-installation-15-minutes)
- **Experienced tester?** Try multiple scenarios and edge cases
- **Short on time?** Even testing one scenario helps!
- **Found an issue?** Report it immediately so we can investigate

### Cleaning Up After Testing

When you're done testing and want to remove everything:

```bash
./cleanup-test.sh
```

This script will:
- Stop the wizard
- Stop all Docker containers
- Optionally remove all data (you'll be asked to confirm)
- Clean up temporary files

**Note**: You can preserve your data if you want to resume testing later.

---

