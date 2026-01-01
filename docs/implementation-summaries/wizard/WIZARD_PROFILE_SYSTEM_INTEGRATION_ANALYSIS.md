# Wizard Profile System Integration Analysis

## Overview

This document analyzes the existing profile system integration in the Installation Wizard to understand how profiles currently pass configuration to the Configuration step. This analysis is part of task 1.1 for the wizard template-profile navigation fix.

## Current Profile System Architecture

### 1. Profile Definition and Management

**ProfileManager Class** (`services/wizard/backend/src/utils/profile/ProfileManager.js`)
- Contains hardcoded profile definitions with services, dependencies, resources, and configuration requirements
- Manages both profiles and templates in a single class
- Provides methods for profile validation, dependency resolution, and startup order calculation

**Key Profiles:**
- `core`: Kaspa node with optional wallet
- `kaspa-user-applications`: User-facing apps (Kasia, K-Social, Kaspa Explorer)
- `indexer-services`: Local indexers with TimescaleDB
- `archive-node`: Non-pruning Kaspa node
- `mining`: Mining stratum server

### 2. Configuration Generation Flow

**Current Flow:**
1. **Profile Selection** → User selects profiles in step 5
2. **Configuration Request** → Frontend calls `/api/config/default` with selected profiles
3. **Config Generation** → Backend uses `ConfigGenerator.generateDefaultConfig(profiles)` 
4. **Form Population** → Configuration form is populated with generated values
5. **User Customization** → User can modify configuration values
6. **Validation & Save** → Configuration is validated and saved for installation

**Key Components:**

**Frontend Configuration Module** (`services/wizard/frontend/public/scripts/modules/configure.js`)
- `loadConfigurationForm()`: Loads configuration based on selected profiles
- `populateConfigurationForm(config)`: Populates form fields with configuration values
- `gatherConfigurationFromForm()`: Collects user input from form
- `validateConfiguration()`: Validates configuration client and server-side

**Backend Config API** (`services/wizard/backend/src/api/config.js`)
- `POST /config/default`: Generates default configuration for selected profiles
- `POST /config/validate`: Validates configuration against profiles
- `POST /config/save`: Saves configuration for installation

**Config Generator** (`services/wizard/backend/src/utils/config-generator.js`)
- `generateDefaultConfig(profiles)`: Creates default configuration based on profile requirements
- Maps profile requirements to specific configuration keys
- Handles conditional configuration based on profile combinations

### 3. Profile-to-Configuration Mapping

**Configuration Generation Logic:**
```javascript
generateDefaultConfig(profiles) {
  const config = {
    PUBLIC_NODE: false,
    KASPA_P2P_PORT: 16110,
    KASPA_RPC_PORT: 16111,
    // ... base config
  };

  // Add Kaspa Node configuration if needed
  if (profiles.includes('core') || profiles.includes('archive-node')) {
    config.KASPA_NODE_RPC_PORT = 16110;
    config.KASPA_NODE_P2P_PORT = 16111;
    config.KASPA_NETWORK = 'mainnet';
    // ... node-specific config
  }

  // Add database passwords if needed
  if (profiles.includes('indexer-services')) {
    config.POSTGRES_USER = 'kaspa';
    config.POSTGRES_PASSWORD = this.generateSecurePassword();
    // ... database config
  }

  // ... other profile-specific configurations
  return config;
}
```

**Profile-Specific Configuration Keys:**
- **Core Profile**: `KASPA_NODE_RPC_PORT`, `KASPA_NODE_P2P_PORT`, `KASPA_NETWORK`, `KASPA_DATA_DIR`
- **Indexer Services**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `TIMESCALEDB_DATA_DIR`
- **Archive Node**: `KASPA_ARCHIVE_DATA_DIR`, `ARCHIVE_POSTGRES_*`
- **Mining**: `STRATUM_PORT`, `MINING_ADDRESS`

### 4. Service Configuration Mapping

**Profile to Docker Compose Generation:**
1. **Profile Selection** → Determines which services to include
2. **Configuration Values** → Provides environment variables for services
3. **Docker Compose Generation** → Creates service definitions with proper configuration
4. **Service Dependencies** → Ensures correct startup order and networking

**Service Mapping Examples:**
- `core` profile → `kaspa-node` service with RPC/P2P ports
- `indexer-services` profile → `timescaledb`, `kasia-indexer`, `k-indexer`, `simply-kaspa-indexer` services
- `kaspa-user-applications` profile → `kasia-app`, `k-social-app`, `kaspa-explorer` services

### 5. State Management Integration

**State Flow:**
1. **Profile Selection**: Stored in `stateManager.get('selectedProfiles')`
2. **Configuration Generation**: Based on selected profiles
3. **Configuration Storage**: Stored in `stateManager.get('configuration')`
4. **Installation Handoff**: Both profiles and configuration passed to installation step

**Key State Properties:**
- `selectedProfiles`: Array of selected profile IDs
- `configuration`: Generated/customized configuration object
- `wizardMode`: Current wizard mode (install/reconfigure)

## Current Template System Integration

### 1. Template Definition

**Simple Templates API** (`services/wizard/backend/src/api/simple-templates.js`)
- Contains hardcoded template definitions
- Each template specifies profiles and configuration
- Templates bypass ProfileManager to avoid circular references

