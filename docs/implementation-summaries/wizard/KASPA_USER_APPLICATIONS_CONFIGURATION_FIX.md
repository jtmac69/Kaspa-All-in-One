# Kaspa User Applications Profile Configuration Fix

## Issue Summary

During testing of the Kaspa User Applications profile (Test Scenario 2 in test-release spec), several configuration bugs were identified where irrelevant configuration fields are being displayed to users.

## Problems Identified

### Problem 1: Kaspa Node Configuration Shown Incorrectly

**Issue:** When selecting ONLY the Kaspa User Applications profile, the wizard displays Kaspa Node configuration fields (External IP, Public Node toggle, RPC Port, P2P Port, Network selection).

**Why this is wrong:**
- Kaspa User Applications (Kasia, K-Social) do NOT run a local Kaspa node
- They connect to indexers via HTTP/WebSocket APIs
- The apps automatically use public Kaspa network endpoints when no local node is available
- Node configuration should ONLY appear when Core Profile or Archive Node Profile is selected

**Expected behavior:**
- Kaspa User Applications ONLY → No node configuration fields
- Core + Kaspa User Applications → Show node configuration (because Core is selected)
- The apps automatically detect local node availability or fall back to public network

### Problem 2: Database Configuration Shown Incorrectly

**Issue:** When selecting ONLY the Kaspa User Applications profile, the wizard asks for database password and shows database configuration.

**Why this is wrong:**
- Kaspa User Applications do NOT directly access a database
- They connect to indexer APIs (Kasia Indexer, K-Indexer) via HTTP/WebSocket
- Only the indexers themselves need database access (TimescaleDB)
- Database configuration should ONLY appear when Indexer Services profile is selected

**Expected behavior:**
- Kaspa User Applications ONLY → No database configuration
- Indexer Services profile → Show database configuration (TimescaleDB)
- Kaspa User Applications + Indexer Services → Show database configuration (for indexers)

### Problem 3: Unclear Configuration Requirements

**Issue:** Documentation doesn't clearly explain that Kaspa User Applications profile requires minimal/zero configuration when used alone.

**Expected behavior:**
- Clear documentation that this profile is "zero-config" when used standalone
- Explanation of how apps connect to public vs local services
- Clarification of what configurations apply to which profiles

## Architecture Review

### How Kaspa User Applications Work

```
┌─────────────────────────────────────────────────────────────┐
│ Kaspa User Applications Profile (Standalone)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │  Kasia App   │      │  K-Social    │                     │
│  │  (Container) │      │  (Container) │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │  HTTP/WebSocket     │  HTTP/WebSocket             │
│         ▼                     ▼                              │
│  ┌─────────────────────────────────────────┐                │
│  │  Public Indexer APIs                    │                │
│  │  - api.kasia.io                         │                │
│  │  - indexer.kaspatalk.net                │                │
│  │  - api.kasia.io/ws (Kaspa node)         │                │
│  └─────────────────────────────────────────┘                │
│                                                               │
│  ┌──────────────┐                                            │
│  │ Nginx Proxy  │  (Routes /kasia, /k-social)               │
│  │ Port 80/443  │                                            │
│  └──────────────┘                                            │
│                                                               │
│  NO LOCAL NODE NEEDED                                        │
│  NO DATABASE NEEDED                                          │
│  NO INDEXERS NEEDED                                          │
└─────────────────────────────────────────────────────────────┘
```

