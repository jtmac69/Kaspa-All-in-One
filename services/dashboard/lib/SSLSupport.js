const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * SSL/TLS Support Module
 * Handles HTTPS server creation and WebSocket Secure (WSS) connections
 */

/**
 * SSL Configuration
 */
const SSL_CONFIG = {
    // Default SSL certificate paths
    defaultPaths: {
        key: process.env.SSL_KEY_PATH || '/etc/ssl/private/dashboard.key',
        cert: process.env.SSL_CERT_PATH || '/etc/ssl/certs/dashboard.crt',
        ca: process.env.SSL_CA_PATH || null
    },
    
    // SSL options
    options: {
        // Minimum TLS version
        secureProtocol: 'TLSv1_2_method',
        
        // Cipher suites (secure configurations)
        ciphers: [
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES128-SHA256',
            'ECDHE-RSA-AES256-SHA384'
        ].join(':'),
        
        // Honor cipher order
        honorCipherOrder: true,
        
        // Disable insecure SSL/TLS versions
        secureOptions: require('constants').SSL_OP_NO_SSLv2 | 
                      require('constants').SSL_OP_NO_SSLv3 | 
                      require('constants').SSL_OP_NO_TLSv1 |
                      require('constants').SSL_OP_NO_TLSv1_1
    }
};

/**
 * Check if SSL certificates exist and are valid
 */
function checkSSLCertificates() {
    const { key, cert, ca } = SSL_CONFIG.defaultPaths;
    
    try {
        // Check if key file exists and is readable
        if (!fs.existsSync(key)) {
            return { valid: false, error: `SSL key file not found: ${key}` };
        }
        
        // Check if certificate file exists and is readable
        if (!fs.existsSync(cert)) {
            return { valid: false, error: `SSL certificate file not found: ${cert}` };
        }
        
        // Try to read the files
        const keyContent = fs.readFileSync(key, 'utf8');
        const certContent = fs.readFileSync(cert, 'utf8');
        
        // Basic validation of file contents
        if (!keyContent.includes('BEGIN PRIVATE KEY') && !keyContent.includes('BEGIN RSA PRIVATE KEY')) {
            return { valid: false, error: 'Invalid SSL key file format' };
        }
        
        if (!certContent.includes('BEGIN CERTIFICATE')) {
            return { valid: false, error: 'Invalid SSL certificate file format' };
        }
        
        // Check CA file if specified
        if (ca && fs.existsSync(ca)) {
            const caContent = fs.readFileSync(ca, 'utf8');
            if (!caContent.includes('BEGIN CERTIFICATE')) {
                return { valid: false, error: 'Invalid SSL CA file format' };
            }
        }
        
        return { valid: true };
        
    } catch (error) {
        return { valid: false, error: `SSL certificate validation failed: ${error.message}` };
    }
}

/**
 * Load SSL certificates
 */
function loadSSLCertificates() {
    const { key, cert, ca } = SSL_CONFIG.defaultPaths;
    
    try {
        const sslOptions = {
            key: fs.readFileSync(key),
            cert: fs.readFileSync(cert),
            ...SSL_CONFIG.options
        };
        
        // Add CA certificate if available
        if (ca && fs.existsSync(ca)) {
            sslOptions.ca = fs.readFileSync(ca);
        }
        
        return sslOptions;
        
    } catch (error) {
        throw new Error(`Failed to load SSL certificates: ${error.message}`);
    }
}

/**
 * Create HTTPS server
 */
function createHTTPSServer(app) {
    const certCheck = checkSSLCertificates();
    
    if (!certCheck.valid) {
        throw new Error(certCheck.error);
    }
    
    const sslOptions = loadSSLCertificates();
    return https.createServer(sslOptions, app);
}

/**
 * HTTPS redirect middleware
 */
function httpsRedirect(req, res, next) {
    // Only redirect in production and if not already HTTPS
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
        const httpsUrl = `https://${req.get('Host')}${req.url}`;
        return res.redirect(301, httpsUrl);
    }
    next();
}

/**
 * Security headers middleware for HTTPS
 */
function securityHeaders(req, res, next) {
    // Strict Transport Security (HSTS)
    if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Prevent mixed content
    res.setHeader('Content-Security-Policy', "upgrade-insecure-requests");
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
}

/**
 * WebSocket Secure (WSS) configuration
 */
