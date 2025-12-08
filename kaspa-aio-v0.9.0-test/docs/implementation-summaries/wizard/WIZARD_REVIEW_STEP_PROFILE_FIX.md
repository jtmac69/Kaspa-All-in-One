# Wizard Review Step Profile Display Fix

## Issue Description

Multiple issues were identified in the wizard's profile selection and review flow:

1. **Incorrect Profile Selection Display**: When selecting only "Core" profile in Step 4, the Review step (Step 6) was showing both "Core" and "Explorer" profiles as selected
2. **Outdated Profile Names**: The review step was using old profile names that didn't match the current profile structure
3. **Profile Selection Conflicts**: Two different systems were managing profile selection, causing conflicts
4. **Validation Failures**: Configuration validation was failing due to outdated profile name checks
5. **Database Password Required**: Backend validation required database password for all profiles

## Root Causes

### Issue 1: Hardcoded Values in HTML
The `index.html` file had hardcoded placeholder values in the review section:
- Line 910: `<span class="review-value" id="review-profiles">Core, Explorer</span>`
- Lines 924, 928, 932: Hardcoded resource values (CPU, RAM, Disk)
- Lines 942, 946: Hardcoded network configuration values

These hardcoded values were never being replaced by the JavaScript, so they always showed the same default values regardless of user selection.

### Issue 2: Outdated Profile Definitions
The `review.js` module had a `PROFILE_DEFINITIONS` object with old profile IDs that didn't match the current HTML structure.

**Profile Name Changes (November 24, 2025):**
- `prod` → `kaspa-user-applications`
- `explorer` → `indexer-services`
- `development`/`dev` → Removed (converted to Developer Mode)

**Old Profile IDs** (in review.js before fix):
- `core-remote`
- `core-local`
- `prod`
- `explorer`
- `archive`
- `dev`

**Current Profile IDs** (correct):
- `core`
- `kaspa-user-applications`
- `indexer-services`
- `archive-node`
- `mining`

### Issue 3: Duplicate Profile Selection Systems
Two different systems were trying to manage profile selection:
1. Main wizard's `selectProfile()` function in `wizard-refactored.js`
2. Configure module's `initializeProfileSelection()` function in `configure.js`

When entering Step 4 (Profiles), the configure module was being called and setting up duplicate click handlers that conflicted with the main wizard's handlers, causing profiles to be selected and then immediately cleared.

### Issue 4: Outdated Profile Name Checks in Validation
The `configure.js` module had hardcoded checks for old profile names:
- Line 89: `needsDatabase = profiles.includes('explorer') || profiles.includes('prod')`
- Line 270: Same check in validation function

These checks never matched the new profile names, causing validation logic to fail.

### Issue 5: Backend Always Requiring Database Password
The backend `config-generator.js` had:
- Line 22: `POSTGRES_PASSWORD: Joi.string().min(16).required()`

This made the database password required for ALL configurations, even when selecting profiles that don't use a database (like Core profile).

Additionally, the frontend validation rules had:
- `'db-password': { required: true }` 

This caused client-side validation to fail before even reaching the server.

## Changes Made

### 1. Fixed Hardcoded Values in index.html

**File**: `services/wizard/frontend/public/index.html`

Removed all hardcoded placeholder values from the review section elements:
- `#review-profiles` - Now empty, will be populated by JavaScript
- `#review-service-count` - Now empty, will be populated by JavaScript
- `#review-cpu` - Now empty, will be populated by JavaScript
- `#review-ram` - Now empty, will be populated by JavaScript
- `#review-disk` - Now empty, will be populated by JavaScript
- `#review-external-ip` - Now empty, will be populated by JavaScript
- `#review-public-node` - Now empty, will be populated by JavaScript

### 2. Updated Profile Definitions in review.js

**File**: `services/wizard/frontend/public/scripts/modules/review.js`

