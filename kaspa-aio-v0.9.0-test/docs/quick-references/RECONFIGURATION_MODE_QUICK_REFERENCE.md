# Reconfiguration Mode Quick Reference

## Overview

Quick reference for using the wizard's reconfiguration mode to modify existing installations.

## API Endpoints

### Load Current Configuration

```bash
GET /api/wizard/current-config
```

**Response**:
```json
{
  "success": true,
  "hasExistingConfig": true,
  "currentConfig": {...},
  "installationState": {...},
  "activeProfiles": ["core"],
  "mode": "reconfiguration"
}
```

### Create Backup

```bash
POST /api/wizard/reconfigure/backup
Content-Type: application/json

{
  "reason": "Before reconfiguration"
}
```

**Response**:
```json
{
  "success": true,
  "backupDir": "/workspace/.kaspa-backups/1234567890",
  "timestamp": 1234567890,
  "backedUpFiles": [".env", "docker-compose.yml", ...]
}
```

### Apply Reconfiguration

```bash
POST /api/wizard/reconfigure
Content-Type: application/json

{
  "config": {
    "KASPA_NODE_RPC_PORT": "16110",
    "DASHBOARD_PORT": "8081",
    ...
  },
  "profiles": ["core", "kaspa-user-applications"],
  "createBackup": true
}
```

**Response**:
```json
{
  "success": true,
  "backup": {...},
  "diff": {
    "hasChanges": true,
    "changeCount": 3,
    "changes": [...]
  },
  "affectedServices": ["dashboard", "kasia-app"],
  "requiresRestart": true
}
```

### List Backups

```bash
GET /api/reconfigure/backups
```

**Response**:
```json
{
  "success": true,
  "backups": [
    {
      "filename": ".env.backup.2024-01-01T00-00-00-000Z",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Restore Backup

```bash
POST /api/reconfigure/restore
Content-Type: application/json

{
  "backupFilename": ".env.backup.2024-01-01T00-00-00-000Z"
}
```

### Restart Services

```bash
POST /api/reconfigure/restart
Content-Type: application/json

{
  "profiles": ["core", "kaspa-user-applications"]
}
```

## Usage Examples

### Example 1: Change Dashboard Port

```javascript
// 1. Load current config
const current = await fetch('/api/wizard/current-config').then(r => r.json());

// 2. Modify configuration
const newConfig = {
  ...current.currentConfig,
  DASHBOARD_PORT: '8081' // Changed from 8080
};

// 3. Apply changes
const result = await fetch('/api/wizard/reconfigure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: newConfig,
    profiles: current.activeProfiles,
    createBackup: true
  })
}).then(r => r.json());

// 4. Check diff
console.log('Changes:', result.diff.changes);
console.log('Affected services:', result.affectedServices);

// 5. Restart services
await fetch('/api/reconfigure/restart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profiles: current.activeProfiles
  })
});
```

### Example 2: Add New Profile

```javascript
// 1. Load current config
const current = await fetch('/api/wizard/current-config').then(r => r.json());

// 2. Add new profile configuration
const newConfig = {
  ...current.currentConfig,
  KASIA_APP_PORT: '3001',
  KASIA_INDEXER_PORT: '8081'
};

// 3. Add profile to list
const newProfiles = [...current.activeProfiles, 'kaspa-user-applications'];

// 4. Apply changes
const result = await fetch('/api/wizard/reconfigure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: newConfig,
    profiles: newProfiles,
    createBackup: true
  })
}).then(r => r.json());

// 5. Restart with new profiles
await fetch('/api/reconfigure/restart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profiles: newProfiles
  })
});
```

### Example 3: Rollback to Previous Configuration

```javascript
// 1. List available backups
const backups = await fetch('/api/reconfigure/backups').then(r => r.json());

// 2. Select most recent backup
const latestBackup = backups.backups[0];

// 3. Restore backup
const result = await fetch('/api/reconfigure/restore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    backupFilename: latestBackup.filename
  })
}).then(r => r.json());

