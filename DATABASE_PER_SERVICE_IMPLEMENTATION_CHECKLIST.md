# Database-Per-Service Architecture Implementation Checklist

## ✅ **COMPLETE - Ready for Rebuild and Testing**

This document provides a comprehensive checklist of all changes made to implement the Database-Per-Service Architecture across the entire Kaspa All-in-One system.

---

## 1. Core Architecture Files ✅

### Docker Compose Configuration
- ✅ **File**: `docker-compose.yml`
- ✅ Removed: `indexer-db` shared database container
- ✅ Added: `k-social-db` container (port 5433)
- ✅ Added: `simply-kaspa-db` container (port 5434)
- ✅ Updated: k-indexer connection string to k-social-db
- ✅ Updated: simply-kaspa-indexer connection string to simply-kaspa-db
- ✅ Updated: Service dependencies (k-indexer → k-social-db, simply-kaspa-indexer → simply-kaspa-db)
- ✅ Updated: Volume definitions (k-social-db-data, simply-kaspa-db-data)

### Database Initialization Scripts
- ✅ **File**: `config/postgres/k-social-init/01-init-k-social.sql`
  - K-Social database schema with social media tables
  - Tables: k_vars, vars, k_posts, k_votes
  - User: k_social_user
  - Database: ksocial

- ✅ **File**: `config/postgres/simply-kaspa-init/01-init-simply-kaspa.sql`
  - Simply Kaspa database schema with blockchain tables
  - Tables: vars, blocks, transactions, transactions_acceptances
  - User: simply_kaspa_user
  - Database: simply_kaspa

- ⚠️ **File**: `config/postgres/init/01-create-databases.sql`
  - **Status**: Legacy file, no longer used
  - **Action**: Can be removed or kept for reference

---

## 2. Wizard Backend Updates ✅

### Configuration Fields
- ✅ **File**: `services/wizard/backend/src/config/configuration-fields.js`
- ✅ Removed: `POSTGRES_USER` field
- ✅ Removed: `POSTGRES_PASSWORD` field
- ✅ Added: `K_SOCIAL_DB_PASSWORD` field (required, min 12 chars)
- ✅ Added: `SIMPLY_KASPA_DB_PASSWORD` field (required, min 12 chars)
- ✅ Added: `K_SOCIAL_DB_PORT` field (default: 5433, advanced)
- ✅ Added: `SIMPLY_KASPA_DB_PORT` field (default: 5434, advanced)

### Service Definitions
- ✅ **File**: `services/wizard/backend/src/utils/docker-manager.js`
- ✅ Updated: Container map for indexer-services profile
  - Old: `['indexer-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']`
  - New: `['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']`

- ✅ **File**: `services/wizard/backend/src/utils/service-validator.js`
- ✅ Updated: Service dependencies
  - k-indexer depends on k-social-db
  - simply-kaspa-indexer depends on simply-kaspa-db
  - kasia-indexer has no database dependency (file-based)

- ✅ **File**: `services/wizard/backend/src/api/reconfigure.js`
- ✅ Updated: Profile detection to recognize new database containers

### Docker Compose Generation
- ✅ **File**: `services/wizard/backend/src/utils/config-generator.js`
- ✅ Removed: Single `indexer-db` container generation
- ✅ Added: `k-social-db` container generation with proper config
- ✅ Added: `simply-kaspa-db` container generation with proper config
- ✅ Updated: k-indexer environment variables and connection string
- ✅ Updated: simply-kaspa-indexer environment variables and connection string
- ✅ Updated: Service dependencies in generated docker-compose.yml
- ✅ Updated: Volume definitions

---

## 3. Wizard Frontend Updates ✅

### HTML Template
- ✅ **File**: `services/wizard/frontend/public/index.html`
- ✅ Removed: Single "Database Password" field
- ✅ Added: "K-Social Database Password" field with:
  - Password input with visibility toggle
  - Generate button
  - Tooltip explaining purpose
- ✅ Added: "Simply Kaspa Database Password" field with:
  - Password input with visibility toggle
  - Generate button
  - Tooltip explaining purpose

### Configuration Module
- ✅ **File**: `services/wizard/frontend/public/scripts/modules/configure.js`
- ✅ Updated: `populateConfigurationForm()` to handle both password fields
- ✅ Updated: `updateFormVisibility()` to show database section correctly
- ✅ Updated: Validation rules for both password fields (min 12 chars)
- ✅ Updated: `validateAllFields()` to check both passwords when required
- ✅ Updated: `gatherConfigurationFromForm()` to collect both passwords

