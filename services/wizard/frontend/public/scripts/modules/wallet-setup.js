/**
 * Wallet Setup UI Components
 * Provides secure wallet configuration UI for the wizard
 * 
 * SECURITY CRITICAL:
 * - All cryptographic operations use WASM (wallet-service.js)
 * - Mnemonic data NEVER leaves the browser
 * - No console.log of sensitive data
 * - Clipboard auto-clears after 30 seconds
 * 
 * @module wallet-setup
 */

/**
 * SECURITY AUDIT CHECKLIST for wallet-setup.js
 * 
 * ✓ Mnemonic stored only in local walletState variable
 * ✓ Mnemonic NEVER passed to stateManager
 * ✓ Mnemonic NEVER in localStorage/sessionStorage
 * ✓ Mnemonic NEVER in URL parameters
 * ✓ Mnemonic NEVER logged to console
 * ✓ Clipboard auto-clears after 30 seconds
 * ✓ UI auto-hides mnemonic on tab switch
 * ✓ State cleared on navigation away
 * 
 * SENSITIVE DATA FLOW:
 * 1. WASM generates mnemonic → stored in walletState.mnemonic (memory only)
 * 2. User views mnemonic → displayed with blur protection
 * 3. Address derived → only address stored in stateManager
 * 4. User confirms backup → mnemonic can be cleared
 * 5. Navigation away → walletState.mnemonic set to null
 */

import { stateManager } from './state-manager.js';
import { showNotification } from './utils.js';

// Lazy load wallet service to reduce initial bundle size
let WalletService = null;

/**
 * Get or initialize the WalletService
 * @returns {Promise<Object>} WalletService instance
 */
async function getWalletService() {
    if (!WalletService) {
        const module = await import('./wallet-service.js');
        WalletService = module.WalletService;
        await WalletService.initialize();
    }
    return WalletService;
}

/**
 * Wallet Setup Mode Enumeration
 */
export const WalletSetupMode = {
    GENERATE: 'generate',
    IMPORT: 'import',
    MANUAL: 'manual'
};

/**
 * Security validation - ensures no sensitive data leaks
 * Call this before any state manager updates
 * @param {Object} data - Data to validate
 * @throws {Error} If sensitive data detected
 */
function validateNoSensitiveData(data) {
    if (!data || typeof data !== 'object') return;
    
    const sensitivePatterns = [
        /\b[a-z]{3,8}(\s+[a-z]{3,8}){11,23}\b/i, // Mnemonic pattern
        /^[a-fA-F0-9]{64}$/,                      // Private key pattern
        /^[a-fA-F0-9]{128}$/,                     // Extended key pattern
    ];
    
    const checkValue = (value, key) => {
        if (typeof value === 'string') {
            for (const pattern of sensitivePatterns) {
                if (pattern.test(value)) {
                    console.error(`[SECURITY] Sensitive data detected in key: ${key}`);
                    throw new Error('Security violation: Attempted to store sensitive data');
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([k, v]) => checkValue(v, k));
        }
    };
    
    Object.entries(data).forEach(([key, value]) => checkValue(value, key));
}

/**
 * Safe state manager update - validates no sensitive data
 * @param {string} key - State key
 * @param {Object} data - Data to store
 */
function safeStateUpdate(key, data) {
    // Validate before storing
    validateNoSensitiveData(data);
    
    // Safe to update
    stateManager.update(key, data);
}

/**
 * Wallet Setup State
 * Tracks the current state of the wallet setup flow
 */
const walletState = {
    mode: WalletSetupMode.GENERATE,
    mnemonic: null,
    address: null,
    network: 'mainnet',
    isRevealed: false,
    isValid: false,
    backupConfirmed: false,
    backupDownloaded: false,
    backupPassword: ''
};

/**
 * Auto-hide timer for mnemonic display
 * Automatically blurs mnemonic after timeout for security
 */
let mnemonicAutoHideTimer = null;

/**
 * Clipboard management for security
 */
const clipboardManager = {
    lastCopiedValue: null,
    clearTimer: null,
    
    /**
     * Securely copy text to clipboard with auto-clear
     * @param {string} text - Text to copy
     * @param {number} clearDelay - Delay before clearing (ms)
     * @returns {Promise<boolean>} Success status
     */
    async secureCopy(text, clearDelay = 30000) {
        try {
            // Clear any existing timer
            if (this.clearTimer) {
                clearTimeout(this.clearTimer);
                this.clearTimer = null;
            }
            
            // Use modern clipboard API
            await navigator.clipboard.writeText(text);
            this.lastCopiedValue = text;
            
            // Schedule auto-clear
            this.clearTimer = setTimeout(async () => {
                await this.clearIfMatches(text);
            }, clearDelay);
            
            return true;
        } catch (error) {
            console.error('[CLIPBOARD] Copy failed, trying fallback:', error.message);
            return this.fallbackCopy(text, clearDelay);
        }
    },
    
    /**
     * Fallback copy for older browsers
     * @private
     */
    fallbackCopy(text, clearDelay) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(textArea);
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                this.lastCopiedValue = text;
                this.clearTimer = setTimeout(async () => {
                    await this.clearIfMatches(text);
                }, clearDelay);
            }
            
            return success;
        } catch (error) {
            console.error('[CLIPBOARD] Fallback copy failed:', error.message);
            return false;
        }
    },
    
    /**
     * Clear clipboard if it still contains the copied value
     * @private
     */
    async clearIfMatches(expectedValue) {
        try {
            const currentValue = await navigator.clipboard.readText();
            if (currentValue === expectedValue) {
                await navigator.clipboard.writeText('');
                console.log('[CLIPBOARD] Auto-cleared for security');
            }
        } catch (error) {
            // Read permission may be denied, that's okay
            // Just clear anyway
            try {
                await navigator.clipboard.writeText('');
            } catch (e) {
                // Can't clear, that's okay too
            }
        }
        
        this.lastCopiedValue = null;
        this.clearTimer = null;
    },
    
    /**
     * Manually clear clipboard
     */
    async clear() {
        if (this.clearTimer) {
            clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }
        
        try {
            await navigator.clipboard.writeText('');
        } catch (error) {
            // Ignore errors
        }
        
        this.lastCopiedValue = null;
    }
};

