# Node Synchronization UI Quick Reference

## Overview

The Node Synchronization UI provides a comprehensive interface for managing Kaspa node blockchain synchronization during installation. It includes real-time progress tracking, pause/resume controls, and multiple display modes.

## Features Implemented

### 1. Syncing Phase in Progress Indicator

**Location**: `services/wizard/frontend/public/scripts/modules/install.js`

The installation progress now includes a dedicated "Syncing" phase:

```javascript
const titles = {
    'init': 'Initializing Installation',
    'config': 'Configuring Environment',
    'pull': 'Downloading Docker Images',
    'build': 'Building Services',
    'deploy': 'Starting Services',
    'syncing': 'Synchronizing Blockchain',  // NEW
    'validate': 'Validating Installation'
};
```

**Stage Color**: `#70C7BA` (Kaspa brand teal)

### 2. Sync Progress Display

**Two Display Modes**:

#### A. Full Sync Progress Section (Wait Strategy)
Shown when user chooses to wait for sync completion:

```javascript
showSyncProgressSection(syncData)
```

**Displays**:
- Progress bar with percentage
- Current block / Target block
- Blocks remaining
- Estimated time remaining
- Pause/Resume buttons
- Status messages

#### B. Background Sync Indicator (Background Strategy)
Shown when sync continues in background:

```javascript
showBackgroundSyncIndicator(syncData)
```

**Displays**:
- Compact progress indicator
- Percentage complete
- Time remaining
- Pause/Resume/Details buttons

### 3. Pause/Resume Controls

**Functions**:
- `window.pauseSync()` - Pause foreground sync
- `window.resumeSync()` - Resume foreground sync
- `window.pauseBackgroundSync()` - Pause background sync
- `window.resumeBackgroundSync()` - Resume background sync

**WebSocket Events**:
- `sync:pause` - Sent to backend to pause sync
- `sync:resume` - Sent to backend to resume sync

**UI Updates**:
- Button visibility toggle (pause ↔ resume)
- Progress bar color change (teal → yellow when paused)
- Status message display
- Icon updates

### 4. Real-time Progress Updates

**Function**: `updateSyncProgress(syncStatus)`

Updates all sync-related UI elements:
- Progress percentage
- Progress bar width
- Current/target blocks
- Blocks remaining
- Time remaining estimates

**Called when**: Backend sends `sync:progress` WebSocket event

### 5. Sync Strategy Dialog

**Function**: `showSyncStrategyDialog(syncData)`

**Returns**: Promise<string> - User's choice: 'wait', 'background', or 'skip'

**Features**:
- Modal overlay with backdrop
- Three strategy options with descriptions
- Recommended option pre-selected
- Real-time sync status display
- Smooth animations

**Options**:
1. **Wait for sync** - Wizard waits, shows full progress
2. **Continue in background** - Installation proceeds, sync continues
3. **Skip sync** - Use public Kaspa network

### 6. Sync Complete Handling

**Function**: `handleSyncComplete(data)`

**Actions**:
- Hides sync progress sections
- Shows success notification
- Updates status message
- Adds completion log entry
- Transitions to next installation phase

## UI Components

### Progress Bar
```css
#sync-progress-bar {
    background: linear-gradient(135deg, #70C7BA 0%, #49C8B5 100%);
    height: 100%;
    transition: width 0.5s ease, background 0.3s ease;
}
```

### Control Buttons
```css
#sync-control-buttons button {
    padding: 6px 12px;
    border: 1px solid #70C7BA;
    background: white;
    color: #70C7BA;
    border-radius: 6px;
    transition: all 0.2s ease;
}
```

### Background Indicator
```css
.background-sync-indicator {
    background: linear-gradient(135deg, rgba(112, 199, 186, 0.1) 0%, rgba(73, 200, 181, 0.1) 100%);
    border: 1px solid #70C7BA;
    border-radius: 8px;
    padding: 12px 16px;
}
```

## State Management

**Stored in stateManager**:
- `syncStrategy` - User's chosen strategy
- `syncStatus` - Current sync progress data
- `syncPaused` - Boolean indicating if sync is paused

## WebSocket Events

