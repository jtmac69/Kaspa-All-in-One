/**
 * Data Masking Module
 * Handles masking of sensitive information in various contexts
 */

/**
 * Sensitive field patterns to identify and mask
 */
const SENSITIVE_PATTERNS = {
    // Password-related fields
    passwords: [
        'password', 'passwd', 'pwd', 'pass',
        'secret', 'key', 'token', 'auth',
        'credential', 'private', 'priv'
    ],
    
    // Wallet-specific sensitive fields
    wallet: [
        'privatekey', 'private_key', 'privkey',
        'seed', 'mnemonic', 'phrase',
        'xprv', 'wif', 'masterkey'
    ],
    
    // Database and connection strings
    connections: [
        'connection_string', 'connectionstring',
        'database_url', 'db_url', 'dsn'
    ],
    
    // API keys and tokens
    apiKeys: [
        'api_key', 'apikey', 'access_token',
        'refresh_token', 'bearer_token',
        'jwt', 'session_id', 'csrf_token'
    ]
};

/**
 * Masking configurations
 */
const MASKING_CONFIG = {
    // Default mask character
    maskChar: '*',
    
    // Number of characters to show at start/end for partial masking
    partialMask: {
        start: 4,
        end: 4,
        minLength: 12 // Minimum length to apply partial masking
    },
    
    // Complete masking for short sensitive values
    completeMask: '***',
    
    // Address masking (show first and last few characters)
    addressMask: {
        start: 8,
        end: 8,
        minLength: 20
    }
};

/**
 * Check if a field name indicates sensitive data
 */
function isSensitiveField(fieldName) {
    if (typeof fieldName !== 'string') return false;
    
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check all sensitive pattern categories
    const allPatterns = [
        ...SENSITIVE_PATTERNS.passwords,
        ...SENSITIVE_PATTERNS.wallet,
        ...SENSITIVE_PATTERNS.connections,
        ...SENSITIVE_PATTERNS.apiKeys
    ];
    
    return allPatterns.some(pattern => 
        lowerFieldName.includes(pattern.toLowerCase())
    );
}

/**
 * Mask a string value based on masking type
 */
function maskString(value, maskingType = 'complete') {
    if (typeof value !== 'string' || value.length === 0) {
        return value;
    }
    
    switch (maskingType) {
        case 'partial':
            return applyPartialMask(value, MASKING_CONFIG.partialMask);
        
        case 'address':
            return applyPartialMask(value, MASKING_CONFIG.addressMask);
        
        case 'complete':
        default:
            return MASKING_CONFIG.completeMask;
    }
}

/**
 * Apply partial masking (show start and end characters)
 */
function applyPartialMask(value, config) {
    if (value.length < config.minLength) {
        return MASKING_CONFIG.completeMask;
    }
    
    const start = value.substring(0, config.start);
    const end = value.substring(value.length - config.end);
    const middleLength = value.length - config.start - config.end;
    const middle = MASKING_CONFIG.maskChar.repeat(Math.max(3, middleLength));
    
    return `${start}${middle}${end}`;
}

/**
 * Mask configuration object
 */
function maskConfiguration(config) {
    if (typeof config !== 'object' || config === null) {
        return config;
    }
    
    const masked = {};
    
    Object.keys(config).forEach(key => {
        const value = config[key];
        
        if (isSensitiveField(key)) {
            // Determine masking type based on field name
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('address') || lowerKey.includes('addr')) {
                masked[key] = maskString(value, 'address');
            } else if (lowerKey.includes('url') || lowerKey.includes('connection')) {
                masked[key] = maskString(value, 'partial');
            } else {
                masked[key] = maskString(value, 'complete');
            }
        } else if (typeof value === 'object' && value !== null) {
            // Recursively mask nested objects
            masked[key] = maskConfiguration(value);
        } else {
            masked[key] = value;
        }
    });
    
    return masked;
}

/**
 * Mask wallet information
 */
function maskWalletInfo(walletInfo) {
    if (typeof walletInfo !== 'object' || walletInfo === null) {
        return walletInfo;
    }
    
    const masked = { ...walletInfo };
    
    // Specific wallet field masking
    const walletFields = {
        // Complete masking for highly sensitive fields
        privateKey: 'complete',
        private_key: 'complete',
        seed: 'complete',
        mnemonic: 'complete',
        xprv: 'complete',
        wif: 'complete',
        
        // Partial masking for addresses (show prefix and suffix)
        address: 'address',
        publicKey: 'partial',
        public_key: 'partial',
        xpub: 'partial'
    };
    
    Object.keys(walletFields).forEach(field => {
        if (masked[field]) {
            masked[field] = maskString(masked[field], walletFields[field]);
        }
    });
    
    // Mask transaction details if present
    if (masked.transactions && Array.isArray(masked.transactions)) {
        masked.transactions = masked.transactions.map(tx => ({
            ...tx,
            // Keep transaction IDs visible but mask sensitive fields
            from: Array.isArray(tx.from) ? tx.from.map(addr => maskString(addr, 'address')) : tx.from,
            to: Array.isArray(tx.to) ? tx.to.map(addr => maskString(addr, 'address')) : tx.to
        }));
    }
    
    return masked;
}

