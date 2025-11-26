# Test Release Design

## Overview

This document describes the design for creating and distributing a test release of the Kaspa All-in-One system. The test release enables selected testers to validate the installation wizard and overall system functionality before the v1.0 production release.

The design focuses on creating a frictionless testing experience: download → run one command → wizard opens → test → provide feedback.

## Architecture

### Test Release Package Structure

```
kaspa-aio-v0.9.0-test/
├── start-test.sh              # Quick start script (main entry point)
├── cleanup-test.sh            # Remove all test components
├── README.md                  # Updated with test release info
├── TESTING.md                 # Tester instructions and scenarios
├── KNOWN_ISSUES.md            # Known bugs and limitations
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md      # Bug report template
│       └── feature_request.md # Feature request template
├── services/                  # All service code
├── config/                    # Configuration files
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
└── [all other project files]
```

### User Journey

```
1. Download
   ↓
2. Extract archive
   ↓
3. Run: ./start-test.sh
   ↓
4. Script checks prerequisites
   ↓
5. Script starts wizard
   ↓
6. Browser opens automatically
   ↓
7. User follows wizard
   ↓
8. Installation completes
   ↓
9. User tests features
   ↓
10. User provides feedback
```

## Components

### 1. Quick Start Script (`start-test.sh`)

**Purpose**: Single command to start testing

**Functionality**:
```bash
#!/bin/bash
# Kaspa All-in-One Test Release - Quick Start

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Kaspa All-in-One - Test Release v0.9.0                  ║"
echo "║   Thank you for testing!                                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Detect platform
detect_platform() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    PLATFORM="windows-wsl"
  else
    PLATFORM="unknown"
  fi
}

# 2. Check prerequisites
check_prerequisites() {
  echo "Checking prerequisites..."
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found"
    show_docker_install_instructions
    exit 1
  fi
  echo "✓ Docker found: $(docker --version)"
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found"
    show_docker_compose_instructions
    exit 1
  fi
  echo "✓ Docker Compose found"
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    show_nodejs_instructions
    exit 1
  fi
  
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required (found: $(node --version))"
    show_nodejs_instructions
    exit 1
  fi
  echo "✓ Node.js found: $(node --version)"
  
  echo ""
  echo "✓ All prerequisites met!"
  echo ""
}

# 3. Install wizard dependencies
install_wizard_deps() {
  echo "Installing wizard dependencies..."
  cd services/wizard/backend
  npm install --production --silent
  cd ../../..
  echo "✓ Dependencies installed"
  echo ""
}

# 4. Start wizard
start_wizard() {
  echo "Starting Installation Wizard..."
  echo ""
  echo "The wizard will open in your browser at: http://localhost:3000"
  echo ""
  echo "📖 Testing Instructions: See TESTING.md"
  echo "🐛 Report Issues: https://github.com/[repo]/issues/new/choose"
  echo ""
  
  # Start wizard in background
  cd services/wizard/backend
  nohup node src/server.js > /tmp/kaspa-wizard.log 2>&1 &
  WIZARD_PID=$!
  echo $WIZARD_PID > /tmp/kaspa-wizard.pid
  cd ../../..
  
  # Wait for wizard to be ready
  echo "Waiting for wizard to start..."
  for i in {1..20}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
      echo "✓ Wizard is ready!"
      break
    fi
    sleep 0.5
  done
  
  # Open browser
  open_browser "http://localhost:3000"
}

# 5. Open browser
open_browser() {
  URL=$1
  if [[ "$PLATFORM" == "macos" ]]; then
    open "$URL"
  elif [[ "$PLATFORM" == "linux" ]]; then
    xdg-open "$URL" 2>/dev/null || echo "Please open: $URL"
  elif [[ "$PLATFORM" == "windows-wsl" ]]; then
    cmd.exe /c start "$URL" 2>/dev/null || echo "Please open: $URL"
  fi
}

# Main execution
detect_platform
check_prerequisites
install_wizard_deps
start_wizard

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Wizard Started Successfully!                             ║"
echo "║   Follow the wizard to complete installation               ║"
echo "║                                                             ║"
echo "║   Need help? Check TESTING.md                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
```

