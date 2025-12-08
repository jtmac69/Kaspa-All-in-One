# Task 6.2 - Review Page Port Display Fix

## Date
December 8, 2025

## Issue
In the TESTING.md Kaspa User Applications test scenario, Step 6 (Review and Confirm) states that the review page should show:
- Kasia app (port 3001)
- K-Social app (port 3003)
- Kaspa Explorer (port 3004)

However, the actual review page only showed the service names without port numbers.

## Root Cause
The `PROFILE_DEFINITIONS` in `services/wizard/frontend/public/scripts/modules/review.js` defined services as a simple string array:

```javascript
services: ['kasia-app', 'k-social-app', 'kaspa-explorer']
```

This format didn't include port information, so the display logic couldn't show ports.

## Solution

### 1. Updated Profile Definition
Changed the `kaspa-user-applications` profile to use an object array format that includes port information:

```javascript
'kaspa-user-applications': {
    name: 'Kaspa User Applications',
    description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
    services: [
        { name: 'Kasia app', port: 3001 },
        { name: 'K-Social app', port: 3003 },
        { name: 'Kaspa Explorer', port: 3004 }
    ],
    resources: {
        cpu: '2 cores',
        ram: '4 GB',
        disk: '50 GB'
    }
}
```

### 2. Updated Display Logic
Modified the service display function to handle both formats (for backward compatibility):

```javascript
// Handle both old format (string array) and new format (object array with ports)
let servicesText = 'Services: ';
if (profile.services && profile.services.length > 0) {
    if (typeof profile.services[0] === 'string') {
        // Old format: array of strings
        servicesText += profile.services.join(', ');
    } else {
        // New format: array of objects with name and port
        servicesText += profile.services
            .map(service => `${service.name} (port ${service.port})`)
            .join(', ');
    }
}
```

### 3. Updated Service Count Logic
Updated the service counting logic to handle both formats:

```javascript
profile.services.forEach(service => {
    // Handle both string and object formats
    const serviceName = typeof service === 'string' ? service : service.name;
    allServices.add(serviceName);
});
```

## Benefits

1. **Accurate Information**: Users now see the exact ports where services will be accessible
2. **Backward Compatible**: Other profiles using string arrays still work correctly
3. **Consistent with Documentation**: Matches the expectations set in TESTING.md
4. **Better UX**: Users know exactly where to access each application after installation

## Expected Display

After this fix, the review page for Kaspa User Applications profile will show:

```
Services: Kasia app (port 3001), K-Social app (port 3003), Kaspa Explorer (port 3004)
```

This matches the documentation in TESTING.md Step 6.

## Files Modified

- ✅ `services/wizard/frontend/public/scripts/modules/review.js`
  - Updated `kaspa-user-applications` profile definition with port info
  - Updated service display logic to show ports
  - Updated service counting logic for compatibility

## Testing

To verify this fix:

1. Rebuild test release package
2. Extract and run `./start-test.sh`
3. Select "Kaspa User Applications" profile
4. Navigate to the Review step (Step 6)
5. Verify the services display shows:
   - ✅ Kasia app (port 3001)
   - ✅ K-Social app (port 3003)
   - ✅ Kaspa Explorer (port 3004)

## Related Issues

- TASK_6.2_KASPA_EXPLORER_BUILD_FIX_SUMMARY.md - Fixed kaspa-explorer build
- TESTING.md - Documentation that specified the expected behavior

## Notes

Other profiles (core, indexer-services, archive-node, mining) continue to use the simple string array format since they don't need to display port information in the same way. The kaspa-user-applications profile is unique in that it provides user-facing web applications where knowing the ports is critical for accessing the services.

If other profiles need port display in the future, they can be updated to use the same object array format.
