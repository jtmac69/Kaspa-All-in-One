# Profile Architecture Quick Reference

**Last Updated:** November 24, 2025  
**Related:** Web Installation Wizard Profile System

## Profile Names (Updated)

| Old Name | New Name | Profile ID |
|----------|----------|------------|
| Production | Kaspa User Applications | `kaspa-user-applications` |
| Explorer | Indexer Services | `indexer-services` |
| Development | *(Removed - use Developer Mode)* | - |
| Core | Core Profile | `core` |
| Archive | Archive Node Profile | `archive-node` |
| Mining | Mining Profile | `mining` |

## Startup Order

Services start in dependency order:

1. **Order 1: Kaspa Nodes** - Core blockchain infrastructure
   - `kaspa-node` (Core Profile)
   - `kaspa-archive-node` (Archive Node Profile)
   - `wallet` (Core Profile, optional)

2. **Order 2: Indexers** - Blockchain indexing services
   - `timescaledb` (Indexer Services)
   - `kasia-indexer` (Indexer Services)
   - `k-indexer` (Indexer Services)
   - `simply-kaspa-indexer` (Indexer Services)

3. **Order 3: Applications** - User-facing services
   - `kasia-app` (Kaspa User Applications)
   - `k-social-app` (Kaspa User Applications)
   - `kaspa-explorer` (Kaspa User Applications)
   - `dashboard` (Core Profile)
   - `nginx` (Core Profile)
   - `kaspa-stratum` (Mining Profile)

## Prerequisites & Conflicts

### Mining Profile
- **Requires:** Core Profile OR Archive Node Profile (must have one)
- **Conflicts:** None

### Archive Node Profile
- **Requires:** None
- **Conflicts:** Core Profile (cannot have both)

### Core Profile
- **Requires:** None
- **Conflicts:** Archive Node Profile

### Kaspa User Applications
- **Requires:** None (can use public indexers)
- **Conflicts:** None

### Indexer Services
- **Requires:** None (can use public Kaspa network)
- **Conflicts:** None

## Configuration Options

### Node Usage
Determines how a profile uses Kaspa nodes:
- `local` - Uses local Kaspa node
- `public` - Uses public Kaspa network
- `for-other-services` - Local node for other services to use
- `fallback` - Prefers local, falls back to public

### Indexer Choice
Determines where applications get indexer data:
- `public` - Uses public indexer endpoints (default)
- `local` - Uses local Indexer Services

### Fallback to Public
Whether to automatically fallback to public network if local node fails:
- `true` - Automatic fallback (recommended)
- `false` - No fallback (fail if local node unavailable)

## Developer Mode

Developer Mode is now a **cross-cutting feature** that can be applied to ANY profile combination.

### Features Added
- Debug logging (`LOG_LEVEL=debug`)
- Portainer (port 9000) - Container management UI
- pgAdmin (port 5050) - Database management UI
- Enhanced log access
- Exposed development ports

### Usage
```javascript
// Get developer mode features
GET /api/profiles/developer-mode/features

// Apply to configuration
POST /api/profiles/developer-mode/apply
{
  "config": { /* base config */ },
  "enabled": true
}
```

## API Endpoints

### Get All Profiles
```http
GET /api/profiles
```

### Get Startup Order
```http
POST /api/profiles/startup-order
{
  "profiles": ["core", "indexer-services"]
}
```

### Validate Selection
```http
POST /api/profiles/validate
{
  "profiles": ["mining"]
}
```

### Calculate Requirements
```http
POST /api/profiles/requirements
{
  "profiles": ["core", "kaspa-user-applications"]
}
```

### Detect Circular Dependencies
```http
POST /api/profiles/circular-dependencies
{
  "profiles": ["profile-a", "profile-b"]
}
```

## Common Validation Errors

### Missing Prerequisite
```json
{
  "type": "missing_prerequisite",
  "profile": "mining",
  "message": "Mining Profile requires one of: Core Profile, Archive Node Profile"
}
```

**Fix:** Add Core Profile or Archive Node Profile to selection

### Profile Conflict
```json
{
  "type": "profile_conflict",
  "message": "Core Profile conflicts with Archive Node Profile"
}
```

**Fix:** Choose either Core Profile OR Archive Node Profile, not both

### Missing Required
```json
{
  "type": "missing_required",
  "message": "Either Core Profile or Archive Node Profile is required for all deployments"
}
```

