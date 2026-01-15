# Wizard Icon System Implementation Prompt

**Purpose**: Guide for implementing the Lucide icon system in the Installation Wizard UI  
**Date**: January 15, 2026  
**Prerequisites**: Dashboard icon system must be completed first  
**Estimated Effort**: 2-3 hours

## Context

The Dashboard has been successfully migrated from emoji-based icons to a professional Lucide icon system. The same system needs to be applied to the Installation Wizard to maintain consistency across the entire Kaspa All-in-One application.

## Objectives

1. Replace all emoji icons in the Wizard with Lucide icons
2. Reuse the shared icon infrastructure from `services/shared/icons/`
3. Maintain consistent iconography between Dashboard and Wizard
4. Ensure accessibility and responsive design
5. Apply Kaspa brand colors appropriately

## Prerequisites

### Completed Work
- ✅ Shared icon system created at `services/shared/icons/`
- ✅ Dashboard icon system fully implemented and tested
- ✅ Icon helper utilities available (`icons.js`)
- ✅ Icon CSS styles defined (`lucide-icons.css`)
- ✅ Complete icon mapping documented

### Required Knowledge
- Location of Wizard files: `services/wizard/`
- Wizard UI structure and components
- Current emoji usage in Wizard
- Wizard styling system

## Implementation Steps

### Phase 1: Analysis (30 minutes)

1. **Audit Current Icon Usage**
   ```bash
   # Find all emojis in Wizard files
   grep -r "[⚡🧙‍♂️⚙️⬆️✕🌐📊🧊🔄💪📋💾🔴🔍🚨▶️⏹️💡🐛☕⚠️❌💰🖥️]" services/wizard/
   ```

2. **Identify Icon Locations**
   - Header/navigation icons
   - Step indicator icons
   - Profile selection icons
   - Service configuration icons
   - Status/validation icons
   - Button icons
   - Modal/dialog icons
   - Footer icons

3. **Document Current Icons**
   Create a mapping table:
   | Location | Current Emoji | Proposed Lucide Icon | Notes |
   |----------|---------------|---------------------|-------|
   | ... | ... | ... | ... |

### Phase 2: Integration (45 minutes)

1. **Update Wizard HTML**
   ```html
   <!-- Add to wizard/public/index.html or equivalent -->
   <link rel="stylesheet" href="/shared/icons/lucide-icons.css">
   ```

2. **Create Wizard Icon Manager**
   ```javascript
   // services/wizard/public/scripts/modules/icon-manager.js
   import { createIcon, createIconButton, Icons } from '/shared/icons/icons.js';
   
   export class WizardIconManager {
       constructor() {
           // Wizard-specific icon mappings
       }
       
       init() {
           // Initialize all icon replacements
           this.replaceHeaderIcons();
           this.replaceStepIcons();
           this.replaceProfileIcons();
           this.replaceServiceIcons();
           this.replaceButtonIcons();
       }
       
       // Methods for each section...
   }
   ```

3. **Import and Initialize**
   ```javascript
   // In main wizard.js or app.js
   import { WizardIconManager } from './modules/icon-manager.js';
   
   const iconManager = new WizardIconManager();
   iconManager.init();
   ```

### Phase 3: Icon Replacement (60 minutes)

#### Header Icons
```javascript
replaceHeaderIcons() {
    // Wizard logo/title
    const title = document.querySelector('.wizard-title');
    if (title) {
        const icon = createIcon('wand', { size: 'lg', color: 'kaspa-blue' });
        // Replace emoji with icon
    }
    
    // Navigation buttons
    // Back, Next, Close buttons
}
```

#### Step Indicator Icons
```javascript
replaceStepIcons() {
    // Step 1: Welcome - use 'home' or 'wand'
    // Step 2: Profile Selection - use 'layers' or 'grid'
    // Step 3: Configuration - use 'settings' or 'sliders'
    // Step 4: Review - use 'check-circle' or 'eye'
    // Step 5: Installation - use 'download' or 'loader'
    // Step 6: Complete - use 'check-circle' or 'success'
}
```