### With Local Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│ Full Stack: Core + Indexer Services + User Applications     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │  Kasia App   │      │  K-Social    │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │  HTTP/WebSocket     │  HTTP/WebSocket             │
│         ▼                     ▼                              │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │Kasia Indexer │      │  K-Indexer   │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │  SQL Queries        │  SQL Queries                │
│         ▼                     ▼                              │
│  ┌─────────────────────────────────────────┐                │
│  │  TimescaleDB (Shared Database)          │                │
│  │  - kasia_db                              │                │
│  │  - k_db                                  │                │
│  └─────────────────────────────────────────┘                │
│                                                               │
│         ┌──────────────┐                                     │
│         │  Kaspa Node  │  (Optional, for indexers)          │
│         └──────────────┘                                     │
│                                                               │
│  Configuration needed:                                       │
│  - Node settings (Core profile)                             │
│  - Database password (Indexer Services profile)             │
│  - No additional config for User Applications               │
└─────────────────────────────────────────────────────────────┘
```

## Root Cause Analysis

### Issue 1: Database Configuration Logic

**File:** `services/wizard/backend/src/utils/config-generator.js` (line 138)

**Current code:**
```javascript
// Database settings (only if indexer-services or kaspa-user-applications profiles are active)
if (profiles.includes('indexer-services') || profiles.includes('kaspa-user-applications')) {
  lines.push(
    '# Database Settings',
    `POSTGRES_USER=${config.POSTGRES_USER || 'kaspa'}`,
    `POSTGRES_PASSWORD=${config.POSTGRES_PASSWORD}`,
    `POSTGRES_DB=${config.POSTGRES_DB || 'kaspa_explorer'}`,
    `POSTGRES_PORT=${config.POSTGRES_PORT || 5432}`,
    ''
  );
}
```

**Problem:** The condition `|| profiles.includes('kaspa-user-applications')` incorrectly triggers database configuration for user applications.

**Fix:** Remove the kaspa-user-applications condition:
```javascript
// Database settings (only if indexer-services profile is active)
if (profiles.includes('indexer-services')) {
  // ... database configuration
}
```

### Issue 2: Configuration Fields Visibility

**File:** `services/wizard/backend/src/config/configuration-fields.js`

**Current state:** The fields are correctly configured with `visibleForProfiles` restrictions:
- Kaspa Node fields: `visibleForProfiles: ['core']` or `visibleForProfiles: ['archive-node']`
- Database fields: `visibleForProfiles: ['indexer-services']`

**Problem:** The issue is likely in how the UI renders these fields or how the field visibility resolver processes them.

**Investigation needed:**
1. Check if common fields (EXTERNAL_IP, PUBLIC_NODE) are being shown when they shouldn't be
2. Verify the field visibility resolver correctly filters fields
3. Check if the UI is respecting the visibility rules

### Issue 3: Common Fields Over-Exposure

**File:** `services/wizard/backend/src/config/configuration-fields.js` (lines 274-302)

**Current code:**
```javascript
common: [
  {
    key: 'EXTERNAL_IP',
    label: 'External IP Address',
    // ...
    visibleForProfiles: ['core', 'archive-node', 'kaspa-user-applications', 'indexer-services', 'mining']
  },
  // ...
]
```

**Problem:** Common fields like EXTERNAL_IP are marked as visible for kaspa-user-applications, but these fields are only meaningful when running a local node or indexer.

**Analysis:**
- EXTERNAL_IP is only needed for services that accept external connections
- Kaspa User Applications run behind nginx and don't need external IP configuration
- This field should only appear for profiles that run network-accessible services

## Proposed Solutions

### Solution 1: Fix Database Configuration Logic

**File:** `services/wizard/backend/src/utils/config-generator.js`

**Changes:**
1. Line 138: Remove kaspa-user-applications from database condition
2. Line 367: Remove kaspa-user-applications from default config database condition
3. Line 470: Remove kaspa-user-applications from pgAdmin condition (only needed for indexer-services)

**Impact:**
- Database configuration only appears when Indexer Services profile is selected
- Kaspa User Applications profile becomes truly zero-config
- No breaking changes to existing functionality

### Solution 2: Refine Common Fields Visibility

**File:** `services/wizard/backend/src/config/configuration-fields.js`

**Changes:**
1. Remove 'kaspa-user-applications' from EXTERNAL_IP visibleForProfiles
2. Add explanatory comments about why each profile needs each field

**Rationale:**
- EXTERNAL_IP is only needed for services that listen on network ports
- Kaspa User Applications are accessed through nginx, which handles external access
- Users don't need to configure external IP for apps

### Solution 3: Add Profile-Specific Configuration Documentation

**File:** `docs/wizard-configuration-guide.md`

**Changes:**
1. Add section explaining zero-config nature of Kaspa User Applications profile
2. Clarify which configurations apply to which profiles
3. Add architecture diagrams showing data flow
4. Document the automatic fallback to public services

### Solution 4: Add UI Messaging for Zero-Config Profiles

**File:** `services/wizard/frontend/public/scripts/modules/configure.js`

**Changes:**
1. Detect when only Kaspa User Applications is selected
2. Display informational message: "This profile requires no configuration. Apps will use public indexers and Kaspa network."
3. Show "Skip to Review" button for zero-config scenarios

## Implementation Plan

### Phase 1: Backend Fixes (High Priority)

**Task 1.1:** Fix database configuration logic in config-generator.js
- Remove kaspa-user-applications from database conditions
- Update default config generation
- Update developer mode pgAdmin condition

**Task 1.2:** Refine common fields visibility
- Update EXTERNAL_IP visibleForProfiles
- Add comments explaining field visibility logic
- Verify no other common fields have incorrect visibility

**Task 1.3:** Add validation tests
- Test that kaspa-user-applications alone shows no database fields
- Test that kaspa-user-applications alone shows no node fields
- Test that kaspa-user-applications + indexer-services shows database fields
- Test that kaspa-user-applications + core shows node fields

### Phase 2: Documentation Updates (Medium Priority)

**Task 2.1:** Update wizard configuration guide
- Add "Zero-Configuration Profiles" section
- Document Kaspa User Applications architecture
- Clarify profile-specific configuration requirements
- Add troubleshooting for common misunderstandings

**Task 2.2:** Update design document
- Clarify profile configuration requirements
- Update data models to reflect correct field visibility
- Add architecture diagrams for different profile combinations

### Phase 3: UI Enhancements (Low Priority)

**Task 3.1:** Add zero-config profile detection
- Detect when profile requires no configuration
- Display informational message
- Provide "Skip to Review" option

**Task 3.2:** Improve configuration step UX
- Show profile-specific help text
- Explain why certain fields appear/don't appear
- Add tooltips explaining profile dependencies

## Testing Strategy

### Unit Tests

**Test 1:** Database configuration generation
```javascript
test('kaspa-user-applications alone should not generate database config', () => {
  const config = generator.generateDefaultConfig(['kaspa-user-applications']);
  expect(config.POSTGRES_PASSWORD).toBeUndefined();
});

