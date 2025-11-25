# Resume Installation Quick Reference

## Overview

The resume installation feature allows users to continue interrupted wizard installations from where they left off, with full state preservation and background task tracking.

## Quick Start

### For Users

**When opening the wizard:**
1. If a previous installation is in progress, you'll see a resume dialog
2. Review the information:
   - Last step you were on
   - Time since last activity
   - Installation phase
   - Background tasks running
3. Choose an option:
   - **Continue Installation** - Resume from where you left off
   - **Start Over** - Clear state and begin fresh

**Background tasks:**
- Shown at the top of the wizard if any are running
- Click header to collapse/expand
- Shows progress for each task
- Updates in real-time

### For Developers

**Check if can resume:**
```javascript
import { checkAndShowResumeDialog } from './modules/resume.js';

// Returns true if resuming, false if starting fresh
const isResuming = await checkAndShowResumeDialog();
```

**Display background tasks:**
```javascript
import { displayBackgroundTaskStatus } from './modules/resume.js';

const tasks = [
  {
    id: 'task-1',
    service: 'kaspa-node',
    status: 'in-progress',
    progress: 45.5
  }
];

displayBackgroundTaskStatus(tasks);
```

**Start over programmatically:**
```javascript
import { startOver } from './modules/resume.js';

await startOver();
```

## API Endpoints

### Check Resume Status
```bash
GET /api/wizard/can-resume
```

**Response:**
```json
{
  "canResume": true,
  "state": { ... },
  "lastActivity": "2025-11-25T17:00:00.000Z",
  "currentStep": 4,
  "phase": "preparing",
  "backgroundTasks": ["task-1"],
  "hoursSinceActivity": 2
}
```

### Load State
```bash
GET /api/wizard/load-state
```

**Response:**
```json
{
  "success": true,
  "state": {
    "installationId": "install-123",
    "currentStep": 4,
    "phase": "preparing",
    "profiles": { ... },
    "services": [ ... ],
    "backgroundTasks": [ ... ]
  }
}
```

### Clear State
```bash
POST /api/wizard/clear-state
```

**Response:**
```json
{
  "success": true,
  "message": "Wizard state cleared"
}
```

## State Structure

```javascript
{
  // Installation metadata
  installationId: "install-1234567890",
  version: "1.0.0",
  startedAt: "2025-11-25T15:00:00.000Z",
  lastActivity: "2025-11-25T17:00:00.000Z",
  
  // Current progress
  currentStep: 4,
  completedSteps: ["welcome", "checklist", "system-check"],
  phase: "preparing", // preparing, building, starting, syncing, validating, complete
  
  // Configuration
  profiles: {
    selected: ["core", "kaspa-user-applications"],
    configuration: { ... }
  },
  
  // Service states
  services: [
    {
      name: "kaspa-node",
      status: "syncing",
      containerId: "abc123",
      syncProgress: 45.5
    }
  ],
  
  // Synchronization tracking
  syncOperations: [ ... ],
  
  // User choices
  userDecisions: [ ... ],
  
  // Resumability
  resumable: true,
  resumePoint: "profiles",
  backgroundTasks: ["node-sync-kaspa-node-123"]
}
```

## Resume Conditions

**Can resume if:**
- ✅ State file exists
- ✅ State is less than 24 hours old
- ✅ Installation is not marked as complete
- ✅ State is marked as resumable

**Cannot resume if:**
- ❌ No state file found
- ❌ State is older than 24 hours
- ❌ Installation is already complete
- ❌ State is marked as non-resumable

## WebSocket Events

### Background Task Events

**Task Started:**
```javascript
socket.on('sync:start', (data) => {
  // data: { taskId, service, type }
});
```

**Progress Update:**
```javascript
socket.on('sync:progress', (data) => {
  // data: { taskId, service, progress, ... }
});
```

**Task Complete:**
```javascript
socket.on('sync:complete', (data) => {
  // data: { taskId, service, completedAt, duration }
});
```

**Task Error:**
```javascript
socket.on('sync:error', (data) => {
  // data: { taskId, service, error }
});
```

**Node Ready:**
```javascript
socket.on('node:ready', (data) => {
  // data: { service, host, port, message }
});
```

## CSS Classes

### Resume Dialog
- `.resume-dialog` - Modal container
- `.resume-header` - Header with icon and title
- `.resume-body` - Main content
- `.resume-details` - Details grid
- `.resume-detail-item` - Individual detail row
- `.resume-info-box` - Informational message
- `.resume-actions` - Action buttons

### Background Tasks
- `.background-tasks-status` - Container
- `.background-tasks-header` - Clickable header
- `.background-tasks-list` - Task list
- `.background-task-item` - Individual task
- `.task-progress-bar` - Progress bar
- `.task-progress-fill` - Progress fill

## Helper Functions

### Format Time Since
```javascript
formatTimeSince(2.5) // "2 hours ago"
formatTimeSince(0.5) // "30 minutes ago"
formatTimeSince(25) // "1 day ago"
```

### Get Step Name
```javascript
getStepName(1) // "Welcome"
getStepName(4) // "Profile Selection"
getStepName(8) // "Complete"
```

### Format Phase
```javascript
formatPhase('preparing') // "Preparing"
formatPhase('building') // "Building Services"
formatPhase('syncing') // "Synchronizing"
```

## Testing

### Backend Test
```bash
node services/wizard/backend/test-resume-functionality.js
```

**Tests:**
- Create resumable state
- Check if can resume
- Add background tasks
- Update service status
- Get state summary
- Mark as complete
- Clear state

### Frontend Test
Open `services/wizard/frontend/test-resume-dialog.html` in browser:
- Click "Show Resume Dialog" to test dialog
- Click "Show Background Tasks" to test task display
- Verify styles and animations

## Troubleshooting

### Resume dialog not showing
1. Check if state file exists: `.kaspa-aio/wizard-state.json`
2. Verify state is less than 24 hours old
3. Check browser console for errors
4. Verify backend API is running

### Background tasks not updating
1. Check WebSocket connection
2. Verify backend is emitting events
3. Check browser console for WebSocket errors
4. Ensure task manager is running

### State not persisting
1. Check file permissions on `.kaspa-aio/` directory
2. Verify backend has write access
3. Check backend logs for errors
4. Ensure state manager is initialized

## Best Practices

1. **Always save state** after significant progress
2. **Verify containers** before resuming
3. **Check background tasks** status on resume
4. **Provide clear feedback** to users
5. **Handle errors gracefully** with fallback to fresh start
6. **Test resume flow** regularly
7. **Keep state format** backward compatible
8. **Document state changes** in version updates

## Related Files

- `services/wizard/frontend/public/scripts/modules/resume.js` - Frontend module
- `services/wizard/backend/src/utils/state-manager.js` - State management
- `services/wizard/backend/src/utils/background-task-manager.js` - Task management
- `services/wizard/backend/src/api/wizard-state.js` - API endpoints
- `services/wizard/frontend/public/styles/wizard.css` - Styles
- `docs/implementation-summaries/wizard/RESUME_INSTALLATION_IMPLEMENTATION.md` - Full documentation

## Support

For issues or questions:
1. Check implementation documentation
2. Review test files for examples
3. Check browser console for errors
4. Review backend logs
5. Test with test pages provided
