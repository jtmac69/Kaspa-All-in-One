# Kaspa Dashboard Service Management

This document provides comprehensive instructions for managing the Kaspa Management Dashboard systemd service.

## Service Overview

- **Service Name**: `kaspa-dashboard`
- **Service File**: `/etc/systemd/system/kaspa-dashboard.service`
- **User**: `kaspa-dashboard`
- **Working Directory**: `/opt/kaspa-dashboard`
- **Port**: `8080` (configurable)
- **Dependencies**: `network.target`, `docker.service` (optional)

## Basic Service Commands

### Starting and Stopping

```bash
# Start the service
sudo systemctl start kaspa-dashboard

# Stop the service
sudo systemctl stop kaspa-dashboard

# Restart the service
sudo systemctl restart kaspa-dashboard

# Reload configuration without stopping
sudo systemctl reload kaspa-dashboard
```

### Service Status

```bash
# Check service status
sudo systemctl status kaspa-dashboard

# Check if service is active
sudo systemctl is-active kaspa-dashboard

# Check if service is enabled
sudo systemctl is-enabled kaspa-dashboard

# Show service properties
sudo systemctl show kaspa-dashboard
```

### Auto-Start Configuration

```bash
# Enable auto-start on boot
sudo systemctl enable kaspa-dashboard

# Disable auto-start on boot
sudo systemctl disable kaspa-dashboard

# Enable and start immediately
sudo systemctl enable --now kaspa-dashboard

# Disable and stop immediately
sudo systemctl disable --now kaspa-dashboard
```

## Log Management

### Viewing Logs

```bash
# View recent logs
sudo journalctl -u kaspa-dashboard

# Follow logs in real-time
sudo journalctl -u kaspa-dashboard -f

# View logs from last boot
sudo journalctl -u kaspa-dashboard -b

# View logs with timestamps
sudo journalctl -u kaspa-dashboard -o short-iso

# View logs from specific time
sudo journalctl -u kaspa-dashboard --since "2024-01-01 00:00:00"
sudo journalctl -u kaspa-dashboard --since "1 hour ago"

# View last N lines
sudo journalctl -u kaspa-dashboard -n 100

# View logs in reverse order (newest first)
sudo journalctl -u kaspa-dashboard -r
```

### Log Filtering

```bash
# Filter by priority level
sudo journalctl -u kaspa-dashboard -p err    # Errors only
sudo journalctl -u kaspa-dashboard -p warning # Warnings and above
sudo journalctl -u kaspa-dashboard -p info   # Info and above

# Search for specific text
sudo journalctl -u kaspa-dashboard | grep "ERROR"
sudo journalctl -u kaspa-dashboard | grep -i "websocket"

# Export logs to file
sudo journalctl -u kaspa-dashboard > dashboard-logs.txt
sudo journalctl -u kaspa-dashboard --since "today" > today-logs.txt
```

### Log Rotation

The service uses systemd's journal for logging, which automatically rotates logs. Configuration:

```bash
# Check journal disk usage
sudo journalctl --disk-usage

# Clean old logs (keep last 2 weeks)
sudo journalctl --vacuum-time=2weeks

# Clean old logs (keep max 500MB)
sudo journalctl --vacuum-size=500M

# Verify journal integrity
sudo journalctl --verify
```

## Configuration Management

### Environment Variables

The service loads configuration from `/opt/kaspa-dashboard/.env`:

```bash
# Edit configuration
sudo nano /opt/kaspa-dashboard/.env

# Validate configuration syntax
sudo -u kaspa-dashboard node -e "require('dotenv').config({path:'/opt/kaspa-dashboard/.env'}); console.log('Config OK')"

# Restart after configuration changes
sudo systemctl restart kaspa-dashboard
```

### Service File Modifications

If you need to modify the systemd service file:

```bash
# Edit service file
sudo systemctl edit kaspa-dashboard

# Or edit the main file directly (not recommended)
sudo nano /etc/systemd/system/kaspa-dashboard.service

# Reload systemd configuration
sudo systemctl daemon-reload

# Restart service with new configuration
sudo systemctl restart kaspa-dashboard
```

## Troubleshooting

### Service Won't Start

1. **Check service status and logs**:
   ```bash
   sudo systemctl status kaspa-dashboard
   sudo journalctl -u kaspa-dashboard -n 50
   ```

