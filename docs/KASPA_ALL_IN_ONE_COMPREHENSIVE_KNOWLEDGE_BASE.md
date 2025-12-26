# Kaspa All-in-One Comprehensive Knowledge Base

## Overview

This document provides comprehensive knowledge about the Kaspa All-in-One system architecture, covering three interconnected specifications:

1. **Kaspa All-in-One Project** - Overall system architecture and service definitions
2. **Web Installation Wizard** - Initial setup and reconfiguration interface  
3. **Management Dashboard** - Operational monitoring and management interface

This knowledge base is designed to help AI agents understand the complete system architecture, relationships between components, and key implementation details.

## System Architecture Overview

### High-Level Architecture

The Kaspa All-in-One system uses a **hybrid architecture** combining containerized services with host-based management tools:

```
┌─────────────────────────────────────────────────────────────┐
│                    Host System                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Installation    │◄──►│ Management      │                │
│  │ Wizard          │    │ Dashboard       │                │
│  │ (Node.js)       │    │ (Node.js)       │                │
│  │ Port: 3000      │    │ Port: 8080      │                │
│  └─────────────────┘    └─────────────────┘                │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────┐               │
│  │           Docker Engine                  │               │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │               │
│  │  │Kaspa │ │Kasia │ │K-Soc │ │Nginx │   │               │
│  │  │Node  │ │App   │ │ial   │ │Proxy │   │               │
│  │  └──────┘ └──────┘ └──────┘ └──────┘   │               │
│  └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Host-Based Management Tools**: Both wizard and dashboard run on the host (not containerized) for:
   - Full system access and Docker management
   - Independent operation from Docker issues
   - Seamless integration between wizard and dashboard
   - Ability to monitor and restart Docker itself

2. **Profile-Based Deployment**: Uses Docker Compose profiles for modular service deployment
3. **Direct Access Architecture**: Services accessed directly by port, Nginx only proxies containerized Kaspa applications
4. **Shared Database Architecture**: Single TimescaleDB container with separate databases per indexer

## Three Core Specifications

### 1. Kaspa All-in-One Project (Main System)

**Purpose**: Defines overall system architecture, profiles, and service definitions

**Key Components**:
- **Profile System**: Modular deployment configurations
- **Service Definitions**: All containerized services and their relationships
- **Dependency Management**: Service startup order and fallback strategies
- **Update System**: Automated update checking and management
- **TimescaleDB Integration**: Shared database for indexer services

**Profiles Available**:
- **Core Profile**: Kaspa node (public/private) with optional wallet
- **Kaspa User Applications**: User-facing apps (Kasia, K-Social, Kaspa Explorer)
- **Indexer Services**: Local indexers with shared TimescaleDB
- **Archive Node Profile**: Non-pruning node for complete history
- **Mining Profile**: Local mining stratum (requires Core or Archive)
- **Developer Mode**: Cross-cutting feature adding debug tools to any profile

### 2. Web Installation Wizard (Configuration Management)

**Purpose**: Handles all configuration operations - initial setup, reconfiguration, and updates

**Key Features**:
- **Multi-Mode Operation**: Initial installation, reconfiguration, and update modes
- **Profile Selection with State**: Visual interface showing installed vs available profiles
- **Configuration Management**: Form-based configuration with validation
- **Dependency Resolution**: Automatic dependency checking and conflict prevention
- **Infrastructure Validation**: Comprehensive testing of Nginx and TimescaleDB
- **Backup Management**: Automatic backups before changes

**Architecture**: Host-based Node.js application (port 3000)

### 3. Management Dashboard (Operational Interface)

**Purpose**: Real-time monitoring, operational management, and user access after installation

**Key Features**:
- **Service Health Monitoring**: Real-time status of all services
- **Kaspa Node Management**: Sync status, peer count, blockchain info
- **Wallet Operations**: Balance, transactions, send/receive
- **Resource Monitoring**: CPU, memory, disk with emergency controls
- **Update Notifications**: Display available updates and launch wizard
- **Configuration Suggestions**: Detect optimization opportunities

**Architecture**: Host-based Node.js application (port 8080) with WebSocket for real-time updates

## Profile System Deep Dive

### Profile Dependencies and Startup Order

**Startup Sequence**:
1. **Kaspa Node** (Core or Archive, if local) - Order 1
2. **Indexer Services** (if local indexers selected) - Order 2  
3. **Kaspa User Applications** (apps that depend on indexers) - Order 3

**Dependency Rules**:
- Mining Profile **requires** Core or Archive Node Profile (fully synced)
- Kaspa User Applications **can use** public or local indexers (no hard dependency)
- Indexer Services **can use** local node or public Kaspa network (fallback strategy)
- Developer Mode is a **toggle** that enhances any profile

**Fallback Strategies**:
- If local node fails: Services automatically use public Kaspa network
- If local indexers unavailable: Apps use public indexer endpoints
- User gets choice on node failure: Continue with public or troubleshoot

### Profile Configuration Examples

**Core Profile Configuration**:
```yaml
core:
  nodeType: "for-other-services"  # public, private, for-other-services
  fallbackToPublic: true
  ports:
    rpc: 16110
    p2p: 16111
  network: "mainnet"  # mainnet, testnet
  wallet:
    enabled: false
