# Wizard Template Integration Requirements

## Overview

This document defines how templates should integrate with the existing configuration system to ensure proper template-to-configuration mapping and seamless integration with the Installation Wizard. This analysis is part of task 1.2 for the wizard template-profile navigation fix.

## Current Template System Analysis

### 1. Template Data Sources

**Two Template Systems Currently Exist:**

1. **ProfileManager Templates** (`services/wizard/backend/src/utils/profile/ProfileManager.js`)
   - Integrated with ProfileManager class
   - Contains comprehensive template definitions
   - Includes resource calculations and validation
   - Supports custom template creation

2. **Simple Templates API** (`services/wizard/backend/src/api/simple-templates.js`)
   - Standalone template definitions
   - Bypasses ProfileManager to avoid circular references
   - Currently used by frontend template selection
   - Simpler structure, focused on essential data

### 2. Template Structure Comparison

**ProfileManager Template Structure:**
```javascript
{
  id: 'template-id',
  name: 'Template Name',
  description: 'Short description',
  longDescription: 'Detailed description',
  profiles: ['core', 'kaspa-user-applications'],
  category: 'beginner|intermediate|advanced',
  useCase: 'personal|advanced|development|mining|community',
  estimatedSetupTime: '5 minutes',
  syncTime: 'Not required',
  icon: '🚀',
  config: { /* configuration object */ },
  resources: {
    minMemory: 4, minCpu: 2, minDisk: 50,
    recommendedMemory: 8, recommendedCpu: 4, recommendedDisk: 200
  },
  features: ['Feature 1', 'Feature 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  customizable: true,
  tags: ['tag1', 'tag2'],
  developerMode: false // Optional
}
```

**Simple Templates API Structure:**
```javascript
{
  id: 'template-id',
  name: 'Template Name',
  description: 'Short description',
  longDescription: 'Detailed description',
  profiles: ['core', 'kaspa-user-applications'],
  category: 'beginner|intermediate|advanced',
  useCase: 'personal|advanced|development|mining|community',
  estimatedSetupTime: '5 minutes',
  syncTime: 'Not required',
  icon: '🚀',
  config: { /* configuration object */ },
  resources: { /* same as ProfileManager */ },
  features: ['Feature 1', 'Feature 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  customizable: true,
  tags: ['tag1', 'tag2'],
  developerMode: false // Optional
}
```

**Key Differences:**
- Structure is nearly identical
- Simple Templates API has hardcoded definitions
- ProfileManager templates support dynamic operations
- Both reference the same profile IDs

## Template Integration Requirements

### 1. Profile Reference Validation

**Requirement 1.1: Profile ID Consistency**
- All template profile references MUST map to existing profile definitions
- Template profiles MUST use exact profile IDs from ProfileManager
- Invalid profile references MUST be detected during template validation

**Current Profile IDs:**
- `core`: Kaspa node with optional wallet
- `kaspa-user-applications`: User-facing applications
- `indexer-services`: Local indexer services with TimescaleDB
- `archive-node`: Non-pruning Kaspa node
- `mining`: Mining stratum server

**Validation Logic:**
```javascript
validateTemplateProfiles(template) {
  const validProfiles = ['core', 'kaspa-user-applications', 'indexer-services', 'archive-node', 'mining'];
  const invalidProfiles = template.profiles.filter(p => !validProfiles.includes(p));
  
  if (invalidProfiles.length > 0) {
    throw new Error(`Template references invalid profiles: ${invalidProfiles.join(', ')}`);
  }
}
```

### 2. Configuration Mapping Requirements

**Requirement 2.1: Configuration Key Compatibility**
- Template configurations MUST use the same keys as profile-generated configurations
- Template config values MUST be compatible with existing validation rules
- Template configurations MUST not conflict with profile requirements

**Configuration Key Mapping:**

