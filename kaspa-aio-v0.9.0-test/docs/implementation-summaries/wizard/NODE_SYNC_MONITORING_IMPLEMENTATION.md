# Node Sync Monitoring System Implementation

**Status**: ✅ COMPLETE  
**Task**: 6.7.1 Build node sync monitoring system  
**Date**: 2024-11-25

## Overview

Implemented a comprehensive node synchronization monitoring system that connects to Kaspa nodes via RPC, tracks sync progress, calculates sync rates, and estimates time remaining for blockchain synchronization.

## Implementation Details

### 1. Node Sync Manager Utility

**File**: `services/wizard/backend/src/utils/node-sync-manager.js`

**Features**:
- RPC connection to Kaspa nodes (HTTP/HTTPS)
- Query `getBlockDagInfo` for sync status
- Calculate sync progress (currentBlock / targetBlock * 100)
- Track sync history over time (last 10 minutes)
- Calculate sync rate (blocks per second)
- Estimate time remaining based on sync rate
- Format time remaining as human-readable strings
- Support for multiple nodes
- Error handling and timeout management

**Key Methods**:

```javascript
// Get sync status for a node
async getSyncStatus(options = {
  host: 'localhost',
  port: 16110,
  useHttps: false,
  timeout: 5000
})

// Make RPC call to Kaspa node
async rpcCall(host, port, method, params, useHttps, timeout)

// Calculate sync rate (blocks/second)
calculateSyncRate(nodeKey)

// Estimate time remaining (seconds)
estimateTimeRemaining(nodeKey, currentBlock, targetBlock, isSynced)

// Format time remaining as human-readable string
formatTimeRemaining(seconds)

// Check if node is reachable
async isNodeReachable(options)

// Wait for node to become synced
async waitForSync(options)

// Get status for multiple nodes
async getMultiNodeStatus(nodes)
```

**Sync Status Response**:
```javascript
{
  connected: true,
  synced: false,
  currentBlock: 12345678,
  targetBlock: 12350000,
  blocksRemaining: 4322,
  percentage: 99.97,
  estimatedTimeRemaining: 432, // seconds
  syncRate: 10.5, // blocks/second
  timestamp: 1700000000000,
  nodeInfo: {
    host: 'localhost',
    port: 16110,
    networkName: 'kaspa-mainnet',
    tipHashes: [...],
    difficulty: 123456789
  }
}
```

### 2. Node Sync API Endpoints

**File**: `services/wizard/backend/src/api/node-sync.js`

**Endpoints**:

#### GET /api/node/sync-status
Get current sync status for a Kaspa node.

**Query Parameters**:
- `host` - Node hostname (default: 'localhost')
- `port` - RPC port (default: 16110)
- `useHttps` - Use HTTPS (default: false)

**Response**:
```json
{
  "success": true,
  "status": {
    "connected": true,
    "synced": false,
    "currentBlock": 12345678,
    "targetBlock": 12350000,
    "blocksRemaining": 4322,
    "percentage": 99.97,
    "estimatedTimeRemaining": 432,
    "estimatedTimeRemainingFormatted": "7 minutes",
    "syncRate": 10.5,
    "timestamp": 1700000000000,
    "nodeInfo": { ... }
  }
}
```

#### GET /api/node/is-reachable
Check if a Kaspa node is reachable.

**Query Parameters**:
- `host` - Node hostname (default: 'localhost')
- `port` - RPC port (default: 16110)
- `useHttps` - Use HTTPS (default: false)

**Response**:
```json
{
  "success": true,
  "reachable": true
}
```

#### POST /api/node/multi-status
Get sync status for multiple nodes.

**Request Body**:
```json
{
  "nodes": [
    { "host": "localhost", "port": 16110, "useHttps": false },
    { "host": "node2.example.com", "port": 16110, "useHttps": true }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "statuses": [
    { "connected": true, "synced": false, ... },
    { "connected": true, "synced": true, ... }
  ]
}
```

#### GET /api/node/sync-rate
Get current sync rate for a node.

**Query Parameters**:
- `host` - Node hostname (default: 'localhost')
- `port` - RPC port (default: 16110)

**Response**:
```json
{
  "success": true,
  "syncRate": 10.5,
  "formatted": "10.50 blocks/second"
}
```

