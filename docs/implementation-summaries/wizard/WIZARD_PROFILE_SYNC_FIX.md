# Wizard Profile Synchronization Fix

## Date: December 2, 2025

## Issue
During testing of the Core and App installation in the Wizard, multiple errors occurred:
1. **Installation Error**: "Failed to build some services" during the build stage
2. **JavaScript Error**: `TypeError: stateManager.delete is not a function`
3. **Service Startup Failure**: k-social container in restart loop due to missing k-indexer upstream
4. **Dashboard Validation Failure**: Wizard expected kaspa-dashboard container but dashboard is now host-based

## Root Cause Analysis

### 1. Profile Name Mismatch
The docker-compose.yml used different profile names than the wizard's profile-manager.js:

| Wizard Profile | Old docker-compose Profile |
|----------------|---------------------------|
| `core` | (no profile - correct) |
| `kaspa-user-applications` | `prod` |
| `indexer-services` | `explorer` |
| `archive-node` | `archive` |
| `mining` | `mining` (correct) |

### 2. Missing StateManager.delete() Method
The frontend `StateManager` class was missing a `delete()` method.

### 3. K-Social Hardcoded Indexer Dependency
The k-social nginx.conf had hardcoded references to local k-indexer, causing startup failures when indexer-services profile wasn't enabled.

### 4. Dashboard Now Host-Based
The dashboard service was removed from docker-compose.yml (now runs on host), but wizard still expected it as a container.

## Changes Made

### 1. docker-compose.yml
- Changed `prod` profile to `kaspa-user-applications`
- Changed `explorer` profile to `indexer-services`
- Changed `archive` profile to `archive-node`
- Updated k-social default indexer URL to `https://indexer.kaspatalk.net/`
- Removed kasia-app and k-social dependencies on local indexers

### 2. services/wizard/backend/src/utils/docker-manager.js
- Updated `profileMapping` to use matching profile names
- Removed `kaspa-dashboard` from validation (now host-based)
- Removed `dashboard` from `servicesToBuild` (now host-based)

### 3. services/wizard/frontend/public/scripts/modules/state-manager.js
Added the missing `delete()` method.

### 4. services/k-social/Dockerfile
- Fixed nginx template processing to use nginx:alpine's built-in envsubst
- Updated default `KSOCIAL_INDEXER_URL` to `https://indexer.kaspatalk.net/`

### 5. services/k-social/nginx.conf
- Converted to server block template format for nginx:alpine
- Uses `${KSOCIAL_INDEXER_URL}` environment variable for API proxy

### 6. services/wizard/backend/src/utils/profile-manager.js
- Removed dashboard from core services list (now host-based)

## Profile-to-Service Mapping (After Fix)

### Core Profile (no docker-compose profile - always runs)
- kaspa-node
- kaspa-nginx
- dashboard (host-based, not containerized)

### kaspa-user-applications Profile
- kasia-app (uses public Kasia indexer by default)
- k-social (uses https://indexer.kaspatalk.net/ by default)

### indexer-services Profile
- indexer-db (TimescaleDB)
- kasia-indexer
- k-indexer
- simply-kaspa-indexer

### archive-node Profile
- archive-db
- archive-indexer

### mining Profile
- kaspa-stratum

## Public Indexer Endpoints
When local indexers aren't installed, user applications use these public endpoints:
- **Kasia**: `https://api.kasia.io/`
- **K-Social**: `https://indexer.kaspatalk.net/`

## Testing Results
After these changes:
1. ✅ Profile names correctly passed to docker-compose
2. ✅ Services build successfully
3. ✅ `stateManager.delete()` error resolved
4. ✅ k-social starts successfully with public indexer
5. ✅ kasia-app starts successfully
6. ✅ All containers running and healthy