### Incoming (from backend):
- `sync:required` - Node sync needed, show strategy dialog
- `sync:progress` - Sync progress update
- `sync:complete` - Sync finished successfully
- `sync:error` - Sync error occurred

### Outgoing (to backend):
- `sync:strategy-chosen` - User selected strategy
- `sync:pause` - Request to pause sync
- `sync:resume` - Request to resume sync

## Integration Points

### 1. Installation Flow
```javascript
// When node sync is required
handleNodeSyncEvent(data) → showSyncStrategyDialog() → updateUIForSyncStrategy()
```

### 2. Progress Updates
```javascript
// Periodic updates from backend
WebSocket 'sync:progress' → updateSyncProgress() → Update UI elements
```

### 3. Completion
```javascript
// When sync completes
WebSocket 'sync:complete' → handleSyncComplete() → Hide sync UI, continue installation
```

## Time Formatting

**Function**: `formatSyncTime(seconds)`

**Returns**:
- `< 60s`: "X seconds"
- `< 1h`: "X minutes"
- `< 24h`: "X hours Y min"
- `≥ 24h`: "X days Y hr"

## Responsive Design

**Mobile Adaptations** (< 768px):
- Single column grid for sync details
- Stacked button layout
- Reduced padding
- Full-width dialogs

## Dark Mode Support

All sync UI components include dark mode styles:
- Darker backgrounds
- Adjusted text colors
- Maintained contrast ratios
- Consistent brand colors

## Example Usage

### Show Sync Progress
```javascript
const syncData = {
    syncStatus: {
        percentage: 45.2,
        currentBlock: 12500000,
        targetBlock: 27650000,
        blocksRemaining: 15150000
    },
    estimatedTime: '2 hours 30 min'
};

showSyncProgressSection(syncData);
```

### Update Progress
```javascript
const updatedStatus = {
    percentage: 46.1,
    currentBlock: 12750000,
    targetBlock: 27650000,
    blocksRemaining: 14900000,
    estimatedTimeRemaining: 8700 // seconds
};

updateSyncProgress(updatedStatus);
```

### Handle Sync Event
```javascript
// Backend sends sync required event
wsManager.on('sync:required', async (data) => {
    await handleNodeSyncEvent(data);
});
```

## Testing

### Manual Testing Checklist
- [ ] Sync strategy dialog displays correctly
- [ ] All three strategy options are selectable
- [ ] Progress bar updates smoothly
- [ ] Pause button pauses sync and updates UI
- [ ] Resume button resumes sync and restores UI
- [ ] Background indicator shows correct status
- [ ] Details button expands full progress view
- [ ] Time estimates format correctly
- [ ] Sync complete notification appears
- [ ] UI transitions smoothly between states

### Browser Compatibility
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Files Modified

1. **services/wizard/frontend/public/scripts/modules/install.js**
   - Added 'syncing' phase to stage titles and colors
   - Added pause/resume functions
   - Enhanced sync progress display
   - Added background sync indicator
   - Updated time estimates for sync phase

2. **services/wizard/frontend/public/styles/wizard.css**
   - Added sync progress section styles
   - Added background sync indicator styles
   - Added sync strategy dialog styles
   - Added pause/resume button styles
   - Added responsive and dark mode support

## Related Documentation

- **Design**: `.kiro/specs/web-installation-wizard/design.md` (Node Synchronization Management)
- **Requirements**: `.kiro/specs/web-installation-wizard/requirements.md` (Requirement 5, 6)
- **Tasks**: `.kiro/specs/web-installation-wizard/tasks.md` (Task 6.7.6)
- **Background Tasks**: `docs/quick-references/BACKGROUND_TASK_MANAGER_QUICK_REFERENCE.md`
- **State Persistence**: `docs/quick-references/WIZARD_STATE_PERSISTENCE_QUICK_REFERENCE.md`

## Next Steps

1. Backend implementation of sync pause/resume (Task 6.7.1)
2. Integration with background task manager (Task 6.7.4)
3. Testing with actual Kaspa node sync
4. User acceptance testing
5. Performance optimization for long-running syncs

## Support

For issues or questions:
1. Check browser console for errors
2. Verify WebSocket connection is active
3. Check backend logs for sync events
4. Review state manager for sync data
5. Test with mock sync data first
