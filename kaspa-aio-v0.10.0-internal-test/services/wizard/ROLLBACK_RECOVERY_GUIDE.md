# Rollback and Recovery System Guide

## Overview

The Rollback and Recovery system provides comprehensive configuration versioning, checkpoint management, and recovery capabilities for the Kaspa All-in-One Installation Wizard. This system ensures users can safely experiment with configurations, recover from failures, and maintain a complete history of changes.

## Features

### 1. Configuration Versioning
- **Automatic version tracking**: Every configuration change is automatically saved as a version
- **Version history**: View up to 50 recent configuration versions
- **Version comparison**: Compare any two versions to see what changed
- **Version metadata**: Each version includes timestamp, profiles, and action description

### 2. Rollback Functionality
- **Undo button**: Quickly revert to the previous configuration
- **Restore any version**: Roll back to any point in history
- **Automatic backup**: Current configuration is backed up before any restore
- **Service restart**: Optionally restart services after rollback

### 3. Installation Checkpoints
- **Save installation state**: Create checkpoints at any stage of installation
- **Resume from checkpoint**: Continue installation from a saved checkpoint
- **Checkpoint data**: Store arbitrary data with each checkpoint
- **Automatic cleanup**: Keep only the 10 most recent checkpoints

### 4. Start Over Functionality
- **Clean slate**: Remove all containers, volumes, and configurations
- **Selective cleanup**: Choose what to delete (data, config, backups)
- **Safe operation**: Confirmation required before destructive actions
- **Complete reset**: Return to fresh installation state

## API Endpoints

### Configuration Versioning

#### POST /api/rollback/save-version
Save current configuration as a version.

**Request:**
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": "16111",
    "POSTGRES_PASSWORD": "secure-password"
  },
  "profiles": ["core", "explorer"],
  "metadata": {
    "action": "manual-save",
    "description": "Before enabling mining"
  }
}
```

**Response:**
```json
{
  "success": true,
  "versionId": "v-1234567890",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "entry": {
    "versionId": "v-1234567890",
    "timestamp": "2025-11-21T17:00:00.000Z",
    "backupFilename": ".env.v-1234567890",
    "profiles": ["core", "explorer"],
    "metadata": {
      "action": "manual-save",
      "description": "Before enabling mining"
    }
  }
}
```

#### GET /api/rollback/history?limit=20
Get configuration history.

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "versionId": "v-1234567890",
      "timestamp": "2025-11-21T17:00:00.000Z",
      "backupFilename": ".env.v-1234567890",
      "backupPath": "/path/to/.kaspa-backups/.env.v-1234567890",
      "profiles": ["core", "explorer"],
      "metadata": {
        "action": "manual-save",
        "configKeys": ["KASPA_NODE_RPC_PORT", "POSTGRES_PASSWORD"]
      },
      "size": 1024,
      "age": "2 hours ago",
      "canRestore": true
    }
  ],
  "total": 15
}
```

#### POST /api/rollback/restore
Restore configuration from a version.

**Request:**
```json
{
  "versionId": "v-1234567890",
  "restartServices": true
}
```

**Response:**
```json
{
  "success": true,
  "versionId": "v-1234567890",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "profiles": ["core", "explorer"],
  "requiresRestart": true
}
```

#### POST /api/rollback/undo
Undo last configuration change (restore most recent version).

**Request:**
```json
{
  "restartServices": true
}
```

**Response:**
```json
{
  "success": true,
  "versionId": "v-1234567890",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "profiles": ["core", "explorer"],
  "requiresRestart": true,
  "message": "Undone to previous configuration"
}
```

#### GET /api/rollback/compare?version1=v-123&version2=v-456
Compare two configuration versions.

**Response:**
```json
{
  "success": true,
  "version1": {
    "versionId": "v-123",
    "timestamp": "2025-11-21T16:00:00.000Z",
    "profiles": ["core"]
  },
  "version2": {
    "versionId": "v-456",
    "timestamp": "2025-11-21T17:00:00.000Z",
    "profiles": ["core", "explorer"]
  },
  "differences": {
    "added": [
      {
        "key": "INDEXER_DB_PASSWORD",
        "value": "new-password"
      }
    ],
    "removed": [
      {
        "key": "OLD_KEY",
        "value": "old-value"
      }
    ],
    "changed": [
      {
        "key": "POSTGRES_PASSWORD",
        "oldValue": "old-password",
        "newValue": "new-password"
      }
    ]
  }
}
```

### Installation Checkpoints

#### POST /api/rollback/checkpoint
Create installation checkpoint.

**Request:**
```json
{
  "stage": "images-pulled",
  "data": {
    "progress": 50,
    "config": { "KASPA_NODE_RPC_PORT": "16111" },
    "profiles": ["core"],
    "completedSteps": ["system-check", "profile-selection", "configuration"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "checkpointId": "cp-1234567890",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "stage": "images-pulled"
}
```

#### GET /api/rollback/checkpoints
Get all checkpoints.