```

**Indexer Services Configuration**:
```yaml
indexer-services:
  sharedDatabase: true
  databases: ["kasia_db", "k_db", "simply_kaspa_db"]
  selectedIndexers: ["kasia-indexer", "k-indexer"]
  nodeConnection: "local"  # local, public
```

**Kaspa User Applications Configuration**:
```yaml
kaspa-user-applications:
  indexerChoice: "local"  # local, public
  publicEndpoints:
    kasiaIndexer: "https://api.kasia.io"
    kIndexer: "https://api.k-social.io"
    simplyKaspaIndexer: "https://api.simplykaspa.io"
```

## Service Integration Architecture

### TimescaleDB Shared Database

**Architecture**: Single TimescaleDB container with separate databases per indexer

```sql
-- Database Structure
CREATE DATABASE kasia_db;      -- Kasia indexer data
CREATE DATABASE k_db;          -- K-Social indexer data  
CREATE DATABASE simply_kaspa_db; -- Simply-Kaspa indexer data

-- Each database has TimescaleDB extension
\c kasia_db
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Hypertables for time-series data
CREATE TABLE transactions (
    time TIMESTAMPTZ NOT NULL,
    block_hash TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    -- ... other fields
);

SELECT create_hypertable('transactions', 'time');
SELECT add_compression_policy('transactions', INTERVAL '7 days');
SELECT add_retention_policy('transactions', INTERVAL '1 year');
```

### Nginx Proxy Configuration

**Current Architecture**: Direct access for host services, proxy only for containerized Kaspa apps

```nginx
# Dashboard and Wizard: Direct access
# Dashboard: http://localhost:8080
# Wizard: http://localhost:3000

# Nginx proxies only containerized Kaspa applications
location /kasia/ {
    proxy_pass http://kasia-app:8080/;
}

location /social/ {
    proxy_pass http://k-social-app:8080/;
}

location /explorer/ {
    proxy_pass http://kaspa-explorer:8080/;
}

# Service selection landing page
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

## Wizard-Dashboard Integration

### Integration Architecture

The wizard and dashboard are tightly integrated for seamless configuration management:

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Initial Setup:                                              │
│  ./install.sh → Wizard (host) → Configuration → Services    │
│                                                              │
│  Ongoing Monitoring:                                         │
│  Dashboard (host) → Service Status → Metrics → Logs         │
│                                                              │
│  Reconfiguration:                                            │
│  Dashboard → "Reconfigure" → Wizard (host) → Apply Changes  │
│                                                              │
│  Configuration Suggestions:                                  │
│  Dashboard → Detect Optimization → Suggest → Launch Wizard  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Suggestion System

The dashboard monitors system state and suggests optimizations:

**Example Suggestions**:
1. **Local Indexers Available**: "Switch apps to local indexers for better performance"
2. **Wallet Not Configured**: "Set up wallet to enable mining capabilities"  
3. **Updates Available**: "3 service updates available"
4. **Resource Optimization**: "Enable compression on TimescaleDB for better performance"

**Suggestion Flow**:
```typescript
// Dashboard detects opportunity
const suggestion = {
  id: 'switch-to-local-indexers',
  title: 'Switch to Local Indexers',
  action: 'modify-config',
  wizardContext: 'switch-to-local-indexers'
};

// User clicks "Configure in Wizard"
launchWizard({
  mode: 'reconfigure',
  context: suggestion.wizardContext,
  preselected: suggestion.action
});

// Wizard opens with pre-filled context
// User completes configuration
// Dashboard refreshes with new state
```

### State Synchronization

**Installation State File** (`.kaspa-aio/installation-state.json`):
```json
{
  "version": "1.0.0",
  "installedAt": "2024-12-25T10:00:00Z",
  "lastModified": "2024-12-25T15:30:00Z",
  "profiles": {
    "selected": ["core", "kaspa-user-applications", "indexer-services"],
    "configuration": {
      "core": {
        "nodeType": "for-other-services",
        "fallbackToPublic": true
      },
      "kaspaUserApplications": {
        "indexerChoice": "local"
      }
    }
  },
  "services": [
    {
      "name": "kaspa-node",
      "version": "0.14.0",
      "status": "running",
      "profile": "core"
    }
  ]
}
```

## Update Management System

### Update Detection and Application

