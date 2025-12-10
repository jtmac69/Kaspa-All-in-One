# Enhanced Cleanup Quick Reference

## Overview
The enhanced cleanup script provides comprehensive container state cleanup to ensure testers get a truly clean start every time.

## Quick Start

### Standard Cleanup
```bash
./cleanup-test.sh
```

### What Gets Cleaned
- ✅ Wizard processes and logs
- ✅ Running Docker containers
- ✅ Stuck containers (Created state)
- ✅ Failed containers (Exited state)
- ✅ Orphaned networks
- ✅ Temporary files and configuration
- ✅ Optional: Docker volumes and images

## Interactive Options

### Volume Cleanup
```
Remove Docker volumes? This will delete all container data. (y/N)
```
- **Y**: Complete data reset (blockchain data, logs, etc.)
- **N**: Preserve data for faster restart

### Network Cleanup
```
Remove Kaspa networks? (y/N)
```
- **Y**: Clean up all Kaspa-related networks
- **N**: Keep networks (usually safe)

### Image Cleanup
```
Remove unused Kaspa images? This will force rebuild on next start. (y/N)
```
- **Y**: Force fresh build (slower but cleanest)
- **N**: Keep images for faster startup

### Force Container Removal
```
Force remove ALL remaining Kaspa containers? (y/N)
```
- **Y**: Nuclear option - removes everything
- **N**: Keep containers that might be needed

## Troubleshooting

### Installation Still Fails After Cleanup?

1. **Run cleanup again with force options**:
   ```bash
   ./cleanup-test.sh
   # Answer Y to all prompts for complete reset
   ```

2. **Check for running processes**:
   ```bash
   docker ps -a | grep kaspa
   ```

3. **Manual container removal**:
   ```bash
   docker stop $(docker ps -aq --filter "name=kaspa-")
   docker rm $(docker ps -aq --filter "name=kaspa-")
   ```

### Docker Issues?

1. **Restart Docker daemon**:
   ```bash
   sudo systemctl restart docker
   ```

2. **Check Docker status**:
   ```bash
   docker system df
   docker system prune
   ```

### Still Having Problems?

1. **Check system resources**:
   ```bash
   df -h          # Disk space
   free -h        # Memory
   docker info    # Docker status
   ```

2. **Complete Docker reset** (nuclear option):
   ```bash
   docker system prune -a --volumes
   ```

## What's New in Enhanced Cleanup

### Before (Original)
- Stopped running containers only
- Basic file cleanup
- Could leave stuck containers

### After (Enhanced)
- ✅ Detects and removes stuck containers
- ✅ Cleans up failed containers with exit codes
- ✅ Removes orphaned networks
- ✅ Optional image cleanup
- ✅ Better error reporting
- ✅ Interactive cleanup options

### Specific Improvements
1. **Container State Detection**: Finds containers in Created, Exited, and other states
2. **Network Management**: Cleans up networks from previous installations
3. **Image Management**: Optional removal for fresh builds
4. **Better Feedback**: Shows what's being cleaned and why
5. **Flexible Options**: Choose what to clean based on your needs

## Best Practices

### For Regular Testing
```bash
./cleanup-test.sh
# Choose N for volumes to keep data
# Choose Y for networks (safe to remove)
# Choose N for images (faster restart)
```

### For Fresh Start Testing
```bash
./cleanup-test.sh
# Choose Y for everything (complete reset)
```

### For Debugging Issues
```bash
./cleanup-test.sh
# Choose Y for volumes and images
# This forces complete rebuild
```

## Success Indicators

### Clean Completion
```
Enhanced cleanup completed successfully!

The cleanup process has:
  ✓ Stopped all running services
  ✓ Removed stuck and failed containers
  ✓ Cleaned up orphaned networks
  ✓ Removed temporary files and logs
  ✓ Ensured a clean state for fresh installation

Your system is now ready for a fresh test installation.
```

### Ready for Testing
After successful cleanup:
```bash
./start-test.sh
```

## Common Scenarios

### Scenario 1: Quick Test Restart
- **Goal**: Restart testing quickly
- **Cleanup**: Keep volumes and images
- **Time**: ~30 seconds

### Scenario 2: Fresh Installation Test
- **Goal**: Test like a new user
- **Cleanup**: Remove everything
- **Time**: ~2-3 minutes (includes rebuild)

### Scenario 3: Debugging Installation Issues
- **Goal**: Eliminate all variables
- **Cleanup**: Nuclear option - remove all containers, networks, images
- **Time**: ~5 minutes (complete rebuild)

### Scenario 4: Testing Different Profiles
- **Goal**: Switch between profiles cleanly
- **Cleanup**: Remove containers and networks, keep images
- **Time**: ~1 minute

## Tips

- **Always run cleanup** before reporting installation issues
- **Use volume removal** when testing data persistence
- **Keep images** for faster development cycles
- **Remove images** when testing build processes
- **Check the summary** to confirm what was cleaned

The enhanced cleanup ensures you can always start fresh and eliminates the container conflicts that previously caused installation failures.