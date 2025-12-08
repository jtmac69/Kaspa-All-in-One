# Dynamic Indexer Configuration

## Date: December 2, 2025

## Overview
The wizard now dynamically configures indexer URLs for user applications based on which profiles are selected during installation.

## Configuration Logic

### Profile Selection Scenarios

#### Scenario 1: Only `kaspa-user-applications` Profile Selected
**Behavior**: Use public indexers

**Environment Variables Set**:
```bash
REMOTE_KASIA_INDEXER_URL=https://api.kasia.io/
REMOTE_KSOCIAL_INDEXER_URL=https://indexer.kaspatalk.net/
```

**Rationale**: User wants to run applications without the overhead of local indexers. Applications connect to public indexer endpoints.

#### Scenario 2: Both `kaspa-user-applications` AND `indexer-services` Profiles Selected
**Behavior**: Use local indexers

**Environment Variables Set**:
```bash
REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/
REMOTE_KSOCIAL_INDEXER_URL=http://k-indexer:8080/
```

**Rationale**: User has local indexers running, so applications should use them for better performance and privacy.

#### Scenario 3: Only `indexer-services` Profile Selected
**Behavior**: Indexers run but no user applications

**Environment Variables**: Not set (no user applications to configure)

**Rationale**: User wants to run indexers only (perhaps for other services to use).

## Implementation

### 1. Config Generator (`services/wizard/backend/src/utils/config-generator.js`)

The `generateEnvFile()` method now includes logic to set indexer URLs:

```javascript
// Indexer URL configuration for user applications
if (profiles.includes('kaspa-user-applications')) {
  const useLocalIndexers = profiles.includes('indexer-services');
  
  if (useLocalIndexers) {
    // Use local indexers
    lines.push(
      'REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/',
      'REMOTE_KSOCIAL_INDEXER_URL=http://k-indexer:8080/',
      'REMOTE_KASPA_NODE_WBORSH_URL=ws://kaspa-node:17110'
    );
  } else {
    // Use public indexers
    lines.push(
      'REMOTE_KASIA_INDEXER_URL=https://api.kasia.io/',
      'REMOTE_KSOCIAL_INDEXER_URL=https://indexer.kaspatalk.net/',
      'REMOTE_KASPA_NODE_WBORSH_URL=wss://api.kasia.io/ws'
    );
  }
}
```

### 2. Docker Compose Configuration

User applications use these environment variables at **build time** and **runtime**:

**kasia-app**:
```yaml
build:
  args:
    # Build-time arguments for Vite build
    VITE_INDEXER_MAINNET_URL: ${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
    VITE_INDEXER_TESTNET_URL: ${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
    VITE_DEFAULT_MAINNET_KASPA_NODE_URL: ${REMOTE_KASPA_NODE_WBORSH_URL:-wss://api.kasia.io/ws}
environment:
  # Runtime environment variables for the startup script
  - VITE_INDEXER_MAINNET_URL=${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
  - VITE_DEFAULT_MAINNET_KASPA_NODE_URL=${REMOTE_KASPA_NODE_WBORSH_URL:-wss://api.kasia.io/ws}
```

**k-social**:
```yaml
environment:
  - KSOCIAL_INDEXER_URL=${REMOTE_KSOCIAL_INDEXER_URL:-https://indexer.kaspatalk.net/}
```

### 3. Kasia Build Process

The Kasia Dockerfile accepts build arguments that override the default `.env.production` values:

```dockerfile
ARG VITE_INDEXER_MAINNET_URL=https://api.kasia.io/
ARG VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://api.kasia.io/ws

# These are used during the Vite build process
ENV VITE_INDEXER_MAINNET_URL=${VITE_INDEXER_MAINNET_URL}
ENV VITE_DEFAULT_MAINNET_KASPA_NODE_URL=${VITE_DEFAULT_MAINNET_KASPA_NODE_URL}

RUN npm run build
```

This ensures the Kasia app is built with the correct indexer URLs baked into the production bundle.

## Public Indexer Endpoints

### Kasia Indexer
- **URL**: `https://api.kasia.io/`
- **Purpose**: Provides blockchain data for Kasia messaging app
- **Provider**: Kasia team

### K-Social Indexer
- **URL**: `https://indexer.kaspatalk.net/`
- **Purpose**: Provides blockchain data for K-Social platform
- **Provider**: Kaspa Talk community

## Benefits

1. **Flexibility**: Users can choose to run applications without local indexers
2. **Resource Efficiency**: Running indexers requires significant resources (8GB+ RAM, 500GB+ disk)
3. **Simplicity**: Users who just want to try applications can use public endpoints
4. **Privacy**: Users who want full control can run local indexers
5. **Automatic Configuration**: Wizard handles the complexity of configuration

## Testing

### Test Case 1: Apps Only
```bash
# Select only kaspa-user-applications profile
# Expected: Apps use public indexers
# Verify: Check .env file for public URLs
```

### Test Case 2: Apps + Indexers
```bash
# Select both kaspa-user-applications and indexer-services profiles
# Expected: Apps use local indexers
# Verify: Check .env file for local URLs (http://kasia-indexer:8080/, etc.)
```

### Test Case 3: Indexers Only
```bash
# Select only indexer-services profile
# Expected: Indexers run, no app configuration
# Verify: .env file has no REMOTE_*_INDEXER_URL variables
```

## Future Enhancements

1. **Health Check Fallback**: If local indexer is unhealthy, automatically fall back to public endpoint
2. **Indexer Selection UI**: Allow users to manually choose indexer endpoints in wizard
3. **Custom Indexer URLs**: Support for third-party or self-hosted indexer endpoints
4. **Indexer Status Dashboard**: Show indexer sync status and health in management dashboard
