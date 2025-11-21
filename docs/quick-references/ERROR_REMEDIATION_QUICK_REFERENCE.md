# Error Remediation - Quick Reference

## Overview
Automatic error detection and fixing system that identifies common installation errors and provides one-click solutions.

## Supported Error Types

### 1. Port Conflict (Medium, Auto-Fixable)
**Patterns**: "port already in use", "EADDRINUSE"
**Auto-Fix**: 
- Find alternative port (+1 to +10)
- Identify conflicting process
- Offer to kill process (with warning)

### 2. Permission Error (High, Auto-Fixable)
**Patterns**: "permission denied", "EACCES"
**Auto-Fix**:
- Add user to docker group
- Fix socket permissions (temporary)
- Restart Docker Desktop (macOS)

### 3. Out of Memory (High, Auto-Fixable)
**Patterns**: "out of memory", "OOM", "killed by signal 9"
**Auto-Fix**:
- Use remote node (<4GB RAM)
- Reduce memory limits (4-8GB RAM)
- Optimize allocation (>8GB RAM)

### 4. Disk Space (High, Manual)
**Patterns**: "no space left", "disk full"
**Action**: Manual cleanup instructions

### 5. Docker Not Running (Critical, Auto-Fixable)
**Patterns**: "cannot connect to docker daemon"
**Auto-Fix**:
- Start Docker service (Linux)
- Start Docker Desktop (macOS/Windows)

### 6. Network Error (Medium, Auto-Fixable)
**Patterns**: "network timeout", "connection refused"
**Auto-Fix**: Retry with exponential backoff

### 7. Image Not Found (Medium, Manual)
**Patterns**: "image not found", "manifest not found"
**Action**: Check image name/tag

## API Endpoints

```javascript
// Analyze error
POST /api/error-remediation/analyze
Body: { error: "port 16110 already in use" }
→ { category, severity, autoFixable, details }

// Get fix suggestions
POST /api/error-remediation/fix
Body: { error: "...", context: {...} }
→ { analysis, fix: { suggestions: [...] } }

// Apply auto-fix
POST /api/error-remediation/apply
Body: { analysis, suggestion }
→ { success, result: { applied, config } }

// Get error patterns
GET /api/error-remediation/patterns
→ { patterns: {...} }
```

## User Flow

1. **Error Occurs** → Installation fails
2. **Auto-Detection** → System analyzes error
3. **Modal Opens** → Shows fix suggestions
4. **User Reviews** → Reads explanations
5. **Apply Fix** → Clicks "Apply Fix" button
6. **Config Updated** → Changes applied automatically
7. **Retry Prompt** → "Would you like to retry?"
8. **Success** → Installation continues

## Fix Suggestion Format

```javascript
{
  type: 'change_port',
  description: 'Use port 16111 instead of 16110',
  explanation: 'Port 16110 is in use by another program',
  port: 16111,
  autoApply: true,
  priority: 'high',
  warning: 'Optional warning message'
}
```

## Retry Logic

```javascript
// Exponential backoff
{
  maxRetries: 3,
  initialDelay: 1000,  // 1 second
  maxDelay: 10000,     // 10 seconds
  backoffMultiplier: 2
}

// Sequence: 1s → 2s → 4s
```

## Plain Language Explanations

- **Port Conflict**: "Another program is using a port Kaspa needs"
- **Permission**: "You don't have permission to access Docker"
- **Out of Memory**: "Not enough RAM to run all services"
- **Disk Space**: "Hard drive is full"
- **Docker Not Running**: "Docker needs to be started"
- **Network**: "Problem connecting to internet"

## Code Examples

### Detect and Fix Error
```javascript
// Automatic (wrapped API calls)
try {
  await api.post('/install', data);
} catch (error) {
  // Auto-detection happens here
  // Modal opens if fix available
}

// Manual
const remediation = await errorRemediation.analyzeAndFix(error);
if (remediation) {
  errorRemediation.showRemediationModal(
    remediation.analysis,
    remediation.fix
  );
}
```

### Apply Fix
```javascript
// From modal
<button onclick="errorRemediation.applySuggestion(index, suggestion, analysis)">
  Apply Fix
</button>

// Programmatic
const result = await api.post('/error-remediation/apply', {
  analysis,
  suggestion
});

if (result.success && result.result.config) {
  Object.assign(wizardState.configuration, result.result.config);
}
```

### Retry with Backoff
```javascript
const result = await errorRemediation.retryWithBackoff(
  async () => await api.post('/install', data),
  {
    maxRetries: 3,
    onRetry: (attempt, error, delay) => {
      showNotification(`Retry ${attempt}/3 in ${delay/1000}s...`, 'info');
    }
  }
);
```

## Priority Levels

- **Critical**: 🔴 Blocks installation completely
- **High**: 🟠 Major issue, needs immediate attention
- **Medium**: 🟡 Can proceed with workaround
- **Low**: 🟢 Minor issue, optional fix

## Auto-Fix vs Manual

### Auto-Fix (One-Click)
- Change port
- Use remote node
- Reduce memory limits
- Optimize configuration

### Manual (Guided)
- Add to docker group (requires logout)
- Kill process (requires confirmation)
- Start Docker service (requires sudo)
- Clean up disk space

## Testing

### Simulate Errors
```bash
# Port conflict
nc -l 16110  # Start listener on port

# Permission error
sudo chmod 000 /var/run/docker.sock

# Out of memory
# Set Docker memory limit to 1GB in settings

# Docker not running
sudo systemctl stop docker  # Linux
# Or quit Docker Desktop
```

### Verify Detection
```javascript
// Test error analysis
const analysis = await api.post('/error-remediation/analyze', {
  error: 'port 16110 already in use'
});

console.log(analysis.category);  // 'port_conflict'
console.log(analysis.autoFixable);  // true
```

## File Locations

### Backend
- `services/wizard/backend/src/utils/error-remediation-manager.js`
- `services/wizard/backend/src/api/error-remediation.js`
- `services/wizard/backend/src/server.js` (route registration)

### Frontend
- `services/wizard/frontend/public/index.html` (modal HTML)
- `services/wizard/frontend/public/scripts/wizard.js` (remediation logic)
- `services/wizard/frontend/public/styles/wizard.css` (modal styles)

## Key Benefits

✅ **Automatic Detection** - No need to understand errors
✅ **Plain Language** - Clear explanations
✅ **One-Click Fixes** - No terminal commands
✅ **Smart Suggestions** - Multiple solutions
✅ **Automatic Retry** - Exponential backoff

## Common Issues

### Modal Won't Open
- **Cause**: Error not detected
- **Fix**: Check error patterns match
- **Debug**: Check console for analysis result

### Fix Won't Apply
- **Cause**: Permission required
- **Fix**: Some fixes need manual steps
- **Check**: Look for warnings in suggestion

### Retry Fails
- **Cause**: Underlying issue not fixed
- **Fix**: Try different suggestion
- **Check**: Verify fix was actually applied

## Next Steps

After completing this task:
1. **Task 6.5.6**: Enhanced progress transparency
2. **Task 6.5.7**: Post-installation tour and guidance
3. **Task 6.5.8**: Safety confirmations and warnings

## Documentation

- **Full Details**: `../implementation-summaries/tasks/TASK_6.5.5_IMPLEMENTATION_SUMMARY.md`
- **API Docs**: See error-remediation.js comments
- **Error Patterns**: GET /api/error-remediation/patterns
