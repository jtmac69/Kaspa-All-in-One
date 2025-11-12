# Dark Mode & Brand Assets Guide

## 🌓 Dark Mode Support

### ✅ Yes! The wizard fully supports dark mode

The wizard automatically detects and adapts to the user's system preference:
- **Light Mode**: Default, uses light backgrounds and colored logos
- **Dark Mode**: Automatically switches when system is in dark mode

### How It Works

```css
/* Automatically detects system preference */
@media (prefers-color-scheme: dark) {
  /* Dark mode styles applied automatically */
}
```

### What Changes in Dark Mode

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| **Background** | #F8F9FA (light gray) | #0F0F0F (near black) |
| **Surface** | #FFFFFF (white) | #1A1A1A (dark gray) |
| **Text** | #1A1A1A (dark) | #FFFFFF (white) |
| **Logo** | Colored version | White version |
| **Borders** | #E0E0E0 (light) | #333333 (dark) |
| **Shadows** | Subtle light | Deeper dark |

### Testing Dark Mode

**On macOS:**
- System Preferences → General → Appearance → Dark

**On Windows:**
- Settings → Personalization → Colors → Choose your mode → Dark

**In Browser DevTools:**
```javascript
// Chrome/Edge DevTools Console
// Cmd+Shift+P → "Rendering" → "Emulate CSS prefers-color-scheme"
```

## 📥 Brand Assets Setup

### Quick Answer: **Use SVG Format** ✅

**Why SVG?**
- ✅ Scalable to any size without quality loss
- ✅ Smaller file size than PNG
- ✅ Crisp on all displays (Retina, 4K, etc.)
- ✅ Can be styled with CSS
- ✅ Better for responsive design

**When to use PNG:**
- Only for favicons (browser compatibility)
- Social media sharing images

## 📁 File Organization

### Recommended Structure

```
assets/brand/
├── logos/
│   └── svg/
│       ├── kaspa-logo-light.svg    ← For light backgrounds
│       └── kaspa-logo-dark.svg     ← For dark backgrounds (white)
├── icons/
│   ├── svg/
│   │   ├── kaspa-icon-light.svg   ← For light backgrounds
│   │   └── kaspa-icon-dark.svg    ← For dark backgrounds (white)
│   └── png/                        ← Optional, for favicons
│       ├── kaspa-icon-16.png
│       ├── kaspa-icon-32.png
│       └── kaspa-icon-64.png
└── setup-assets.sh                 ← Helper script
```

### File Naming Convention

**Pattern**: `kaspa-[type]-[background].svg`

- **type**: `logo` (full logo) or `icon` (symbol only)
- **background**: `light` (for light bg) or `dark` (for dark bg)

**Examples:**
- `kaspa-logo-light.svg` ✅ - Full logo for light backgrounds
- `kaspa-logo-dark.svg` ✅ - Full logo (white) for dark backgrounds
- `kaspa-icon-light.svg` ✅ - Icon for light backgrounds
- `kaspa-icon-dark.svg` ✅ - Icon (white) for dark backgrounds

## 🚀 Quick Setup (3 Steps)

### Step 1: Download from Media Kit

Visit https://kaspa.org/media-kit/ and download:

**Essential Files (SVG):**
- [ ] Full logo (colored) → rename to `kaspa-logo-light.svg`
- [ ] Full logo (white) → rename to `kaspa-logo-dark.svg`
- [ ] Icon (colored) → rename to `kaspa-icon-light.svg`
- [ ] Icon (white) → rename to `kaspa-icon-dark.svg`

**Optional Files (PNG for favicons):**
- [ ] Icon 32×32 → rename to `kaspa-icon-32.png`
- [ ] Icon 16×16 → rename to `kaspa-icon-16.png`

### Step 2: Organize Files

**Option A: Use the setup script (easiest)**
```bash
cd services/wizard/frontend/public/assets/brand

# Place downloaded files here, then run:
./setup-assets.sh
```

**Option B: Manual organization**
```bash
cd services/wizard/frontend/public/assets/brand

# Create folders
mkdir -p logos/svg icons/svg icons/png

# Move and rename files
mv Kaspa_Logo.svg logos/svg/kaspa-logo-light.svg
mv Kaspa_Logo_White.svg logos/svg/kaspa-logo-dark.svg
mv Kaspa_Icon.svg icons/svg/kaspa-icon-light.svg
mv Kaspa_Icon_White.svg icons/svg/kaspa-icon-dark.svg

# Optional: PNG icons
mv Kaspa_Icon_32.png icons/png/kaspa-icon-32.png
mv Kaspa_Icon_16.png icons/png/kaspa-icon-16.png
```

### Step 3: Verify

```bash
# Check files are in place
ls -R assets/brand/

# Should see:
# logos/svg/kaspa-logo-light.svg
# logos/svg/kaspa-logo-dark.svg
# icons/svg/kaspa-icon-light.svg
# icons/svg/kaspa-icon-dark.svg
```

