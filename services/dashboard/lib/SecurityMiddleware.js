const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * CORS configuration
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In production, restrict to specific origins
        const allowedOrigins = process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://localhost:8080'];
        
        // Allow localhost and the dashboard's own origin
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
        const isAllowed = allowedOrigins.includes(origin) || isLocalhost;
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
};

/**
 * Rate limiting configurations
 */
const rateLimiters = {
    // General API rate limiting
    general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Limit each IP to 1000 requests per windowMs
        message: {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: '15 minutes'
            });
        }
    }),

    // Stricter rate limiting for service control operations
    serviceControl: rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 50, // Limit each IP to 50 service control requests per 5 minutes
        message: {
            error: 'Too many service control requests',
            message: 'Service control rate limit exceeded. Please wait before trying again.',
            retryAfter: '5 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many service control requests',
                message: 'Service control rate limit exceeded. Please wait before trying again.',
                retryAfter: '5 minutes'
            });
        }
    }),

    // Very strict rate limiting for wallet operations
    walletOperations: rateLimit({
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 10, // Limit each IP to 10 wallet operations per 10 minutes
        message: {
            error: 'Too many wallet operations',
            message: 'Wallet operation rate limit exceeded. Please wait before trying again.',
            retryAfter: '10 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many wallet operations',
                message: 'Wallet operation rate limit exceeded. Please wait before trying again.',
                retryAfter: '10 minutes'
            });
        }
    }),

    // Rate limiting for authentication attempts (if implemented)
    auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 auth attempts per 15 minutes
        message: {
            error: 'Too many authentication attempts',
            message: 'Authentication rate limit exceeded. Please wait before trying again.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many authentication attempts',
                message: 'Authentication rate limit exceeded. Please wait before trying again.',
                retryAfter: '15 minutes'
            });
        }
    }),

    // Rate limiting for log access
    logs: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 log requests per minute
        message: {
            error: 'Too many log requests',
            message: 'Log access rate limit exceeded. Please wait before trying again.',
            retryAfter: '1 minute'
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too many log requests',
                message: 'Log access rate limit exceeded. Please wait before trying again.',
                retryAfter: '1 minute'
            });
        }
    })
};

/**
 * Helmet security configuration
 */
const helmetOptions = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Disable for WebSocket compatibility
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
};

/**
 * Request validation middleware
 */
function validateRequest(req, res, next) {
    // Check for common attack patterns in URL
    const suspiciousPatterns = [
        /\.\./,           // Path traversal
        /<script/i,       // XSS attempts
        /javascript:/i,   // JavaScript injection
        /vbscript:/i,     // VBScript injection
        /onload=/i,       // Event handler injection
        /onerror=/i       // Error handler injection
    ];

    const url = req.url;
    const userAgent = req.get('User-Agent') || '';

    // Check URL for suspicious patterns
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains suspicious patterns'
        });
    }

    // Check for empty or suspicious user agents
    if (!userAgent || userAgent.length < 5) {
        // Log but don't block - some legitimate tools have short user agents
        console.warn(`Suspicious user agent: ${userAgent} from IP: ${req.ip}`);
    }

    // Check request size (already handled by express.json limit, but double-check)
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
            error: 'Request too large',
            message: 'Request body exceeds maximum size limit'
        });
    }

    next();
}

/**
 * IP whitelist middleware (for admin operations)
 */
function createIPWhitelist(allowedIPs = []) {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Always allow localhost
        const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
        const isLocalhost = localhostIPs.includes(clientIP);
        
        if (isLocalhost || allowedIPs.includes(clientIP)) {
            next();
        } else {
            res.status(403).json({
                error: 'Access denied',
                message: 'IP address not authorized for this operation'
            });
        }
    };
}

/**
 * Request logging middleware for security monitoring
 */
function securityLogger(req, res, next) {
    const startTime = Date.now();
    
    // Log security-relevant requests
    const securityEndpoints = [
        '/api/services/',
        '/api/kaspa/wallet',
        '/api/config',
        '/api/system/'
    ];

    const isSecurityEndpoint = securityEndpoints.some(endpoint => 
        req.path.startsWith(endpoint)
    );

    if (isSecurityEndpoint) {
        console.log(`[SECURITY] ${req.method} ${req.path} from ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    }

    // Override res.json to log response status for security endpoints
    const originalJson = res.json;
    res.json = function(data) {
        if (isSecurityEndpoint) {
            const duration = Date.now() - startTime;
            console.log(`[SECURITY] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
            
            // Log failed operations
            if (res.statusCode >= 400) {
                console.warn(`[SECURITY] Failed request: ${req.method} ${req.path} - Status: ${res.statusCode} - IP: ${req.ip}`);
            }
        }
        return originalJson.call(this, data);
    };

    next();
}

/**
 * Error handling middleware for security errors
 */
function securityErrorHandler(err, req, res, next) {
    // Log security-related errors
    if (err.message && err.message.includes('CORS')) {
        console.warn(`[SECURITY] CORS error from ${req.ip}: ${err.message}`);
        return res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed'
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        console.warn(`[SECURITY] File size limit exceeded from ${req.ip}`);
        return res.status(413).json({
            error: 'File too large',
            message: 'Uploaded file exceeds size limit'
        });
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
        console.error(`[SECURITY] Internal error: ${err.message}`);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred'
        });
    }

    next(err);
}

module.exports = {
    corsOptions,
    rateLimiters,
    helmetOptions,
    validateRequest,
    createIPWhitelist,
    securityLogger,
    securityErrorHandler
};