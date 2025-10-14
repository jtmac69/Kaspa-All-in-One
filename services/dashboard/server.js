const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

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

async function checkAllServices() {
    const services = [
        { name: 'Kaspa Node', url: 'http://kaspa-node:16111', type: 'rpc' },
        { name: 'Kasia App', url: 'http://kasia-app:3000', type: 'http' },
        { name: 'Kasia Indexer', url: 'http://kasia-indexer:3000', type: 'http' },
        { name: 'K Social', url: 'http://k-social:3000', type: 'http' },
        { name: 'K Indexer', url: 'http://k-indexer:3000', type: 'http' }
    ];

    const results = await Promise.allSettled(
        services.map(async (service) => {
            try {
                if (service.type === 'rpc') {
                    await axios.post(service.url, { method: 'ping', params: {} }, { timeout: 5000 });
                } else {
                    await axios.get(`${service.url}/health`, { timeout: 5000 });
                }
                return { ...service, status: 'healthy', lastCheck: new Date().toISOString() };
            } catch (error) {
                return { ...service, status: 'unhealthy', error: error.message, lastCheck: new Date().toISOString() };
            }
        })
    );

    return results.map(result => result.status === 'fulfilled' ? result.value : result.reason);
}

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaspa Dashboard running on port ${PORT}`);
});