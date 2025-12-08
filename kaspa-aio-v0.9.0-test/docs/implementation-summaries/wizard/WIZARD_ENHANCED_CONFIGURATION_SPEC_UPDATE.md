# Wizard Enhanced Configuration Specification Update

## Overview

Updated the web-installation-wizard specification to address a gap between the wizard design and testing documentation. The wizard was missing important configuration options that were referenced in TESTING.md but not implemented in the UI.

## Problem Identified

While testing the Core Profile installation, the TESTING.md document referenced configuration options that don't exist in the wizard:

**Expected (from TESTING.md)**:
- Node RPC port (default: 16110)
- Node P2P port (default: 16111)
- Network selection (mainnet/testnet)
- Data directory location

**Actual (in wizard)**:
- External IP address
- Public node toggle
- Database password
- Advanced options (custom environment variables)

## Specification Updates

### Requirements Document Changes

#### Enhanced Requirement 3: Service Configuration

Added 4 new acceptance criteria:

**3.9** - WHEN Core Profile or Archive Node Profile is selected, THE Installation_Wizard SHALL provide configuration options for Kaspa node RPC port (default: 16110) and P2P port (default: 16111)

**3.10** - WHEN Core Profile or Archive Node Profile is selected, THE Installation_Wizard SHALL provide network selection options (mainnet or testnet)

**3.11** - WHEN any profile with persistent data is selected, THE Installation_Wizard SHALL allow configuration of data directory locations or Docker volume names

**3.12** - THE Installation_Wizard SHALL organize configuration options into Basic and Advanced sections, with profile-specific options displayed only when relevant profiles are selected

#### Enhanced Requirement 4: Network Configuration

Added 2 new acceptance criteria:

**4.6** - WHEN custom ports are configured, THE Installation_Wizard SHALL validate that ports are within valid range (1024-65535) and not in use by other services

**4.7** - WHEN network selection is changed from mainnet to testnet or vice versa, THE Installation_Wizard SHALL warn users about data incompatibility and recommend fresh installation

### Design Document Changes

#### Configuration Form Component Enhancement

Added detailed profile-specific configuration fields:

```typescript
const PROFILE_CONFIG_FIELDS = {
  'core': [
    { key: 'KASPA_NODE_RPC_PORT', defaultValue: 16110, ... },
    { key: 'KASPA_NODE_P2P_PORT', defaultValue: 16111, ... },
    { key: 'KASPA_NETWORK', defaultValue: 'mainnet', options: ['mainnet', 'testnet'], ... },
    { key: 'KASPA_DATA_DIR', defaultValue: '/data/kaspa', category: 'advanced', ... }
  ],
  'archive-node': [ /* similar fields */ ],
  'indexer-services': [
    { key: 'TIMESCALEDB_DATA_DIR', defaultValue: '/data/timescaledb', ... }
  ]
};
```

#### UI Design Enhancement

Updated Step 4: Configuration to include:

- **Profile-Specific Fields**: Only show configuration options relevant to selected profiles
- **Grouped Sections**: Network, Kaspa Node, Database, Advanced
- **Basic vs Advanced Toggle**: Essential settings vs advanced options
- **Enhanced Validation**: Port range, conflict detection, network change warnings

#### New Correctness Properties

Added 8 new properties (13-20):

**Property 13**: Profile-specific configuration visibility  
**Property 14**: Kaspa node port configuration  
**Property 15**: Network selection availability  
**Property 16**: Data directory configuration  
**Property 17**: Port uniqueness (renumbered)  
**Property 18**: Port range validation  
**Property 19**: External IP detection (renumbered)  
**Property 20**: Network change warning  

All subsequent properties were renumbered (21-41).

## Recommended Implementation Approach

### Option 1: Comprehensive Configuration UI (Recommended)

**Pros**:
- Provides full control to users
- Matches user expectations from documentation
- Allows customization without editing .env files
- Better UX for advanced users

**Cons**:
- More complex UI
- More validation logic needed
- Could overwhelm beginners

**Implementation**:
1. Add profile-specific configuration sections
2. Show/hide fields based on selected profiles
3. Implement Basic/Advanced toggle
4. Add port validation and conflict detection
5. Add network selection with warning dialog

### Option 2: Advanced Options with Environment Variables (Current Approach)

**Pros**:
- Simpler UI for beginners
- Already partially implemented
- Flexible for power users

**Cons**:
- Requires users to know environment variable names
- No validation or guidance
- Doesn't match testing documentation

**Implementation**:
1. Keep current simple UI
2. Enhance the "Custom Environment Variables" textarea
3. Add documentation/examples for common variables
4. Update TESTING.md to match current capabilities

### Option 3: Hybrid Approach (Balanced)

**Pros**:
- Simple by default, powerful when needed
- Progressive disclosure of complexity
- Satisfies both beginner and advanced users

**Cons**:
- Requires careful UX design
- More implementation work

**Implementation**:
1. Keep basic fields (IP, public node, DB password)
2. Add "Configure Ports" button that opens modal with port settings
3. Add "Network Settings" section with mainnet/testnet selector
4. Keep advanced options for data directories and custom env vars
5. Show profile-specific options only when relevant

## Recommendation

**I recommend Option 3: Hybrid Approach** because:

1. **Maintains simplicity**: Most users can proceed with defaults
2. **Provides control**: Advanced users can customize ports and network
3. **Matches documentation**: Addresses the gap identified in TESTING.md
4. **Progressive disclosure**: Complexity is hidden until needed
5. **Better validation**: Can validate ports and warn about network changes

## Next Steps

1. **Review the updated specification** with stakeholders
2. **Choose implementation approach** (Option 1, 2, or 3)
3. **Create implementation tasks** based on chosen approach
4. **Update TESTING.md** to align with final implementation
5. **Implement UI changes** in wizard frontend
6. **Add backend validation** for new configuration options
7. **Test thoroughly** with different profile combinations

## Files Modified

- `.kiro/specs/web-installation-wizard/requirements.md` - Added 6 new acceptance criteria
- `.kiro/specs/web-installation-wizard/design.md` - Enhanced configuration component, added 8 new properties, renumbered existing properties

## Related Documentation

- `TESTING.md` - Core Profile test scenario (Step 4: Configuration)
- `services/wizard/frontend/public/index.html` - Current configuration UI
- `services/wizard/backend/src/modules/configure.js` - Configuration backend logic
