# Docker Permissions Setup

## Overview

The Kaspa All-in-One wizard and management tools require access to the Docker daemon to manage containers. This requires the user to be a member of the `docker` group.

## Why This Is Required

The Docker daemon socket (`/var/run/docker.sock`) is owned by `root:docker` with permissions that only allow:
- The `root` user
- Members of the `docker` group

The wizard needs Docker access to:
- Start and stop containers
- Check running services
- Execute `docker compose` commands
- Monitor container health
- Restart services after reconfiguration

## Setup Instructions

### Linux (Ubuntu, Debian, CentOS, etc.)

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Verify the change was made
getent group docker

# Log out and log back in for the change to take effect
# OR use newgrp to activate the group in current shell:
newgrp docker

# Verify Docker access works
docker ps
```

### macOS

Docker Desktop for Mac handles permissions automatically. No additional setup required.

### Windows (WSL2)

```bash
# In your WSL2 terminal
sudo usermod -aG docker $USER

# Restart WSL2 or log out and back in
wsl --shutdown
# Then reopen WSL2 terminal

# Verify Docker access
docker ps
```

## Verification

After adding yourself to the docker group, verify it works:

```bash
# Check group membership
groups

# Should include 'docker' in the output
# Example: jtmac adm cdrom sudo dip plugdev docker users

# Test Docker access (should not require sudo)
docker ps

# Should show running containers or empty list (not permission error)
```

## Troubleshooting

### "Permission denied" error when running docker commands

**Symptom**:
```
permission denied while trying to connect to the Docker daemon socket
```

**Solution**:
1. Verify you're in the docker group: `groups`
2. If not listed, add yourself: `sudo usermod -aG docker $USER`
3. Log out and back in (or use `newgrp docker`)
4. Test again: `docker ps`

### Group membership shows but still getting permission errors

**Cause**: Group changes don't take effect in current shell session

**Solution**:
```bash
# Option 1: Log out and back in (recommended)
exit
# Then log back in

# Option 2: Start new shell with docker group
newgrp docker

# Option 3: Restart your terminal/IDE
```

### Docker socket doesn't exist

**Symptom**:
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution**:
1. Check if Docker is installed: `docker --version`
2. Check if Docker is running: `sudo systemctl status docker`
3. Start Docker if needed: `sudo systemctl start docker`
4. Enable Docker to start on boot: `sudo systemctl enable docker`

## Security Considerations

### Why Docker Group = Root Access

⚠️ **Important**: Being in the `docker` group is equivalent to having root access because:
- Docker containers can mount any host directory
- Containers can run as root
- Docker socket access allows container escape

### Best Practices

1. **Only add trusted users** to the docker group
2. **Use rootless Docker** for production environments (optional)
3. **Audit docker group membership** regularly
4. **Consider alternatives** for production:
   - Run wizard as a Docker container with socket access
   - Use Docker's rootless mode
   - Implement additional access controls

### Production Deployment

For production environments, consider:

```yaml
# docker-compose.yml
services:
  wizard:
    image: kaspa-wizard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # Read-only access
    user: "1000:127"  # Run as specific user:docker-group
```

This gives the wizard container Docker access without requiring the host user to be in the docker group.

## Automated Setup

The wizard can detect missing Docker permissions and guide users through setup:

```javascript
// Pseudo-code for wizard check
async function checkDockerAccess() {
  try {
    await docker.ping();
    return { hasAccess: true };
  } catch (error) {
    if (error.code === 'EACCES') {
      return {
        hasAccess: false,
        reason: 'permission-denied',
        solution: 'Add user to docker group',
        command: 'sudo usermod -aG docker $USER'
      };
    }
  }
}
```

## Related Documentation

- [README.md](../../README.md) - Pre-installation checklist
- [Reconfiguration Mode Quick Reference](./RECONFIGURATION_MODE_QUICK_REFERENCE.md)
- [Wizard Testing Guide](../../docs/wizard-testing-guide.md)

## Summary

**Required for**:
- ✅ Running the installation wizard
- ✅ Using reconfiguration mode
- ✅ Managing services via wizard
- ✅ Running automated tests

**Setup command**:
```bash
sudo usermod -aG docker $USER
# Then log out and back in
```

**Verification**:
```bash
docker ps  # Should work without sudo
```
