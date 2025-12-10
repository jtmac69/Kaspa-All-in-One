# Kasia App Public URL Configuration Fix

## Issue Summary

**Problem**: When users selected ONLY the "Kaspa User Applications" profile (without local indexer or node services), the Kasia app was trying to connect to incorrect public URLs that don't exist:
- ❌ `https://api.kasia.io/` (indexer)
- ❌ `wss://api.kasia.io/ws` (node WebSocket)

This caused WebSocket connection errors in the browser console:
```
WebSocket connection to 'wss://api.kasia.io/ws' failed
wRPC -> WebSocket -> Unable to connect to wss://api.kasia.io/ws
```

**Root Cause**: The Dockerfile and wizard configuration were using incorrect default URLs that don't match Kasia's official production endpoints.

## Solution

Updated all default URLs to match Kasia's official `.env.production` file from their repository:
- ✅ `https://indexer.kasia.fyi/` (indexer)
- ✅ `wss://wrpc.kasia.fyi` (node WebSocket)

## Files Modified

### 1. `docker-compose.yml` (CRITICAL - Static File)
**Changed**: Build args and runtime environment fallback URLs
```yaml
# OLD (incorrect)
VITE_INDEXER_MAINNET_URL: ${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}
VITE_DEFAULT_MAINNET_KASPA_NODE_URL: ${REMOTE_KASPA_NODE_WBORSH_URL:-wss://api.kasia.io/ws}

# NEW (correct)
VITE_INDEXER_MAINNET_URL: ${REMOTE_KASIA_INDEXER_URL:-https://indexer.kasia.fyi/}
VITE_DEFAULT_MAINNET_KASPA_NODE_URL: ${REMOTE_KASPA_NODE_WBORSH_URL:-wss://wrpc.kasia.fyi}
```

**Impact**: This is the MOST CRITICAL fix. The static docker-compose.yml file is used when building/running without the wizard, and its fallback values were incorrect. This affected both build-time args and runtime environment variables.

### 2. `services/kasia/Dockerfile`
**Changed**: Build argument defaults
```dockerfile
# OLD (incorrect)
ARG VITE_INDEXER_MAINNET_URL=https://api.kasia.io/
ARG VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://api.kasia.io/ws

# NEW (correct - matches Kasia official .env.production)
ARG VITE_INDEXER_MAINNET_URL=https://indexer.kasia.fyi/
ARG VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://wrpc.kasia.fyi
```

**Impact**: When the Docker image is built, it now bakes in the correct public URLs as defaults.

### 2. `services/wizard/backend/src/utils/config-generator.js`
**Changed**: Public indexer URLs in `.env` file generation (line ~240)
```javascript
// OLD (incorrect)
'REMOTE_KASIA_INDEXER_URL=https://api.kasia.io/',
'REMOTE_KASPA_NODE_WBORSH_URL=wss://api.kasia.io/ws'

// NEW (correct)
'REMOTE_KASIA_INDEXER_URL=https://indexer.kasia.fyi/',
'REMOTE_KASPA_NODE_WBORSH_URL=wss://wrpc.kasia.fyi'
```

**Impact**: When wizard generates `.env` file for kaspa-user-applications profile without local services, it uses correct public URLs.

**Changed**: Docker-compose fallback URL (line ~1100)
```javascript
// OLD (incorrect)
'- VITE_INDEXER_MAINNET_URL=${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}'

// NEW (correct)
'- VITE_INDEXER_MAINNET_URL=${REMOTE_KASIA_INDEXER_URL:-https://indexer.kasia.fyi/}'
```

**Impact**: Docker-compose file now has correct fallback if environment variable is not set.

### 3. `services/wizard/backend/src/config/configuration-fields.js`
**Changed**: Default values for kaspa-user-applications configuration fields
```javascript
// OLD (incorrect)
defaultValue: 'https://api.kasia.io/'
defaultValue: 'wss://api.kasia.io/ws'

// NEW (correct)
defaultValue: 'https://indexer.kasia.fyi/'
defaultValue: 'wss://wrpc.kasia.fyi'
```

**Impact**: Wizard configuration UI now shows correct default values that users can override.

### 4. `services/kasia/README.md`
**Changed**: Documentation to show both local and public URL examples
```markdown
# Service connections (when using local services)
VITE_INDEXER_MAINNET_URL=http://kasia-indexer:8080/
VITE_DEFAULT_MAINNET_KASPA_NODE_URL=ws://kaspa-node:17110

# Service connections (when using public services - Dockerfile defaults)
VITE_INDEXER_MAINNET_URL=https://indexer.kasia.fyi/
VITE_DEFAULT_MAINNET_KASPA_NODE_URL=wss://wrpc.kasia.fyi
```

