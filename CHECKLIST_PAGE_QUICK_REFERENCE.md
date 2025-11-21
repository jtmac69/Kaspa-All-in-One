# Pre-Installation Checklist Page - Quick Reference

## Overview
The new Checklist page (Step 2) helps users prepare for installation by checking their system and providing guidance.

## What Users See

### 1. Progress Summary
```
📋 Checklist Progress: 3 of 5 ready
⏱️ Estimated Time: ~10 minutes
```

### 2. Five Checklist Items

#### ✅ System Requirements
- **Checks**: CPU cores, RAM, disk space
- **Shows**: Actual values with status
- **Example**: "4 cores ✅, 8 GB ✅, 150 GB available ✅"

#### ✅ Docker Installation
- **Checks**: Docker installed and version
- **If Missing**: Shows "How to Install Docker" button
- **Links**: OS-specific installation guides

#### ✅ Docker Compose
- **Checks**: Docker Compose installed and version
- **If Missing**: Shows "How to Install Docker Compose" button

#### ✅ Network Ports
- **Checks**: Required ports (16110, 16111, etc.)
- **If Conflicts**: Shows warning but allows continue
- **Message**: "Don't worry - we can work around this"

#### ❓ Help Me Choose (Optional)
- **Quiz**: 3 questions about usage, experience, resources
- **Result**: Recommends best profile
- **Apply**: Pre-selects recommended profile

### 3. Time Estimates
```
⚙️ Setup Time: 5-10 min
⬇️ Download Size: 2-5 GB
🔄 Sync Time: 2-6 hours
```

## User Flow

1. **Click "Get Started"** → Checklist page loads
2. **Checks run automatically** → See results in real-time
3. **Click items to expand** → See details and help
4. **Optional: Take quiz** → Get profile recommendation
5. **Click "Continue"** → Proceed to System Check

## Status Indicators

- ⏳ **Checking...** - Check in progress
- ✅ **Ready** - Passed, good to go
- ⚠️ **Warning** - Limited but can proceed
- ❌ **Error** - Failed, needs attention
- ❓ **Optional** - Not required

## Quiz Questions

### Question 1: Purpose
"What do you want to do with Kaspa?"
- Run a blockchain node → Core
- Use Kaspa apps → Production
- Explore blockchain data → Explorer
- Mine Kaspa → Mining
- Develop applications → Development

### Question 2: Experience
"How comfortable are you with technical tools?"
- New to this - I need guidance
- Some experience with Docker/servers
- Very comfortable with technical setup

### Question 3: Resources
"What kind of computer are you using?"
- Older computer (4GB RAM, 2 cores) → Core
- Standard computer (8GB RAM, 4 cores) → Core/Prod
- Powerful computer (16GB+ RAM, 8+ cores) → Explorer/Archive

## Help Features

### Docker Not Installed?
- Shows "📖 How to Install Docker" button
- Opens OS-specific guide:
  - **macOS**: Docker Desktop for Mac
  - **Windows**: Docker Desktop for Windows
  - **Linux**: Docker Engine installation

### Port Conflicts?
- Shows which ports are in use
- Reassures: "Don't worry - we can work around this during configuration"
- Allows user to continue

### Low Resources?
- Shows warning but doesn't block
- Will recommend appropriate profile
- Explains what's possible with current resources

## Technical Details

### API Calls
```javascript
// System resources
GET /api/resource-check
→ { cpu: {...}, memory: {...}, disk: {...} }

// Docker & ports
GET /api/system-check
→ { docker: {...}, dockerCompose: {...}, ports: {...} }
```

### State Management
```javascript
wizardState.checklist = {
    requirements: { status: 'ready', data: {...} },
    docker: { status: 'ready', data: {...} },
    compose: { status: 'ready', data: {...} },
    ports: { status: 'warning', data: {...} },
    quiz: { status: 'complete', data: { recommended: 'core' } }
}
```

## Testing Checklist

- [ ] All checks run automatically on page load
- [ ] Status indicators update correctly
- [ ] Expandable sections work (click to expand/collapse)
- [ ] Docker help button appears when Docker missing
- [ ] Quiz completes and shows recommendation
- [ ] Time estimates display after checks
- [ ] Continue button works
- [ ] Responsive on mobile devices
- [ ] Dark mode works correctly

## Common Issues

### Checks Don't Run
- **Cause**: Backend not running
- **Fix**: Start backend with `cd services/wizard/backend && npm start`

### "Failed to check" Errors
- **Cause**: API endpoint not available
- **Fix**: Verify backend is running on port 3001

### Quiz Doesn't Show Result
- **Cause**: JavaScript error
- **Fix**: Check browser console for errors

## Next Steps

After completing this task:
1. **Task 6.5.4**: Dependency installation guides (detailed Docker setup)
2. **Task 6.5.5**: Auto-remediation for common errors
3. **Task 6.5.6**: Enhanced progress transparency

## Files to Review

- `services/wizard/frontend/public/index.html` - HTML structure
- `services/wizard/frontend/public/scripts/wizard.js` - JavaScript logic
- `services/wizard/frontend/public/styles/wizard.css` - Styling
- `TASK_6.5.3_IMPLEMENTATION_SUMMARY.md` - Full details

## Success Criteria

✅ Users understand what's needed before starting
✅ Clear status for all prerequisites
✅ Helpful guidance for missing dependencies
✅ Quiz helps uncertain users choose profile
✅ Time estimates set proper expectations
✅ Non-blocking warnings for minor issues
✅ Smooth, professional user experience
