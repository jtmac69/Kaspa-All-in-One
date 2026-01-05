# Wizard-Dashboard Unification Requirements

## Introduction

This document defines the requirements for unifying the Installation Wizard and Management Dashboard into a cohesive, integrated system. Both tools serve complementary purposes in the Kaspa All-in-One deployment: the Wizard handles installation, configuration, and reconfiguration, while the Dashboard provides monitoring and operational management. They must share state, visual identity, and provide seamless navigation between each other.

## Problem Statement

Current issues identified through testing:
1. Dashboard shows services that aren't installed (doesn't read installation state)
2. Dashboard doesn't detect running Kaspa node (wrong port, no fallback)
3. Dashboard UI doesn't match Wizard branding (purple vs Kaspa blue/teal)
4. Wizard doesn't show existing installation state for modification
5. No shared state mechanism between Wizard and Dashboard
6. Profile filter in Dashboard doesn't work
7. Services dropdown doesn't populate with actual profiles

## Glossary

- **Installation_State**: Shared JSON file (`.kaspa-aio/installation-state.json`) containing current deployment configuration
- **Shared_Design_System**: Common CSS variables, components, and visual identity used by both Wizard and Dashboard
- **Wizard_Mode**: Operating mode of wizard - "fresh" for new installations, "reconfiguration" for modifications
- **Service_Detection**: Process of discovering which Docker containers are running and their health status
- **Port_Fallback**: Strategy to try multiple ports (16110, 16111) when connecting to Kaspa node
- **Profile_Filter**: UI control to filter displayed services by installed profile
- **Cross_Launch**: Navigation from Dashboard to Wizard or vice versa with context preservation

## Requirements

### Requirement 1: Shared Installation State

**User Story:** As a user, I want both the Wizard and Dashboard to know what's currently installed, so that they show relevant information and options.

#### Acceptance Criteria

1. THE Installation_State file SHALL be located at `.kaspa-aio/installation-state.json`
2. WHEN the Wizard completes installation, THE Wizard SHALL write the installation state including: installed profiles, service list, configuration settings, and timestamps
3. WHEN the Dashboard loads, THE Dashboard SHALL read the installation state to determine which services to display
4. THE Dashboard SHALL only display services that are listed in the installation state
5. WHEN the installation state file doesn't exist, THE Dashboard SHALL display a "No installation detected" message with a link to launch the Wizard
6. THE Installation_State SHALL include: version, installedAt, lastModified, phase, profiles (selected array), configuration (network, publicNode, hasIndexers, etc.), services array, and summary
7. WHEN services are added or removed via Wizard, THE Wizard SHALL update the installation state file
8. THE Dashboard SHALL watch the installation state file for changes and refresh when modified

### Requirement 2: Shared Visual Design System

**User Story:** As a user, I want the Wizard and Dashboard to look like the same application, so that I have a consistent experience.

#### Acceptance Criteria

