// Load environment variables
require('dotenv').config();

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

// Shared modules
const { SharedStateManager } = require('../shared/lib/state-manager');
const ErrorDisplay = require('../shared/lib/error-display');

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
const KASPA_NODE_URL = process.env.KASPA_NODE_URL || 'http://localhost:16111';

// Initialize performance monitoring
const performanceMonitor = new PerformanceMonitor();
const responseCache = new ResponseCache(30000); // 30 second cache
const requestQueue = new RequestQueue(10); // Max 10 concurrent requests

// Initialize error display for consistent error handling
const errorDisplay = new ErrorDisplay();

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

// Serve shared styles
app.use('/shared', express.static(path.join(__dirname, '../shared'), {
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
        // Check if installation exists
        const installationState = await stateManager.readState();
        
        if (!installationState) {
            // No installation detected - use ErrorDisplay for consistent messaging
            const errorResult = errorDisplay.showStateFileError('not_found', new Error('Installation state file not found'));
            performanceMonitor.recordAPIRequest('/api/status', Date.now() - startTime, true);
            return res.json({
                noInstallation: true,
                message: errorResult.userMessage,
                services: []
            });
        }
        
        // Get all services from Docker
        const allServices = await requestQueue.add(() => serviceMonitor.checkAllServices());
        
        // Filter to only show services that are in the installation state
        const installedServiceNames = new Set(installationState.services.map(s => s.name));
        const filteredServices = allServices.filter(service => 
            installedServiceNames.has(service.name)
        );
        
        performanceMonitor.recordAPIRequest('/api/status', Date.now() - startTime, true);
        res.json({
            noInstallation: false,
            services: filteredServices,
            installationState: {
                version: installationState.version,
                installedAt: installationState.installedAt,
                lastModified: installationState.lastModified,
                profiles: installationState.profiles
            }
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/status', error);
        performanceMonitor.recordAPIRequest('/api/status', Date.now() - startTime, false);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Get service filter options with counts
app.get('/api/profiles', async (req, res) => {
    try {
        // Check if installation exists
        const installationState = await stateManager.readState();
        
        if (!installationState) {
            return res.json([]);
        }
        
        // Service to profile mapping
        const serviceToProfile = {
            'kaspa-node': 'core',
            'dashboard': 'core',
            'wallet': 'core',
            'kaspa-archive-node': 'archive-node',
            'timescaledb': 'indexer-services',
            'indexer-db': 'indexer-services',
            'k-indexer': 'indexer-services',
            'kasia-indexer': 'indexer-services',
            'simply-kaspa-indexer': 'indexer-services',
            'archive-indexer': 'indexer-services',
            'kasia-app': 'kaspa-user-applications',
            'k-social': 'kaspa-user-applications',
            'kaspa-explorer': 'kaspa-user-applications',
            'kaspa-nginx': 'kaspa-user-applications',
            'kaspa-stratum': 'mining',
            'portainer': 'management',
            'pgadmin': 'management'
        };
        
        // Service to type mapping
        const serviceToType = {
            'kaspa-node': 'Node',
            'kaspa-archive-node': 'Node',
            'dashboard': 'Management',
            'wallet': 'Wallet',
            'timescaledb': 'Database',
            'indexer-db': 'Database',
            'k-indexer': 'Indexer',
            'kasia-indexer': 'Indexer',
            'simply-kaspa-indexer': 'Indexer',
            'archive-indexer': 'Indexer',
            'kasia-app': 'Application',
            'k-social': 'Application',
            'kaspa-explorer': 'Application',
            'kaspa-nginx': 'Proxy',
            'kaspa-stratum': 'Mining',
            'portainer': 'Management',
            'pgadmin': 'Management'
        };
        
        const services = installationState.services || [];
        const filterOptions = [];
        
        // Always include "All Services" option
        filterOptions.push({
            name: 'All Services',
            value: 'all',
            count: services.length
        });
        
        // Group by service type
        const serviceTypes = {};
        services.forEach(service => {
            const type = service.type || serviceToType[service.name] || 'Other';
            serviceTypes[type] = (serviceTypes[type] || 0) + 1;
        });
        
        // Add service type filters
        Object.entries(serviceTypes).forEach(([type, count]) => {
            filterOptions.push({
                name: type,
                value: `type:${type}`,
                count: count
            });
        });
        
        // Group by profile
        const profiles = {};
        services.forEach(service => {
            const profile = service.profile || serviceToProfile[service.name];
            if (profile) {
                profiles[profile] = (profiles[profile] || 0) + 1;
            }
        });
        
        // Add profile filters
        Object.entries(profiles).forEach(([profile, count]) => {
            filterOptions.push({
                name: `${profile} Profile`,
                value: `profile:${profile}`,
                count: count
            });
        });
        
        res.json(filterOptions);
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/profiles', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Get installation state
app.get('/api/installation/state', async (req, res) => {
    try {
        const installationState = await stateManager.readState();
        
        if (!installationState) {
            const errorResult = errorDisplay.showStateFileError('not_found', new Error('Installation state file not found'));
            return res.json({
                exists: false,
                message: errorResult.userMessage
            });
        }
        
        res.json({
            exists: true,
            state: installationState
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showStateFileError('corrupt', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Manual refresh endpoint for state file changes
app.post('/api/installation/refresh', async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('Manual refresh requested');
        
        // Re-read the state file
        const installationState = await stateManager.readState();
        
        // Get updated service status
        const allServices = await serviceMonitor.checkAllServices();
        
        let filteredServices = [];
        let stateInfo = null;

        if (installationState) {
            // Filter to only show services that are in the installation state
            const installedServiceNames = new Set(installationState.services.map(s => s.name));
            filteredServices = allServices.filter(service => 
                installedServiceNames.has(service.name)
            );
            
            stateInfo = {
                version: installationState.version,
                installedAt: installationState.installedAt,
                lastModified: installationState.lastModified,
                profiles: installationState.profiles,
                wizardRunning: installationState.wizardRunning || false
            };
        }

        // Broadcast refresh to all connected clients
        wsManager.broadcast({
            type: 'manual_refresh_completed',
            data: {
                hasInstallation: installationState !== null,
                services: filteredServices,
                installationState: stateInfo,
                timestamp: new Date().toISOString()
            }
        });

        performanceMonitor.recordAPIRequest('/api/installation/refresh', Date.now() - startTime, true);
        res.json({
            success: true,
            hasInstallation: installationState !== null,
            services: filteredServices,
            installationState: stateInfo,
            message: 'Dashboard refreshed successfully'
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/installation/refresh', error);
        performanceMonitor.recordAPIRequest('/api/installation/refresh', Date.now() - startTime, false);
        res.status(500).json({ 
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
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
                const errorResult = errorDisplay.show({
                    type: 'API_ERROR',
                    details: { error: 'Invalid service name', serviceName }
                });
                return res.status(400).json({ 
                    error: errorResult.userMessage,
                    details: errorResult.errorType 
                });
            }
            
            await execAsync(`docker start ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/start', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} started` });
        } catch (error) {
            // Use ErrorDisplay for consistent error handling
            const errorResult = errorDisplay.showApiError('/api/services/start', error);
            performanceMonitor.recordAPIRequest('/api/services/start', Date.now() - startTime, false);
            res.status(500).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
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
                const errorResult = errorDisplay.show({
                    type: 'API_ERROR',
                    details: { error: 'Invalid service name', serviceName }
                });
                return res.status(400).json({ 
                    error: errorResult.userMessage,
                    details: errorResult.errorType 
                });
            }
            
            await execAsync(`docker stop ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/stop', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} stopped` });
        } catch (error) {
            // Use ErrorDisplay for consistent error handling
            const errorResult = errorDisplay.showApiError('/api/services/stop', error);
            performanceMonitor.recordAPIRequest('/api/services/stop', Date.now() - startTime, false);
            res.status(500).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
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
                const errorResult = errorDisplay.show({
                    type: 'API_ERROR',
                    details: { error: 'Invalid service name', serviceName }
                });
                return res.status(400).json({ 
                    error: errorResult.userMessage,
                    details: errorResult.errorType 
                });
            }
            
            await execAsync(`docker restart ${serviceName}`);
            performanceMonitor.recordAPIRequest('/api/services/restart', Date.now() - startTime, true);
            res.json({ success: true, message: `Service ${serviceName} restarted` });
        } catch (error) {
            // Use ErrorDisplay for consistent error handling
            const errorResult = errorDisplay.showApiError('/api/services/restart', error);
            performanceMonitor.recordAPIRequest('/api/services/restart', Date.now() - startTime, false);
            res.status(500).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
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
                const errorResult = errorDisplay.show({
                    type: 'API_ERROR',
                    details: { error: 'Invalid service name', serviceName }
                });
                return res.status(400).json({ 
                    error: errorResult.userMessage,
                    details: errorResult.errorType 
                });
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
            // Use ErrorDisplay for consistent error handling
            const errorResult = errorDisplay.showApiError('/api/services/logs', error);
            performanceMonitor.recordAPIRequest('/api/services/logs', Date.now() - startTime, false);
            res.status(500).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
        }
    }
);

// System resource monitoring
app.get('/api/system/resources', async (req, res) => {
    try {
        const resources = await resourceMonitor.getSystemResources();
        res.json(resources);
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/system/resources', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
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
            // Use ErrorDisplay for consistent error handling
            const errorResult = errorDisplay.showApiError('/api/config', error);
            performanceMonitor.recordAPIRequest('/api/config', Date.now() - startTime, false);
            res.status(500).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
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
        // Use ErrorDisplay for graceful error handling (no crashes)
        const errorResult = errorDisplay.show({
            type: 'KASPA_NODE_UNAVAILABLE',
            details: { error: error.message, endpoint: '/api/kaspa/info' }
        });
        
        // Return graceful JSON response instead of 500 error
        res.json({ 
            error: errorResult.userMessage,
            available: false,
            message: 'Kaspa node is not running or not accessible',
            troubleshooting: [
                'Check if Kaspa node container is running: docker ps | grep kaspa-node',
                'Check container logs: docker logs kaspa-node',
                'Verify network connectivity between Dashboard and Kaspa node'
            ]
        });
    }
});

// ============================================================================
// NEW: Kaspa Network Stats with 3-Tier Fallback
// ============================================================================
app.get('/api/kaspa/network', async (req, res) => {
    let networkData = null;
    let source = 'unknown';
    
    // ========================================================================
    // ATTEMPT 1: Local Node (fastest if available)
    // ========================================================================
    try {
        console.log('Attempting to fetch from local node...');
        
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        const nodeInfo = await kaspaNodeClient.getNodeInfo();
        
        networkData = {
            blockHeight: dagInfo.virtualDaaScore || dagInfo.virtualSelectedParentBlueScore,
            difficulty: dagInfo.difficulty,
            networkHashrate: kaspaNodeClient.estimateHashRate(dagInfo.difficulty),
            networkName: nodeInfo.networkName || 'mainnet',
            tipHashes: dagInfo.tipHashes?.length || 0
        };
        source = 'local-node';
        console.log('✓ Local node successful');
    } catch (localError) {
        console.log('✗ Local node failed:', localError.message);
    }
    
    // ========================================================================
    // ATTEMPT 2: Public REST API (kas.fyi)
    // ========================================================================
    if (!networkData) {
        try {
            console.log('Attempting to fetch from public REST API...');
            
            const response = await axios.get('https://api.kas.fyi/info/blockdag', {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Kaspa-Dashboard/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (response.data) {
                networkData = {
                    blockHeight: response.data.virtualDaaScore || response.data.blockCount,
                    difficulty: response.data.difficulty,
                    networkHashrate: response.data.hashrate || 'N/A',
                    networkName: response.data.networkName || 'mainnet',
                    tipHashes: response.data.tipHashes?.length || 0
                };
                source = 'public-rest-api';
                console.log('✓ Public REST API successful');
            }
        } catch (apiError) {
            console.log('✗ Public REST API failed:', apiError.message);
        }
    }
    
    // ========================================================================
    // ATTEMPT 3: Public Kaspa Node (seeder2.kaspad.net)
    // ========================================================================
    if (!networkData) {
        try {
            console.log('Attempting to fetch from public Kaspa node...');
            
            // The kaspa-rpc-client will automatically use public nodes as fallback
            // if local node is not available
            const publicClient = new (require('./lib/KaspaNodeClient'))({
                host: 'seeder2.kaspad.net',
                port: 16110
            });
            
            await publicClient.initialize();
            const dagInfo = await publicClient.getBlockDagInfo();
            const nodeInfo = await publicClient.getNodeInfo();
            
            networkData = {
                blockHeight: dagInfo.virtualDaaScore || dagInfo.virtualSelectedParentBlueScore,
                difficulty: dagInfo.difficulty,
                networkHashrate: publicClient.estimateHashRate(dagInfo.difficulty),
                networkName: nodeInfo.networkName || 'mainnet',
                tipHashes: dagInfo.tipHashes?.length || 0
            };
            source = 'public-kaspa-node';
            console.log('✓ Public Kaspa node successful');
            
            publicClient.destroy();
        } catch (publicError) {
            console.log('✗ Public Kaspa node failed:', publicError.message);
        }
    }
    
    // ========================================================================
    // Return Result or Error
    // ========================================================================
    if (networkData) {
        res.json({
            ...networkData,
            source: source,
            timestamp: new Date().toISOString()
        });
    } else {
        console.error('All network data sources failed');
        res.status(503).json({
            error: 'Network data unavailable',
            message: 'All data sources (local node, public API, public node) failed',
            sources_tried: ['local-node', 'public-rest-api', 'public-kaspa-node']
        });
    }
});

// ============================================================================
// FIX 3: Public Kaspa Network Stats (independent of local node)
// ============================================================================
app.get('/api/kaspa/network/public', async (req, res) => {
    try {
        // Try multiple sources in order of preference
        let networkData = null;
        
        // Source 1: Try public REST API (kas.fyi or similar)
        try {
            // Note: This is a placeholder - actual public API endpoint may vary
            // Common options: kas.fyi API, kaspa.org API, or public explorer APIs
            const publicResponse = await axios.get('https://api.kaspa.org/info/blockg/info', {
                timeout: 5000
            });
            
            if (publicResponse.data) {
                networkData = {
                    blockHeight: publicResponse.data.virtualDaaScore || publicResponse.data.blockCount || 'N/A',
                    difficulty: publicResponse.data.difficulty || 'N/A',
                    networkHashRate: calculateHashRate(publicResponse.data.difficulty),
                    network: publicResponse.data.networkName || 'mainnet',
                    source: 'public-api',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (publicApiError) {
            console.log('Public API not available, trying local node fallback');
        }
        
        // Source 2: Fallback to local node if synced
        if (!networkData) {
            try {
                const nodeInfo = await kaspaNodeClient.getNodeInfo();
                const dagInfo = await kaspaNodeClient.getBlockDagInfo();
                
                if (nodeInfo && dagInfo) {
                    networkData = {
                        blockHeight: dagInfo.virtualDaaScore || dagInfo.blockCount || 'Syncing...',
                        difficulty: dagInfo.difficulty || 'Unknown',
                        networkHashRate: calculateHashRate(dagInfo.difficulty),
                        network: nodeInfo.network || 'mainnet',
                        source: 'local-node-fallback',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (localError) {
                console.log('Local node not available for network stats');
            }
        }
        
        // Source 3: If all else fails, provide helpful message
        if (!networkData) {
            networkData = {
                blockHeight: 'Fetching...',
                difficulty: 'Fetching...', 
                networkHashRate: 'Fetching...',
                network: 'mainnet',
                message: 'Connecting to network data sources...',
                source: 'unavailable',
                timestamp: new Date().toISOString(),
                note: 'Network data will appear shortly. If this persists, check your internet connection.',
                troubleshooting: [
                    'Ensure internet connectivity for public API access',
                    'Check if local Kaspa node is running and synced',
                    'Verify firewall settings allow outbound HTTPS connections'
                ]
            };
        }
        
        res.json(networkData);
        
    } catch (error) {
        console.error('Network API error:', error);
        res.json({
            blockHeight: 'Error',
            difficulty: 'Error',
            networkHashRate: 'Error',
            network: 'mainnet',
            error: 'Network API temporarily unavailable',
            message: error.message,
            source: 'error',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to calculate hash rate from difficulty
function calculateHashRate(difficulty) {
    if (!difficulty || isNaN(difficulty)) return 'Unknown';
    
    // Kaspa uses kHeavyHash algorithm
    // Approximate hash rate calculation for Kaspa
    const hashRate = difficulty / (1000 * 1000 * 1000 * 1000); // Convert to TH/s
    
    if (hashRate > 1000) {
        return `${(hashRate / 1000).toFixed(2)} PH/s`;
    } else {
        return `${hashRate.toFixed(2)} TH/s`;
    }
}

// Kaspa Node Log Analysis for Sync Status
app.get('/api/kaspa/node/sync-status', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Get more logs to find IBD messages (they might be older)
        const { stdout: logs } = await execAsync('docker logs kaspa-node --tail 200 --timestamps', {
            timeout: 15000,
            maxBuffer: 2 * 1024 * 1024 // 2MB buffer
        });
        
        const syncStatus = parseKaspaSyncLogs(logs);
        
        // ========================================================================
        // FIX 2: Add RPC and DAG data for lower info fields
        // ========================================================================
        try {
            // Get RPC info (node version, peers, mempool, etc.)
            const nodeInfo = await kaspaNodeClient.getNodeInfo();
            syncStatus.rpc = {
                isSynced: nodeInfo.isSynced,
                serverVersion: nodeInfo.serverVersion,
                isUtxoIndexed: nodeInfo.isUtxoIndexed,
                mempoolSize: nodeInfo.mempoolSize || 0,
                connectedPeers: nodeInfo.connectedPeers || syncStatus.peersConnected || 0
            };
            
            // Get DAG info (block height, timestamps, etc.)
            const dagInfo = await kaspaNodeClient.getBlockDagInfo();
            syncStatus.dag = {
                blockCount: dagInfo.blockCount,
                virtualDaaScore: dagInfo.virtualDaaScore,
                tipTimestamp: dagInfo.tipTimestamp
            };
            
            // Get container uptime
            try {
                const { stdout: statsOutput } = await execAsync('docker inspect kaspa-node --format="{{.State.StartedAt}}"', {
                    timeout: 3000
                });
                const startTime = new Date(statsOutput.trim());
                const uptimeSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
                syncStatus.uptime = uptimeSeconds;
            } catch (uptimeError) {
                // Uptime not critical, continue without it
            }
        } catch (rpcError) {
            // RPC data not available, continue with log-based sync status only
            console.log('RPC data not available for sync status:', rpcError.message);
        }
        
        res.json({
            ...syncStatus,
            timestamp: new Date().toISOString(),
            source: 'logs'
        });
        
    } catch (error) {
        console.error('Error getting Kaspa sync status from logs:', error);
        res.json({
            isSynced: false,
            syncPhase: 'unknown',
            progress: 0,
            error: 'Unable to read node logs',
            message: error.message,
            timestamp: new Date().toISOString(),
            source: 'error'
        });
    }
});

// Helper function to parse Kaspa sync logs - ENHANCED VERSION
function parseKaspaSyncLogs(logs) {
    const lines = logs.split('\n').filter(line => line.trim());
    const recentLines = lines.slice(-200); // Analyze more lines to find IBD messages
    const logContent = recentLines.join('\n');
    
    let syncStatus = {
        isSynced: false,
        syncPhase: 'starting',
        syncPhaseName: 'Starting',
        progress: 0,
        currentHeight: null,
        networkHeight: null,
        headersProcessed: 0,
        blocksProcessed: 0,
        utxoChunks: 0,
        utxoCount: 0,
        lastBlockTimestamp: null,
        estimatedTimeRemaining: null,
        peersConnected: 0,
        isHealthy: true,
        detail: 'Initializing...'
    };
    
    // Check for errors first
    const hasErrors = /error|failed|panic|fatal/i.test(logContent) && 
                      !/error.*0|failed.*0/i.test(logContent); // Ignore "0 errors" type messages

    // Detect peer count
    const peerMatch = logContent.match(/peers?:\s*(\d+)|connected.*?(\d+)\s*peers?|(\d+)\s*peers?\s*connected/i);
    if (peerMatch) {
        syncStatus.peersConnected = parseInt(peerMatch[1] || peerMatch[2] || peerMatch[3], 10);
    }

    // ========================================================================
    // SYNCED STATE DETECTION
    // ========================================================================
    
    // Pattern 1: Explicit sync completion messages
    if (/IBD finished successfully|Node is fully synced|Sync complete/i.test(logContent)) {
        syncStatus.isSynced = true;
        syncStatus.syncPhase = 'synced';
        syncStatus.syncPhaseName = 'Fully Synced';
        syncStatus.progress = 100;
        syncStatus.detail = 'Node is fully synchronized with the network';
        syncStatus.isHealthy = true;
        return syncStatus;
    }
    
    // Pattern 2: Normal operation - relay blocks without active sync messages
    const hasRelayBlocks = /Accepted \d+ blocks.*via relay/i.test(logContent);
    const hasNormalProcessing = /Processed \d+ blocks and \d+ headers in the last \d+\.\d+s/i.test(logContent);
    const hasThroughputStats = /Tx throughput stats:/i.test(logContent);
    
    // Active sync phase indicators
    const hasSyncMessages = /IBD.*Processed.*block headers|Received.*UTXO set chunks|Resolving virtual|pruning point proof|Validating|Applying.*proof|downloading.*proof/i.test(logContent);
    
    // If relay activity present AND no sync messages = SYNCED
    if ((hasRelayBlocks || hasNormalProcessing || hasThroughputStats) && !hasSyncMessages) {
        syncStatus.isSynced = true;
        syncStatus.syncPhase = 'synced';
        syncStatus.syncPhaseName = 'Fully Synced';
        syncStatus.progress = 100;
        syncStatus.detail = 'Processing blocks normally via relay';
        syncStatus.isHealthy = true;
        
        // Extract block/header counts if available
        const processedMatch = logContent.match(/Processed (\d+) blocks and (\d+) headers in the last/i);
        if (processedMatch) {
            syncStatus.blocksProcessed = parseInt(processedMatch[1], 10);
            syncStatus.headersProcessed = parseInt(processedMatch[2], 10);
        }
        
        return syncStatus;
    }

    // =========================================================================
    // PHASE DETECTION - Check in reverse order (most advanced phase first)
    // =========================================================================

    // Check for VIRTUAL phase: "Resolving virtual. Estimated progress: XX%"
    const virtualMatch = logContent.match(/Resolving virtual[.\s]*(?:Estimated progress:\s*)?(\d+)?%?/i);
    if (virtualMatch) {
        syncStatus.syncPhase = 'virtual';
        syncStatus.syncPhaseName = 'Resolving Virtual DAG';
        syncStatus.progress = virtualMatch[1] ? parseInt(virtualMatch[1], 10) : 50;
        syncStatus.detail = syncStatus.progress > 0 
            ? `Resolving virtual DAG: ${syncStatus.progress}%`
            : 'Resolving virtual DAG...';
        syncStatus.estimatedTimeRemaining = '1-5 minutes';
        syncStatus.isHealthy = !hasErrors;
        return syncStatus;
    }

    // Check for BLOCKS phase: "Processed X blocks and 0 headers"
    const blocksMatch = logContent.match(/Processed\s+(\d+)\s+blocks\s+and\s+0\s+headers/i);
    if (blocksMatch) {
        const blocksProcessed = parseInt(blocksMatch[1], 10);
        if (blocksProcessed > 0) {
            syncStatus.syncPhase = 'blocks';
            syncStatus.syncPhaseName = 'Processing Blocks';
            syncStatus.blocksProcessed = blocksProcessed;
            syncStatus.progress = 50; // Blocks phase doesn't report percentage
            syncStatus.detail = `Processed ${blocksProcessed.toLocaleString()} blocks`;
            syncStatus.estimatedTimeRemaining = '5-20 minutes';
            syncStatus.isHealthy = !hasErrors;
            return syncStatus;
        }
    }

    // Check for UTXO phase: "Received XXX UTXO set chunks"
    if (/UTXO set chunks|Fetching the pruning point UTXO set/i.test(logContent)) {
        syncStatus.syncPhase = 'utxo';
        syncStatus.syncPhaseName = 'Fetching UTXO Set';
        
        // Check if finished
        if (/Finished receiving the UTXO set/i.test(logContent)) {
            syncStatus.progress = 100;
            const totalMatch = logContent.match(/Total UTXOs:\s*([\d,]+)/i);
            if (totalMatch) {
                syncStatus.utxoCount = parseInt(totalMatch[1].replace(/,/g, ''), 10);
                syncStatus.detail = `Received ${syncStatus.utxoCount.toLocaleString()} UTXOs`;
            } else {
                syncStatus.detail = 'UTXO set download complete';
            }
        } else {
            // Still downloading
            const chunkMatch = logContent.match(/Received\s+(\d+)\s+UTXO set chunks.*?totaling in\s+([\d,]+)\s+UTXOs/i);
            if (chunkMatch) {
                syncStatus.utxoChunks = parseInt(chunkMatch[1], 10);
                syncStatus.utxoCount = parseInt(chunkMatch[2].replace(/,/g, ''), 10);
                syncStatus.progress = 50;
                syncStatus.detail = `Received ${syncStatus.utxoChunks.toLocaleString()} chunks (${syncStatus.utxoCount.toLocaleString()} UTXOs)`;
            } else {
                syncStatus.progress = 25;
                syncStatus.detail = 'Fetching UTXO set...';
            }
        }
        syncStatus.estimatedTimeRemaining = '2-3 minutes';
        syncStatus.isHealthy = !hasErrors;
        return syncStatus;
    }

    // Check for HEADERS/IBD phase: "IBD: Processed XXX block headers (N%)"
    const ibdMatch = logContent.match(/IBD[:\s]*Processed\s+([\d,]+)\s+block\s+headers\s*\((\d+)%\)(?:\s+last\s+block\s+timestamp:\s+([^\n]+))?/i);
    if (ibdMatch) {
        syncStatus.syncPhase = 'headers';
        syncStatus.syncPhaseName = 'Syncing Headers (IBD)';
        syncStatus.headersProcessed = parseInt(ibdMatch[1].replace(/,/g, ''), 10);
        syncStatus.progress = parseInt(ibdMatch[2], 10);
        syncStatus.detail = `Processed ${syncStatus.headersProcessed.toLocaleString()} headers (${syncStatus.progress}%)`;
        
        if (ibdMatch[3]) {
            syncStatus.lastBlockTimestamp = ibdMatch[3].trim();
        }
        
        // Estimate time remaining based on percentage
        if (syncStatus.progress >= 95) {
            syncStatus.estimatedTimeRemaining = '< 5 minutes';
        } else if (syncStatus.progress >= 80) {
            syncStatus.estimatedTimeRemaining = '10-20 minutes';
        } else if (syncStatus.progress >= 60) {
            syncStatus.estimatedTimeRemaining = '20-40 minutes';
        } else if (syncStatus.progress >= 40) {
            syncStatus.estimatedTimeRemaining = '40-60 minutes';
        } else if (syncStatus.progress >= 20) {
            syncStatus.estimatedTimeRemaining = '1-2 hours';
        } else {
            syncStatus.estimatedTimeRemaining = '2+ hours';
        }
        
        syncStatus.isHealthy = !hasErrors && syncStatus.peersConnected > 0;
        return syncStatus;
    }

    // Check for early headers processing (no IBD percentage yet)
    const earlyHeadersMatch = logContent.match(/Processed\s+0\s+blocks\s+and\s+(\d+)\s+headers/);
    if (earlyHeadersMatch) {
        const headerCount = parseInt(earlyHeadersMatch[1], 10);
        if (headerCount > 0) {
            syncStatus.syncPhase = 'headers';
            syncStatus.syncPhaseName = 'Syncing Headers (IBD)';
            syncStatus.headersProcessed = headerCount;
            syncStatus.progress = Math.min(5, Math.floor(headerCount / 100000)); // Conservative estimate
            syncStatus.detail = `Processing headers: ${headerCount.toLocaleString()} so far`;
            syncStatus.estimatedTimeRemaining = '2+ hours';
            syncStatus.isHealthy = !hasErrors;
            return syncStatus;
        }
    }

    // Check for PROOF phase: "pruning point proof"
    if (/pruning point proof|pruning proof|Validating and applying pruning point proof/i.test(logContent)) {
        syncStatus.syncPhase = 'proof';
        syncStatus.syncPhaseName = 'Processing Pruning Proof';
        
        if (/Applying.*pruning/i.test(logContent)) {
            syncStatus.progress = 75;
            syncStatus.detail = 'Applying pruning point proof...';
        } else if (/Validating.*pruning/i.test(logContent)) {
            syncStatus.progress = 50;
            syncStatus.detail = 'Validating pruning point proof...';
        } else if (/download.*pruning|pruning.*download/i.test(logContent)) {
            syncStatus.progress = 25;
            syncStatus.detail = 'Downloading pruning point proof...';
        } else {
            syncStatus.progress = 10;
            syncStatus.detail = 'Processing pruning point proof...';
        }
        syncStatus.estimatedTimeRemaining = '1-2 minutes';
        syncStatus.isHealthy = !hasErrors;
        return syncStatus;
    }

    // Check for CONNECTING phase
    if (/Connecting to|Connected to peer|peer connection established/i.test(logContent)) {
        syncStatus.syncPhase = 'connecting';
        syncStatus.syncPhaseName = 'Connecting to Peers';
        syncStatus.progress = 0;
        syncStatus.detail = 'Establishing network connections...';
        syncStatus.estimatedTimeRemaining = '< 1 minute';
        syncStatus.isHealthy = !hasErrors;
        return syncStatus;
    }

    // Check for STARTING phase
    if (/Starting|Initializing|Loading database/i.test(logContent)) {
        syncStatus.syncPhase = 'starting';
        syncStatus.syncPhaseName = 'Node Starting';
        syncStatus.progress = 0;
        syncStatus.detail = 'Node is starting up...';
        syncStatus.estimatedTimeRemaining = '< 1 minute';
        syncStatus.isHealthy = !hasErrors;
        return syncStatus;
    }

    // Default: unknown state
    syncStatus.syncPhase = 'unknown';
    syncStatus.syncPhaseName = 'Unknown State';
    syncStatus.progress = 0;
    syncStatus.detail = 'Unable to determine sync state';
    syncStatus.isHealthy = false;
    
    return syncStatus;
}

// Helper to get actual Kaspa node container start time
function getNodeStartTime() {
    try {
        const { execSync } = require('child_process');
        // Get the actual container start time
        const containerInfo = execSync('docker inspect kaspa-node --format="{{.State.StartedAt}}"', { encoding: 'utf8' }).trim();
        const startTime = new Date(containerInfo.replace(/"/g, '')).getTime();
        return startTime;
    } catch (error) {
        console.warn('Could not get container start time, using fallback:', error.message);
        // Fallback: assume started 4 hours ago based on user's info
        return Date.now() - (4 * 60 * 60 * 1000);
    }
}

// Enhanced Kaspa node endpoints with port fallback
app.get('/api/kaspa/connection/status', async (req, res) => {
    try {
        const connectionStatus = kaspaNodeClient.getConnectionStatus();
        res.json({
            ...connectionStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/kaspa/connection/status', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.post('/api/kaspa/connection/test', async (req, res) => {
    const startTime = Date.now();
    try {
        const result = await kaspaNodeClient.forceReconnect();
        
        performanceMonitor.recordAPIRequest('/api/kaspa/connection/test', Date.now() - startTime, result.connected);
        res.json({
            success: result.connected,
            connection: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/kaspa/connection/test', error);
        performanceMonitor.recordAPIRequest('/api/kaspa/connection/test', Date.now() - startTime, false);
        res.status(500).json({ 
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.get('/api/kaspa/node/info', async (req, res) => {
    try {
        const nodeInfo = await kaspaNodeClient.getNodeInfo();
        const connectionStatus = kaspaNodeClient.getConnectionStatus();
        
        res.json({
            ...nodeInfo,
            connection: {
                port: connectionStatus.workingPort,
                url: connectionStatus.workingUrl,
                status: connectionStatus.connected ? 'connected' : 'disconnected'
            }
        });
    } catch (error) {
        const connectionStatus = kaspaNodeClient.getConnectionStatus();
        res.json({ 
            error: 'Kaspa node not available',
            available: false,
            message: error.message,
            connection: {
                port: connectionStatus.workingPort,
                url: connectionStatus.workingUrl,
                status: 'disconnected',
                error: connectionStatus.error,
                portChain: connectionStatus.portChain,
                troubleshooting: [
                    'Check if Kaspa node container is running: docker ps | grep kaspa-node',
                    'Check container logs: docker logs kaspa-node',
                    'Verify network connectivity between Dashboard and Kaspa node',
                    `Tried ports: ${connectionStatus.portChain?.join(', ') || 'unknown'}`
                ]
            }
        });
    }
});

app.get('/api/kaspa/node/stats', async (req, res) => {
    try {
        const [blockDag, networkInfo] = await Promise.all([
            kaspaNodeClient.getBlockDagInfo(),
            kaspaNodeClient.getCurrentNetwork()
        ]);
        
        const connectionStatus = kaspaNodeClient.getConnectionStatus();
        
        res.json({
            blockDag,
            network: networkInfo,
            connection: {
                port: connectionStatus.workingPort,
                url: connectionStatus.workingUrl,
                status: 'connected'
            }
        });
    } catch (error) {
        const connectionStatus = kaspaNodeClient.getConnectionStatus();
        res.json({ 
            error: 'Kaspa node not available',
            available: false,
            message: error.message,
            connection: {
                port: connectionStatus.workingPort,
                url: connectionStatus.workingUrl,
                status: 'disconnected',
                error: connectionStatus.error,
                troubleshooting: [
                    'Check if Kaspa node container is running',
                    'Verify RPC is enabled on the node',
                    'Check firewall settings',
                    `Attempted ports: ${connectionStatus.portChain?.join(', ') || 'unknown'}`
                ]
            }
        });
    }
});

// Wallet API endpoints (placeholder implementation)
app.get('/api/kaspa/wallet', async (req, res) => {
    try {
        // For now, return a placeholder response since wallet functionality 
        // is not yet implemented in the Kaspa node setup
        const errorResult = errorDisplay.showServiceUnavailable('Wallet');
        res.json({
            error: errorResult.userMessage,
            message: 'Wallet features are not currently configured in this installation',
            available: false,
            placeholder: errorResult.placeholder
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/kaspa/wallet', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Updates API endpoint (placeholder implementation)
app.get('/api/updates/available', async (req, res) => {
    try {
        // For now, return empty updates since update checking is not implemented
        res.json({
            updates: [],
            lastChecked: new Date().toISOString(),
            message: 'Update checking not yet implemented'
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/updates/available', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/alerts', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.get('/api/alerts/stats', (req, res) => {
    try {
        const stats = alertManager.getStats();
        res.json(stats);
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/alerts/stats', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.post('/api/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        const success = alertManager.acknowledgeAlert(alertId);
        
        if (success) {
            res.json({ success: true, message: 'Alert acknowledged' });
        } else {
            const errorResult = errorDisplay.show({
                type: 'API_ERROR',
                details: { error: 'Alert not found', alertId }
            });
            res.status(404).json({ 
                error: errorResult.userMessage,
                details: errorResult.errorType 
            });
        }
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/alerts/acknowledge', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.put('/api/alerts/thresholds', (req, res) => {
    try {
        const thresholds = req.body;
        alertManager.updateThresholds(thresholds);
        res.json({ success: true, message: 'Thresholds updated', thresholds: alertManager.alertThresholds });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/alerts/thresholds', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/websocket/stats', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Performance monitoring endpoint
app.get('/api/performance/stats', (req, res) => {
    try {
        const stats = performanceMonitor.getStats();
        res.json(stats);
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/performance/stats', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
    try {
        responseCache.clear();
        res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/cache/clear', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

app.get('/api/cache/stats', (req, res) => {
    try {
        const stats = responseCache.getStats();
        res.json(stats);
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/cache/stats', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Add security error handler
app.use(securityErrorHandler);

// Global error handler for graceful degradation (Requirement 9.5)
app.use((error, req, res, next) => {
    // Use ErrorDisplay for consistent error handling
    const errorResult = errorDisplay.showApiError(req.path, error);
    
    // Always return JSON, never crash
    res.status(500).json({
        error: errorResult.userMessage,
        details: errorResult.errorType,
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

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
        // Use ErrorDisplay for consistent error logging
        const errorResult = errorDisplay.show({
            type: 'DOCKER_UNAVAILABLE',
            details: { error: error.message, operation: 'getDockerServices' }
        });
        return new Map();
    }
}

// Check wizard status (called by dashboard frontend)
app.get('/api/wizard/status', async (req, res) => {
    try {
        // Check if wizard is accessible by making a request to its health endpoint
        const axios = require('axios');
        try {
            const response = await axios.get('http://localhost:3000/api/health', {
                timeout: 3000
            });
            res.json({
                running: response.status === 200,
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.json({
                running: false,
                status: 'not_accessible',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/status', error);
        res.status(500).json({
            running: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
        });
    }
});

// Start wizard if needed (called by dashboard frontend)
app.post('/api/wizard/start', async (req, res) => {
    const startTime = Date.now();
    try {
        const scriptPath = path.join(__dirname, '../wizard/start-wizard.sh');
        const { stdout, stderr } = await execAsync(scriptPath);
        
        performanceMonitor.recordAPIRequest('/api/wizard/start', Date.now() - startTime, true);
        res.json({
            success: true,
            message: 'Wizard started successfully',
            output: stdout,
            errors: stderr
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/start', error);
        performanceMonitor.recordAPIRequest('/api/wizard/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/launch', error);
        performanceMonitor.recordAPIRequest('/api/wizard/launch', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/config', error);
        performanceMonitor.recordAPIRequest('/api/wizard/config', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/suggestions', error);
        performanceMonitor.recordAPIRequest('/api/wizard/suggestions', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/monitoring/status', error);
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/monitoring/start', error);
        performanceMonitor.recordAPIRequest('/api/wizard/monitoring/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/status', error);
        performanceMonitor.recordAPIRequest('/api/wizard/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/poll', error);
        performanceMonitor.recordAPIRequest('/api/wizard/poll', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/wizard/completion', error);
        performanceMonitor.recordAPIRequest('/api/wizard/completion', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/history', error);
        performanceMonitor.recordAPIRequest('/api/config/history', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/validate', error);
        performanceMonitor.recordAPIRequest('/api/config/validate', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/rollback', error);
        performanceMonitor.recordAPIRequest('/api/config/rollback', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/sync/status', error);
        performanceMonitor.recordAPIRequest('/api/config/sync/status', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/sync/start', error);
        performanceMonitor.recordAPIRequest('/api/config/sync/start', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
        // Use ErrorDisplay for consistent error handling
        const errorResult = errorDisplay.showApiError('/api/config/sync/stop', error);
        performanceMonitor.recordAPIRequest('/api/config/sync/stop', Date.now() - startTime, false);
        res.status(500).json({
            success: false,
            error: errorResult.userMessage,
            details: errorResult.errorType
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
const stateManager = new SharedStateManager(path.join(__dirname, '../../.kaspa-aio/installation-state.json'));
const serviceMonitor = new ServiceMonitor();
const resourceMonitor = new ResourceMonitor();

// Initialize KaspaNodeClient
let kaspaNodeClient;
async function initializeKaspaNodeClient() {
    try {
        kaspaNodeClient = new (require('./lib/KaspaNodeClient'))({
            host: 'localhost',
            port: 16110
        });
        
        await kaspaNodeClient.initialize();
        console.log(`KaspaNodeClient initialized successfully`);
    } catch (error) {
        console.warn('Failed to initialize Kaspa node client, will retry on first request:', error.message);
        // Create client anyway, it will try to connect on first use
        kaspaNodeClient = new (require('./lib/KaspaNodeClient'))({
            host: 'localhost',
            port: 16110
        });
    }
}

// Initialize immediately
initializeKaspaNodeClient();

const wizardIntegration = new WizardIntegration();
const configSynchronizer = new ConfigurationSynchronizer();

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(server);

// Initialize Alert Manager
const alertManager = new AlertManager(wsManager);

// Initialize Update Broadcaster
const updateBroadcaster = new UpdateBroadcaster(wsManager, serviceMonitor, resourceMonitor);
updateBroadcaster.start();

// Setup state file watching for configuration changes
let stateWatchUnsubscribe = null;

function setupStateFileWatching() {
    // Clean up existing watcher if any
    if (stateWatchUnsubscribe) {
        stateWatchUnsubscribe();
    }

    // Watch for state file changes
    stateWatchUnsubscribe = stateManager.watchState(async (newState, error) => {
        if (error) {
            // Use ErrorDisplay for consistent error logging
            const errorResult = errorDisplay.show({
                type: 'STATE_FILE_CORRUPT',
                details: { error: error.message, operation: 'state_file_watch' }
            });
            
            // Broadcast error to clients
            wsManager.broadcast({
                type: 'state_watch_error',
                data: {
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        console.log('Installation state file changed, refreshing dashboard...');

        // Update Kaspa node client configuration if port changed
        if (newState?.configuration?.kaspaNodePort) {
            const currentPort = kaspaNodeClient.getConnectionStatus().fallbackStatus?.configuredPort;
            const newPort = newState.configuration.kaspaNodePort;
            
            if (currentPort !== newPort) {
                console.log(`Updating Kaspa node port from ${currentPort} to ${newPort}`);
                kaspaNodeClient.updateConfiguredPort(newPort);
            }
        }

        try {
            // Get updated service status
            const allServices = await serviceMonitor.checkAllServices();
            
            let filteredServices = [];
            let installationState = null;

            if (newState) {
                // Filter to only show services that are in the installation state
                const installedServiceNames = new Set(newState.services.map(s => s.name));
                filteredServices = allServices.filter(service => 
                    installedServiceNames.has(service.name)
                );
                
                installationState = {
                    version: newState.version,
                    installedAt: newState.installedAt,
                    lastModified: newState.lastModified,
                    profiles: newState.profiles,
                    wizardRunning: newState.wizardRunning || false
                };
            }

            // Broadcast state change notification
            wsManager.broadcast({
                type: 'configuration_changed',
                data: {
                    hasInstallation: newState !== null,
                    services: filteredServices,
                    installationState: installationState,
                    timestamp: new Date().toISOString(),
                    message: newState ? 'Configuration updated' : 'Installation removed'
                }
            });

            // Also broadcast dashboard refresh request
            wsManager.broadcast({
                type: 'dashboard_refresh_needed',
                data: {
                    reason: 'state_file_changed',
                    hasInstallation: newState !== null,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (serviceError) {
            // Use ErrorDisplay for consistent error logging
            const errorResult = errorDisplay.showApiError('service_refresh_after_state_change', serviceError);
            
            // Still broadcast the state change even if service refresh fails
            wsManager.broadcast({
                type: 'configuration_changed',
                data: {
                    hasInstallation: newState !== null,
                    services: [],
                    installationState: newState ? {
                        version: newState.version,
                        installedAt: newState.installedAt,
                        lastModified: newState.lastModified,
                        profiles: newState.profiles,
                        wizardRunning: newState.wizardRunning || false
                    } : null,
                    timestamp: new Date().toISOString(),
                    message: 'Configuration changed but service refresh failed',
                    error: serviceError.message
                }
            });
        }
    });

    console.log('State file watching initialized');
}

// Start state file watching
setupStateFileWatching();

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
let kaspaNodeRetryActive = false;

setInterval(async () => {
    try {
        const syncStatus = await kaspaNodeClient.getSyncStatus();
        alertManager.processSyncStatusUpdates(syncStatus);
        
        // If we successfully got sync status, stop any active retry
        if (kaspaNodeRetryActive) {
            kaspaNodeClient.stopRetry();
            kaspaNodeRetryActive = false;
            console.log('Kaspa node connection restored, stopping retry');
            
            // Broadcast connection restored
            wsManager.broadcast({
                type: 'kaspa_node_restored',
                data: {
                    message: 'Kaspa node connection restored',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        // Broadcast sync status updates
        wsManager.broadcast({
            type: 'sync_status_update',
            data: syncStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Use ErrorDisplay for consistent error logging
        const errorResult = errorDisplay.show({
            type: 'KASPA_NODE_UNAVAILABLE',
            details: { error: error.message, operation: 'sync_status_monitoring' }
        });
        
        // Start retry logic if not already active
        if (!kaspaNodeRetryActive) {
            kaspaNodeRetryActive = true;
            console.log('Kaspa node unavailable, starting retry logic');
            
            kaspaNodeClient.startRetry((result) => {
                console.log(`Kaspa node reconnected on port ${result.port}`);
                
                // Broadcast reconnection
                wsManager.broadcast({
                    type: 'kaspa_node_reconnected',
                    data: {
                        message: `Kaspa node reconnected on port ${result.port}`,
                        port: result.port,
                        url: result.url,
                        timestamp: new Date().toISOString()
                    }
                });
                
                // Update status within 5 seconds by triggering immediate sync check
                setTimeout(async () => {
                    try {
                        const syncStatus = await kaspaNodeClient.getSyncStatus();
                        wsManager.broadcast({
                            type: 'sync_status_update',
                            data: syncStatus,
                            timestamp: new Date().toISOString()
                        });
                    } catch (retryError) {
                        // Use ErrorDisplay for consistent error logging
                        const retryErrorResult = errorDisplay.show({
                            type: 'KASPA_NODE_UNAVAILABLE',
                            details: { error: retryError.message, operation: 'sync_status_after_reconnection' }
                        });
                    }
                }, 1000); // Check after 1 second to ensure connection is stable
            });
            
            // Broadcast that node is unavailable and retry started
            wsManager.broadcast({
                type: 'kaspa_node_unavailable',
                data: {
                    message: 'Kaspa node unavailable - retrying every 30 seconds',
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
}, 30000); // Check every 30 seconds

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    
    // Clean up state file watcher
    if (stateWatchUnsubscribe) {
        stateWatchUnsubscribe();
    }
    
    // Clean up Kaspa node client
    if (kaspaNodeClient) {
        kaspaNodeClient.destroy();
    }
    
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
    
    // Clean up state file watcher
    if (stateWatchUnsubscribe) {
        stateWatchUnsubscribe();
    }
    
    // Clean up Kaspa node client
    if (kaspaNodeClient) {
        kaspaNodeClient.destroy();
    }
    
    configSynchronizer.shutdown();
    alertManager.shutdown();
    updateBroadcaster.shutdown();
    wsManager.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
