const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const compression = require('compression');
const helmet = require('helmet');

// Dashboard modules
const WebSocketManager = require('./lib/WebSocketManager');
const UpdateBroadcaster = require('./lib/UpdateBroadcaster');
const AlertManager = require('./lib/AlertManager');
const ServiceMonitor = require('./lib/ServiceMonitor');
const ResourceMonitor = require('./lib/ResourceMonitor');
const WizardIntegration = require('./lib/WizardIntegration');
const ConfigurationSynchronizer = require('./lib/ConfigurationSynchronizer');

// Security and performance modules
const { 
    validators, 
    handleValidationErrors, 
    sanitizeRequestBody,
    isValidServiceName,
    isValidKaspaAddress 
} = require('./lib/ValidationMiddleware');
const { 
    corsOptions, 
    rateLimiters, 
    helmetOptions,
    validateRequest,
    securityLogger,
    securityErrorHandler 
} = require('./lib/SecurityMiddleware');
const { 
    createMaskingMiddleware,
    sanitizeLogContent,
    maskConfiguration 
} = require('./lib/DataMasking');
const { initializeSSL } = require('./lib/SSLSupport');
const { 
    ResponseCache, 
    RequestQueue, 
    PerformanceMonitor,
    compressionOptions 
} = require('./lib/PerformanceOptimizer');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 8080;
const KASPA_NODE_URL = process.env.KASPA_NODE_URL || 'http://kaspa-node:16111';

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();
const responseCache = new ResponseCache(30000); // 30 second cache
const requestQueue = new RequestQueue(10); // Max 10 concurrent requests

// Security middleware
app.use(helmet(helmetOptions));
app.use(compression(compressionOptions));
app.use(cors(corsOptions));
app.use(validateRequest);
app.use(securityLogger);

// Rate limiting
app.use('/api/', rateLimiters.general);
app.use('/api/services/', rateLimiters.serviceControl);
app.use('/api/kaspa/wallet', rateLimiters.walletOperations);
app.use('/api/services/*/logs', rateLimiters.logs);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequestBody);

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true
}));

