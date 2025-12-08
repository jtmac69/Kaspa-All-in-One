# Docker Compose Configuration Generation Implementation

**Date**: December 7, 2024  
**Task**: Task 5 - Docker Compose Configuration Generation  
**Status**: ✅ Complete

## Overview

Implemented dynamic docker-compose.yml generation with support for:
- Custom port configuration (RPC and P2P ports)
- Network selection (mainnet/testnet)
- Data directory volume configuration
- Profile-based service inclusion

## Implementation Details

### Task 5.1: Dynamic Port Configuration

**Location**: `services/wizard/backend/src/utils/config-generator.js`

Added `generateDockerCompose()` method that:
- Accepts configuration with `KASPA_NODE_RPC_PORT` and `KASPA_NODE_P2P_PORT`
- Generates docker-compose.yml with dynamic port mappings
- Updates dependent services to use configured ports
- Defaults to 16110 (RPC) and 16111 (P2P) if not specified

**Key Features**:
```javascript
// Port configuration
const rpcPort = config.KASPA_NODE_RPC_PORT || 16110;
const p2pPort = config.KASPA_NODE_P2P_PORT || 16111;

// Port mappings in docker-compose.yml
ports:
  - "${KASPA_NODE_P2P_PORT:-16211}:16211"  # P2P port
  - "${KASPA_NODE_RPC_PORT:-16210}:16210"  # RPC port
```

**Dependent Services Updated**:
- Indexer services reference `kaspa-node:${rpcPort}`
- Mining stratum references `kaspa-node:${rpcPort}`
- User applications use configured ports for WebSocket connections

### Task 5.2: Network Selection

**Location**: `services/wizard/backend/src/utils/config-generator.js`

Added network selection support:
- Reads `KASPA_NETWORK` from configuration (mainnet/testnet)
- Adds `--testnet` flag to kaspad command when testnet selected
- Propagates network setting to dependent services

**Implementation**:
```javascript
// Build kaspad command with network flag
let kaspadCommand = `kaspad --utxoindex --rpclisten=0.0.0.0:${rpcPort} --listen=0.0.0.0:${p2pPort}`;
if (network === 'testnet') {
  kaspadCommand += ' --testnet';
}
```

**Network Propagation**:
- Kasia app receives `VITE_DEFAULT_KASPA_NETWORK` environment variable
- Indexer services receive `NETWORK_TYPE` environment variable
- Defaults to mainnet if not specified

### Task 5.3: Data Directory Volumes

**Location**: `services/wizard/backend/src/utils/config-generator.js`

Added data directory configuration:
- `KASPA_DATA_DIR` - Kaspa node data directory (default: `/data/kaspa`)
- `KASPA_ARCHIVE_DATA_DIR` - Archive node data directory (default: `/data/kaspa-archive`)
- `TIMESCALEDB_DATA_DIR` - TimescaleDB data directory (default: `/data/timescaledb`)

**Volume Mappings**:
```yaml
volumes:
  - kaspa-data:/custom/kaspa/data
  - indexer-db-data:/custom/timescaledb/data
  - archive-db-data:/custom/archive/data
```

## API Endpoints

### POST /api/config/generate-docker-compose

Generates docker-compose.yml content with dynamic configuration.

**Request**:
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": 16210,
    "KASPA_NODE_P2P_PORT": 16211,
    "KASPA_NETWORK": "testnet",
    "KASPA_DATA_DIR": "/custom/kaspa/data"
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

### POST /api/config/save-docker-compose

Generates and saves docker-compose.yml file.

**Request**:
```json
{
  "config": {
    "KASPA_NODE_RPC_PORT": 16210,
    "KASPA_NODE_P2P_PORT": 16211,
    "KASPA_NETWORK": "mainnet"
  },
  "profiles": ["core"],
  "path": "/path/to/docker-compose.yml"
}
```

**Response**:
```json
{
  "success": true,
  "path": "/path/to/docker-compose.yml"
}
```

## Testing

### Test File

**Location**: `services/wizard/backend/test-docker-compose-generation.js`

### Test Coverage