/**
 * Start auto-hide timer for mnemonic display
 * @private
 */
function startMnemonicAutoHideTimer() {
    // Clear existing timer
    if (mnemonicAutoHideTimer) {
        clearTimeout(mnemonicAutoHideTimer);
    }
    
    // Set new timer (2 minutes)
    mnemonicAutoHideTimer = setTimeout(() => {
        const mnemonicDisplay = document.getElementById('mnemonic-display');
        const revealBtn = document.getElementById('mnemonic-reveal-btn');
        
        if (mnemonicDisplay && !mnemonicDisplay.classList.contains('blurred')) {
            // Auto-hide the mnemonic
            mnemonicDisplay.classList.add('blurred');
            mnemonicDisplay.classList.remove('revealed');
            
            if (revealBtn) {
                revealBtn.classList.remove('revealed');
                revealBtn.innerHTML = '<span class="reveal-icon">👁</span><span class="reveal-text">Click to Reveal</span>';
            }
            
            walletState.isRevealed = false;
            showNotification('Seed phrase hidden for security', 'info');
        }
    }, 2 * 60 * 1000); // 2 minutes
}

/**
 * Show a security warning dialog
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Warning message
 * @param {string} options.confirmText - Confirm button text
 * @param {string} options.cancelText - Cancel button text
 * @param {boolean} options.requireCheckbox - Require checkbox confirmation
 * @param {string} options.checkboxLabel - Checkbox label text
 * @returns {Promise<boolean>} True if user confirmed
 */
function showSecurityWarningDialog(options) {
    return new Promise((resolve) => {
        const {
            title = 'Security Warning',
            message,
            confirmText = 'I Understand',
            cancelText = 'Cancel',
            requireCheckbox = false,
            checkboxLabel = 'I understand the risks'
        } = options;
        
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'security-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'security-dialog';
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        
        dialog.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                <span style="font-size: 2rem;">⚠️</span>
                <h3 style="margin: 0; color: #d4a017; font-size: 1.25rem;">${title}</h3>
            </div>
            <div style="color: #333; line-height: 1.6; margin-bottom: 1.5rem;">
                ${message}
            </div>
            ${requireCheckbox ? `
                <label style="display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.5rem; cursor: pointer;">
                    <input type="checkbox" id="security-confirm-checkbox" 
                           style="margin-top: 0.25rem; width: 18px; height: 18px;">
                    <span style="font-size: 0.9rem; color: #555;">${checkboxLabel}</span>
                </label>
            ` : ''}
            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                <button id="security-cancel-btn" style="
                    padding: 0.75rem 1.25rem;
                    border: 1px solid #ddd;
                    background: white;
                    color: #666;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                ">${cancelText}</button>
                <button id="security-confirm-btn" style="
                    padding: 0.75rem 1.25rem;
                    border: none;
                    background: #d4a017;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 600;
                " ${requireCheckbox ? 'disabled' : ''}>${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Setup event handlers
        const confirmBtn = dialog.querySelector('#security-confirm-btn');
        const cancelBtn = dialog.querySelector('#security-cancel-btn');
        const checkbox = dialog.querySelector('#security-confirm-checkbox');
        
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                confirmBtn.disabled = !e.target.checked;
                confirmBtn.style.opacity = e.target.checked ? '1' : '0.5';
            });
        }
        
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(false);
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Clear sensitive data from wallet state
 * Call this when leaving the wallet setup panel
 * SECURITY CRITICAL: Ensures no sensitive data persists
 */
export function clearWalletState() {
    console.log('[WALLET-SETUP] Clearing wallet state (security cleanup)');
    
    // Clear auto-hide timer
    if (mnemonicAutoHideTimer) {
        clearTimeout(mnemonicAutoHideTimer);
        mnemonicAutoHideTimer = null;
    }
    
    // Securely clear mnemonic
    if (walletState.mnemonic) {
        // Overwrite with random data before clearing
        const randomData = crypto.getRandomValues(new Uint8Array(256));
        walletState.mnemonic = Array.from(randomData).map(b => b.toString(16)).join('');
        walletState.mnemonic = null;
    }
    
    // Clear backup password
    if (walletState.backupPassword) {
        walletState.backupPassword = crypto.getRandomValues(new Uint8Array(32)).toString();
        walletState.backupPassword = '';
    }
    
    // Clear other state
    walletState.address = null;
    walletState.isRevealed = false;
    walletState.isValid = false;
    walletState.backupConfirmed = false;
    walletState.backupDownloaded = false;
    
    // Clear any mnemonic input fields
    const mnemonicInput = document.getElementById('mnemonic-input');
    if (mnemonicInput) {
        mnemonicInput.value = '';
    }
    
    // Clear any password input fields
    const passwordInput = document.getElementById('backup-password-input');
    if (passwordInput) {
        passwordInput.value = '';
    }
    
    // Clear clipboard if it contains wallet data
    clipboardManager.clear();
    
    console.log('[WALLET-SETUP] Wallet state and clipboard cleared');
}

