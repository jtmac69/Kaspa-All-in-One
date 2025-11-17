# Wizard Backend Implementation Summary

## Overview

Successfully implemented a complete Node.js backend API for the Kaspa All-in-One Installation Wizard. The backend provides comprehensive system checking, profile management, configuration generation, and Docker orchestration capabilities with real-time WebSocket progress streaming.

## Implementation Details

### Architecture

```
services/wizard/backend/
├── src/
│   ├── api/                    # REST API endpoints
│   │   ├── system-check.js     # System requirements validation
│   │   ├── profiles.js         # Profile and template management
│   │   ├── config.js           # Configuration generation and validation
│   │   └── install.js          # Installation orchestration
│   ├── utils/                  # Core business logic
│   │   ├── system-checker.js   # Docker, resources, ports checking
│   │   ├── profile-manager.js  # Profile dependencies and conflicts
│   │   ├── config-generator.js # .env file generation with validation
│   │   └── docker-manager.js   # Docker API integration
│   └── server.js               # Express + Socket.io server
├── package.json
├── Dockerfile
├── .gitignore
└── README.md
```

### Key Features Implemented

#### 1. System Requirements Checker (`system-checker.js`)
- **Docker Detection**: Checks Docker installation and version
- **Docker Compose Detection**: Validates Docker Compose v2 availability
- **Resource Monitoring**: Checks CPU, RAM, and disk space against minimum requirements
- **Port Availability**: Tests if required ports are available or in use
- **Comprehensive Reporting**: Provides detailed status with remediation steps

**API Endpoints:**
- `GET /api/system-check` - Full system check with optional port validation
- `GET /api/system-check/docker` - Docker-only check
- `GET /api/system-check/docker-compose` - Docker Compose-only check
- `GET /api/system-check/resources` - System resources check
- `POST /api/system-check/ports` - Check specific ports

#### 2. Profile Manager (`profile-manager.js`)
- **6 Deployment Profiles**: core, prod, explorer, archive, development, mining
- **4 Templates**: home-node, public-node, developer, full-stack
- **Dependency Resolution**: Automatically includes required profiles
- **Resource Calculation**: Aggregates memory, CPU, disk, and port requirements
- **Conflict Detection**: Identifies port conflicts between profiles
- **Validation**: Ensures core profile is included and no conflicts exist

**API Endpoints:**
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get specific profile
- `GET /api/profiles/templates/all` - Get all templates
- `GET /api/profiles/templates/:id` - Get specific template
- `POST /api/profiles/validate` - Validate profile selection
- `POST /api/profiles/requirements` - Calculate resource requirements
- `POST /api/profiles/dependencies` - Resolve dependencies

#### 3. Configuration Generator (`config-generator.js`)
- **Joi Schema Validation**: Comprehensive input validation
- **Secure Password Generation**: Cryptographically secure 32-character passwords
- **.env File Generation**: Profile-aware configuration with comments
- **Backup Management**: Automatic backup of existing .env files
- **Import/Export**: Load and parse existing configurations
- **Default Configs**: Generate sensible defaults for any profile combination

**API Endpoints:**
- `POST /api/config/validate` - Validate configuration object
- `POST /api/config/generate` - Generate .env file content
- `POST /api/config/save` - Save configuration to disk
- `GET /api/config/load` - Load existing .env file
- `POST /api/config/default` - Generate default config for profiles
- `GET /api/config/password` - Generate secure password

#### 4. Docker Manager (`docker-manager.js`)
- **Image Pulling**: Pull required Docker images with progress tracking
- **Service Building**: Build custom services from Dockerfiles
- **Service Deployment**: Start services with Docker Compose
- **Status Monitoring**: Check container status and health
- **Log Retrieval**: Fetch service logs for debugging
- **Validation**: Verify all services are running correctly

**API Endpoints:**
- `POST /api/install/start` - Initialize installation
- `POST /api/install/pull` - Pull Docker images
- `POST /api/install/build` - Build services
- `POST /api/install/deploy` - Start services
- `POST /api/install/validate` - Validate installation
- `GET /api/install/status/:service` - Get service status
- `GET /api/install/logs/:service` - Get service logs
- `POST /api/install/stop` - Stop all services

