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

// ============================================================================
// Profile ID Migration Constants (Phase 1, Step 4)
// ============================================================================

/**
 * Profile ID migration mapping
 * Maps old profile IDs to new profile IDs
 */
const PROFILE_ID_MIGRATION = {
    'core': 'kaspa-node',
    'kaspa-user-applications': ['kasia-app', 'k-social-app'],
    'indexer-services': ['kasia-indexer', 'k-indexer-bundle'],
    'archive-node': 'kaspa-archive-node',
    'mining': 'kaspa-stratum'
};

/**
 * Reverse mapping: New profile ID → Old profile ID
 * Used for backward compatibility with existing state files
 */
const PROFILE_ID_REVERSE = {
    'kaspa-node': 'core',
    'kasia-app': 'kaspa-user-applications',
    'k-social-app': 'kaspa-user-applications',
    'kaspa-explorer-bundle': 'kaspa-user-applications',
    'kasia-indexer': 'indexer-services',
    'k-indexer-bundle': 'indexer-services',
    'kaspa-archive-node': 'archive-node',
    'kaspa-stratum': 'mining'
};

/**
 * Valid new profile IDs
 */
const VALID_PROFILE_IDS = [
    'kaspa-node',
    'kasia-app',
    'k-social-app',
    'kaspa-explorer-bundle',
    'kasia-indexer',
    'k-indexer-bundle',
    'kaspa-archive-node',
    'kaspa-stratum'
];

/**
 * Legacy profile IDs (for backward compatibility)
 */
const LEGACY_PROFILE_IDS = [
    'core',
    'kaspa-user-applications',
    'indexer-services',
    'archive-node',
    'mining'
];

// ============================================================================
// Profile Migration Helper Functions
// ============================================================================

/**
 * Migrate legacy profile ID to new profile ID
 * @param {string} profileId - Profile ID (may be legacy)
 * @returns {string|string[]} New profile ID(s)
 */
function migrateProfileId(profileId) {
    if (VALID_PROFILE_IDS.includes(profileId)) {
        return profileId;
    }
    return PROFILE_ID_MIGRATION[profileId] || profileId;
}

/**
 * Migrate array of profile IDs to new profile IDs
 * @param {string[]} profileIds - Array of profile IDs
 * @returns {string[]} Array of new profile IDs (flattened, unique)
 */
function migrateProfileIds(profileIds) {
    const result = [];
    for (const id of profileIds) {
        const migrated = migrateProfileId(id);
        if (Array.isArray(migrated)) {
            result.push(...migrated);
        } else {
            result.push(migrated);
        }
    }
    return [...new Set(result)];
}

/**
 * Check if a profile ID is a legacy ID
 * @param {string} profileId - Profile ID to check
 * @returns {boolean} True if legacy
 */
function isLegacyProfileId(profileId) {
    return LEGACY_PROFILE_IDS.includes(profileId);
}

/**
 * Get profile display name
 * @param {string} profileId - Profile ID (new or legacy)
 * @returns {string} Display name
 */
function getProfileDisplayName(profileId) {
    const names = {
        // New profile names
        'kaspa-node': 'Kaspa Node',
        'kasia-app': 'Kasia Application',
        'k-social-app': 'K-Social Application',
        'kaspa-explorer-bundle': 'Kaspa Explorer',
        'kasia-indexer': 'Kasia Indexer',
        'k-indexer-bundle': 'K-Indexer',
        'kaspa-archive-node': 'Kaspa Archive Node',
        'kaspa-stratum': 'Kaspa Stratum',
        'management': 'Management Tools',
        
        // Legacy names (for backward compat)
        'core': 'Core Profile',
        'kaspa-user-applications': 'Kaspa User Applications',
        'indexer-services': 'Indexer Services',
        'archive-node': 'Archive Node',
        'mining': 'Mining'
    };
    return names[profileId] || profileId;
}

/**
 * Get services belonging to a profile
 * @param {string} profileId - Profile ID
 * @returns {string[]} Array of service names
 */
function getServicesForProfile(profileId) {
    const profileServices = {
        'kaspa-node': ['kaspa-node'],
        'kasia-app': ['kasia-app'],
        'k-social-app': ['k-social'],
        'kaspa-explorer-bundle': ['kaspa-explorer', 'simply-kaspa-indexer', 'timescaledb-explorer'],
        'kasia-indexer': ['kasia-indexer'],
        'k-indexer-bundle': ['k-indexer', 'timescaledb-kindexer'],
        'kaspa-archive-node': ['kaspa-archive-node'],
        'kaspa-stratum': ['kaspa-stratum'],
        'management': ['portainer', 'pgadmin']
    };
    
    // Handle legacy profile IDs
    if (isLegacyProfileId(profileId)) {
        const migrated = migrateProfileId(profileId);
        if (Array.isArray(migrated)) {
            return migrated.flatMap(id => profileServices[id] || []);
        }
        return profileServices[migrated] || [];
    }
    
    return profileServices[profileId] || [];
}

