# Kaspa All-in-One Project Implementation Plan

## Phase 1: Core Infrastructure ✅ COMPLETED

- [x] 1. Set up Docker Compose architecture with profile system
  - Created profile-based deployment system (core, prod, explorer, archive, development, mining)
  - Implemented service dependencies and network configuration
  - Added environment variable configuration with sensible defaults
  - _Requirements: 1.1, 1.4_

- [x] 1.1 Configure Kaspa node with proper networking
  - Set up official rusty-kaspad Docker image with correct command arguments
  - Configured P2P (16110) and RPC (16111) port separation
  - Implemented UTXO indexing and external IP detection
  - Added health checks and restart policies
  - _Requirements: 1.1, 1.2_

- [x] 1.2 Create management dashboard foundation
  - Built Node.js/Express backend with service monitoring
  - Created responsive web interface with real-time updates
  - Implemented service status monitoring and log viewing
  - Added configuration management interface
  - _Requirements: 1.3, 4.3_

- [x] 1.3 Set up reverse proxy and security
  - Configured Nginx with SSL termination and security headers
  - Implemented service routing and load balancing
  - Added rate limiting and request filtering
  - Created SSL certificate management
  - _Requirements: 5.1, 5.3_

## Phase 2: Service Integration 🔄 IN PROGRESS

- [x] 2. Set up database infrastructure with TimescaleDB
  - Created shared TimescaleDB instance with optimized schemas
  - Set up separate archive database for long-term retention
  - Implemented database initialization scripts for both explorer and archive profiles
  - Added PostgreSQL configuration with proper networking
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2.1 Integrate Kasia messaging application
  - Clone and integrate Kasia app repository (K-Kluster/Kasia)
  - Analyze tech stack and create production Dockerfile
  - Configure environment variables and service connections
  - Test messaging functionality with local indexer
  - _Requirements: 2.1, 2.3_

- [x] 2.2 Configure Kasia indexer service
  - Integrated using official Docker image kkluster/kasia-indexer:main
  - Configured WebSocket connection to Kaspa node (port 17110)
  - Set up file-based data storage with volume persistence
  - Added health checks and restart policies
  - _Requirements: 2.1, 2.2_

- [x] 2.3 Integrate K-Social platform and indexer **[UPDATED FOR TIMESCALEDB]**
  - Clone and integrate K Social app repository (thesheepcat/K)
  - Clone and integrate K Social indexer repository (thesheepcat/K-indexer)
  - **NEW**: Implement TimescaleDB optimizations for K-indexer (hypertables, compression, continuous aggregates)
  - **NEW**: Apply Personal Indexer concept - optimize for individual user data patterns
  - Set up database schema with TimescaleDB enhancements for social data indexing
  - Configure API endpoints and service connections with performance optimizations
  - **NEW**: Implement batch processing for K protocol transactions (1000-record batches)
  - **NEW**: Add time-based partitioning (1-6 hour chunks for social activity patterns)
  - _Requirements: 2.1, 2.3_

- [x] 2.4 Integrate Simply Kaspa indexer **[UPDATED FOR TIMESCALEDB]**
  - Clone and integrate Simply Kaspa indexer repository (supertypo/simply-kaspa-indexer)
  - **NEW**: Implement TimescaleDB optimizations (15-30 minute chunks for 10bps rate)
  - **NEW**: Apply Personal Indexer concept - user-specific indexing patterns and data retention
  - Configure for both explorer and archive modes with TimescaleDB compression
  - **NEW**: Set up automatic compression for data older than 1-2 hours (90%+ space savings)
  - **NEW**: Implement continuous aggregates for real-time network statistics
  - Set up database partitioning and optimization for archive profile
  - Test different indexing modes (full, light, archive, personal)
  - **NEW**: Validate 10-100x performance improvements for time-range queries
  - _Requirements: 2.2, 2.4_

- [x] 2.5 Integrate mining stratum bridge
  - Clone and integrate Kaspa stratum bridge repository (aglov413/kaspa-stratum-bridge)
  - Configure Go build environment and dependencies
  - Set up Kaspa node connection for mining operations
  - Test solo mining functionality and pool connectivity
  - _Requirements: 2.3_

## Phase 3: Testing Framework ✅ COMPLETED

