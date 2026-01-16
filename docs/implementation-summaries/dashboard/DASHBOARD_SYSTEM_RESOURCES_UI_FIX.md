# Dashboard System Resources UI Fixes

## Date
January 15, 2026

## Overview
Fixed three UI/UX issues in the Dashboard's System Resources section to improve usability and functionality.

## Issues Addressed

### 1. Text Values Alignment in Resource Cards
**Problem**: Text values at the bottom of resource cards (Load, Memory info, Disk info) were not properly aligned at the bottom of each panel.

**Solution**: 
- Updated `.resource-details` CSS to use `align-items: flex-end` instead of `align-items: center`
- Added `margin-top: var(--space-compact-2)` to ensure proper spacing
- This ensures all detail text sits at the baseline of the card

**Files Modified**:
- `services/dashboard/public/dashboard.css`

### 2. Monitoring Toggle Button Functionality
**Problem**: The "Monitoring: Off" toggle button didn't do anything when clicked - no backend functionality was connected.

**Solution**:
- Added event handler in `dashboard.js` setupQuickActions method
- Implemented `toggleResourceMonitoring()` method that:
  - Calls `/api/wizard/monitoring/start` endpoint when turning ON
  - Updates button text and styling (🟢 On / 🔴 Off)
  - Shows user notifications for state changes
  - Updates icon manager status
- Added CSS class `.monitoring-active` for visual feedback

**What the Monitoring Toggle Does**:
- **OFF (Default)**: Dashboard displays current system resource snapshots when you load the page
- **ON**: Activates continuous resource monitoring that:
  - Tracks resource usage over time
  - Generates alerts when thresholds are exceeded
  - **Reveals two additional sections below the resource cards:**
    1. **Per-Service Resource Usage** - Shows CPU/memory usage for each Docker container
    2. **Resource Trends (Last Hour)** - Displays trend charts for CPU and memory over time
  - Enables historical data collection
  - Note: Currently the trend charts are placeholders - full implementation requires chart library integration

**Where to See Historical Information**:
When monitoring is turned ON, scroll down in the System Resources section to see:
- **Per-Service Resource Usage** section (appears below resource cards)
- **Resource Trends (Last Hour)** section with CPU and memory trend charts

**Current Implementation Status**:
- ✅ Toggle button functional
- ✅ Sections show/hide based on monitoring state
- ⚠️ Historical data collection is active but chart rendering is not yet implemented
- ⚠️ Per-service resource data needs to be populated from backend

**Files Modified**:
- `services/dashboard/public/scripts/dashboard.js`
- `services/dashboard/public/dashboard.css`

### 3. Docker Limits "View" Button
**Problem**: The "View" button next to "Docker Limits:" didn't do anything when clicked.

**Solution**:
- Added event handler for `docker-limits-btn` in setupQuickActions
- Implemented `showDockerLimits()` method that:
  - Fetches Docker container limits from new `/api/system/docker-limits` endpoint
  - Displays data in a modal with formatted table
- Created `showDockerLimitsModal()` in UI manager to display the modal
- Added backend API endpoints:
  - `/api/system/docker-limits` - Returns container resource limits
  - `/api/system/container-count` - Returns count of running containers
- Implemented `updateContainerCount()` to populate the container count display

**Files Modified**:
- `services/dashboard/public/scripts/dashboard.js`
- `services/dashboard/public/scripts/modules/ui-manager.js`
- `services/dashboard/server.js`
- `services/dashboard/public/dashboard.css`

## Technical Details

### Resource Data Structure

The backend now returns enhanced resource information:

```javascript
{
  cpu: 5.4,              // CPU usage percentage
  memory: 62.2,          // Memory usage percentage
  disk: 38,              // Disk usage percentage
  memoryInfo: "17Gi / 27Gi",  // Used / Total memory
  diskInfo: "322G / 916G",    // Used / Total disk
  loadAverage: [3.82, 2.47, 2.04]  // 1min, 5min, 15min load
}
```

### Backend Changes

