# Dependency Validator Quick Reference

## Overview

The `DependencyValidator` validates profile selections for the wizard, checking for circular dependencies, prerequisites, conflicts, and calculating startup order.

## Quick Start

```javascript
const ProfileManager = require('./src/utils/profile-manager');
const DependencyValidator = require('./src/utils/dependency-validator');

const profileManager = new ProfileManager();
const validator = new DependencyValidator(profileManager);

// Validate a selection
const result = validator.validateSelection(['core', 'mining']);
console.log(result.valid); // false - mining needs core or archive
console.log(result.errors); // Array of error objects
```

## API Endpoints

### POST /api/profiles/validate-selection

Validates a profile selection.

**Request**:
```json
{
  "profiles": ["core", "kaspa-user-applications"]
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "metadata": {
    "startupOrder": {...},
    "dependencyGraph": {...},
    "resolvedProfiles": [...]
  }
}
```

### POST /api/profiles/validation-report

Gets a detailed validation report with recommendations.

**Request**:
```json
{
  "profiles": ["mining"]
}
```

**Response**:
```json
{
  "valid": false,
  "errors": [...],
  "warnings": [...],
  "summary": {
    "totalProfiles": 1,
    "resolvedProfiles": 1,
    "totalServices": 1,
    "errorCount": 1,
    "warningCount": 0
  },
  "requirements": {...},
  "recommendations": [
    "Add one of these profiles: Core Profile or Archive Node Profile"
  ]
}
```

### POST /api/profiles/dependency-graph

Builds a dependency graph for visualization.

**Request**:
```json
{
  "profiles": ["core", "mining"]
}
```

**Response**:
```json
{
  "nodes": [
    {
      "id": "core",
      "name": "Core Profile",
      "category": "essential",
      "selected": true,
      "services": ["kaspa-node", "wallet", "dashboard", "nginx"]
    },
    {
      "id": "mining",
      "name": "Mining Profile",
      "category": "advanced",
      "selected": true,
      "services": ["kaspa-stratum"]
    }
  ],
  "edges": [
    {
      "from": "mining",
      "to": "core",
      "type": "prerequisite",
      "label": "requires one of"
    }
  ]
}
```

## Validation Rules

### Error Types

| Type | Description | Example |
|------|-------------|---------|
| `empty_selection` | No profiles selected | `[]` |
| `invalid_profile` | Profile doesn't exist | `['invalid-id']` |
| `missing_prerequisite` | Prerequisite not satisfied | Mining without Core/Archive |
| `profile_conflict` | Conflicting profiles | Core + Archive Node |
| `port_conflict` | Port used by multiple profiles | Both use port 16110 |
| `circular_dependency` | Circular dependency chain | A→B→C→A |

### Warning Types

| Type | Description | Threshold |
|------|-------------|-----------|
| `high_memory` | Very high memory requirement | > 32GB |
| `moderate_memory` | High memory requirement | > 16GB |
| `high_disk` | High disk requirement | > 1000GB |
| `high_cpu` | High CPU requirement | > 8 cores |

## Common Validation Scenarios

### Valid Selections

```javascript
// Core alone
validator.validateSelection(['core']);
// ✓ Valid

// Core + Applications
validator.validateSelection(['core', 'kaspa-user-applications']);
// ✓ Valid

// Core + Indexers + Applications
validator.validateSelection(['core', 'indexer-services', 'kaspa-user-applications']);
// ✓ Valid

// Archive + Mining
validator.validateSelection(['archive-node', 'mining']);
// ✓ Valid
```

### Invalid Selections

```javascript
// Mining without prerequisite
validator.validateSelection(['mining']);
// ✗ Invalid - Missing prerequisite

// Core + Archive (conflict)
validator.validateSelection(['core', 'archive-node']);
// ✗ Invalid - Profile conflict

// Empty selection
validator.validateSelection([]);
// ✗ Invalid - Empty selection

// Invalid profile ID
validator.validateSelection(['invalid-profile']);
// ✗ Invalid - Profile doesn't exist
```

## Startup Order

Services are grouped by startup order:

| Order | Phase | Services |
|-------|-------|----------|
| 1 | Kaspa Node | kaspa-node, kaspa-archive-node, wallet |
| 2 | Indexer Services | timescaledb, kasia-indexer, k-indexer, simply-kaspa-indexer |
| 3 | Applications | dashboard, nginx, kasia-app, k-social-app, kaspa-explorer, kaspa-stratum |

