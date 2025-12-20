# Management Dashboard Requirements

## Introduction

This document defines the requirements for the Management Dashboard, a **host-based** web application that provides real-time monitoring, operational management, and user access to the Kaspa All-in-One system. The Dashboard runs directly on the host system (not in a container) alongside the Installation Wizard, enabling full system access, independent operation from Docker, and seamless wizard integration. It serves as the primary operational interface after initial installation.

## Related Specifications

- **Kaspa All-in-One Project**: Defines overall system architecture, profiles, and service definitions (see `.kiro/specs/kaspa-all-in-one-project/`)
- **Web Installation Wizard**: Provides initial setup and reconfiguration interface (see `.kiro/specs/web-installation-wizard/`)

**Last Cross-Reference Review**: 2024-11-29

## Glossary

- **Management_Dashboard**: Host-based web application for monitoring and managing the Kaspa All-in-One system (runs on host, not in container)
- **Installation_Wizard**: Host-based web interface for initial setup and reconfiguration (handles all configuration operations)
- **Configuration_Suggestion**: Dashboard-detected optimization opportunity that launches wizard with pre-selected context
- **Reconfiguration_Mode**: Wizard mode accessed from Dashboard for modifying existing installations
- **Kaspa_Node**: The core Kaspa blockchain node (rusty-kaspad) that maintains the blockchain state
- **Service**: A Docker container component (kaspa-node, indexers, apps, etc.)
- **Profile**: Docker Compose profile-based deployment configuration (Core, Kaspa User Applications, Indexer Services, Archive Node, Mining, Developer Mode)
- **Health_Check**: Automated validation that a service is running and responding correctly
- **Sync_Status**: The blockchain synchronization state of the Kaspa node
- **Application**: User-facing services (Kasia, K-Social, Kaspa Explorer)
- **Indexer**: Backend service that processes blockchain data (Kasia-indexer, K-Indexer, Simply-Kaspa Indexer)
- **Update_Notification**: Alert displayed when new service versions are available
- **Wallet_Operation**: Kaspa node wallet management tasks (create, balance, send, receive)
- **RPC_Interface**: Remote Procedure Call interface for interacting with Kaspa node
- **Real_Time_Update**: Live data pushed to the dashboard via WebSocket connection
- **Service_Dependency**: Relationship where one service requires another to function
- **System_Resource**: CPU, memory, disk, and network utilization metrics

## Requirements

### Requirement 1: Service Health Monitoring

**User Story:** As a system operator, I want to see the real-time health status of all running services, so that I can quickly identify and respond to issues.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Management_Dashboard SHALL display health status for all deployed services
2. WHEN a service health check completes, THE Management_Dashboard SHALL update the service status within 5 seconds
3. THE Management_Dashboard SHALL display service status as healthy, unhealthy, stopped, or starting
4. WHEN a service becomes unhealthy, THE Management_Dashboard SHALL highlight the service with visual indicators
5. THE Management_Dashboard SHALL show the last health check timestamp for each service
6. WHEN a service has an error, THE Management_Dashboard SHALL display the error message with troubleshooting suggestions
7. THE Management_Dashboard SHALL group services by profile for easier navigation
8. THE Management_Dashboard SHALL display service dependencies and their health status

### Requirement 2: Kaspa Node Status and Monitoring

**User Story:** As a node operator, I want detailed information about my Kaspa node's status and performance, so that I can ensure it's operating correctly.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL display Kaspa node sync status (synced, syncing, or not synced)
2. WHEN the node is syncing, THE Management_Dashboard SHALL show sync progress percentage and estimated time remaining
3. THE Management_Dashboard SHALL display current block height and compare it to network height
4. THE Management_Dashboard SHALL show the number of connected peers
5. THE Management_Dashboard SHALL display node version information
6. THE Management_Dashboard SHALL show node uptime
7. THE Management_Dashboard SHALL display network hash rate and difficulty
8. THE Management_Dashboard SHALL update node statistics in real-time via WebSocket connection
9. WHEN the node is not synced, THE Management_Dashboard SHALL display a prominent notification

### Requirement 3: Application Access and Links

**User Story:** As a user, I want quick access to all deployed applications from the dashboard, so that I can easily navigate to the services I need.

#### Acceptance Criteria

1. WHEN Kaspa User Applications are deployed, THE Management_Dashboard SHALL display clickable links to each application
2. THE Management_Dashboard SHALL show application status (running, stopped, unhealthy) next to each link
3. THE Management_Dashboard SHALL display application URLs with port information
4. WHEN an application is not running, THE Management_Dashboard SHALL disable the link and show the status
5. THE Management_Dashboard SHALL provide links to Kasia, K-Social, and Kaspa Explorer when deployed
6. WHEN Developer Mode is enabled, THE Management_Dashboard SHALL provide links to Portainer and pgAdmin
7. THE Management_Dashboard SHALL display application descriptions and purposes
8. THE Management_Dashboard SHALL open application links in new browser tabs

