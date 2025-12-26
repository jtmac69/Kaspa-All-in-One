const Joi = require('joi');
const { body, param, query, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Validation schemas using Joi
 */
const schemas = {
    serviceName: Joi.string()
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.pattern.base': 'Service name must contain only alphanumeric characters, hyphens, and underscores',
            'string.min': 'Service name must be at least 1 character long',
            'string.max': 'Service name must be at most 50 characters long'
        }),

    kaspaAddress: Joi.string()
        .pattern(/^kaspa:[a-z0-9]{61,63}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid Kaspa address format'
        }),

    transactionAmount: Joi.number()
        .positive()
        .precision(8)
        .max(28400000000) // Max KAS supply
        .required()
        .messages({
            'number.positive': 'Transaction amount must be positive',
            'number.max': 'Transaction amount exceeds maximum possible value'
        }),

    logQuery: Joi.string()
        .max(200)
        .pattern(/^[a-zA-Z0-9\s\-_.:\/\[\]]+$/)
        .allow('')
        .messages({
            'string.pattern.base': 'Log search query contains invalid characters',
            'string.max': 'Log search query must be at most 200 characters'
        }),

    alertThresholds: Joi.object({
        cpu: Joi.number().min(0).max(100),
        memory: Joi.number().min(0).max(100),
        disk: Joi.number().min(0).max(100),
        load: Joi.number().min(0).max(1000)
    }).required(),

    pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(1000).default(100)
    })
};

/**
 * Generic validation middleware factory
 */
function validateSchema(schema, source = 'body') {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { 
            abortEarly: false,
            stripUnknown: true 
        });

        if (error) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        req[source] = value;
        next();
    };
}

/**
 * Express-validator based validators
 */
const validators = {
    serviceName: [
        param('serviceName')
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('Service name must contain only alphanumeric characters, hyphens, and underscores')
            .isLength({ min: 1, max: 50 })
            .withMessage('Service name must be between 1 and 50 characters')
    ],

    kaspaAddress: [
        body('address')
            .matches(/^kaspa:[a-z0-9]{61,63}$/)
            .withMessage('Invalid Kaspa address format')
    ],

    transactionAmount: [
        body('amount')
            .isFloat({ min: 0.00000001, max: 28400000000 })
            .withMessage('Invalid transaction amount')
    ],

    logSearch: [
        query('search')
            .optional()
            .matches(/^[a-zA-Z0-9\s\-_.:\/\[\]]*$/)
            .withMessage('Log search query contains invalid characters')
            .isLength({ max: 200 })
            .withMessage('Log search query too long')
    ],

    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Limit must be between 1 and 1000')
            .toInt()
    ]
};

/**
 * Validation result handler
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
}

/**
 * Sanitization functions
 */
const sanitizers = {
    /**
     * Sanitize HTML content to prevent XSS
     */
    sanitizeHtml: (content) => {
        if (typeof content !== 'string') return content;
        return DOMPurify.sanitize(content, { 
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: []
        });
    },

    /**
     * Sanitize log content for display
     */
    sanitizeLogContent: (logContent) => {
        if (typeof logContent !== 'string') return logContent;
        
        // Remove potential sensitive patterns
        return logContent
            .replace(/password[=:]\s*[^\s]+/gi, 'password=***')
            .replace(/token[=:]\s*[^\s]+/gi, 'token=***')
            .replace(/key[=:]\s*[^\s]+/gi, 'key=***')
            .replace(/secret[=:]\s*[^\s]+/gi, 'secret=***')
            .replace(/auth[=:]\s*[^\s]+/gi, 'auth=***');
    },

    /**
     * Sanitize configuration data for display
     */
    sanitizeConfig: (config) => {
        if (typeof config !== 'object' || config === null) return config;
        
        const sanitized = { ...config };
        const sensitiveKeys = [
            'password', 'passwd', 'pwd',
            'secret', 'key', 'token',
            'auth', 'credential', 'private'
        ];

        Object.keys(sanitized).forEach(key => {
            const value = sanitized[key];
            const lowerKey = key.toLowerCase();
            
            if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = sanitizers.sanitizeConfig(value);
            } else if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '***';
            }
        });

        return sanitized;
    },

    /**
     * Sanitize wallet information for display
     */
    sanitizeWalletInfo: (walletInfo) => {
        if (typeof walletInfo !== 'object' || walletInfo === null) return walletInfo;
        
        const sanitized = { ...walletInfo };
        
        // Mask private keys, seeds, and other sensitive data
        if (sanitized.privateKey) sanitized.privateKey = '***';
        if (sanitized.seed) sanitized.seed = '***';
        if (sanitized.mnemonic) sanitized.mnemonic = '***';
        if (sanitized.xprv) sanitized.xprv = '***';
        
        return sanitized;
    }
};

/**
 * Middleware to sanitize request body
 */
function sanitizeRequestBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? sanitizers.sanitizeHtml(obj) : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    const sanitized = {};
    Object.keys(obj).forEach(key => {
        sanitized[key] = sanitizeObject(obj[key]);
    });

    return sanitized;
}

/**
 * Kaspa address validation function
 */
function isValidKaspaAddress(address) {
    if (typeof address !== 'string') return false;
    
    // Basic Kaspa address format validation
    const kaspaAddressRegex = /^kaspa:[a-z0-9]{61,63}$/;
    return kaspaAddressRegex.test(address);
}

/**
 * Service name validation function
 */
function isValidServiceName(serviceName) {
    if (typeof serviceName !== 'string') return false;
    
    const validServices = [
        'kaspa-node', 'dashboard', 'nginx',
        'kasia-indexer', 'kasia-app',
        'k-indexer', 'k-social',
        'simply-kaspa-indexer', 'kaspa-stratum',
        'indexer-db', 'archive-db', 'archive-indexer',
        'portainer', 'pgadmin'
    ];
    
    return validServices.includes(serviceName) && /^[a-zA-Z0-9_-]+$/.test(serviceName);
}

module.exports = {
    schemas,
    validateSchema,
    validators,
    handleValidationErrors,
    sanitizers,
    sanitizeRequestBody,
    isValidKaspaAddress,
    isValidServiceName
};