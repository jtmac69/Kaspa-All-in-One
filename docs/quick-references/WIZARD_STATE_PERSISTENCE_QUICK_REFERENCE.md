# Wizard State Persistence Quick Reference

## Overview

The Wizard State Manager provides persistent state management for the installation wizard, enabling resumable installations, background task tracking, and comprehensive state history.

## Key Features

- **Resumable Installations**: Save and restore wizard state across sessions
- **Background Task Tracking**: Monitor long-running operations (node sync, indexer sync)
- **User Decision Recording**: Track user choices throughout installation
- **State History**: Automatic snapshots for debugging and recovery
- **Service Status Tracking**: Monitor individual service states
- **Sync Operation Management**: Track blockchain and database synchronization

## Files

### Core Implementation
- **Utility**: `services/wizard/backend/src/utils/state-manager.js`
- **API**: `services/wizard/backend/src/api/wizard-state.js`
- **State File**: `.kaspa-aio/wizard-state.json`
- **Snapshots**: `.kaspa-aio/state-snapshots/`

### Tests
- **Unit Tests**: `services/wizard/backend/test-wizard-state.js`
- **API Tests**: `services/wizard/backend/test-wizard-state-api.js`

## State Structure

```javascript
{
  // Installation metadata
  installationId: "install-1234567890",
  version: "1.0.0",
  startedAt: "2025-11-25T10:00:00.000Z",
  lastActivity: "2025-11-25T10:30:00.000Z",
  
  // Current progress
  currentStep: 3,
  completedSteps: ["welcome", "system-check", "configure"],
  phase: "building", // preparing, building, starting, syncing, validating, complete
  
  // Configuration
  profiles: {
    selected: ["core", "kaspa-user-applications"],
    configuration: { KASPA_NODE_P2P_PORT: 16111 }
  },
  
  // Service states
  services: [
    {
      name: "kaspa-node",
      status: "syncing",
      containerId: "abc123",
      logs: ["Starting...", "Syncing blockchain..."],
      lastUpdated: "2025-11-25T10:25:00.000Z"
    }
  ],
  
  // Synchronization tracking
  syncOperations: [
    {
      id: "sync-1234567890",
      service: "kaspa-node",
      type: "blockchain",
      status: "in-progress",
      progress: 45,
      startedAt: "2025-11-25T10:20:00.000Z",
      estimatedCompletion: "2025-11-25T12:00:00.000Z",
      canContinueInBackground: true
    }
  ],
  
  // User choices
  userDecisions: [
    {
      timestamp: "2025-11-25T10:22:00.000Z",
      decision: "continue-in-background",
      context: "Node sync taking too long"
    }
  ],
  
  // Resumability
  resumable: true,
  resumePoint: "install",
  backgroundTasks: ["sync-kaspa-node"]
}
```

## API Endpoints

### State Management

#### Save State
```bash
POST /api/wizard/save-state
Content-Type: application/json

{
  "state": { /* full state object */ }
}
```

#### Load State
```bash
GET /api/wizard/load-state
```

#### Check Resumability
```bash
GET /api/wizard/can-resume

Response:
{
  "canResume": true,
  "state": { /* state object */ },
  "hoursSinceActivity": 2,
  "lastActivity": "2025-11-25T10:30:00.000Z",
  "currentStep": 3,
  "phase": "building",
  "backgroundTasks": ["sync-kaspa-node"]
}
```

#### Clear State
```bash
POST /api/wizard/clear-state
```

### Step Management

#### Update Step
```bash
POST /api/wizard/update-step
Content-Type: application/json

{
  "stepNumber": 3,
  "stepName": "configure"
}
```

### Profile Management

#### Update Profiles
```bash
POST /api/wizard/update-profiles
Content-Type: application/json

{
  "profiles": ["core", "kaspa-user-applications"],
  "configuration": {
    "KASPA_NODE_P2P_PORT": 16111
  }
}
```

### Service Management