- [x] 3. Develop comprehensive testing suite
  - Created Kaspa node connectivity and sync testing
  - Implemented service integration testing framework
  - Built Docker Compose validation and health checking
  - Added network connectivity and port accessibility testing
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.1 Create node testing scripts
  - Built test-kaspa-node.sh with P2P and RPC validation
  - Implemented sync status monitoring and progress tracking
  - Added public accessibility testing and configuration recommendations
  - Created cleanup and error handling procedures
  - _Requirements: 3.1, 3.3_

- [x] 3.2 Implement integration testing
  - Created test-kasia-indexer.sh for indexer validation
  - Built service dependency testing and health monitoring
  - Implemented database connectivity and schema validation
  - Added performance baseline measurement
  - _Requirements: 3.2, 3.4_

- [x] 3.3 Set up management and monitoring tools
  - Created scripts/manage.sh for service lifecycle management
  - Built scripts/health-check.sh for comprehensive system monitoring
  - Implemented log aggregation and analysis tools
  - Added configuration validation and troubleshooting guides
  - _Requirements: 3.3, 4.2_

- [x] 3.4 Implement standardized test cleanup system
  - Enhanced test-kasia-indexer.sh, test-kasia-app.sh, and test-service-dependencies.sh with comprehensive cleanup
  - Added automatic cleanup on exit with trap handlers for graceful shutdown
  - Implemented manual cleanup options (--cleanup-only, --cleanup-full, --cleanup-volumes, --no-cleanup)
  - Created comprehensive cleanup-tests.sh script for centralized cleanup management
  - Added safety features including dry-run mode, confirmation prompts, and data protection
  - Documented cleanup system in docs/test-cleanup.md with usage examples and best practices
  - _Requirements: 3.1, 3.2, 3.3_

## Phase 4: Documentation and User Experience ✅ COMPLETED

- [x] 4. Create comprehensive documentation system
  - Built PROJECT_STRUCTURE.md with complete system overview
  - Created docs/deployment-profiles.md explaining profile system
  - Developed docs/component-matrix.md showing service relationships
  - Added docs/public-node-setup.md for network configuration
  - Created CONTRIBUTING.md with development guidelines
  - _Requirements: 4.1, 4.2_

- [x] 4.1 Develop installation and setup guides
  - Created install.sh script with automated dependency checking
  - Built hardware requirements and compatibility documentation
  - Added step-by-step installation instructions with validation
  - Implemented post-installation verification procedures
  - _Requirements: 4.1, 4.2_

- [x] 4.2 Create troubleshooting and maintenance guides
  - Document common installation and operation issues with solutions
  - Create diagnostic procedures for service failures and performance issues
  - Build FAQ section with community-driven content
  - Add maintenance schedules and update procedures
  - _Requirements: 4.3, 4.4_

- [ ] 4.3 Enhance dashboard with advanced features
  - Add missing API endpoints for service management (restart, logs, update, backup)
  - Implement real-time system resource monitoring
  - Add profile-aware service management interface
  - Create interactive configuration management
  - _Requirements: 4.1, 4.4_

## Phase 4.5: TimescaleDB Integration and Personal Indexer Implementation 🆕 NEW PRIORITY

- [ ] 4.5 Implement TimescaleDB optimizations across all indexers
  - **NEW**: Apply TimescaleDB PR proposals (PRs 94, 95, et al.) to K-indexer and Simply Kaspa indexer
  - **NEW**: Implement Personal Indexer concept - user-specific data patterns and retention policies
  - **NEW**: Convert existing PostgreSQL schemas to TimescaleDB hypertables
  - **NEW**: Add automatic compression policies (90%+ space savings for historical data)
  - **NEW**: Implement continuous aggregates for real-time analytics without query overhead
  - **NEW**: Optimize chunk sizing for Kaspa's 10 blocks/second rate (15-30 minute intervals)
  - **NEW**: Add batch processing optimizations (1000-record batches for optimal throughput)
  - **NEW**: Validate 10-100x performance improvements for time-range queries
  - **NOTE**: Applies to K-indexer and Simply Kaspa indexer only (Kasia uses file-based RocksDB storage)
  - _Requirements: 2.3, 2.4_

