# Reconfiguration Mode Specification Update

**Date**: 2024-12-20  
**Approach**: Option 1 - Unified Wizard with Mode-Based Flow  
**Affected Specs**: Web Installation Wizard, Management Dashboard

## Overview

Updated both the Web Installation Wizard and Management Dashboard specifications to implement a unified configuration management approach where:
- **Dashboard**: Monitoring-focused interface that detects configuration opportunities and launches the Wizard
- **Wizard**: Handles ALL configuration operations (install, reconfigure, remove, update)

## Key Changes

### Web Installation Wizard Spec

#### Requirements Updates (requirements.md)

**New Requirements Added:**

1. **Requirement 16: Profile Installation State Management**
   - Display installed profiles with visual indicators (checkmark, green border, "Installed ✓")
   - Separate "Currently Installed" and "Available to Add" sections
   - Show installation/running status for each profile
   - Provide "Modify Configuration" and "Remove Profile" options
   - Detect dependencies and warn about removal impacts
   - Offer integration options when adding profiles to existing installations

2. **Requirement 17: Advanced Configuration Management**
   - Per-indexer configuration (some to local node, some to public)
   - Support both URL switching and endpoint changes for Kaspa Apps
   - Comprehensive wallet management (create, import, configure)
   - Data removal options when removing profiles
   - Configuration validation against existing services
   - Developer Mode toggle for existing installations
   - Configuration templates for common scenarios

3. **Requirement 18: Reconfiguration User Experience**
   - Clear reconfiguration landing page with three main options
   - Contextual help based on current installation state
   - Before/after configuration comparisons
   - Downtime and restart requirement estimates
   - Configuration file preview before applying
   - Detailed progress tracking with rollback capability
   - Quick reconfiguration paths from Dashboard suggestions

**Enhanced Requirement 13:**
- Added reconfiguration mode landing page requirement
- Expanded to cover add/modify/remove profile workflows

**Updated Glossary:**
- Added: Reconfiguration_Mode, Profile_Installation_State, Configuration_Suggestion

#### Design Updates (design.md)

**New Architecture Sections:**

1. **Wizard Modes**
   - Initial Installation Mode
   - Reconfiguration Mode (NEW)
   - Update Mode (NEW)
   - Each with distinct entry points and workflows

2. **Reconfiguration Mode Architecture**
   - Mermaid diagram showing Dashboard → Wizard flow
   - Landing page with three action options
   - Profile management with installation state
   - Configuration modification workflows

**New Components:**

1. **Reconfiguration Landing Component**
   - Shows current installation summary
   - Displays configuration suggestions
   - Provides three main action cards (Add/Modify/Remove)

2. **Profile State Management Component**
   - ProfileWithState interface with installation status
   - Profile dependencies tracking
   - Management actions (modify/remove/add)
   - Data removal options

3. **Configuration Diff Component**
   - Before/after comparison
   - Affected services list
   - Estimated downtime
   - Impact assessment

**New API Endpoints:**

- `GET /api/wizard/installation-state` - Get current installation state
- `POST /api/wizard/reconfigure/preview` - Preview configuration changes
- `POST /api/wizard/reconfigure/apply` - Apply configuration changes
- `POST /api/wizard/profile/remove` - Remove profile with data options
- `GET /api/wizard/suggestions` - Get configuration suggestions
- `GET /api/wizard/profiles/state` - Get profiles with installation state
- `POST /api/wizard/profiles/validate-removal` - Validate profile removal
- `POST /api/wizard/profiles/validate-addition` - Validate profile addition
- `GET /api/wizard/backups` - List backups
- `POST /api/wizard/backup/create` - Create backup
- `POST /api/wizard/backup/restore` - Restore from backup

**New Data Models:**

- `InstallationState` - Complete installation state tracking
- `ProfileInstallationState` - Per-profile installation status
- `Backup` - Backup metadata and management
- `ReconfigurationWorkflow` - Reconfiguration process tracking
- `ConfigurationSuggestion` - Smart suggestions from Dashboard

**New UI Sections:**

