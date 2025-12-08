# Report Bug Button Implementation

## Overview

Implemented the "Report Bug" button in the wizard footer as part of task 4.2 from the test-release spec. This provides testers with easy access to report bugs directly from the wizard interface.

## Implementation Details

### 1. HTML Changes

**File**: `services/wizard/frontend/public/index.html`

Added a new `footer-actions` section between the footer logo and footer links:

```html
<div class="footer-actions">
    <button class="btn-footer btn-report-bug" onclick="window.open('https://github.com/kaspa-kcoin/kaspa-all-in-one/issues/new?template=bug_report.md', '_blank')">
        🐛 Report Bug
    </button>
</div>
```

**Key Features**:
- Opens GitHub issue template in a new tab
- Uses emoji icon (🐛) for visual appeal
- Consistent with wizard design language
- Accessible button element with clear label

### 2. CSS Styles

**File**: `services/wizard/frontend/public/styles/wizard.css`

Added three new style sections:

#### Footer Actions Container
```css
.footer-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
```

#### Base Button Styles
```css
.btn-footer {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.btn-footer:hover {
  background: var(--kaspa-pale);
  border-color: var(--kaspa-blue);
  color: var(--kaspa-blue);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(112, 199, 186, 0.2);
}

.btn-footer:active {
  transform: translateY(0);
}
```

#### Report Bug Specific Styles
```css
.btn-report-bug:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.2);
}
```

**Design Decisions**:
- Red accent color (#ff6b6b) on hover to indicate bug reporting
- Subtle lift animation on hover for interactivity
- Consistent with existing wizard button patterns
- Uses CSS variables for theme compatibility

### 3. Responsive Design

Added mobile-responsive styles for screens under 768px:

```css
.footer-actions {
  justify-content: center;
}
```

**Mobile Behavior**:
- Footer stacks vertically on mobile
- Button centers with other footer elements
- Maintains full functionality on all screen sizes

### 4. Test File

Created `test-footer-button.html` for visual verification:
- Isolated test environment
- Shows footer in both desktop and mobile views
- Allows testing without running full wizard

## User Experience

### Desktop View
```
[Logo] Kaspa All-in-One    [🐛 Report Bug]    kaspa.org | GitHub | Discord
```

### Mobile View
```
        [Logo] Kaspa All-in-One
        
           [🐛 Report Bug]
           
    kaspa.org | GitHub | Discord
```

## Integration Points

### GitHub Issue Template
- Links to: `https://github.com/kaspa-kcoin/kaspa-all-in-one/issues/new?template=bug_report.md`
- Opens in new tab (`_blank`)
- Uses existing bug report template from task 3.1

### Wizard Theme
- Uses CSS variables for colors
- Matches existing button patterns
- Supports dark mode automatically
- Consistent with Kaspa brand guidelines

## Testing Recommendations

1. **Visual Testing**:
   - Open `test-footer-button.html` in browser
   - Verify button appearance in light/dark mode
   - Test hover states and animations
   - Resize window to test mobile view

2. **Functional Testing**:
   - Click button to verify GitHub link opens
   - Confirm new tab behavior
   - Test on different browsers (Chrome, Firefox, Safari)
   - Test on mobile devices

3. **Accessibility Testing**:
   - Verify button is keyboard accessible (Tab key)
   - Test with screen readers
   - Ensure sufficient color contrast

## Next Steps

According to task 4.2, the next sub-task is:
- [ ] Add "Suggest Feature" button to wizard footer

This can follow the same pattern:
1. Add button to `footer-actions` div
2. Use similar styling with different accent color
3. Link to feature request template
4. Test responsiveness

## Files Modified

1. `services/wizard/frontend/public/index.html` - Added footer button
2. `services/wizard/frontend/public/styles/wizard.css` - Added button styles
3. `services/wizard/frontend/public/test-footer-button.html` - Created test file (new)

## Requirements Satisfied

- ✅ **Requirement 5**: Feedback Collection Mechanism
  - Provides easy access to bug reporting
  - Links directly to GitHub Issues
  
- ✅ **Requirement 17**: Feedback Quality
  - Uses structured bug report template
  - Accessible from wizard interface

- ✅ **Task 4.2**: Add feedback links to wizard
  - Report Bug button implemented
  - Opens in new tab
  - Styled consistently with wizard theme

## Design Consistency

The implementation maintains consistency with:
- Existing wizard button patterns (`.btn-primary`, `.btn-secondary`)
- Kaspa brand colors and typography
- Footer layout and spacing
- Mobile-first responsive design
- Accessibility standards

## Notes

- The button uses an emoji (🐛) which is universally supported
- Red hover color (#ff6b6b) provides visual distinction from other actions
- The `.btn-footer` class is reusable for future footer buttons
- Mobile layout automatically centers all footer elements
