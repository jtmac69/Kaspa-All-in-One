# Wizard State Persistence and Dashboard Auto-Start Fix

## Issues Identified

### 1. Installation State Not Persisted
**Problem**: After successful installation, the wizard doesn't save installation state to `.kaspa-aio/installation-state.json`
**Impact**: When wizard restarts, it doesn't know what's already installed
**Root Cause**: `saveInstallationState()` function didn't exist and wasn't called after installation

### 2. Dashboard Service Not Auto-Starting
**Problem**: Clicking "Open Dashboard" fails if dashboard service isn't running
**Impact**: Poor user experience - users must manually start dashboard
**Root Cause**: No check or auto-start logic for dashboard service

### 3. Wizard Doesn't Detect Existing Installation
**Problem**: When wizard restarts after installation, it shows "Get Started" instead of reconfiguration mode
**Impact**: Users can't see what's installed or make changes
**Root Cause**: No initialization logic to check for existing installation and load state

## Fixes Implemented

### ✅ Fix 1: Save Installation State After Completion

**File**: `services/wizard/backend/src/utils/profile-state-manager.js`

Added `saveInstallationState()` function:
```javascript
async saveInstallationState(data) {
  const { profiles, config, validation } = data;
  
  const installationState = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    phase: 'complete',
    profiles: { selected: profiles || [], count: (profiles || []).length },
    configuration: { /* summary */ },
    services: [ /* service status */ ],
    summary: { /* validation summary */ }
  };
  
  await fs.writeFile(statePath, JSON.stringify(installationState, null, 2));
}
```

**File**: `services/wizard/backend/src/server.js`

Updated installation completion handler to save state:
```javascript
socket.emit('install:complete', { /* ... */ });

// Save installation state for future wizard sessions
const ProfileStateManager = require('./utils/profile-state-manager');
const profileStateManager = ProfileStateManager.getInstance();
await profileStateManager.saveInstallationState({
  profiles,
  config,
  validation: { /* ... */ }
});
```

### ✅ Fix 2: Dashboard Auto-Start

**File**: `services/wizard/frontend/public/scripts/modules/complete.js`

Enhanced `openDashboard()` function:
```javascript
export async function openDashboard() {
  const dashboardUrl = 'http://localhost:8080';
  
  try {
    // Check if dashboard is accessible
    await fetch(dashboardUrl, { method: 'HEAD', mode: 'no-cors' });
    window.open(dashboardUrl, '_blank');
    
  } catch (error) {
    // Dashboard not running, start it
    const startResponse = await api.post('/dashboard/start');
    if (startResponse.success) {
      setTimeout(() => window.open(dashboardUrl, '_blank'), 2000);
    }
  }
}
```

**File**: `services/wizard/backend/src/api/dashboard-integration.js`

Added `POST /api/dashboard/start` endpoint:
```javascript
router.post('/start', async (req, res) => {
  // Check if already running
  try {
    await fetch('http://localhost:8080', { method: 'HEAD' });
    return res.json({ success: true, alreadyRunning: true });
  } catch {}
  
  // Start dashboard service
  const startCommand = `cd ${dashboardPath} && nohup npm start > /dev/null 2>&1 &`;
  await execAsync(startCommand);
  
  // Verify started
  await new Promise(resolve => setTimeout(resolve, 3000));
  // ... verification logic
});
```

### ⚠️ Fix 3: Wizard State Detection (NEEDS IMPLEMENTATION)

**Status**: NOT YET IMPLEMENTED

**Required Changes**:

1. **Add initialization check in wizard startup**
   - File: `services/wizard/frontend/public/scripts/wizard-refactored.js` or `navigation.js`
   - Check for existing installation on page load
   - Load installation state from backend
   - Show reconfiguration mode if installation exists

2. **Add backend endpoint to get installation state**
   - File: `services/wizard/backend/src/api/config.js` or new endpoint
   - Endpoint: `GET /api/installation/state`
   - Returns: installation state from `.kaspa-aio/installation-state.json`

3. **Update template selection to show installed services**
   - File: `services/wizard/frontend/public/scripts/modules/template-selection.js`
   - Load installation state when templates step loads
   - Display installed services with status indicators
   - Show "Modify" or "Remove" options for installed profiles

4. **Add reconfiguration landing step**
   - Already exists in HTML: `step-reconfigure-landing`
   - Needs JavaScript to populate with current installation data
   - Show installed profiles, running services, last modified date

## Testing Instructions

### Test 1: Installation State Persistence
1. Complete a fresh installation with Home Node Template
2. Check that `.kaspa-aio/installation-state.json` exists
3. Verify file contains correct profiles, services, and timestamps
4. Restart wizard - should detect existing installation

### Test 2: Dashboard Auto-Start
1. Complete installation
2. Stop dashboard service if running: `pkill -f "node.*dashboard"`
3. Click "Open Dashboard" button
4. Verify dashboard starts automatically
5. Verify browser opens to `http://localhost:8080`

### Test 3: Wizard State Detection (AFTER IMPLEMENTATION)
1. Complete installation
2. Restart wizard: `npm start` in `services/wizard/backend`
3. Open wizard in browser
4. Verify it shows reconfiguration mode, not "Get Started"
5. Navigate to Templates step
6. Verify installed services are shown with status

## Current Status

✅ **COMPLETED**:
- Installation state saving after completion
- Dashboard auto-start functionality

⚠️ **NEEDS IMPLEMENTATION**:
- Wizard initialization check for existing installation
- Backend endpoint to retrieve installation state
- Template selection display of installed services
- Reconfiguration landing step population

## Next Steps

1. Implement wizard initialization check
2. Add backend endpoint for installation state retrieval
3. Update template selection to show installed services
4. Populate reconfiguration landing step with current data
5. Test complete flow: install → restart → reconfigure

## Files Modified

- `services/wizard/backend/src/utils/profile-state-manager.js` - Added saveInstallationState()
- `services/wizard/backend/src/server.js` - Call saveInstallationState() after installation
- `services/wizard/frontend/public/scripts/modules/complete.js` - Enhanced openDashboard()
- `services/wizard/backend/src/api/dashboard-integration.js` - Added /dashboard/start endpoint

## Files That Need Modification

- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Add initialization check
- `services/wizard/backend/src/api/config.js` - Add GET /installation/state endpoint
- `services/wizard/frontend/public/scripts/modules/template-selection.js` - Show installed services
- `services/wizard/frontend/public/scripts/modules/reconfigure-landing.js` - Populate reconfiguration UI

## Related Specs

- `.kiro/specs/web-installation-wizard/` - Original wizard spec
- `.kiro/specs/management-dashboard/` - Dashboard integration spec

Both specs mention the requirement for detecting existing installations and allowing reconfiguration, but this functionality was never fully implemented.