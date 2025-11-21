# Rollback Features Testing Checklist

## Overview

This checklist covers all rollback and recovery features that need testing before moving to Task 2.

**Estimated Time**: 1-2 hours  
**Prerequisites**: Wizard backend running, browser with DevTools  
**Date**: November 21, 2025

---

## Setup Instructions

### 1. Start the Wizard Backend

```bash
# Navigate to wizard backend directory
cd services/wizard/backend

# Install dependencies (if not already done)
npm install

# Start the backend server
npm start
```

**Expected Output**:
```
Kaspa Installation Wizard backend running on port 3000
Frontend: http://localhost:3000
API: http://localhost:3000/api
```

### 2. Open Browser

1. Open your browser (Chrome, Firefox, or Safari recommended)
2. Navigate to: `http://localhost:3000`
3. Open DevTools (F12 or Cmd+Option+I on Mac)
4. Keep Console tab open to monitor for errors

### 3. Verify Initial Load

- [ ] Page loads without errors
- [ ] No console errors
- [ ] Wizard displays welcome screen
- [ ] Progress indicator shows step 1
- [ ] Kaspa logo displays correctly

---

## Test Suite 1: Module Loading

### Test 1.1: ES6 Modules Load
- [ ] Open DevTools → Network tab
- [ ] Refresh page
- [ ] Verify these files load successfully:
  - [ ] `wizard-refactored.js`
  - [ ] `modules/api-client.js`
  - [ ] `modules/state-manager.js`
  - [ ] `modules/navigation.js`
  - [ ] `modules/rollback.js`
  - [ ] `modules/utils.js`
- [ ] Check Console for "Wizard module loaded" message
- [ ] Check Console for "Kaspa Installation Wizard initialized (Refactored)"

**Expected**: All modules load with 200 status, no errors

### Test 1.2: Socket.IO Connection
- [ ] Check Console for "WebSocket connected" message
- [ ] Verify no WebSocket errors
- [ ] Check Network tab for socket.io connection

**Expected**: WebSocket connects successfully

---

## Test Suite 2: UI Components Visibility

### Test 2.1: Rollback Buttons
- [ ] **Start Over button** visible in top-right corner
- [ ] Button shows icon + "Start Over" text
- [ ] Button has hover effect
- [ ] **Undo button** NOT visible initially (correct behavior)

### Test 2.2: Modals Exist
- [ ] Inspect HTML for `version-history-modal` element
- [ ] Inspect HTML for `start-over-modal` element
- [ ] Inspect HTML for `error-recovery-dialog` element
- [ ] All modals have `display: none` initially

**Expected**: All UI components present in DOM

---

## Test Suite 3: Navigation & State

### Test 3.1: Step Navigation
- [ ] Click "Get Started" on welcome screen
- [ ] Verify moves to step 2 (Checklist)
- [ ] Check Console for "Entered step 2: checklist"
- [ ] Verify progress indicator updates
- [ ] Use browser back button
- [ ] Verify wizard stays on current step (no page reload)

### Test 3.2: State Persistence
- [ ] Navigate to step 3 or 4
- [ ] Open DevTools → Application → Local Storage
- [ ] Verify `wizardState` key exists
- [ ] Check state contains `currentStep` value
- [ ] Refresh page
- [ ] Verify prompt to resume appears
- [ ] Click "OK" to resume
- [ ] Verify returns to same step

**Expected**: State persists across page reloads

---

## Test Suite 4: Undo Functionality

### Test 4.1: Undo Button Appearance
- [ ] Navigate to step 4 (Profiles)
- [ ] Select a profile (e.g., "Core")
- [ ] Navigate to step 5 (Configure) if available
- [ ] **Undo button** should appear in bottom-right
- [ ] Button shows icon + "Undo" text
- [ ] Button has green background
- [ ] Button has hover effect

**Expected**: Undo button appears after configuration changes

### Test 4.2: Undo Button Auto-Hide
- [ ] Wait 30 seconds after undo button appears
- [ ] Verify button fades out/disappears
- [ ] Make another change
- [ ] Verify button reappears

**Expected**: Button auto-hides after 30 seconds

### Test 4.3: Undo Operation
- [ ] Make a configuration change
- [ ] Wait for undo button to appear
- [ ] Click "Undo" button
- [ ] Check Console for API call to `/api/rollback/undo`
- [ ] Verify notification appears: "Configuration restored successfully"
- [ ] Verify configuration reverts to previous state

**Expected**: Undo reverts last change, shows success notification

### Test 4.4: Undo with No History
- [ ] Clear browser localStorage
- [ ] Refresh page
- [ ] Try to click undo (if visible)
- [ ] Verify error notification or no action

**Expected**: Graceful handling when no history exists