2. **Common issues and solutions**:

   **Missing .env file**:
   ```bash
   sudo cp /opt/kaspa-dashboard/.env.template /opt/kaspa-dashboard/.env
   sudo chown kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard/.env
   ```

   **Permission issues**:
   ```bash
   sudo chown -R kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard
   sudo chmod 755 /opt/kaspa-dashboard
   sudo chmod 600 /opt/kaspa-dashboard/.env
   ```

   **Port already in use**:
   ```bash
   # Find what's using the port
   sudo ss -tlnp | grep :8080
   
   # Change port in .env file
   sudo nano /opt/kaspa-dashboard/.env
   # Set: PORT=8081
   ```

   **Node.js not found**:
   ```bash
   # Check Node.js installation
   node --version
   which node
   
   # Update service file if Node.js is in different location
   sudo systemctl edit kaspa-dashboard
   ```

### Service Keeps Restarting

1. **Check restart configuration**:
   ```bash
   sudo systemctl show kaspa-dashboard | grep -E "(Restart|StartLimit)"
   ```

2. **View restart history**:
   ```bash
   sudo journalctl -u kaspa-dashboard | grep -E "(Started|Stopped|Failed)"
   ```

3. **Disable restart temporarily for debugging**:
   ```bash
   sudo systemctl edit kaspa-dashboard
   # Add:
   # [Service]
   # Restart=no
   
   sudo systemctl daemon-reload
   sudo systemctl restart kaspa-dashboard
   ```

### High Resource Usage

1. **Monitor resource usage**:
   ```bash
   # CPU and memory usage
   sudo systemctl status kaspa-dashboard
   
   # Detailed resource monitoring
   sudo systemd-cgtop
   
   # Process details
   ps aux | grep "node server.js"
   ```

2. **Adjust resource limits**:
   ```bash
   sudo systemctl edit kaspa-dashboard
   # Add:
   # [Service]
   # MemoryMax=256M
   # CPUQuota=25%
   
   sudo systemctl daemon-reload
   sudo systemctl restart kaspa-dashboard
   ```

### Docker Connection Issues

1. **Check Docker access**:
   ```bash
   # Test Docker access as dashboard user
   sudo -u kaspa-dashboard docker ps
   
   # Check group membership
   groups kaspa-dashboard
   
   # Add to docker group if missing
   sudo usermod -aG docker kaspa-dashboard
   ```

2. **Check Docker socket permissions**:
   ```bash
   ls -la /var/run/docker.sock
   # Should show: srw-rw---- 1 root docker
   ```

## Performance Monitoring

### Service Performance

```bash
# Service resource usage
sudo systemctl show kaspa-dashboard | grep -E "(CPUUsage|MemoryCurrent|TasksCurrent)"

# Detailed performance metrics
sudo systemd-analyze blame | grep kaspa-dashboard
sudo systemd-analyze critical-chain kaspa-dashboard

# Service startup time
sudo systemd-analyze time
```

### Application Performance

```bash
# Check application health endpoint
curl -s http://localhost:8080/health | jq

# Monitor WebSocket connections
curl -s http://localhost:8080/api/websocket/stats | jq

# Check performance statistics
curl -s http://localhost:8080/api/performance/stats | jq

# Monitor cache performance
curl -s http://localhost:8080/api/cache/stats | jq
```

## Security Management

### Service Security

The service runs with enhanced security settings:

- **User isolation**: Runs as dedicated `kaspa-dashboard` user
- **File system protection**: Limited read/write access
- **Network restrictions**: Controlled network access
- **Capability restrictions**: Minimal required capabilities
- **System call filtering**: Restricted system calls

### Security Verification

```bash
# Check service security settings
sudo systemctl show kaspa-dashboard | grep -E "(User|Group|NoNewPrivileges|ProtectSystem|PrivateTmp)"

# Verify file permissions
ls -la /opt/kaspa-dashboard/
ls -la /opt/kaspa-dashboard/.env

# Check process security
ps -eo pid,user,group,comm,label | grep kaspa-dashboard
```

### Security Updates

```bash
# Update Node.js dependencies
cd /opt/kaspa-dashboard
sudo -u kaspa-dashboard npm audit
sudo -u kaspa-dashboard npm audit fix

# Update system packages
sudo apt update && sudo apt upgrade  # Ubuntu/Debian
sudo yum update                      # CentOS/RHEL
```

## Backup and Recovery

### Configuration Backup

```bash
# Backup service configuration
sudo cp /etc/systemd/system/kaspa-dashboard.service /opt/kaspa-dashboard/backups/
sudo cp /opt/kaspa-dashboard/.env /opt/kaspa-dashboard/backups/

# Create full backup
sudo tar -czf dashboard-backup-$(date +%Y%m%d).tar.gz \
    /opt/kaspa-dashboard \
    /etc/systemd/system/kaspa-dashboard.service \
    /etc/logrotate.d/kaspa-dashboard
```

