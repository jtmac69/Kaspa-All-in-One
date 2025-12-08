# Task 6.1: start-test.sh npm Install Fix

## Issue Found During Phase 6 Testing

**Date**: December 5, 2024  
**Phase**: 6.1 Smoke Test  
**Issue**: npm install failing with unclear error message

## The Problem

When running `./start-test.sh` from the extracted package, the script failed with:
```
Installing wizard dependencies...
Running npm install...
✗ Failed to install dependencies
If you see permission errors, try running:
  cd services/wizard/backend && npm install --omit=dev
```

## Root Cause

The error handling in `start-test.sh` was flawed:
```bash
if npm install --omit=dev --silent 2>&1 | grep -v "^npm WARN"; then
```

Issues:
1. `--silent` flag suppressed useful output
2. `grep -v "^npm WARN"` could cause the command to fail
3. No error log capture for debugging
4. Success detection was unreliable

## The Fix

Updated the npm install section to:
```bash
if npm install --omit=dev 2>&1 | tee /tmp/npm-install.log | grep -q "added\|up to date"; then
```

Improvements:
1. Removed `--silent` to see output
2. Added `tee` to capture log to `/tmp/npm-install.log`
3. Better success detection (looks for "added" or "up to date")
4. Shows last 20 lines of error log if install fails


## Issue 2: Nginx Restart Loop in Core Profile

**Severity**: HIGH - Service crash loop  
**Found During**: Phase 6.1 Smoke Test

### The Problem
When installing Core Profile, the nginx service was starting and entering a restart loop:
```
kaspa-nginx   nginx:alpine   Restarting (1) 41 seconds ago
```

### Root Cause
1. nginx service had NO profile specified in docker-compose.yml
2. This caused it to start with ALL profiles (including Core)
3. nginx.conf tries to proxy to `dashboard:8080` which doesn't exist in Core Profile
4. nginx crashes because upstream is unavailable
5. Docker restarts it (restart: unless-stopped)
6. Infinite restart loop

### The Fix
Added nginx to the `kaspa-user-applications` profile:
```yaml
nginx:
  # ... config ...
  profiles:
    - kaspa-user-applications
```

Now nginx only starts when user-facing applications are installed.

### Impact
- Core Profile: nginx won't start (correct - not needed)
- User Applications Profile: nginx will start (correct - needed for apps)
- No more restart loops
- Cleaner service status display

### Files Modified
- `docker-compose.yml` - Added profile to nginx service


## Issue 3: Permission Denied When Removing Logs

**Severity**: MEDIUM - Cleanup incomplete  
**Found During**: Phase 6.1 Smoke Test - Cleanup

### The Problem
When running `./cleanup-test.sh` and choosing to remove all data:
```
rm: cannot remove 'logs/kaspa-node': Permission denied
```

### Root Cause
1. Docker containers run as root
2. Log files in `logs/kaspa-node/` are created by Docker (owned by root)
3. Regular user cannot delete root-owned files
4. cleanup-test.sh tried to `rm -rf logs` without sudo

### The Fix
Updated cleanup-test.sh to:
1. Detect if logs directory needs sudo (check if writable)
2. Inform user that sudo is needed
3. Use `sudo rm -rf logs` when necessary
4. Provide helpful error message if sudo fails
5. Suggest manual cleanup command

### Impact
- Users can now fully clean up test installations
- Clear messaging about why sudo is needed
- Graceful handling if sudo is not available
- No leftover files after cleanup

### Files Modified
- `cleanup-test.sh` - Added sudo handling for Docker-owned files


## Issue 4: Ports Still in Use After Cleanup

**Severity**: MEDIUM - Prevents fresh installation  
**Found During**: Phase 6.1 Smoke Test - Second attempt

### The Problem
After running `cleanup-test.sh` and starting a new test, the wizard showed:
```
⚠ Port 16110 (Kaspa Node P2P) Port 16110 is already in use
⚠ Port 16111 (Kaspa Node RPC) Port 16111 is already in use
```

Containers from the previous test were still running.

### Root Cause
1. `cleanup-test.sh` uses `docker-compose down` to stop containers
2. This only works for containers in the CURRENT directory's docker-compose.yml
3. If testing from multiple directories, old containers remain running
4. No fallback to stop containers by name globally

### The Fix
Updated cleanup-test.sh to:
1. Stop containers using docker-compose (as before)
2. Check for ANY remaining kaspa-* containers system-wide
3. List them to the user
4. Ask if they should be stopped too (defaults to Yes)
5. Stop and remove them by name

### Impact
- Users can now fully clean up even when testing from multiple directories
- Prevents "port already in use" errors
- Clear visibility of what containers exist
- User control over cleanup scope

### Files Modified
- `cleanup-test.sh` - Added global container cleanup
