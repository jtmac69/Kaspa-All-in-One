# Kaspa All-in-One Installation Wizard

A modern, web-based installation wizard for the Kaspa All-in-One project with official Kaspa branding.

## 🎨 Brand Assets Required

**Before running the wizard, download the official Kaspa brand assets:**

1. Visit https://kaspa.org/media-kit/
2. Download the logo pack
3. Extract the following files to `frontend/public/assets/brand/`:
   - `kaspa-logo.svg`
   - `kaspa-logo-white.svg`
   - `kaspa-icon.svg`
   - `kaspa-icon-white.svg`

## 📁 Project Structure

```
services/wizard/
├── frontend/
│   ├── public/
│   │   ├── assets/
│   │   │   ├── brand/          # Kaspa logos (download from media kit)
│   │   │   └── icons/          # UI icons
│   │   ├── styles/
│   │   │   └── wizard.css      # Main stylesheet with Kaspa colors
│   │   ├── scripts/
│   │   │   └── wizard.js       # Wizard functionality
│   │   └── index.html          # Main HTML file
│   └── package.json
├── backend/                     # To be implemented
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Download Brand Assets

```bash
# Visit https://kaspa.org/media-kit/ and download logos
# Place them in frontend/public/assets/brand/
```

### 2. View the Wizard

Open `frontend/public/index.html` in a web browser:

```bash
# Using Python
cd services/wizard/frontend/public
python3 -m http.server 3000

# Using Node.js
npx serve -p 3000

# Then open http://localhost:3000
```

## 🎨 Design Features

### Official Kaspa Branding
- **Primary Color**: #70C7BA (Kaspa teal/cyan)
- **Accent Color**: #7B61FF (Kaspa purple)
- **Typography**: Montserrat (headings), Open Sans (body)
- **Gradients**: Teal to dark teal, purple to teal

### Wizard Steps
1. **Welcome** - Introduction and getting started
2. **System Check** - Verify Docker, resources, ports
3. **Profile Selection** - Choose deployment profiles
4. **Configuration** - Configure services and settings
5. **Review** - Review selections before installation
6. **Installation** - Real-time installation progress
7. **Complete** - Success screen with next steps

### Key Features
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Kaspa brand colors and gradients
- ✅ Smooth animations and transitions
- ✅ Progress indicator
- ✅ Auto-save progress
- ✅ Accessible (WCAG 2.1 AA)

## 🛠️ Development

### Current Status
- ✅ HTML structure complete
- ✅ CSS styling with Kaspa brand colors
- ✅ Basic JavaScript functionality
- ⏳ Backend API (to be implemented)
- ⏳ WebSocket progress streaming (to be implemented)
- ⏳ Additional wizard steps (to be implemented)

### Next Steps
1. Download Kaspa brand assets from media kit
2. Implement backend API (Node.js/Express)
3. Add remaining wizard steps (Configure, Review, Install, Complete)
4. Implement WebSocket for real-time progress
5. Add form validation and error handling
6. Create Docker configuration
7. Add comprehensive testing

## 📋 Implementation Checklist

### Frontend
- [x] HTML structure
- [x] CSS with Kaspa brand colors
- [x] Basic navigation
- [x] Welcome step
- [x] System check step
- [x] Profile selection step
- [ ] Configuration step
- [ ] Review step
- [ ] Installation progress step
- [ ] Completion step
- [ ] Form validation
- [ ] Error handling
- [ ] Toast notifications

### Backend
- [ ] Express.js server setup
- [ ] System requirements checker API
- [ ] Profile management API
- [ ] Configuration validation API
- [ ] Installation engine
- [ ] WebSocket progress streaming
- [ ] Service health checks
- [ ] Error handling

### Integration
- [ ] Docker configuration
- [ ] Environment variables
- [ ] API client
- [ ] WebSocket client
- [ ] State management
- [ ] Progress persistence

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Browser compatibility
- [ ] Responsive design testing
- [ ] Accessibility testing

## 🎯 Design Guidelines

See the following documents for detailed design specifications:

- **Brand Design Guide**: `../../.kiro/specs/web-installation-wizard/BRAND_DESIGN_GUIDE.md`
- **Brand Assets Checklist**: `../../.kiro/specs/web-installation-wizard/BRAND_ASSETS_CHECKLIST.md`
- **Design Specification**: `../../.kiro/specs/web-installation-wizard/design.md`
- **Requirements**: `../../.kiro/specs/web-installation-wizard/requirements.md`
- **Implementation Tasks**: `../../.kiro/specs/web-installation-wizard/tasks.md`

## 🔗 Resources

- **Kaspa Media Kit**: https://kaspa.org/media-kit/
- **Kaspa Website**: https://kaspa.org/
- **GitHub**: https://github.com/kaspanet
- **Discord**: https://discord.com/invite/ssB46MXzRU

## 📝 Notes

### Logo Placeholder
If logos are not yet downloaded, the wizard will display a placeholder with instructions to download from the media kit.

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast ratios

---

**This is the initial design layout. Full backend implementation and additional features will be added in subsequent phases.**
