# Task List Updates Required - Architecture Alignment

**Date:** November 24, 2025  
**Status:** Design Approved, Task Updates Needed

## Overview

Based on the approved architectural changes to requirements and design documents, the following updates are needed to the task lists for both specs. These updates reflect the new profile system, dependency management, node synchronization handling, and wizard-dashboard integration.

## Web Installation Wizard Tasks - Updates Needed

### Current Status
The wizard tasks are already quite comprehensive (Phases 1-6.5 mostly complete). The following additions/modifications are needed to align with the new architecture:

### NEW: Phase 6.6 - Profile Architecture Implementation

**Add after Phase 6.5 (Non-Technical User Support):**

- [ ] 6.6 Implement new profile architecture and dependency system
  - [ ] 6.6.1 Update profile definitions with new structure
    - Rename "Production" profile to "Kaspa User Applications"
    - Rename "Explorer" profile to "Indexer Services"
    - Update profile metadata (startup order, prerequisites, fallback strategies)
    - Add Developer Mode as cross-cutting feature (not separate profile)
    - _Requirements: 2, 8, 14_
  
  - [ ] 6.6.2 Implement dependency resolution system
    - Build dependency validator with circular dependency detection
    - Implement prerequisite checking (Mining requires Core or Archive)
    - Add startup order enforcement (Node → Indexers → Apps)
    - Create dependency visualization for UI
    - _Requirements: 2, 8, 14_
  
  - [ ] 6.6.3 Implement resource calculation with deduplication
    - Calculate combined resources across selected profiles
    - Deduplicate shared resources (TimescaleDB)
    - Compare against available system resources
    - Display warnings when resources insufficient
    - _Requirements: 1, 2_
  
  - [ ] 6.6.4 Implement fallback strategies
    - Add node failure handling with user choice
    - Configure automatic fallback to public Kaspa network
    - Implement indexer fallback to public endpoints
    - Create fallback configuration generator
    - _Requirements: 2, 6, 8, 14_
  
  - [ ] 6.6.5 Implement Developer Mode toggle
    - Add Developer Mode checkbox to profile selection
    - Apply developer features to selected profiles
    - Configure debug logging, exposed ports, inspection tools
    - Add Portainer and pgAdmin when enabled
    - _Requirements: 2, 3_

### NEW: Phase 6.7 - Node Synchronization Management

**Add after Phase 6.6:**

- [ ] 6.7 Implement node synchronization handling
  - [ ] 6.7.1 Build node sync monitoring system
    - Query Kaspa node RPC for sync status
    - Calculate sync progress (current/target blocks)
    - Estimate time remaining for sync
    - Display sync progress in wizard
    - _Requirements: 5, 6_
  
  - [ ] 6.7.2 Implement sync strategy options
    - Present three options: Wait / Background / Skip
    - Implement "Wait for sync" with progress display
    - Implement "Continue in background" with monitoring
    - Implement "Skip and use public" with fallback config
    - _Requirements: 5, 6, 8_
  
  - [ ] 6.7.3 Build wizard state persistence
    - Save wizard state to `.kaspa-aio/wizard-state.json`
    - Track service status, sync progress, user decisions
    - Implement resume capability on wizard restart
    - Verify running containers on resume
    - _Requirements: 5, 7, 11_
  
  - [ ] 6.7.4 Implement background task management
    - Monitor node sync in background
    - Track indexer sync operations
    - Update wizard state periodically
    - Notify when sync completes
    - _Requirements: 5, 6_
  
  - [ ] 6.7.5 Add resume installation UI
    - Detect resumable state on wizard start
    - Prompt user to resume or start over
    - Load saved state and continue from last step
    - Display background task status
    - _Requirements: 5, 7, 11_

### NEW: Phase 6.8 - Wizard-Dashboard Integration

**Add after Phase 6.7:**

- [ ] 6.8 Implement wizard-dashboard integration
  - [ ] 6.8.1 Implement wizard mode detection
    - Detect initial installation vs reconfiguration vs update
    - Load appropriate configuration for each mode
    - Set wizard UI based on mode
    - _Requirements: 7, 13_
  
  - [ ] 6.8.2 Build reconfiguration mode
    - Load existing configuration from files
    - Allow modification of profiles and settings
    - Backup configuration before changes
    - Apply changes and restart affected services
    - _Requirements: 7, 13_
  
  - [ ] 6.8.3 Implement update mode
    - Display available service updates
    - Show version information and changelogs
    - Allow selective update of services
    - Handle update failures with rollback
    - _Requirements: 7, 13_
  
  - [ ] 6.8.4 Create configuration backup system
    - Automatic backup before changes
    - Timestamped backup directories
    - Rollback capability
    - Backup management (list, restore, delete)
    - _Requirements: 7, 13_
  
  - [ ] 6.8.5 Build dashboard integration points
    - Create reconfiguration link from dashboard
    - Implement update notification system
    - Add service status synchronization
    - Create wizard launcher from dashboard
    - _Requirements: 9, 13_

