# Wizard "Start Over" Bug Fix

## Issue Description

**Bug**: After completing the wizard and clicking "Start Over", the wizard jumps directly from Step 1 (Welcome) to Step 3 (Profile Selection) and hangs.

**Root Cause**: 
1. When the wizard completes installation, it creates a `.env` file
2. The backend's wizard mode detection (`/api/wizard/mode`) checks for the existence of `.env` file
3. If `.env` exists, it sets mode to `'reconfigure'` 
4. When "Start Over" is clicked, it clears the wizard state but doesn't delete the `.env` file
5. On reload, the wizard detects reconfigure mode and automatically jumps to step 3 (line 342 in wizard-refactored.js)
6. This causes the wizard to skip steps 1-2 and hang at step 3

## Solution

Force the wizard into `'initial'` mode when "Start Over" is clicked by adding `?mode=initial` URL parameter on reload. The backend's mode detection gives URL parameters precedence over file-based detection.

## Files Modified

### 1. `services/wizard/frontend/public/scripts/modules/resume.js`

**Function**: `startOver()`

**Change**: Added `?mode=initial` URL parameter when reloading the page

```javascript
// Before:
window.location.href = window.location.pathname;

// After:
window.location.href = window.location.pathname + '?mode=initial';
```

**Reason**: Forces the backend to return `mode: 'initial'` regardless of `.env` file existence

### 2. `services/wizard/frontend/public/scripts/modules/rollback.js`

**Function**: `startOver()`

**Change**: Added `?mode=initial` URL parameter when reloading the page

```javascript
// Before:
window.location.reload();

// After:
window.location.href = window.location.pathname + '?mode=initial';
```

**Reason**: Ensures consistency across all "Start Over" code paths

### 3. `services/wizard/frontend/public/index.html`

**Function**: `confirmStartOver()`

**Change**: Added `?mode=initial` URL parameter when reloading the page

```javascript
// Before:
window.location.reload();

// After:
window.location.href = window.location.pathname + '?mode=initial';
```

**Reason**: Fixes the inline "Start Over" button in the HTML

## Backend Mode Detection Logic

The backend (`services/wizard/backend/src/server.js`, line 183-250) detects wizard mode in this order:

1. **URL parameter** (highest priority) - `?mode=initial|reconfigure|update`
2. **Installation state file** - `.kaspa-aio/installation-state.json`
3. **.env file existence** - If `.env` exists, assumes reconfigure mode

By adding `?mode=initial` to the URL, we override the `.env` file detection.

## Testing

**Test Case 1**: Start Over from Completion Step
1. Complete a full wizard installation
2. Click "Start Over" button
3. **Expected**: Wizard reloads at Step 1 (Welcome)
4. **Expected**: Can progress through all steps normally

**Test Case 2**: Start Over from Error State
1. Trigger an installation error
2. Click "Start Over" from error recovery dialog
3. **Expected**: Wizard reloads at Step 1 (Welcome)
4. **Expected**: Can progress through all steps normally

**Test Case 3**: Start Over from Reconfigure Mode
1. Launch wizard in reconfigure mode (with existing `.env`)
2. Click "Start Over" button
3. **Expected**: Wizard reloads at Step 1 (Welcome) in initial mode
4. **Expected**: Can progress through all steps normally

## Alternative Solutions Considered

### Option 1: Delete .env file on Start Over
**Pros**: Completely resets the system
**Cons**: 
- Requires backend changes
- May delete user's configuration unintentionally
- More destructive than necessary

### Option 2: Add a "force initial mode" flag to backend state
**Pros**: More explicit control
**Cons**: 
- Requires backend changes
- More complex state management
- URL parameter is simpler and already supported

### Option 3: Reload without any parameters and fix mode detection
**Pros**: No URL parameters needed
**Cons**: 
- Would require changing backend mode detection logic
- More complex changes
- URL parameter approach is cleaner

## Conclusion

The fix is minimal, non-destructive, and leverages existing backend functionality. By adding `?mode=initial` to the URL on "Start Over", we ensure the wizard always starts in initial installation mode regardless of existing configuration files.

## Related Files

- `services/wizard/backend/src/server.js` - Mode detection logic
- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Reconfigure mode handling (line 342)
- `services/wizard/frontend/public/scripts/modules/resume.js` - Resume/Start Over logic
- `services/wizard/frontend/public/scripts/modules/rollback.js` - Rollback/Start Over logic
- `services/wizard/frontend/public/index.html` - Inline Start Over button

## Status

✅ **FIXED** - All three "Start Over" code paths now properly force initial mode via URL parameter