**Response:**
```json
{
  "success": true,
  "checkpoints": [
    {
      "checkpointId": "cp-1234567890",
      "timestamp": "2025-11-21T17:00:00.000Z",
      "stage": "images-pulled",
      "checkpointPath": "/path/to/.kaspa-backups/cp-1234567890.json",
      "age": "1 hour ago",
      "data": {
        "progress": 50,
        "config": { "KASPA_NODE_RPC_PORT": "16111" },
        "profiles": ["core"]
      }
    }
  ]
}
```

#### POST /api/rollback/restore-checkpoint
Restore from checkpoint.

**Request:**
```json
{
  "checkpointId": "cp-1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "checkpointId": "cp-1234567890",
  "stage": "images-pulled",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "data": {
    "progress": 50,
    "config": { "KASPA_NODE_RPC_PORT": "16111" },
    "profiles": ["core"],
    "completedSteps": ["system-check", "profile-selection", "configuration"]
  }
}
```

#### DELETE /api/rollback/checkpoint/:checkpointId
Delete a checkpoint.

**Response:**
```json
{
  "success": true,
  "checkpointId": "cp-1234567890"
}
```

### Start Over

#### POST /api/rollback/start-over
Start over - clean up everything and reset.

**Request:**
```json
{
  "deleteData": true,
  "deleteConfig": true,
  "deleteBackups": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully reset to clean state",
  "actions": [
    { "action": "stop-services", "success": true },
    { "action": "remove-containers", "success": true },
    { "action": "remove-volumes", "success": true },
    { "action": "delete-config", "success": true },
    { "action": "delete-backups", "success": false, "error": "Not requested" }
  ]
}
```

### Storage Management

#### GET /api/rollback/storage
Get storage usage for backups.

**Response:**
```json
{
  "success": true,
  "totalSize": 5242880,
  "fileCount": 15,
  "totalSizeMB": "5.00",
  "backupDir": "/path/to/.kaspa-backups"
}
```

## Usage Examples

### Frontend Integration

#### 1. Save Configuration Before Changes

```javascript
async function saveConfigurationVersion(config, profiles, description) {
  const response = await fetch('/api/rollback/save-version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config,
      profiles,
      metadata: {
        action: 'user-save',
        description
      }
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Configuration saved:', result.versionId);
    return result.versionId;
  } else {
    console.error('Failed to save configuration:', result.error);
    return null;
  }
}
```

#### 2. Display Configuration History

```javascript
async function displayConfigurationHistory() {
  const response = await fetch('/api/rollback/history?limit=10');
  const result = await response.json();
  
  if (result.success) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    result.entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="history-header">
          <span class="version-id">${entry.versionId}</span>
          <span class="age">${entry.age}</span>
        </div>
        <div class="history-details">
          <span>Profiles: ${entry.profiles.join(', ')}</span>
          <span>Action: ${entry.metadata.action}</span>
        </div>
        <button onclick="restoreVersion('${entry.versionId}')">Restore</button>
      `;
      historyList.appendChild(item);
    });
  }
}
```

#### 3. Undo Last Change

```javascript
async function undoLastChange() {
  if (!confirm('Undo last configuration change?')) {
    return;
  }
  
  const response = await fetch('/api/rollback/undo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restartServices: true
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert('Configuration restored successfully. Services are restarting...');
    // Refresh UI
    location.reload();
  } else {
    alert('Failed to undo: ' + result.error);
  }
}
```

#### 4. Create Installation Checkpoint

```javascript
async function createInstallationCheckpoint(stage, data) {
  const response = await fetch('/api/rollback/checkpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage,
      data
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Checkpoint created:', result.checkpointId);
    // Store checkpoint ID for potential resume
    localStorage.setItem('lastCheckpoint', result.checkpointId);
    return result.checkpointId;
  } else {
    console.error('Failed to create checkpoint:', result.error);
    return null;
  }
}