### MODIFIED: Existing Tasks

**Update Task 6.2 (Profile Selection):**
- Change profile names: Production → Kaspa User Applications, Explorer → Indexer Services
- Add Developer Mode toggle (not separate profile)
- Implement dependency checking and prerequisites
- Add resource calculation with warnings
- Show startup order visualization

**Update Task 6.3 (Configuration):**
- Add node usage options (public/private/for-other-services)
- Add indexer choice (public/local) for Kaspa User Applications
- Configure TimescaleDB with separate databases
- Add fallback configuration options
- Implement Developer Mode settings

**Update Task 6.5 (Installation Progress):**
- Add "syncing" phase for node synchronization
- Display sync progress with percentage
- Show estimated time for sync
- Add pause/resume capability
- Display background task status

**Update Task 6.6 (Validation):**
- Check services in dependency order
- Validate TimescaleDB separate databases
- Test fallback configurations
- Verify Developer Mode features
- Handle node sync completion

## Kaspa All-in-One Project Tasks - Updates Needed

### Current Status
The all-in-one tasks are comprehensive with most infrastructure complete. The following additions are needed:

### NEW: Phase 10 - Profile Architecture Updates

**Add after Phase 9:**

- [ ] 10. Update profile system with new architecture
  - [ ] 10.1 Rename and restructure profiles
    - Rename Production → Kaspa User Applications
    - Rename Explorer → Indexer Services
    - Update docker-compose.yml profile definitions
    - Update documentation with new names
    - _Requirements: 8_
  
  - [ ] 10.2 Implement TimescaleDB shared database
    - Configure single TimescaleDB container
    - Create separate databases (kasia_db, k_db, simply_kaspa_db)
    - Update initialization scripts
    - Test database isolation
    - _Requirements: 2, 8_
  
  - [ ] 10.3 Configure service startup order
    - Set depends_on with proper order
    - Implement health check dependencies
    - Configure restart policies with dependency awareness
    - Test startup sequence
    - _Requirements: 2, 8, 14_
  
  - [ ] 10.4 Implement fallback strategies
    - Configure indexers with public network fallback
    - Add node failure handling
    - Configure apps with public indexer fallback
    - Test fallback scenarios
    - _Requirements: 2, 8_
  
  - [ ] 10.5 Add Developer Mode support
    - Create developer mode docker-compose override
    - Add Portainer and pgAdmin services
    - Configure debug logging
    - Expose additional ports
    - _Requirements: 8_

### NEW: Phase 11 - Update Management System

**Add after Phase 10:**

- [ ] 11. Implement update management system
  - [ ] 11.1 Build GitHub API integration
    - Query releases for all external repositories
    - Compare current vs available versions
    - Detect breaking changes
    - Cache release information
    - _Requirements: 7_
  
  - [ ] 11.2 Create update detection service
    - Scheduled update checks (default: daily)
    - Version comparison logic
    - Update notification generation
    - Update history tracking
    - _Requirements: 7_
  
  - [ ] 11.3 Implement update application workflow
    - Backup configuration before update
    - Pull new Docker images
    - Restart services with new versions
    - Verify health checks
    - Rollback on failure
    - _Requirements: 7_
  
  - [ ] 11.4 Add update management to dashboard
    - Display update notifications
    - Show version information
    - Link to wizard for updates
    - Display update history
    - _Requirements: 7, 9_

### NEW: Phase 12 - Wizard-Dashboard Integration

**Add after Phase 11:**

- [ ] 12. Implement wizard-dashboard integration
  - [ ] 12.1 Create installation state tracking
    - Save state to `.kaspa-aio/installation-state.json`
    - Track profiles, services, versions
    - Record configuration history
    - Monitor service sync status
    - _Requirements: 9_
  
  - [ ] 12.2 Build reconfiguration support
    - Load existing configuration
    - Allow profile modifications
    - Backup before changes
    - Apply configuration updates
    - _Requirements: 9_
  
  - [ ] 12.3 Implement update workflow
    - Detect available updates
    - Launch wizard in update mode
    - Apply selective updates
    - Handle data migrations
    - _Requirements: 7, 9_
  
  - [ ] 12.4 Add dashboard integration
    - Create reconfiguration button
    - Display update notifications
    - Show service status
    - Link to wizard
    - _Requirements: 9_

### MODIFIED: Existing Tasks