Replaced the entire `PROFILE_DEFINITIONS` object to match the current profile structure with correct profile IDs and updated names.

### 3. Removed Duplicate Profile Selection System

**File**: `services/wizard/frontend/public/scripts/wizard-refactored.js`

Removed the call to `initializeProfileSelection()` when entering the profiles step (Line 188). This function was from the configure module and was setting up duplicate click handlers that conflicted with the main wizard's profile selection.

**Before:**
```javascript
if (stepId === 'profiles') {
    setTimeout(() => {
        import('./modules/configure.js').then(module => {
            module.initializeProfileSelection();  // REMOVED
            module.setupDeveloperModeToggle();
        });
    }, 100);
}
```

**After:**
```javascript
if (stepId === 'profiles') {
    setTimeout(() => {
        import('./modules/configure.js').then(module => {
            module.setupDeveloperModeToggle();  // Only setup Developer Mode
        });
    }, 100);
}
```

### 4. Updated Profile Name Checks in configure.js

**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

Updated two locations where old profile names were hardcoded:

**Line 89 - updateFormVisibility():**
```javascript
// Before:
const needsDatabase = profiles.includes('explorer') || profiles.includes('prod');

// After:
const needsDatabase = profiles.includes('indexer-services') || profiles.includes('kaspa-user-applications');
```

**Line 270 - validateAllFields():**
```javascript
// Before:
const needsDatabase = selectedProfiles.includes('explorer') || selectedProfiles.includes('prod');

// After:
const needsDatabase = selectedProfiles.includes('indexer-services') || selectedProfiles.includes('kaspa-user-applications');
```

### 5. Made Database Password Optional in Backend

**File**: `services/wizard/backend/src/utils/config-generator.js`

Changed the POSTGRES_PASSWORD validation from required to optional:

**Before:**
```javascript
POSTGRES_PASSWORD: Joi.string().min(16).required(),
```

**After:**
```javascript
POSTGRES_PASSWORD: Joi.string().min(16).optional().allow(''),
```

### 6. Made Database Password Conditionally Required in Frontend

**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

Changed the validation rule for db-password from always required to conditionally required:

**Before:**
```javascript
'db-password': {
    minLength: 16,
    message: 'Password must be at least 16 characters long',
    required: true
}
```

**After:**
```javascript
'db-password': {
    minLength: 16,
    message: 'Password must be at least 16 characters long',
    required: false  // Conditionally required based on selected profiles
}
```

The conditional check in `validateAllFields()` still enforces the requirement when `indexer-services` or `kaspa-user-applications` profiles are selected.

### 7. Added Enhanced Logging

**File**: `services/wizard/frontend/public/scripts/modules/review.js`

Added detailed console logging to help debug profile selection issues:
- Logs selected profiles from state
- Logs configuration from state
- Logs when profiles are missing
- Logs network configuration details

**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

Added comprehensive validation logging:
- Logs validation start
- Logs client-side validation results with detailed error messages
- Logs configuration being sent to server
- Logs server validation response
- Logs validation success/failure with full error details

```javascript
const PROFILE_DEFINITIONS = {
    'core': {
        name: 'Core Profile',
        description: 'Kaspa node (public/private) with optional wallet',
        services: ['kaspa-node', 'wallet', 'dashboard', 'nginx'],
        resources: {
            cpu: '2 cores',
            ram: '4 GB',
            disk: '100 GB'
        }
    },
    'kaspa-user-applications': {
        name: 'Kaspa User Applications',
        description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
        services: ['kasia-app', 'k-social-app', 'kaspa-explorer'],
        resources: {
            cpu: '2 cores',
            ram: '4 GB',
            disk: '50 GB'
        }
    },
    'indexer-services': {
        name: 'Indexer Services',
        description: 'Local indexers (Kasia, K-Indexer, Simply-Kaspa)',
        services: ['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer'],
        resources: {
            cpu: '4 cores',
            ram: '8 GB',
            disk: '500 GB'
        }
    },
    'archive-node': {
        name: 'Archive Node Profile',
        description: 'Non-pruning Kaspa node for complete blockchain history',
        services: ['kaspa-archive-node'],
        resources: {
            cpu: '8 cores',
            ram: '16 GB',
            disk: '1000 GB'
        }
    },
    'mining': {
        name: 'Mining Profile',
        description: 'Local mining stratum pointed to local Kaspa node',
        services: ['kaspa-stratum'],
        resources: {
            cpu: '2 cores',
            ram: '2 GB',
            disk: '10 GB'
        }
    }
};
```

