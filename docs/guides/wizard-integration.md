# Wizard Integration Documentation

## Overview

The Kaspa All-in-One Installation Wizard is a web-based interface that guides users through the initial setup and configuration of the system. It provides an intuitive, visual way to:

- Check system requirements
- Select deployment profiles
- Configure services
- Monitor installation progress
- Validate the installation

## Architecture

### Components

1. **Frontend** (`services/wizard/frontend/`)
   - Static HTML/CSS/JavaScript interface
   - Real-time progress updates via WebSocket
   - Responsive design for desktop and mobile

2. **Backend** (`services/wizard/backend/`)
   - Node.js/Express API server
   - Docker integration for service management
   - Configuration generation and validation
   - Real-time progress streaming

3. **Management Script** (`scripts/wizard.sh`)
   - Command-line interface for wizard lifecycle
   - Auto-start on first installation
   - Reconfiguration mode support

## Usage

### Starting the Wizard

#### First-Time Installation
```bash
./scripts/wizard.sh start install
```

The wizard will automatically detect first-time installation and guide you through:
1. System requirements check
2. Profile selection
3. Service configuration
4. Installation and deployment

#### Reconfiguration
```bash
./scripts/wizard.sh start reconfigure
```

Use reconfiguration mode to:
- Change deployment profiles
- Update service configuration
- Add or remove services
- Modify environment variables

### Managing the Wizard

#### Check Status
```bash
./scripts/wizard.sh status
```

Shows:
- Running status
- Health status
- Current mode (install/reconfigure)
- Configuration state

#### View Logs
```bash
./scripts/wizard.sh logs
```

Streams real-time logs from the wizard container.

#### Stop Wizard
```bash
./scripts/wizard.sh stop
```

Stops the wizard container (services continue running).

#### Restart Wizard
```bash
./scripts/wizard.sh restart [mode]
```

Restarts the wizard in specified mode (install or reconfigure).

#### Reset State (Testing)
```bash
./scripts/wizard.sh reset
```

Resets wizard state to allow re-running first-time setup. **Use with caution!**

## Integration with install.sh

The `install.sh` script automatically integrates with the wizard:

### First Run Detection
- Checks for existence of `.env` file
- If not found, offers to launch wizard
- Defaults to "Yes" for first-time users

### Reconfiguration Detection
- If `.env` exists, offers reconfiguration
- Defaults to "No" for existing installations

### Example Flow
```bash
# First installation
./install.sh
# ... dependency checks ...
# Offers to launch wizard (default: Yes)
# Wizard starts at http://localhost:3000

# Later reconfiguration
./install.sh
# ... checks ...
# Offers reconfiguration wizard (default: No)
```

## API Endpoints

### Core Endpoints

#### Health Check
```
GET /api/health
```
Returns wizard health status.

#### Wizard Mode
```
GET /api/wizard/mode
```
Returns current wizard mode (install/reconfigure) and auto-start status.

### System Check
```
GET /api/system-check
```
Checks Docker, system resources, and port availability.

### Profiles
```
GET /api/profiles
```
Returns available deployment profiles with descriptions and requirements.

### Configuration

#### Validate Configuration
```
POST /api/config/validate
Body: { config: {...} }
```

#### Generate Configuration
```
POST /api/config/generate
Body: { config: {...}, profiles: [...] }
```

### Installation

#### Start Installation (WebSocket)
```
WebSocket: /socket.io/
Event: install:start
Data: { config: {...}, profiles: [...] }
```

Streams progress events:
- `install:progress` - Progress updates
- `install:error` - Error occurred
- `install:complete` - Installation complete

### Reconfiguration

#### Get Current Configuration
```
GET /api/reconfigure/current
```
Returns current configuration, running services, and active profiles.

#### Create Backup
```
POST /api/reconfigure/backup
```
Creates timestamped backup of current `.env` file.

#### Apply Configuration
```
POST /api/reconfigure/apply
Body: { config: {...}, profiles: [...], createBackup: true }
```
Applies new configuration with optional backup.

#### Restart Services
```
POST /api/reconfigure/restart
Body: { profiles: [...] }
```
Restarts services with new configuration.

#### List Backups
```
GET /api/reconfigure/backups
```
Lists available configuration backups.

#### Restore Backup
```
POST /api/reconfigure/restore
Body: { backupFilename: "..." }
```
Restores configuration from backup.

## Security Features

### Authentication
- Token-based authentication (optional)
- Security token stored in `.wizard-token`
- Session secrets for WebSocket connections

### Input Validation
- Request body size limits (1MB)
- Content-type validation
- Environment variable name validation
- Port number validation
- Profile name validation

### Rate Limiting
- API endpoints: 100 requests per 15 minutes
- Installation endpoint: 5 attempts per hour

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy

### Error Handling
- Secure error messages (no stack traces in production)
- Detailed logging for debugging
- Retry logic with exponential backoff
- Timeout protection

## Configuration Files

### State Files

#### `.wizard-state`
Marks that wizard has been run. Created after successful installation.