**Update Flow**:
1. **Dashboard**: Checks GitHub APIs for new releases (daily)
2. **Dashboard**: Displays update notifications with version info
3. **User**: Clicks update notification
4. **Dashboard**: Launches wizard in update mode
5. **Wizard**: Shows available updates with changelogs
6. **Wizard**: Creates backup before applying updates
7. **Wizard**: Updates docker-compose with new versions
8. **Wizard**: Restarts services and validates health
9. **Dashboard**: Reflects updated versions

**Service Update Assumptions**:
- Each service handles its own data migration during updates
- Services are designed to be backward compatible
- Update failures trigger automatic rollback to previous backup

### Backup and Rollback System

**Backup Structure**:
```
.kaspa-backups/
├── 2024-12-25T10-30-00/      # Timestamped backups
│   ├── .env
│   ├── docker-compose.yml
│   ├── installation-state.json
│   └── metadata.json
```

**Rollback Process**:
1. Stop affected services
2. Restore configuration files from backup
3. Pull previous Docker images
4. Restart services
5. Validate health checks
6. Update installation state

## Resource Monitoring and Emergency Controls

### Resource Monitoring Architecture

**Dashboard Integration**:
- Real-time monitoring via WebSocket (5-second updates)
- Color-coded warnings (yellow at 80%, red at 90%)
- Emergency controls when resources exceed 90%
- Integration with monitoring scripts

**Monitoring Scripts**:
- `resource-monitor.sh` - Continuous resource monitoring
- `emergency-stop.sh` - Emergency shutdown of services
- `quick-check.sh` - Quick resource status check

**Emergency Controls**:
```typescript
// Critical resource usage triggers emergency controls
if (cpuUsage > 90 || memoryUsage > 90) {
  showEmergencyControls();
  // Options: Emergency Stop, Quick Check, View Logs
}

async function executeEmergencyStop() {
  const result = await execAsync('./scripts/monitoring/emergency-stop.sh');
  // Gracefully stop services to prevent system freeze
}
```

## Security Architecture

### Host-Based Security Model

**Security Considerations**:
1. **No Authentication by Default**: Single-user system assumption
2. **Input Validation**: All user inputs validated before processing
3. **Sensitive Data Masking**: Passwords and keys masked in UI and logs
4. **CORS Protection**: Restricted cross-origin requests
5. **Rate Limiting**: API endpoints protected against abuse

**Future Authentication** (optional for multi-user):
```typescript
// JWT-based authentication for multi-user deployments
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Network Architecture and Access Patterns

### Service Access Patterns

**Direct Access Services** (Host-based):
- Dashboard: `http://localhost:8080`
- Wizard: `http://localhost:3000`

**Proxied Services** (Containerized):
- Kasia App: `http://localhost/kasia/`
- K-Social App: `http://localhost/social/`
- Kaspa Explorer: `http://localhost/explorer/`

**Internal Services** (Container-to-container):
- Kaspa Node RPC: `kaspa-node:16111`
- TimescaleDB: `timescaledb:5432`
- Indexer APIs: `kasia-indexer:8081`, `k-indexer:8082`

### Port Allocation Strategy

**Reserved Ports**:
- 3000: Installation Wizard
- 8080: Management Dashboard
- 16110: Kaspa Node P2P
- 16111: Kaspa Node RPC
- 5432: TimescaleDB
- 80/443: Nginx Proxy

**Dynamic Ports** (configurable):
- Indexer services: 8081-8090 range
- Application services: 8091-8100 range
- Development tools: 9000+ range

## Testing and Validation Architecture

### Infrastructure Validation

**Wizard Validation Process**:
1. **Basic Health Checks**: Service connectivity and API endpoints
2. **Infrastructure Testing**: Comprehensive infrastructure validation
   - Nginx: Configuration, routing, security headers, rate limiting
   - TimescaleDB: Hypertables, compression, continuous aggregates
   - Integration: Automated execution of test scripts

**Test Script Integration**:
- `test-nginx.sh` - Nginx configuration and security testing
- `test-timescaledb.sh` - Database functionality and performance testing
- Results displayed in wizard with pass/fail/warn status

### Monitoring Validation

**Dashboard Health Monitoring**:
- Service health checks every 5 seconds
- Docker container status monitoring
- Resource usage tracking with thresholds
- WebSocket connection health

## Data Models and State Management

### Core Data Models

**Service Status Model**:
```typescript
interface ServiceStatus {
  name: string;
  displayName: string;
  profile: string;
  status: 'healthy' | 'unhealthy' | 'stopped' | 'starting';
  version?: string;
  uptime?: number;
  url?: string;
  dependencies?: string[];
  lastCheck: string;
  error?: string;
}
```

**Profile Definition Model**:
```typescript
interface ProfileDefinition {
  id: string;
  name: string;
  description: string;
  services: ServiceDefinition[];
  dependencies: string[];
  prerequisites: string[];
  resources: ResourceRequirements;
  configuration: ConfigurationSchema;
}
```

