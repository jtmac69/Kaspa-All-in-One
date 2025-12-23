# Implementation Plan: Enhanced Configuration Options

## Overview

This implementation plan adds profile-specific configuration options to the wizard, including Kaspa node ports, network selection, and data directory configuration. The approach uses progressive disclosure to keep the UI simple while providing advanced control when needed.

## Tasks

- [x] 1. Backend: Configuration Field Definitions
  - Create profile-specific configuration field definitions
  - Define validation rules for each field type
  - Implement field visibility logic based on selected profiles
  - _Requirements: 3.9, 3.10, 3.11, 3.12_

- [x] 1.1 Create configuration field registry
  - Define ConfigField interface with category, group, and visibility properties
  - Create PROFILE_CONFIG_FIELDS constant with Core, Archive Node, and Indexer Services fields
  - Add port validation rules (range 1024-65535)
  - Add network selection options (mainnet, testnet)
  - _Requirements: 3.9, 3.10, 3.12_

- [x] 1.2 Implement field visibility resolver
  - Create function to filter fields based on selected profiles
  - Group fields by category (basic, advanced)
  - Group fields by section (kaspa-node, database, network)
  - Return only relevant fields for current profile selection
  - _Requirements: 3.12_

- [x] 1.3 Add configuration validation logic
  - Implement port range validation (1024-65535)
  - Implement port conflict detection across all services
  - Add network change validation with warning generation
  - Validate data directory paths
  - _Requirements: 3.3, 4.6, 4.7_

- [x] 2. Frontend: Configuration UI Components
  - Create profile-specific configuration sections
  - Implement basic/advanced toggle
  - Add port configuration modal
  - Add network selection with warning dialog
  - _Requirements: 3.9, 3.10, 3.11, 3.12_

- [x] 2.1 Create Kaspa Node Configuration section
  - Add section that appears when Core or Archive Node profile is selected
  - Add network selector dropdown (mainnet/testnet) in basic section
  - Add "Configure Ports" button that opens modal
  - Display current port values (RPC: 16110, P2P: 16111)
  - _Requirements: 3.9, 3.10, 3.12_

- [x] 2.2 Implement Port Configuration modal
  - Create modal dialog with RPC and P2P port input fields
  - Show default values (16110, 16111)
  - Add real-time validation with error messages
  - Check for port conflicts with other services
  - Add "Reset to Defaults" button
  - _Requirements: 3.9, 4.2, 4.6_

- [x] 2.3 Add network change warning dialog
  - Detect when network selection changes from current value
  - Show warning modal about data incompatibility
  - Explain that changing networks requires fresh installation
  - Provide "Cancel" and "Change Network" options
  - _Requirements: 4.7_

- [x] 2.4 Implement Advanced Options section
  - Add collapsible "Advanced Options" section
  - Show data directory fields for selected profiles
  - Add Kaspa node data directory field (Core/Archive profiles)
  - Add TimescaleDB data directory field (Indexer Services profile)
  - Keep existing custom environment variables textarea
  - _Requirements: 3.11, 3.12_

- [x] 2.5 Add profile-specific field visibility
  - Implement reactive field visibility based on selected profiles
  - Show Kaspa Node section only when Core or Archive Node selected
  - Show database data directory only when Indexer Services selected
  - Update visibility when profile selection changes
  - _Requirements: 3.12_

- [x] 3. Configuration State Management
  - Update state manager to handle new configuration fields
  - Implement configuration persistence
  - Add configuration loading for reconfiguration mode
  - _Requirements: 3.1, 3.2, 7.1, 7.2, 13.1_

- [x] 3.1 Extend configuration state model
  - Add KASPA_NODE_RPC_PORT to state (default: 16110)
  - Add KASPA_NODE_P2P_PORT to state (default: 16111)
  - Add KASPA_NETWORK to state (default: 'mainnet')
  - Add data directory fields to state
  - Maintain backward compatibility with existing configurations
  - _Requirements: 3.9, 3.10, 3.11_

