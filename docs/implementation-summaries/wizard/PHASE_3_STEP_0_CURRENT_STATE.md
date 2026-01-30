# Phase 3 Step 0: Current State Documentation

**Date:** 2026-01-29  
**File:** `services/wizard/backend/src/utils/config-generator.js`  
**Backup:** `services/wizard/backend/src/utils/config-generator.js.backup`

## Overview

This document captures the current state of the config-generator.js file before implementing Phase 3 changes for the Kaspa profile redesign.

## Current Profile Structure

### Profile IDs Currently in Use

The system currently uses the following profile identifiers:

1. **core** - Core Kaspa node infrastructure
2. **archive-node** - Extended data retention with archive database
3. **indexer-services** - Local indexing and data services
4. **kaspa-user-applications** - User-facing applications
5. **mining** - Mining stratum server
6. **wizard** - Installation wizard (deprecated, runs on host)

## Profile-to-Service Mappings

### Core Profile (`core`)
**Services:**
- `kaspa-node` - Official Kaspa node (kaspanet/rusty-kaspad:latest)

**Ports:**
- P2P: `${KASPA_NODE_P2P_PORT:-16111}` (default: 16111)
- RPC: `${KASPA_NODE_RPC_PORT:-16110}` (default: 16110)

**Volumes:**
- `kaspa-data:/data/kaspa`
- `./logs/kaspa-node:/app/logs`

**Environment Variables:**
- `PUBLIC_NODE`
- `LOG_LEVEL`
- `KASPAD_UTXOINDEX`
- `KASPAD_RPCBIND`
- `KASPAD_RPCLISTEN_BORSH`
- `KASPAD_RPCLISTEN_JSON`

### Archive Node Profile (`archive-node`)
**Services:**
- `kaspa-node` - Shared with core profile
- `archive-db` - TimescaleDB for archive data

**Ports:**
- Archive DB: `${ARCHIVE_POSTGRES_PORT:-5433}:5432`

**Volumes:**
- `archive-db-data:/data/kaspa-archive`
- `./config/postgres/archive-init:/docker-entrypoint-initdb.d`

**Environment Variables:**
- `ARCHIVE_POSTGRES_DB`
- `ARCHIVE_POSTGRES_USER`
- `ARCHIVE_POSTGRES_PASSWORD`
- `ARCHIVE_POSTGRES_PORT`

### Indexer Services Profile (`indexer-services`)
**Services:**
- `k-social-db` - TimescaleDB for K-Social indexer
- `simply-kaspa-db` - TimescaleDB for Simply Kaspa indexer
- `kasia-indexer` - Kasia messaging indexer
- `k-indexer` - K-Social indexer
- `simply-kaspa-indexer` - Simply Kaspa indexer

**Ports:**
- K-Social DB: `${K_SOCIAL_DB_PORT:-5433}:5432`
- Simply Kaspa DB: `${SIMPLY_KASPA_DB_PORT:-5434}:5432`
- Kasia Indexer: `${KASIA_INDEXER_PORT:-3002}:8080`
- K-Indexer: `${K_INDEXER_PORT:-3006}:8080`
- Simply Indexer: `${SIMPLY_INDEXER_PORT:-3005}:3000`

**Volumes:**
- `k-social-db-data:/var/lib/postgresql/data`
- `simply-kaspa-db-data:/var/lib/postgresql/data`
- `kasia-indexer-data:/app/data`
- `k-indexer-data:/app/data`

**Dependencies:**
- k-indexer depends on k-social-db (healthy)
- simply-kaspa-indexer depends on simply-kaspa-db (healthy)

### Kaspa User Applications Profile (`kaspa-user-applications`)
**Services:**
- `kasia-app` - Kasia messaging application
- `k-social` - K-Social application
- `kaspa-explorer` - Kaspa blockchain explorer

