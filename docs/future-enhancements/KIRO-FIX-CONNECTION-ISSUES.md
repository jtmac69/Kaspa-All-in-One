# KIRO AI FIX - Kaspa Dashboard Connection Issues

---
## METADATA
```yaml
task_type: critical_bug_fix
complexity: high
risk_level: medium
estimated_time: 20_minutes
files_affected: 2_backend_1_frontend
breaking_changes: false
requires_restart: true
requires_packages: axios
priority: critical
```
---

## CRITICAL ISSUES IDENTIFIED

### Issue 1: Wrong RPC Ports ❌
**Log Evidence:**
```
Failed to connect to Kaspa node on any port: 16111, 16110
```

**Problem:**
- Code tries ports **16111** (P2P, not RPC) and **16110** (gRPC, needs special client)
- Should use port **17110** (wRPC with JSON encoding)

### Issue 2: Public API Not Working ❌
**Log Evidence:**
```
Public API not available, trying local node fallback
Local node not available for network stats
```

**Problem:**
- Public API endpoint not correctly implemented or endpoint URL wrong
- Should use: `https://api.kaspa.org/info/blockg/info`
- Alternative: Use public wRPC node at `node.k-social.network:17110`

### Issue 3: Network Section Shows "Fetching..." ❌
**User Report:** Left side shows "Fetching..." instead of network data

**Problem:**
- Frontend correctly attempts fetch
- Backend endpoint fails (Public API issue + local fallback fails)

---

## SOLUTION ARCHITECTURE

```
┌─ Frontend ──────────────────┐
│ - Calls /api/kaspa/network  │
│ - Shows "Fetching..."       │
└─────────────┬───────────────┘
              │
              ▼
┌─ Backend /api/kaspa/network ─────────────────────┐
│ 1. Try Public REST API (api.kaspa.org)           │
│    └─ Success → Return data                      │
│    └─ Fail → Try #2                              │
│                                                   │
│ 2. Try Public wRPC (node.k-social.network:17110) │
│    └─ Success → Return data                      │
│    └─ Fail → Try #3                              │
│                                                   │
│ 3. Try Local Node (localhost:17110)              │
│    └─ Success → Return data                      │
│    └─ Fail → Return error                        │
└───────────────────────────────────────────────────┘
```

---

## FIX 1: Correct RPC Port Configuration

### FILE: Backend RPC Client (likely `lib/KaspaNodeClient.js` or similar)

### FIND THIS:
```javascript
class KaspaNodeClient {
    constructor() {
        this.ports = [16111, 16110]; // ❌ WRONG PORTS
        this.host = '127.0.0.1';
    }
}
```

### REPLACE WITH:
```javascript
class KaspaNodeClient {
    constructor(config = {}) {
        // Correct ports for wRPC JSON-RPC
        this.ports = config.ports || [17110, 18110]; // wRPC JSON and JSON-RPC
        this.host = config.host || '127.0.0.1';
        this.timeout = config.timeout || 5000;
    }
    
    /**
     * Connect to Kaspa node using wRPC WebSocket (JSON encoding)
     */
    async connect(port) {
        return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const ws = new WebSocket(`ws://${this.host}:${port}`);
            
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error(`Connection timeout on port ${port}`));
            }, this.timeout);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                resolve(ws);
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    
    /**
     * Make RPC call using wRPC JSON protocol
     */
    async rpcCall(method, params = {}) {
        let ws = null;
        let lastError = null;
        
        // Try each port
        for (const port of this.ports) {
            try {
                ws = await this.connect(port);
                
                return await new Promise((resolve, reject) => {
                    const request = {
                        method: method,
                        params: params,
                        id: Date.now()
                    };
                    
                    const timeout = setTimeout(() => {
                        ws.close();
                        reject(new Error(`RPC timeout for ${method}`));
                    }, this.timeout);
                    
                    ws.on('message', (data) => {
                        clearTimeout(timeout);
                        try {
                            const response = JSON.parse(data.toString());
                            ws.close();
                            
                            if (response.error) {
                                reject(new Error(response.error.message || 'RPC error'));
                            } else {
                                resolve(response.result);
                            }
                        } catch (parseError) {
                            reject(parseError);
                        }
                    });
                    
                    ws.send(JSON.stringify(request));
                });
            } catch (error) {
                lastError = error;
                if (ws) ws.close();
                continue; // Try next port
            }
        }
        
        throw lastError || new Error('Failed to connect to any port');
    }
    
    /**
     * Get node info
     */
    async getInfo() {
        return await this.rpcCall('getInfo');
    }
    
    /**
     * Get block DAG info
     */
    async getBlockDagInfo() {
        return await this.rpcCall('getBlockDagInfo');
    }
    
    /**
     * Get connected peer info
     */
    async getConnectedPeerInfo() {
        return await this.rpcCall('getConnectedPeerInfo');
    }
}