### 2. Cleanup Script (`cleanup-test.sh`)

**Purpose**: Remove all test components safely

**Functionality**:
```bash
#!/bin/bash
# Kaspa All-in-One Test Release - Cleanup

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Kaspa All-in-One - Test Cleanup                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Confirm cleanup
read -p "This will stop all services and remove all data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled"
    exit 0
fi

echo "Stopping services..."

# Stop wizard
if [ -f /tmp/kaspa-wizard.pid ]; then
    WIZARD_PID=$(cat /tmp/kaspa-wizard.pid)
    kill $WIZARD_PID 2>/dev/null
    rm /tmp/kaspa-wizard.pid
    echo "✓ Wizard stopped"
fi

# Stop Docker containers
docker-compose down -v 2>/dev/null
echo "✓ Docker containers stopped"

# Remove data directories
read -p "Remove all data? This includes blockchain data. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf .kaspa-aio
    rm -rf .kaspa-backups
    echo "✓ Data removed"
else
    echo "Data preserved in .kaspa-aio/"
fi

# Remove logs
rm -f /tmp/kaspa-wizard.log
echo "✓ Logs removed"

echo ""
echo "✓ Cleanup complete!"
echo ""
echo "Thank you for testing Kaspa All-in-One!"
echo "Your feedback helps make the project better."
```

### 3. Testing Documentation (`TESTING.md`)

**Purpose**: Guide testers through testing scenarios

**Structure**:
```markdown
# Testing Kaspa All-in-One v0.9.0

## Welcome Testers!

Thank you for helping test Kaspa All-in-One. This document guides you through
the testing process.

## Prerequisites

Before starting:
- Docker 20.10+ installed
- Docker Compose 2.0+ installed  
- Node.js 18+ installed
- 4GB RAM available
- 20GB disk space available

## Quick Start

1. Extract the test package
2. Run: `./start-test.sh`
3. Follow the wizard in your browser
4. Test the scenarios below
5. Report your findings

## Test Scenarios

### Scenario 1: Core Profile Installation (15 minutes)

**Goal**: Install basic Kaspa node

**Steps**:
1. Select "Core Profile"
2. Use default settings
3. Complete installation
4. Verify node is running
5. Check dashboard access

**Expected Results**:
- Installation completes without errors
- Kaspa node starts and begins syncing
- Dashboard is accessible at http://localhost:8080

**Report**:
- Did installation succeed? (Yes/No)
- How long did it take?
- Any errors or issues?

### Scenario 2: Kaspa User Applications (20 minutes)

**Goal**: Install user-facing applications

**Steps**:
1. Select "Kaspa User Applications" profile
2. Choose "Use public indexers"
3. Complete installation
4. Access each application

**Expected Results**:
- Kasia app accessible
- K-Social app accessible
- Kaspa Explorer accessible

### Scenario 3: Error Handling

**Goal**: Test wizard error handling

**Steps**:
1. Try to install without Docker running
2. Try to use an invalid port number
3. Try to install with insufficient disk space

**Expected Results**:
- Clear error messages
- Helpful troubleshooting guidance
- Ability to retry after fixing issues

### Scenario 4: Reconfiguration

**Goal**: Modify existing installation

**Steps**:
1. Complete a basic installation
2. Open wizard again
3. Add another profile
4. Apply changes

**Expected Results**:
- Wizard detects existing installation
- Changes apply successfully
- Services restart correctly

## Providing Feedback

### Report a Bug

Use this template: https://github.com/[repo]/issues/new?template=bug_report.md

Include:
- What you were trying to do
- What happened
- What you expected
- System information (OS, Docker version)
- Logs (if available)

### Suggest a Feature

Use this template: https://github.com/[repo]/issues/new?template=feature_request.md

### General Feedback

Join the discussion: https://github.com/[repo]/discussions

## Known Issues

See KNOWN_ISSUES.md for current limitations.

## Getting Help

- Check KNOWN_ISSUES.md first
- Review docs/ directory
- Ask in GitHub Discussions
- Open an issue if stuck

## Thank You!

Your testing helps make Kaspa All-in-One better for everyone.
```

