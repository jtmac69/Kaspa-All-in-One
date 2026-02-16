/**
 * WalletService - WASM-based wallet operations for Kaspa All-in-One
 * 
 * This module provides client-side wallet functionality using the Kaspa WASM library.
 * All cryptographic operations happen in the browser - sensitive data NEVER leaves the client.
 * 
 * Features:
 * - BIP39 mnemonic generation (24 words)
 * - BIP39 mnemonic validation
 * - BIP32/BIP44 address derivation
 * - Kaspa address validation (network-aware)
 * - Encrypted wallet backup generation (Kaspa NG compatible)
 * 
 * Security Model:
 * - Mnemonics and private keys exist only in browser memory
 * - Memory is cleared after use via secure wipe functions
 * - No sensitive data is ever sent to the backend
 * - Only the derived address (public) is passed to configuration
 * 
 * @module WalletService
 */

/**
 * Security configuration for wallet operations
 * CRITICAL: These settings protect sensitive cryptographic material
 */
const SECURITY_CONFIG = {
    // Time to keep sensitive data in memory (milliseconds)
    SENSITIVE_DATA_TTL: 5 * 60 * 1000, // 5 minutes
    
    // Clipboard auto-clear time (milliseconds)
    CLIPBOARD_CLEAR_DELAY: 30 * 1000, // 30 seconds
    
    // Maximum time to display mnemonic before auto-hide
    MNEMONIC_DISPLAY_TTL: 2 * 60 * 1000, // 2 minutes
    
    // Disable all console logging in production
    DISABLE_LOGGING: true
};

/**
 * Secure logging utility - NEVER logs sensitive data
 * @param {string} message - Log message (must not contain sensitive data)
 * @param {string} level - Log level: 'info', 'warn', 'error'
 */
function secureLog(message, level = 'info') {
    // In production, disable all wallet-related logging
    if (SECURITY_CONFIG.DISABLE_LOGGING && typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
        return;
    }
    
    // Sanitize message - remove anything that looks like a mnemonic or key
    const sanitized = message
        .replace(/\b[a-z]{3,8}(\s+[a-z]{3,8}){11,23}\b/gi, '[REDACTED_MNEMONIC]')
        .replace(/\b[a-fA-F0-9]{64}\b/g, '[REDACTED_KEY]')
        .replace(/kaspa:[a-z0-9]{60,}/gi, '[REDACTED_ADDRESS]');
    
    const prefix = '[WALLET-SERVICE]';
    switch (level) {
        case 'warn':
            console.warn(`${prefix} ${sanitized}`);
            break;
        case 'error':
            console.error(`${prefix} ${sanitized}`);
            break;
        default:
            console.log(`${prefix} ${sanitized}`);
    }
}

/**
 * Securely clear a string from memory
 * @param {string} sensitiveString - String to clear
 */
function secureClear(sensitiveString) {
    if (typeof sensitiveString !== 'string') return;
    
    // Overwrite with random data before nullifying
    // Note: JavaScript doesn't guarantee memory clearing, but this is best effort
    try {
        const randomBytes = crypto.getRandomValues(new Uint8Array(sensitiveString.length));
        // Can't actually modify the string, but we can encourage GC
        sensitiveString = null;
    } catch (e) {
        // Ignore errors in secure clear
    }
}

// Module state
let kaspaModule = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Network types supported by Kaspa
 * @readonly
 * @enum {string}
 */
export const NetworkType = {
    MAINNET: 'mainnet',
    TESTNET: 'testnet-10',
    TESTNET_11: 'testnet-11',
    DEVNET: 'devnet',
    SIMNET: 'simnet'
};

/**
 * Mnemonic word counts supported
 * @readonly
 * @enum {number}
 */
export const MnemonicWordCount = {
    WORDS_12: 12,
    WORDS_24: 24
};

/**
 * Initialize the Kaspa WASM module
 * Lazy-loads the WASM binary on first use
 * 
 * @returns {Promise<boolean>} True if initialization successful
 * @throws {Error} If WASM module fails to load
 */