function configureWSS(server, wsManager) {
    // The WebSocket server will automatically use WSS if the HTTP server is HTTPS
    // Additional WSS-specific configuration can be added here
    
    return {
        server: server,
        verifyClient: (info) => {
            // Additional client verification for WSS connections
            const origin = info.origin;
            const secure = info.secure;
            
            // In production, require secure connections
            if (process.env.NODE_ENV === 'production' && !secure) {
                console.warn(`Rejected insecure WebSocket connection from ${origin}`);
                return false;
            }
            
            return true;
        }
    };
}

/**
 * Generate self-signed certificate for development
 */
function generateSelfSignedCert() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    return new Promise(async (resolve, reject) => {
        try {
            const keyPath = SSL_CONFIG.defaultPaths.key;
            const certPath = SSL_CONFIG.defaultPaths.cert;
            
            // Create directories if they don't exist
            const keyDir = path.dirname(keyPath);
            const certDir = path.dirname(certPath);
            
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
            }
            
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }
            
            // Generate self-signed certificate
            const command = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;
            
            await execAsync(command);
            
            console.log('Self-signed SSL certificate generated successfully');
            resolve({ keyPath, certPath });
            
        } catch (error) {
            reject(new Error(`Failed to generate self-signed certificate: ${error.message}`));
        }
    });
}

/**
 * SSL certificate monitoring and renewal
 */
function monitorCertificateExpiry() {
    const { cert } = SSL_CONFIG.defaultPaths;
    
    if (!fs.existsSync(cert)) {
        return null;
    }
    
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Check certificate expiry
        execAsync(`openssl x509 -in ${cert} -noout -dates`)
            .then(({ stdout }) => {
                const lines = stdout.split('\n');
                const notAfterLine = lines.find(line => line.startsWith('notAfter='));
                
                if (notAfterLine) {
                    const expiryDate = new Date(notAfterLine.split('=')[1]);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilExpiry <= 30) {
                        console.warn(`SSL certificate expires in ${daysUntilExpiry} days. Consider renewal.`);
                    }
                    
                    return { expiryDate, daysUntilExpiry };
                }
            })
            .catch(error => {
                console.error('Failed to check certificate expiry:', error.message);
            });
            
    } catch (error) {
        console.error('Certificate monitoring error:', error.message);
    }
}

/**
 * Initialize SSL support
 */
function initializeSSL(app, options = {}) {
    const {
        forceHTTPS = process.env.NODE_ENV === 'production',
        generateSelfSigned = process.env.NODE_ENV === 'development',
        monitorExpiry = true
    } = options;
    
    // Check if SSL should be enabled
    const sslEnabled = process.env.SSL_ENABLED === 'true' || forceHTTPS;
    
    if (!sslEnabled) {
        console.log('SSL disabled, running HTTP server');
        return { server: null, ssl: false };
    }
    
    try {
        // Check existing certificates
        let certCheck = checkSSLCertificates();
        
        // Generate self-signed certificate for development if needed
        if (!certCheck.valid && generateSelfSigned) {
            console.log('Generating self-signed certificate for development...');
            generateSelfSignedCert()
                .then(() => {
                    console.log('Self-signed certificate generated');
                })
                .catch(error => {
                    console.error('Failed to generate self-signed certificate:', error.message);
                });
        }
        
        // Re-check after potential generation
        certCheck = checkSSLCertificates();
        
        if (!certCheck.valid) {
            throw new Error(certCheck.error);
        }
        
        // Create HTTPS server
        const httpsServer = createHTTPSServer(app);
        
        // Add security middleware
        app.use(securityHeaders);
        
        if (forceHTTPS) {
            app.use(httpsRedirect);
        }
        
        // Monitor certificate expiry
        if (monitorExpiry) {
            monitorCertificateExpiry();
            // Check expiry daily
            setInterval(monitorCertificateExpiry, 24 * 60 * 60 * 1000);
        }
        
        console.log('SSL/HTTPS support initialized successfully');
        
        return {
            server: httpsServer,
            ssl: true,
            configureWSS: (wsManager) => configureWSS(httpsServer, wsManager)
        };
        
    } catch (error) {
        console.error('SSL initialization failed:', error.message);
        
        if (forceHTTPS) {
            throw error;
        }
        
        console.log('Falling back to HTTP server');
        return { server: null, ssl: false };
    }
}

module.exports = {
    checkSSLCertificates,
    loadSSLCertificates,
    createHTTPSServer,
    httpsRedirect,
    securityHeaders,
    configureWSS,
    generateSelfSignedCert,
    monitorCertificateExpiry,
    initializeSSL,
    SSL_CONFIG
};