// Health check endpoint
app.get('/health', responseCache.middleware(60000), (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes with caching and validation
app.get('/api/status', responseCache.middleware(5000), async (req, res) => {
    const startTime = Date.now();
    try {
        const services = await requestQueue.add(() => serviceMonitor.checkAllServices());
        performanceMonitor.recordAPIRequest('/api/status', Date.now() - startTime, true);
        res.json(services);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/status', Date.now() - startTime, false);
        res.status(500).json({ error: error.message });
    }
});

// Get active profiles
app.get('/api/profiles', async (req, res) => {
    try {
        const dockerServices = await getDockerServices();
        const profiles = new Set(['core']);
        
        dockerServices.forEach((info, serviceName) => {
            const serviceDef = serviceMonitor.serviceDefinitions.find(s => s.name === serviceName);
            if (serviceDef && serviceDef.profile !== 'core') {
                profiles.add(serviceDef.profile);
            }
        });
        
        res.json(Array.from(profiles));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Service management endpoints with validation
app.post('/api/services/:serviceName/start', 
    validators.serviceName,
    handleValidationErrors,
    async (req, res) => {
        const startTime = Date.now();
        try {
            const { serviceName } = req.params;
            
            // Additional validation
            if (!isValidServiceName(serviceName)) {
                return res.status(400).json({ error: 'Invalid service name' });
            }
            
            await execAsync(`docker start ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/start', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} started` });
        } catch (error) {
            performanceMonitor.recordAPIRequest('/api/services/start', Date.now() - startTime, false);
            res.status(500).json({ error: error.message });
        }
    }
);

app.post('/api/services/:serviceName/stop', 
    validators.serviceName,
    handleValidationErrors,
    async (req, res) => {
        const startTime = Date.now();
        try {
            const { serviceName } = req.params;
            
            if (!isValidServiceName(serviceName)) {
                return res.status(400).json({ error: 'Invalid service name' });
            }
            
            await execAsync(`docker stop ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/stop', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} stopped` });
        } catch (error) {
            performanceMonitor.recordAPIRequest('/api/services/stop', Date.now() - startTime, false);
            res.status(500).json({ error: error.message });
        }
    }
);

app.post('/api/services/:serviceName/restart', 
    validators.serviceName,
    handleValidationErrors,
    async (req, res) => {
        const startTime = Date.now();
        try {
            const { serviceName } = req.params;
            
            if (!isValidServiceName(serviceName)) {
                return res.status(400).json({ error: 'Invalid service name' });
            }
            
            await execAsync(`docker restart ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/restart', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} restarted` });
        } catch (error) {
            performanceMonitor.recordAPIRequest('/api/services/restart', Date.now() - startTime, false);
            res.status(500).json({ error: error.message });
        }
    }
);

// Get service logs with validation and sanitization
app.get('/api/services/:serviceName/logs', 
    validators.serviceName,
    validators.pagination,
    validators.logSearch,
    handleValidationErrors,
    async (req, res) => {
        const startTime = Date.now();
        try {
            const { serviceName } = req.params;
            const { lines = 100, search = '' } = req.query;
            
            if (!isValidServiceName(serviceName)) {
                return res.status(400).json({ error: 'Invalid service name' });
            }
            
            const { stdout } = await execAsync(`docker logs --tail=${lines} ${serviceName}`);
            
            // Sanitize logs to remove sensitive information
            let sanitizedLogs = sanitizeLogContent(stdout);
            
            // Apply search filter if provided
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                sanitizedLogs = sanitizedLogs
                    .split('\n')
                    .filter(line => searchRegex.test(line))
                    .join('\n');
            }
            
            performanceMonitor.recordAPIRequest('/api/services/logs', Date.now() - startTime, true);
            res.json({ logs: sanitizedLogs });
        } catch (error) {
            performanceMonitor.recordAPIRequest('/api/services/logs', Date.now() - startTime, false);
            res.status(500).json({ error: error.message });
        }
    }
);

// System resource monitoring
app.get('/api/system/resources', async (req, res) => {
    try {
        const resources = await resourceMonitor.getSystemResources();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get environment configuration with masking
app.get('/api/config', 
    createMaskingMiddleware('config'),
    async (req, res) => {
        const startTime = Date.now();
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
            
            // Configuration will be automatically masked by middleware
            performanceMonitor.recordAPIRequest('/api/config', Date.now() - startTime, true);
            res.json(config);
        } catch (error) {
            performanceMonitor.recordAPIRequest('/api/config', Date.now() - startTime, false);
            res.status(500).json({ error: error.message });
        }
    }
);

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

// Alert management endpoints
app.get('/api/alerts', (req, res) => {
    try {
        const options = {
            severity: req.query.severity,
            type: req.query.type,
            source: req.query.source,
            unacknowledged: req.query.unacknowledged === 'true',
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };
        
        const alerts = alertManager.getAlertHistory(options);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/alerts/stats', (req, res) => {
    try {
        const stats = alertManager.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        const success = alertManager.acknowledgeAlert(alertId);
        
        if (success) {
            res.json({ success: true, message: 'Alert acknowledged' });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/alerts/thresholds', (req, res) => {
    try {
        const thresholds = req.body;
        alertManager.updateThresholds(thresholds);
        res.json({ success: true, message: 'Thresholds updated', thresholds: alertManager.alertThresholds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket statistics endpoint
app.get('/api/websocket/stats', (req, res) => {
    try {
        const wsStats = wsManager.getStats();
        const broadcasterStats = updateBroadcaster.getStats();
        const alertStats = alertManager.getStats();
        const performanceStats = performanceMonitor.getStats();
        const cacheStats = responseCache.getStats();
        const queueStats = requestQueue.getStats();
        
        res.json({
            websocket: wsStats,
            broadcaster: broadcasterStats,
            alerts: alertStats,
            performance: performanceStats,
            cache: cacheStats,
            requestQueue: queueStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Performance monitoring endpoint
app.get('/api/performance/stats', (req, res) => {
    try {
        const stats = performanceMonitor.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
    try {
        responseCache.clear();
        res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cache/stats', (req, res) => {
    try {
        const stats = responseCache.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add security error handler
app.use(securityErrorHandler);

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to get Docker services
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

// Start wizard if needed (called by dashboard frontend)
app.post('/api/wizard/start', async (req, res) => {
    const startTime = Date.now();
    try {
        const scriptPath = path.join(__dirname, '../wizard/start-wizard-if-needed.sh');
        const { stdout, stderr } = await execAsync(scriptPath);
        
        performanceMonitor.recordAPIRequest('/api/wizard/start', Date.now() - startTime, true);
        res.json({
            success: true,
            message: 'Wizard start initiated',
            output: stdout,
            errors: stderr
        });
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to start wizard',
            message: error.message
        });
    }
});

// Launch wizard with configuration context (new enhanced endpoint)
app.post('/api/wizard/launch', async (req, res) => {
    const startTime = Date.now();
    try {
        const { mode = 'reconfiguration', context = {} } = req.body;
        
        const result = await wizardIntegration.launchWizard({ mode, context });
        
        performanceMonitor.recordAPIRequest('/api/wizard/launch', Date.now() - startTime, true);
        res.json(result);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/launch', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to launch wizard',
            message: error.message
        });
    }
});

// Get current configuration for wizard
app.get('/api/wizard/config', async (req, res) => {
    const startTime = Date.now();
    try {
        const config = await wizardIntegration.exportCurrentConfiguration();
        
        performanceMonitor.recordAPIRequest('/api/wizard/config', Date.now() - startTime, true);
        res.json(config);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/config', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to export configuration',
            message: error.message
        });
    }
});

// Get configuration suggestions
app.get('/api/wizard/suggestions', async (req, res) => {
    const startTime = Date.now();
    try {
        const suggestions = await wizardIntegration.generateConfigurationSuggestions();
        
        performanceMonitor.recordAPIRequest('/api/wizard/suggestions', Date.now() - startTime, true);
        res.json(suggestions);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/suggestions', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to generate suggestions',
            message: error.message
        });
    }
});

// Get resource monitoring status
app.get('/api/wizard/monitoring/status', async (req, res) => {
    const startTime = Date.now();
    try {
        const status = await wizardIntegration.getResourceMonitoringStatus();
        
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/status', Date.now() - startTime, true);
        res.json(status);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to get monitoring status',
            message: error.message
        });
    }
});

// Start resource monitoring manually
app.post('/api/wizard/monitoring/start', async (req, res) => {
    const startTime = Date.now();
    try {
        const result = await wizardIntegration.startResourceMonitoring();
        
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/start', Date.now() - startTime, true);
        res.json(result);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to start monitoring',
            message: error.message
        });
    }
});

// Poll wizard status
app.get('/api/wizard/status/:sessionId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { sessionId } = req.params;
        const status = await wizardIntegration.pollWizardStatus(sessionId);
        
        performanceMonitor.recordAPIRequest('/api/wizard/status', Date.now() - startTime, true);
        res.json(status);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to get wizard status',
            message: error.message
        });
    }
});

// Start wizard status polling
app.post('/api/wizard/poll/:sessionId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { sessionId } = req.params;
        const { interval, timeout } = req.body;
        
        // Start polling in background and return immediately
        wizardIntegration.startWizardStatusPolling(sessionId, {
            interval: interval || 2000,
            timeout: timeout || 300000,
            onUpdate: (status) => {
                // Broadcast status updates via WebSocket
                wsManager.broadcast({
                    type: 'wizard_status_update',
                    sessionId,
                    data: status,
                    timestamp: new Date().toISOString()
                });
            }
        }).then((finalStatus) => {
            // Broadcast completion
            wsManager.broadcast({
                type: 'wizard_completed',
                sessionId,
                data: finalStatus,
                timestamp: new Date().toISOString()
            });
        }).catch((error) => {
            // Broadcast error
            wsManager.broadcast({
                type: 'wizard_error',
                sessionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        });
        
        performanceMonitor.recordAPIRequest('/api/wizard/poll', Date.now() - startTime, true);
        res.json({
            success: true,
            message: 'Wizard status polling started',
            sessionId
        });
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/poll', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to start wizard polling',
            message: error.message
        });
    }
});

// Handle wizard completion
app.post('/api/wizard/completion', async (req, res) => {
    const startTime = Date.now();
    try {
        const completionData = req.body;
        const result = await wizardIntegration.handleWizardCompletion(completionData);
        
        performanceMonitor.recordAPIRequest('/api/wizard/completion', Date.now() - startTime, true);
        res.json(result);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/wizard/completion', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to handle wizard completion',
            message: error.message
        });
    }
});

// Configuration synchronization endpoints
app.get('/api/config/history', async (req, res) => {
    const startTime = Date.now();
    try {
        const { limit, since, changeType } = req.query;
        const history = configSynchronizer.getConfigurationHistory({
            limit: limit ? parseInt(limit) : undefined,
            since,
            changeType
        });
        
        performanceMonitor.recordAPIRequest('/api/config/history', Date.now() - startTime, true);
        res.json(history);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/history', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to get configuration history',
            message: error.message
        });
    }
});

