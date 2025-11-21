# Wizard Dark Mode & Asset Organization - Complete! 🌓

## ✅ What's Been Added

I've updated the Installation Wizard with full dark mode support and created comprehensive guides for organizing brand assets.

## 🌓 Dark Mode Support

### **Yes! Fully Supported**

The wizard now automatically adapts to the user's system dark mode preference:

- **Light Mode** (default): Light backgrounds, colored Kaspa logos
- **Dark Mode** (automatic): Dark backgrounds, white Kaspa logos
- **Seamless switching**: No user action required

### What Changes in Dark Mode

- Background: Light gray → Near black
- Surface: White → Dark gray
- Text: Dark → White
- Logos: Colored → White versions
- Shadows: Adjusted for dark backgrounds

## 📥 Brand Assets Organization

### **Prefer SVG Format** ✅

**Why SVG?**
- ✅ Scalable to any size without quality loss
- ✅ Smaller file size
- ✅ Crisp on all displays (Retina, 4K)
- ✅ Can be styled with CSS
- ✅ Perfect for responsive design

**Use PNG only for:**
- Favicons (browser compatibility)

### File Naming Convention

```
kaspa-[type]-[background].svg

Examples:
- kaspa-logo-light.svg    (full logo for light backgrounds)
- kaspa-logo-dark.svg     (white logo for dark backgrounds)
- kaspa-icon-light.svg    (icon for light backgrounds)
- kaspa-icon-dark.svg     (white icon for dark backgrounds)
```

### Folder Structure

```
assets/brand/
├── logos/
│   └── svg/
│       ├── kaspa-logo-light.svg
│       └── kaspa-logo-dark.svg
├── icons/
│   ├── svg/
│   │   ├── kaspa-icon-light.svg
│   │   └── kaspa-icon-dark.svg
│   └── png/
│       ├── kaspa-icon-16.png
│       ├── kaspa-icon-32.png
│       └── kaspa-icon-64.png
└── setup-assets.sh
```

## 🚀 Quick Setup

### Step 1: Download Assets

Visit https://kaspa.org/media-kit/ and download:
- Full logo (colored) → `kaspa-logo-light.svg`
- Full logo (white) → `kaspa-logo-dark.svg`
- Icon (colored) → `kaspa-icon-light.svg`
- Icon (white) → `kaspa-icon-dark.svg`

### Step 2: Organize Files

**Option A: Use the setup script**
```bash
cd services/wizard/frontend/public/assets/brand
# Place downloaded files here
./setup-assets.sh
```

**Option B: Manual**
```bash
mkdir -p logos/svg icons/svg icons/png
mv Kaspa_Logo.svg logos/svg/kaspa-logo-light.svg
mv Kaspa_Logo_White.svg logos/svg/kaspa-logo-dark.svg
mv Kaspa_Icon.svg icons/svg/kaspa-icon-light.svg
mv Kaspa_Icon_White.svg icons/svg/kaspa-icon-dark.svg
```

### Step 3: View the Wizard

```bash
cd services/wizard/frontend/public
python3 -m http.server 3000
# Open http://localhost:3000
```

## 📁 Files Created/Updated

### New Files
1. **`DARK_MODE_AND_ASSETS_GUIDE.md`** - Comprehensive guide
2. **`assets/brand/ASSET_ORGANIZATION_GUIDE.md`** - Detailed organization guide
3. **`assets/brand/setup-assets.sh`** - Automated setup script

### Updated Files
1. **`wizard.css`** - Added dark mode support
2. **`index.html`** - Updated logo paths with picture elements for dark mode

## 🎨 How It Works

### Automatic Logo Switching

```html
<picture>
  <!-- Dark mode: white logo -->
  <source srcset="/assets/brand/logos/svg/kaspa-logo-dark.svg" 
          media="(prefers-color-scheme: dark)">
  <!-- Light mode: colored logo -->
  <img src="/assets/brand/logos/svg/kaspa-logo-light.svg" alt="Kaspa">
</picture>
```

### CSS Dark Mode Detection

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0F0F0F;
    --surface: #1A1A1A;
    --text-primary: #FFFFFF;
    /* ... */
  }
}
```

## 🧪 Testing Dark Mode

**macOS:**
System Preferences → General → Appearance → Dark

**Windows:**
Settings → Personalization → Colors → Dark

**Browser DevTools:**
Cmd+Shift+P → "Rendering" → "Emulate CSS prefers-color-scheme: dark"

## 📊 File Format Comparison

| Feature | SVG ✅ | PNG |
|---------|--------|-----|
| Scalability | Perfect | Pixelated |
| File Size | 5-50 KB | 50-500 KB |
| Quality | Always crisp | Resolution-dependent |
| Retina Display | Perfect | Needs @2x |
| CSS Styling | Yes | No |
| Use Case | Logos, icons | Favicons only |

## ✅ Verification Checklist

After setup:
- [ ] Light mode logo displays correctly
- [ ] Dark mode logo switches automatically
- [ ] Footer icon displays correctly
- [ ] Favicon appears in browser tab
- [ ] All SVG files are crisp
- [ ] No broken image icons
- [ ] Test dark mode switching
- [ ] Test on mobile devices

## 📚 Documentation

All guides are in `services/wizard/`:

1. **DARK_MODE_AND_ASSETS_GUIDE.md** - Main guide (this summary)
2. **assets/brand/ASSET_ORGANIZATION_GUIDE.md** - Detailed organization
3. **assets/brand/setup-assets.sh** - Automated setup
4. **README.md** - Project documentation
5. **QUICKSTART.md** - Quick start guide

## 🎯 Key Takeaways

### Dark Mode
- ✅ **Fully supported** - Automatic detection and switching
- ✅ **No user action** - Works based on system preference
- ✅ **Complete styling** - All colors, logos, shadows adapted

### File Format
- ✅ **Use SVG** - For all logos and icons
- ✅ **Use PNG** - Only for favicons (16×16, 32×32)
- ✅ **Scalable** - SVG looks perfect at any size

### File Naming
- ✅ **Clear convention** - `kaspa-[type]-[background].svg`
- ✅ **Light/Dark variants** - Separate files for each mode
- ✅ **Organized folders** - logos/svg/, icons/svg/, icons/png/

### Setup Process
- ✅ **Simple** - Download, organize, verify
- ✅ **Automated** - Use setup-assets.sh script
- ✅ **Well documented** - Multiple guides available

## 🎉 Summary

The Installation Wizard now features:

- 🌓 **Full dark mode support** with automatic switching
- 📁 **Clear asset organization** with naming conventions
- 🎨 **Proper Kaspa branding** in both light and dark modes
- 📝 **Comprehensive documentation** for setup and usage
- 🛠️ **Automated setup script** for easy organization
- ✅ **SVG-first approach** for perfect quality at any size

**Download the assets from https://kaspa.org/media-kit/ and the wizard will look beautiful in both light and dark mode! 🚀**

---

## Quick Reference

**Download**: https://kaspa.org/media-kit/
**Format**: SVG (preferred)
**Naming**: `kaspa-[type]-[background].svg`
**Setup**: Run `./setup-assets.sh`
**Test**: Toggle system dark mode
