# Dashboard Integration Quick Reference

## Overview

The Dashboard Integration API provides secure communication between the Kaspa Dashboard and the Installation Wizard, enabling seamless reconfiguration, updates, and status synchronization.

## Key Features

- **Secure Token-Based Access**: Time-limited tokens (15 minutes) for wizard access
- **Multiple Launch Modes**: Install, Reconfigure, and Update modes
- **Status Synchronization**: Bidirectional service status updates
- **Auto-Cleanup**: Automatic expiration and cleanup of tokens

## API Endpoints

### 1. Generate Reconfigure Link

**Endpoint**: `GET /api/wizard/reconfigure-link`

**Purpose**: Generate a secure link for dashboard to launch wizard in reconfiguration mode

**Response**:
```json
{
  "success": true,
  "url": "http://localhost:3000/?mode=reconfigure&token=abc123...",
  "token": "abc123...",
  "expiresIn": 900000,
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "message": "Reconfiguration link generated successfully"
}
```

**Usage**:
```javascript
// Dashboard calls this to get a reconfigure link
const response = await fetch('http://localhost:3000/api/wizard/reconfigure-link');
const { url } = await response.json();
window.open(url, '_blank'); // Open wizard in new tab
```

---

### 2. Generate Update Link

**Endpoint**: `GET /api/wizard/update-link?updates=[...]`

**Purpose**: Generate a secure link for dashboard to launch wizard in update mode

**Query Parameters**:
- `updates`: JSON array of available updates

**Update Object Format**:
```json
{
  "service": "kaspa-node",
  "currentVersion": "1.0.0",
  "availableVersion": "1.1.0",
  "changelog": "Bug fixes and improvements",
  "breaking": false,
  "releaseDate": "2024-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "url": "http://localhost:3000/?mode=update&token=abc123...",
  "token": "abc123...",
  "updates": [...],
  "expiresIn": 900000,
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "message": "Update link generated successfully"
}
```