**Installation State Model**:
```typescript
interface InstallationState {
  version: string;
  installedAt: string;
  lastModified: string;
  profiles: {
    selected: string[];
    configuration: Record<string, any>;
    states: Record<string, ProfileInstallationState>;
  };
  services: ServiceInfo[];
  history: ChangeHistoryEntry[];
}
```

## Error Handling and Recovery

### Graceful Degradation Strategy

**Service Failure Handling**:
1. **Health Check Failures**: Automatic retry with exponential backoff
2. **Critical Service Failures**: Alert user with troubleshooting options
3. **Dependency Failures**: Fallback to public services where possible
4. **Network Issues**: Queue operations and retry when connectivity restored

**WebSocket Resilience**:
```typescript
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  handleDisconnection() {
    this.updateConnectionStatus('disconnected');
    this.scheduleReconnect();
  }
  
  scheduleReconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );
    setTimeout(() => this.connect(), delay);
  }
}
```

## Performance Considerations

### Resource Optimization

**Memory Management**:
- Lazy loading of non-critical components
- Efficient DOM updates to prevent UI lag
- WebSocket message size optimization
- Log streaming with pagination

**Database Performance**:
- TimescaleDB hypertables for time-series data
- Automated compression policies
- Connection pooling for database access
- Retention policies for data lifecycle management

**Caching Strategy**:
- Static asset caching
- API response caching for frequently accessed data
- Browser-side caching for configuration data

## Deployment and Operations

### Installation Process

**Complete Installation Flow**:
1. **System Requirements Check**: Docker, Docker Compose, system resources
2. **Profile Selection**: User selects desired services and configuration
3. **Configuration Generation**: Create .env and docker-compose files
4. **Service Deployment**: Pull images and start containers in dependency order
5. **Health Validation**: Verify all services are running and accessible
6. **Dashboard Setup**: Install and configure host-based management tools

**Post-Installation**:
- Dashboard accessible at `http://localhost:8080`
- Wizard available for reconfiguration at `http://localhost:3000`
- Service landing page at `http://localhost/`

### Operational Procedures

**Service Management**:
```bash
# Start all services
docker-compose up -d

# Stop all services  
docker-compose down

# Restart specific service
docker-compose restart kaspa-node

# View service logs
docker-compose logs -f kaspa-node

# Check service status
docker-compose ps
```

**Dashboard Management**:
```bash
# Dashboard service (systemd)
sudo systemctl start kaspa-dashboard
sudo systemctl status kaspa-dashboard
sudo journalctl -u kaspa-dashboard -f

# Wizard service (systemd)
sudo systemctl start kaspa-wizard
sudo systemctl status kaspa-wizard
```

## Future Enhancement Roadmap

### Phase 2 Features

1. **Advanced Monitoring**:
   - Historical metrics and trending
   - Performance analytics and bottleneck identification
   - Custom alert rules and notifications

2. **Multi-Node Management**:
   - Manage multiple Kaspa node instances
   - Cluster overview and load balancing
   - Cross-node synchronization monitoring

3. **Enhanced Security**:
   - Optional authentication for multi-user deployments
   - Role-based access control
   - Audit logging and compliance reporting

4. **Mobile Support**:
   - Native mobile applications
   - Push notifications for critical events
   - Simplified mobile interface

5. **Cloud Integration**:
   - Cloud backup and restore
   - Remote monitoring capabilities
   - Multi-cloud deployment support

## Key Implementation Notes for AI Agents

### Critical Architecture Points

1. **Host vs Container**: Wizard and Dashboard run on HOST, not in containers
2. **Direct Access**: Services accessed directly by port, not through Nginx proxy
3. **Profile Dependencies**: Mining requires Core/Archive, others have fallback strategies
4. **Shared Database**: Single TimescaleDB with separate databases per indexer
5. **State Synchronization**: Installation state shared between wizard and dashboard

### Common Integration Patterns

1. **Configuration Changes**: Always go through wizard, dashboard detects and suggests
2. **Service Health**: Dashboard monitors, wizard validates during installation
3. **Updates**: Dashboard detects, wizard applies with backup/rollback
4. **Fallback Strategy**: Local services can fallback to public endpoints

### Error Handling Principles

1. **Graceful Degradation**: System continues operating with reduced functionality
2. **User Choice**: Offer options when failures occur (continue vs troubleshoot)
3. **Automatic Recovery**: Retry transient failures with exponential backoff
4. **Clear Messaging**: Provide specific error messages with troubleshooting steps

This knowledge base provides the foundation for understanding and working with the Kaspa All-in-One system architecture. The three specifications work together to provide a complete blockchain infrastructure solution with intuitive management interfaces.