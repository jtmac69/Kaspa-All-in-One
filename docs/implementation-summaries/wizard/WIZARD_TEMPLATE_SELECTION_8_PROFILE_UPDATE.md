# Wizard Template Selection 8-Profile Update

**Date**: January 27, 2026  
**Phase**: Phase 2, Step 2  
**File Modified**: `services/wizard/frontend/public/scripts/modules/template-selection.js`

## Overview

Updated the frontend template selection module to support the new 8-profile structure and 12-template system. The module now handles both new and legacy profile IDs with bidirectional mapping support.

## Changes Implemented

### 1. Profile and Template Migration Constants

Added comprehensive mapping constants at the top of the file:

- **LEGACY_TO_NEW_PROFILE**: Maps old profile IDs to new ones
  - `core` → `kaspa-node`
  - `kaspa-user-applications` → `['kasia-app', 'k-social-app']`
  - `indexer-services` → `['kasia-indexer', 'k-indexer-bundle', 'kaspa-explorer-bundle']`
  - `archive-node` → `kaspa-archive-node`
  - `mining` → `kaspa-stratum`

- **NEW_PROFILE_IDS**: Array of all 8 new profile IDs
- **LEGACY_PROFILE_IDS**: Array of all 5 legacy profile IDs
- **ALL_VALID_PROFILE_IDS**: Combined array for validation
- **LEGACY_TO_NEW_TEMPLATE**: Template ID migration mapping
- **PROFILE_DISPLAY_NAMES**: User-friendly names for all profiles (new + legacy)

### 2. Helper Functions

Added 6 helper functions for profile checking:

1. **isValidProfileId(profileId)**: Validates profile IDs (new or legacy)
2. **hasProfile(profiles, checkId)**: Bidirectional profile matching
3. **hasNodeProfile(profiles)**: Checks for any node profile
4. **hasAppProfile(profiles)**: Checks for any app profile
5. **hasIndexerProfile(profiles)**: Checks for any indexer profile
6. **hasMiningProfile(profiles)**: Checks for mining profile

### 3. Updated getFallbackTemplates()

Replaced fallback templates with new 9-template structure:

1. **quick-start**: Kasia + K-Social apps (2GB RAM, beginner)
2. **kaspa-node**: Single Kaspa node (4GB RAM, beginner)
3. **kasia-suite**: Kasia app + indexer (8GB RAM, intermediate)
4. **k-social-suite**: K-Social app + indexer (8GB RAM, intermediate)
5. **kaspa-explorer**: Explorer bundle (8GB RAM, intermediate)
6. **kaspa-sovereignty**: All services (32GB RAM, advanced)
7. **solo-miner**: Node + stratum (6GB RAM, advanced)
8. **archive-historian**: Archive node (16GB RAM, advanced)
9. **custom-setup**: Dynamic template (0GB RAM, advanced)

All templates use **new profile IDs** exclusively.

### 4. Updated getProfileDisplayName()

Now uses the `PROFILE_DISPLAY_NAMES` constant for consistent naming:

- New IDs: "Kaspa Node", "Kasia", "K-Social", "Explorer", etc.
- Legacy IDs: "Core", "Apps", "Indexers", "Archive", "Mining"

### 5. Updated getRecommendationReasons()

Enhanced to use helper functions for profile checking:

- Checks for app profiles using `hasAppProfile()`
- Checks for node profiles using `hasNodeProfile()`
- Checks for indexer profiles using `hasIndexerProfile()`
- Checks for mining profiles using `hasMiningProfile()`
- Checks for archive node using `hasProfile()`

Works with both new and legacy profile IDs.

### 6. Updated Profile Validation

In `applyTemplate()` method:

```javascript
// Old validation
const validProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
const invalidProfiles = template.profiles.filter(p => !validProfiles.includes(p));

// New validation
const invalidProfiles = template.profiles.filter(p => !isValidProfileId(p));
```

Now accepts all valid profile IDs (new + legacy).

### 7. Added getProfileTagClass()

New method for CSS class mapping:

- Maps profile IDs to CSS classes for visual styling
- Supports both new and legacy profile IDs
- Returns `profile-tag-default` for unknown profiles

## Backward Compatibility

The implementation maintains full backward compatibility:

- **Legacy profile IDs** are still recognized and validated
- **Bidirectional mapping** allows templates with old IDs to work
- **Helper functions** check both new and legacy IDs
- **Display names** provided for both old and new IDs

## Template Structure

Each fallback template includes:

- `id`: Template identifier (new naming)
- `name`: User-friendly name
- `category`: beginner/intermediate/advanced
- `description`: Short description
- `icon`: Emoji icon
- `profiles`: Array of profile IDs (new IDs)
- `resources`: { minMemory, minCpu, minDisk }
- `estimatedSetupTime`: Setup duration
- `syncTime`: Blockchain sync duration
- `features`: Array of feature descriptions
- `benefits`: Array of benefit descriptions
- `longDescription`: Detailed description
- `useCase`: personal/production/mining/development
- `displayOrder`: Sort order (1-12)
- `isDynamic`: true for custom-setup

## Testing Checklist

- [x] Constants defined correctly
- [x] Helper functions implemented
- [x] getFallbackTemplates() returns 9 templates with new IDs
- [x] getProfileDisplayName() handles all profile IDs
- [x] getRecommendationReasons() uses helper functions
- [x] Profile validation accepts new and legacy IDs
- [x] getProfileTagClass() maps all profile IDs

## Next Steps

**Phase 2, Step 3**: Update profile-selection.js for new profile structure

## Notes

- Fallback templates use **new profile IDs only** (API should match)
- Legacy template IDs in URL params handled by backend aliasing
- Profile tag display names are user-friendly (e.g., "Kasia" not "kasia-app")
- Helper functions ensure consistent profile checking across codebase
- The `isDynamic: true` flag on custom-setup enables special handling
