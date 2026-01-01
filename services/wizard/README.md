# Kaspa All-in-One Installation Wizard

A modern, web-based installation wizard for the Kaspa All-in-One project with a template-first approach that simplifies deployment through pre-configured templates and custom setup options.

## 🎯 Template-First Approach

The wizard now uses a **template-first approach** that makes setup easier and more reliable:

### 🚀 Pre-Configured Templates
- **Home Node Template**: Perfect for personal use (Node + Dashboard + Messaging)
- **Public Node Template**: Support the network (Public Node + Dashboard + Social Apps)
- **Explorer Template**: Blockchain analysis (All indexers + TimescaleDB + Analytics tools)
- **Mining Template**: Solo mining setup (Optimized Node + Stratum Bridge + Monitoring)

### ⚙️ Custom Setup Option
- **Build Custom**: Advanced users can select individual services à la carte
- **Service Grid**: Visual interface showing all available services with descriptions
- **Dependency Management**: Automatic handling of service dependencies
- **Full Control**: Complete configuration control over all settings

### 🎯 Smart Recommendations
- **Hardware Analysis**: Automatic detection of CPU, RAM, storage, and disk type
- **Template Compatibility**: Shows which templates work best on your system
- **Resource Warnings**: Alerts about potential performance issues
- **Optimization Suggestions**: Recommendations for optimal performance

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
1. **Welcome** - Introduction and template-first approach overview
2. **System Check** - Verify Docker, resources, ports, and hardware analysis
3. **Template Selection** - Choose from pre-configured templates or build custom setup
4. **Configuration** - Configure template-specific or custom service settings
5. **Review** - Review template/custom selections and configuration before installation
6. **Installation** - Real-time installation progress with template-specific phases
7. **Complete** - Success screen with template-specific next steps and service access

### Key Features
- ✅ Template-first approach with pre-configured setups
- ✅ Custom setup option for advanced users
- ✅ Smart hardware analysis and template recommendations
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Kaspa brand colors and gradients
- ✅ Smooth animations and transitions
- ✅ Progress indicator with template-aware navigation
- ✅ Auto-save progress and state management
- ✅ Accessible (WCAG 2.1 AA)
- ✅ Error recovery and fallback options

## 🛠️ Development

### Current Status
- ✅ Template-first navigation flow implemented
- ✅ HTML structure with template selection and custom setup
- ✅ CSS styling with Kaspa brand colors and template cards
- ✅ JavaScript functionality for template application and custom setup
- ✅ Backend API with template validation and application
- ✅ Smart back navigation based on selection path
- ✅ State management for template vs custom workflows
- ✅ Error handling and recovery options
- ✅ Integration with existing configuration and installation systems

### Next Steps
1. Download Kaspa brand assets from media kit
2. Enhance template validation and error handling
3. Add more pre-configured templates based on community feedback
4. Implement template marketplace for community-contributed templates
5. Add template versioning and update management
6. Enhance WebSocket progress streaming for template-specific phases
7. Add comprehensive testing for all template and custom workflows
8. Implement template analytics and optimization suggestions

## 📋 Implementation Checklist

### Frontend
- [x] HTML structure with template-first approach
- [x] CSS with Kaspa brand colors and template cards
- [x] Template selection with compatibility indicators
- [x] Custom setup with service grid interface
- [x] Smart navigation based on selection path
- [x] Welcome step with template approach overview
- [x] System check step with hardware analysis
- [x] Template selection step with recommendations
- [x] Configuration step with template-specific options
- [x] Review step with template/custom summary
- [x] Installation progress step with template phases
- [x] Completion step with template-specific guidance
- [x] Form validation and error handling
- [x] Toast notifications and user feedback
- [x] State management for template vs custom workflows

### Backend
- [x] Express.js server setup
- [x] System requirements checker API
- [x] Template management API with validation
- [x] Template application API with error handling
- [x] Configuration validation API
- [x] Installation engine with template support
- [x] WebSocket progress streaming
- [x] Service health checks
- [x] Error handling and recovery options
- [x] Integration with existing profile system

### Integration
- [x] Docker configuration
- [x] Environment variables
- [x] API client with template support
- [x] WebSocket client for real-time updates
- [x] State management for template workflows
- [x] Progress persistence across sessions
- [x] Integration with Management Dashboard
- [x] Backward compatibility with existing configurations

### Testing
- [x] Unit tests for navigation and state management
- [x] Integration tests for template and custom workflows
- [x] E2E tests for complete installation flows
- [x] Browser compatibility testing
- [x] Responsive design testing
- [x] Accessibility testing
- [x] Error handling and recovery testing
- [x] Backward compatibility validation

## 📚 Documentation

### Template-First Setup
- **Template Setup Guide**: [../../docs/guides/wizard-template-setup-guide.md](../../docs/guides/wizard-template-setup-guide.md) - Complete guide to template selection and setup
- **Template vs Custom Guide**: [../../docs/guides/template-vs-custom-guide.md](../../docs/guides/template-vs-custom-guide.md) - When to use templates vs custom setup
- **Error Recovery Guide**: [../../docs/guides/wizard-error-recovery-guide.md](../../docs/guides/wizard-error-recovery-guide.md) - Troubleshooting and recovery procedures

### Design and Architecture
- **Design Specification**: `../../.kiro/specs/wizard-template-profile-fix/design.md` - Template-first architecture and implementation
- **Requirements**: `../../.kiro/specs/wizard-template-profile-fix/requirements.md` - Template-first workflow requirements
- **Implementation Tasks**: `../../.kiro/specs/wizard-template-profile-fix/tasks.md` - Detailed implementation tasks and status

### Legacy Documentation
- **Brand Design Guide**: `../../.kiro/specs/web-installation-wizard/BRAND_DESIGN_GUIDE.md`
- **Brand Assets Checklist**: `../../.kiro/specs/web-installation-wizard/BRAND_ASSETS_CHECKLIST.md`
- **Original Design Specification**: `../../.kiro/specs/web-installation-wizard/design.md`
- **Original Requirements**: `../../.kiro/specs/web-installation-wizard/requirements.md`

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