// 4. Restart services
await fetch('/api/reconfigure/restart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profiles: ['core'] // Use appropriate profiles
  })
});
```

## Configuration Diff Format

```json
{
  "hasChanges": true,
  "changeCount": 3,
  "changes": [
    {
      "key": "DASHBOARD_PORT",
      "type": "modified",
      "oldValue": "8080",
      "newValue": "8081"
    },
    {
      "key": "KASIA_APP_PORT",
      "type": "added",
      "oldValue": null,
      "newValue": "3001"
    },
    {
      "key": "OLD_SERVICE_PORT",
      "type": "removed",
      "oldValue": "9000",
      "newValue": null
    }
  ]
}
```

## Backup Directory Structure

```
.kaspa-backups/
├── 1234567890/
│   ├── .env                      # Environment configuration
│   ├── docker-compose.yml        # Service definitions
│   ├── docker-compose.override.yml
│   ├── installation-state.json   # Installation metadata
│   ├── wizard-state.json         # Wizard state
│   └── backup-metadata.json      # Backup info
```

## Backup Metadata Format

```json
{
  "timestamp": 1234567890,
  "date": "2024-01-01T00:00:00.000Z",
  "reason": "Reconfiguration",
  "files": [".env", "docker-compose.yml", ...],
  "previousProfiles": ["core"],
  "newProfiles": ["core", "kaspa-user-applications"]
}
```

## Profile Names

- `core` - Core Profile (Kaspa node + dashboard)
- `kaspa-user-applications` - User-facing apps (Kasia, K-Social)
- `indexer-services` - Backend indexers (Kasia, K-Indexer, Simply-Kaspa)
- `archive-node` - Archive Node Profile
- `mining` - Mining Profile

## Common Configuration Keys

### Core Profile
- `KASPA_NODE_RPC_PORT` - RPC port (default: 16110)
- `KASPA_NODE_P2P_PORT` - P2P port (default: 16111)
- `DASHBOARD_PORT` - Dashboard port (default: 8080)
- `KASPA_NETWORK` - Network (mainnet/testnet)

### Kaspa User Applications
- `KASIA_APP_PORT` - Kasia app port
- `KSOCIAL_APP_PORT` - K-Social app port

### Indexer Services
- `KASIA_INDEXER_PORT` - Kasia indexer port
- `K_INDEXER_PORT` - K-Indexer port
- `SIMPLY_KASPA_INDEXER_PORT` - Simply-Kaspa indexer port
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

### Mining Profile
- `KASPA_STRATUM_PORT` - Stratum port
- `MINING_ADDRESS` - Mining wallet address

## Testing

### Run Test Suite

```bash
# Start wizard backend
cd services/wizard/backend
npm start

# In another terminal
./test-reconfigure.js
```

### Manual Testing with curl

```bash
# Load current config
curl http://localhost:3000/api/wizard/current-config

# Create backup
curl -X POST http://localhost:3000/api/wizard/reconfigure/backup \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test backup"}'

# Apply reconfiguration
curl -X POST http://localhost:3000/api/wizard/reconfigure \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "KASPA_NODE_RPC_PORT": "16110",
      "DASHBOARD_PORT": "8081"
    },
    "profiles": ["core"],
    "createBackup": true
  }'

# List backups
curl http://localhost:3000/api/reconfigure/backups

# Restart services
curl -X POST http://localhost:3000/api/reconfigure/restart \
  -H "Content-Type: application/json" \
  -d '{"profiles": ["core"]}'
```

## Error Handling

### Common Errors

**No existing configuration**:
```json
{
  "success": false,
  "error": "No existing configuration found",
  "message": "The .env file does not exist"
}
```

**Invalid configuration**:
```json
{
  "success": false,
  "error": "Invalid configuration",
  "errors": ["KASPA_NODE_RPC_PORT must be a number"]
}
```

**Backup creation failed**:
```json
{
  "success": false,
  "error": "Failed to create backup",
  "message": "Insufficient disk space"
}
```

## Best Practices

### Before Reconfiguration
1. ✅ Always create a backup
2. ✅ Review configuration diff
3. ✅ Check affected services
4. ✅ Plan for service downtime

### During Reconfiguration
1. ✅ Validate configuration before applying
2. ✅ Monitor backup creation
3. ✅ Review diff output
4. ✅ Note affected services

### After Reconfiguration
1. ✅ Verify services restarted successfully
2. ✅ Check service health
3. ✅ Test affected functionality
4. ✅ Keep backup for rollback if needed

## Troubleshooting

### Services won't restart
- **Check Docker permissions**: Ensure your user is in the docker group
  ```bash
  sudo usermod -aG docker $USER
  # Log out and back in for changes to take effect
  ```
- Check Docker is running
- Verify configuration is valid
- Check port conflicts
- Review service logs

### Configuration not applied
- Verify .env file permissions
- Check disk space
- Ensure backup succeeded
- Review error messages

### Backup restoration failed
- Verify backup file exists
- Check file permissions
- Ensure sufficient disk space
- Try manual restoration

## Related Documentation

- [Wizard State Persistence](./WIZARD_STATE_PERSISTENCE_QUICK_REFERENCE.md)
- [Wizard Mode Detection](./WIZARD_MODE_DETECTION_QUICK_REFERENCE.md)
- [Background Task Manager](./BACKGROUND_TASK_MANAGER_QUICK_REFERENCE.md)

## Support

For issues or questions:
1. Check error messages in response
2. Review backup metadata
3. Check installation state history
4. Consult full implementation documentation
