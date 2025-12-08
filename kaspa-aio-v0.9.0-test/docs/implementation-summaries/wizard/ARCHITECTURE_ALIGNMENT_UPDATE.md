# Architecture Alignment Update - Spec Requirements

**Date:** November 24, 2025  
**Specs Updated:** web-installation-wizard, kaspa-all-in-one-project

## Overview

Updated the requirements documents for the Installation Wizard and All-in-One Project specs to align with architectural clarifications that emerged during test-release work. These updates establish clear profile definitions, service dependencies, and the wizard-dashboard integration model.

## Key Architectural Decisions Implemented

### 1. Profile Renaming and Clarification

**Previous:** Ambiguous profile names (Production Apps, Explorer)  
**Updated:**
- **Core Profile** - Kaspa node (public/private) with optional wallet
- **Kaspa User Applications Profile** - User-facing apps (Kasia, K-Social, Kaspa Explorer)
- **Indexer Services Profile** - Backend indexers (Kasia-indexer, K-Indexer, Simply-Kaspa Indexer)
- **Archive Node Profile** - Non-pruning Kaspa node
- **Mining Profile** - Local mining stratum
- **Developer Mode** - Cross-cutting feature (not separate profile)

### 2. Service Dependencies and Startup Order

**Established Order:**
1. Kaspa Node (if local)
2. Indexer Services (if local)
3. Kaspa User Applications

**Key Rules:**
- No circular dependencies allowed
- Mining profile requires Core or Archive Node
- User Applications can use public or local indexers
- Health checks must pass before dependent services start

### 3. Node Failure Handling

**When local node fails but other services depend on it:**
- System offers user choice: continue with public Kaspa network or troubleshoot
- Automatic fallback to public network configured as option
- Not a hard failure - system remains operational

### 4. Database Architecture

**TimescaleDB Consolidation:**
- Single shared TimescaleDB container for all indexers
- Separate databases per indexer service for data isolation
- Optimized for time-series blockchain data

### 5. Developer Mode

**Implementation:**
- Toggle/checkbox in any profile (not separate profile)
- Adds: inspection tools, log access, exposed ports, development utilities
- Lightweight initial implementation, expandable based on developer feedback

### 6. Wizard-Dashboard Integration

**Workflow Model:**
- Wizard runs on host (not containerized)
- Dashboard focuses on monitoring only
- Configuration changes route through wizard
- Dashboard provides link back to wizard for reconfiguration

**User Pathways:**
1. Fresh installation → Wizard → Dashboard
2. Reconfiguration → Dashboard → Wizard (with current config loaded)
3. Updates → Dashboard notification → Wizard for application

### 7. Update Management

**Approach:**
- Individual service updates (not full profile updates)
- Each service handles its own data migration
- Wizard provides update interface with version info
- Automatic config backup before updates
- Rollback available through wizard if update fails

### 8. Resource Requirements

**New Features:**
- Combined resource calculation for multiple profiles
- Warnings when system resources insufficient
- Minimum vs recommended specs per profile combination
- Resource planning guidance during profile selection

## Requirements Documents Updated

### web-installation-wizard/requirements.md

**Updated Sections:**
- Glossary - Added all new profile definitions and terms
- Requirement 2 - Profile selection with new profile structure and dependencies
- Requirement 3 - Service configuration with indexer and node fallback options
- Requirement 6 - Post-installation validation with dependency-aware health checks

**New Requirements Added:**
- Requirement 13 - Reconfiguration and Update Management
- Requirement 14 - Service Startup Order and Dependencies

### kaspa-all-in-one-project/requirements.md

**Updated Sections:**
- Glossary - Added profile definitions and architectural terms
- Requirement 2 - Service integration with new dependency model and fallback strategies
- Requirement 7 - Update management aligned with wizard-based approach

**New Requirements Added:**
- Requirement 8 - Profile Architecture and Dependencies
- Requirement 9 - Wizard-Dashboard Integration

## Impact on Implementation

### Installation Wizard
- Must implement profile dependency checking
- Must calculate combined resource requirements
- Must handle reconfiguration mode (loading existing config)
- Must configure service startup order in docker-compose
- Must implement developer mode toggle

### Management Dashboard
- Simplified scope - monitoring only
- Must provide link to wizard for reconfiguration
- Must display update notifications
- Must show service health in dependency order

### Docker Compose Configuration
- Must support flexible node usage (local vs public network)
- Must configure TimescaleDB with multiple databases
- Must implement startup order with health check dependencies
- Must support developer mode feature flags

### Testing
- Must validate dependency order enforcement
- Must test fallback scenarios (node failure)
- Must verify resource requirement calculations
- Must test reconfiguration workflow

## Next Steps

1. **Design Documents** - Update design.md files for both specs to reflect architectural decisions
2. **Task Lists** - Update tasks.md to include new implementation requirements
3. **Test Release** - Validate these architectural decisions during test release execution
4. **Documentation** - Update user-facing docs to explain new profile structure

## Questions Resolved

All clarifying questions from the architectural review have been addressed:

✅ Node failure handling - User choice with fallback options  
✅ Profile naming - Clear, descriptive names established  
✅ PostgreSQL consolidation - Shared TimescaleDB with separate databases  
✅ Developer mode - Cross-cutting toggle feature  
✅ Service dependencies - Clear startup order, no circular deps  
✅ Resource requirements - Combined calculation with warnings  
✅ Update management - Individual service updates with data migration assumptions  

## Related Documents

- Original architectural summary (provided by user)
- `.kiro/specs/web-installation-wizard/requirements.md`
- `.kiro/specs/kaspa-all-in-one-project/requirements.md`
- `.kiro/specs/test-release/tasks.md`
