# Rollback Testing - Quick Start Guide

**Status**: Ready for manual testing  
**Wizard URL**: http://localhost:3000  
**Backend Status**: Running ✅

## Quick Test Commands

Open your browser to http://localhost:3000, then open DevTools Console (F12 or Cmd+Option+I) and try these commands:

### 1. Test Save Version
```javascript
await window.rollback.saveConfigurationVersion('My test version');
// Should show green notification: "Configuration saved successfully"
```

### 2. Test Load History
```javascript
await window.rollback.loadVersionHistory();
// Check console for version list
```

### 3. Test Show Version History Modal
```javascript
window.rollback.showVersionHistoryModal();
// Modal should appear with version list
```

### 4. Test Create Checkpoint
```javascript
await window.rollback.createCheckpoint('test-stage', { test: 'data' });
// Should show success message and return checkpoint ID
```

### 5. Test Undo (after making a change)
```javascript
await window.rollback.undoLastChange();
// Should show notification and revert last change
```

### 6. Check Current State
```javascript
console.log(window.wizard.stateManager.getState());
// Shows current wizard state
```

### 7. Test Start Over (CAREFUL!)
```javascript
// This will reset everything - only use for testing
await window.rollback.startOver({ deleteData: false, deleteConfig: false });
```

## Visual Testing Checklist

### ✅ Quick Visual Check (5 minutes)

1. **Open wizard**: http://localhost:3000
2. **Check header**: 
   - [ ] Kaspa logo visible
   - [ ] "Start Over" button in top-right
3. **Check welcome screen**:
   - [ ] Progress indicator shows step 1
   - [ ] "Get Started" button visible
4. **Click "Get Started"**:
   - [ ] Moves to step 2
   - [ ] Progress indicator updates
5. **Navigate to step 4 (Profiles)**:
   - [ ] Profile cards display
   - [ ] Select a profile
6. **Check for Undo button**:
   - [ ] Should appear in bottom-right after selection
   - [ ] Has green background
   - [ ] Shows icon + "Undo" text
7. **Click "Start Over" button**:
   - [ ] Confirmation modal appears
   - [ ] Has two checkboxes
   - [ ] Has "Cancel" and "Start Over" buttons
8. **Click "Cancel"**:
   - [ ] Modal closes
   - [ ] No changes made
9. **Open DevTools Console**:
   - [ ] No red errors
   - [ ] Should see "Wizard module loaded"
   - [ ] Should see "Kaspa Installation Wizard initialized"

### ✅ If Quick Check Passes

You're ready for comprehensive testing! Follow the full checklist in `../implementation-summaries/testing/ROLLBACK_TESTING_CHECKLIST.md`.

## Common Issues & Solutions

### Issue: "window.rollback is undefined"
**Solution**: Wait for page to fully load. Check console for "Wizard module loaded" message.

### Issue: Undo button doesn't appear
**Solution**: 
1. Make sure you're on step 4 or later
2. Make a configuration change (select a profile)
3. Button should appear after state change

### Issue: Modal doesn't open
**Solution**: 
1. Check console for errors
2. Verify modal element exists: `document.getElementById('version-history-modal')`
3. Try calling function directly: `window.rollback.showVersionHistoryModal()`

### Issue: API calls fail
**Solution**:
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check console Network tab for failed requests
3. Restart backend if needed: `cd services/wizard/backend && npm start`

## Test Priorities

### Priority 1: Critical Features (Must Work)
1. ✅ Undo button appears and works
2. ✅ Start Over confirmation and execution
3. ✅ Version history modal opens and displays
4. ✅ Checkpoint creation and resume
5. ✅ State persistence across page reload

### Priority 2: Important Features (Should Work)
1. ✅ Notifications display correctly
2. ✅ Error recovery dialog
3. ✅ Responsive design (mobile, tablet, desktop)
4. ✅ Dark mode switching

### Priority 3: Nice to Have (Good to Test)
1. ✅ Auto-hide undo button after 30 seconds
2. ✅ Modal close on outside click
3. ✅ Keyboard shortcuts
4. ✅ Browser compatibility (Chrome, Firefox, Safari)

## Time Estimates

- **Quick Visual Check**: 5 minutes
- **Priority 1 Testing**: 15 minutes
- **Priority 2 Testing**: 15 minutes
- **Priority 3 Testing**: 10 minutes
- **Full Comprehensive Testing**: 1-2 hours (using ROLLBACK_TESTING_CHECKLIST.md)

## What to Test First

1. **Start here**: Quick Visual Check (above)
2. **Then**: Priority 1 features
3. **Then**: Priority 2 features
4. **Finally**: Full comprehensive testing if time permits

## Reporting Issues

If you find any issues, document them in the "Bug Tracking" section of `../implementation-summaries/testing/ROLLBACK_TESTING_CHECKLIST.md`:

| # | Severity | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------------|--------|
| 1 | High | Undo button doesn't appear | 1. Navigate to step 4... | Open |

**Severity Levels**:
- **Critical**: Blocks testing, must fix immediately
- **High**: Major feature broken, fix before Task 2
- **Medium**: Minor issue, can fix later
- **Low**: Cosmetic, nice to have

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark Task 1.6 complete in TEST_RELEASE_TASKS.md
2. Mark Task 1 complete
3. Move to Task 2: Complete Wizard Frontend Steps

### If Issues Found ⚠️
1. Document all issues in ROLLBACK_TESTING_CHECKLIST.md
2. Prioritize by severity
3. Fix critical and high severity issues
4. Re-test affected areas
5. Then proceed to Task 2

## Resources

- **Full Testing Checklist**: `../implementation-summaries/testing/ROLLBACK_TESTING_CHECKLIST.md` (14 test suites, 42 tests)
- **Automated Tests**: `./test-rollback-features.sh` (11 tests, all passing)
- **Test Results**: `../implementation-summaries/rollback/ROLLBACK_AUTOMATED_TESTS_COMPLETE.md`
- **Implementation Summary**: `../implementation-summaries/rollback/ROLLBACK_UI_INTEGRATION_COMPLETE.md`
- **Task Tracking**: `TEST_RELEASE_TASKS.md`

## Backend Management

### Start Backend
```bash
cd services/wizard/backend
npm start
```

### Stop Backend
Press `Ctrl+C` in the terminal where it's running

### Check Backend Status
```bash
curl http://localhost:3000/api/health
```

### View Backend Logs
Check the terminal where `npm start` is running

---

**Ready to test?** Open http://localhost:3000 and start with the Quick Visual Check above!