1. **Reconfiguration Mode Steps**
   - Step 1: Reconfiguration Landing (with suggestions)
   - Step 2: Profile Selection with Installation State
   - Step 3: Configuration with Context Awareness
   - Step 4: Configuration Preview and Backup
   - Step 5: Apply Changes with Progress
   - Step 6: Validation and Completion

2. **Profile Removal Flow**
   - Removal confirmation dialog
   - Dependency warnings
   - Data management options
   - Impact assessment

### Management Dashboard Spec

#### Requirements Updates (requirements.md)

**Enhanced Requirement 9: Configuration Management Integration** (formerly "Reconfiguration Workflow Integration")

New acceptance criteria:
- Display configuration suggestions when optimization opportunities detected
- Provide "Configure in Wizard" buttons with pre-selected context
- Show configuration summary with installed profiles and key settings
- Detect wallet not configured and suggest setup
- Detect local indexers available but apps using public indexers
- Display configuration change history with descriptions

**Updated Glossary:**
- Added: Configuration_Suggestion, Reconfiguration_Mode
- Updated: Installation_Wizard description to emphasize it handles all configuration

#### Design Updates (design.md)

**New Sections:**

1. **Configuration Suggestion Detection**
   - `ConfigurationSuggestionEngine` class
   - Detects local indexers available
   - Detects wallet not configured
   - Detects updates available
   - Generates actionable suggestions with impact assessment

2. **Enhanced Wizard Launch Mechanism**
   - Support for pre-fill context from suggestions
   - `WizardContext` interface for passing context
   - Option to open in new window or same window
   - Polling for wizard completion

3. **Dashboard Configuration Panel**
   - New UI component showing current installation
   - Configuration suggestions with priority levels
   - Quick action buttons (Add/Modify/Remove Profiles)
   - View configuration file and backup options

**Updated Layout:**
- Added "Configuration Management" section between Services Status and Quick Actions
- Shows inline suggestions with "Configure in Wizard" buttons
- Profile management action buttons

## Implementation Benefits

### For Users

1. **Clear Separation of Concerns**
   - Dashboard = monitoring and suggestions
   - Wizard = all configuration operations

2. **Guided Experience**
   - Dashboard detects opportunities and guides users to Wizard
   - Wizard provides step-by-step configuration with validation

3. **Safety**
   - Automatic backups before changes
   - Dependency validation
   - Rollback capability
   - Impact assessment before applying changes

4. **Flexibility**
   - Per-indexer configuration (mix local and public)
   - Granular wallet management
   - Data preservation options on removal

### For Developers

1. **Single Source of Truth**
   - All configuration logic in Wizard
   - No duplication between Dashboard and Wizard
   - Easier to maintain and test

2. **State Management**
   - Comprehensive installation state tracking
   - Profile-level status management
   - Configuration history

3. **Extensibility**
   - Easy to add new configuration suggestions
   - Template system for common scenarios
   - Pluggable suggestion engine

## Next Steps

1. **Review Updated Requirements**
   - Verify all use cases are covered
   - Confirm acceptance criteria are testable
   - Validate glossary terms

2. **Review Updated Design**
   - Verify architecture supports all requirements
   - Confirm API endpoints are sufficient
   - Validate data models are complete

3. **Update Tasks**
   - Break down implementation into tasks
   - Prioritize reconfiguration mode features
   - Plan incremental delivery

4. **Implementation**
   - Start with core reconfiguration mode
   - Add profile state management
   - Implement configuration suggestions
   - Add advanced features (per-indexer config, wallet management)

## Files Modified

- `.kiro/specs/web-installation-wizard/requirements.md`
- `.kiro/specs/web-installation-wizard/design.md`
- `.kiro/specs/management-dashboard/requirements.md`
- `.kiro/specs/management-dashboard/design.md`

## Related Documents

- Original discussion: Option 1 - Unified Wizard with Mode-Based Flow
- User requirements clarification (inline answers)
- Architectural options comparison

---

**Status**: Specifications Updated ✓  
**Next**: Review and approve updated specs, then update tasks.md files
