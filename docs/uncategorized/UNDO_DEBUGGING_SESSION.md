# Undo Feature Debugging Session

## Current Status: Partially Working, Has Issues

### What's Working ✅
1. Versions ARE being saved successfully
2. The `isUndoing` flag IS preventing profile auto-saves during undo
3. The API calls are working correctly
4. The backup directory path is now correct

### What's NOT Working ❌
1. **Infinite Loop**: Clicking Undo causes an endless cycle
2. **Navigation Triggered**: Undo causes navigation between Step 4 and Step 5
3. **Configuration Auto-Save Still Fires**: Despite the flag, configuration updates still save
4. **UI Not Updating**: Profiles remain selected in the UI after undo
5. **Stays on Same Step**: User expects to stay on current step, but navigation happens

## Root Causes Identified

### Issue 1: Configuration Subscriber Doesn't Check Flag
**Problem**: The configuration change subscriber wasn't checking `isUndoingNow()` flag

**Fix Applied**: Added flag check to configuration subscriber

**Status**: Fixed in latest code, needs testing

### Issue 2: Unknown Navigation Trigger
**Problem**: Something is causing navigation from Step 5 → Step 4 → Step 5 during undo

**Hypothesis**: 
- State updates might be triggering `loadProgress()` function
- Or there's a `goToStep()` call somewhere in the undo chain
- Or the state manager's `set()` method has side effects

**Needs Investigation**: Where is the navigation coming from?

### Issue 3: Large Configuration Object Appears
**Problem**: When entering Step 5, a large configuration object with many keys appears:
```
{KASPA_NODE_MODE: 'remote', REMOTE_KASPA_NODE_URL: 'https://api.kaspa.org', ...}
```

**Question**: Where is this coming from? Is there default configuration being loaded?

## Console Log Analysis

### Sequence of Events When Clicking Undo:
```
1. User clicks Undo on Step 5
2. "Skipping auto-save: undo operation in progress" (profiles) ✅
3. "Configuration updated: {...}" (large object)
4. "Skipping auto-save: undo operation in progress" (config) ✅ (after fix)
5. "Configuration version saved" ❌ (still happening somehow)
6. "Entered step 4: profiles" ❌ (unexpected navigation)
7. "Checkpoint created: cp-... at stage step-profiles-entered"
8. "Entered step 5: configure" ❌ (navigation continues)
9. "Checkpoint created: cp-... at stage step-configure-entered"
10. Loop repeats...
```

### Key Observations:
- The flag IS working for the immediate auto-save attempts
- But configuration is STILL being saved somehow
- Navigation is definitely happening (Steps 6 & 8)
- Each navigation creates new checkpoints

## Theories

### Theory 1: Async Timing Issue
The `isUndoing` flag might be cleared before all async operations complete, allowing late-firing saves to proceed.

### Theory 2: Multiple State Updates
The undo might be calling `stateManager.set()` multiple times, and each call triggers the subscriber, overwhelming the flag check.

### Theory 3: Navigation Side Effect
Something in the state manager or navigation code might be watching for state changes and automatically navigating to the "correct" step based on the restored state.

### Theory 4: Configuration Initialization
Entering Step 5 might trigger loading of default configuration values, which then triggers a save.

## Recommended Next Steps

### Immediate Fixes Needed:
1. ✅ Add `isUndoingNow()` check to configuration subscriber (DONE)
2. ⏳ Find and stop the navigation trigger during undo
3. ⏳ Investigate where the large configuration object comes from
4. ⏳ Add debouncing to auto-save to prevent rapid-fire saves
5. ⏳ Make undo operation fully synchronous to prevent timing issues

### Investigation Needed:
1. Search for `goToStep()` calls in undo chain
2. Check if `stateManager.set()` has navigation side effects
3. Check if `loadProgress()` is being called during undo
4. Find where default configuration is loaded on Step 5 entry

### Alternative Approach:
Instead of trying to prevent auto-saves during undo, consider:
1. **Disable auto-save entirely** and require manual saves
2. **Add a "Save" button** that users click explicitly
3. **Only auto-save on step navigation**, not on every change
4. **Debounce auto-saves** to 2-3 seconds after last change

## Code Locations

### Files Modified:
- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Added `isUndoingNow()` checks
- `services/wizard/frontend/public/scripts/modules/rollback.js` - Added `isUndoing` flag and `updateProfileUI()`
- `services/wizard/backend/src/api/rollback.js` - Return restored config in undo response
- `services/wizard/backend/src/utils/rollback-manager.js` - Fixed project root path

### Key Functions:
- `undoLastChange()` - Main undo function
- `saveConfigurationVersion()` - Auto-save function
- `stateManager.subscribe()` - State change listeners
- `setupConfigurationListeners()` - Form input listeners

## Testing Checklist

When testing the next fix:
- [ ] Click Undo once - does it restore correctly?
- [ ] Click Undo once - does navigation happen?
- [ ] Click Undo once - do profiles update in UI?
- [ ] Click Undo multiple times - does it stop at the beginning?
- [ ] Check console - are saves still happening during undo?
- [ ] Check console - is navigation being triggered?
- [ ] Navigate back to Step 4 - are profiles correctly shown?

## Success Criteria

The undo feature will be considered working when:
1. ✅ Clicking Undo restores previous state
2. ❌ No navigation occurs during undo
3. ❌ UI updates to reflect restored state
4. ❌ No auto-saves fire during undo operation
5. ❌ Can undo multiple times back to beginning
6. ❌ Shows clear message when no more undos available
7. ❌ Stays on current step throughout undo process