### 4. Known Issues Document (`KNOWN_ISSUES.md`)

**Purpose**: Document known limitations

**Structure**:
```markdown
# Known Issues - Test Release v0.9.0

## Critical Issues

None currently.

## High Priority Issues

### Node Sync Time
**Issue**: Kaspa node sync can take several hours
**Severity**: High
**Workaround**: Use "Continue in background" option
**Status**: By design (blockchain sync required)

## Medium Priority Issues

### Windows Native Not Supported
**Issue**: Windows requires WSL2
**Severity**: Medium
**Workaround**: Install WSL2 and Docker Desktop
**Status**: Won't fix (architectural decision)

## Low Priority Issues

### Port Conflicts
**Issue**: Default ports may conflict with existing services
**Severity**: Low
**Workaround**: Change ports in configuration step
**Status**: Will improve port detection

## Limitations

1. **Docker Required**: Cannot install Docker automatically
2. **Internet Required**: Initial setup requires internet
3. **Resource Usage**: Minimum 4GB RAM, 20GB disk
4. **Platform Support**: Linux, macOS, Windows/WSL2 only

## Fixed in This Version

- ✅ Wizard state persistence
- ✅ Background task management
- ✅ Dashboard integration
- ✅ Automatic backup system
```

### 5. GitHub Issue Templates

**Bug Report Template** (`.github/ISSUE_TEMPLATE/bug_report.md`):
```markdown
---
name: Bug Report
about: Report a bug in the test release
title: '[BUG] '
labels: bug, test-release
assignees: ''
---

## Bug Description
A clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## System Information
- OS: [e.g., Ubuntu 22.04]
- Docker Version: [e.g., 24.0.0]
- Node.js Version: [e.g., 18.19.1]
- Test Release Version: v0.9.0-test

## Logs
```
Paste relevant logs here
```

## Screenshots
If applicable, add screenshots.

## Additional Context
Any other relevant information.
```

**Feature Request Template** (`.github/ISSUE_TEMPLATE/feature_request.md`):
```markdown
---
name: Feature Request
about: Suggest a feature for Kaspa All-in-One
title: '[FEATURE] '
labels: enhancement, test-release
assignees: ''
---

## Feature Description
A clear description of the feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
What other approaches did you consider?

## Additional Context
Any other relevant information.
```

### 6. Test Release Banner in Wizard

**Purpose**: Clearly identify test release status

**Implementation**:
```html
<!-- Add to wizard UI -->
<div class="test-release-banner">
  <div class="banner-icon">⚠️</div>
  <div class="banner-content">
    <strong>Test Release v0.9.0</strong>
    <p>This is a pre-release version for testing purposes. 
       <a href="KNOWN_ISSUES.md">Known Issues</a> | 
       <a href="https://github.com/[repo]/issues">Report Bug</a>
    </p>
  </div>
</div>
```

```css
.test-release-banner {
  background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(255, 165, 0, 0.3);
}

.banner-icon {
  font-size: 24px;
}

.banner-content strong {
  display: block;
  font-size: 16px;
  margin-bottom: 4px;
}

.banner-content p {
  margin: 0;
  font-size: 14px;
  opacity: 0.95;
}

.banner-content a {
  color: white;
  text-decoration: underline;
}
```

## Data Models

### Test Release Metadata

```json
{
  "version": "0.9.0-test",
  "releaseDate": "2024-12-01",
  "testingPeriod": {
    "start": "2024-12-01",
    "end": "2024-12-15"
  },
  "platforms": ["linux", "macos", "windows-wsl"],
  "prerequisites": {
    "docker": "20.10+",
    "dockerCompose": "2.0+",
    "nodejs": "18+"
  },
  "downloadUrl": "https://github.com/[repo]/releases/tag/v0.9.0-test",
  "feedbackUrl": "https://github.com/[repo]/issues",
  "discussionUrl": "https://github.com/[repo]/discussions"
}
```