**ResourceMonitor.js**:
- Added `getMemoryInfo()` - Returns formatted "used / total" memory string
- Added `getDiskInfo()` - Returns formatted "used / total" disk string
- Modified `getLoadAverage()` - Now returns array instead of object
- Updated `getSystemResources()` - Includes memoryInfo and diskInfo in response

### Backend API Endpoints Added

```javascript
// Get Docker container resource limits
GET /api/system/docker-limits
Response: {
  limits: [
    {
      name: "container-name",
      memoryLimit: "2.00 GB" | "Unlimited",
      cpuLimit: "50%" | "Unlimited"
    }
  ]
}

// Get Docker container count
GET /api/system/container-count
Response: {
  count: 5
}
```

### Frontend Methods Added

**Dashboard.js**:
- `toggleResourceMonitoring()` - Toggle monitoring on/off
- `showDockerLimits()` - Fetch and display Docker limits
- `createDockerLimitsModal(limits)` - Generate modal HTML
- `updateContainerCount()` - Update container count display

**UI Manager**:
- `showDockerLimitsModal(content)` - Display Docker limits in modal

### CSS Classes Added

```css
.docker-limits-content - Modal content wrapper
.docker-limits-table - Table container with overflow
.monitoring-indicator.monitoring-active - Active monitoring state
```

## Testing

To test the changes:

1. **Text Alignment**: 
   - View System Resources section
   - Verify "Load:", memory info (e.g., "17Gi / 27Gi"), and disk info (e.g., "322G / 916G") align at bottom of cards
   - Text should now be visible and properly formatted

2. **Monitoring Toggle**:
   - Click "Monitoring: Off" button
   - Should change to "Monitoring: On" with green indicator (🟢)
   - Shows notification "Resource monitoring started"
   - Click again to toggle off (🔴)
   - **What it does**: Enables continuous resource tracking, alerts, and historical data collection

3. **Docker Limits**:
   - Click "View" button next to "Docker Limits:"
   - Modal should appear showing container resource limits in a table
   - Verify container count is displayed (e.g., "Containers: 1")

4. **API Testing**:
   ```bash
   # Test resource data includes new fields
   curl -s http://localhost:8080/api/system/resources | jq '{memoryInfo, diskInfo, loadAverage}'
   
   # Test Docker limits
   curl -s http://localhost:8080/api/system/docker-limits | jq .
   
   # Test container count
   curl -s http://localhost:8080/api/system/container-count | jq .
   ```

## Restart Command

```bash
DASHBOARD_PID=$(lsof -ti:8080 2>/dev/null); if [ -n "$DASHBOARD_PID" ]; then kill $DASHBOARD_PID; echo "Killed dashboard PID: $DASHBOARD_PID"; sleep 2; else echo "No dashboard process found"; fi
cd services/dashboard && npm start &
```

## Notes

- The monitoring toggle currently only has a start endpoint - there's no stop endpoint in the backend, so the "Off" state just updates the UI
- **Monitoring Purpose**: When ON, enables continuous resource tracking, alert generation, and historical data collection for trend analysis
- Docker limits are fetched from the ResourceMonitor's existing `getDockerResourceLimits()` method
- Container count is fetched using `docker ps -q | wc -l` command
- All changes maintain consistency with existing Dashboard UI patterns and styling
- The resource detail text (memory/disk info) now displays properly formatted strings like "17Gi / 27Gi" and "322G / 916G"
- Load average is now returned as an array [1min, 5min, 15min] for proper display

## Fixed Issues Summary

1. ✅ **Text values now visible** - Memory info and disk info display "used / total" format
2. ✅ **API calls fixed** - Changed from `this.api.get()` to `this.api.request()` 
3. ✅ **Monitoring toggle functional** - Button now works and shows visual feedback
4. ✅ **Docker limits modal works** - Displays container resource limits in formatted table
5. ✅ **Container count displays** - Shows number of running containers
6. ✅ **Toggle View button functional** - Switches Services Status between grid and list views
