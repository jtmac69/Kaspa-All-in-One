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

- [ ] 8. Checkpoint - Ensure all tests pass
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
