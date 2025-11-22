# Wizard Checklist and System Check Status

**Date**: November 22, 2025  
**Status**: PARTIALLY IMPLEMENTED

## Summary

The wizard has **backend support** for system checks but the **frontend is not fully wired up** to use these APIs. Steps 2 (Checklist) and 3 (System Check) exist in the HTML but lack the JavaScript modules to connect them to the backend.

---

## What Exists

### ✅ Backend APIs (COMPLETE)

The backend has full support for system checking:

**API Endpoint**: `/api/system-check`

**Available Routes**:
- `GET /api/system-check` - Run full system check
- `GET /api/system-check/docker` - Check Docker only
- `GET /api/system-check/docker-compose` - Check Docker Compose only
- `GET /api/system-check/resources` - Check system resources only
- `POST /api/system-check/ports` - Check specific ports

**System Checker Utility**: `services/wizard/backend/src/utils/system-checker.js`

**Capabilities**:
- ✅ Docker version detection
- ✅ Docker Compose version detection
- ✅ CPU core count
- ✅ RAM memory (total/free)
- ✅ Disk space availability
- ✅ Port availability checking
- ✅ Resource recommendations via ResourceChecker integration
- ✅ Profile recommendations based on detected resources

**Response Format**:
```javascript
{
  docker: { installed: true, version: "24.0.0", message: "..." },
  dockerCompose: { installed: true, version: "2.20.0", message: "..." },
  resources: {
    memory: { total, free, totalGB, freeGB, meetsMinimum, message },
    cpu: { count, model, meetsMinimum, message },
    disk: { total, available, used, availableGB, meetsMinimum, message }
  },
  ports: { 8080: { available: true, message: "..." }, ... },
  detectedResources: { ... },
  recommendations: { primary: { profile, useRemoteNode }, ... },
  summary: {
    status: "success|warning|error",
    message: "...",
    canProceed: true,
    recommendedProfile: "core",
    useRemoteNode: false
  }
}
```

### ✅ Frontend HTML (COMPLETE)

The HTML structure exists for both steps:

**Step 2 - Checklist** (`#step-checklist`):
- Checklist progress summary
- System requirements check UI
- Docker installation check UI
- Docker Compose check UI
- Port availability check UI
- Optional profile quiz UI
- Time estimates display

**Step 3 - System Check** (`#step-system-check`):
- Check results display
- Docker check item
- Docker Compose check item
- System resources check item
- Port availability check item

### ⚠️ Frontend JavaScript (INCOMPLETE)

**What's Missing**:

1. **No checklist.js module** - Frontend module to:
   - Call `/api/system-check` endpoint
   - Parse and display results
   - Update checklist item statuses
   - Show/hide remediation actions
   - Calculate time estimates
   - Handle quiz functionality

2. **No system-check.js module** - Frontend module to:
   - Run system checks when step 3 loads
   - Update check item UI states
   - Display check results
   - Enable/disable continue button based on results
   - Show error remediation options

3. **Placeholder functions** in `wizard-refactored.js`:
   ```javascript
   window.toggleChecklistItem = (item) => { /* basic toggle */ };
   window.showDockerGuide = () => { /* notification only */ };
   window.showComposeGuide = () => { /* notification only */ };
   window.startQuiz = () => { /* notification only */ };
   ```

---

## What Needs to Be Done

### Task: Wire Up Frontend to Backend

**Priority**: HIGH  
**Estimated Time**: 4-6 hours

#### Subtask 1: Create checklist.js Module

Create `services/wizard/frontend/public/scripts/modules/checklist.js`:

**Responsibilities**:
- Run system check API call on step entry
- Parse API response
- Update checklist item statuses (checking → success/warning/error)
- Display detailed results for each item
- Show/hide remediation actions
- Calculate and display time estimates
- Implement profile quiz logic
- Update checklist progress summary

**Key Functions**:
```javascript
export async function runSystemCheck()
export function updateChecklistItem(item, status, data)
export function showRemediationActions(item, remediation)
export function calculateTimeEstimates(profiles, resources)
export function initializeQuiz()
export function processQuizAnswers(answers)
```

