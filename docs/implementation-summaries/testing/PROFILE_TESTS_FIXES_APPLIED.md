# Profile Tests Fixes Applied

**Date**: November 23, 2025  
**Status**: ✅ All Fixes Complete

## Summary

Applied all necessary fixes to 6 profile test scripts to make them compatible with the current wizard implementation and Docker environment.

## Tests Fixed

1. ✅ `test-wizard-core-profile.sh` - Core profile
2. ✅ `test-wizard-explorer-profile.sh` - Explorer profile
3. ✅ `test-wizard-prod-profile.sh` - Production profile
4. ✅ `test-wizard-archive-profile.sh` - Archive profile
5. ✅ `test-wizard-mining-profile.sh` - Mining profile
6. ✅ `test-wizard-development-profile.sh` - Development profile

## Fixes Applied

### 1. Frontend Element Selectors ✅

**Issue**: Tests were looking for `id="wizard-container"` but HTML uses `class="wizard-container"`

**Fix Applied**:
```bash
# Changed from:
if echo "$html" | grep -q 'id="wizard-container"'

# Changed to:
if echo "$html" | grep -q 'class="wizard-container"'
```

**Also fixed**:
```bash
# Changed from:
if echo "$html" | grep -q 'class="wizard-steps"'

# Changed to:
if echo "$html" | grep -q 'class="progress-steps"'
```

**Files**: All 6 profile tests

### 2. Verbose Output to stderr ✅

**Issue**: Verbose output was going to stdout and polluting JSON responses

**Fix Applied**:
```bash
# Changed from:
verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1"
    fi
}

# Changed to:
verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1" >&2
    fi
}
```

**Files**: All 6 profile tests

### 3. Profiles API Response Parsing ✅

**Issue**: API returns `{profiles: [...]}` but tests expected plain array

**Fix Applied**:
```bash
# Changed from:
local profile_exists=$(echo "$result" | jq -r '.[] | select(.id=="PROFILE") | .id'

# Changed to:
local profile_exists=$(echo "$result" | jq -r '.profiles[]? // .[] | select(.id=="PROFILE") | .id'
```

**Files**: All 6 profile tests

### 4. Config Generation Request Format ✅

**Issue**: API expects `{config: {...}, profiles: [...]}` structure

**Fix Applied**:
```bash
# Changed from:
local config_data='{
  "profiles": ["PROFILE"],
  "externalIp": "127.0.0.1",
  "publicNode": false,
  "customEnv": {}
}'

# Changed to:
local config_data='{
  "config": {
    "EXTERNAL_IP": "127.0.0.1",
    "PUBLIC_NODE": false,
    "POSTGRES_PASSWORD": "test_password_123"
  },
  "profiles": ["PROFILE"]
}'
```

**Files**: All 6 profile tests

### 5. Config Response Field Name ✅

**Issue**: API returns `content` not `envContent`

**Fix Applied**:
```bash
# Changed from:
local env_content=$(echo "$result" | jq -r '.envContent'

# Changed to:
local env_content=$(echo "$result" | jq -r '.content'
```

**Files**: All 6 profile tests

### 6. Installation Flow ✅

**Issue**: Tests were polling non-existent `/api/install/status` endpoint

**Fix Applied**:
```bash
# Changed from:
local install_result=$(test_api "POST" "/api/install/start" 200 '{}')
# ... poll /api/install/status

# Changed to:
local install_result=$(test_api "POST" "/api/install/start" 200 "$config_data")
local deploy_result=$(test_api "POST" "/api/install/deploy" 200 '{"profiles":["PROFILE"]}')
# ... check Docker containers directly
if sudo docker ps --format '{{.Names}}' | grep -q "CONTAINER_NAME"; then
```

**Files**: All 6 profile tests

### 7. Container Names for Verification

Each profile now checks for the correct container:
- **Core**: `kaspa-node`
- **Explorer**: `timescaledb`
- **Production**: `kasia`
- **Archive**: `archive-db`
- **Mining**: `kaspa-stratum`
- **Development**: `portainer`

## Verification

All fixes verified:
```bash
✅ Frontend selectors: 6/6 files
✅ Verbose to stderr: 6/6 files
✅ Profiles API parsing: 6/6 files
✅ Config format: 6/6 files
✅ Deploy endpoint: 6/6 files
✅ Container checks: 6/6 files
```

## Tests Ready to Run

All 6 profile tests are now ready to run with Docker:

```bash
# Run individual tests
sudo ./test-wizard-core-profile.sh --verbose
sudo ./test-wizard-explorer-profile.sh --verbose
sudo ./test-wizard-prod-profile.sh --verbose
sudo ./test-wizard-archive-profile.sh --verbose
sudo ./test-wizard-mining-profile.sh --verbose
sudo ./test-wizard-development-profile.sh --verbose
```

## Expected Results

Based on Core profile test success:
- All tests should pass
- Services should deploy correctly
- Containers should start and run
- Dashboard should be accessible
- Test duration: 20-60 seconds per profile (depending on size)

## Next Steps

1. ✅ Fixes applied to all profile tests
2. ⏭️ Run Explorer profile test
3. ⏭️ Run Production profile test
4. ⏭️ Run Archive profile test
5. ⏭️ Run Mining profile test
6. ⏭️ Run Development profile test
7. ⏭️ Document results
8. ⏭️ Create master test script

## Reference

- Core Profile Test Success: `test-wizard-core-profile.sh` (10/10 tests passed)
- Docker Environment: Docker v28.2.2, Docker Compose v2.37.1
- Test Readiness: `docs/implementation-summaries/testing/DOCKER_TEST_READINESS.md`
- Task List: `.kiro/specs/test-release/tasks.md` (Task 2.10)
