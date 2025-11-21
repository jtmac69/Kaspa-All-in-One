# Installation Guides - Quick Reference

## Overview
OS-specific Docker installation guides displayed in an interactive modal when dependencies are missing.

## How It Works

### User Flow
1. Checklist page detects missing Docker
2. "📖 How to Install Docker" button appears
3. User clicks button
4. **Modal opens** with OS-specific guide
5. User follows steps and copies commands
6. User closes modal and re-runs checklist

### API Endpoints

```javascript
// Get system information
GET /api/installation-guides/system
→ { platform, os, dockerType, distribution, version }

// Get Docker installation guide
GET /api/installation-guides/docker
→ { guide: { title, steps, troubleshooting, links } }

// Get Docker Compose guide
GET /api/installation-guides/docker-compose
→ { guide: { title, steps, troubleshooting, links } }
```

## Supported Platforms

### macOS (Docker Desktop)
**Steps**: 4
1. Download Docker Desktop
2. Install (drag to Applications)
3. Start Docker Desktop
4. Verify installation

**Troubleshooting**:
- Docker Desktop won't start
- Permission denied errors

### Windows (Docker Desktop + WSL2)
**Steps**: 6
1. Check system requirements
2. Enable WSL 2
3. Download Docker Desktop
4. Install Docker Desktop
5. Start Docker Desktop
6. Verify installation

**Troubleshooting**:
- WSL 2 installation failed
- Hyper-V not available
- Docker Desktop won't start
- Permission denied errors

### Linux (Docker Engine)

#### Ubuntu/Debian
**Steps**: 7
1. Update package index
2. Install prerequisites
3. Add Docker GPG key
4. Set up repository
5. Install Docker Engine
6. Add user to docker group
7. Verify installation

#### Fedora/CentOS/RHEL
**Steps**: 6
1. Install prerequisites
2. Add Docker repository
3. Install Docker Engine
4. Start Docker service
5. Add user to docker group
6. Verify installation

**Troubleshooting**:
- Permission denied (with "Why?" explanation)
- Docker service won't start
- Cannot connect to Docker daemon

## Modal Features

### Interactive Elements
- **Copy Buttons**: One-click command copying
- **External Links**: Open documentation in new tab
- **Close Button**: X button or click outside
- **Scrollable**: Long guides scroll within modal

### Content Sections
1. **System Info**: Detected OS and version
2. **Steps**: Numbered with icons and descriptions
3. **Commands**: Copyable terminal commands
4. **Troubleshooting**: Common issues and solutions
5. **Helpful Links**: Official documentation

### Visual Design
- **Icons**: Emoji icons for each step (⬇️ 📦 🚀 ✅)
- **Colors**: Kaspa brand colors
- **Responsive**: Works on all screen sizes
- **Dark Mode**: Automatic theme switching

## Code Examples

### Opening the Guide
```javascript
// From checklist page
<button onclick="showDockerGuide()">
  📖 How to Install Docker
</button>

// JavaScript function
async function showDockerGuide() {
  const result = await api.get('/installation-guides/docker');
  displayInstallationGuide(result.guide);
}
```

### Copying Commands
```javascript
// Copy button in guide
<button onclick="copyToClipboard('docker --version')">
  📋 Copy
</button>

// JavaScript function
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showNotification('Copied!', 'success'))
    .catch(() => showNotification('Failed', 'error'));
}
```

### Closing the Modal
```javascript
// Close button
<button onclick="closeInstallationGuide()">×</button>

// Click outside
<div onclick="closeInstallationGuide()"></div>

// JavaScript function
function closeInstallationGuide() {
  document.getElementById('installation-guide-modal').style.display = 'none';
}
```

## Testing Checklist

### Backend
- [ ] OS detection works (macOS, Windows, Linux)
- [ ] Distribution detection (Ubuntu, Fedora, etc.)
- [ ] API returns correct guide for each OS
- [ ] Error handling works

### Frontend
- [ ] Modal opens on button click
- [ ] Correct guide displays for OS
- [ ] Commands can be copied
- [ ] External links work
- [ ] Modal closes properly
- [ ] Responsive on mobile
- [ ] Dark mode works

### Integration
- [ ] Checklist detects missing Docker
- [ ] Button appears when Docker missing
- [ ] Guide helps user install Docker
- [ ] After install, checklist shows ✅

## Common Issues

### Modal Won't Open
- **Cause**: API endpoint not available
- **Fix**: Check backend is running
- **Fallback**: Opens external documentation link

### Wrong Guide Displayed
- **Cause**: OS detection failed
- **Fix**: Check OS detection logic
- **Fallback**: Generic instructions

### Commands Won't Copy
- **Cause**: Clipboard API not available
- **Fix**: Use HTTPS or localhost
- **Fallback**: User can manually copy

## File Locations

### Backend
- `services/wizard/backend/src/utils/installation-guide-manager.js`
- `services/wizard/backend/src/api/installation-guides.js`
- `services/wizard/backend/src/server.js` (route registration)

### Frontend
- `services/wizard/frontend/public/index.html` (modal HTML)
- `services/wizard/frontend/public/scripts/wizard.js` (modal logic)
- `services/wizard/frontend/public/styles/wizard.css` (modal styles)

## Key Benefits

✅ **No External Navigation** - Users stay in wizard
✅ **OS-Specific** - Automatic platform detection
✅ **Copy-Paste** - One-click command copying
✅ **Troubleshooting** - Built-in help
✅ **Professional** - Polished appearance

## Next Steps

After completing this task:
1. **Task 6.5.5**: Auto-remediation for common errors
2. **Task 6.5.6**: Enhanced progress transparency
3. **Task 6.5.7**: Post-installation tour and guidance

## Documentation

- **Full Details**: `TASK_6.5.4_IMPLEMENTATION_SUMMARY.md`
- **API Docs**: See installation-guides.js comments
- **Style Guide**: `PLAIN_LANGUAGE_STYLE_GUIDE.md`
