# Profile Selection UI - Quick Reference

## Overview
Updated profile selection interface with new architecture, dependency validation, and resource visualization.

## Profile Names (Updated)

| Old Name | New Name | Description |
|----------|----------|-------------|
| Core Node | **Core Profile** | Kaspa node with optional wallet |
| Production Apps | **Kaspa User Applications** | User-facing apps (Kasia, K-Social, Explorer) |
| Explorer | **Indexer Services** | Local indexers with shared TimescaleDB |
| Archive Node | **Archive Node Profile** | Non-pruning node for complete history |
| Mining | **Mining Profile** | Mining stratum for local node |

## New UI Components

### 1. Dependency Warning Banner
```html
<div id="dependency-warning" class="warning-banner">
```
- Shows when prerequisites are not met
- Example: "Mining requires Core or Archive Node"

### 2. Resource Warning Banner
```html
<div id="resource-warning" class="warning-banner">
```
- Shows when resources are insufficient
- Displays combined requirements vs available

### 3. Combined Resources Card
```html
<div id="combined-resources" class="combined-resources-card">
```
- Total CPU, RAM, Disk requirements
- Min and recommended values
- Updates dynamically

### 4. Startup Order Visualization
```html
<div id="startup-order" class="startup-order-card">
```
- Phase 1: Kaspa Node (order 1)
- Phase 2: Indexer Services (order 2)
- Phase 3: Applications (order 3)

## Profile Card Features

### Startup Order Badge
```html
<div class="profile-startup-order">
  <span class="startup-badge">Startup Order: 1</span>
</div>
```

### Profile Notes
```html
<div class="profile-note">Info note</div>
<div class="profile-note warning">Warning note</div>
<div class="profile-note prerequisite">Prerequisite note</div>
```

## JavaScript API

### Initialize Profile Selection
```javascript
import { initializeProfileSelection } from './modules/configure.js';
await initializeProfileSelection();
```

### Get Selected Profiles
```javascript
import { getSelectedProfiles } from './modules/configure.js';
const profiles = getSelectedProfiles();
```

### Update UI
```javascript
// Called automatically when selection changes
await updateProfileSelectionUI();
```

## Backend API Endpoints

### Validate Selection
```javascript
POST /api/profiles/validate-selection
Body: { profiles: ['core', 'kaspa-user-applications'] }

Response: {
  valid: true,
  errors: [],
  warnings: [],
  resources: {
    minCpu: 4,
    minMemory: 8,
    minDisk: 150,
    recommendedCpu: 8,
    recommendedMemory: 16,
    recommendedDisk: 300
  },
  startupOrder: {
    1: ['kaspa-node'],
    3: ['kasia-app', 'k-social-app', 'kaspa-explorer']
  }
}
```

## CSS Classes

### Profile Cards
```css
.profile-card              /* Base card */
.profile-card.selected     /* Selected state */
.profile-card.disabled     /* Disabled state */
```

### Badges
```css
.profile-badge.essential   /* Green - Essential */
.profile-badge.popular     /* Blue - Popular */
.profile-badge.advanced    /* Purple - Advanced */
.profile-badge.storage     /* Orange - Storage */
.profile-badge.mining      /* Red - Mining */
```

### Warning Banners
```css
.warning-banner            /* Base warning */
.warning-icon              /* Warning icon */
.warning-content           /* Content area */
.warning-title             /* Title */
.warning-message           /* Message */
```

### Resources
```css
.combined-resources-card   /* Resource card */
.combined-resource-item    /* Individual resource */
.resource-icon             /* Icon */
.resource-label            /* Label */
.resource-value            /* Value */
```

### Startup Order
```css
.startup-order-card        /* Container */
.startup-order-timeline    /* Timeline */
.startup-phase             /* Phase container */
.phase-number              /* Phase number */
.phase-title               /* Phase title */
.phase-services            /* Services list */
.startup-arrow             /* Arrow between phases */
```

## Profile Dependencies

### Core Profile
- **Prerequisites**: None
- **Conflicts**: Archive Node
- **Startup Order**: 1

### Kaspa User Applications
- **Prerequisites**: None (can use public indexers)
- **Optional**: Indexer Services (for local indexers)
- **Startup Order**: 3

### Indexer Services
- **Prerequisites**: None (can use public Kaspa network)
- **Optional**: Core Profile (for local node)
- **Startup Order**: 2

### Archive Node Profile
- **Prerequisites**: None
- **Conflicts**: Core Profile
- **Startup Order**: 1

### Mining Profile
- **Prerequisites**: Core OR Archive Node (required)
- **Conflicts**: None
- **Startup Order**: 3

## Testing

### Test Page
```bash
# Open in browser
http://localhost:3000/test-profile-selection-ui.html
```

### Test Scenarios
1. Select Core Profile → Should show phase 1
2. Select Mining without Core → Should show dependency warning
3. Select multiple profiles → Should show combined resources
4. Toggle Developer Mode → Should show features list

## Common Issues

### Warning Not Showing
- Check if `dependency-warning` element exists
- Verify API response includes errors array
- Check console for JavaScript errors

### Resources Not Updating
- Verify API endpoint returns resources object
- Check if `combined-resources` element exists
- Ensure `updateProfileSelectionUI()` is called

### Startup Order Not Displaying
- Verify API returns startupOrder object
- Check phase elements exist (phase-1, phase-2, phase-3)
- Ensure services array is not empty

## Quick Commands

### Start Wizard Backend
```bash
cd services/wizard/backend
node src/server.js
```

### Test Profile API
```bash
curl http://localhost:3000/api/profiles
curl -X POST http://localhost:3000/api/profiles/validate-selection \
  -H "Content-Type: application/json" \
  -d '{"profiles":["core","mining"]}'
```

### Check Diagnostics
```bash
# Open browser console
# Check for errors in Network tab
# Verify API responses
```

## Files Reference

### Frontend
- `services/wizard/frontend/public/index.html` - Profile selection HTML
- `services/wizard/frontend/public/styles/wizard.css` - Styles
- `services/wizard/frontend/public/scripts/modules/configure.js` - Logic
- `services/wizard/frontend/test-profile-selection-ui.html` - Test page

### Backend
- `services/wizard/backend/src/api/profiles.js` - Profile API
- `services/wizard/backend/src/utils/profile-manager.js` - Profile definitions
- `services/wizard/backend/src/utils/dependency-validator.js` - Validation logic

## Related Documentation
- [Profile Architecture Update](../implementation-summaries/wizard/PROFILE_ARCHITECTURE_UPDATE_IMPLEMENTATION.md)
- [Dependency Validator](./DEPENDENCY_VALIDATOR_QUICK_REFERENCE.md)
- [Resource Calculation](./RESOURCE_CALCULATION_QUICK_REFERENCE.md)
- [Fallback Strategy](./FALLBACK_STRATEGY_QUICK_REFERENCE.md)
