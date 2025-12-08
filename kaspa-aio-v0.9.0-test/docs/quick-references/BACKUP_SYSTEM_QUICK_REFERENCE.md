# Backup System Quick Reference

## Overview

The Backup Manager provides comprehensive configuration backup and restore capabilities for the Kaspa All-in-One wizard. It creates timestamped backups of all configuration files and supports rollback functionality.

## Key Features

- **Automatic Backups**: Creates backups before reconfiguration and updates
- **Timestamped Storage**: Backups stored in `.kaspa-backups/[timestamp]/`
- **Comprehensive Coverage**: Backs up `.env`, `docker-compose.yml`, `docker-compose.override.yml`, and state files
- **Rollback Support**: Restore any previous configuration
- **Backup Management**: List, compare, and delete backups
- **Storage Management**: Automatic cleanup of old backups (keeps last 20)

## Files Backed Up

1. `.env` - Environment configuration
2. `docker-compose.yml` - Docker Compose configuration
3. `docker-compose.override.yml` - Docker Compose overrides
4. `.kaspa-aio/installation-state.json` - Installation state
5. `.kaspa-aio/wizard-state.json` - Wizard state

## API Endpoints

### Create Backup
```bash
POST /api/wizard/backup
Content-Type: application/json

{
  "reason": "Manual backup",
  "metadata": {
    "custom": "data"
  }
}
```

**Response:**
```json
{
  "success": true,
  "backup": {
    "backupId": "1764105704386",
    "backupPath": "/path/to/.kaspa-backups/1764105704386",
    "timestamp": 1764105704386,
    "date": "2025-11-25T21:21:44.386Z",
    "backedUpFiles": [
      {
        "file": ".env",
        "description": "Environment configuration",
        "size": 1024,
        "sizeMB": "0.00"
      }
    ],
    "totalSize": 1024,
    "totalSizeMB": "0.00"
  }
}
```

### List Backups
```bash
GET /api/wizard/backups?limit=20
```

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "backupId": "1764105704386",
      "timestamp": 1764105704386,
      "date": "2025-11-25T21:21:44.386Z",
      "reason": "Manual backup",
      "files": [...],
      "fileCount": 4,
      "totalSize": 1024,
      "totalSizeMB": "0.00",
      "age": "5 minutes ago",
      "backupPath": "/path/to/.kaspa-backups/1764105704386",
      "canRestore": true
    }
  ],
  "total": 15,
  "showing": 15
}
```

### Get Backup Details
```bash
GET /api/wizard/backups/:backupId
```

**Response:**
```json
{
  "success": true,
  "backup": {
    "backupId": "1764105704386",
    "timestamp": 1764105704386,
    "date": "2025-11-25T21:21:44.386Z",
    "reason": "Manual backup",
    "files": [...],
    "backupPath": "/path/to/.kaspa-backups/1764105704386",
    "age": "5 minutes ago",
    "fileDetails": [
      {
        "name": ".env",
        "size": 1024,
        "sizeMB": "0.00",
        "modified": "2025-11-25T21:21:44.386Z"
      }
    ]
  }
}
```

### Restore Backup (Rollback)
```bash
POST /api/wizard/rollback
Content-Type: application/json

