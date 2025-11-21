# Rollback and Recovery - Quick Start Card

## 🎯 What It Does

The Rollback and Recovery system provides:
- **Configuration Versioning**: Track all config changes with full history
- **Undo Button**: One-click revert to previous configuration
- **Installation Checkpoints**: Save and resume installation progress
- **Start Over**: Complete system reset to clean state

## 🚀 Quick Commands

### Save Configuration
```bash
curl -X POST http://localhost:3000/api/rollback/save-version \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "profiles": ["core"], "metadata": {"action": "manual-save"}}'
```

### Undo Last Change
```bash
curl -X POST http://localhost:3000/api/rollback/undo \
  -H "Content-Type: application/json" \
  -d '{"restartServices": true}'
```

### View History
```bash
curl http://localhost:3000/api/rollback/history?limit=10
```

### Create Checkpoint
```bash
curl -X POST http://localhost:3000/api/rollback/checkpoint \
  -H "Content-Type: application/json" \
  -d '{"stage": "images-pulled", "data": {"progress": 50}}'
```

### Start Over
```bash
curl -X POST http://localhost:3000/api/rollback/start-over \
  -H "Content-Type: application/json" \
  -d '{"deleteData": true, "deleteConfig": true, "deleteBackups": false}'
```

## 📁 Storage Location

```
.kaspa-backups/
├── history.json              # Version history (50 max)
├── checkpoints.json          # Checkpoint list (10 max)
├── .env.v-*                  # Version backups
└── cp-*.json                 # Checkpoint data
```

## 🧪 Testing

```bash
# Run test suite
node services/wizard/backend/test-rollback.js

# Expected: All 10 tests passed ✓
```

## 📚 Documentation

- **Full Guide**: `services/wizard/ROLLBACK_RECOVERY_GUIDE.md`
- **Quick Reference**: `services/wizard/ROLLBACK_QUICK_REFERENCE.md`
- **Implementation Summary**: `TASK_6.5.12_IMPLEMENTATION_SUMMARY.md`

## 🔑 Key Features

| Feature | Description | Limit |
|---------|-------------|-------|
| Version History | Track all config changes | 50 versions |
| Checkpoints | Save installation state | 10 checkpoints |
| Undo | Revert last change | 1 click |
| Compare | Diff two versions | Any 2 versions |
| Start Over | Complete reset | Selective cleanup |

## 💡 Common Use Cases

### 1. Before Making Changes
```javascript
// Save current state
await saveVersion(config, profiles, 'Before enabling mining');

// Make changes
config.ENABLE_MINING = 'true';

// If something goes wrong
await undoLastChange();
```

### 2. Installation with Resume
```javascript
// Create checkpoint at each step
await createCheckpoint('step-1-complete', {
  progress: 25,
  config, profiles,
  completedSteps: ['system-check']
});

// On failure, resume from checkpoint
const data = await restoreCheckpoint('step-1-complete');
```

### 3. Clean Slate
```javascript
// Reset everything
await startOver({
  deleteData: true,
  deleteConfig: true,
  deleteBackups: false  // Keep backups!
});
```

## ⚠️ Important Notes

1. **Always keep backups**: Don't delete backups in start-over
2. **Automatic cleanup**: Old versions/checkpoints auto-deleted at limits
3. **Backup before restore**: Current config backed up automatically
4. **Service restart**: Optional after restore operations
5. **Storage monitoring**: Check storage usage regularly

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Undo disabled | No previous version available |
| Restore fails | Backup file missing - check `.kaspa-backups/` |
| Checkpoint not found | Exceeded 10 limit - was cleaned up |
| Permission denied | Check file permissions on `.kaspa-backups/` |

## 📞 Support

- **Test Suite**: `node services/wizard/backend/test-rollback.js`
- **Storage Check**: `GET /api/rollback/storage`
- **Full Docs**: See `services/wizard/ROLLBACK_RECOVERY_GUIDE.md`

---

**Status**: ✅ Fully Implemented and Tested  
**Date**: November 21, 2025  
**Task**: 6.5.12 Rollback and recovery
