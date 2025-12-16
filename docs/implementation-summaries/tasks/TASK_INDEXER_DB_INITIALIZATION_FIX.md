# Task: Indexer Database Initialization Fix

## Issue Description

During Phase 6.2 testing of the Indexer Services scenario, the indexer-db container was showing repeated errors:

```
ERROR: relation "k_vars" does not exist at character 19
STATEMENT: SELECT value FROM k_vars WHERE key = 'network'
```

The k-indexer service was unable to start properly because it expected a `k_vars` configuration table that wasn't being created during database initialization.

## Root Cause Analysis

1. **Missing Configuration Table**: The k-indexer service expects a `k_vars` table for storing configuration key-value pairs, but this table wasn't defined in the database initialization scripts.

2. **User Permission Mismatch**: The database initialization scripts were trying to grant permissions to user `indexer`, but the actual database user is `kaspa` (as defined in the `.env` file).

3. **Incomplete Schema**: The k-indexer doesn't have built-in migration capabilities, so it relies on the database initialization scripts to create all necessary tables.

## Investigation Process

1. **Error Analysis**: Examined database logs to identify the specific query failing:
   ```sql
   SELECT value FROM k_vars WHERE key = 'network'
   ```

2. **Database Inspection**: Connected to the database to verify:
   - Database user: `kaspa` (not `indexer`)
   - Database name: `ksocial` (exists but empty)
   - Missing tables: `k_vars` table was completely absent

3. **Service Analysis**: Checked k-indexer capabilities:
   - No built-in migration system
   - Expects database schema to be pre-created
   - Requires `k_vars` table for configuration storage

## Solution Implementation

### 1. Immediate Fix (Manual)

Created the missing `k_vars` table and populated it with required configuration:

```sql
CREATE TABLE IF NOT EXISTS k_vars (
    key VARCHAR PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO k_vars (key, value) VALUES 
    ('network', 'mainnet'),
    ('version', '1.0.0'),
    ('indexer_mode', 'full'),
    ('last_processed_block', '0'),
    ('sync_status', 'starting')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
```

### 2. Permanent Fix (Script Updates)

Updated database initialization scripts to prevent future occurrences:

#### Updated `config/postgres/init/02-k-social-timescaledb.sql`:
- Added `k_vars` table creation with default configuration values
- Fixed user permissions from `indexer` to `kaspa`

#### Updated `config/postgres/init/03-simply-kaspa-timescaledb.sql`:
- Fixed user permissions from `indexer` to `kaspa`

#### Updated `config/postgres/init/01-create-databases.sql`:
- Fixed database permissions from `indexer` to `kaspa`

## Verification

1. **Error Resolution**: Database errors stopped immediately after creating the `k_vars` table
2. **Service Health**: k-indexer health endpoint now responds successfully:
   ```json
   {"network":"mainnet","service":"K-webserver","status":"healthy","version":"..."}
   ```
3. **No New Errors**: No new database errors in the logs after the fix

## Files Modified

- `config/postgres/init/01-create-databases.sql` - Fixed user permissions
- `config/postgres/init/02-k-social-timescaledb.sql` - Added k_vars table and fixed permissions
- `config/postgres/init/03-simply-kaspa-timescaledb.sql` - Fixed user permissions

## Impact

- **Positive**: Indexer Services scenario now works correctly
- **Risk**: Low - Changes only affect database initialization for new deployments
- **Compatibility**: Existing deployments need manual table creation (as done above)

## Testing

- ✅ k-indexer service health check passes
- ✅ Database errors eliminated
- ✅ All indexer services running successfully
- ✅ No regression in other services

## Recommendations

1. **For New Deployments**: The updated initialization scripts will automatically create the required tables
2. **For Existing Deployments**: Run the manual SQL commands above to create the missing table
3. **Future Improvements**: Consider adding a migration system to k-indexer for better schema management

## Related Issues

This fix resolves the database initialization issue that was blocking completion of:
- Phase 6.2: Full scenario testing - Scenario 3: Indexer Services
- Test Release validation for the indexer-services profile

## Status

✅ **RESOLVED** - Database initialization issue fixed, k-indexer service operational