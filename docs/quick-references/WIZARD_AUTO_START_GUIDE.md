# Wizard Auto-Start Guide

## Overview

This guide explains how the dashboard can automatically start the wizard if it's not running when needed.

## Problem

When the dashboard tries to launch the wizard (for reconfiguration or updates), the wizard server might not be running, resulting in connection errors.

## Solution

We've implemented a multi-layered approach:

### 1. Auto-Start Script

**File**: `services/wizard/start-wizard-if-needed.sh`

This script:
- Checks if wizard is already running
- Starts wizard if not running
- Waits for wizard to be ready (up to 10 seconds)
- Logs output to `/tmp/wizard.log`
- Saves PID to `/tmp/wizard.pid`

**Usage**:
```bash
./services/wizard/start-wizard-if-needed.sh
```

### 2. Dashboard Backend Endpoint

**Endpoint**: `POST /api/wizard/start`

The dashboard server can call this endpoint to start the wizard.

**Implementation** (in `services/dashboard/server.js`):
```javascript
app.post('/api/wizard/start', async (req, res) => {
    const scriptPath = path.join(__dirname, '../wizard/start-wizard-if-needed.sh');
    const { stdout, stderr } = await execAsync(scriptPath);
    
    res.json({
        success: true,
        message: 'Wizard start initiated',
        output: stdout
    });
});
```

### 3. Dashboard Frontend Helper

**File**: `services/dashboard/public/scripts/wizard-integration.js`

Provides JavaScript functions for the dashboard UI:

```javascript
// Ensure wizard is running before making requests
await ensureWizardRunning();

// Launch reconfiguration (auto-starts wizard if needed)
await launchReconfiguration();

// Launch updates (auto-starts wizard if needed)
await launchUpdates(updates);
```

## Complete Workflow

### Reconfiguration Flow with Auto-Start

```javascript
// 1. User clicks "Reconfigure" button in dashboard
async function onReconfigureClick() {
  // 2. Check if wizard is running, start if needed
  const isRunning = await ensureWizardRunning();
  
  if (!isRunning) {
    alert('Failed to start wizard. Please start manually.');
    return;
  }
  
  // 3. Generate reconfigure link
  const response = await fetch('http://localhost:3000/api/wizard/reconfigure-link');
  const { url } = await response.json();
  
  // 4. Open wizard in new tab
  window.open(url, '_blank');
}
```

### Update Flow with Auto-Start

```javascript
// 1. Dashboard detects updates
const updates = await checkForUpdates();

// 2. User clicks "Apply Updates"
async function onApplyUpdatesClick() {
  // 3. Ensure wizard is running
  const isRunning = await ensureWizardRunning();
  
  if (!isRunning) {
    alert('Failed to start wizard. Please start manually.');
    return;
  }
  
  // 4. Launch wizard with updates
  await launchUpdates(updates);
}
```

## Implementation Details

### ensureWizardRunning()

```javascript
async function ensureWizardRunning() {
  try {
    // Try to ping wizard
    const response = await fetch('http://localhost:3000/api/wizard/health');
    if (response.ok) {
      return true; // Already running
    }
  } catch (error) {
    // Wizard not running
  }
  
  // Start wizard via dashboard backend
  await fetch('/api/wizard/start', { method: 'POST' });
  
  // Wait for wizard to be ready
  return await waitForWizard(10000);
}
```

### waitForWizard()

```javascript
async function waitForWizard(timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch('http://localhost:3000/api/wizard/health');
      if (response.ok) {
        return true; // Wizard is ready
      }
    } catch (error) {
      // Not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false; // Timeout
}
```

## Manual Start (Fallback)

If auto-start fails, users can manually start the wizard:

```bash
# Option 1: Using the script
./services/wizard/start-wizard-if-needed.sh

# Option 2: Direct start
cd services/wizard/backend
node src/server.js

# Option 3: Background start
cd services/wizard/backend
nohup node src/server.js > /tmp/wizard.log 2>&1 &
```

## Checking Wizard Status

### From Command Line