### Requirement 4: Wallet Management Interface

**User Story:** As a node operator, I want to manage my Kaspa wallet through a web interface, so that I don't need to use command-line tools.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL provide a wallet management section when a wallet is configured
2. THE Management_Dashboard SHALL display wallet balance in KAS
3. THE Management_Dashboard SHALL show the wallet address with copy-to-clipboard functionality
4. THE Management_Dashboard SHALL allow users to create a new wallet with secure password
5. THE Management_Dashboard SHALL allow users to send KAS to another address with amount and fee configuration
6. THE Management_Dashboard SHALL display recent wallet transactions with timestamps, amounts, and addresses
7. THE Management_Dashboard SHALL show transaction confirmation status
8. THE Management_Dashboard SHALL validate wallet addresses before sending transactions
9. THE Management_Dashboard SHALL display wallet creation and transaction errors with clear messages
10. THE Management_Dashboard SHALL mask sensitive wallet information by default with show/hide toggle

### Requirement 5: Update Notifications and Management

**User Story:** As a system operator, I want to be notified when service updates are available and manage updates through the dashboard, so that I can keep my system current.

#### Acceptance Criteria

1. WHEN new service versions are available, THE Management_Dashboard SHALL display update notifications with badge indicators
2. THE Management_Dashboard SHALL show available updates with current version, new version, and release date
3. THE Management_Dashboard SHALL display changelog information for each available update
4. WHEN breaking changes are detected, THE Management_Dashboard SHALL highlight the update with warning indicators
5. THE Management_Dashboard SHALL provide a button to launch the Installation Wizard for applying updates
6. THE Management_Dashboard SHALL check for updates at configurable intervals with default daily checking
7. THE Management_Dashboard SHALL allow users to manually trigger update checks
8. THE Management_Dashboard SHALL display update history with timestamps and version changes
9. WHEN updates are being applied, THE Management_Dashboard SHALL show progress and status

### Requirement 6: System Resource Monitoring

**User Story:** As a system operator, I want to monitor system resource utilization with emergency controls, so that I can ensure adequate resources are available and prevent system freezes.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL display CPU usage percentage with visual progress indicator and color-coded warnings (yellow at 80%, red at 90%)
2. THE Management_Dashboard SHALL display memory usage percentage with visual progress indicator and color-coded warnings (yellow at 85%, red at 90%)
3. THE Management_Dashboard SHALL display disk usage percentage with visual progress indicator and color-coded warnings (yellow at 80%, red at 90%)
4. THE Management_Dashboard SHALL update resource metrics in real-time via WebSocket connection every 5 seconds
5. WHEN resource usage exceeds 80%, THE Management_Dashboard SHALL display warning indicators
6. WHEN resource usage exceeds 90%, THE Management_Dashboard SHALL display critical indicators with emergency controls
7. THE Management_Dashboard SHALL show resource usage trends over time with simple graphs
8. THE Management_Dashboard SHALL display per-service resource consumption with Docker container limits vs actual usage
9. THE Management_Dashboard SHALL display system load average and uptime information
10. THE Management_Dashboard SHALL provide emergency stop button when system resources reach critical levels (>90% CPU or >90% memory)
11. THE Management_Dashboard SHALL integrate with monitoring scripts (resource-monitor.sh, emergency-stop.sh, quick-check.sh)
12. THE Management_Dashboard SHALL display Docker resource limits for each container alongside current usage
13. WHEN emergency stop is triggered, THE Management_Dashboard SHALL execute emergency-stop.sh script and display shutdown progress
9. THE Management_Dashboard SHALL integrate with resource monitoring scripts for comprehensive system oversight
10. THE Management_Dashboard SHALL provide quick access to emergency stop functionality when resources are critically high
11. THE Management_Dashboard SHALL display Docker container resource limits and current usage
12. THE Management_Dashboard SHALL show load average and system uptime information

### Requirement 7: Service Control and Management

**User Story:** As a system operator, I want to control services (start, stop, restart) from the dashboard, so that I can manage the system without using command-line tools.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL provide start, stop, and restart buttons for each service
2. WHEN a user clicks stop or restart, THE Management_Dashboard SHALL require confirmation
3. THE Management_Dashboard SHALL disable control buttons for services with active dependencies
4. WHEN a service operation completes, THE Management_Dashboard SHALL display success or error notification
5. THE Management_Dashboard SHALL update service status immediately after control operations
6. THE Management_Dashboard SHALL provide a "restart all services" option with confirmation
7. THE Management_Dashboard SHALL respect service dependencies when performing operations
8. THE Management_Dashboard SHALL display operation progress for long-running actions

