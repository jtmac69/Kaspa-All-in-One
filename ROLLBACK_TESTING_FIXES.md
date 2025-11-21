# Rollback Testing - Issues Fixed

**Date**: November 21, 2025  
**Status**: ✅ FIXED

## Issues Found During Initial Testing

### Issue 1: Content Security Policy (CSP) Blocking Resources
**Problem**: CSP was blocking:
- Socket.IO CDN (https://cdn.socket.io)
- Inline event handlers (onclick attributes)
- Inline scripts

**Symptoms**:
- Console errors: "Content Security Policy blocks inline execution of scripts"
- Socket.IO failed to load from CDN
- onclick handlers not working

**Fix Applied**:
Updated `services/wizard/backend/src/server.js` CSP configuration:
```javascript
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
connectSrc: ["'self'", "ws:", "wss:", "https://cdn.socket.io"]
```

### Issue 2: Functions Not Defined for Inline Handlers
**Problem**: HTML has inline `onclick` handlers (e.g., `onclick="nextStep()"`) but the refactored modular code doesn't expose functions globally.

**Symptoms**:
- Console error: "ReferenceError: selectProfile is not defined"
- "Get Started" button not working
- All onclick handlers failing

**Fix Applied**:
Updated `services/wizard/frontend/public/scripts/wizard-refactored.js` to expose all necessary functions globally:
- `nextStep()`, `previousStep()`, `goToStep()`
- `selectProfile()`, `startInstallation()`
- `toggleChecklistItem()`, `showDockerGuide()`, `showComposeGuide()`
- `detectExternalIP()`, `generatePassword()`, `togglePasswordVisibility()`
- `toggleLogs()`, `cancelInstallation()`
- `skipTour()`, `startTour()`, `runServiceVerification()`
- `openDashboard()`, `checkSyncStatus()`, `viewLogs()`
- And more...

### Issue 3: WebSocket Connection Blocked
**Problem**: WebSocket trying to connect to Socket.IO CDN was blocked by CSP.

**Fix**: Included in CSP fix above.

## Changes Made

### Files Modified

1. **services/wizard/backend/src/server.js**
   - Updated CSP to allow Socket.IO CDN
   - Added `'unsafe-eval'` for module loading
   - Added `https://` protocol to CDN URLs

2. **services/wizard/frontend/public/scripts/wizard-refactored.js**
   - Exposed ~20 functions globally for inline onclick handlers
   - Added placeholder implementations for features not yet complete
   - Maintained modular structure while supporting legacy inline handlers

### Server Restarted

Backend server was restarted to apply CSP changes:
- Process ID: 6
- Status: Running
- URL: http://localhost:3000

## Testing Status

### Before Fixes
- ❌ Page loaded with CSP errors
- ❌ Socket.IO blocked
- ❌ onclick handlers not working
- ❌ Console full of errors
- ❌ "Get Started" button not functional

### After Fixes (Expected)
- ✅ Page loads without CSP errors
- ✅ Socket.IO connects successfully
- ✅ onclick handlers work
- ✅ Console clean (or minimal warnings)
- ✅ "Get Started" button functional
- ✅ Navigation works
- ✅ Rollback functions accessible

## Next Steps

1. **Refresh the browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+F5)
2. **Clear browser cache** if needed
3. **Retest the wizard**:
   - Check console for errors
   - Click "Get Started" button
   - Test navigation
   - Try console commands:
     ```javascript
     await window.rollback.saveConfigurationVersion('Test');
     window.rollback.showVersionHistoryModal();
     ```

## Known Limitations

Some features have placeholder implementations (show "coming soon" notifications):
- Docker installation guide
- Docker Compose installation guide
- Profile selection quiz
- Interactive tour
- Service management guide
- Resources modal
- Log viewer

These are intentional - the focus is on rollback functionality testing.

## Verification Checklist

After refreshing the browser, verify:

- [ ] No CSP errors in console
- [ ] Socket.IO connects (check for "WebSocket connected" message)
- [ ] "Get Started" button works
- [ ] Can navigate between steps
- [ ] `window.wizard` object exists
- [ ] `window.rollback` object exists
- [ ] Can call rollback functions from console
- [ ] Notifications appear when testing functions

