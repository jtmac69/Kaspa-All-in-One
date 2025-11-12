# Kaspa Brand Assets Checklist

## 📥 Required Downloads from https://kaspa.org/media-kit/

### Logo Files (SVG Format)

- [ ] **kaspa-logo.svg** - Full horizontal logo (primary)
- [ ] **kaspa-logo-vertical.svg** - Vertical logo variant
- [ ] **kaspa-icon.svg** - Icon only (K symbol)
- [ ] **kaspa-wordmark.svg** - Text only
- [ ] **kaspa-logo-white.svg** - White version for dark backgrounds
- [ ] **kaspa-icon-white.svg** - White icon for dark backgrounds

### Optional Assets

- [ ] **kaspa-logo.png** - PNG versions (various sizes)
- [ ] **kaspa-icon.png** - PNG icon versions
- [ ] **Brand guidelines PDF** - Official brand documentation

## 📂 File Organization

Place downloaded assets in:

```
services/wizard/frontend/public/assets/brand/
├── kaspa-logo.svg
├── kaspa-logo-vertical.svg
├── kaspa-icon.svg
├── kaspa-wordmark.svg
├── kaspa-logo-white.svg
└── kaspa-icon-white.svg
```

## 🎨 Brand Colors Reference

### Primary Kaspa Colors

```
Kaspa Teal/Cyan: #70C7BA
Darker Teal:     #49C8B5
Lighter Teal:    #9FE7DC
Pale Teal:       #E5F7F5
```

### Secondary Colors

```
Kaspa Purple:    #7B61FF
Purple Dark:     #5B41DF
Purple Light:    #9B81FF
```

### Status Colors

```
Success Green:   #7ED321
Warning Orange:  #F5A623
Error Red:       #D0021B
```

## 🔤 Typography

### Fonts to Include

**Headings**: Montserrat (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap" rel="stylesheet">
```

**Body**: Open Sans (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

**Code**: Fira Code (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
```

## ✅ Implementation Checklist

### CSS Variables Setup

- [ ] Define all Kaspa brand colors as CSS variables
- [ ] Set up gradient definitions
- [ ] Configure typography variables
- [ ] Set up spacing system
- [ ] Define transition/animation variables

### Component Styling

- [ ] Style buttons with Kaspa gradient
- [ ] Style cards with Kaspa colors
- [ ] Style progress bars with Kaspa gradient
- [ ] Style status indicators with brand colors
- [ ] Style form inputs with Kaspa accents

### Logo Implementation

- [ ] Add logo to welcome/hero section
- [ ] Add icon to browser tab (favicon)
- [ ] Add logo to navigation/header
- [ ] Add logo to completion screen
- [ ] Implement dark mode logo switching

### Responsive Design

- [ ] Test logo sizes on mobile (min 32px)
- [ ] Test logo sizes on tablet (min 48px)
- [ ] Test logo sizes on desktop (min 64px)
- [ ] Verify clear space around logos
- [ ] Test dark mode logo variants

### Accessibility

- [ ] Verify color contrast ratios (WCAG AA)
- [ ] Add alt text to all logo images
- [ ] Test keyboard navigation with focus states
- [ ] Test with screen readers
- [ ] Verify touch target sizes (min 44px)

## 🎯 Quick Start

1. **Download assets**:
   ```bash
   # Visit https://kaspa.org/media-kit/
   # Download logo pack
   # Extract to services/wizard/frontend/public/assets/brand/
   ```

2. **Set up CSS**:
   ```bash
   # Copy color variables from BRAND_DESIGN_GUIDE.md
   # Add to your main CSS file or CSS-in-JS configuration
   ```

3. **Import fonts**:
   ```html
   <!-- Add to index.html <head> -->
   <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
   ```

4. **Use logo**:
   ```html
   <img src="/assets/brand/kaspa-logo.svg" alt="Kaspa" class="logo" />
   ```

## 📋 Brand Guidelines Summary

### Do's ✅

- ✅ Use official logo files from media kit
- ✅ Maintain minimum clear space (16px)
- ✅ Use official brand colors (#70C7BA, #49C8B5)
- ✅ Use white logo on dark backgrounds
- ✅ Maintain logo proportions
- ✅ Use Montserrat for headings
- ✅ Use Open Sans for body text

### Don'ts ❌

- ❌ Don't modify logo colors
- ❌ Don't rotate or distort logo
- ❌ Don't add effects to logo (shadows, gradients)
- ❌ Don't recreate logo
- ❌ Don't use logo smaller than 32px
- ❌ Don't place logo on busy backgrounds
- ❌ Don't use non-brand colors for primary elements

## 🔗 Resources

- **Media Kit**: https://kaspa.org/media-kit/
- **Official Website**: https://kaspa.org/
- **Brand Design Guide**: See BRAND_DESIGN_GUIDE.md
- **Design Specification**: See design.md

---

**Complete this checklist before starting frontend development to ensure consistent Kaspa branding! 🎨**