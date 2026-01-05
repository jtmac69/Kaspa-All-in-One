# Wizard Reconfiguration Landing Page Implementation

## Overview

Implemented the reconfiguration landing page for the Kaspa All-in-One Installation Wizard, which displays when the wizard detects an existing installation. The page provides three main reconfiguration options: Add New Profiles, Modify Configuration, and Remove Profiles.

## Implementation Date

January 4, 2026

## Components Implemented

### 1. Backend API Endpoint

**File**: `services/wizard/backend/src/api/reconfiguration-api-simple.js`

- **GET `/api/wizard/profiles/status`**: Returns comprehensive profile installation status
  - Reads installation state from `.kaspa-aio/installation-state.json`
  - Categorizes profiles as: installed, not-installed, or partial
  - Calculates system health metrics
  - Generates configuration suggestions based on current state
  - Returns profile states with running/total service counts

### 2. Frontend Integration

**File**: `services/wizard/frontend/public/scripts/wizard-refactored.js`

- Updated `loadReconfigurationData()` to call `/wizard/profiles/status` endpoint
- Updated `updateInstallationSummary()` to display profile counts correctly
- Added global functions for reconfiguration actions:
  - `selectReconfigurationAction(action)`: Selects one of the three reconfiguration options
  - `proceedWithReconfiguration()`: Proceeds with the selected action
  - `goToInitialMode()`: Returns to fresh installation mode
  - `applySuggestion(suggestionId)`: Applies a configuration suggestion

### 3. HTML Structure

**File**: `services/wizard/frontend/public/index.html`

The reconfiguration landing page HTML was already present in the index.html file (step-reconfigure-landing). It includes:

- **Current Installation Summary**: Displays installation date, last modified, running services count, and version
- **Reconfiguration Options**: Three action cards for Add/Modify/Remove operations
- **Profile Status Overview**: Grid showing all profiles with installation status badges
- **Configuration Suggestions**: Intelligent recommendations based on current setup

### 4. CSS Styles

**File**: `services/wizard/frontend/public/styles/wizard.css`

Styles were already present for:
- `.current-installation-summary`: Installation overview card
- `.reconfiguration-actions`: Grid of action cards
- `.profile-status-grid`: Profile status cards with badges
- `.configuration-suggestions`: Suggestion list items
- Status indicators (healthy, warning, error, checking)
- Responsive design for mobile devices

## Key Features

### Profile Status Detection

The API analyzes the installation state and categorizes each profile:

1. **Installed**: All services running
2. **Partial**: Some services running, some stopped
3. **Not Installed**: Profile not in installation state

### Installation Summary

Displays:
- Number of installed profiles vs total available
- Installation date and last modified date
- Running services count (e.g., "2/3 services running")
- Installation version
- System health status with color-coded indicator

### Reconfiguration Actions

Three main actions with visual cards:
1. **Add New Profiles**: Install additional services
2. **Modify Configuration**: Change settings for existing services
3. **Remove Profiles**: Uninstall services

Each card shows:
- Icon and title
- Description
- Example tags (e.g., "+ Indexer Services", "Port Settings")
- Hover effects and selection state

### Configuration Suggestions

Intelligent suggestions based on current setup:
- Example: "Add Local Kaspa Node" when indexers are installed but core is not
- Each suggestion includes:
  - Priority level (high/medium/low) with color-coded icon
  - Title and description
  - "Apply →" action button

## Path Resolution Fixes

Fixed multiple path resolution issues:

1. **server.js**: Changed from `../../../../..` to `../../../..` (from `src/` directory)
2. **reconfiguration-api-simple.js**: Changed from `../../../..` to `../../../../..` (from `src/api/` directory)
3. **SharedStateManager require**: Changed from `../../shared` to `../../../shared`

These fixes ensure the wizard correctly finds the `.kaspa-aio/installation-state.json` file.

## Testing

Created test installation state file at `.kaspa-aio/installation-state.json` with:
- 2 installed profiles (core, kaspa-user-applications)
- 3 services (kaspa-node running, kaspa-explorer running, kasia stopped)
- Phase: complete

Verified:
- ✅ Mode detection returns "reconfigure" mode
- ✅ Profiles status API returns correct installed/available profiles
- ✅ Profile categorization works (installed, partial, not-installed)
- ✅ System health calculation is accurate
- ✅ Suggestions are generated based on installation state

## Requirements Validated

This implementation satisfies the following requirements from the design document:

- **Requirement 5.2**: Display options for "Add New Profiles", "Modify Configuration", "Remove Profiles"
- **Requirement 5.3**: Display currently installed profiles with "Installed ✓" badges
- **Requirement 5.4**: Display available (not installed) profiles in a separate section

## Next Steps

The following tasks remain to complete the reconfiguration mode:

1. **Task 14.3**: Implement Services modification flow
2. **Task 14.4**: Update state after reconfiguration
3. **Task 14.5**: Write property test for reconfiguration mode
4. **Task 14.6**: Write property test for data preservation

## Files Modified

1. `services/wizard/backend/src/api/reconfiguration-api-simple.js` - Added profile status endpoint
2. `services/wizard/backend/src/server.js` - Fixed path resolution for mode detection
3. `services/wizard/frontend/public/scripts/wizard-refactored.js` - Added reconfiguration functions
4. `.kaspa-aio/installation-state.json` - Created test installation state

## API Response Example

```json
{
  "success": true,
  "profileStates": [
    {
      "id": "core",
      "name": "Core",
      "displayName": "Core Profile",
      "description": "Essential Kaspa node and basic services",
      "icon": "⚡",
      "installationState": "installed",
      "status": "running",
      "isInstalled": true,
      "runningServices": 1,
      "totalServices": 1
    }
  ],
  "installedProfiles": [...],
  "availableProfiles": [...],
  "systemHealth": {
    "status": "warning",
    "percentage": 67
  },
  "suggestions": [...]
}
```

## Notes

- The reconfiguration landing page HTML and CSS were already present in the codebase
- Main work involved implementing the backend API and connecting it to the frontend
- Path resolution was the primary challenge due to varying directory depths
- The implementation follows the existing wizard architecture and styling patterns