### Review Module
- ✅ **File**: `services/wizard/frontend/public/scripts/modules/review.js`
- ✅ Updated: Indexer Services profile service list
  - Old: `['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']`
  - New: `['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']`

### Complete Module
- ✅ **File**: `services/wizard/frontend/public/scripts/modules/complete.js`
- ✅ **Status**: No changes needed (dynamically displays services from backend)
- ✅ Will automatically show k-social-db and simply-kaspa-db
- ✅ Formats service names correctly (K Social Db, Simply Kaspa Db)

---

## 4. Documentation Updates ✅

### Architecture Documentation
- ✅ **File**: `docs/architecture/DATABASE_PER_SERVICE_ARCHITECTURE.md`
- ✅ Complete architectural design document
- ✅ Problem statement and solution overview
- ✅ Service-database mapping table
- ✅ Connection strings and configuration
- ✅ Benefits and future enhancements

### Testing Documentation
- ✅ **File**: `TESTING.md` (Scenario 3)
- ✅ Updated: Service verification commands
- ✅ Updated: Expected container list (5 instead of 4)
- ✅ Updated: Database health check commands
- ✅ Added: Database isolation verification procedures
- ✅ Updated: Log checking commands (k-social-db, simply-kaspa-db)

### Implementation Summaries
- ✅ **File**: `docs/implementation-summaries/tasks/TASK_DATABASE_PER_SERVICE_ARCHITECTURE_IMPLEMENTATION.md`
- ✅ **File**: `docs/implementation-summaries/wizard/WIZARD_DATABASE_PER_SERVICE_ARCHITECTURE_UPDATE.md`
- ✅ **File**: `docs/implementation-summaries/wizard/WIZARD_FRONTEND_DATABASE_PER_SERVICE_UPDATE.md`

---

## 5. Expected Behavior After Rebuild

### Configuration Screen (Wizard Step 5)
- ✅ Shows 2 database password fields
- ✅ Each field has Generate button
- ✅ Each field has password visibility toggle
- ✅ Validation requires both passwords (min 12 chars)
- ✅ Clear labels distinguish the two databases

### Review Screen (Wizard Step 6)
- ✅ Shows 5 services in the list:
  1. K-Social Db
  2. Simply Kaspa Db
  3. Kasia Indexer
  4. K Indexer
  5. Simply Kaspa Indexer

### Installation (Wizard Step 7)
- ✅ Pulls timescale/timescaledb:latest-pg16 image
- ✅ Creates k-social-db container
- ✅ Creates simply-kaspa-db container
- ✅ Creates kasia-indexer container
- ✅ Creates k-indexer container
- ✅ Creates simply-kaspa-indexer container
- ✅ Waits for database health checks
- ✅ Starts indexers after databases are healthy

### Service Verification (Wizard Step 8)
- ✅ Shows 5 services with status
- ✅ All services show "Running" status
- ✅ All services show green checkmarks
- ✅ Service names properly formatted

### Docker Containers
```bash
docker ps
# Expected output:
# k-social-db        (port 5433)
# simply-kaspa-db    (port 5434)
# kasia-indexer      (port 3002)
# k-indexer          (port 3006)
# simply-kaspa-indexer (port 3005)
```

### Database Verification
```bash
# K-Social Database
docker exec k-social-db psql -U k_social_user -d ksocial -c "\dt"
# Expected: k_vars, vars, k_posts, k_votes

# Simply Kaspa Database
docker exec simply-kaspa-db psql -U simply_kaspa_user -d simply_kaspa -c "\dt"
# Expected: vars, blocks, transactions, transactions_acceptances
```

---

## 6. Files That Need Rebuild

### Must Be Included in Test Release Package
- ✅ `docker-compose.yml`
- ✅ `config/postgres/k-social-init/01-init-k-social.sql`
- ✅ `config/postgres/simply-kaspa-init/01-init-simply-kaspa.sql`
- ✅ `services/wizard/backend/src/config/configuration-fields.js`
- ✅ `services/wizard/backend/src/utils/docker-manager.js`
- ✅ `services/wizard/backend/src/utils/service-validator.js`
- ✅ `services/wizard/backend/src/utils/config-generator.js`
- ✅ `services/wizard/backend/src/api/reconfigure.js`
- ✅ `services/wizard/frontend/public/index.html`
- ✅ `services/wizard/frontend/public/scripts/modules/configure.js`
- ✅ `services/wizard/frontend/public/scripts/modules/review.js`
- ✅ `TESTING.md`
- ✅ `docs/architecture/DATABASE_PER_SERVICE_ARCHITECTURE.md`

---

## 7. Testing Procedure

### Pre-Test Cleanup
```bash
./cleanup-test.sh
# Confirm removal of all containers and volumes
```

