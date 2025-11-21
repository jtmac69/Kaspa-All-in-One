# Testing Quick Start

## 🚀 Start Testing in 3 Steps

### 1. Start the Wizard (30 seconds)

```bash
cd services/wizard/backend
npm install  # First time only
npm start
```

**Wait for**: `Kaspa Installation Wizard backend running on port 3000`

### 2. Open Browser (10 seconds)

Open: **http://localhost:3000**

### 3. Start Testing (1-2 hours)

Follow: **ROLLBACK_TESTING_CHECKLIST.md**

---

## Quick Test Commands

Open browser console (F12) and try:

```javascript
// Save configuration version
await window.rollback.saveConfigurationVersion('Test version');

// Undo last change
await window.rollback.undoLastChange();

// Show version history
window.rollback.showVersionHistoryModal();

// Create checkpoint
await window.rollback.createCheckpoint('test-stage', { test: 'data' });

// Check current state
console.log(window.wizard.stateManager.getState());
```

---

## What to Look For

### ✅ Good Signs
- No console errors
- Buttons appear and work
- Modals open and close
- Notifications show
- API calls succeed (check Network tab)

### 🔴 Bad Signs
- Console errors (red text)
- Buttons don't work
- Modals don't open
- API calls fail (red in Network tab)
- Page crashes or freezes

---

## Report Issues

Found a bug? Document:
1. What you did (exact steps)
2. What happened (actual result)
3. What should happen (expected result)
4. Browser and OS
5. Console errors (screenshot)

Submit to: GitHub Issues or feedback form

---

## Stop Testing

```bash
# In terminal where wizard is running
Ctrl+C

# Clean up (optional)
cd ../../..
docker-compose down -v
```

---

## Full Documentation

- **Testing Checklist**: ROLLBACK_TESTING_CHECKLIST.md (42 tests)
- **Tester Guide**: TESTER_GUIDE.md (complete guide)
- **Rollback Features**: services/wizard/ROLLBACK_RECOVERY_GUIDE.md

---

**Questions?** Check TESTER_GUIDE.md or ask in Discord!