/**
 * Get current wallet state (for external access)
 * @returns {Object} Safe wallet state (excludes mnemonic)
 */
export function getWalletState() {
    return {
        mode: walletState.mode,
        address: walletState.address,
        network: walletState.network,
        isValid: walletState.isValid,
        backupConfirmed: walletState.backupConfirmed
    };
}

/**
 * Check if wallet setup is complete and valid
 * @returns {boolean} True if setup is complete
 */
export function isWalletSetupComplete() {
    // For manual mode, just need a valid address
    if (walletState.mode === WalletSetupMode.MANUAL) {
        return walletState.isValid && !!walletState.address;
    }
    
    // For generate/import, need valid address AND backup confirmation
    return walletState.isValid && 
           !!walletState.address && 
           walletState.backupConfirmed;
}

/**
 * Render the wallet setup panel
 * @param {HTMLElement} container - Container element to render into
 * @param {Object} options - Configuration options
 * @param {string} options.network - Network type ('mainnet' or 'testnet-*')
 * @param {Function} options.onComplete - Callback when setup is complete
 * @param {Function} options.onAddressChange - Callback when address changes
 */
export async function renderWalletSetupPanel(container, options = {}) {
    const { network = 'mainnet', onComplete, onAddressChange } = options;
    
    walletState.network = network;
    
    const html = `
        <div class="wallet-setup-panel" id="wallet-setup-panel">
            <div class="wallet-setup-header">
                <span class="wallet-setup-icon">🔐</span>
                <h3>Wallet Setup</h3>
                <span class="network-badge ${network === 'mainnet' ? 'mainnet' : 'testnet'}">
                    ${network === 'mainnet' ? '🟢 Mainnet' : '🟡 Testnet'}
                </span>
            </div>
            
            <div class="wallet-security-warning">
                <span class="wallet-security-warning-icon">⚠️</span>
                <div class="wallet-security-warning-content">
                    <div class="wallet-security-warning-title">Security Notice</div>
                    <div class="wallet-security-warning-text">
                        Your seed phrase and private keys are generated locally in your browser 
                        and are <strong>never sent to any server</strong>. Make sure to save your 
                        backup securely — if you lose it, your funds cannot be recovered.
                    </div>
                </div>
            </div>
            
            <div class="wallet-mode-selection" id="wallet-mode-selection">
                ${renderModeOption(
                    WalletSetupMode.GENERATE, 
                    'Generate New Wallet', 
                    'Create a new 24-word seed phrase and derive your mining address. Recommended for new users.',
                    true
                )}
                ${renderModeOption(
                    WalletSetupMode.IMPORT, 
                    'Import Existing Wallet', 
                    'Enter an existing seed phrase to derive your mining address. Use this if you already have a Kaspa wallet.',
                    false
                )}
                ${renderModeOption(
                    WalletSetupMode.MANUAL, 
                    'Use External Address', 
                    'Enter a Kaspa address directly. Use this if you want to use an address from another wallet application.',
                    false
                )}
            </div>
            
            <div id="wallet-mode-content">
                <!-- Mode-specific content will be rendered here -->
            </div>
            
            <div id="wallet-address-section" class="hidden">
                <!-- Address display will be rendered here -->
            </div>
            
            <div id="wallet-backup-section" class="hidden">
                <!-- Backup section will be rendered here -->
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Set up event listeners
    setupModeSelectionListeners(onComplete, onAddressChange);
    
    // Render initial mode content
    await renderModeContent(WalletSetupMode.GENERATE, onComplete, onAddressChange);
}

/**
 * Render a mode selection option
 * @private
 */
function renderModeOption(mode, title, description, selected) {
    return `
        <label class="wallet-mode-option ${selected ? 'selected' : ''}" data-mode="${mode}">
            <input type="radio" 
                   name="wallet-mode" 
                   value="${mode}" 
                   ${selected ? 'checked' : ''}>
            <div class="wallet-mode-content">
                <div class="wallet-mode-title">${title}</div>
                <div class="wallet-mode-description">${description}</div>
            </div>
        </label>
    `;
}

/**
 * Set up mode selection event listeners
 * @private
 */
function setupModeSelectionListeners(onComplete, onAddressChange) {
    const modeOptions = document.querySelectorAll('.wallet-mode-option');
    
    modeOptions.forEach(option => {
        option.addEventListener('click', async (e) => {
            // Update visual selection
            modeOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Update radio button
            const radio = option.querySelector('input[type="radio"]');
            radio.checked = true;
            
            // Get selected mode
            const mode = option.dataset.mode;
            walletState.mode = mode;
            
            // Clear previous state when switching modes
            walletState.address = null;
            walletState.isValid = false;
            walletState.backupConfirmed = false;
            
            // Render mode-specific content
            await renderModeContent(mode, onComplete, onAddressChange);
        });
    });
}

/**
 * Render mode-specific content
 * @private
 */
async function renderModeContent(mode, onComplete, onAddressChange) {
    const contentContainer = document.getElementById('wallet-mode-content');
    const addressSection = document.getElementById('wallet-address-section');
    const backupSection = document.getElementById('wallet-backup-section');
    
    // Clear previous content
    contentContainer.innerHTML = '';
    addressSection.classList.add('hidden');
    backupSection.classList.add('hidden');
    
    switch (mode) {
        case WalletSetupMode.GENERATE:
            await renderGenerateMode(contentContainer, addressSection, backupSection, onComplete, onAddressChange);
            break;
        case WalletSetupMode.IMPORT:
            await renderImportMode(contentContainer, addressSection, backupSection, onComplete, onAddressChange);
            break;
        case WalletSetupMode.MANUAL:
            await renderManualMode(contentContainer, onComplete, onAddressChange);
            break;
    }
}

/**
 * Render Generate Mode content
 * @private
 */
async function renderGenerateMode(contentContainer, addressSection, backupSection, onComplete, onAddressChange) {
    // Show loading state
    contentContainer.innerHTML = `
        <div class="wallet-loading">
            <div class="wallet-loading-spinner"></div>
            <div class="wallet-loading-text">Generating secure wallet...</div>
        </div>
    `;
    
    try {
        // Get wallet service and generate mnemonic
        const walletService = await getWalletService();
        const mnemonic = await walletService.generateMnemonic(24);
        walletState.mnemonic = mnemonic;
        
        // Derive address from mnemonic
        const address = await walletService.deriveAddress(mnemonic, walletState.network, 0);
        walletState.address = address;
        walletState.isValid = true;
        
        // Render mnemonic display
        contentContainer.innerHTML = renderMnemonicDisplay(mnemonic);
        
        // Setup mnemonic reveal functionality
        setupMnemonicReveal();
        
        // Show address section
        addressSection.innerHTML = renderAddressDisplay(address, walletState.network);
        addressSection.classList.remove('hidden');
        setupAddressCopy();
        
        // Show backup section
        backupSection.innerHTML = renderBackupSection(true);
        backupSection.classList.remove('hidden');
        setupBackupSection(onComplete, onAddressChange);
        
        // Notify address change
        if (onAddressChange) {
            onAddressChange(address);
        }
        
    } catch (error) {
        console.error('Wallet generation failed:', error);
        contentContainer.innerHTML = `
            <div class="wallet-error">
                <div class="wallet-error-title">Generation Failed</div>
                <p>Failed to generate wallet. Please try again or check your browser's WebAssembly support.</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Render Import Mode content
 * @private
 */
async function renderImportMode(contentContainer, addressSection, backupSection, onComplete, onAddressChange) {
    contentContainer.innerHTML = `
        <div class="mnemonic-input-container">
            <div class="mnemonic-input-label">
                <span class="mnemonic-input-label-text">Enter Your Seed Phrase</span>
                <span class="mnemonic-word-count" id="mnemonic-word-count">0 words</span>
            </div>
            <textarea 
                class="mnemonic-input" 
                id="mnemonic-input"
                placeholder="Enter your 12 or 24 word seed phrase, separated by spaces..."
                rows="4"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
            ></textarea>
            <div class="mnemonic-input-security-note">
                Your seed phrase is processed locally and never sent to any server
            </div>
            <div id="mnemonic-validation-message" class="field-error-message" style="display: none;"></div>
        </div>
    `;
    
    // Setup input validation
    setupMnemonicInput(addressSection, backupSection, onComplete, onAddressChange);
}

/**
 * Render Manual Mode content
 * @private
 */
async function renderManualMode(contentContainer, onComplete, onAddressChange) {
    const prefix = walletState.network === 'mainnet' ? 'kaspa:' : 'kaspatest:';
    
    contentContainer.innerHTML = `
        <div class="manual-address-container">
            <div class="address-display-label">
                Enter Your Kaspa Address
                <span class="network-badge ${walletState.network === 'mainnet' ? 'mainnet' : 'testnet'}">
                    ${prefix}
                </span>
            </div>
            <input 
                type="text" 
                class="manual-address-input" 
                id="manual-address-input"
                placeholder="${prefix}qr..."
                autocomplete="off"
                spellcheck="false"
            />
            <div id="address-validation-message" class="field-error-message" style="display: none;"></div>
            <div class="mnemonic-input-security-note" style="margin-top: 0.75rem;">
                💡 Tip: You can get an address from Kaspa NG, a web wallet, or any other Kaspa wallet application.
            </div>
        </div>
    `;
    
    // Setup address input validation
    setupManualAddressInput(onComplete, onAddressChange);
}

/**
 * Render the mnemonic display component
 * @private
 */
function renderMnemonicDisplay(mnemonic) {
    const words = mnemonic.split(' ');
    const wordElements = words.map((word, index) => 
        `<span class="mnemonic-word">
            <span class="mnemonic-word-number">${index + 1}.</span>${word}
        </span>`
    ).join('');
    
    return `
        <div class="mnemonic-display-container">
            <div class="mnemonic-display-header">
                <span class="mnemonic-display-label">🔑 Your 24-Word Seed Phrase</span>
                <button type="button" class="mnemonic-reveal-btn" id="mnemonic-reveal-btn">
                    <span class="reveal-icon">👁</span>
                    <span class="reveal-text">Click to Reveal</span>
                </button>
            </div>
            
            <div class="wallet-security-warning critical">
                <span class="wallet-security-warning-icon">🚨</span>
                <div class="wallet-security-warning-content">
                    <div class="wallet-security-warning-title">CRITICAL: Write This Down!</div>
                    <div class="wallet-security-warning-text">
                        This seed phrase is the <strong>ONLY way</strong> to recover your wallet. 
                        Write it down on paper and store it in a safe place. 
                        <strong>Never share it with anyone</strong> and 
                        <strong>never store it digitally</strong>.
                    </div>
                </div>
            </div>
            
            <div class="mnemonic-display blurred" id="mnemonic-display">
                ${wordElements}
            </div>
        </div>
    `;
}

/**
 * Render address display section
 * @private
 */
/**
 * Render address display component
 * @private
 */
function renderAddressDisplay(address, network) {
    const prefix = network === 'mainnet' ? 'mainnet' : 'testnet';
    return `
        <div class="address-display-container">
            <div class="address-display-label">
                📍 Your Mining Address
                <span class="network-badge ${prefix}">${network === 'mainnet' ? '🟢 Mainnet' : '🟡 Testnet'}</span>
            </div>
            <div class="address-display">
                <span class="address-text" id="address-text">${address}</span>
                <button type="button" class="address-copy-btn" id="address-copy-btn">
                    <span class="copy-icon">📋</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
            <div class="mnemonic-input-security-note" style="margin-top: 0.5rem;">
                Mining rewards will be sent to this address
            </div>
        </div>
    `;
}

/**
 * Setup address copy functionality with secure clipboard
 * @private
 */
function setupAddressCopy() {
    const copyBtn = document.getElementById('address-copy-btn');
    const addressText = document.getElementById('address-text');
    
    if (!copyBtn || !addressText) return;
    
    copyBtn.addEventListener('click', async () => {
        const address = addressText.textContent;
        const success = await clipboardManager.secureCopy(address);
        
        if (success) {
            // Visual feedback
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<span class="copy-icon">✓</span><span class="copy-text">Copied!</span>';
            showNotification('Address copied (auto-clears in 30s)', 'success');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<span class="copy-icon">📋</span><span class="copy-text">Copy</span>';
            }, 2000);
        } else {
            showNotification('Failed to copy. Please select and copy manually.', 'error');
        }
    });
}

