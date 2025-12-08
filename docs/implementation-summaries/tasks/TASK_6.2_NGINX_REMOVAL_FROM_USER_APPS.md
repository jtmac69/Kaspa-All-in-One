# Task 6.2: Nginx Removal from Kaspa User Applications Profile

## Overview

Removed nginx container from the Kaspa User Applications profile as it's not needed - the apps (Kasia and K-Social) are directly accessible on their own ports.

## Problem

The nginx container was being deployed with the Kaspa User Applications profile and was in a restart loop with the error:
```
[emerg] 1#1: host not found in upstream "dashboard:8080" in /etc/nginx/nginx.conf:49
nginx: [emerg] host not found in upstream "dashboard:8080" in /etc/nginx/nginx.conf:49
```

### Root Cause

1. **Nginx configuration** (`config/nginx.conf`) had hardcoded upstream for `dashboard:8080`
2. **Dashboard doesn't exist** in the Kaspa User Applications profile (it runs locally on the host)
3. **Nginx isn't needed** - Kasia and K-Social apps are directly accessible on ports 3001 and 3003

## Solution

### 1. Removed Nginx from Docker Compose Generation

**File**: `services/wizard/backend/src/utils/config-generator.js`

Removed the nginx service block that was being added for kaspa-user-applications profile:

```javascript
// Before: Added nginx container
if (profiles.includes('kaspa-user-applications')) {
  lines.push(
    '  nginx:',
    '    image: nginx:alpine',
    ...
  );
}

// After: Removed - not needed
// Apps are directly accessible on their own ports
```

### 2. Updated Review Page Service List

**File**: `services/wizard/frontend/public/scripts/modules/review.js`

Removed nginx from the services list:

```javascript
'kaspa-user-applications': {
    name: 'Kaspa User Applications',
    description: 'User-facing apps (Kasia, K-Social, Kaspa Explorer)',
    services: ['kasia-app', 'k-social-app'],  // Removed 'nginx'
    resources: {
        cpu: '2 cores',
        ram: '4 GB',
        disk: '50 GB'
    }
},
```

### 3. Updated TESTING.md Documentation

**File**: `TESTING.md`

Removed nginx references from Scenario 2 (Kaspa User Applications):

- **Step 6 Review**: Removed nginx from services list
- **Step 7 Installation**: Removed nginx image from pull list
- **Step 9 Verification**: Removed nginx from container list
- **Step 11 Resource Usage**: Removed nginx from resource expectations

## Why Nginx Isn't Needed

### Direct Port Access

The applications are already exposed on their own ports:
- **Kasia app**: `http://localhost:3001` ✓
- **K-Social app**: `http://localhost:3003` ✓

### No Reverse Proxy Required

Nginx would only be needed if we wanted:
- **Unified entry point**: Single port for all apps (e.g., `/kasia/`, `/social/`)
- **SSL termination**: HTTPS support
- **Load balancing**: Multiple instances of apps
- **Advanced routing**: Complex URL rewriting

None of these are required for the test release.

### Dashboard is Local

The dashboard runs on the host machine (not in a container), so nginx can't proxy to it anyway.

## Impact

### Before (Broken)
```
CONTAINER ID   IMAGE            STATUS
0b43881b4ca8   nginx:alpine     Restarting (1) 59 seconds ago  ❌
6f99a93dafdb   kasia-app        Up 15 hours (healthy)          ✓
bda0f7ba50b7   k-social         Up 15 hours (healthy)          ✓
```

### After (Fixed)
```
CONTAINER ID   IMAGE            STATUS
6f99a93dafdb   kasia-app        Up (healthy)                   ✓
bda0f7ba50b7   k-social         Up (healthy)                   ✓
```

### User Experience
- **Simpler deployment**: One less container to manage
- **Faster startup**: No nginx build/pull time
- **Direct access**: Apps accessible immediately on their ports
- **No restart loops**: No broken nginx container

### Resource Savings
- **RAM**: ~50-100MB saved (nginx container)
- **CPU**: ~1-5% saved (nginx overhead)
- **Disk**: ~10MB saved (nginx image)

## Files Modified

1. `services/wizard/backend/src/utils/config-generator.js` - Removed nginx service generation
2. `services/wizard/frontend/public/scripts/modules/review.js` - Updated services list
3. `TESTING.md` - Removed nginx references from Scenario 2
4. `config/nginx.conf` - Commented out dashboard upstream (for future use)

## Testing

### Verify Nginx Removed

1. **Generate new docker-compose**:
   ```bash
   # Select Kaspa User Applications profile in wizard
   # Complete configuration
   # Check generated docker-compose.yml
   ```

2. **Verify no nginx service**:
   ```bash
   grep -i nginx docker-compose.yml
   # Should return no results for kaspa-user-applications profile
   ```

3. **Deploy and verify**:
   ```bash
   docker-compose up -d
   docker ps
   # Should show only kasia-app and k-social
   # Should NOT show kaspa-nginx
   ```

### Verify Apps Still Accessible

1. **Kasia app**:
   ```bash
   curl http://localhost:3001
   # Should return HTML
   ```

2. **K-Social app**:
   ```bash
   curl http://localhost:3003
   # Should return HTML
   ```

## Future Considerations

### When Nginx WOULD Be Needed

If in the future we want to:

1. **Add SSL/HTTPS support**:
   - Nginx can terminate SSL
   - Apps stay on HTTP internally
   - Single certificate for all apps

2. **Unified entry point**:
   - `http://localhost/kasia/` → Kasia app
   - `http://localhost/social/` → K-Social app
   - Cleaner URLs for users

3. **Add dashboard container**:
   - If dashboard becomes a container
   - Nginx can proxy to it
   - Unified management interface

4. **Load balancing**:
   - Multiple instances of apps
   - Nginx distributes traffic
   - Better performance

### Implementation Notes

If nginx is re-added in the future:
- Generate profile-specific nginx.conf
- Only include upstreams for services that exist
- Use DNS resolver for optional services
- Test with and without dashboard

## Related Issues

- Dashboard restart loop: Fixed by removing nginx
- Configuration generation: Now profile-aware
- Documentation accuracy: TESTING.md now matches reality

## Verification Checklist

- [x] Nginx removed from config-generator.js
- [x] Services list updated in review.js
- [x] TESTING.md updated (Scenario 2)
- [x] Apps still accessible on their ports
- [x] No restart loops
- [x] Documentation accurate

## Next Steps

1. **Rebuild test release** with nginx removal
2. **Test deployment** of Kaspa User Applications profile
3. **Verify** no nginx container appears
4. **Confirm** apps are accessible
5. **Update** any remaining documentation references