**Example**:
```javascript
const result = validator.validateSelection(['core', 'indexer-services']);
const startupOrder = result.metadata.startupOrder;

console.log(startupOrder.grouped[1]); // Kaspa Node services
console.log(startupOrder.grouped[2]); // Indexer services
console.log(startupOrder.grouped[3]); // Application services
```

## Dependency Graph

The dependency graph shows relationships between profiles:

**Node Structure**:
```javascript
{
  id: 'core',
  name: 'Core Profile',
  category: 'essential',
  selected: true,
  services: ['kaspa-node', 'wallet', 'dashboard', 'nginx']
}
```

**Edge Types**:
- `dependency` - Hard dependency (must have)
- `prerequisite` - One of several options (OR relationship)
- `conflict` - Cannot coexist

**Example**:
```javascript
const result = validator.validateSelection(['core', 'mining']);
const graph = result.metadata.dependencyGraph;

// Mining has prerequisite edge to Core
const edge = graph.edges.find(e => e.from === 'mining' && e.to === 'core');
console.log(edge.type); // 'prerequisite'
console.log(edge.label); // 'requires one of'
```

## Testing

### Run Unit Tests
```bash
node services/wizard/backend/test-dependency-validator.js
```

### Run API Tests
```bash
# Start wizard backend first
node services/wizard/backend/src/server.js

# In another terminal
node services/wizard/backend/test-dependency-api.js
```

## Profile Prerequisites

| Profile | Prerequisites | Notes |
|---------|--------------|-------|
| Core | None | Can be selected alone |
| Kaspa User Applications | None | Can use public indexers |
| Indexer Services | None | Can use public Kaspa network |
| Archive Node | None | Conflicts with Core |
| Mining | Core OR Archive Node | Must have one |

## Profile Conflicts

| Profile A | Profile B | Reason |
|-----------|-----------|--------|
| Core | Archive Node | Both provide Kaspa node |

## Resource Calculation

Resources are calculated with deduplication:

```javascript
const result = validator.validateSelection(['core', 'indexer-services']);
const requirements = result.metadata.requirements;

console.log(requirements.minMemory); // Combined memory
console.log(requirements.minCpu); // Max CPU (not summed)
console.log(requirements.minDisk); // Combined disk
console.log(requirements.ports); // All unique ports
console.log(requirements.sharedResources); // Shared services (e.g., TimescaleDB)
```

## Error Handling

All methods return structured error objects:

```javascript
{
  type: 'missing_prerequisite',
  profile: 'mining',
  profileName: 'Mining Profile',
  prerequisites: ['core', 'archive-node'],
  message: 'Mining Profile requires one of: Core Profile OR Archive Node Profile'
}
```

## Integration Example

```javascript
// Frontend validation before submission
async function validateAndSubmit(selectedProfiles) {
  const response = await fetch('/api/profiles/validate-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles: selectedProfiles })
  });
  
  const result = await response.json();
  
  if (!result.valid) {
    // Show errors to user
    result.errors.forEach(error => {
      showError(error.message);
    });
    return false;
  }
  
  // Show warnings if any
  result.warnings.forEach(warning => {
    showWarning(warning.message);
  });
  
  // Proceed with installation
  return true;
}
```

## Recommendations

The validator provides actionable recommendations:

```javascript
const report = validator.getValidationReport(['mining']);

console.log(report.recommendations);
// [
//   "Add one of these profiles: Core Profile or Archive Node Profile"
// ]
```

## Files

- **Core**: `services/wizard/backend/src/utils/dependency-validator.js`
- **API**: `services/wizard/backend/src/api/profiles.js`
- **Tests**: `services/wizard/backend/test-dependency-validator.js`
- **API Tests**: `services/wizard/backend/test-dependency-api.js`

## Related Documentation

- [Profile Architecture Quick Reference](./PROFILE_ARCHITECTURE_QUICK_REFERENCE.md)
- [Dependency Validator Implementation Summary](../implementation-summaries/wizard/DEPENDENCY_VALIDATOR_IMPLEMENTATION.md)
- [Profile Architecture Update Implementation](../implementation-summaries/wizard/PROFILE_ARCHITECTURE_UPDATE_IMPLEMENTATION.md)