app.post('/api/config/validate', async (req, res) => {
    const startTime = Date.now();
    try {
        const validation = await configSynchronizer.validateConfiguration();
        
        performanceMonitor.recordAPIRequest('/api/config/validate', Date.now() - startTime, true);
        res.json(validation);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/validate', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to validate configuration',
            message: error.message
        });
    }
});

app.post('/api/config/rollback/:changeId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { changeId } = req.params;
        const result = await configSynchronizer.rollbackConfiguration(changeId);
        
        performanceMonitor.recordAPIRequest('/api/config/rollback', Date.now() - startTime, true);
        res.json(result);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/rollback', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to rollback configuration',
            message: error.message
        });
    }
});

app.get('/api/config/sync/status', async (req, res) => {
    const startTime = Date.now();
    try {
        const status = configSynchronizer.getStatus();
        
        performanceMonitor.recordAPIRequest('/api/config/sync/status', Date.now() - startTime, true);
        res.json(status);
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/sync/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            message: error.message
        });
    }
});

app.post('/api/config/sync/start', async (req, res) => {
    const startTime = Date.now();
    try {
        configSynchronizer.startMonitoring();
        
        performanceMonitor.recordAPIRequest('/api/config/sync/start', Date.now() - startTime, true);
        res.json({
            success: true,
            message: 'Configuration synchronization started'
        });
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/sync/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to start configuration sync',
            message: error.message
        });
    }
});

