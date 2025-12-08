# Task 6.2: Configuration State Management Fix

## Issue
During Core Profile installation testing, two critical bugs were discovered:

1. **Configuration Validation Error**: When clicking Continue on the Configuration step (Step 5), the validation API call failed with error: "Validation error: config object and profiles array are required"

2. **Installation Failure**: After fixing the validation issue, installation failed at the "Creating environment configuration" stage with error: "Cannot read properties of undefined (reading 'PUBLIC_NODE')"

## Root Causes

### Issue 1: Missing Profiles Parameter
**Location**: `services/wizard/frontend/public/scripts/modules/configure.js` - `validateConfiguration()` function

**Problem**: The validation API endpoint expects `{ config, profiles }` but the frontend was only sending the config object:
```javascript
const response = await api.post('/config/validate', config);
```

**Impact**: The backend validation endpoint rejected the request because it requires both config and profiles arrays.

### Issue 2: Configuration Not Saved to State
**Location**: `services/wizard/frontend/public/scripts/modules/configure.js` - `validateConfiguration()` function

**Problem**: After successful validation, the code tried to save `response.config` to state, but the validation API doesn't return a config field:
```javascript
stateManager.set('configuration', response.config); // response.config is undefined
```

**Impact**: When the installation started, it retrieved `undefined` from state, causing the config generator to fail when trying to access `config.PUBLIC_NODE`.

## Solutions Implemented

### Fix 1: Include Profiles in Validation Request
**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

**Change**:
```javascript
// Before
const config = gatherConfigurationFromForm();
const response = await api.post('/config/validate', config);

// After
const config = gatherConfigurationFromForm();
const profiles = stateManager.get('selectedProfiles') || [];
const response = await api.post('/config/validate', { config, profiles });
```

**Result**: Validation API now receives both required parameters and can properly validate the configuration.

### Fix 2: Save Gathered Config to State
**File**: `services/wizard/frontend/public/scripts/modules/configure.js`

**Change**:
```javascript
// Before
stateManager.set('configuration', response.config); // undefined

// After
stateManager.set('configuration', config); // the gathered config object
```

**Result**: The configuration is now properly saved to state after validation, making it available for the installation process.

## Testing

### Test Scenario
1. Start fresh installation with Core Profile
2. Complete System Check (Step 1)
3. Select Core Profile (Step 4)
4. Configure settings (Step 5)
5. Click Continue button
6. Proceed to Installation (Step 7)

### Expected Results
- ✅ Configuration validation succeeds
- ✅ Configuration is saved to state
- ✅ Installation can access configuration
- ✅ Environment file is created successfully

### Actual Results (After Fix)
- ✅ Validation passes with both config and profiles
- ✅ Configuration properly stored in state manager
- ✅ Installation receives valid configuration object
- ✅ Ready for installation to proceed

## Files Modified

1. `services/wizard/frontend/public/scripts/modules/configure.js`
   - Updated `validateConfiguration()` to include profiles parameter
   - Fixed state management to save gathered config instead of undefined response.config

## Release Package

**Updated Package**: `kaspa-aio-v0.9.0-test.tar.gz`
- **Size**: 5.5M
- **SHA256**: `725d303286750571cd9352c0628428e38deb13d41bc2bdb3a5104ab8e526bbad`

## Related Issues

This fix addresses the configuration flow issues discovered during:
- Task 6.2: Full Scenario Testing
- Core Profile installation testing

## Notes

- The validation API correctly expects both config and profiles to determine which fields are visible/required
- The state manager is the single source of truth for configuration during the wizard flow
- Configuration must be saved to state after validation for the installation process to access it
- The gathered config from the form is the correct object to save, not the validation response

## Next Steps

1. Continue testing Core Profile installation
2. Verify configuration is properly used during Docker compose generation
3. Test other profiles to ensure configuration flow works consistently