#### Update Service Status
```bash
POST /api/wizard/update-service
Content-Type: application/json

{
  "serviceName": "kaspa-node",
  "status": "syncing",
  "details": {
    "containerId": "abc123",
    "logs": ["Syncing blockchain..."]
  }
}
```

### Sync Operations

#### Add Sync Operation
```bash
POST /api/wizard/add-sync-operation
Content-Type: application/json

{
  "operation": {
    "service": "kaspa-node",
    "type": "blockchain",
    "status": "in-progress",
    "progress": 25,
    "canContinueInBackground": true
  }
}
```

#### Update Sync Operation
```bash
POST /api/wizard/update-sync-operation
Content-Type: application/json

{
  "syncId": "sync-1234567890",
  "updates": {
    "progress": 50,
    "status": "in-progress"
  }
}
```

### User Decisions

#### Record Decision
```bash
POST /api/wizard/record-decision
Content-Type: application/json

{
  "decision": "continue-in-background",
  "context": "Node sync taking too long"
}
```

### Background Tasks

#### Add Background Task
```bash
POST /api/wizard/add-background-task
Content-Type: application/json

{
  "taskId": "sync-kaspa-node",
  "taskInfo": {
    "service": "kaspa-node",
    "type": "blockchain",
    "status": "in-progress"
  }
}
```

#### Remove Background Task
```bash
POST /api/wizard/remove-background-task
Content-Type: application/json

{
  "taskId": "sync-kaspa-node"
}
```

### Phase Management

#### Update Phase
```bash
POST /api/wizard/update-phase
Content-Type: application/json

{
  "phase": "syncing"
}
```

Valid phases: `preparing`, `building`, `starting`, `syncing`, `validating`, `complete`

#### Mark Complete
```bash
POST /api/wizard/mark-complete
```

### State Information

#### Get State Summary
```bash
GET /api/wizard/state-summary

Response:
{
  "success": true,
  "summary": {
    "installationId": "install-1234567890",
    "startedAt": "2025-11-25T10:00:00.000Z",
    "lastActivity": "2025-11-25T10:30:00.000Z",
    "currentStep": 3,
    "phase": "building",
    "profiles": ["core", "kaspa-user-applications"],
    "servicesCount": 2,
    "syncOperationsCount": 1,
    "backgroundTasksCount": 1,
    "resumable": true,
    "completedSteps": ["welcome", "system-check", "configure"]
  }
}
```

#### Get State History
```bash
GET /api/wizard/state-history

Response:
{
  "success": true,
  "snapshots": [
    {
      "timestamp": 1764088905817,
      "date": "2025-11-25T10:30:00.000Z",
      "phase": "building",
      "currentStep": 3,
      "profiles": ["core", "kaspa-user-applications"]
    }
  ]
}
```

## Usage Examples

### Frontend Integration

#### Check for Resumable State on Load
```javascript
async function initializeWizard() {
  const response = await fetch('/api/wizard/can-resume');
  const result = await response.json();
  
  if (result.canResume) {
    // Show resume dialog
    const shouldResume = await showResumeDialog({
      lastActivity: result.lastActivity,
      currentStep: result.currentStep,
      phase: result.phase,
      backgroundTasks: result.backgroundTasks
    });
    
    if (shouldResume) {
      // Load state and continue
      const stateResponse = await fetch('/api/wizard/load-state');
      const stateResult = await stateResponse.json();
      
      if (stateResult.success) {
        restoreWizardState(stateResult.state);
      }
    } else {
      // Start fresh
      await fetch('/api/wizard/clear-state', { method: 'POST' });
      startNewInstallation();
    }
  } else {
    startNewInstallation();
  }
}
```

#### Save State on Step Change
```javascript
async function goToStep(stepNumber, stepName) {
  // Update step in backend
  await fetch('/api/wizard/update-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepNumber, stepName })
  });
  
  // Update UI
  updateWizardUI(stepNumber);
}
```