#### Profile Icons
```javascript
replaceProfileIcons() {
    // Core Profile - use 'server' or 'cpu'
    // Archive Node - use 'database' or 'hard-drive'
    // Indexer Services - use 'search' or 'database'
    // User Applications - use 'layout-grid' or 'app-window'
    // Mining - use 'hammer' or 'cpu'
    // Development - use 'code' or 'terminal'
}
```

#### Service Configuration Icons
```javascript
replaceServiceIcons() {
    // Kaspa Node - use 'server'
    // Database - use 'database'
    // Indexer - use 'search'
    // Applications - use 'layout-grid'
    // Nginx - use 'globe' or 'network'
}
```

#### Status/Validation Icons
```javascript
replaceStatusIcons() {
    // Success - use 'check-circle' with success color
    // Error - use 'x-circle' with error color
    // Warning - use 'alert-triangle' with warning color
    // Info - use 'info' with info color
    // Loading - use 'loader' with rotating animation
}
```

#### Button Icons
```javascript
replaceButtonIcons() {
    // Back button - use 'arrow-left'
    // Next button - use 'arrow-right'
    // Install button - use 'download' or 'play'
    // Cancel button - use 'x'
    // Retry button - use 'rotate-cw'
    // Help button - use 'help-circle'
}
```

### Phase 4: CSS Updates (30 minutes)

1. **Remove Old Emoji CSS**
   ```css
   /* Remove any ::before or ::after pseudo-elements with emoji content */
   /* Example:
   .btn-next::after { content: "➡️"; }  // REMOVE
   */
   ```

2. **Add Icon-Specific Styles**
   ```css
   /* Wizard-specific icon styles */
   .wizard-step-icon {
       width: 32px;
       height: 32px;
   }
   
   .wizard-step-icon.completed {
       color: var(--success);
   }
   
   .wizard-step-icon.current {
       color: var(--kaspa-blue);
       animation: pulse 2s infinite;
   }
   
   .profile-icon {
       width: 48px;
       height: 48px;
       color: var(--kaspa-blue);
   }
   ```

3. **Update Wizard CSS Import**
   ```css
   /* At top of wizard.css or main.css */
   @import '/shared/icons/lucide-icons.css';
   ```

### Phase 5: Testing (30 minutes)

1. **Visual Testing**
   - [ ] All emojis replaced with Lucide icons
   - [ ] Icons display at correct sizes
   - [ ] Kaspa brand colors applied appropriately
   - [ ] Icons align properly with text
   - [ ] No duplicate icons (emoji + Lucide)

2. **Functional Testing**
   - [ ] Icon animations work (loading, rotating)
   - [ ] Tooltips display on icon-only buttons
   - [ ] Icons update dynamically (step progression)
   - [ ] Status icons change colors correctly
   - [ ] Icons responsive on different screen sizes

3. **Accessibility Testing**
   - [ ] Screen reader announces icon button labels
   - [ ] Keyboard navigation works
   - [ ] Focus indicators visible
   - [ ] High contrast mode supported
   - [ ] Reduced motion respected

4. **Browser Testing**
   - [ ] Chrome/Chromium
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge

5. **Dark Mode Testing**
   - [ ] Icons visible in dark mode
   - [ ] Colors appropriate for dark background
   - [ ] Tooltips styled correctly

## Icon Mapping Reference

### Recommended Icons for Wizard