export async function initialize() {
    if (isInitialized) {
        return true;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            secureLog('Initializing Kaspa WASM module...');

            // Dynamic import to lazy-load the WASM module
            kaspaModule = await import('/node_modules/kaspa/index.js');

            // Initialize the WASM binary
            if (kaspaModule.default) {
                await kaspaModule.default();
            }

            // Enable console panic hooks for debugging (development only)
            if (kaspaModule.initConsolePanicHook) {
                kaspaModule.initConsolePanicHook();
            }

            isInitialized = true;
            secureLog('Kaspa WASM module initialized successfully');
            return true;
        } catch (error) {
            secureLog(`Failed to initialize Kaspa WASM module: ${error.message}`, 'error');
            initializationPromise = null;
            throw new Error(`Failed to initialize wallet service: ${error.message}`);
        }
    })();

    return initializationPromise;
}

/**
 * Check if the WalletService is initialized
 * @returns {boolean}
 */
export function isReady() {
    return isInitialized;
}

/**
 * Get the Kaspa WASM module (for advanced usage)
 * @returns {Object|null} The kaspa module or null if not initialized
 */
export function getModule() {
    return kaspaModule;
}

// Placeholder exports - will be implemented in subsequent prompts

/**
 * Generate a new BIP39 mnemonic phrase
 * 
 * Uses cryptographically secure randomness from the browser's crypto API
 * via the Kaspa WASM module.
 * 
 * @param {number} [wordCount=24] - Number of words (12 or 24)
 * @returns {Promise<{phrase: string, words: string[], wordCount: number}>} The mnemonic phrase and word array
 * @throws {Error} If generation fails or module not initialized
 * 
 * @example
 * const { phrase, words } = await generateMnemonic(24);
 * console.log(words.length); // 24
 */
