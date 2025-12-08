# Fallback Strategy Implementation Summary

## Overview

Implemented comprehensive fallback strategies for handling service failures during wizard installation. The system provides automatic detection, user choice dialogs, and configuration of fallback options when local services fail.

## Implementation Date

January 15, 2025

## Task Reference

**Task 6.6.4**: Implement fallback strategies
- Create fallback-manager.js utility
- Implement node failure detection
- Create user choice dialogs
- Configure automatic fallback to public Kaspa network
- Implement indexer fallback to public endpoints
- Generate fallback configuration for docker-compose

## Files Created

### Core Implementation

1. **services/wizard/backend/src/utils/fallback-manager.js** (700+ lines)
   - FallbackManager class with comprehensive fallback logic
   - Node failure detection with health checks
   - User choice dialog generation
   - Public network fallback configuration
   - Indexer fallback configuration
   - Docker compose override generation
   - Troubleshooting information system
   - Health check retry with exponential backoff
   - Configuration save/load functionality

2. **services/wizard/backend/src/api/fallback.js** (400+ lines)
   - POST /api/config/configure-fallback - Configure fallback strategies
   - POST /api/config/detect-failures - Detect service failures
   - POST /api/config/retry-health-check - Retry health checks
   - GET /api/config/troubleshooting/:service - Get troubleshooting info
   - GET /api/config/fallback-status - Get current fallback status
   - GET /api/config/public-endpoints - Get available public endpoints

### Testing

3. **services/wizard/backend/test-fallback.js** (500+ lines)
   - 10 comprehensive unit tests
   - Tests all fallback manager functionality
   - 100% test pass rate

4. **services/wizard/backend/test-fallback-api.js** (400+ lines)
   - 10 API endpoint tests
   - Tests all fallback API routes
   - Error handling validation

### Documentation

5. **docs/quick-references/FALLBACK_STRATEGY_QUICK_REFERENCE.md**
   - Complete API reference
   - Usage examples
   - Configuration guide
   - Troubleshooting steps

6. **docs/implementation-summaries/wizard/FALLBACK_STRATEGY_IMPLEMENTATION.md** (this file)
   - Implementation summary
   - Technical details
   - Integration points

## Files Modified

1. **services/wizard/backend/src/server.js**
   - Added fallback router import
   - Registered fallback API routes

## Key Features

### 1. Node Failure Detection

Comprehensive health checks for Kaspa nodes:
- Container existence check
- Container running status
- RPC endpoint validation
- P2P connectivity check
- Blockchain sync status

### 2. User Choice Dialogs

When failures occur, users are presented with clear options:

**Node Failure Options:**
- Continue with Public Network (recommended)
- Troubleshoot Local Node
- Retry Health Check
- Skip Node Installation

**Indexer Failure Options:**
- Use Public Endpoints
- Troubleshoot Indexer
- Retry Health Check

### 3. Public Network Fallback

Automatic configuration for public Kaspa network:
- Updates environment variables
- Configures dependent services
- Generates docker-compose override
- Saves fallback configuration

**Public Endpoints:**
- Kaspa Node RPC: `https://api.kaspa.org`
- Kaspa Node gRPC: `grpc://api.kaspa.org:16110`

### 4. Indexer Fallback

Switches applications to public indexer endpoints:
- Kasia Indexer: `https://api.kasia.io`
- K-Social Indexer: `https://api.k-social.io`
- Simply Kaspa Indexer: `https://api.simplykaspa.io`

### 5. Docker Compose Override

Generates docker-compose.override.yml:
- Disables failed local services
- Configures public endpoints for dependent services
- Maintains service dependencies

### 6. Troubleshooting System

Provides detailed diagnostic information:
- Service logs
- System diagnostics
- Step-by-step troubleshooting guides
- Specific remediation steps based on failure type

### 7. Health Check Retry

