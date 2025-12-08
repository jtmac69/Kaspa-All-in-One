# Configuration Field Definitions Implementation

## Overview

Implemented the backend infrastructure for profile-specific configuration fields with validation rules, visibility logic, and grouping. This provides the foundation for the enhanced configuration UI in the wizard.

## Implementation Date

December 6, 2024

## Components Implemented

### 1. Configuration Field Registry (`src/config/configuration-fields.js`)

**Purpose**: Central registry of all configuration fields with metadata, validation rules, and visibility settings.

**Key Features**:
- Profile-specific field definitions (Core, Archive Node, Indexer Services)
- Common fields that apply to all profiles
- Field categories (basic, advanced)
- Field groups (kaspa-node, database, network, advanced)
- Validation rules (range, pattern, enum, minLength, path)
- Default values and tooltips

**Field Structure**:
```javascript
{
  key: 'KASPA_NODE_RPC_PORT',
  label: 'Kaspa Node RPC Port',
  type: 'number',
  defaultValue: 16110,
  required: true,
  validation: [
    {
      type: 'range',
      min: 1024,
      max: 65535,
      message: 'Port must be between 1024 and 65535'
    }
  ],
  tooltip: 'Port for RPC connections to the Kaspa node',
  category: 'basic',
  group: 'kaspa-node',
  visibleForProfiles: ['core']
}
```

**Profiles Covered**:
- **Core Profile**: RPC port, P2P port, network selection, data directory, public node toggle
- **Archive Node Profile**: Same as Core with archive-specific defaults
- **Indexer Services Profile**: TimescaleDB data directory, database user, database password
- **Common Fields**: External IP, custom environment variables

### 2. Field Visibility Resolver (`src/utils/field-visibility-resolver.js`)

**Purpose**: Filters and organizes configuration fields based on selected profiles.

**Key Methods**:
- `getVisibleFields(selectedProfiles)` - Returns organized fields by category and group
- `getFieldsByCategory(selectedProfiles, category)` - Filter by category (basic/advanced)
- `getFieldsByGroup(selectedProfiles, group)` - Filter by group (kaspa-node/database/etc)
- `getFieldByKey(key)` - Get specific field definition
- `getFieldsForProfile(profileId)` - Get all fields for a profile
- `getSummary(selectedProfiles)` - Get summary statistics

**Output Structure**:
```javascript
{
  categories: {
    basic: {
      id: 'basic',
      label: 'Basic Configuration',
      groups: {
        'kaspa-node': {
          id: 'kaspa-node',
          label: 'Kaspa Node Settings',
          fields: [...]
        },
        network: {
          id: 'network',
          label: 'Network Configuration',
          fields: [...]
        }
      },
      fieldCount: 5
    },
    advanced: {
      id: 'advanced',
      label: 'Advanced Options',
      groups: {...},
      fieldCount: 2
    }
  },
  metadata: {
    totalFields: 7,
    categories: ['basic', 'advanced'],
    groups: ['kaspa-node', 'network', 'database', 'advanced']
  }
}
```

### 3. Configuration Validator (`src/utils/configuration-validator.js`)

**Purpose**: Validates configuration values against field definitions and rules.

**Key Features**:
- Port range validation (1024-65535)
- Port conflict detection across all services
- Network change validation with warnings
- Data directory path validation
- Required field validation
- Pattern/regex validation
- Enum validation
- Minimum length validation

**Key Methods**:
- `validateConfiguration(config, selectedProfiles)` - Validate complete configuration
- `validateField(field, value, config)` - Validate single field
- `validatePortConflicts(config, selectedProfiles)` - Check for port conflicts
- `validateNetworkChange(config, previousConfig)` - Generate network change warnings
- `getValidationSummary(config, selectedProfiles)` - Get validation statistics
- `isFieldValid(fieldKey, value, config)` - Quick validity check
- `getFieldErrors(fieldKey, value, config)` - Get errors for specific field

**Validation Result Structure**:
```javascript
{
  valid: true/false,
  errors: [
    {
      field: 'KASPA_NODE_RPC_PORT',
      message: 'Port must be between 1024 and 65535',
      type: 'range'
    }
  ],
  warnings: [
    {
      field: 'KASPA_NETWORK',
      message: 'Changing network from mainnet to testnet requires fresh installation',
      type: 'network_change',
      severity: 'high'
    }
  ]
}
```

### 4. API Endpoints (`src/api/config.js`)

**New Endpoints Added**:

#### POST `/api/config/fields`
Get visible configuration fields for selected profiles.

**Request**:
```json
{
  "profiles": ["core", "indexer-services"]
}
```

**Response**:
```json
{
  "fields": {
    "categories": {...},
    "metadata": {...}
  },
  "summary": {
    "totalFields": 10,
    "requiredFields": 5,
    "optionalFields": 5,
    "categories": {...},
    "groups": {...}
  },
  "categories": {...},
  "groups": {...}
}
```

#### GET `/api/config/fields/:key`
Get specific field definition.

**Response**:
```json
{
  "field": {
    "key": "KASPA_NODE_RPC_PORT",
    "label": "Kaspa Node RPC Port",
    "type": "number",
    "defaultValue": 16110,
    ...
  }
}
```

#### POST `/api/config/validate-field`
Validate a single field value.

**Request**:
```json
{
  "key": "KASPA_NODE_RPC_PORT",
  "value": 100,
  "config": {...}
}
```

**Response**:
```json
{
  "valid": false,
  "errors": [
    {
      "field": "KASPA_NODE_RPC_PORT",
      "message": "Port must be between 1024 and 65535",
      "type": "range"
    }
  ]
}
```

#### POST `/api/config/validate-complete`
Validate complete configuration with enhanced validator.

**Request**:
```json
{
  "config": {...},
  "profiles": ["core"],
  "previousConfig": {...}
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "totalErrors": 0,
    "totalWarnings": 0,
    "errorsByType": {},
    "warningsByType": {},
    "criticalErrors": 0
  }
}
```

#### POST `/api/config/check-port-conflicts`
Check for port conflicts across services.

**Request**:
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": 16110,
    "KASPA_NODE_P2P_PORT": 16110
  },
  "profiles": ["core"]
}
```

**Response**:
```json
{
  "hasConflicts": true,
  "conflicts": [
    {
      "field": "KASPA_NODE_P2P_PORT",
      "message": "Port 16110 is already used by KASPA_NODE_RPC_PORT",
      "type": "port_conflict",
      "conflictsWith": "KASPA_NODE_RPC_PORT"
    }
  ]
}
```

## Testing

Created comprehensive test file: `services/wizard/backend/test-configuration-fields.js`

**Test Coverage**:
1. ✓ Configuration field registry loading
2. ✓ Field visibility resolver with single and multiple profiles
3. ✓ Configuration validator with valid config
4. ✓ Invalid port range detection
5. ✓ Port conflict detection
6. ✓ Network change warning generation
7. ✓ Required field validation
8. ✓ Field retrieval by key
9. ✓ Profile-specific field listing
10. ✓ Validation summary generation

**Test Results**: All tests pass successfully.

## Requirements Validated

### Requirement 3.9 (Kaspa Node Port Configuration)
✓ Implemented RPC port and P2P port configuration fields for Core and Archive Node profiles
✓ Default values: RPC 16110, P2P 16111
✓ Port range validation (1024-65535)

### Requirement 3.10 (Network Selection)
✓ Implemented network selection field (mainnet/testnet)
✓ Available for Core and Archive Node profiles
✓ Network change validation with warnings

### Requirement 3.11 (Data Directory Configuration)
✓ Implemented data directory fields for profiles with persistent data
✓ Core: KASPA_DATA_DIR
✓ Archive Node: KASPA_ARCHIVE_DATA_DIR
✓ Indexer Services: TIMESCALEDB_DATA_DIR
✓ Path validation

### Requirement 3.12 (Profile-Specific Field Visibility)
✓ Implemented visibility resolver that filters fields by selected profiles
✓ Fields organized by category (basic/advanced)
✓ Fields grouped by section (kaspa-node, database, network, advanced)
✓ Only relevant fields displayed for selected profiles

### Requirement 3.3 (Real-time Validation)
✓ Implemented comprehensive validation logic
✓ Field-level validation
✓ Configuration-level validation
✓ Specific error messages for each validation failure

### Requirement 4.6 (Port Range Validation)
✓ Implemented port range validation (1024-65535)
✓ Port conflict detection across all services
✓ Specific error messages for port issues

### Requirement 4.7 (Network Change Warning)
✓ Implemented network change detection
✓ Warning generation for mainnet ↔ testnet changes
✓ Explanation about data incompatibility

## File Structure

```
services/wizard/backend/
├── src/
│   ├── config/
│   │   └── configuration-fields.js          # NEW: Field registry
│   ├── utils/
│   │   ├── field-visibility-resolver.js     # NEW: Visibility logic
│   │   └── configuration-validator.js       # NEW: Validation logic
│   └── api/
│       └── config.js                        # UPDATED: New endpoints
└── test-configuration-fields.js             # NEW: Test file
```

## Usage Examples

### Frontend: Get Fields for Selected Profiles

```javascript
// Get visible fields for Core + Indexer Services
const response = await fetch('/api/config/fields', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profiles: ['core', 'indexer-services']
  })
});

