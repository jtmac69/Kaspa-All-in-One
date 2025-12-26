# Kaspa Management Dashboard Environment Variables

This document provides comprehensive documentation for all environment variables used by the Kaspa Management Dashboard. The dashboard is designed to run as a host-based service with flexible configuration options.

## Overview

The Management Dashboard uses environment variables for configuration to provide flexibility across different deployment scenarios. Variables can be set in multiple ways:

1. **Environment File**: `/opt/kaspa-dashboard/.env` (recommended)
2. **Systemd Service**: Environment variables in the service file
3. **System Environment**: Exported shell variables
4. **Runtime**: Passed directly to the Node.js process

## Configuration Precedence

Configuration values are loaded in the following order (later sources override earlier ones):

1. Default values in the application code
2. Environment file (`.env`)
3. Systemd service environment variables
4. System environment variables
5. Runtime environment variables

## Required Variables

These variables must be configured for the dashboard to function properly:

### NODE_ENV
- **Description**: Node.js environment mode
- **Required**: Yes
- **Default**: `production`
- **Valid Values**: `production`, `development`, `test`
- **Example**: `NODE_ENV=production`
- **Notes**: Affects security settings, logging, and performance optimizations

### PORT
- **Description**: Port number for the dashboard HTTP server
- **Required**: Yes
- **Default**: `8080`
- **Valid Values**: `1024-65535` (ports above 1024 for non-root users)
- **Example**: `PORT=8080`
- **Notes**: Must not conflict with other services

### KASPA_NODE_URL
- **Description**: URL for connecting to the Kaspa node RPC interface
- **Required**: Yes
- **Default**: `http://localhost:16111`
- **Format**: `http://host:port` or `https://host:port`
- **Example**: `KASPA_NODE_URL=http://kaspa-node:16111`
- **Notes**: Used for blockchain data and wallet operations

## Optional Variables

### Security Configuration

#### CORS_ORIGIN
- **Description**: Comma-separated list of allowed CORS origins
- **Required**: No
- **Default**: `http://localhost:3000,http://localhost:8080`
- **Format**: Comma-separated URLs
- **Example**: `CORS_ORIGIN=https://dashboard.example.com,https://admin.example.com`
- **Notes**: Restricts browser access to the API

#### ALLOWED_ORIGINS
- **Description**: Alternative name for CORS_ORIGIN (legacy support)
- **Required**: No
- **Default**: Same as CORS_ORIGIN
- **Format**: Comma-separated URLs
- **Example**: `ALLOWED_ORIGINS=https://dashboard.example.com`
- **Notes**: Use CORS_ORIGIN instead for new configurations

#### SSL_ENABLED
- **Description**: Enable SSL/TLS support
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `SSL_ENABLED=true`
- **Notes**: Requires SSL certificate configuration

#### SSL_CERT_PATH
- **Description**: Path to SSL certificate file
- **Required**: Only if SSL_ENABLED=true
- **Default**: `/etc/ssl/certs/dashboard.crt`
- **Format**: Absolute file path
- **Example**: `SSL_CERT_PATH=/opt/kaspa-dashboard/ssl/cert.pem`
- **Notes**: Certificate must be readable by dashboard user

#### SSL_KEY_PATH
- **Description**: Path to SSL private key file
- **Required**: Only if SSL_ENABLED=true
- **Default**: `/etc/ssl/private/dashboard.key`
- **Format**: Absolute file path
- **Example**: `SSL_KEY_PATH=/opt/kaspa-dashboard/ssl/key.pem`
- **Notes**: Private key must be readable by dashboard user only

#### SSL_CA_PATH
- **Description**: Path to SSL certificate authority file
- **Required**: No
- **Default**: None
- **Format**: Absolute file path
- **Example**: `SSL_CA_PATH=/opt/kaspa-dashboard/ssl/ca.pem`
- **Notes**: Optional for self-signed certificates

