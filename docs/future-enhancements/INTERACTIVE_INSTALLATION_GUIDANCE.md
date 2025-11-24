# Interactive Installation Guidance Enhancement

**Date**: November 23, 2025  
**Status**: 📋 PLANNED  
**Priority**: HIGH  
**Task**: Wizard Task 6.4

## Overview

Enhance the wizard's system check functionality to provide interactive, platform-specific installation guidance when Docker or Docker Compose is missing, rather than just displaying error messages.

## Current State

### What Works
✅ **Detection**: System check successfully detects missing components:
- Docker installation status
- Docker Compose installation status
- System resources (RAM, CPU, disk)
- Port availability

✅ **Messaging**: Shows clear error messages:
- "Docker is not installed. Please install Docker from https://docs.docker.com/get-docker/"
- "Docker Compose v2 is required. Please update Docker Desktop or install Docker Compose plugin"

### What's Missing
❌ **No Interactive Installation**: Users see errors but can't take action
❌ **No Platform Detection**: Same message for all operating systems
❌ **No Step-by-Step Guides**: Just a link, no detailed instructions
❌ **No Retry Mechanism**: Users must manually refresh or navigate back
❌ **No Progress Tracking**: Can't track installation progress

## Proposed Enhancement

### User Experience Flow

1. **Detection Phase**
   - System check runs automatically on Checklist step (Step 2)
   - Detects missing Docker/Docker Compose
   - Detects user's platform (macOS/Linux/Windows)

2. **Guidance Phase**
   - Shows "Install Docker" button (prominent, actionable)
   - Clicking opens installation guide modal
   - Modal shows platform-specific instructions
   - Provides direct download links

3. **Installation Phase**
   - User follows step-by-step guide
   - Downloads and installs Docker
   - Returns to wizard

4. **Verification Phase**
   - User clicks "Retry Check" button
   - System check runs again
   - Confirms installation successful
   - Allows user to proceed

### Platform-Specific Guides

#### macOS
- **Docker Desktop for Mac**
  - Direct download link
  - Installation steps with screenshots
  - Post-installation verification
  - Troubleshooting (permissions, Rosetta 2 for M1/M2)

#### Linux
- **Ubuntu/Debian** (apt)
  ```bash
  sudo apt-get update
  sudo apt-get install docker.io docker-compose-plugin
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  ```
- **CentOS/RHEL/Fedora** (yum/dnf)
  ```bash
  sudo yum install docker docker-compose-plugin
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  ```
- **Arch Linux** (pacman)
  ```bash
  sudo pacman -S docker docker-compose
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  ```

#### Windows
- **Docker Desktop for Windows**
  - WSL2 requirement check
  - Direct download link
  - Installation steps with screenshots
  - WSL2 setup if needed
  - Post-installation verification

### Backend Implementation

#### New API Endpoints

1. **GET /api/system-check/platform**
   - Detects user's operating system
   - Returns: `{ platform: 'macos' | 'linux' | 'windows', distro: 'ubuntu' | 'debian' | ... }`

2. **GET /api/system-check/installation-guide/:component/:platform**
   - Returns installation guide for specific component and platform
   - Component: 'docker' | 'docker-compose'
   - Platform: 'macos' | 'linux-ubuntu' | 'linux-debian' | 'windows'
   - Returns: JSON with steps, commands, links, troubleshooting

3. **POST /api/system-check/verify**
   - Re-runs system check after installation
   - Returns updated status
   - Tracks verification attempts

#### Platform Detection Logic

```javascript
function detectPlatform() {
  const platform = os.platform(); // 'darwin', 'linux', 'win32'
  
  if (platform === 'darwin') {
    return { platform: 'macos', arch: os.arch() };
  }
  
  if (platform === 'linux') {
    // Detect distro from /etc/os-release
    const distro = detectLinuxDistro();
    return { platform: 'linux', distro };
  }
  
  if (platform === 'win32') {
    return { platform: 'windows', wsl: detectWSL() };
  }
}
```

#### Installation Guide Data Structure