module.exports = KaspaNodeClient;
```

---

## FIX 2: Implement Robust Public API Network Endpoint

### FILE: Backend Server (likely `services/dashboard/server.js`)

### ADD THIS NEW ENDPOINT:

```javascript
const axios = require('axios');
const WebSocket = require('ws');

/**
 * Get Kaspa network stats - tries multiple sources in order
 * 1. Public REST API (api.kaspa.org)
 * 2. Public wRPC node (node.k-social.network)
 * 3. Local node (if available)
 */
app.get('/api/kaspa/network', async (req, res) => {
    let networkData = null;
    let source = 'unknown';
    
    // ========================================================================
    // ATTEMPT 1: Public REST API
    // ========================================================================
    try {
        console.log('Attempting to fetch from public REST API...');
        
        const response = await axios.get('https://api.kaspa.org/info/blockdag/info', {
            timeout: 5000,
            headers: {
                'User-Agent': 'Kaspa-Dashboard/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (response.data) {
            networkData = {
                blockHeight: response.data.virtualDaaScore || response.data.blockCount,
                difficulty: response.data.difficulty,
                networkHashrate: response.data.networkHashRate || 
                               response.data.networkHashrate || 
                               'N/A',
                networkName: response.data.networkName || 'mainnet',
                tipHashes: response.data.tipHashes?.length || 0
            };
            source = 'public-rest-api';
            console.log('✓ Public REST API successful');
        }
    } catch (apiError) {
        console.log('✗ Public REST API failed:', apiError.message);
    }
    
    // ========================================================================
    // ATTEMPT 2: Public wRPC Node (node.k-social.network)
    // ========================================================================
    if (!networkData) {
        try {
            console.log('Attempting to fetch from public wRPC node...');
            
            networkData = await getPublicWrpcNetworkInfo();
            source = 'public-wrpc-node';
            console.log('✓ Public wRPC node successful');
        } catch (wrpcError) {
            console.log('✗ Public wRPC node failed:', wrpcError.message);
        }
    }
    
    // ========================================================================
    // ATTEMPT 3: Local Node Fallback
    // ========================================================================
    if (!networkData) {
        try {
            console.log('Attempting to fetch from local node...');
            
            const kaspaClient = new KaspaNodeClient();
            const dagInfo = await kaspaClient.getBlockDagInfo();
            
            networkData = {
                blockHeight: dagInfo.virtualDaaScore || dagInfo.blockCount,
                difficulty: dagInfo.difficulty,
                networkHashrate: 'N/A',
                networkName: dagInfo.networkName || 'mainnet',
                tipHashes: dagInfo.tipHashes?.length || 0
            };
            source = 'local-node';
            console.log('✓ Local node successful');
        } catch (localError) {
            console.log('✗ Local node failed:', localError.message);
        }
    }
    
    // ========================================================================
    // Return Result or Error
    // ========================================================================
    if (networkData) {
        res.json({
            ...networkData,
            source: source,
            timestamp: new Date().toISOString()
        });
    } else {
        console.error('All network data sources failed');
        res.status(503).json({
            error: 'Network data unavailable',
            message: 'All data sources (public API, public node, local node) failed',
            sources_tried: ['public-rest-api', 'public-wrpc-node', 'local-node']
        });
    }
});

/**
 * Helper: Get network info from public wRPC node
 */
async function getPublicWrpcNetworkInfo() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://node.k-social.network:17110');
        
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Public wRPC connection timeout'));
        }, 5000);
        
        ws.on('open', () => {
            const request = {
                method: 'getBlockDagInfo',
                params: {},
                id: Date.now()
            };
            ws.send(JSON.stringify(request));
        });
        
        ws.on('message', (data) => {
            clearTimeout(timeout);
            try {
                const response = JSON.parse(data.toString());
                ws.close();
                
                if (response.error) {
                    reject(new Error(response.error.message || 'wRPC error'));
                } else {
                    const result = response.result;
                    resolve({
                        blockHeight: result.virtualDaaScore || result.blockCount,
                        difficulty: result.difficulty,
                        networkHashrate: 'N/A', // Not available via wRPC
                        networkName: result.networkName || 'mainnet',
                        tipHashes: result.tipHashes?.length || 0
                    });
                }
            } catch (parseError) {
                reject(parseError);
            }
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}
```

---

## FIX 3: Update Node Sync Status Endpoint to Use Correct Port

### FILE: Backend Server

### FIND THE SYNC STATUS ENDPOINT:
```javascript
app.get('/api/kaspa/node/sync-status', async (req, res) => {
    // ... existing code
});
```

### ENSURE IT USES THE UPDATED KaspaNodeClient:
```javascript
app.get('/api/kaspa/node/sync-status', async (req, res) => {
    try {
        // Use corrected client with port 17110
        const kaspaClient = new KaspaNodeClient({
            ports: [17110, 18110],
            host: '127.0.0.1',
            timeout: 5000
        });
        
        // Get node info
        const nodeInfo = await kaspaClient.getInfo();
        
        // Get DAG info
        const dagInfo = await kaspaClient.getBlockDagInfo();
        
        // Get peer info
        const peerInfo = await kaspaClient.getConnectedPeerInfo();
        
        // Parse logs for sync phase (your existing function)
        const containerLogs = await getContainerLogs('kaspa-node'); // Your function
        const syncStatus = parseKaspaSyncLogs(containerLogs);
        
        res.json({
            syncPhase: syncStatus.syncPhase,
            syncPhaseName: syncStatus.syncPhaseName,
            progress: syncStatus.progress,
            detail: syncStatus.detail,
            isSynced: nodeInfo.isSynced,
            rpc: {
                serverVersion: nodeInfo.serverVersion,
                isUtxoIndexed: nodeInfo.isUtxoIndexed,
                mempoolSize: nodeInfo.mempoolSize,
                connectedPeers: peerInfo?.infos?.length || 0
            },
            dag: {
                blockCount: dagInfo.blockCount,
                virtualDaaScore: dagInfo.virtualDaaScore,
                difficulty: dagInfo.difficulty,
                networkName: dagInfo.networkName
            }
        });
        
    } catch (error) {
        console.error('RPC data not available for sync status:', error.message);
        res.status(503).json({
            error: 'Node unavailable',
            message: error.message,
            syncPhase: 'unknown',
            progress: 0
        });
    }
});
```

---

## FIX 4: Install Required Package

### COMMAND TO RUN:
```bash
cd services/dashboard
npm install ws axios
```

**Required Packages:**
- `ws` - WebSocket client for Node.js (for wRPC connections)
- `axios` - HTTP client (for REST API calls)

---

## TESTING PROCEDURE

### Test 1: Check Port 17110 is Open
```bash
# On your server:
docker exec kaspa-node netstat -tulpn | grep 17110

# Should show: tcp 0 0 0.0.0.0:17110 0.0.0.0:* LISTEN
```

### Test 2: Test wRPC Connection Manually
```bash
# Install wscat if needed
npm install -g wscat

# Test connection
wscat -c ws://127.0.0.1:17110

# Once connected, send:
{"method":"getInfo","params":{},"id":1}

# Should get JSON response
```

### Test 3: Test Public API
```bash
curl -s "https://api.kaspa.org/info/blockdag/info" | jq .
```

### Test 4: Test Dashboard Endpoint
```bash
curl -s "http://localhost:8080/api/kaspa/network" | jq .
```

---

## EXPECTED RESULTS

### After Fix:
1. ✅ Network section shows actual data (not "Fetching...")
2. ✅ Uses public node when local unavailable
3. ✅ No more "Failed to connect on port 16111, 16110" errors
4. ✅ Logs show: "✓ Public REST API successful" or "✓ Public wRPC node successful"

---

## ROLLBACK

If fixes cause issues:
```bash
git stash  # Stash changes
npm start  # Restart with old code
```

---

## NOTES FOR AI ASSISTANT

1. **Critical:** Port 17110 must be used for wRPC JSON protocol
2. **Fallback chain:** Public API → Public wRPC → Local node
3. **WebSocket required:** npm install ws
4. **node.k-social.network** is the public Kaspa node endpoint
5. **Error handling:** Each attempt must catch and continue to next
6. **Logging:** Include console.log for debugging each attempt

---

## COMPLETION CRITERIA

✅ **COMPLETE** when:
1. No "Failed to connect on port 16111, 16110" errors in logs
2. Network section shows block height and difficulty
3. Logs show successful connection to at least one source
4. Dashboard works even when local node is down
5. `/api/kaspa/network` returns valid JSON data