#### FORCE_HTTPS
- **Description**: Force HTTPS redirects in production
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `FORCE_HTTPS=true`
- **Notes**: Automatically enabled in production when SSL is configured

### Rate Limiting Configuration

#### RATE_LIMIT_WINDOW_MS
- **Description**: Rate limiting time window in milliseconds
- **Required**: No
- **Default**: `900000` (15 minutes)
- **Format**: Integer (milliseconds)
- **Example**: `RATE_LIMIT_WINDOW_MS=600000`
- **Notes**: Time window for counting requests

#### RATE_LIMIT_MAX_REQUESTS
- **Description**: Maximum requests per window for general API endpoints
- **Required**: No
- **Default**: `100`
- **Format**: Integer
- **Example**: `RATE_LIMIT_MAX_REQUESTS=200`
- **Notes**: Applies to most API endpoints

#### RATE_LIMIT_WALLET_MAX_REQUESTS
- **Description**: Maximum requests per window for wallet operations
- **Required**: No
- **Default**: `10`
- **Format**: Integer
- **Example**: `RATE_LIMIT_WALLET_MAX_REQUESTS=5`
- **Notes**: Stricter limit for sensitive wallet operations

#### RATE_LIMIT_SERVICE_CONTROL_MAX_REQUESTS
- **Description**: Maximum requests per window for service control operations
- **Required**: No
- **Default**: `20`
- **Format**: Integer
- **Example**: `RATE_LIMIT_SERVICE_CONTROL_MAX_REQUESTS=30`
- **Notes**: Limit for start/stop/restart operations

#### RATE_LIMIT_LOGS_MAX_REQUESTS
- **Description**: Maximum requests per window for log viewing
- **Required**: No
- **Default**: `50`
- **Format**: Integer
- **Example**: `RATE_LIMIT_LOGS_MAX_REQUESTS=100`
- **Notes**: Limit for log access endpoints

### Session Configuration

#### SESSION_SECRET
- **Description**: Secret key for session encryption (if authentication is enabled)
- **Required**: Only if authentication is enabled
- **Default**: None
- **Format**: Random string (minimum 32 characters)
- **Example**: `SESSION_SECRET=your-very-secure-random-secret-key-here`
- **Notes**: Keep this secret and change it regularly

#### SESSION_TIMEOUT
- **Description**: Session timeout in milliseconds
- **Required**: No
- **Default**: `3600000` (1 hour)
- **Format**: Integer (milliseconds)
- **Example**: `SESSION_TIMEOUT=7200000`
- **Notes**: How long sessions remain valid

### Logging Configuration

#### LOG_LEVEL
- **Description**: Logging verbosity level
- **Required**: No
- **Default**: `info`
- **Valid Values**: `error`, `warn`, `info`, `debug`
- **Example**: `LOG_LEVEL=debug`
- **Notes**: Higher levels include lower levels (debug includes all)

#### LOG_FILE
- **Description**: Path to log file (optional - logs to journald by default)
- **Required**: No
- **Default**: `/opt/kaspa-dashboard/logs/dashboard.log`
- **Format**: Absolute file path
- **Example**: `LOG_FILE=/var/log/kaspa-dashboard/app.log`
- **Notes**: Directory must exist and be writable

#### REQUEST_LOGGING
- **Description**: Enable HTTP request logging
- **Required**: No
- **Default**: `true`
- **Valid Values**: `true`, `false`
- **Example**: `REQUEST_LOGGING=false`
- **Notes**: Logs all HTTP requests for debugging

#### LOG_MAX_SIZE
- **Description**: Maximum log file size before rotation
- **Required**: No
- **Default**: `10M`
- **Format**: Size with unit (K, M, G)
- **Example**: `LOG_MAX_SIZE=50M`
- **Notes**: Used with file logging

#### LOG_MAX_FILES
- **Description**: Maximum number of rotated log files to keep
- **Required**: No
- **Default**: `5`
- **Format**: Integer
- **Example**: `LOG_MAX_FILES=10`
- **Notes**: Used with file logging

