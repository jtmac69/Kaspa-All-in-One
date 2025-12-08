# Wizard Mode Detection Implementation

**Task**: 6.8.1 Implement wizard mode detection  
**Date**: 2024-11-25  
**Status**: ✅ Complete

## Overview

Implemented comprehensive wizard mode detection that allows the wizard to operate in three distinct modes: initial installation, reconfiguration, and update. The wizard automatically detects the appropriate mode based on URL parameters and existing configuration files.

## Implementation Details

### Backend Changes

#### 1. Enhanced Mode Detection Endpoint (`/api/wizard/mode`)

**File**: `services/wizard/backend/src/server.js`

**Features**:
- Detects mode from URL parameter (`?mode=install|reconfigure|update`)
- Checks for existing `.env` file
- Checks for existing `installation-state.json` file
- Determines appropriate mode based on file presence and installation phase
- Returns comprehensive mode information

**Mode Detection Logic**:
```javascript
// Priority order:
1. URL parameter (if provided) - highest priority
2. Installation state + .env existence
3. Installation state alone
4. .env file alone
5. Default to 'initial' mode
```

**Response Format**:
```json
{
  "mode": "initial|reconfigure|update",
  "reason": "Explanation of why this mode was selected",
  "hasExistingConfig": true|false,
  "hasInstallationState": true|false,
  "installationPhase": "complete|building|etc",
  "canReconfigure": true|false,
  "canUpdate": true|false,
  "isFirstRun": true|false,
  "autoStart": true|false
}
```

#### 2. Current Configuration Loading Endpoint (`/api/wizard/current-config`)

**File**: `services/wizard/backend/src/server.js`

**Features**:
- Loads existing `.env` file and parses configuration
- Loads existing `installation-state.json` file
- Returns configuration, profiles, and installation metadata
- Returns 404 if no configuration exists

**Response Format**:
```json
{
  "success": true,
  "config": { /* parsed .env values */ },
  "installationState": { /* installation state object */ },
  "profiles": ["core", "kaspa-user-applications"],
  "lastModified": "2024-01-15T10:45:00.000Z",
  "installedAt": "2024-01-15T10:30:00.000Z"
}
```

### Frontend Changes

#### 1. Mode Detection on Initialization

**File**: `services/wizard/frontend/public/scripts/wizard-refactored.js`

**Features**:
- Calls `/api/wizard/mode` on wizard load
- Stores mode information in state manager
- Routes to appropriate handler based on mode

**Functions Added**:
- `detectWizardMode()` - Detects mode from backend
- `handleInitialMode()` - Handles fresh installation
- `handleReconfigurationMode()` - Handles reconfiguration
- `handleUpdateMode()` - Handles updates (placeholder)
- `updateWizardTitle()` - Updates wizard title based on mode

#### 2. Reconfiguration Mode Handling

**Features**:
- Loads existing configuration via `/api/wizard/current-config`
- Pre-populates wizard state with existing values
- Skips welcome and system check steps
- Starts from profile selection step
- Shows notification about loaded configuration

#### 3. UI Adjustments

**Features**:
- Updates wizard title based on mode
- Shows appropriate notifications
- Adjusts step flow based on mode
- Preserves existing configuration in state

## Mode Behaviors

### Initial Mode (`mode=initial`)

**Triggered When**:
- No `.env` or `installation-state.json` exists
- Installation state shows incomplete installation
- URL parameter `?mode=install` is provided

**Behavior**:
- Full wizard flow from welcome screen
- System checks required
- Fresh configuration
- No pre-populated values

### Reconfiguration Mode (`mode=reconfigure`)

**Triggered When**:
- `.env` file exists
- `installation-state.json` exists with `phase=complete`
- URL parameter `?mode=reconfigure` is provided

**Behavior**:
- Loads existing configuration
- Pre-populates wizard with current values
- Skips welcome and system check
- Starts from profile selection
- Allows modification of existing setup

### Update Mode (`mode=update`)

**Triggered When**:
- URL parameter `?mode=update` is provided
- Both `.env` and complete installation state exist

**Behavior**:
- Currently routes to reconfiguration mode
- Placeholder for future update functionality
- Will show available service updates
- Will allow selective updates

## Testing

### Backend Tests

#### 1. Mode Detection Tests (`test-mode-detection.js`)