// Dashboard modules
const WebSocketManager = require('./lib/WebSocketManager');
const UpdateBroadcaster = require('./lib/UpdateBroadcaster');
const UpdateMonitor = require('./lib/UpdateMonitor');
const AlertManager = require('./lib/AlertManager');
const ServiceMonitor = require('./lib/ServiceMonitor');
const ResourceMonitor = require('./lib/ResourceMonitor');
const WizardIntegration = require('./lib/WizardIntegration');
const ConfigurationSynchronizer = require('./lib/ConfigurationSynchronizer');

// Block rate tracking for accurate Blocks/Hour
const blockRateHistory = {
    samples: [],
    maxSamples: 360,
    lastUpdate: 0
};

function trackBlockRate(daaScore) {
    const now = Date.now();
    if (now - blockRateHistory.lastUpdate < 10000) return;
    
    blockRateHistory.samples.push({ timestamp: now, daaScore: parseInt(daaScore) });
    if (blockRateHistory.samples.length > blockRateHistory.maxSamples) {
        blockRateHistory.samples.shift();
    }
    blockRateHistory.lastUpdate = now;
}

function calculateAccurateBlocksPerHour() {
    const samples = blockRateHistory.samples;
    if (samples.length < 2) return { rate: 36000, accurate: false, chartData: [] };
    
    const now = Date.now();
    const recentSamples = samples.filter(s => s.timestamp >= now - 3600000);
    
    if (recentSamples.length < 2) {
        const oldest = samples[0], newest = samples[samples.length - 1];
        const hours = (newest.timestamp - oldest.timestamp) / 3600000;
        const rate = hours > 0 ? Math.round((newest.daaScore - oldest.daaScore) / hours) : 36000;
        return { rate, accurate: false, chartData: [] };
    }
    
    const oldest = recentSamples[0], newest = recentSamples[recentSamples.length - 1];
    const hours = (newest.timestamp - oldest.timestamp) / 3600000;
    const rate = Math.round((newest.daaScore - oldest.daaScore) / hours);
    
    // Generate 60-point chart data (one per minute)
    const chartData = [];
    for (let i = 59; i >= 0; i--) {
        const minStart = now - (i + 1) * 60000, minEnd = now - i * 60000;
        const minSamples = recentSamples.filter(s => s.timestamp >= minStart && s.timestamp < minEnd);
        if (minSamples.length >= 2) {
            const blocks = minSamples[minSamples.length - 1].daaScore - minSamples[0].daaScore;
            chartData.push(blocks * 60);
        } else {
            chartData.push(chartData.length > 0 ? chartData[chartData.length - 1] : 36000);
        }
    }
    
    return { rate, accurate: true, chartData };
}

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
        
        // Service to profile mapping (NEW profile IDs)
        // Note: Docker container names unchanged, but profile IDs are new
        const serviceToProfile = {
            // Kaspa Node Profile
            'kaspa-node': 'kaspa-node',
            
            // Kaspa Archive Node Profile
            'kaspa-archive-node': 'kaspa-archive-node',
            
            // Kasia App Profile
            'kasia-app': 'kasia-app',
            
            // K-Social App Profile (container name is 'k-social', not 'k-social-app')
            'k-social': 'k-social-app',
            
            // Kaspa Explorer Bundle Profile (includes explorer + simply-kaspa-indexer + timescaledb)
            'kaspa-explorer': 'kaspa-explorer-bundle',
            'simply-kaspa-indexer': 'kaspa-explorer-bundle',
            'timescaledb-explorer': 'kaspa-explorer-bundle',
            
            // Kasia Indexer Profile
            'kasia-indexer': 'kasia-indexer',
            
            // K-Indexer Bundle Profile (includes k-indexer + timescaledb)
            'k-indexer': 'k-indexer-bundle',
            'timescaledb-kindexer': 'k-indexer-bundle',
            
            // Kaspa Stratum Profile
            'kaspa-stratum': 'kaspa-stratum',
            
            // Management services (not tied to specific profile)
            'portainer': 'management',
            'pgadmin': 'management',
            
            // Legacy service names (for backward compatibility)
            'timescaledb': 'k-indexer-bundle',      // Old shared DB → now part of k-indexer-bundle
            'indexer-db': 'k-indexer-bundle',       // Old alias
            'simply-kaspa-db': 'kaspa-explorer-bundle', // Old alias
            'k-social-db': 'k-indexer-bundle',      // Old alias
            'archive-indexer': 'kaspa-archive-node', // Old alias
            'wallet': 'kaspa-node',                 // Wallet is now part of kaspa-node config
            'dashboard': 'management',              // Dashboard is now local (not containerized)
            'kaspa-nginx': 'management'             // Nginx built into apps now
        };
        
        // Service to type mapping
        const serviceToType = {
            // Nodes
            'kaspa-node': 'Node',
            'kaspa-archive-node': 'Node',
            
            // Applications
            'kasia-app': 'Application',
            'k-social': 'Application',
            'kaspa-explorer': 'Application',
            
            // Indexers
            'kasia-indexer': 'Indexer',
            'k-indexer': 'Indexer',
            'simply-kaspa-indexer': 'Indexer',
            
            // Databases
            'timescaledb-explorer': 'Database',
            'timescaledb-kindexer': 'Database',
            'timescaledb': 'Database',        // Legacy
            'indexer-db': 'Database',         // Legacy
            'simply-kaspa-db': 'Database',    // Legacy
            'k-social-db': 'Database',        // Legacy
            
            // Mining
            'kaspa-stratum': 'Mining',
            
            // Management
            'portainer': 'Management',
            'pgadmin': 'Management',
            'dashboard': 'Management',        // Legacy (now local)
            'wallet': 'Wallet',               // Legacy (now config option)
            'kaspa-nginx': 'Proxy',           // Legacy (now built into apps)
            'archive-indexer': 'Indexer'      // Legacy
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
            let profile = service.profile || serviceToProfile[service.name];
            if (profile) {
                // Normalize to new profile ID if it's a legacy mapping
                if (isLegacyProfileId(profile)) {
                    const migrated = migrateProfileId(profile);
                    profile = Array.isArray(migrated) ? migrated[0] : migrated;
                }
                profiles[profile] = (profiles[profile] || 0) + 1;
            }
        });
        
        // Add profile filters with display names
        Object.entries(profiles).forEach(([profile, count]) => {
            filterOptions.push({
                name: getProfileDisplayName(profile),
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

// Get Docker container resource limits
app.get('/api/system/docker-limits', async (req, res) => {
    try {
        const limits = await resourceMonitor.getDockerResourceLimits();
        
        // Convert Map to array for JSON response
        const limitsArray = Array.from(limits.entries()).map(([name, limit]) => ({
            name,
            memoryLimit: limit.memory ? `${(limit.memory / 1024 / 1024 / 1024).toFixed(2)} GB` : 'Unlimited',
            cpuLimit: limit.cpuQuota && limit.cpuPeriod 
                ? `${((limit.cpuQuota / limit.cpuPeriod) * 100).toFixed(0)}%` 
                : 'Unlimited'
        }));
        
        res.json({ limits: limitsArray });
    } catch (error) {
        const errorResult = errorDisplay.showApiError('/api/system/docker-limits', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            details: errorResult.errorType 
        });
    }
});

// Get Docker container count
app.get('/api/system/container-count', async (req, res) => {
    try {
        const { stdout } = await execAsync('docker ps -q | wc -l');
        const count = parseInt(stdout.trim()) || 0;
        res.json({ count });
    } catch (error) {
        const errorResult = errorDisplay.showApiError('/api/system/container-count', error);
        res.status(500).json({ 
            error: errorResult.userMessage,
            count: 0
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
            const publicResponse = await axios.get('https://api.kaspa.org/info/blockdag', {
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

// ============================================================================
// KASPA NETWORK CONSTANTS AND CALCULATIONS
// ============================================================================
const KASPA_CONSTANTS = {
    MAX_SUPPLY: 28704026601.85,
    DEFLATIONARY_PHASE_DAA: 15778800,
    CRESCENDO_HARDFORK_DAA: 110165000, // May 5, 2025 - 10 BPS upgrade
    CHROMATIC_REWARDS: [
        { daa: 0, reward: 500 },
        { daa: 2629800, reward: 440 },
        { daa: 5259600, reward: 390 },
        { daa: 7889400, reward: 340 },
        { daa: 10519200, reward: 290 },
        { daa: 13149000, reward: 240 },
        { daa: 15778800, reward: 200 }
    ]
};

/**
 * Get block reward from kaspa.org API (most accurate)
 * Falls back to local calculation if API unavailable
 */
async function getBlockRewardFromAPI() {
    try {
        const response = await axios.get('https://api.kaspa.org/info/blockreward', {
            timeout: 5000
        });
        
        if (response.data && response.data.blockreward) {
            // API returns value directly in KAS (not sompi)
            const rewardKAS = parseFloat(response.data.blockreward);
            
            console.log(`✓ Block reward from API: ${rewardKAS} KAS`);
            return {
                blockReward: rewardKAS,
                source: 'kaspa-api',
                accurate: true
            };
        }
        throw new Error('Invalid API response');
        
    } catch (error) {
        console.warn('API block reward fetch failed:', error.message);
        return null;
    }
}

/**
 * Get block reward (subsidy only, NOT including fees)
 * 
 * CRITICAL: The coinbase transaction contains BOTH subsidy AND fees.
 * We must calculate the subsidy separately to match explorer displays.
 * 
 * Options:
 * 1. Calculate from DAA score (deterministic, accurate)
 * 2. Fetch from kaspa.org API (external dependency)
 */
async function getBlockRewardFromNode(kaspaNodeClient) {
    try {
        // First try API (most accurate)
        const apiResult = await getBlockRewardFromAPI();
        if (apiResult) {
            return apiResult;
        }
        
        // Fallback to calculated value
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        const daaScore = dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore;
        const blockReward = calculateBlockReward(daaScore);
        
        console.log(`✓ Block reward (calculated): ${blockReward.toFixed(4)} KAS (DAA: ${daaScore})`);
        
        return {
            blockReward: blockReward,
            source: 'calculated-subsidy',
            accurate: true,
            daaScore: daaScore
        };
        
    } catch (error) {
        console.error('Failed to get block reward:', error.message);
        return null;
    }
}

/**
 * OPTIONAL: Get total coinbase payout (subsidy + fees)
 * Useful for detailed block analysis, but NOT for "Block Reward" display
 */
async function getTotalCoinbaseFromNode(kaspaNodeClient) {
    try {
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        const blockHash = dagInfo.tipHashes && dagInfo.tipHashes.length > 0 
            ? dagInfo.tipHashes[0] 
            : null;
        
        if (!blockHash) {
            throw new Error('No tip hash available');
        }
        
        const block = await kaspaNodeClient.getBlock(blockHash, true);
        
        if (!block || !block.transactions || block.transactions.length === 0) {
            throw new Error('Block has no transactions');
        }
        
        // First transaction is coinbase (subsidy + fees)
        const coinbase = block.transactions[0];
        
        let totalCoinbaseSompi = 0;
        for (const output of coinbase.outputs) {
            totalCoinbaseSompi += parseInt(output.amount || 0);
        }
        
        const totalCoinbaseKAS = totalCoinbaseSompi / 100000000;
        const subsidy = calculateBlockReward(dagInfo.virtualSelectedParentBlueScore);
        const fees = totalCoinbaseKAS - subsidy;
        
        return {
            totalCoinbase: totalCoinbaseKAS,
            subsidy: subsidy,
            fees: Math.max(0, fees), // Ensure non-negative
            source: 'node-block-data'
        };
        
    } catch (error) {
        console.error('Failed to get coinbase data:', error.message);
        return null;
    }
}

/**
 * Calculate network hash rate from difficulty
 * Kaspa formula: hashrate (H/s) = difficulty * 20
 * This is derived from: (difficulty * 2^32) / (target_block_time * 2^32 / 20)
 * For Kaspa's 1-second block time with kHeavyHash algorithm
 */
function calculateNetworkHashRate(difficulty) {
    if (!difficulty || isNaN(difficulty)) return 'Unknown';
    
    // Kaspa-specific formula: hashrate = difficulty * 20
    const hashRatePerSecond = difficulty * 20;
    
    if (hashRatePerSecond >= 1e15) {
        return `${(hashRatePerSecond / 1e15).toFixed(2)} PH/s`;
    } else if (hashRatePerSecond >= 1e12) {
        return `${(hashRatePerSecond / 1e12).toFixed(2)} TH/s`;
    }
    return `${(hashRatePerSecond / 1e9).toFixed(2)} GH/s`;
}

/**
 * Calculate block reward based on DAA score
 * Kaspa has chromatic phase (0-15.7M) and deflationary phase (15.7M+)
 * After Crescendo hardfork (DAA 110.165M), block rate increased from 1 to 10 BPS
 * IMPORTANT: Emission is time-based, not DAA-based. After Crescendo, DAA increases
 * 10x faster but emission rate per second stays the same.
 */
function calculateBlockReward(daaScore) {
    let rewardPerSecond;
    
    if (daaScore < KASPA_CONSTANTS.DEFLATIONARY_PHASE_DAA) {
        // Chromatic phase - find the appropriate reward tier
        for (let i = KASPA_CONSTANTS.CHROMATIC_REWARDS.length - 1; i >= 0; i--) {
            if (daaScore >= KASPA_CONSTANTS.CHROMATIC_REWARDS[i].daa) {
                rewardPerSecond = KASPA_CONSTANTS.CHROMATIC_REWARDS[i].reward;
                break;
            }
        }
        if (!rewardPerSecond) rewardPerSecond = 500; // Initial reward
    } else {
        // Deflationary phase: starts at 200 KAS/second, halves yearly
        // Calculate actual time elapsed, accounting for Crescendo hardfork
        
        let secondsElapsed;
        if (daaScore < KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA) {
            // Before Crescendo: 1 block per second
            secondsElapsed = daaScore - KASPA_CONSTANTS.DEFLATIONARY_PHASE_DAA;
        } else {
            // After Crescendo: 10 blocks per second
            // Seconds before Crescendo
            const secondsBeforeCrescendo = KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA - KASPA_CONSTANTS.DEFLATIONARY_PHASE_DAA;
            // Seconds after Crescendo (DAA increases 10x faster)
            const daaAfterCrescendo = daaScore - KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA;
            const secondsAfterCrescendo = daaAfterCrescendo / 10;
            
            secondsElapsed = secondsBeforeCrescendo + secondsAfterCrescendo;
        }
        
        const yearsElapsed = secondsElapsed / 31536000;
        
        // Smooth monthly reduction: reward = 200 * (1/2)^(years)
        rewardPerSecond = 200 * Math.pow(0.5, yearsElapsed);
    }
    
    // After Crescendo hardfork, block rate increased from 1 to 10 BPS
    // Reward per block = reward per second / blocks per second
    if (daaScore >= KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA) {
        return rewardPerSecond / 10; // 10 blocks per second
    } else {
        return rewardPerSecond; // 1 block per second
    }
}

/**
 * Calculate circulating supply based on DAA score
 * This is a complex calculation that requires tracking through multiple emission phases
 * For now, we use an approximation based on the current phase
 */
function calculateCirculatingSupply(daaScore) {
    // Rough approximation based on current network state (~330M DAA, ~27B circulating)
    // At DAA ~330M, circulating is ~27B (94.46% of 28.7B max supply)
    const estimatedSupplyInCoins = Math.min(
        (daaScore / 330000000) * 27000000000,
        KASPA_CONSTANTS.MAX_SUPPLY
    );
    
    // Calculate percentage of max supply
    // MAX_SUPPLY is already in individual coins (28,704,026,601.85)
    const percentage = (estimatedSupplyInCoins / KASPA_CONSTANTS.MAX_SUPPLY) * 100;
    
    return {
        formatted: `${(estimatedSupplyInCoins / 1e9).toFixed(2)}B`,
        percentageFormatted: `${percentage.toFixed(2)}%`,
        raw: estimatedSupplyInCoins
    };
}

/**
 * Calculate next reward reduction
 * Kaspa reduces rewards monthly in the deflationary phase
 */
function calculateNextReduction(daaScore, currentBlockReward) {
    const DEFLATIONARY_PHASE_DAA = 15778800;
    const CRESCENDO_HARDFORK_DAA = 110165000;
    const SECONDS_PER_MONTH = 2628000; // 30.4375 days
    
    if (daaScore < DEFLATIONARY_PHASE_DAA) {
        return {
            reward: currentBlockReward / 2,
            timeRemaining: 'N/A',
            blocksRemaining: 0
        };
    }
    
    const daaFromDeflationary = daaScore - DEFLATIONARY_PHASE_DAA;
    
    // Calculate seconds elapsed since deflationary phase started
    let secondsElapsed;
    if (daaScore < CRESCENDO_HARDFORK_DAA) {
        // Before Crescendo: 1 block per second
        secondsElapsed = daaFromDeflationary;
    } else {
        // After Crescendo: 10 blocks per second
        const daaBeforeCrescendo = CRESCENDO_HARDFORK_DAA - DEFLATIONARY_PHASE_DAA;
        const daaAfterCrescendo = daaScore - CRESCENDO_HARDFORK_DAA;
        secondsElapsed = daaBeforeCrescendo + (daaAfterCrescendo / 10);
    }
    
    // Time until next reduction
    const secondsIntoMonth = secondsElapsed % SECONDS_PER_MONTH;
    const secondsUntilNext = SECONDS_PER_MONTH - secondsIntoMonth;
    
    // Calculate blocks until next reduction
    const bps = daaScore >= CRESCENDO_HARDFORK_DAA ? 10 : 1;
    const blocksUntilNext = Math.floor(secondsUntilNext * bps);
    
    // Format time remaining
    const days = Math.floor(secondsUntilNext / 86400);
    const hours = Math.floor((secondsUntilNext % 86400) / 3600);
    
    return {
        reward: currentBlockReward / 2,
        timeRemaining: days > 0 ? `${days}d ${hours}h` : `${hours}h`,
        blocksRemaining: blocksUntilNext
    };
}

// Legacy function for backward compatibility
function calculateHashRate(difficulty) {
    return calculateNetworkHashRate(difficulty);
}

// ============================================================================
// ENHANCED NETWORK API - With Complete Stats
// ============================================================================
// ENHANCED NETWORK API - With Complete Stats (Self-Contained)
// ============================================================================
app.get('/api/kaspa/network/enhanced', async (req, res) => {
    try {
        // Get DAG info
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        const nodeInfo = await kaspaNodeClient.getNodeInfo();
        const daaScore = dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore;
        
        // Get block reward from actual block data
        const blockRewardData = await getBlockRewardFromNode(kaspaNodeClient);
        const blockReward = blockRewardData ? blockRewardData.blockReward : calculateBlockReward(daaScore);
        const blockRewardSource = blockRewardData ? blockRewardData.source : 'calculated';
        const blockRewardAccurate = blockRewardData ? blockRewardData.accurate : false;
        
        // Get total coinbase (subsidy + fees) for last block
        const coinbaseData = await getTotalCoinbaseFromNode(kaspaNodeClient);
        const lastBlockCoinbase = coinbaseData ? coinbaseData.totalCoinbase : null;
        
        // Calculate hash rate (kaspa.org formula)
        const hashRate = calculateNetworkHashRate(dagInfo.difficulty);
        
        // Calculate next reduction
        const nextReduction = calculateNextReduction(daaScore, blockReward);
        
        // Calculate circulating supply
        const circulating = calculateCirculatingSupply(daaScore);
        
        // Calculate actual TPS and BPS from recent blocks (requires block analysis)
        // For now, using target values - should be enhanced to analyze recent blocks
        const tps = 10; // TODO: Calculate from recent block transaction counts
        const bps = daaScore >= KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA ? 10 : 1;
        
        res.json({
            blockHeight: daaScore,
            difficulty: dagInfo.difficulty,
            networkName: nodeInfo.networkName || 'mainnet',
            
            // Hash rate (kaspa.org formula)
            networkHashRate: hashRate,
            
            // Block reward (from actual block or calculated)
            currentBlockReward: blockReward,
            blockRewardSource: blockRewardSource,
            blockRewardAccurate: blockRewardAccurate,
            
            // Last block coinbase (subsidy + fees)
            lastBlockCoinbase: lastBlockCoinbase,
            
            // Next reduction
            nextReduction: {
                reward: nextReduction.reward,
                timeRemaining: nextReduction.timeRemaining,
                blocksRemaining: nextReduction.blocksRemaining
            },
            
            // Other stats
            circulatingSupply: circulating.formatted,
            percentMined: circulating.percentageFormatted,
            mempoolSize: nodeInfo.mempoolSize || 0,
            connectedPeers: nodeInfo.connectedPeers || 0,
            
            // TPS/BPS
            tps: tps,
            bps: bps,
            
            source: 'local-node',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Enhanced network endpoint error:', error);
        
        // Fallback to public node
        try {
            const publicClient = new KaspaNodeClient({
                host: 'seeder2.kaspad.net',
                port: 16110
            });
            await publicClient.initialize();
            
            // Repeat same logic with public client
            const dagInfo = await publicClient.getBlockDagInfo();
            const nodeInfo = await publicClient.getNodeInfo();
            const daaScore = dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore;
            
            const blockRewardData = await getBlockRewardFromNode(publicClient);
            const blockReward = blockRewardData ? blockRewardData.blockReward : calculateBlockReward(daaScore);
            const blockRewardSource = blockRewardData ? blockRewardData.source : 'calculated';
            const blockRewardAccurate = blockRewardData ? blockRewardData.accurate : false;
            
            // Get total coinbase for last block
            const coinbaseData = await getTotalCoinbaseFromNode(publicClient);
            const lastBlockCoinbase = coinbaseData ? coinbaseData.totalCoinbase : null;
            
            const hashRate = calculateNetworkHashRate(dagInfo.difficulty);
            const nextReduction = calculateNextReduction(daaScore, blockReward);
            const circulating = calculateCirculatingSupply(daaScore);
            const bps = daaScore >= KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA ? 10 : 1;
            
            res.json({
                blockHeight: daaScore,
                difficulty: dagInfo.difficulty,
                networkHashRate: hashRate,
                currentBlockReward: blockReward,
                blockRewardSource: blockRewardSource,
                blockRewardAccurate: blockRewardAccurate,
                lastBlockCoinbase: lastBlockCoinbase,
                nextReduction: {
                    reward: nextReduction.reward,
                    timeRemaining: nextReduction.timeRemaining,
                    blocksRemaining: nextReduction.blocksRemaining
                },
                circulatingSupply: circulating.formatted,
                percentMined: circulating.percentageFormatted,
                mempoolSize: nodeInfo.mempoolSize || 0,
                connectedPeers: nodeInfo.connectedPeers || 0,
                tps: 10,
                bps: bps,
                source: 'public-node',
                timestamp: new Date().toISOString()
            });
            
            publicClient.destroy();
            
        } catch (fallbackError) {
            console.error('Public gRPC node fallback failed:', fallbackError.message);

            // Tier 3: REST API fallback (works without gRPC connectivity)
            try {
                console.log('Attempting REST API fallback for enhanced network stats...');

                // Try to get blockdag info from public REST API
                let dagData = null;
                const restApis = [
                    'https://api.kaspa.org/info/blockdag',
                    'https://api.kas.fyi/info/blockdag'
                ];

                for (const apiUrl of restApis) {
                    try {
                        const response = await axios.get(apiUrl, { timeout: 5000 });
                        if (response.data && (response.data.virtualDaaScore || response.data.blockCount)) {
                            dagData = response.data;
                            break;
                        }
                    } catch (apiErr) {
                        console.log(`REST API ${apiUrl} failed:`, apiErr.message);
                    }
                }

                if (!dagData) {
                    throw new Error('All REST APIs failed');
                }

                const daaScore = dagData.virtualDaaScore || dagData.virtualSelectedParentBlueScore || dagData.blockCount;

                // Try to get block reward from API
                const blockRewardData = await getBlockRewardFromAPI();
                const blockReward = blockRewardData ? blockRewardData.blockReward : calculateBlockReward(daaScore);
                const blockRewardSource = blockRewardData ? blockRewardData.source : 'calculated';
                const blockRewardAccurate = blockRewardData ? blockRewardData.accurate : false;

                const hashRate = calculateNetworkHashRate(dagData.difficulty);
                const nextReduction = calculateNextReduction(daaScore, blockReward);
                const circulating = calculateCirculatingSupply(daaScore);
                const bps = daaScore >= KASPA_CONSTANTS.CRESCENDO_HARDFORK_DAA ? 10 : 1;

                console.log('✓ REST API fallback successful for enhanced network stats');

                res.json({
                    blockHeight: daaScore,
                    difficulty: dagData.difficulty,
                    networkHashRate: hashRate,
                    currentBlockReward: blockReward,
                    blockRewardSource: blockRewardSource,
                    blockRewardAccurate: blockRewardAccurate,
                    lastBlockCoinbase: blockReward,
                    nextReduction: {
                        reward: nextReduction.reward,
                        timeRemaining: nextReduction.timeRemaining,
                        blocksRemaining: nextReduction.blocksRemaining
                    },
                    circulatingSupply: circulating.formatted,
                    percentMined: circulating.percentageFormatted,
                    mempoolSize: 0,
                    connectedPeers: 0,
                    tps: 10,
                    bps: bps,
                    source: 'public-api',
                    timestamp: new Date().toISOString()
                });
            } catch (restApiError) {
                console.error('All network data sources failed (gRPC local, gRPC public, REST API):', restApiError.message);
                res.status(503).json({
                    error: 'Network data unavailable',
                    message: 'All data sources (local node, public node, REST API) failed',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
});

// ============================================================================
// DETAILED BLOCK REWARD BREAKDOWN - Including Fees
// ============================================================================
/**
 * Detailed block reward breakdown including fees
 */
app.get('/api/kaspa/block/reward-details', async (req, res) => {
    try {
        const coinbaseData = await getTotalCoinbaseFromNode(kaspaNodeClient);
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        const daaScore = dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore;
        
        res.json({
            daaScore: daaScore,
            blockSubsidy: calculateBlockReward(daaScore),
            totalCoinbase: coinbaseData ? coinbaseData.totalCoinbase : null,
            transactionFees: coinbaseData ? coinbaseData.fees : null,
            note: 'blockSubsidy is the emission-based reward. totalCoinbase includes transaction fees.',
            source: coinbaseData ? 'node-data' : 'calculated',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get block reward details',
            message: error.message
        });
    }
});

// ============================================================================
// ENHANCED NODE STATUS API - With Complete Info
// ============================================================================
app.get('/api/kaspa/node/status/enhanced', async (req, res) => {
    try {
        const nodeInfo = await kaspaNodeClient.getNodeInfo();
        const dagInfo = await kaspaNodeClient.getBlockDagInfo();
        
        // Get container uptime
        let uptime = '-';
        try {
            const { stdout: statsOutput } = await execAsync('docker inspect kaspa-node --format="{{.State.StartedAt}}"', {
                timeout: 3000
            });
            const startTime = new Date(statsOutput.trim());
            const uptimeSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
            
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            
            if (days > 0) {
                uptime = `${days}d ${hours}h`;
            } else if (hours > 0) {
                uptime = `${hours}h ${minutes}m`;
            } else {
                uptime = `${minutes}m`;
            }
        } catch (uptimeError) {
            // Uptime not critical, continue without it
        }
        
        res.json({
            isSynced: nodeInfo.isSynced,
            localHeight: dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore,
            networkHeight: dagInfo.virtualSelectedParentBlueScore || dagInfo.virtualDaaScore,
            connectedPeers: nodeInfo.connectedPeers || 0,
            nodeVersion: nodeInfo.serverVersion || 'Unknown',
            mempoolSize: nodeInfo.mempoolSize || 0,
            uptime: uptime,
            lastBlockTime: 'moments ago',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            error: 'Node unavailable',
            localHeight: '-',
            networkHeight: '-',
            connectedPeers: '-',
            nodeVersion: '-',
            mempoolSize: '-',
            uptime: '-',
            lastBlockTime: '-',
            timestamp: new Date().toISOString()
        });
    }
});

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
            
            // Track block rate for accurate Blocks/Hour calculation
            if (syncStatus.dag?.virtualDaaScore) {
                trackBlockRate(syncStatus.dag.virtualDaaScore);
            }
            
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
        
        // Calculate blocks per hour with chart data
        const blockRateData = calculateAccurateBlocksPerHour();
        
        res.json({
            ...syncStatus,
            localHeight: syncStatus.dag?.virtualDaaScore || syncStatus.dag?.blockCount || null,
            networkHeight: syncStatus.dag?.virtualDaaScore || null,
            connectedPeers: syncStatus.rpc?.connectedPeers ?? syncStatus.peersConnected ?? null,
            nodeVersion: syncStatus.rpc?.serverVersion || null,
            blocksPerHour: blockRateData,
            mempoolSize: syncStatus.rpc?.mempoolSize || 0,
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

// Updates API - return cached or fresh update check
app.get('/api/updates/available', async (req, res) => {
    try {
        const ONE_HOUR = 60 * 60 * 1000;
        const cacheStale = !lastUpdateCheck || (Date.now() - lastUpdateCheck > ONE_HOUR);

        if (cacheStale || cachedUpdates === null) {
            cachedUpdates = await updateMonitor.getAvailableUpdates();
            lastUpdateCheck = Date.now();
        }

        res.json({
            updates: cachedUpdates,
            lastChecked: lastUpdateCheck ? new Date(lastUpdateCheck).toISOString() : null
        });
    } catch (error) {
        lastUpdateCheck = Date.now(); // stamp even on failure to enforce back-off
        console.error('On-demand update check failed:', error.message);
        const isNetworkError = /rate limit|timeout|not found|network|ECONNREFUSED|ENOTFOUND/i.test(error.message);
        res.status(isNetworkError ? 503 : 500).json({
            error: isNetworkError ? 'Update check temporarily unavailable' : 'Failed to check for updates',
            message: error.message
        });
    }
});

// Force a fresh update check (clears cache)
app.post('/api/updates/check', async (req, res) => {
    try {
        cachedUpdates = await updateMonitor.getAvailableUpdates();
        lastUpdateCheck = Date.now();

        res.json({
            updates: cachedUpdates,
            lastChecked: new Date(lastUpdateCheck).toISOString()
        });
    } catch (error) {
        lastUpdateCheck = Date.now(); // stamp even on failure to enforce back-off
        console.error('Forced update check failed:', error.message);
        const isNetworkError = /rate limit|timeout|not found|network|ECONNREFUSED|ENOTFOUND/i.test(error.message);
        res.status(isNetworkError ? 503 : 500).json({
            error: isNetworkError ? 'Update check temporarily unavailable' : 'Failed to check for updates',
            message: error.message
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

// Initialize Update Monitor
const updateMonitor = new UpdateMonitor();
let cachedUpdates = null;
let lastUpdateCheck = null;

// Schedule periodic update checks (runs immediately, then every 24h)
updateMonitor.scheduleUpdateChecks((err, updates) => {
    lastUpdateCheck = Date.now(); // always record attempt time to prevent retry storms
    if (err) {
        console.warn('[UpdateMonitor] Scheduled check failed:', err.message);
    } else {
        cachedUpdates = updates;
    }
});

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
