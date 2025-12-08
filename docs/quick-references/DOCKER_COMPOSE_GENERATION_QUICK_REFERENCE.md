# Docker Compose Generation Quick Reference

## Overview

The wizard can dynamically generate docker-compose.yml files with custom port configurations, network selection, and data directory settings.

## API Endpoints

### Generate Docker Compose Content

```bash
POST /api/config/generate-docker-compose
```

**Request Body**:
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": 16210,
    "KASPA_NODE_P2P_PORT": 16211,
    "KASPA_NETWORK": "testnet",
    "KASPA_DATA_DIR": "/custom/kaspa/data",
    "TIMESCALEDB_DATA_DIR": "/custom/timescaledb/data"
  },
  "profiles": ["core", "indexer-services"]
}
```

**Response**:
```json
{
  "success": true,
  "content": "# Docker Compose for Kaspa All-in-One\n..."
}
```

### Save Docker Compose File

```bash
POST /api/config/save-docker-compose
```

**Request Body**:
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": 16210,
    "KASPA_NODE_P2P_PORT": 16211,
    "KASPA_NETWORK": "mainnet"
  },
  "profiles": ["core"],
  "path": "./docker-compose.yml"
}
```

**Response**:
```json
{
  "success": true,
  "path": "/absolute/path/to/docker-compose.yml"
}
```

## Configuration Options

### Port Configuration

| Field | Default | Range | Description |
|-------|---------|-------|-------------|
| `KASPA_NODE_RPC_PORT` | 16110 | 1024-65535 | Kaspa node RPC port |
| `KASPA_NODE_P2P_PORT` | 16111 | 1024-65535 | Kaspa node P2P port |

**Example**:
```json
{
  "KASPA_NODE_RPC_PORT": 16210,
  "KASPA_NODE_P2P_PORT": 16211
}
```

### Network Selection

| Field | Default | Options | Description |
|-------|---------|---------|-------------|
| `KASPA_NETWORK` | mainnet | mainnet, testnet | Kaspa network to connect to |

**Example**:
```json
{
  "KASPA_NETWORK": "testnet"
}
```

**Effect**:
- **Mainnet**: Standard kaspad command
- **Testnet**: Adds `--testnet` flag to kaspad command

### Data Directory Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `KASPA_DATA_DIR` | /data/kaspa | Kaspa node data directory |
| `KASPA_ARCHIVE_DATA_DIR` | /data/kaspa-archive | Archive node data directory |
| `TIMESCALEDB_DATA_DIR` | /data/timescaledb | TimescaleDB data directory |

**Example**:
```json
{
  "KASPA_DATA_DIR": "/mnt/ssd/kaspa",
  "TIMESCALEDB_DATA_DIR": "/mnt/hdd/timescaledb"
}
```

## Profile-Based Generation

The generated docker-compose.yml only includes services for selected profiles:

### Core Profile
- kaspa-node
- wizard

### Kaspa User Applications Profile
- nginx
- kasia-app
- k-social

### Indexer Services Profile
- indexer-db (TimescaleDB)
- kasia-indexer
- simply-kaspa-indexer

### Archive Node Profile
- archive-db
- archive-indexer

### Mining Profile
- kaspa-stratum

## Usage Examples

### Example 1: Core Profile with Custom Ports

```javascript
const config = {
  KASPA_NODE_RPC_PORT: 16210,
  KASPA_NODE_P2P_PORT: 16211,
  KASPA_NETWORK: 'mainnet'
};

const profiles = ['core'];

// Generate
const response = await fetch('/api/config/generate-docker-compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config, profiles })
});

const result = await response.json();
console.log(result.content);
```

### Example 2: Full Stack with Testnet

```javascript
const config = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'testnet',
  POSTGRES_PORT: 5432
};

const profiles = ['core', 'kaspa-user-applications', 'indexer-services'];

// Save directly
const response = await fetch('/api/config/save-docker-compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config, profiles })
});

const result = await response.json();
console.log(`Saved to: ${result.path}`);
```

### Example 3: Custom Data Directories

```javascript
const config = {
  KASPA_NODE_RPC_PORT: 16110,
  KASPA_NODE_P2P_PORT: 16111,
  KASPA_NETWORK: 'mainnet',
  KASPA_DATA_DIR: '/mnt/nvme/kaspa',
  TIMESCALEDB_DATA_DIR: '/mnt/hdd/timescaledb'
};

const profiles = ['core', 'indexer-services'];

const response = await fetch('/api/config/save-docker-compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ config, profiles })
});
```

