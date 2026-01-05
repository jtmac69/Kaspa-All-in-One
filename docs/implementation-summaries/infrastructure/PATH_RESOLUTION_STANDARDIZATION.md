# Path Resolution Standardization

## Overview

This document summarizes the implementation of centralized path resolution across the Kaspa All-in-One project to ensure consistent path handling when the project is packaged for release and installed to `/opt/kaspa-aio`.

## Problem Statement

The codebase had inconsistent fallback paths across different services:
- **Dashboard files**: Used `/app` as fallback (Docker container assumption)
- **Wizard files**: Used `/workspace` as fallback (arbitrary default)
- **Various utilities**: Used `__dirname` based resolution with varying levels

This inconsistency would cause issues when the project is installed to the production directory `/opt/kaspa-aio`.

## Solution

Created a centralized path resolution module at `services/shared/lib/path-resolver.js` that:

1. **Priority-based resolution**:
   - First checks `PROJECT_ROOT` environment variable (set by `scripts/wizard.sh` and systemd)
   - Falls back to `__dirname` based resolution for development
   - Uses `/opt/kaspa-aio` as the default installation directory

2. **Provides common paths**:
   - `root` - Project root directory
   - `env` - `.env` file path
   - `dockerCompose` - `docker-compose.yml` path
   - `kaspaAioDir` - `.kaspa-aio` directory
   - `installationState` - Installation state JSON file
   - `wizardState` - Wizard state JSON file
   - `backupDir` - Backup directory
   - And more...

## Files Updated

### Shared Module (New)
- `services/shared/lib/path-resolver.js` - Centralized path resolution

### Dashboard Files
- `services/dashboard/lib/ConfigurationSynchronizer.js`
- `services/dashboard/lib/WizardIntegration.js`

### Wizard Backend Files
- `services/wizard/backend/src/server.js`
- `services/wizard/backend/src/api/reconfiguration-api-simple.js`
- `services/wizard/backend/src/api/rollback.js`
- `services/wizard/backend/src/api/dashboard-integration.js`
- `services/wizard/backend/src/api/reconfigure.js`
- `services/wizard/backend/src/middleware/security.js`

### Wizard Utility Files
- `services/wizard/backend/src/utils/state-manager.js`
- `services/wizard/backend/src/utils/docker-manager.js`
- `services/wizard/backend/src/utils/rollback-manager.js`
- `services/wizard/backend/src/utils/backup-manager.js`

## Files Remaining (Lower Priority)

The following files still use the old pattern but are less critical:
- `services/wizard/backend/src/api/config-modification.js` (6 occurrences)
- `services/wizard/backend/src/api/reconfiguration-api.js` (6 occurrences)

These can be updated in a follow-up task.

## Usage

### In a module file:
```javascript
const { createResolver } = require('../../../../shared/lib/path-resolver');

// Create resolver bound to this module's location
const resolver = createResolver(__dirname);

// Get project root
const projectRoot = resolver.getProjectRoot();

// Get all common paths
const paths = resolver.getPaths();
console.log(paths.env);              // /opt/kaspa-aio/.env
console.log(paths.installationState); // /opt/kaspa-aio/.kaspa-aio/installation-state.json
```

### Direct usage:
```javascript
const { getProjectRoot, getPaths } = require('../../../../shared/lib/path-resolver');

const projectRoot = getProjectRoot(__dirname);
const paths = getPaths(__dirname);
```

## How It Works

The resolver uses multiple strategies to find the project root:

1. **Environment Variable**: If `PROJECT_ROOT` is set, use it directly
2. **Path Pattern Matching**: Recognizes common file locations and calculates relative paths
3. **Marker File Detection**: Looks for `docker-compose.yml`, `install.sh`, or `.kaspa-aio` directory
4. **Default Fallback**: Uses `/opt/kaspa-aio` as the production installation directory

## Testing

All updated files pass diagnostics with no errors. The path resolver correctly handles:
- Development environment (workspace directory)
- Production environment (`/opt/kaspa-aio`)
- Systemd service execution (with `PROJECT_ROOT` env var)

## Related Files

- `install.sh` - Sets `INSTALL_DIR="/opt/kaspa-aio"`
- `scripts/wizard.sh` - Exports `PROJECT_ROOT` when starting services
