# Database-Per-Service Architecture for Kaspa All-in-One

## Overview

This document describes the **Database-Per-Service Architecture** implemented for the Kaspa All-in-One system to resolve database conflicts and provide proper service isolation.

## Problem Statement

### Previous Issues (Shared Database Approach)
- **Schema Conflicts**: Multiple indexers expecting different table structures with same names
- **Database Name Conflicts**: Services trying to create databases with same names
- **Tight Coupling**: All services dependent on single database instance
- **No Migration System**: Indexers couldn't handle schema evolution properly
- **Resource Contention**: All services competing for same database resources

### Specific Errors Encountered
```sql
ERROR: relation "k_vars" does not exist
ERROR: relation "transactions_acceptances" does not exist  
ERROR: database "simply_kaspa" already exists
```

## Solution: Database-Per-Service Architecture

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Kaspa All-in-One                         │
├─────────────────────────────────────────────────────────────┤
│  k-indexer          │  simply-kaspa-indexer  │  kasia       │
│  ↓                  │  ↓                     │  ↓           │
│  k-social-db        │  simply-kaspa-db       │  file-based  │
│  (TimescaleDB)      │  (TimescaleDB)         │  (RocksDB)   │
│  Port: 5433         │  Port: 5434            │  N/A         │
└─────────────────────────────────────────────────────────────┘
```

### Service-Database Mapping

| Service | Database Container | Database Name | User | Port | Purpose |
|---------|-------------------|---------------|------|------|---------|
| k-indexer | k-social-db | ksocial | k_social_user | 5433 | Social media data |
| simply-kaspa-indexer | simply-kaspa-db | simply_kaspa | simply_kaspa_user | 5434 | Blockchain data |
| kasia-indexer | N/A (file-based) | N/A | N/A | N/A | RocksDB storage |

## Implementation Details

### Docker Compose Configuration

#### K-Social Database
```yaml
k-social-db:
  image: timescale/timescaledb:latest-pg16
  container_name: k-social-db
  environment:
    - POSTGRES_DB=ksocial
    - POSTGRES_USER=k_social_user
    - POSTGRES_PASSWORD=${K_SOCIAL_DB_PASSWORD:-k_social_secure_pass}
  ports:
    - "${K_SOCIAL_DB_PORT:-5433}:5432"
  volumes:
    - k-social-db-data:/var/lib/postgresql/data
    - ./config/postgres/k-social-init:/docker-entrypoint-initdb.d
```

#### Simply Kaspa Database
```yaml
simply-kaspa-db:
  image: timescale/timescaledb:latest-pg16
  container_name: simply-kaspa-db
  environment:
    - POSTGRES_DB=simply_kaspa
    - POSTGRES_USER=simply_kaspa_user
    - POSTGRES_PASSWORD=${SIMPLY_KASPA_DB_PASSWORD:-simply_kaspa_secure_pass}
  ports:
    - "${SIMPLY_KASPA_DB_PORT:-5434}:5432"
  volumes:
    - simply-kaspa-db-data:/var/lib/postgresql/data
    - ./config/postgres/simply-kaspa-init:/docker-entrypoint-initdb.d
```

### Connection Strings

#### K-Indexer Connection
```
DATABASE_URL=postgresql://k_social_user:k_social_secure_pass@k-social-db:5432/ksocial
```

#### Simply-Kaspa-Indexer Connection
```
DATABASE_URL=postgresql://simply_kaspa_user:simply_kaspa_secure_pass@simply-kaspa-db:5432/simply_kaspa
```

### Database Schemas

#### K-Social Database Schema
- **Configuration Tables**: `k_vars`, `vars` (compatibility)
- **Social Media Tables**: `k_posts`, `k_votes`, `k_user_profiles`, `k_follows`
- **Transaction Tables**: `k_transactions`
- **TimescaleDB Features**: Hypertables with 6-hour chunks for social activity

#### Simply Kaspa Database Schema
- **Configuration Tables**: `vars`
- **Blockchain Tables**: `blocks`, `transactions`, `transactions_acceptances`
- **Address Tables**: `addresses`, `transaction_inputs`, `transaction_outputs`
- **TimescaleDB Features**: Hypertables with 15-30 minute chunks for high-frequency data

## Benefits

### ✅ Complete Service Isolation
- Each service owns its database completely
- No shared resources or naming conflicts
- Independent schema evolution

### ✅ Fault Tolerance
- One database failure doesn't affect other services
- Independent backup and recovery strategies
- Easier troubleshooting and debugging

### ✅ Performance Optimization
- Right-size each database for its workload
- Service-specific memory/CPU allocations
- Optimized storage configurations per use case

### ✅ Development Independence
- Teams can evolve schemas independently
- No coordination needed for database changes
- Easier testing and development environments

### ✅ Technology Flexibility
- Each service can use optimal database configurations
- Different TimescaleDB settings per workload
- Future option to use different database technologies

## Migration Impact

### Affected Components
- **Docker Compose**: New database containers and connection strings
- **Initialization Scripts**: Separate init directories per database
- **Service Dependencies**: Updated health check dependencies
- **Environment Variables**: New database-specific passwords and ports
- **Volume Management**: Separate data volumes per database

### Testing Impact
- **Health Checks**: Verify each database independently
- **Service Verification**: Check connections to correct databases
- **Schema Validation**: Ensure proper table creation in each database
- **Port Verification**: Confirm services accessible on correct ports

## Monitoring and Operations

### Health Checks
```bash
# K-Social Database
docker exec k-social-db pg_isready -U k_social_user -d ksocial

# Simply Kaspa Database  
docker exec simply-kaspa-db pg_isready -U simply_kaspa_user -d simply_kaspa
```

### Database Access
```bash
# Connect to K-Social Database
docker exec -it k-social-db psql -U k_social_user -d ksocial

# Connect to Simply Kaspa Database
docker exec -it simply-kaspa-db psql -U simply_kaspa_user -d simply_kaspa
```

### Backup Strategy
Each database can be backed up independently:
```bash
# K-Social Database Backup
docker exec k-social-db pg_dump -U k_social_user ksocial > k-social-backup.sql

# Simply Kaspa Database Backup
docker exec simply-kaspa-db pg_dump -U simply_kaspa_user simply_kaspa > simply-kaspa-backup.sql
```

## Future Enhancements

### Phase 2: Connection Pooling
- Add PgBouncer containers for each database
- Optimize connection management per service

### Phase 3: Read Replicas
- Add read replicas for high-traffic services
- Implement read/write splitting

### Phase 4: Monitoring
- Add database-specific monitoring (Prometheus/Grafana)
- Service-level alerting and metrics

### Phase 5: Backup Automation
- Automated backup schedules per database
- Point-in-time recovery capabilities

## Related Specifications

This architecture change affects the following specifications:
- **kaspa-all-in-one**: Core system architecture
- **web-installation-wizard**: Database configuration and setup
- **management-dashboard**: Database monitoring and status
- **test-release**: Testing procedures and validation

## Implementation Status

- ✅ **Docker Compose Configuration**: Complete
- ✅ **Database Initialization Scripts**: Complete  
- ✅ **Service Connection Strings**: Complete
- ✅ **Volume Management**: Complete
- ⏳ **Testing Documentation**: In Progress
- ⏳ **Spec Updates**: In Progress

## Conclusion

The Database-Per-Service Architecture provides a robust, scalable foundation for the Kaspa All-in-One system that eliminates current conflicts while enabling future growth and independent service evolution.