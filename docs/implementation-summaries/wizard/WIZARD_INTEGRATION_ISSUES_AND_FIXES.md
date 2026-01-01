# Wizard Frontend-Backend Integration: Issues and Fixes

## Summary

The wizard frontend-backend integration has **5 critical issues** preventing system checks from running on Step 2 (Pre-Installation Checklist). This document provides specific code locations and recommended fixes.

---

## Issue #1: Silent API Failure with No User Feedback

### Location
`services/wizard/frontend/public/scripts/modules/checklist.js` (lines 14-50)

### Problem
When the API call fails, the error is caught and logged to console, but users see no indication of failure. The checklist items remain in an indeterminate state.

### Current Code
```javascript
export async function runSystemCheck() {
    console.log('Running system check...');
    
    try {
        const requiredPorts = [8080, 16110, 16111, 5433, 5434, 8081];
        const results = await api.get(`/system-check?ports=${requiredPorts.join(',')}`);
        
        // ... process results
        
        return results;
    } catch (error) {
        console.error('System check failed:', error);  // ← Only logs to console
        showNotification('System check failed. Please try again.', 'error');
        showChecklistError(error);
        throw error;
    }
}
```

### Issue
- Error details not shown to user
- No indication of what failed (network? backend? timeout?)
- User cannot diagnose the problem

### Recommended Fix
```javascript
export async function runSystemCheck() {
    console.log('=== CHECKLIST: Starting system check ===');
    
    try {
        const requiredPorts = [8080, 16110, 16111, 5433, 5434, 8081];
        const endpoint = `/system-check?ports=${requiredPorts.join(',')}`;
        
        console.log('CHECKLIST: Calling API endpoint:', endpoint);
        
        const results = await api.get(endpoint);
        
        console.log('CHECKLIST: API response received:', results);
        
        // ... process results
        
        return results;
    } catch (error) {
        console.error('=== CHECKLIST: System check FAILED ===');
        console.error('CHECKLIST: Error:', error.message);
        console.error('CHECKLIST: Full error:', error);
        
        // Show detailed error to user
        const errorMessage = error.message || 'Unknown error';
        showNotification(
            `System check failed: ${errorMessage}. Check browser console for details.`,
            'error',
            5000
        );
        
        showChecklistError(error);
        throw error;
    }
}
```

---

## Issue #2: No Retry Mechanism on Step 2

### Location
`services/wizard/frontend/public/index.html` (Step 2 footer) and `services/wizard/frontend/public/scripts/modules/checklist.js`

### Problem
Unlike Step 3 (System Check), Step 2 has no retry button. If the check fails, users must navigate away and back to retry.

### Current Code
Step 2 footer in HTML:
```html
<div class="step-footer">
    <button class="btn-secondary" onclick="previousStep()">Back</button>
    <button class="btn-primary" id="checklist-continue" disabled>Continue</button>
</div>
```

No retry function in checklist.js.

### Issue
- Users cannot retry failed checks
- Must navigate away and back (poor UX)
- Inconsistent with Step 3 which has retry

### Recommended Fix

**In HTML** (`services/wizard/frontend/public/index.html`):
```html
<div class="step-footer">
    <button class="btn-secondary" onclick="previousStep()">Back</button>
    <button class="btn-secondary" id="checklist-retry" style="display: none;" onclick="retryChecklistCheck()">
        <span class="btn-icon">🔄</span>
        Retry Check
    </button>
    <button class="btn-primary" id="checklist-continue" disabled>Continue</button>
</div>
```

**In checklist.js**:
```javascript
export async function retryChecklistCheck() {
    console.log('CHECKLIST: Retrying system check...');
    
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
        
        // Remove details
        const details = checkItem.querySelector('.check-details');
        if (details) {
            details.remove();
        }
    });
    
    // Disable continue button
    const continueButton = document.getElementById('checklist-continue');
    if (continueButton) {
        continueButton.disabled = true;
    }
    
    // Hide retry button
    const retryButton = document.getElementById('checklist-retry');
    if (retryButton) {
        retryButton.style.display = 'none';
    }
    
    // Run check
    return runSystemCheck();
}

// Update showChecklistError to show retry button
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
    
    // Show retry button
    const retryButton = document.getElementById('checklist-retry');
    if (retryButton) {
        retryButton.style.display = 'inline-block';
    }
}
```

---

## Issue #3: No Validation Before Proceeding from Step 2

### Location
`services/wizard/frontend/public/scripts/modules/navigation.js` (lines 33-70)

### Problem
The `nextStep()` function validates configuration on Step 6 and review on Step 7, but does NOT validate that system checks passed on Step 2. Users can proceed even if Docker/Docker Compose are not installed.

