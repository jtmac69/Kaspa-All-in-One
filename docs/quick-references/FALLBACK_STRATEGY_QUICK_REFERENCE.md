# Fallback Strategy Quick Reference

## Overview

The Fallback Manager handles service failures gracefully by providing automatic fallback strategies when local services fail. This ensures the wizard can continue installation even when some services encounter issues.

## Key Features

- **Node Failure Detection**: Automatically detects when Kaspa nodes fail health checks
- **User Choice Dialogs**: Presents clear options when failures occur
- **Public Network Fallback**: Configures services to use public Kaspa network
- **Indexer Fallback**: Switches to public indexer endpoints
- **Troubleshooting**: Provides detailed diagnostic information
- **Health Check Retry**: Automatically retries failed health checks

## Fallback Strategies

### Node Failure Strategies

When a local Kaspa node fails, users are presented with these options:

1. **Continue with Public Network** (Recommended)
   - Services use public Kaspa nodes instead
   - Installation continues without local node
   - Dependent services automatically configured

2. **Troubleshoot Local Node**
   - View logs and diagnostic information
   - Get step-by-step troubleshooting guide
   - Identify and fix the issue

3. **Retry Health Check**
   - Wait for node to initialize
   - Automatically retry with exponential backoff
   - Up to 3 retry attempts

4. **Skip Node Installation**
   - Continue without any local node
   - All services use public network
   - Simplest fallback option

### Indexer Failure Strategies

When local indexers fail:

1. **Use Public Endpoints**
   - Applications use public indexer APIs
   - No local indexer required
   - Reduced resource requirements

2. **Troubleshoot Indexer**
   - Check database connectivity
   - Review indexer logs
   - Verify configuration

3. **Retry Health Check**
   - Wait for indexer to sync
   - Retry connection attempts

## API Endpoints

### Configure Fallback

```bash
POST /api/config/configure-fallback
```

**Request:**
```json
{
  "failedService": "kaspa-node",
  "strategy": "continue-public",
  "dependentServices": ["kasia-indexer", "k-indexer"],
  "currentConfig": {
    "KASPA_NODE_P2P_PORT": "16110"
  },
  "profiles": ["core", "indexer-services"]
}
```

**Response:**
```json
{
  "success": true,
  "strategy": "continue-public",
  "fallbackConfig": {
    "KASPA_NODE_RPC_URL": "https://api.kaspa.org",
    "USE_PUBLIC_KASPA_NODE": "true",
    "_fallback": {
      "enabled": true,
      "reason": "local_node_failure",
      "affectedServices": ["kasia-indexer", "k-indexer"]
    }
  },
  "dockerComposeOverride": { ... },
  "saved": true
}
```

### Detect Failures

```bash
POST /api/config/detect-failures
```

**Request:**
```json
{
  "services": ["kaspa-node", "kasia-indexer"],
  "profiles": ["core", "indexer-services"]
}
```

**Response:**
```json
{
  "success": true,
  "totalServices": 2,
  "failedServices": 1,
  "failures": [
    {
      "service": "kaspa-node",
      "failed": true,
      "reason": "health_check_failed",
      "message": "Kaspa node failed health checks",
      "severity": "high"
    }
  ],
  "dialogs": [
    {
      "title": "Kaspa Node Health Check Failed",
      "options": [ ... ]
    }
  ]
}
```

### Retry Health Check

```bash
POST /api/config/retry-health-check
```

**Request:**
```json
{
  "service": "kaspa-node",
  "maxRetries": 3
}
```

**Response:**
```json
{
  "success": true,
  "service": "kaspa-node",
  "attempts": 2,
  "healthCheck": {
    "healthy": true,
    "checks": {
      "rpc": true,
      "p2p": true,
      "sync": false
    }
  }
}
```

### Get Troubleshooting Info

```bash
GET /api/config/troubleshooting/:service?profiles=core
```

**Response:**
```json
{
  "success": true,
  "service": "kaspa-node",
  "troubleshooting": {
    "steps": [
      {
        "step": 1,
        "title": "Check Container Logs",
        "description": "Review logs for error messages",
        "action": "view_logs"
      }
    ],
    "logs": "...",
    "diagnostics": { ... }
  }
}
```

### Get Fallback Status

```bash
GET /api/config/fallback-status
```

**Response:**
```json
{
  "success": true,
  "fallbackEnabled": true,
  "nodeFallback": {
    "enabled": true,
    "reason": "local_node_failure",
    "affectedServices": ["kasia-indexer"]
  },
  "publicEndpoints": {
    "kaspaNode": "https://api.kaspa.org",
    "indexers": {
      "kasia": "https://api.kasia.io"
    }
  }
}
```

### Get Public Endpoints

```bash
GET /api/config/public-endpoints
```

**Response:**
```json
{
  "success": true,
  "endpoints": {
    "kaspaNode": {
      "rpc": "https://api.kaspa.org",
      "grpc": "grpc://api.kaspa.org:16110",
      "description": "Public Kaspa mainnet node"
    },
    "indexers": {
      "kasia": "https://api.kasia.io",
      "kSocial": "https://api.k-social.io",
      "simplyKaspa": "https://api.simplykaspa.io"
    }
  }
}
```