---

**Status**: Ready for testing  
**Action Required**: Refresh browser and retest


## Additional Fix (After First Test)

### Issue 4: Duplicate Script Loading
**Problem**: HTML file was loading BOTH old wizard.js (line 1140) and new wizard-refactored.js (line 1455), causing conflicts.

**Symptoms**:
- Console error: "selectProfile is not defined" from old wizard.js line 2445
- Functions defined in both files conflicting
- Old code trying to reference functions that don't exist

**Fix Applied**:
Removed duplicate `<script>` tags and premature `</body></html>` closing tags at line 1140. Now only loads wizard-refactored.js at the proper location.

**Files Modified**:
- services/wizard/frontend/public/index.html (removed lines 1139-1142)

---

**IMPORTANT**: Please refresh your browser AGAIN (hard refresh: Cmd+Shift+R) to load the fixed HTML file!


## Issue 11: Progress Indicator Shows Completed Steps After Hard Reload

**Problem:**
After clicking "Start Over" and doing a hard reload, the progress indicator at the top still showed steps 1-5 as completed (green checkmarks), even though the wizard should have been reset to step 1.

**Root Cause:**
The `startOver()` function was calling `stateManager.reset()` and `localStorage.removeItem('lastCheckpoint')`, but not clearing ALL localStorage. When the page reloaded, the wizard version check would clear localStorage, but the timing caused the old `wizardState` to be restored before it was cleared, resulting in the progress indicator showing the old step progression.

**Fix:**
Modified `startOver()` in `services/wizard/frontend/public/scripts/modules/rollback.js` to:
1. Call `localStorage.clear()` to remove ALL localStorage data
2. Immediately set `wizardVersion` to prevent re-clearing on reload
3. This ensures a clean slate when the page reloads

**Files Changed:**
- `services/wizard/frontend/public/scripts/modules/rollback.js`

**Testing:**
1. Navigate to step 5 (Configure)
2. Click "Start Over" button
3. Confirm the reset
4. After page reloads, verify progress indicator shows only step 1 as active
5. Do a hard reload (Cmd+Shift+R)
6. Verify progress indicator still shows only step 1 as active


## Issue 12: Undo Button Returns Confusing 404 Error

**Problem:**
When clicking the "Undo" button with no previous configurations saved, the API returned a 404 status code with the message "No previous versions available". This was confusing because:
1. A 404 typically means "endpoint not found", not "no data available"
2. The error appeared to be a routing issue, requiring server restarts to "fix"
3. The frontend showed a generic error message instead of explaining the situation

**Root Cause:**
The `/api/rollback/undo` endpoint was returning `res.status(404).json(...)` when there were no saved versions to undo to. This is semantically incorrect - the endpoint exists and works correctly, it just has no data to operate on.

**Fix:**
1. Changed the API response from 404 to 200 status code when no versions are available
2. Added a clear, user-friendly message: "There are no saved configurations to undo to. Make some changes first."
3. Updated frontend to handle `success: false` responses and show the message as an info notification instead of an error

**Files Changed:**
- `services/wizard/backend/src/api/rollback.js` - Changed status code from 404 to 200
- `services/wizard/frontend/public/scripts/modules/rollback.js` - Added handling for success:false responses

**Testing:**
1. Navigate to step 5 (Configure)
2. Click "Undo" button without making any changes
3. Verify you see an info notification saying "There are no saved configurations to undo to. Make some changes first."
4. Make a configuration change (e.g., toggle a setting)
5. Click "Undo" button
6. Verify the change is undone successfully

**Technical Note:**
HTTP status codes should reflect the request processing status, not the business logic outcome:
- 200: Request processed successfully (even if result is "no data")
- 404: Endpoint/resource not found (routing issue)
- 400: Bad request (invalid input)
- 500: Server error (unexpected failure)


## Understanding Undo vs Checkpoints

**Important Distinction:**
The wizard has two separate rollback features that serve different purposes:

### 1. Checkpoints (Installation Resume)
- **Purpose:** Save wizard progress so you can resume if the browser closes or installation is interrupted
- **When Created:** Automatically when entering major steps (system-check, profiles, configure, review)
- **What They Save:** Current step, selected profiles, configuration state
- **How to Use:** Automatically prompted on page reload if a checkpoint exists