**Tests**:
1. ✅ Fresh installation (no files) → `initial`
2. ✅ Only .env exists → `reconfigure`
3. ✅ Only installation state exists → `reconfigure`
4. ✅ Complete installation (both files) → `reconfigure`
5. ✅ Incomplete installation → `initial`
6. ✅ URL parameter overrides (mode=install) → `initial`
7. ✅ URL parameter overrides (mode=reconfigure) → `reconfigure`
8. ✅ URL parameter overrides (mode=update) → `update`

**Result**: All 8 tests pass ✅

#### 2. Configuration Loading Tests (`test-current-config.js`)

**Tests**:
1. ✅ Load existing configuration
2. ✅ Handle missing configuration (404)

**Result**: All 2 tests pass ✅

### Frontend Tests

#### Interactive Test Page (`test-mode-detection.html`)

**Features**:
- Test mode detection with different URL parameters
- Test configuration loading
- Test full initialization flow
- Visual display of mode information
- Real-time testing interface

**Access**: Open `services/wizard/frontend/test-mode-detection.html` in browser

## Files Modified

### Backend
- `services/wizard/backend/src/server.js` - Added mode detection and config loading endpoints

### Frontend
- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Added mode detection and handling

## Files Created

### Tests
- `services/wizard/backend/test-mode-detection.js` - Backend mode detection tests
- `services/wizard/backend/test-current-config.js` - Configuration loading tests
- `services/wizard/frontend/test-mode-detection.html` - Interactive frontend test page

### Documentation
- `docs/implementation-summaries/wizard/WIZARD_MODE_DETECTION_IMPLEMENTATION.md` - This file

## Usage Examples

### Initial Installation
```
http://localhost:3000/
→ Detects no configuration
→ Mode: initial
→ Full wizard flow
```

### Reconfiguration from Dashboard
```
http://localhost:3000/?mode=reconfigure
→ Loads existing configuration
→ Mode: reconfigure
→ Pre-populated wizard
```

### Force Fresh Installation
```
http://localhost:3000/?mode=install
→ Ignores existing configuration
→ Mode: initial
→ Fresh installation
```

### Update Services
```
http://localhost:3000/?mode=update
→ Prepares for updates
→ Mode: update
→ Update interface (future)
```

## Integration Points

### Dashboard Integration
The dashboard can launch the wizard in different modes:
- **Reconfigure Button**: `?mode=reconfigure`
- **Update Button**: `?mode=update`
- **Fresh Install**: No parameters

### State Manager Integration
Mode information is stored in state manager:
```javascript
stateManager.get('wizardMode') // 'initial', 'reconfigure', or 'update'
stateManager.get('wizardModeInfo') // Full mode detection response
stateManager.get('existingConfig') // Loaded configuration (reconfigure mode)
stateManager.get('existingProfiles') // Loaded profiles (reconfigure mode)
```

## Future Enhancements

### Update Mode Implementation (Task 6.8.3)
- Display available service updates
- Show version information and changelogs
- Allow selective updates
- Handle update failures with rollback

### Configuration Backup (Task 6.8.4)
- Automatic backup before reconfiguration
- Timestamped backup directories
- Rollback capability

### Enhanced Reconfiguration (Task 6.8.2)
- Show diff of configuration changes
- Backup before applying changes
- Restart only affected services
- Validation before applying

## Requirements Satisfied

✅ **Requirement 7**: Configuration Persistence
- Loads saved configuration for modification
- Allows reconfiguration without starting from scratch

✅ **Requirement 13**: Reconfiguration and Update Management
- Detects existing installations
- Loads current configuration
- Allows modification through wizard
- Supports different modes for different use cases

## Success Criteria

✅ Mode detection works correctly in all scenarios  
✅ URL parameters override automatic detection  
✅ Existing configuration loads successfully  
✅ Wizard UI adjusts based on mode  
✅ All backend tests pass (10/10)  
✅ Frontend integration works  
✅ Documentation complete  

## Next Steps

1. **Task 6.8.2**: Build reconfiguration mode
   - Implement configuration diff display
   - Add backup before changes
   - Handle service restarts

2. **Task 6.8.3**: Implement update mode
   - Service version detection
   - Update interface
   - Selective updates

3. **Task 6.8.4**: Create configuration backup system
   - Automatic backups
   - Rollback capability
   - Backup management

## Notes

- Mode detection is robust and handles edge cases
- URL parameters provide flexibility for dashboard integration
- Existing configuration loading preserves user settings
- Tests provide confidence in mode detection logic
- Ready for dashboard integration