#### 5. WebSocket Progress Streaming
Real-time installation progress with Socket.io:

**Client → Server Events:**
- `install:start` - Start installation with config and profiles
- `service:status` - Request service status
- `logs:stream` - Request log streaming

**Server → Client Events:**
- `install:progress` - Progress updates (0-100%)
- `install:error` - Error notifications
- `install:complete` - Installation completion
- `service:status:response` - Service status
- `logs:data` - Log data
- `logs:error` - Log errors

**Installation Flow:**
1. Config validation and save (0-10%)
2. Pull Docker images (10-50%)
3. Build custom services (50-75%)
4. Deploy services (75-90%)
5. Validate installation (90-100%)

### Profile Definitions

#### Core Profile (Required)
- **Services**: kaspa-node, dashboard, nginx
- **Resources**: 4GB RAM min, 2 CPU cores, 100GB disk
- **Ports**: 16110, 16111, 3001, 80, 443

#### Production Profile
- **Services**: kasia, kasia-indexer, k-social, k-indexer
- **Dependencies**: core, explorer
- **Resources**: 8GB RAM min, 4 CPU cores, 200GB disk
- **Ports**: 3002, 3003, 3004, 3005

#### Explorer Profile
- **Services**: timescaledb, simply-kaspa-indexer
- **Dependencies**: core
- **Resources**: 8GB RAM min, 4 CPU cores, 500GB disk
- **Ports**: 5432, 3006

#### Archive Profile
- **Services**: archive-db, archive-indexer
- **Dependencies**: core, explorer
- **Resources**: 16GB RAM min, 8 CPU cores, 2TB disk
- **Ports**: 5433, 3007

#### Development Profile
- **Services**: portainer, pgadmin
- **Dependencies**: core
- **Resources**: 2GB RAM min, 1 CPU core, 10GB disk
- **Ports**: 9000, 5050

#### Mining Profile
- **Services**: kaspa-stratum
- **Dependencies**: core
- **Resources**: 2GB RAM min, 2 CPU cores, 10GB disk
- **Ports**: 5555

### Configuration Schema

The backend validates and generates configurations with these fields:

**Core Settings:**
- `PUBLIC_NODE` - Enable public node access (boolean)
- `EXTERNAL_IP` - External IP address (optional)

**Network Ports:**
- `KASPA_P2P_PORT` - P2P port (default: 16110)
- `KASPA_RPC_PORT` - RPC port (default: 16111)
- `DASHBOARD_PORT` - Dashboard port (default: 3001)
- `NGINX_HTTP_PORT` - HTTP port (default: 80)
- `NGINX_HTTPS_PORT` - HTTPS port (default: 443)

**Database Settings (explorer/prod profiles):**
- `POSTGRES_USER` - Database user (default: kaspa)
- `POSTGRES_PASSWORD` - Database password (auto-generated)
- `POSTGRES_DB` - Database name (default: kaspa_explorer)
- `POSTGRES_PORT` - Database port (default: 5432)

**Archive Database (archive profile):**
- `ARCHIVE_POSTGRES_USER` - Archive DB user
- `ARCHIVE_POSTGRES_PASSWORD` - Archive DB password
- `ARCHIVE_POSTGRES_DB` - Archive DB name
- `ARCHIVE_POSTGRES_PORT` - Archive DB port (default: 5433)

**Monitoring:**
- `ENABLE_MONITORING` - Enable monitoring (default: true)
- `LOG_LEVEL` - Log level (error/warn/info/debug)

**SSL (optional):**
- `ENABLE_SSL` - Enable SSL (boolean)
- `SSL_DOMAIN` - Domain name
- `SSL_EMAIL` - Email for Let's Encrypt

**Indexer (explorer profile):**
- `INDEXER_MODE` - Mode (full/light/archive/personal)

**Mining (mining profile):**
- `MINING_ADDRESS` - Mining address
- `STRATUM_PORT` - Stratum port (default: 5555)

## Dependencies