### 2. Configuration Versions (Undo)
- **Purpose:** Save configuration changes so you can undo them
- **When Created:** Must be explicitly saved or triggered by configuration changes
- **What They Save:** Complete configuration and profile selections
- **How to Use:** Click "Undo" button to restore previous version

**Current Behavior:**
- Checkpoints are created automatically as you progress through the wizard
- Configuration versions are NOT automatically created when selecting profiles
- The "Undo" button will show "There are no saved configurations to undo to" until a version is explicitly saved

**Expected User Flow:**
1. Navigate through wizard and select profiles
2. Make configuration changes on the Configure step
3. Configuration versions should be auto-saved when changes are made
4. "Undo" button can then restore previous configurations

**Future Enhancement:**
Consider auto-saving configuration versions when:
- Profiles are selected/deselected
- Configuration values are changed
- User clicks "Continue" on major steps

This would make the undo feature more intuitive and useful during the wizard flow.


## Issue 13: Undo Button Never Works - Configuration Versions Not Being Saved

**Problem:**
The Undo button always showed "There are no saved configurations to undo to" even after making configuration changes. This was because configuration versions were NEVER being automatically saved - the feature existed in the API but was never called by the frontend.

**Root Cause:**
1. The rollback API had endpoints for saving/restoring versions
2. The frontend had functions to call these endpoints
3. BUT nothing in the code was actually calling these functions
4. Configuration changes were tracked in state but never persisted as versions
5. Profile selections were tracked but never saved as versions

**UX Issues Identified:**
1. No clear distinction between "checkpoints" (resume) and "versions" (undo)
2. No visual feedback when versions are saved
3. No indication of how many versions exist
4. Undo button always visible even when it won't work

**Fix Implemented:**

### 1. Auto-Save Configuration Versions
Added automatic version saving when:
- **Profiles are selected/deselected** - Saves with description "Profile selection changed"
- **Configuration values change** - Saves with description "Configuration updated"

### 2. Configuration Form Listeners
Added event listeners to all configuration form inputs:
- External IP address input
- Public node toggle
- Database password input
- Advanced mode toggle
- Custom environment variables textarea

When any of these change, the configuration state is updated, which triggers an auto-save.

### 3. Visual Feedback
- Auto-saves show a subtle 2-second notification: "Saved: [description]"
- Manual saves show a longer notification with version ID
- Failed auto-saves are logged but don't show error notifications (to avoid spam)

### 4. Smart Saving Logic
- Skips saving if there's no meaningful data (empty config and no profiles)
- Prevents duplicate saves for the same data
- Logs all save operations for debugging

**Files Changed:**
- `services/wizard/frontend/public/scripts/wizard-refactored.js`
  - Added auto-save triggers for configuration and profile changes
- `services/wizard/frontend/public/scripts/modules/navigation.js`
  - Added `setupConfigurationListeners()` function
  - Wires up form inputs to state manager
- `services/wizard/frontend/public/scripts/modules/rollback.js`
  - Enhanced `saveConfigurationVersion()` with smart logic
  - Added subtle notifications for auto-saves
  - Skip saving when no data exists

**Testing:**
1. Start fresh (Start Over)
2. Navigate to Step 4 (Profiles)
3. Select a profile - you should see "Saved: Profile selection changed"
4. Navigate to Step 5 (Configure)
5. Change external IP - you should see "Saved: Configuration updated"
6. Click "Undo" - should restore previous configuration
7. Click "Undo" again - should restore to before that
8. Keep clicking "Undo" until you see "There are no saved configurations to undo to"

**Expected Behavior:**
- Each profile selection creates a version
- Each configuration change creates a version
- Undo button restores previous versions in reverse chronological order
- Clear notifications show when versions are saved
- Undo works seamlessly throughout the wizard flow

**Future Enhancements:**
- Show version count in UI (e.g., "Undo (3 versions available)")
- Add "Version History" modal to see all saved versions
- Allow restoring any specific version, not just the previous one
- Show what changed in each version
- Add "Redo" button to restore undone changes