/**
 * Render backup section component
 * @private
 * @param {boolean} showDownload - Whether to show download button (false for manual mode)
 */
function renderBackupSection(showDownload = true) {
    const downloadSection = showDownload ? `
        <div class="backup-password-section">
            <label class="backup-password-label">
                Backup Encryption Password
                <span class="optional-badge">(Optional)</span>
            </label>
            <div class="backup-password-input-group">
                <input 
                    type="password" 
                    class="backup-password-input" 
                    id="backup-password-input"
                    placeholder="Enter password to encrypt backup..."
                    autocomplete="new-password"
                />
            </div>
            <div class="mnemonic-input-security-note" style="margin-top: 0.5rem;">
                If set, you'll need this password to restore from the backup file
            </div>
        </div>
        <div class="wallet-backup-actions">
            <button type="button" class="wallet-backup-btn" id="download-backup-btn">
                <span>💾</span>
                <span>Download Wallet Backup</span>
            </button>
        </div>
    ` : '';
    
    return `
        <div class="wallet-backup-section">
            <div class="wallet-backup-header">🔒 Secure Your Wallet</div>
            ${downloadSection}
            <div class="wallet-backup-confirmation unchecked" id="backup-confirmation-container">
                <input 
                    type="checkbox" 
                    id="backup-confirmation-checkbox"
                />
                <label for="backup-confirmation-checkbox" class="wallet-backup-confirmation-label">
                    ${showDownload 
                        ? 'I have <strong>written down my seed phrase</strong> and/or <strong>downloaded the backup file</strong>, and I understand that if I lose this information, my funds cannot be recovered.'
                        : 'I understand that this address is from an external wallet, and I am responsible for maintaining access to that wallet.'
                    }
                </label>
            </div>
        </div>
    `;
}