### Service Recovery

```bash
# Restore from backup
sudo systemctl stop kaspa-dashboard
sudo tar -xzf dashboard-backup-YYYYMMDD.tar.gz -C /
sudo systemctl daemon-reload
sudo systemctl start kaspa-dashboard
```

### Emergency Recovery

```bash
# Reset to default configuration
sudo systemctl stop kaspa-dashboard
sudo cp /opt/kaspa-dashboard/.env.template /opt/kaspa-dashboard/.env
sudo chown kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard/.env
sudo systemctl start kaspa-dashboard

# Reinstall service (if service file is corrupted)
cd /path/to/dashboard/source
sudo ./install.sh
```

## Advanced Operations

### Service Dependencies

```bash
# View service dependencies
sudo systemctl list-dependencies kaspa-dashboard
sudo systemctl list-dependencies --reverse kaspa-dashboard

# Check dependency status
sudo systemctl status network.target docker.service
```

### Custom Service Overrides

Create custom overrides without modifying the main service file:

```bash
# Create override directory
sudo mkdir -p /etc/systemd/system/kaspa-dashboard.service.d

# Create custom override
sudo tee /etc/systemd/system/kaspa-dashboard.service.d/custom.conf << EOF
[Service]
# Custom environment variables
Environment=CUSTOM_SETTING=value

# Custom resource limits
MemoryMax=1G
CPUQuota=75%

# Custom restart behavior
RestartSec=5
EOF

# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart kaspa-dashboard
```

### Service Monitoring Scripts

Create monitoring scripts for automated management:

```bash
# Health check script
cat > /opt/kaspa-dashboard/scripts/health-check.sh << 'EOF'
#!/bin/bash
if ! systemctl is-active --quiet kaspa-dashboard; then
    echo "Service is not running"
    exit 1
fi

if ! curl -sf http://localhost:8080/health > /dev/null; then
    echo "Health check failed"
    exit 1
fi

echo "Service is healthy"
EOF

chmod +x /opt/kaspa-dashboard/scripts/health-check.sh

# Auto-restart script
cat > /opt/kaspa-dashboard/scripts/auto-restart.sh << 'EOF'
#!/bin/bash
if ! /opt/kaspa-dashboard/scripts/health-check.sh; then
    echo "Restarting dashboard service..."
    systemctl restart kaspa-dashboard
    sleep 10
    if /opt/kaspa-dashboard/scripts/health-check.sh; then
        echo "Service restarted successfully"
    else
        echo "Service restart failed"
        exit 1
    fi
fi
EOF

chmod +x /opt/kaspa-dashboard/scripts/auto-restart.sh
```

## Integration with System Monitoring

### Systemd Integration

```bash
# Enable systemd watchdog
sudo systemctl edit kaspa-dashboard
# Add:
# [Service]
# WatchdogSec=30

# Monitor service with systemd
sudo systemctl enable systemd-watchdog
```

### Log Monitoring

```bash
# Monitor for errors in real-time
sudo journalctl -u kaspa-dashboard -f | grep -i error

# Set up log alerts (requires additional tools)
# Example with logwatch or fail2ban integration
```

## Quick Reference

### Essential Commands

```bash
# Service control
sudo systemctl start kaspa-dashboard     # Start
sudo systemctl stop kaspa-dashboard      # Stop  
sudo systemctl restart kaspa-dashboard   # Restart
sudo systemctl status kaspa-dashboard    # Status

# Logs
sudo journalctl -u kaspa-dashboard -f    # Follow logs
sudo journalctl -u kaspa-dashboard -n 50 # Last 50 lines

# Configuration
sudo nano /opt/kaspa-dashboard/.env      # Edit config
sudo systemctl daemon-reload            # Reload systemd

# Health check
curl http://localhost:8080/health        # Test endpoint
```

### Important Paths

- Service file: `/etc/systemd/system/kaspa-dashboard.service`
- Application: `/opt/kaspa-dashboard/`
- Configuration: `/opt/kaspa-dashboard/.env`
- Logs: `journalctl -u kaspa-dashboard`
- Backups: `/opt/kaspa-dashboard/backups/`

### Emergency Contacts

- Service logs: `sudo journalctl -u kaspa-dashboard -n 100`
- System status: `sudo systemctl status kaspa-dashboard`
- Process info: `ps aux | grep "node server.js"`
- Port check: `sudo ss -tlnp | grep :8080`