```json
{
  "express": "^4.18.2",        // Web framework
  "socket.io": "^4.6.1",       // WebSocket support
  "dockerode": "^4.0.0",       // Docker API client
  "joi": "^17.11.0",           // Schema validation
  "cors": "^2.8.5",            // CORS middleware
  "dotenv": "^16.3.1"          // Environment variables
}
```

## Usage

### Starting the Backend

```bash
cd services/wizard/backend
npm install
npm start
```

Server runs on port 3000 (configurable via `WIZARD_PORT` env var).

### API Examples

**Check System Requirements:**
```bash
curl http://localhost:3000/api/system-check
```

**Get All Profiles:**
```bash
curl http://localhost:3000/api/profiles
```

**Validate Profile Selection:**
```bash
curl -X POST http://localhost:3000/api/profiles/validate \
  -H "Content-Type: application/json" \
  -d '{"profiles": ["core", "explorer"]}'
```

**Generate Configuration:**
```bash
curl -X POST http://localhost:3000/api/config/generate \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "PUBLIC_NODE": false,
      "POSTGRES_PASSWORD": "secure_password_here"
    },
    "profiles": ["core", "explorer"]
  }'
```

**Start Installation (WebSocket):**
```javascript
const socket = io('http://localhost:3000');

socket.on('install:progress', (data) => {
  console.log(`Progress: ${data.progress}% - ${data.message}`);
});

socket.on('install:complete', (data) => {
  console.log('Installation complete!', data);
});

socket.emit('install:start', {
  config: { /* config object */ },
  profiles: ['core', 'explorer']
});
```

## Security Considerations

1. **Docker Socket Access**: Backend requires `/var/run/docker.sock` access for container management
2. **Password Generation**: Uses `crypto.randomBytes()` for secure password generation
3. **Configuration Backup**: Automatically backs up existing .env files before overwriting
4. **Input Validation**: All inputs validated with Joi schemas
5. **CORS**: Currently open for development (should be restricted in production)

## Next Steps

With the backend complete, the next tasks are:

1. **Task 6.2**: Complete wizard frontend UI
   - Connect frontend to backend API
   - Implement dynamic configuration forms
   - Add real-time progress display with WebSocket
   - Create validation results interface

2. **Task 6.3**: Integrate wizard with main system
   - Add wizard service to docker-compose.yml
   - Configure auto-start on first installation
   - Implement reconfiguration mode
   - Create comprehensive test suite

## Testing

The backend can be tested with:

```bash
# Health check
curl http://localhost:3000/api/health

# System check
curl http://localhost:3000/api/system-check

# Get profiles
curl http://localhost:3000/api/profiles

# Generate password
curl http://localhost:3000/api/config/password
```

## Files Created

1. `services/wizard/backend/package.json` - Node.js dependencies
2. `services/wizard/backend/src/server.js` - Main server with WebSocket
3. `services/wizard/backend/src/utils/system-checker.js` - System validation
4. `services/wizard/backend/src/utils/profile-manager.js` - Profile management
5. `services/wizard/backend/src/utils/config-generator.js` - Config generation
6. `services/wizard/backend/src/utils/docker-manager.js` - Docker orchestration
7. `services/wizard/backend/src/api/system-check.js` - System check API
8. `services/wizard/backend/src/api/profiles.js` - Profiles API
9. `services/wizard/backend/src/api/config.js` - Configuration API
10. `services/wizard/backend/src/api/install.js` - Installation API
11. `services/wizard/backend/Dockerfile` - Container image
12. `services/wizard/backend/.gitignore` - Git ignore rules
13. `services/wizard/backend/README.md` - Documentation

## Status

✅ **Task 6.1 Complete**: Build wizard backend API

The backend is fully functional and ready for frontend integration. All requirements from the web-installation-wizard spec have been implemented:

- ✅ System requirements checker API (Req 1)
- ✅ Profile management API (Req 2, 12)
- ✅ Configuration management and validation (Req 3, 4, 7, 10)
- ✅ Installation engine with Docker integration (Req 5)
- ✅ WebSocket progress streaming (Req 5)
- ✅ Post-installation validation (Req 6)
- ✅ Error handling and troubleshooting (Req 8)