**Ports:**
- Kasia App: `${KASIA_APP_PORT:-3001}:3000`
- K-Social: `${KSOCIAL_APP_PORT:-3003}:3000`
- Kaspa Explorer: `${KASPA_EXPLORER_PORT:-3004}:80`

**Environment Variables:**
- `VITE_DEFAULT_KASPA_NETWORK`
- `VITE_INDEXER_MAINNET_URL`
- `VITE_DEFAULT_MAINNET_KASPA_NODE_URL`
- `REMOTE_KASIA_INDEXER_URL`
- `REMOTE_KSOCIAL_INDEXER_URL`
- `REMOTE_KASPA_NODE_WBORSH_URL`

**Fallback Strategy:**
- Uses local indexers if `indexer-services` profile is active
- Falls back to public indexers if `indexer-services` is not active

### Mining Profile (`mining`)
**Services:**
- `kaspa-stratum` - Mining stratum server

**Ports:**
- Stratum: `${STRATUM_PORT:-5555}:5555`

**Dependencies:**
- Depends on kaspa-node (service_started)

**Environment Variables:**
- `KASPA_RPC_SERVER`
- `STRATUM_PORT`
- `MINING_ADDRESS`

### Wizard Profile (`wizard`)
**Services:**
- `wizard` - Installation wizard (DEPRECATED)

**Note:** The wizard is marked as deprecated and should run on the host, not in a container.

## Key Methods in config-generator.js

### 1. `generateDockerCompose(config, profiles)`
**Location:** Lines 1001-1517  
**Purpose:** Generates complete docker-compose.yml content based on configuration and selected profiles

**Logic Flow:**
1. Extract port and network configuration
2. Build kaspad command with network flag
3. Configure data directories
4. Add kaspa-node if needed by profiles (core, archive-node, mining)
5. Add wizard service (deprecated)
6. Add kaspa-user-applications services if selected
7. Add indexer-services if selected
8. Add archive-node if selected
9. Add mining if selected
10. Generate volumes section
11. Generate networks section

**Profile Detection:**
```javascript
const nodeProfiles = ['core', 'archive-node', 'mining'].filter(p => profiles.includes(p));
if (nodeProfiles.length > 0) {
  // Add kaspa-node
}

if (profiles.includes('kaspa-user-applications')) {
  // Add user apps
}

if (profiles.includes('indexer-services')) {
  // Add indexer services
}

if (profiles.includes('archive-node')) {
  // Add archive database
}

if (profiles.includes('mining')) {
  // Add mining stratum
}
```

### 2. `generateEnvFile(config, profiles)`
**Location:** Lines 95-289  
**Purpose:** Generates .env file content based on configuration

**Sections Generated:**
1. Active Profiles (`COMPOSE_PROFILES`)
2. Core Settings
3. Kaspa Node Configuration (if core or archive-node)
4. Network Ports
5. Database Settings (if indexer-services)
6. Archive Database Settings (if archive-node)
7. Monitoring Settings
8. Developer Mode Settings (if enabled)
9. SSL Settings (if enabled)
10. Indexer Settings (if indexer-services)
11. Mining Settings (if mining)
12. Indexer URLs for User Applications (if kaspa-user-applications)

### 3. `generateDefaultConfig(profiles)`
**Location:** Lines 417-475  
**Purpose:** Generates default configuration values based on selected profiles

**Profile-Specific Defaults:**
- **core/archive-node:** Adds Kaspa node configuration
- **indexer-services:** Adds database passwords and settings
- **archive-node:** Adds archive database settings
- **mining:** Adds mining settings

## Port Mappings