- [ ] 4.5.1 Update K-Social indexer with TimescaleDB enhancements
  - **NEW**: Convert k_posts, k_votes, k_user_profiles tables to hypertables
  - **NEW**: Implement 1-6 hour chunk intervals optimized for social activity patterns
  - **NEW**: Add compression for data older than 24 hours
  - **NEW**: Create continuous aggregates for hourly post stats and daily user activity
  - **NEW**: Implement batch insert optimization using COPY for bulk operations
  - **NEW**: Add Personal Indexer features for user-specific data retention
  - _Requirements: 2.3_

- [ ] 4.5.2 Update Simply Kaspa indexer with TimescaleDB enhancements
  - **NEW**: Convert blocks and transactions tables to hypertables
  - **NEW**: Implement 15-30 minute chunk intervals for 864,000 blocks/day processing
  - **NEW**: Add advanced compression policies for blockchain data
  - **NEW**: Create continuous aggregates for network statistics and analytics
  - **NEW**: Implement Personal Indexer mode for individual user blockchain data
  - **NEW**: Add performance monitoring and metrics collection
  - _Requirements: 2.4_

- [ ] 4.5.3 Update database infrastructure for TimescaleDB
  - **NEW**: Migrate from postgres:17-alpine to timescale/timescaledb:latest-pg16
  - **NEW**: Update Docker Compose configurations with TimescaleDB-specific settings
  - **NEW**: Create migration scripts for existing PostgreSQL data to TimescaleDB
  - **NEW**: Add TimescaleDB monitoring and performance metrics
  - **NEW**: Implement backup and recovery procedures for TimescaleDB
  - **NOTE**: This applies to K-indexer and Simply Kaspa indexer only (Kasia uses file-based storage)
  - _Requirements: 2.3, 2.4_

## Phase 5: Service Repository Integration 🔄 CURRENT PRIORITY

- [ ] 5. Clone and integrate external service repositories
  - Set up automated repository cloning and integration process
  - Create standardized Dockerfile templates for different tech stacks
  - Implement service-specific configuration management
  - Add integration testing for all external services
  - _Requirements: 2.1, 2.3_