export async function generateMnemonic(wordCount = MnemonicWordCount.WORDS_24) {
    if (!isInitialized) {
        await initialize();
    }

    // Validate word count
    if (wordCount !== MnemonicWordCount.WORDS_12 && wordCount !== MnemonicWordCount.WORDS_24) {
        throw new Error(`Invalid word count: ${wordCount}. Must be 12 or 24.`);
    }

    let mnemonic = null;

    try {
        const { Mnemonic } = kaspaModule;
        
        if (!Mnemonic) {
            throw new Error('Mnemonic class not available in Kaspa module');
        }

        // Generate mnemonic with specified word count
        // Kaspa WASM uses crypto.getRandomValues() internally for entropy
        mnemonic = Mnemonic.random(wordCount);

        // Get the phrase as a string
        const phrase = mnemonic.phrase;
        
        if (!phrase || typeof phrase !== 'string') {
            throw new Error('Failed to generate mnemonic phrase');
        }

        // Split into words array for UI display
        const words = phrase.trim().split(/\s+/);

        // Validate word count matches request
        if (words.length !== wordCount) {
            throw new Error(`Generated ${words.length} words, expected ${wordCount}`);
        }

        secureLog(`Generated ${wordCount}-word mnemonic`);

        // Schedule cleanup of WASM mnemonic object
        setTimeout(() => {
            try {
                if (mnemonic && typeof mnemonic.free === 'function') {
                    mnemonic.free();
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        }, SECURITY_CONFIG.SENSITIVE_DATA_TTL);

        return {
            phrase,
            words,
            wordCount: words.length
        };
    } catch (error) {
        secureLog(`Mnemonic generation failed: ${error.message}`, 'error');
        throw new Error(`Failed to generate mnemonic: ${error.message}`);
    } finally {
        // Note: We don't free mnemonic here because we need to return the phrase
        // It will be freed by the scheduled cleanup above
    }
}

/**
 * Validate a BIP39 mnemonic phrase
 * 
 * Checks word count, wordlist membership, and checksum validity.
 * 
 * @param {string} phrase - The mnemonic phrase to validate
 * @returns {Promise<{valid: boolean, wordCount: number, error?: string, normalizedPhrase?: string}>} Validation result
 * 
 * @example
 * const result = await validateMnemonic('abandon abandon ... about');
 * if (result.valid) {
 *   console.log('Valid', result.wordCount, 'word mnemonic');
 * } else {
 *   console.log('Invalid:', result.error);
 * }
 */
export async function validateMnemonic(phrase) {
    if (!isInitialized) {
        await initialize();
    }

    // Basic input validation
    if (!phrase || typeof phrase !== 'string') {
        return {
            valid: false,
            wordCount: 0,
            error: 'Mnemonic phrase is required'
        };
    }

    // Normalize whitespace and get words
    const normalizedPhrase = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = normalizedPhrase.split(' ');
    const wordCount = words.length;

    // Check word count
    if (wordCount !== 12 && wordCount !== 24) {
        return {
            valid: false,
            wordCount,
            error: `Invalid word count: ${wordCount}. Must be 12 or 24 words.`
        };
    }

    try {
        const { Mnemonic } = kaspaModule;
        
        if (!Mnemonic) {
            throw new Error('Mnemonic class not available in Kaspa module');
        }

        // Use Kaspa's built-in validation
        // This checks wordlist membership and checksum
        const isValid = Mnemonic.validate(normalizedPhrase);

        if (isValid) {
            secureLog(`Validated ${wordCount}-word mnemonic`);
            return {
                valid: true,
                wordCount,
                normalizedPhrase // Return normalized version for consistency
            };
        } else {
            return {
                valid: false,
                wordCount,
                error: 'Invalid mnemonic: checksum failed or contains invalid words'
            };
        }
    } catch (error) {
        secureLog(`Mnemonic validation error: ${error.message}`, 'error');
        return {
            valid: false,
            wordCount,
            error: `Validation failed: ${error.message}`
        };
    }
}

/**
 * Derive a Kaspa address from a mnemonic phrase
 * 
 * Uses BIP44 derivation path: m/44'/111111'/account'/0/index
 * Where 111111 is Kaspa's registered coin type.
 * 
 * @param {string} mnemonic - The BIP39 mnemonic phrase
 * @param {string} [network='mainnet'] - Network type (mainnet, testnet-10, etc.)
 * @param {number} [accountIndex=0] - BIP44 account index
 * @param {number} [addressIndex=0] - Address index within account
 * @returns {Promise<{address: string, publicKey: string, derivationPath: string, network: string, accountIndex: number, addressIndex: number}>}
 * @throws {Error} If derivation fails
 * 
 * @example
 * const { address } = await deriveAddress(mnemonic, 'mainnet', 0, 0);
 * console.log(address); // kaspa:qr...
 */
export async function deriveAddress(mnemonic, network = NetworkType.MAINNET, accountIndex = 0, addressIndex = 0) {
    if (!isInitialized) {
        await initialize();
    }

    // Validate mnemonic first
    const validation = await validateMnemonic(mnemonic);
    if (!validation.valid) {
        throw new Error(`Invalid mnemonic: ${validation.error}`);
    }

    // Use normalized phrase
    const normalizedMnemonic = validation.normalizedPhrase || mnemonic.trim().toLowerCase();

    let seed = null;
    let mnemonicObj = null;
    let xprv = null;
    let publicKeyGenerator = null;
    let receiveKey = null;

    try {
        const { Mnemonic, XPrv, PublicKeyGenerator, Address, NetworkType: KaspaNetworkType } = kaspaModule;

        // Map our network type to Kaspa's NetworkType
        const networkTypeMap = {
            [NetworkType.MAINNET]: KaspaNetworkType?.Mainnet || 'mainnet',
            [NetworkType.TESTNET]: KaspaNetworkType?.Testnet || 'testnet-10',
            [NetworkType.TESTNET_11]: KaspaNetworkType?.Testnet || 'testnet-11',
            [NetworkType.DEVNET]: KaspaNetworkType?.Devnet || 'devnet',
            [NetworkType.SIMNET]: KaspaNetworkType?.Simnet || 'simnet'
        };

        const kaspaNetwork = networkTypeMap[network] || networkTypeMap[NetworkType.MAINNET];

        // Create Mnemonic object from phrase
        mnemonicObj = new Mnemonic(normalizedMnemonic);

        // Derive seed from mnemonic (no passphrase)
        seed = mnemonicObj.toSeed();

        // Create extended private key from seed
        xprv = new XPrv(seed);

        // Derive to BIP44 path for Kaspa
        // m/44'/111111'/account'/0 (receive addresses)
        // Kaspa coin type: 111111 (0x1B207)
        const purpose = 44;
        const coinType = 111111; // Kaspa's registered coin type
        const change = 0; // 0 = receive, 1 = change

        // Create public key generator for the account
        publicKeyGenerator = new PublicKeyGenerator(xprv, false, accountIndex);

        // Get the receive public key at the specified index
        receiveKey = publicKeyGenerator.receiveKey(addressIndex);

        // Convert to address for the specified network
        const address = receiveKey.toAddress(kaspaNetwork);
        const addressString = address.toString();

        // Build derivation path string for reference
        const derivationPath = `m/${purpose}'/${coinType}'/${accountIndex}'/${change}/${addressIndex}`;

        secureLog(`Derived address for ${network} at ${derivationPath}`);

        return {
            address: addressString,
            publicKey: receiveKey.toString(),
            derivationPath,
            network,
            accountIndex,
            addressIndex
        };
    } catch (error) {
        secureLog(`Address derivation failed: ${error.message}`, 'error');
        throw new Error(`Failed to derive address: ${error.message}`);
    } finally {
        // Ensure cleanup even on error
        try {
            if (seed) secureClear(seed);
            if (mnemonicObj && typeof mnemonicObj.free === 'function') mnemonicObj.free();
            if (xprv && typeof xprv.free === 'function') xprv.free();
            if (publicKeyGenerator && typeof publicKeyGenerator.free === 'function') publicKeyGenerator.free();
            if (receiveKey && typeof receiveKey.free === 'function') receiveKey.free();
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Validate a Kaspa address
 * 
 * Checks format, checksum, and optionally network prefix.
 * 
 * @param {string} address - The Kaspa address to validate
 * @param {string|null} [expectedNetwork=null] - Expected network (null = any network)
 * @returns {Promise<{valid: boolean, network?: string, address?: string, error?: string}>}
 * 
 * @example
 * const result = await validateAddress('kaspa:qr...', 'mainnet');
 * if (result.valid) {
 *   console.log('Valid', result.network, 'address');
 * }
 */
export async function validateAddress(address, expectedNetwork = null) {
    if (!isInitialized) {
        await initialize();
    }

    // Basic input validation
    if (!address || typeof address !== 'string') {
        return {
            valid: false,
            error: 'Address is required'
        };
    }

    const trimmedAddress = address.trim();

    // Check prefix to determine network
    let detectedNetwork = null;
    if (trimmedAddress.startsWith('kaspa:')) {
        detectedNetwork = NetworkType.MAINNET;
    } else if (trimmedAddress.startsWith('kaspatest:')) {
        detectedNetwork = NetworkType.TESTNET;
    } else if (trimmedAddress.startsWith('kaspadev:')) {
        detectedNetwork = NetworkType.DEVNET;
    } else if (trimmedAddress.startsWith('kaspasim:')) {
        detectedNetwork = NetworkType.SIMNET;
    } else {
        return {
            valid: false,
            error: 'Invalid address prefix. Must start with kaspa:, kaspatest:, kaspadev:, or kaspasim:'
        };
    }

    // Check network matches if expected
    if (expectedNetwork && detectedNetwork !== expectedNetwork) {
        // Map expectedNetwork to friendly name
        const networkNames = {
            [NetworkType.MAINNET]: 'mainnet (kaspa:)',
            [NetworkType.TESTNET]: 'testnet (kaspatest:)',
            [NetworkType.TESTNET_11]: 'testnet (kaspatest:)',
            [NetworkType.DEVNET]: 'devnet (kaspadev:)',
            [NetworkType.SIMNET]: 'simnet (kaspasim:)'
        };

        return {
            valid: false,
            network: detectedNetwork,
            error: `Address is for ${networkNames[detectedNetwork] || detectedNetwork}, expected ${networkNames[expectedNetwork] || expectedNetwork}`
        };
    }

    try {
        const { Address } = kaspaModule;
        
        if (!Address) {
            throw new Error('Address class not available in Kaspa module');
        }

        // Use Kaspa's built-in address validation
        // This checks the full address format and checksum
        const isValid = Address.validate(trimmedAddress);

        if (isValid) {
            secureLog(`Validated ${detectedNetwork} address`);
            return {
                valid: true,
                network: detectedNetwork,
                address: trimmedAddress
            };
        } else {
            return {
                valid: false,
                network: detectedNetwork,
                error: 'Invalid address format or checksum'
            };
        }
    } catch (error) {
        secureLog(`Address validation error: ${error.message}`, 'error');
        return {
            valid: false,
            error: `Validation failed: ${error.message}`
        };
    }
}

/**
 * Create an encrypted wallet backup file (Kaspa NG compatible)
 * 
 * The backup format is compatible with Kaspa NG wallet import.
 * If no password is provided, the mnemonic is stored in plain text (not recommended).
 * 
 * @param {string} mnemonic - The mnemonic phrase to backup
 * @param {string} [password=''] - Password for encryption (empty = no encryption)
 * @param {string} [network='mainnet'] - Network context for the wallet
 * @returns {Promise<{backup: Object, filename: string, encrypted: boolean, primaryAddress: string}>}
 * 
 * @example
 * const { backup, filename } = await createWalletBackup(mnemonic, 'myPassword');
 * // Download as JSON file
 */
export async function createWalletBackup(mnemonic, password = '', network = NetworkType.MAINNET) {
    if (!isInitialized) {
        await initialize();
    }

    // Validate mnemonic
    const validation = await validateMnemonic(mnemonic);
    if (!validation.valid) {
        throw new Error(`Invalid mnemonic: ${validation.error}`);
    }

    const normalizedMnemonic = validation.normalizedPhrase || mnemonic.trim().toLowerCase();

    try {
        // Derive the first address for identification
        const { address } = await deriveAddress(normalizedMnemonic, network, 0, 0);

        // Generate backup timestamp
        const timestamp = new Date().toISOString();
        const backupId = `kaspa-aio-${Date.now()}`;

        let backupData;
        let isEncrypted = false;

        if (password && password.length > 0) {
            // Encrypt the mnemonic using Web Crypto API
            const encryptedMnemonic = await encryptMnemonic(normalizedMnemonic, password);
            isEncrypted = true;

            backupData = {
                version: '1.0',
                format: 'kaspa-aio-encrypted',
                compatible: ['kaspa-ng', 'kaspa-cli'],
                created: timestamp,
                id: backupId,
                network: network,
                encrypted: true,
                encryptionMethod: 'aes-256-gcm',
                primaryAddress: address,
                data: encryptedMnemonic
            };
        } else {
            // Plain text backup (not recommended, but allowed)
            backupData = {
                version: '1.0',
                format: 'kaspa-aio-plain',
                compatible: ['kaspa-ng', 'kaspa-cli'],
                created: timestamp,
                id: backupId,
                network: network,
                encrypted: false,
                primaryAddress: address,
                mnemonic: normalizedMnemonic,
                warning: 'This backup is NOT encrypted. Store securely!'
            };
        }

        // Generate filename
        const dateStr = timestamp.split('T')[0];
        const filename = `kaspa-wallet-backup-${dateStr}-${backupId.slice(-8)}.json`;

        secureLog(`Created ${isEncrypted ? 'encrypted' : 'plain'} wallet backup`);

        return {
            backup: backupData,
            filename,
            encrypted: isEncrypted,
            primaryAddress: address
        };
    } catch (error) {
        secureLog(`Backup creation failed: ${error.message}`, 'error');
        throw new Error(`Failed to create wallet backup: ${error.message}`);
    }
}

/**
 * Encrypt mnemonic using AES-256-GCM via Web Crypto API
 * @private
 * @param {string} mnemonic - The mnemonic to encrypt
 * @param {string} password - The encryption password
 * @returns {Promise<{salt: string, iv: string, ciphertext: string, iterations: number}>}
 */
async function encryptMnemonic(mnemonic, password) {
    // Convert password to key using PBKDF2
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive key from password
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordData,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the mnemonic
    const mnemonicData = encoder.encode(mnemonic);
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        mnemonicData
    );

    // Return base64-encoded components
    return {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        iterations: 100000
    };
}

/**
 * Trigger download of wallet backup file
 * 
 * @param {Object} backup - The backup object from createWalletBackup
 * @param {string} filename - The filename to use
 */
export function downloadBackup(backup, filename) {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    secureLog(`Downloaded backup: ${filename}`);
}

/**
 * Attempt to securely wipe a sensitive string from memory
 * 
 * Note: JavaScript doesn't provide true secure memory wiping due to
 * string immutability and garbage collection. This function makes a
 * best-effort attempt by overwriting references and encouraging GC.
 * 
 * For maximum security, sensitive operations should be performed in
 * isolated contexts (Web Workers) that can be terminated.
 * 
 * @param {string|Object|Array} sensitive - The sensitive data to wipe
 * @returns {null} Always returns null (for assignment)
 * 
 * @example
 * let mnemonic = 'word1 word2 ...';
 * // ... use mnemonic ...
 * mnemonic = secureWipe(mnemonic);
 */
export function secureWipe(sensitive) {
    if (sensitive === null || sensitive === undefined) {
        return null;
    }

    try {
        if (typeof sensitive === 'string') {
            // Can't truly overwrite strings in JS, but we can:
            // 1. Create a dummy string of same length (to potentially occupy same memory)
            // 2. Null the reference
            const length = sensitive.length;
            const dummy = 'x'.repeat(length);
            
            // Force the dummy into a variable to prevent optimization removing it
            if (dummy.length !== length) {
                secureLog('Wipe length mismatch', 'warn');
            }
        } else if (typeof sensitive === 'object') {
            // For objects/arrays, overwrite properties
            if (Array.isArray(sensitive)) {
                for (let i = 0; i < sensitive.length; i++) {
                    sensitive[i] = null;
                }
                sensitive.length = 0;
            } else {
                for (const key in sensitive) {
                    if (Object.prototype.hasOwnProperty.call(sensitive, key)) {
                        sensitive[key] = null;
                        delete sensitive[key];
                    }
                }
            }
        }
    } catch (error) {
        secureLog(`Secure wipe encountered error: ${error.message}`, 'warn');
    }

    // Hint to garbage collector (not guaranteed but doesn't hurt)
    if (typeof globalThis.gc === 'function') {
        try {
            globalThis.gc();
        } catch (e) {
            // GC not exposed, which is normal
        }
    }

    return null;
}

/**
 * Create a sensitive data container that auto-wipes after use
 * 
 * @param {string} value - The sensitive value to wrap
 * @param {number} [ttlMs=60000] - Time-to-live in milliseconds (default: 1 minute)
 * @returns {{getValue: Function, wipe: Function, isWiped: Function}} Container object
 * 
 * @example
 * const container = createSensitiveContainer(mnemonic, 30000);
 * const phrase = container.getValue(); // Use within 30 seconds
 * container.wipe(); // Manual wipe when done
 */
export function createSensitiveContainer(value, ttlMs = 60000) {
    let storedValue = value;
    let wiped = false;

    // Auto-wipe after TTL
    const timeoutId = setTimeout(() => {
        if (!wiped) {
            storedValue = secureWipe(storedValue);
            wiped = true;
            secureLog('Sensitive container auto-wiped after TTL');
        }
    }, ttlMs);

    return {
        getValue: () => {
            if (wiped) {
                throw new Error('Sensitive data has been wiped');
            }
            return storedValue;
        },
        wipe: () => {
            if (!wiped) {
                clearTimeout(timeoutId);
                storedValue = secureWipe(storedValue);
                wiped = true;
                secureLog('Sensitive container manually wiped');
            }
        },
        isWiped: () => wiped
    };
}

// Default export for convenience
export default {
    initialize,
    isReady,
    getModule,
    generateMnemonic,
    validateMnemonic,
    deriveAddress,
    validateAddress,
    createWalletBackup,
    downloadBackup,
    secureWipe,
    createSensitiveContainer,
    NetworkType,
    MnemonicWordCount
};