```bash
# Check if wizard is running
curl http://localhost:3000/api/wizard/health

# Check wizard process
ps aux | grep "node.*wizard"

# View wizard logs
tail -f /tmp/wizard.log
```

### From Dashboard

```javascript
// Check wizard status
const status = await checkWizardStatus();

if (status) {
  console.log('Wizard is running:', status);
  // { success: true, status: 'healthy', version: '1.0.0', uptime: 3600 }
} else {
  console.log('Wizard is not available');
}
```

## Troubleshooting

### Wizard Won't Start

**Check dependencies**:
```bash
cd services/wizard/backend
npm install
```

**Check port availability**:
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process using port 3000
kill $(lsof -t -i:3000)
```

**Check logs**:
```bash
tail -f /tmp/wizard.log
```

### Permission Issues

If you get permission errors:

```bash
# Make script executable
chmod +x services/wizard/start-wizard-if-needed.sh

# Check node_modules ownership
ls -la services/wizard/backend/node_modules

# Fix ownership if needed
sudo chown -R $USER:$USER services/wizard/backend/node_modules
```

### Wizard Starts But Not Accessible

**Check firewall**:
```bash
# Allow port 3000
sudo ufw allow 3000
```

**Check wizard is listening**:
```bash
netstat -tlnp | grep 3000
```

## Production Considerations

### 1. Process Management

For production, use a process manager instead of nohup:

**PM2** (recommended):
```bash
# Install PM2
npm install -g pm2

# Start wizard with PM2
pm2 start services/wizard/backend/src/server.js --name wizard

# Auto-restart on system reboot
pm2 startup
pm2 save
```

**Systemd Service**:
```bash
# Create service file
sudo nano /etc/systemd/system/kaspa-wizard.service

# Add:
[Unit]
Description=Kaspa Installation Wizard
After=network.target

[Service]
Type=simple
User=kaspa
WorkingDirectory=/path/to/kaspa-aio/services/wizard/backend
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable kaspa-wizard
sudo systemctl start kaspa-wizard
```

### 2. Health Monitoring

Add health check monitoring:

```javascript
// Dashboard: Monitor wizard health
setInterval(async () => {
  const status = await checkWizardStatus();
  
  if (!status) {
    // Wizard is down, attempt restart
    console.log('Wizard is down, attempting restart...');
    await ensureWizardRunning();
  }
}, 60000); // Check every minute
```

### 3. Logging

Configure proper logging:

```javascript
// In wizard server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

## Security Considerations

### 1. Restrict Auto-Start

Only allow dashboard to start wizard:

```javascript
// In dashboard server.js
app.post('/api/wizard/start', async (req, res) => {
    // Check if request is from localhost
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (clientIp !== '127.0.0.1' && clientIp !== '::1') {
        return res.status(403).json({
            success: false,
            error: 'Forbidden'
        });
    }
    
    // Start wizard...
});
```

### 2. Rate Limiting

Prevent abuse of auto-start:

```javascript
const startAttempts = new Map();

app.post('/api/wizard/start', async (req, res) => {
    const clientIp = req.ip;
    const attempts = startAttempts.get(clientIp) || 0;
    
    if (attempts >= 3) {
        return res.status(429).json({
            success: false,
            error: 'Too many start attempts'
        });
    }
    
    startAttempts.set(clientIp, attempts + 1);
    
    // Start wizard...
});
```

## Files Reference

- **Auto-start script**: `services/wizard/start-wizard-if-needed.sh`
- **Dashboard endpoint**: `services/dashboard/server.js` (POST /api/wizard/start)
- **Frontend helper**: `services/dashboard/public/scripts/wizard-integration.js`
- **Wizard health check**: `services/wizard/backend/src/api/dashboard-integration.js`

## Related Documentation

- [Dashboard Integration Quick Reference](DASHBOARD_INTEGRATION_QUICK_REFERENCE.md)
- [Reconfiguration Mode Quick Reference](RECONFIGURATION_MODE_QUICK_REFERENCE.md)
- [Update Mode Quick Reference](UPDATE_MODE_QUICK_REFERENCE.md)
