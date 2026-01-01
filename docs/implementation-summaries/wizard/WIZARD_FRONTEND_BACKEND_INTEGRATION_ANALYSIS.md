# Wizard Frontend-Backend Integration Analysis

## Executive Summary

**Issue**: When clicking "continue" on Step 1 (Welcome), the wizard progresses to Step 2 (Pre-Installation Checklist), but the backend system checks are NOT actually running. The checklist items show placeholder states instead of real check results.

**Root Cause**: The `runSystemCheck()` function in the checklist module is being called, but it's making API calls to `/api/system-check` which requires query parameters. The API call is likely failing silently or the results are not being properly processed.

**Impact**: Users cannot see actual system status before proceeding with installation, making it impossible to identify missing dependencies (Docker, Docker Compose) or port conflicts before attempting installation.

---

## Architecture Overview

### Step Flow
```
Step 1: Welcome
    ↓ (Click Continue)
Step 2: Checklist (Pre-Installation Checklist) ← ISSUE HERE
    ↓ (Click Continue)
Step 3: System Check
    ↓ (Click Continue)
Step 4: Templates
    ... (continues through profiles, configure, review, install, complete)
```

### Frontend-Backend Communication

**Frontend Stack**:
- `services/wizard/frontend/public/scripts/wizard-refactored.js` - Main entry point
- `services/wizard/frontend/public/scripts/modules/navigation.js` - Step navigation
- `services/wizard/frontend/public/scripts/modules/checklist.js` - Step 2 logic
- `services/wizard/frontend/public/scripts/modules/system-check.js` - Step 3 logic
- `services/wizard/frontend/public/scripts/modules/api-client.js` - API communication

**Backend Stack**:
- `services/wizard/backend/src/server.js` - Express server setup
- `services/wizard/backend/src/api/system-check.js` - System check endpoints
- `services/wizard/backend/src/utils/system-checker.js` - System check logic

---

## Problem Analysis

### 1. Step Entry Trigger

**File**: `services/wizard/frontend/public/scripts/modules/wizard-refactored.js` (lines 203-214)

```javascript
// Run system check when entering checklist step
if (stepId === 'checklist') {
    runSystemCheck().catch(error => {
        console.error('Failed to run system check:', error);
    });
}

// Run full system check when entering system check step
if (stepId === 'system-check') {
    runFullSystemCheck().catch(error => {
        console.error('Failed to run full system check:', error);
    });
}
```

**Status**: ✅ Correctly triggers `runSystemCheck()` when entering Step 2 (checklist)

---

### 2. API Call Implementation

**File**: `services/wizard/frontend/public/scripts/modules/checklist.js` (lines 14-50)

```javascript
export async function runSystemCheck() {
    console.log('Running system check...');
    
    try {
        // Define ports with descriptions
        const portDescriptions = { /* ... */ };
        
        // Get required ports (excluding 3000 since wizard uses it)
        const requiredPorts = [8080, 16110, 16111, 5433, 5434, 8081];
        
        // Call backend API
        const results = await api.get(`/system-check?ports=${requiredPorts.join(',')}`);
        
        // Add descriptions to port results
        if (results.ports) {
            Object.keys(results.ports).forEach(port => {
                results.ports[port].description = portDescriptions[port] || 'Unknown service';
            });
        }
        
        console.log('System check results:', results);
        
        // Store results in state
        stateManager.set('systemCheckResults', results);
        
        // Update checklist items
        updateChecklistItem('requirements', results.resources);
        updateChecklistItem('docker', results.docker);
        updateChecklistItem('compose', results.dockerCompose);
        updateChecklistItem('ports', results.ports);
        
        // Update summary
        updateChecklistSummary(results);
        
        // Calculate time estimates
        calculateTimeEstimates(results);
        
        return results;
    } catch (error) {
        console.error('System check failed:', error);
        showNotification('System check failed. Please try again.', 'error');
        
        // Show error state
        showChecklistError(error);
        
        throw error;
    }
}
```

**Status**: ⚠️ **ISSUE IDENTIFIED** - The API call is made with query parameters, but there are several potential problems:

1. **Query Parameter Format**: The API expects `?ports=8080,16110,16111,5433,5434,8081`
2. **Backend Route Mismatch**: The backend has TWO different endpoints:
   - `GET /api/system-check` - Expects query parameters
   - `POST /api/system-check/ports` - Expects JSON body with `ports` array

---

### 3. Backend API Endpoint

**File**: `services/wizard/backend/src/api/system-check.js`