#### `.wizard-config.json`
Stores wizard configuration for reconfiguration mode:
```json
{
  "timestamp": "2024-11-17T...",
  "profiles": ["core", "prod"],
  "config": {
    "KASPA_NODE_P2P_PORT": "16110",
    ...
  }
}
```

#### `.wizard-token`
Security token for wizard authentication (auto-generated).

### Environment Variables

#### Wizard Configuration
- `WIZARD_PORT` - Port for wizard (default: 3000)
- `WIZARD_MODE` - Mode: install or reconfigure
- `WIZARD_AUTO_START` - Auto-start on first run
- `WIZARD_SECURITY_TOKEN` - Authentication token
- `WIZARD_SESSION_SECRET` - Session secret
- `WIZARD_MAX_RETRIES` - Max retry attempts (default: 3)
- `WIZARD_TIMEOUT` - Operation timeout in seconds (default: 300)

## Docker Integration

### Service Definition
```yaml
wizard:
  build:
    context: ./services/wizard
  container_name: kaspa-wizard
  restart: "no"
  ports:
    - "${WIZARD_PORT:-3000}:3000"
  environment:
    - WIZARD_MODE=${WIZARD_MODE:-install}
    - WIZARD_AUTO_START=${WIZARD_AUTO_START:-false}
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - .:/workspace
    - wizard-state:/app/state
  profiles:
    - wizard
```

### Volume Management
- `wizard-state` - Persistent wizard state
- Docker socket mounted for container management
- Project root mounted for configuration access

## Testing

### Integration Tests
```bash
./test-wizard-integration.sh
```

Tests:
1. Wizard script exists and is executable
2. Service defined in docker-compose.yml
3. Dockerfile exists
4. Backend files exist
5. Start wizard in install mode
6. Health endpoint responds
7. Mode endpoint returns correct mode
8. System check API responds
9. Profiles API responds
10. Reconfigure API responds
11. Frontend loads
12. Stop wizard
13. Restart in reconfigure mode
14. Status command works
15. Security headers are set

### Manual Testing
```bash
# Start wizard
./scripts/wizard.sh start install

# Open browser
open http://localhost:3000

# Test workflow:
# 1. System check
# 2. Profile selection
# 3. Configuration
# 4. Installation
# 5. Validation

# Check logs
./scripts/wizard.sh logs

# Stop wizard
./scripts/wizard.sh stop
```

## Troubleshooting

### Wizard Won't Start

**Problem**: Wizard container fails to start

**Solutions**:
1. Check Docker is running: `docker ps`
2. Check port availability: `lsof -i :3000`
3. Check logs: `docker logs kaspa-wizard`
4. Rebuild: `docker compose build wizard`

### Health Check Fails

**Problem**: Wizard starts but health check fails

**Solutions**:
1. Check backend logs: `docker logs kaspa-wizard`
2. Verify Node.js dependencies: `docker exec kaspa-wizard npm list`
3. Check file permissions: `ls -la services/wizard/`

### Cannot Connect to Docker

**Problem**: Wizard cannot manage Docker containers

**Solutions**:
1. Verify Docker socket mount: `docker inspect kaspa-wizard | grep docker.sock`
2. Check socket permissions: `ls -la /var/run/docker.sock`
3. Restart Docker service

### Configuration Not Saving

**Problem**: Configuration changes don't persist

**Solutions**:
1. Check volume mounts: `docker inspect kaspa-wizard | grep Mounts`
2. Verify write permissions: `ls -la .env`
3. Check disk space: `df -h`

### WebSocket Connection Fails

**Problem**: Real-time updates don't work

**Solutions**:
1. Check browser console for errors
2. Verify WebSocket support: Test with `wscat -c ws://localhost:3000/socket.io/`
3. Check firewall rules
4. Try different browser

## Best Practices

### For Users

1. **Always create backups** before reconfiguration
2. **Review configuration** before applying changes
3. **Monitor logs** during installation
4. **Validate services** after installation
5. **Keep security token secure**

### For Developers

1. **Use error handlers** for all async operations
2. **Validate all inputs** before processing
3. **Log errors** with context
4. **Test with different profiles**
5. **Document API changes**

## Future Enhancements

### Planned Features
- [ ] Multi-language support
- [ ] Configuration templates
- [ ] Automated backup scheduling
- [ ] Service health monitoring dashboard
- [ ] One-click updates
- [ ] Rollback functionality
- [ ] Export/import configurations
- [ ] Guided troubleshooting

### Under Consideration
- [ ] CLI-only mode (no web interface)
- [ ] Remote wizard access (with authentication)
- [ ] Configuration validation before apply
- [ ] Dry-run mode
- [ ] Configuration diff viewer

## Related Documentation

- [Installation Guide](../README.md)
- [Profile System](./deployment-profiles.md)
- [Service Dependencies](./service-dependencies.md)
- [Troubleshooting](./troubleshooting.md)
- [Testing Guide](./infrastructure-testing.md)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [FAQ](./faq.md)
3. Check GitHub Issues
4. Join community Discord