- [x] 3.2 Implement configuration save/load
  - Save new fields to .env file with proper formatting
  - Save new fields to installation-config.json
  - Load existing configuration values when in reconfiguration mode
  - Pre-populate form fields with loaded values
  - _Requirements: 7.1, 7.2, 13.1, 13.3_

- [x] 3.3 Add configuration backup on changes
  - Create timestamped backup before applying configuration changes
  - Store backup in .kaspa-backups/ directory
  - Include both .env and installation-config.json in backup
  - _Requirements: 7.4, 13.4_

- [x] 4. Backend API Enhancements
  - Update configuration validation endpoint
  - Add port conflict detection API
  - Enhance configuration generation
  - _Requirements: 3.3, 4.2, 4.6_

- [x] 4.1 Enhance /api/wizard/config/validate endpoint
  - Validate port ranges (1024-65535)
  - Check for port conflicts across all services
  - Validate network selection value
  - Validate data directory paths
  - Return specific error messages for each validation failure
  - _Requirements: 3.3, 4.6_

- [x] 4.2 Update /api/wizard/config/save endpoint
  - Generate .env file with new configuration fields
  - Include KASPA_NODE_RPC_PORT, KASPA_NODE_P2P_PORT
  - Include KASPA_NETWORK selection
  - Include data directory configurations
  - Apply profile-specific defaults
  - _Requirements: 3.9, 3.10, 3.11, 7.1_

- [x] 4.3 Enhance /api/wizard/config/load endpoint
  - Load existing port configurations from .env
  - Load network selection from .env
  - Load data directory configurations
  - Return configuration in format expected by frontend
  - _Requirements: 7.3, 13.1_

- [x] 5. Docker Compose Configuration Generation
  - Update docker-compose.yml generation to use configured ports
  - Apply network selection to Kaspa node services
  - Configure volume mounts for data directories
  - _Requirements: 3.9, 3.10, 3.11_

- [x] 5.1 Implement dynamic port configuration
  - Replace hardcoded ports with configuration values
  - Apply KASPA_NODE_RPC_PORT to kaspa-node service
  - Apply KASPA_NODE_P2P_PORT to kaspa-node service
  - Update dependent services to use configured ports
  - _Requirements: 3.9_

- [x] 5.2 Apply network selection to services
  - Add --testnet flag to kaspa-node when testnet selected
  - Update network configuration in docker-compose.yml
  - Configure appropriate network endpoints
  - _Requirements: 3.10_

- [x] 5.3 Configure data directory volumes
  - Create volume definitions for configured data directories
  - Apply KASPA_DATA_DIR to kaspa-node volume mount
  - Apply KASPA_ARCHIVE_DATA_DIR to archive-node volume mount
  - Apply TIMESCALEDB_DATA_DIR to timescaledb volume mount
  - _Requirements: 3.11_

- [x] 6. Testing and Validation
  - Write unit tests for configuration validation
  - Write integration tests for configuration flow
  - Test profile-specific field visibility
  - Test port conflict detection
  - Test network change warnings
  - _Requirements: All_

- [x] 6.1 Unit tests for configuration validation
  - Test port range validation (valid: 1024-65535, invalid: <1024, >65535)
  - Test port conflict detection (same port assigned to multiple services)
  - Test network selection validation (valid: mainnet/testnet, invalid: other)
  - Test data directory path validation
  - _Requirements: 3.3, 4.6_

- [x] 6.2 Integration tests for configuration UI
  - Test Kaspa Node section appears when Core profile selected
  - Test Kaspa Node section appears when Archive Node profile selected
  - Test Kaspa Node section hidden when only other profiles selected
  - Test port configuration modal opens and saves values
  - Test network change warning appears when network changed
  - Test advanced options show/hide toggle
  - _Requirements: 3.12, 4.7_

