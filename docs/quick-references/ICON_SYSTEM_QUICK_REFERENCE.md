# Icon System Quick Reference

Quick reference guide for using the Lucide icon system in Kaspa All-in-One Dashboard and Wizard.

## Quick Start

### Import Icon System

**In HTML**:
```html
<link rel="stylesheet" href="/shared/icons/lucide-icons.css">
```

**In JavaScript**:
```javascript
import { createIcon, createIconButton, Icons } from '/shared/icons/icons.js';
```

## Creating Icons

### Basic Icon
```javascript
const icon = createIcon('zap');
element.appendChild(icon);
```

### Icon with Options
```javascript
const icon = createIcon('refresh', {
    size: 'sm',           // xs, sm, md, lg, xl
    color: 'kaspa-blue',  // kaspa-blue, kaspa-purple, success, warning, error
    rotating: true,       // Add rotation animation
    pulse: false,         // Add pulse animation
    ariaLabel: 'Refresh data'
});
```

### Icon Button with Tooltip
```javascript
const button = createIconButton('settings', {
    tooltip: 'Open settings',
    class: 'my-custom-class',
    onClick: () => openSettings(),
    iconOptions: { size: 'sm', color: 'kaspa-blue' }
});
```

## Available Icons

### Common Icons
```javascript
Icons.zap           // Lightning bolt (Kaspa brand)
Icons.wand          // Magic wand (Wizard)
Icons.settings      // Settings gear
Icons.config        // Sliders
Icons.update        // Upload arrow
Icons.globe         // Globe (network)
Icons.server        // Server (node)
Icons.activity      // Activity graph
Icons.refresh       // Refresh arrows
Icons.play          // Play button
Icons.stop          // Stop square
Icons.restart       // Rotate clockwise
Icons.logs          // Document
Icons.search        // Magnifying glass
Icons.warning       // Alert triangle
Icons.error         // X circle
Icons.success       // Check circle
Icons.close         // X
Icons.bug           // Bug
Icons.lightbulb     // Light bulb
Icons.coffee        // Coffee cup
```

### Full List
See `Icons` object in `/shared/icons/icons.js` for complete list.

## Icon Sizes

```css
.icon-xs   /* 12px - inline icons */
.icon-sm   /* 16px - default, compact buttons */
.icon-md   /* 20px - section headings */
.icon-lg   /* 24px - large buttons */
.icon-xl   /* 32px - hero elements */
```

## Icon Colors

```css
.icon-kaspa-blue     /* #70c7ba - Primary brand */
.icon-kaspa-purple   /* #49108B - Secondary brand */
.icon-success        /* #7ed321 - Positive states */
.icon-warning        /* #f5a623 - Warning states */
.icon-error          /* #d0021b - Error states */
.icon-muted          /* Secondary text color */
```

## Animations

```css
.icon-rotating   /* Continuous 360° rotation */
.icon-pulse      /* Opacity fade in/out */
.icon-spin       /* Slower rotation */
```

### Add Animation Dynamically
```javascript
// Add rotation
icon.classList.add('icon-rotating');

// Remove after 1 second
setTimeout(() => icon.classList.remove('icon-rotating'), 1000);
```

## Button Styles

### Icon-Only Button
```html
<button class="btn-icon-only icon-tooltip" data-tooltip="Refresh">
    <!-- Icon inserted here -->
</button>
```

### Button with Icon and Text
```html
<button class="btn-with-icon">
    <!-- Icon -->
    <span>Button Text</span>
</button>
```

## HTML Usage

### Direct SVG
```html
<svg class="lucide lucide-zap icon-sm icon-kaspa-blue" 
     xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 24 24" 
     fill="none" 
     stroke="currentColor" 
     stroke-width="2">
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
</svg>
```

### With Tooltip
```html
<button class="btn-icon-only icon-tooltip" 
        data-tooltip="Settings" 
        aria-label="Open settings">
    <svg class="lucide lucide-settings icon-sm">...</svg>
</button>
```

## Common Patterns

### Loading State
```javascript
// Show loading
button.disabled = true;
const icon = button.querySelector('.lucide');
icon.classList.add('icon-rotating');

// Hide loading
button.disabled = false;
icon.classList.remove('icon-rotating');
```

### Status Indicator
```javascript
const statusIcon = createIcon('circle', {
    size: 'xs',
    color: isOnline ? 'success' : 'error',
    pulse: !isOnline
});
```