```json
{
  "component": "docker",
  "platform": "macos",
  "title": "Install Docker Desktop for Mac",
  "description": "Docker Desktop is the easiest way to run Docker on macOS",
  "downloadUrl": "https://desktop.docker.com/mac/main/amd64/Docker.dmg",
  "downloadUrlArm": "https://desktop.docker.com/mac/main/arm64/Docker.dmg",
  "estimatedTime": "5-10 minutes",
  "requirements": [
    "macOS 11 or later",
    "4GB RAM minimum",
    "VirtualBox must not be running"
  ],
  "steps": [
    {
      "number": 1,
      "title": "Download Docker Desktop",
      "description": "Click the download button above to get Docker Desktop for your Mac",
      "action": "download"
    },
    {
      "number": 2,
      "title": "Install Docker Desktop",
      "description": "Open the downloaded .dmg file and drag Docker to Applications",
      "commands": [],
      "notes": ["You may need to enter your password"]
    },
    {
      "number": 3,
      "title": "Start Docker Desktop",
      "description": "Open Docker from Applications and wait for it to start",
      "notes": ["First start may take a few minutes"]
    },
    {
      "number": 4,
      "title": "Verify Installation",
      "description": "Open Terminal and run: docker --version",
      "commands": ["docker --version"],
      "expectedOutput": "Docker version 24.0.0 or later"
    }
  ],
  "troubleshooting": [
    {
      "issue": "Docker Desktop won't start",
      "solution": "Check System Preferences > Security & Privacy and allow Docker"
    },
    {
      "issue": "Permission denied error",
      "solution": "Make sure Docker Desktop is running and you're in the docker group"
    }
  ],
  "verificationCommand": "docker --version",
  "successMessage": "Docker is now installed! Click 'Retry Check' to continue."
}
```

### Frontend Implementation

#### Installation Guide Modal

```javascript
// Show installation guide
function showInstallationGuide(component) {
  // Detect platform
  const platform = await api.get('/system-check/platform');
  
  // Get installation guide
  const guide = await api.get(
    `/system-check/installation-guide/${component}/${platform.platform}`
  );
  
  // Display modal with guide
  displayInstallationModal(guide);
}

// Display modal
function displayInstallationModal(guide) {
  const modal = document.getElementById('installation-guide-modal');
  
  // Populate title
  modal.querySelector('.modal-title').textContent = guide.title;
  
  // Populate description
  modal.querySelector('.guide-description').textContent = guide.description;
  
  // Add download button
  const downloadBtn = createDownloadButton(guide.downloadUrl);
  
  // Add steps
  const stepsContainer = modal.querySelector('.installation-steps');
  guide.steps.forEach(step => {
    stepsContainer.appendChild(createStepElement(step));
  });
  
  // Add troubleshooting
  const troubleshootingContainer = modal.querySelector('.troubleshooting');
  guide.troubleshooting.forEach(item => {
    troubleshootingContainer.appendChild(createTroubleshootingItem(item));
  });
  
  // Show modal
  modal.style.display = 'block';
}
```

#### Retry Check Button

```javascript
// Add retry button to system check
function addRetryButton() {
  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-secondary';
  retryBtn.textContent = 'Retry Check';
  retryBtn.onclick = async () => {
    retryBtn.disabled = true;
    retryBtn.textContent = 'Checking...';
    
    try {
      await runFullSystemCheck();
      showNotification('System check complete!', 'success');
    } catch (error) {
      showNotification('System check failed. Please try again.', 'error');
    } finally {
      retryBtn.disabled = false;
      retryBtn.textContent = 'Retry Check';
    }
  };
  
  return retryBtn;
}
```

### UI Components

#### Installation Status Badge

```html
<div class="installation-status">
  <span class="status-icon">⏳</span>
  <span class="status-text">Not Installed</span>
  <button class="btn-install" onclick="showInstallationGuide('docker')">
    Install Docker
  </button>
</div>
```

#### Installation Guide Modal

```html
<div id="installation-guide-modal" class="modal">
  <div class="modal-overlay"></div>
  <div class="modal-content installation-guide">
    <div class="modal-header">
      <h2 class="modal-title">Install Docker Desktop</h2>
      <button class="modal-close">×</button>
    </div>
    
    <div class="modal-body">
      <p class="guide-description"></p>
      
      <div class="guide-requirements">
        <h3>Requirements</h3>
        <ul class="requirements-list"></ul>
      </div>
      
      <div class="guide-download">
        <button class="btn btn-primary btn-download">
          Download Docker Desktop
        </button>
        <p class="estimated-time">Estimated time: 5-10 minutes</p>
      </div>
      
      <div class="installation-steps">
        <h3>Installation Steps</h3>
        <!-- Steps will be inserted here -->
      </div>
      
      <div class="troubleshooting">
        <h3>Troubleshooting</h3>
        <!-- Troubleshooting items will be inserted here -->
      </div>
    </div>
    
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeInstallationGuide()">
        Close
      </button>
      <button class="btn btn-primary" onclick="retrySystemCheck()">
        I've Installed It - Retry Check
      </button>
    </div>
  </div>
</div>
```

