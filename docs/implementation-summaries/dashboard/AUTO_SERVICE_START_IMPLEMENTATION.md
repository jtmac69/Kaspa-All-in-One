# Automatic Service Start Implementation Summary

## Overview

This document summarizes the implementation of automatic service starting for both the Dashboard and Wizard, providing a seamless user experience where services automatically start when needed.

## Problem Statement

Previously, when users clicked the Wizard button from the Dashboard (or vice versa), if the target service wasn't running, they would see an error or manual instructions. This created friction in the user experience.

## Solution Implemented

### Automatic Service Detection and Starting

The system now:
1. **Detects** if the target service is running via health check
2. **Automatically starts** the service if it's not running
3. **Waits** for the service to be ready
4. **Navigates** to the service once it's accessible
5. **Provides feedback** throughout the process

## Technical Implementation

### 1. Service Start Scripts

Created robust bash scripts for starting each service:

#### Wizard Start Script (`services/wizard/start-wizard.sh`)
- Checks if Wizard is already running
- Verifies Node.js and npm are installed
- Installs dependencies if needed
- Starts service in background
- Waits up to 30 seconds for service to be ready
- Provides detailed logging

#### Dashboard Start Script (`services/dashboard/start-dashboard.sh`)
- Same robust functionality as Wizard script
- Adapted for Dashboard port (8080) and structure

### 2. API Endpoints

#### Dashboard Server
```javascript
POST /api/wizard/start
```
- Executes wizard start script
- Returns success/failure status
- Provides output and error details

#### Wizard Server
```javascript
POST /api/dashboard/start
```
- Executes dashboard start script
- Returns success/failure status
- Provides output and error details

### 3. Enhanced Navigation Logic

#### Dashboard → Wizard Navigation
```javascript
async openWizard() {
    // 1. Check if wizard is running
    const isRunning = await this.checkWizardStatus();
    
    // 2. If not running, start it automatically
    if (!isRunning) {
        await this.startWizardService();
        return;
    }
    
    // 3. Navigate to wizard with context
    this.navigateToWizard(wizardUrl);
}
```

#### Automatic Start Process
```javascript
async startWizardService() {
    // 1. Show "Starting..." dialog with spinner
    this.showWizardStartingDialog();
    
    // 2. Call API to start service
    const response = await fetch('/api/wizard/start', { method: 'POST' });
    
    // 3. Wait for service to be ready (up to 30 seconds)
    await this.waitForWizardReady();
    
    // 4. Close dialog and navigate
    this.closeStartingDialog();
    await this.openWizard();
}
```

### 4. User Experience Enhancements

#### Starting Dialog
- Professional spinner animation
- Clear status message
- Progress indication
- Kaspa brand styling

#### Error Handling
- Graceful error messages if start fails
- "Try Again" button for retry
- Manual start instructions as fallback
- Direct link option

#### Visual Feedback
- Animated spinner during startup
- Status messages throughout process
- Success/error indicators
- Smooth transitions

## User Experience Flow

### Successful Auto-Start Flow
1. User clicks "Wizard" button
2. Dashboard detects Wizard isn't running
3. Shows "Starting Installation Wizard..." dialog with spinner
4. Calls `/api/wizard/start` endpoint
5. Waits for Wizard to be ready (polls health endpoint)
6. Closes starting dialog
7. Opens Wizard in new tab automatically

### Error Handling Flow
1. User clicks "Wizard" button
2. Dashboard detects Wizard isn't running
3. Shows "Starting..." dialog
4. Start attempt fails
5. Shows error dialog with:
   - Clear error message
   - "Try Starting Again" button
   - Manual start instructions
   - Direct link as fallback

## Benefits

### For Users
- **Seamless Experience**: No manual service management needed
- **Automatic Recovery**: Services start automatically when needed
- **Clear Feedback**: Always know what's happening
- **Fallback Options**: Manual control if automatic start fails

### For Developers
- **Robust Scripts**: Handle edge cases and errors gracefully
- **Logging**: Detailed logs for troubleshooting
- **Reusable**: Scripts can be used manually or via API
- **Maintainable**: Clear separation of concerns

## Architecture Alignment

### Host-Based Services
- Both services run on host (not containerized)
- Direct access to Docker socket
- Can manage Docker containers
- Independent startup and shutdown

### Service Independence
- Services can start/stop independently
- No hard dependencies between services
- Graceful degradation if one service is down
- Automatic recovery when services become available

## Files Created/Modified

### New Files
- `services/wizard/start-wizard.sh` - Wizard startup script
- `services/dashboard/start-dashboard.sh` - Dashboard startup script
- `docs/implementation-summaries/dashboard/AUTO_SERVICE_START_IMPLEMENTATION.md` - This document

### Modified Files
- `services/dashboard/server.js` - Updated wizard start endpoint
- `services/wizard/backend/src/server.js` - Added dashboard start endpoint
- `services/dashboard/public/scripts/modules/wizard-navigation.js` - Enhanced navigation logic

## Testing Recommendations

### Manual Testing
1. **Test Auto-Start**: Stop Wizard, click Wizard button from Dashboard
2. **Test Already Running**: With Wizard running, click Wizard button
3. **Test Error Handling**: Simulate start failure (remove execute permission)
4. **Test Retry**: Use "Try Again" button after failure
5. **Test Bidirectional**: Test both Dashboard→Wizard and Wizard→Dashboard

### Automated Testing
1. **Health Check Tests**: Verify health endpoints work correctly
2. **Start Script Tests**: Test scripts with various conditions
3. **API Endpoint Tests**: Test start endpoints return correct responses
4. **Navigation Tests**: Test navigation logic with mocked services

## Future Enhancements

1. **Service Status Indicator**: Show real-time service status in header
2. **Auto-Restart**: Automatically restart crashed services
3. **Service Management UI**: Add start/stop/restart buttons for both services
4. **Systemd Integration**: Create systemd service files for production
5. **Health Monitoring**: Continuous health monitoring with alerts
6. **Resource Monitoring**: Show service resource usage

## Security Considerations

### Script Execution
- Scripts run with user permissions
- No privilege escalation
- Logs written to /tmp (world-readable)
- Consider more secure log location for production

### API Endpoints
- No authentication currently (localhost only)
- Consider adding authentication for production
- Rate limiting already in place
- Input validation on service names

## Conclusion

The automatic service start implementation provides a significantly improved user experience by:
- Eliminating manual service management
- Providing clear feedback throughout the process
- Handling errors gracefully with fallback options
- Maintaining the host-based architecture principles

Users can now seamlessly navigate between Dashboard and Wizard without worrying about whether services are running. The system automatically handles service startup, waits for readiness, and provides clear feedback throughout the process.