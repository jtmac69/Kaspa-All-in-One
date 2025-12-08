# Web-Based Installation Wizard Requirements

## Introduction

This document defines the requirements for a web-based installation wizard that guides users through the initial setup of the Kaspa All-in-One system. The wizard will provide an intuitive, visual interface for selecting deployment profiles, configuring services, and validating the installation.

## Glossary

- **Installation_Wizard**: A host-based web interface that guides users through system setup
- **Core_Profile**: Kaspa node deployment (public or private) with optional wallet
- **Kaspa_User_Applications_Profile**: User-facing applications (Kasia, K-Social, Kaspa Explorer) with public or local indexer options
- **Indexer_Services_Profile**: Optional local indexers (Kasia-indexer, K-Indexer, Simply-Kaspa Indexer) for application backends
- **Archive_Node_Profile**: Non-pruning Kaspa node for complete blockchain history
- **Mining_Profile**: Local mining stratum pointed to local Kaspa node/wallet
- **Developer_Mode**: Cross-cutting feature adding inspection tools, exposed ports, and development utilities to any profile
- **Service**: A Docker container component (kaspa-node, indexers, apps, etc.)
- **Configuration**: Environment variables and settings for services
- **Validation**: Automated checks to ensure system requirements are met
- **TimescaleDB**: Shared PostgreSQL time-series database for indexer services
- **Management_Dashboard**: Web-based interface for monitoring services and accessing wizard for reconfiguration

## Requirements

### Requirement 1: Initial System Check

**User Story:** As a new user, I want the wizard to check my system requirements automatically, so that I know if my system can run the selected services.

#### Acceptance Criteria

1. WHEN the wizard loads, THE Installation Wizard SHALL check for Docker installation
2. WHEN the wizard loads, THE Installation Wizard SHALL check for Docker Compose installation
3. WHEN the wizard loads, THE Installation Wizard SHALL verify minimum system resources (CPU, RAM, disk space)
4. WHEN the wizard loads, THE Installation Wizard SHALL check for required network ports availability
5. IF system requirements are not met, THEN THE Installation Wizard SHALL display clear error messages with remediation steps

### Requirement 2: Profile Selection Interface

**User Story:** As a user, I want to visually select which services I want to run, so that I can customize my deployment without editing configuration files.

#### Acceptance Criteria

1. THE Installation_Wizard SHALL display all available profiles (Core, Kaspa User Applications, Indexer Services, Archive Node, Mining) with descriptions
2. THE Installation_Wizard SHALL show service dependencies for each profile with startup order visualization
3. THE Installation_Wizard SHALL display estimated resource requirements per profile and warn about combined requirements when multiple profiles are selected
4. WHEN a user selects a profile, THE Installation_Wizard SHALL highlight dependent services and required prerequisites
5. THE Installation_Wizard SHALL allow multiple profile selection with conflict detection and circular dependency prevention
6. WHEN a user selects Kaspa User Applications profile, THE Installation_Wizard SHALL prompt whether to use public indexers or local Indexer Services
7. WHEN a user selects Mining profile, THE Installation_Wizard SHALL require Core Profile or Archive Node Profile as prerequisite
8. THE Installation_Wizard SHALL provide a Developer Mode toggle that adds development features to any selected profile

### Requirement 3: Service Configuration

**User Story:** As a user, I want to configure service settings through a web form, so that I don't have to manually edit environment files.

#### Acceptance Criteria