**Fix:** Add Core Profile or Archive Node Profile to selection

## Profile Combinations

### Recommended Combinations

**Home Node (Basic)**
- Core Profile
- Developer Mode: Optional

**Public Node (Indexing)**
- Core Profile
- Indexer Services
- Developer Mode: Optional

**Full Stack (Complete)**
- Core Profile
- Kaspa User Applications
- Indexer Services
- Developer Mode: Optional

**Mining Setup**
- Core Profile (or Archive Node Profile)
- Mining Profile
- Developer Mode: Optional

**Archive Node**
- Archive Node Profile
- Indexer Services (optional)
- Developer Mode: Optional

### Invalid Combinations

❌ **Core + Archive Node**
- Conflict: Cannot have both node types

❌ **Mining alone**
- Missing prerequisite: Needs Core or Archive Node

❌ **No node profile**
- Missing required: Must have Core or Archive Node

## Resource Sharing

### Shared Resources
Some services are shared across profiles to avoid duplication:

- **TimescaleDB** - Shared by all indexers
  - Separate databases: `kasia_db`, `k_db`, `simply_kaspa_db`
  - Only one TimescaleDB container runs
  - Resources counted once, not per indexer

### Resource Calculation
```javascript
POST /api/profiles/requirements
{
  "profiles": ["indexer-services", "kaspa-user-applications"]
}

Response:
{
  "minMemory": 12,  // Combined, deduplicated
  "sharedResources": [
    {
      "service": "timescaledb",
      "sharedBy": ["indexer-services"]
    }
  ]
}
```

## Migration Guide

### From Old Profile IDs

```javascript
// Old code
const profiles = ['core', 'prod', 'explorer', 'development'];

// New code
const profiles = ['core', 'kaspa-user-applications', 'indexer-services'];
const developerMode = true;  // Instead of 'development' profile
```

### From Service Strings to Objects

```javascript
// Old format
services: ['kaspa-node', 'dashboard', 'nginx']

// New format
services: [
  { name: 'kaspa-node', required: true, startupOrder: 1, description: '...' },
  { name: 'dashboard', required: true, startupOrder: 3, description: '...' },
  { name: 'nginx', required: true, startupOrder: 3, description: '...' }
]
```

## Code Examples

### Get Startup Order
```javascript
const ProfileManager = require('./profile-manager');
const pm = new ProfileManager();

const order = pm.getStartupOrder(['core', 'indexer-services']);
// Returns services sorted by startupOrder: 1, 2, 3...
```

### Apply Developer Mode
```javascript
const baseConfig = {
  KASPA_NODE_P2P_PORT: 16110,
  LOG_LEVEL: 'info'
};

const devConfig = pm.applyDeveloperMode(baseConfig, true);
// Returns config with debug logging and dev tools enabled
```

### Validate Prerequisites
```javascript
const validation = pm.validateProfileSelection(['mining']);
if (!validation.valid) {
  console.error(validation.errors);
  // Error: Mining requires Core or Archive Node
}
```

### Detect Conflicts
```javascript
const validation = pm.validateProfileSelection(['core', 'archive-node']);
if (!validation.valid) {
  console.error(validation.errors);
  // Error: Core conflicts with Archive Node
}
```

## Testing

Run the comprehensive test suite:
```bash
node services/wizard/backend/test-profile-architecture.js
```

Tests cover:
- ✅ Profile renames
- ✅ Startup order
- ✅ Prerequisites
- ✅ Node usage options
- ✅ Fallback configuration
- ✅ Developer Mode
- ✅ Validation
- ✅ Conflict detection
- ✅ Circular dependencies

## Next Steps

After implementing profile architecture:
1. Update frontend UI to use new profile IDs
2. Add Developer Mode toggle to profile selection
3. Display startup order in UI
4. Show prerequisites and conflicts
5. Implement dependency resolution system (Task 6.6.2)
6. Implement fallback strategies (Task 6.6.4)

## Related Documentation

- [Profile Architecture Update Implementation](../implementation-summaries/wizard/PROFILE_ARCHITECTURE_UPDATE_IMPLEMENTATION.md)
- [Web Installation Wizard Design](.kiro/specs/web-installation-wizard/design.md)
- [Architecture Update Tasks](.kiro/specs/web-installation-wizard/TASKS_ARCHITECTURE_UPDATE.md)
