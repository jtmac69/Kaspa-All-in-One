# Wizard Mode Detection Quick Reference

## Overview

The wizard automatically detects its operating mode based on URL parameters and existing configuration files. Three modes are supported: initial installation, reconfiguration, and update.

## Modes

### Initial Mode
- **Purpose**: Fresh installation
- **Triggered**: No configuration exists OR `?mode=install` parameter
- **Behavior**: Full wizard flow from welcome screen

### Reconfiguration Mode
- **Purpose**: Modify existing installation
- **Triggered**: Configuration exists OR `?mode=reconfigure` parameter
- **Behavior**: Loads existing config, skips welcome/system check

### Update Mode
- **Purpose**: Update services (future)
- **Triggered**: `?mode=update` parameter
- **Behavior**: Currently routes to reconfiguration mode

## URL Parameters

```bash
# Initial installation (fresh)
http://localhost:3000/

# Force initial mode (ignore existing config)
http://localhost:3000/?mode=install

# Reconfiguration mode
http://localhost:3000/?mode=reconfigure

# Update mode
http://localhost:3000/?mode=update
```

## API Endpoints

### Detect Mode
```bash
GET /api/wizard/mode
GET /api/wizard/mode?mode=reconfigure

Response:
{
  "mode": "initial|reconfigure|update",
  "reason": "Why this mode was selected",
  "hasExistingConfig": true|false,
  "hasInstallationState": true|false,
  "canReconfigure": true|false,
  "canUpdate": true|false
}
```

### Load Current Config
```bash
GET /api/wizard/current-config

Response (200):
{
  "success": true,
  "config": { /* .env values */ },
  "installationState": { /* state */ },
  "profiles": ["core", "..."],
  "installedAt": "2024-01-15T10:30:00.000Z",
  "lastModified": "2024-01-15T10:45:00.000Z"
}

Response (404):
{
  "success": false,
  "error": "No existing configuration found"
}
```

## Mode Detection Logic

```
1. Check URL parameter (?mode=...)
   ↓ If present → Use that mode
   
2. Check installation-state.json
   ↓ If phase=complete → reconfigure mode
   ↓ If phase≠complete → initial mode
   
3. Check .env file
   ↓ If exists → reconfigure mode
   
4. Default → initial mode
```

## Testing

### Run Backend Tests
```bash
# Mode detection tests
node services/wizard/backend/test-mode-detection.js

# Configuration loading tests
node services/wizard/backend/test-current-config.js
```

### Interactive Frontend Test
```bash
# Open in browser
open services/wizard/frontend/test-mode-detection.html
```

## Dashboard Integration

### Launch Wizard from Dashboard

```javascript
// Reconfigure existing installation
window.open('http://localhost:3000/?mode=reconfigure', '_blank');

// Update services
window.open('http://localhost:3000/?mode=update', '_blank');

// Fresh installation
window.open('http://localhost:3000/?mode=install', '_blank');
```

## State Manager Integration

```javascript
// Get current mode
const mode = stateManager.get('wizardMode');
// Returns: 'initial', 'reconfigure', or 'update'

// Get full mode info
const modeInfo = stateManager.get('wizardModeInfo');
// Returns: { mode, reason, hasExistingConfig, ... }

// Get loaded configuration (reconfigure mode)
const config = stateManager.get('existingConfig');
const profiles = stateManager.get('existingProfiles');
```

## Files

### Backend
- `services/wizard/backend/src/server.js` - Mode detection endpoints

### Frontend
- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Mode handling

### Tests
- `services/wizard/backend/test-mode-detection.js` - Backend tests
- `services/wizard/backend/test-current-config.js` - Config loading tests
- `services/wizard/frontend/test-mode-detection.html` - Interactive test

## Common Scenarios

### Scenario 1: Fresh Installation
```
User visits: http://localhost:3000/
Files: None
Result: mode=initial, full wizard flow
```

### Scenario 2: Reconfigure from Dashboard
```
User clicks: "Reconfigure" button
Dashboard opens: http://localhost:3000/?mode=reconfigure
Files: .env + installation-state.json exist
Result: mode=reconfigure, loads existing config
```

### Scenario 3: Incomplete Installation
```
User visits: http://localhost:3000/
Files: installation-state.json (phase=building)
Result: mode=initial, resume or start over
```

### Scenario 4: Manual Configuration Exists
```
User visits: http://localhost:3000/
Files: .env exists, no installation-state.json
Result: mode=reconfigure, loads .env values
```

## Troubleshooting

### Mode Detection Not Working
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check mode endpoint: `curl http://localhost:3000/api/wizard/mode`
3. Check browser console for errors
4. Verify URL parameters are correct

### Configuration Not Loading
1. Check .env file exists: `ls -la .env`
2. Check installation state: `cat .kaspa-aio/installation-state.json`
3. Test endpoint: `curl http://localhost:3000/api/wizard/current-config`
4. Check file permissions

### Wrong Mode Detected
1. Check URL parameters
2. Check file existence (.env, installation-state.json)
3. Check installation phase in state file
4. Use URL parameter to override: `?mode=reconfigure`

## Requirements

✅ **Requirement 7**: Configuration Persistence  
✅ **Requirement 13**: Reconfiguration and Update Management

## Related Tasks

- **6.8.2**: Build reconfiguration mode (next)
- **6.8.3**: Implement update mode
- **6.8.4**: Create configuration backup system
- **6.8.5**: Build dashboard integration points