---

## Test Suite 5: Version History

### Test 5.1: Open Version History Modal
- [ ] Click "Start Over" button (to access menu)
- [ ] Or manually call: `window.rollback.showVersionHistoryModal()`
- [ ] Verify modal appears
- [ ] Modal has title "Configuration History"
- [ ] Modal has close button (X)

**Expected**: Modal opens successfully

### Test 5.2: Version History Display
- [ ] Check if versions are listed
- [ ] If no versions: verify "No version history available" message
- [ ] If versions exist: verify each shows:
  - [ ] Version ID (e.g., "v-1234567890")
  - [ ] Age (e.g., "2 hours ago")
  - [ ] Profiles (e.g., "core, explorer")
  - [ ] Action (e.g., "manual-save")
  - [ ] "Restore" button

**Expected**: Version history displays correctly or shows empty state

### Test 5.3: Create Version Manually
- [ ] Open Console
- [ ] Run: `await window.rollback.saveConfigurationVersion('Test version')`
- [ ] Verify success notification
- [ ] Open version history modal
- [ ] Verify new version appears in list

**Expected**: Manual version creation works

### Test 5.4: Restore Version
- [ ] Open version history modal
- [ ] Click "Restore" on a version
- [ ] Verify confirmation prompt
- [ ] Click "OK"
- [ ] Check Console for API call to `/api/rollback/restore`
- [ ] Verify success notification
- [ ] Verify modal closes
- [ ] Verify state updates

**Expected**: Version restore works, shows feedback

### Test 5.5: Close Modal
- [ ] Open version history modal
- [ ] Click X button
- [ ] Verify modal closes
- [ ] Click outside modal (if implemented)
- [ ] Verify modal closes

**Expected**: Modal closes properly

---

## Test Suite 6: Start Over

### Test 6.1: Open Start Over Modal
- [ ] Click "Start Over" button (top-right)
- [ ] Verify confirmation modal appears
- [ ] Modal has title "🔄 Start Over?"
- [ ] Modal shows warning message
- [ ] Modal shows "What will happen" list
- [ ] Modal shows "What won't be affected" list
- [ ] Modal has two checkboxes:
  - [ ] "Also remove all containers and volumes"
  - [ ] "Also delete configuration files"
- [ ] Modal has "Cancel" and "Start Over" buttons

**Expected**: Confirmation modal displays correctly

### Test 6.2: Cancel Start Over
- [ ] Open start over modal
- [ ] Click "Cancel" button
- [ ] Verify modal closes
- [ ] Verify no changes made
- [ ] Verify wizard state unchanged

**Expected**: Cancel works, no changes made

### Test 6.3: Start Over (Minimal)
- [ ] Open start over modal
- [ ] Leave both checkboxes UNCHECKED
- [ ] Click "Start Over" button
- [ ] Verify modal closes
- [ ] Check Console for API call to `/api/rollback/start-over`
- [ ] Verify success notification
- [ ] Verify page reloads after 2 seconds
- [ ] Verify returns to welcome screen
- [ ] Verify localStorage cleared

**Expected**: Minimal start over works, resets wizard only

### Test 6.4: Start Over (Full Reset)
- [ ] Open start over modal
- [ ] CHECK both checkboxes
- [ ] Click "Start Over" button
- [ ] Verify confirmation
- [ ] Check Console for API call with deleteData=true, deleteConfig=true
- [ ] Verify success notification
- [ ] Verify page reloads
- [ ] Verify complete reset

**Expected**: Full reset works, removes everything

---

## Test Suite 7: Checkpoints

### Test 7.1: Automatic Checkpoint Creation
- [ ] Navigate through wizard steps
- [ ] Check Console for checkpoint messages:
  - "Checkpoint created: cp-XXXXX at stage step-system-check-entered"
  - "Checkpoint created: cp-XXXXX at stage step-profiles-entered"
- [ ] Open DevTools → Application → Local Storage
- [ ] Verify `lastCheckpoint` key exists
- [ ] Verify value is a checkpoint ID

**Expected**: Checkpoints created automatically at major steps

### Test 7.2: Resume from Checkpoint
- [ ] Navigate to step 3 or 4
- [ ] Wait for checkpoint to be created
- [ ] Refresh page (F5)
- [ ] Verify prompt: "Found previous installation at stage..."
- [ ] Click "OK" to resume
- [ ] Verify wizard returns to saved step
- [ ] Verify state restored

**Expected**: Resume from checkpoint works

### Test 7.3: Decline Resume
- [ ] Navigate to step 3 or 4
- [ ] Refresh page
- [ ] Click "Cancel" on resume prompt
- [ ] Verify wizard starts from beginning
- [ ] Verify localStorage checkpoint cleared

