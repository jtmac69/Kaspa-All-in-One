# Task 6.2: Test Release Package Update

## Date
December 5, 2025

## Summary

Created a new test release package (v0.9.0-test) with critical fixes for Core profile installation.

## Issues Fixed

### 1. Core Profile Validation Error
**Problem:** Installation wizard was expecting `kaspa-nginx` to be running for Core profile, but nginx is assigned to the `kaspa-user-applications` profile in docker-compose.yml.

**Fix:** Updated `services/wizard/backend/src/utils/docker-manager.js`:
- Removed `'kaspa-nginx'` from core profile validation
- Added `'kaspa-nginx'` to kaspa-user-applications profile validation

### 2. Missing Plain Language Content File
**Problem:** Wizard failed to start due to missing `plain-language-content.json` file.

**Fix:** Created `services/wizard/backend/src/data/plain-language-content.json` with profile descriptions and UI content.

## Files Modified

1. **services/wizard/backend/src/utils/docker-manager.js**
   - Fixed `validateServices()` method to correctly map profiles to container names

2. **services/wizard/backend/src/data/plain-language-content.json** (NEW)
   - Added profile descriptions and benefits
   - Added system requirement messages
   - Added UI text content

## Release Package Details

- **Filename:** `kaspa-aio-v0.9.0-test.tar.gz`
- **Size:** 1.8M
- **SHA256:** `b454b806b4e59237b9a2c9a337d25a6d98c10ed4c0578782bc041adca35ecd9a`
- **Checksum File:** `kaspa-aio-v0.9.0-test.tar.gz.sha256`

## Build Process

Created automated build script `build-test-release.sh` that:
1. Creates temporary build directory
2. Copies all necessary files (excluding .git, node_modules, logs, etc.)
3. Creates compressed archive
4. Generates SHA256 checksum
5. Cleans up temporary files

## Testing Instructions

1. Remove old test directory:
   ```bash
   rm -rf ~/test-kaspa-release/kaspa-aio-v0.9.0-test
   ```

2. Extract new package:
   ```bash
   cd ~/test-kaspa-release
   tar -xzf kaspa-aio-v0.9.0-test.tar.gz
   cd kaspa-aio-v0.9.0-test
   ```

3. Start wizard:
   ```bash
   ./start-test.sh
   ```

4. Test Core profile installation through web interface at http://localhost:3000

## Expected Results

- ✅ Wizard starts successfully without errors
- ✅ Core profile installation completes successfully
- ✅ Only `kaspa-node` container is validated and running
- ✅ nginx does NOT start (correct behavior for Core profile)
- ✅ Installation validation passes

## Related Documents

- `docs/implementation-summaries/tasks/TASK_6.2_CORE_PROFILE_VALIDATION_FIX.md` - Detailed fix explanation
- `docs/implementation-summaries/tasks/TASK_6.1_START_TEST_FIX.md` - Previous test fixes
- `.kiro/specs/test-release/tasks.md` - Test release task list

## Next Steps

1. User extracts and tests new package
2. Verify Core profile installation works
3. Continue with other profile testing (Production, Explorer, etc.)
4. Document any additional issues found
