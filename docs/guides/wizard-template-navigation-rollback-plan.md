# Wizard Template Navigation Rollback Plan

## Overview

This document provides a comprehensive rollback plan for the Wizard Template-Profile Navigation Fix implementation. The plan includes immediate rollback procedures, selective rollback options, and recovery strategies in case issues are encountered during or after deployment.

## Rollback Triggers

### Immediate Rollback Required

Execute immediate rollback if any of these conditions occur:

1. **High Error Rates**
   - Template loading failures > 10%
   - Template application failures > 5%
   - Navigation errors > 3%

2. **User Experience Issues**
   - Users unable to complete installation workflows
   - Widespread user confusion or negative feedback
   - Navigation loops or broken back button functionality

3. **Integration Failures**
   - Existing installations fail to load
   - Configuration generation failures
   - Docker compose generation errors

4. **Performance Degradation**
   - Page load times > 5 seconds
   - Template operations taking > 10 seconds
   - Memory leaks or resource exhaustion

## Rollback Strategies

### Strategy 1: Immediate Full Rollback

**When to Use**: Critical issues affecting all users

**Steps**:
```bash
# 1. Stop current services
./scripts/manage.sh stop

# 2. Revert to previous working commit
git checkout HEAD~1

# 3. Restart services
./scripts/manage.sh start

# 4. Verify rollback
curl http://localhost:3000/health
```

**Verification**:
- [ ] Wizard loads at http://localhost:3000
- [ ] Old navigation flow is restored
- [ ] Profile selection step is visible
- [ ] Existing installations continue to work

### Strategy 2: Selective Component Rollback

**When to Use**: Issues with specific components only

**Navigation Component Rollback**:
```bash
# Revert navigation module only
git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/navigation.js

# Restart wizard
cd services/wizard
npm run dev
```

**Template Selection Rollback**:
```bash
# Revert template selection module
git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/template-selection.js

# Restart wizard
cd services/wizard
npm run dev
```

**State Management Rollback**:
```bash
# Revert state manager
git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/state-manager.js

# Restart wizard
cd services/wizard
npm run dev
```

**UI Rollback**:
```bash
# Revert UI changes
git checkout HEAD~1 -- services/wizard/frontend/public/index.html
git checkout HEAD~1 -- services/wizard/frontend/public/styles/wizard.css

# Restart wizard
cd services/wizard
npm run dev
```

### Strategy 3: Configuration-Only Rollback

**When to Use**: Template system issues but navigation works

**Steps**:
```bash
# Disable template system, keep navigation improvements
# Edit navigation.js to skip template step
sed -i 's/goToStep(4)/goToStep(5)/' services/wizard/frontend/public/scripts/modules/navigation.js

# Hide template step in UI
sed -i 's/display: block/display: none/' services/wizard/frontend/public/index.html

# Restart wizard
cd services/wizard
npm run dev
```

### Strategy 4: Clean Environment Reset

**When to Use**: Persistent issues or corrupted state

**Steps**:
```bash
# 1. Stop all services
./scripts/manage.sh stop

# 2. Clean wizard state
rm -rf services/wizard/node_modules
rm -rf services/dashboard/node_modules

# 3. Reset to known good state
git reset --hard HEAD~1

# 4. Clean install
cd services/wizard && npm install
cd services/dashboard && npm install

# 5. Clear browser state
echo "Clear browser localStorage and cookies for localhost:3000"

# 6. Restart services
./scripts/manage.sh start
```

## Rollback Procedures by Issue Type

### Template Loading Issues

**Symptoms**:
- Template grid is empty
- "Failed to load templates" errors
- Network errors in browser console

**Rollback Steps**:
1. Check if backend API is responding:
   ```bash
   curl http://localhost:3000/api/simple-templates
   ```

2. If API fails, rollback backend:
   ```bash
   git checkout HEAD~1 -- services/wizard/backend/src/api/simple-templates.js
   cd services/wizard
   npm run dev
   ```

3. If frontend fails, rollback template selection:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/template-selection.js
   cd services/wizard
   npm run dev
   ```

### Navigation Issues

**Symptoms**:
- Back button doesn't work
- Users stuck on steps
- Navigation loops

**Rollback Steps**:
1. Rollback navigation module:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/navigation.js
   ```

2. Rollback state manager:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/state-manager.js
   ```

3. Restart wizard:
   ```bash
   cd services/wizard
   npm run dev
   ```

### Configuration Integration Issues

**Symptoms**:
- Configuration fields not populated
- Template settings not applied
- Docker compose generation fails

**Rollback Steps**:
1. Rollback configuration module:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/configure.js
   ```

2. Rollback profile manager:
   ```bash
   git checkout HEAD~1 -- services/wizard/backend/src/utils/profile/ProfileManager.js
   ```

3. Restart services:
   ```bash
   cd services/wizard
   npm run dev
   ```

### UI/UX Issues

**Symptoms**:
- Layout broken
- Buttons not working
- Visual inconsistencies

**Rollback Steps**:
1. Rollback HTML structure:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/index.html
   ```

2. Rollback CSS styles:
   ```bash
   git checkout HEAD~1 -- services/wizard/frontend/public/styles/wizard.css
   ```

3. Restart wizard:
   ```bash
   cd services/wizard
   npm run dev
   ```

## Monitoring and Detection

### Automated Monitoring

**Health Check Script**:
```bash
#!/bin/bash
# health-check-template-navigation.sh

echo "Checking wizard template navigation health..."

# Check wizard is running
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Wizard not responding"
    exit 1