**Usage**:
```javascript
// Dashboard detects updates and generates link
const updates = [
  {
    service: 'kaspa-node',
    currentVersion: '1.0.0',
    availableVersion: '1.1.0',
    changelog: 'Performance improvements',
    breaking: false,
    releaseDate: '2024-01-01'
  }
];

const response = await fetch(
  `http://localhost:3000/api/wizard/update-link?updates=${encodeURIComponent(JSON.stringify(updates))}`
);
const { url } = await response.json();
window.open(url, '_blank');
```

---

### 3. Retrieve Token Data

**Endpoint**: `GET /api/wizard/token-data?token=abc123`

**Purpose**: Retrieve configuration/update data associated with a token (used by wizard frontend)

**Query Parameters**:
- `token`: Security token from URL

**Response**:
```json
{
  "success": true,
  "mode": "reconfigure",
  "purpose": "reconfiguration",
  "data": {
    "currentConfig": {...},
    "installationState": {...}
  },
  "expiresAt": "2024-01-01T12:00:00.000Z"
}
```

**Usage**:
```javascript
// Wizard frontend loads token data on startup
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  const response = await fetch(`/api/wizard/token-data?token=${token}`);
  const { mode, data } = await response.json();
  
  // Load configuration based on mode
  if (mode === 'reconfigure') {
    loadConfiguration(data.currentConfig);
  } else if (mode === 'update') {
    showUpdates(data.updates);
  }
}
```

---

### 4. Sync Status

**Endpoint**: `POST /api/wizard/sync-status`

**Purpose**: Synchronize service status between wizard and dashboard

**Request Body**:
```json
{
  "source": "dashboard",
  "services": [
    { "name": "kaspa-node", "status": "running" },
    { "name": "dashboard", "status": "running" }
  ],
  "wizardState": {
    "currentStep": 5,
    "phase": "validating"
  }
}
```

**Response**:
```json
{
  "success": true,
  "services": [
    {
      "name": "kaspa-node",
      "status": "running",
      "state": "running",
      "containerId": "abc123",
      "uptime": 3600
    }
  ],
  "wizardState": {...},
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Usage**:
```javascript
// Dashboard syncs status
const response = await fetch('http://localhost:3000/api/wizard/sync-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'dashboard',
    services: currentServices
  })
});

const { services, wizardState } = await response.json();
updateDashboard(services, wizardState);
```

---

### 5. Launch Wizard

**Endpoint**: `POST /api/wizard/launcher`

**Purpose**: Programmatically launch wizard with specific mode

**Request Body**:
```json
{
  "mode": "reconfigure",
  "updates": [...],
  "autoOpen": false
}
```

**Modes**:
- `install`: Fresh installation
- `reconfigure`: Modify existing configuration
- `update`: Apply service updates

**Response**:
```json
{
  "success": true,
  "url": "http://localhost:3000/?mode=reconfigure&token=abc123...",
  "token": "abc123...",
  "mode": "reconfigure",
  "expiresIn": 900000,
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "message": "Wizard launched in reconfigure mode"
}
```

**Usage**:
```javascript
// Launch wizard programmatically
const response = await fetch('http://localhost:3000/api/wizard/launcher', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'reconfigure',
    autoOpen: true // Automatically open browser
  })
});

const { url } = await response.json();
// Browser will open automatically if autoOpen: true
```

---

### 6. Health Check

**Endpoint**: `GET /api/wizard/health`

**Purpose**: Verify wizard is running and responsive

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Usage**:
```javascript
// Dashboard checks if wizard is available
try {
  const response = await fetch('http://localhost:3000/api/wizard/health');
  const { status } = await response.json();
  
  if (status === 'healthy') {
    enableWizardFeatures();
  }
} catch (error) {
  console.log('Wizard not available');
}
```

---

### 7. Invalidate Token

**Endpoint**: `DELETE /api/wizard/token/:token`

**Purpose**: Invalidate a token (logout/cleanup)

**Response**:
```json
{
  "success": true,
  "message": "Token invalidated",
  "existed": true
}
```

**Usage**:
```javascript
// Wizard invalidates token on completion
const token = getCurrentToken();
await fetch(`http://localhost:3000/api/wizard/token/${token}`, {
  method: 'DELETE'
});
```

---

## Integration Workflows

### Workflow 1: Reconfiguration from Dashboard

```javascript
// 1. Dashboard: Generate reconfigure link
const response = await fetch('http://localhost:3000/api/wizard/reconfigure-link');
const { url, token } = await response.json();

// 2. Dashboard: Open wizard in new tab
window.open(url, '_blank');

// 3. Wizard: Load token data
const tokenResponse = await fetch(`/api/wizard/token-data?token=${token}`);
const { data } = await tokenResponse.json();

// 4. Wizard: Load current configuration
loadConfiguration(data.currentConfig);

// 5. User: Makes changes in wizard

// 6. Wizard: Apply changes via reconfigure API
await fetch('/api/reconfigure', {
  method: 'POST',
  body: JSON.stringify({ config: newConfig, profiles: selectedProfiles })
});

// 7. Wizard: Invalidate token
await fetch(`/api/wizard/token/${token}`, { method: 'DELETE' });

// 8. Wizard: Redirect back to dashboard
window.location.href = 'http://localhost:8080/dashboard';
```

### Workflow 2: Service Updates from Dashboard

```javascript
// 1. Dashboard: Check for updates
const updates = await checkForUpdates();

// 2. Dashboard: Generate update link
const response = await fetch(
  `/api/wizard/update-link?updates=${encodeURIComponent(JSON.stringify(updates))}`
);
const { url } = await response.json();

// 3. Dashboard: Open wizard
window.open(url, '_blank');

// 4. Wizard: Load updates from token
const tokenResponse = await fetch(`/api/wizard/token-data?token=${token}`);
const { data } = await tokenResponse.json();