## Benefits

### For Users
✅ **Reduced Friction**: Clear path from error to resolution  
✅ **Platform-Specific**: Instructions tailored to their OS  
✅ **Self-Service**: Can install without external help  
✅ **Confidence**: Step-by-step guidance reduces uncertainty  
✅ **Faster Setup**: Direct links and clear steps speed installation

### For Project
✅ **Lower Support Burden**: Fewer "how do I install Docker?" questions  
✅ **Higher Success Rate**: More users complete installation  
✅ **Better UX**: Professional, polished experience  
✅ **Reduced Abandonment**: Users less likely to give up  
✅ **Positive First Impression**: Shows attention to detail

## Implementation Phases

### Phase 1: Backend (2-3 days)
- [ ] Platform detection API
- [ ] Installation guide data structure
- [ ] Installation guide API endpoints
- [ ] Verification endpoint
- [ ] Testing on multiple platforms

### Phase 2: Frontend (2-3 days)
- [ ] Installation guide modal
- [ ] Install buttons on system check
- [ ] Retry check functionality
- [ ] Progress indicators
- [ ] Testing and polish

### Phase 3: Content (1-2 days)
- [ ] macOS installation guide
- [ ] Linux installation guides (Ubuntu, Debian, CentOS, Fedora)
- [ ] Windows installation guide
- [ ] Troubleshooting content
- [ ] Screenshots and visuals

### Phase 4: Testing (1 day)
- [ ] Test on macOS (Intel and Apple Silicon)
- [ ] Test on Linux distributions
- [ ] Test on Windows with WSL2
- [ ] Verify all links work
- [ ] Test retry functionality

### Phase 5: Documentation (1 day)
- [ ] Implementation guide
- [ ] User documentation
- [ ] Troubleshooting guide
- [ ] Update wizard documentation

**Total Estimated Time**: 7-10 days

## Success Metrics

- **Installation Success Rate**: % of users who successfully install Docker
- **Time to Install**: Average time from error to successful installation
- **Support Tickets**: Reduction in Docker installation support requests
- **User Feedback**: Positive feedback on installation experience
- **Abandonment Rate**: Reduction in users abandoning wizard at system check

## Related Tasks

- **Wizard Task 2.1**: System requirements checker (already implemented)
- **Wizard Task 4.3**: Pre-installation checklist (already implemented)
- **Test Release Task 4.4**: Document known issues (references this enhancement)

## Priority Justification

**HIGH Priority** because:
1. **First Impression**: System check is one of the first steps users encounter
2. **Common Issue**: Docker not being installed is a frequent blocker
3. **User Experience**: Current error messages are not actionable
4. **Test Release**: Would significantly improve test release experience
5. **Support Reduction**: Self-service installation reduces support burden

## Files to Create/Modify

### Backend
- `services/wizard/backend/src/api/system-check.js` (new)
- `services/wizard/backend/src/utils/system-checker.js` (enhance)
- `services/wizard/backend/src/data/installation-guides.json` (new)

### Frontend
- `services/wizard/frontend/public/scripts/modules/system-check.js` (enhance)
- `services/wizard/frontend/public/scripts/modules/checklist.js` (enhance)
- `services/wizard/frontend/public/index.html` (add modal)
- `services/wizard/frontend/public/styles/wizard.css` (add styles)

### Documentation
- `docs/future-enhancements/INTERACTIVE_INSTALLATION_GUIDANCE.md` (this file)
- `services/wizard/README.md` (update)
- `docs/wizard-user-guide.md` (update)

## Next Steps

1. Review and approve this enhancement proposal
2. Add to sprint planning for post-test-release
3. Assign to developer
4. Create detailed implementation tickets
5. Begin Phase 1 (Backend) implementation

## Conclusion

This enhancement transforms the wizard from a passive error reporter to an active installation assistant. By providing platform-specific, step-by-step guidance with direct download links and retry functionality, we significantly improve the user experience and reduce the barrier to entry for new users.

The investment of 7-10 days of development time will pay dividends in reduced support burden, higher installation success rates, and improved user satisfaction.

**Status**: ✅ PROPOSAL COMPLETE - Ready for implementation
