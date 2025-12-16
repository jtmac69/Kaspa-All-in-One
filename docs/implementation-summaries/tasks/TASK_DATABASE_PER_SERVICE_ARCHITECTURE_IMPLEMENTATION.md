# Task: Database-Per-Service Architecture Implementation

## Issue Description

During Phase 6.2 testing of the Indexer Services scenario, multiple critical database conflicts were discovered that could not be resolved with shared database approaches:

1. **Schema Conflicts**: Different indexers expecting different table structures with same names
2. **Database Name Conflicts**: Services trying to create databases with same names  
3. **Hardcoded Expectations**: Indexers had hardcoded database name expectations
4. **Migration Issues**: No proper schema evolution or migration system

## Root Cause Analysis

### **Fundamental Architecture Problem**
The shared database approach was fundamentally flawed because:

1. **k-indexer** expects `ksocial` database with social media schema
2. **simply-kaspa-indexer** expects `simply_kaspa` database with blockchain schema
3. **Both services** expect tables with same names (`vars`, `blocks`) but different structures
4. **No coordination** between services for schema management
5. **Hardcoded assumptions** in application code about database structure

### **Failed Approaches Attempted**
1. **Single Shared Database**: Schema conflicts between different table expectations
2. **Schema-Based Isolation**: Indexers ignored connection string schema parameters
3. **Table Renaming**: Indexers had hardcoded table name expectations

## Solution: Database-Per-Service Architecture

### **Design Principles**
- **Complete Isolation**: Each service owns its database completely
- **Independent Evolution**: Services can evolve schemas independently  
- **Fault Tolerance**: One database failure doesn't affect other services
- **Technology Flexibility**: Each service can optimize for its workload

### **Architecture Implementation**

#### **Service-Database Mapping**
```
k-indexer          → k-social-db (port 5433)
simply-kaspa-indexer → simply-kaspa-db (port 5434)  
kasia-indexer      → file-based storage (RocksDB)
```

#### **Docker Compose Changes**
```yaml
# Before: Single shared database
indexer-db:
  image: timescale/timescaledb:latest-pg16
  ports: ["5432:5432"]

# After: Separate databases per service
k-social-db:
  image: timescale/timescaledb:latest-pg16
  ports: ["5433:5432"]
  environment:
    POSTGRES_DB: ksocial
    POSTGRES_USER: k_social_user
  volumes:
    - ./config/postgres/k-social-init:/docker-entrypoint-initdb.d

simply-kaspa-db:
  image: timescale/timescaledb:latest-pg16
  ports: ["5434:5432"]
  environment:
    POSTGRES_DB: simply_kaspa
    POSTGRES_USER: simply_kaspa_user
  volumes:
    - ./config/postgres/simply-kaspa-init:/docker-entrypoint-initdb.d
```

#### **Connection String Updates**
```bash
# k-indexer connection
DATABASE_URL=postgresql://k_social_user:pass@k-social-db:5432/ksocial

# simply-kaspa-indexer connection  
DATABASE_URL=postgresql://simply_kaspa_user:pass@simply-kaspa-db:5432/simply_kaspa
```

#### **Initialization Scripts**
- **Separate init directories**: Each database has its own initialization scripts
- **Service-specific schemas**: Each database contains only tables needed by its service
- **Optimized configurations**: Each database optimized for its workload patterns

### **Database Schemas**

#### **K-Social Database (`ksocial`)**
- **Configuration**: `k_vars`, `vars` (compatibility)
- **Social Media**: `k_posts`, `k_votes`, `k_user_profiles`, `k_follows`
- **Transactions**: `k_transactions`
- **Optimization**: 6-hour TimescaleDB chunks for social activity patterns

#### **Simply Kaspa Database (`simply_kaspa`)**
- **Configuration**: `vars`
- **Blockchain**: `blocks`, `transactions`, `transactions_acceptances`
- **Addresses**: `addresses`, `transaction_inputs`, `transaction_outputs`
- **Optimization**: 15-30 minute TimescaleDB chunks for high-frequency blockchain data

## Implementation Details

### **Files Created**
- `config/postgres/k-social-init/01-init-k-social.sql`
- `config/postgres/simply-kaspa-init/01-init-simply-kaspa.sql`
- `docs/architecture/DATABASE_PER_SERVICE_ARCHITECTURE.md`

### **Files Modified**
- `docker-compose.yml` - Complete database architecture redesign
- `TESTING.md` - Updated Scenario 3 with new verification procedures
- `.kiro/specs/test-release/tasks.md` - Documented architecture change

### **Environment Variables Added**
- `K_SOCIAL_DB_PASSWORD` - Password for k-social database
- `SIMPLY_KASPA_DB_PASSWORD` - Password for simply-kaspa database
- `K_SOCIAL_DB_PORT` - Port for k-social database (default: 5433)
- `SIMPLY_KASPA_DB_PORT` - Port for simply-kaspa database (default: 5434)

## Benefits Achieved

### **✅ Complete Conflict Resolution**
- No more schema conflicts between services
- No more database name conflicts
- No more table name conflicts
- Each service sees only its own data

### **✅ Operational Benefits**
- **Independent Scaling**: Scale databases based on service needs
- **Fault Isolation**: One database failure doesn't affect other services
- **Independent Backups**: Backup strategies per service
- **Resource Optimization**: Right-size each database for its workload

### **✅ Development Benefits**
- **Schema Freedom**: Each service can evolve independently
- **Technology Choice**: Each service can use optimal database settings
- **Easier Testing**: Test services in isolation
- **Cleaner Architecture**: Clear service boundaries

## Testing Verification

### **New Testing Procedures**
1. **Multi-Database Health Checks**: Verify each database independently
2. **Schema Isolation Verification**: Confirm each database contains only expected tables
3. **Service Connection Testing**: Verify each service connects to correct database
4. **Port Verification**: Confirm services accessible on correct ports

### **Updated TESTING.md Scenario 3**
- Added database architecture verification steps
- Updated container expectations (5 containers instead of 4)
- Added database-specific health checks
- Added schema isolation verification commands

## Impact Assessment

### **Positive Impact**
- ✅ **Eliminates all database conflicts** that were blocking test release
- ✅ **Provides scalable architecture** for future growth
- ✅ **Enables independent service evolution** 
- ✅ **Improves fault tolerance** and operational reliability

### **Migration Impact**
- **Breaking Change**: Existing deployments need migration
- **Resource Usage**: Slightly higher (separate database containers)
- **Complexity**: More containers to manage but cleaner architecture
- **Configuration**: New environment variables and connection strings

### **Future Compatibility**
- **Extensible**: Easy to add new services with their own databases
- **Maintainable**: Clear separation of concerns
- **Scalable**: Each database can be scaled independently
- **Monitorable**: Each database can be monitored separately

## Related Specifications Updated

This architecture change has been documented across all relevant specifications:

1. **kaspa-all-in-one**: Core system architecture updated
2. **web-installation-wizard**: Database configuration procedures updated  
3. **management-dashboard**: Database monitoring updated for multiple databases
4. **test-release**: Testing procedures updated for new architecture

## Conclusion

The Database-Per-Service Architecture successfully resolves all database conflicts while providing a robust, scalable foundation for the Kaspa All-in-One system. This architectural change eliminates the root cause of indexer service conflicts and enables independent service evolution.

## Status

✅ **COMPLETE** - Architecture implemented, tested, and documented across all specifications