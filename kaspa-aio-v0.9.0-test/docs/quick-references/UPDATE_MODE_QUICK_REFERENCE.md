# Update Mode Quick Reference

## Overview

Quick reference for using and testing the Kaspa All-in-One Wizard update mode functionality.

## Accessing Update Mode

### From Dashboard
```javascript
// Launch wizard in update mode
window.location.href = '/wizard?mode=update';

// With pre-selected updates
const updates = [
  { service: 'kaspa-node', currentVersion: '1.0.0', latestVersion: '1.0.1', updateAvailable: true }
];
const url = `/wizard?mode=update&updates=${encodeURIComponent(JSON.stringify(updates))}`;
window.open(url, '_blank');
```

### Direct URL
```
http://localhost:3000/wizard?mode=update
```

## API Endpoints

### Check Available Updates
```bash
curl http://localhost:3000/api/wizard/updates/available
```

**Response**:
```json
{
  "success": true,
  "updates": [
    {
      "service": "kaspa-node",
      "currentVersion": "1.0.0",
      "latestVersion": "1.0.1",
      "updateAvailable": true,
      "repository": "kaspanet/kaspad",
      "breaking": false,
      "releaseDate": "2024-01-15T10:00:00Z"
    }
  ],
  "hasUpdates": true
}
```

### Get Changelog
```bash
curl http://localhost:3000/api/wizard/updates/changelog/kaspa-node/1.0.1
```

### Apply Updates
```bash
curl -X POST http://localhost:3000/api/wizard/updates/apply \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      { "service": "kaspa-node", "version": "1.0.1" }
    ],
    "createBackup": true
  }'
```

### Rollback
```bash
curl -X POST http://localhost:3000/api/wizard/updates/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "backupTimestamp": 1705315200000
  }'
```

## Testing

### Run Backend Tests
```bash
node services/wizard/backend/test-update-mode.js
```

### Open Test UI
```bash
# In browser
open http://localhost:3000/test-update-mode.html
```

### Manual Testing Workflow

1. **Setup Mock Installation State**
   ```bash
   # Create mock installation state
   mkdir -p .kaspa-aio
   cat > .kaspa-aio/installation-state.json << 'EOF'
   {
     "version": "1.0.0",
     "installedAt": "2024-01-15T10:00:00Z",
     "services": [
       { "name": "kaspa-node", "version": "1.0.0", "status": "running" },
       { "name": "kasia-app", "version": "1.0.0", "status": "running" }
     ]
   }
   EOF
   ```

2. **Check for Updates**
   ```bash
   curl http://localhost:3000/api/wizard/updates/available
   ```

3. **Open Update UI**
   ```bash
   open http://localhost:3000/wizard?mode=update
   ```

4. **Apply Updates**
   - Select services to update
   - Click "Apply Selected Updates"
   - Monitor progress
   - View results

5. **Test Rollback** (if needed)
   - Click "Rollback All Changes"
   - Confirm rollback
   - Verify services restored

## Update Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Dashboard detects updates available                  │
│    - Check GitHub releases                              │
│    - Compare with current versions                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User clicks "Apply Updates" in dashboard            │
│    - Dashboard launches wizard in update mode           │
│    - Passes update list via URL parameter              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Wizard displays update interface                    │
│    - Show available updates                             │
│    - Display version changes                            │
│    - Highlight breaking changes                         │
│    - Allow selective updates                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. User selects updates and confirms                   │
│    - Review selected updates                            │
│    - View changelogs                                    │
│    - Confirm update                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Wizard creates backup                               │
│    - Backup .env                                        │
│    - Backup docker-compose.yml                          │
│    - Backup installation-state.json                     │
│    - Create backup metadata                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Apply updates (for each service)                    │
│    - Stop service                                       │
│    - Update docker-compose.yml                          │
│    - Pull new image                                     │
│    - Start service                                      │
│    - Wait for health check                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Display results                                      │
│    - Show success/failure per service                   │
│    - Offer rollback if failures                         │
│    - Return to dashboard                                │
└─────────────────────────────────────────────────────────┘
```

## Common Issues

### Issue: No updates available
**Solution**: Check installation state exists and has service versions

### Issue: Update fails with health check timeout
**Solution**: 
- Check service logs
- Verify service configuration
- Use rollback to restore previous version

### Issue: Backup creation fails
**Solution**: Check file permissions and disk space

### Issue: Rollback fails
**Solution**: Manually restore from `.kaspa-backups/[timestamp]/`

## File Locations

### Configuration Files
- `.env` - Environment variables
- `docker-compose.yml` - Service definitions
- `.kaspa-aio/installation-state.json` - Installation state

### Backup Location
- `.kaspa-backups/[timestamp]/` - Timestamped backups
- `.kaspa-backups/[timestamp]/backup-metadata.json` - Backup info

### Logs
- Check Docker logs: `docker logs [service-name]`
- Check wizard logs: Browser console

## Integration with Dashboard

### Dashboard Code Example
```javascript
// Check for updates
async function checkForUpdates() {
  const response = await fetch('/api/wizard/updates/available');
  const data = await response.json();
  
  if (data.hasUpdates) {
    showUpdateNotification(data.updates);
  }
}

// Show update notification
function showUpdateNotification(updates) {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <p>${updates.length} update(s) available</p>
    <button onclick="launchUpdateWizard(${JSON.stringify(updates)})">
      Apply Updates
    </button>
  `;
  document.body.appendChild(notification);
}

// Launch update wizard
function launchUpdateWizard(updates) {
  const url = `/wizard?mode=update&updates=${encodeURIComponent(JSON.stringify(updates))}`;
  window.open(url, '_blank');
}
```

## Security Considerations

1. **Backup Before Updates**
   - Always create backup before applying updates
   - Verify backup creation succeeded
   - Keep multiple backup versions

2. **Version Verification**
   - Verify update sources (GitHub releases)
   - Check digital signatures
   - Validate checksums

3. **Rollback Plan**
   - Test rollback procedure
   - Keep recent backups
   - Document rollback steps

4. **Service Dependencies**
   - Check service dependencies before updating
   - Update dependent services together
   - Test after updates

## Best Practices

1. **Before Updating**
   - Review changelogs
   - Check for breaking changes
   - Backup configuration
   - Plan maintenance window

2. **During Update**
   - Monitor progress
   - Watch for errors
   - Keep logs
   - Don't interrupt process

3. **After Update**
   - Verify all services healthy
   - Test critical functionality
   - Monitor for issues
   - Keep backup for 24-48 hours

## Quick Commands

```bash
# Check for updates
curl http://localhost:3000/api/wizard/updates/available | jq

# Apply single update
curl -X POST http://localhost:3000/api/wizard/updates/apply \
  -H "Content-Type: application/json" \
  -d '{"updates":[{"service":"kaspa-node","version":"1.0.1"}],"createBackup":true}' | jq

# List backups
ls -la .kaspa-backups/

# View backup metadata
cat .kaspa-backups/[timestamp]/backup-metadata.json | jq

# Rollback to specific backup
curl -X POST http://localhost:3000/api/wizard/updates/rollback \
  -H "Content-Type: application/json" \
  -d '{"backupTimestamp":1705315200000}' | jq
```

## Related Documentation

- [Update Mode Implementation](../implementation-summaries/wizard/UPDATE_MODE_IMPLEMENTATION.md)
- [Reconfiguration Mode](RECONFIGURATION_MODE_QUICK_REFERENCE.md)
- [Wizard Mode Detection](WIZARD_MODE_DETECTION_QUICK_REFERENCE.md)
- [Rollback System](ROLLBACK_QUICK_START.md)
