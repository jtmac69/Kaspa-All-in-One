# Wizard Template Navigation Development Guide

## Overview

This guide provides development environment setup and testing instructions for the Wizard Template-Profile Navigation Fix implementation. The fix addresses the navigation disconnect between the new Templates system and legacy Profiles system.

## Development Environment Setup

### Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Git
- Linux/macOS environment

### Quick Start Instructions

#### 1. Start Development Environment

```bash
# Navigate to project root
cd /path/to/kaspa-aio

# Start the wizard in development mode
cd services/wizard
npm install
npm run dev

# In another terminal, start the dashboard (optional for testing)
cd services/dashboard
npm install
npm run dev
```

#### 2. Access Development Services

- **Wizard**: http://localhost:3000
- **Dashboard**: http://localhost:8080 (if started)

#### 3. Stop Development Environment

```bash
# Stop wizard (Ctrl+C in wizard terminal)
# Stop dashboard (Ctrl+C in dashboard terminal)

# Or use the management script
./scripts/manage.sh stop
```

### Alternative: Using Management Scripts

```bash
# Start all services including wizard
./scripts/manage.sh start

# Check status
./scripts/manage.sh status

# Stop all services
./scripts/manage.sh stop
```

## Development Testing Workflow

### 1. Template Selection Testing

**Test Template Path Navigation:**
1. Start wizard at http://localhost:3000
2. Complete System Check (steps 1-3)
3. Navigate to Templates step (step 4)
4. Select any template (e.g., "Home Node")
5. Click "Use Template"
6. Verify navigation goes directly to Configuration (step 6)
7. Verify Profiles step (5) is skipped

**Test Custom Path Navigation:**
1. Start wizard at http://localhost:3000
2. Complete System Check (steps 1-3)
3. Navigate to Templates step (step 4)
4. Click "Build Custom Setup"
5. Verify navigation goes to Profiles step (step 5)
6. Select profiles manually
7. Click "Continue"
8. Verify navigation goes to Configuration (step 6)

### 2. Back Navigation Testing

**Test Template Path Back Navigation:**
1. Follow template selection workflow above
2. On Configuration step, click "Back"
3. Verify navigation returns to Templates step (step 4)

**Test Custom Path Back Navigation:**
1. Follow custom selection workflow above
2. On Configuration step, click "Back"
3. Verify navigation returns to Profiles step (step 5)
4. On Profiles step, click "Back"
5. Verify navigation returns to Templates step (step 4)

### 3. State Management Testing

**Test Template State:**
1. Select a template
2. Open browser developer tools → Application → Local Storage
3. Verify state contains:
   - `selectedTemplate`: template ID
   - `navigationPath`: "template"
   - `templateApplied`: true
   - `selectedProfiles`: array of profiles from template

**Test Custom State:**
1. Use "Build Custom" workflow
2. Check Local Storage state:
   - `selectedTemplate`: null
   - `navigationPath`: "custom"
   - `templateApplied`: false
   - `selectedProfiles`: manually selected profiles

### 4. Configuration Integration Testing

**Test Template Configuration:**
1. Select a template
2. Navigate to Configuration step
3. Verify configuration fields are pre-populated with template values
4. Verify template-specific options are displayed

**Test Custom Configuration:**
1. Use custom profile selection
2. Navigate to Configuration step
3. Verify configuration fields reflect manually selected profiles
4. Verify appropriate configuration options are available

## Automated Testing

### Run Navigation Tests

```bash
cd services/wizard/frontend
node run-navigation-tests.js
```

### Run Complete Workflow Tests

```bash
cd services/wizard/frontend
node run-complete-workflow-tests.js
```

### Run Error Handling Tests

```bash
cd services/wizard/frontend
node run-error-handling-tests.js
```

### Run Backward Compatibility Tests

```bash
cd services/wizard/frontend
node run-backward-compatibility-tests.js
```

## Common Development Issues

### Issue 1: Templates Not Loading

**Symptoms:**
- Template grid is empty
- Console errors about template API

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3000/api/simple-templates

# Restart wizard backend
cd services/wizard
npm run dev
```

### Issue 2: Navigation Not Working

**Symptoms:**
- Back button doesn't work correctly
- Steps don't progress properly

**Solution:**
1. Clear browser Local Storage
2. Refresh page
3. Check browser console for JavaScript errors

### Issue 3: State Management Issues

**Symptoms:**
- Configuration not pre-populated
- Wrong navigation path

**Solution:**
1. Open browser developer tools
2. Check Local Storage for wizard state
3. Clear state and restart workflow

## Debugging Tools

### Browser Developer Tools

1. **Console**: Check for JavaScript errors
2. **Network**: Monitor API calls to template endpoints
3. **Application → Local Storage**: Inspect wizard state
4. **Elements**: Inspect DOM changes during navigation

### Backend Debugging

```bash
# Enable debug logging
cd services/wizard
DEBUG=wizard:* npm run dev
```

### API Testing

```bash
# Test template API endpoints
curl http://localhost:3000/api/simple-templates
curl http://localhost:3000/api/simple-templates/home-node
curl -X POST http://localhost:3000/api/simple-templates/home-node/apply
```

## Rollback Plan

If issues are encountered during development:

### 1. Immediate Rollback

```bash
# Stop current services
./scripts/manage.sh stop

# Revert to previous working state
git checkout HEAD~1

# Restart services
./scripts/manage.sh start
```

### 2. Selective Rollback

```bash
# Revert specific files if needed
git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/navigation.js
git checkout HEAD~1 -- services/wizard/frontend/public/scripts/modules/template-selection.js

# Restart wizard
cd services/wizard
npm run dev
```

### 3. Clean Environment Reset

```bash
# Stop all services
./scripts/manage.sh stop

# Clean wizard state
rm -rf services/wizard/node_modules
rm -rf services/dashboard/node_modules

# Reinstall and restart
cd services/wizard && npm install
cd services/dashboard && npm install

./scripts/manage.sh start
```

## Success Criteria Validation

### Template-First Navigation ✓
- [ ] Templates step is primary selection interface
- [ ] Profile selection only accessible through "Build Custom"
- [ ] Template path skips Profiles step entirely

### Smart Back Navigation ✓
- [ ] Configuration → Templates (template path)
- [ ] Configuration → Profiles (custom path)
- [ ] Profiles → Templates (always)

### State Management ✓
- [ ] Template state properly stored and retrieved
- [ ] Custom state properly managed
- [ ] No conflicting state between paths

### Integration ✓
- [ ] Template configurations work with Configuration step
- [ ] Template selections work with Installation step
- [ ] Backward compatibility maintained

## Next Steps

After successful development testing:

1. **End-to-End Validation** (Task 10.2)
   - Complete installation flows
   - Service startup validation
   - Error scenario testing

2. **Production Deployment**
   - Create production build
   - Deploy to staging environment
   - Monitor for issues

3. **User Acceptance Testing**
   - Gather user feedback
   - Document any remaining issues
   - Plan additional improvements

## Support

For issues during development:

1. Check this guide for common solutions
2. Review implementation summaries in `docs/implementation-summaries/wizard/`
3. Check troubleshooting guide: `docs/guides/wizard-template-navigation-troubleshooting.md`
4. Review error recovery guide: `docs/guides/wizard-error-recovery-guide.md`