### Build Test Release
```bash
./build-test-release.sh
# Verify new package is created with updated files
```

### Extract and Start
```bash
tar -xzf kaspa-aio-v0.9.0-test.tar.gz
cd kaspa-aio-v0.9.0-test
./start-test.sh
```

### Test Configuration Screen
1. Select "Indexer Services" profile
2. Navigate to Configuration screen
3. **Verify**: 2 database password fields are shown
4. Click "Generate" on both fields
5. **Verify**: Both fields populate with passwords
6. Click "Continue"

### Test Review Screen
1. **Verify**: Shows 5 services in the list
2. **Verify**: Service names include both databases
3. Click "Install"

### Test Installation
1. **Monitor**: Installation progress
2. **Verify**: Both database containers are created
3. **Verify**: All 5 services start successfully
4. **Wait**: For installation to complete

### Test Service Verification
1. **Verify**: Completion screen shows 5 services
2. **Verify**: All services show "Running" status
3. **Verify**: All services have green checkmarks

### Test Docker Containers
```bash
docker ps
# Verify 5 containers are running
# Verify container names match expected
# Verify ports match expected (5433, 5434, 3002, 3005, 3006)
```

### Test Database Isolation
```bash
# Test K-Social Database
docker exec k-social-db psql -U k_social_user -d ksocial -c "\dt"
# Should show: k_vars, vars, k_posts, k_votes

# Test Simply Kaspa Database
docker exec simply-kaspa-db psql -U simply_kaspa_user -d simply_kaspa -c "\dt"
# Should show: vars, blocks, transactions, transactions_acceptances

# Verify no schema conflicts
# K-Social should NOT have blockchain tables
# Simply Kaspa should NOT have social media tables
```

### Test Service Logs
```bash
# K-Social Database
docker logs k-social-db --tail 20
# Should show: "K-Social database initialization completed successfully!"

# Simply Kaspa Database
docker logs simply-kaspa-db --tail 20
# Should show: "Simply Kaspa database initialization completed successfully!"

# K-Indexer
docker logs k-indexer --tail 20
# Should show: "Successfully connected to PostgreSQL database"
# Should NOT show: "relation does not exist" errors

# Simply Kaspa Indexer
docker logs simply-kaspa-indexer --tail 20
# Should show successful database connection
# Should NOT show: "relation does not exist" errors
```

---

## 8. Success Criteria

### ✅ Configuration
- [ ] 2 database password fields visible
- [ ] Both fields can generate passwords
- [ ] Both fields validate correctly
- [ ] No validation errors for missing fields

### ✅ Installation
- [ ] 5 containers created (not 4)
- [ ] k-social-db on port 5433
- [ ] simply-kaspa-db on port 5434
- [ ] All containers reach healthy status
- [ ] No database initialization errors

### ✅ Service Verification
- [ ] 5 services shown in wizard
- [ ] All services show "Running" status
- [ ] Service names properly formatted
- [ ] No "indexer-db" references

### ✅ Database Isolation
- [ ] K-Social database has social media tables
- [ ] Simply Kaspa database has blockchain tables
- [ ] No schema conflicts between databases
- [ ] Each indexer connects to correct database

### ✅ No Errors
- [ ] No "relation does not exist" errors
- [ ] No "database already exists" errors
- [ ] No connection refused errors
- [ ] No schema conflicts

---

## 9. Rollback Plan (If Needed)

If the new architecture causes issues, the old architecture files are preserved in git history. To rollback:

```bash
# Revert docker-compose.yml
git checkout HEAD~1 docker-compose.yml

# Revert wizard configuration
git checkout HEAD~1 services/wizard/

# Revert database init scripts
git checkout HEAD~1 config/postgres/

# Rebuild test release
./build-test-release.sh
```

---

## 10. Final Status

### ✅ **ALL CHANGES COMPLETE**

**Backend**: ✅ Complete
- Configuration fields updated
- Service definitions updated
- Docker compose generation updated
- Service validation updated

**Frontend**: ✅ Complete
- HTML template updated
- Configuration module updated
- Review module updated
- Complete module ready (dynamic)

**Documentation**: ✅ Complete
- Architecture documentation
- Testing procedures
- Implementation summaries

**Database Scripts**: ✅ Complete
- K-Social initialization script
- Simply Kaspa initialization script
- Proper schema isolation

### 🚀 **READY FOR REBUILD AND TESTING**

All components have been updated to support the Database-Per-Service Architecture. The system is ready for:
1. Test release rebuild
2. Fresh installation testing
3. Service verification
4. Database isolation validation

**No additional code changes are needed before rebuild!** 🎉