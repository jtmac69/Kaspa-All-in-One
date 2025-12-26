# Kaspa Brand Assets Organization Guide

## 📁 Recommended File Structure

```
assets/brand/
├── logos/
│   ├── svg/
│   │   ├── kaspa-logo-light.svg           # Full logo for light backgrounds
│   │   ├── kaspa-logo-dark.svg            # Full logo for dark backgrounds (white)
│   │   ├── kaspa-logo-horizontal-light.svg
│   │   ├── kaspa-logo-horizontal-dark.svg
│   │   ├── kaspa-logo-vertical-light.svg
│   │   └── kaspa-logo-vertical-dark.svg
│   └── png/                                # Optional PNG versions
│       ├── kaspa-logo-light-512.png
│       ├── kaspa-logo-light-256.png
│       ├── kaspa-logo-dark-512.png
│       └── kaspa-logo-dark-256.png
├── icons/
│   ├── svg/
│   │   ├── kaspa-icon-light.svg           # K symbol for light backgrounds
│   │   ├── kaspa-icon-dark.svg            # K symbol for dark backgrounds (white)
│   │   ├── kaspa-icon-color.svg           # K symbol with Kaspa colors
│   │   └── kaspa-icon-monochrome.svg      # K symbol single color
│   └── png/                                # For favicons
│       ├── kaspa-icon-16.png              # Favicon 16x16
│       ├── kaspa-icon-32.png              # Favicon 32x32
│       ├── kaspa-icon-64.png              # Standard icon
│       ├── kaspa-icon-128.png
│       ├── kaspa-icon-256.png
│       └── kaspa-icon-512.png
├── wordmarks/
│   ├── svg/
│   │   ├── kaspa-wordmark-light.svg       # Text only for light backgrounds
│   │   └── kaspa-wordmark-dark.svg        # Text only for dark backgrounds
│   └── png/
│       ├── kaspa-wordmark-light-256.png
│       └── kaspa-wordmark-dark-256.png
└── README.md                               # This file
```

## 🎨 File Format Recommendations

### Primary Format: **SVG** ✅ RECOMMENDED

**Use SVG for:**
- ✅ Logos (all sizes)
- ✅ Icons
- ✅ Wordmarks
- ✅ Any scalable graphics

**Why SVG?**
- Infinitely scalable without quality loss
- Smaller file size
- Better for responsive design
- Can be styled with CSS
- Crisp on all displays (including Retina)

### Secondary Format: **PNG**

**Use PNG only for:**
- Favicons (browser compatibility)
- Social media sharing images
- Email signatures
- Legacy browser support

## 📋 Download Checklist from https://kaspa.org/media-kit/

### Essential Files (SVG) - Priority 1

- [ ] **Full Logo (Light Background)**
  - Download as: `kaspa-logo-light.svg`
  - Place in: `logos/svg/`
  - Use for: Main wizard logo on light backgrounds

- [ ] **Full Logo (Dark Background)**
  - Download as: `kaspa-logo-dark.svg`
  - Place in: `logos/svg/`
  - Use for: Main wizard logo on dark backgrounds

- [ ] **Icon (Light Background)**
  - Download as: `kaspa-icon-light.svg`
  - Place in: `icons/svg/`
  - Use for: Small spaces, footer, navigation

- [ ] **Icon (Dark Background)**
  - Download as: `kaspa-icon-dark.svg`
  - Place in: `icons/svg/`
  - Use for: Small spaces on dark backgrounds

### Optional Files - Priority 2

- [ ] **Horizontal Logo Variants**
  - `kaspa-logo-horizontal-light.svg`
  - `kaspa-logo-horizontal-dark.svg`

- [ ] **Vertical Logo Variants**
  - `kaspa-logo-vertical-light.svg`
  - `kaspa-logo-vertical-dark.svg`

- [ ] **Wordmark Only**
  - `kaspa-wordmark-light.svg`
  - `kaspa-wordmark-dark.svg`

### Favicon Files (PNG) - Priority 3

- [ ] **Icon PNG for Favicons**
  - `kaspa-icon-16.png` (16×16)
  - `kaspa-icon-32.png` (32×32)
  - `kaspa-icon-64.png` (64×64)
  - Place in: `icons/png/`

## 🎯 Naming Convention

### Pattern: `kaspa-[type]-[variant]-[background].[ext]`

**Type:**
- `logo` - Full logo with icon and text
- `icon` - Icon/symbol only (K symbol)
- `wordmark` - Text only

**Variant:**
- `horizontal` - Wide layout
- `vertical` - Tall layout
- `color` - Full color version
- `monochrome` - Single color