### WebSocket Configuration

#### WS_HEARTBEAT_INTERVAL
- **Description**: WebSocket heartbeat interval in milliseconds
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `WS_HEARTBEAT_INTERVAL=60000`
- **Notes**: How often to send ping/pong messages

#### WS_MAX_CONNECTIONS
- **Description**: Maximum concurrent WebSocket connections
- **Required**: No
- **Default**: `100`
- **Format**: Integer
- **Example**: `WS_MAX_CONNECTIONS=200`
- **Notes**: Prevents resource exhaustion

#### WS_CONNECTION_TIMEOUT
- **Description**: WebSocket connection timeout in milliseconds
- **Required**: No
- **Default**: `60000` (1 minute)
- **Format**: Integer (milliseconds)
- **Example**: `WS_CONNECTION_TIMEOUT=120000`
- **Notes**: How long to wait for connection establishment

### Performance Configuration

#### CACHE_TTL
- **Description**: Response cache time-to-live in milliseconds
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `CACHE_TTL=60000`
- **Notes**: How long to cache API responses

#### MAX_CACHE_SIZE
- **Description**: Maximum number of entries in response cache
- **Required**: No
- **Default**: `100`
- **Format**: Integer
- **Example**: `MAX_CACHE_SIZE=200`
- **Notes**: Prevents memory exhaustion

#### MAX_CONCURRENT_REQUESTS
- **Description**: Maximum concurrent API requests
- **Required**: No
- **Default**: `10`
- **Format**: Integer
- **Example**: `MAX_CONCURRENT_REQUESTS=20`
- **Notes**: Prevents server overload

#### REQUEST_TIMEOUT
- **Description**: API request timeout in milliseconds
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `REQUEST_TIMEOUT=60000`
- **Notes**: How long to wait for external API calls

#### ENABLE_COMPRESSION
- **Description**: Enable HTTP response compression
- **Required**: No
- **Default**: `true`
- **Valid Values**: `true`, `false`
- **Example**: `ENABLE_COMPRESSION=false`
- **Notes**: Reduces bandwidth usage

### Monitoring Configuration

