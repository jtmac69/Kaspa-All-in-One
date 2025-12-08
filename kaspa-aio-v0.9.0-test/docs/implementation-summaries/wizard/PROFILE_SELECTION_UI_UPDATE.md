# Profile Selection UI Update - Implementation Summary

## Overview
Updated the frontend profile selection UI to reflect the new profile architecture with renamed profiles, dependency warnings, resource calculation, startup order visualization, and prerequisite indicators.

## Task Reference
**Task 6.6.6**: Update frontend profile selection UI
- **Status**: ✅ COMPLETED
- **Requirements**: 2, 8

## Changes Made

### 1. HTML Updates (`services/wizard/frontend/public/index.html`)

#### Profile Name Changes
- **"Production Apps"** → **"Kaspa User Applications"**
- **"Explorer"** → **"Indexer Services"** (updated description and services)
- **"Core Node"** → **"Core Profile"** (clarified description)
- **"Archive Node"** → **"Archive Node Profile"**
- **"Mining"** → **"Mining Profile"**

#### New UI Components Added

**Dependency Warning Banner**
```html
<div id="dependency-warning" class="warning-banner">
  - Displays when profile prerequisites are not met
  - Example: Mining requires Core or Archive Node
```

**Resource Warning Banner**
```html
<div id="resource-warning" class="warning-banner">
  - Shows when system resources are insufficient
  - Displays combined resource requirements vs available
```

**Combined Resources Card**
```html
<div id="combined-resources" class="combined-resources-card">
  - Shows total CPU, RAM, and Disk requirements
  - Displays both minimum and recommended values
  - Updates dynamically as profiles are selected
```

**Startup Order Visualization**
```html
<div id="startup-order" class="startup-order-card">
  - Phase 1: Kaspa Node (startup order 1)
  - Phase 2: Indexer Services (startup order 2)
  - Phase 3: Applications (startup order 3)
  - Visual timeline with arrows between phases
```

#### Profile Card Enhancements

**Startup Order Badge**
- Each profile card now shows its startup order
- Example: "Startup Order: 1" for Core Profile

**Profile Notes**
- Added informational notes to profiles
- Kaspa User Applications: "Can use public or local indexers"
- Indexer Services: "Shared TimescaleDB with separate databases"
- Archive Node: "Conflicts with Core Profile" (warning style)
- Mining: "Requires Core or Archive Node Profile" (prerequisite style)

**Updated Service Tags**
- Core Profile: kaspa-node, wallet, dashboard, nginx
- Kaspa User Applications: kasia-app, k-social-app, kaspa-explorer
- Indexer Services: timescaledb, kasia-indexer, k-indexer, simply-kaspa-indexer
- Archive Node: kaspa-archive-node
- Mining: kaspa-stratum

### 2. CSS Updates (`services/wizard/frontend/public/styles/wizard.css`)

Added comprehensive styles for new UI components:

**Warning Banners** (`.warning-banner`)
- Flex layout with icon and content
- Orange background for warnings
- Responsive design

**Combined Resources Card** (`.combined-resources-card`)
- Grid layout for resource items
- Kaspa-branded styling
- Resource icons and labels

**Startup Order Visualization** (`.startup-order-card`)
- Timeline layout with phases
- Numbered phase indicators
- Arrow connectors between phases
- Service tags within each phase

**Profile Card Enhancements**
- Startup order badge styling
- Profile note styles (info, warning, prerequisite)
- Updated badge colors (essential, popular, advanced, storage, mining)
- Hover and selection states

**Developer Mode Section**
- Toggle switch styling
- Feature list with checkmarks
- Warning banner for resource impact

**Responsive Design**
- Mobile-friendly grid layouts
- Stacked timeline on small screens
- Full-width buttons on mobile

### 3. JavaScript Updates (`services/wizard/frontend/public/scripts/modules/configure.js`)

#### New Functions Added

**`initializeProfileSelection()`**
- Loads profile data from API
- Restores saved selection from state
- Sets up click handlers
- Updates UI based on selection

**`setupProfileCardHandlers()`**
- Handles profile card clicks
- Toggles selection state
- Saves to state manager
- Updates UI dynamically

**`updateProfileCardStates()`**
- Updates visual state of cards
- Adds/removes 'selected' class

**`updateProfileSelectionUI()`**
- Validates selection with backend
- Shows/hides warnings
- Updates combined resources
- Updates startup order visualization

**`showDependencyWarning(errors)`**
- Displays dependency validation errors
- Example: "Mining requires Core or Archive Node"

**`showResourceWarning(warnings)`**
- Displays resource warnings
- Example: "Insufficient RAM for selected profiles"

**`showCombinedResources(resources)`**
- Updates combined resource display
- Shows min and recommended values

**`showStartupOrder(startupOrder)`**
- Populates startup order timeline
- Shows services in each phase
- Displays arrows between phases