```javascript
// GET /api/system-check - Run full system check
router.get('/', async (req, res) => {
  try {
    const requiredPorts = req.query.ports 
      ? req.query.ports.split(',').map(p => parseInt(p, 10))
      : [];
    
    const results = await systemChecker.runFullCheck(requiredPorts);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'System check failed',
      message: error.message
    });
  }
});

// POST /api/system-check/ports - Check specific ports
router.post('/ports', async (req, res) => {
  try {
    const { ports } = req.body;
    
    if (!Array.isArray(ports)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'ports must be an array of port numbers'
      });
    }
    
    const result = await systemChecker.checkPortAvailability(ports);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Port check failed',
      message: error.message
    });
  }
});
```

**Status**: ✅ Backend endpoint exists and should work with query parameters

---

### 4. Backend Route Registration

**File**: `services/wizard/backend/src/server.js` (line 68)

```javascript
app.use('/api/system-check', systemCheckRouter);
```

**Status**: ✅ Route is properly registered

---

## Identified Issues

### Issue 1: Silent API Failure (Most Likely)

**Problem**: The API call might be failing due to:
- CORS issues
- Network timeout
- Backend not responding
- Malformed response

**Evidence**: The error is caught but only logged to console. Users see no indication of failure.

**Impact**: Checklist items remain in "checking" state or show placeholder values.

---

### Issue 2: Missing Error Handling in UI

**Problem**: When `runSystemCheck()` throws an error, the `showChecklistError()` function is called, but it only shows generic "Check Failed" messages without details.

**File**: `services/wizard/frontend/public/scripts/modules/checklist.js` (lines 280-305)

```javascript
function showChecklistError(error) {
    const items = ['requirements', 'docker', 'compose', 'ports'];
    
    items.forEach(itemId => {
        const item = document.querySelector(`.checklist-item[data-item="${itemId}"]`);
        if (!item) return;
        
        const statusIcon = item.querySelector('.status-icon');
        const statusText = item.querySelector('.status-text');
        
        if (statusIcon) statusIcon.textContent = '❌';
        if (statusText) statusText.textContent = 'Check Failed';
        
        item.classList.remove('checking', 'success', 'warning');
        item.classList.add('error');
    });
}
```

**Impact**: Users cannot diagnose why checks are failing.

---

### Issue 3: No Retry Mechanism on Step 2

**Problem**: Unlike Step 3 (System Check), Step 2 (Checklist) has no visible retry button. If the check fails, users cannot retry without navigating away and back.

**Evidence**: 
- Step 3 has `retrySystemCheck()` function
- Step 2 has no equivalent

**Impact**: Users stuck if initial check fails.

---

### Issue 4: Inconsistent API Usage Between Steps

**Problem**: 
- Step 2 (Checklist) uses `runSystemCheck()` from `checklist.js`
- Step 3 (System Check) uses `runFullSystemCheck()` from `system-check.js`
- Both call the same backend endpoint but with different logic

**Files**:
- `services/wizard/frontend/public/scripts/modules/checklist.js` - Step 2
- `services/wizard/frontend/public/scripts/modules/system-check.js` - Step 3

**Impact**: Duplicate code, inconsistent error handling, maintenance burden.

---

### Issue 5: No Validation Before Proceeding

**Problem**: The checklist step doesn't validate that checks passed before allowing user to continue to Step 3.

**Evidence**: No validation in `navigation.js` for the checklist step (unlike configure and review steps).

**Impact**: Users can proceed even if Docker/Docker Compose are not installed.

---

## Recommended Fixes

### Fix 1: Add Comprehensive Error Logging

**Location**: `services/wizard/frontend/public/scripts/modules/checklist.js`

```javascript
export async function runSystemCheck() {
    console.log('Running system check...');
    
    try {
        const requiredPorts = [8080, 16110, 16111, 5433, 5434, 8081];
        
        console.log('Calling API: /system-check?ports=' + requiredPorts.join(','));
        
        const results = await api.get(`/system-check?ports=${requiredPorts.join(',')}`);
        
        console.log('API Response received:', results);
        
        // ... rest of code
    } catch (error) {
        console.error('System check failed:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response
        });
        
        showNotification(
            `System check failed: ${error.message}. Check browser console for details.`,
            'error',
            5000
        );
        
        showChecklistError(error);
        throw error;
    }
}
```

---

### Fix 2: Add Retry Button to Step 2

**Location**: `services/wizard/frontend/public/index.html` (Step 2 footer)

Add a retry button similar to Step 3:

```html
<div class="step-footer">
    <button class="btn-secondary" onclick="retryChecklistCheck()">
        <span class="btn-icon">🔄</span>
        Retry Check
    </button>
    <button class="btn-primary" id="checklist-continue" disabled>
        Continue
    </button>
</div>
```

**Location**: `services/wizard/frontend/public/scripts/modules/checklist.js`

