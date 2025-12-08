# Task 6.2: TESTING.md Nginx Removal Complete

## Overview

Completed removal of all nginx references from Scenario 2 (Kaspa User Applications) in TESTING.md to reflect that nginx is not included in this profile.

## Changes Made to TESTING.md - Scenario 2

### 1. Step 6: Review and Confirm
**Removed**: Nginx from services list
```markdown
# Before
- Services: Kasia, K-Social, Nginx

# After
- Services: Kasia, K-Social
```

### 2. Step 7: Installation Progress
**Removed**: Nginx image from Docker pull list
```markdown
# Before
- Pulling Docker images...
  - Kaspa node image
  - Nginx image
  - Base images for applications

# After
- Pulling Docker images...
  - Base images for applications
```

### 3. Step 9: Verify Services with Docker
**Removed**: Nginx from container list and added clarification
```markdown
# Before
- ✓ Should show `kasia-app` container
- ✓ Should show `k-social` container
- ✓ Should show `nginx` container

# After
- ✓ Should show `kasia-app` container
- ✓ Should show `k-social` container

Note: Kaspa node is NOT included in this profile - apps use remote indexers
```

### 4. Step 11: Monitor Resource Usage
**Removed**: Nginx from resource expectations and added clarification
```markdown
# Before
Expected Resource Usage:
- Kaspa node: 50-100% CPU during sync, 1-2GB RAM
- Kasia app: 5-10% CPU, 200-500MB RAM
- K-Social app: 5-10% CPU, 200-500MB RAM
- Nginx: <5% CPU, <100MB RAM

# After
Expected Resource Usage:
- Kasia app: 5-10% CPU, 200-500MB RAM
- K-Social app: 5-10% CPU, 200-500MB RAM

Note: Kaspa node is NOT included in this profile - apps use remote indexers
```

## Remaining Nginx References (Other Scenarios)

The following nginx references remain in TESTING.md but are for OTHER scenarios (not Scenario 2):

1. **Line 814**: Scenario 1 (Core Profile) - Correct, Core Profile may include nginx
2. **Line 1953**: Scenario 3 (Indexer Services) - Correct, Indexer Services includes nginx
3. **Line 2076**: Scenario 3 (Indexer Services) - Correct
4. **Line 2115**: Scenario 3 (Indexer Services) - Correct
5. **Line 2147**: Scenario 3 (Indexer Services) - Correct

These are intentionally left as they refer to profiles that DO include nginx.

## Summary of Scenario 2 Updates

### Services Listed
- **Before**: Kasia, K-Social, Nginx, Kaspa Node
- **After**: Kasia, K-Social only

### Key Clarifications Added
1. "Kaspa node is NOT included in this profile - apps use remote indexers"
2. Removed all nginx container expectations
3. Removed nginx resource usage expectations

### What Testers Will See
- Only 2 containers: kasia-app and k-social
- Direct port access: 3001 (Kasia), 3003 (K-Social)
- No nginx container (no restart loops)
- No kaspa-node container (uses remote indexers)

## Verification

To verify all Scenario 2 nginx references are removed:

```bash
# Extract Scenario 2 section
sed -n '/^### Scenario 2: Kaspa User Applications/,/^### Scenario 3/p' TESTING.md > scenario2.txt

# Check for nginx references
grep -i nginx scenario2.txt
# Should return no results

# Check for kaspa-nginx references
grep -i kaspa-nginx scenario2.txt
# Should return no results
```

## Files Modified

1. `TESTING.md` - Scenario 2 section updated (4 locations)

## Related Changes

- `services/wizard/backend/src/utils/config-generator.js` - Nginx service removed
- `services/wizard/frontend/public/scripts/modules/review.js` - Services list updated
- `config/nginx.conf` - Dashboard upstream commented out

## Impact

### Documentation Accuracy
- ✓ TESTING.md now matches actual deployment
- ✓ Testers won't expect nginx container
- ✓ No confusion about "missing" nginx service
- ✓ Clear about what IS included (Kasia, K-Social)
- ✓ Clear about what ISN'T included (nginx, kaspa-node)

### Tester Experience
- Clearer expectations
- Accurate container counts
- Correct resource usage expectations
- No false bug reports about nginx

## Next Steps

1. **Rebuild test release** with all nginx removal changes
2. **Test Scenario 2** to verify documentation accuracy
3. **Confirm** only 2 containers appear (kasia-app, k-social)
4. **Verify** apps are accessible on ports 3001 and 3003

## Completion Checklist

- [x] Step 6 updated (services list)
- [x] Step 7 updated (Docker images)
- [x] Step 9 updated (container verification)
- [x] Step 11 updated (resource usage)
- [x] Clarifications added (no kaspa-node, no nginx)
- [x] Other scenarios left intact (Core, Indexer Services)
- [x] Documentation summary created
