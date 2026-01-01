# Wizard Template Navigation Fix

## Date
December 27, 2025

## Issue
The wizard has duplicate navigation buttons appearing on every step, causing UX confusion:
1. Global Back/Continue buttons appear on ALL steps (including Welcome which has its own "Get Started" button)
2. Template step shows Continue button which goes to Profiles, but templates should skip Profiles and go directly to Configure
3. Multiple navigation buttons create confusion about which to use

## Root Cause
- Navigation buttons (step-actions divs) are defined in the HTML for most steps
- Welcome step has step-actions div at line 172 that should be hidden
- Template step was missing step-actions, causing buttons from other steps to appear
- CSS rules to hide buttons (#step-welcome .step-actions { display: none !important; }) are not being applied effectively

## Solution Implemented (Partial)

### 1. Added Template Step Navigation
- Added step-actions div to template step with only Back button
- Templates handle their own navigation via "Use Template" buttons

### 2. Updated Template Selection Flow
- Template selection now uses `/api/simple-templates/*` endpoints
- Added validate and apply endpoints to simple-templates API
- Template application skips Profiles step and goes directly to Configure (step 6)
- Custom template selection goes to Profiles step (step 5)

### 3. Navigation Logic Updates
- Updated `nextStep()` in navigation.js to check for template selection
- If template selected, skip profiles and go to configure
- Added debug logging to track navigation flow

### 4. API Endpoints Added
```javascript
POST /api/simple-templates/:templateId/validate - Validates template configuration
POST /api/simple-templates/:templateId/apply - Applies template and returns config
```

## Files Modified
- `services/wizard/frontend/public/index.html` - Added template step navigation
- `services/wizard/frontend/public/scripts/modules/template-selection.js` - Updated to use simple-templates API (v8)
- `services/wizard/frontend/public/scripts/modules/navigation.js` - Added template skip logic (v7)
- `services/wizard/backend/src/api/simple-templates.js` - Added validate/apply endpoints
- `services/wizard/frontend/public/styles/wizard.css` - Added CSS to hide unwanted navigation

## Expected UX Flow

### Template Selected
1. User selects a template (e.g., "Public Node")
2. Clicks "Use Template" button
3. Template validates and applies
4. Navigation skips Profiles → goes directly to Configure (Step 6)

### Custom Template
1. User clicks "Build Custom"
2. Navigation goes to Profiles (Step 5)
3. User selects individual services
4. Navigation goes to Configure (Step 6)

## Outstanding Issues

### Critical: Duplicate Navigation Buttons
- **Problem**: Back/Continue buttons appear on ALL steps, including Welcome and Templates
- **Impact**: Confusing UX with multiple navigation options
- **CSS Attempted**: `#step-welcome .step-actions { display: none !important; }` - NOT WORKING
- **Root Cause**: Unknown - buttons may be added dynamically by JavaScript or CSS specificity issue

### Investigation Needed
1. Check if JavaScript is adding buttons after page load
2. Verify CSS specificity and load order
3. Consider if buttons are being cloned from a template
4. Check browser dev tools to see actual applied styles

## Recommended Next Steps

### Immediate (Quick Fix)
1. Use JavaScript to hide buttons on page load:
   ```javascript
   document.getElementById('step-welcome')?.querySelector('.step-actions')?.remove();
   document.getElementById('step-templates')?.querySelector('.step-actions')?.remove();
   ```

### Short-term (Proper Fix)
1. Audit all step-actions divs in HTML
2. Remove step-actions from steps that shouldn't have them (Welcome, Templates)
3. Ensure each step that needs navigation has its own step-actions
4. Test CSS hiding rules with higher specificity

### Long-term (Architecture Fix)
1. Implement proper navigation component system
2. Each step declares its navigation needs
3. Navigation component renders appropriate buttons
4. Centralized navigation logic

## Testing Checklist
- [ ] Welcome step shows only "Get Started" button
- [ ] Template step shows only template cards (no Continue button)
- [ ] Clicking "Use Template" goes to Configure (Step 6)
- [ ] Clicking "Build Custom" goes to Profiles (Step 5)
- [ ] All other steps show appropriate Back/Continue buttons
- [ ] No duplicate buttons on any step

## Notes
- Template API endpoints are working correctly (tested with curl)
- Navigation logic for skipping profiles is implemented
- Main blocker is the duplicate button issue affecting UX