| Profile | Required Config Keys | Optional Config Keys |
|---------|---------------------|---------------------|
| `core` | `KASPA_NODE_RPC_PORT`, `KASPA_NODE_P2P_PORT` | `PUBLIC_NODE`, `KASPA_DATA_DIR` |
| `kaspa-user-applications` | None | `KASIA_APP_PORT`, `KSOCIAL_APP_PORT`, `EXPLORER_PORT` |
| `indexer-services` | `POSTGRES_USER`, `POSTGRES_PASSWORD` | `TIMESCALEDB_PORT`, `TIMESCALEDB_DATA_DIR` |
| `archive-node` | `KASPA_NODE_RPC_PORT`, `KASPA_NODE_P2P_PORT` | `KASPA_ARCHIVE_DATA_DIR` |
| `mining` | `STRATUM_PORT`, `MINING_ADDRESS` | `POOL_MODE` |

**Requirement 2.2: Configuration Merging Strategy**
- Template configuration takes precedence over profile defaults
- User modifications override template values
- Final configuration must pass profile validation
- Configuration merging must be deterministic and reversible

**Merging Logic:**
```javascript
mergeConfiguration(profileDefaults, templateConfig, userModifications) {
  // Step 1: Start with profile defaults
  let config = { ...profileDefaults };
  
  // Step 2: Apply template configuration (overrides defaults)
  config = { ...config, ...templateConfig };
  
  // Step 3: Apply user modifications (overrides template)
  config = { ...config, ...userModifications };
  
  return config;
}
```

### 3. Service Configuration Integration

**Requirement 3.1: Service Mapping Consistency**
- Template profiles MUST map to the same services as manual profile selection
- Service configuration MUST be identical regardless of selection method
- Docker compose generation MUST work with template-selected profiles

**Service Mapping Verification:**
```javascript
verifyServiceMapping(templateProfiles, manualProfiles) {
  const templateServices = getServicesForProfiles(templateProfiles);
  const manualServices = getServicesForProfiles(manualProfiles);
  
  // Services should be identical for same profile combinations
  return JSON.stringify(templateServices.sort()) === JSON.stringify(manualServices.sort());
}
```

**Requirement 3.2: Startup Order Preservation**
- Template-selected services MUST follow the same startup order as manual selection
- Service dependencies MUST be resolved identically
- Network configuration MUST be consistent

### 4. State Management Integration

**Requirement 4.1: State Structure Compatibility**
- Template application MUST produce the same state structure as profile selection
- State transitions MUST be reversible and trackable
- Navigation path MUST be preserved in state

**Required State Properties:**
```javascript
{
  // Core selection data
  selectedProfiles: ['core', 'kaspa-user-applications'],
  configuration: { /* merged configuration */ },
  
  // Template-specific data
  selectedTemplate: 'home-node', // null for manual selection
  templateApplied: true, // false for manual selection
  navigationPath: 'template', // 'template' | 'custom' | null
  
  // Navigation history
  navigationHistory: [1, 2, 3, 4], // step history for back navigation
  
  // Wizard context
  wizardMode: 'install' // 'install' | 'reconfigure'
}
```

**Requirement 4.2: State Validation**
- State consistency MUST be validated before proceeding to configuration
- Conflicting state MUST be detected and resolved
- State recovery MUST be possible from invalid states

### 5. Configuration Form Integration

**Requirement 5.1: Form Population Compatibility**
- Template configurations MUST populate form fields correctly
- Form field visibility MUST be based on selected profiles (not template)
- Form validation MUST work with template-provided values

**Form Integration Logic:**
```javascript
populateConfigurationForm(config, profiles) {
  // Populate fields based on configuration values
  populateFieldsFromConfig(config);
  
  // Show/hide sections based on profiles (not template)
  updateFormVisibility(profiles);
  
  // Apply validation rules
  setupFormValidation(profiles);
}
```

**Requirement 5.2: User Modification Support**
- Users MUST be able to modify template-provided configuration
- Modified values MUST override template defaults
- Form state MUST track which values were modified by user

### 6. Validation Integration

**Requirement 6.1: Template Validation**
- Templates MUST be validated before application
- Template profiles MUST pass dependency validation
- Template configuration MUST pass profile-specific validation