## Public Endpoints

### Kaspa Node
- **RPC**: `https://api.kaspa.org`
- **gRPC**: `grpc://api.kaspa.org:16110`

### Indexers
- **Kasia**: `https://api.kasia.io`
- **K-Social**: `https://api.k-social.io`
- **Simply Kaspa**: `https://api.simplykaspa.io`

## Health Checks

### Node Health Checks

1. **RPC Check**: Verify RPC endpoint responds
2. **P2P Check**: Verify P2P port is listening
3. **Sync Check**: Check blockchain sync status

### Health Check Configuration

- **Max Retries**: 3 attempts
- **Retry Delay**: 5 seconds (exponential backoff)
- **Timeout**: 30 seconds per check

## Docker Compose Override

When fallback is configured, a docker-compose override is generated:

```yaml
version: '3.8'
services:
  kaspa-node:
    profiles:
      - disabled  # Disable local node
  
  kasia-indexer:
    environment:
      KASPA_NODE_RPC_URL: https://api.kaspa.org
      KASPA_NODE_GRPC_URL: grpc://api.kaspa.org:16110
  
  kasia-app:
    environment:
      KASIA_INDEXER_URL: https://api.kasia.io
```

## Usage Examples

### Example 1: Handle Node Failure

```javascript
// Detect node failure
const detection = await fetch('/api/config/detect-failures', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    services: ['kaspa-node'],
    profiles: ['core', 'indexer-services']
  })
});

const result = await detection.json();

if (result.failedServices > 0) {
  // Show user dialog
  const dialog = result.dialogs[0];
  const userChoice = await showDialog(dialog);
  
  // Configure fallback based on user choice
  const fallback = await fetch('/api/config/configure-fallback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      failedService: 'kaspa-node',
      strategy: userChoice, // 'continue-public', 'troubleshoot', 'retry', 'skip-node'
      dependentServices: ['kasia-indexer', 'k-indexer'],
      currentConfig: config,
      profiles: ['core', 'indexer-services']
    })
  });
}
```

### Example 2: Retry Health Check

```javascript
// Retry health check with exponential backoff
const retry = await fetch('/api/config/retry-health-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service: 'kaspa-node',
    maxRetries: 3
  })
});

const result = await retry.json();

if (result.success) {
  console.log('Node is now healthy!');
} else {
  console.log('Node still unhealthy, suggesting fallback...');
}
```

### Example 3: Get Troubleshooting Info

```javascript
// Get troubleshooting information
const troubleshooting = await fetch(
  '/api/config/troubleshooting/kaspa-node?profiles=core'
);

const info = await troubleshooting.json();

// Display troubleshooting steps
info.troubleshooting.steps.forEach(step => {
  console.log(`${step.step}. ${step.title}`);
  console.log(`   ${step.description}`);
  if (step.command) {
    console.log(`   Command: ${step.command}`);
  }
});

// Show logs
console.log('Recent logs:', info.troubleshooting.logs);
```

## Troubleshooting Steps

### Container Not Found

1. Verify Docker Compose configuration
2. Check profile selection
3. Rebuild service from scratch

### Container Not Running

1. Check container logs
2. Check resource availability
3. Restart service

### Health Check Failed

1. Review specific health check failures
2. Check network connectivity
3. Wait for service initialization

## Configuration Files

### Fallback Configuration

Saved to: `.kaspa-aio/fallback-config.json`

```json
{
  "USE_PUBLIC_KASPA_NODE": "true",
  "KASPA_NODE_RPC_URL": "https://api.kaspa.org",
  "KASPA_NODE_GRPC_URL": "grpc://api.kaspa.org:16110",
  "_fallback": {
    "enabled": true,
    "reason": "local_node_failure",
    "timestamp": "2025-01-15T10:30:00Z",
    "affectedServices": ["kasia-indexer", "k-indexer"]
  }
}
```

## Testing

### Run Unit Tests

```bash
node services/wizard/backend/test-fallback.js
```

### Run API Tests

```bash
# Start wizard server first
node services/wizard/backend/src/server.js

# In another terminal
node services/wizard/backend/test-fallback-api.js
```

## Requirements Validation

This implementation satisfies:

- **Requirement 2**: Profile selection with fallback options
- **Requirement 6**: Post-installation validation with fallback
- **Requirement 8**: Guided troubleshooting for failures
- **Requirement 14**: Service startup order and dependency handling

## Related Documentation

- [Dependency Validator Quick Reference](./DEPENDENCY_VALIDATOR_QUICK_REFERENCE.md)
- [Profile Architecture Quick Reference](./PROFILE_ARCHITECTURE_QUICK_REFERENCE.md)
- [Error Remediation Quick Reference](./ERROR_REMEDIATION_QUICK_REFERENCE.md)
- [Safety System Quick Reference](./SAFETY_SYSTEM_QUICK_REFERENCE.md)