Automatic retry with exponential backoff:
- Max 3 retry attempts
- 5 second initial delay
- Exponential backoff (5s, 10s, 20s)
- 30 second timeout per check

## Technical Architecture

### FallbackManager Class

```javascript
class FallbackManager {
  constructor(dockerManager, profileManager)
  
  // Failure Detection
  async detectNodeFailure(nodeService, dependentServices)
  async performNodeHealthCheck(nodeService)
  async checkNodeRPC(nodeService)
  async checkNodeP2P(nodeService)
  async checkNodeSync(nodeService)
  
  // Dialog Generation
  generateNodeFailureDialog(nodeService, failureInfo)
  
  // Fallback Configuration
  async configurePublicNetworkFallback(dependentServices, currentConfig)
  async configureIndexerFallback(indexers, currentConfig)
  async generateFallbackDockerCompose(fallbackConfig, profiles)
  
  // Troubleshooting
  async getTroubleshootingInfo(service, failureInfo)
  async getSystemDiagnostics()
  
  // Health Check Retry
  async retryHealthCheck(service, maxRetries)
  
  // Dependency Management
  getDependentServices(profiles, targetService)
  
  // Configuration Persistence
  async saveFallbackConfiguration(fallbackConfig, outputPath)
  async loadFallbackConfiguration(inputPath)
}
```

### API Routes

All routes under `/api/config`:

1. **POST /configure-fallback**
   - Configures fallback based on strategy
   - Handles: continue-public, troubleshoot, retry, skip-node
   - Returns: fallback config, docker-compose override

2. **POST /detect-failures**
   - Detects failures for multiple services
   - Returns: failure list, user choice dialogs

3. **POST /retry-health-check**
   - Retries health check with backoff
   - Returns: success status, health check results

4. **GET /troubleshooting/:service**
   - Gets troubleshooting information
   - Returns: steps, logs, diagnostics

5. **GET /fallback-status**
   - Gets current fallback configuration
   - Returns: fallback status, public endpoints

6. **GET /public-endpoints**
   - Lists available public endpoints
   - Returns: Kaspa node and indexer endpoints

## Integration Points

### 1. Docker Manager Integration

Uses DockerManager for:
- Service status checks
- Container logs retrieval
- Running services list

### 2. Profile Manager Integration

Uses ProfileManager for:
- Profile definitions
- Service dependencies
- Resource requirements

### 3. Installation Flow Integration

Integrates with wizard installation flow:
1. Services start
2. Health checks run
3. Failures detected
4. User presented with options
5. Fallback configured if chosen
6. Installation continues

### 4. Configuration System Integration

Works with existing configuration:
- Reads current .env configuration
- Generates fallback configuration
- Saves to .kaspa-aio/fallback-config.json
- Updates docker-compose.override.yml

## Configuration Files

### Fallback Configuration

Location: `.kaspa-aio/fallback-config.json`

```json
{
  "USE_PUBLIC_KASPA_NODE": "true",
  "KASPA_NODE_RPC_URL": "https://api.kaspa.org",
  "KASPA_NODE_GRPC_URL": "grpc://api.kaspa.org:16110",
  "LOCAL_NODE_ENABLED": "false",
  "_fallback": {
    "enabled": true,
    "reason": "local_node_failure",
    "timestamp": "2025-01-15T10:30:00Z",
    "affectedServices": ["kasia-indexer", "k-indexer"],
    "publicEndpoint": "https://api.kaspa.org"
  }
}
```

### Docker Compose Override

Location: `docker-compose.override.yml`

```yaml
version: '3.8'
services:
  kaspa-node:
    profiles:
      - disabled
  
  kasia-indexer:
    environment:
      KASPA_NODE_RPC_URL: https://api.kaspa.org
      KASPA_NODE_GRPC_URL: grpc://api.kaspa.org:16110
  
  k-indexer:
    environment:
      KASPA_NODE_RPC_URL: https://api.kaspa.org
      KASPA_NODE_GRPC_URL: grpc://api.kaspa.org:16110
```