1. THE Installation_Wizard SHALL provide form fields for all configurable environment variables
2. THE Installation_Wizard SHALL display default values with explanatory tooltips
3. THE Installation_Wizard SHALL validate user input in real-time
4. THE Installation_Wizard SHALL generate secure random passwords for database services
5. THE Installation_Wizard SHALL allow advanced users to view and edit the generated .env file
6. WHEN Indexer Services profile is selected, THE Installation_Wizard SHALL configure shared TimescaleDB instance with separate databases per indexer
7. WHEN Core Profile is selected with "other services will use this node" option, THE Installation_Wizard SHALL configure fallback to public Kaspa network if local node fails health checks
8. WHEN Developer Mode is enabled, THE Installation_Wizard SHALL configure debug logging, exposed ports, and development tool access
9. WHEN Core Profile or Archive Node Profile is selected, THE Installation_Wizard SHALL provide configuration options for Kaspa node RPC port (default: 16110) and P2P port (default: 16111)
10. WHEN Core Profile or Archive Node Profile is selected, THE Installation_Wizard SHALL provide network selection options (mainnet or testnet)
11. WHEN any profile with persistent data is selected, THE Installation_Wizard SHALL allow configuration of data directory locations or Docker volume names
12. THE Installation_Wizard SHALL organize configuration options into Basic and Advanced sections, with profile-specific options displayed only when relevant profiles are selected

### Requirement 4: Network Configuration

**User Story:** As a user, I want to configure network settings visually, so that I can set up public node access or custom ports easily.

#### Acceptance Criteria

1. THE Installation Wizard SHALL provide options for public vs private node configuration
2. THE Installation Wizard SHALL allow custom port configuration with conflict detection
3. THE Installation Wizard SHALL test external IP detection and display results
4. THE Installation Wizard SHALL configure firewall rules recommendations
5. THE Installation Wizard SHALL validate SSL certificate configuration if HTTPS is enabled
6. WHEN custom ports are configured, THE Installation_Wizard SHALL validate that ports are within valid range (1024-65535) and not in use by other services
7. WHEN network selection is changed from mainnet to testnet or vice versa, THE Installation_Wizard SHALL warn users about data incompatibility and recommend fresh installation

### Requirement 5: Installation Progress Tracking

**User Story:** As a user, I want to see real-time progress during installation, so that I know the system is working and how long it will take.

#### Acceptance Criteria

1. THE Installation Wizard SHALL display a progress bar during installation
2. THE Installation Wizard SHALL show current step and estimated time remaining
3. THE Installation Wizard SHALL stream real-time logs from Docker build and startup
4. THE Installation Wizard SHALL display service health checks as they complete
5. IF an error occurs, THEN THE Installation Wizard SHALL display the error with troubleshooting suggestions

### Requirement 6: Post-Installation Validation

**User Story:** As a user, I want the wizard to verify that all services started correctly, so that I can be confident the installation succeeded.

#### Acceptance Criteria

1. WHEN installation completes, THE Installation_Wizard SHALL run health checks on all services in dependency order (Kaspa Node, Indexers, Applications)
2. THE Installation_Wizard SHALL verify database connectivity and schema initialization for TimescaleDB and indexer databases
3. THE Installation_Wizard SHALL test API endpoints for all running services
4. THE Installation_Wizard SHALL display a summary of service URLs and access information
5. THE Installation_Wizard SHALL provide next steps and getting started documentation
6. IF Core Profile node fails health checks and other services depend on it, THEN THE Installation_Wizard SHALL offer options to continue with public Kaspa network or troubleshoot the local node
7. WHEN validation completes, THE Installation_Wizard SHALL provide a link to the Management Dashboard for ongoing monitoring

### Requirement 7: Configuration Persistence

**User Story:** As a user, I want my configuration choices saved, so that I can modify or reinstall without starting from scratch.

#### Acceptance Criteria

1. THE Installation Wizard SHALL save configuration to .env file
2. THE Installation Wizard SHALL create a installation-config.json file with wizard state
3. THE Installation Wizard SHALL allow loading previous configuration for modification
4. THE Installation Wizard SHALL backup existing configuration before overwriting
5. THE Installation Wizard SHALL export configuration for sharing or backup

### Requirement 8: Guided Troubleshooting

**User Story:** As a user, I want helpful error messages and troubleshooting steps, so that I can resolve issues without external help.

#### Acceptance Criteria

1. WHEN an error occurs, THE Installation Wizard SHALL display the specific error message
2. THE Installation Wizard SHALL provide context-specific troubleshooting steps
3. THE Installation Wizard SHALL link to relevant documentation sections
4. THE Installation Wizard SHALL offer to retry failed steps automatically
5. THE Installation Wizard SHALL provide a "Get Help" option with system diagnostic export