| Wizard Element | Lucide Icon | Size | Color | Notes |
|----------------|-------------|------|-------|-------|
| **Header** |
| Wizard logo | `wand-2` | lg | kaspa-blue | Main branding |
| Close button | `x` | sm | default | Modal close |
| Help button | `help-circle` | sm | default | Context help |
| **Steps** |
| Welcome | `home` | md | kaspa-blue | Starting point |
| Profile Selection | `layers` | md | kaspa-blue | Multiple options |
| Configuration | `settings` | md | kaspa-blue | Settings |
| Review | `eye` | md | kaspa-blue | Preview |
| Installation | `download` | md | kaspa-blue | Installing |
| Complete | `check-circle` | md | success | Success |
| **Profiles** |
| Core | `server` | xl | kaspa-blue | Node services |
| Archive | `database` | xl | kaspa-purple | Data storage |
| Indexer | `search` | xl | kaspa-blue | Search/index |
| Applications | `layout-grid` | xl | kaspa-purple | User apps |
| Mining | `hammer` | xl | kaspa-blue | Mining |
| Development | `code` | xl | kaspa-purple | Dev tools |
| **Services** |
| Kaspa Node | `server` | md | default | Node |
| Database | `database` | md | default | DB |
| Indexer | `search` | md | default | Search |
| Nginx | `globe` | md | default | Proxy |
| Application | `app-window` | md | default | App |
| **Status** |
| Success | `check-circle` | sm | success | Completed |
| Error | `x-circle` | sm | error | Failed |
| Warning | `alert-triangle` | sm | warning | Warning |
| Info | `info` | sm | info | Information |
| Loading | `loader` | sm | default | Processing |
| **Navigation** |
| Back | `arrow-left` | sm | default | Previous |
| Next | `arrow-right` | sm | default | Next |
| Install | `download` | sm | kaspa-blue | Start install |
| Cancel | `x` | sm | default | Cancel |
| Retry | `rotate-cw` | sm | default | Try again |
| **Validation** |
| Valid | `check` | xs | success | Field valid |
| Invalid | `x` | xs | error | Field invalid |
| Required | `asterisk` | xs | error | Required field |

## Code Examples

### Example 1: Step Indicator with Icons
```javascript
function updateStepIndicator(currentStep) {
    const steps = [
        { name: 'Welcome', icon: 'home' },
        { name: 'Profile', icon: 'layers' },
        { name: 'Configure', icon: 'settings' },
        { name: 'Review', icon: 'eye' },
        { name: 'Install', icon: 'download' },
        { name: 'Complete', icon: 'check-circle' }
    ];
    
    steps.forEach((step, index) => {
        const stepEl = document.querySelector(`[data-step="${index + 1}"]`);
        const iconEl = stepEl.querySelector('.step-icon');
        
        // Clear existing icon
        iconEl.innerHTML = '';
        
        // Determine state
        const isCompleted = index < currentStep - 1;
        const isCurrent = index === currentStep - 1;
        
        // Create icon
        const icon = createIcon(step.icon, {
            size: 'md',
            color: isCompleted ? 'success' : (isCurrent ? 'kaspa-blue' : 'muted'),
            pulse: isCurrent
        });
        
        iconEl.appendChild(icon);
    });
}
```

### Example 2: Profile Card with Icon
```javascript
function createProfileCard(profile) {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const iconContainer = document.createElement('div');
    iconContainer.className = 'profile-icon-container';
    
    const icon = createIcon(profile.icon, {
        size: 'xl',
        color: 'kaspa-blue'
    });
    
    iconContainer.appendChild(icon);
    card.appendChild(iconContainer);
    
    // Add title, description, etc.
    
    return card;
}
```

### Example 3: Status Message with Icon
```javascript
function showStatusMessage(type, message) {
    const iconMap = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    const colorMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };
    
    const container = document.createElement('div');
    container.className = `status-message status-${type}`;
    
    const icon = createIcon(iconMap[type], {
        size: 'sm',
        color: colorMap[type]
    });
    
    container.appendChild(icon);
    container.appendChild(document.createTextNode(' ' + message));
    
    return container;
}
```

## Common Pitfalls to Avoid

1. **Don't forget to remove emojis from HTML templates**
   - Check both static HTML and JavaScript-generated HTML

2. **Don't use CDN imports**
   - CSP will block external resources
   - Use local SVG generation only

3. **Don't forget icon sizes**
   - Use appropriate sizes for context (xs, sm, md, lg, xl)

4. **Don't skip accessibility**
   - Always add ARIA labels to icon-only buttons
   - Include tooltips for clarity

5. **Don't hardcode colors**
   - Use color classes (kaspa-blue, success, error, etc.)
   - Respect dark mode

6. **Don't forget animations**
   - Add rotating animation to loading states
   - Use pulse for current/active states