test('indexer-services should generate database config', () => {
  const config = generator.generateDefaultConfig(['indexer-services']);
  expect(config.POSTGRES_PASSWORD).toBeDefined();
});
```

**Test 2:** Field visibility
```javascript
test('kaspa-user-applications alone should show no node fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  const nodeFields = fields.categories.basic?.groups['kaspa-node']?.fields || [];
  expect(nodeFields.length).toBe(0);
});

test('kaspa-user-applications alone should show no database fields', () => {
  const fields = resolver.getVisibleFields(['kaspa-user-applications']);
  const dbFields = fields.categories.basic?.groups['database']?.fields || [];
  expect(dbFields.length).toBe(0);
});
```

### Integration Tests

**Test 3:** End-to-end configuration flow
```javascript
test('kaspa-user-applications profile should complete with minimal config', async () => {
  // Select only kaspa-user-applications profile
  await selectProfile('kaspa-user-applications');
  
  // Configuration step should show minimal/no fields
  const configFields = await getConfigurationFields();
  expect(configFields.required.length).toBe(0);
  
  // Should be able to proceed directly to review
  const canProceed = await canProceedToReview();
  expect(canProceed).toBe(true);
});
```

### Manual Testing Scenarios

**Scenario 1:** Kaspa User Applications Only
1. Select only Kaspa User Applications profile
2. Verify NO node configuration fields appear
3. Verify NO database configuration fields appear
4. Verify can proceed to review with no configuration
5. Verify generated .env uses public endpoints

**Scenario 2:** Kaspa User Applications + Indexer Services
1. Select both profiles
2. Verify database configuration appears (for indexers)
3. Verify NO node configuration appears (no Core profile)
4. Verify generated .env uses local indexers

**Scenario 3:** Full Stack (Core + Indexer Services + User Applications)
1. Select all three profiles
2. Verify node configuration appears (from Core)
3. Verify database configuration appears (from Indexer Services)
4. Verify generated .env uses local node and indexers

## Success Criteria

### Functional Requirements
- ✅ Kaspa User Applications profile alone shows zero configuration fields
- ✅ Database configuration only appears with Indexer Services profile
- ✅ Node configuration only appears with Core or Archive Node profiles
- ✅ Generated .env files are correct for all profile combinations
- ✅ Apps successfully connect to public endpoints when no local services

### User Experience Requirements
- ✅ Users understand why certain fields appear/don't appear
- ✅ Zero-config profiles are clearly identified
- ✅ Configuration step is not confusing for simple deployments
- ✅ Documentation clearly explains profile architecture

### Technical Requirements
- ✅ All existing tests pass
- ✅ New tests cover the fixed behavior
- ✅ No breaking changes to existing configurations
- ✅ Backward compatibility maintained

## Rollout Plan

### Phase 1: Immediate Fixes (v0.9.1)
- Fix database configuration logic
- Fix common fields visibility
- Add basic validation tests
- Update critical documentation

### Phase 2: Enhanced UX (v0.9.2)
- Add zero-config profile detection
- Improve configuration step messaging
- Add comprehensive documentation
- Add UI tooltips and help text

### Phase 3: Long-term Improvements (v1.0)
- Profile-specific configuration wizards
- Smart defaults based on profile selection
- Configuration templates for common scenarios
- Interactive profile dependency visualization

## Related Issues

- Test Scenario 2 in test-release spec (Task 6.2)
- Configuration field visibility logic
- Profile dependency management
- Documentation accuracy

## References

- Design Document: `.kiro/specs/web-installation-wizard/design.md`
- Configuration Fields: `services/wizard/backend/src/config/configuration-fields.js`
- Config Generator: `services/wizard/backend/src/utils/config-generator.js`
- Field Visibility Resolver: `services/wizard/backend/src/utils/field-visibility-resolver.js`
- Configuration Guide: `docs/wizard-configuration-guide.md`

---

**Document Version:** 1.0  
**Created:** 2024-12-07  
**Status:** Proposed  
**Priority:** High  
**Estimated Effort:** 2-3 hours for Phase 1