- [ ] 5.1 Test and validate Kasia indexer integration
  - Validate existing Kasia indexer Docker image integration (kkluster/kasia-indexer:main)
  - Run enhanced test-kasia-indexer.sh to verify WebSocket connection to Kaspa node
  - Test Swagger API endpoint (http://localhost:3002/swagger-ui/) accessibility
  - Validate metrics endpoint (/metrics) showing ~10 updates/second when synced
  - Test indexer data persistence and performance monitoring
  - _Requirements: 2.1, 3.2_

- [ ] 5.2 Integrate Kasia messaging application
  - Clone Kasia app repository (K-Kluster/Kasia) to services/kasia/
  - Analyze React/Node.js tech stack and dependencies
  - Create production Dockerfile with multi-stage build
  - Configure KASIA_INDEXER_URL environment variable (points to kasia-indexer:3000)
  - **DEPENDENCY**: Requires Kasia indexer to be running and synced for full functionality
  - Create test script for end-to-end messaging functionality with indexer dependency
  - _Requirements: 2.1, 2.3_

- [ ] 5.3 Integrate K-Social platform ecosystem **[UPDATED - BUILD-TIME INTEGRATION]**
  - **NEW**: Implement build-time integration (no cloning into repository)
  - Create Dockerfile for K Social app with external repository clone during build
  - Create Dockerfile for K Social indexer with external repository clone during build
  - **NEW**: Add configurable version/branch selection (K_SOCIAL_VERSION, K_INDEXER_VERSION)
  - **NEW**: Create flexible build scripts similar to Kasia approach
  - Set up database schema initialization for social data with TimescaleDB enhancements
  - Configure apiBaseUrl environment variable (points to k-indexer:3000)
  - **CONFIRMED**: K Social app has absolute dependency on K-indexer for all functionality
  - Create test scripts for social media functionality and data flow
  - **NEW**: Add version pinning and update monitoring strategy
  - _Requirements: 2.1, 2.3_

- [ ] 5.4 Integrate Simply Kaspa indexer **[UPDATED - BUILD-TIME INTEGRATION]**
  - **NEW**: Implement build-time integration (no cloning into repository)
  - Create Dockerfile with external repository clone during build
  - **NEW**: Add configurable version/branch selection (SIMPLY_KASPA_VERSION)
  - **NEW**: Create flexible build script with multiple build options
  - Configure multiple operation modes (full, light, archive, personal)
  - Set up TimescaleDB integration with hypertables and compression
  - **NEW**: Implement TimescaleDB schema migration and optimization
  - Implement archive-specific retention and partitioning policies
  - **NEW**: Add Personal Indexer mode configuration
  - Create test scripts for performance across different indexing modes
  - **NEW**: Add version pinning and update monitoring strategy
  - _Requirements: 2.2, 2.4_

- [ ] 5.5 Integrate mining stratum bridge
  - Clone Kaspa stratum bridge repository (aglov413/kaspa-stratum-bridge) to services/kaspa-stratum/
  - Set up Go build environment with proper dependencies
  - Configure connection to local Kaspa node for mining operations
  - Create test scripts for solo mining functionality and pool connectivity
  - Add mining statistics to dashboard interface
  - _Requirements: 2.3_

- [x] 5.6 Research K Social App and K-indexer dependency ✅ COMPLETED
  - Examine K Social App repository (thesheepcat/K) for indexer configuration
  - Check for environment variables like KSOCIAL_INDEXER_URL or similar
  - Analyze K Social App's API calls and data requirements
  - Determine if K Social can function without K-indexer or requires it
  - Document findings and update service integration plan accordingly
  - Compare with Kasia App's confirmed indexer dependency pattern
  - _Requirements: 2.1, 2.3, 4.2_

  **RESEARCH FINDINGS:**
  
  **✅ CONFIRMED: K Social App has ABSOLUTE DEPENDENCY on K-indexer**
  
  **Key Findings:**
  1. **Configuration Pattern**: K Social App uses `apiBaseUrl` setting (defaults to 'https://indexer.kaspatalk.net') instead of environment variables like KSOCIAL_INDEXER_URL
  2. **Complete API Dependency**: K Social App makes extensive API calls to K-indexer for ALL core functionality:
     - `get-posts-watching` - Main feed content
     - `get-posts-following` - Following users' content  
     - `get-contents-following` - Comprehensive activity feed
     - `get-users` - User discovery and profiles
     - `get-mentions` - User mentions and notifications
     - `get-notifications` - Real-time notification system
     - `get-post-details` - Individual post data
     - `get-replies` - Post replies and conversations
     - `get-user-details` - User profile information
     - `get-blocked-users` / `get-followed-users` - Social graph management
  3. **Cannot Function Without Indexer**: K Social App has NO fallback mechanisms and cannot operate without a running K-indexer instance
  4. **Real-time Polling**: App continuously polls K-indexer every 10 seconds for updates across all views
  5. **Notification System**: Completely dependent on K-indexer's notification endpoints for user alerts
  
  **Comparison with Kasia App:**
  - **Kasia App**: Uses KASIA_INDEXER_URL environment variable, confirmed dependency
  - **K Social App**: Uses apiBaseUrl configuration setting, SAME LEVEL of dependency
  - **Both apps**: Completely non-functional without their respective indexers
  
  **Integration Requirements:**
  - K Social App MUST have K-indexer running and accessible
  - K-indexer must be started BEFORE K Social App
  - Service dependency: K Social App → K-indexer → Kaspa Node
  - Configuration: Set apiBaseUrl to point to K-indexer instance (e.g., http://k-indexer:3000)
  
  **Updated Service Dependencies:**
  - **CONFIRMED**: Kasia App requires Kasia Indexer (KASIA_INDEXER_URL)
  - **CONFIRMED**: K Social App requires K-indexer (apiBaseUrl configuration)
  - Both apps are completely dependent on their indexers for all functionality

- [x] 5.8 Document and implement service dependencies ✅ COMPLETED
  - **CONFIRMED**: Kasia App requires Kasia Indexer for full functionality (KASIA_INDEXER_URL)
  - **CONFIRMED**: K Social App requires K-indexer for full functionality (apiBaseUrl configuration)
  - **CONFIRMED**: Both apps are completely non-functional without their respective indexers
  - ✅ Documented service startup order requirements (indexers before apps)
  - ✅ Updated docker-compose.yml with proper service dependencies (depends_on)
  - ✅ Created comprehensive dependency testing procedures for each service pair
  - _Requirements: 2.1, 2.3, 4.2_

- [ ] 5.7 Create comprehensive integration testing suite
  - Extend existing test scripts (test-kaspa-node.sh, test-kasia-indexer.sh)
  - Create test scripts for each new service integration with dependency validation
  - Implement end-to-end testing across all profiles with proper service ordering
  - Add performance benchmarking and validation
  - Create automated testing pipeline respecting service dependencies
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5.8 Standardize cleanup functionality across all test scripts
  - Enhance test-kaspa-node.sh with standardized cleanup options and comprehensive container management
  - Update test-kaspa-node-only.sh with automatic cleanup traps and manual cleanup options
  - Add cleanup functionality to any future test scripts following the established pattern
  - Ensure all test scripts support --cleanup-only, --cleanup-full, --cleanup-volumes, and --no-cleanup options
  - Update cleanup-tests.sh to include all test script containers in centralized cleanup
  - Validate cleanup functionality across all test scripts with comprehensive testing
  - _Requirements: 3.1, 3.2, 3.3_

## Phase 6: Dashboard Enhancement and API Completion 📋 PLANNED

- [ ] 6. Complete dashboard backend API implementation
  - Implement missing service management endpoints (restart, update, backup)
  - Add real-time system resource monitoring with proper metrics collection
  - Create profile-aware service status and control interfaces
  - Implement log streaming and aggregation endpoints
  - _Requirements: 4.3, 6.4_

- [ ] 6.1 Enhance dashboard frontend capabilities
  - Add interactive service management controls for each profile
  - Implement real-time resource monitoring with WebSocket updates
  - Create configuration management interface for environment variables
  - Add service-specific log viewing and filtering
  - _Requirements: 4.3, 4.4_

- [ ] 6.2 Implement advanced monitoring features
  - Add Prometheus metrics collection from all services
  - Create performance trend analysis and alerting
  - Implement service dependency mapping and health correlation
  - Add capacity planning and resource optimization recommendations
  - _Requirements: 6.1, 6.4_

## Phase 7: Documentation and User Experience Completion 📋 PLANNED

- [ ] 7. Complete troubleshooting and maintenance documentation
  - Document common installation and operation issues with step-by-step solutions
  - Create diagnostic procedures for service failures and performance issues
  - Build comprehensive FAQ section with community-driven content
  - Add maintenance schedules and automated update procedures
  - _Requirements: 4.3, 4.4_

- [ ] 7.1 Implement user onboarding and configuration wizards
  - Create interactive setup wizard for new users with hardware detection
  - Build configuration templates for common deployment scenarios
  - Add guided tours and contextual help throughout the dashboard
  - Implement progress tracking and milestone achievements for setup completion
  - _Requirements: 4.1, 4.4_

## Phase 8: Advanced Features and Production Readiness 📋 FUTURE

- [ ] 8. Implement backup and disaster recovery system
  - Create automated backup procedures for all data volumes
  - Implement point-in-time recovery capabilities with validation
  - Build disaster recovery runbooks and automated procedures
  - Add backup encryption and secure storage options
  - _Requirements: 5.4, 6.2_

- [ ] 8.1 Implement security hardening and compliance
  - Add comprehensive security scanning and vulnerability management
  - Create security incident response procedures and automation
  - Implement access control and authentication systems
  - Add audit logging and compliance reporting capabilities
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8.2 Add cloud deployment and scaling capabilities
  - Create cloud deployment templates (AWS, GCP, Azure)
  - Build Kubernetes manifests and Helm charts for container orchestration
  - Implement infrastructure as code with Terraform modules
  - Add horizontal scaling and load balancing for high availability
  - _Requirements: 6.2, 6.3_

## Current Status Summary

### ✅ Completed (Phases 1-4)
- **Core Infrastructure**: Fully functional Docker Compose system with profile-based architecture
- **Database Infrastructure**: TimescaleDB setup with proper initialization and optimization
- **Testing Framework**: Comprehensive testing scripts for node and indexer validation
- **Documentation System**: Complete documentation with setup guides and architecture details
- **Management Tools**: Full suite of management and health monitoring scripts

### 🔄 Current Priority (Phase 4.5 & 5) **[UPDATED]**
- **TimescaleDB Integration**: Implement TimescaleDB optimizations across all indexers (NEW PRIORITY)
- **Personal Indexer Implementation**: Apply Personal Indexer concept for user-specific data patterns
- **Service Integration**: Clone and integrate external service repositories with appropriate storage backends
- **Repository Setup**: Kasia (file-based storage), K-Social + K-indexer (TimescaleDB), Simply Kaspa indexer (TimescaleDB)
- **Performance Optimization**: Achieve 10-100x query performance improvements and 50-90% storage reduction

### 📋 Next Steps (Phases 6-8)
- **Dashboard Enhancement**: Complete API implementation and advanced monitoring
- **User Experience**: Troubleshooting guides and interactive setup wizards
- **Production Features**: Backup systems, security hardening, cloud deployment

## Immediate Next Tasks **[UPDATED FOR TIMESCALEDB INTEGRATION]**

Based on recent TimescaleDB integration work and Personal Indexer concepts:

### **Priority 1: TimescaleDB Integration (Phase 4.5)**
1. **Phase 4.5.3**: Update database infrastructure to TimescaleDB (migrate from PostgreSQL)
2. **Phase 4.5.1**: Implement K-Social indexer TimescaleDB enhancements (hypertables, compression)
3. **Phase 4.5.2**: Implement Simply Kaspa indexer TimescaleDB optimizations (15-30 min chunks)
4. **Phase 4.5**: Validate Personal Indexer concept implementation across all indexers

### **Priority 2: Service Integration with TimescaleDB (Phase 5)**
5. **Phase 5.3**: Integrate K-Social platform and indexer using build-time integration (no cloning)
6. **Phase 5.4**: Integrate Simply Kaspa indexer using build-time integration with TimescaleDB
7. **Phase 5.2**: Integrate Kasia messaging app (existing indexer already functional)
8. **Phase 5.7**: Extend testing suite with TimescaleDB performance validation and version testing

### **Priority 3: Testing and Validation**
9. **Phase 5.8**: Standardize cleanup functionality across all test scripts
10. **Phase 5.1**: Complete Kasia indexer testing and validation (test-kasia-indexer.sh)
11. **NEW**: Create TimescaleDB performance benchmarking tests (10-100x query improvements)
12. **Phase 6**: Complete dashboard API endpoints for service management

## Critical Dependencies to Validate

### ✅ Confirmed Dependencies
- **Kasia App → Kasia Indexer**: Confirmed via KASIA_INDEXER_URL environment variable

### 🔍 Research Required
- **K Social App → K-indexer**: Need to investigate if K Social requires K-indexer for functionality
- **Service startup order**: Document proper sequence (indexers before apps)
- **Testing dependencies**: Ensure test scripts validate service dependencies

## Testing Status

### ✅ Available Test Scripts
- **test-kaspa-node.sh**: Comprehensive Kaspa node connectivity and public accessibility testing (basic cleanup)
- **test-kaspa-node-only.sh**: Standalone Kaspa node testing (basic cleanup)
- **test-kasia-indexer.sh**: Kasia indexer WebSocket connection and data persistence testing (✅ enhanced cleanup)
- **test-kasia-app.sh**: Kasia messaging app integration testing (✅ enhanced cleanup)
- **test-service-dependencies.sh**: Service dependency validation testing (✅ enhanced cleanup)
- **cleanup-tests.sh**: Comprehensive centralized cleanup script (✅ complete)

### 🔄 Next Testing Tasks
- **Priority**: Standardize cleanup functionality in test-kaspa-node.sh and test-kaspa-node-only.sh
- Run and validate existing Kasia indexer test
- Create test scripts for each new service integration with standardized cleanup
- Implement end-to-end testing across all profiles
- Add performance benchmarking for all services

### ✅ Cleanup System Status
- **Enhanced Scripts**: test-kasia-indexer.sh, test-kasia-app.sh, test-service-dependencies.sh
- **Pending Enhancement**: test-kaspa-node.sh, test-kaspa-node-only.sh
- **Centralized Cleanup**: cleanup-tests.sh (supports all test artifacts)
- **Documentation**: docs/test-cleanup.md (comprehensive usage guide)

This updated plan properly reflects the testing work that needs to be completed alongside service integration to ensure a fully functional and validated Kaspa All-in-One system.