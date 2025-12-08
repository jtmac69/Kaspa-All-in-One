# Task 6.2: Kaspa User Applications Testing Documentation Alignment

## Overview

Updated TESTING.md Scenario 2 (Kaspa User Applications Profile) to accurately reflect the current wizard configuration interface and installed services.

## Problem

The TESTING.md documentation for Scenario 2 was outdated and didn't match the actual wizard implementation:

1. **Step 4** described choosing between "Use public indexers" vs "Use local indexers" - this UI doesn't exist
2. **Step 5** described application-specific configuration (ports, network selection) - these fields don't exist for this profile
3. **Step 6** referenced "Using public indexers" in the review - this isn't how it's displayed
4. **Step 8-9** referenced the management dashboard and Kaspa node - neither are included in this profile

## Actual Configuration

The kaspa-user-applications profile configuration only includes:

### Basic Configuration
- **Kasia Indexer URL**: `https://api.kasia.io/` (default)
- **K-Social Indexer URL**: `https://indexer.kaspatalk.net/` (default)
- **Kaspa Node WebSocket URL**: `wss://api.kasia.io/ws` (default)

### Advanced Configuration (Optional)
- **Custom Environment Variables**: Textarea for advanced users

### Services Installed
- Kasia app
- K-Social app
- Nginx (reverse proxy)

**Note**: This profile does NOT include:
- Local Kaspa node
- Management dashboard (not in test release)
- Application-specific port configuration
- Network selection (uses remote services)

## Changes Made

### Step 4: Indexer Configuration → Indexer Endpoint Configuration

**Before**: Described choosing between public vs local indexers with a selection UI

**After**: Describes the actual configuration fields:
- Three URL fields for indexer endpoints
- Default public URLs pre-filled
- Explanation of what each URL does
- Guidance to use defaults for testing

### Step 5: Application Configuration → Advanced Options

**Before**: Described application-specific settings (ports, network selection)

**After**: Describes the actual advanced options:
- Optional "Advanced Options" section
- Custom Environment Variables field
- Guidance to skip for basic testing

### Step 6: Review and Confirm

**Before**: Referenced "Using public indexers" and listed Kaspa node as installed service

**After**: Shows actual review content:
- Lists correct services (Kasia, K-Social, Nginx)
- Shows indexer endpoint URLs in review
- Removed reference to Kaspa node

### Step 8: Installation Complete

**Before**: Listed dashboard and Kaspa node RPC endpoint

**After**: Shows actual completion screen:
- Links to Kasia and K-Social apps
- Note that dashboard is not included in test release
- Guidance to use Docker commands for service status

### Step 9: Verify Dashboard Access → Verify Services with Docker

**Before**: Described using the management dashboard to check services

**After**: Describes using Docker commands:
- `docker ps` to check running containers
- Expected containers: kasia-app, k-social, nginx
- How to check logs with `docker logs`
- Note about dashboard not being included

### Additional Updates

1. **Scenario intro note**: Clarified that apps connect to public indexer endpoints
2. **"What's Different from Core Profile?"**: Corrected to explain this profile doesn't include local node
3. **Step 3 description**: Clarified what services are actually included

## Testing Impact

These changes ensure testers:
- See accurate step-by-step instructions matching the actual wizard
- Understand what configuration fields to expect
- Know which services will be installed
- Can verify installation without the dashboard
- Have correct expectations about the profile's capabilities

## Files Modified

- `TESTING.md` - Updated Scenario 2 steps 4-9

## Verification

To verify these changes are accurate:

1. Run the wizard: `./start-test.sh`
2. Select "Kaspa User Applications" profile
3. Observe configuration page matches Step 4 description
4. Complete installation and verify services match documentation
5. Use Docker commands to verify services as described in Step 9

## Related Documentation

- Configuration fields: `services/wizard/backend/src/config/configuration-fields.js`
- Profile definitions: Check wizard backend for profile service lists
- Previous fixes: `TASK_6.2_KASPA_USER_APPLICATIONS_CONFIG_FIX.md`