7. **Don't duplicate icons**
   - Remove old emojis when adding new icons
   - Check for both in HTML and CSS

## Validation Checklist

Before considering the implementation complete:

### Code Quality
- [ ] No emojis remain in Wizard code
- [ ] All icons use shared icon system
- [ ] Icon manager module created and integrated
- [ ] CSS properly imports shared icon styles
- [ ] No console errors related to icons

### Visual Quality
- [ ] All icons display correctly
- [ ] Consistent sizing throughout
- [ ] Proper alignment with text
- [ ] Kaspa brand colors applied
- [ ] No visual glitches or overlaps

### Functionality
- [ ] Icons update dynamically
- [ ] Animations work smoothly
- [ ] Tooltips display correctly
- [ ] Interactive icons respond to clicks
- [ ] Status icons change appropriately

### Accessibility
- [ ] Screen reader compatible
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] High contrast mode supported
- [ ] Reduced motion respected

### Cross-Browser
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Responsive
- [ ] Icons scale on mobile
- [ ] Touch targets adequate
- [ ] Layout doesn't break

### Documentation
- [ ] Icon mapping documented
- [ ] Code examples provided
- [ ] Implementation notes added
- [ ] Known issues documented

## Post-Implementation

### Documentation to Create

1. **Implementation Summary**
   - File: `docs/implementation-summaries/wizard/WIZARD_ICON_SYSTEM_IMPLEMENTATION.md`
   - Content: Complete details of what was changed, why, and how

2. **Update Quick Reference**
   - File: `docs/quick-references/ICON_SYSTEM_QUICK_REFERENCE.md`
   - Add: Wizard-specific examples and patterns

### Testing to Perform

1. **End-to-End Wizard Flow**
   - Complete full installation with all profiles
   - Verify icons at each step
   - Test error scenarios

2. **Integration Testing**
   - Test Dashboard → Wizard navigation
   - Verify consistent iconography
   - Check shared resources load correctly

3. **User Acceptance**
   - Get feedback on icon choices
   - Verify clarity and usability
   - Adjust if needed

## Resources

### Reference Files
- Dashboard implementation: `docs/implementation-summaries/dashboard/DASHBOARD_ICON_SYSTEM_IMPLEMENTATION.md`
- Icon quick reference: `docs/quick-references/ICON_SYSTEM_QUICK_REFERENCE.md`
- Shared icon system: `services/shared/icons/`
- Dashboard icon manager: `services/dashboard/public/scripts/modules/icon-manager.js`

### External Resources
- Lucide Icons: https://lucide.dev/
- Icon accessibility: https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html
- SVG accessibility: https://www.w3.org/TR/SVG-access/

## Success Criteria

The Wizard icon system implementation is complete when:

1. ✅ All emojis replaced with Lucide icons
2. ✅ Shared icon infrastructure used
3. ✅ Consistent with Dashboard iconography
4. ✅ Fully accessible (WCAG AA)
5. ✅ Responsive on all screen sizes
6. ✅ Works in all major browsers
7. ✅ Dark mode supported
8. ✅ Animations smooth and purposeful
9. ✅ Documentation complete
10. ✅ Testing passed

## Estimated Timeline

- **Analysis**: 30 minutes
- **Integration**: 45 minutes
- **Icon Replacement**: 60 minutes
- **CSS Updates**: 30 minutes
- **Testing**: 30 minutes
- **Documentation**: 15 minutes

**Total**: 3.5 hours

## Notes

- This prompt assumes the Dashboard icon system is fully functional
- Adjust icon choices based on Wizard-specific needs
- Maintain consistency with Dashboard where possible
- Prioritize user experience and clarity
- Test thoroughly before deployment

## Questions to Answer Before Starting

1. What is the current Wizard file structure?
2. Where are Wizard icons currently defined?
3. Are there any Wizard-specific icon requirements?
4. What is the Wizard's build/deployment process?
5. Are there any existing icon-related issues?

## Support

For questions or issues during implementation:
1. Review Dashboard implementation for examples
2. Check icon quick reference guide
3. Test in browser console
4. Verify shared resources are accessible
5. Check browser console for errors