**Background:**
- `light` - For use on light backgrounds (colored logo)
- `dark` - For use on dark backgrounds (white logo)

**Examples:**
- `kaspa-logo-horizontal-light.svg` ✅
- `kaspa-icon-color.svg` ✅
- `kaspa-wordmark-dark.svg` ✅

## 🔄 Automatic Dark Mode Switching

The wizard will automatically switch logos based on user's system preference:

```css
/* Light mode (default) */
.logo {
  content: url('/assets/brand/logos/svg/kaspa-logo-light.svg');
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .logo {
    content: url('/assets/brand/logos/svg/kaspa-logo-dark.svg');
  }
}
```

## 📐 Size Guidelines

### Logo Sizes
- **Hero/Welcome**: 200-300px width
- **Header/Navigation**: 120-150px width
- **Footer**: 80-100px width
- **Minimum**: 120px width (maintain legibility)

### Icon Sizes
- **Large**: 64px (hero sections)
- **Medium**: 48px (cards, features)
- **Small**: 32px (navigation, footer)
- **Tiny**: 16-24px (inline, badges)
- **Minimum**: 16px (favicon)

## 🎨 Usage Examples

### Hero Logo (Welcome Screen)
```html
<picture>
  <source srcset="/assets/brand/logos/svg/kaspa-logo-dark.svg" 
          media="(prefers-color-scheme: dark)">
  <img src="/assets/brand/logos/svg/kaspa-logo-light.svg" 
       alt="Kaspa" 
       class="hero-logo">
</picture>
```

### Footer Icon
```html
<picture>
  <source srcset="/assets/brand/icons/svg/kaspa-icon-dark.svg" 
          media="(prefers-color-scheme: dark)">
  <img src="/assets/brand/icons/svg/kaspa-icon-light.svg" 
       alt="Kaspa" 
       class="footer-icon">
</picture>
```

### Favicon (HTML head)
```html
<!-- SVG favicon (modern browsers) -->
<link rel="icon" type="image/svg+xml" 
      href="/assets/brand/icons/svg/kaspa-icon-light.svg">

<!-- PNG fallback -->
<link rel="icon" type="image/png" sizes="32x32" 
      href="/assets/brand/icons/png/kaspa-icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" 
      href="/assets/brand/icons/png/kaspa-icon-16.png">
```

## ✅ Quick Setup Steps

### 1. Create Folder Structure
```bash
cd services/wizard/frontend/public/assets/brand
mkdir -p logos/svg logos/png icons/svg icons/png wordmarks/svg wordmarks/png
```

### 2. Download from Media Kit
Visit https://kaspa.org/media-kit/ and download all logo variants

### 3. Rename Files
Rename downloaded files according to naming convention:
- `Kaspa_Logo.svg` → `kaspa-logo-light.svg`
- `Kaspa_Logo_White.svg` → `kaspa-logo-dark.svg`
- `Kaspa_Icon.svg` → `kaspa-icon-light.svg`
- `Kaspa_Icon_White.svg` → `kaspa-icon-dark.svg`

### 4. Place Files
Move renamed files to appropriate folders:
```bash
mv kaspa-logo-light.svg logos/svg/
mv kaspa-logo-dark.svg logos/svg/
mv kaspa-icon-light.svg icons/svg/
mv kaspa-icon-dark.svg icons/svg/
```

### 5. Verify
Check that files are in correct locations:
```bash
ls -R assets/brand/
```

## 🔍 File Verification Checklist

After downloading and organizing, verify:

- [ ] All SVG files are in correct folders
- [ ] File names follow naming convention
- [ ] Light and dark variants are both present
- [ ] Files open correctly in browser
- [ ] SVG files are properly formatted (not corrupted)
- [ ] PNG files are correct dimensions (if using)

## 🚨 Common Issues

### Issue: Logo not displaying
**Solution**: Check file path and name match exactly

### Issue: Wrong logo for dark mode
**Solution**: Verify file names: `-light` for light bg, `-dark` for dark bg

### Issue: Logo too large/small
**Solution**: Adjust CSS width/height, SVG will scale perfectly

### Issue: Blurry logo
**Solution**: Use SVG instead of PNG for perfect clarity

## 📞 Need Help?

- **Media Kit**: https://kaspa.org/media-kit/
- **Brand Guidelines**: See BRAND_DESIGN_GUIDE.md
- **Wizard Docs**: See ../README.md

---

**Prefer SVG format for all logos and icons! It's scalable, smaller, and looks perfect on all displays. 🎨**