✅ **Test 5.1**: Dynamic Port Configuration
- Custom RPC port (16210)
- Custom P2P port (16211)
- Port mappings use environment variables

✅ **Test 5.2a**: Network Selection - Mainnet
- No --testnet flag present
- kaspad command configured correctly

✅ **Test 5.2b**: Network Selection - Testnet
- --testnet flag present in command
- kaspad command configured correctly

✅ **Test 5.3**: Data Directory Volumes
- Custom Kaspa data directory
- Custom Archive data directory
- Custom TimescaleDB data directory

✅ **Test**: Multiple Profiles Integration
- Core profile services included
- User application services included
- Indexer services included

✅ **Test**: Port References in Dependent Services
- Indexer services use configured RPC port
- Mining stratum uses configured RPC port

✅ **Test**: Default Values
- Default RPC port (16110)
- Default P2P port (16111)
- Default data directories

### Test Results

```
Total tests: 7
Passed: 7
Failed: 0

✅ All tests passed!
```

## Files Modified

1. **services/wizard/backend/src/utils/config-generator.js**
   - Added `generateDockerCompose()` method
   - Added `saveDockerCompose()` method
   - Implements dynamic port configuration
   - Implements network selection
   - Implements data directory volumes

2. **services/wizard/backend/src/api/config.js**
   - Added `POST /api/config/generate-docker-compose` endpoint
   - Added `POST /api/config/save-docker-compose` endpoint

## Files Created

1. **services/wizard/backend/test-docker-compose-generation.js**
   - Comprehensive test suite for docker-compose generation
   - Tests all three subtasks (5.1, 5.2, 5.3)
   - Tests integration scenarios

## Integration Points

### Configuration State Management (Task 3)

The docker-compose generation integrates with configuration state management:
- Reads port configuration from state
- Reads network selection from state
- Reads data directory configuration from state

### Configuration Validation (Task 4)

The docker-compose generation uses validated configuration:
- Port ranges validated (1024-65535)
- Network selection validated (mainnet/testnet)
- Data directory paths validated

### Installation Flow

The docker-compose generation will be called during:
1. Initial installation (after configuration step)
2. Reconfiguration (when user modifies settings)
3. Profile changes (when user adds/removes profiles)

## Usage Example

```javascript
const ConfigGenerator = require('./src/utils/config-generator');
const configGenerator = new ConfigGenerator();

// Configuration with custom settings
const config = {
  KASPA_NODE_RPC_PORT: 16210,
  KASPA_NODE_P2P_PORT: 16211,
  KASPA_NETWORK: 'testnet',
  KASPA_DATA_DIR: '/mnt/kaspa/data',
  TIMESCALEDB_DATA_DIR: '/mnt/timescaledb/data'
};

const profiles = ['core', 'indexer-services'];

// Generate docker-compose.yml content
const composeContent = await configGenerator.generateDockerCompose(config, profiles);

// Save to file
const result = await configGenerator.saveDockerCompose(composeContent, 'docker-compose.yml');
console.log(`Saved to: ${result.path}`);
```

## Benefits

1. **Dynamic Configuration**: No need to manually edit docker-compose.yml
2. **Port Flexibility**: Users can configure custom ports to avoid conflicts
3. **Network Support**: Easy switching between mainnet and testnet
4. **Data Management**: Custom data directories for better storage management
5. **Profile-Based**: Only includes services for selected profiles
6. **Validation**: Configuration validated before generation
7. **Backup**: Automatic backup of existing docker-compose.yml

## Requirements Validated

✅ **Requirement 3.9**: Kaspa node RPC and P2P port configuration  
✅ **Requirement 3.10**: Network selection (mainnet/testnet)  
✅ **Requirement 3.11**: Data directory configuration  

## Next Steps

The docker-compose generation is now complete and ready for integration with:
- Task 6: Testing and Validation
- Task 7: Documentation Updates
- Installation workflow integration

## Notes

- The generated docker-compose.yml maintains compatibility with existing .env files
- Default values ensure backward compatibility
- Automatic backup prevents accidental overwrites
- Profile-based generation keeps the file clean and minimal
- All dependent services automatically use configured ports