#### Track Service Status
```javascript
async function updateServiceStatus(serviceName, status, details) {
  await fetch('/api/wizard/update-service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName,
      status,
      details
    })
  });
}

// Example: Update during installation
socket.on('service:status', (data) => {
  updateServiceStatus(data.service, data.status, {
    containerId: data.containerId,
    logs: data.logs
  });
});
```

#### Track Sync Operations
```javascript
async function startNodeSync(service) {
  // Add sync operation
  const response = await fetch('/api/wizard/add-sync-operation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: {
        service: service,
        type: 'blockchain',
        status: 'in-progress',
        progress: 0,
        canContinueInBackground: true
      }
    })
  });
  
  const result = await response.json();
  const syncId = result.state.syncOperations[result.state.syncOperations.length - 1].id;
  
  // Monitor sync progress
  const interval = setInterval(async () => {
    const progress = await checkSyncProgress(service);
    
    await fetch('/api/wizard/update-sync-operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        syncId: syncId,
        updates: {
          progress: progress.percentage,
          status: progress.complete ? 'complete' : 'in-progress'
        }
      })
    });
    
    if (progress.complete) {
      clearInterval(interval);
    }
  }, 10000);
}
```

#### Record User Decisions
```javascript
async function handleSyncChoice(choice) {
  // Record decision
  await fetch('/api/wizard/record-decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: choice,
      context: 'Node synchronization strategy'
    })
  });
  
  // Execute choice
  if (choice === 'continue-in-background') {
    await startBackgroundSync();
  } else if (choice === 'wait-for-sync') {
    await waitForSync();
  }
}
```

## Resumability Rules

### Can Resume When:
- State file exists
- `resumable` flag is `true`
- `phase` is not `complete`
- Last activity within 24 hours

### Cannot Resume When:
- No state file exists
- `resumable` flag is `false`
- `phase` is `complete`
- Last activity older than 24 hours

## State Snapshots

The state manager automatically creates snapshots on every state save:
- Stored in `.kaspa-aio/state-snapshots/`
- Named as `state-{timestamp}.json`
- Maximum 10 snapshots kept (oldest deleted automatically)
- Used for debugging and recovery

## Testing

### Run Unit Tests
```bash
node services/wizard/backend/test-wizard-state.js
```

### Run API Tests (requires server running)
```bash
# Terminal 1: Start server
cd services/wizard/backend
npm start

# Terminal 2: Run tests
node services/wizard/backend/test-wizard-state-api.js
```

## Best Practices

1. **Save State Frequently**: Call `update-step` on every step change
2. **Track All Services**: Update service status for all running services
3. **Record Decisions**: Log important user choices for debugging
4. **Monitor Background Tasks**: Track long-running operations
5. **Clear on Completion**: Mark installation as complete when done
6. **Handle Resume Gracefully**: Always check `can-resume` on wizard load

## Troubleshooting

### State Not Saving
- Check `.kaspa-aio/` directory exists and is writable
- Verify API endpoints are responding (check server logs)
- Ensure state object has required fields

### Cannot Resume
- Check last activity timestamp (must be <24 hours)
- Verify `resumable` flag is `true`
- Ensure `phase` is not `complete`

### State Snapshots Growing
- Snapshots are automatically limited to 10
- Manually clear with `rm -rf .kaspa-aio/state-snapshots/`

## Related Documentation

- **Node Sync Management**: `NODE_SYNC_MONITORING_QUICK_REFERENCE.md`
- **Rollback System**: `ROLLBACK_QUICK_START.md`
- **Wizard Integration**: `services/wizard/README.md`

## Requirements Validated

This implementation satisfies:
- **Requirement 5**: Installation Progress Tracking
- **Requirement 7**: Configuration Persistence
- **Requirement 11**: Multi-Step Wizard Flow

## Next Steps

After implementing state persistence:
1. **Task 6.7.4**: Implement background task management
2. **Task 6.7.5**: Add resume installation UI
3. **Task 6.7.6**: Update installation progress UI for sync
