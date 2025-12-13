# Indexer Services Endpoint Management Comparison

## Overview
This document compares how different indexer services in the Indexer Services profile handle Kaspa network connectivity and endpoint management.

## Indexer Services Comparison

### 1. Simply-Kaspa-Indexer ✅ (Built-in Fallback)

**Configuration**:
```yaml
environment:
  - KASPA_NODE_URL=https://api.kaspa.org
```

**Behavior**:
- ✅ **Automatic Endpoint Discovery**: Uses Kaspa Public Node Network (PNN)
- ✅ **Built-in Fallback**: Automatically switches between multiple WebSocket endpoints
- ✅ **Self-Healing**: Reconnects to different endpoints when one fails
- ✅ **No Manual Intervention**: Works reliably without configuration changes

**Observed Endpoints** (automatically discovered):
```
wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh
wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh  
wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh
wss://iris.kaspa.blue/kaspa/mainnet/wrpc/borsh
wss://kate.kaspa.red/kaspa/mainnet/wrpc/borsh
```

**Logs Example**:
```
[INFO] Connected to Kaspad wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh
[INFO] Connected to Kaspad wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh
[INFO] Connected to Kaspad wss://iris.kaspa.blue/kaspa/mainnet/wrpc/borsh
```

### 2. Kasia-Indexer ⚠️ (Manual Fallback Required)

**Configuration**:
```yaml
environment:
  - KASPA_NODE_WBORSH_URL=wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh
```

**Behavior**:
- ❌ **Single Endpoint**: Uses only one WebSocket endpoint at a time
- ❌ **No Built-in Fallback**: Doesn't automatically switch endpoints
- ⚠️ **Manual Intervention Required**: Must manually change endpoint if it fails
- ✅ **Works When Endpoint is Available**: Connects successfully to working endpoints

**Available Endpoints** (manual configuration):
```
wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh  (current default)
wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh   (alternative)
wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh   (alternative)
wss://iris.kaspa.blue/kaspa/mainnet/wrpc/borsh   (alternative)
```

**Logs Example**:
```
[INFO] Connected to Some("wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh")
[INFO] Successfully connected to RPC client
[INFO] Starting VirtualChainSyncer
```

### 3. K-Indexer ✅ (HTTP API)

**Configuration**:
```yaml
environment:
  - KASPA_NODE_URL=https://api.kaspa.org
```

**Behavior**:
- ✅ **HTTP API**: Uses REST API instead of WebSocket
- ✅ **Reliable**: HTTP endpoints are generally more stable
- ✅ **No WebSocket Issues**: Avoids WebSocket connectivity problems
- ✅ **Works Consistently**: Rarely has connection issues

## Why the Difference?

### Simply-Kaspa-Indexer Architecture
- **Built for Public Use**: Designed to work with public Kaspa network
- **PNN Integration**: Uses Kaspa Public Node Network for endpoint discovery
- **Resilient Design**: Built-in redundancy and failover mechanisms
- **Modern Implementation**: Newer codebase with better connectivity handling

### Kasia-Indexer Architecture  
- **Single Endpoint Design**: Originally designed for specific node connections
- **WebSocket Dependency**: Requires stable WebSocket connection
- **Manual Configuration**: Expects administrator to manage endpoints
- **Older Design Pattern**: Less automated failover capability

### K-Indexer Architecture
- **HTTP-Based**: Uses REST API calls instead of persistent WebSocket
- **Stateless**: Each request is independent
- **Simpler Protocol**: HTTP is more reliable than WebSocket for many use cases

## Troubleshooting Guide

### When Kasia-Indexer Fails to Connect

**Symptoms**:
```
ERROR indexer_actors::data_source: Error while connecting to node: vcc handler connect send failed
WARN indexer_actors::data_source: Disconnecting and retrying connection in 3 seconds
```