- [x] 6.3 End-to-end configuration flow test
  - Select Core profile
  - Configure custom RPC port (16210)
  - Configure custom P2P port (16211)
  - Select testnet network
  - Configure custom data directory
  - Complete installation
  - Verify .env contains correct values
  - Verify docker-compose.yml uses correct ports and network
  - _Requirements: 3.9, 3.10, 3.11, 7.1_

- [x] 7. Documentation Updates
  - Update TESTING.md to reflect new configuration options
  - Update user documentation
  - Add configuration examples
  - _Requirements: All_

- [x] 7.1 Update TESTING.md Core Profile test
  - Update Step 4: Configuration section
  - Document network selection option
  - Document port configuration modal
  - Document data directory configuration in advanced options
  - Add test cases for port validation
  - Add test cases for network change warning
  - _Requirements: 3.9, 3.10, 3.11, 4.7_

- [x] 7.2 Create configuration guide
  - Document all available configuration options
  - Explain basic vs advanced options
  - Provide examples for common scenarios
  - Document port configuration best practices
  - Explain mainnet vs testnet differences
  - _Requirements: 3.12_

- [x] 8.11 Implement Infrastructure Validation System
  - Add comprehensive infrastructure testing after installation
  - Integrate test-nginx.sh and test-timescaledb.sh execution
  - Create InfrastructureValidationResult interface with categorized results
  - Display pass/fail/warn status for configuration, security, performance, and database tests
  - Add retry options for failed infrastructure tests
  - Show detailed test results with remediation steps for failures
  - _Requirements: 6.1, 6.2, 6.3, 6.7_

