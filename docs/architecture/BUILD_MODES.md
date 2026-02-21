# Build Modes: Test vs Production

## Overview

The Kaspa All-in-One wizard supports two build modes:
- **Test Mode**: For testing and development, includes shortcuts and debug features
- **Production Mode**: For real deployments, strict validation and no shortcuts

## Build Mode Configuration

### Setting Build Mode

Build mode is controlled by the `BUILD_MODE` environment variable:

```bash
# Test mode (default for test scripts)
BUILD_MODE=test node src/server.js

# Production mode (default if not specified)
BUILD_MODE=production node src/server.js

# Or just omit it (defaults to production)
node src/server.js
```

### Test Scripts

The test release scripts automatically set `BUILD_MODE=test`:

- `start-test.sh` - Starts wizard in test mode
- `restart-wizard.sh` - Restarts wizard in test mode

### Production Deployment

For production, either:
1. Don't set `BUILD_MODE` (defaults to production)
2. Explicitly set `BUILD_MODE=production`

```bash
# Production start
cd services/wizard/backend
node src/server.js
```

## Feature Differences

### Test Mode Features

**Testing Shortcuts** (⚠️ NEVER in production):
- Auto-enable continue buttons after short delay
- Allow skipping validation steps
- Verbose console logging
- Debug information in UI

**Development Tools**:
- Build mode indicator badge
- Detailed error messages
- Console logging enabled
- Step debug information

**Purpose**: Make testing faster and easier by removing friction

### Production Mode Features

**Strict Validation**:
- All validations enforced
- No shortcuts or skips
- Proper error handling
- Security-focused

**Clean UI**:
- No debug information
- No build mode indicator
- Professional appearance
- Minimal console output

**Purpose**: Ensure reliability and security for real deployments

## Feature Flags

### Backend (`services/wizard/backend/src/config/build-config.js`)

```javascript
{
    test: {
        enableShortcuts: true,      // Auto-enable buttons, skip validations
        verboseLogging: true,        // Detailed logs
        enableTestEndpoints: true,   // Test-only API endpoints
    },
    
    production: {
        strictValidation: true,      // Enforce all validations
        detailedErrors: false,       // Hide internal error details
        enableMonitoring: true,      // Performance monitoring
    },
    
    features: {
        autoEnableContinueButtons: IS_TEST_BUILD,  // Testing shortcut
        skipSystemChecks: false,                    // Never skip
        allowSkipSteps: IS_TEST_BUILD,             // Allow in test only
        showDebugInfo: IS_TEST_BUILD,              // Debug UI
    }
}
```

### Frontend (`services/wizard/frontend/public/scripts/modules/build-config.js`)

```javascript
{
    test: {
        enableShortcuts: true,       // UI shortcuts
        verboseLogging: true,        // Console logs
        showDebugInfo: true,         // Debug panels
        allowSkipSteps: true,        // Skip navigation
    },
    
    features: {
        autoEnableContinueButtons: IS_TEST_BUILD,  // Auto-enable buttons
        allowManualStepNavigation: IS_TEST_BUILD,  // Click progress steps
        showBuildModeBanner: true,                 // Show mode indicator
        showStepDebugInfo: IS_TEST_BUILD,         // Step information
    }
}
```

## Adding Test-Specific Features

### Backend Example

```javascript
const buildConfig = require('./config/build-config');

// Test-only endpoint
if (buildConfig.test.enableTestEndpoints) {
    router.get('/test/reset-state', (req, res) => {
        // Reset wizard state for testing
        // This endpoint only exists in test builds
    });
}

// Test shortcut
if (buildConfig.features.skipSlowOperations) {
    // Skip time-consuming operation
    return mockResult();
}

// Always run in production
const result = await performOperation();
```

### Frontend Example

```javascript
import { buildConfig, isFeatureEnabled } from './modules/build-config.js';

// Test shortcut
if (isFeatureEnabled('autoEnableContinueButtons')) {
    console.warn('[TEST MODE] Auto-enabling continue button');
    enableButton();
}

// Debug information
if (buildConfig.test.showDebugInfo) {
    console.log('Current step:', currentStep);
    console.log('State:', state);
}

// Production-only strict validation
if (buildConfig.production.strictValidation) {
    if (!validateInput(input)) {
        throw new Error('Invalid input');
    }
}
```

## Checking Build Mode

### Backend

```javascript
const buildConfig = require('./config/build-config');

if (buildConfig.isTest) {
    // Test mode logic
}

if (buildConfig.isProduction) {
    // Production mode logic
}

if (buildConfig.features.autoEnableContinueButtons) {
    // Feature-specific logic
}
```

### Frontend

```javascript
import { buildConfig, isTestBuild, isProductionBuild, isFeatureEnabled } from './modules/build-config.js';

if (isTestBuild()) {
    // Test mode logic
}

if (isProductionBuild()) {
    // Production mode logic
}

if (isFeatureEnabled('showDebugInfo')) {
    // Feature-specific logic
}
```