/**
 * Setup backup section functionality
 * @private
 */
function setupBackupSection(onComplete, onAddressChange) {
    const downloadBtn = document.getElementById('download-backup-btn');
    const passwordInput = document.getElementById('backup-password-input');
    const confirmationCheckbox = document.getElementById('backup-confirmation-checkbox');
    const confirmationContainer = document.getElementById('backup-confirmation-container');
    
    // Download button handler
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            await downloadWalletBackup(passwordInput?.value || '');
        });
    }
    
    // Confirmation checkbox handler
    if (confirmationCheckbox) {
        confirmationCheckbox.addEventListener('change', (e) => {
            walletState.backupConfirmed = e.target.checked;
            
            // Update visual state
            if (e.target.checked) {
                confirmationContainer.classList.remove('unchecked');
            } else {
                confirmationContainer.classList.add('unchecked');
            }
            
            // Check if setup is complete
            if (onComplete && isWalletSetupComplete()) {
                onComplete(getWalletState());
            }
            
            // Update configuration state
            if (walletState.address) {
                safeStateUpdate('configuration', {
                    MINING_ADDRESS: walletState.address,
                    WALLET_CONNECTIVITY_ENABLED: true
                });
            }
        });
    }
}

/**
 * Setup mnemonic reveal functionality
 * @private
 */
