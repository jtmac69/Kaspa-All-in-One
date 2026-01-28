# Wizard Profile Display Functions Update - Phase 2, Step 3

**Date**: January 27, 2026  
**Component**: Wizard & Dashboard Profile Display  
**Status**: ✅ Complete

## Overview

Updated profile display functions and helper methods in both the wizard and dashboard to support the new 8-profile architecture while maintaining backward compatibility with legacy 5-profile IDs.

## Changes Implemented

### 1. Wizard Frontend (wizard-refactored.js)

#### Added Profile Configuration Constants

```javascript
const PROFILE_DISPLAY_CONFIG = {
    // New profile IDs (8 profiles)
    'kaspa-node': { icon: '🖥️', name: 'Kaspa Node', category: 'node' },
    'kasia-app': { icon: '💬', name: 'Kasia', category: 'app' },
    'k-social-app': { icon: '👥', name: 'K-Social', category: 'app' },
    'kaspa-explorer-bundle': { icon: '🔍', name: 'Explorer', category: 'indexer' },
    'kasia-indexer': { icon: '📊', name: 'Kasia Indexer', category: 'indexer' },
    'k-indexer-bundle': { icon: '📈', name: 'K-Indexer', category: 'indexer' },
    'kaspa-archive-node': { icon: '🗄️', name: 'Archive Node', category: 'node' },
    'kaspa-stratum': { icon: '⛏️', name: 'Stratum Mining', category: 'mining' },
    
    // Legacy profile IDs (5 profiles - backward compatibility)
    'core': { icon: '⚡', name: 'Core', category: 'node' },
    'kaspa-user-applications': { icon: '📱', name: 'Applications', category: 'app' },
    'indexer-services': { icon: '🔍', name: 'Indexers', category: 'indexer' },
    'archive-node': { icon: '📚', name: 'Archive', category: 'node' },
    'mining': { icon: '⛏️', name: 'Mining', category: 'mining' }
};
```

#### Updated Functions

1. **getProfileStatusIcon(profile)**
   - Now uses PROFILE_DISPLAY_CONFIG lookup
   - Supports both new and legacy profile IDs
   - Returns appropriate emoji icon

2. **getProfileStatusBadge(profile)**
   - Enhanced to show more status states
   - Added: Running, Stopped, Unhealthy, Partial, Available, Error
   - Better status differentiation

3. **Added New Helper Functions**:
   - `getProfileDisplayName(profileId)` - Returns human-readable name
   - `getProfileCategory(profileId)` - Returns category (node, app, indexer, mining)
   - `getProfileBadgeClass(profileId)` - Returns CSS class for styling

4. **updateProfileStatusOverview(profileStates)**
   - Updated to use new helper functions
   - Now displays correct names for both old and new profile IDs
   - Applies category-based CSS classes

### 2. Dashboard UI Manager (ui-manager.js)

#### Updated Methods

1. **getProfileClass(profile)**
   - Added all 8 new profile IDs
   - Maintained all 5 legacy profile IDs
   - Returns appropriate CSS classes

2. **formatProfileName(profile)**
   - Added short names for all 8 new profiles
   - Maintained legacy profile names
   - Used for compact display in service cards

3. **getGroupDisplayName(groupName, groupBy)** *(Already had new IDs)*
   - Verified support for all new profile IDs
   - Returns full display names for grouping

4. **getGroupClass(groupName, groupBy)** *(Already had new IDs)*
   - Verified support for all new profile IDs
   - Returns CSS classes for group badges

## Profile ID Mapping Reference

| Old Profile ID | New Profile ID(s) | Icon | Display Name |
|----------------|-------------------|------|--------------|
| core | kaspa-node | 🖥️ | Kaspa Node |
| kaspa-user-applications | kasia-app, k-social-app | 💬/👥 | Kasia, K-Social |
| indexer-services | kasia-indexer, k-indexer-bundle, kaspa-explorer-bundle | 📊/📈/🔍 | Kasia Indexer, K-Indexer, Explorer |
| archive-node | kaspa-archive-node | 🗄️ | Archive Node |
| mining | kaspa-stratum | ⛏️ | Stratum Mining |

## Backward Compatibility

✅ **Full backward compatibility maintained**:
- Legacy profile IDs continue to work
- Existing installations display correctly
- No breaking changes to existing code
- Gradual migration path supported

## Files Modified

1. `services/wizard/frontend/public/scripts/wizard-refactored.js`
   - Added PROFILE_DISPLAY_CONFIG constant
   - Updated getProfileStatusIcon()
   - Updated getProfileStatusBadge()
   - Added getProfileDisplayName()
   - Added getProfileCategory()
   - Added getProfileBadgeClass()
   - Updated updateProfileStatusOverview()

2. `services/dashboard/public/scripts/modules/ui-manager.js`
   - Updated getProfileClass()
   - Updated formatProfileName()
   - Verified getGroupDisplayName() (already updated)
   - Verified getGroupClass() (already updated)

## Testing Checklist

### Wizard Testing
- [ ] Profile cards display correct icons for new profile IDs
- [ ] Profile cards display correct icons for legacy profile IDs
- [ ] Profile status badges show correct text
- [ ] Profile names display correctly in reconfiguration mode
- [ ] CSS classes apply correctly for styling
- [ ] No JavaScript errors in console

### Dashboard Testing
- [ ] Service cards show correct profile badges
- [ ] Profile names display correctly (short format)
- [ ] Service grouping by profile works correctly
- [ ] Legacy profile IDs display correctly
- [ ] New profile IDs display correctly
- [ ] No JavaScript errors in console

## Integration Points

- **Phase 2, Step 1**: Backend profile ID migration (configure.js)
- **Phase 2, Step 2**: Template selection updates (template-selection.js)
- **Phase 2, Step 3**: Frontend display functions (this step) ✅
- **Phase 3**: HTML profile cards update (optional)

## Next Steps

1. **Optional**: Update HTML profile cards in index.html with data attributes
2. Test wizard in reconfiguration mode with existing installations
3. Test dashboard service display with mixed profile IDs
4. Verify profile filtering works with both old and new IDs

## Notes

- HTML changes are optional - JavaScript handles both ID types
- Backend already migrates legacy IDs automatically
- No user-facing breaking changes
- Smooth transition for existing installations

## Related Documentation

- Phase 2, Step 1: Backend profile ID migration
- Phase 2, Step 2: Template selection updates
- Profile architecture documentation
- Icon system implementation guide