### Requirement 9: Responsive Design

**User Story:** As a user, I want the wizard to work on different devices, so that I can set up the system from my laptop, tablet, or phone.

#### Acceptance Criteria

1. THE Installation Wizard SHALL be responsive and work on screens 768px and wider
2. THE Installation Wizard SHALL use mobile-friendly touch targets and inputs
3. THE Installation Wizard SHALL adapt layout for tablet and desktop screens
4. THE Installation Wizard SHALL maintain functionality on modern browsers (Chrome, Firefox, Safari, Edge)
5. THE Installation Wizard SHALL work without internet connectivity after initial load

### Requirement 10: Security and Privacy

**User Story:** As a user, I want my configuration data to be secure, so that sensitive information like passwords is protected.

#### Acceptance Criteria

1. THE Installation Wizard SHALL generate cryptographically secure random passwords
2. THE Installation Wizard SHALL mask password fields by default with show/hide toggle
3. THE Installation Wizard SHALL communicate with backend over HTTPS when available
4. THE Installation Wizard SHALL not log sensitive information to browser console
5. THE Installation Wizard SHALL warn users about public node security implications

### Requirement 11: Multi-Step Wizard Flow

**User Story:** As a user, I want to progress through installation in logical steps, so that I'm not overwhelmed with all options at once.

#### Acceptance Criteria

1. THE Installation Wizard SHALL organize setup into distinct steps (Welcome, System Check, Profile Selection, Configuration, Installation, Completion)
2. THE Installation Wizard SHALL allow navigation between steps (Next, Back, Skip)
3. THE Installation Wizard SHALL save progress and allow resuming from any step
4. THE Installation Wizard SHALL display step indicators showing current position
5. THE Installation Wizard SHALL validate each step before allowing progression

### Requirement 12: Profile Templates and Presets

**User Story:** As a user, I want pre-configured templates for common use cases, so that I can quickly set up without making many decisions.

#### Acceptance Criteria

1. THE Installation_Wizard SHALL provide preset templates (Home Node, Public Node, Developer Setup, Full Stack)
2. THE Installation_Wizard SHALL display template descriptions and included services
3. THE Installation_Wizard SHALL allow customization of template settings
4. THE Installation_Wizard SHALL show resource requirements for each template
5. THE Installation_Wizard SHALL allow saving custom configurations as new templates

### Requirement 13: Reconfiguration and Update Management

**User Story:** As an existing user, I want to modify my installation or update services through the wizard, so that I can adapt my deployment without manual configuration changes.

#### Acceptance Criteria

1. WHEN accessed from the Management Dashboard, THE Installation_Wizard SHALL load the current installation configuration
2. THE Installation_Wizard SHALL allow users to add or remove profiles from existing installations
3. THE Installation_Wizard SHALL allow users to modify service settings and regenerate configuration
4. WHEN configuration changes are applied, THE Installation_Wizard SHALL backup existing configuration before making changes
5. THE Installation_Wizard SHALL handle service updates when underlying packages have new versions available
6. WHEN a service update is available, THE Installation_Wizard SHALL display version information and allow selective updates
7. THE Installation_Wizard SHALL assume each service handles its own data migration during updates
8. IF a service update fails, THEN THE Installation_Wizard SHALL provide rollback options to restore previous configuration

### Requirement 14: Service Startup Order and Dependencies

**User Story:** As a system operator, I want services to start in the correct order based on dependencies, so that the system initializes properly.

#### Acceptance Criteria

1. WHEN multiple profiles are selected, THE Installation_Wizard SHALL configure startup order as: Kaspa Node (if local), Indexer Services (if local), then Kaspa User Applications
2. THE Installation_Wizard SHALL prevent circular dependencies during profile selection
3. WHEN services start, THE Installation_Wizard SHALL wait for dependency health checks before starting dependent services
4. THE Installation_Wizard SHALL configure automatic restart policies with dependency awareness
5. IF a dependency service fails during startup, THEN THE Installation_Wizard SHALL provide fallback configuration options where applicable