## Testing Results

### Unit Tests (test-fallback.js)

All 10 tests passed:
- ✓ Node failure detection
- ✓ Generate node failure dialog
- ✓ Configure public network fallback
- ✓ Configure indexer fallback
- ✓ Generate fallback docker compose
- ✓ Get dependent services
- ✓ Get troubleshooting info
- ✓ Public endpoints configuration
- ✓ Save and load fallback configuration
- ✓ Health check configuration

**Success Rate**: 100%

### API Tests (test-fallback-api.js)

Requires running wizard server. Tests:
- GET /api/config/public-endpoints
- POST /api/config/detect-failures
- POST /api/config/configure-fallback (all strategies)
- GET /api/config/fallback-status
- GET /api/config/troubleshooting/:service
- Error handling validation

## Requirements Satisfied

### Requirement 2: Profile Selection Interface
- ✓ Handles profile dependencies with fallback
- ✓ Detects when prerequisites fail
- ✓ Provides fallback options

### Requirement 6: Post-Installation Validation
- ✓ Validates service health
- ✓ Detects failures
- ✓ Offers fallback strategies
- ✓ Continues installation with fallback

### Requirement 8: Guided Troubleshooting
- ✓ Provides error messages
- ✓ Offers troubleshooting steps
- ✓ Links to documentation
- ✓ Automatic retry options
- ✓ Diagnostic export

### Requirement 14: Service Startup Order and Dependencies
- ✓ Handles dependency failures
- ✓ Configures fallback for dependent services
- ✓ Maintains startup order with fallback

## Usage Example

```javascript
// 1. Detect failures during installation
const failures = await fetch('/api/config/detect-failures', {
  method: 'POST',
  body: JSON.stringify({
    services: ['kaspa-node', 'kasia-indexer'],
    profiles: ['core', 'indexer-services']
  })
});

// 2. If failures detected, show user dialog
if (failures.failedServices > 0) {
  const dialog = failures.dialogs[0];
  const userChoice = await showUserDialog(dialog);
  
  // 3. Configure fallback based on user choice
  const fallback = await fetch('/api/config/configure-fallback', {
    method: 'POST',
    body: JSON.stringify({
      failedService: 'kaspa-node',
      strategy: userChoice,
      dependentServices: ['kasia-indexer', 'k-indexer'],
      currentConfig: config,
      profiles: ['core', 'indexer-services']
    })
  });
  
  // 4. Apply fallback configuration
  if (fallback.success) {
    await applyFallbackConfig(fallback.fallbackConfig);
    await applyDockerComposeOverride(fallback.dockerComposeOverride);
  }
}
```

## Future Enhancements

1. **Automatic Fallback Detection**
   - Monitor services continuously
   - Auto-switch to fallback on failure
   - Notify user of automatic fallback

2. **Fallback Performance Monitoring**
   - Track public endpoint performance
   - Compare local vs public performance
   - Suggest switching back when local node recovers

3. **Custom Public Endpoints**
   - Allow users to configure custom public endpoints
   - Validate custom endpoints
   - Save preferred endpoints

4. **Fallback History**
   - Track fallback events
   - Analyze failure patterns
   - Provide insights for improvement

## Related Features

- **Dependency Validator**: Validates profile dependencies
- **Profile Manager**: Manages profile definitions
- **Docker Manager**: Manages Docker containers
- **Error Remediation**: Auto-fixes common errors
- **Safety System**: Validates configuration safety

## Conclusion

The fallback strategy implementation provides a robust safety net for the wizard installation process. When services fail, users are presented with clear options and the system can automatically configure fallback to public endpoints, ensuring installation can continue successfully even when local services encounter issues.

This implementation significantly improves the wizard's reliability and user experience, particularly for non-technical users who may encounter issues with local service configuration.
