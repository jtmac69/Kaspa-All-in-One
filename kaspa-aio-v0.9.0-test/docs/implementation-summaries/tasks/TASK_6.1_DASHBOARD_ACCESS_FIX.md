# Task 6.1: Dashboard Access Instructions Fix

## Date
December 5, 2025

## Issue Description

The TESTING.md file instructs testers to access the dashboard at `http://localhost:8080` after installation, but the dashboard is **host-based** (not containerized) and must be started manually. This causes confusion when testers try to access it and find nothing running.

## Root Cause

The Management Dashboard was changed from a containerized service to a host-based application (see `.kiro/specs/management-dashboard/design.md`). The dashboard runs directly on the host system using systemd or manual startup, not as a Docker container.

### Why Host-Based?

1. **Self-Monitoring Paradox**: A containerized dashboard cannot monitor Docker issues
2. **Full System Access**: Needs direct access to Docker daemon and system resources
3. **Independent Operation**: Can report Docker daemon issues and restart Docker if needed
4. **Security**: No need to mount Docker socket into a container

## Current State

TESTING.md has 30+ references to accessing the dashboard at `http://localhost:8080`, but:
- Dashboard is NOT started automatically during installation
- Dashboard is NOT a Docker container
- Dashboard must be started manually by the user
- Dashboard startup instructions are missing from TESTING.md

## Solution

### Option 1: Remove Dashboard from Test Release (RECOMMENDED)

Since the dashboard is still in development and not essential for testing the core functionality, we should:

1. **Remove all dashboard references from TESTING.md**
2. **Update task 6.1 to remove "Access dashboard" sub-task**
3. **Add note in KNOWN_ISSUES.md** that dashboard is not included in test release
4. **Focus testing on**:
   - Installation wizard functionality
   - Service deployment (kaspa-node, apps, indexers)
   - Docker container management
   - Configuration and reconfiguration

### Option 2: Add Dashboard Startup Instructions

If we want to include the dashboard in testing:

1. **Add dashboard startup section to TESTING.md**:
   ```markdown
   ### Starting the Management Dashboard (Optional)
   
   The dashboard is a host-based application that must be started separately:
   
   ```bash
   cd services/dashboard
   npm install
   npm start
   ```
   
   Then access at: http://localhost:8080
   ```

2. **Update all dashboard references** to note it's optional
3. **Add troubleshooting** for dashboard startup issues
4. **Test dashboard functionality** thoroughly before release

## Recommendation

**Go with Option 1** for the test release because:

- Dashboard is not critical for testing core functionality
- Adds complexity to test instructions
- May have bugs that distract from main testing goals
- Can be added in a later test release once fully stable
- Testers can focus on wizard, installation, and service deployment

## Files to Update

### If Option 1 (Remove Dashboard):

1. **TESTING.md**
   - Remove all references to `http://localhost:8080`
   - Remove "Access dashboard" steps from all scenarios
   - Remove dashboard from port requirements
   - Update service verification steps to use `docker ps` instead

2. **.kiro/specs/test-release/tasks.md**
   - Remove "Access dashboard" from task 6.1
   - Update task description

3. **KNOWN_ISSUES.md**
   - Add note: "Management Dashboard is not included in this test release. Use `docker ps` and `docker logs` to monitor services."

### If Option 2 (Include Dashboard):

1. **TESTING.md**
   - Add "Starting the Dashboard" section
   - Mark all dashboard steps as "(Optional)"
   - Add dashboard startup troubleshooting

2. **services/dashboard/README.md**
   - Add clear startup instructions
   - Add prerequisites (Node.js, npm)
   - Add troubleshooting section

3. **start-test.sh**
   - Optionally add dashboard startup
   - Or add note about manual dashboard startup

## Impact

### Option 1 Impact:
- ✅ Simpler test instructions
- ✅ Fewer potential issues for testers
- ✅ Focus on core functionality
- ❌ No dashboard testing in this release

### Option 2 Impact:
- ✅ Dashboard gets tested
- ✅ More complete system testing
- ❌ More complex instructions
- ❌ Additional support burden
- ❌ Potential dashboard bugs distract from core testing

## Next Steps

1. **Decide**: Option 1 (remove) or Option 2 (include)?
2. **Update files** based on decision
3. **Test instructions** by following them
4. **Rebuild test package** with updated documentation
5. **Retest** to verify instructions are clear

## Related Documents

- `.kiro/specs/management-dashboard/design.md` - Dashboard architecture
- `TESTING.md` - Test instructions
- `KNOWN_ISSUES.md` - Known limitations
- `.kiro/specs/test-release/tasks.md` - Test release tasks
