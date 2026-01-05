# Reconfiguration Mode Detection - Implementation Summary

## Overview

Task 14.1 has been implemented to add reconfiguration mode detection to the Wizard. The wizard now properly detects when an existing installation exists and enters reconfiguration mode accordingly.

## Implementation Details

### Backend Changes

#### 1. Updated `/api/wizard/mode` Endpoint (server.js)

**Location**: `services/wizard/backend/src/server.js` (lines 207-268)

**Changes**:
- Integrated `SharedStateManager` from `services/shared/lib/state-manager.js`
- Replaced manual file reading with `stateManager.readState()`
- Maintains all existing logic for mode detection

**Mode Detection Logic**:
1. **URL Parameter Priority**: If `?mode=` parameter is provided, it takes precedence
2. **Installation State Check**: Uses `SharedStateManager` to read `.kaspa-aio/installation-state.json`
3. **Mode Determination**:
   - `mode: 'reconfigure'` - When installation state exists with `phase: 'complete'`
   - `mode: 'initial'` - When no installation state exists or phase is not 'complete'
   - `mode: 'update'` - When explicitly requested via URL parameter

**Response Format**:
```json
{
  "mode": "reconfigure",
  "reason": "Installation complete, configuration exists",
  "autoStart": false,
  "isFirstRun": false,
  "hasExistingConfig": true,
  "hasInstallationState": true,
  "installationPhase": "complete",
  "canReconfigure": true,
  "canUpdate": true
}
```

#### 2. Updated `/api/wizard/current-config` Endpoint (server.js)

**Location**: `services/wizard/backend/src/server.js` (lines 148-180)

**Changes**:
- Integrated `SharedStateManager` for reading installation state
- Replaced manual JSON parsing with `stateManager.readState()`
- Maintains backward compatibility with existing API

### Frontend Integration

The frontend already has complete reconfiguration mode support:

#### 1. Mode Detection (wizard-refactored.js)

**Function**: `detectWizardMode()` (line 289)
- Calls `/api/wizard/mode` endpoint
- Returns mode information to the initialization flow

#### 2. Mode Handling (wizard-refactored.js)

**Function**: `handleReconfigurationMode()` (line 351)
- Updates wizard title to "Reconfigure Kaspa All-in-One"
- Initializes reconfiguration navigation
- Shows reconfiguration breadcrumbs
- Displays reconfiguration landing page

#### 3. Reconfiguration Landing Page (index.html)

**Element**: `#step-reconfigure-landing` (line 145)

**Features**:
- Current installation summary with status indicators
- Three reconfiguration action cards:
  1. **Add New Profiles** - Install additional services
  2. **Modify Configuration** - Change settings for existing services
  3. **Remove Profiles** - Uninstall services
- Profile status overview grid
- Configuration suggestions

### Shared State Manager

**Location**: `services/shared/lib/state-manager.js`

**Key Methods Used**:
- `readState()` - Reads and validates installation state
- `hasInstallation()` - Checks if installation exists
- `_isValidState()` - Validates state schema

**State Schema Validation**:
The SharedStateManager validates that the state contains all required fields:
- `version` - Schema version
- `installedAt` - Installation timestamp
- `lastModified` - Last modification timestamp
- `phase` - Installation phase ('complete', 'installing', 'pending', 'error')
- `profiles` - Object with `selected` array and `count` number
- `configuration` - Configuration object
- `services` - Array of service entries
- `summary` - Object with service counts

## Testing

### Test File Created

**Location**: `services/wizard/backend/test-reconfiguration-mode-detection.js`

**Test Coverage**:
1. ✓ No installation state - returns null
2. ✓ Installation state with phase 'complete' - returns state
3. ✓ Installation state with phase 'installing' - returns state
4. ✓ hasInstallation() method - returns true/false correctly
5. ✓ State schema validation - validates all required fields

**Test Results**: All tests passed ✓

### Manual Testing Steps

To manually test the reconfiguration mode detection:

1. **Fresh Installation Mode**:
   ```bash
   # Remove any existing state
   rm -f .kaspa-aio/installation-state.json
   rm -f .env
   
   # Start wizard
   cd services/wizard/backend
   node src/server.js
   
   # Visit http://localhost:3000
   # Should show: "Welcome to Kaspa All-in-One" (initial mode)
   ```

2. **Reconfiguration Mode**:
   ```bash
   # Create a complete installation state
   mkdir -p .kaspa-aio
   cat > .kaspa-aio/installation-state.json << 'EOF'
   {
     "version": "1.0.0",
     "installedAt": "2025-01-04T00:00:00.000Z",
     "lastModified": "2025-01-04T00:00:00.000Z",
     "phase": "complete",
     "profiles": {
       "selected": ["core"],
       "count": 1
     },
     "configuration": {
       "network": "mainnet",
       "publicNode": false,
       "hasIndexers": false,
       "hasArchive": false,
       "hasMining": false
     },
     "services": [
       {
         "name": "kaspa-node",
         "displayName": "Kaspa Node",
         "profile": "core",
         "running": true,
         "exists": true
       }
     ],
     "summary": {
       "total": 1,
       "running": 1,
       "stopped": 0,
       "missing": 0
     }
   }
   EOF
   
   # Start wizard
   cd services/wizard/backend
   node src/server.js
   
   # Visit http://localhost:3000
   # Should show: "Reconfigure Your Installation" (reconfiguration mode)
   ```

3. **API Testing**:
   ```bash
   # Test mode detection endpoint
   curl http://localhost:3000/api/wizard/mode
   
   # Expected response (with state file):
   # {
   #   "mode": "reconfigure",
   #   "reason": "Installation complete, configuration exists",
   #   "hasExistingConfig": true,
   #   "hasInstallationState": true,
   #   "installationPhase": "complete",
   #   "canReconfigure": true,
   #   "canUpdate": true
   # }
   ```

## Requirements Validation

**Requirement 5.1**: ✓ WHEN the Wizard loads and installation state exists, THE Wizard SHALL enter reconfiguration mode

**Implementation**:
- Backend `/api/wizard/mode` endpoint checks for installation state using SharedStateManager
- Returns `mode: 'reconfigure'` when state exists with `phase: 'complete'`
- Frontend `detectWizardMode()` calls the endpoint and stores mode in state
- Frontend `handleReconfigurationMode()` is called when mode is 'reconfigure'
- Reconfiguration landing page is displayed with current installation summary

## Files Modified

1. `services/wizard/backend/src/server.js`
   - Updated `/api/wizard/mode` endpoint to use SharedStateManager
   - Updated `/api/wizard/current-config` endpoint to use SharedStateManager

## Files Created

1. `services/wizard/backend/test-reconfiguration-mode-detection.js`
   - Comprehensive test suite for mode detection
   - Tests SharedStateManager integration
   - Validates state schema

2. `services/wizard/backend/RECONFIGURATION_MODE_DETECTION_SUMMARY.md`
   - This summary document

## Integration with Existing Code

The implementation integrates seamlessly with existing code:

1. **No Breaking Changes**: All existing functionality is preserved
2. **Backward Compatible**: API responses maintain the same format
3. **Shared State**: Uses the SharedStateManager from the shared library
4. **Frontend Ready**: Frontend already has complete reconfiguration UI

## Next Steps

The following tasks in the spec can now proceed:

- **Task 14.2**: Create reconfiguration landing page (already exists in HTML)
- **Task 14.3**: Implement profile modification flow
- **Task 14.4**: Update state after reconfiguration
- **Task 14.5**: Write property test for reconfiguration mode
- **Task 14.6**: Write property test for data preservation

## Conclusion

Task 14.1 is complete. The wizard now properly detects when an existing installation exists and enters reconfiguration mode. The implementation:

- ✓ Uses SharedStateManager for consistent state reading
- ✓ Maintains backward compatibility
- ✓ Has comprehensive test coverage
- ✓ Integrates with existing frontend code
- ✓ Validates state schema
- ✓ Provides clear mode detection logic

The wizard is ready to handle both fresh installations and reconfiguration scenarios.