### Requirement 8: Log Viewing and Aggregation

**User Story:** As a system operator, I want to view service logs from the dashboard, so that I can troubleshoot issues without accessing the server directly.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL provide a log viewer for each service
2. WHEN a user opens logs, THE Management_Dashboard SHALL display the most recent 100 lines by default
3. THE Management_Dashboard SHALL stream real-time log updates via WebSocket connection
4. THE Management_Dashboard SHALL allow users to search and filter logs by keyword
5. THE Management_Dashboard SHALL display log timestamps and severity levels with color coding
6. THE Management_Dashboard SHALL allow users to download logs as text files
7. THE Management_Dashboard SHALL provide log viewing for multiple services simultaneously
8. THE Management_Dashboard SHALL auto-scroll logs as new entries arrive with option to pause

### Requirement 9: Configuration Management Integration

**User Story:** As a system operator, I want to access configuration management from the dashboard, so that I can modify profiles and settings through a unified interface.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL provide a "Reconfigure System" button that launches the Installation Wizard in reconfiguration mode
2. THE Management_Dashboard SHALL display the current active profiles with installation status indicators
3. THE Management_Dashboard SHALL show configuration suggestions when optimization opportunities are detected (e.g., "Local indexers available - switch apps to local")
4. WHEN configuration suggestions are available, THE Management_Dashboard SHALL provide "Configure in Wizard" buttons that launch the wizard with pre-selected context
5. THE Management_Dashboard SHALL display a configuration summary showing installed profiles, key settings, and last modification date
6. WHEN the wizard completes reconfiguration, THE Management_Dashboard SHALL reload and reflect changes automatically
7. THE Management_Dashboard SHALL warn users that reconfiguration may cause service restarts
8. THE Management_Dashboard SHALL display configuration change history with timestamps and change descriptions
9. THE Management_Dashboard SHALL allow users to view the current .env configuration in read-only mode
10. THE Management_Dashboard SHALL detect when wallet is not configured and suggest wallet setup through the wizard
11. THE Management_Dashboard SHALL detect when local indexers are available but apps are using public indexers and suggest switching

### Requirement 10: Alert and Notification System

**User Story:** As a system operator, I want to receive alerts for critical system events, so that I can respond quickly to issues.

#### Acceptance Criteria

1. WHEN a service becomes unhealthy, THE Management_Dashboard SHALL display an alert notification
2. WHEN system resources exceed critical thresholds, THE Management_Dashboard SHALL display resource alerts
3. WHEN the Kaspa node loses sync, THE Management_Dashboard SHALL display a sync alert
4. WHEN updates are available, THE Management_Dashboard SHALL display update notifications
5. THE Management_Dashboard SHALL display alert history with timestamps and resolution status
6. THE Management_Dashboard SHALL allow users to acknowledge and dismiss alerts
7. THE Management_Dashboard SHALL prioritize alerts by severity (info, warning, critical)
8. THE Management_Dashboard SHALL display unread alert count in the header

### Requirement 11: Real-Time Updates and WebSocket Communication

**User Story:** As a system operator, I want the dashboard to update automatically without refreshing, so that I always see current information.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL establish WebSocket connection on page load
2. WHEN the WebSocket connection is established, THE Management_Dashboard SHALL display connected status
3. WHEN the WebSocket connection fails, THE Management_Dashboard SHALL display disconnected status and attempt reconnection
4. THE Management_Dashboard SHALL receive service status updates via WebSocket every 5 seconds
5. THE Management_Dashboard SHALL receive resource metrics via WebSocket every 5 seconds
6. THE Management_Dashboard SHALL receive log streams via WebSocket in real-time
7. WHEN the browser tab is hidden, THE Management_Dashboard SHALL reduce update frequency to conserve resources
8. THE Management_Dashboard SHALL automatically reconnect WebSocket after network interruptions

### Requirement 12: Responsive Design and Accessibility

**User Story:** As a user, I want the dashboard to work on different screen sizes and be accessible, so that I can monitor my system from various devices.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL be responsive and work on screens 768px and wider
2. THE Management_Dashboard SHALL adapt layout for tablet and desktop screens
3. THE Management_Dashboard SHALL use mobile-friendly touch targets for buttons and controls
4. THE Management_Dashboard SHALL maintain functionality on modern browsers (Chrome, Firefox, Safari, Edge)
5. THE Management_Dashboard SHALL use semantic HTML for screen reader compatibility
6. THE Management_Dashboard SHALL provide keyboard navigation for all interactive elements
7. THE Management_Dashboard SHALL use sufficient color contrast for readability
8. THE Management_Dashboard SHALL provide text alternatives for visual indicators

