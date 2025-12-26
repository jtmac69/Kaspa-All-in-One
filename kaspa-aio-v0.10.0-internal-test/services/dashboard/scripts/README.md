# Dashboard Management Scripts

This directory contains management scripts for the Kaspa Management Dashboard.

## Scripts Overview

### uninstall.sh
Comprehensive uninstall script that completely removes the Management Dashboard from the system.

**Features:**
- Interactive confirmation with safety prompts
- Dry-run mode to preview what would be removed
- Optional backup creation before removal
- Force mode for automated uninstallation
- Complete cleanup of service, user, files, and configuration
- Verification of successful removal

**Usage:**
```bash
# Interactive uninstall
sudo ./uninstall.sh

# Dry run (preview only)
sudo ./uninstall.sh --dry-run

# Force uninstall without confirmation
sudo ./uninstall.sh --force

# Create backup before uninstall
sudo ./uninstall.sh --backup

# Show help
./uninstall.sh --help
```

**Environment Variables:**
- `FORCE_UNINSTALL=true` - Skip confirmation prompt
- `CREATE_BACKUP=true` - Create backup before removal

### update.sh
Comprehensive update script that updates the Management Dashboard to the latest version.

**Features:**
- Automatic backup creation before update
- Multiple update sources (Git repository, local directory)
- Dependency management and service restart
- Rollback capability on failure
- Comprehensive logging and error handling
- Update verification and health checks

**Usage:**
```bash
# Update from default repository
sudo ./update.sh

# Update from local directory
sudo ./update.sh --source /path/to/kaspa-aio

# Update from specific Git repository and branch
sudo ./update.sh --repo https://github.com/user/kaspa-aio.git --branch develop

# Skip backup creation
sudo ./update.sh --skip-backup

# Disable automatic rollback on failure
sudo ./update.sh --no-rollback

# Show help
./update.sh --help
```

**Environment Variables:**
- `UPDATE_SOURCE=PATH` - Local directory path for updates
- `UPDATE_REPO=URL` - Git repository URL
- `UPDATE_BRANCH=NAME` - Git branch name (default: main)
- `SKIP_BACKUP=true` - Skip backup creation
- `NO_ROLLBACK=true` - Disable automatic rollback

## Integration with Installation Script

The main installation script (`install.sh`) has been updated to:

1. **Setup Management Scripts**: Ensures all scripts have correct permissions and ownership
2. **Create Convenience Symlinks**: Creates `uninstall.sh` and `update.sh` symlinks in the dashboard home directory
3. **Enhanced Uninstall Handling**: Uses the comprehensive uninstall script instead of the basic one
4. **Update Support**: Added `--update` option to the installation script

**Installation Script Usage:**
```bash
# Install dashboard
sudo ./install.sh

# Uninstall dashboard (uses comprehensive script)
sudo ./install.sh --uninstall

# Update dashboard (uses update script)
sudo ./install.sh --update

# Update with specific options
sudo ./install.sh --update --source /path/to/source
```

## Safety Features

### Uninstall Script Safety
- **Confirmation Required**: Interactive confirmation before removal
- **Dry Run Mode**: Preview what would be removed without doing it
- **Backup Option**: Create final backup before removal
- **Force Mode**: Skip confirmation for automated scenarios
- **Verification**: Verify complete removal after uninstall

### Update Script Safety
- **Automatic Backup**: Creates timestamped backup before update
- **Prerequisite Checks**: Validates system requirements before proceeding
- **Rollback Capability**: Automatically rollback on failure
- **Service Management**: Properly stops and starts services
- **Update Verification**: Validates successful update completion

## File Locations

After installation, the scripts are available at:
- `/opt/kaspa-dashboard/scripts/uninstall.sh` (comprehensive)
- `/opt/kaspa-dashboard/scripts/update.sh` (comprehensive)
- `/opt/kaspa-dashboard/uninstall.sh` (symlink to comprehensive script)
- `/opt/kaspa-dashboard/update.sh` (symlink to comprehensive script)

## Logging

### Update Script Logging
- **Update Log**: `/opt/kaspa-dashboard/logs/update.log`
- **Update History**: `/opt/kaspa-dashboard/logs/update_history.log`
- **Systemd Journal**: All operations logged to systemd journal

### Backup Management
- **Backup Directory**: `/opt/kaspa-dashboard/backups/`
- **Backup Format**: `dashboard_backup_YYYYMMDD_HHMMSS.tar.gz`
- **Retention**: Keeps last 10 backups automatically
- **Backup Contents**: Configuration, logs, custom files

## Error Handling

Both scripts include comprehensive error handling:
- **Root Privilege Checks**: Ensure scripts run with proper permissions
- **Prerequisite Validation**: Check for required tools and dependencies
- **Service State Management**: Properly handle service states
- **Cleanup on Failure**: Clean up partial operations on error
- **User-Friendly Messages**: Clear error messages and troubleshooting guidance

## Testing

The scripts include comprehensive test coverage:
- **File Existence**: Verify scripts exist and are executable
- **Content Validation**: Check for required functions and features
- **Configuration Consistency**: Ensure consistent configuration across scripts
- **Safety Features**: Validate safety mechanisms and error handling
- **Integration**: Test integration with installation script

Run tests with:
```bash
npm test -- --testPathPattern=uninstall-update-scripts.test.js
```

## Requirements Compliance

These scripts fulfill the requirements from task 7.4:
- ✅ **Create uninstall script to remove service and files**
- ✅ **Create update script to pull latest code and restart**
- ✅ **Add backup before update functionality**
- ✅ **All deployment requirements covered**

The implementation provides enterprise-grade management capabilities with comprehensive safety features, logging, and error handling suitable for production deployments.