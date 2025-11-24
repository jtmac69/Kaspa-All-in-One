# Design Document Alignment Update

**Date:** November 24, 2025  
**Specs Updated:** web-installation-wizard/design.md, kaspa-all-in-one-project/design.md

## Overview

Updated the design documents for both the Installation Wizard and All-in-One Project specs to reflect the architectural clarifications established in the requirements phase. These updates provide detailed technical specifications for implementing the new profile system, dependency management, and wizard-dashboard integration.

## Web Installation Wizard Design Updates

### 1. Profile Architecture Section (NEW)

Added comprehensive "Profile Architecture and Dependencies" section covering:

**Profile Definitions:**
- Detailed TypeScript interfaces for each profile type
- Startup order specifications (1=Node, 2=Indexers, 3=Apps)
- Configuration options (nodeUsage, indexerChoice, fallback strategies)
- Developer mode as cross-cutting feature

**Specific Profile Configurations:**
```typescript
- Core Profile: nodeUsage options, fallback to public network
- Kaspa User Applications: indexer choice (public/local), custom endpoints
- Indexer Services: shared TimescaleDB, separate databases, fallback
- Archive Node: higher resource requirements
- Mining: prerequisites enforcement
- Developer Mode: feature toggles
```

### 2. Dependency Resolution System

**Dependency Validator:**
- Circular dependency detection algorithm
- Prerequisite validation (e.g., Mining requires Core or Archive)
- Conflict detection
- Startup order enforcement

**Fallback Strategies:**
- Node failure handling with user choice
- Three options: continue with public, troubleshoot, retry
- Automatic fallback configuration for dependent services

### 3. Resource Calculation

**Combined Resource Calculator:**
- Aggregates requirements across selected profiles
- Deduplicates shared resources (TimescaleDB)
- Compares against available system resources
- Warns when insufficient resources detected

### 4. Developer Mode Implementation

**Cross-Cutting Feature:**
- Applied to any profile via toggle
- Adds debug logging, exposed ports, inspection tools
- Modifies docker-compose configuration dynamically
- Includes Portainer, pgAdmin, enhanced logging

### 5. Wizard-Dashboard Integration (NEW)

Added comprehensive integration section:

**Three Wizard Modes:**
1. **Initial Installation** - Fresh setup, full wizard flow
2. **Reconfiguration** - Load existing config, modify, apply
3. **Update** - Apply service updates with rollback support

**Configuration Persistence:**
- Installation state tracking
- Service version management
- Change history logging
- Backup management

**Integration Points:**
- Dashboard → Wizard reconfiguration link
- Update notification → Wizard update interface
- Service status synchronization
- Configuration change notifications

**Host-Based Execution:**
- Rationale for running on host vs container
- Startup script with mode detection
- Direct system access for validation

**Backup Strategy:**
- Automatic backups before changes
- Timestamped backup directories
- Rollback capability
- Configuration file preservation

**Update Workflow:**
- Dashboard detects updates via GitHub API
- Launches wizard in update mode
- Selective update application
- Per-service rollback on failure
- Update history logging

## Kaspa All-in-One Project Design Updates

### 1. Profile-Based Deployment Section

**Enhanced Profile Definitions:**
- Detailed description of each profile
- Dependency rules and prerequisites
- Startup sequence specification
- Fallback strategies

**Startup Order:**
```
1. Kaspa Node (Core or Archive, if local)
2. Indexer Services (if local)
3. Kaspa User Applications
4. Mining Services
```

**Dependency Rules:**
- Mining requires Core or Archive
- Apps can use public or local indexers
- Indexers can use local node or public network
- No circular dependencies
- Health checks before dependent services

### 2. TimescaleDB Architecture

**Shared Database Design:**
- Single TimescaleDB container
- Separate databases per indexer:
  - `kasia_db`
  - `k_db`
  - `simply_kaspa_db`

**Database Initialization:**
- SQL script for database creation
- TimescaleDB extension per database
- Hypertables, compression, retention policies
- Example schemas provided

### 3. Wizard-Dashboard Integration (NEW)

Added comprehensive management architecture section:

**Two-Component Approach:**
1. **Wizard (host-based)** - Configuration and setup
2. **Dashboard (containerized)** - Monitoring and status

**Wizard Responsibilities:**
- Configuration management
- Update management
- Reconfiguration
- Dependency resolution

**Dashboard Responsibilities:**
- Real-time monitoring
- Status display
- Integration points
- Alert notifications

### 4. Update Management System

**Update Detection:**
- GitHub API integration
- Version comparison
- Breaking change detection
- Scheduled update checks (default: daily)

**Update Application:**
- Backup before update
- Image pull and service restart
- Health check validation
- Automatic rollback on failure
- Update history logging

**Data Migration Assumptions:**
- Each service handles its own migrations
- Services run migration scripts on startup
- No centralized migration management
- Backward compatibility assumed

### 5. Configuration Persistence

**State Files:**
```
.kaspa-aio/
├── installation-state.json
├── service-versions.json
└── update-history.json

.kaspa-backups/
└── [timestamp]/
    ├── .env
    ├── docker-compose.yml
    └── installation-state.json
```

**Installation State Schema:**
- Version and timestamps
- Selected profiles and configuration
- Developer mode settings
- Service versions and status

## Technical Specifications Added