function setupMnemonicReveal() {
    const revealBtn = document.getElementById('mnemonic-reveal-btn');
    const mnemonicDisplay = document.getElementById('mnemonic-display');
    
    if (!revealBtn || !mnemonicDisplay) return;
    
    // Click on reveal button
    revealBtn.addEventListener('click', () => {
        toggleMnemonicReveal(mnemonicDisplay, revealBtn);
    });
    
    // Click on blurred mnemonic also reveals
    mnemonicDisplay.addEventListener('click', () => {
        if (mnemonicDisplay.classList.contains('blurred')) {
            toggleMnemonicReveal(mnemonicDisplay, revealBtn);
        }
    });
}

/**
 * Toggle mnemonic visibility
 * @private
 */
async function toggleMnemonicReveal(display, button) {
    const isBlurred = display.classList.contains('blurred');
    
    if (isBlurred) {
        // Show warning before revealing
        const confirmed = await showSecurityWarningDialog({
            title: 'Reveal Seed Phrase',
            message: `
                <p><strong>Your seed phrase is about to be displayed.</strong></p>
                <p>Make sure:</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.25rem;">
                    <li>No one is looking at your screen</li>
                    <li>You are not being recorded</li>
                    <li>You are in a private location</li>
                </ul>
                <p style="color: #c0392b; margin-top: 0.75rem;">
                    <strong>Never share your seed phrase with anyone!</strong>
                </p>
            `,
            confirmText: 'Reveal Seed Phrase',
            cancelText: 'Keep Hidden',
            requireCheckbox: true,
            checkboxLabel: 'I am in a safe environment and no one can see my screen'
        });
        
        if (!confirmed) return;
        
        // Revealing - start auto-hide timer
        display.classList.remove('blurred');
        display.classList.add('revealed');
        button.classList.add('revealed');
        button.innerHTML = '<span class="reveal-icon">🙈</span><span class="reveal-text">Hide</span>';
        walletState.isRevealed = true;
        
        // Start auto-hide timer
        startMnemonicAutoHideTimer();
    } else {
        // Hiding - clear timer
        display.classList.add('blurred');
        display.classList.remove('revealed');
        button.classList.remove('revealed');
        button.innerHTML = '<span class="reveal-icon">👁</span><span class="reveal-text">Click to Reveal</span>';
        walletState.isRevealed = false;
        
        if (mnemonicAutoHideTimer) {
            clearTimeout(mnemonicAutoHideTimer);
            mnemonicAutoHideTimer = null;
        }
    }
}

/**
 * Setup mnemonic input with real-time validation
 * @private
 */
function setupMnemonicInput(addressSection, backupSection, onComplete, onAddressChange) {
    const input = document.getElementById('mnemonic-input');
    const wordCount = document.getElementById('mnemonic-word-count');
    const validationMessage = document.getElementById('mnemonic-validation-message');
    
    if (!input) return;
    
    let validationTimeout = null;
    
    input.addEventListener('input', async (e) => {
        const value = e.target.value.trim().toLowerCase();
        const words = value.split(/\s+/).filter(w => w.length > 0);
        const count = words.length;
        
        // Update word count
        wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
        
        // Visual feedback for word count
        if (count === 12 || count === 24) {
            wordCount.classList.add('valid');
            wordCount.classList.remove('invalid');
        } else if (count > 0) {
            wordCount.classList.remove('valid');
            wordCount.classList.add('invalid');
        } else {
            wordCount.classList.remove('valid', 'invalid');
        }
        
        // Clear previous validation timeout
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        // Reset state
        walletState.isValid = false;
        walletState.address = null;
        addressSection.classList.add('hidden');
        backupSection.classList.add('hidden');
        
        // Debounce validation (wait for user to stop typing)
        validationTimeout = setTimeout(async () => {
            await validateAndDeriveFromMnemonic(
                value, 
                input, 
                validationMessage, 
                addressSection, 
                backupSection, 
                onComplete, 
                onAddressChange
            );
        }, 500);
    });
    
    // Prevent paste of formatted text
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        // Clean and insert plain text
        const cleaned = text.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        document.execCommand('insertText', false, cleaned);
    });
}

/**
 * Validate mnemonic and derive address
 * @private
 */
