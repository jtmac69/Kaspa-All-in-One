# Wizard CSS Architecture - Modular Structure

## Overview

The wizard CSS has been refactored from a single 12,000+ line file into a modular, maintainable architecture. This improves development experience, testing capabilities, and long-term maintainability.

## Directory Structure

```
styles/
├── wizard.css                 # Main entry point (imports all modules)
├── wizard-original-backup.css # Backup of original monolithic file
├── README.md                  # This documentation
│
├── core/                      # Foundation styles
│   ├── variables.css          # CSS custom properties and design tokens
│   ├── base.css              # Base styles and resets
│   ├── layout.css            # Main layout components
│   └── responsive.css        # Responsive design and media queries
│
├── components/               # Reusable UI components
│   ├── buttons.css          # Button styles and variants
│   ├── progress.css         # Progress indicator components
│   ├── modals.css           # Modal dialogs (existing)
│   ├── forms.css            # Form components (existing)
│   ├── config-modification.css # Config modification UI (existing)
│   ├── reconfiguration-navigation.css # Reconfig navigation (existing)
│   ├── install.css          # Installation components (existing)
│   └── complete.css         # Completion components (existing)
│
├── features/                # Wizard step-specific styles
│   ├── hero.css            # Welcome/hero section
│   ├── profiles.css        # Profile selection cards
│   ├── templates.css       # Template selection
│   ├── configuration.css   # Configuration forms
│   ├── review.css          # Review section
│   ├── installation.css    # Installation progress
│   ├── completion.css      # Completion section
│   └── checklist.css       # System check items
│
├── utils/                   # Utility classes and helpers
│   ├── animations.css      # Animations and micro-interactions
│   └── helpers.css         # Utility classes (spacing, display, etc.)
│
└── legacy/                  # Temporary compatibility layer
    └── compatibility.css    # Legacy styles during transition
```

## Import Order

The main `wizard.css` file imports modules in this specific order:

1. **Core Styles** - Foundation (variables, base, layout, responsive)
2. **Component Styles** - Reusable UI elements
3. **Feature Styles** - Step-specific functionality
4. **Utility Styles** - Helper classes and animations
5. **Legacy Compatibility** - Temporary transition support

## Key Improvements

### 🎯 Maintainability
- **Logical Organization**: Related styles grouped together
- **Single Responsibility**: Each file has a clear, focused purpose
- **Easy Navigation**: Find styles quickly by feature/component
- **Reduced Conflicts**: Smaller files reduce merge conflicts

### 🚀 Performance
- **Selective Loading**: Can load only needed components (future optimization)
- **Better Caching**: Individual files can be cached separately
- **Faster Development**: Smaller files load faster in dev tools

### 🧪 Testing & Debugging
- **Isolated Testing**: Test individual components in isolation
- **Easier Debugging**: Smaller scope for style issues
- **Component-Level Changes**: Modify specific features without affecting others

### 📱 Responsive Design
- **Centralized Responsive Logic**: All media queries in `core/responsive.css`
- **Consistent Breakpoints**: Unified responsive behavior
- **Compact Spacing System**: Optimized for better screen utilization

## CSS Custom Properties (Variables)

All design tokens are centralized in `core/variables.css`:

### Spacing System
```css
/* Standard spacing */
--space-1 through --space-20

/* Compact spacing (new) */
--space-compact-1 through --space-compact-6

/* Responsive spacing (new) */
--space-responsive-sm/md/lg
```

### Brand Colors
```css
/* Kaspa brand colors */
--kaspa-blue, --kaspa-dark, --kaspa-light, --kaspa-pale
--kaspa-purple variants

/* Status colors */
--success, --warning, --error, --info
```

### Typography
```css
/* Font families */
--font-heading, --font-body, --font-code

/* Font sizes */
--text-h1 through --text-xs

/* Font weights */
--font-light through --font-bold
```

## Migration Status

### ✅ Completed
- [x] Core foundation (variables, base, layout, responsive)
- [x] Button components
- [x] Progress indicator
- [x] Hero section
- [x] Basic utility classes
- [x] Animation utilities
- [x] Compact spacing system implementation

### 🚧 In Progress
- [ ] Profile cards (placeholder created)
- [ ] Template selection (placeholder created)
- [ ] Configuration forms (placeholder created)
- [ ] Review section (placeholder created)
- [ ] Installation progress (placeholder created)
- [ ] Completion section (placeholder created)
- [ ] Checklist styles (placeholder created)

### 📋 TODO
- [ ] Extract remaining styles from legacy/compatibility.css
- [ ] Complete feature-specific CSS files
- [ ] Remove legacy compatibility layer
- [ ] Add CSS documentation comments
- [ ] Create component style guide

## Development Guidelines

### Adding New Styles

1. **Determine Category**: Is it a core style, component, feature, or utility?
2. **Choose Appropriate File**: Add to existing file or create new one
3. **Use CSS Variables**: Leverage existing design tokens
4. **Follow BEM Methodology**: Use consistent naming conventions
5. **Add Documentation**: Include comments explaining complex styles

### Modifying Existing Styles

1. **Locate Correct File**: Use the directory structure to find styles
2. **Check Dependencies**: Ensure changes don't break other components
3. **Test Responsiveness**: Verify changes work across breakpoints
4. **Update Documentation**: Keep README and comments current

### Best Practices

- **Use CSS Variables**: Prefer custom properties over hardcoded values
- **Mobile First**: Write responsive styles mobile-first
- **Semantic Classes**: Use meaningful class names
- **Avoid !important**: Use specificity and cascade properly
- **Comment Complex Logic**: Explain non-obvious CSS

## Rollback Plan

If issues arise, the original monolithic CSS is preserved as `wizard-original-backup.css`. To rollback:

1. Stop the wizard service
2. Rename current `wizard.css` to `wizard-modular.css`
3. Rename `wizard-original-backup.css` to `wizard.css`
4. Restart the wizard service

## Testing

### Manual Testing Checklist
- [ ] All wizard steps load correctly
- [ ] Responsive behavior works on mobile/tablet
- [ ] Animations and transitions function properly
- [ ] Brand colors and typography are consistent
- [ ] No console errors related to missing CSS files

### Automated Testing (Future)
- CSS linting with stylelint
- Visual regression testing
- Performance impact measurement
- Cross-browser compatibility testing

## Performance Impact

The modular structure has minimal performance impact:
- **HTTP Requests**: Slightly more requests, but files are smaller and cacheable
- **Parse Time**: Faster parsing due to smaller individual files
- **Development**: Significantly faster development and debugging
- **Maintenance**: Much easier to maintain and update

## Future Enhancements

1. **CSS-in-JS Migration**: Consider component-scoped styles
2. **Design System**: Expand into full design system documentation
3. **Theme Support**: Add dark mode and custom theme support
4. **Component Library**: Extract reusable components for other projects
5. **Build Optimization**: Add CSS minification and bundling for production