#### RESOURCE_MONITOR_INTERVAL
- **Description**: System resource monitoring interval in milliseconds
- **Required**: No
- **Default**: `5000` (5 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `RESOURCE_MONITOR_INTERVAL=10000`
- **Notes**: How often to check CPU, memory, disk usage

#### SERVICE_MONITOR_INTERVAL
- **Description**: Service health check interval in milliseconds
- **Required**: No
- **Default**: `5000` (5 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `SERVICE_MONITOR_INTERVAL=15000`
- **Notes**: How often to check service health

#### CPU_WARNING_THRESHOLD
- **Description**: CPU usage percentage that triggers warnings
- **Required**: No
- **Default**: `80`
- **Format**: Integer (0-100)
- **Example**: `CPU_WARNING_THRESHOLD=75`
- **Notes**: Yellow alert threshold

#### CPU_CRITICAL_THRESHOLD
- **Description**: CPU usage percentage that triggers critical alerts
- **Required**: No
- **Default**: `90`
- **Format**: Integer (0-100)
- **Example**: `CPU_CRITICAL_THRESHOLD=95`
- **Notes**: Red alert threshold with emergency controls

#### MEMORY_WARNING_THRESHOLD
- **Description**: Memory usage percentage that triggers warnings
- **Required**: No
- **Default**: `85`
- **Format**: Integer (0-100)
- **Example**: `MEMORY_WARNING_THRESHOLD=80`
- **Notes**: Yellow alert threshold

#### MEMORY_CRITICAL_THRESHOLD
- **Description**: Memory usage percentage that triggers critical alerts
- **Required**: No
- **Default**: `90`
- **Format**: Integer (0-100)
- **Example**: `MEMORY_CRITICAL_THRESHOLD=95`
- **Notes**: Red alert threshold with emergency controls

#### DISK_WARNING_THRESHOLD
- **Description**: Disk usage percentage that triggers warnings
- **Required**: No
- **Default**: `80`
- **Format**: Integer (0-100)
- **Example**: `DISK_WARNING_THRESHOLD=85`
- **Notes**: Yellow alert threshold

#### DISK_CRITICAL_THRESHOLD
- **Description**: Disk usage percentage that triggers critical alerts
- **Required**: No
- **Default**: `90`
- **Format**: Integer (0-100)
- **Example**: `DISK_CRITICAL_THRESHOLD=95`
- **Notes**: Red alert threshold

#### LOAD_CRITICAL_THRESHOLD
- **Description**: System load average that triggers critical alerts
- **Required**: No
- **Default**: `10.0`
- **Format**: Float
- **Example**: `LOAD_CRITICAL_THRESHOLD=15.0`
- **Notes**: Based on 1-minute load average

#### AUTO_RESOURCE_MONITORING
- **Description**: Enable automatic resource monitoring startup
- **Required**: No
- **Default**: `true`
- **Valid Values**: `true`, `false`
- **Example**: `AUTO_RESOURCE_MONITORING=false`
- **Notes**: Automatically starts monitoring scripts

### Wizard Integration Configuration

#### WIZARD_URL
- **Description**: URL for the Installation Wizard
- **Required**: No
- **Default**: `http://localhost:3000`
- **Format**: `http://host:port` or `https://host:port`
- **Example**: `WIZARD_URL=http://localhost:3001`
- **Notes**: Used for wizard integration and reconfiguration

#### WIZARD_PORT
- **Description**: Port number for the Installation Wizard
- **Required**: No
- **Default**: `3000`
- **Format**: Integer (1024-65535)
- **Example**: `WIZARD_PORT=3001`
- **Notes**: Alternative to WIZARD_URL for port-only configuration

#### WIZARD_TIMEOUT
- **Description**: Wizard communication timeout in milliseconds
- **Required**: No
- **Default**: `300000` (5 minutes)
- **Format**: Integer (milliseconds)
- **Example**: `WIZARD_TIMEOUT=600000`
- **Notes**: How long to wait for wizard operations

#### WIZARD_INTEGRATION_ENABLED
- **Description**: Enable wizard integration features
- **Required**: No
- **Default**: `true`
- **Valid Values**: `true`, `false`
- **Example**: `WIZARD_INTEGRATION_ENABLED=false`
- **Notes**: Disables wizard-related functionality

### Docker Configuration

#### DOCKER_SOCKET_PATH
- **Description**: Path to Docker socket
- **Required**: No
- **Default**: `/var/run/docker.sock`
- **Format**: Absolute file path
- **Example**: `DOCKER_SOCKET_PATH=/var/run/docker.sock`
- **Notes**: Must be accessible to dashboard user

#### DOCKER_API_VERSION
- **Description**: Docker API version to use
- **Required**: No
- **Default**: `1.41`
- **Format**: Version string
- **Example**: `DOCKER_API_VERSION=1.43`
- **Notes**: Should match Docker daemon version

#### DOCKER_COMMAND_TIMEOUT
- **Description**: Docker command timeout in milliseconds
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `DOCKER_COMMAND_TIMEOUT=60000`
- **Notes**: How long to wait for Docker operations

### Database Configuration (Optional)

#### DATABASE_URL
- **Description**: Database connection URL for configuration storage
- **Required**: No
- **Default**: None (uses file-based storage)
- **Format**: `postgresql://user:password@host:port/database`
- **Example**: `DATABASE_URL=postgresql://dashboard:secret@localhost:5432/dashboard`
- **Notes**: Optional database backend for configuration

#### DATABASE_POOL_SIZE
- **Description**: Database connection pool size
- **Required**: No
- **Default**: `10`
- **Format**: Integer
- **Example**: `DATABASE_POOL_SIZE=20`
- **Notes**: Only used if DATABASE_URL is set

#### DATABASE_TIMEOUT
- **Description**: Database connection timeout in milliseconds
- **Required**: No
- **Default**: `5000` (5 seconds)
- **Format**: Integer (milliseconds)
- **Example**: `DATABASE_TIMEOUT=10000`
- **Notes**: Only used if DATABASE_URL is set

### Backup Configuration

#### BACKUP_DIR
- **Description**: Directory for storing backups
- **Required**: No
- **Default**: `/opt/kaspa-dashboard/backups`
- **Format**: Absolute directory path
- **Example**: `BACKUP_DIR=/var/backups/kaspa-dashboard`
- **Notes**: Directory must exist and be writable

#### MAX_BACKUP_FILES
- **Description**: Maximum number of backup files to keep
- **Required**: No
- **Default**: `10`
- **Format**: Integer
- **Example**: `MAX_BACKUP_FILES=20`
- **Notes**: Older backups are automatically deleted

#### BACKUP_COMPRESSION_LEVEL
- **Description**: Backup compression level (0-9)
- **Required**: No
- **Default**: `6`
- **Format**: Integer (0-9)
- **Example**: `BACKUP_COMPRESSION_LEVEL=9`
- **Notes**: Higher values = better compression, slower speed

### Development Configuration

#### DEBUG_MODE
- **Description**: Enable debug mode (development only)
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `DEBUG_MODE=true`
- **Notes**: Enables additional debugging features

#### ENABLE_API_DOCS
- **Description**: Enable API documentation endpoint
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `ENABLE_API_DOCS=true`
- **Notes**: Exposes API documentation at /api/docs

#### ENABLE_PROFILING
- **Description**: Enable performance profiling
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `ENABLE_PROFILING=true`
- **Notes**: Enables performance monitoring endpoints

#### MOCK_SERVICES
- **Description**: Mock external services (development/testing)
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `MOCK_SERVICES=true`
- **Notes**: Uses mock data instead of real services

### Advanced Configuration

#### PROJECT_ROOT
- **Description**: Root directory of the Kaspa All-in-One project
- **Required**: No
- **Default**: `/app` (container) or `/opt/kaspa-dashboard` (host)
- **Format**: Absolute directory path
- **Example**: `PROJECT_ROOT=/home/user/kaspa-aio`
- **Notes**: Used for configuration file access

#### DASHBOARD_VERSION
- **Description**: Dashboard version identifier
- **Required**: No
- **Default**: `1.0.0`
- **Format**: Semantic version string
- **Example**: `DASHBOARD_VERSION=1.2.3`
- **Notes**: Used for version reporting and compatibility

#### CUSTOM_CONFIG_PATH
- **Description**: Path to custom configuration file
- **Required**: No
- **Default**: None
- **Format**: Absolute file path
- **Example**: `CUSTOM_CONFIG_PATH=/opt/kaspa-dashboard/config/custom.json`
- **Notes**: Additional configuration file in JSON format

#### PLUGIN_DIR
- **Description**: Directory for dashboard plugins
- **Required**: No
- **Default**: None
- **Format**: Absolute directory path
- **Example**: `PLUGIN_DIR=/opt/kaspa-dashboard/plugins`
- **Notes**: Future plugin system support

#### ENABLE_EXPERIMENTAL_FEATURES
- **Description**: Enable experimental features
- **Required**: No
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Example**: `ENABLE_EXPERIMENTAL_FEATURES=true`
- **Notes**: Enables features under development

#### TZ
- **Description**: Timezone for logs and timestamps
- **Required**: No
- **Default**: `UTC`
- **Format**: Timezone identifier
- **Example**: `TZ=America/New_York`
- **Notes**: Standard timezone format (e.g., America/New_York, Europe/London)

## Systemd Environment Configuration

When running as a systemd service, environment variables can be configured in multiple ways:

### 1. Environment File (Recommended)

Create `/opt/kaspa-dashboard/.env`:

```bash
# Basic configuration
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# Security settings
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
SSL_ENABLED=false

# Monitoring settings
CPU_WARNING_THRESHOLD=80
MEMORY_WARNING_THRESHOLD=85
AUTO_RESOURCE_MONITORING=true

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/kaspa-dashboard/logs/dashboard.log
```

### 2. Systemd Service File

Add environment variables to `/etc/systemd/system/kaspa-dashboard.service`:

```ini
[Service]
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=LOG_LEVEL=info
EnvironmentFile=-/opt/kaspa-dashboard/.env
```

### 3. Systemd Override File

Create `/etc/systemd/system/kaspa-dashboard.service.d/override.conf`:

```ini
[Service]
Environment=KASPA_NODE_URL=http://remote-node:16111
Environment=CPU_CRITICAL_THRESHOLD=95
```

### 4. Systemd Environment Directory

Create files in `/etc/systemd/system/kaspa-dashboard.service.d/`:

```bash
# /etc/systemd/system/kaspa-dashboard.service.d/custom.conf
[Service]
Environment=CUSTOM_SETTING=value
```

## Configuration Examples

### Basic Production Configuration

```bash
# /opt/kaspa-dashboard/.env
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111
LOG_LEVEL=info
CORS_ORIGIN=https://dashboard.example.com
AUTO_RESOURCE_MONITORING=true
```

### High-Security Configuration

```bash
# /opt/kaspa-dashboard/.env
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# SSL/TLS
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/dashboard.crt
SSL_KEY_PATH=/etc/ssl/private/dashboard.key
FORCE_HTTPS=true

# Strict CORS
CORS_ORIGIN=https://dashboard.example.com

# Strict rate limiting
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WALLET_MAX_REQUESTS=5
RATE_LIMIT_SERVICE_CONTROL_MAX_REQUESTS=10

# Session security
SESSION_SECRET=your-very-secure-random-secret-key-here
SESSION_TIMEOUT=1800000

# Minimal logging
LOG_LEVEL=warn
REQUEST_LOGGING=false
```

### Development Configuration

```bash
# /opt/kaspa-dashboard/.env
NODE_ENV=development
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# Development features
DEBUG_MODE=true
ENABLE_API_DOCS=true
ENABLE_PROFILING=true
MOCK_SERVICES=false

# Relaxed security
CORS_ORIGIN=http://localhost:3000,http://localhost:8080,http://localhost:8081
RATE_LIMIT_MAX_REQUESTS=1000

# Verbose logging
LOG_LEVEL=debug
REQUEST_LOGGING=true

# Fast monitoring
RESOURCE_MONITOR_INTERVAL=2000
SERVICE_MONITOR_INTERVAL=2000
```

### High-Performance Configuration

```bash
# /opt/kaspa-dashboard/.env
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# Performance optimization
ENABLE_COMPRESSION=true
CACHE_TTL=60000
MAX_CACHE_SIZE=500
MAX_CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=15000

# WebSocket optimization
WS_MAX_CONNECTIONS=500
WS_HEARTBEAT_INTERVAL=60000

# Monitoring optimization
RESOURCE_MONITOR_INTERVAL=10000
SERVICE_MONITOR_INTERVAL=10000

# Minimal logging
LOG_LEVEL=warn
REQUEST_LOGGING=false
```

### Remote Node Configuration

```bash
# /opt/kaspa-dashboard/.env
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://remote-kaspa-node.example.com:16111

# Extended timeouts for remote connections
REQUEST_TIMEOUT=60000
DOCKER_COMMAND_TIMEOUT=60000
WIZARD_TIMEOUT=600000

# Remote-specific monitoring
CPU_WARNING_THRESHOLD=70
MEMORY_WARNING_THRESHOLD=80
LOAD_CRITICAL_THRESHOLD=8.0

# Backup to remote storage
BACKUP_DIR=/mnt/remote-backup/kaspa-dashboard
MAX_BACKUP_FILES=20
```

## Environment Variable Validation

The dashboard validates environment variables on startup:

### Validation Rules

1. **PORT**: Must be integer between 1024-65535
2. **URLs**: Must be valid HTTP/HTTPS URLs
3. **Thresholds**: Must be integers between 0-100 (for percentages)
4. **Timeouts**: Must be positive integers
5. **File Paths**: Must be absolute paths
6. **Boolean Values**: Must be `true` or `false` (case-insensitive)

### Validation Errors

Invalid configuration will cause startup failure with descriptive error messages:

```
ERROR: Invalid PORT value '80a' - must be integer between 1024-65535
ERROR: Invalid KASPA_NODE_URL 'not-a-url' - must be valid HTTP/HTTPS URL
ERROR: Invalid CPU_WARNING_THRESHOLD '150' - must be integer between 0-100
```

## Troubleshooting Environment Variables

### Common Issues

1. **Service Won't Start**
   - Check for syntax errors in `.env` file
   - Verify file permissions (should be readable by dashboard user)
   - Check systemd logs: `sudo journalctl -u kaspa-dashboard`

2. **Invalid Values**
   - Review validation error messages in logs
   - Check data types (string vs integer vs boolean)
   - Verify ranges for numeric values

3. **File Not Found Errors**
   - Ensure `.env` file exists: `/opt/kaspa-dashboard/.env`
   - Check file ownership: `chown kaspa-dashboard:kaspa-dashboard .env`
   - Verify file permissions: `chmod 600 .env`

4. **Permission Denied**
   - Check SSL certificate file permissions
   - Verify log directory permissions
   - Ensure backup directory is writable

### Debugging Commands

```bash
# Check current environment
sudo -u kaspa-dashboard env | grep -E '^(NODE_ENV|PORT|KASPA_)'

# Validate .env file syntax
sudo -u kaspa-dashboard bash -c 'source /opt/kaspa-dashboard/.env && echo "Syntax OK"'

# Check systemd environment
systemctl show kaspa-dashboard | grep Environment

# Test configuration loading
sudo -u kaspa-dashboard node -e "
require('dotenv').config({path: '/opt/kaspa-dashboard/.env'});
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
"
```

## Security Considerations

### Sensitive Variables

These variables contain sensitive information and should be protected:

- `SESSION_SECRET`: Keep secret, rotate regularly
- `SSL_KEY_PATH`: Private key file, restrict access
- `DATABASE_URL`: Contains database credentials
- Any custom secrets or API keys

### File Permissions

```bash
# Secure .env file
sudo chown kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard/.env
sudo chmod 600 /opt/kaspa-dashboard/.env

# Secure SSL files
sudo chown kaspa-dashboard:kaspa-dashboard /path/to/ssl/files
sudo chmod 600 /path/to/ssl/private.key
sudo chmod 644 /path/to/ssl/cert.pem
```

### Environment File Template

Use the provided template as a starting point:

```bash
# Copy template to create configuration
sudo cp /opt/kaspa-dashboard/.env.template /opt/kaspa-dashboard/.env
sudo chown kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard/.env
sudo chmod 600 /opt/kaspa-dashboard/.env

# Edit configuration
sudo -u kaspa-dashboard nano /opt/kaspa-dashboard/.env
```

## Best Practices

1. **Use Environment File**: Store configuration in `.env` file rather than systemd service
2. **Secure Sensitive Data**: Protect files containing secrets with appropriate permissions
3. **Document Changes**: Comment configuration changes in the `.env` file
4. **Test Configuration**: Validate configuration before restarting the service
5. **Backup Configuration**: Include `.env` file in backup procedures
6. **Monitor Resources**: Set appropriate thresholds for your system capacity
7. **Regular Updates**: Review and update configuration as system requirements change

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md): Host-based deployment instructions
- [Service Management](SERVICE_MANAGEMENT.md): Systemd service management
- [Security Configuration](../docs/security-configuration.md): Security best practices
- [Performance Tuning](../docs/performance-tuning.md): Performance optimization guide