// Usage during installation
async function installStep1() {
  // ... perform installation step ...
  
  await createInstallationCheckpoint('step1-complete', {
    progress: 25,
    completedSteps: ['system-check', 'profile-selection'],
    config: currentConfig,
    profiles: selectedProfiles
  });
}
```

#### 5. Resume from Checkpoint

```javascript
async function resumeFromLastCheckpoint() {
  const lastCheckpointId = localStorage.getItem('lastCheckpoint');
  
  if (!lastCheckpointId) {
    console.log('No checkpoint to resume from');
    return null;
  }
  
  const response = await fetch('/api/rollback/restore-checkpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkpointId: lastCheckpointId
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Resuming from checkpoint:', result.stage);
    // Restore wizard state from checkpoint data
    return result.data;
  } else {
    console.error('Failed to restore checkpoint:', result.error);
    return null;
  }
}
```

#### 6. Start Over

```javascript
async function startOver() {
  const confirmed = confirm(
    'This will remove all containers, volumes, and configurations. ' +
    'Are you sure you want to start over?'
  );
  
  if (!confirmed) return;
  
  const response = await fetch('/api/rollback/start-over', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deleteData: true,
      deleteConfig: true,
      deleteBackups: false  // Keep backups for safety
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert('System reset successfully. Returning to welcome screen...');
    // Clear local storage
    localStorage.clear();
    // Redirect to welcome
    window.location.href = '/';
  } else {
    alert('Failed to reset system: ' + result.error);
    // Show which actions failed
    result.actions.forEach(action => {
      if (!action.success) {
        console.error(`Failed: ${action.action} - ${action.error}`);
      }
    });
  }
}
```

## Storage Structure

All rollback data is stored in `.kaspa-backups/` directory:

```
.kaspa-backups/
├── history.json              # Configuration version history
├── checkpoints.json          # Checkpoint list
├── .env.v-1234567890        # Configuration version backup
├── .env.v-1234567891        # Configuration version backup
├── cp-1234567890.json       # Checkpoint data
└── cp-1234567891.json       # Checkpoint data
```

### history.json Format

```json
{
  "entries": [
    {
      "versionId": "v-1234567890",
      "timestamp": "2025-11-21T17:00:00.000Z",
      "backupFilename": ".env.v-1234567890",
      "backupPath": "/path/to/.kaspa-backups/.env.v-1234567890",
      "profiles": ["core", "explorer"],
      "metadata": {
        "action": "manual-save",
        "configKeys": ["KASPA_NODE_RPC_PORT", "POSTGRES_PASSWORD"]
      }
    }
  ]
}
```

### checkpoints.json Format

```json
{
  "checkpoints": [
    {
      "checkpointId": "cp-1234567890",
      "timestamp": "2025-11-21T17:00:00.000Z",
      "stage": "images-pulled",
      "checkpointPath": "/path/to/.kaspa-backups/cp-1234567890.json"
    }
  ]
}
```

### Checkpoint Data Format

```json
{
  "checkpointId": "cp-1234567890",
  "timestamp": "2025-11-21T17:00:00.000Z",
  "stage": "images-pulled",
  "data": {
    "progress": 50,
    "config": {
      "KASPA_NODE_RPC_PORT": "16111"
    },
    "profiles": ["core"],
    "completedSteps": ["system-check", "profile-selection", "configuration"],
    "timestamp": "2025-11-21T17:00:00.000Z"
  }
}
```

## Best Practices

### 1. Automatic Version Saving
- Save a version before any configuration change
- Include descriptive metadata for easy identification
- Let users see what changed before applying

### 2. Checkpoint Strategy
- Create checkpoints at major installation milestones
- Include enough data to resume installation
- Clean up old checkpoints automatically

### 3. User Experience
- Show "Undo" button prominently after changes
- Display version history in chronological order
- Provide visual diff when comparing versions
- Confirm destructive actions (start over, delete)

### 4. Error Handling
- Always backup before restore operations
- Provide clear error messages
- Allow partial recovery if some actions fail
- Log all operations for debugging

### 5. Storage Management
- Monitor backup directory size
- Implement automatic cleanup of old versions
- Provide manual cleanup option
- Warn users before deleting backups

## Testing

Run the test suite:

```bash
node services/wizard/backend/test-rollback.js
```

The test suite covers:
- Initialization
- Version saving and restoration
- History retrieval
- Version comparison
- Checkpoint creation and restoration
- Storage usage tracking

## Security Considerations

1. **File Permissions**: Backup files contain sensitive configuration data
2. **Access Control**: API endpoints should require authentication
3. **Input Validation**: Validate all version IDs and checkpoint IDs
4. **Path Traversal**: Prevent directory traversal attacks
5. **Rate Limiting**: Limit backup creation to prevent abuse

## Troubleshooting

### Backup Directory Not Created
- Check file system permissions
- Verify PROJECT_ROOT environment variable
- Ensure sufficient disk space

### Version Restore Fails
- Verify backup file exists
- Check file permissions
- Ensure .env file is writable

### Checkpoint Data Corrupted
- Validate JSON format
- Check for disk errors
- Restore from older checkpoint

### Storage Usage High
- Review retention policy
- Clean up old versions manually
- Implement automatic cleanup

## Future Enhancements

1. **Compression**: Compress old backup files to save space
2. **Cloud Backup**: Optional cloud storage for backups
3. **Scheduled Backups**: Automatic periodic backups
4. **Backup Encryption**: Encrypt sensitive configuration data
5. **Backup Verification**: Verify backup integrity
6. **Diff Visualization**: Visual diff tool for comparing versions
7. **Rollback Preview**: Preview changes before rollback
8. **Batch Operations**: Restore multiple versions at once

## Related Documentation

- [Safety System Guide](../../docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md)
- [Diagnostic Export Guide](./DIAGNOSTIC_HELP_QUICK_REFERENCE.md)
- [Wizard Integration Guide](./INTEGRATION.md)
- [Testing Guide](./TESTING.md)