- [x] 8.12 Implement Profile Templates and Presets System
  - Create preset templates (Home Node, Public Node, Developer Setup, Full Stack)
  - Add template selection interface with descriptions and resource requirements
  - Allow customization of template settings before application
  - Implement template save/load functionality for custom configurations
  - Add template validation and conflict detection
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8.13 Implement Enhanced Validation and Troubleshooting
  - Add guided troubleshooting system with context-specific steps
  - Implement automatic retry mechanisms for transient failures
  - Create diagnostic export functionality with system info and logs
  - Add "Get Help" option with system diagnostic export
  - Implement fallback options for Core Profile node failures
  - _Requirements: 6.6, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8.14 Implement Kaspa Brand Visual Design (refer to the web-installation-wizard/BRAND-DESIGN-GUIDE.md)
  - Apply official Kaspa brand colors (#70C7BA primary, #49C8B5 dark, #9FE7DC light)
  - Implement Kaspa typography (Montserrat headings, Open Sans body)
  - Add official Kaspa logo integration from media kit
  - Create branded component styling (cards, buttons, progress bars, status indicators)
  - Implement Kaspa gradient themes and visual elements
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 8. Implement Reconfiguration Mode Features
  - Add reconfiguration mode entry point and navigation
  - Implement profile state detection and display
  - Add profile management workflows (add, remove, modify)
  - _Requirements: 16, 17, 18_

- [x] 8.1 Create Reconfiguration Mode Landing Page
  - Add /reconfigure route with dedicated landing page
  - Display explanation of reconfiguration options
  - Show "Currently Installed" vs "Available to Add" profile sections
  - Add visual indicators for installed profiles (checkmark badge, green styling)
  - Add "Installed ✓" status text for active profiles
  - Implement navigation to profile selection with mode context
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 8.2 Implement Profile State Detection System
  - Create ProfileStateManager class to detect installed profiles
  - Check docker-compose.yml for active services
  - Check .env file for profile-specific configurations
  - Implement service health checking for running status
  - Add profile installation status API endpoint
  - Cache profile state with periodic refresh
  - _Requirements: 16.5, 16.6, 17.1, 17.2_

- [x] 8.3 Enhance Profile Selection for Reconfiguration Mode
  - Update profile selection page to show installation status
  - Add separate sections for "Currently Installed" and "Available to Add"
  - Implement different visual styling for installed profiles
  - Add profile action selection (Add, Remove, Modify Configuration)
  - Show profile dependencies and impact warnings
  - Add confirmation dialogs for removal operations
  - _Requirements: 16.7, 16.8, 17.3, 17.4, 17.5_

- [x] 8.4 Implement Profile Addition Workflow
  - Allow selection of new profiles to add to existing installation
  - Show integration options with existing profiles
  - Configure indexer connections (local node vs public network)
  - Handle service dependencies and startup order
  - Generate incremental docker-compose updates
  - Implement service integration testing
  - _Requirements: 17.6, 17.7, 17.8, 18.1, 18.2_

- [x] 8.5 Implement Profile Removal Workflow
  - Add profile removal confirmation with impact explanation
  - Offer data retention vs deletion options
  - Show dependent services that will be affected
  - Implement graceful service shutdown
  - Remove profile-specific configurations from .env
  - Update docker-compose.yml to remove services
  - Create backup before removal operations
  - _Requirements: 17.9, 17.10, 17.11, 17.12, 18.3, 18.4_
  - **Status: COMPLETED** ✅

- [x] 8.6 Implement Configuration Modification Workflow
  - Allow modification of existing profile configurations
  - Pre-populate forms with current configuration values
  - Show configuration change impact and required restarts
  - Support indexer URL changes and endpoint modifications
  - Support wallet configuration updates (create, import, configure)
  - Implement configuration validation against existing setup
  - Apply changes with minimal service disruption
  - _Requirements: 17.13, 17.14, 17.15, 18.5, 18.6, 18.7, 18.8_

- [x] 8.7 Implement Advanced Configuration Options
  - Add indexer connection flexibility (mixed local/public)
  - Support partial indexer configurations
  - Allow switching between indexer endpoints
  - Support wallet management across all profiles
  - Add custom environment variable management
  - Implement configuration templates and presets
  - _Requirements: 18.9, 18.10, 18.11, 18.12_

- [x] 8.8 Add Reconfiguration Mode Navigation and UX
  - Update main navigation to include reconfiguration entry
  - Add breadcrumb navigation for reconfiguration flows
  - Implement progress indicators for multi-step operations
  - Add operation status feedback and completion notifications
  - Create help tooltips and contextual guidance
  - Add operation history and rollback options
  - _Requirements: 16.9, 17.16, 18.13_

- [x] 8.9 Implement Reconfiguration API Endpoints
  - Add GET /api/wizard/profiles/status endpoint
  - Add POST /api/wizard/profiles/add endpoint
  - Add DELETE /api/wizard/profiles/remove endpoint
  - Add PUT /api/wizard/profiles/configure endpoint
  - Add POST /api/wizard/reconfigure/validate endpoint
  - Add GET /api/wizard/reconfigure/history endpoint
  - Implement operation progress tracking
  - _Requirements: 16.10, 17.17, 18.14_

- [x] 8.10 Write Tests for Reconfiguration Mode
  - Test profile state detection accuracy
  - Test reconfiguration landing page display
  - Test profile addition with existing installations
  - Test profile removal with data options
  - Test configuration modification workflows
  - Test indexer connection flexibility
  - Test wallet configuration across profiles
  - Test operation rollback and recovery
  - _Requirements: All reconfiguration requirements_

- [ ] 10. Fix Critical Reconfiguration Gaps
  - Address test failures and missing functionality identified in Task 8.10
  - Standardize API responses and complete validation logic
  - _Requirements: 4.2, 4.6, 4.7, 16.1-16.6, 17.1-17.3, 18.1_

- [x] 10.1 Standardize Profile State API Responses
  - Fix `/api/wizard/profiles/state` response format to match test expectations
  - Implement `/api/wizard/profiles/grouped` with correct structure (installed vs available)
  - Update ProfileStateManager to return consistent format across all endpoints
  - Add comprehensive response format tests
  - Ensure profile state includes: id, name, status, services, dependencies
  - _Requirements: 16.1-16.6, 17.1-17.2_

- [x] 10.2 Implement Installation State Endpoint
  - Create `/api/wizard/installation-state` endpoint
  - Return installation summary with installed profiles and their status
  - Include service health status and last modified timestamp
  - Return available reconfiguration actions based on current state
  - Provide system resource usage and capacity information
  - _Requirements: 16.1-16.4, 18.1_

- [x] 10.3 Enhance Configuration Validation
  - Extend `/api/config/validate` to handle all validation scenarios
  - Add port configuration validation (range, conflicts, availability)
  - Add mixed indexer configuration validation (local + public combinations)
  - Add wallet creation validation (password strength, path validation)
  - Add wallet import validation (file format, key validation)
  - Add mining wallet validation (address format, node connectivity)
  - Return specific, actionable error messages for each validation type
  - _Requirements: 4.2, 4.6, 17.1-17.3_

- [x] 10.4 Fix Network Change Warning Logic
  - Fix network change detection in configuration validation
  - Ensure warnings trigger when switching between mainnet and testnet
  - Add validation to prevent network changes with existing data
  - Add tests for mainnet/testnet change scenarios
  - Display clear warning about data incompatibility
  - _Requirements: 4.7_

- [x] 10.5 Re-run Reconfiguration Tests and Verify
  - Run `test-reconfiguration-mode.js` to verify fixes
  - Verify all critical tests pass (target: 85%+ success rate)
  - Document any remaining failures with justification
  - Update test expectations if API contracts changed
  - Create test report showing before/after comparison
  - _Requirements: All reconfiguration requirements_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Implementation Notes

### Progressive Disclosure Strategy

The implementation follows a progressive disclosure pattern:

1. **Basic Configuration (Always Visible)**:
   - External IP address
   - Public node toggle
   - Database password

2. **Profile-Specific Sections (Conditional)**:
   - Kaspa Node Settings (Core/Archive profiles only)
     - Network selector (mainnet/testnet)
     - "Configure Ports" button

3. **Advanced Options (Collapsible)**:
   - Data directories
   - Custom environment variables

### Port Configuration Modal

The port configuration modal provides:
- Clear labels for RPC and P2P ports
- Default values displayed
- Real-time validation
- Conflict detection
- Reset to defaults option

### Network Change Warning

When user changes network selection:
1. Detect change from current/default value
2. Show warning dialog explaining:
   - Mainnet and testnet data are incompatible
   - Changing networks requires fresh installation
   - Existing data will not work with new network
3. Provide clear options: Cancel or Proceed

### Validation Strategy

- **Client-side**: Immediate feedback on invalid input
- **Server-side**: Comprehensive validation before saving
- **Port conflicts**: Check against all services in selected profiles
- **Network changes**: Warn but allow (user's choice)

### Backward Compatibility

- Existing configurations without new fields use defaults
- Loading old configuration files works seamlessly
- New fields are optional in .env file
- Default values applied when fields missing

## Testing Strategy

### Unit Tests
- Configuration field definitions
- Validation logic (ports, network, paths)
- Field visibility resolver
- State management functions

### Integration Tests
- UI component rendering based on profiles
- Modal interactions
- Form validation and error display
- Configuration save/load flow

### End-to-End Tests
- Complete wizard flow with custom configuration
- Reconfiguration mode with existing values
- Port conflict detection across profiles
- Network change warning workflow

## Success Criteria

- [ ] Configuration options match TESTING.md expectations
- [ ] UI remains simple for basic use cases
- [ ] Advanced options available when needed
- [ ] All validation works correctly
- [ ] Configuration persists and loads properly
- [ ] Docker Compose uses configured values
- [ ] Tests pass with 100% coverage of new features
- [ ] Documentation is complete and accurate
