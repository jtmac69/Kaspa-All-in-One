const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const WebSocket = require('ws');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;
const KASPA_NODE_URL = process.env.KASPA_NODE_URL || 'http://kaspa-node:16111';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/status', async (req, res) => {
    try {
        const services = await checkAllServices();
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active profiles
app.get('/api/profiles', async (req, res) => {
    try {
        const dockerServices = await getDockerServices();
        const profiles = new Set(['core']);
        
        dockerServices.forEach((info, serviceName) => {
            const serviceDef = SERVICE_DEFINITIONS.find(s => s.name === serviceName);
            if (serviceDef && serviceDef.profile !== 'core') {
                profiles.add(serviceDef.profile);
            }
        });
        
        res.json(Array.from(profiles));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Service management endpoints
app.post('/api/services/:serviceName/start', async (req, res) => {
    try {
        const { serviceName } = req.params;
        await execAsync(`docker start ${serviceName}`);
        res.json({ success: true, message: `Service ${serviceName} started` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/services/:serviceName/stop', async (req, res) => {
    try {
        const { serviceName } = req.params;
        await execAsync(`docker stop ${serviceName}`);
        res.json({ success: true, message: `Service ${serviceName} stopped` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/services/:serviceName/restart', async (req, res) => {
    try {
        const { serviceName } = req.params;
        await execAsync(`docker restart ${serviceName}`);
        res.json({ success: true, message: `Service ${serviceName} restarted` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get service logs
app.get('/api/services/:serviceName/logs', async (req, res) => {
    try {
        const { serviceName } = req.params;
        const lines = req.query.lines || 100;
        const { stdout } = await execAsync(`docker logs --tail=${lines} ${serviceName}`);
        res.json({ logs: stdout });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System resource monitoring
app.get('/api/system/resources', async (req, res) => {
    try {
        const [cpuInfo, memInfo, diskInfo] = await Promise.all([
            execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").catch(() => ({ stdout: '0' })),
            execAsync("free | grep Mem | awk '{print ($3/$2) * 100.0}'").catch(() => ({ stdout: '0' })),
            execAsync("df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1").catch(() => ({ stdout: '0' }))
        ]);

        res.json({
            cpu: parseFloat(cpuInfo.stdout.trim()) || 0,
            memory: parseFloat(memInfo.stdout.trim()) || 0,
            disk: parseFloat(diskInfo.stdout.trim()) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get environment configuration
app.get('/api/config', async (req, res) => {
    try {
        const envPath = '/app/.env';
        const envContent = await fs.readFile(envPath, 'utf-8');
        const config = {};
        
        envContent.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) {
                    config[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update environment configuration
app.post('/api/config', async (req, res) => {
    try {
        // Note: Configuration file is mounted read-only for security
        // Changes must be made to the host .env file and services restarted
        res.status(501).json({ 
            error: 'Configuration updates must be made to the host .env file',
            message: 'Edit the .env file on the host system and restart services to apply changes'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Service dependency information
app.get('/api/dependencies', (req, res) => {
    const dependencies = {
        'kaspa-node': [],
        'dashboard': ['kaspa-node'],
        'nginx': ['dashboard'],
        'kasia-indexer': ['kaspa-node'],
        'kasia-app': ['kasia-indexer'],
        'k-indexer': ['kaspa-node', 'indexer-db'],
        'k-social': ['k-indexer'],
        'simply-kaspa-indexer': ['kaspa-node', 'indexer-db'],
        'kaspa-stratum': ['kaspa-node'],
        'indexer-db': [],
        'archive-db': [],
        'archive-indexer': ['kaspa-node', 'archive-db'],
        'portainer': [],
        'pgadmin': []
    };
    
    res.json(dependencies);
});

app.get('/api/kaspa/info', async (req, res) => {
    try {
        const response = await axios.post(KASPA_NODE_URL, {
            method: 'getInfo',
            params: {}
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect to Kaspa node' });
    }
});

app.get('/api/kaspa/stats', async (req, res) => {
    try {
        const [blockDag, networkInfo] = await Promise.all([
            axios.post(KASPA_NODE_URL, { method: 'getBlockDagInfo', params: {} }),
            axios.post(KASPA_NODE_URL, { method: 'getCurrentNetwork', params: {} })
        ]);
        
        res.json({
            blockDag: blockDag.data,
            network: networkInfo.data
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get Kaspa stats' });
    }
});

// Service definitions with profile information
const SERVICE_DEFINITIONS = [
    { name: 'kaspa-node', displayName: 'Kaspa Node', url: 'http://kaspa-node:16111', type: 'rpc', profile: 'core' },
    { name: 'dashboard', displayName: 'Dashboard', url: 'http://dashboard:8080', type: 'http', profile: 'core' },
    { name: 'nginx', displayName: 'Nginx', url: 'http://nginx:80', type: 'http', profile: 'core' },
    { name: 'kasia-app', displayName: 'Kasia App', url: 'http://kasia-app:3000', type: 'http', profile: 'prod' },
    { name: 'kasia-indexer', displayName: 'Kasia Indexer', url: 'http://kasia-indexer:8080', type: 'http', profile: 'explorer' },
    { name: 'k-social', displayName: 'K Social', url: 'http://k-social:3000', type: 'http', profile: 'prod' },
    { name: 'k-indexer', displayName: 'K Indexer', url: 'http://k-indexer:8080', type: 'http', profile: 'explorer' },
    { name: 'simply-kaspa-indexer', displayName: 'Simply Kaspa Indexer', url: 'http://simply-kaspa-indexer:3000', type: 'http', profile: 'explorer' },
    { name: 'kaspa-stratum', displayName: 'Kaspa Stratum', url: 'http://kaspa-stratum:5555', type: 'tcp', profile: 'mining' },
    { name: 'indexer-db', displayName: 'Indexer DB', url: 'http://indexer-db:5432', type: 'postgres', profile: 'explorer' },
    { name: 'archive-db', displayName: 'Archive DB', url: 'http://archive-db:5432', type: 'postgres', profile: 'archive' },
    { name: 'archive-indexer', displayName: 'Archive Indexer', url: 'http://archive-indexer:3000', type: 'http', profile: 'archive' },
    { name: 'portainer', displayName: 'Portainer', url: 'http://portainer:9000', type: 'http', profile: 'development' },
    { name: 'pgadmin', displayName: 'pgAdmin', url: 'http://pgadmin:80', type: 'http', profile: 'development' }
];

async function getDockerServices() {
    try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}\t{{.State}}"');
        const runningServices = new Map();
        stdout.trim().split('\n').filter(line => line).forEach(line => {
            const [name, status, state] = line.split('\t');
            runningServices.set(name, { status, state });
        });
        return runningServices;
    } catch (error) {
        console.error('Failed to get Docker services:', error);
        return new Map();
    }
}

async function checkAllServices() {
    const dockerServices = await getDockerServices();
    
    const results = await Promise.allSettled(
        SERVICE_DEFINITIONS.map(async (service) => {
            const dockerInfo = dockerServices.get(service.name);
            
            if (!dockerInfo) {
                return { 
                    ...service, 
                    status: 'stopped', 
                    state: 'not_running',
                    lastCheck: new Date().toISOString() 
                };
            }

            try {
                if (service.type === 'rpc') {
                    await axios.post(service.url, { method: 'ping', params: {} }, { timeout: 5000 });
                } else if (service.type === 'http') {
                    await axios.get(`${service.url}/health`, { timeout: 5000 });
                }
                return { 
                    ...service, 
                    status: 'healthy', 
                    state: dockerInfo.state,
                    dockerStatus: dockerInfo.status,
                    lastCheck: new Date().toISOString() 
                };
            } catch (error) {
                return { 
                    ...service, 
                    status: dockerInfo.state === 'running' ? 'unhealthy' : 'stopped',
                    state: dockerInfo.state,
                    dockerStatus: dockerInfo.status,
                    error: error.message, 
                    lastCheck: new Date().toISOString() 
                };
            }
        })
    );

    return results.map(result => result.status === 'fulfilled' ? result.value : result.reason);
}

// Start wizard if needed (called by dashboard frontend)
app.post('/api/wizard/start', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../wizard/start-wizard-if-needed.sh');
        const { stdout, stderr } = await execAsync(scriptPath);
        
        res.json({
            success: true,
            message: 'Wizard start initiated',
            output: stdout,
            errors: stderr
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to start wizard',
            message: error.message
        });
    }
});

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaspa Dashboard running on port ${PORT}`);
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send initial data
    sendUpdate(ws);
    
    // Set up periodic updates
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            sendUpdate(ws);
        }
    }, 5000); // Update every 5 seconds
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'subscribe_logs') {
                // Stream logs for a specific service
                const serviceName = data.serviceName;
                const logStream = exec(`docker logs -f --tail=50 ${serviceName}`);
                
                logStream.stdout.on('data', (chunk) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'log',
                            serviceName,
                            data: chunk.toString()
                        }));
                    }
                });
                
                ws.on('close', () => {
                    logStream.kill();
                });
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clearInterval(interval);
    });
});

async function sendUpdate(ws) {
    try {
        const [services, resources] = await Promise.all([
            checkAllServices(),
            getSystemResources()
        ]);
        
        ws.send(JSON.stringify({
            type: 'update',
            data: {
                services,
                resources,
                timestamp: new Date().toISOString()
            }
        }));
    } catch (error) {
        console.error('Failed to send update:', error);
    }
}

async function getSystemResources() {
    try {
        const [cpuInfo, memInfo, diskInfo] = await Promise.all([
            execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").catch(() => ({ stdout: '0' })),
            execAsync("free | grep Mem | awk '{print ($3/$2) * 100.0}'").catch(() => ({ stdout: '0' })),
            execAsync("df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1").catch(() => ({ stdout: '0' }))
        ]);

        return {
            cpu: parseFloat(cpuInfo.stdout.trim()) || 0,
            memory: parseFloat(memInfo.stdout.trim()) || 0,
            disk: parseFloat(diskInfo.stdout.trim()) || 0
        };
    } catch (error) {
        return { cpu: 0, memory: 0, disk: 0 };
    }
}