## Command Line Usage

### Using Node.js

```javascript
const ConfigGenerator = require('./src/utils/config-generator');
const configGenerator = new ConfigGenerator();

const config = {
  KASPA_NODE_RPC_PORT: 16210,
  KASPA_NODE_P2P_PORT: 16211,
  KASPA_NETWORK: 'testnet'
};

const profiles = ['core'];

// Generate content
const content = await configGenerator.generateDockerCompose(config, profiles);
console.log(content);

// Save to file
const result = await configGenerator.saveDockerCompose(content, 'docker-compose.yml');
console.log(`Saved to: ${result.path}`);
```

### Using curl

```bash
# Generate docker-compose.yml content
curl -X POST http://localhost:3000/api/config/generate-docker-compose \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "KASPA_NODE_RPC_PORT": 16210,
      "KASPA_NODE_P2P_PORT": 16211,
      "KASPA_NETWORK": "testnet"
    },
    "profiles": ["core"]
  }'

# Save docker-compose.yml file
curl -X POST http://localhost:3000/api/config/save-docker-compose \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "KASPA_NODE_RPC_PORT": 16210,
      "KASPA_NODE_P2P_PORT": 16211,
      "KASPA_NETWORK": "mainnet"
    },
    "profiles": ["core", "indexer-services"]
  }'
```

## Dependent Service Port References

When you configure custom ports, dependent services automatically use them:

### Indexer Services
```yaml
environment:
  - KASPA_NODE_WBORSH_URL=ws://kaspa-node:17110  # RPC_PORT + 1000
  - KASPA_NODE_URL=http://kaspa-node:16110       # RPC_PORT
```

### Mining Stratum
```yaml
environment:
  - KASPA_RPC_SERVER=kaspa-node:16110  # RPC_PORT
```

### User Applications
```yaml
environment:
  - REMOTE_KASPA_NODE_URL=http://kaspa-node:16110  # RPC_PORT
```

## Backup and Safety

### Automatic Backup

When saving docker-compose.yml, the existing file is automatically backed up:

```
docker-compose.yml.backup.1733587200000
```

### Restore from Backup

```bash
# List backups
ls -la docker-compose.yml.backup.*

# Restore manually
cp docker-compose.yml.backup.1733587200000 docker-compose.yml
```

## Validation

Configuration is validated before generation:

- **Port Range**: 1024-65535
- **Network**: mainnet or testnet only
- **Data Directories**: Valid path format

Invalid configuration returns error:
```json
{
  "error": "Invalid configuration",
  "errors": [
    {
      "field": "KASPA_NODE_RPC_PORT",
      "message": "Port must be between 1024 and 65535"
    }
  ]
}
```

## Testing

Run the test suite:

```bash
node services/wizard/backend/test-docker-compose-generation.js
```

Expected output:
```
✅ All tests passed!
Total tests: 7
Passed: 7
Failed: 0
```

## Troubleshooting

### Issue: Ports already in use

**Solution**: Configure different ports in the configuration:
```json
{
  "KASPA_NODE_RPC_PORT": 16210,
  "KASPA_NODE_P2P_PORT": 16211
}
```

### Issue: Network change not taking effect

**Solution**: Ensure you're regenerating docker-compose.yml after changing network:
```bash
POST /api/config/save-docker-compose
```

### Issue: Data directory not mounted

**Solution**: Verify the data directory path is correct and accessible:
```json
{
  "KASPA_DATA_DIR": "/absolute/path/to/data"
}
```

## Best Practices

1. **Always validate** configuration before generating docker-compose.yml
2. **Use custom ports** if default ports conflict with existing services
3. **Specify data directories** for better storage management
4. **Test network selection** before deploying to production
5. **Keep backups** of working docker-compose.yml files
6. **Use profiles** to minimize resource usage

## Related Documentation

- [Configuration Fields Implementation](../implementation-summaries/wizard/CONFIGURATION_FIELDS_IMPLEMENTATION.md)
- [Configuration State Management](../implementation-summaries/wizard/CONFIGURATION_STATE_MANAGEMENT_IMPLEMENTATION.md)
- [Backend API Enhancements](../implementation-summaries/wizard/BACKEND_API_ENHANCEMENTS_IMPLEMENTATION.md)
- [Docker Compose Generation Implementation](../implementation-summaries/wizard/DOCKER_COMPOSE_GENERATION_IMPLEMENTATION.md)