### API Endpoint

```bash
# Check current build mode
curl http://localhost:3000/api/build-info

# Response:
{
  "mode": "test",
  "isTest": true,
  "isProduction": false,
  "features": {
    "autoEnableContinueButtons": true,
    "showDebugInfo": true,
    "allowSkipSteps": true
  },
  "timestamp": "2024-11-26T22:00:00.000Z"
}
```

## Visual Indicators

### Test Mode
- Orange badge in top-right corner: "TEST BUILD"
- Console warnings for testing shortcuts
- Debug information panels
- Verbose logging

### Production Mode
- No build mode indicator
- Clean, professional UI
- Minimal console output
- No debug panels

## Best Practices

### For Developers

1. **Always use feature flags for test-specific code**
   ```javascript
   // ✅ Good
   if (isFeatureEnabled('autoEnableContinueButtons')) {
       enableButton();
   }
   
   // ❌ Bad
   enableButton(); // Always runs
   ```

2. **Log when using test shortcuts**
   ```javascript
   if (isTestBuild()) {
       console.warn('[TEST MODE] Skipping validation');
       return true;
   }
   ```

3. **Never skip security checks**
   ```javascript
   // ❌ Never do this
   if (isTestBuild()) {
       return true; // Skip authentication
   }
   ```

4. **Document test-specific features**
   ```javascript
   // Testing shortcut: Auto-enable continue button
   // This allows testers to quickly progress through steps
   // ONLY enabled in test builds
   if (isFeatureEnabled('autoEnableContinueButtons')) {
       // ...
   }
   ```

### For Testers

1. **Verify test mode is active**
   ```bash
   curl http://localhost:3000/api/build-info | jq .mode
   # Should return: "test"
   ```

2. **Look for build mode indicator**
   - Orange "TEST BUILD" badge in top-right corner
   - If missing, you're in production mode

3. **Use test scripts**
   - `./start-test.sh` - Automatically sets test mode
   - `./restart-wizard.sh` - Automatically sets test mode

4. **Report if shortcuts don't work**
   - Test mode should have auto-enable buttons
   - If buttons stay disabled, report as bug

### For Production Deployment

1. **Never set BUILD_MODE=test in production**
   ```bash
   # ❌ Bad
   BUILD_MODE=test node src/server.js
   
   # ✅ Good
   node src/server.js
   # or
   BUILD_MODE=production node src/server.js
   ```

2. **Verify production mode**
   ```bash
   curl http://localhost:3000/api/build-info
   # Should show: "mode": "production"
   ```

3. **No build mode indicator should appear**
   - If you see "TEST BUILD" badge, something is wrong

4. **Check logs for warnings**
   ```bash
   # Should NOT see:
   # "⚠️  WARNING: Testing shortcuts are ENABLED"
   ```

## Migration Guide

### Removing Old Testing Shortcuts

**Before** (hardcoded shortcuts):
```javascript
// For testing: enable continue button
enableContinueButton('checklist-continue');
```

**After** (feature flag):
```javascript
// Testing shortcut: auto-enable continue button (ONLY in test builds)
if (isFeatureEnabled('autoEnableContinueButtons')) {
    console.warn('[TEST MODE] Auto-enabling continue button');
    enableContinueButton('checklist-continue');
}
```

### Adding New Test Features

1. **Add feature flag to build-config.js**
   ```javascript
   features: {
       myNewTestFeature: IS_TEST_BUILD,
   }
   ```

2. **Use feature flag in code**
   ```javascript
   if (isFeatureEnabled('myNewTestFeature')) {
       // Test-specific logic
   }
   ```

3. **Document the feature**
   - Add to this document
   - Add comments in code
   - Update TESTING.md if relevant

## Troubleshooting

### Issue: Test shortcuts not working

**Check build mode**:
```bash
curl http://localhost:3000/api/build-info | jq .mode
```

**Solution**: Restart with test mode:
```bash
./restart-wizard.sh
```

### Issue: Production has test features

**Check environment variable**:
```bash
echo $BUILD_MODE
```

**Solution**: Don't set BUILD_MODE or set to production:
```bash
unset BUILD_MODE
node src/server.js
```

### Issue: Build mode indicator not showing

**Check if test mode**:
```bash
curl http://localhost:3000/api/build-info
```

**Solution**: Hard refresh browser (Ctrl+Shift+R)

## Future Enhancements

Potential additions to the build system:

1. **Development Mode**: Separate from test mode, for active development
2. **Staging Mode**: Between test and production
3. **Feature Toggles**: Runtime feature flags via API
4. **A/B Testing**: Toggle features for specific users
5. **Performance Profiling**: Test mode with performance monitoring
6. **Mock Services**: Test mode with mocked external services

---

**Last Updated**: November 26, 2024  
**Version**: v0.9.1
