# Wizard Template API Circular Reference Fix

## Problem Summary

The wizard's template API endpoints return 500 errors due to circular JSON serialization:
```
Converting circular structure to JSON
--> EnhancedProfileManager.templates (ProfileTemplates)
    --> ProfileTemplates.profileManager (EnhancedProfileManager)
```

## Root Cause

The `EnhancedProfileManager` class creates circular references by design:

```javascript
class EnhancedProfileManager extends ProfileManager {
  constructor() {
    super();
    this.templates = new ProfileTemplates(this);  // ← Stores reference to parent
  }
}

class ProfileTemplates {
  constructor(profileManager) {
    this.profileManager = profileManager;  // ← Stores reference back to parent
  }
}
```

When Express calls `res.json()`, it uses `JSON.stringify()` which cannot serialize circular references.

## Solution Implemented

### Dual API Approach

1. **Simple Templates API** (`/api/simple-templates/*`)
   - Standalone template definitions
   - No ProfileManager dependencies
   - No circular references
   - Used for initial installation mode

2. **ProfileManager API** (`/api/profiles/templates/*`)
   - Full ProfileManager integration
   - Used for reconfiguration mode
   - Needs circular reference fix

### Files Created/Modified

#### New Files
- `services/wizard/backend/src/api/simple-templates.js` - Standalone template API
- `docs/implementation-summaries/wizard/WIZARD_TEMPLATE_API_DEBUG_SUMMARY.md` - Debug investigation
- `docs/implementation-summaries/wizard/WIZARD_TEMPLATE_API_CIRCULAR_REFERENCE_FIX.md` - This file

#### Modified Files
- `services/wizard/backend/src/server.js` - Added simple-templates router
- `services/wizard/frontend/public/scripts/modules/template-selection.js` - Use simple-templates API
- `services/wizard/backend/src/utils/profile-manager.js` - Export basic ProfileManager
- `services/wizard/backend/src/api/profiles/index.js` - Use profile-manager import

### Why This Approach

1. **Unblocks Testing**: Simple templates API works immediately for initial installation
2. **Preserves Functionality**: ProfileManager API remains for reconfiguration mode
3. **No Breaking Changes**: Existing reconfiguration code unaffected
4. **Clear Separation**: Template data vs. profile management logic

## Proper Fix (Future)

The proper fix requires refactoring the EnhancedProfileManager architecture:

### Option 1: Remove Circular References
```javascript
class ProfileTemplates {
  constructor() {
    // Don't store profileManager reference
  }
  
  getTemplatesByCategory(category, profileManager) {
    // Pass profileManager as parameter when needed
  }
}
```

### Option 2: Use Composition Without Storage
```javascript
class EnhancedProfileManager extends ProfileManager {
  getTemplatesByCategory(category) {
    // Create ProfileTemplates instance on-demand
    const templates = new ProfileTemplates();
    return templates.getTemplatesByCategory(category, this);
  }
}
```

### Option 3: Serialize Without Circular Properties
```javascript
getAllTemplates() {
  const templates = Object.values(this.templates);
  // Return plain objects without manager references
  return templates.map(t => ({ ...t }));
}
```

## Testing

### Simple Templates API
```bash
# Test templates endpoint
curl http://localhost:3000/api/simple-templates/all

# Test recommendations
curl -X POST http://localhost:3000/api/simple-templates/recommendations \
  -H "Content-Type: application/json" \
  -d '{"systemResources":{"memory":16,"cpu":8,"disk":500},"useCase":"personal"}'
```

### Expected Results
- ✅ Returns 6 templates
- ✅ No circular reference errors
- ✅ Recommendations work
- ✅ Frontend displays all templates

## Impact Analysis

### What Works
- ✅ Initial installation template selection
- ✅ Template recommendations
- ✅ Template details and application
- ✅ All 6 templates available

### What Needs Investigation
- ⚠️ Reconfiguration mode template selection
- ⚠️ Profile addition with templates
- ⚠️ Template validation in reconfiguration

### No Impact
- ✅ Profile selection (doesn't use templates)
- ✅ Configuration step
- ✅ Installation process
- ✅ Dashboard integration

## Recommendations

1. **Short-term**: Use simple-templates API for v0.10.0 release
2. **Medium-term**: Investigate why ProfileManager still shows as Enhanced in runtime
3. **Long-term**: Refactor EnhancedProfileManager to eliminate circular references

## Related Files

- `services/wizard/backend/src/utils/profile/index.js` - EnhancedProfileManager definition
- `services/wizard/backend/src/utils/profile/ProfileTemplates.js` - Template module
- `services/wizard/backend/src/utils/profile/ProfileManager.js` - Base ProfileManager
- `services/wizard/backend/src/api/profiles/templates.js` - ProfileManager template routes

---

*Created: December 27, 2025*
*Status: Workaround Implemented*
*Priority: Medium (works for initial install, needs fix for reconfiguration)*