fi

# Check template API
if ! curl -s http://localhost:3000/api/simple-templates | grep -q "beginner-setup"; then
    echo "❌ Template API not working"
    exit 1
fi

# Check navigation functionality
if ! curl -s http://localhost:3000 | grep -q "Templates"; then
    echo "❌ Template step not found"
    exit 1
fi

echo "✅ Wizard template navigation is healthy"
```

**Error Rate Monitoring**:
```bash
#!/bin/bash
# monitor-error-rates.sh

# Check wizard logs for errors
ERROR_COUNT=$(tail -100 services/wizard/logs/wizard.log | grep -c "ERROR")
if [ $ERROR_COUNT -gt 10 ]; then
    echo "❌ High error rate detected: $ERROR_COUNT errors"
    echo "Consider rollback"
    exit 1
fi

echo "✅ Error rate acceptable: $ERROR_COUNT errors"
```

### Manual Monitoring Checklist

**Every 15 minutes for first 2 hours after deployment**:
- [ ] Wizard loads at http://localhost:3000
- [ ] Template grid displays correctly
- [ ] Template selection works
- [ ] Build Custom workflow works
- [ ] Back navigation functions correctly
- [ ] Configuration integration works
- [ ] No JavaScript errors in browser console

**Every hour for first 24 hours**:
- [ ] Check error logs for unusual patterns
- [ ] Verify existing installations still work
- [ ] Monitor user feedback channels
- [ ] Check system resource usage

## Recovery Procedures

### Data Recovery

**User State Recovery**:
```bash
# If user states are corrupted, clear and reset
echo "Clearing corrupted user states..."
# Users will need to clear browser localStorage
echo "Users should clear localStorage for localhost:3000"
```

**Configuration Recovery**:
```bash
# Restore configuration from backup
if [ -f "services/wizard/config/wizard.config.backup" ]; then
    cp services/wizard/config/wizard.config.backup services/wizard/config/wizard.config.json
    echo "Configuration restored from backup"
fi
```

### Service Recovery

**Wizard Service Recovery**:
```bash
# Stop and restart wizard with clean state
cd services/wizard
npm run stop
rm -rf node_modules
npm install
npm run dev
```

**Database Recovery** (if applicable):
```bash
# If database issues occur
docker-compose down
docker-compose up -d postgres
# Wait for database to be ready
docker-compose up -d
```

## Communication Plan

### Internal Communication

**Immediate Notification** (within 5 minutes of issue detection):
- Notify development team
- Alert system administrators
- Document issue in incident log

**Status Updates** (every 30 minutes during rollback):
- Progress on rollback procedures
- Estimated time to resolution
- Any additional issues discovered

### User Communication

**During Rollback**:
```
🔧 Maintenance Notice
We're temporarily reverting to the previous wizard interface while we address some issues. 
Your installations and configurations are safe. 
Expected resolution: [TIME]
```

**After Rollback**:
```
✅ Service Restored
The wizard has been restored to the previous version. 
All functionality is now working normally.
We'll notify you when the new template features are available again.
```

## Testing After Rollback

### Immediate Verification (within 15 minutes)

```bash
# Run basic functionality tests
cd services/wizard/frontend
node test-basic-functionality.js

# Check existing installations
curl http://localhost:3000/api/installation/status

# Verify profile selection works
curl http://localhost:3000/api/profiles
```

### Extended Verification (within 1 hour)

```bash
# Run full test suite
cd services/wizard/frontend
npm test

# Test complete installation workflow
./test-installation-workflow.sh

# Verify backward compatibility
node run-backward-compatibility-tests.js
```

## Prevention Measures

### Pre-Deployment Validation

**Required Checks Before Deployment**:
- [ ] All tests pass (navigation, workflow, error handling)
- [ ] Backward compatibility validated
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Rollback procedures tested

### Deployment Best Practices

**Staged Deployment**:
1. Deploy to development environment first
2. Run full test suite
3. Deploy to staging environment
4. User acceptance testing
5. Deploy to production with monitoring

**Feature Flags**:
```javascript
// Use feature flags for gradual rollout
const TEMPLATE_NAVIGATION_ENABLED = process.env.TEMPLATE_NAVIGATION_ENABLED === 'true';

if (TEMPLATE_NAVIGATION_ENABLED) {
    // New template navigation
} else {
    // Legacy profile navigation
}
```

## Rollback Success Criteria

### Rollback Complete When

- [ ] Wizard loads without errors
- [ ] All existing installations work correctly
- [ ] Profile selection workflow functions
- [ ] Configuration generation works
- [ ] Docker compose generation succeeds
- [ ] No JavaScript errors in browser console
- [ ] System performance is normal
- [ ] User feedback is positive

### Post-Rollback Actions

1. **Document Issues**:
   - Root cause analysis
   - Lessons learned
   - Improvements for next deployment

2. **Plan Re-deployment**:
   - Fix identified issues
   - Enhanced testing procedures
   - Improved monitoring

3. **User Communication**:
   - Explain what happened
   - Timeline for re-deployment
   - How issues will be prevented

## Emergency Contacts

**Development Team**:
- Primary Developer: [Contact Info]
- Backup Developer: [Contact Info]

**System Administration**:
- Primary Admin: [Contact Info]
- Backup Admin: [Contact Info]

**Management**:
- Project Manager: [Contact Info]
- Technical Lead: [Contact Info]

---

**Document Version**: 1.0  
**Last Updated**: December 30, 2025  
**Review Date**: January 30, 2026