### Default Ports
| Service | Port | Variable | Default |
|---------|------|----------|---------|
| Kaspa Node P2P | 16111 | KASPA_NODE_P2P_PORT | 16111 |
| Kaspa Node RPC | 16110 | KASPA_NODE_RPC_PORT | 16110 |
| Dashboard | 3001 | DASHBOARD_PORT | 3001 |
| Nginx HTTP | 80 | NGINX_HTTP_PORT | 80 |
| Nginx HTTPS | 443 | NGINX_HTTPS_PORT | 443 |
| Wizard | 3000 | WIZARD_PORT | 3000 |
| Kasia App | 3001 | KASIA_APP_PORT | 3001 |
| K-Social | 3003 | KSOCIAL_APP_PORT | 3003 |
| Kaspa Explorer | 3004 | KASPA_EXPLORER_PORT | 3004 |
| Kasia Indexer | 3002 | KASIA_INDEXER_PORT | 3002 |
| K-Indexer | 3006 | K_INDEXER_PORT | 3006 |
| Simply Indexer | 3005 | SIMPLY_INDEXER_PORT | 3005 |
| K-Social DB | 5433 | K_SOCIAL_DB_PORT | 5433 |
| Simply Kaspa DB | 5434 | SIMPLY_KASPA_DB_PORT | 5434 |
| Archive DB | 5433 | ARCHIVE_POSTGRES_PORT | 5433 |
| Stratum | 5555 | STRATUM_PORT | 5555 |

## Data Directory Configuration

### Default Data Directories
- **Kaspa Data:** `/data/kaspa` (KASPA_DATA_DIR)
- **Archive Data:** `/data/kaspa-archive` (KASPA_ARCHIVE_DATA_DIR)
- **TimescaleDB Data:** `/data/timescaledb` (TIMESCALEDB_DATA_DIR)

## Profile Dependencies

### Implicit Dependencies
1. **mining** → Requires kaspa-node (depends_on: kaspa-node)
2. **k-indexer** → Requires k-social-db (depends_on: k-social-db healthy)
3. **simply-kaspa-indexer** → Requires simply-kaspa-db (depends_on: simply-kaspa-db healthy)

### Fallback Strategies
1. **kaspa-user-applications** → Can work with OR without indexer-services
   - With indexer-services: Uses local indexers
   - Without indexer-services: Uses public indexers

2. **indexer-services** → Can work with OR without kaspa-node
   - With kaspa-node: Uses local node
   - Without kaspa-node: Falls back to public endpoints

## Validation and Diagnostics

The config-generator includes validation methods:

1. `validateDockerComposeGeneration()` - Validates generated docker-compose content
2. `validateProfileConfiguration()` - Validates profile configuration
3. `generateDiagnosticReport()` - Generates comprehensive diagnostic report
4. `checkServicePresence()` - Checks if specific service is present
5. `getValidationSummary()` - Gets quick validation summary

These methods use the `ServiceValidator` class for validation logic.

## Backup and Configuration Management

### Backup Methods
- `createConfigurationBackup()` - Creates timestamped backups
- `cleanupOldBackups()` - Keeps last 10 backups
- `listConfigurationBackups()` - Lists available backups
- `restoreConfigurationBackup()` - Restores from backup

### Configuration Loading
- `loadEnvFile()` - Loads .env file
- `loadInstallationConfig()` - Loads installation-config.json
- `loadCompleteConfiguration()` - Loads from both sources with priority

## Developer Mode

Developer mode adds:
- Portainer (port 9000)
- pgAdmin (port 5050) - only if database profiles are active
- Debug logging for all services

## Next Steps for Phase 3

The following changes will be made in subsequent steps:

1. **Step 1:** Update profile IDs to new naming convention
2. **Step 2:** Update service generation logic
3. **Step 3:** Update environment variable generation
4. **Step 4:** Update validation logic
5. **Step 5:** Test and verify changes

## Verification Checklist

- [x] Current code structure documented
- [x] Backup file created at `services/wizard/backend/src/utils/config-generator.js.backup`
- [x] No changes made to production code yet
- [x] Profile-to-service mappings identified and documented
- [x] Port mappings documented
- [x] Data directory configuration documented
- [x] Profile dependencies documented
- [x] Validation methods identified

## Ready for Step 1

The codebase is now prepared for Phase 3 Step 1: Updating profile IDs to the new naming convention.