1. THE Dashboard SHALL use the same CSS variables as the Wizard (defined in `services/wizard/frontend/public/styles/core/variables.css`)
2. THE Dashboard SHALL use Kaspa brand colors: primary blue (#70C7BA), dark (#49C8B5), light (#9FE7DC), purple accent (#7B61FF)
3. THE Dashboard SHALL use the same typography: Montserrat for headings, Open Sans for body text
4. THE Dashboard SHALL use the same button styles, card styles, and form styles as the Wizard
5. THE Dashboard SHALL use the same gradient backgrounds as the Wizard
6. THE Dashboard SHALL use the same status colors: success (#7ED321), warning (#F5A623), error (#D0021B)
7. THE Shared_Design_System SHALL be implemented as a common CSS file that both services import
8. THE Dashboard header SHALL match the Wizard header style with Kaspa branding

### Requirement 3: Kaspa Node Detection with Port Fallback

**User Story:** As a user, I want the Dashboard to detect my running Kaspa node regardless of which port it's using, so that I see accurate status information.

#### Acceptance Criteria

1. WHEN connecting to Kaspa node, THE Dashboard SHALL first try the configured port from installation state
2. IF the configured port fails, THE Dashboard SHALL try port 16110 (local RPC)
3. IF port 16110 fails, THE Dashboard SHALL try port 16111 (public RPC)
4. WHEN a port succeeds, THE Dashboard SHALL cache the working port for subsequent requests
5. THE Dashboard SHALL display which port is being used for the connection
6. IF all ports fail, THE Dashboard SHALL display "Kaspa Node: Not Available" with troubleshooting suggestions
7. THE Dashboard SHALL re-attempt port detection every 30 seconds when node is unavailable
8. WHEN the node becomes available, THE Dashboard SHALL update status within 5 seconds

### Requirement 4: Service-Based Display and Filtering

**User Story:** As a user, I want to see only the services I've installed, with flexible filtering options, so that the Dashboard isn't cluttered with irrelevant information and I can organize services as needed.

#### Acceptance Criteria

1. THE Dashboard SHALL read installed services from the installation state
2. THE Dashboard SHALL only display service cards for services listed in the installation state
3. THE Dashboard SHALL provide a service filter dropdown with multiple filtering options
4. THE Service_Filter dropdown SHALL include options for: "All Services", individual service types, and profile-based groupings when available
5. WHEN a filter is selected, THE Dashboard SHALL show only services matching that filter criteria
6. THE Dashboard SHALL display service type badges on service cards indicating their category
7. THE Dashboard SHALL support flexible service organization regardless of how services were originally installed (profiles, templates, or ad-hoc)
8. THE Dashboard SHALL display a count of services for each filter option in the dropdown

### Requirement 5: Wizard Reconfiguration Mode

**User Story:** As a user with an existing installation, I want the Wizard to show me what's already installed and let me modify it, so that I can add or remove services.

#### Acceptance Criteria

1. WHEN the Wizard loads and installation state exists, THE Wizard SHALL enter reconfiguration mode
2. IN reconfiguration mode, THE Wizard SHALL display a landing page with options: "Add New Profiles", "Modify Configuration", "Remove Profiles"
3. THE Wizard SHALL display currently installed profiles with "Installed ✓" badges
4. THE Wizard SHALL display available (not installed) profiles in a separate section
5. WHEN a user selects an installed profile, THE Wizard SHALL show options to modify or remove it
6. THE Wizard SHALL preserve existing service data by default when modifying configurations
7. THE Wizard SHALL warn users about data loss when removing profiles
8. WHEN reconfiguration completes, THE Wizard SHALL update the installation state file

### Requirement 6: Cross-Launch Navigation

**User Story:** As a user, I want to seamlessly navigate between the Dashboard and Wizard, so that I can monitor and configure my system from either interface.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Reconfigure System" button that launches the Wizard
2. WHEN launching Wizard from Dashboard, THE Dashboard SHALL pass context (current state, suggested action)
3. THE Wizard completion page SHALL provide a "Go to Dashboard" button
4. WHEN launching Dashboard from Wizard, THE Wizard SHALL NOT use window.open() (causes popup blocker issues)
5. THE Wizard SHALL provide a clickable link to Dashboard URL instead of auto-opening
6. THE Dashboard SHALL provide quick-action buttons that launch Wizard with specific contexts (e.g., "Add Mining Profile")
7. WHEN configuration suggestions are available, THE Dashboard SHALL provide "Configure in Wizard" buttons
8. THE Dashboard header SHALL include a "Wizard" link for easy access

### Requirement 7: Service Health Detection

**User Story:** As a user, I want the Dashboard to accurately detect which services are running and healthy, so that I can trust the status information.

#### Acceptance Criteria

1. THE Dashboard SHALL query Docker for container status of installed services
2. THE Dashboard SHALL display service status as: healthy, unhealthy, stopped, or starting
3. THE Dashboard SHALL use Docker health checks when available
4. FOR services without health checks, THE Dashboard SHALL check if the container is running
5. THE Dashboard SHALL display the actual Docker container name for each service
6. WHEN a service is not found in Docker, THE Dashboard SHALL display "Not Found" status
7. THE Dashboard SHALL refresh service status every 10 seconds
8. THE Dashboard SHALL display the last status check timestamp

### Requirement 8: Host-Based Operation

**User Story:** As a system operator, I want both the Wizard and Dashboard to run on the host (not in containers), so that they can manage Docker containers and access system resources.

#### Acceptance Criteria

1. THE Wizard SHALL run as a host-based Node.js application (not containerized)
2. THE Dashboard SHALL run as a host-based Node.js application (not containerized)
3. BOTH services SHALL have direct access to Docker socket for container management
4. BOTH services SHALL have direct access to the file system for configuration files
5. BOTH services SHALL be able to execute shell commands for system operations
6. THE services SHALL be installable via npm and startable via npm start
7. THE services SHALL be configurable to run as systemd services for production
8. THE services SHALL NOT require Docker to be running to start (graceful degradation)

### Requirement 9: Unified Error Handling

**User Story:** As a user, I want consistent error messages and troubleshooting guidance across both tools, so that I can resolve issues efficiently.

#### Acceptance Criteria

1. THE Dashboard SHALL display user-friendly error messages (not raw error objects)
2. WHEN Kaspa node is unavailable, THE Dashboard SHALL suggest checking if the container is running
3. WHEN Docker is unavailable, THE Dashboard SHALL display "Docker not accessible" with remediation steps
4. THE Dashboard SHALL log detailed errors to console for debugging
5. THE Dashboard SHALL NOT crash when services are unavailable (graceful degradation)
6. THE Dashboard SHALL display "Service Unavailable" placeholders instead of empty sections
7. THE Wizard SHALL use the same error message patterns as the Dashboard
8. BOTH tools SHALL provide links to documentation for common issues

### Requirement 10: Configuration Synchronization

**User Story:** As a user, I want changes made in the Wizard to be immediately reflected in the Dashboard, so that I don't see stale information.

#### Acceptance Criteria

1. WHEN the Wizard modifies configuration, THE Wizard SHALL update the installation state file
2. THE Dashboard SHALL detect installation state file changes within 5 seconds
3. WHEN installation state changes, THE Dashboard SHALL refresh service list and status
4. THE Dashboard SHALL display a notification when configuration changes are detected
5. THE Dashboard SHALL provide a manual "Refresh" button to force state reload
6. WHEN the Wizard is running, THE Dashboard SHALL display "Configuration in progress" indicator
7. THE Dashboard SHALL NOT allow service control operations while Wizard is running
8. WHEN Wizard completes, THE Dashboard SHALL automatically refresh

### Requirement 11: Shared Resource Directory

**User Story:** As a developer, I want shared resources (CSS, images, fonts) to be maintained in one location, so that updates apply to both tools.

#### Acceptance Criteria

1. THE Shared_Design_System SHALL be located in a common directory accessible to both services
2. THE Dashboard SHALL import CSS variables from the shared location
3. THE Wizard SHALL import CSS variables from the shared location
4. BOTH services SHALL use the same Kaspa logo and brand assets
5. BOTH services SHALL use the same font files
6. THE shared resources SHALL be copied to each service's public directory during build
7. THE shared resources SHALL include: variables.css, base.css, buttons.css, cards.css, forms.css
8. THE shared resources SHALL be versioned to ensure consistency

### Requirement 12: Packaging and Distribution

**User Story:** As a user, I want to install the Kaspa All-in-One system with a single command, so that setup is simple and reliable.

#### Acceptance Criteria

1. THE installation package SHALL include both Wizard and Dashboard
2. THE installation script SHALL set up both services with correct permissions
3. THE installation script SHALL create the `.kaspa-aio` directory for shared state
4. THE installation script SHALL configure both services to start on boot (optional)
5. THE installation script SHALL NOT containerize the Wizard or Dashboard
6. THE installation script SHALL verify Node.js and npm are installed
7. THE installation script SHALL install npm dependencies for both services
8. THE installation script SHALL provide clear success/failure messages