### Current Code
```javascript
export async function nextStep() {
    const currentStep = stateManager.get('currentStep');
    const currentStepId = getStepId(currentStep);
    
    // Validate configuration before leaving configure step
    if (currentStepId === 'configure') {
        try {
            const { validateConfiguration } = await import('./configure.js');
            const isValid = await validateConfiguration();
            if (!isValid) {
                console.log('Configuration validation failed, staying on configure step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate configuration:', error);
            return;
        }
    }
    
    // Validate before leaving review step
    if (currentStepId === 'review') {
        try {
            const { validateBeforeInstallation } = await import('./review.js');
            const isValid = validateBeforeInstallation();
            if (!isValid) {
                console.log('Review validation failed, staying on review step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate review:', error);
            return;
        }
    }
    
    if (currentStep < TOTAL_STEPS) {
        goToStep(currentStep + 1);
    }
}
```

### Issue
- No validation for Step 2 (checklist)
- Users can proceed without Docker/Compose
- Installation will fail later with confusing errors

### Recommended Fix
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
            
            // Check if Docker is installed
            if (!systemCheckResults.docker?.installed) {
                showNotification(
                    'Docker is required but not installed. Please install Docker first.',
                    'error',
                    5000
                );
                return;
            }
            
            // Check if Docker Compose is installed
            if (!systemCheckResults.dockerCompose?.installed) {
                showNotification(
                    'Docker Compose is required but not installed. Please install Docker Compose first.',
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
            
            console.log('CHECKLIST: Validation passed, proceeding to next step');
        } catch (error) {
            console.error('Failed to validate checklist:', error);
            showNotification('Failed to validate system check results', 'error');
            return;
        }
    }
    
    // Validate configuration before leaving configure step
    if (currentStepId === 'configure') {
        try {
            const { validateConfiguration } = await import('./configure.js');
            const isValid = await validateConfiguration();
            if (!isValid) {
                console.log('Configuration validation failed, staying on configure step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate configuration:', error);
            return;
        }
    }
    
    // Validate before leaving review step
    if (currentStepId === 'review') {
        try {
            const { validateBeforeInstallation } = await import('./review.js');
            const isValid = validateBeforeInstallation();
            if (!isValid) {
                console.log('Review validation failed, staying on review step');
                return;
            }
        } catch (error) {
            console.error('Failed to validate review:', error);
            return;
        }
    }
    
    if (currentStep < TOTAL_STEPS) {
        goToStep(currentStep + 1);
    }
}
```

---

## Issue #4: API Client Has No Timeout or Retry Logic

### Location
`services/wizard/frontend/public/scripts/modules/api-client.js` (lines 1-60)

### Problem
The API client makes requests without timeout or retry logic. If the backend is slow or temporarily unavailable, the request hangs indefinitely.

### Current Code
```javascript
export const api = {
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || response.statusText);
            }
            return response.json();
        } catch (error) {
            console.error(`API GET ${endpoint} failed:`, error);
            throw error;
        }
    },
    // ... similar for POST and DELETE
};
```

### Issue
- No timeout (request can hang forever)
- No retry logic (transient failures cause immediate failure)
- No exponential backoff (hammers backend on retry)

### Recommended Fix
```javascript
export const api = {
    /**
     * GET request with timeout and retry logic
     */
    async get(endpoint, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000; // 30 seconds
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
                console.error(`API GET ${endpoint} attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    },
    
    /**
     * POST request with timeout and retry logic
     */
    async post(endpoint, data, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`API POST ${endpoint} (attempt ${attempt}/${maxRetries})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
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
                console.error(`API POST ${endpoint} attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    },
    
    /**
     * DELETE request with timeout and retry logic
     */
    async delete(endpoint, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`API DELETE ${endpoint} (attempt ${attempt}/${maxRetries})`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    method: 'DELETE',
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
                console.error(`API DELETE ${endpoint} attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
};
```

---

## Issue #5: Duplicate System Check Logic Between Steps 2 and 3

### Location
- `services/wizard/frontend/public/scripts/modules/checklist.js` (Step 2)
- `services/wizard/frontend/public/scripts/modules/system-check.js` (Step 3)

### Problem
Both modules implement similar system check logic, leading to:
- Code duplication
- Inconsistent error handling
- Maintenance burden
- Different UI update logic

### Current Code
**checklist.js** has `runSystemCheck()` function
**system-check.js** has `runFullSystemCheck()` and `retrySystemCheck()` functions

Both call the same backend endpoint but with different processing logic.

### Issue
- Duplicate code is hard to maintain
- Bug fixes must be applied in two places
- Inconsistent behavior between steps

### Recommended Fix
Create a consolidated `system-checks.js` module:

```javascript
/**
 * System Checks Module (Consolidated)
 * Handles system check logic for both Step 2 and Step 3
 */

import { api } from './api-client.js';
import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

const PORT_DESCRIPTIONS = {
    8080: 'Dashboard (alternative)',
    8081: 'Dashboard',
    5433: 'K-Social Database',
    5434: 'Simply Kaspa Database',
    16110: 'Kaspa Node (P2P)',
    16111: 'Kaspa Node (RPC)'
};

const REQUIRED_PORTS = [8080, 16110, 16111, 5433, 5434, 8081];

/**
 * Run system check (used by both Step 2 and Step 3)
 */
export async function runSystemCheck(options = {}) {
    const stepName = options.stepName || 'checklist';
    console.log(`=== ${stepName.toUpperCase()}: Starting system check ===`);
    
    try {
        const endpoint = `/system-check?ports=${REQUIRED_PORTS.join(',')}`;
        console.log(`${stepName}: Calling API endpoint:`, endpoint);
        
        const results = await api.get(endpoint, {
            timeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 3
        });
        
        console.log(`${stepName}: API response received:`, results);
        
        // Add port descriptions
        if (results.ports) {
            Object.keys(results.ports).forEach(port => {
                results.ports[port].description = PORT_DESCRIPTIONS[port] || 'Unknown service';
            });
        }
        
        // Store results in state
        stateManager.set('systemCheckResults', results);
        
        // Update UI based on step
        if (options.updateUI !== false) {
            updateSystemCheckUI(results, stepName);
        }
        
        console.log(`=== ${stepName.toUpperCase()}: System check complete ===`);
        return results;
        
    } catch (error) {
        console.error(`=== ${stepName.toUpperCase()}: System check FAILED ===`);
        console.error(`${stepName}: Error:`, error.message);
        
        const errorMessage = error.message || 'Unknown error';
        showNotification(
            `System check failed: ${errorMessage}. Check browser console for details.`,
            'error',
            5000
        );
        
        showSystemCheckError(stepName);
        throw error;
    }
}

/**
 * Retry system check
 */
export async function retrySystemCheck(options = {}) {
    const stepName = options.stepName || 'system-check';
    console.log(`${stepName}: Retrying system check...`);
    
    // Reset UI to checking state
    resetSystemCheckUI(stepName);
    
    // Run check
    return runSystemCheck(options);
}

/**
 * Update system check UI
 */
function updateSystemCheckUI(results, stepName) {
    if (stepName === 'checklist') {
        // Update checklist items
        updateChecklistItem('requirements', results.resources);
        updateChecklistItem('docker', results.docker);
        updateChecklistItem('compose', results.dockerCompose);
        updateChecklistItem('ports', results.ports);
        
        updateChecklistSummary(results);
        calculateTimeEstimates(results);
    } else if (stepName === 'system-check') {
        // Update system check items
        updateCheckItem('docker', results.docker);
        updateCheckItem('compose', results.dockerCompose);
        updateCheckItem('resources', results.resources);
        updateCheckItem('ports', results.ports);
        
        updateContinueButton(results.summary?.canProceed !== false, results.summary?.message);
    }
}

/**
 * Reset system check UI to checking state
 */
function resetSystemCheckUI(stepName) {
    const selector = stepName === 'checklist' ? '.checklist-item' : '.check-item';
    const items = document.querySelectorAll(selector);
    
    items.forEach(item => {
        item.classList.remove('success', 'warning', 'error');
        item.classList.add('checking');
        
        const iconElement = item.querySelector('.status-icon, .check-icon');
        if (iconElement) {
            iconElement.innerHTML = '<div class="spinner"></div>';
        }
        
        const messageElement = item.querySelector('.status-text, .check-message');
        if (messageElement) {
            messageElement.textContent = 'Checking...';
        }
        
        const details = item.querySelector('.check-details');
        if (details) {
            details.remove();
        }
    });
}

/**
 * Show system check error
 */
function showSystemCheckError(stepName) {
    const selector = stepName === 'checklist' ? '.checklist-item' : '.check-item';
    const items = document.querySelectorAll(selector);
    
    items.forEach(item => {
        const iconElement = item.querySelector('.status-icon, .check-icon');
        const messageElement = item.querySelector('.status-text, .check-message');
        
        if (iconElement) iconElement.textContent = '❌';
        if (messageElement) messageElement.textContent = 'Check Failed';
        
        item.classList.remove('checking', 'success', 'warning');
        item.classList.add('error');
    });
    
    // Show retry button if it exists
    const retryButton = document.getElementById(`${stepName}-retry`);
    if (retryButton) {
        retryButton.style.display = 'inline-block';
    }
}

// ... rest of helper functions (updateChecklistItem, updateCheckItem, etc.)
```

---

## Implementation Priority

### Priority 1 (Critical - Do First)
1. **Issue #1**: Add detailed error logging
2. **Issue #3**: Add validation before proceeding from Step 2

### Priority 2 (High - Do Next)
3. **Issue #2**: Add retry button to Step 2
4. **Issue #4**: Add timeout and retry logic to API client

### Priority 3 (Medium - Do Later)
5. **Issue #5**: Consolidate system check modules

---

## Testing After Fixes

```bash
# Test 1: Verify system check runs on Step 2
# - Click Continue on Step 1
# - Verify checklist items show results (not "Checking...")
# - Check browser console for logs

# Test 2: Verify validation works
# - Simulate Docker not installed
# - Try to proceed from Step 2
# - Should show error and prevent navigation

# Test 3: Verify retry works
# - Simulate API failure
# - Click Retry button
# - Should retry the check

# Test 4: Verify timeout works
# - Simulate slow backend
# - Should timeout after 30 seconds
# - Should retry automatically

# Test 5: Verify error messages
# - Simulate various failures
# - Check that error messages are clear and helpful
```

