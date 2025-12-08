# Task 6.2: Critical Docker-Compose Generation Fix

## Issue
Installation wizard failed to build kaspa-explorer service with error:
```
no such service: kaspa-explorer
```

Despite kaspa-explorer being defined in config-generator.js, it wasn't in the docker-compose.yml file during installation.

## Root Cause Analysis

The installation WebSocket handler (`install:start` in `services/wizard/backend/src/server.js`) was:
1. ✅ Saving `.env` file
2. ❌ **NOT generating docker-compose.yml** ← Critical bug!
3. ✅ Pulling Docker images
4. ✅ Building services (but using OLD docker-compose.yml without kaspa-explorer)

The wizard was using whatever docker-compose.yml already existed in the project directory, which was outdated and missing kaspa-explorer.

## Solution Implemented

Added docker-compose.yml generation step to the `install:start` WebSocket handler in `services/wizard/backend/src/server.js`:

```javascript
// Generate and save docker-compose.yml
const composeContent = await configGenerator.generateDockerCompose(configValidation.config, profiles);
const composePath = path.resolve(__dirname, '../../../../docker-compose.yml');
const composeResult = await configGenerator.saveDockerCompose(composeContent, composePath);

if (!composeResult.success) {
  socket.emit('install:error', {
    stage: 'config',
    message: 'Failed to save docker-compose.yml',
    error: composeResult.error
  });
  return;
}
```

This is inserted right after saving the `.env` file and before pulling images.

## Installation Flow - Fixed

Now the installation process correctly:
1. ✅ Validates configuration
2. ✅ Saves `.env` file
3. ✅ **Generates and saves docker-compose.yml** ← Fixed!
4. ✅ Pulls Docker images
5. ✅ Builds services (using fresh docker-compose.yml with all services)
6. ✅ Starts services

## Additional Fixes in This Session

### 1. Kaspa Explorer Service Created
- Created `services/kaspa-explorer/` directory
- Dockerfile that builds from https://github.com/lAmeR1/kaspa-explorer
- nginx.conf for SPA routing
- README.md documentation
- build.sh script

### 2. Kaspa Node Profile Restriction
- Modified config-generator to only add kaspa-node service when needed
- Profiles needing kaspa-node: core, archive-node, mining, indexer-services
- kaspa-user-applications does NOT need kaspa-node (uses remote endpoints)

### 3. Removed nginx from kaspa-user-applications
- nginx service removed from kaspa-user-applications profile
- Apps are directly accessible on their own ports
- Updated docker-manager service maps

### 4. Port Mapping Fix
- Fixed kaspa-explorer port mapping from `3004:3000` to `3004:80`
- Matches the nginx container's exposed port

## Kaspa User Applications Profile - Complete

The profile now includes THREE web applications:

1. **Kasia** (port 3001) - Messaging app
   - GitHub: https://github.com/kaspagang/kasia
   
2. **K-Social** (port 3003) - Social media app
   - GitHub: https://github.com/thesheepcat/K/releases/tag/v0.0.14
   
3. **Kaspa Explorer** (port 3004) - Block explorer
   - GitHub: https://github.com/lAmeR1/kaspa-explorer

All three apps connect to remote indexer endpoints (no local node required).

## Files Modified

### Critical Fix
- `services/wizard/backend/src/server.js` - Added docker-compose.yml generation to install:start handler

### Supporting Fixes
- `services/wizard/backend/src/utils/config-generator.js` - Made kaspa-node conditional, fixed port mapping
- `services/wizard/backend/src/utils/docker-manager.js` - Updated service maps

### New Files
- `services/kaspa-explorer/Dockerfile`
- `services/kaspa-explorer/nginx.conf`
- `services/kaspa-explorer/README.md`
- `services/kaspa-explorer/build.sh`

## Test Release

**Package**: `kaspa-aio-v0.9.0-test.tar.gz` (3.8M)  
**Checksum**: `29d922217b1c2f97493ee862fdd90d97e20d3a9ce8bdd055526a4811a0488edd`

## Expected Behavior After Fix

When kaspa-user-applications profile is selected:
```
✅ Fresh docker-compose.yml generated with all services
✅ kasia-app builds and starts (port 3001)
✅ k-social builds and starts (port 3003)
✅ kaspa-explorer builds and starts (port 3004)
❌ kaspa-node does NOT start (not needed)
❌ nginx does NOT start (not needed)
```

## Testing Instructions

1. Extract new test release package
2. Run `./start-test.sh`
3. Select kaspa-user-applications profile
4. Configure indexer endpoints
5. Complete installation
6. Verify all 3 containers start:
   ```bash
   docker ps
   ```
   Should show: kasia-app, k-social, kaspa-explorer

7. Access applications:
   - Kasia: http://localhost:3001
   - K-Social: http://localhost:3003
   - Kaspa Explorer: http://localhost:3004

## Impact

This was a **critical bug** that prevented the wizard from working correctly. The wizard would always use whatever docker-compose.yml existed in the project, rather than generating a fresh one based on the user's profile selection. This meant:
- New services wouldn't be included
- Profile-specific configurations wouldn't be applied
- Users couldn't successfully install with updated configurations

The fix ensures every installation generates a fresh, correct docker-compose.yml based on the selected profiles and configuration.

## Date
December 8, 2025