const { fields, summary } = await response.json();

// Render fields by category and group
for (const [categoryId, category] of Object.entries(fields.categories)) {
  console.log(`Category: ${category.label}`);
  
  for (const [groupId, group] of Object.entries(category.groups)) {
    console.log(`  Group: ${group.label}`);
    
    for (const field of group.fields) {
      console.log(`    - ${field.label} (${field.key})`);
    }
  }
}
```

### Frontend: Validate Field on Change

```javascript
// Validate port field when user types
async function validatePort(value) {
  const response = await fetch('/api/config/validate-field', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'KASPA_NODE_RPC_PORT',
      value: value,
      config: currentConfig
    })
  });
  
  const { valid, errors } = await response.json();
  
  if (!valid) {
    showError(errors[0].message);
  }
}
```

### Frontend: Check Port Conflicts

```javascript
// Check for port conflicts before saving
async function checkConflicts(config) {
  const response = await fetch('/api/config/check-port-conflicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: config,
      profiles: selectedProfiles
    })
  });
  
  const { hasConflicts, conflicts } = await response.json();
  
  if (hasConflicts) {
    for (const conflict of conflicts) {
      showWarning(conflict.message);
    }
  }
}
```

### Frontend: Validate Complete Configuration

```javascript
// Validate before installation
async function validateConfiguration(config, previousConfig) {
  const response = await fetch('/api/config/validate-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: config,
      profiles: selectedProfiles,
      previousConfig: previousConfig
    })
  });
  
  const { valid, errors, warnings, summary } = await response.json();
  
  if (!valid) {
    showErrors(errors);
  }
  
  if (warnings.length > 0) {
    showWarnings(warnings);
  }
  
  return valid;
}
```

## Next Steps

### Task 2: Frontend Configuration UI Components
- Create Kaspa Node Configuration section
- Implement Port Configuration modal
- Add network change warning dialog
- Implement Advanced Options section
- Add profile-specific field visibility

### Task 3: Configuration State Management
- Extend configuration state model
- Implement configuration save/load
- Add configuration backup on changes

### Task 4: Backend API Enhancements
- Update configuration validation endpoint
- Enhance configuration generation
- Update configuration save endpoint

### Task 5: Docker Compose Configuration Generation
- Implement dynamic port configuration
- Apply network selection to services
- Configure data directory volumes

## Benefits

1. **Type Safety**: Centralized field definitions ensure consistency
2. **Validation**: Comprehensive validation prevents configuration errors
3. **Flexibility**: Easy to add new fields or profiles
4. **User Experience**: Real-time validation provides immediate feedback
5. **Maintainability**: Single source of truth for configuration fields
6. **Extensibility**: Easy to add new validation rules or field types

## Technical Decisions

### Why Separate Modules?
- **Separation of Concerns**: Each module has a single responsibility
- **Testability**: Easier to test individual components
- **Reusability**: Modules can be used independently
- **Maintainability**: Changes to one module don't affect others

### Why Profile-Specific Fields?
- **Relevance**: Users only see fields relevant to their selection
- **Simplicity**: Reduces cognitive load
- **Flexibility**: Easy to add profile-specific configuration

### Why Category and Group Organization?
- **Progressive Disclosure**: Basic options shown first, advanced hidden
- **Logical Grouping**: Related fields grouped together
- **Scalability**: Easy to add new categories or groups

## Related Files

- Requirements: `.kiro/specs/web-installation-wizard/requirements.md`
- Design: `.kiro/specs/web-installation-wizard/design.md`
- Tasks: `.kiro/specs/web-installation-wizard/tasks.md`

## Status

✅ **Task 1.1**: Configuration field registry - COMPLETE
✅ **Task 1.2**: Field visibility resolver - COMPLETE
✅ **Task 1.3**: Configuration validation logic - COMPLETE
✅ **Task 1**: Backend Configuration Field Definitions - COMPLETE

All subtasks completed successfully with comprehensive testing.
