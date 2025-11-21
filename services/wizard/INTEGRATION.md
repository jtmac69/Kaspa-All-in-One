# Wizard Integration Guide

This document describes how the Kaspa All-in-One Installation Wizard is integrated with the main system.

## Overview

The wizard is a web-based installation interface that guides users through:
- System requirements checking
- Profile selection (Core, Production, Explorer, Archive, Mining, Development)
- Service configuration
- Real-time installation progress
- Post-installation validation

## Architecture

### Components

1. **Frontend** (`frontend/public/`)
   - Static HTML/CSS/JavaScript
   - Socket.IO client for real-time updates
   - Responsive design with Kaspa branding

2. **Backend** (`backend/src/`)
   - Node.js/Express API server
   - Socket.IO for WebSocket communication
   - Docker integration via Docker socket
   - Configuration generation and validation

3. **Docker Service** (`docker-compose.yml`)
   - Runs as a separate container
   - Mounts Docker socket for container management
   - Mounts project directory for configuration access
   - Uses `wizard` profile for on-demand startup

## Integration Points

### 1. Docker Compose Integration

The wizard is defined as a service in `docker-compose.yml`:

```yaml
wizard:
  build:
    context: ./services/wizard
    dockerfile: Dockerfile
  container_name: kaspa-wizard
  restart: "no"
  ports:
    - "${WIZARD_PORT:-3000}:3000"
  environment:
    - NODE_ENV=${NODE_ENV:-production}
    - WIZARD_MODE=${WIZARD_MODE:-install}
    - DOCKER_HOST=unix:///var/run/docker.sock
    - PROJECT_ROOT=/workspace
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - .:/workspace:ro
    - ./.env:/workspace/.env:rw
    - ./docker-compose.yml:/workspace/docker-compose.yml:ro
  networks:
    - kaspa-network
  profiles:
    - wizard
```

**Key Features:**
- Uses `wizard` profile for on-demand startup
- Mounts Docker socket for container management
- Mounts project directory read-only (except .env)
- Configurable via environment variables

### 2. Management Script Integration

The `scripts/wizard.sh` script provides commands for managing the wizard:

```bash
# Start wizard for initial installation
./scripts/wizard.sh start

# Start wizard to modify existing configuration
./scripts/wizard.sh reconfigure

# Stop the wizard
./scripts/wizard.sh stop

# Check wizard status
./scripts/wizard.sh status

# View wizard logs
./scripts/wizard.sh logs
```

**Features:**
- Detects if system is already configured
- Automatically sets WIZARD_MODE (install/reconfigure)
- Waits for wizard to be ready before showing URL
- Provides helpful error messages

### 3. Install Script Integration

The `install.sh` script offers to launch the wizard after installation:

```bash
# At the end of install.sh
Would you like to use the web-based installation wizard? (Y/n)
```

**Behavior:**
- Prompts user to launch wizard
- Calls `scripts/wizard.sh start` if accepted
- Provides manual instructions if declined

## Usage Modes

### Install Mode (First-Time Setup)

When no `.env` file exists, the wizard runs in install mode:

1. System requirements check
2. Profile selection
3. Service configuration
4. Installation execution
5. Validation and completion

**Start Command:**
```bash
./scripts/wizard.sh start
```

### Reconfigure Mode (Modify Existing)

When `.env` exists, the wizard can run in reconfigure mode:

1. Load existing configuration
2. Allow modifications
3. Regenerate configuration
4. Restart affected services
5. Validate changes

**Start Command:**
```bash
./scripts/wizard.sh reconfigure
```

## Security Features

### 1. Rate Limiting

- API endpoints: 100 requests per 15 minutes per IP
- Installation endpoint: 5 attempts per hour per IP

### 2. Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Content Security Policy configured
- Helmet.js for additional security

### 3. Input Validation

- All configuration inputs validated with Joi
- Request body size limited to 1MB
- Sensitive data not logged

### 4. Docker Socket Access

- Read-only mount for project directory
- Write access only to `.env` file
- Docker socket access for container management only

## API Endpoints

### Health Check
```
GET /api/health
```
Returns wizard status and version.