async function validateAndDeriveFromMnemonic(value, input, validationMessage, addressSection, backupSection, onComplete, onAddressChange) {
    const words = value.split(/\s+/).filter(w => w.length > 0);
    const count = words.length;
    
    // Must be 12 or 24 words
    if (count !== 12 && count !== 24) {
        if (count > 0) {
            showValidationError(
                input, 
                validationMessage, 
                `Seed phrase must be 12 or 24 words (currently ${count})`
            );
        }
        return;
    }
    
    try {
        // Validate mnemonic using WASM
        const walletService = await getWalletService();
        const normalizedMnemonic = words.join(' ');
        const isValid = await walletService.validateMnemonic(normalizedMnemonic);
        
        if (!isValid) {
            showValidationError(
                input, 
                validationMessage, 
                'Invalid seed phrase. Please check your words and try again.'
            );
            return;
        }
        
        // Mnemonic is valid - derive address
        walletState.mnemonic = normalizedMnemonic;
        const address = await walletService.deriveAddress(
            normalizedMnemonic, 
            walletState.network, 
            0
        );
        walletState.address = address;
        walletState.isValid = true;
        
        // Show success state
        input.classList.remove('field-error');
        input.classList.add('field-success');
        validationMessage.style.display = 'none';
        
        // Show address section
        addressSection.innerHTML = renderAddressDisplay(address, walletState.network);
        addressSection.classList.remove('hidden');
        setupAddressCopy();
        
        // Show backup section (backup confirmation still required)
        backupSection.innerHTML = renderBackupSection(true);
        backupSection.classList.remove('hidden');
        setupBackupSection(onComplete, onAddressChange);
        
        // Notify address change
        if (onAddressChange) {
            onAddressChange(address);
        }
        
        showNotification('Seed phrase validated successfully', 'success');
        
    } catch (error) {
        console.error('Mnemonic validation error:', error);
        showValidationError(
            input, 
            validationMessage, 
            'Error validating seed phrase. Please try again.'
        );
    }
}

/**
 * Show validation error
 * @private
 */
function showValidationError(input, messageElement, message) {
    input.classList.remove('field-success');
    input.classList.add('field-error');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    walletState.isValid = false;
    walletState.address = null;
}

/**
 * Setup manual address input with validation
 * @private
 */
function setupManualAddressInput(onComplete, onAddressChange) {
    const input = document.getElementById('manual-address-input');
    const validationMessage = document.getElementById('address-validation-message');
    
    if (!input) return;
    
    let validationTimeout = null;
    
    input.addEventListener('input', async (e) => {
        const value = e.target.value.trim();
        
        // Clear previous validation timeout
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        // Reset state
        walletState.isValid = false;
        walletState.address = null;
        
        if (!value) {
            input.classList.remove('field-error', 'field-success');
            validationMessage.style.display = 'none';
            return;
        }
        
        // Debounce validation
        validationTimeout = setTimeout(async () => {
            await validateManualAddress(value, input, validationMessage, onComplete, onAddressChange);
        }, 300);
    });
    
    // Handle paste
    input.addEventListener('paste', async (e) => {
        // Allow paste, then validate
        setTimeout(async () => {
            const value = input.value.trim();
            if (value) {
                await validateManualAddress(value, input, validationMessage, onComplete, onAddressChange);
            }
        }, 0);
    });
}

/**
 * Validate manual address entry
 * @private
 */
async function validateManualAddress(value, input, validationMessage, onComplete, onAddressChange) {
    try {
        // Basic prefix check first
        const expectedPrefix = walletState.network === 'mainnet' ? 'kaspa:' : 'kaspatest:';
        
        if (!value.startsWith(expectedPrefix)) {
            const wrongPrefix = value.startsWith('kaspa:') ? 'mainnet' : 
                               value.startsWith('kaspatest:') ? 'testnet' : null;
            
            if (wrongPrefix) {
                showAddressValidationError(
                    input, 
                    validationMessage, 
                    `This appears to be a ${wrongPrefix} address. You've selected ${walletState.network}.`
                );
            } else {
                showAddressValidationError(
                    input, 
                    validationMessage, 
                    `Address must start with "${expectedPrefix}"`
                );
            }
            return;
        }
        
        // Full validation using WASM
        const walletService = await getWalletService();
        const isValid = await walletService.validateAddress(value, walletState.network);
        
        if (!isValid) {
            showAddressValidationError(
                input, 
                validationMessage, 
                'Invalid Kaspa address. Please check and try again.'
            );
            return;
        }
        
        // Address is valid
        walletState.address = value;
        walletState.isValid = true;
        walletState.backupConfirmed = true; // No backup needed for manual entry
        
        input.classList.remove('field-error');
        input.classList.add('field-success');
        validationMessage.innerHTML = '✓ Valid Kaspa address';
        validationMessage.style.display = 'block';
        validationMessage.style.color = 'var(--success)';
        
        // Notify callbacks
        if (onAddressChange) {
            onAddressChange(value);
        }
        
        if (onComplete && isWalletSetupComplete()) {
            onComplete(getWalletState());
        }
        
    } catch (error) {
        console.error('Address validation error:', error);
        showAddressValidationError(
            input, 
            validationMessage, 
            'Error validating address. Please try again.'
        );
    }
}

/**
 * Show address validation error
 * @private
 */
function showAddressValidationError(input, messageElement, message) {
    input.classList.remove('field-success');
    input.classList.add('field-error');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    messageElement.style.color = 'var(--error)';
    walletState.isValid = false;
    walletState.address = null;
}

/**
 * Download wallet backup file (Kaspa NG compatible format)
 * @private
 */