#### DELETE /api/node/sync-history
Clear sync history for a node or all nodes.

**Query Parameters**:
- `host` - Node hostname (optional)
- `port` - RPC port (optional, required if host provided)

**Response**:
```json
{
  "success": true,
  "message": "Sync history cleared for localhost:16110"
}
```

### 3. Server Integration

**File**: `services/wizard/backend/src/server.js`

Added node sync API routes:
```javascript
const nodeSyncRouter = require('./api/node-sync');
app.use('/api/node', nodeSyncRouter);
```

### 4. Test Suite

**Files**:
- `services/wizard/backend/test-node-sync.js` - Unit tests for NodeSyncManager
- `services/wizard/backend/test-node-sync-api.js` - API endpoint tests

**Test Coverage**:
- ✅ NodeSyncManager instance creation
- ✅ Time formatting (seconds → human-readable)
- ✅ Sync history management
- ✅ Time estimation calculations
- ✅ Error handling for unreachable nodes
- ✅ Multi-node status retrieval
- ✅ History clearing
- ✅ Node reachability checks
- ✅ API endpoint responses
- ✅ Invalid request handling

**Test Results**: 8/8 unit tests passed (100%)

## Technical Details

### RPC Communication

The system uses HTTP/HTTPS POST requests to communicate with Kaspa nodes:

```javascript
// RPC Request Format
{
  "jsonrpc": "2.0",
  "id": 1700000000000,
  "method": "getBlockDagInfo",
  "params": []
}

// RPC Response Format
{
  "jsonrpc": "2.0",
  "id": 1700000000000,
  "result": {
    "blockCount": 12345678,
    "headerCount": 12350000,
    "isSynced": false,
    "networkName": "kaspa-mainnet",
    "tipHashes": [...],
    "difficulty": 123456789
  }
}
```

### Sync Rate Calculation

The system tracks sync progress over time to calculate sync rate:

1. Store sync history (timestamp, currentBlock, targetBlock)
2. Keep last 10 minutes of history
3. Calculate rate: `(newestBlock - oldestBlock) / (newestTime - oldestTime)`
4. Use rate to estimate time remaining: `blocksRemaining / syncRate`

### Time Formatting

Human-readable time formatting:
- `< 60s` → "30 seconds"
- `< 1h` → "45 minutes"
- `< 24h` → "3 hours 15 min"
- `≥ 24h` → "2 days 5 hr"
- `null` → "Calculating..."
- `0` → "Complete"

## Usage Examples

### JavaScript/Node.js

```javascript
const NodeSyncManager = require('./src/utils/node-sync-manager');
const syncManager = new NodeSyncManager();

// Get sync status
const status = await syncManager.getSyncStatus({
  host: 'localhost',
  port: 16110
});

console.log(`Synced: ${status.synced}`);
console.log(`Progress: ${status.percentage}%`);
console.log(`Time Remaining: ${syncManager.formatTimeRemaining(status.estimatedTimeRemaining)}`);

// Wait for sync to complete
await syncManager.waitForSync({
  host: 'localhost',
  port: 16110,
  checkInterval: 10000, // Check every 10 seconds
  onProgress: (status) => {
    console.log(`Progress: ${status.percentage}%`);
  }
});
```

### REST API

```bash
# Get sync status
curl "http://localhost:3000/api/node/sync-status?host=localhost&port=16110"

# Check if node is reachable
curl "http://localhost:3000/api/node/is-reachable?host=localhost&port=16110"

# Get multi-node status
curl -X POST http://localhost:3000/api/node/multi-status \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"host": "localhost", "port": 16110},
      {"host": "node2.example.com", "port": 16110}
    ]
  }'

# Get sync rate
curl "http://localhost:3000/api/node/sync-rate?host=localhost&port=16110"

# Clear sync history
curl -X DELETE "http://localhost:3000/api/node/sync-history?host=localhost&port=16110"
```

## Integration Points

### Wizard Installation Flow

The node sync manager will be integrated into the wizard installation flow:

1. **Installation Step**: Start Kaspa node container
2. **Sync Detection**: Check if node needs to sync
3. **User Choice**: Present sync strategy options
   - Wait for sync (show progress)
   - Continue in background (proceed with other services)
   - Skip sync (use public network)
