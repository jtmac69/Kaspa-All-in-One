# Wizard API Integration Debug Guide

## Quick Diagnosis

### Symptom: Checklist checks not running on Step 2

**Step 1**: Open browser DevTools (F12) → Console tab

**Step 2**: Look for these log messages:
```
✅ GOOD: "Running system check..."
✅ GOOD: "Calling API: /system-check?ports=8080,16110,16111,5433,5434,8081"
✅ GOOD: "API Response received: {...}"

❌ BAD: "System check failed: ..."
❌ BAD: No logs at all (API call not made)
```

**Step 3**: Check Network tab (F12 → Network)
- Look for request to `/api/system-check?ports=...`
- Check response status (should be 200)
- Check response body (should contain docker, dockerCompose, resources, ports)

---

## Common Issues & Solutions

### Issue 1: API Returns 404

**Cause**: Backend route not registered

**Check**:
```bash
# In services/wizard/backend/src/server.js, verify:
app.use('/api/system-check', systemCheckRouter);
```

**Fix**: Restart backend service

---

### Issue 2: API Returns 500

**Cause**: Backend error in system-checker utility

**Check**:
```bash
# View backend logs
docker logs wizard-backend

# Or if running locally:
npm run dev  # in services/wizard/backend
```

**Look for**: Error messages in system-checker.js

---

### Issue 3: API Call Hangs (No Response)

**Cause**: 
- Backend not running
- Network timeout
- CORS issue

**Check**:
```bash
# Verify backend is running
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

**Fix**: 
- Restart backend: `docker restart wizard-backend`
- Check CORS settings in server.js

---

### Issue 4: API Returns Data But UI Doesn't Update

**Cause**: 
- Error in updateChecklistItem() function
- DOM elements not found
- State manager not working

**Check in Console**:
```javascript
// Check if state manager has data
stateManager.get('systemCheckResults')

// Should return object with: docker, dockerCompose, resources, ports

// Check if DOM elements exist
document.querySelectorAll('.checklist-item')

// Should return 4 elements (requirements, docker, compose, ports)
```

**Fix**: Check browser console for JavaScript errors

---

## Manual Testing

### Test 1: Verify Backend Endpoint

```bash
# Test system check endpoint
curl "http://localhost:3000/api/system-check?ports=8080,16110,16111,5433,5434,8081"

# Expected response:
{
  "docker": {
    "installed": true,
    "version": "20.10.x",
    "message": "Docker is installed and ready"
  },
  "dockerCompose": {
    "installed": true,
    "version": "1.29.x",
    "message": "Docker Compose is installed and ready"
  },
  "resources": {
    "cpu": {
      "count": 4,
      "meetsMinimum": true,
      "message": "CPU meets minimum requirements"
    },
    "memory": {
      "totalGB": 16,
      "freeGB": 8,
      "meetsMinimum": true,
      "message": "Memory meets minimum requirements"
    },
    "disk": {
      "availableGB": 100,
      "meetsMinimum": true,
      "message": "Disk space meets minimum requirements"
    }
  },
  "ports": {
    "8080": { "available": true, "message": "Port available" },
    "16110": { "available": true, "message": "Port available" },
    "16111": { "available": true, "message": "Port available" },
    "5433": { "available": true, "message": "Port available" },
    "5434": { "available": true, "message": "Port available" },
    "8081": { "available": true, "message": "Port available" }
  },
  "summary": {
    "canProceed": true,
    "message": "System is ready for installation"
  }
}
```

### Test 2: Verify Frontend API Call

In browser console:
```javascript
// Import API client
import { api } from '/scripts/modules/api-client.js';

// Make test call
api.get('/system-check?ports=8080,16110,16111,5433,5434,8081')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

### Test 3: Verify State Manager

In browser console:
```javascript
// Import state manager
import { stateManager } from '/scripts/modules/state-manager.js';

// Check current state
console.log('Current step:', stateManager.get('currentStep'));
console.log('System check results:', stateManager.get('systemCheckResults'));
console.log('Checklist state:', stateManager.get('checklist'));
```

---

## Debug Logging

### Add Detailed Logging to checklist.js

Replace the `runSystemCheck()` function with:

```javascript
export async function runSystemCheck() {
    console.log('=== CHECKLIST: Starting system check ===');
    
    try {
        const requiredPorts = [8080, 16110, 16111, 5433, 5434, 8081];
        const endpoint = `/system-check?ports=${requiredPorts.join(',')}`;
        
        console.log('CHECKLIST: Calling API endpoint:', endpoint);
        console.log('CHECKLIST: Full URL:', `${window.location.origin}/api${endpoint}`);
        
        const results = await api.get(endpoint);
        
        console.log('CHECKLIST: API response received:', results);
        console.log('CHECKLIST: Docker installed?', results.docker?.installed);
        console.log('CHECKLIST: Compose installed?', results.dockerCompose?.installed);
        console.log('CHECKLIST: Resources OK?', {
            cpu: results.resources?.cpu?.meetsMinimum,
            memory: results.resources?.memory?.meetsMinimum,
            disk: results.resources?.disk?.meetsMinimum
        });
        console.log('CHECKLIST: Ports available?', Object.entries(results.ports || {}).map(
            ([port, status]) => `${port}: ${status.available}`
        ));
        
        stateManager.set('systemCheckResults', results);
        console.log('CHECKLIST: Results stored in state manager');
        
        // Update UI
        console.log('CHECKLIST: Updating UI...');
        updateChecklistItem('requirements', results.resources);
        updateChecklistItem('docker', results.docker);
        updateChecklistItem('compose', results.dockerCompose);
        updateChecklistItem('ports', results.ports);
        
        updateChecklistSummary(results);
        calculateTimeEstimates(results);
        
        console.log('=== CHECKLIST: System check complete ===');
        return results;
        
    } catch (error) {
        console.error('=== CHECKLIST: System check FAILED ===');
        console.error('CHECKLIST: Error message:', error.message);
        console.error('CHECKLIST: Error stack:', error.stack);
        console.error('CHECKLIST: Full error:', error);
        
        showNotification(
            `System check failed: ${error.message}. Check console for details.`,
            'error',
            5000
        );
        
        showChecklistError(error);
        throw error;
    }
}
```

---

## Verification Checklist

- [ ] Backend service is running: `curl http://localhost:3000/api/health`
- [ ] System check endpoint responds: `curl http://localhost:3000/api/system-check?ports=8080`
- [ ] Frontend loads without errors (check console)
- [ ] Clicking "Continue" on Step 1 navigates to Step 2
- [ ] Step 2 shows "Checking..." state initially
- [ ] Step 2 shows results after API responds
- [ ] All 4 checklist items update (requirements, docker, compose, ports)
- [ ] Continue button is enabled/disabled based on results
- [ ] Retry button works (if implemented)

---

## Key Files to Check

| File | Purpose | Check For |
|------|---------|-----------|
| `services/wizard/backend/src/api/system-check.js` | Backend endpoint | Route registration, error handling |
| `services/wizard/backend/src/utils/system-checker.js` | System check logic | Check implementation, error handling |
| `services/wizard/frontend/public/scripts/modules/checklist.js` | Step 2 logic | API call, UI update, error handling |
| `services/wizard/frontend/public/scripts/modules/api-client.js` | API communication | Request/response handling |
| `services/wizard/backend/src/server.js` | Server setup | Route mounting, CORS, middleware |

---

## Browser Console Commands

```javascript
// Check if API is accessible
fetch('/api/system-check?ports=8080').then(r => r.json()).then(console.log);

// Check current wizard state
localStorage.getItem('wizardState');

// Clear wizard state (if needed)
localStorage.clear();

// Check if modules are loaded
window.api;
window.stateManager;

// Manually trigger system check
import { runSystemCheck } from '/scripts/modules/checklist.js';
runSystemCheck();
```

---

## Performance Monitoring

### Check API Response Time

In browser console:
```javascript
const start = performance.now();
api.get('/system-check?ports=8080,16110,16111,5433,5434,8081')
  .then(() => {
    const duration = performance.now() - start;
    console.log(`API call took ${duration.toFixed(2)}ms`);
  });
```

**Expected**: < 5000ms (5 seconds)
**Warning**: > 10000ms (10 seconds) - likely timeout

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to fetch` | Network error or CORS | Check backend is running, check CORS settings |
| `404 Not Found` | Route not registered | Restart backend, check server.js |
| `500 Internal Server Error` | Backend error | Check backend logs, check system-checker.js |
| `Timeout` | API taking too long | Check backend performance, increase timeout |
| `Cannot read property 'installed' of undefined` | API response format wrong | Check backend response format |