## Testing Strategy

### Internal Testing (You as First Tester)

**Phase 1: Smoke Test** (30 minutes)
1. Extract package
2. Run `./start-test.sh`
3. Complete Core Profile installation
4. Verify basic functionality
5. Run `./cleanup-test.sh`

**Phase 2: Full Scenario Testing** (2-3 hours)
1. Test all profiles
2. Test error scenarios
3. Test reconfiguration
4. Test cleanup and recovery
5. Document all issues

**Phase 3: Documentation Review** (1 hour)
1. Read TESTING.md as a new user
2. Verify all instructions are clear
3. Test all links and references
4. Update documentation as needed

### External Testing (After Internal Validation)

**Tester Selection**:
- 5-10 testers
- Mix of technical levels
- Different platforms (Linux, macOS, Windows/WSL)
- Different use cases (node operator, developer, user)

**Testing Period**: 2 weeks

**Success Metrics**:
- 90% installation success rate
- Zero critical bugs
- Average installation time <15 minutes
- 80% positive feedback

## Distribution Strategy

### GitHub Release

1. **Create Tag**: `v0.9.0-test`
2. **Mark as Pre-release**: ✓
3. **Release Title**: "Kaspa All-in-One v0.9.0 - Test Release"
4. **Release Notes**:
```markdown
# Kaspa All-in-One v0.9.0 - Test Release

## ⚠️ This is a Test Release

This is a pre-production version for testing purposes. Please report any issues!

## What's New

- ✨ Web-based installation wizard
- 🔧 Multiple deployment profiles
- 📊 Real-time installation progress
- 🔄 Reconfiguration support
- 💾 Automatic backups
- 🌐 Dashboard integration

## Quick Start

1. Download and extract the archive
2. Run: `./start-test.sh`
3. Follow the wizard
4. See TESTING.md for test scenarios

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- 4GB RAM, 20GB disk

## Feedback

- 🐛 Report bugs: [Issues](https://github.com/[repo]/issues/new/choose)
- 💬 Discuss: [Discussions](https://github.com/[repo]/discussions)
- 📖 Documentation: See TESTING.md

## Known Issues

See KNOWN_ISSUES.md for current limitations.

Thank you for testing!
```

### Package Contents

**Include**:
- All source code
- All documentation
- All scripts
- Configuration templates
- Issue templates

**Exclude**:
- `.git/` directory
- `node_modules/` directories
- Build artifacts
- Test data
- Personal configuration files

## Security Considerations

### Test Release Specific

1. **Clear Pre-release Status**: Prevent production use
2. **Feedback Privacy**: Don't request sensitive information
3. **Data Isolation**: Test data separate from production
4. **Cleanup Safety**: Preserve user data by default
5. **No Telemetry**: No automatic data collection

### General Security

1. **Docker Socket Access**: Required but documented
2. **Port Exposure**: Configurable, defaults documented
3. **Password Generation**: Cryptographically secure
4. **File Permissions**: Appropriate for user data
5. **Network Security**: Firewall recommendations provided

## Success Criteria

The test release is ready when:

1. ✅ All scripts tested and working
2. ✅ All documentation complete and accurate
3. ✅ Issue templates created
4. ✅ Known issues documented
5. ✅ Internal testing passed (you as first tester)
6. ✅ Package created and uploaded to GitHub
7. ✅ Release notes published

The test release is successful when:

1. ✅ 90% installation success rate
2. ✅ Zero critical bugs
3. ✅ <15 minute average install time
4. ✅ 80% positive feedback
5. ✅ All platforms tested
6. ✅ Documentation validated by testers

## Next Steps After Test Release

1. **Collect Feedback**: Monitor issues and discussions
2. **Fix Critical Bugs**: Address blocking issues immediately
3. **Update Documentation**: Based on tester feedback
4. **Iterate**: Release v0.9.1-test if needed
5. **Prepare v1.0**: When success criteria met
