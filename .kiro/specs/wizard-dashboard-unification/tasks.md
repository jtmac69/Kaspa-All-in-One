# Implementation Plan: Wizard-Dashboard Unification

## Overview

This implementation plan transforms the Wizard and Dashboard into a unified system with shared state, visual identity, and seamless navigation. Tasks are ordered to build foundational components first, then integrate them into both services.

## Tasks

- [ ] 1. Create shared infrastructure
  - [ ] 1.1 Create shared directory structure
    - Create `services/shared/` directory
    - Create subdirectories: `lib/`, `styles/`
    - Create package.json for shared module
    - _Requirements: 11.1, 11.2_

  - [ ] 1.2 Implement SharedStateManager
    - Create `services/shared/lib/state-manager.js`
    - Implement readState(), writeState(), watchState(), hasInstallation(), updateState()
    - Add file watching with fs.watch
    - Handle missing/corrupted state files gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8_

  - [ ] 1.3 Write property test for state schema validity
    - **Property 1: Installation State Schema Validity**
    - **Validates: Requirements 1.6**

  - [ ] 1.4 Write unit tests for SharedStateManager
    - Test read/write operations
    - Test file watching
    - Test error handling for missing/corrupted files
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement port fallback service
  - [ ] 2.1 Create PortFallbackService
    - Create `services/shared/lib/port-fallback.js`
    - Implement connect() with ordered port attempts
    - Implement port caching after successful connection
    - Implement retry logic with 30-second interval
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8_

  - [ ] 2.2 Write property test for port fallback chain
    - **Property 6: Port Fallback Chain**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ] 2.3 Write property test for port caching
    - **Property 7: Port Caching After Success**
    - **Validates: Requirements 3.4**

- [ ] 3. Implement service detection
  - [ ] 3.1 Create ServiceDetector
    - Create `services/shared/lib/service-detector.js`
    - Implement getServiceStatus() using Docker API
    - Use health checks when available, fall back to running state
    - Handle Docker unavailable gracefully
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 3.2 Write property test for service status detection
    - **Property 13: Service Status Detection Accuracy**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 4. Implement cross-launch navigation
  - [ ] 4.1 Create CrossLaunchNavigator
    - Create `services/shared/lib/cross-launch.js`
    - Implement getWizardUrl() with context encoding
    - Implement getDashboardUrl()
    - Implement parseContext() for URL parameter parsing
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_

  - [ ] 4.2 Write property test for cross-launch context
    - **Property 12: Cross-Launch Context Preservation**
    - Test round-trip encoding/decoding of context
    - **Validates: Requirements 6.2, 6.6, 6.7**

- [ ] 5. Checkpoint - Shared infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create shared design system
  - [ ] 6.1 Create shared CSS variables
    - Create `services/shared/styles/variables.css`
    - Copy Kaspa brand colors from Wizard's variables.css
    - Include typography, spacing, shadows, transitions
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 6.2 Create shared component styles
    - Create `services/shared/styles/base.css` (reset, base styles)
    - Create `services/shared/styles/buttons.css` (button components)
    - Create `services/shared/styles/cards.css` (card components)
    - Create `services/shared/styles/forms.css` (form elements)
    - Create `services/shared/styles/status.css` (status indicators)
    - Create `services/shared/styles/index.css` (main entry point)
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [ ] 6.3 Write property test for CSS variable consistency
    - **Property 5: CSS Variable Consistency**
    - **Validates: Requirements 2.1, 2.4**

- [ ] 7. Integrate shared state into Dashboard
  - [ ] 7.1 Update Dashboard to read installation state
    - Import SharedStateManager into Dashboard server
    - Read state on startup and display only installed services
    - Show "No installation detected" when state missing
    - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2_

  - [ ] 7.2 Implement state file watching in Dashboard
    - Watch installation state file for changes
    - Refresh service list when state changes
    - Display notification on configuration change
    - _Requirements: 1.8, 10.2, 10.3, 10.4_

  - [ ] 7.3 Write property test for service display consistency
    - **Property 3: Dashboard Service Display Consistency**
    - **Validates: Requirements 1.3, 1.4, 4.1, 4.2**

- [ ] 8. Integrate port fallback into Dashboard
  - [ ] 8.1 Update Dashboard Kaspa node connection
    - Replace single-port connection with PortFallbackService
    - Display which port is being used
    - Show "Not Available" with troubleshooting when all ports fail
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 8.2 Implement retry logic for unavailable node
    - Start retry timer when node unavailable
    - Update status within 5 seconds when node becomes available
    - _Requirements: 3.7, 3.8_

  - [ ] 8.3 Write property test for retry behavior
    - **Property 8: Retry on Unavailability**
    - **Validates: Requirements 3.7, 3.8**

- [ ] 9. Implement profile filtering in Dashboard
  - [ ] 9.1 Update profile filter dropdown
    - Populate with only installed profiles from state
    - Show service count per profile
    - _Requirements: 4.4, 4.8_

  - [ ] 9.2 Implement profile-based service grouping
    - Group services by profile in display
    - Show profile badges on service cards
    - Hide empty profile sections
    - _Requirements: 4.3, 4.6, 4.7_

  - [ ] 9.3 Implement filter functionality
    - Filter displayed services when profile selected
    - Show all services when "All Services" selected
    - _Requirements: 4.5_

  - [ ] 9.4 Write property test for profile filtering
    - **Property 9: Profile Filtering Consistency**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