async function downloadWalletBackup(password) {
    if (!walletState.mnemonic) {
        showNotification('No wallet data to backup', 'error');
        return;
    }
    
    // Show security warning
    const confirmed = await showSecurityWarningDialog({
        title: 'Download Wallet Backup',
        message: `
            <p>You are about to download an encrypted backup of your wallet.</p>
            <p style="margin-top: 0.75rem;"><strong>Important:</strong></p>
            <ul style="margin: 0.5rem 0; padding-left: 1.25rem;">
                <li>Store this file in a secure location</li>
                <li>Do not upload it to cloud storage</li>
                <li>Do not email it to yourself or anyone</li>
                ${password 
                    ? '<li>Remember your encryption password</li>' 
                    : '<li style="color: #c0392b;">Consider adding a password for extra security</li>'}
            </ul>
        `,
        confirmText: 'Download Backup',
        cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
        const downloadBtn = document.getElementById('download-backup-btn');
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<span>⏳</span><span>Generating...</span>';
        
        // Get wallet service for backup generation
        const walletService = await getWalletService();
        
        // Generate Kaspa NG compatible backup
        const backupData = await walletService.generateBackup(
            walletState.mnemonic,
            walletState.address,
            walletState.network,
            password
        );
        
        // Create download
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const filename = `kaspa-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Update state
        walletState.backupDownloaded = true;
        
        // Update button
        downloadBtn.disabled = false;
        downloadBtn.classList.add('downloaded');
        downloadBtn.innerHTML = '<span>✓</span><span>Backup Downloaded</span>';
        
        showNotification('Wallet backup downloaded successfully', 'success');
        
    } catch (error) {
        console.error('Backup generation failed:', error);
        const downloadBtn = document.getElementById('download-backup-btn');
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<span>💾</span><span>Download Wallet Backup</span>';
        showNotification('Failed to generate backup. Please try again.', 'error');
    }
}

/**
 * Update wallet network and regenerate address if needed
 * Call this when the network selection changes
 * @param {string} newNetwork - New network ('mainnet' or 'testnet-*')
 */
export async function updateWalletNetwork(newNetwork) {
    if (walletState.network === newNetwork) return;
    
    const previousNetwork = walletState.network;
    walletState.network = newNetwork;
    
    // If we have a mnemonic, regenerate the address for the new network
    if (walletState.mnemonic && walletState.mode !== WalletSetupMode.MANUAL) {
        try {
            const walletService = await getWalletService();
            const newAddress = await walletService.deriveAddress(walletState.mnemonic, newNetwork, 0);
            walletState.address = newAddress;
            
            // Update address display if visible
            const addressSection = document.getElementById('wallet-address-section');
            if (addressSection && !addressSection.classList.contains('hidden')) {
                addressSection.innerHTML = renderAddressDisplay(newAddress, newNetwork);
                setupAddressCopy();
            }
            
            // Update network badges
            updateNetworkBadges(newNetwork);
            
            showNotification(`Address updated for ${newNetwork}`, 'info');
            
        } catch (error) {
            console.error('Failed to update address for new network:', error);
            walletState.network = previousNetwork;
            showNotification('Failed to update address. Network reverted.', 'error');
        }
    }
    
    // For manual mode, clear the address since it may not be valid for new network
    if (walletState.mode === WalletSetupMode.MANUAL && walletState.address) {
        walletState.address = null;
        walletState.isValid = false;
        
        const input = document.getElementById('manual-address-input');
        if (input) {
            input.value = '';
            input.classList.remove('field-success', 'field-error');
        }
        
        showNotification('Please re-enter your address for the selected network', 'warning');
    }
}

/**
 * Update all network badges in the UI
 * @private
 */
function updateNetworkBadges(network) {
    const badges = document.querySelectorAll('.network-badge');
    badges.forEach(badge => {
        badge.className = `network-badge ${network === 'mainnet' ? 'mainnet' : 'testnet'}`;
        badge.innerHTML = network === 'mainnet' ? '🟢 Mainnet' : '🟡 Testnet';
    });
}

/**
 * Hide the wallet setup panel
 */
export function hideWalletSetupPanel() {
    const panel = document.getElementById('wallet-setup-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
}

/**
 * Show the wallet setup panel
 */
export function showWalletSetupPanel() {
    const panel = document.getElementById('wallet-setup-panel');
    if (panel) {
        panel.classList.remove('hidden');
    }
}

/**
 * Get the current mining address (for form submission)
 * @returns {string|null} Mining address or null if not set
 */
export function getMiningAddress() {
    return walletState.address;
}

/**
 * Set up cleanup on page unload
 * Ensures sensitive data is cleared when user leaves
 */
function setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
        clearWalletState();
    });
    
    // Also clear on visibility change (tab hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Hide mnemonic if revealed
            const mnemonicDisplay = document.getElementById('mnemonic-display');
            const revealBtn = document.getElementById('mnemonic-reveal-btn');
            if (mnemonicDisplay && !mnemonicDisplay.classList.contains('blurred')) {
                toggleMnemonicReveal(mnemonicDisplay, revealBtn);
            }
        }
    });
}

// Initialize unload handler
setupUnloadHandler();

// Final exports
export {
    renderWalletSetupPanel,
    clearWalletState,
    getWalletState,
    isWalletSetupComplete,
    updateWalletNetwork,
    hideWalletSetupPanel,
    showWalletSetupPanel,
    getMiningAddress,
    WalletSetupMode
};