**`getSelectedProfiles()`**
- Returns currently selected profiles
- Used by other modules

### 4. Wizard Integration (`services/wizard/frontend/public/scripts/wizard-refactored.js`)

Updated step entry handler for profiles step:
```javascript
if (stepId === 'step-profiles') {
    setTimeout(() => {
        import('./modules/configure.js').then(module => {
            module.initializeProfileSelection();  // NEW
            module.setupDeveloperModeToggle();
        });
    }, 100);
}
```

### 5. Test File Created

**`services/wizard/frontend/test-profile-selection-ui.html`**
- Standalone test page for profile selection UI
- Mock data for testing without backend
- Tests all new UI components
- Validates styling and interactions

## API Integration

The frontend now calls the following backend endpoints:

1. **GET `/api/profiles`**
   - Loads all profile definitions
   - Used during initialization

2. **POST `/api/profiles/validate-selection`**
   - Validates selected profiles
   - Returns errors, warnings, resources, and startup order
   - Called whenever selection changes

## Features Implemented

### ✅ Profile Name Updates
- All profile names updated to match new architecture
- Descriptions clarified for each profile

### ✅ Dependency Warnings
- Real-time validation of prerequisites
- Clear error messages for missing dependencies
- Example: Mining requires Core or Archive Node

### ✅ Resource Calculation
- Combined resource requirements displayed
- Shows both minimum and recommended values
- Updates dynamically as profiles are selected

### ✅ Startup Order Visualization
- Visual timeline showing service startup phases
- Phase 1: Kaspa Node
- Phase 2: Indexer Services
- Phase 3: Applications
- Arrows connecting phases

### ✅ Prerequisite Indicators
- Visual indicators on profile cards
- Warning style for conflicts
- Prerequisite style for requirements
- Info style for optional features

### ✅ Developer Mode Toggle
- Cross-cutting feature (not a separate profile)
- Toggle switch with feature list
- Warning about resource impact
- Preserved from previous implementation

## User Experience Improvements

1. **Clear Visual Feedback**
   - Selected profiles highlighted
   - Warnings displayed prominently
   - Resource requirements always visible

2. **Dependency Awareness**
   - Users see prerequisites before selection
   - Warnings appear immediately when violated
   - Clear guidance on what's needed

3. **Resource Planning**
   - Combined requirements help users plan
   - Min vs recommended values guide decisions
   - Prevents over-commitment of resources

4. **Startup Understanding**
   - Users understand service dependencies
   - Clear visualization of startup sequence
   - Helps troubleshoot startup issues

## Testing

### Manual Testing Steps

1. **Open test page**: `http://localhost:3000/test-profile-selection-ui.html`
2. **Click profile cards** to select/deselect
3. **Verify visual feedback** (selected state, badges)
4. **Check combined resources** update correctly
5. **Verify startup order** displays correctly
6. **Test Mining profile** without Core (should show warning)
7. **Toggle Developer Mode** and verify details appear
8. **Test responsive design** on mobile viewport

### Integration Testing

1. Start wizard backend: `node services/wizard/backend/src/server.js`
2. Navigate to profiles step in wizard
3. Select various profile combinations
4. Verify API calls to `/api/profiles/validate-selection`
5. Confirm warnings and resources display correctly
6. Test with actual backend validation

## Files Modified

1. `services/wizard/frontend/public/index.html` - Profile selection HTML
2. `services/wizard/frontend/public/styles/wizard.css` - New styles
3. `services/wizard/frontend/public/scripts/modules/configure.js` - Profile selection logic
4. `services/wizard/frontend/public/scripts/wizard-refactored.js` - Initialization

## Files Created

1. `services/wizard/frontend/test-profile-selection-ui.html` - Test page
2. `docs/implementation-summaries/wizard/PROFILE_SELECTION_UI_UPDATE.md` - This document

## Next Steps

### Immediate
- Test with actual backend running
- Verify all profile combinations
- Test on different screen sizes

### Follow-up Tasks
- Task 6.7.1: Build node sync monitoring system
- Task 6.7.2: Implement sync strategy options
- Task 6.8.1: Implement wizard mode detection

## Notes

- All profile names now match the backend profile definitions
- UI is fully responsive and mobile-friendly
- Dependency validation happens in real-time
- Resource calculation includes deduplication (handled by backend)
- Startup order visualization helps users understand service dependencies
- Developer Mode remains a cross-cutting feature, not a separate profile

## Conclusion

The profile selection UI has been successfully updated to reflect the new profile architecture. Users now have clear visibility into:
- Profile dependencies and prerequisites
- Combined resource requirements
- Service startup order
- Potential conflicts and warnings

The implementation provides a much better user experience for selecting and understanding profile combinations, setting the foundation for the remaining Phase 6.6 tasks.