**Expected**: Declining resume works, starts fresh

### Test 7.4: Manual Checkpoint
- [ ] Open Console
- [ ] Run: `await window.rollback.createCheckpoint('test-stage', { test: 'data' })`
- [ ] Verify success message in console
- [ ] Verify checkpoint ID returned
- [ ] Check localStorage for `lastCheckpoint`

**Expected**: Manual checkpoint creation works

---

## Test Suite 8: Error Recovery

### Test 8.1: Simulate Installation Error
- [ ] Open Console
- [ ] Manually trigger error dialog:
```javascript
document.getElementById('error-recovery-dialog').style.display = 'block';
document.querySelector('.error-stage').textContent = 'build';
document.querySelector('.error-message').textContent = 'Failed to build services';
```
- [ ] Verify error recovery dialog appears
- [ ] Dialog shows error stage and message
- [ ] Dialog shows 4 recovery options:
  - [ ] "🔄 Retry Installation"
  - [ ] "↶ Undo Last Change"
  - [ ] "📋 View Version History"
  - [ ] "📊 Export Diagnostic Report"

**Expected**: Error dialog displays correctly

### Test 8.2: Recovery Options
- [ ] Click "Retry Installation"
  - [ ] Verify dialog closes
  - [ ] Check Console for retry attempt
- [ ] Re-open dialog
- [ ] Click "Undo Last Change"
  - [ ] Verify undo operation triggers
- [ ] Re-open dialog
- [ ] Click "View Version History"
  - [ ] Verify version history modal opens
- [ ] Re-open dialog
- [ ] Click "Export Diagnostic Report"
  - [ ] Verify diagnostic export triggers (if implemented)

**Expected**: All recovery options work

### Test 8.3: Close Error Dialog
- [ ] Open error dialog
- [ ] Click "Close" button
- [ ] Verify dialog closes
- [ ] Verify can continue using wizard

**Expected**: Dialog closes properly

---

## Test Suite 9: Notifications

### Test 9.1: Success Notification
- [ ] Open Console
- [ ] Run: `window.rollback.saveConfigurationVersion('Test')`
- [ ] Verify green notification appears (top-right)
- [ ] Notification shows success message
- [ ] Notification has green left border
- [ ] Notification auto-dismisses after 5 seconds

**Expected**: Success notifications work

### Test 9.2: Error Notification
- [ ] Open Console
- [ ] Trigger an error (e.g., invalid API call)
- [ ] Verify red notification appears
- [ ] Notification shows error message
- [ ] Notification has red left border
- [ ] Notification auto-dismisses after 5 seconds

**Expected**: Error notifications work

### Test 9.3: Multiple Notifications
- [ ] Trigger 3 notifications quickly
- [ ] Verify they stack vertically
- [ ] Verify each dismisses independently
- [ ] Verify no overlap

**Expected**: Multiple notifications display correctly

---

## Test Suite 10: Responsive Design

### Test 10.1: Desktop (>1024px)
- [ ] Resize browser to 1440px width
- [ ] Verify all buttons visible
- [ ] Verify modals centered
- [ ] Verify undo button bottom-right
- [ ] Verify start over button top-right
- [ ] Verify notifications top-right

**Expected**: Desktop layout correct

### Test 10.2: Tablet (768px-1024px)
- [ ] Resize browser to 800px width
- [ ] Verify buttons adjust size
- [ ] Verify modals responsive
- [ ] Verify text readable
- [ ] Verify no horizontal scroll

**Expected**: Tablet layout correct

### Test 10.3: Mobile (<768px)
- [ ] Resize browser to 375px width (iPhone size)
- [ ] Verify buttons visible and accessible
- [ ] Verify modals full-width
- [ ] Verify text readable
- [ ] Verify touch targets large enough (44px min)
- [ ] Verify no horizontal scroll

**Expected**: Mobile layout correct

---

## Test Suite 11: Dark Mode

### Test 11.1: Switch to Dark Mode
- [ ] Open System Preferences
- [ ] Switch to Dark Mode
- [ ] Verify wizard switches to dark theme
- [ ] Verify all rollback components themed:
  - [ ] Buttons use dark theme colors
  - [ ] Modals use dark backgrounds
  - [ ] Text readable on dark background
  - [ ] Notifications themed
  - [ ] No white flashes

**Expected**: Dark mode works correctly

### Test 11.2: Switch to Light Mode
- [ ] Switch back to Light Mode
- [ ] Verify wizard switches to light theme
- [ ] Verify all components themed correctly

**Expected**: Light mode works correctly

---

## Test Suite 12: Browser Compatibility

### Test 12.1: Chrome/Edge
- [ ] Test all features in Chrome
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full compatibility