**Solution 1: Try Alternative Endpoint**
```bash
# Update .env file
echo "KASPA_NODE_WBORSH_URL=wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh" >> .env

# Recreate container
docker stop kasia-indexer && docker rm kasia-indexer && docker compose up -d kasia-indexer
```

**Solution 2: Test Endpoint Availability**
```bash
# Note: WebSocket endpoints can't be tested with curl
# Check if the domain resolves
nslookup rose.kaspa.green

# Check if port 443 is open (WebSocket over HTTPS)
telnet rose.kaspa.green 443
```

**Solution 3: Use Different Endpoint**
Try endpoints in this order:
1. `wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh` (current default)
2. `wss://vivi.kaspa.blue/kaspa/mainnet/wrpc/borsh`
3. `wss://luna.kaspa.blue/kaspa/mainnet/wrpc/borsh`
4. `wss://iris.kaspa.blue/kaspa/mainnet/wrpc/borsh`

### When Simply-Kaspa-Indexer Has Issues

**Rare Occurrence**: Simply-kaspa-indexer rarely has connectivity issues due to built-in fallback

**If It Happens**:
```bash
# Check logs for connection attempts
docker logs simply-kaspa-indexer | grep -E "Connected|kaspa"

# Should show multiple different endpoints being used
```

### When K-Indexer Has Issues

**Even Rarer**: K-indexer uses HTTP API which is very stable

**If It Happens**:
```bash
# Check if api.kaspa.org is reachable
curl -I https://api.kaspa.org

# Should return HTTP 200 or similar success code
```

## Recommendations

### For Production Use
1. **Prefer Simply-Kaspa-Indexer**: Most reliable due to built-in fallback
2. **Monitor Kasia-Indexer**: Set up alerts for connection failures
3. **Have Backup Endpoints Ready**: Keep list of working WebSocket endpoints
4. **Use K-Indexer as Baseline**: Most stable connectivity

### For Development/Testing
1. **Start with Default Configuration**: Usually works out of the box
2. **Know How to Switch Endpoints**: Be prepared to change kasia-indexer endpoint
3. **Monitor All Services**: Check logs during initial setup

### For Fresh Installations
1. **Updated Defaults**: New installations use working endpoints by default
2. **Fallback Documentation**: Instructions included in generated docker-compose.yml
3. **Troubleshooting Guide**: TESTING.md includes endpoint switching instructions

## Configuration Updates Made

### 1. Updated Default Endpoints
- **Before**: `wss://wrpc.kasia.fyi` (was returning HTTP 502)
- **After**: `wss://rose.kaspa.green/kaspa/mainnet/wrpc/borsh` (working)

### 2. Added Fallback Documentation
- Config generator includes comments with alternative endpoints
- TESTING.md includes troubleshooting steps
- Clear instructions for endpoint switching

### 3. Environment Variable Management
- `.env` file includes working endpoint
- Docker-compose.yml has working default
- Easy to override for different environments

## Future Improvements

### Potential Enhancements for Kasia-Indexer
1. **Multiple Endpoint Support**: Modify to accept comma-separated endpoints
2. **Automatic Failover**: Add retry logic with different endpoints
3. **Health Monitoring**: Better endpoint health detection
4. **Configuration UI**: Web interface for endpoint management

### Monitoring Recommendations
1. **Endpoint Health Checks**: Regular testing of WebSocket endpoints
2. **Automated Switching**: Scripts to switch endpoints when failures detected
3. **Alert System**: Notifications when indexers lose connectivity
4. **Dashboard Integration**: Visual status of all indexer connections

## Conclusion

- ✅ **Simply-Kaspa-Indexer**: Best choice for reliability (built-in fallback)
- ⚠️ **Kasia-Indexer**: Requires manual endpoint management but works well when configured
- ✅ **K-Indexer**: Most stable (HTTP-based)

All three indexers can work reliably with proper configuration and monitoring. The key is understanding their different connectivity patterns and having appropriate fallback strategies in place.

## Date
December 13, 2025