**Impact**: Documentation now clearly shows both scenarios.

## How It Works

### Scenario 1: User Applications ONLY (No Local Services)
When user selects ONLY `kaspa-user-applications` profile:

1. **Wizard generates `.env`** with public URLs:
   ```bash
   REMOTE_KASIA_INDEXER_URL=https://indexer.kasia.fyi/
   REMOTE_KASPA_NODE_WBORSH_URL=wss://wrpc.kasia.fyi
   ```

2. **Docker image is built** with these URLs baked in as defaults

3. **Kasia app connects** to public Kasia infrastructure ✅

### Scenario 2: User Applications + Local Services
When user selects `kaspa-user-applications` + `indexer-services` + `core`:

1. **Wizard generates `.env`** with local URLs:
   ```bash
   REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/
   REMOTE_KASPA_NODE_WBORSH_URL=ws://kaspa-node:17110
   ```

2. **Docker-compose passes** these as environment variables to override defaults

3. **Kasia app connects** to local services ✅

### Scenario 3: User Customization
Users can now customize URLs in the wizard configuration page:

1. Navigate to "Configure" step in wizard
2. See "Indexer Endpoints" section with three fields:
   - Kasia Indexer URL (default: `https://indexer.kasia.fyi/`)
   - K-Social Indexer URL (default: `https://indexer.kaspatalk.net/`)
   - Kaspa Node WebSocket URL (default: `wss://wrpc.kasia.fyi`)
3. Override any URL as needed
4. Wizard saves custom values to `.env` file

## Testing

### Test 1: User Applications Only
```bash
# Select only kaspa-user-applications profile in wizard
# Complete installation
# Check generated .env file
grep REMOTE_KASIA_INDEXER_URL .env
# Should show: REMOTE_KASIA_INDEXER_URL=https://indexer.kasia.fyi/

# Start services
docker-compose up -d

# Access Kasia app at http://localhost:3001
# Should connect successfully to public Kasia services
```

### Test 2: User Applications + Local Services
```bash
# Select kaspa-user-applications + indexer-services + core profiles
# Complete installation
# Check generated .env file
grep REMOTE_KASIA_INDEXER_URL .env
# Should show: REMOTE_KASIA_INDEXER_URL=http://kasia-indexer:8080/

# Start services
docker-compose up -d

# Access Kasia app at http://localhost:3001
# Should connect to local indexer and node
```

### Test 3: Custom URLs
```bash
# In wizard configuration page, override URLs
# Set custom indexer URL: https://my-custom-indexer.example.com/
# Complete installation
# Check generated .env file
grep REMOTE_KASIA_INDEXER_URL .env
# Should show custom URL
```

## Reference

**Kasia Official URLs** (from `.env.production`):
- Repository: https://github.com/K-Kluster/Kasia
- File: https://github.com/K-Kluster/Kasia/blob/staging/.env.production
- Indexer: `https://indexer.kasia.fyi/`
- Testnet Indexer: `https://dev-indexer.kasia.fyi/`
- Node WebSocket: `wss://wrpc.kasia.fyi`

## Impact

✅ **Fixed**: Kasia app now works correctly when using public services  
✅ **Maintained**: Local service connections still work as before  
✅ **Enhanced**: Users can now customize URLs via wizard configuration  
✅ **Documented**: README updated with correct URL examples  

## Related Issues

This fix resolves the WebSocket connection error reported during test release verification for the kaspa-user-applications profile.

## Troubleshooting: Why the First Fix Didn't Work

### Issue
After updating the Dockerfile and wizard configuration, the Kasia app was still connecting to the old incorrect URLs.

### Root Cause
The **static `docker-compose.yml` file** had the old URLs as fallback values. This file is used when:
1. Building the Docker image (build args)
2. Running the container (runtime environment variables)
3. No `.env` file exists or environment variables aren't set

### The Problem Chain
1. User runs `docker-compose up --build`
2. Docker-compose reads `docker-compose.yml` 
3. Environment variables like `${REMOTE_KASIA_INDEXER_URL}` are not set
4. Docker-compose uses fallback values: `${REMOTE_KASIA_INDEXER_URL:-https://api.kasia.io/}`
5. **Old incorrect URL is used** despite Dockerfile having correct defaults

### The Fix
Updated **both** the Dockerfile defaults AND the docker-compose.yml fallback values to ensure consistency regardless of how the image is built or run.

### Lesson Learned
When fixing environment-dependent configuration:
1. ✅ Update Dockerfile defaults
2. ✅ Update wizard-generated configuration  
3. ✅ **Update static docker-compose.yml fallbacks** ← This was missing initially
4. ✅ Force rebuild with `--no-cache` to avoid Docker build cache

## Date
December 9, 2024