app.post('/api/config/sync/stop', async (req, res) => {
    const startTime = Date.now();
    try {
        configSynchronizer.stopMonitoring();
        
        performanceMonitor.recordAPIRequest('/api/config/sync/stop', Date.now() - startTime, true);
        res.json({
            success: true,
            message: 'Configuration synchronization stopped'
        });
    } catch (error) {
        performanceMonitor.recordAPIRequest('/api/config/sync/stop', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: 'Failed to stop configuration sync',
            message: error.message
        });
    }
});

// Initialize SSL support
const sslResult = initializeSSL(app, {
    forceHTTPS: process.env.NODE_ENV === 'production',
    generateSelfSigned: process.env.NODE_ENV === 'development'
});

const server = sslResult.ssl ? sslResult.server : app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaspa Dashboard running on ${sslResult.ssl ? 'HTTPS' : 'HTTP'} port ${PORT}`);
});

// Initialize monitoring services
const serviceMonitor = new ServiceMonitor();
const resourceMonitor = new ResourceMonitor();
const kaspaNodeClient = new (require('./lib/KaspaNodeClient'))();
const wizardIntegration = new WizardIntegration();
const configSynchronizer = new ConfigurationSynchronizer();

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(server);

// Initialize Alert Manager
const alertManager = new AlertManager(wsManager);

// Initialize Update Broadcaster
const updateBroadcaster = new UpdateBroadcaster(wsManager, serviceMonitor, resourceMonitor);
updateBroadcaster.start();

// Initialize Configuration Synchronizer with WebSocket integration
configSynchronizer.onConfigurationChanged = (changes, diffAnalysis) => {
    // Broadcast configuration changes via WebSocket
    wsManager.broadcast({
        type: 'configuration_changed',
        data: {
            changes,
            diffAnalysis,
            timestamp: new Date().toISOString()
        }
    });
};

configSynchronizer.onDashboardRefreshNeeded = (changes, diffAnalysis) => {
    // Broadcast dashboard refresh request
    wsManager.broadcast({
        type: 'dashboard_refresh_needed',
        data: {
            changes,
            diffAnalysis,
            timestamp: new Date().toISOString()
        }
    });
};

// Start configuration monitoring
configSynchronizer.startMonitoring();

// Connect AlertManager to UpdateBroadcaster events
updateBroadcaster.on('services-broadcasted', ({ services }) => {
    alertManager.processServiceUpdates(services);
});

updateBroadcaster.on('resources-broadcasted', ({ resources }) => {
    alertManager.processResourceUpdates(resources);
});

// Add sync status monitoring
setInterval(async () => {
    try {
        const syncStatus = await kaspaNodeClient.getSyncStatus();
        alertManager.processSyncStatusUpdates(syncStatus);
        
        // Broadcast sync status updates
        wsManager.broadcast({
            type: 'sync_status_update',
            data: syncStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to get sync status:', error);
    }
}, 30000); // Check every 30 seconds

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    configSynchronizer.shutdown();
    alertManager.shutdown();
    updateBroadcaster.shutdown();
    wsManager.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    configSynchronizer.shutdown();
    alertManager.shutdown();
    updateBroadcaster.shutdown();
    wsManager.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