### Test 12.2: Firefox
- [ ] Test all features in Firefox
- [ ] Verify no console errors
- [ ] Verify all features work

**Expected**: Full compatibility

### Test 12.3: Safari
- [ ] Test all features in Safari
- [ ] Verify no console errors
- [ ] Verify all features work
- [ ] Check for ES6 module support

**Expected**: Full compatibility

---

## Test Suite 13: Performance

### Test 13.1: Page Load Time
- [ ] Open DevTools → Network tab
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Check "Load" time in Network tab
- [ ] Verify < 2 seconds on good connection

**Expected**: Fast page load

### Test 13.2: Module Load Time
- [ ] Check individual module load times
- [ ] Verify all modules < 100ms each
- [ ] Verify parallel loading

**Expected**: Fast module loading

### Test 13.3: Memory Usage
- [ ] Open DevTools → Performance → Memory
- [ ] Take heap snapshot
- [ ] Navigate through wizard
- [ ] Take another snapshot
- [ ] Verify no major memory leaks

**Expected**: Reasonable memory usage

---

## Test Suite 14: API Integration

### Test 14.1: API Endpoints
- [ ] Open DevTools → Network tab
- [ ] Filter by "rollback"
- [ ] Perform various rollback operations
- [ ] Verify API calls to:
  - [ ] `/api/rollback/save-version`
  - [ ] `/api/rollback/history`
  - [ ] `/api/rollback/undo`
  - [ ] `/api/rollback/restore`
  - [ ] `/api/rollback/checkpoint`
  - [ ] `/api/rollback/checkpoints`
  - [ ] `/api/rollback/start-over`
- [ ] Verify all return 200 status
- [ ] Verify response data correct

**Expected**: All API calls work

### Test 14.2: Error Handling
- [ ] Stop backend server
- [ ] Try rollback operation
- [ ] Verify error notification
- [ ] Verify graceful failure
- [ ] Restart backend
- [ ] Verify operations work again

**Expected**: Graceful error handling

---

## Bug Tracking

### Issues Found

| # | Severity | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels**:
- **Critical**: Blocks testing, must fix immediately
- **High**: Major feature broken, fix before Task 2
- **Medium**: Minor issue, can fix later
- **Low**: Cosmetic, nice to have

---

## Test Summary

### Completion Status

- [ ] Test Suite 1: Module Loading (__ / 2 tests)
- [ ] Test Suite 2: UI Components (__ / 2 tests)
- [ ] Test Suite 3: Navigation & State (__ / 2 tests)
- [ ] Test Suite 4: Undo Functionality (__ / 4 tests)
- [ ] Test Suite 5: Version History (__ / 5 tests)
- [ ] Test Suite 6: Start Over (__ / 4 tests)
- [ ] Test Suite 7: Checkpoints (__ / 4 tests)
- [ ] Test Suite 8: Error Recovery (__ / 3 tests)
- [ ] Test Suite 9: Notifications (__ / 3 tests)
- [ ] Test Suite 10: Responsive Design (__ / 3 tests)
- [ ] Test Suite 11: Dark Mode (__ / 2 tests)
- [ ] Test Suite 12: Browser Compatibility (__ / 3 tests)
- [ ] Test Suite 13: Performance (__ / 3 tests)
- [ ] Test Suite 14: API Integration (__ / 2 tests)

**Total**: __ / 42 tests passed

### Overall Assessment

- [ ] All critical features work
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready to move to Task 2

### Sign-off

**Tester**: _______________  
**Date**: _______________  
**Status**: ☐ PASS  ☐ FAIL  ☐ PASS WITH ISSUES

---

## Next Steps

### If All Tests Pass
1. Mark Task 1 complete in TEST_RELEASE_TASKS.md
2. Update main tasks.md to mark 6.5.12 complete
3. Move to Task 2: Complete Wizard Steps

### If Issues Found
1. Document all issues in Bug Tracking section
2. Prioritize by severity
3. Fix critical and high severity issues
4. Re-test affected areas
5. Then proceed to Task 2

---

## Quick Test Commands

```javascript
// In browser console:

// Test save version
await window.rollback.saveConfigurationVersion('Test version');

// Test undo
await window.rollback.undoLastChange();

// Show version history
window.rollback.showVersionHistoryModal();

// Create checkpoint
await window.rollback.createCheckpoint('test', { data: 'test' });

// Test start over (careful!)
// await window.rollback.startOver({ deleteData: false, deleteConfig: false });

// Check state
console.log(window.wizard.stateManager.getState());

// Check version history
await window.rollback.loadVersionHistory();
```

---

**Document Version**: 1.0  
**Last Updated**: November 21, 2025  
**Status**: Ready for Testing