### TypeScript Interfaces

**Profile System:**
- `ProfileDefinition` - Complete profile specification
- `DependencyRule` - Dependency validation rules
- `FallbackStrategy` - Node failure handling
- `ResourceRequirements` - Resource calculation
- `DeveloperModeConfig` - Developer features

**Wizard Integration:**
- `InstallationState` - Persistent state management
- `ReconfigurationLink` - Dashboard integration
- `UpdateNotification` - Update information
- `ServiceStatusSync` - Status synchronization
- `BackupManager` - Backup operations
- `UpdateWorkflow` - Update process

**Update Management:**
- `UpdateMonitor` - Update detection
- `UpdateManager` - Update application
- `ServiceUpdate` - Update information
- `UpdateResult` - Update outcome

### Algorithms and Logic

**Dependency Validation:**
- Circular dependency detection
- Prerequisite checking
- Conflict resolution
- Startup order calculation

**Resource Calculation:**
- Profile resource aggregation
- Shared resource deduplication
- System resource comparison
- Sufficiency checking

**Update Process:**
- Version comparison
- Breaking change detection
- Backup creation
- Service update
- Health validation
- Rollback on failure

## Implementation Guidance

### Profile System
1. Implement profile definitions with all metadata
2. Build dependency validator with cycle detection
3. Create resource calculator with deduplication
4. Add developer mode configuration system

### Wizard Modes
1. Implement mode detection (install/reconfigure/update)
2. Build configuration loader for reconfiguration
3. Create update interface with selective updates
4. Add backup/rollback functionality

### Dashboard Integration
1. Create reconfiguration link generator
2. Implement update notification system
3. Build service status synchronization
4. Add wizard launcher from dashboard

### Update Management
1. Implement GitHub API integration
2. Build version comparison logic
3. Create update application workflow
4. Add rollback capability

### Database Architecture
1. Create TimescaleDB initialization script
2. Implement separate database creation
3. Add hypertable and compression setup
4. Configure retention policies

## Testing Implications

### New Test Requirements

**Profile System:**
- Dependency validation tests
- Circular dependency detection
- Resource calculation accuracy
- Developer mode application

**Wizard Integration:**
- Mode switching tests
- Configuration loading/saving
- Backup/restore functionality
- Update workflow end-to-end

**Update Management:**
- GitHub API mocking
- Version comparison logic
- Update application process
- Rollback scenarios

**Database Architecture:**
- Multi-database initialization
- Indexer isolation
- Connection management
- Migration handling

## Documentation Updates Needed

### User Documentation
- Profile selection guide
- Dependency explanation
- Resource planning guide
- Update management instructions
- Reconfiguration workflow

### Developer Documentation
- Profile system architecture
- Dependency resolution algorithm
- Update management API
- Database schema design
- Integration patterns

## Migration Path

For existing installations:

1. **Detect Current State** - Read existing configuration
2. **Map to New Profiles** - Convert old profile names to new
3. **Validate Dependencies** - Ensure dependencies satisfied
4. **Update Configuration** - Generate new installation state
5. **Preserve Data** - No data migration needed
6. **Update Documentation** - Notify users of changes

## Node Synchronization Handling (Added)

### User Feedback Integration

Based on user feedback about Kaspa node synchronization time, added comprehensive synchronization management:

**Synchronization Strategy:**
- Three options: Wait for sync, Continue in background, Skip and use public
- Background sync monitoring with progress updates
- Wizard state persistence for pause/resume
- Dependent services can wait or use fallback

**Wizard State Persistence:**
- Save wizard state to `.kaspa-aio/wizard-state.json`
- Track service status, sync progress, user decisions
- Allow resuming installation after closing wizard
- Background tasks continue while wizard closed

**Background Task Management:**
- Node sync continues in background
- Indexer sync can run independently
- Progress monitoring and notifications
- Automatic service switching when sync completes

**User Experience:**
```
1. Node starts syncing (estimated 4-6 hours)
2. User chooses: Wait / Continue in background / Skip
3. If background: Wizard proceeds, services use public network
4. Node syncs in background, wizard shows progress
5. User can close wizard, sync continues
6. When sync complete: Services automatically switch to local node
7. User notified of completion
```

**Resume Capability:**
- Wizard detects in-progress installation on startup
- Offers to resume from last step
- Verifies running containers still active
- Resumes background sync monitoring
- Continues from saved state

## Next Steps

1. **Review Design Documents** - User approval of technical specifications including sync handling
2. **Update Task Lists** - Break down implementation into tasks
3. **Implement Profile System** - Core dependency and resource management
4. **Build Wizard Integration** - Mode switching and configuration management
5. **Implement Sync Management** - Node sync handling and state persistence
6. **Create Update System** - GitHub integration and update workflow
7. **Test End-to-End** - Validate complete workflows including sync scenarios

## Related Documents

- `docs/implementation-summaries/wizard/ARCHITECTURE_ALIGNMENT_UPDATE.md` - Requirements updates
- `.kiro/specs/web-installation-wizard/requirements.md` - Updated requirements
- `.kiro/specs/web-installation-wizard/design.md` - Updated design
- `.kiro/specs/kaspa-all-in-one-project/requirements.md` - Updated requirements
- `.kiro/specs/kaspa-all-in-one-project/design.md` - Updated design