**Update Phase 2 (Service Integration):**
- Verify TimescaleDB shared database configuration
- Test separate databases per indexer
- Validate data isolation

**Update Phase 4 (Dashboard):**
- Add reconfiguration link to wizard
- Display update notifications
- Show service status in dependency order
- Add wizard launcher button

**Update Phase 7 (Dashboard Enhancement):**
- Implement update notification display
- Add reconfiguration workflow
- Show service sync status
- Display dependency visualization

## Testing Updates Required

### Web Installation Wizard Tests

**Add to Phase 5 (Testing):**

- [ ] 5.6 Test profile architecture
  - Test dependency validation
  - Test circular dependency detection
  - Test resource calculation
  - Test fallback configurations
  - Test Developer Mode application

- [ ] 5.7 Test node synchronization
  - Test sync monitoring
  - Test sync strategy options
  - Test wizard state persistence
  - Test resume capability
  - Test background task management

- [ ] 5.8 Test wizard-dashboard integration
  - Test mode detection
  - Test reconfiguration workflow
  - Test update workflow
  - Test backup/rollback
  - Test dashboard integration points

### Kaspa All-in-One Tests

**Add to Phase 3 (Testing):**

- [ ] 3.9 Test profile architecture
  - Test renamed profiles
  - Test TimescaleDB shared database
  - Test service startup order
  - Test fallback strategies
  - Test Developer Mode

- [ ] 3.10 Test update management
  - Test GitHub API integration
  - Test update detection
  - Test update application
  - Test rollback on failure
  - Test update history

- [ ] 3.11 Test wizard-dashboard integration
  - Test installation state tracking
  - Test reconfiguration
  - Test update workflow
  - Test dashboard integration

## Documentation Updates Required

### Web Installation Wizard Docs

**Update existing documentation:**
- Update profile descriptions with new names
- Document dependency system
- Document node synchronization handling
- Document wizard-dashboard integration
- Add troubleshooting for sync issues

**Create new documentation:**
- Profile architecture guide
- Dependency resolution guide
- Node synchronization guide
- Wizard state persistence guide
- Resume installation guide

### Kaspa All-in-One Docs

**Update existing documentation:**
- Update profile names throughout
- Document TimescaleDB shared database
- Document service startup order
- Document fallback strategies
- Document update management

**Create new documentation:**
- Profile architecture overview
- Update management guide
- Wizard-dashboard integration guide
- Configuration backup guide
- Troubleshooting guide for new features

## Priority and Sequencing

### High Priority (Implement First)
1. **Profile Architecture** (6.6, 10) - Foundation for everything else
2. **Node Synchronization** (6.7) - Critical user experience issue
3. **Wizard-Dashboard Integration** (6.8, 12) - Core workflow requirement

### Medium Priority (Implement Second)
4. **Update Management** (11) - Important for maintenance
5. **Testing** (5.6-5.8, 3.9-3.11) - Validate new features
6. **Documentation** - Support users with new features

### Low Priority (Implement Last)
7. **Advanced Features** - Polish and enhancements
8. **Performance Optimization** - Fine-tuning

## Implementation Estimates

### Web Installation Wizard
- **Phase 6.6** (Profile Architecture): 2-3 weeks
- **Phase 6.7** (Node Sync): 2-3 weeks
- **Phase 6.8** (Integration): 1-2 weeks
- **Testing**: 1-2 weeks
- **Documentation**: 1 week
- **Total**: 7-11 weeks

### Kaspa All-in-One
- **Phase 10** (Profile Updates): 1-2 weeks
- **Phase 11** (Update Management): 2-3 weeks
- **Phase 12** (Integration): 1-2 weeks
- **Testing**: 1-2 weeks
- **Documentation**: 1 week
- **Total**: 6-10 weeks

### Combined Effort
- **Parallel Development**: 8-12 weeks
- **Sequential Development**: 13-21 weeks

## Next Steps

1. **Review this document** with stakeholders
2. **Update task files** with new phases and tasks
3. **Prioritize tasks** based on dependencies
4. **Assign resources** to high-priority tasks
5. **Begin implementation** of Phase 6.6 (Profile Architecture)

## Related Documents

- `.kiro/specs/web-installation-wizard/requirements.md` - Updated requirements
- `.kiro/specs/web-installation-wizard/design.md` - Updated design
- `.kiro/specs/kaspa-all-in-one-project/requirements.md` - Updated requirements
- `.kiro/specs/kaspa-all-in-one-project/design.md` - Updated design
- `docs/implementation-summaries/wizard/ARCHITECTURE_ALIGNMENT_UPDATE.md` - Requirements updates
- `docs/implementation-summaries/wizard/DESIGN_ALIGNMENT_UPDATE.md` - Design updates
