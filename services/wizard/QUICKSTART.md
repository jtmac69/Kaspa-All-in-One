# Quick Start Guide - Installation Wizard

## 🚀 View the Wizard in 3 Steps

### Step 1: Download Kaspa Brand Assets (Optional but Recommended)

Visit https://kaspa.org/media-kit/ and download:
- `kaspa-logo.svg`
- `kaspa-icon.svg`

Place them in: `frontend/public/assets/brand/`

### Step 2: Start a Local Server

```bash
cd services/wizard/frontend/public

# Option A: Python (easiest)
python3 -m http.server 3000

# Option B: Node.js
npx serve -p 3000

# Option C: PHP
php -S localhost:3000
```

### Step 3: Open in Browser

Open http://localhost:3000

## ✨ What You'll See

1. **Welcome Screen** - Kaspa-branded hero with "Get Started" button
2. **System Check** - Animated system requirements validation
3. **Profile Selection** - Interactive cards for choosing services

## 🎮 Try These Features

- Click "Get Started" to begin
- Watch the system check animation
- Click profile cards to select them
- Use "Back" and "Continue" buttons
- Check the progress indicator at the top

## 🎨 Customization

### Change Colors
Edit `frontend/public/styles/wizard.css`:
```css
:root {
  --kaspa-blue: #70C7BA;  /* Change this */
}
```

### Add Content
Edit `frontend/public/index.html`:
```html
<div class="hero-title">Your Custom Title</div>
```

### Modify Behavior
Edit `frontend/public/scripts/wizard.js`:
```javascript
function nextStep() {
  // Your custom logic
}
```

## 📱 Test Responsive Design

- Desktop: Full width (1200px max)
- Tablet: Optimized layout (768px)
- Mobile: Single column (< 768px)

Resize your browser to see responsive changes!

## 🐛 Troubleshooting

### Logo Not Showing?
- Download from https://kaspa.org/media-kit/
- Place in `frontend/public/assets/brand/`
- Refresh browser

### Styles Not Loading?
- Check console for errors (F12)
- Verify file paths are correct
- Clear browser cache (Ctrl+Shift+R)

### JavaScript Not Working?
- Check console for errors (F12)
- Ensure server is running
- Try different browser

## 📚 Next Steps

1. **Download brand assets** from Kaspa media kit
2. **Review the code** to understand structure
3. **Implement remaining steps** (Configure, Review, Install, Complete)
4. **Add backend API** for real functionality
5. **Test thoroughly** across browsers

## 🔗 Documentation

- **README**: `README.md`
- **Full Spec**: `../../.kiro/specs/web-installation-wizard/`
- **Brand Guide**: `../../.kiro/specs/web-installation-wizard/BRAND_DESIGN_GUIDE.md`

---

**Enjoy exploring the Kaspa Installation Wizard! 🎉**
