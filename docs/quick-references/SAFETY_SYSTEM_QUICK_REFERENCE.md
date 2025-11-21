# Safety System Quick Reference

## Overview
The Safety Confirmation and Warning System protects users from risky installation choices by assessing resource requirements, showing clear warnings, and requiring acknowledgment for dangerous actions.

## Quick Start

### Backend API
```javascript
// Assess profile risk
POST /api/safety/assess-profile-risk
Body: { profile, systemResources }
Returns: { riskAssessment }

// Generate confirmation dialog
POST /api/safety/generate-confirmation
Body: { action, riskAssessment }
Returns: { confirmation }

// Check if confirmation required
POST /api/safety/check-confirmation-required
Body: { action, context }
Returns: { required: boolean }
```

### Frontend Usage
```javascript
// Assess risk for profile
const riskAssessment = await safety.assessProfileRisk(profile, systemResources);

// Show confirmation if needed
if (riskAssessment.requiresConfirmation) {
  const confirmed = await safety.showConfirmation('profile-selection', riskAssessment);
  if (!confirmed) return; // User cancelled
}

// Check if action requires confirmation
const required = await safety.requiresConfirmation('data-deletion', {});

// Track installation failure
safety.trackFailure(); // Offers safe mode after 2 failures

// Create/restore backup
await safety.createBackup();
await safety.restoreBackup();
```

## Risk Levels

### Critical (≥95% resources)
- **Blocks installation**
- Shows: Consequences, recommendations
- Actions: "Choose Different Profile", "View Recommendations"
- Cannot proceed

### High (85-95% resources)
- **Requires acknowledgment**
- Shows: Consequences, recommendations
- Checkbox: "I understand the risks and want to proceed"
- Actions: "Choose Different Profile", "I Understand, Continue Anyway"

### Medium (70-85% resources)
- **Shows warning**
- Shows: Consequences, recommendations
- Actions: "Choose Different Profile", "Continue"
- Optional confirmation

### Low (<70% resources)
- **No warning**
- Proceeds without interruption

## Confirmation Types

### Profile Selection
```javascript
await safety.showConfirmation('profile-selection', riskAssessment);
```
- Triggered when profile exceeds resources
- Shows resource warnings and recommendations
- Blocks critical, requires acknowledgment for high

### Override Recommendation
```javascript
await safety.showConfirmation('override-recommendation', riskAssessment);
```
- Triggered when user chooses non-recommended option
- Explains why recommendation differs
- Allows override with warning

### Data Deletion
```javascript
await safety.showConfirmation('data-deletion');
```
- Triggered before deleting all data
- Lists what will be deleted
- Requires checkbox acknowledgment
- Cannot be undone

### Configuration Change
```javascript
await safety.showConfirmation('configuration-change', riskAssessment);
```
- Triggered before applying config changes
- Explains service restart impact
- Shows brief interruption warning

### Start Over
```javascript
await safety.showConfirmation('start-over');
```
- Triggered before resetting wizard
- Explains progress loss
- Preserves running services

## Safe Mode

### Trigger
- Automatically offered after 2 installation failures
- Can be manually enabled anytime

### Configuration
```javascript
wizardState.safeMode = true;
wizardState.selectedProfile = 'core';
wizardState.useRemoteNode = true;
```

### Benefits
- Uses <2GB RAM, 5GB disk
- No local blockchain sync
- Completes in 5-10 minutes
- Works on most systems

## Resource Thresholds

### RAM
```javascript
{
  critical: 0.95,  // 95% of available
  high: 0.85,      // 85% of available
  medium: 0.70,    // 70% of available
  low: 0.50        // 50% of available
}
```

### Disk
```javascript
{
  critical: 0.95,  // 95% of available
  high: 0.85,      // 85% of available
  medium: 0.70,    // 70% of available
  low: 0.50        // 50% of available
}
```

### CPU
```javascript
{
  critical: 0.95,  // 95% of cores
  high: 0.85,      // 85% of cores
  medium: 0.70,    // 70% of cores
  low: 0.50        // 50% of cores
}
```

### Sync Time (hours)
```javascript
{
  critical: 24,    // >24 hours
  high: 12,        // 12-24 hours
  medium: 6,       // 6-12 hours
  low: 2           // 2-6 hours
}
```

## Consequences by Resource

### RAM Issues
- **Critical**: Installation fails, system crashes, OOM errors
- **High**: Severe performance degradation, frequent swapping
- **Medium**: System slowness, reduced performance

### Disk Issues
- **Critical**: Installation fails, data corruption, full disk
- **High**: No space for growth, may run out during operation
- **Medium**: Limited space, need to monitor usage

### CPU Issues
- **Critical**: Extremely slow, timeouts, unusable system
- **High**: Very slow during sync, poor performance
- **Medium**: Slower than usual, reduced performance

## Recommendations by Resource

### RAM Solutions
- **Critical**: Choose lighter profile, use remote node, upgrade RAM
- **High**: Choose lighter profile, close applications, use remote node
- **Medium**: Close applications, monitor performance

### Disk Solutions
- **Critical**: Free up space, use external storage, choose remote node
- **High**: Free up space, plan for monitoring, consider external storage
- **Medium**: Monitor space, plan for cleanup

