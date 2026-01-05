/**
 * Centralized Path Resolution Module
 * 
 * This module provides consistent path resolution across all Kaspa All-in-One services.
 * It ensures that paths work correctly whether running:
 * - In development (from workspace directory)
 * - In production (installed to /opt/kaspa-aio)
 * - Via systemd services (with PROJECT_ROOT env var)
 * 
 * Priority order for determining project root:
 * 1. PROJECT_ROOT environment variable (set by scripts/wizard.sh and systemd)
 * 2. Relative path resolution from __dirname (for development)
 * 3. Default installation directory /opt/kaspa-aio (for production)
 */

const path = require('path');
const fs = require('fs');

// Default installation directory (matches install.sh INSTALL_DIR)
const DEFAULT_INSTALL_DIR = '/opt/kaspa-aio';

/**
 * Cache for resolved project root to avoid repeated filesystem checks
 */
let cachedProjectRoot = null;

/**
 * Get the project root directory
 * 
 * @param {string} [callerDirname] - The __dirname of the calling module (optional)
 * @returns {string} The absolute path to the project root
 */
function getProjectRoot(callerDirname = null) {
    // Return cached value if available
    if (cachedProjectRoot) {
        return cachedProjectRoot;
    }

    // Priority 1: Use PROJECT_ROOT environment variable if set
    if (process.env.PROJECT_ROOT) {
        cachedProjectRoot = process.env.PROJECT_ROOT;
        return cachedProjectRoot;
    }

    // Priority 2: Try to resolve from caller's __dirname if provided
    if (callerDirname) {
        const resolved = resolveFromDirname(callerDirname);
        if (resolved) {
            cachedProjectRoot = resolved;
            return cachedProjectRoot;
        }
    }

    // Priority 3: Check if default installation directory exists
    if (fs.existsSync(DEFAULT_INSTALL_DIR)) {
        cachedProjectRoot = DEFAULT_INSTALL_DIR;
        return cachedProjectRoot;
    }

    // Priority 4: Try to find project root by looking for marker files
    const markerFiles = ['docker-compose.yml', 'install.sh', '.kaspa-aio'];
    let currentDir = process.cwd();
    
    for (let i = 0; i < 10; i++) { // Limit search depth
        for (const marker of markerFiles) {
            if (fs.existsSync(path.join(currentDir, marker))) {
                cachedProjectRoot = currentDir;
                return cachedProjectRoot;
            }
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // Reached root
        currentDir = parentDir;
    }

    // Fallback to default installation directory
    cachedProjectRoot = DEFAULT_INSTALL_DIR;
    return cachedProjectRoot;
}

/**
 * Resolve project root from a module's __dirname
 * 
 * @param {string} dirname - The __dirname of the calling module
 * @returns {string|null} The resolved project root or null if not found
 */
function resolveFromDirname(dirname) {
    // Known path patterns and their relative paths to project root
    const pathPatterns = [
        // services/wizard/backend/src/api/*.js -> 5 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend[\/\\]src[\/\\]api$/, levels: 5 },
        // services/wizard/backend/src/utils/*.js -> 5 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend[\/\\]src[\/\\]utils$/, levels: 5 },
        // services/wizard/backend/src/utils/profile/*.js -> 6 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend[\/\\]src[\/\\]utils[\/\\]profile$/, levels: 6 },
        // services/wizard/backend/src/middleware/*.js -> 5 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend[\/\\]src[\/\\]middleware$/, levels: 5 },
        // services/wizard/backend/src/*.js -> 4 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend[\/\\]src$/, levels: 4 },
        // services/wizard/backend/*.js -> 3 levels up
        { pattern: /services[\/\\]wizard[\/\\]backend$/, levels: 3 },
        // services/dashboard/lib/*.js -> 3 levels up
        { pattern: /services[\/\\]dashboard[\/\\]lib$/, levels: 3 },
        // services/dashboard/*.js -> 2 levels up
        { pattern: /services[\/\\]dashboard$/, levels: 2 },
        // services/shared/lib/*.js -> 3 levels up
        { pattern: /services[\/\\]shared[\/\\]lib$/, levels: 3 },
        // services/*/*.js -> 2 levels up (generic)
        { pattern: /services[\/\\][^\/\\]+$/, levels: 2 },
    ];

    for (const { pattern, levels } of pathPatterns) {
        if (pattern.test(dirname)) {
            const resolved = path.resolve(dirname, ...Array(levels).fill('..'));
            // Verify this looks like a project root
            if (isProjectRoot(resolved)) {
                return resolved;
            }
        }
    }

    return null;
}

/**
 * Check if a directory looks like the project root
 * 
 * @param {string} dir - Directory to check
 * @returns {boolean} True if directory appears to be project root
 */
function isProjectRoot(dir) {
    const markerFiles = ['docker-compose.yml', 'install.sh'];
    const markerDirs = ['.kaspa-aio', 'services', 'scripts'];
    
    try {
        // Check for at least one marker file
        const hasMarkerFile = markerFiles.some(f => fs.existsSync(path.join(dir, f)));
        // Check for at least one marker directory
        const hasMarkerDir = markerDirs.some(d => {
            const fullPath = path.join(dir, d);
            return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
        });
        
        return hasMarkerFile || hasMarkerDir;
    } catch {
        return false;
    }
}

/**
 * Clear the cached project root (useful for testing)
 */
function clearCache() {
    cachedProjectRoot = null;
}

/**
 * Get common paths relative to project root
 * 
 * @param {string} [callerDirname] - The __dirname of the calling module (optional)
 * @returns {Object} Object containing common paths
 */
function getPaths(callerDirname = null) {
    const root = getProjectRoot(callerDirname);
    
    return {
        root,
        env: path.join(root, '.env'),
        dockerCompose: path.join(root, 'docker-compose.yml'),
        kaspaAioDir: path.join(root, '.kaspa-aio'),
        installationState: path.join(root, '.kaspa-aio', 'installation-state.json'),
        wizardState: path.join(root, '.kaspa-aio', 'wizard-state.json'),
        configHistory: path.join(root, '.kaspa-aio', 'config-history.json'),
        backupDir: path.join(root, '.kaspa-backups'),
        diagnosticsDir: path.join(root, '.kaspa-diagnostics'),
        logsDir: path.join(root, 'logs'),
        servicesDir: path.join(root, 'services'),
        scriptsDir: path.join(root, 'scripts'),
        configDir: path.join(root, 'config'),
    };
}

/**
 * Create a path resolver bound to a specific module's __dirname
 * This is the recommended way to use this module
 * 
 * @param {string} dirname - The __dirname of the calling module
 * @returns {Object} Object with getProjectRoot and getPaths methods
 * 
 * @example
 * // In services/wizard/backend/src/api/some-api.js
 * const { createResolver } = require('../../shared/lib/path-resolver');
 * const resolver = createResolver(__dirname);
 * const projectRoot = resolver.getProjectRoot();
 * const paths = resolver.getPaths();
 */
function createResolver(dirname) {
    return {
        getProjectRoot: () => getProjectRoot(dirname),
        getPaths: () => getPaths(dirname),
    };
}

module.exports = {
    getProjectRoot,
    getPaths,
    createResolver,
    clearCache,
    DEFAULT_INSTALL_DIR,
};
