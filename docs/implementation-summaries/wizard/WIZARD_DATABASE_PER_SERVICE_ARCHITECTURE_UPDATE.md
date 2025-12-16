# Wizard Database-Per-Service Architecture Update

## Overview

Updated the Installation Wizard to support the new Database-Per-Service Architecture, replacing the old shared database approach with separate dedicated databases for each indexer service.

## Problem Statement

The wizard was still configured for the old shared database architecture:
- Only 1 database password field (`POSTGRES_PASSWORD`)
- Only 1 database container (`indexer-db`)
- Service verification only checked 4 services instead of 5
- Generated docker-compose.yml used old shared database configuration

## Solution Implemented

### 1. Configuration Fields Updated (`configuration-fields.js`)

**Old Configuration:**
```javascript
'indexer-services': [
  {
    key: 'POSTGRES_USER',
    label: 'Database User',
    defaultValue: 'kaspa'
  },
  {
    key: 'POSTGRES_PASSWORD', 
    label: 'Database Password'
  }
]
```

**New Configuration:**
```javascript
'indexer-services': [
  {
    key: 'K_SOCIAL_DB_PASSWORD',
    label: 'K-Social Database Password'
  },
  {
    key: 'SIMPLY_KASPA_DB_PASSWORD',
    label: 'Simply Kaspa Database Password'
  },
  {
    key: 'K_SOCIAL_DB_PORT',
    label: 'K-Social Database Port',
    defaultValue: 5433
  },
  {
    key: 'SIMPLY_KASPA_DB_PORT',
    label: 'Simply Kaspa Database Port', 
    defaultValue: 5434
  }
]
```

### 2. Service Definitions Updated

**Files Updated:**
- `docker-manager.js` - Container name mappings
- `service-validator.js` - Service dependencies
- `reconfigure.js` - Profile detection

**Old Service List:**
```javascript
'indexer-services': ['indexer-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']
```

**New Service List:**
```javascript
'indexer-services': ['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']
```

### 3. Docker Compose Generation Updated (`config-generator.js`)

**Old Architecture:**
- 1 shared `indexer-db` container
- All indexers connect to same database
- Shared connection strings and credentials

**New Architecture:**
- `k-social-db` container (port 5433) for k-indexer
- `simply-kaspa-db` container (port 5434) for simply-kaspa-indexer
- Separate initialization scripts per database
- Service-specific connection strings

### 4. Database Configuration

**K-Social Database:**
```yaml
k-social-db:
  image: timescale/timescaledb:latest-pg16
  container_name: k-social-db
  ports:
    - "${K_SOCIAL_DB_PORT:-5433}:5432"
  environment:
    - POSTGRES_DB=ksocial
    - POSTGRES_USER=k_social_user
    - POSTGRES_PASSWORD=${K_SOCIAL_DB_PASSWORD}
  volumes:
    - k-social-db-data:/var/lib/postgresql/data
    - ./config/postgres/k-social-init:/docker-entrypoint-initdb.d
```

**Simply Kaspa Database:**
```yaml
simply-kaspa-db:
  image: timescale/timescaledb:latest-pg16
  container_name: simply-kaspa-db
  ports:
    - "${SIMPLY_KASPA_DB_PORT:-5434}:5432"
  environment:
    - POSTGRES_DB=simply_kaspa
    - POSTGRES_USER=simply_kaspa_user
    - POSTGRES_PASSWORD=${SIMPLY_KASPA_DB_PASSWORD}
  volumes:
    - simply-kaspa-db-data:/var/lib/postgresql/data
    - ./config/postgres/simply-kaspa-init:/docker-entrypoint-initdb.d
```

### 5. Service Dependencies Updated

**K-Indexer:**
```yaml
k-indexer:
  environment:
    - DATABASE_URL=postgresql://k_social_user:${K_SOCIAL_DB_PASSWORD}@k-social-db:5432/ksocial
  depends_on:
    k-social-db:
      condition: service_healthy
```

**Simply Kaspa Indexer:**
```yaml
simply-kaspa-indexer:
  environment:
    - DATABASE_URL=postgresql://simply_kaspa_user:${SIMPLY_KASPA_DB_PASSWORD}@simply-kaspa-db:5432/simply_kaspa
  depends_on:
    simply-kaspa-db:
      condition: service_healthy
```

**Kasia Indexer:**
- No database dependency (uses file-based RocksDB storage)

## Expected Results

### Wizard Configuration Screen
- ✅ Shows 2 database password fields instead of 1
- ✅ Shows advanced port configuration for both databases
- ✅ Generates secure passwords for both databases

### Service Verification Screen  
- ✅ Shows 5 services instead of 4:
  - K-Social Db
  - Simply Kaspa Db
  - Kasia Indexer
  - K Indexer
  - Simply Kaspa Indexer

### Docker Containers
- ✅ `k-social-db` on port 5433
- ✅ `simply-kaspa-db` on port 5434
- ✅ No more `indexer-db` container

### Database Isolation
- ✅ K-Social database contains social media tables
- ✅ Simply Kaspa database contains blockchain tables
- ✅ No schema conflicts between services

## Testing Impact

### Updated Test Procedures
- TESTING.md Scenario 3 already updated for new architecture
- Verification commands use new container names
- Health checks test both databases independently

### Wizard Testing
- Configuration screen should show 2 password fields
- Installation should create 5 containers (not 4)
- Service verification should check all 5 services
- Generated docker-compose.yml should match new architecture

## Files Modified

### Wizard Backend Configuration
- `services/wizard/backend/src/config/configuration-fields.js`
- `services/wizard/backend/src/utils/docker-manager.js`
- `services/wizard/backend/src/utils/service-validator.js`
- `services/wizard/backend/src/utils/config-generator.js`
- `services/wizard/backend/src/api/reconfigure.js`

### Architecture Files (Already Updated)
- `docker-compose.yml`
- `config/postgres/k-social-init/01-init-k-social.sql`
- `config/postgres/simply-kaspa-init/01-init-simply-kaspa.sql`

## Benefits

### Complete Service Isolation
- Each indexer has dedicated database
- No shared resources or naming conflicts
- Independent schema evolution

### Improved User Experience
- Clear separation of database credentials
- Better understanding of service architecture
- More granular configuration control

### Enhanced Reliability
- One database failure doesn't affect other services
- Independent health checks per database
- Easier troubleshooting and debugging

## Next Steps

1. **Rebuild Test Release Package** - Include updated wizard configuration
2. **Test Fresh Installation** - Verify 5 services are created and verified
3. **Validate Configuration Screen** - Ensure 2 password fields are shown
4. **Verify Service Health Checks** - Confirm all 5 services are monitored

## Implementation Status

- ✅ **Wizard Configuration Fields**: Updated for separate databases
- ✅ **Service Definitions**: Updated container names and dependencies  
- ✅ **Docker Compose Generation**: Updated for Database-Per-Service architecture
- ✅ **Service Dependencies**: Updated connection strings and health checks
- ⏳ **Testing**: Requires rebuild and fresh installation test

The wizard is now fully aligned with the Database-Per-Service Architecture and ready for testing! 🚀