### CPU Solutions
- **Critical**: Choose lighter profile, use more powerful computer
- **High**: Close applications, expect slower performance, use remote node
- **Medium**: Close applications, be patient during sync

## Configuration Backup

### Create Backup
```javascript
await safety.createBackup();
// Saves to localStorage: 'kaspa-wizard-backup'
```

### Restore Backup
```javascript
await safety.restoreBackup();
// Restores from localStorage
// Shows confirmation with timestamp
```

### Backup Contents
```javascript
{
  timestamp: "2025-11-20T...",
  state: { ...wizardState },
  config: { ...wizardState.configuration }
}
```

## Failure Tracking

### Track Failure
```javascript
safety.trackFailure();
// Increments counter in localStorage
// Offers safe mode after 2 failures
```

### Reset Failures
```javascript
safety.resetFailures();
// Resets counter to 0
// Called on successful installation
```

### Check Failure Count
```javascript
const count = parseInt(localStorage.getItem('kaspa-wizard-failure-count')) || 0;
```

## Styling Classes

### Confirmation Types
```css
.safety-confirmation.critical  /* Red border */
.safety-confirmation.warning   /* Yellow border */
.safety-confirmation.caution   /* Blue border */
.safety-confirmation.danger    /* Red border */
.safety-confirmation.info      /* Blue border */
```

### Resource Warnings
```css
.resource-warning.low          /* Blue, info */
.resource-warning.medium       /* Yellow, caution */
.resource-warning.high         /* Orange, warning */
.resource-warning.critical     /* Red, pulsing */
```

### Button Styles
```css
.btn-primary    /* Green, main action */
.btn-secondary  /* Gray, alternative */
.btn-danger     /* Red, destructive */
```

## Common Patterns

### Profile Selection with Safety
```javascript
async function selectProfileWithSafety(profileId) {
  // Get profile and system data
  const profile = getProfileData(profileId);
  const systemResources = await checkSystemResources();
  
  // Assess risk
  const riskAssessment = await safety.assessProfileRisk(profile, systemResources);
  
  // Show warning if needed
  if (riskAssessment && riskAssessment.level !== 'low') {
    safety.showResourceWarning(riskAssessment);
    
    if (riskAssessment.requiresConfirmation) {
      const confirmed = await safety.showConfirmation('profile-selection', riskAssessment);
      if (!confirmed) return; // User cancelled
    }
  }
  
  // Proceed with selection
  selectProfile(profileId);
}
```

### Installation with Backup
```javascript
async function startInstallationWithSafety() {
  // Create backup
  await safety.createBackup();
  
  // Check for high-risk selections
  const hasHighRisk = wizardState.riskLevel === 'high';
  
  if (hasHighRisk) {
    const confirmed = await confirmAction('install-start', {
      hasHighRiskSelections: true
    });
    if (!confirmed) return;
  }
  
  // Start installation
  try {
    await startInstallation();
    resetInstallationFailures();
  } catch (error) {
    trackInstallationFailure();
    throw error;
  }
}
```

### Safe Mode Offer
```javascript
async function offerSafeMode() {
  const response = await fetch(
    `/api/safety/safe-mode-recommendation?failureCount=${failureCount}`
  );
  const data = await response.json();
  
  if (data.recommendation) {
    // Shows dialog with safe mode option
    safety.renderConfirmationDialog(data.recommendation);
  }
}
```

## Testing Checklist

- [ ] Test critical resource warning (blocks installation)
- [ ] Test high resource warning (requires checkbox)
- [ ] Test medium resource warning (optional)
- [ ] Test low resource (no warning)
- [ ] Test data deletion confirmation
- [ ] Test configuration change confirmation
- [ ] Test start over confirmation
- [ ] Test safe mode offer after 2 failures
- [ ] Test backup creation
- [ ] Test backup restoration
- [ ] Test mobile responsive design
- [ ] Test dark mode styling
- [ ] Test all button actions
- [ ] Test checkbox requirement
- [ ] Test cancel actions

## Troubleshooting

### Confirmation not showing
- Check if `safety-confirmation-modal` exists in HTML
- Verify safety-system.js is loaded
- Check browser console for errors
- Verify API endpoint is accessible

### Risk assessment not working
- Check system resources API response
- Verify profile data structure
- Check threshold calculations
- Verify risk level determination

### Safe mode not offered
- Check failure count in localStorage
- Verify 2+ failures tracked
- Check API endpoint response
- Verify modal rendering

### Backup/restore not working
- Check localStorage availability
- Verify backup data structure
- Check for quota exceeded errors
- Verify state restoration logic

## Best Practices

1. **Always assess risk** before profile selection
2. **Show warnings inline** for immediate feedback
3. **Require acknowledgment** for high-risk actions
4. **Block critical risks** to prevent failures
5. **Create backups** before changes
6. **Track failures** to offer safe mode
7. **Use plain language** in all messages
8. **Provide recommendations** with every warning
9. **Test thoroughly** with various resource scenarios
10. **Monitor user behavior** to improve thresholds

## Related Documentation
- Task 6.5.8 Implementation Summary
- Resource Checker Quick Reference
- Plain Language Style Guide
- Error Remediation Quick Reference
