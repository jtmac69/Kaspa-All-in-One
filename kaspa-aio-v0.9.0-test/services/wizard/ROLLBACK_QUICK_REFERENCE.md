# Rollback and Recovery - Quick Reference

## Quick Start

### Save Current Configuration
```javascript
POST /api/rollback/save-version
{
  "config": { /* current config */ },
  "profiles": ["core", "explorer"],
  "metadata": { "action": "manual-save", "description": "Before changes" }
}
```

### Undo Last Change
```javascript
POST /api/rollback/undo
{ "restartServices": true }
```

### View History
```javascript
GET /api/rollback/history?limit=10
```

### Restore Specific Version
```javascript
POST /api/rollback/restore
{ "versionId": "v-1234567890", "restartServices": true }
```

### Create Checkpoint
```javascript
POST /api/rollback/checkpoint
{
  "stage": "images-pulled",
  "data": { "progress": 50, "config": {}, "profiles": [] }
}
```

### Start Over
```javascript
POST /api/rollback/start-over
{
  "deleteData": true,
  "deleteConfig": true,
  "deleteBackups": false
}
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rollback/save-version` | POST | Save configuration version |
| `/api/rollback/history` | GET | Get version history |
| `/api/rollback/restore` | POST | Restore specific version |
| `/api/rollback/undo` | POST | Undo last change |
| `/api/rollback/compare` | GET | Compare two versions |
| `/api/rollback/checkpoint` | POST | Create checkpoint |
| `/api/rollback/checkpoints` | GET | List checkpoints |
| `/api/rollback/restore-checkpoint` | POST | Restore from checkpoint |
| `/api/rollback/checkpoint/:id` | DELETE | Delete checkpoint |
| `/api/rollback/start-over` | POST | Reset everything |
| `/api/rollback/storage` | GET | Get storage usage |

## Common Patterns

### Before Configuration Change
```javascript
// 1. Save current version
const versionId = await saveVersion(config, profiles, 'Before enabling mining');

// 2. Make changes
config.ENABLE_MINING = 'true';

// 3. Apply changes
await applyConfig(config);

// 4. If something goes wrong, undo
if (error) {
  await undoLastChange();
}
```

### Installation with Checkpoints
```javascript
// At each major step
async function installStep(stepName, stepFn) {
  // Create checkpoint before step
  await createCheckpoint(`before-${stepName}`, {
    progress: currentProgress,
    config, profiles
  });
  
  try {
    await stepFn();
    
    // Create checkpoint after step
    await createCheckpoint(`after-${stepName}`, {
      progress: currentProgress + 25,
      config, profiles
    });
  } catch (error) {
    // Restore from checkpoint
    await restoreCheckpoint(`before-${stepName}`);
    throw error;
  }
}
```

### Resume Installation
```javascript
// On wizard load
async function initWizard() {
  const lastCheckpoint = localStorage.getItem('lastCheckpoint');
  
  if (lastCheckpoint) {
    const shouldResume = confirm('Resume previous installation?');
    
    if (shouldResume) {
      const data = await restoreCheckpoint(lastCheckpoint);
      // Restore wizard state from data
      restoreWizardState(data);
    }
  }
}
```

## UI Components

### Undo Button
```html
<button id="undo-btn" onclick="undoLastChange()" disabled>
  ↶ Undo
</button>

<script>
// Enable after changes
function onConfigChange() {
  document.getElementById('undo-btn').disabled = false;
}
</script>
```

### Version History List
```html
<div id="version-history">
  <h3>Configuration History</h3>
  <div id="history-list"></div>
</div>

<script>
async function loadHistory() {
  const response = await fetch('/api/rollback/history?limit=10');
  const result = await response.json();
  
  const list = document.getElementById('history-list');
  list.innerHTML = result.entries.map(entry => `
    <div class="history-item">
      <span>${entry.age}</span>
      <span>${entry.metadata.action}</span>
      <button onclick="restoreVersion('${entry.versionId}')">Restore</button>
    </div>
  `).join('');
}
</script>
```

### Start Over Dialog
```html
<dialog id="start-over-dialog">
  <h2>Start Over?</h2>
  <p>This will remove all data and configurations.</p>
  
  <label>
    <input type="checkbox" id="delete-data" checked>
    Delete all containers and volumes
  </label>
  
  <label>
    <input type="checkbox" id="delete-config" checked>
    Delete configuration files
  </label>
  
  <label>
    <input type="checkbox" id="delete-backups">
    Delete backups (not recommended)
  </label>
  
  <button onclick="confirmStartOver()">Start Over</button>
  <button onclick="closeDialog()">Cancel</button>
</dialog>
```

## Storage Locations

```
.kaspa-backups/
├── history.json              # Version history
├── checkpoints.json          # Checkpoint list
├── .env.v-*                  # Version backups
└── cp-*.json                 # Checkpoint data
```

## Limits

- **Max history entries**: 50 versions
- **Max checkpoints**: 10 checkpoints
- **Automatic cleanup**: Oldest entries removed when limit reached

## Error Handling

```javascript
async function safeRestore(versionId) {
  try {
    const result = await fetch('/api/rollback/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, restartServices: true })
    }).then(r => r.json());
    
    if (result.success) {
      alert('Configuration restored successfully');
      location.reload();
    } else {
      alert('Restore failed: ' + result.error);
    }
  } catch (error) {
    alert('Network error: ' + error.message);
  }
}
```

## Testing

```bash
# Run rollback tests
node services/wizard/backend/test-rollback.js

# Expected output: All tests passed
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Undo button disabled | No previous version available |
| Restore fails | Backup file missing or corrupted |
| Checkpoint not found | Checkpoint was cleaned up (>10 limit) |
| Storage full | Clean up old versions manually |
| Permission denied | Check file permissions on .kaspa-backups/ |

## Best Practices

1. ✅ **Always save before changes**: Create version before modifying config
2. ✅ **Use descriptive metadata**: Help users identify versions
3. ✅ **Create checkpoints at milestones**: Enable resume functionality
4. ✅ **Keep backups safe**: Don't delete backups in start-over
5. ✅ **Confirm destructive actions**: Always confirm before deleting
6. ✅ **Show visual feedback**: Display success/error messages
7. ✅ **Enable undo after changes**: Make undo button prominent
8. ✅ **Monitor storage usage**: Alert users if backups grow large

## Related Guides

- [Full Documentation](./ROLLBACK_RECOVERY_GUIDE.md)
- [Safety System](../../docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md)
- [Diagnostic Export](./DIAGNOSTIC_HELP_QUICK_REFERENCE.md)