{
  "backupId": "1764105704386",
  "createBackupBeforeRestore": true,
  "restoreFiles": ["all"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration restored successfully",
  "backupId": "1764105704386",
  "restoredFrom": "2025-11-25T21:21:44.386Z",
  "restoredFiles": [".env", "docker-compose.yml", "installation-state.json"],
  "preRestoreBackup": "1764105704500",
  "requiresRestart": true
}
```

### Delete Backup
```bash
DELETE /api/wizard/backups/:backupId
```

**Response:**
```json
{
  "success": true,
  "message": "Backup deleted successfully",
  "backupId": "1764105704386"
}
```

### Get Storage Usage
```bash
GET /api/wizard/backups/storage/usage
```

**Response:**
```json
{
  "success": true,
  "storage": {
    "totalSize": 1048576,
    "totalSizeMB": "1.00",
    "totalSizeGB": "0.00",
    "fileCount": 20,
    "backupCount": 5,
    "backupDir": "/path/to/.kaspa-backups"
  }
}
```

### Compare Backups
```bash
POST /api/wizard/backups/compare
Content-Type: application/json

{
  "backupId1": "1764105704386",
  "backupId2": "1764105704500"
}
```

**Response:**
```json
{
  "success": true,
  "backup1": {
    "backupId": "1764105704386",
    "date": "2025-11-25T21:21:44.386Z",
    "reason": "Manual backup"
  },
  "backup2": {
    "backupId": "1764105704500",
    "date": "2025-11-25T21:21:44.500Z",
    "reason": "Reconfiguration"
  },
  "differences": {
    "added": [
      { "key": "NEW_VAR", "value": "value" }
    ],
    "removed": [
      { "key": "OLD_VAR", "value": "value" }
    ],
    "changed": [
      { "key": "CHANGED_VAR", "oldValue": "old", "newValue": "new" }
    ]
  }
}
```

### Cleanup Old Backups
```bash
POST /api/wizard/backups/cleanup
```

**Response:**
```json
{
  "success": true,
  "message": "Old backups cleaned up successfully",
  "deleted": 5,
  "remaining": 20
}
```

### Delete All Backups
```bash
DELETE /api/wizard/backups
Content-Type: application/json

{
  "confirm": "DELETE_ALL_BACKUPS"
}
```

**Response:**
```json
{
  "success": true,
  "message": "All backups cleaned up"
}
```

## Usage Examples

### Programmatic Usage

```javascript
const BackupManager = require('./src/utils/backup-manager');
const backupManager = new BackupManager();

// Create a backup
const result = await backupManager.createBackup('Before update', {
  version: '2.0.0',
  updateType: 'major'
});

if (result.success) {
  console.log(`Backup created: ${result.backupId}`);
}

// List backups
const backups = await backupManager.listBackups(10);
console.log(`Found ${backups.total} backups`);

// Restore a backup
const restore = await backupManager.restoreBackup(backupId, {
  createBackupBeforeRestore: true
});

if (restore.success) {
  console.log('Configuration restored successfully');
  console.log(`Pre-restore backup: ${restore.preRestoreBackup}`);
}

// Delete old backup
await backupManager.deleteBackup(oldBackupId);

// Get storage usage
const usage = await backupManager.getStorageUsage();
console.log(`Using ${usage.totalSizeMB} MB for backups`);
```

### Integration with Reconfiguration

The backup system is automatically integrated with the reconfiguration workflow:

```javascript
// Reconfiguration automatically creates backup
POST /api/wizard/reconfigure
{
  "config": {...},
  "profiles": ["core", "kaspa-user-applications"],
  "createBackup": true  // Default: true
}

// Response includes backup info
{
  "success": true,
  "backup": {
    "backupId": "1764105704386",
    "timestamp": 1764105704386,
    "backupDir": "/path/to/.kaspa-backups/1764105704386"
  },
  "diff": {...},
  "requiresRestart": true
}
```

## Backup Directory Structure

```
.kaspa-backups/
├── 1764105704386/                    # Timestamp-based directory
│   ├── .env                          # Backed up .env file
│   ├── docker-compose.yml            # Backed up docker-compose
│   ├── docker-compose.override.yml   # Backed up overrides
│   ├── installation-state.json       # Backed up installation state
│   ├── wizard-state.json             # Backed up wizard state
│   └── backup-metadata.json          # Backup metadata
├── 1764105704500/
│   └── ...
└── ...
```

### Backup Metadata Format

```json
{
  "backupId": "1764105704386",
  "timestamp": 1764105704386,
  "date": "2025-11-25T21:21:44.386Z",
  "reason": "Manual backup",
  "files": [
    {
      "file": ".env",
      "description": "Environment configuration",
      "size": 1024,
      "sizeMB": "0.00"
    }
  ],
  "metadata": {
    "createdBy": "wizard-backup-manager",
    "version": "1.0.0",
    "custom": "data"
  }
}
```

## Automatic Cleanup

The backup system automatically maintains a maximum of 20 backups. When a new backup is created and the limit is exceeded, the oldest backups are automatically deleted.

You can manually trigger cleanup:

```bash
POST /api/wizard/backups/cleanup
```

Or adjust the limit in `backup-manager.js`:

```javascript
this.maxBackups = 20; // Change this value
```

## Testing

### Test Backup Manager
```bash
node services/wizard/backend/test-backup-manager.js
```

### Test Backup API
```bash
# Start the wizard backend first
node services/wizard/backend/src/server.js

# In another terminal
node services/wizard/backend/test-backup-api.js
```

## Error Handling

All backup operations return a consistent response format:

**Success:**
```json
{
  "success": true,
  "...": "..."
}
```

**Failure:**
```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message"
}
```

## Best Practices

1. **Always create backups before changes**: Set `createBackup: true` in reconfiguration requests
2. **Verify backups**: Check the backup list after creation to ensure files were backed up
3. **Test restores**: Periodically test backup restoration to ensure backups are valid
4. **Monitor storage**: Check storage usage regularly and cleanup old backups if needed
5. **Document reasons**: Always provide meaningful reasons when creating backups
6. **Pre-restore backups**: Always create a backup before restoring (enabled by default)

## Troubleshooting

### Backup Creation Fails

**Problem**: Backup creation returns errors for some files

**Solution**: Check that the files exist and are readable. Some files (like `docker-compose.override.yml`) are optional and won't cause backup failure if missing.

### Restore Fails

**Problem**: Restore operation fails with "Backup not found"

**Solution**: Verify the backup ID exists using `GET /api/wizard/backups`

### Storage Full

**Problem**: Backup directory is consuming too much space

**Solution**: 
1. Check storage usage: `GET /api/wizard/backups/storage/usage`
2. Cleanup old backups: `POST /api/wizard/backups/cleanup`
3. Delete specific backups: `DELETE /api/wizard/backups/:backupId`

## Related Documentation

- [Reconfiguration Mode Quick Reference](./RECONFIGURATION_MODE_QUICK_REFERENCE.md)
- [Update Mode Implementation](../implementation-summaries/wizard/UPDATE_MODE_IMPLEMENTATION.md)
- [Rollback Quick Reference](./ROLLBACK_QUICK_REFERENCE.md)

## Files

- **Backup Manager**: `services/wizard/backend/src/utils/backup-manager.js`
- **Backup API**: `services/wizard/backend/src/api/backup.js`
- **Tests**: 
  - `services/wizard/backend/test-backup-manager.js`
  - `services/wizard/backend/test-backup-api.js`