/**
 * Sanitize log content to remove sensitive information
 */
function sanitizeLogContent(logContent) {
    if (typeof logContent !== 'string') {
        return logContent;
    }
    
    let sanitized = logContent;
    
    // Patterns to match and replace sensitive information in logs
    const logPatterns = [
        // Password patterns
        { pattern: /password[=:\s]+[^\s\n]+/gi, replacement: 'password=***' },
        { pattern: /passwd[=:\s]+[^\s\n]+/gi, replacement: 'passwd=***' },
        { pattern: /pwd[=:\s]+[^\s\n]+/gi, replacement: 'pwd=***' },
        
        // Token patterns
        { pattern: /token[=:\s]+[^\s\n]+/gi, replacement: 'token=***' },
        { pattern: /bearer[=:\s]+[^\s\n]+/gi, replacement: 'bearer=***' },
        { pattern: /jwt[=:\s]+[^\s\n]+/gi, replacement: 'jwt=***' },
        
        // Key patterns
        { pattern: /key[=:\s]+[^\s\n]+/gi, replacement: 'key=***' },
        { pattern: /secret[=:\s]+[^\s\n]+/gi, replacement: 'secret=***' },
        { pattern: /auth[=:\s]+[^\s\n]+/gi, replacement: 'auth=***' },
        
        // Connection string patterns
        { pattern: /postgresql:\/\/[^\s\n]+/gi, replacement: 'postgresql://***:***@***:***/**' },
        { pattern: /mysql:\/\/[^\s\n]+/gi, replacement: 'mysql://***:***@***:***/**' },
        { pattern: /mongodb:\/\/[^\s\n]+/gi, replacement: 'mongodb://***:***@***:***/**' },
        
        // Kaspa addresses in logs (partial masking)
        { 
            pattern: /kaspa:[a-z0-9]{61,63}/gi, 
            replacement: (match) => maskString(match, 'address')
        },
        
        // Private keys (complete masking)
        { pattern: /[a-fA-F0-9]{64}/g, replacement: '***' },
        
        // Credit card numbers (if any appear in logs)
        { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****-****-****-****' },
        
        // Email addresses (partial masking)
        { 
            pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            replacement: (match) => {
                const [local, domain] = match.split('@');
                const maskedLocal = local.length > 2 ? 
                    local.substring(0, 2) + '***' : 
                    '***';
                return `${maskedLocal}@${domain}`;
            }
        }
    ];
    
    // Apply all sanitization patterns
    logPatterns.forEach(({ pattern, replacement }) => {
        if (typeof replacement === 'function') {
            sanitized = sanitized.replace(pattern, replacement);
        } else {
            sanitized = sanitized.replace(pattern, replacement);
        }
    });
    
    return sanitized;
}

/**
 * Create a masked copy of an object for safe display
 */
function createMaskedCopy(data, context = 'general') {
    if (data === null || data === undefined) {
        return data;
    }
    
    if (typeof data !== 'object') {
        return data;
    }
    
    if (Array.isArray(data)) {
        return data.map(item => createMaskedCopy(item, context));
    }
    
    // Apply context-specific masking
    switch (context) {
        case 'wallet':
            return maskWalletInfo(data);
        case 'config':
            return maskConfiguration(data);
        case 'logs':
            return typeof data === 'string' ? sanitizeLogContent(data) : data;
        default:
            return maskConfiguration(data);
    }
}

/**
 * Middleware to automatically mask response data
 */
function createMaskingMiddleware(context = 'general') {
    return (req, res, next) => {
        const originalJson = res.json;
        
        res.json = function(data) {
            // Only mask if not already masked and contains sensitive data
            if (data && typeof data === 'object' && !data._masked) {
                const maskedData = createMaskedCopy(data, context);
                maskedData._masked = true; // Mark as masked to prevent double-masking
                return originalJson.call(this, maskedData);
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Toggle visibility of sensitive fields (for UI show/hide functionality)
 */
function createToggleableData(data, showSensitive = false) {
    if (!showSensitive) {
        return createMaskedCopy(data);
    }
    
    // Return original data when showing sensitive information
    return data;
}

module.exports = {
    isSensitiveField,
    maskString,
    maskConfiguration,
    maskWalletInfo,
    sanitizeLogContent,
    createMaskedCopy,
    createMaskingMiddleware,
    createToggleableData,
    SENSITIVE_PATTERNS,
    MASKING_CONFIG
};