**Validation Workflow:**
```javascript
async validateTemplate(templateId) {
  const template = getTemplate(templateId);
  
  // Validate profile references
  validateProfileReferences(template.profiles);
  
  // Validate profile dependencies
  const validation = validateProfileSelection(template.profiles);
  if (!validation.valid) {
    throw new Error(`Profile validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Validate configuration
  const configValidation = validateConfiguration(template.config, template.profiles);
  if (!configValidation.valid) {
    throw new Error(`Configuration validation failed: ${configValidation.errors.join(', ')}`);
  }
  
  return { valid: true, template };
}
```

**Requirement 6.2: Runtime Validation**
- Applied template configuration MUST pass runtime validation
- Configuration changes MUST be validated against template constraints
- Validation errors MUST provide clear recovery options

### 7. Backward Compatibility Requirements

**Requirement 7.1: Existing Installation Support**
- Existing profile-based installations MUST continue to work
- Configuration migration MUST be seamless
- No breaking changes to existing APIs

**Requirement 7.2: Profile Selection Fallback**
- Manual profile selection MUST remain available
- Template failures MUST fallback to manual selection
- Users MUST be able to switch between template and manual modes

### 8. Template Data Synchronization

**Requirement 8.1: Single Source of Truth**
- Template definitions MUST be synchronized between ProfileManager and Simple Templates API
- Changes to templates MUST be reflected in both systems
- Template data MUST be consistent across all access points

**Requirement 8.2: Template Updates**
- Template updates MUST not break existing installations
- Template versioning MUST be supported for compatibility
- Template deprecation MUST be handled gracefully

## Implementation Strategy

### 1. Template Data Unification

**Approach: Consolidate Template Sources**
- Use ProfileManager as the single source of truth for templates
- Update Simple Templates API to proxy ProfileManager data
- Ensure consistent template structure across all access points

**Implementation:**
```javascript
// Simple Templates API becomes a proxy
router.get('/all', (req, res) => {
  try {
    const profileManager = new ProfileManager();
    const templates = profileManager.getAllTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Configuration Integration Enhancement

**Approach: Enhance Configuration Merging**
- Implement robust configuration merging with precedence rules
- Add configuration source tracking (template vs user vs default)
- Enhance validation to support template-specific requirements

**Implementation:**
```javascript
class ConfigurationManager {
  mergeConfigurations(sources) {
    const { profileDefaults, templateConfig, userModifications } = sources;
    
    const merged = {};
    const metadata = {};
    
    // Apply in order of precedence
    Object.keys(profileDefaults).forEach(key => {
      merged[key] = profileDefaults[key];
      metadata[key] = { source: 'profile', overridden: false };
    });
    
    Object.keys(templateConfig).forEach(key => {
      if (merged[key] !== templateConfig[key]) {
        metadata[key] = { source: 'template', overridden: false };
      }
      merged[key] = templateConfig[key];
    });
    
    Object.keys(userModifications).forEach(key => {
      if (merged[key] !== userModifications[key]) {
        metadata[key].overridden = true;
        metadata[key].userValue = userModifications[key];
      }
      merged[key] = userModifications[key];
    });
    
    return { configuration: merged, metadata };
  }
}
```

### 3. State Management Enhancement

**Approach: Add Navigation Path Tracking**
- Extend state manager with navigation path support
- Add template application tracking
- Implement state consistency validation

**Implementation:**
```javascript
class WizardStateManager {
  setNavigationPath(path) {
    this.set('navigationPath', path);
    this.validateStateConsistency();
  }
  
  applyTemplate(templateId, template) {
    this.set('selectedTemplate', templateId);
    this.set('selectedProfiles', template.profiles);
    this.set('configuration', template.config);
    this.set('templateApplied', true);
    this.set('navigationPath', 'template');
    this.validateStateConsistency();
  }
  
  validateStateConsistency() {
    const navigationPath = this.get('navigationPath');
    const templateApplied = this.get('templateApplied');
    const selectedTemplate = this.get('selectedTemplate');
    
    // Validate template path consistency
    if (navigationPath === 'template') {
      if (!templateApplied || !selectedTemplate) {
        throw new Error('Invalid template path state');
      }
    }
    
    // Validate custom path consistency
    if (navigationPath === 'custom') {
      if (templateApplied || selectedTemplate) {
        throw new Error('Invalid custom path state');
      }
    }
  }
}
```

### 4. Form Integration Enhancement

**Approach: Profile-Based Form Management**
- Base form visibility on selected profiles, not template
- Support template configuration pre-population
- Track user modifications separately from template values

**Implementation:**
```javascript
class ConfigurationForm {
  initialize(profiles, templateConfig = {}) {
    // Show/hide sections based on profiles
    this.updateFormVisibility(profiles);
    
    // Pre-populate with template configuration
    if (Object.keys(templateConfig).length > 0) {
      this.populateFromTemplate(templateConfig);
    }
    
    // Setup validation based on profiles
    this.setupValidation(profiles);
  }
  
  populateFromTemplate(templateConfig) {
    Object.keys(templateConfig).forEach(key => {
      const field = this.getField(key);
      if (field) {
        field.value = templateConfig[key];
        field.dataset.source = 'template';
      }
    });
  }
}
```

## Validation and Testing Requirements

### 1. Template Validation Tests

**Test Categories:**
- Profile reference validation
- Configuration key compatibility
- Service mapping consistency
- State management integration
- Form population accuracy

**Example Test:**
```javascript
describe('Template Integration', () => {
  test('template profiles map to existing profiles', () => {
    const templates = getAllTemplates();
    const validProfiles = getValidProfileIds();
    
    templates.forEach(template => {
      template.profiles.forEach(profileId => {
        expect(validProfiles).toContain(profileId);
      });
    });
  });
  
  test('template configuration is compatible with profiles', () => {
    const templates = getAllTemplates();
    
    templates.forEach(template => {
      const validation = validateConfiguration(template.config, template.profiles);
      expect(validation.valid).toBe(true);
    });
  });
});
```

### 2. Integration Tests

**Test Scenarios:**
- Template application → Configuration → Installation
- Manual selection → Configuration → Installation
- Template → Manual switch → Configuration
- Configuration modification after template application

### 3. Backward Compatibility Tests

**Test Requirements:**
- Existing profile-based configurations continue to work
- Template application doesn't break existing installations
- Configuration migration is seamless

## Success Criteria

### 1. Functional Requirements

✅ **Template Profile Mapping**: All template profiles reference valid profile definitions
✅ **Configuration Compatibility**: Template configurations work with existing validation
✅ **Service Integration**: Template-selected services work identically to manual selection
✅ **State Management**: Template application produces consistent state structure
✅ **Form Integration**: Template configurations populate forms correctly

### 2. Quality Requirements

✅ **Backward Compatibility**: Existing installations continue to work
✅ **Data Consistency**: Template data is synchronized across all access points
✅ **Error Handling**: Template failures provide clear recovery options
✅ **Performance**: Template operations don't impact wizard performance
✅ **Maintainability**: Template system is easy to extend and modify

### 3. User Experience Requirements

✅ **Seamless Integration**: Users can't distinguish between template and manual paths in Configuration step
✅ **Modification Support**: Users can modify template-provided configuration
✅ **Clear Feedback**: Users understand which values came from templates
✅ **Recovery Options**: Users can switch between template and manual modes

## Conclusion

The template integration requirements focus on ensuring seamless compatibility between template-based and manual profile selection while maintaining the robustness of the existing configuration system. The key is to treat templates as a convenience layer that produces the same results as manual selection, ensuring that all downstream processes (configuration, validation, installation) work identically regardless of the selection method.

The integration strategy emphasizes:
1. **Profile Compatibility**: Templates must map to existing profiles
2. **Configuration Consistency**: Template configs must be compatible with profile requirements
3. **State Management**: Template application must produce consistent state
4. **Backward Compatibility**: Existing installations must continue to work
5. **User Experience**: Template and manual paths must converge seamlessly

By following these requirements, the template system will integrate smoothly with the existing wizard infrastructure while providing the improved user experience of template-first navigation.