**Template Structure:**
```javascript
{
  id: 'template-id',
  name: 'Template Name',
  profiles: ['core', 'kaspa-user-applications'], // Maps to existing profiles
  config: {
    KASPA_NODE_RPC_PORT: 16110,
    PUBLIC_NODE: 'false',
    // ... template-specific config
  },
  resources: { minMemory: 4, minCpu: 2, minDisk: 50 }
}
```

### 2. Template Application Flow

**Current Template Flow:**
1. **Template Selection** → User selects template in step 4
2. **Template Application** → Frontend calls `/api/simple-templates/{id}/apply`
3. **Config Merging** → Backend merges template config with base config
4. **State Storage** → Template profiles and config stored in state
5. **Navigation** → Direct navigation to Configuration step (skips Profile step)

**Template Application Logic:**
```javascript
// Backend: simple-templates.js
router.post('/:templateId/apply', (req, res) => {
  const { baseConfig } = req.body;
  const template = templates[templateId];
  
  // Merge base config with template config (template takes precedence)
  const config = { ...baseConfig, ...template.config };
  
  res.json({
    success: true,
    config,
    profiles: template.profiles,
    template: { id, name, category }
  });
});

// Frontend: template-selection.js
async applyTemplate(templateId) {
  // Apply template and get merged config
  const applyResult = await fetch(`/api/simple-templates/${templateId}/apply`);
  
  // Store in state
  stateManager.set('selectedTemplate', templateId);
  stateManager.set('selectedProfiles', template.profiles);
  stateManager.set('configuration', applyResult.config);
  
  // Navigate directly to Configuration step (skip Profile step)
  goToStep(6);
}
```

## Integration Points and Compatibility

### 1. Configuration Step Integration

**Template Path:**
- Templates provide both profiles and configuration
- Configuration step receives pre-populated configuration
- Form fields are populated using `populateConfigurationForm(config)`
- User can still modify configuration values

**Profile Path:**
- Profiles selected manually in step 5
- Configuration generated via `/api/config/default` endpoint
- Form populated with generated defaults
- User can modify configuration values

**Common Integration Point:**
Both paths converge at the Configuration step with:
- `selectedProfiles`: Array of profile IDs
- `configuration`: Configuration object (pre-populated or generated)

### 2. Installation Step Compatibility

**Shared Requirements:**
- Both template and profile paths produce the same state structure
- Installation step expects `selectedProfiles` and `configuration`
- Docker compose generation works with both approaches
- Service configuration mapping is identical

**Backward Compatibility:**
- Existing profile-based installations continue to work
- Template profiles map to existing profile definitions
- Configuration keys are consistent between approaches

### 3. State Management Compatibility

**Current State Structure:**
```javascript
{
  selectedProfiles: ['core', 'kaspa-user-applications'],
  configuration: {
    KASPA_NODE_RPC_PORT: 16110,
    PUBLIC_NODE: false,
    // ... other config
  },
  selectedTemplate: 'home-node', // Only set for template path
  wizardMode: 'install'
}
```

**Template vs Profile State:**
- Template path: Sets `selectedTemplate`, `selectedProfiles`, and `configuration`
- Profile path: Sets `selectedProfiles` and `configuration` (no `selectedTemplate`)
- Both approaches produce compatible state for downstream steps

## Key Findings

### 1. Integration Strengths

✅ **Compatible Data Structures**: Templates and profiles produce identical state structure
✅ **Shared Configuration System**: Both use same configuration generation and validation
✅ **Common Installation Path**: Both approaches work with existing installation logic
✅ **Backward Compatibility**: Existing profile-based configurations continue to work

### 2. Current Issues

❌ **Navigation Confusion**: Both template and profile steps are visible in main flow
❌ **Duplicate Selection Methods**: Users see both template and profile selection
❌ **Inconsistent Back Navigation**: Back button behavior varies by path taken
❌ **State Management Gaps**: No clear indication of which path was used

### 3. Integration Requirements for Templates

**Template-to-Configuration Integration:**
1. Templates must map to existing profile definitions
2. Template configuration must be compatible with existing config system
3. Template application must populate configuration form correctly
4. Template state must be preserved through wizard flow

**Configuration Merging Strategy:**
1. Template config takes precedence over defaults
2. User modifications override template values
3. Validation applies to final merged configuration
4. Installation uses final configuration regardless of source

## Recommendations for Template Integration

### 1. Maintain Profile System Compatibility

- Keep existing profile definitions as the source of truth
- Ensure template profiles reference existing profile IDs
- Preserve existing configuration generation logic
- Maintain backward compatibility with profile-based installations

### 2. Enhance State Management

- Add navigation path tracking (`template` vs `custom`)
- Preserve template selection information throughout flow
- Clear conflicting state when switching between paths
- Add validation for state consistency

### 3. Improve Configuration Integration

- Ensure template configurations are validated against profile requirements
- Maintain configuration merging precedence (template → user modifications)
- Preserve template context in configuration step
- Support configuration export/import for both paths

### 4. Streamline Navigation Flow

- Make templates the primary selection method
- Hide profile step from main navigation
- Implement smart back navigation based on path taken
- Provide clear visual indicators for selected path

## Conclusion

The existing profile system provides a solid foundation for template integration. The key integration points (configuration generation, state management, and installation handoff) are already compatible with template-based selection. The main challenges are navigation flow and user experience rather than technical compatibility.

The template system successfully maps to existing profiles and configuration structures, ensuring that template-selected configurations work seamlessly with the existing Configuration and Installation steps. The integration strategy should focus on improving the user experience while preserving the robust underlying architecture.