### System Check
```
GET /api/system-check
```
Checks Docker, resources, and port availability.

### Profiles
```
GET /api/profiles
```
Returns available deployment profiles.

### Configuration
```
POST /api/config/validate
GET /api/config/password
POST /api/config/generate
```
Configuration validation and generation.

### Installation
```
POST /api/install/start
```
Starts installation process (WebSocket for progress).

## WebSocket Events

### Client → Server

- `install:start` - Start installation with config
- `service:status` - Request service status
- `logs:stream` - Request log streaming

### Server → Client

- `install:progress` - Installation progress updates
- `install:complete` - Installation completed
- `install:error` - Installation error
- `service:status:response` - Service status response
- `logs:data` - Log data

## Testing

### Unit Tests
```bash
cd services/wizard/backend
npm test
```

### Integration Tests
```bash
./test-wizard-integration.sh
```

### Complete Test Suite
```bash
./test-wizard-complete.sh
```

**Test Coverage:**
- Docker Compose configuration
- Dockerfile build
- Management script commands
- API endpoints
- Frontend serving
- Docker socket access
- Reconfiguration mode

## Troubleshooting

### Wizard Won't Start

1. Check if port 3000 is available:
   ```bash
   lsof -i :3000
   ```

2. Check Docker socket permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```

3. View wizard logs:
   ```bash
   docker logs kaspa-wizard
   ```

### API Endpoints Not Responding

1. Check wizard container status:
   ```bash
   docker ps | grep wizard
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. Check backend logs:
   ```bash
   docker logs kaspa-wizard
   ```

### Frontend Not Loading

1. Check if static files are included in image:
   ```bash
   docker exec kaspa-wizard ls -la /app/public
   ```

2. Check nginx/proxy configuration
3. Clear browser cache

### Installation Fails

1. Check Docker socket access:
   ```bash
   docker exec kaspa-wizard docker ps
   ```

2. Check available disk space:
   ```bash
   df -h
   ```

3. View detailed error in wizard logs:
   ```bash
   docker logs kaspa-wizard | grep -i error
   ```

## Development

### Local Development

1. Install dependencies:
   ```bash
   cd services/wizard/backend
   npm install
   ```

2. Start backend:
   ```bash
   npm run dev
   ```

3. Serve frontend:
   ```bash
   cd ../frontend/public
   python3 -m http.server 3000
   ```

### Building Docker Image

```bash
docker-compose --profile wizard build wizard
```

### Running in Docker

```bash
docker-compose --profile wizard up wizard
```

## Future Enhancements

### Planned Features

1. **Resource Checker Integration** (Phase 6.5.1)
   - Automatic hardware detection
   - Profile recommendations based on resources
   - Auto-configuration generation

2. **Enhanced Error Handling** (Phase 6.5.1)
   - Auto-remediation for common errors
   - Port conflict resolution
   - Permission auto-fix

3. **Progress Transparency** (Phase 6.5.2)
   - Contextual progress descriptions
   - Time remaining estimates
   - Smart log filtering

4. **Post-Installation Tour** (Phase 6.5.2)
   - Interactive dashboard tour
   - Service verification guide
   - Getting started documentation

5. **Diagnostic Export** (Phase 6.5.3)
   - System information collector
   - Diagnostic report generator
   - Community forum integration

6. **Video Tutorials** (Phase 6.5.3)
   - Installation overview
   - Docker installation guides
   - Profile selection guide

7. **Rollback and Recovery** (Phase 6.5.4)
   - Configuration versioning
   - Rollback functionality
   - Installation checkpoints

## References

- **Requirements**: `.kiro/specs/web-installation-wizard/requirements.md`
- **Design**: `.kiro/specs/web-installation-wizard/design.md`
- **Tasks**: `.kiro/specs/web-installation-wizard/tasks.md`
- **Main Project Tasks**: `.kiro/specs/kaspa-all-in-one-project/tasks.md`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. View wizard logs: `docker logs kaspa-wizard`
3. Run diagnostic tests: `./test-wizard-complete.sh`
4. Open an issue on GitHub with diagnostic information