### Requirement 13: Security and Authentication

**User Story:** As a system administrator, I want the dashboard to be secure and protect sensitive information, so that unauthorized users cannot access or modify the system.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL communicate with backend over HTTPS when SSL is configured
2. THE Management_Dashboard SHALL mask sensitive information (passwords, private keys) by default
3. THE Management_Dashboard SHALL not log sensitive information to browser console
4. THE Management_Dashboard SHALL implement CORS policies to prevent unauthorized access
5. THE Management_Dashboard SHALL validate all user inputs before sending to backend
6. THE Management_Dashboard SHALL display security warnings for sensitive operations
7. THE Management_Dashboard SHALL implement rate limiting for API requests
8. THE Management_Dashboard SHALL provide session timeout for inactive users when authentication is enabled

### Requirement 14: Performance and Optimization

**User Story:** As a user, I want the dashboard to load quickly and respond smoothly, so that I can efficiently monitor and manage the system.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL load initial page within 2 seconds on standard hardware
2. THE Management_Dashboard SHALL render service status updates within 100ms of receiving data
3. THE Management_Dashboard SHALL use efficient DOM updates to prevent UI lag
4. THE Management_Dashboard SHALL lazy-load non-critical resources
5. THE Management_Dashboard SHALL cache static assets for faster subsequent loads
6. THE Management_Dashboard SHALL limit concurrent API requests to prevent overload
7. THE Management_Dashboard SHALL use pagination or virtual scrolling for large log displays
8. THE Management_Dashboard SHALL optimize WebSocket message size for bandwidth efficiency

### Requirement 15: Backup and Export Functionality

**User Story:** As a system operator, I want to backup configuration and export diagnostic information from the dashboard, so that I can recover from failures and get support.

#### Acceptance Criteria

1. THE Management_Dashboard SHALL provide a backup button that creates configuration backup
2. WHEN backup is initiated, THE Management_Dashboard SHALL download backup as compressed archive
3. THE Management_Dashboard SHALL include .env file, docker-compose.yml, and installation state in backups
4. THE Management_Dashboard SHALL provide diagnostic export with system information and logs
5. THE Management_Dashboard SHALL display backup history with timestamps and file sizes
6. THE Management_Dashboard SHALL allow users to restore from backup through the Installation Wizard
7. THE Management_Dashboard SHALL validate backup integrity before allowing restore
8. THE Management_Dashboard SHALL warn users about data loss risks before restore operations

### Requirement 17: Installation Wizard Integration for Automatic Monitoring

**User Story:** As a user completing installation with indexer services, I want automatic monitoring setup, so that my system is protected from resource exhaustion without manual configuration.

#### Acceptance Criteria

1. WHEN the Installation Wizard completes with Indexer Services profile, THE Installation_Wizard SHALL automatically configure resource monitoring scripts
2. THE Installation_Wizard SHALL set appropriate permissions for monitoring scripts (resource-monitor.sh, emergency-stop.sh, quick-check.sh)
3. THE Installation_Wizard SHALL add resource monitoring startup to the dashboard service configuration
4. THE Installation_Wizard SHALL validate that monitoring tools are properly installed and functional
5. THE Installation_Wizard SHALL configure default alert thresholds (CPU: 80%, Memory: 85%, Load: 10.0)
6. THE Installation_Wizard SHALL display monitoring setup status in the completion summary
7. THE Installation_Wizard SHALL provide option to enable/disable automatic monitoring during installation
8. THE Installation_Wizard SHALL test monitoring functionality as part of post-installation validation
9. THE Installation_Wizard SHALL create monitoring log directory and configure log rotation
10. THE Installation_Wizard SHALL integrate monitoring status into the "Go to Dashboard" completion step

#### Acceptance Criteria

1. WHEN the Installation Wizard completes setup with indexer-services profile, THE Installation_Wizard SHALL automatically start resource monitoring
2. THE Installation_Wizard SHALL configure resource monitoring scripts with appropriate permissions
3. THE Installation_Wizard SHALL add resource monitoring startup to the Management Dashboard service
4. THE Installation_Wizard SHALL display resource monitoring status in the completion summary
5. THE Installation_Wizard SHALL provide option to enable/disable automatic resource monitoring
6. THE Installation_Wizard SHALL configure resource monitoring alerts and thresholds
7. THE Installation_Wizard SHALL create systemd service for resource monitoring if requested
8. THE Installation_Wizard SHALL validate that resource monitoring tools are properly installed