#### Subtask 2: Create system-check.js Module

Create `services/wizard/frontend/public/scripts/modules/system-check.js`:

**Responsibilities**:
- Run full system check when step 3 loads
- Update check item UI states
- Display check results with appropriate icons
- Enable/disable continue button
- Show detailed error messages
- Provide remediation guidance

**Key Functions**:
```javascript
export async function runFullSystemCheck()
export function updateCheckItem(checkId, status, data)
export function displayCheckResults(results)
export function handleCheckFailure(checkId, error)
export function canProceedToNextStep(results)
```

#### Subtask 3: Update wizard-refactored.js

Import and initialize the new modules:

```javascript
import { runSystemCheck, initializeQuiz } from './modules/checklist.js';
import { runFullSystemCheck } from './modules/system-check.js';

// In setupEventListeners():
document.addEventListener('stepEntry', (e) => {
  const { stepNumber, stepId } = e.detail;
  
  if (stepId === 'step-checklist') {
    runSystemCheck();
  }
  
  if (stepId === 'step-system-check') {
    runFullSystemCheck();
  }
});
```

#### Subtask 4: Replace Placeholder Functions

Remove placeholder implementations and use real module functions:

```javascript
// Remove these placeholders:
window.toggleChecklistItem = ...
window.showDockerGuide = ...
window.showComposeGuide = ...
window.startQuiz = ...

// Import from modules instead
```

---

## Integration Points

### Step 2 → Step 3 Flow

1. User lands on Step 2 (Checklist)
2. `runSystemCheck()` is called automatically
3. API call to `/api/system-check` with required ports
4. Results populate checklist items
5. User reviews checklist, reads help text
6. User clicks "Continue to System Check"
7. Step 3 loads and runs `runFullSystemCheck()`
8. Detailed check results displayed
9. Continue button enabled if checks pass

### State Management

Store check results in state manager:

```javascript
stateManager.set('systemCheckResults', results);
stateManager.set('checklistCompleted', true);
stateManager.set('recommendedProfile', results.summary.recommendedProfile);
stateManager.set('useRemoteNode', results.summary.useRemoteNode);
```

### Error Handling

If critical checks fail:
- Show remediation guidance
- Disable continue button
- Provide installation guides
- Link to troubleshooting docs

---

## Testing Checklist

After implementation:

- [ ] Step 2 loads and runs system check automatically
- [ ] Checklist items update with real data
- [ ] Docker check shows version or error
- [ ] Docker Compose check shows version or error
- [ ] System resources display correctly
- [ ] Port checks work for required ports
- [ ] Remediation actions appear when needed
- [ ] Time estimates calculate correctly
- [ ] Quiz functionality works (if implemented)
- [ ] Step 3 runs full check on entry
- [ ] Check results display with correct icons
- [ ] Continue button enables/disables correctly
- [ ] Error messages are clear and helpful
- [ ] State persists across page refreshes

---

## Related Files

**Backend**:
- `services/wizard/backend/src/api/system-check.js`
- `services/wizard/backend/src/utils/system-checker.js`
- `services/wizard/backend/src/utils/resource-checker.js`

**Frontend**:
- `services/wizard/frontend/public/index.html` (Steps 2 & 3)
- `services/wizard/frontend/public/scripts/wizard-refactored.js`
- `services/wizard/frontend/public/scripts/modules/api-client.js`
- `services/wizard/frontend/public/scripts/modules/state-manager.js`

**To Create**:
- `services/wizard/frontend/public/scripts/modules/checklist.js`
- `services/wizard/frontend/public/scripts/modules/system-check.js`

---

## Recommendation

This work should be prioritized as **Task 1.1** in the test-release spec, since Steps 2 and 3 are critical for the wizard flow. Without these steps working, users can't properly validate their system before installation.

The backend is solid and ready to use - we just need to build the frontend modules to connect to it.