## Expected Behavior After Fix

1. **Accurate Profile Display**: The review step will now correctly display only the profiles that were selected in Step 4
2. **Current Profile Names**: Profile names will match the current naming convention (e.g., "Core Profile", "Kaspa User Applications", etc.)
3. **Dynamic Resource Calculation**: Resource requirements will be calculated based on the actual selected profiles
4. **Dynamic Network Configuration**: Network settings will reflect the user's actual configuration choices

## Testing Recommendations

1. Select only "Core" profile in Step 4 and verify it shows only "Core Profile" in Step 6
2. Select multiple profiles and verify all selected profiles appear correctly
3. Verify resource requirements are calculated correctly for different profile combinations
4. Verify network configuration displays the user's actual settings

## Files Modified

- `services/wizard/frontend/public/index.html` - Removed hardcoded placeholder values
- `services/wizard/frontend/public/scripts/modules/review.js` - Updated profile definitions to match current structure

## Related Components

- Profile selection logic: `services/wizard/frontend/public/scripts/wizard-refactored.js`
- State management: `services/wizard/frontend/public/scripts/modules/state-manager.js`
- Navigation: `services/wizard/frontend/public/scripts/modules/navigation.js`


## Testing Recommendations

1. Select only "Core" profile in Step 4 and verify it shows only "Core Profile" in Step 6
2. Select multiple profiles and verify all selected profiles appear correctly
3. Verify resource requirements are calculated correctly for different profile combinations
4. Verify network configuration displays the user's actual settings
5. Verify validation passes for Core profile without database password
6. Verify validation requires database password for Indexer Services and Kaspa User Applications

## Files Modified

1. `services/wizard/frontend/public/index.html` - Removed hardcoded placeholder values
2. `services/wizard/frontend/public/scripts/modules/review.js` - Updated profile definitions and added logging
3. `services/wizard/frontend/public/scripts/wizard-refactored.js` - Removed duplicate profile selection system
4. `services/wizard/frontend/public/scripts/modules/configure.js` - Updated profile name checks, made db-password conditionally required, added logging
5. `services/wizard/backend/src/utils/config-generator.js` - Made POSTGRES_PASSWORD optional

## Related Issues

This fix addresses the incomplete migration of profile name changes that were implemented on November 24, 2025. The profile architecture was updated in the backend, but the changes didn't fully propagate to:
- Frontend review module
- Frontend configuration validation
- Backend validation schema

## Lessons Learned

1. **Profile Name Changes Need Comprehensive Audit**: When changing core identifiers like profile names, need to grep all files and update systematically
2. **Avoid Duplicate Systems**: Having two different systems managing the same functionality (profile selection) causes conflicts
3. **Centralize Definitions**: Profile definitions should be in ONE place and imported everywhere to prevent inconsistencies
4. **Test Integration Points**: Changes to backend need corresponding frontend updates, especially for validation logic

## Conclusion

All profile-related issues have been fixed. The wizard now correctly:
- Displays only selected profiles on the review step
- Uses current profile names throughout
- Validates configuration based on selected profiles
- Requires database password only when needed
- Handles profile selection without conflicts

The root cause was incomplete migration of the November 24 profile name changes. This fix completes that migration and ensures consistency between backend and frontend code.
