# Wizard Template API Debug Summary

## Issue Description
The wizard's template selection step (Step 4) is experiencing 500 Internal Server Errors when calling the template API endpoints:
- `GET /api/profiles/templates/all`
- `POST /api/profiles/templates/recommendations`

## Root Cause Analysis

### Error Details
```
Converting circular structure to JSON
--> starting at object with constructor 'EnhancedProfileManager'
|     property 'templates' -> object with constructor 'ProfileTemplates'
--- property 'profileManager' closes the circle
```

### Investigation Results

1. **Circular Reference Issue**: The `EnhancedProfileManager` creates a circular reference with `ProfileTemplates`
2. **Import Path Confusion**: Multiple import paths exist for ProfileManager:
   - `../../utils/profile-manager` (compatibility layer)
   - `../../utils/profile/ProfileManager` (direct class)
   - `../../utils/profile/index` (enhanced version)

3. **Isolated Testing Success**: ProfileManager works perfectly in isolation:
   - Basic ProfileManager: ✅ Works
   - With DependencyValidator: ✅ Works  
   - JSON serialization: ✅ Works
   - Template methods: ✅ All present

4. **Server Runtime Issue**: The running server still shows "EnhancedProfileManager" in errors, indicating it's using the enhanced version despite fixes

## Attempted Fixes

### Fix 1: Direct ProfileManager Implementation
- Added all template methods directly to ProfileManager class
- Avoided ProfileTemplates module to prevent circular references
- **Result**: Still circular reference in server

### Fix 2: Import Path Correction
- Changed profiles/index.js to use `../../utils/profile-manager`
- Updated compatibility layer to export basic ProfileManager
- **Result**: Still circular reference in server

### Fix 3: Multiple Rebuilds
- Rebuilt release package 3 times with fixes
- Verified fixes are present in built files
- **Result**: Server still uses EnhancedProfileManager somehow

## Current Status

### What Works
- ✅ ProfileManager class has all template methods
- ✅ 6 templates are properly defined
- ✅ JSON serialization works in isolation
- ✅ Import paths are correct in built files
- ✅ Compatibility layer exports basic ProfileManager

### What Doesn't Work
- ❌ Server runtime still uses EnhancedProfileManager
- ❌ Template API endpoints return 500 errors
- ❌ Frontend falls back to limited templates

## Recommended Solution

### Option 1: Simple Template Endpoint (Recommended)
Create a dedicated, simple template endpoint that bypasses the ProfileManager entirely:

```javascript
// New file: src/api/simple-templates.js
const templates = {
  'beginner-setup': { /* template data */ },
  'full-node': { /* template data */ },
  // ... other templates
};

router.get('/all', (req, res) => {
  res.json({ templates: Object.values(templates) });
});
```

### Option 2: Server Restart Investigation
- Check if server is using cached modules
- Verify no other processes are running
- Check for Node.js module caching issues

### Option 3: Minimal ProfileManager
Create a completely new, minimal ProfileManager class specifically for templates:

```javascript
class SimpleProfileManager {
  constructor() {
    this.templates = { /* template definitions */ };
  }
  
  getAllTemplates() {
    return this.templates;
  }
  
  // Other simple methods without circular references
}
```

## Files Modified

### Source Files
- `services/wizard/backend/src/utils/profile/ProfileManager.js` - Added template methods
- `services/wizard/backend/src/utils/profile-manager.js` - Export basic ProfileManager
- `services/wizard/backend/src/api/profiles/index.js` - Fixed import path
- `services/wizard/frontend/public/scripts/modules/template-selection.js` - Fixed API endpoint

### Built Files (Verified Present)
- All source changes are present in `kaspa-aio-v0.10.0-internal-test/`
- Import paths are correct
- Template methods are present
- Compatibility layer is correct

## Next Steps

1. **Immediate**: Implement Option 1 (Simple Template Endpoint) to unblock testing
2. **Investigation**: Determine why server runtime differs from built files
3. **Long-term**: Resolve circular reference architecture issue

## Testing Commands

```bash
# Test ProfileManager in isolation
node debug-profile-manager.js

# Test with DependencyValidator
node debug-dependency-validator.js

# Test API route logic
node debug-api-route.js

# Test live server
curl -s http://localhost:3000/api/profiles/templates/all
```

## Impact

- **Blocks**: Template selection testing in Step 4
- **Workaround**: Frontend falls back to 2 basic templates
- **User Experience**: Limited template options, no recommendations
- **Testing**: Cannot fully test template functionality

---

*Created: December 27, 2025*
*Status: Under Investigation*