- [ ] 10. Checkpoint - Dashboard state integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Apply shared design system to Dashboard
  - [ ] 11.1 Replace Dashboard CSS with shared styles
    - Import shared CSS variables
    - Update body background to Kaspa gradient
    - Update header to match Wizard branding
    - _Requirements: 2.1, 2.2, 2.5, 2.8_

  - [ ] 11.2 Update Dashboard components to use shared styles
    - Update button styles to match Wizard
    - Update card styles to match Wizard
    - Update status indicators to use Kaspa colors
    - _Requirements: 2.4, 2.6_

- [ ] 12. Add cross-launch navigation to Dashboard
  - [ ] 12.1 Add Wizard navigation elements
    - Add "Wizard" link to Dashboard header
    - Add "Reconfigure System" button
    - Add context-specific quick-action buttons
    - _Requirements: 6.1, 6.6, 6.8_

  - [ ] 12.2 Implement context passing to Wizard
    - Pass current state and suggested action when launching Wizard
    - Use URL parameters (not window.open)
    - _Requirements: 6.2, 6.4, 6.5_

- [ ] 13. Add Wizard running indicator to Dashboard
  - [ ] 13.1 Detect and display Wizard status
    - Check wizardRunning flag in state file
    - Display "Configuration in progress" indicator
    - Disable service control operations while Wizard running
    - _Requirements: 10.6, 10.7_

  - [ ] 13.2 Write property test for Wizard running indicator
    - **Property 16: Wizard Running Indicator**
    - **Validates: Requirements 10.6, 10.7**

- [ ] 14. Implement reconfiguration mode in Wizard
  - [ ] 14.1 Add reconfiguration mode detection
    - Check for existing installation state on load
    - Enter reconfiguration mode if state exists
    - _Requirements: 5.1_

  - [ ] 14.2 Create reconfiguration landing page
    - Display options: "Add New Profiles", "Modify Configuration", "Remove Profiles"
    - Show installed profiles with "Installed ✓" badges
    - Show available profiles in separate section
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ] 14.3 Implement profile modification flow
    - Show modify/remove options for installed profiles
    - Preserve existing service data by default
    - Warn about data loss when removing profiles
    - _Requirements: 5.5, 5.6, 5.7_

  - [ ] 14.4 Update state after reconfiguration
    - Write updated state file after changes
    - Set wizardRunning flag during configuration
    - Clear wizardRunning flag on completion
    - _Requirements: 5.8, 10.1_

  - [ ] 14.5 Write property test for reconfiguration mode
    - **Property 10: Reconfiguration Mode Detection**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5**

  - [ ] 14.6 Write property test for data preservation
    - **Property 11: Data Preservation During Modification**
    - **Validates: Requirements 5.6**

- [ ] 15. Add Dashboard navigation to Wizard
  - [ ] 15.1 Update Wizard completion page
    - Add "Go to Dashboard" link (not auto-open)
    - Display Dashboard URL for manual navigation
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ] 15.2 Parse launch context in Wizard
    - Read context from URL parameters
    - Pre-select appropriate options based on context
    - _Requirements: 6.2_

- [ ] 16. Checkpoint - Cross-launch integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement unified error handling
  - [ ] 17.1 Create shared ErrorDisplay component
    - Create `services/shared/lib/error-display.js`
    - Implement user-friendly error messages
    - Implement service unavailable placeholders
    - _Requirements: 9.1, 9.6_

  - [ ] 17.2 Update Dashboard error handling
    - Use ErrorDisplay for all error conditions
    - Log detailed errors to console
    - Ensure graceful degradation (no crashes)
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [ ] 17.3 Update Wizard error handling
    - Use same error message patterns as Dashboard
    - Add documentation links for common issues
    - _Requirements: 9.7, 9.8_

  - [ ] 17.4 Write property test for error handling resilience
    - **Property 15: Graceful Error Handling**
    - **Validates: Requirements 9.1, 9.4, 9.5, 9.6, 9.7**

- [ ] 18. Implement configuration change notifications
  - [ ] 18.1 Add notification system to Dashboard
    - Display notification when state file changes
    - Add manual "Refresh" button
    - Auto-refresh when Wizard completes
    - _Requirements: 10.4, 10.5, 10.8_

  - [ ] 18.2 Write property test for change notifications
    - **Property 17: Configuration Change Notification**
    - **Validates: Requirements 10.4**

- [ ] 19. Update service status refresh
  - [ ] 19.1 Implement 10-second status refresh
    - Set up interval for service status polling
    - Display last status check timestamp
    - _Requirements: 7.7, 7.8_

  - [ ] 19.2 Write property test for status refresh timing
    - **Property 14: Status Refresh Timing**
    - **Validates: Requirements 7.7**

- [ ] 20. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Integration testing
  - [ ] 21.1 Test Wizard → Dashboard flow
    - Complete fresh installation via Wizard
    - Verify state file written correctly
    - Navigate to Dashboard and verify display
    - _Requirements: 1.2, 1.3, 6.3_

  - [ ] 21.2 Test Dashboard → Wizard flow
    - Click reconfigure in Dashboard
    - Verify Wizard receives context
    - Complete modification
    - Verify Dashboard updates
    - _Requirements: 6.1, 6.2, 10.3_

  - [ ] 21.3 Test state file watching
    - Modify state file externally
    - Verify Dashboard detects and refreshes
    - _Requirements: 1.8, 10.2_

  - [ ] 21.4 Write property test for state write consistency
    - **Property 2: State File Write Consistency**
    - **Validates: Requirements 1.2, 1.7, 5.8, 10.1**

  - [ ] 21.5 Write property test for state change detection
    - **Property 4: State Change Detection and Refresh**
    - **Validates: Requirements 1.8, 10.2, 10.3, 10.8**

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation preserves the existing Wizard template installation flow
- All changes are additive to avoid breaking existing functionality
