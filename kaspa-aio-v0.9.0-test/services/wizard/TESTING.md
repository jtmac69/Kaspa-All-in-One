# Wizard Frontend Testing Guide

## Quick Start

### Run Automated Tests

```bash
# Start development server (in one terminal)
cd services/wizard/frontend/public
python3 -m http.server 3000

# Run automated tests (in another terminal)
./test-wizard-frontend.sh
```

### Manual Visual Verification

1. **Start the development server**:
   ```bash
   cd services/wizard/frontend/public
   python3 -m http.server 3000
   ```

2. **Open browser**: Navigate to http://localhost:3000

3. **Verify branding**:
   - Check Kaspa logo in header and footer
   - Verify brand colors (#70C7BA teal/green)
   - Confirm Montserrat font for headings
   - Confirm Open Sans font for body text

4. **Test dark mode**:
   - macOS: System Preferences → Appearance → Dark
   - Verify logos switch to white versions
   - Check all text remains readable

5. **Test navigation**:
   - Click "Get Started" button
   - Navigate through steps using Continue/Back buttons
   - Verify progress indicator updates

6. **Test responsive design**:
   - Resize browser window to 768px, 1024px, 1440px
   - Verify layout adapts appropriately
   - Check mobile view (single column)

7. **Check browser console**:
   - Open Developer Tools (F12)
   - Verify no errors in console
   - Check Network tab for 404 errors

## Test Script Details

The `test-wizard-frontend.sh` script performs 31 automated checks:

### Server Checks (1 test)
- Server accessibility at http://localhost:3000

### HTML Structure (8 tests)
- Wizard container presence
- Progress indicator
- All 7 wizard steps
- Step labels (Welcome, System Check, Profiles, Configure, Review, Install, Complete)

### Kaspa Branding (5 tests)
- Logo in header
- Logo in footer
- Montserrat font
- Open Sans font
- Favicon

### CSS and Styling (4 tests)
- CSS file accessibility
- Kaspa brand colors
- Dark mode support
- Responsive design

### JavaScript (3 tests)
- JS file accessibility
- Navigation functions
- State management

### Brand Assets (4 tests)
- Light logo SVG
- Dark logo SVG
- Light icon SVG
- Dark icon SVG

### Profile Cards (4 tests)
- Profile grid
- Profile cards
- Service tags
- Resource requirements

## Expected Results

All 31 tests should pass:
```
Total Tests: 31
Passed: 31
Failed: 0

✓ All tests passed!
```

## Troubleshooting

### Server not accessible
**Problem**: Test fails with "Server is not accessible"

**Solution**:
```bash
cd services/wizard/frontend/public
python3 -m http.server 3000
```

### Assets not loading (404 errors)
**Problem**: Logos or icons return 404

**Solution**: Verify assets exist:
```bash
ls -la services/wizard/frontend/public/assets/brand/logos/svg/
ls -la services/wizard/frontend/public/assets/brand/icons/svg/
```

Expected files:
- `kaspa-logo-light.svg`
- `kaspa-logo-dark.svg`
- `kaspa-icon-light.svg`
- `kaspa-icon-dark.svg`

### Dark mode not working
**Problem**: Logos don't switch in dark mode

**Solution**: Check browser supports `prefers-color-scheme`:
- Modern browsers (Chrome 76+, Firefox 67+, Safari 12.1+)
- Test by toggling system dark mode

### Responsive design issues
**Problem**: Layout doesn't adapt to screen size

**Solution**: 
- Clear browser cache
- Check CSS media queries loaded
- Verify viewport meta tag in HTML

## Files

### Test Files
- `test-wizard-frontend.sh` - Automated test script
- `../../docs/implementation-summaries/wizard/WIZARD_FRONTEND_VERIFICATION.md` - Detailed verification report

### Source Files
- `services/wizard/frontend/public/index.html` - HTML structure
- `services/wizard/frontend/public/styles/wizard.css` - Styling
- `services/wizard/frontend/public/scripts/wizard.js` - JavaScript functionality

### Asset Files
- `services/wizard/frontend/public/assets/brand/logos/svg/` - Logo SVGs
- `services/wizard/frontend/public/assets/brand/icons/svg/` - Icon SVGs

## Next Steps

After frontend verification is complete:

1. **Backend API Development** (Task 6.1)
   - System requirements checker API
   - Profile management API
   - Configuration management
   - Installation engine
   - WebSocket progress streaming

2. **Frontend Completion** (Task 6.2)
   - Dynamic configuration forms (Step 4)
   - Review summary (Step 5)
   - Real-time installation progress (Step 6)
   - Validation results (Step 7)

3. **System Integration** (Task 6.3)
   - Add wizard to docker-compose.yml
   - Configure auto-start
   - Implement security
   - Create test suite

## References

- **Task**: `.kiro/specs/kaspa-all-in-one-project/tasks.md` - Task 6.2.1
- **Requirements**: `.kiro/specs/web-installation-wizard/requirements.md`
- **Design**: `.kiro/specs/web-installation-wizard/design.md`