4. **Progress Monitoring**: Track sync progress in real-time
5. **Completion**: Notify when sync completes

### Background Task Management

The sync manager supports background monitoring:

```javascript
// Start monitoring in background
const checkInterval = setInterval(async () => {
  const status = await syncManager.getSyncStatus({
    host: 'localhost',
    port: 16110
  });
  
  // Update wizard state
  await updateWizardState({
    nodeSyncProgress: status.percentage,
    nodeSyncComplete: status.synced
  });
  
  // Notify dependent services when synced
  if (status.synced) {
    await notifyDependentServices();
    clearInterval(checkInterval);
  }
}, 10000); // Check every 10 seconds
```

## Error Handling

The system handles various error scenarios:

1. **Connection Refused**: Node not running or wrong port
2. **Timeout**: Node not responding within timeout period
3. **Invalid Response**: Malformed JSON or unexpected format
4. **Network Errors**: DNS resolution failures, network unreachable

All errors are caught and returned in a consistent format:

```javascript
{
  connected: false,
  error: "RPC connection failed: connect ECONNREFUSED 127.0.0.1:16110",
  synced: false,
  progress: 0,
  timestamp: 1700000000000
}
```

## Performance Considerations

- **History Retention**: Only keeps 10 minutes of sync history per node
- **Timeout**: Default 5-second timeout for RPC calls
- **Rate Limiting**: API endpoints protected by rate limiting (100 req/15min)
- **Memory**: Minimal memory footprint (history stored in Map)
- **Concurrent Requests**: Supports multiple simultaneous node queries

## Security Considerations

- **Input Validation**: Host and port parameters validated
- **Timeout Protection**: Prevents hanging connections
- **Error Sanitization**: Error messages don't expose sensitive info
- **Rate Limiting**: Prevents API abuse
- **No Authentication**: RPC calls to local nodes only (no auth required)

## Future Enhancements

Potential improvements for future iterations:

1. **WebSocket Streaming**: Real-time sync progress via WebSocket
2. **Historical Charts**: Visualize sync rate over time
3. **Multiple Network Support**: Testnet, devnet, etc.
4. **Sync Prediction**: ML-based sync time prediction
5. **Alert System**: Notify when sync stalls or fails
6. **Persistent Storage**: Save sync history to disk
7. **Authentication**: Support for authenticated RPC endpoints

## Testing

### Run Unit Tests
```bash
node services/wizard/backend/test-node-sync.js
```

### Run API Tests
```bash
# Start wizard backend first
node services/wizard/backend/src/server.js

# In another terminal
node services/wizard/backend/test-node-sync-api.js
```

### Test with Real Node
The unit test suite includes an optional real node test that attempts to connect to a running Kaspa node on localhost:16110. This test is informational and will gracefully handle the case where no node is running.

## Files Created

1. `services/wizard/backend/src/utils/node-sync-manager.js` - Core sync manager utility
2. `services/wizard/backend/src/api/node-sync.js` - REST API endpoints
3. `services/wizard/backend/test-node-sync.js` - Unit test suite
4. `services/wizard/backend/test-node-sync-api.js` - API test suite
5. `docs/implementation-summaries/wizard/NODE_SYNC_MONITORING_IMPLEMENTATION.md` - This document

## Files Modified

1. `services/wizard/backend/src/server.js` - Added node sync API routes

## Requirements Satisfied

- ✅ Create `services/wizard/backend/src/utils/node-sync-manager.js`
- ✅ Implement Kaspa node RPC connection
- ✅ Query `getBlockDagInfo` for sync status
- ✅ Calculate sync progress (currentBlock / targetBlock * 100)
- ✅ Estimate time remaining based on sync rate
- ✅ Create sync status API endpoint (GET /api/node/sync-status)
- ✅ Requirements: 5 (Installation Progress Tracking), 6 (Post-Installation Validation)

## Next Steps

The next task in the sequence is **6.7.2 Implement sync strategy options**, which will:
- Create user choice dialog for sync strategies
- Implement "Wait for sync" with progress display
- Implement "Continue in background" with monitoring
- Implement "Skip sync" with fallback configuration
- Store user choice in wizard state

This node sync monitoring system provides the foundation for that work.