```javascript
export async function retryChecklistCheck() {
    // Reset all check items to checking state
    const checkItems = document.querySelectorAll('.checklist-item');
    
    checkItems.forEach(checkItem => {
        checkItem.classList.remove('success', 'warning', 'error');
        checkItem.classList.add('checking');
        
        const iconElement = checkItem.querySelector('.status-icon');
        if (iconElement) {
            iconElement.innerHTML = '<div class="spinner"></div>';
        }
        
        const messageElement = checkItem.querySelector('.status-text');
        if (messageElement) {
            messageElement.textContent = 'Checking...';
        }
    });
    
    // Disable continue button
    const continueButton = document.getElementById('checklist-continue');
    if (continueButton) {
        continueButton.disabled = true;
    }
    
    // Run check
    return runSystemCheck();
}
```

---

### Fix 3: Add Validation Before Proceeding from Step 2

**Location**: `services/wizard/frontend/public/scripts/modules/navigation.js`

```javascript
export async function nextStep() {
    const currentStep = stateManager.get('currentStep');
    const currentStepId = getStepId(currentStep);
    
    // Validate checklist before leaving checklist step
    if (currentStepId === 'checklist') {
        try {
            const systemCheckResults = stateManager.get('systemCheckResults');
            
            if (!systemCheckResults) {
                showNotification('Please run system check first', 'warning');
                return;
            }
            
            // Check if Docker and Docker Compose are installed
            if (!systemCheckResults.docker?.installed || !systemCheckResults.dockerCompose?.installed) {
                showNotification(
                    'Docker and Docker Compose are required. Please install them first.',
                    'error',
                    5000
                );
                return;
            }
            
            // Warn if resources are insufficient
            if (!systemCheckResults.resources?.memory?.meetsMinimum || 
                !systemCheckResults.resources?.cpu?.meetsMinimum) {
                const proceed = confirm(
                    'Your system resources are below recommended levels. ' +
                    'Installation may be slow or fail. Continue anyway?'
                );
                if (!proceed) return;
            }
        } catch (error) {
            console.error('Failed to validate checklist:', error);
            showNotification('Failed to validate system check results', 'error');
            return;
        }
    }
    
    // ... rest of validation code
}
```

---

### Fix 4: Consolidate System Check Logic

**Recommendation**: Merge `checklist.js` and `system-check.js` into a single module to avoid duplication.

**New Structure**:
```
services/wizard/frontend/public/scripts/modules/
├── system-checks.js (consolidated)
│   ├── runSystemCheck() - for Step 2
│   ├── runFullSystemCheck() - for Step 3
│   ├── retrySystemCheck() - for both steps
│   └── shared utilities
```

---

### Fix 5: Add Timeout and Retry Logic to API Client

**Location**: `services/wizard/frontend/public/scripts/modules/api-client.js`

```javascript
export const api = {
    /**
     * GET request with retry logic
     */
    async get(endpoint, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`API GET ${endpoint} (attempt ${attempt}/${maxRetries})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const error = await response.json().catch(() => ({ 
                        message: response.statusText 
                    }));
                    throw new Error(error.message || response.statusText);
                }
                
                return response.json();
            } catch (error) {
                lastError = error;
                console.error(`API GET ${endpoint} attempt ${attempt} failed:`, error);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    },
    
    // ... similar for POST and DELETE
};
```

---

## Testing Checklist

- [ ] Verify `/api/system-check` endpoint responds with correct data
- [ ] Test with Docker installed and running
- [ ] Test with Docker not installed
- [ ] Test with ports in use
- [ ] Test with insufficient system resources
- [ ] Test API timeout scenarios
- [ ] Test retry functionality
- [ ] Verify error messages display in UI
- [ ] Verify continue button is disabled until checks pass
- [ ] Verify validation prevents proceeding without Docker/Compose

---

## Files Affected

### Frontend
- `services/wizard/frontend/public/scripts/modules/checklist.js` - Add retry, improve error handling
- `services/wizard/frontend/public/scripts/modules/system-check.js` - Consolidate with checklist
- `services/wizard/frontend/public/scripts/modules/api-client.js` - Add retry logic
- `services/wizard/frontend/public/scripts/modules/navigation.js` - Add validation
- `services/wizard/frontend/public/index.html` - Add retry button

### Backend
- `services/wizard/backend/src/api/system-check.js` - Verify endpoint works correctly
- `services/wizard/backend/src/utils/system-checker.js` - Verify check logic

---

## Next Steps

1. **Immediate**: Add comprehensive logging to identify where API calls are failing
2. **Short-term**: Implement retry button and validation
3. **Medium-term**: Consolidate system check modules
4. **Long-term**: Add integration tests for frontend-backend communication