### Expandable Section
```javascript
const chevron = createIcon('chevron', { 
    size: 'xs', 
    class: 'icon-chevron' 
});

details.addEventListener('toggle', () => {
    chevron.classList.toggle('expanded', details.open);
});
```

### Action Button
```javascript
const button = document.createElement('button');
button.className = 'btn-small';
button.appendChild(createIcon('play', { size: 'xs' }));
button.appendChild(document.createTextNode(' Start'));
```

## Accessibility

### Icon-Only Buttons
Always include:
- `aria-label` attribute
- `title` attribute
- Tooltip via `data-tooltip`

```html
<button class="btn-icon-only icon-tooltip"
        data-tooltip="Refresh data"
        title="Refresh data"
        aria-label="Refresh data">
    <svg class="lucide lucide-refresh-cw">...</svg>
</button>
```

### Decorative Icons
```html
<svg class="lucide" aria-hidden="true">...</svg>
```

### Informative Icons
```html
<svg class="lucide" role="img" aria-label="Warning">...</svg>
```

## Responsive Design

Icons automatically adjust on mobile:
```css
@media (max-width: 768px) {
    .lucide {
        width: 18px;
        height: 18px;
    }
}
```

## Dark Mode

Icons automatically adapt to dark mode:
```css
@media (prefers-color-scheme: dark) {
    /* Icon colors adjust automatically */
    /* Tooltips styled for dark backgrounds */
}
```

## Troubleshooting

### Icon Not Showing
1. Check CSS import: `/shared/icons/lucide-icons.css`
2. Verify icon name exists in `Icons` object
3. Check SVG path data is defined

### Icon Too Small/Large
```javascript
// Adjust size
createIcon('name', { size: 'md' }); // or 'xs', 'sm', 'lg', 'xl'
```

### Icon Wrong Color
```javascript
// Set color
createIcon('name', { color: 'kaspa-blue' });

// Or use CSS
icon.classList.add('icon-kaspa-blue');
```

### Animation Not Working
```javascript
// Ensure class is added
icon.classList.add('icon-rotating');

// Check reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Animations disabled
}
```

### Tooltip Not Showing
```html
<!-- Ensure all required attributes -->
<button class="icon-tooltip" 
        data-tooltip="Text here"
        title="Text here">
```

## Best Practices

1. **Use semantic icon names**: Choose icons that clearly represent their function
2. **Consistent sizing**: Use `sm` (16px) for most UI elements
3. **Brand colors for accents**: Use Kaspa blue/purple sparingly for emphasis
4. **Always provide labels**: Icon-only buttons need tooltips and ARIA labels
5. **Animate purposefully**: Only animate when indicating loading/processing
6. **Test accessibility**: Verify with screen readers and keyboard navigation
7. **Consider dark mode**: Test icon visibility in both light and dark themes
8. **Optimize performance**: Reuse icon elements when possible

## Examples

### Header Button
```javascript
const updateBtn = createIconButton('update', {
    tooltip: 'Check for updates',
    class: 'btn-icon-only',
    iconOptions: { size: 'sm', color: 'kaspa-blue' }
});
```

### Service Action
```javascript
const restartBtn = document.createElement('button');
restartBtn.className = 'btn-small';
restartBtn.appendChild(createIcon('restart', { size: 'xs' }));
restartBtn.appendChild(document.createTextNode(' Restart'));
restartBtn.onclick = () => restartService();
```

### Status Badge
```javascript
const badge = document.createElement('span');
badge.className = 'status-badge';
badge.appendChild(createIcon('circle', { 
    size: 'xs', 
    color: 'success',
    pulse: true 
}));
badge.appendChild(document.createTextNode(' Online'));
```

### Section Heading
```javascript
const heading = document.createElement('h2');
heading.appendChild(createIcon('server', { 
    size: 'md', 
    color: 'kaspa-blue' 
}));
heading.appendChild(document.createTextNode(' Node Status'));
```

## Resources

- **Icon Library**: [Lucide Icons](https://lucide.dev/)
- **Implementation**: `/docs/implementation-summaries/dashboard/DASHBOARD_ICON_SYSTEM_IMPLEMENTATION.md`
- **Source Code**: `/services/shared/icons/`
- **Examples**: Dashboard UI (`/services/dashboard/public/`)

## Support

For issues or questions:
1. Check implementation documentation
2. Review icon-manager.js for examples
3. Test in browser console
4. Verify CSS imports are loaded