// 5. Wizard: Display updates
showUpdates(data.updates);

// 6. User: Selects updates to apply

// 7. Wizard: Apply updates
await fetch('/api/wizard/updates/apply', {
  method: 'POST',
  body: JSON.stringify({ updates: selectedUpdates })
});

// 8. Wizard: Return to dashboard
window.location.href = 'http://localhost:8080/dashboard';
```

### Workflow 3: Status Synchronization

```javascript
// Dashboard periodically syncs status
setInterval(async () => {
  const response = await fetch('http://localhost:3000/api/wizard/sync-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'dashboard',
      services: getCurrentServices()
    })
  });
  
  const { services, wizardState } = await response.json();
  
  // Update dashboard with latest status
  updateServiceStatus(services);
  
  // Check if wizard is active
  if (wizardState && wizardState.phase !== 'complete') {
    showWizardActiveIndicator();
  }
}, 5000); // Every 5 seconds
```

---

## Security Considerations

### Token Security

- **Time-Limited**: Tokens expire after 15 minutes
- **Single-Use Recommended**: Invalidate tokens after use
- **Secure Generation**: Uses crypto.randomBytes(32)
- **No Persistence**: Tokens stored in memory only

### Best Practices

1. **Always use HTTPS in production**
2. **Invalidate tokens after use**
3. **Don't log tokens**
4. **Validate token on every request**
5. **Use CORS appropriately**

---

## Error Handling

### Common Errors

**404 - No Configuration Found**
```json
{
  "success": false,
  "error": "No existing configuration found",
  "message": "Cannot reconfigure without an existing installation"
}
```

**401 - Invalid Token**
```json
{
  "success": false,
  "error": "Token expired",
  "message": "Invalid or expired token"
}
```

**400 - Invalid Request**
```json
{
  "success": false,
  "error": "Invalid mode",
  "message": "Mode must be 'install', 'reconfigure', or 'update'"
}
```

---

## Testing

### Run Integration Tests

```bash
# Start wizard server
node services/wizard/backend/src/server.js

# Run tests
node services/wizard/backend/test-dashboard-integration.js
```

### Test Coverage

- ✅ Health check endpoint
- ✅ Generate reconfigure link
- ✅ Generate update link
- ✅ Retrieve token data
- ✅ Invalid token handling
- ✅ Status synchronization (dashboard → wizard)
- ✅ Status synchronization (wizard → dashboard)
- ✅ Launch wizard (install mode)
- ✅ Launch wizard (reconfigure mode)
- ✅ Launch wizard (update mode)
- ✅ Invalid launcher mode rejection
- ✅ Token deletion/invalidation

---

## Configuration

### Environment Variables

```bash
# Wizard host (default: localhost)
WIZARD_HOST=localhost

# Wizard port (default: 3000)
WIZARD_PORT=3000

# Wizard version
WIZARD_VERSION=1.0.0

# Project root (for file access)
PROJECT_ROOT=/path/to/kaspa-aio
```

---

## Files

- **API**: `services/wizard/backend/src/api/dashboard-integration.js`
- **Tests**: `services/wizard/backend/test-dashboard-integration.js`
- **Server**: `services/wizard/backend/src/server.js`

---

## Related Documentation

- [Reconfiguration Mode Quick Reference](RECONFIGURATION_MODE_QUICK_REFERENCE.md)
- [Update Mode Quick Reference](UPDATE_MODE_QUICK_REFERENCE.md)
- [Wizard State Persistence Quick Reference](WIZARD_STATE_PERSISTENCE_QUICK_REFERENCE.md)
- [Backup System Quick Reference](BACKUP_SYSTEM_QUICK_REFERENCE.md)

---

## Support

For issues or questions:
1. Check wizard logs: `services/wizard/backend/logs/`
2. Verify wizard is running: `curl http://localhost:3000/api/wizard/health`
3. Check token expiration times
4. Review CORS settings for cross-origin requests
