# Kaspa Dashboard Host-Based Deployment

This document describes how to deploy the Kaspa Management Dashboard as a host-based service using systemd.

## Overview

The Management Dashboard runs directly on the host system (not in a container) to provide:
- Full system access for Docker management
- Independent operation from Docker daemon
- Reliable monitoring even when Docker has issues
- Seamless integration with the Installation Wizard

## Prerequisites

- Linux system with systemd
- Root/sudo access
- Docker installed and running (for container management)
- Internet connection (for Node.js installation if needed)

## Supported Operating Systems

- Ubuntu 18.04+
- Debian 9+
- CentOS/RHEL 7+
- Fedora 30+
- Arch Linux

## Installation

### Automatic Installation

Run the installation script as root:

```bash
sudo ./install.sh
```

The script will:
1. Check system requirements
2. Install Node.js 16+ if needed
3. Create a dedicated `kaspa-dashboard` user
4. Install dashboard files to `/opt/kaspa-dashboard`
5. Install npm dependencies
6. Create systemd service configuration
7. Enable and start the service
8. Verify the installation

### Manual Installation

If you prefer manual installation:

1. **Install Node.js 16+**:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL/Fedora
   curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
   sudo yum install -y nodejs npm
   ```

2. **Create user and directories**:
   ```bash
   sudo useradd --system --home-dir /opt/kaspa-dashboard --create-home kaspa-dashboard
   sudo usermod -aG docker kaspa-dashboard
   ```

3. **Copy dashboard files**:
   ```bash
   sudo cp -r . /opt/kaspa-dashboard/
   sudo chown -R kaspa-dashboard:kaspa-dashboard /opt/kaspa-dashboard
   ```

4. **Install dependencies**:
   ```bash
   cd /opt/kaspa-dashboard
   sudo -u kaspa-dashboard npm ci --only=production
   ```

5. **Create systemd service** (see `install.sh` for service file content)

6. **Enable and start service**:
   ```bash
   sudo systemctl enable kaspa-dashboard
   sudo systemctl start kaspa-dashboard
   ```

## Configuration

### Environment Variables

Edit `/opt/kaspa-dashboard/.env`:

```bash
# Basic configuration
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# Security settings
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/TLS (optional)
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
FORCE_HTTPS=false

# Performance settings
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT=30000
```

### Service Configuration

The systemd service is configured with:
- Automatic restart on failure
- Security restrictions (NoNewPrivileges, ProtectSystem)
- Resource limits
- Proper logging to journald

## Service Management

### Basic Commands

```bash
# Start the service
sudo systemctl start kaspa-dashboard

# Stop the service
sudo systemctl stop kaspa-dashboard

# Restart the service
sudo systemctl restart kaspa-dashboard

# Check service status
sudo systemctl status kaspa-dashboard

# Enable auto-start on boot
sudo systemctl enable kaspa-dashboard

# Disable auto-start on boot
sudo systemctl disable kaspa-dashboard
```

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
```

### Log Files

Application logs are also written to:
- `/opt/kaspa-dashboard/logs/dashboard.log`
- Rotated daily, kept for 14 days

## Network Configuration

### Nginx Integration

The dashboard integrates with the existing Nginx container. Update your Nginx configuration to proxy to the host-based dashboard:

```nginx
upstream dashboard {
    server host.docker.internal:8080;
    server 172.17.0.1:8080 backup;  # Fallback for Linux
}

location /dashboard/ {
    proxy_pass http://dashboard/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### Firewall Configuration

If using a firewall, allow access to port 8080:

```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# firewalld (CentOS/RHEL/Fedora)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
```

## Security Considerations

### User Permissions

The dashboard runs as a dedicated `kaspa-dashboard` user with:
- No shell access (system user)
- Limited file system access
- Docker group membership (for container management)

### Network Security

- Dashboard binds to all interfaces (0.0.0.0) by default
- Use Nginx proxy for external access
- Configure CORS origins appropriately
- Enable HTTPS in production

### File Permissions

- Configuration files: 600 (owner read/write only)
- Log files: 644 (owner read/write, group/others read)
- Application files: 755 (standard executable permissions)

## Troubleshooting

### Service Won't Start

1. Check service status:
   ```bash
   sudo systemctl status kaspa-dashboard
   ```

2. Check logs:
   ```bash
   sudo journalctl -u kaspa-dashboard -n 50
   ```

3. Verify Node.js installation:
   ```bash
   node --version
   npm --version
   ```

4. Check file permissions:
   ```bash
   ls -la /opt/kaspa-dashboard/
   ```

### Port Already in Use

If port 8080 is already in use:

1. Find the process using the port:
   ```bash
   sudo ss -tlnp | grep :8080
   ```

2. Change the port in `/opt/kaspa-dashboard/.env`:
   ```bash
   PORT=8081
   ```

3. Restart the service:
   ```bash
   sudo systemctl restart kaspa-dashboard
   ```

### Docker Permission Issues

If the dashboard can't access Docker:

1. Verify user is in docker group:
   ```bash
   groups kaspa-dashboard
   ```

2. Add user to docker group if missing:
   ```bash
   sudo usermod -aG docker kaspa-dashboard
   ```

3. Restart the service:
   ```bash
   sudo systemctl restart kaspa-dashboard
   ```

### High Resource Usage

Monitor resource usage:

```bash
# CPU and memory usage
top -p $(pgrep -f "node server.js")

# Service resource limits
systemctl show kaspa-dashboard | grep -E "(CPUUsage|MemoryCurrent)"
```

Adjust resource limits in the systemd service file if needed.

## Updates

### Updating the Dashboard

1. Stop the service:
   ```bash
   sudo systemctl stop kaspa-dashboard
   ```

2. Backup current installation:
   ```bash
   sudo cp -r /opt/kaspa-dashboard /opt/kaspa-dashboard.backup
   ```

3. Update files:
   ```bash
   sudo rsync -av --exclude='node_modules' --exclude='logs' --exclude='.env' \
        /path/to/new/dashboard/ /opt/kaspa-dashboard/
   ```

4. Update dependencies:
   ```bash
   cd /opt/kaspa-dashboard
   sudo -u kaspa-dashboard npm ci --only=production
   ```

5. Start the service:
   ```bash
   sudo systemctl start kaspa-dashboard
   ```

### Automated Updates

Create a simple update script:

```bash
#!/bin/bash
# update-dashboard.sh

set -e

echo "Stopping dashboard..."
sudo systemctl stop kaspa-dashboard

echo "Creating backup..."
sudo cp -r /opt/kaspa-dashboard /opt/kaspa-dashboard.backup.$(date +%Y%m%d_%H%M%S)

echo "Updating files..."
# Add your update logic here

echo "Installing dependencies..."
cd /opt/kaspa-dashboard
sudo -u kaspa-dashboard npm ci --only=production

echo "Starting dashboard..."
sudo systemctl start kaspa-dashboard

echo "Update complete!"
```

## Uninstallation

To completely remove the dashboard:

```bash
sudo /opt/kaspa-dashboard/uninstall.sh
```

Or manually:

```bash
# Stop and disable service
sudo systemctl stop kaspa-dashboard
sudo systemctl disable kaspa-dashboard

# Remove service file
sudo rm /etc/systemd/system/kaspa-dashboard.service
sudo systemctl daemon-reload

# Remove files and user
sudo rm -rf /opt/kaspa-dashboard
sudo userdel kaspa-dashboard

# Remove log rotation
sudo rm -f /etc/logrotate.d/kaspa-dashboard
```

## Integration with Kaspa All-in-One

The dashboard integrates with the Kaspa All-in-One system by:

1. **Docker Management**: Controls Docker containers via Docker CLI/API
2. **Configuration Access**: Reads configuration from mounted `.env` file
3. **Wizard Integration**: Communicates with Installation Wizard on host
4. **Service Monitoring**: Monitors all deployed services and profiles
5. **Resource Monitoring**: Tracks system resources and container usage

The host-based architecture ensures the dashboard remains operational even when Docker services have issues, providing reliable system monitoring and management capabilities.