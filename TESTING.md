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
  - ~~`8080`: Management dashboard~~ (not included in test release)
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
3. **Ask in GitHub Discussions**: https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback
4. **Open an issue**: https://github.com/jtmac69/Kaspa-All-in-One/issues/new/choose

**Note**: The `start-test.sh` script will also check prerequisites and provide installation guidance if anything is missing.

---

## Quick Start

Ready to begin testing? Follow these simple steps to get started:

### Step 1: Download the Test Package

Download the test release archive from GitHub:
- Go to: [GitHub Releases](https://github.com/jtmac69/Kaspa-All-in-One/releases)
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

**Note**: The management dashboard is not included in this test release. Use `docker ps` to check service status and `docker logs <container-name>` to view logs.

1. **Verify services are running**: Check with `docker ps`
2. **Test the scenarios** described in the [Test Scenarios](#test-scenarios) section below
3. **Report your findings**:
   - 🐛 **Found a bug?** [Report it here](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
   - 💡 **Have a suggestion?** [Share it here](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
   - 💬 **General feedback?** [Join the discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

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


## Test Scenarios

This section provides detailed step-by-step instructions for testing different aspects of Kaspa All-in-One. Each scenario is designed to validate specific functionality and help you provide meaningful feedback.

### How to Use These Scenarios

1. **Choose a scenario** based on your interest and available time
2. **Follow the steps exactly** as written (at least the first time)
3. **Document your experience** as you go
4. **Report any deviations** from expected results
5. **Try variations** if you have time (optional)

### Scenario Difficulty Levels

- 🟢 **Beginner**: No prior Kaspa knowledge needed, ~15 minutes
- 🟡 **Intermediate**: Some technical knowledge helpful, ~20-30 minutes
- 🔴 **Advanced**: Technical knowledge required, ~30+ minutes

---

### Scenario 1: Core Profile Installation 🟢 (15 minutes)

**Goal**: Install and verify a basic Kaspa node using the Core Profile

**What You'll Test**:
- Installation wizard flow
- System requirements checking
- Basic Kaspa node deployment
- Service health verification with Docker commands
- Log monitoring and troubleshooting

**Prerequisites**:
- All prerequisites installed (Docker, Docker Compose, Node.js)
- At least 20GB free disk space
- Stable internet connection
- 15-20 minutes of time (mostly waiting for node to start)

#### Step 1: Start the Wizard (2 minutes)

1. **Navigate to the test package directory**:
   ```bash
   cd kaspa-aio-v0.9.0-test
   ```

2. **Run the start script**:
   ```bash
   ./start-test.sh
   ```

3. **Verify the script output**:
   - ✓ Should show "Checking prerequisites..."
   - ✓ Should show green checkmarks for Docker, Docker Compose, Node.js
   - ✓ Should show "Installing wizard dependencies..."
   - ✓ Should show "Starting Installation Wizard..."
   - ✓ Should show "Wizard is ready!"

4. **Verify browser opens automatically**:
   - ✓ Browser should open to `http://localhost:3000`
   - ✓ You should see the Kaspa All-in-One wizard interface
   - ✓ You should see a test release banner at the top (orange/yellow)

**📝 Document**:
- Did the script run without errors? (Yes/No)
- Did the browser open automatically? (Yes/No)
- How long did this step take? (in seconds)
- Any error messages or warnings?

**🐛 If Something Goes Wrong**:
- Script fails: Check the error message and verify prerequisites
- Browser doesn't open: Manually navigate to `http://localhost:3000`
- Port conflict: See troubleshooting section in Quick Start

#### Step 2: System Check (1 minute)

The wizard should automatically start with a system check.

1. **Observe the system check screen**:
   - ✓ Should show "Checking system requirements..."
   - ✓ Should display checks for: Docker, Docker Compose, disk space, RAM, ports
   - ✓ All checks should pass (green checkmarks)

2. **Review the results**:
   - ✓ Docker version should be 20.10+
   - ✓ Available disk space should be 20GB+
   - ✓ Available RAM should be 4GB+
   - ✓ Required ports should be available

3. **Click "Continue" or "Next"** (button text may vary)

**📝 Document**:
- Did all system checks pass? (Yes/No)
- If any failed, which ones?
- Were the check results accurate for your system?
- Was the system check screen clear and understandable?

**🐛 If Something Goes Wrong**:
- Checks fail: Review the specific failure and address it (e.g., free up disk space)
- Checks stuck: Refresh the page and try again
- Inaccurate results: Note the discrepancy in your bug report

#### Step 3: Profile Selection (1 minute)

You should now see the profile selection screen.

1. **Review available profiles**:
   - ✓ Should see multiple profile options
   - ✓ Each profile should have a description
   - ✓ "Core Profile" should be one of the options

2. **Select "Core Profile"**:
   - Click on the "Core Profile" card or radio button
   - ✓ The profile should highlight or show as selected

3. **Read the Core Profile description**:
   - ✓ Should mention: Kaspa node, blockchain sync, RPC access
   - ✓ Should show estimated resources: ~2GB RAM, ~15GB disk
   - ✓ Should show estimated installation time

4. **Click "Continue" or "Next"**

**📝 Document**:
- How many profiles were shown?
- Was the Core Profile description clear?
- Did the resource estimates seem reasonable?
- Was it obvious how to select a profile?

**💡 Suggestions**:
- Were any profiles confusing?
- Would you like to see additional information?
- Any improvements to the profile selection UI?

#### Step 4: Configuration (2 minutes)

The configuration screen allows you to customize settings for your selected profile.

> **📌 Note**: Archive Node Profile has the same configuration options as Core Profile (network selection, ports, data directory). The only differences are the section label ("Archive Node Settings" instead of "Kaspa Node Settings") and the default data directory path (`/data/kaspa-archive` instead of `/data/kaspa`).

1. **Review basic configuration options**:
   - ✓ Should show "Network Configuration" section with:
     - External IP Address field (with "Auto-Detect" button)
     - Public Node toggle
   - ✓ Should show "Kaspa Node Settings" section (since Core Profile is selected):
     - Network selection dropdown (mainnet/testnet) - default: mainnet
     - "Configure Ports" button to customize RPC/P2P ports
   - ✓ Should show "Database Configuration" section:
     - Database Password field (with "Generate" button)

2. **Test network selection**:
   - ✓ Network dropdown should show "mainnet" selected by default
   - ✓ Dropdown should also offer "testnet" option
   - **For this test, keep "mainnet" selected**

3. **Optional: Test port configuration**:
   - Click "Configure Ports" button
   - ✓ Should open a modal/dialog showing:
     - RPC Port field (default: 16110)
     - P2P Port field (default: 16111)
     - "Reset to Defaults" button
   - ✓ Port fields should validate range (1024-65535)
   - **For this test, keep default ports** (16110, 16111)
   - Close the modal without changing values

4. **Check for Advanced Options**:
   - ✓ Should see "Advanced Options" section (may be collapsed)
   - ✓ If expanded, should show:
     - Data directory configuration options
     - Custom environment variables textarea
   - **For this test, don't modify advanced options**

5. **For this test, use default values**:
   - Keep network as "mainnet"
   - Keep default ports (16110, 16111)
   - Don't modify data directories
   - This tests the "happy path" with defaults

6. **Click "Continue" or "Next"**

**📝 Document**:
- Were the configuration sections clearly organized?
- Was the network selection dropdown easy to understand?
- Did the "Configure Ports" button work as expected?
- Were default values clearly shown?
- Did you feel confident proceeding with defaults?
- Were there any confusing options?

**🔍 Optional Exploration**:
- Try hovering over configuration options (are there tooltips?)
- Try clicking on help icons (if present)
- Try changing network to "testnet" - does it show a warning?
- Try entering invalid port numbers - does validation work?
- Expand "Advanced Options" - what additional settings are available?
- Note any options that need better explanation

**🧪 Test Cases for Port Validation** (Optional but Recommended):

If you have time, test the port configuration validation:

1. **Test valid port range**:
   - Click "Configure Ports" button
   - Try entering port 16210 for RPC port
   - ✓ Should accept the value (1024-65535 is valid range)
   - Try entering port 16211 for P2P port
   - ✓ Should accept the value
   - Click "Save" or "Apply"
   - ✓ Should save successfully

2. **Test invalid port - too low**:
   - Click "Configure Ports" button
   - Try entering port 1000 for RPC port (below minimum 1024)
   - ✓ Should show error message: "Port must be between 1024 and 65535"
   - ✓ Should prevent saving until corrected

3. **Test invalid port - too high**:
   - Try entering port 70000 for RPC port (above maximum 65535)
   - ✓ Should show error message: "Port must be between 1024 and 65535"
   - ✓ Should prevent saving until corrected

4. **Test port conflict detection**:
   - Try entering the same port for both RPC and P2P (e.g., 16110 for both)
   - ✓ Should show error message: "RPC and P2P ports must be different"
   - ✓ Should prevent saving until corrected

5. **Test Reset to Defaults**:
   - After changing ports, click "Reset to Defaults" button
   - ✓ Should restore RPC port to 16110
   - ✓ Should restore P2P port to 16111

**📝 Document Port Validation Testing**:
- Did port validation work correctly? (Yes/No)
- Were error messages clear and helpful? (Yes/No)
- Was it easy to correct validation errors? (Yes/No)
- Did the "Reset to Defaults" button work? (Yes/No)

**🧪 Test Cases for Network Change Warning** (Optional but Recommended):

If you have time, test the network change warning:

1. **Test changing from mainnet to testnet**:
   - In the Network dropdown, select "testnet"
   - ✓ Should immediately show a warning dialog/modal
   - ✓ Warning should explain:
     - "Mainnet and testnet data are incompatible"
     - "Changing networks requires a fresh installation"
     - "Existing blockchain data will not work with the new network"
   - ✓ Should provide two options:
     - "Cancel" - keeps mainnet selected
     - "Change Network" or "Proceed" - confirms the change

2. **Test canceling network change**:
   - Click "Cancel" in the warning dialog
   - ✓ Network dropdown should revert to "mainnet"
   - ✓ No changes should be applied

3. **Test confirming network change**:
   - Select "testnet" again
   - Click "Change Network" or "Proceed" in the warning dialog
   - ✓ Network dropdown should now show "testnet" selected
   - ✓ Warning dialog should close
   - ✓ Configuration should reflect testnet selection

4. **Test changing back to mainnet**:
   - In the Network dropdown, select "mainnet"
   - ✓ Should show the same warning dialog (testnet → mainnet also requires fresh install)
   - ✓ Warning should be consistent with previous warning

**📝 Document Network Change Warning Testing**:
- Did the warning appear when changing networks? (Yes/No)
- Was the warning message clear and informative? (Yes/No)
- Were the consequences of changing networks explained? (Yes/No)
- Did the "Cancel" option work correctly? (Yes/No)
- Did the "Proceed" option work correctly? (Yes/No)
- Would you have understood the implications without the warning? (Yes/No)

**💡 Suggestions**:
- Is the organization of configuration options intuitive?
- Should any options be more prominent or hidden?
- Are the tooltips helpful?
- Would you prefer all options visible or the current progressive disclosure?
- Are the validation error messages helpful?
- Is the network change warning sufficiently clear?

#### Step 5: Review and Confirm (1 minute)

The review screen shows a summary before installation begins.

1. **Review the installation summary**:
   - ✓ Should show selected profile: "Core Profile"
   - ✓ Should show configuration details including:
     - Network: mainnet
     - RPC Port: 16110
     - P2P Port: 16111
     - Public Node: [your selection]
   - ✓ Should show list of services to be installed
   - ✓ Should show estimated disk space usage
   - ✓ Should show estimated installation time

2. **Verify the information is correct**:
   - Profile: Core Profile
   - Network: mainnet
   - Services: Kaspa node (kaspad), Dashboard, Nginx
   - Ports: 16110 (RPC), 16111 (P2P)

3. **Look for any warnings or notices**:
   - ✓ May show notice about blockchain sync time
   - ✓ May show notice about disk space requirements

4. **Click "Install" or "Start Installation"**

**📝 Document**:
- Was the configuration summary clear and complete?
- Were all your selections accurately reflected?
- Did you feel confident starting the installation?

**📝 Document**:
- Was the review screen comprehensive?
- Did it give you confidence to proceed?
- Were there any surprises in the summary?
- Was the "Install" button clearly visible?

**⚠️ Important**: Once you click "Install", the actual deployment begins. This is the point of no return (though you can always clean up later).

#### Step 6: Installation Progress (5-8 minutes)

The installation process will now begin. This involves downloading Docker images and starting services.

1. **Observe the progress screen**:
   - ✓ Should show "Installing..." or similar message
   - ✓ Should show progress indicator (percentage, spinner, or progress bar)
   - ✓ Should show current step or task being performed
   - ✓ May show logs or detailed output

2. **Watch for these stages** (order may vary):
   - "Pulling Docker images..." (2-5 minutes)
   - "Creating Docker containers..."
   - "Starting Kaspa node..."
   - "Waiting for services to be ready..."
   - "Running health checks..."

3. **Note the time taken for each stage**

4. **Do NOT close the browser or refresh the page** during installation

**📝 Document**:
- How long did the entire installation take?
- Were progress updates clear and frequent?
- Did you feel informed about what was happening?
- Were there any long periods with no updates?
- Did any stage take unexpectedly long?

**🐛 If Something Goes Wrong**:
- Installation hangs: Wait at least 5 minutes before taking action
- Error message appears: Take a screenshot and note the exact message
- Browser disconnects: Try refreshing the page (wizard should resume)
- Installation fails: Note the error and proceed to cleanup

**💡 What's Actually Happening**:
- Docker is downloading the Kaspa node image (~500MB-1GB)
- Docker Compose is creating and configuring containers
- The Kaspa node is starting up and beginning blockchain sync
- Health checks are verifying the node is responding

#### Step 7: Installation Complete (1 minute)

When installation finishes, you should see a completion screen.

1. **Verify the completion message**:
   - ✓ Should show "Installation Complete!" or similar success message
   - ✓ Should show summary of what was installed
   - ✓ Should show list of running services

2. **Check for access information**:
   - ~~Dashboard link~~ (dashboard not included in test release)
   - ✓ Should show Kaspa node RPC endpoint: `localhost:16110`
   - ✓ May show additional information or next steps

3. **Look for any warnings or notices**:
   - ✓ May show notice: "Kaspa node is syncing blockchain (this may take several hours)"
   - ✓ May show notice: "Node will be fully functional after sync completes"

4. **Verify services are running**:
   ```bash
   docker ps
   ```
   - ✓ Should show `kaspa-node` container with status "Up"
   - ✓ Container should be running for a few seconds/minutes

**📝 Document**:
- Was the completion message clear and celebratory?
- Was the access information easy to find?
- Were you informed about next steps?
- Did you understand that blockchain sync would continue in background?

#### Step 8: Verify Service Status (2 minutes)

Now let's verify the Kaspa node is running correctly.

1. **Check running containers**:
   ```bash
   docker ps
   ```
   - ✓ Should show `kaspa-node` container
   - ✓ Status should show "Up" with uptime
   - ✓ Ports should show `16110-16111->16110-16111/tcp`

2. **Check service logs**:
   ```bash
   docker logs kaspa-node --tail 50
   ```
   - ✓ Should show kaspad startup messages
   - ✓ Should show "Starting sync" or similar messages
   - ✓ Should show block processing messages
   - ✓ No error messages should be present

3. **Check sync progress** (optional):
   ```bash
   docker logs kaspa-node | grep -i "sync\|block"
   ```
   - ✓ Should show sync progress messages
   - ✓ Should show current block height increasing

**📝 Document**:
- Did `docker ps` show the kaspa-node running? (Yes/No)
- Were the logs showing normal operation? (Yes/No)
- Was the sync progress visible in logs? (Yes/No)
- Were there any error messages? (Yes/No - describe if yes)

**🐛 If Something Goes Wrong**:
- Container not running: Check `docker ps -a` to see if it exited, then check logs with `docker logs kaspa-node`
- Error messages in logs: Copy the error and report it as a bug
- No sync information: May take a minute to appear, try refreshing

#### Step 9: Verify Kaspa Node (2 minutes)

Let's verify the Kaspa node is actually running and accessible.

1. **Check Docker containers**:
   ```bash
   docker ps
   ```
   - ✓ Should see a container named `kaspa-node` or similar
   - ✓ Status should be "Up" (not "Restarting" or "Exited")

2. **Check Kaspa node logs**:
   ```bash
   docker logs kaspa-node --tail 50
   ```
   - ✓ Should see log output from kaspad
   - ✓ Should see messages about connecting to peers
   - ✓ Should see messages about syncing blocks
   - ✓ Should NOT see repeated error messages

3. **Test RPC connectivity** (optional, requires `curl`):
   ```bash
   curl -X POST http://localhost:16110 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"getBlockDagInfo","params":[],"id":1}'
   ```
   - ✓ Should return JSON response with blockchain info
   - ✓ Should NOT return connection error

4. **Check resource usage** (optional):
   ```bash
   docker stats kaspa-node --no-stream
   ```
   - ✓ Should show CPU and memory usage
   - ✓ CPU usage may be high during sync (50-100%)
   - ✓ Memory usage should be around 2GB

**📝 Document**:
- Was the Kaspa node container running? (Yes/No)
- Were the logs showing normal activity? (Yes/No)
- Did the RPC test work? (Yes/No/Skipped)
- What was the resource usage?

**💡 Understanding the Logs**:
- "Connected to peer": Node is communicating with network
- "Syncing blocks": Node is downloading blockchain
- "Block X accepted": Node is processing blocks
- Errors are normal during initial sync (network issues, peer disconnections)

#### Step 10: Test Cleanup (2 minutes)

Finally, let's test the cleanup process.

1. **Run the cleanup script**:
   ```bash
   ./cleanup-test.sh
   ```

2. **Respond to prompts**:
   - First prompt: "This will stop all services and remove all data. Continue? (y/N)"
     - Type `y` and press Enter
   - Second prompt: "Remove all data? This includes blockchain data. (y/N)"
     - Type `y` and press Enter (for this test)

3. **Verify cleanup output**:
   - ✓ Should show "Stopping services..."
   - ✓ Should show "✓ Wizard stopped"
   - ✓ Should show "✓ Docker containers stopped"
   - ✓ Should show "✓ Data removed"
   - ✓ Should show "✓ Logs removed"
   - ✓ Should show "✓ Cleanup complete!"

4. **Verify cleanup was successful**:
   ```bash
   docker ps -a | grep kaspa
   ```
   - ✓ Should show no Kaspa-related containers
   
   ```bash
   ls -la .kaspa-aio 2>/dev/null
   ```
   - ✓ Should show "No such file or directory" (data was removed)

**📝 Document**:
- Did the cleanup script run without errors? (Yes/No)
- Were the prompts clear? (Yes/No)
- Was cleanup successful? (Yes/No)
- How long did cleanup take?
- Did you feel safe that cleanup wouldn't affect other parts of your system?

**🐛 If Something Goes Wrong**:
- Script fails: Try manually stopping containers with `docker-compose down -v`
- Containers still running: Try `docker stop $(docker ps -q)` (stops all containers)
- Data not removed: Manually remove with `rm -rf .kaspa-aio`

---

### Scenario 1: Summary and Feedback

Congratulations! You've completed Scenario 1: Core Profile Installation. 🎉

#### What You Tested

- ✅ Quick start script
- ✅ Prerequisite checking
- ✅ Installation wizard flow (system check → profile selection → configuration → review → installation)
- ✅ Progress tracking during installation
- ✅ Service monitoring with Docker commands (`docker ps`, `docker logs`)
- ✅ Kaspa node deployment and verification
- ✅ Cleanup process

#### Time to Complete

**Expected**: ~15 minutes  
**Your Time**: _____ minutes

#### Overall Experience

Please rate your experience (1-5 stars):

- **Ease of installation**: ⭐⭐⭐⭐⭐
- **Clarity of instructions**: ⭐⭐⭐⭐⭐
- **Quality of error messages**: ⭐⭐⭐⭐⭐
- **Service monitoring tools**: ⭐⭐⭐⭐⭐
- **Overall satisfaction**: ⭐⭐⭐⭐⭐

#### Provide Detailed Feedback

Now is the time to report your findings! Please create a bug report or feedback post with:

**What Worked Well** ✅:
- (List things that worked smoothly)

**What Didn't Work** ❌:
- (List any errors, failures, or problems)

**What Was Confusing** 🤔:
- (List anything that was unclear or hard to understand)

**Suggestions for Improvement** 💡:
- (List ideas for making it better)

**System Information**:
- OS: (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
- Docker Version: (from `docker --version`)
- Node.js Version: (from `node --version`)
- Total Time: (how long the entire scenario took)

#### Where to Submit Feedback

- **Bug Report**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
- **Feature Request**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
- **General Feedback**: [Join Discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

#### Next Steps

- **Want to test more?** Try [Scenario 2: Kaspa User Applications](#scenario-2-kaspa-user-applications-20-minutes)
- **Found a critical bug?** Report it immediately
- **Short on time?** You're done! Thank you for testing!
- **Want to test again?** Re-run `./start-test.sh` and try different options

#### Thank You!

Your feedback from this scenario is invaluable. Every detail you report helps make Kaspa All-in-One better for everyone. 🙏

---

### Scenario 2: Kaspa User Applications 🟡 (20-30 minutes)

**Goal**: Install and verify user-facing Kaspa applications (Kasia, K-Social, Kaspa Explorer)

**What You'll Test**:
- Kaspa User Applications profile installation
- Public indexer configuration
- Multiple application deployment (3 applications)
- Application accessibility and functionality
- Service integration

**Prerequisites**:
- All prerequisites installed (Docker, Docker Compose, Node.js)
- At least 20GB free disk space
- Stable internet connection
- 20-30 minutes of time (includes build time for applications)

**Note**: This scenario installs applications that connect to public indexer endpoints hosted by the community. You don't need to run your own indexer infrastructure, which makes installation faster and less resource-intensive. The applications will use the Kaspa network for blockchain data via these public indexers.

#### Step 1: Start Fresh (2 minutes)

If you've already completed Scenario 1, let's start with a clean slate.

1. **Run the fresh start script**:
   ```bash
   ./fresh-start.sh
   ```

2. **Respond to prompts**:
   - "Remove data volumes? (y/N)" → Type `y` and press Enter
   - "Continue with fresh start? (y/N)" → Type `y` and press Enter

3. **Verify cleanup**:
   - ✓ Should show "✓ Containers and volumes removed"
   - ✓ Should show "✓ Fresh start complete!"

4. **Start the wizard**:
   ```bash
   ./start-test.sh
   ```

5. **Verify wizard opens**:
   - ✓ Browser should open to `http://localhost:3000`
   - ✓ You should see the wizard interface

**📝 Document**:
- Did the fresh start work correctly? (Yes/No)
- Did the wizard start successfully? (Yes/No)

**🐛 If Something Goes Wrong**:
- Fresh start fails: Try `docker-compose down -v` manually
- Wizard won't start: Check logs at `/tmp/kaspa-wizard.log`

#### Step 2: System Check (1 minute)

The wizard should automatically perform a system check.

1. **Observe the system check**:
   - ✓ Should check Docker, Docker Compose, disk space, RAM, ports
   - ✓ All checks should pass (green checkmarks)

2. **Note any warnings**:
   - May warn about disk space if less than 30GB available
   - May warn about RAM if less than 8GB available

3. **Click "Continue" or "Next"**

**📝 Document**:
- Did all system checks pass? (Yes/No)
- Were there any warnings about resources?
- Are the resource requirements clearly explained?

#### Step 3: Profile Selection (2 minutes)

Now you'll select the Kaspa User Applications profile.

1. **Review available profiles**:
   - ✓ Should see multiple profile options
   - ✓ Look for "Kaspa User Applications" profile

2. **Read the Kaspa User Applications description**:
   - ✓ Should mention: Kasia (messaging), K-Social (social platform), Kaspa Explorer (blockchain explorer)
   - ✓ Should show estimated resources (higher than Core Profile)
   - ✓ Should show estimated installation time

3. **Select "Kaspa User Applications"**:
   - Click on the profile card or radio button
   - ✓ The profile should highlight or show as selected

4. **Click "Continue" or "Next"**

**📝 Document**:
- Was the Kaspa User Applications profile easy to find?
- Was the description clear about what would be installed?
- Were the resource estimates helpful?
- Did you understand the difference from Core Profile?

**💡 What's Different from Core Profile?**:
- Core Profile: Runs a local Kaspa node for blockchain access
- Kaspa User Applications: Runs three user-facing apps (Kasia, K-Social, Kaspa Explorer) that connect to public indexers and the Kaspa network
- This profile doesn't include a local Kaspa node - apps use remote services
- More services = more resources needed, but less than running local indexers

#### Step 4: Indexer Endpoint Configuration (2 minutes)

This step configures the indexer endpoints that the Kaspa User Applications will use.

1. **Review the Indexer Endpoints section**:
   - ✓ Should see "Indexer Endpoints" configuration section
   - ✓ Should show three URL fields with default values

2. **Check the default indexer URLs**:
   - **Kasia Indexer URL**: `https://api.kasia.io/`
     - This is the public indexer endpoint for the Kasia application
   - **K-Social Indexer URL**: `https://indexer.kaspatalk.net/`
     - This is the public indexer endpoint for the K-Social application
   - **Kaspa Node WebSocket URL**: `wss://api.kasia.io/ws`
     - This is the WebSocket endpoint for real-time Kaspa node connections

3. **For this test, use the default public indexer URLs**:
   - Don't change any of the URLs
   - These defaults point to community-hosted public indexers
   - This is the recommended configuration for most users

4. **Understand what these URLs do**:
   - The applications will connect to these public indexers to query blockchain data
   - You don't need to run your own indexer infrastructure
   - This makes installation faster and less resource-intensive

5. **Click "Continue" or "Next"**

**📝 Document**:
- Were the indexer endpoint fields clearly labeled?
- Were the default URLs pre-filled and visible?
- Did you understand what each URL is for?
- Was it clear that these are public indexers (not local)?
- Were there helpful tooltips or explanations?

**🔍 Understanding Indexer Endpoints**:
- Indexers process blockchain data and make it queryable via APIs
- Applications like Kasia and K-Social need indexers to function
- Public indexers are hosted by the community (free to use)
- The default URLs point to reliable public indexer services
- Advanced users can change these URLs to point to their own local indexers if they're also running the indexer-services profile

#### Step 5: Advanced Options (Optional - 1 minute)

Review any advanced configuration options if needed.

1. **Check for Advanced Options section**:
   - ✓ May see "Advanced Options" section (possibly collapsed/expandable)
   - ✓ Should show "Custom Environment Variables" field

2. **For this test, skip advanced options**:
   - Don't expand or modify advanced options
   - The default configuration is sufficient for testing
   - Advanced options are for experienced users who need custom settings

3. **Click "Continue" or "Next"**

**📝 Document**:
- Was it clear that advanced options are optional?
- Was the advanced section easy to skip?
- Did the interface guide you to proceed with defaults?

**💡 About Advanced Options**:
- Custom environment variables allow advanced users to override any Docker Compose settings
- Most users don't need to modify these
- The applications will use sensible defaults for ports and other settings

#### Step 6: Review and Confirm (2 minutes)

Review the installation summary before proceeding.

1. **Review the installation summary**:
   - ✓ Should show selected profile: "Kaspa User Applications"
   - ✓ Should show list of services to be installed:
     - Kasia app (port 3001)
     - K-Social app (port 3003)
     - Kaspa Explorer (port 3004)
   - ✓ Should show indexer endpoint URLs configured:
     - Kasia Indexer: `https://api.kasia.io/`
     - K-Social Indexer: `https://indexer.kaspatalk.net/`
     - Kaspa Node WebSocket: `wss://api.kasia.io/ws`
   - ✓ Should show estimated disk space usage
   - ✓ Should show estimated installation time

2. **Verify the information**:
   - Profile: Kaspa User Applications
   - Indexer endpoints: Public URLs (community-hosted)
   - Services: Kasia, K-Social, Kaspa Explorer

3. **Look for important notices**:
   - ✓ May show notice about build time (applications need to be built)
   - ✓ May show notice about public indexer dependencies
   - ✓ May show notice about blockchain sync (for the node)

4. **Click "Install" or "Start Installation"**

**📝 Document**:
- Was the review screen comprehensive?
- Did it clearly show all services being installed?
- Were you informed about build time?
- Did you feel confident to proceed?

**⚠️ Important**: This installation will take longer than Core Profile because:
- Multiple Docker images need to be downloaded
- Applications need to be built from source (5-10 minutes)
- More services need to start and become healthy

#### Step 7: Installation Progress (10-15 minutes)

The installation process will now begin. This takes longer than Core Profile due to building applications.

1. **Observe the progress screen**:
   - ✓ Should show "Installing..." or similar message
   - ✓ Should show progress indicator
   - ✓ Should show current step or task

2. **Watch for these stages** (order may vary):
   - "Pulling Docker images..." (3-5 minutes)
     - Base images for applications
   - "Building applications..." (5-10 minutes) ⏰ **This is the longest step**
     - Building Kasia app
     - Building K-Social app
     - Building Kaspa Explorer
     - May show build logs or progress
   - "Creating Docker containers..."
   - "Starting services..."
   - "Waiting for services to be ready..."
   - "Running health checks..."

3. **Note the time taken for each stage**

4. **Do NOT close the browser or refresh the page** during installation

**📝 Document**:
- How long did the entire installation take?
- How long did the "Building applications" stage take?
- Were progress updates clear and frequent?
- Did you understand what was happening during the build?
- Were there any long periods with no updates?
- Did any stage take unexpectedly long?

**🐛 If Something Goes Wrong**:
- Build fails: Note the error message (may be related to network or dependencies)
- Installation hangs: Wait at least 10 minutes before taking action
- Error message appears: Take a screenshot and note the exact message
- Browser disconnects: Try refreshing (wizard should resume)

**💡 What's Actually Happening**:
- Docker is downloading base images for applications
- Applications are being compiled from source code (this takes time!)
- Docker Compose is creating and configuring containers
- Services are starting up and running health checks
- The Kaspa node is starting and beginning blockchain sync

**🔍 Why Does Building Take So Long?**:
- Kasia, K-Social, and Kaspa Explorer are full web applications
- They need to be compiled (JavaScript, CSS, assets)
- Dependencies need to be installed
- **Kasia specifically takes 5-10 minutes** because it:
  - Downloads pre-built kaspa-wasm binaries (~2-3 min)
  - Installs Rust toolchain and compiles WASM modules (~2-3 min)
  - Installs npm dependencies and builds the application (~2-3 min)
- This is normal and only happens once (Docker caches the build)

#### Step 8: Installation Complete (1 minute)

When installation finishes, you should see a completion screen.

1. **Verify the completion message**:
   - ✓ Should show "🎉 Installation Complete!" with celebration animation
   - ✓ Should show "Service Verification" section checking service health
   - ✓ Should show list of services with their status (Running/Stopped)

2. **Check the service verification section**:
   - ✓ Should automatically check all installed services
   - ✓ Should show each service with a status indicator (✓ Running, ⏸️ Stopped, ⚠️ Not Found)
   - ✓ Should show summary: "All services healthy" or "Some services need attention"
   - ✓ Services shown: Kasia App, K Social, Kaspa Explorer

3. **Review the "Getting Started" section**:
   - ✓ Should show guide cards for: Monitor Your System, Wait for Sync, Manage Services, Learn More
   - ✓ Should have "Open Dashboard" button (note: dashboard not included in test release)
   - ✓ Should have "Quick Actions" section with buttons for common tasks

4. **Note the service ports** for manual testing:
   - Kasia app: `http://localhost:3001`
   - K-Social app: `http://localhost:3003`
   - Kaspa Explorer: `http://localhost:3004`

**📝 Document**:
- Was the completion message clear and celebratory?
- Did the service verification work correctly?
- Were the service statuses accurate?
- Was the "Getting Started" guidance helpful?
- Did you understand what to do next?

**Note**: The completion page shows service status but doesn't include direct access links to the applications. You'll need to manually navigate to the ports listed above. The management dashboard (which will provide direct links) is not included in this test release.

#### Step 9: Verify Services with Docker (2 minutes)

Let's verify the services are running using Docker commands.

1. **Check running containers**:
   ```bash
   docker ps
   ```
   - ✓ Should show `kasia-app` container with status "Up"
   - ✓ Should show `k-social` container with status "Up"
   - ✓ Should show `kaspa-explorer` container with status "Up"
   - ✓ All containers should be running for at least a few seconds

2. **Check container health** (if health checks are configured):
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```
   - ✓ Containers should show "Up" status
   - ✓ May show "(healthy)" indicator if health checks are passing

3. **Check for any stopped or restarting containers**:
   - If any container shows "Restarting" or "Exited", note it for bug report
   - Check logs: `docker logs <container-name>`

**📝 Document**:
- Were all expected containers running? (Yes/No)
- Were there any containers in error states? (Yes/No)
- Was it easy to verify service status with Docker commands?
- Would you have preferred a dashboard for this? (Yes/No)

**🐛 If Something Goes Wrong**:
- Container not running: Check logs with `docker logs <container-name>`
- Container restarting: Check logs for error messages
- Port conflicts: Check if ports 3001, 3003 are already in use

#### Step 10: Verify Kasia App (3 minutes)

Now let's test the Kasia application.

1. **Open Kasia app** at `http://localhost:3001`:
   - ✓ Application should load without errors
   - ✓ Should show Kasia interface

2. **Check the initial screen**:
   - ✓ Should show welcome screen or login/signup interface
   - ✓ Should not show connection errors
   - ✓ Should not show indexer errors

3. **Test basic functionality** (optional, brief):
   - Try creating an account (if prompted)
   - Try exploring the interface
   - Check if the app is responsive

4. **Check for error messages**:
   - ✓ Should NOT show "Cannot connect to indexer"
   - ✓ Should NOT show "Cannot connect to Kaspa node"
   - ✓ Should NOT show "Service unavailable"

5. **Check browser console** (F12 → Console tab):
   - ✓ Should not show repeated error messages
   - ✓ May show some warnings (normal)
   - ✓ Should not show network errors

**📝 Document**:
- Did Kasia app load successfully? (Yes/No)
- Was the interface responsive? (Yes/No)
- Were there any error messages? (Yes/No - if yes, what?)
- Did the app appear to be functioning correctly? (Yes/No)
- Was it clear what the app does?

**🐛 If Something Goes Wrong**:
- App doesn't load: Check if container is running with `docker ps`
- Connection errors: Check if public indexer is accessible
- Blank page: Check browser console for JavaScript errors
- Slow loading: May be normal on first access (caching)

**💡 What is Kasia?**:
- Kasia is a messaging application built on Kaspa
- It uses the Kaspa blockchain for certain features
- It requires an indexer to query blockchain data
- In this setup, it's using public indexers

#### Step 11: Verify K-Social App (3 minutes)

Now let's test the K-Social application.

1. **Open K-Social app** at `http://localhost:3003`:
   - ✓ Application should load without errors
   - ✓ Should show K-Social interface

2. **Check the initial screen**:
   - ✓ Should show welcome screen or main interface
   - ✓ Should not show connection errors
   - ✓ Should not show indexer errors

3. **Test basic functionality** (optional, brief):
   - Try exploring the interface
   - Check if content loads
   - Check if the app is responsive

4. **Check for error messages**:
   - ✓ Should NOT show "Cannot connect to indexer"
   - ✓ Should NOT show "Cannot connect to Kaspa node"
   - ✓ Should NOT show "Service unavailable"

5. **Check browser console** (F12 → Console tab):
   - ✓ Should not show repeated error messages
   - ✓ May show some warnings (normal)
   - ✓ Should not show network errors

**📝 Document**:
- Did K-Social app load successfully? (Yes/No)
- Was the interface responsive? (Yes/No)
- Were there any error messages? (Yes/No - if yes, what?)
- Did the app appear to be functioning correctly? (Yes/No)
- Was it clear what the app does?

**🐛 If Something Goes Wrong**:
- App doesn't load: Check if container is running with `docker ps`
- Connection errors: Check if public indexer is accessible
- Blank page: Check browser console for JavaScript errors
- Slow loading: May be normal on first access

**💡 What is K-Social?**:
- K-Social is a social platform built on Kaspa
- It demonstrates how to build applications on Kaspa
- It requires an indexer to query blockchain data
- In this setup, it's using public indexers

#### Step 12: Verify Kaspa Explorer (3 minutes)

Now let's test the Kaspa Explorer application.

1. **Open Kaspa Explorer** at `http://localhost:3004`:
   - ✓ Application should load without errors
   - ✓ Should show Kaspa Explorer interface (blockchain explorer)

2. **Check the initial screen**:
   - ✓ Should show blockchain statistics (blocks, transactions, etc.)
   - ✓ Should show search functionality (search by address, transaction, block)
   - ✓ Should not show connection errors
   - ✓ Should not show indexer errors

3. **Test basic functionality** (optional, brief):
   - Try viewing recent blocks
   - Try viewing recent transactions
   - Try using the search feature (if you have a Kaspa address to search)
   - Check if the app is responsive

4. **Check for error messages**:
   - ✓ Should NOT show "Cannot connect to indexer"
   - ✓ Should NOT show "Cannot connect to API"
   - ✓ Should NOT show "Service unavailable"

5. **Check browser console** (F12 → Console tab):
   - ✓ Should not show repeated error messages
   - ✓ May show some warnings (normal)
   - ✓ Should not show network errors

**📝 Document**:
- Did Kaspa Explorer load successfully? (Yes/No)
- Was the interface responsive? (Yes/No)
- Were there any error messages? (Yes/No - if yes, what?)
- Did the app appear to be functioning correctly? (Yes/No)
- Was blockchain data displaying correctly? (Yes/No)
- Was it clear what the app does?

**🐛 If Something Goes Wrong**:
- App doesn't load: Check if container is running with `docker ps`
- Connection errors: Check if public indexer is accessible
- Blank page: Check browser console for JavaScript errors
- Slow loading: May be normal on first access (caching)
- No data showing: May indicate indexer connectivity issues

**💡 What is Kaspa Explorer?**:
- Kaspa Explorer is a blockchain explorer for the Kaspa network
- It allows users to view blocks, transactions, and addresses
- It requires an indexer to query blockchain data
- In this setup, it's using public indexers
- Similar to block explorers for other cryptocurrencies (like Etherscan for Ethereum)

#### Step 13: Verify Docker Containers (2 minutes)

Let's verify all containers are running correctly.

1. **Check Docker containers**:
   ```bash
   docker ps
   ```
   - ✓ Should see three containers:
     - `kasia-app` - Status: Up
     - `k-social` - Status: Up
     - `kaspa-explorer` - Status: Up
   - ✓ All should show "Up" status (not "Restarting" or "Exited")
   
   **Note**: Kaspa node is NOT included in this profile - apps use remote indexers

2. **Check container logs** (sample a few):
   ```bash
   docker logs kasia-app --tail 20
   docker logs k-social --tail 20
   docker logs kaspa-explorer --tail 20
   ```
   - ✓ Should see normal application logs
   - ✓ Should NOT see repeated error messages
   - ✓ May see startup messages and access logs

3. **Check resource usage**:
   ```bash
   docker stats --no-stream
   ```
   - ✓ Should show CPU and memory usage for all containers
   - ✓ Applications should use moderate resources

**📝 Document**:
- Were all expected containers running? (Yes/No)
- Were the logs showing normal activity? (Yes/No)
- What was the total resource usage?
- Were any containers using unexpectedly high resources?

**💡 Expected Resource Usage**:
- Kasia app: 5-10% CPU, 200-500MB RAM
- K-Social app: 5-10% CPU, 200-500MB RAM
- Kaspa Explorer: 5-10% CPU, 200-500MB RAM

**Note**: Kaspa node is NOT included in this profile - apps use remote indexers

#### Step 14: Test Service Integration (3 minutes)

Let's verify that services are properly integrated and can access blockchain data.

1. **Test application → indexer connection**:
   - In Kasia app, try to view blockchain data (if feature available)
   - In K-Social app, try to view content (if feature available)
   - In Kaspa Explorer, try to view recent blocks and transactions
   - ✓ Should work without errors
   - ✓ Should show data from blockchain

2. **Test Kaspa Explorer blockchain queries**:
   - View the latest blocks
   - View recent transactions
   - Try searching for a block number (e.g., block 1)
   - ✓ All queries should return data
   - ✓ Data should be current and accurate

3. **Test concurrent indexer access**:
   - Have all three applications open simultaneously
   - Try using features in each that query blockchain data
   - ✓ All applications should work without conflicts
   - ✓ No application should show "indexer unavailable" errors

**📝 Document**:
- Did applications successfully connect to indexers? (Yes/No)
- Did Kaspa Explorer display blockchain data correctly? (Yes/No)
- Were all three applications able to access indexers simultaneously? (Yes/No)
- Were there any performance issues with concurrent access? (Yes/No)

**🐛 If Something Goes Wrong**:
- Indexer connection fails: Check if public indexers are accessible
- Data not loading: Check browser console for API errors
- Slow responses: Public indexers may be under load (this is normal)

**💡 Why Test Concurrent Access?**:
- Verifies that multiple applications can share indexer endpoints
- Tests that applications don't interfere with each other's API calls
- Ensures the system can handle realistic usage patterns

#### Step 15: Test Service Management (3 minutes)

Let's test the service management scripts with multiple services.

1. **Check status**:
   ```bash
   ./status.sh
   ```
   - ✓ Should show wizard status
   - ✓ Should show all Docker services (kasia-app, k-social, kaspa-explorer)
   - ✓ Should show resource usage for each service
   - ✓ Should show ports in use (3001, 3003, 3004)

2. **Test restart**:
   ```bash
   ./restart-services.sh
   ```
   - ✓ Should stop all services
   - ✓ Should start all services
   - ✓ Should show service status after restart
   - ✓ All services should come back up

3. **Verify services after restart**:
   - Open Kasia: `http://localhost:3001`
   - Open K-Social: `http://localhost:3003`
   - Open Kaspa Explorer: `http://localhost:3004`
   - ✓ All should still work

**📝 Document**:
- Did the status script show all three services? (Yes/No)
- Did the restart work correctly? (Yes/No)
- How long did restart take?
- Did all services come back up healthy? (Yes/No)

**💡 Why Test Restart?**:
- Verifies services can recover from restarts
- Tests that configuration is persistent
- Ensures no data is lost during restart

#### Step 16: Test Cleanup (2 minutes)

Finally, let's test the cleanup process with multiple services.

1. **Run the cleanup script**:
   ```bash
   ./cleanup-test.sh
   ```

2. **Respond to prompts**:
   - First prompt: "This will stop all services and remove all data. Continue? (y/N)"
     - Type `y` and press Enter
   - Second prompt: "Remove all data? This includes blockchain data. (y/N)"
     - Type `y` and press Enter

3. **Verify cleanup output**:
   - ✓ Should show "Stopping services..."
   - ✓ Should show "✓ Wizard stopped"
   - ✓ Should show "✓ Docker containers stopped"
   - ✓ Should show "✓ Data removed"
   - ✓ Should show "✓ Logs removed"
   - ✓ Should show "✓ Cleanup complete!"

4. **Verify cleanup was successful**:
   ```bash
   docker ps -a | grep kaspa
   ```
   - ✓ Should show no Kaspa-related containers

**📝 Document**:
- Did the cleanup script run without errors? (Yes/No)
- Were all services stopped? (Yes/No)
- Was cleanup successful? (Yes/No)
- How long did cleanup take?

---

### Scenario 2: Summary and Feedback

Congratulations! You've completed Scenario 2: Kaspa User Applications. 🎉

#### What You Tested

- ✅ Kaspa User Applications profile installation
- ✅ Public indexer configuration
- ✅ Multiple application deployment (Kasia, K-Social, Kaspa Explorer)
- ✅ Application build process (3 applications)
- ✅ Application accessibility and functionality
- ✅ Blockchain explorer functionality (Kaspa Explorer)
- ✅ Service integration (apps → public indexers)
- ✅ Concurrent application access
- ✅ Service management with multiple services
- ✅ Cleanup process

#### Time to Complete

**Expected**: ~20-30 minutes  
**Your Time**: _____ minutes

**Build Time**: _____ minutes (just the "Building applications" stage)

#### Overall Experience

Please rate your experience (1-5 stars):

- **Ease of installation**: ⭐⭐⭐⭐⭐
- **Clarity of instructions**: ⭐⭐⭐⭐⭐
- **Build process transparency**: ⭐⭐⭐⭐⭐
- **Application functionality**: ⭐⭐⭐⭐⭐
- **Dashboard usefulness**: ⭐⭐⭐⭐⭐
- **Overall satisfaction**: ⭐⭐⭐⭐⭐

#### Comparison with Scenario 1

How did this scenario compare to Scenario 1 (Core Profile)?

- **Installation time**: Longer / Similar / Shorter
- **Complexity**: More complex / Similar / Simpler
- **Resource usage**: Higher / Similar / Lower
- **Value**: More useful / Similar / Less useful

#### Provide Detailed Feedback

Now is the time to report your findings! Please create a bug report or feedback post with:

**What Worked Well** ✅:
- (List things that worked smoothly)
- Example: "Build process was clearly explained"
- Example: "Applications loaded quickly"
- Example: "Public indexer configuration was easy"

**What Didn't Work** ❌:
- (List any errors, failures, or problems)
- Example: "Kasia app showed connection error"
- Example: "Build took longer than expected"
- Example: "Dashboard didn't show K-Social"

**What Was Confusing** 🤔:
- (List anything that was unclear or hard to understand)
- Example: "Didn't understand what indexers do"
- Example: "Not sure why build takes so long"
- Example: "Unclear which app does what"

**Suggestions for Improvement** 💡:
- (List ideas for making it better)
- Example: "Show build progress more clearly"
- Example: "Add tooltips explaining each app"
- Example: "Provide app usage examples"

**Application-Specific Feedback**:

**Kasia App**:
- Did it load? (Yes/No)
- Was it functional? (Yes/No)
- Issues encountered:
- Suggestions:

**K-Social App**:
- Did it load? (Yes/No)
- Was it functional? (Yes/No)
- Issues encountered:
- Suggestions:

**System Information**:
- OS: (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
- Docker Version: (from `docker --version`)
- Node.js Version: (from `node --version`)
- Total Time: (how long the entire scenario took)
- Build Time: (how long just the build stage took)

#### Where to Submit Feedback

- **Bug Report**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
- **Feature Request**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
- **General Feedback**: [Join Discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

#### Next Steps

- **Want to test more?** Try [Scenario 3: Indexer Services](#scenario-3-indexer-services-30-40-minutes)
- **Found a critical bug?** Report it immediately
- **Short on time?** You're done! Thank you for testing!
- **Want to test local indexers?** Try the Indexer Services profile next

#### Thank You!

Your feedback from this scenario is invaluable. Testing multiple applications and their integration helps ensure a smooth experience for all users. 🙏

---

### Scenario 3: Indexer Services 🔴 (30-40 minutes)

**Goal**: Install and verify local indexer infrastructure for blockchain data processing

**What You'll Test**:
- Explorer Profile installation (indexer services)
- TimescaleDB database deployment
- Simply Kaspa Indexer deployment
- Indexer synchronization process
- Database connectivity and data storage
- Integration with public Kaspa network

**Prerequisites**:
- All prerequisites installed (Docker, Docker Compose, Node.js)
- At least 30GB free disk space (indexers store significant data)
- Stable internet connection
- 30-40 minutes of time (includes indexer sync time)
- **Recommended**: 8GB+ RAM (indexers are resource-intensive)

**Note**: This scenario installs LOCAL indexer infrastructure. Unlike Scenario 2 which used public indexers, this scenario runs your own indexer services that process and store blockchain data locally.

**⚠️ Important**: Indexer services are more resource-intensive than basic node operation. Ensure your system meets the recommended specifications.

#### Step 1: Start Fresh (2 minutes)

If you've completed previous scenarios, start with a clean slate.

1. **Run the fresh start script**:
   ```bash
   ./fresh-start.sh
   ```

2. **Respond to prompts**:
   - "Remove data volumes? (y/N)" → Type `y` and press Enter
   - "Continue with fresh start? (y/N)" → Type `y` and press Enter

3. **Verify cleanup**:
   - ✓ Should show "✓ Containers and volumes removed"
   - ✓ Should show "✓ Fresh start complete!"

4. **Start the wizard**:
   ```bash
   ./start-test.sh
   ```

5. **Verify wizard opens**:
   - ✓ Browser should open to `http://localhost:3000`
   - ✓ You should see the wizard interface

**📝 Document**:
- Did the fresh start work correctly? (Yes/No)
- Did the wizard start successfully? (Yes/No)

#### Step 2: System Check (1 minute)

The wizard should automatically perform a system check.

1. **Observe the system check**:
   - ✓ Should check Docker, Docker Compose, disk space, RAM, ports
   - ✓ All checks should pass (green checkmarks)

2. **Note resource requirements**:
   - ⚠️ May show warning if RAM < 8GB (indexers need more memory)
   - ⚠️ May show warning if disk space < 30GB (indexers store significant data)

3. **Click "Continue" or "Next"**

**📝 Document**:
- Did all system checks pass? (Yes/No)
- Were there any warnings about resources?
- Do you have sufficient resources for indexer services?

**💡 Understanding Resource Needs**:
- TimescaleDB: ~1-2GB RAM, ~5-10GB disk
- Simply Kaspa Indexer: ~2-3GB RAM, ~5-10GB disk
- K-Indexer: ~1-2GB RAM, ~3-5GB disk
- Kasia Indexer: ~1-2GB RAM, ~3-5GB disk
- **Total**: ~5-9GB RAM, ~16-30GB disk

#### Step 3: Profile Selection (2 minutes)

Select the Explorer Profile which includes indexer services.

1. **Review available profiles**:
   - ✓ Should see multiple profile options
   - ✓ Look for "Explorer Profile" or "Indexer Services" profile

2. **Read the Explorer Profile description**:
   - ✓ Should mention: TimescaleDB, Simply Kaspa Indexer
   - ✓ Should mention: Blockchain data indexing, queryable database
   - ✓ Should show estimated resources: ~5-7GB RAM, ~25-35GB disk
   - ✓ Should show estimated installation time

3. **Select "Explorer Profile"**:
   - Click on the profile card or radio button
   - ✓ The profile should highlight or show as selected

4. **Click "Continue" or "Next"**

**📝 Document**:
- Was the Explorer Profile easy to find?
- Was the description clear about what would be installed?
- Were the resource estimates clearly shown?
- Did you understand what indexer services do?

**💡 What Are Indexer Services?**:
- **Indexers** process blockchain data and make it queryable
- **TimescaleDB** is a time-series database optimized for blockchain data
- **Simply Kaspa Indexer** processes Kaspa blockchain and stores in TimescaleDB
- Applications can query the database instead of scanning the entire blockchain

#### Step 4: Configuration (3 minutes)

Configure the indexer services.

> **📌 Important**: Indexer Services profile should ONLY show database configuration options. If you see network configuration (External IP, Public Node toggle), this is a bug - please report it!

1. **Review database configuration options**:
   - ✓ Should show "Database Configuration" section with:
     - Database User field (default: "kaspa")
     - Database Password field (required, minimum 12 characters)
     - "Generate" button next to password field
   - ✓ Should show "Advanced Options" section (may be collapsed):
     - TimescaleDB Data Directory (default: "/data/timescaledb")

2. **What should NOT be shown**:
   - ❌ Network Configuration (External IP, Public Node toggle) - indexers don't need this
   - ❌ Kaspa Node Settings (RPC/P2P ports) - indexers connect to nodes, don't run nodes
   - ❌ Indexer Endpoints - this is only for kaspa-user-applications profile

3. **Test database password generation**:
   - Click the "Generate" button next to Database Password
   - ✓ Should generate a secure password (12+ characters)
   - ✓ Password should be visible in the field

4. **For this test, use generated password**:
   - Keep the generated password (don't change it)
   - Keep default database user ("kaspa")
   - Keep default data directory ("/data/timescaledb")
   - This tests the "happy path" with defaults

5. **Click "Continue" or "Next"**

**📝 Document**:
- Did you see ONLY database configuration options? (Yes/No)
- If you saw network configuration, please report this as a bug
- Did the password generation work correctly? (Yes/No)
- Were the default values clearly shown? (Yes/No)
- Were the configuration options understandable? (Yes/No)

**🐛 Bug Report**: If you see network configuration options (External IP, Public Node), please report this bug:
- Go to: https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md
- Title: "Indexer Services profile shows incorrect network configuration"
- Description: "When selecting only Indexer Services profile, the configuration page shows External IP and Public Node options, but these should only appear for Core/Archive/Mining profiles."

**🔍 Service Dependencies**:
- Indexer Services → connect to → Public Kaspa APIs (for blockchain data)
- Indexer Services → connect to → TimescaleDB (to store processed data)
- Applications → connect to → TimescaleDB (to query data)

#### Step 5: Review and Confirm (2 minutes)

Review the installation summary before proceeding.

1. **Review the installation summary**:
   - ✓ Should show selected profile: "Indexer Services"
   - ✓ Should show list of services to be installed:
     - TimescaleDB (indexer-db)
     - Simply Kaspa Indexer (simply-kaspa-indexer)
     - K-Indexer (k-indexer)
     - Kasia Indexer (kasia-indexer)
   - ✓ Should show estimated disk space usage
   - ✓ Should show estimated installation time

2. **Verify the information**:
   - Profile: Indexer Services
   - Services: TimescaleDB + Multiple Indexers (no local Kaspa node)
   - Ports: 5432 (database), 3002/3005/3006 (indexers)

3. **Look for important notices**:
   - ✓ May show notice: "Indexers will connect to public Kaspa network"
   - ✓ May show notice: "Indexer will process blockchain data (several hours)"
   - ✓ May show notice: "Indexing processes can run in background"

4. **Click "Install" or "Start Installation"**

**📝 Document**:
- Was the review screen comprehensive?
- Did it clearly show all services being installed?
- Were you informed about sync/indexing time?
- Did you feel confident to proceed?

**⚠️ Important**: This installation involves:
1. Downloading Docker images (~2-3GB)
2. Starting indexer services
3. Indexers connecting to public Kaspa network
4. Indexer processing blockchain data (several hours)
5. All processes can run in background

#### Step 6: Installation Progress (8-12 minutes)

The installation process will now begin.

1. **Observe the progress screen**:
   - ✓ Should show "Installing..." or similar message
   - ✓ Should show progress indicator
   - ✓ Should show current step or task

2. **Watch for these stages** (order may vary):
   - "Pulling Docker images..." (5-8 minutes) ⏰ **Longest step**
     - TimescaleDB image (~200-300MB)
     - Simply Kaspa Indexer image (~500MB-1GB)
     - K-Indexer image (~300-500MB)
     - Kasia Indexer image (~300-500MB)
     - Simply Kaspa Indexer image (~500MB-1GB)
   - "Creating Docker containers..."
   - "Starting TimescaleDB..."
   - "Starting Simply Kaspa Indexer..."
   - "Starting K-Indexer..."
   - "Starting Kasia Indexer..."
   - "Waiting for services to be ready..."
   - "Running health checks..."

3. **Note the time taken for each stage**

4. **Do NOT close the browser or refresh the page** during installation

**📝 Document**:
- How long did the entire installation take?
- How long did image pulling take?
- Were progress updates clear and frequent?
- Did you understand what was happening?
- Were there any long periods with no updates?

**🐛 If Something Goes Wrong**:
- Installation hangs: Wait at least 10 minutes before taking action
- Error message appears: Take a screenshot and note the exact message
- Browser disconnects: Try refreshing (wizard should resume)
- Installation fails: Note the error and proceed to cleanup

**💡 What's Actually Happening**:
- Docker is downloading images for database and indexer services
- Docker Compose is creating and configuring containers
- Services are starting up in dependency order
- Health checks are verifying services are responding
- Indexers connect to public Kaspa network
- Indexers begin processing blockchain data from public APIs

#### Step 7: Installation Complete (1 minute)

When installation finishes, you should see a completion screen.

> **📌 Important**: The management dashboard is not included in this test release. You'll use Docker commands to verify services instead.

1. **Verify the completion message**:
   - ✓ Should show "Installation Complete!" or similar success message
   - ✓ Should show summary of what was installed
   - ✓ Should show list of running services

2. **Check for important notices**:
   - ✓ Should show notice: "Indexers are connecting to public Kaspa network"
   - ✓ Should show notice: "Indexer processing will begin automatically"
   - ✓ Should show notice: "Services will continue running in background"
   - ✓ May show notice: "Use 'docker ps' and 'docker logs' to monitor services"

3. **Note any access information shown**:
   - ✓ May show TimescaleDB connection info: `localhost:5432`
   - ✓ May show indexer API endpoints

**📝 Document**:
- Was the completion message clear?
- Were you informed about the sync/indexing process?
- Did you understand that processing would continue in background?
- Were Docker monitoring commands mentioned?

**💡 Understanding the Process**:
1. **Network Connection**: Indexers connect to public Kaspa network APIs
2. **Indexer Processing** (several hours): Indexers process blockchain data into database
3. **Background Operation**: You can close browser, services continue running
4. **Check progress**: Use Docker commands to monitor services (dashboard not included in test release)

#### Step 8: Verify Services with Docker Commands (3 minutes)

Since the dashboard is not included in this test release, use Docker commands to verify all services are running correctly.

1. **Check all running containers**:
   ```bash
   docker ps
   ```
   
   **Expected output** - you should see these containers running:
   - ✅ `k-social-db` - TimescaleDB database for K-Social indexer (port 5433)
   - ✅ `simply-kaspa-db` - TimescaleDB database for Simply Kaspa indexer (port 5434)
   - ✅ `kasia-indexer` - Kasia blockchain indexer (file-based storage)
   - ✅ `k-indexer` - K-Social blockchain indexer  
   - ✅ `simply-kaspa-indexer` - Simply Kaspa indexer
   
   **All containers should show**:
   - Status: "Up X minutes" (not "Exited")
   - Healthy status if health checks are configured

2. **Check service logs for startup success**:
   
   **K-Social Database**:
   ```bash
   docker logs k-social-db --tail 20
   ```
   - ✓ Should show "database system is ready to accept connections"
   - ✓ Should show "K-Social database initialization completed successfully!"
   - ✓ Should NOT show connection errors or schema errors

   **Simply Kaspa Database**:
   ```bash
   docker logs simply-kaspa-db --tail 20
   ```
   - ✓ Should show "database system is ready to accept connections"
   - ✓ Should show "Simply Kaspa database initialization completed successfully!"
   - ✓ Should NOT show connection errors or schema errors

   **Kasia Indexer**:
   ```bash
   docker logs kasia-indexer --tail 20
   ```
   - ✓ Should show "Connected to Some("wss://...")" 
   - ✓ Should show "Successfully connected to RPC client"
   - ✓ Should show "Starting VirtualChainSyncer"
   - ⚠️ If shows "Error while connecting to node: vcc handler connect send failed":
     - WebSocket endpoint may be down
     - Try alternative endpoint in .env: `KASPA_NODE_WBORSH_URL=wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh`
     - Recreate container: `docker stop kasia-indexer && docker rm kasia-indexer && docker compose up -d kasia-indexer`

   **K-Indexer**:
   ```bash
   docker logs k-indexer --tail 20
   ```
   - ✓ Should show "Starting K-indexer PostgreSQL webserver"
   - ✓ Should show "Successfully connected to PostgreSQL database"
   - ✓ Should show "Database pool connection test successful"
   - ✓ Should show "Web server starting on 127.0.0.1:8080"
   - ✓ Should NOT show "relation does not exist" errors
   - ✓ Should NOT show database connection failures

   **Simply Kaspa Indexer**:
   ```bash
   docker logs simply-kaspa-indexer --tail 20
   ```
   - ✓ Should show indexer starting up
   - ✓ May show "Waiting for dependencies"
   - ✓ Should NOT show repeated errors

3. **Check resource usage**:
   ```bash
   docker stats --no-stream
   ```
   - ✓ Should show all containers using CPU and memory
   - ✓ Indexers should show moderate CPU usage (processing data)
   - ✓ No container should show 0% CPU for extended periods (indicates crash)

4. **Verify Database Architecture** (2 minutes):
   
   **Test K-Social Database**:
   ```bash
   docker exec k-social-db pg_isready -U k_social_user -d ksocial
   ```
   - ✓ Should return "accepting connections"
   
   **Test Simply Kaspa Database**:
   ```bash
   docker exec simply-kaspa-db pg_isready -U simply_kaspa_user -d simply_kaspa
   ```
   - ✓ Should return "accepting connections"

   **Verify Database Isolation**:
   ```bash
   # Check K-Social database tables
   docker exec k-social-db psql -U k_social_user -d ksocial -c "\dt"
   
   # Check Simply Kaspa database tables  
   docker exec simply-kaspa-db psql -U simply_kaspa_user -d simply_kaspa -c "\dt"
   ```
   
   **Expected K-Social Tables**:
   - ✓ Should show: `k_vars`, `vars`, `k_posts`, `k_votes` (and others)
   - ✓ Should NOT show blockchain tables like `blocks`, `transactions_acceptances`
   
   **Expected Simply Kaspa Tables**:
   - ✓ Should show: `vars`, `blocks`, `transactions`, `transactions_acceptances` (and others)
   - ✓ Should NOT show social media tables like `k_posts`, `k_votes`

5. **Test service health endpoints** (optional):
   
   **K-Indexer Health**:
   ```bash
   curl -s http://localhost:3006/health
   ```
   - ✓ Should return JSON with status information
   - ✓ Should show `"status":"healthy"` or similar
   
   **Simply Kaspa Indexer Metrics**:
   ```bash
   curl -s http://localhost:3005/api/metrics
   ```
   - ✓ Should return metrics data (may be empty initially)
   
   **Kasia Indexer Metrics**:
   ```bash
   curl -s http://localhost:3002/metrics
   ```
   - ✓ Should return Prometheus-style metrics

**📝 Document**:
- Were all expected containers running? (Yes/No)
- Did any containers show "Exited" status? (Yes/No - list which ones)
- Were the service logs showing normal startup? (Yes/No)
- Did any service show repeated errors? (Yes/No - describe)
- Was resource usage reasonable? (Yes/No)
- **Database Architecture Verification**:
  - Did both databases accept connections? (Yes/No)
  - Did K-Social database contain social media tables? (Yes/No)
  - Did Simply Kaspa database contain blockchain tables? (Yes/No)
  - Were the databases properly isolated? (Yes/No)
- **Service Health Endpoints**:
  - Did K-Indexer health endpoint respond? (Yes/No)
  - Did indexer metrics endpoints respond? (Yes/No)

**🐛 If Something Goes Wrong**:
- **Container not running**: Check logs with `docker logs <container-name>`
- **Container keeps restarting**: Check for port conflicts or resource issues
- **High CPU usage**: Normal for indexers during data processing
- **Connection refused**: Service may still be starting up, wait 1-2 minutes

**🐛 If Something Goes Wrong**:
- Service shows as "Stopped": Check logs with `docker logs <container-name>`
- Service shows as "Unhealthy": May need a minute to initialize, try refreshing
- Connection errors: Verify services are on the same Docker network

#### Step 9: Verify Docker Containers (2 minutes)

Verify all indexer-related containers are running.

1. **Check Docker containers**:
   ```bash
   docker ps
   ```
   - ✓ Should see multiple containers:
     - `indexer-db` - Status: Up
     - `simply-kaspa-indexer` - Status: Up
     - `k-indexer` - Status: Up
     - `kasia-indexer` - Status: Up
   - ✓ All should show "Up" status (not "Restarting" or "Exited")

2. **Check container logs** (sample a few):
   ```bash
   docker logs indexer-db --tail 20
   docker logs simply-kaspa-indexer --tail 20
   docker logs k-indexer --tail 20
   ```
   - ✓ TimescaleDB logs should show database initialization
   - ✓ Indexer logs should show connection attempts to public APIs and database
   - ✓ Should NOT see repeated error messages

3. **Check resource usage**:
   ```bash
   docker stats --no-stream
   ```
   - ✓ Should show CPU and memory usage for all containers
   - ✓ Indexers may use moderate CPU during processing (20-50%)
   - ✓ TimescaleDB should use moderate resources

**📝 Document**:
- Were all expected containers running? (Yes/No)
- Were the logs showing normal activity? (Yes/No)
- What was the total resource usage?
- Were any containers using unexpectedly high resources?

**💡 Expected Resource Usage**:
- TimescaleDB: 10-20% CPU, 1-2GB RAM
- Simply Kaspa Indexer: 20-50% CPU (when processing), 2-3GB RAM
- K-Indexer: 10-30% CPU (when processing), 1-2GB RAM
- Kasia Indexer: 10-30% CPU (when processing), 1-2GB RAM

#### Step 10: Verify TimescaleDB Connectivity (3 minutes)

Test that the TimescaleDB database is accessible and functioning.

1. **Check if TimescaleDB port is accessible**:
   ```bash
   nc -zv localhost 5432
   ```
   - ✓ Should show "Connection to localhost 5432 port [tcp/postgresql] succeeded!"
   - ✓ If `nc` not available, try `telnet localhost 5432` (should connect)

2. **Connect to TimescaleDB** (optional, requires `psql`):
   
   **List available databases**:
   ```bash
   docker exec indexer-db psql -U kaspa -d postgres -c "\l"
   ```
   - ✓ Should show databases: `kaspa_explorer`, `ksocial`, `simply_kaspa`
   
   **Connect to active database**:
   ```bash
   docker exec -it indexer-db psql -U kaspa -d simply_kaspa
   ```
   - ✓ Should connect to database
   - ✓ Should show PostgreSQL prompt: `simply_kaspa=#`

3. **Check database tables** (if connected):
   ```sql
   \dt
   ```
   - ✓ Should show indexer tables: `blocks`, `transactions`, `addresses_transactions`, etc.
   - ✓ Tables are created by simply-kaspa-indexer as it processes data

4. **Exit database** (if connected):
   ```sql
   \q
   ```

**📝 Document**:
- Was TimescaleDB port accessible? (Yes/No)
- Were you able to connect to the database? (Yes/No/Skipped)
- Which databases were present? (kaspa_explorer, ksocial, simply_kaspa)
- Were indexer tables present in simply_kaspa? (Yes/No/Skipped)

**🐛 If Something Goes Wrong**:
- Port not accessible: Check if container is running with `docker ps`
- Connection refused: Check logs with `docker logs indexer-db`
- Authentication failed: Check environment variables in docker-compose.yml

**💡 Understanding TimescaleDB**:
- TimescaleDB is PostgreSQL with time-series extensions
- Optimized for storing blockchain data (blocks, transactions, addresses)
- Provides fast queries for historical data
- Tables are created automatically by the indexer

#### Step 11: Verify Simply Kaspa Indexer (3 minutes)

Test that the indexer is running and processing data.

1. **Check indexer logs**:
   ```bash
   docker logs simply-kaspa-indexer --tail 50
   ```
   - ✓ Should show indexer startup messages
   - ✓ Should show connection to public Kaspa APIs
   - ✓ Should show connection to TimescaleDB
   - ✓ May show "Connecting to public node" or similar
   - ✓ May show "Processing block X" (when processing data)

2. **Check indexer API** (optional, if exposed):
   ```bash
   curl http://localhost:8080/api/health
   ```
   - ✓ Should return JSON response with health status
   - ✓ Should show indexer is running

3. **Monitor indexer progress** (if processing):
   ```bash
   docker logs simply-kaspa-indexer --follow
   ```
   - ✓ Should show real-time log output
   - ✓ Should show blocks being processed (if node is synced)
   - ✓ Press Ctrl+C to stop following logs

**📝 Document**:
- Was the indexer running? (Yes/No)
- Was it connected to public Kaspa APIs? (Yes/No)
- Was it connected to TimescaleDB? (Yes/No)
- Was it processing blocks? (Yes/No/Waiting for node sync)

**🐛 If Something Goes Wrong**:
- Indexer not running: Check logs for errors
- Connection errors: Verify database is running and public APIs are accessible
- Not processing: May be normal during initial startup

**💡 Understanding Indexer Behavior**:
- **Phase 1**: Indexer starts and connects to public APIs and database
- **Phase 2**: Indexer begins fetching blockchain data from public network
- **Phase 3**: Indexer processes and stores blockchain data in database
- **Phase 4**: Indexer processes historical blocks (can take hours)
- **Phase 5**: Indexer stays in sync with new blocks from public APIs

#### Step 12: Test Service Integration (3 minutes)

Verify that all services are properly integrated.

1. **Test public API → indexer connection**:
   - Check indexer logs for API connection messages
   - ✓ Should show "Connected to public API" or similar
   - ✓ Should show public API endpoints being used

2. **Test indexer → database connection**:
   - Check indexer logs for database connection messages
   - ✓ Should show "Connected to database" or similar
   - ✓ Should show database name and host

3. **Test service monitoring** (Dashboard not yet available in v0.9.0):
   - Use `docker ps` to check service status
   - ✓ All indexer services should show "Up (healthy)"
   - ✓ Database services should show "Up (healthy)"
   - Note: Web dashboard is planned for future release

4. **Check service dependencies**:
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```
   - ✓ All services should be "Up"
   - ✓ No services should be "Restarting"

**📝 Document**:
- Did indexer successfully connect to public APIs? (Yes/No)
- Did indexer successfully connect to database? (Yes/No)
- Was the dashboard integration working? (Yes/No)
- Were all services healthy? (Yes/No)

**🔍 Service Dependency Chain**:
```
Public Kaspa Network APIs
    ↓ (provides blockchain data)
Indexer Services (Simply Kaspa, K-Indexer, Kasia)
    ↓ (stores processed data)
TimescaleDB
    ↓ (provides queryable data)
Applications (future)
```

#### Step 13: Monitor Sync and Indexing Progress (5 minutes)

Observe the sync and indexing process for a few minutes.

1. **Monitor indexer processing**:
   ```bash
   docker logs simply-kaspa-indexer --tail 20 --follow
   ```
   - ✓ Should show blocks being processed
   - ✓ Should show increasing block height
   - ✓ Should show API connections
   - Press Ctrl+C to stop following

2. **Check processing progress** (via logs):
   - Monitor indexer logs for progress indicators
   - ✓ Should show current block height being processed
   - ✓ Should show indexing progress messages
   - Note: Web dashboard not available in v0.9.0

3. **Monitor additional indexers**:
   ```bash
   docker logs k-indexer --tail 20 --follow
   docker logs kasia-indexer --tail 20 --follow
   ```
   - ✓ Should show indexers connecting to APIs
   - ✓ Should show blocks being processed
   - Press Ctrl+C to stop following

4. **Observe resource usage over time**:
   ```bash
   docker stats
   ```
   - ✓ Watch CPU and memory usage for each service
   - ✓ Note any spikes or unusual patterns
   - Press Ctrl+C to stop

**📝 Document**:
- What was the indexer processing status after 5 minutes?
- Were the indexers processing blocks? (Yes/No/Starting up)
- How did resource usage change over time?
- Did you observe any issues or errors?

**💡 What to Expect**:
- **First 5-10 minutes**: Services starting up, connecting to public APIs
- **First hour**: Indexers connecting and beginning data processing
- **Hours 2-8**: Indexers processing historical blockchain data
- **After 8+ hours**: Indexers processing recent blocks
- **After 12+ hours**: Indexers fully synced, processing new blocks in real-time

#### Step 14: Test Service Management (3 minutes)

Test the service management scripts with indexer services.

1. **Check status**:
   ```bash
   ./status.sh
   ```
   - ✓ Should show wizard status
   - ✓ Should show all Docker services (including indexer services)
   - ✓ Should show resource usage for each service
   - ✓ Should show ports in use

2. **Test restart**:
   ```bash
   ./restart-services.sh
   ```
   - ✓ Should stop all services
   - ✓ Should start all services
   - ✓ Should show service status after restart
   - ✓ All services should come back up

3. **Verify services after restart**:
   - Check all services are running with `docker ps`
   - ✓ Indexers should resume processing from where they left off
   - ✓ Database data should be preserved
   - ✓ API connections should be re-established

**📝 Document**:
- Did the status script show all services? (Yes/No)
- Did the restart work correctly? (Yes/No)
- How long did restart take?
- Did all services come back up healthy? (Yes/No)
- Was indexing progress preserved? (Yes/No)

**💡 Why Test Restart?**:
- Verifies services can recover from restarts
- Tests that indexing progress is persistent
- Ensures no data is lost during restart
- Important for real-world scenarios (system reboots, updates, etc.)

#### Step 15: Test Cleanup (2 minutes)

Finally, test the cleanup process with indexer services.

1. **Run the cleanup script**:
   ```bash
   ./cleanup-test.sh
   ```

2. **Respond to prompts**:
   - First prompt: "This will stop all services and remove all data. Continue? (y/N)"
     - Type `y` and press Enter
   - Second prompt: "Remove all data? This includes blockchain data. (y/N)"
     - Type `y` and press Enter

3. **Verify cleanup output**:
   - ✓ Should show "Stopping services..."
   - ✓ Should show "✓ Wizard stopped"
   - ✓ Should show "✓ Docker containers stopped"
   - ✓ Should show "✓ Data removed"
   - ✓ Should show "✓ Logs removed"
   - ✓ Should show "✓ Cleanup complete!"

4. **Verify cleanup was successful**:
   ```bash
   docker ps -a | grep kaspa
   ```
   - ✓ Should show no Kaspa-related containers

**📝 Document**:
- Did the cleanup script run without errors? (Yes/No)
- Were all services stopped? (Yes/No)
- Was cleanup successful? (Yes/No)
- How long did cleanup take?

---

### Scenario 3: Summary and Feedback

Congratulations! You've completed Scenario 3: Indexer Services. 🎉

#### What You Tested

- ✅ Explorer Profile installation (indexer services)
- ✅ TimescaleDB database deployment
- ✅ Simply Kaspa Indexer deployment
- ✅ Service integration (node → indexer → database)
- ✅ Dashboard with indexer services
- ✅ Sync and indexing progress monitoring
- ✅ Service management with indexer services
- ✅ Cleanup process

#### Time to Complete

**Expected**: ~30-40 minutes  
**Your Time**: _____ minutes

**Note**: This time does NOT include full blockchain sync/indexing (which takes 8+ hours). You tested the installation and initial setup.

#### Overall Experience

Please rate your experience (1-5 stars):

- **Ease of installation**: ⭐⭐⭐⭐⭐
- **Clarity of instructions**: ⭐⭐⭐⭐⭐
- **Resource usage transparency**: ⭐⭐⭐⭐⭐
- **Indexer functionality**: ⭐⭐⭐⭐⭐
- **Dashboard usefulness**: ⭐⭐⭐⭐⭐
- **Overall satisfaction**: ⭐⭐⭐⭐⭐

#### Comparison with Previous Scenarios

How did this scenario compare to Scenarios 1 and 2?

- **Installation time**: Longer / Similar / Shorter
- **Complexity**: More complex / Similar / Simpler
- **Resource usage**: Higher / Similar / Lower
- **Technical difficulty**: More difficult / Similar / Easier

#### Provide Detailed Feedback

Now is the time to report your findings! Please create a bug report or feedback post with:

**What Worked Well** ✅:
- (List things that worked smoothly)
- Example: "Indexer services started without issues"
- Example: "Dashboard clearly showed sync progress"
- Example: "Service integration was seamless"

**What Didn't Work** ❌:
- (List any errors, failures, or problems)
- Example: "Indexer showed connection errors"
- Example: "TimescaleDB failed to start"
- Example: "Resource usage was higher than expected"

**What Was Confusing** 🤔:
- (List anything that was unclear or hard to understand)
- Example: "Didn't understand what indexer does"
- Example: "Not sure why it takes so long to sync"
- Example: "Unclear how to check indexing progress"

**Suggestions for Improvement** 💡:
- (List ideas for making it better)
- Example: "Show estimated sync/indexing time more clearly"
- Example: "Add progress bar for indexer processing"
- Example: "Provide more details about resource requirements"

**Service-Specific Feedback**:

**TimescaleDB**:
- Did it start successfully? (Yes/No)
- Was it accessible? (Yes/No)
- Issues encountered:
- Suggestions:

**Simply Kaspa Indexer**:
- Did it start successfully? (Yes/No)
- Did it connect to node and database? (Yes/No)
- Was it processing blocks? (Yes/No/Waiting for sync)
- Issues encountered:
- Suggestions:

**Resource Usage**:
- Total RAM used: _____ GB
- Total CPU used: _____ %
- Was this within expectations? (Yes/No)
- Any performance issues? (Yes/No - if yes, describe)

**System Information**:
- OS: (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
- Docker Version: (from `docker --version`)
- Node.js Version: (from `node --version`)
- Total RAM: _____ GB
- Available Disk Space: _____ GB
- Total Time: (how long the entire scenario took)

#### Where to Submit Feedback

- **Bug Report**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
- **Feature Request**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
- **General Feedback**: [Join Discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

#### Next Steps

- **Want to test more?** Try Scenario 4: Error Handling (coming soon)
- **Found a critical bug?** Report it immediately
- **Short on time?** You're done! Thank you for testing!
- **Want to see full sync?** Leave services running and check back in 8+ hours

#### Understanding Long-Running Processes

**Important Note**: This scenario tested the INSTALLATION of indexer services, not the full sync/indexing process. Here's what happens after installation:

**Indexer Processing** (several hours):
- Indexers connect to public Kaspa network
- Indexers process blockchain data from public APIs
- Progress may be visible in logs
- Can run in background
- Resumes after restart
- Stores data in TimescaleDB
- Progress visible in logs
- Can run in background
- Resumes after restart

**Total Time**: 8-16 hours for full sync and indexing

**You don't need to wait for this to complete your testing!** The installation and initial setup is what we're testing in this scenario.

#### Thank You!

Your feedback from this scenario is invaluable. Testing indexer services helps ensure that developers and advanced users can run their own infrastructure successfully. 🙏

---

### Scenario 4: Error Handling 🟡 (20-30 minutes)

**Goal**: Test how the wizard handles various error conditions and validates user input

**What You'll Test**:
- Prerequisite validation and error messages
- Invalid configuration handling
- Port conflict detection and resolution
- Insufficient resource warnings
- Network connectivity issues
- Recovery from failed installations
- Error message clarity and helpfulness

**Prerequisites**:
- All prerequisites installed (Docker, Docker Compose, Node.js)
- At least 20GB free disk space
- 20-30 minutes of time
- **Willingness to intentionally cause errors** (don't worry, we'll fix them!)

**Note**: This scenario intentionally creates error conditions to test the wizard's error handling. You'll be guided through creating and resolving various issues.

**⚠️ Important**: Some tests require temporarily stopping Docker or changing system settings. Make sure you're comfortable doing this, and that you don't have other critical Docker containers running.

#### Step 1: Test Prerequisites Validation (5 minutes)

Let's test how the wizard handles missing prerequisites.

**Test 1A: Missing Docker (Optional - Advanced)**

**⚠️ Warning**: Only do this if you're comfortable stopping and restarting Docker, and you don't have other critical containers running.

1. **Stop Docker daemon**:
   ```bash
   # Linux
   sudo systemctl stop docker
   
   # macOS/Windows
   # Stop Docker Desktop application
   ```

2. **Try to start the wizard**:
   ```bash
   ./start-test.sh
   ```

3. **Observe the error handling**:
   - ✓ Should detect that Docker is not running
   - ✓ Should show clear error message: "❌ Docker not found" or "Docker daemon not running"
   - ✓ Should provide instructions on how to start Docker
   - ✓ Should NOT proceed with installation
   - ✓ Should exit gracefully (not crash)

4. **Restart Docker**:
   ```bash
   # Linux
   sudo systemctl start docker
   
   # macOS/Windows
   # Start Docker Desktop application
   ```

5. **Verify Docker is running**:
   ```bash
   docker ps
   ```

**📝 Document**:
- Did the wizard detect missing Docker? (Yes/No/Skipped)
- Was the error message clear? (Yes/No/Skipped)
- Were the instructions helpful? (Yes/No/Skipped)
- Did the wizard exit gracefully? (Yes/No/Skipped)

**Test 1B: Simulated Insufficient Disk Space**

**Note**: We can't easily simulate this without actually filling your disk, so we'll test the wizard's response to low disk space warnings.

1. **Start the wizard**:
   ```bash
   ./start-test.sh
   ```

2. **Proceed to system check**:
   - ✓ Wizard should check available disk space
   - ✓ If you have < 30GB available, should show warning
   - ✓ If you have < 20GB available, should show error

3. **Observe the warning/error**:
   - ✓ Should clearly state how much space is available
   - ✓ Should clearly state how much space is required
   - ✓ Should explain consequences of proceeding with low space
   - ✓ May allow proceeding with warning (if > 20GB)
   - ✓ Should block installation if critically low (< 20GB)

**📝 Document**:
- What was your available disk space? _____ GB
- Did the wizard show a warning or error? (Warning/Error/Neither)
- Was the message clear about space requirements? (Yes/No)
- If you had low space, were you able to proceed? (Yes/No/N/A)

**Test 1C: Node.js Version Check**

**Note**: This test is informational only - don't actually downgrade Node.js.

1. **Check your Node.js version**:
   ```bash
   node --version
   ```

2. **Observe wizard behavior**:
   - ✓ Wizard should check Node.js version
   - ✓ Should accept version 18.x or higher
   - ✓ Should reject versions below 18.x

**📝 Document**:
- Your Node.js version: _____
- Did the wizard check the version? (Yes/No)
- If you had an old version, was the error clear? (Yes/No/N/A)

**💡 Understanding Prerequisite Checks**:
- Prerequisite checks prevent installation failures
- Clear error messages help users fix issues before proceeding
- Graceful handling (no crashes) is important for user experience

---

#### Step 2: Test Port Conflict Detection (5 minutes)

Let's test how the wizard handles port conflicts.

**Test 2A: Wizard Port Conflict (Port 3000)**

1. **Start a simple web server on port 3000**:
   ```bash
   # In a new terminal window
   python3 -m http.server 3000
   # OR
   npx http-server -p 3000
   ```

2. **Try to start the wizard**:
   ```bash
   # In your original terminal
   ./start-test.sh
   ```

3. **Observe the error handling**:
   - ✓ Should detect that port 3000 is in use
   - ✓ Should show clear error message about port conflict
   - ✓ Should identify what's using the port (if possible)
   - ✓ Should provide instructions to free the port
   - ✓ Should NOT start wizard on conflicting port

4. **Stop the test server**:
   - Press `Ctrl+C` in the terminal running the test server

5. **Verify wizard can now start**:
   ```bash
   ./start-test.sh
   ```
   - ✓ Should start successfully now

**📝 Document**:
- Did the wizard detect the port conflict? (Yes/No)
- Was the error message clear? (Yes/No)
- Did it identify what was using the port? (Yes/No)
- Were the instructions helpful? (Yes/No)

**Test 2B: Service Port Conflict (Port 8080)**

1. **Start the wizard normally**:
   ```bash
   ./start-test.sh
   ```

2. **Proceed through wizard to configuration step**:
   - Select any profile (Core Profile is fine)
   - Get to the configuration screen

3. **Try to use a port that's already in use**:
   - If you have something running on port 8080, try to configure dashboard to use that port
   - OR try to configure two services to use the same port

4. **Observe validation**:
   - ✓ Should detect port conflict during configuration
   - ✓ Should show validation error
   - ✓ Should prevent proceeding with conflicting ports
   - ✓ Should suggest alternative ports

**📝 Document**:
- Did the wizard detect port conflicts in configuration? (Yes/No)
- Was the validation immediate or only on submit? (Immediate/On Submit)
- Were alternative ports suggested? (Yes/No)
- Could you easily fix the conflict? (Yes/No)

**💡 Understanding Port Conflicts**:
- Port conflicts are common issues
- Early detection prevents installation failures
- Clear messages help users resolve conflicts quickly

---

#### Step 3: Test Invalid Configuration Input (5 minutes)

Let's test how the wizard validates user input.

1. **Start the wizard and proceed to configuration**:
   ```bash
   ./start-test.sh
   ```
   - Select Core Profile
   - Get to configuration screen

**Test 3A: Invalid Port Numbers**

2. **Try invalid port numbers**:
   - Try port 0 (invalid)
   - Try port 99999 (out of range)
   - Try negative number (invalid)
   - Try non-numeric input (invalid)

3. **Observe validation**:
   - ✓ Should show validation error for each invalid input
   - ✓ Should explain what's wrong (e.g., "Port must be between 1 and 65535")
   - ✓ Should prevent proceeding with invalid values
   - ✓ Should highlight the invalid field

**📝 Document**:
- Did the wizard validate port numbers? (Yes/No)
- Were validation messages clear? (Yes/No)
- Was validation immediate or only on submit? (Immediate/On Submit)
- Were invalid fields clearly highlighted? (Yes/No)

**Test 3B: Invalid Paths (if applicable)**

4. **Try invalid directory paths** (if wizard allows custom paths):
   - Try a path with invalid characters
   - Try a path that doesn't exist
   - Try a path without write permissions

5. **Observe validation**:
   - ✓ Should validate path format
   - ✓ Should check if path exists (or can be created)
   - ✓ Should check write permissions
   - ✓ Should show clear error messages

**📝 Document**:
- Did the wizard validate paths? (Yes/No/N/A)
- Were validation messages clear? (Yes/No/N/A)
- Did it check permissions? (Yes/No/N/A)

**Test 3C: Empty Required Fields**

6. **Try to proceed with empty required fields**:
   - Clear a required field (if any)
   - Try to click "Next" or "Continue"

7. **Observe validation**:
   - ✓ Should prevent proceeding with empty required fields
   - ✓ Should highlight which fields are required
   - ✓ Should show clear message: "This field is required"

**📝 Document**:
- Did the wizard validate required fields? (Yes/No)
- Were required fields clearly marked? (Yes/No)
- Were validation messages clear? (Yes/No)

**💡 Understanding Input Validation**:
- Input validation prevents configuration errors
- Immediate feedback helps users correct mistakes quickly
- Clear messages reduce frustration

---

#### Step 4: Test Network Connectivity Issues (5 minutes)

Let's test how the wizard handles network problems.

**Test 4A: Simulated Docker Image Pull Failure**

**Note**: This test is difficult to simulate without actually disconnecting from the internet. We'll test the wizard's response to slow/failed downloads.

1. **Start a fresh installation**:
   ```bash
   ./fresh-start.sh  # Clean slate
   ./start-test.sh
   ```

2. **Proceed through wizard to installation**:
   - Select Core Profile
   - Use default configuration
   - Start installation

3. **Observe download progress**:
   - ✓ Should show "Pulling Docker images..." stage
   - ✓ Should show progress (if possible)
   - ✓ Should show which image is being downloaded
   - ✓ Should handle slow downloads gracefully (not timeout too quickly)

4. **If download fails** (may not happen with good connection):
   - ✓ Should show clear error message
   - ✓ Should explain what failed (which image)
   - ✓ Should suggest troubleshooting steps
   - ✓ Should offer to retry

**📝 Document**:
- Did the wizard show download progress? (Yes/No)
- Was it clear which image was being downloaded? (Yes/No)
- If download was slow, did wizard handle it well? (Yes/No/N/A)
- If download failed, was error message helpful? (Yes/No/N/A)

**Test 4B: Public Indexer Connectivity (if using public indexers)**

1. **If you tested Scenario 2** (Kaspa User Applications with public indexers):
   - Applications should connect to public indexers
   - ✓ Should show error if public indexer is unreachable
   - ✓ Should provide fallback options (if available)
   - ✓ Should not crash the application

**📝 Document**:
- Did applications handle indexer connectivity issues? (Yes/No/N/A)
- Were error messages clear? (Yes/No/N/A)
- Were fallback options provided? (Yes/No/N/A)

**💡 Understanding Network Issues**:
- Network problems are common during installation
- Good error messages help users diagnose issues
- Retry mechanisms improve success rates

---

#### Step 5: Test Installation Failure Recovery (5 minutes)

Let's test how the wizard handles and recovers from installation failures.

**Test 5A: Interrupted Installation**

1. **Start a fresh installation**:
   ```bash
   ./fresh-start.sh
   ./start-test.sh
   ```

2. **Begin installation**:
   - Select Core Profile
   - Start installation
   - Wait for installation to begin (Docker images pulling)

3. **Interrupt the installation**:
   - Close the browser tab (but don't stop the wizard process)
   - Wait 30 seconds

4. **Reopen the wizard**:
   - Navigate to `http://localhost:3000`

5. **Observe recovery behavior**:
   - ✓ Should detect interrupted installation
   - ✓ Should offer to resume or start over
   - ✓ Should show what was already completed
   - ✓ Should not lose progress unnecessarily

**📝 Document**:
- Did the wizard detect the interrupted installation? (Yes/No)
- Could you resume the installation? (Yes/No)
- Was progress preserved? (Yes/No)
- Was the recovery process clear? (Yes/No)

**Test 5B: Failed Service Start**

**Note**: This is difficult to simulate without breaking things. We'll test the wizard's response to service health check failures.

1. **After installation completes**, check service status:
   ```bash
   docker ps
   ```

2. **If any service shows as "Restarting" or "Unhealthy"**:
   - ✓ Dashboard should show service as unhealthy
   - ✓ Should provide troubleshooting guidance
   - ✓ Should offer to view logs
   - ✓ Should offer to restart service

3. **Check wizard's error reporting**:
   - ✓ Should clearly indicate which service failed
   - ✓ Should explain possible causes
   - ✓ Should provide next steps

**📝 Document**:
- Did any services fail to start? (Yes/No)
- If yes, was the error clearly reported? (Yes/No/N/A)
- Were troubleshooting steps provided? (Yes/No/N/A)
- Could you easily recover? (Yes/No/N/A)

**Test 5C: Cleanup After Failed Installation**

1. **Run cleanup script**:
   ```bash
   ./cleanup-test.sh
   ```

2. **Observe cleanup behavior**:
   - ✓ Should clean up even if installation was incomplete
   - ✓ Should remove partially created containers
   - ✓ Should remove partially downloaded images (optional)
   - ✓ Should not leave system in broken state

**📝 Document**:
- Did cleanup work after failed installation? (Yes/No/N/A)
- Were all containers removed? (Yes/No/N/A)
- Was the system left in a clean state? (Yes/No/N/A)

**💡 Understanding Failure Recovery**:
- Installations can fail for many reasons
- Good recovery mechanisms reduce frustration
- Clear error messages help users fix issues
- Cleanup should work even after failures

---

#### Step 6: Test Error Message Quality (5 minutes)

Let's evaluate the overall quality of error messages throughout the wizard.

**Review the error messages you encountered in previous tests:**

1. **Clarity**: Were error messages easy to understand?
   - ✓ Used plain language (not technical jargon)
   - ✓ Explained what went wrong
   - ✓ Explained why it went wrong

2. **Actionability**: Did error messages tell you what to do?
   - ✓ Provided specific next steps
   - ✓ Included commands to run (if applicable)
   - ✓ Linked to documentation (if applicable)

3. **Visibility**: Were error messages easy to see?
   - ✓ Used appropriate colors (red for errors)
   - ✓ Used appropriate icons (❌ for errors)
   - ✓ Positioned prominently on screen
   - ✓ Didn't disappear too quickly

4. **Completeness**: Did error messages include enough information?
   - ✓ Included error code or identifier (if applicable)
   - ✓ Included relevant system information
   - ✓ Suggested where to get more help

**📝 Document**:

**Best Error Message You Saw**:
- What was the error?
- Why was the message good?
- What made it helpful?

**Worst Error Message You Saw**:
- What was the error?
- Why was the message bad?
- How could it be improved?

**General Error Message Quality**:
- Overall clarity: ⭐⭐⭐⭐⭐ (1-5 stars)
- Overall actionability: ⭐⭐⭐⭐⭐ (1-5 stars)
- Overall visibility: ⭐⭐⭐⭐⭐ (1-5 stars)
- Overall completeness: ⭐⭐⭐⭐⭐ (1-5 stars)

**💡 What Makes a Good Error Message**:
- **Clear**: Easy to understand, no jargon
- **Specific**: Tells you exactly what's wrong
- **Actionable**: Tells you how to fix it
- **Visible**: Easy to see and doesn't disappear
- **Complete**: Includes all relevant information

---

### Scenario 4: Summary and Feedback

Congratulations! You've completed Scenario 4: Error Handling. 🎉

#### What You Tested

- ✅ Prerequisite validation (Docker, disk space, Node.js)
- ✅ Port conflict detection and resolution
- ✅ Invalid configuration input validation
- ✅ Network connectivity issue handling
- ✅ Installation failure recovery
- ✅ Error message clarity and quality
- ✅ Cleanup after failures

#### Time to Complete

**Expected**: ~20-30 minutes  
**Your Time**: _____ minutes

#### Overall Experience

Please rate your experience (1-5 stars):

- **Error detection**: ⭐⭐⭐⭐⭐ (How well did wizard detect errors?)
- **Error messages**: ⭐⭐⭐⭐⭐ (How clear and helpful were messages?)
- **Recovery options**: ⭐⭐⭐⭐⭐ (How easy was it to recover from errors?)
- **Validation quality**: ⭐⭐⭐⭐⭐ (How well did wizard validate input?)
- **Overall robustness**: ⭐⭐⭐⭐⭐ (How well did wizard handle problems?)

#### Error Handling Assessment

**Prerequisite Validation**:
- Detected missing Docker? (Yes/No/Skipped)
- Detected low disk space? (Yes/No/N/A)
- Detected old Node.js? (Yes/No/N/A)
- Quality of validation: ⭐⭐⭐⭐⭐

**Port Conflict Handling**:
- Detected wizard port conflict? (Yes/No)
- Detected service port conflicts? (Yes/No)
- Quality of conflict resolution: ⭐⭐⭐⭐⭐

**Input Validation**:
- Validated port numbers? (Yes/No)
- Validated paths? (Yes/No/N/A)
- Validated required fields? (Yes/No)
- Quality of validation: ⭐⭐⭐⭐⭐

**Failure Recovery**:
- Recovered from interrupted installation? (Yes/No/N/A)
- Handled service failures? (Yes/No/N/A)
- Cleaned up after failures? (Yes/No/N/A)
- Quality of recovery: ⭐⭐⭐⭐⭐

#### Provide Detailed Feedback

Now is the time to report your findings! Please create a bug report or feedback post with:

**What Worked Well** ✅:
- (List error handling that worked well)
- Example: "Port conflict detection was immediate and clear"
- Example: "Error messages were easy to understand"
- Example: "Recovery from interrupted installation was seamless"

**What Didn't Work** ❌:
- (List error handling that failed or was poor)
- Example: "Didn't detect that Docker was stopped"
- Example: "Error message was too technical"
- Example: "Couldn't recover from failed installation"

**What Was Confusing** 🤔:
- (List anything that was unclear)
- Example: "Error message didn't explain how to fix the issue"
- Example: "Not sure what caused the error"
- Example: "Unclear whether I could retry or had to start over"

**Suggestions for Improvement** 💡:
- (List ideas for better error handling)
- Example: "Add retry button for failed downloads"
- Example: "Show more detailed error logs"
- Example: "Provide links to troubleshooting documentation"
- Example: "Add automatic port conflict resolution"

**Specific Error Messages to Improve**:

**Error 1**:
- What was the error?
- What was the message?
- How could it be improved?

**Error 2**:
- What was the error?
- What was the message?
- How could it be improved?

**System Information**:
- OS: (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
- Docker Version: (from `docker --version`)
- Node.js Version: (from `node --version`)
- Total Time: (how long the entire scenario took)

#### Where to Submit Feedback

- **Bug Report**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
- **Feature Request**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
- **General Feedback**: [Join Discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

#### Next Steps

- **Want to test more?** Try [Scenario 5: Reconfiguration](#scenario-5-reconfiguration-20-30-minutes)
- **Found a critical bug?** Report it immediately
- **Short on time?** You're done! Thank you for testing!
- **Want to test normal scenarios?** Go back to Scenarios 1-3

#### Why Error Handling Testing Matters

Error handling is often overlooked but critically important:

- **Real users encounter errors**: Network issues, port conflicts, and misconfigurations are common
- **Good error messages reduce support burden**: Clear messages help users self-solve
- **Recovery mechanisms prevent frustration**: Users can fix issues without starting over
- **Validation prevents bigger problems**: Catching errors early prevents installation failures

Your testing of error scenarios helps ensure that when things go wrong (and they will!), users can quickly understand and resolve the issues.

#### Thank You!

Your feedback from this scenario is invaluable. Testing error handling helps ensure that all users, regardless of their technical level, can successfully install and use Kaspa All-in-One even when things don't go perfectly. 🙏

---

### Scenario 5: State Management and Fresh Start 🟢 (10-15 minutes)

**Goal**: Test how the wizard handles existing installation artifacts and the fresh start process

**What You'll Test**:
- Existing state file detection (`.env`, `.kaspa-aio/`)
- Fresh start prompts and workflow
- State cleanup process
- Wizard restart behavior
- Container cleanup verification

**Prerequisites**:
- All prerequisites installed (Docker, Docker Compose, Node.js)
- At least 10GB free disk space
- Stable internet connection
- 10-15 minutes of time
- **Recommended**: Complete Scenario 1 first to have existing state

**Note**: This scenario tests the wizard's handling of existing installation artifacts. Advanced reconfiguration features (adding/removing services) are planned for future releases.

#### Step 1: Create Existing Installation (3 minutes)

First, we need an existing installation to test state detection.

1. **Ensure you have a clean slate**:
   ```bash
   ./fresh-start.sh
   ```
   - Respond `y` to both prompts

2. **Start the wizard and complete a basic installation**:
   ```bash
   ./start-test.sh
   ```
   - Complete a Core Profile installation (follow Scenario 1 if needed)
   - Wait for installation to complete
   - Close the wizard browser tab when done

3. **Verify installation artifacts exist**:
   ```bash
   ls -la .env .kaspa-aio/
   docker ps --filter "name=kaspa-"
   ```
   - ✓ Should see `.env` file
   - ✓ Should see `.kaspa-aio/` directory
   - ✓ Should see running Kaspa containers

**📝 Document**:
- Did the installation complete successfully? (Yes/No)
- What files/directories were created?
- What containers are running?

#### Step 2: Test State Detection (2 minutes)

Now test how the wizard handles existing state when restarted.

1. **Restart the wizard**:
   ```bash
   ./start-test.sh
   ```

2. **Observe the state detection prompt**:
   - ✓ Should show: "⚠ Found existing installation state"
   - ✓ Should list: "- .kaspa-aio/ directory exists"
   - ✓ Should list: "- .env file exists"
   - ✓ Should warn: "This may cause the wizard to skip steps or show incorrect state"
   - ✓ Should ask: "Remove existing state and start fresh? (Y/n)"

3. **Test answering 'n' (keep existing state)**:
   - Type `n` and press Enter
   - ✓ Wizard should continue starting
   - ✓ Browser should open to wizard interface
   - ✓ Note what the wizard shows (does it detect existing installation?)

**📝 Document**:
- Was the state detection prompt clear? (Yes/No)
- Did the warning explain the implications? (Yes/No)
- What happened when you chose to keep existing state?
- Did the wizard show any existing installation information?

#### Step 3: Test Fresh Start Process (3 minutes)

Now test the fresh start workflow.

1. **Close the wizard browser tab**

2. **Restart the wizard again**:
   ```bash
   ./start-test.sh
   ```

3. **This time, choose fresh start**:
   - When prompted "Remove existing state and start fresh? (Y/n)"
   - Press Enter (default is Y) or type `y`
   - ✓ Should show: "Removing existing state..."
   - ✓ Should show: "✓ State cleared"

4. **Verify state was cleared**:
   ```bash
   ls -la .env .kaspa-aio/ 2>/dev/null || echo "Files removed"
   ```
   - ✓ `.env` file should be gone
   - ✓ `.kaspa-aio/` directory should be gone

5. **Check if containers are still running**:
   ```bash
   docker ps --filter "name=kaspa-"
   ```
   - ✓ Note: Containers may still be running (this is expected)
   - ✓ Fresh start only removes state files, not containers

**📝 Document**:
- Was the fresh start process clear? (Yes/No)
- Were the state files properly removed? (Yes/No)
- Are containers still running? (Yes/No)
- Did you understand what was being cleared vs. preserved?

#### Step 4: Test Container Cleanup (2 minutes)

Test the proper way to clean up containers.

1. **Use the cleanup script**:
   ```bash
   ./cleanup-test.sh
   ```
   - Follow the prompts to stop and remove containers
   - ✓ Should offer to stop running services
   - ✓ Should offer to remove containers
   - ✓ Should offer to remove data volumes

2. **Verify cleanup**:
   ```bash
   docker ps --filter "name=kaspa-"
   docker ps -a --filter "name=kaspa-"
   ```
   - ✓ Should show no running Kaspa containers
   - ✓ Should show no stopped Kaspa containers (if you chose to remove them)

**📝 Document**:
- Was the cleanup process clear? (Yes/No)
- Did it properly stop and remove containers? (Yes/No)
- Were you given appropriate choices about what to remove?

#### Step 5: Test Restart Wizard Script (2 minutes)

Test the restart wizard functionality.

1. **Start the wizard normally**:
   ```bash
   ./start-test.sh
   ```
   - Let it start completely
   - Don't close the browser tab

2. **Use the restart script**:
   ```bash
   ./restart-wizard.sh
   ```
   - ✓ Should show: "Stopping wizard..."
   - ✓ Should ask: "Reset wizard to fresh state? (y/N)"
   - Try answering 'n' first (keep state)
   - ✓ Should show: "Keeping existing state"
   - ✓ Should restart the wizard

3. **Test with state reset**:
   - Run `./restart-wizard.sh` again
   - This time answer 'y' to reset state
   - ✓ Should show: "Resetting wizard state..."
   - ✓ Should remove configuration files
   - ✓ Should warn about browser cache refresh

**📝 Document**:
- Did the restart script work properly? (Yes/No)
- Were the state reset options clear? (Yes/No)
- Did you understand the browser refresh requirement?
   - ✓ Should NOT show services that are already installed
   - ✓ May show profiles or individual services

2. **For this test, add Kasia application**:
   - Look for "Kasia" or "Kaspa User Applications"
   - Select the option to add Kasia
   - ✓ Should show as selected

3. **Review what will be added**:
   - ✓ Should clearly show: "Adding Kasia app"
   - ✓ Should show: "Keeping existing Kaspa node"
   - ✓ Should show estimated additional resources needed
   - ✓ Should show estimated installation time

4. **Configure the new service**:
   - ✓ Should show configuration options for Kasia
   - ✓ Should show port selection (default: 3001)
   - ✓ Should show indexer choice (public vs local)
   - For this test, select "Use public indexers"
   - Use default port (3001)

5. **Click "Continue" or "Next"**

**📝 Document**:
- Were available services clearly shown? (Yes/No)
- Was it clear which services were already installed? (Yes/No)
- Was the "what will be added" summary clear? (Yes/No)
- Were configuration options appropriate? (Yes/No)

---

Before applying changes, review what will happen.



### Scenario 5: Summary and Feedback

Congratulations! You've completed Scenario 5: State Management and Fresh Start. 🎉

#### What You Tested

- ✅ Existing state file detection (`.env`, `.kaspa-aio/`)
- ✅ State detection prompts and warnings
- ✅ Fresh start process and state cleanup
- ✅ Container vs. state file management
- ✅ Wizard restart functionality
- ✅ Cleanup script usage

#### Time to Complete

**Expected**: ~10-15 minutes  
**Your Time**: _____ minutes

#### Critical Success Factors

The most important aspects of this scenario:

1. **State Detection**: Did the wizard correctly identify existing state files?
2. **Clear Warnings**: Were the implications of keeping vs. removing state clear?
3. **Proper Cleanup**: Did the cleanup processes work as expected?
4. **User Control**: Did you feel in control of what was being removed/preserved?

#### Overall Experience

Please rate your experience (1-5 stars):

- **State detection clarity**: ⭐⭐⭐⭐⭐
- **Fresh start process**: ⭐⭐⭐⭐⭐
- **Cleanup script usability**: ⭐⭐⭐⭐⭐
- **Documentation accuracy**: ⭐⭐⭐⭐⭐
- **Overall satisfaction**: ⭐⭐⭐⭐⭐

#### Provide Detailed Feedback

Now is the time to report your findings! Please create a bug report or feedback post with:

**What Worked Well** ✅:
- (List things that worked smoothly)
- Example: "State detection prompts were clear"
- Example: "Fresh start process worked perfectly"
- Example: "Cleanup script was easy to use"

**What Didn't Work** ❌:
- (List any errors, failures, or problems)
- Example: "State files weren't detected"
- Example: "Fresh start didn't remove all files"
- Example: "Cleanup script failed to stop containers"

**What Was Confusing** 🤔:
- (List anything that was unclear or hard to understand)
- Example: "Wasn't clear what 'state' meant"
- Example: "Didn't understand difference between state files and containers"
- Example: "Restart wizard options were unclear"

**Suggestions for Improvement** 💡:
- (List ideas for making it better)
- Example: "Explain what each state file contains"
- Example: "Show which containers will be affected"
- Example: "Add option to backup state before removing"

**Critical Issues** 🚨:
- Did state detection fail to work? (Yes/No)
- Were important files accidentally removed? (Yes/No)
- Did any cleanup process fail? (Yes/No)

**System Information**:
- OS: (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
- Docker Version: (from `docker --version`)
- Node.js Version: (from `node --version`)
- Total Time: (how long the entire scenario took)

#### Where to Submit Feedback

- **Bug Report**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)
- **Feature Request**: [Create Issue](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)
- **General Feedback**: [Join Discussion](https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback)

#### Next Steps

- **Found a critical bug?** Report it immediately
- **Short on time?** You're done! Thank you for testing!
- **Want to test more?** Try other scenarios or edge cases
- **Want to test error handling?** Go back to [Scenario 4: Error Handling](#scenario-4-error-handling-20-30-minutes)

#### Why Reconfiguration Testing Matters

Reconfiguration is a critical feature because:

- **Users evolve their needs**: They start simple and expand over time
- **Blockchain sync is expensive**: Losing sync progress is very frustrating
- **Data is valuable**: Users don't want to lose configuration or data
- **Flexibility is key**: Users should be able to add/remove services easily

Your testing of reconfiguration helps ensure that users can safely modify their installations without fear of data loss or service interruption.

#### Thank You!

Your feedback from this scenario is invaluable. Testing reconfiguration helps ensure that Kaspa All-in-One can grow with users' needs without forcing them to start from scratch. 🙏

---

## Service Management

During testing, you may need to manage services without going through the full installation wizard again. Kaspa All-in-One provides several utility scripts to help you control services, check status, and recover from issues.

### Available Management Scripts

All scripts are located in the project root directory and can be run directly:

- **`./status.sh`** - Check status of all services
- **`./restart-services.sh`** - Restart Docker services
- **`./stop-services.sh`** - Stop all services (preserve data)
- **`./fresh-start.sh`** - Remove containers and start fresh
- **`./cleanup-test.sh`** - Complete cleanup (remove everything)

### When to Use Each Script

| Scenario | Script to Use | What It Does |
|----------|---------------|--------------|
| Check what's running | `./status.sh` | Shows wizard, Docker services, resource usage, and ports |
| Services acting weird | `./restart-services.sh` | Restarts all Docker containers |
| Pause testing | `./stop-services.sh` | Stops everything but keeps your data |
| Test same scenario again | `./fresh-start.sh` | Removes containers, optionally keeps data |
| Done testing completely | `./cleanup-test.sh` | Removes everything (wizard, containers, data) |

---

### Check Service Status

Use this script anytime to see what's running and how resources are being used.

**Command:**
```bash
./status.sh
```

**What It Shows:**

1. **Wizard Status**
   - Whether the installation wizard is running
   - Process ID (PID) if running
   - URL to access wizard

2. **Docker Services**
   - List of all running containers
   - Container status (Up, Restarting, Exited)
   - Ports being used by each service

3. **Resource Usage**
   - CPU usage per container
   - Memory usage per container
   - Helps identify performance issues

4. **Ports in Use**
   - Shows which Kaspa-related ports are active
   - Helps diagnose port conflicts

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Service Status                       ║
╚════════════════════════════════════════════════════════════╝

=== Wizard Status ===
✓ Wizard running (PID: 12345)
  URL: http://localhost:3000

=== Docker Services ===
NAME          IMAGE                          COMMAND                  SERVICE      CREATED          STATUS          PORTS
kaspa-node    kaspanet/rusty-kaspad:latest   "entrypoint.sh kaspa…"   kaspa-node   20 hours ago     Up 42 seconds   16110-16111/tcp

=== Resource Usage ===
NAME          CPU %     MEM USAGE / LIMIT
kaspa-node    142.03%   784.7MiB / 27.33GiB

=== Ports in Use ===
tcp6       0      0 :::3000                 :::*                    LISTEN
tcp6       0      0 :::16110                :::*                    LISTEN
tcp6       0      0 :::16111                :::*                    LISTEN
```

**When to Use:**
- Before starting a test (verify nothing is running)
- During testing (check if services are healthy)
- After installation (verify services started)
- When troubleshooting (identify which service has issues)

**Troubleshooting:**
- **"No services running"** but you just installed: Services may have crashed, check logs with `docker logs <container-name>`
- **High CPU usage**: Normal during blockchain sync, concerning if persistent after sync
- **High memory usage**: May indicate a problem if exceeding expected limits

---

### Restart Services

Use this when services are misbehaving but you want to keep your configuration and data.

**Command:**
```bash
./restart-services.sh
```

**What It Does:**
1. Gracefully stops all Docker containers
2. Starts all containers again
3. Waits for services to be healthy
4. Shows service status

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Restart Services                     ║
╚════════════════════════════════════════════════════════════╝

Stopping services...
✓ Services stopped

Starting services...
✓ Services started

Waiting for services to be healthy...

Checking service status...
NAME          IMAGE                          COMMAND                  SERVICE      CREATED          STATUS          PORTS
kaspa-node    kaspanet/rusty-kaspad:latest   "entrypoint.sh kaspa…"   kaspa-node   20 hours ago     Up 5 seconds    16110-16111/tcp

✓ Restart complete!

Note: Dashboard not available in v0.9.0 - use `docker ps` to verify services
```

**When to Use:**
- Service is unresponsive or frozen
- After changing configuration files manually
- Dashboard shows service as "Unhealthy"
- Logs show repeated errors
- Testing recovery from service failures

**What's Preserved:**
- ✅ All configuration files
- ✅ All data (blockchain, databases, etc.)
- ✅ Wizard state
- ✅ Docker volumes

**What's Reset:**
- Container processes (fresh start)
- Network connections
- Temporary files inside containers

**Troubleshooting:**
- **Services won't start**: Check logs with `docker logs <container-name>`
- **Restart takes too long**: Some services (like databases) need time to initialize
- **Services immediately crash**: Check for configuration errors or port conflicts

---

### Stop Services

Use this when you want to pause testing without losing any data.

**Command:**
```bash
./stop-services.sh
```

**What It Does:**
1. Stops all Docker containers gracefully
2. Stops the installation wizard
3. Preserves all data and configuration
4. Shows confirmation message

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Stop Services                        ║
║   Version: v0.9.0-test                                     ║
╚════════════════════════════════════════════════════════════╝

✓ Using: docker compose

Stopping Docker services...
✓ Docker services stopped

Stopping wizard process...
✓ Wizard stopped

╔════════════════════════════════════════════════════════════╗
║   All Services Stopped                                     ║
╚════════════════════════════════════════════════════════════╝

✓ All services have been stopped

Data and configuration preserved.

To restart services:
  • Start wizard:        ./start-test.sh
  • Restart services:    ./restart-services.sh
```

**When to Use:**
- Taking a break from testing
- Need to free up system resources temporarily
- Shutting down your computer
- Running other resource-intensive tasks
- Finished testing for the day

**What's Preserved:**
- ✅ All configuration files
- ✅ All data (blockchain, databases, etc.)
- ✅ Wizard state
- ✅ Docker volumes
- ✅ Docker images (no need to re-download)

**How to Resume:**
- **Start wizard**: Run `./start-test.sh` to restart the wizard
- **Start services**: Run `./restart-services.sh` to restart Docker services
- **Both**: Run `./start-test.sh` then use wizard to start services

**Troubleshooting:**
- **Wizard won't stop**: Check for stale PID file at `/tmp/kaspa-wizard.pid`, remove it manually
- **Containers still running**: Run `docker ps` to check, manually stop with `docker stop <container-name>`

---

### Fresh Start

Use this when you want to remove containers and start testing again with a clean slate.

**Command:**
```bash
./fresh-start.sh
```

**What It Does:**
1. Asks if you want to remove data volumes
2. Asks for confirmation to proceed
3. Stops and removes all Docker containers
4. Optionally removes data volumes
5. Preserves wizard state and configuration files

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Fresh Start                          ║
╚════════════════════════════════════════════════════════════╝

This will remove all containers and start fresh.
Configuration files and wizard state will be preserved.

Remove data volumes? (y/N) n
Continue with fresh start? (y/N) y

Stopping and removing containers...
✓ Containers removed (volumes preserved)

✓ Fresh start complete!

Run ./start-test.sh to begin testing again
```

**When to Use:**
- Testing the same scenario multiple times
- Containers are in a bad state
- Want to test installation from scratch
- Switching between different profiles
- Recovering from a failed installation

**What's Preserved:**
- ✅ Wizard state (if you choose to keep volumes)
- ✅ Configuration files (if you choose to keep volumes)
- ✅ Docker images (no need to re-download)
- ✅ Source code and scripts

**What's Removed:**
- ❌ All Docker containers
- ❌ Data volumes (if you choose to remove them)
- ❌ Running processes

**Interactive Prompts:**

1. **"Remove data volumes? (y/N)"**
   - `y` = Remove all data (blockchain, databases, etc.) - true fresh start
   - `n` = Keep data volumes - faster restart, preserves blockchain sync progress

2. **"Continue with fresh start? (y/N)"**
   - `y` = Proceed with fresh start
   - `n` = Cancel operation

**When to Remove Volumes:**
- ✅ Testing installation from absolute scratch
- ✅ Data is corrupted
- ✅ Switching to a completely different profile
- ✅ Disk space is low

**When to Keep Volumes:**
- ✅ Just want to restart containers
- ✅ Blockchain is already synced (don't want to re-sync)
- ✅ Testing configuration changes
- ✅ Recovering from container issues

**Troubleshooting:**
- **Script hangs**: Press Ctrl+C and try `docker compose down -v` manually
- **Volumes not removed**: Manually remove with `docker volume ls` and `docker volume rm <volume-name>`
- **Permission errors**: May need to run with `sudo` on some systems

---

### Complete Cleanup

Use this when you're completely done testing and want to remove everything.

**Command:**
```bash
./cleanup-test.sh
```

**What It Does:**
1. Asks for confirmation (this is destructive!)
2. Stops the wizard
3. Stops and removes all Docker containers
4. Asks if you want to remove all data
5. Removes temporary files and logs
6. Shows thank you message

**Example Output:**
```
╔════════════════════════════════════════════════════════════╗
║   Kaspa All-in-One - Test Cleanup                         ║
╚════════════════════════════════════════════════════════════╝

This will stop all services and remove all data. Continue? (y/N) y

Stopping services...
✓ Wizard stopped
✓ Docker containers stopped

Remove all data? This includes blockchain data. (y/N) y
✓ Data removed
✓ Logs removed

✓ Cleanup complete!

Thank you for testing Kaspa All-in-One!
Your feedback helps make the project better.
```

**When to Use:**
- ✅ Completely finished with all testing
- ✅ Need to free up disk space
- ✅ Preparing to test a new version
- ✅ Removing the test installation

**What's Removed:**
- ❌ Wizard process
- ❌ All Docker containers
- ❌ All data volumes (if you confirm)
- ❌ Temporary files
- ❌ Log files
- ❌ `.kaspa-aio` directory (if you confirm)
- ❌ `.kaspa-backups` directory (if you confirm)

**What's Preserved:**
- ✅ Source code and scripts
- ✅ Docker images (can be removed separately with `docker image prune`)
- ✅ Your feedback and bug reports 😊

**Interactive Prompts:**

1. **"This will stop all services and remove all data. Continue? (y/N)"**
   - `y` = Proceed with cleanup
   - `n` = Cancel (nothing is removed)

2. **"Remove all data? This includes blockchain data. (y/N)"**
   - `y` = Remove all data directories (complete cleanup)
   - `n` = Keep data directories (can resume later)

**⚠️ Warning**: This is the most destructive operation. Make sure you've:
- Submitted all your feedback
- Saved any logs or screenshots you need
- Confirmed you're done testing

**After Cleanup:**
- You can still re-run `./start-test.sh` to test again
- Docker images are preserved (faster second installation)
- All your feedback is safe (it's on GitHub)

**Troubleshooting:**
- **Data directories won't delete**: May need `sudo rm -rf .kaspa-aio .kaspa-backups`
- **Containers still running**: Run `docker ps -a` and manually remove with `docker rm -f <container-id>`
- **Want to remove Docker images too**: Run `docker image prune -a` after cleanup

---

### Service Management Quick Reference

**Quick Decision Tree:**

```
Need to check what's running?
  → ./status.sh

Services misbehaving?
  → ./restart-services.sh

Taking a break?
  → ./stop-services.sh

Want to test same scenario again?
  → ./fresh-start.sh (keep volumes: n)

Switching to different profile?
  → ./fresh-start.sh (remove volumes: y)

Completely done testing?
  → ./cleanup-test.sh
```

**Common Testing Workflows:**

**Workflow 1: Test Multiple Scenarios**
```bash
# Test Scenario 1
./start-test.sh
# ... complete scenario 1 ...
./fresh-start.sh  # Keep volumes: n

# Test Scenario 2
./start-test.sh
# ... complete scenario 2 ...
./fresh-start.sh  # Keep volumes: n

# Done testing
./cleanup-test.sh
```

**Workflow 2: Test with Breaks**
```bash
# Start testing
./start-test.sh
# ... test for a while ...

# Take a break
./stop-services.sh

# Resume later
./start-test.sh
./restart-services.sh

# Done for today
./stop-services.sh
```

**Workflow 3: Troubleshooting**
```bash
# Something's wrong
./status.sh  # Check what's running

# Try restarting
./restart-services.sh

# Still broken? Fresh start
./fresh-start.sh  # Keep volumes: n

# Still broken? Complete cleanup
./cleanup-test.sh
./start-test.sh  # Start over
```

**Tips for Effective Service Management:**

1. **Always check status first**: Run `./status.sh` before taking action
2. **Use restart before fresh start**: Try `./restart-services.sh` before more drastic measures
3. **Keep volumes when possible**: Preserves blockchain sync progress
4. **Document before cleanup**: Take screenshots and notes before running `./cleanup-test.sh`
5. **One script at a time**: Don't run multiple management scripts simultaneously

**Understanding Service States:**

| State | Meaning | Action |
|-------|---------|--------|
| Running | Service is healthy | No action needed |
| Restarting | Service keeps crashing | Check logs, may need fresh start |
| Exited | Service stopped | Restart services |
| Not found | Service not installed | Run installation wizard |

---


## Reporting Bugs

Found a bug? Thank you! Your bug reports help us fix issues before the v1.0 release. Here's how to report bugs effectively.

### Before Reporting

**Check if it's already reported:**
1. Search existing issues: https://github.com/jtmac69/Kaspa-All-in-One/issues
2. Check Known Issues: See `KNOWN_ISSUES.md` in the project root
3. Check GitHub Discussions: https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback

If you find an existing report:
- 👍 Add a thumbs up to show it affects you too
- 💬 Add a comment if you have additional information
- 📎 Attach your logs or screenshots if they're different

### How to Report a Bug

**Use the bug report template:**

🐛 **[Create Bug Report](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md)**

The template will guide you through providing:

1. **Bug Description**
   - What happened?
   - What did you expect to happen?
   - Clear and concise description

2. **Steps to Reproduce**
   - Step 1: ...
   - Step 2: ...
   - Step 3: ...
   - Be specific! "Clicked Install" is better than "Started installation"

3. **System Information**
   - Operating System (e.g., Ubuntu 22.04, macOS 13.0, Windows 11 WSL2)
   - Docker Version (from `docker --version`)
   - Docker Compose Version (from `docker compose version`)
   - Node.js Version (from `node --version`)
   - Test Release Version (v0.9.0-test)

4. **Logs and Error Messages**
   - Copy exact error messages
   - Include relevant logs (see "Collecting Logs" below)
   - Use code blocks for formatting

5. **Screenshots**
   - Screenshot of error messages
   - Screenshot of wizard state
   - Screenshot of dashboard (if relevant)

6. **Additional Context**
   - What were you testing?
   - Had it worked before?
   - Any recent changes to your system?

### Collecting Logs

**Wizard Logs:**
```bash
cat /tmp/kaspa-wizard.log
```

**Docker Container Logs:**
```bash
# List all containers
docker ps -a

# Get logs for specific container
docker logs kaspa-node
docker logs kaspa-node --tail 100  # Last 100 lines
docker logs kaspa-node --since 5m  # Last 5 minutes
```

**Service Status:**
```bash
./status.sh > status-output.txt
```

**Docker Compose Logs:**
```bash
docker compose logs > docker-logs.txt
```

### Bug Severity Guidelines

Help us prioritize by indicating severity:

**🔴 Critical** - System is unusable
- Installation completely fails
- Data loss occurs
- System crashes or freezes
- Security vulnerability

**🟠 High** - Major functionality broken
- Key feature doesn't work
- Workaround is difficult
- Affects most users

**🟡 Medium** - Feature partially broken
- Feature works but has issues
- Workaround is available
- Affects some users

**🟢 Low** - Minor issue
- Cosmetic issue
- Typo or unclear text
- Affects few users
- Easy workaround available

### What Makes a Good Bug Report?

**✅ Good Bug Report:**
```
Title: Installation fails when port 3000 is in use

Description:
When I run ./start-test.sh and port 3000 is already in use by another 
application, the wizard fails to start but doesn't show a clear error 
message.

Steps to Reproduce:
1. Start another application on port 3000 (e.g., `python3 -m http.server 3000`)
2. Run `./start-test.sh`
3. Script says "Wizard is ready!" but browser shows "Connection refused"

Expected: Script should detect port conflict and show clear error
Actual: Script thinks wizard started but it didn't

System Info:
- OS: Ubuntu 22.04
- Docker: 24.0.0
- Node.js: v18.19.1

Logs:
```
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1740:16)
```

Screenshot: [attached]
```

**❌ Poor Bug Report:**
```
Title: It doesn't work

Description:
I tried to install but it failed. Please fix.
```

### After Reporting

**What happens next:**

1. **We'll review your report** (usually within 24-48 hours)
2. **We may ask questions** for clarification
3. **We'll label the issue** (bug, critical, etc.)
4. **We'll prioritize** based on severity and impact
5. **We'll fix it** and update the issue
6. **We'll notify you** when fixed

**You can help by:**
- Responding to questions promptly
- Testing proposed fixes
- Confirming when the issue is resolved

### Bug Report Checklist

Before submitting, verify:

- [ ] Searched for existing reports
- [ ] Used the bug report template
- [ ] Included clear steps to reproduce
- [ ] Included system information
- [ ] Included logs and error messages
- [ ] Included screenshots (if applicable)
- [ ] Described expected vs actual behavior
- [ ] Indicated severity (if known)

### Common Issues and Solutions

Before reporting, check if your issue is here:

**Issue: "Docker not found" but Docker is installed**
- Solution: Ensure Docker daemon is running (`sudo systemctl start docker`)

**Issue: "Permission denied" errors**
- Solution: Add user to docker group (`sudo usermod -aG docker $USER`, then log out/in)

**Issue: Port conflicts**
- Solution: Stop other services using ports 3000, 8080, 16110, 16111

**Issue: Wizard shows blank page**
- Solution: Check browser console (F12), may be JavaScript error

**Issue: Services won't start**
- Solution: Check logs with `docker logs <container-name>`

**Issue: Blockchain sync is slow**
- Solution: This is normal, can take several hours (see KNOWN_ISSUES.md)

If your issue isn't listed, please report it!

---


## Suggesting Features

Have an idea to make Kaspa All-in-One better? We'd love to hear it! Feature suggestions from testers help shape the future of the project.

### Before Suggesting

**Check if it's already suggested:**
1. Search existing issues: https://github.com/jtmac69/Kaspa-All-in-One/issues?q=is%3Aissue+label%3Aenhancement
2. Check GitHub Discussions: https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback
3. Review the project roadmap (if available)

If you find an existing suggestion:
- 👍 Add a thumbs up to show you want it too
- 💬 Add a comment with your use case or additional ideas
- 🔔 Subscribe to the issue for updates

### How to Suggest a Feature

**Use the feature request template:**

💡 **[Create Feature Request](https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md)**

The template will guide you through providing:

1. **Feature Description**
   - What feature do you want?
   - Clear and concise description
   - Be specific about what it should do

2. **Use Case / Problem**
   - Why do you need this feature?
   - What problem does it solve?
   - Who would benefit from it?
   - Real-world scenario

3. **Proposed Solution**
   - How should it work?
   - What should the user experience be?
   - Any technical details (if you have them)

4. **Alternatives Considered**
   - What other approaches did you think about?
   - Why is your proposal better?
   - Any workarounds you're currently using?

5. **Additional Context**
   - Screenshots or mockups (if applicable)
   - Examples from other projects
   - Links to relevant documentation

### Types of Feature Suggestions

**🎨 User Interface Improvements**
- Better visualization of data
- Clearer navigation
- More intuitive workflows
- Accessibility improvements

**⚙️ Functionality Enhancements**
- New capabilities
- Improved existing features
- Better automation
- More configuration options

**📊 Monitoring and Observability**
- Better status information
- More detailed logs
- Performance metrics
- Alerting capabilities

**🔧 Developer Experience**
- Better documentation
- More examples
- Easier customization
- Better error messages

**🚀 Performance Improvements**
- Faster installation
- Lower resource usage
- Better optimization
- Caching improvements

**🔒 Security Enhancements**
- Better security practices
- More secure defaults
- Security documentation
- Vulnerability fixes

### What Makes a Good Feature Request?

**✅ Good Feature Request:**
```
Title: Add progress bar for blockchain sync

Description:
Add a visual progress bar showing blockchain sync progress with estimated 
time remaining.

Use Case:
As a new user, I want to know how long blockchain sync will take so I can 
plan accordingly. Currently, I just see "syncing" with no indication of 
progress, which makes me wonder if it's working or stuck.

Proposed Solution:
- Show progress bar in dashboard (0-100%)
- Display current block height vs. network height
- Show estimated time remaining
- Update every 30 seconds

Example:
┌─────────────────────────────────────────┐
│ Blockchain Sync: 45% Complete          │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░  │
│ Block 1,234,567 / 2,750,000            │
│ Estimated time remaining: 2h 15m       │
└─────────────────────────────────────────┘

Alternatives Considered:
- Just showing block numbers (less intuitive)
- Email notification when complete (too complex)

Additional Context:
Similar to how Bitcoin Core shows sync progress. This would greatly 
improve the new user experience.
```

**❌ Poor Feature Request:**
```
Title: Make it better

Description:
The sync thing should be better. Add more features.
```

### Feature Request Guidelines

**Do:**
- ✅ Describe the problem you're trying to solve
- ✅ Explain who would benefit
- ✅ Provide specific examples
- ✅ Consider implementation complexity
- ✅ Be open to alternative solutions

**Don't:**
- ❌ Request features that conflict with project goals
- ❌ Demand immediate implementation
- ❌ Suggest features without explaining why
- ❌ Duplicate existing requests without adding value
- ❌ Request features that belong in upstream projects

### Prioritization Factors

We prioritize features based on:

1. **Impact**: How many users benefit?
2. **Alignment**: Does it fit project goals?
3. **Effort**: How complex is implementation?
4. **Dependencies**: Does it require other changes?
5. **Community Interest**: How many upvotes?

**High Priority Features:**
- Benefit most users
- Solve critical pain points
- Align with project vision
- Relatively easy to implement

**Low Priority Features:**
- Benefit few users
- Nice-to-have but not essential
- Very complex to implement
- Require significant architectural changes

### After Suggesting

**What happens next:**

1. **We'll review your suggestion** (usually within a week)
2. **We'll discuss feasibility** and implementation approach
3. **We'll label the issue** (enhancement, good-first-issue, etc.)
4. **We'll add to roadmap** if accepted
5. **We'll implement** when prioritized
6. **We'll notify you** when available

**You can help by:**
- Participating in discussion
- Providing additional details if requested
- Testing the feature when implemented
- Helping with documentation

### Feature Request Checklist

Before submitting, verify:

- [ ] Searched for existing requests
- [ ] Used the feature request template
- [ ] Described the problem/use case
- [ ] Proposed a specific solution
- [ ] Considered alternatives
- [ ] Explained who would benefit
- [ ] Provided examples or mockups (if applicable)

### Ideas for Feature Suggestions

Not sure what to suggest? Here are areas where we'd love feedback:

**Installation Experience:**
- What was confusing during installation?
- What information was missing?
- What would have made it easier?

**Dashboard:**
- What information do you wish was displayed?
- What actions do you wish you could perform?
- How could navigation be improved?

**Documentation:**
- What topics need better explanation?
- What examples would be helpful?
- What troubleshooting guides are missing?

**Service Management:**
- What operations are difficult?
- What automation would help?
- What monitoring would be useful?

**Error Handling:**
- What errors were unclear?
- What recovery options were missing?
- What guidance would have helped?

### Discussion vs. Feature Request

**Use GitHub Discussions for:**
- 💭 Brainstorming ideas
- 🤔 Asking "should we..." questions
- 💬 General feedback
- 🗳️ Polling community opinion
- 📚 Sharing use cases

**Use Feature Request for:**
- 💡 Specific, well-defined features
- 🎯 Concrete proposals
- 📋 Actionable items
- 🔧 Technical enhancements

**Tip**: Start with a discussion to refine your idea, then create a feature request when it's well-defined.

### Feature Request Examples

**Example 1: UI Improvement**
```
Title: Add dark mode to installation wizard

Use Case: Many users prefer dark mode, especially when installing at night 
or in low-light environments. Current bright white interface can be harsh 
on the eyes.

Solution: Add dark mode toggle in wizard header. Persist preference across 
sessions. Use system preference as default.

Benefit: Improved user experience, accessibility, modern UI standards
```

**Example 2: Functionality Enhancement**
```
Title: Support custom Docker registry for air-gapped installations

Use Case: Enterprise users may need to install in air-gapped environments 
where public Docker Hub is not accessible. They need to pull images from 
internal registries.

Solution: Add configuration option to specify custom Docker registry URL. 
Update all image references to use configured registry.

Benefit: Enables enterprise deployments, security compliance
```

**Example 3: Monitoring Feature**
```
Title: Email notifications for critical events

Use Case: Node operators want to be notified when critical events occur 
(node down, disk full, sync stopped) without constantly monitoring dashboard.

Solution: Add email notification configuration in wizard. Send alerts for 
critical events. Include event details and suggested actions.

Benefit: Proactive monitoring, reduced downtime, better operations
```

---


## Getting Help

Stuck? Confused? Need assistance? We're here to help! Here are all the ways you can get support during testing.

### Quick Help Resources

**📖 Documentation**
- **TESTING.md** (this file) - Testing instructions and scenarios
- **KNOWN_ISSUES.md** - Known bugs and limitations
- **README.md** - Project overview and quick start
- **docs/** directory - Detailed technical documentation

**🔍 Self-Service Troubleshooting**
1. Check [Common Issues](#common-issues-and-solutions) section above
2. Review `KNOWN_ISSUES.md` for known problems
3. Search existing GitHub issues
4. Check service logs with `docker logs <container-name>`
5. Run `./status.sh` to see what's running

### Community Support

**💬 GitHub Discussions** (Best for: General questions, discussions)
- **URL**: https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback
- **Response Time**: Usually within 24 hours
- **Best For**:
  - "How do I..." questions
  - General feedback
  - Sharing experiences
  - Asking for advice
  - Discussing ideas

**Categories:**
- 💭 **General** - General discussion about the project
- 🙋 **Q&A** - Questions and answers
- 💡 **Ideas** - Feature ideas and suggestions
- 📣 **Announcements** - Project updates and news
- 🧪 **Test Release Feedback** - Specific to this test release

**How to Use Discussions:**
1. Go to Discussions tab on GitHub
2. Search existing discussions first
3. Create new discussion if needed
4. Choose appropriate category
5. Provide context and details
6. Be respectful and patient

**🐛 GitHub Issues** (Best for: Bugs, specific problems)
- **URL**: https://github.com/jtmac69/Kaspa-All-in-One/issues
- **Response Time**: Usually within 48 hours for bugs
- **Best For**:
  - Reporting bugs
  - Tracking specific problems
  - Feature requests
  - Technical issues

**When to Use Issues vs. Discussions:**
- ✅ **Issue**: "Installation fails with error X" (specific bug)
- ✅ **Discussion**: "What's the best profile for my use case?" (general question)
- ✅ **Issue**: "Add feature Y" (specific feature request)
- ✅ **Discussion**: "Should we support feature Y?" (idea discussion)

### Getting Help Checklist

Before asking for help, please:

- [ ] Read relevant documentation (TESTING.md, KNOWN_ISSUES.md)
- [ ] Search existing issues and discussions
- [ ] Try basic troubleshooting (restart, check logs, check status)
- [ ] Gather relevant information (error messages, logs, system info)
- [ ] Prepare to provide details about your setup

### How to Ask Good Questions

**✅ Good Question:**
```
Title: Wizard shows "Connection refused" after running start-test.sh

I'm trying to test the Core Profile on Ubuntu 22.04. When I run 
./start-test.sh, the script says "Wizard is ready!" but when I open 
http://localhost:3000 in my browser, I get "Connection refused".

What I've tried:
- Checked that port 3000 is not in use (it's not)
- Verified Docker is running (docker ps works)
- Checked wizard logs: /tmp/kaspa-wizard.log shows "Error: EADDRINUSE"

System info:
- OS: Ubuntu 22.04
- Docker: 24.0.0
- Node.js: v18.19.1

Logs attached. Any ideas what might be wrong?
```

**❌ Poor Question:**
```
It doesn't work. Help!
```

### What Information to Provide

When asking for help, include:

**1. What You're Trying to Do**
- Which scenario are you testing?
- What step are you on?
- What's your goal?

**2. What Happened**
- Exact error message (copy/paste, don't paraphrase)
- What you saw vs. what you expected
- When the problem started

**3. What You've Tried**
- Troubleshooting steps you've taken
- Whether it worked before
- Any recent changes

**4. System Information**
```bash
# Run these commands and include output:
uname -a                    # OS info
docker --version            # Docker version
docker compose version      # Compose version
node --version              # Node.js version
./status.sh                 # Service status
```

**5. Relevant Logs**
```bash
# Wizard logs
cat /tmp/kaspa-wizard.log

# Container logs
docker logs kaspa-node --tail 50

# Service status
./status.sh
```

### Response Time Expectations

**During Testing Period:**
- 🟢 **Critical bugs**: Within 24 hours
- 🟡 **General questions**: Within 48 hours
- 🔵 **Feature requests**: Within 1 week
- ⚪ **Documentation**: Within 1 week

**Note**: We're a community project. Response times may vary, especially on weekends and holidays.

### Escalation Path

If you're not getting help:

1. **Wait 48 hours** - Give the community time to respond
2. **Bump your post** - Add a comment asking if anyone can help
3. **Try different channel** - If discussion isn't working, try an issue
4. **Provide more details** - Maybe you didn't include enough information
5. **Be patient** - We're all volunteers doing our best

### Help Others

You can help too! If you see a question you can answer:
- 💬 Share your experience
- 🔗 Link to relevant documentation
- 💡 Suggest troubleshooting steps
- ✅ Confirm if you have the same issue

**Benefits of helping others:**
- Strengthens the community
- Helps you learn more
- Makes testing better for everyone
- Earns you karma and respect

### Common Questions

**Q: How long does blockchain sync take?**
A: Usually 4-8 hours depending on your internet speed and hardware. See KNOWN_ISSUES.md for details.

**Q: Can I pause and resume testing?**
A: Yes! Use `./stop-services.sh` to pause and `./start-test.sh` to resume.

**Q: Do I need to test everything?**
A: No! Even testing one scenario is helpful. Test what interests you.

**Q: What if I find a critical bug?**
A: Report it immediately as a GitHub issue with "Critical" in the title.

**Q: Can I test on multiple machines?**
A: Yes! Testing on different platforms is very valuable.

**Q: What if I don't understand something?**
A: Ask! There are no stupid questions. We want to know what's confusing.

**Q: How do I know if my feedback was useful?**
A: We'll respond to your issues/discussions and may ask follow-up questions.

**Q: Can I contribute code fixes?**
A: Yes! But for this test release, we're primarily focused on feedback. Code contributions are welcome after v1.0.

### Emergency Contacts

**For critical security issues ONLY:**
- Do NOT post publicly
- Email: [security contact to be provided]
- Include "SECURITY" in subject line

**What qualifies as a security issue:**
- Vulnerability that could compromise user data
- Exploit that could harm user systems
- Exposure of sensitive information
- Remote code execution possibilities

**What is NOT a security issue:**
- Regular bugs (use GitHub issues)
- Feature requests (use feature request template)
- Questions (use GitHub discussions)

### Help Resources Summary

| Need | Resource | URL |
|------|----------|-----|
| General questions | GitHub Discussions | https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback |
| Report bug | GitHub Issues | https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=bug_report.md |
| Suggest feature | GitHub Issues | https://github.com/jtmac69/Kaspa-All-in-One/issues/new?template=feature_request.md |
| Known issues | KNOWN_ISSUES.md | In project root |
| Documentation | docs/ directory | In project root |
| Service status | ./status.sh | Run in project root |

### Tips for Getting Help Faster

1. **Be specific**: "Error on step 3 of Scenario 1" vs. "It broke"
2. **Include details**: System info, logs, error messages
3. **Show what you tried**: Demonstrates you've done basic troubleshooting
4. **Be patient**: We're volunteers, not 24/7 support
5. **Be respectful**: Kindness goes a long way
6. **Follow up**: Let us know if suggestions worked
7. **Help others**: Pay it forward when you can

### Language and Communication

**Primary Language**: English
- Most documentation and support is in English
- We'll do our best to help non-English speakers
- Consider using translation tools if needed

**Communication Style**:
- Be clear and concise
- Use technical terms when appropriate
- Don't worry about perfect grammar
- Focus on conveying information accurately

### Timezone Considerations

**Project Maintainers**: Primarily in US timezones (UTC-5 to UTC-8)
- Expect faster responses during US business hours
- Weekend responses may be slower
- International community may help at other times

**Tip**: Include your timezone when reporting time-sensitive issues.

---


## Glossary of Terms

New to Kaspa or blockchain technology? This glossary explains terms you'll encounter during testing.

### Kaspa-Specific Terms

**Kaspa**
- A proof-of-work cryptocurrency with a blockDAG architecture
- Designed for high throughput and fast confirmation times
- Uses the GHOSTDAG protocol for consensus

**KaspaD / Rusty-Kaspad**
- The Kaspa node software (daemon)
- Runs the Kaspa protocol
- Maintains the blockchain and processes transactions
- "Rusty" refers to the Rust programming language implementation

**BlockDAG**
- Block Directed Acyclic Graph
- Kaspa's unique blockchain structure
- Allows multiple blocks to be created simultaneously
- Enables higher transaction throughput than traditional blockchains

**GHOSTDAG**
- Greedy Heaviest-Observed Sub-DAG
- Kaspa's consensus protocol
- Determines the order of blocks in the DAG

**Mainnet**
- The main Kaspa network where real transactions occur
- Uses real KAS cryptocurrency
- Default network for production use

**Testnet**
- A test network for development and testing
- Uses test KAS (no real value)
- Safe for experimentation

**Block Height**
- The number of blocks in the blockchain
- Indicates how much of the blockchain has been synced
- Higher number = more recent

**Blockchain Sync**
- The process of downloading and verifying the entire blockchain
- Required when first starting a node
- Can take several hours depending on network speed

**RPC (Remote Procedure Call)**
- Interface for communicating with the Kaspa node
- Used by applications to query blockchain data
- Default port: 16110

**P2P (Peer-to-Peer)**
- Network protocol for nodes to communicate
- Used for block propagation and discovery
- Default port: 16111

### Kaspa All-in-One Terms

**Installation Wizard**
- Web-based interface for installing and configuring Kaspa services
- Runs on port 3000
- Guides you through the installation process

**Profile**
- Pre-configured set of services for specific use cases
- Examples: Core Profile, Kaspa User Applications, Indexer Services
- Simplifies installation by bundling related services

**Core Profile**
- Basic Kaspa node installation
- Includes only kaspad (the node software)
- Minimal resource requirements
- Good for running a node or RPC access

**Dashboard**
- Web interface for monitoring installed services
- Shows service status, logs, and metrics
- Accessible at http://localhost:8080

**Service**
- A component of the Kaspa ecosystem
- Examples: kaspa-node, kasia-app, k-social
- Runs in a Docker container

**Container**
- Isolated environment for running a service
- Managed by Docker
- Contains all dependencies needed to run the service

**Volume**
- Persistent storage for container data
- Survives container restarts
- Stores blockchain data, databases, configuration

### Docker Terms

**Docker**
- Platform for running applications in containers
- Provides isolation and consistency
- Required for Kaspa All-in-One

**Docker Compose**
- Tool for defining and running multi-container applications
- Uses YAML configuration files
- Manages service dependencies and networking

**Docker Image**
- Template for creating containers
- Contains application code and dependencies
- Downloaded from Docker Hub or other registries

**Docker Container**
- Running instance of a Docker image
- Isolated process with its own filesystem
- Can be started, stopped, and removed

**Docker Volume**
- Persistent storage managed by Docker
- Survives container deletion
- Used for databases, blockchain data, etc.

**Docker Network**
- Virtual network connecting containers
- Allows containers to communicate
- Isolated from host network

**Docker Hub**
- Public registry for Docker images
- Where Kaspa images are hosted
- Requires internet to download images

**docker-compose.yml**
- Configuration file for Docker Compose
- Defines services, networks, and volumes
- Located in project root

### Installation Terms

**Prerequisites**
- Software required before installation
- For Kaspa All-in-One: Docker, Docker Compose, Node.js
- Must be installed manually

**System Check**
- Automated verification of prerequisites
- Checks Docker, disk space, RAM, ports
- First step in installation wizard

**Configuration**
- Settings for installed services
- Examples: ports, network selection, data directories
- Can use defaults or customize

**Deployment**
- The process of installing and starting services
- Includes downloading images, creating containers, starting services
- Monitored by progress screen in wizard

**Health Check**
- Automated test to verify service is working
- Runs after deployment
- Ensures services are responding correctly

### Service Management Terms

**Start**
- Begin running a service or container
- Service becomes active and accessible
- Uses resources (CPU, memory)

**Stop**
- Halt a running service or container
- Service becomes inactive
- Releases resources but preserves data

**Restart**
- Stop and then start a service
- Useful for applying configuration changes
- Clears temporary state

**Remove**
- Delete a container
- Does not delete volumes (data) by default
- Container must be stopped first

**Fresh Start**
- Remove all containers and optionally data
- Start with clean slate
- Useful for testing installation repeatedly

**Cleanup**
- Remove all Kaspa All-in-One components
- Includes containers, data, and temporary files
- Most destructive operation

### Monitoring Terms

**Status**
- Current state of a service
- Examples: Running, Stopped, Restarting, Exited
- Shown in dashboard and status.sh

**Logs**
- Text output from a service
- Contains diagnostic information
- Useful for troubleshooting

**Resource Usage**
- CPU and memory consumed by a service
- Monitored to identify performance issues
- Shown in dashboard and status.sh

**Uptime**
- How long a service has been running
- Resets when service restarts
- Indicates stability

**Port**
- Network endpoint for accessing a service
- Examples: 3000 (wizard), 8080 (dashboard), 16110 (RPC)
- Must be unique (no conflicts)

### Indexer Terms

**Indexer**
- Service that processes blockchain data
- Makes data queryable for applications
- Examples: k-indexer, simply-kaspa-indexer, kasia-indexer

**Database**
- Storage for indexed blockchain data
- Usually PostgreSQL or TimescaleDB
- Enables fast queries

**TimescaleDB**
- Time-series database extension for PostgreSQL
- Optimized for blockchain data
- Used by some indexers

**Public Indexer**
- Indexer hosted by someone else
- No need to run your own
- Faster setup, less resource usage

**Local Indexer**
- Indexer you run yourself
- More control and privacy
- Requires more resources

### Application Terms

**Kasia**
- Kaspa blockchain explorer and wallet interface
- Web application for viewing blockchain data
- Requires indexer

**K-Social**
- Social platform built on Kaspa
- Demonstrates Kaspa application development
- Requires indexer

**Kaspa Explorer**
- Web interface for exploring the Kaspa blockchain
- Shows blocks, transactions, addresses
- Requires indexer

### Network Terms

**Localhost**
- Your own computer
- IP address: 127.0.0.1
- Services accessible only from your machine

**Port**
- Number identifying a network service
- Examples: 80 (HTTP), 443 (HTTPS), 3000 (wizard)
- Must be unique on your system

**Port Conflict**
- Error when two services try to use the same port
- Prevents service from starting
- Resolved by stopping conflicting service or changing port

**Firewall**
- Security system controlling network access
- May block ports by default
- May need configuration for external access

### Testing Terms

**Test Release**
- Pre-production version for testing
- May have bugs or incomplete features
- Marked as "pre-release" on GitHub

**Tester**
- Person testing the software (you!)
- Provides feedback and reports bugs
- Helps improve quality before v1.0

**Scenario**
- Specific testing workflow
- Step-by-step instructions
- Tests particular functionality

**Bug**
- Error or defect in software
- Causes unexpected behavior
- Should be reported via GitHub issues

**Feature Request**
- Suggestion for new functionality
- Describes desired capability
- Submitted via GitHub issues

**Feedback**
- Your observations and opinions
- Includes bugs, suggestions, and general comments
- Submitted via GitHub issues or discussions

### File System Terms

**.kaspa-aio**
- Directory containing Kaspa All-in-One data
- Includes blockchain data, databases, configuration
- Located in your home directory or project root

**.kaspa-backups**
- Directory containing configuration backups
- Created automatically before changes
- Used for rollback if needed

**/tmp/kaspa-wizard.pid**
- File containing wizard process ID
- Used to track if wizard is running
- Temporary file, deleted on cleanup

**/tmp/kaspa-wizard.log**
- File containing wizard logs
- Useful for troubleshooting wizard issues
- Temporary file, deleted on cleanup

### Troubleshooting Terms

**Error Message**
- Text describing what went wrong
- Usually includes error code or description
- Should be included in bug reports

**Stack Trace**
- Detailed error information showing code path
- Useful for developers debugging issues
- Include in bug reports when available

**Workaround**
- Temporary solution to a problem
- Not a permanent fix
- Allows you to continue testing

**Reproduce**
- Make a bug happen again
- Important for fixing bugs
- Include reproduction steps in bug reports

**Edge Case**
- Unusual or extreme scenario
- May not be handled correctly
- Important to test and report

### Version Terms

**v0.9.0-test**
- Current test release version
- "v" = version
- "test" = pre-release for testing

**v1.0**
- Planned production release
- First stable version
- Will be released after successful testing

**Semantic Versioning**
- Version numbering scheme: MAJOR.MINOR.PATCH
- Example: 1.2.3
- Indicates type of changes in release

### Acronyms

**API** - Application Programming Interface
**CLI** - Command Line Interface
**CPU** - Central Processing Unit
**DAG** - Directed Acyclic Graph
**GB** - Gigabyte (storage unit)
**HTTP** - Hypertext Transfer Protocol
**HTTPS** - HTTP Secure
**IP** - Internet Protocol
**JSON** - JavaScript Object Notation
**OS** - Operating System
**P2P** - Peer-to-Peer
**PID** - Process ID
**RAM** - Random Access Memory
**RPC** - Remote Procedure Call
**UI** - User Interface
**URL** - Uniform Resource Locator
**WSL** - Windows Subsystem for Linux
**YAML** - YAML Ain't Markup Language

### Still Confused?

If you encounter a term not in this glossary:
1. Search the documentation (docs/ directory)
2. Ask in GitHub Discussions
3. Search online (Kaspa documentation, Docker docs, etc.)
4. Suggest adding it to this glossary!

---

## Conclusion

Thank you for participating in the Kaspa All-in-One test release! Your testing and feedback are crucial to making this project successful.

### What You've Learned

By reading this guide, you now know:
- ✅ How to install and run Kaspa All-in-One
- ✅ How to test different scenarios
- ✅ How to manage services during testing
- ✅ How to report bugs and suggest features
- ✅ How to get help when you need it
- ✅ Key terminology for Kaspa and Docker

### Next Steps

1. **Start Testing**: Run `./start-test.sh` and begin with Scenario 1
2. **Provide Feedback**: Report bugs, suggest features, share experiences
3. **Help Others**: Answer questions in discussions if you can
4. **Stay Updated**: Watch for announcements about fixes and updates
5. **Spread the Word**: Tell others about the test release

### Your Impact

Every bug you find, every suggestion you make, and every question you ask helps make Kaspa All-in-One better for:
- New users discovering Kaspa
- Node operators running infrastructure
- Developers building applications
- The entire Kaspa community

### Final Reminders

- 🐛 **Report bugs** - Even small issues matter
- 💡 **Suggest improvements** - Your ideas shape the future
- 🤝 **Be patient** - We're all volunteers
- 😊 **Have fun** - Testing should be enjoyable!
- 🙏 **Thank you** - We appreciate your time and effort

### Stay Connected

- **GitHub**: https://github.com/jtmac69/Kaspa-All-in-One
- **Discussions**: https://github.com/jtmac69/Kaspa-All-in-One/discussions/categories/test-release-feedback
- **Issues**: https://github.com/jtmac69/Kaspa-All-in-One/issues

### Version Information

- **Test Release**: v0.9.0-test
- **Document Version**: 1.0
- **Last Updated**: December 2025

---

**Happy Testing! 🚀**

*The Kaspa All-in-One Team*

