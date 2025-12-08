# Task 6.2: Review Page Profile-Specific Configuration Display

## Overview

Fixed the Review page to display profile-specific configuration fields instead of always showing hardcoded "Network Configuration" fields (External IP, Public Node) regardless of the selected profile.

## Problem

The Review page (Step 6) was showing hardcoded "Network Configuration" section with External IP and Public Node fields for ALL profiles, even when those fields don't apply:

- **Kaspa User Applications profile**: Should show Indexer Endpoint URLs, not Network Configuration
- **Core/Archive Node profiles**: Should show Network Configuration (correct)
- **Indexer Services profile**: Should show Database Configuration and Network Configuration
- **Mining profile**: Should show Network Configuration

The `displayNetworkConfiguration()` function was always called and always populated the same two fields, regardless of which profile was selected.

## Solution

### 1. Created Dynamic Configuration Display

Replaced the hardcoded `displayNetworkConfiguration()` call with a new `displayConfiguration()` function that:

1. **Determines which fields to show** based on selected profiles
2. **Shows Network Configuration** for profiles that need it (core, archive-node, indexer-services, mining)
3. **Shows Indexer Endpoints** for kaspa-user-applications profile
4. **Hides the section** if not applicable

### 2. Profile-Specific Logic

```javascript
function displayConfiguration(selectedProfiles, configuration) {
    // Determine which configuration fields to show
    const hasNetworkConfig = selectedProfiles.some(profileId => 
        ['core', 'archive-node', 'indexer-services', 'mining'].includes(profileId)
    );
    
    const hasIndexerEndpoints = selectedProfiles.includes('kaspa-user-applications');
    
    if (hasNetworkConfig) {
        // Show External IP and Public Node
        displayNetworkConfiguration(configuration);
    } else if (hasIndexerEndpoints) {
        // Replace with Indexer Endpoints
        // - Kasia Indexer URL
        // - K-Social Indexer URL
        // - Kaspa Node WebSocket URL
    } else {
        // Hide section entirely
    }
}
```

### 3. Dynamic Section Title

The section title changes based on the profile:
- **Network Configuration** for core, archive-node, indexer-services, mining
- **Indexer Endpoints** for kaspa-user-applications

### 4. Updated Edit Button Logic

The "Edit Configuration" button now works for both "Network Configuration" and "Indexer Endpoints" sections.

## Changes Made

### File: `services/wizard/frontend/public/scripts/modules/review.js`

1. **Replaced function call**:
   - Before: `displayNetworkConfiguration(configuration)`
   - After: `displayConfiguration(selectedProfiles, configuration)`

2. **Added new function**: `displayConfiguration()`
   - Determines which fields to show based on selected profiles
   - Dynamically updates section title and content
   - Shows/hides section as needed

3. **Kept existing function**: `displayNetworkConfiguration()`
   - Now only called for profiles that actually have network configuration
   - Unchanged implementation

4. **Updated**: `addEditButtons()`
   - Now handles both "Network Configuration" and "Indexer Endpoints" titles

## Profile-Specific Display

### Core Profile
**Shows**: Network Configuration
- External IP: Auto-detect (or user-specified)
- Public Node: Enabled/Disabled

### Archive Node Profile
**Shows**: Network Configuration
- External IP: Auto-detect (or user-specified)
- Public Node: Enabled/Disabled

### Kaspa User Applications Profile
**Shows**: Indexer Endpoints
- Kasia Indexer URL: `https://api.kasia.io/`
- K-Social Indexer URL: `https://indexer.kaspatalk.net/`
- Kaspa Node WebSocket URL: `wss://api.kasia.io/ws`

### Indexer Services Profile
**Shows**: Network Configuration
- External IP: Auto-detect (or user-specified)
- Public Node: Enabled/Disabled
- (Future: Could also show Database Configuration)

### Mining Profile
**Shows**: Network Configuration
- External IP: Auto-detect (or user-specified)
- Public Node: Enabled/Disabled

## Testing

### Manual Testing Steps

1. **Test Core Profile**:
   ```bash
   ./start-test.sh
   ```
   - Select Core Profile
   - Proceed to Review page
   - Verify "Network Configuration" section shows
   - Verify External IP and Public Node fields are present

2. **Test Kaspa User Applications Profile**:
   - Select Kaspa User Applications Profile
   - Proceed to Review page
   - Verify section title is "Indexer Endpoints"
   - Verify three indexer URL fields are shown
   - Verify External IP and Public Node fields are NOT shown

3. **Test Multiple Profiles**:
   - Select both Core and Kaspa User Applications
   - Verify appropriate configuration is shown

### Automated Test

Created `test-review-profile-specific.js` to verify:
- Core Profile shows Network Configuration
- Kaspa User Applications shows Indexer Endpoints
- Network Configuration fields are hidden for Kaspa User Applications

Run test:
```bash
cd services/wizard/frontend
node test-review-profile-specific.js
```

## Impact

### User Experience
- Users now see relevant configuration on the Review page
- No confusion about irrelevant fields (e.g., "Public Node" for user applications)
- Clear understanding of what will be configured

### Consistency
- Review page now matches Configuration page
- Same fields shown in both places
- Accurate representation of what will be installed

### Maintainability
- Easy to add new profile-specific configurations
- Clear separation of concerns
- Extensible for future profiles

## Related Files

- `services/wizard/frontend/public/scripts/modules/review.js` - Updated
- `services/wizard/frontend/public/index.html` - HTML structure (unchanged)
- `services/wizard/backend/src/config/configuration-fields.js` - Field definitions (reference)

## Related Documentation

- `TASK_6.2_KASPA_USER_APPLICATIONS_TESTING_ALIGNMENT.md` - TESTING.md updates
- `TASK_6.2_KASPA_USER_APPLICATIONS_CONFIG_FIX.md` - Configuration page fixes
- `docs/wizard-configuration-guide.md` - Configuration documentation

## Future Enhancements

1. **Database Configuration Section**: Add for indexer-services profile
2. **Mining Configuration Section**: Add for mining profile
3. **Advanced Options Display**: Show custom environment variables if set
4. **Validation Display**: Show validation status for each field
5. **Diff Display**: Show changes from defaults

## Verification Checklist

- [x] Review page shows correct fields for Core Profile
- [x] Review page shows correct fields for Kaspa User Applications Profile
- [x] Section title changes dynamically
- [x] Edit button works for both section types
- [x] Network Configuration hidden when not applicable
- [x] Indexer Endpoints shown for kaspa-user-applications
- [x] No JavaScript errors in console
- [x] Test file created and documented
