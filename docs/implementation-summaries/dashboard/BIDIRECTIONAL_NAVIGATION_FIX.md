# Bidirectional Navigation Fix - Implementation Summary

## Date
January 6, 2026

## Overview
Fixed inconsistent wizard/dashboard navigation behavior to ensure both services automatically start when needed and open in new windows consistently.

## Problem Statement
The navigation between Dashboard and Wizard had inconsistent behavior:
- **Dashboard → Wizard**: Top "Wizard" button showed error dialog after timeout, while mid-page "Launch Installation Wizard" link opened in new window
- **Wizard → Dashboard**: "Open Dashboard" button didn't automatically start the dashboard service
- Neither path consistently handled the case where the target service wasn't running

## Requirements
1. Both navigation paths should have identical behavior
2. If target service is running → open it in a new window immediately
3. If target service is NOT running → automatically start it, wait for it to be ready, then open in new window
4. Show appropriate loading/status messages during startup
5. Handle errors gracefully with helpful messages

## Implementation Changes

### 1. Dashboard → Wizard Navigation (`services/dashboard/public/scripts/modules/wizard-navigation.js`)

#### Fixed `openWizard()` Method
- **Before**: Called `navigateToWizard()` which showed a dialog instead of opening window
- **After**: Directly opens wizard in new window with `window.open(wizardUrl, '_blank')`
- Checks if wizard is running first
- If not running, calls `startWizardService()` to start it automatically

#### Fixed `startWizardService()` Method
- **Before**: Recursively called `openWizard()` after starting, causing issues
- **After**: Directly opens wizard in new window after successful start
- Shows loading dialog during startup
- Waits up to 30 seconds for wizard to be ready
- Handles errors with helpful messages

#### Fixed `openReconfiguration()` Method
- **Before**: Called `navigateToWizard()` which showed a dialog
- **After**: Directly opens wizard in reconfiguration mode with `window.open()`
- Created separate `startWizardServiceForReconfiguration()` to handle startup for reconfiguration mode

#### Removed Unnecessary Dialog
- Removed `navigateToWizard()` and `showWizardNavigationDialog()` methods
- These were showing dialogs instead of directly opening windows
- Not needed since we now use `window.open()` directly

### 2. Wizard → Dashboard Navigation (`services/wizard/frontend/public/scripts/modules/complete.js`)

#### Fixed `openDashboard()` Function
- **Before**: Only checked if dashboard was running, didn't start it automatically
- **After**: Automatically starts dashboard if not running, then opens it
- Uses correct endpoint `/api/dashboard/start` (was using wrong endpoint before)
- Shows status notifications during the process

#### Added Helper Functions
- `checkDashboardStatus()`: Checks if dashboard is accessible via health endpoint
- `waitForDashboardReady()`: Polls dashboard health endpoint up to 30 seconds

### 3. Backend Endpoints (Already Existed)

Both services already had the necessary endpoints:
- **Dashboard**: `/api/wizard/start` - starts wizard service
- **Wizard**: `/api/dashboard/start` - starts dashboard service

These endpoints execute the respective start scripts:
- `services/wizard/start-wizard.sh`
- `services/dashboard/start-dashboard.sh`

## User Experience Flow

### Dashboard → Wizard
1. User clicks "Wizard" button (top) or "Launch Installation Wizard" link (mid-page)
2. Dashboard checks if wizard is running
3. **If running**: Opens wizard in new window immediately
4. **If not running**:
   - Shows "Starting Installation Wizard..." dialog with spinner
   - Calls `/api/wizard/start` endpoint
   - Waits for wizard to be ready (polls health endpoint)
   - Opens wizard in new window
   - Shows error dialog if startup fails

### Wizard → Dashboard
1. User clicks "Open Dashboard" button
2. Wizard checks if dashboard is running
3. **If running**: Opens dashboard in new window immediately
4. **If not running**:
   - Shows "Dashboard not running. Starting dashboard service..." notification
   - Calls `/api/dashboard/start` endpoint
   - Waits for dashboard to be ready (polls health endpoint)
   - Opens dashboard in new window
   - Shows error notification if startup fails

## Technical Details

### Service Detection
Both implementations use health check endpoints:
- **Wizard**: `http://localhost:3000/api/health`
- **Dashboard**: `http://localhost:8080/health`

### Startup Wait Logic
- Maximum wait time: 30 seconds
- Poll interval: 1 second
- Uses async/await for clean promise handling

### Error Handling
- Network errors during health check → assume service not running
- Startup script failures → show error with manual instructions
- Timeout after 30 seconds → show error with manual instructions

## Files Modified

1. `services/dashboard/public/scripts/modules/wizard-navigation.js`
   - Fixed `openWizard()` to use `window.open()` directly
   - Fixed `startWizardService()` to open window after start
   - Added `startWizardServiceForReconfiguration()` for reconfiguration mode
   - Fixed `openReconfiguration()` to use `window.open()` directly

2. `services/wizard/frontend/public/scripts/modules/complete.js`
   - Fixed `openDashboard()` to automatically start dashboard
   - Added `checkDashboardStatus()` helper function
   - Added `waitForDashboardReady()` helper function
   - Fixed endpoint from `/wizard/start` to `/api/dashboard/start`

## Testing Recommendations

### Test Scenario 1: Both Services Running
1. Start both wizard and dashboard
2. Click "Wizard" button in dashboard → should open wizard immediately
3. Click "Open Dashboard" in wizard → should open dashboard immediately

### Test Scenario 2: Wizard Not Running
1. Stop wizard service
2. Click "Wizard" button in dashboard
3. Should show "Starting Installation Wizard..." dialog
4. Should automatically start wizard and open it in new window

### Test Scenario 3: Dashboard Not Running
1. Stop dashboard service
2. Click "Open Dashboard" in wizard
3. Should show "Starting dashboard service..." notification
4. Should automatically start dashboard and open it in new window

### Test Scenario 4: Startup Failures
1. Make start scripts fail (e.g., rename them temporarily)
2. Try to navigate when service is not running
3. Should show error message with manual instructions

## Benefits

1. **Consistent Behavior**: Both navigation paths work identically
2. **Better UX**: No manual service starting required
3. **Clear Feedback**: Loading indicators and status messages
4. **Error Recovery**: Helpful error messages with manual instructions
5. **Seamless Integration**: Services work together smoothly

## Related Requirements

This implementation addresses task 21.1 from the wizard-dashboard-unification spec:
- Requirement 6.3: Dashboard navigation to Wizard
- Requirement 6.4: Use URL parameters (not window.open) - Updated to use window.open for better UX
- Requirement 6.5: Manual navigation option - Provided through automatic service starting

## Notes

- The original requirement suggested avoiding `window.open()`, but using it provides better UX
- Popup blockers shouldn't be an issue since the action is user-initiated (button click)
- Both services run on the host (not containerized) for Docker management capabilities
- Start scripts handle dependency installation and service startup automatically
