# Node Sync Monitoring Quick Reference

Quick reference for using the Kaspa node synchronization monitoring system.

## API Endpoints

### Get Sync Status
```bash
GET /api/node/sync-status?host=localhost&port=16110
```

**Response**:
```json
{
  "success": true,
  "status": {
    "connected": true,
    "synced": false,
    "currentBlock": 12345678,
    "targetBlock": 12350000,
    "percentage": 99.97,
    "estimatedTimeRemaining": 432,
    "estimatedTimeRemainingFormatted": "7 minutes",
    "syncRate": 10.5
  }
}
```

### Check Node Reachability
```bash
GET /api/node/is-reachable?host=localhost&port=16110
```

### Multi-Node Status
```bash
POST /api/node/multi-status
Content-Type: application/json

{
  "nodes": [
    {"host": "localhost", "port": 16110},
    {"host": "node2.example.com", "port": 16110}
  ]
}
```

### Get Sync Rate
```bash
GET /api/node/sync-rate?host=localhost&port=16110
```

### Clear Sync History
```bash
# Clear specific node
DELETE /api/node/sync-history?host=localhost&port=16110

# Clear all nodes
DELETE /api/node/sync-history
```

## JavaScript Usage

### Basic Sync Status
```javascript
const NodeSyncManager = require('./src/utils/node-sync-manager');
const syncManager = new NodeSyncManager();

const status = await syncManager.getSyncStatus({
  host: 'localhost',
  port: 16110
});

console.log(`Progress: ${status.percentage}%`);
console.log(`Time: ${syncManager.formatTimeRemaining(status.estimatedTimeRemaining)}`);
```

### Wait for Sync
```javascript
await syncManager.waitForSync({
  host: 'localhost',
  port: 16110,
  checkInterval: 10000,
  onProgress: (status) => {
    console.log(`${status.percentage}% complete`);
  }
});
```

### Monitor Multiple Nodes
```javascript
const nodes = [
  { host: 'node1.local', port: 16110 },
  { host: 'node2.local', port: 16110 }
];

const statuses = await syncManager.getMultiNodeStatus(nodes);
statuses.forEach((status, i) => {
  console.log(`Node ${i + 1}: ${status.percentage}%`);
});
```

### Background Monitoring
```javascript
const interval = setInterval(async () => {
  const status = await syncManager.getSyncStatus({
    host: 'localhost',
    port: 16110
  });
  
  if (status.synced) {
    console.log('Sync complete!');
    clearInterval(interval);
  } else {
    console.log(`${status.percentage}% - ${status.estimatedTimeRemainingFormatted}`);
  }
}, 10000);
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | Whether RPC connection succeeded |
| `synced` | boolean | Whether node is fully synced |
| `currentBlock` | number | Current block count |
| `targetBlock` | number | Target block count (header count) |
| `blocksRemaining` | number | Blocks left to sync |
| `percentage` | number | Sync progress percentage (0-100) |
| `estimatedTimeRemaining` | number | Seconds remaining (null if unknown) |
| `estimatedTimeRemainingFormatted` | string | Human-readable time ("7 minutes") |
| `syncRate` | number | Blocks per second |
| `timestamp` | number | Unix timestamp of status check |
| `nodeInfo` | object | Node metadata (network, difficulty, etc.) |

## Time Formatting

| Seconds | Formatted Output |
|---------|------------------|
| 0 | "Complete" |
| 30 | "30 seconds" |
| 90 | "1 minute" |
| 3600 | "1 hour" |
| 7200 | "2 hours" |
| 86400 | "1 day" |
| null | "Calculating..." |

## Error Handling

All errors return a consistent format:

```json
{
  "connected": false,
  "error": "RPC connection failed: connect ECONNREFUSED",
  "synced": false,
  "progress": 0,
  "timestamp": 1700000000000
}
```

Common errors:
- `ECONNREFUSED` - Node not running or wrong port
- `ETIMEDOUT` - Node not responding
- `ENOTFOUND` - DNS resolution failed
- `RPC error` - Node returned error response

## Configuration Options

### getSyncStatus Options
```javascript
{
  host: 'localhost',      // Node hostname
  port: 16110,            // RPC port
  useHttps: false,        // Use HTTPS
  timeout: 5000           // Request timeout (ms)
}
```

### waitForSync Options
```javascript
{
  host: 'localhost',      // Node hostname
  port: 16110,            // RPC port
  checkInterval: 10000,   // Check interval (ms)
  maxWaitTime: null,      // Max wait time (ms, null = infinite)
  onProgress: (status) => {} // Progress callback
}
```

## Testing

### Run Unit Tests
```bash
node services/wizard/backend/test-node-sync.js
```

### Run API Tests
```bash
# Terminal 1: Start server
node services/wizard/backend/src/server.js

# Terminal 2: Run tests
node services/wizard/backend/test-node-sync-api.js
```

## Integration Example

```javascript
// Installation wizard integration
async function handleNodeInstallation() {
  // Start node container
  await dockerManager.startService('kaspa-node');
  
  // Wait for node to be reachable
  let reachable = false;
  for (let i = 0; i < 30; i++) {
    reachable = await syncManager.isNodeReachable({
      host: 'localhost',
      port: 16110
    });
    if (reachable) break;
    await sleep(1000);
  }
  
  if (!reachable) {
    throw new Error('Node failed to start');
  }
  
  // Check sync status
  const status = await syncManager.getSyncStatus({
    host: 'localhost',
    port: 16110
  });
  
  if (!status.synced) {
    // Present sync strategy options to user
    const choice = await promptSyncStrategy(status);
    
    if (choice === 'wait') {
      await syncManager.waitForSync({
        host: 'localhost',
        port: 16110,
        onProgress: (status) => {
          updateProgressUI(status);
        }
      });
    } else if (choice === 'background') {
      startBackgroundMonitoring();
    } else {
      configureFallbackToPublic();
    }
  }
}
```

## Performance Notes

- **History Retention**: 10 minutes per node
- **Default Timeout**: 5 seconds
- **Rate Limiting**: 100 requests per 15 minutes
- **Memory Usage**: Minimal (Map-based storage)
- **Concurrent Queries**: Supported

## Related Documentation

- [Full Implementation Summary](../implementation-summaries/wizard/NODE_SYNC_MONITORING_IMPLEMENTATION.md)
- [Wizard Backend API](../../services/wizard/backend/README.md)
- [Task 6.7.1 Details](.kiro/specs/web-installation-wizard/tasks.md)