## 🎨 How the Wizard Uses Assets

### Hero Logo (Welcome Screen)

```html
<picture>
  <!-- Dark mode: white logo -->
  <source srcset="/assets/brand/logos/svg/kaspa-logo-dark.svg" 
          media="(prefers-color-scheme: dark)">
  <!-- Light mode: colored logo -->
  <img src="/assets/brand/logos/svg/kaspa-logo-light.svg" alt="Kaspa">
</picture>
```

**Automatic switching:**
- Light mode → Shows `kaspa-logo-light.svg` (colored)
- Dark mode → Shows `kaspa-logo-dark.svg` (white)

### Footer Icon

```html
<picture>
  <source srcset="/assets/brand/icons/svg/kaspa-icon-dark.svg" 
          media="(prefers-color-scheme: dark)">
  <img src="/assets/brand/icons/svg/kaspa-icon-light.svg" alt="Kaspa">
</picture>
```

### Favicon (Browser Tab)

```html
<!-- SVG favicon (modern browsers) -->
<link rel="icon" type="image/svg+xml" 
      href="/assets/brand/icons/svg/kaspa-icon-light.svg">

<!-- PNG fallback (older browsers) -->
<link rel="icon" type="image/png" sizes="32x32" 
      href="/assets/brand/icons/png/kaspa-icon-32.png">
```

## 📐 Size Guidelines

### Logo Sizes
- **Hero/Welcome**: 200px width (scales automatically with SVG)
- **Header**: 120-150px width
- **Footer**: 80-100px width
- **Minimum**: 120px width (maintain legibility)

### Icon Sizes
- **Large**: 64px (hero sections)
- **Medium**: 48px (cards)
- **Small**: 32px (navigation, footer)
- **Favicon**: 16-32px

## ✅ Verification Checklist

After setup, verify:

- [ ] Light mode logo displays correctly
- [ ] Dark mode logo switches automatically
- [ ] Footer icon displays correctly
- [ ] Favicon appears in browser tab
- [ ] All SVG files are crisp and clear
- [ ] No broken image icons
- [ ] Dark mode colors look good
- [ ] Light mode colors look good

## 🎯 File Format Comparison

| Aspect | SVG ✅ | PNG |
|--------|--------|-----|
| **Scalability** | Perfect at any size | Pixelated when scaled |
| **File Size** | Small (5-50 KB) | Larger (50-500 KB) |
| **Quality** | Always crisp | Depends on resolution |
| **Retina Display** | Perfect | Needs @2x version |
| **CSS Styling** | Can be styled | Cannot be styled |
| **Browser Support** | Modern browsers | All browsers |
| **Use Case** | Logos, icons, graphics | Favicons, photos |

**Recommendation**: Use SVG for everything except favicons (where PNG is needed for older browser compatibility).

## 🔧 Troubleshooting

### Logo not showing?
1. Check file path: `assets/brand/logos/svg/kaspa-logo-light.svg`
2. Check file name matches exactly (case-sensitive)
3. Open browser console (F12) for errors
4. Verify SVG file isn't corrupted (open in text editor)

### Wrong logo in dark mode?
1. Verify you have both `-light` and `-dark` versions
2. Check file names are correct
3. Test dark mode: System Preferences → Appearance → Dark
4. Clear browser cache (Ctrl+Shift+R)

### Logo too large/small?
1. SVG scales automatically - adjust CSS width
2. Edit `wizard.css`: `.hero-logo { width: 200px; }`
3. Don't worry about resolution - SVG is always crisp

### Blurry logo?
1. Make sure you're using SVG, not PNG
2. SVG files are never blurry at any size
3. If using PNG, you need higher resolution

## 📚 Additional Resources

- **Asset Organization Guide**: `ASSET_ORGANIZATION_GUIDE.md`
- **Brand Design Guide**: `../../../.kiro/specs/web-installation-wizard/BRAND_DESIGN_GUIDE.md`
- **Kaspa Media Kit**: https://kaspa.org/media-kit/
- **Wizard README**: `../../README.md`

## 🎉 Summary

### Dark Mode: ✅ Fully Supported
- Automatically detects system preference
- Switches colors, logos, and styling
- No user action required

### File Format: ✅ Use SVG
- Scalable, crisp, small file size
- Perfect for all displays
- Use PNG only for favicons

### File Naming: ✅ Clear Convention
- `kaspa-logo-light.svg` - For light backgrounds
- `kaspa-logo-dark.svg` - For dark backgrounds
- `kaspa-icon-light.svg` - Icon for light backgrounds
- `kaspa-icon-dark.svg` - Icon for dark backgrounds

### Setup: ✅ Simple Process
1. Download from https://kaspa.org/media-kit/
2. Run `./setup-assets.sh` or organize manually
3. Verify files are in correct locations

---

**The wizard looks beautiful in both light and dark mode with proper Kaspa branding! 🌓**
