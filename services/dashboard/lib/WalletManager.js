const axios = require('axios');
const crypto = require('crypto');

class WalletManager {
    constructor(rpcUrl = 'http://kaspa-node:16111') {
        this.rpcUrl = rpcUrl;
        this.timeout = 15000; // 15 seconds for wallet operations
    }

    async makeRpcCall(method, params = {}) {
        try {
            const response = await axios.post(this.rpcUrl, {
                method,
                params
            }, { 
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.error) {
                throw new Error(`RPC Error: ${response.data.error.message || 'Unknown error'}`);
            }

            return response.data.result || response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Kaspa node - service may be down');
            } else if (error.code === 'ETIMEDOUT') {
                throw new Error('Wallet operation timed out');
            }
            throw error;
        }
    }

    async getWalletInfo() {
        try {
            // Try to get wallet info - this will fail if no wallet is loaded
            const balance = await this.makeRpcCall('getBalance');
            const addresses = await this.makeRpcCall('getAddresses');
            
            return {
                hasWallet: true,
                balance: this.formatBalance(balance.available || 0),
                pendingBalance: this.formatBalance(balance.pending || 0),
                addresses: addresses.addresses || [],
                primaryAddress: addresses.addresses?.[0] || null
            };
        } catch (error) {
            // Check if it's a "no wallet" error vs other errors
            if (error.message.includes('wallet') || error.message.includes('not loaded')) {
                return {
                    hasWallet: false,
                    balance: 0,
                    pendingBalance: 0,
                    addresses: [],
                    primaryAddress: null,
                    error: 'No wallet loaded'
                };
            }
            throw error;
        }
    }

    async createWallet(password, mnemonic = null) {
        try {
            // Validate password strength
            this.validatePassword(password);

            let result;
            if (mnemonic) {
                // Import wallet from mnemonic
                result = await this.makeRpcCall('importWallet', {
                    mnemonic: mnemonic.trim(),
                    password
                });
            } else {
                // Create new wallet
                result = await this.makeRpcCall('createWallet', {
                    password
                });
            }

            return {
                success: true,
                mnemonic: result.mnemonic,
                addresses: result.addresses || [],
                primaryAddress: result.addresses?.[0] || null,
                message: mnemonic ? 'Wallet imported successfully' : 'Wallet created successfully'
            };
        } catch (error) {
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    async sendTransaction(fromAddress, toAddress, amount, password, fee = null) {
        try {
            // Validate inputs
            this.validateKaspaAddress(toAddress);
            this.validateAmount(amount);

            // Check balance first
            const walletInfo = await this.getWalletInfo();
            if (!walletInfo.hasWallet) {
                throw new Error('No wallet loaded');
            }

            const totalRequired = amount + (fee || 0);
            if (walletInfo.balance < totalRequired) {
                throw new Error(`Insufficient balance. Required: ${this.formatBalance(totalRequired)} KAS, Available: ${this.formatBalance(walletInfo.balance)} KAS`);
            }

            // Prepare transaction parameters
            const txParams = {
                toAddress,
                amount: this.kasToSompi(amount),
                password
            };

            if (fromAddress) {
                txParams.fromAddress = fromAddress;
            }

            if (fee) {
                txParams.fee = this.kasToSompi(fee);
            }

            // Send transaction
            const result = await this.makeRpcCall('send', txParams);

            return {
                success: true,
                transactionId: result.transactionId || result.txId,
                amount: amount,
                fee: fee || result.fee || 0,
                toAddress,
                fromAddress: fromAddress || walletInfo.primaryAddress,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    async getTransactionHistory(limit = 50) {
        try {
            const transactions = await this.makeRpcCall('getTransactions', {
                limit
            });

            return (transactions.transactions || []).map(tx => ({
                txId: tx.transactionId || tx.txId,
                timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
                amount: this.sompiToKas(tx.amount || 0),
                fee: this.sompiToKas(tx.fee || 0),
                from: tx.inputs?.map(input => input.address) || [],
                to: tx.outputs?.map(output => output.address) || [],
                confirmations: tx.confirmations || 0,
                status: this.determineTransactionStatus(tx),
                type: tx.amount > 0 ? 'received' : 'sent'
            }));
        } catch (error) {
            // If transaction history is not available, return empty array
            console.warn('Failed to get transaction history:', error.message);
            return [];
        }
    }

    async generateNewAddress() {
        try {
            const result = await this.makeRpcCall('newAddress');
            return {
                success: true,
                address: result.address,
                message: 'New address generated successfully'
            };
        } catch (error) {
            throw new Error(`Failed to generate new address: ${error.message}`);
        }
    }

    async validateAddress(address) {
        try {
            this.validateKaspaAddress(address);
            
            // Additional validation via RPC if available
            try {
                const result = await this.makeRpcCall('validateAddress', { address });
                return {
                    valid: result.isValid || true,
                    address,
                    type: result.addressType || 'unknown'
                };
            } catch (rpcError) {
                // If RPC validation fails, use basic validation
                return {
                    valid: true,
                    address,
                    type: 'unknown'
                };
            }
        } catch (error) {
            return {
                valid: false,
                address,
                error: error.message
            };
        }
    }

    // Utility methods
    validateKaspaAddress(address) {
        if (!address || typeof address !== 'string') {
            throw new Error('Address is required and must be a string');
        }

        // Basic Kaspa address validation
        // Kaspa addresses typically start with 'kaspa:' prefix
        const cleanAddress = address.replace('kaspa:', '');
        
        if (cleanAddress.length < 30 || cleanAddress.length > 90) {
            throw new Error('Invalid address length');
        }

        // Check for valid characters (base58 or bech32-like)
        if (!/^[a-zA-Z0-9]+$/.test(cleanAddress)) {
            throw new Error('Invalid address format');
        }

        return true;
    }

    validateAmount(amount) {
        if (!amount || isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        if (amount > 28400000000) { // Max KAS supply
            throw new Error('Amount exceeds maximum possible value');
        }

        // Check for reasonable precision (max 8 decimal places)
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 8) {
            throw new Error('Amount has too many decimal places (max 8)');
        }

        return true;
    }

    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password is required');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Check for basic complexity
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const complexityCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        
        if (complexityCount < 3) {
            throw new Error('Password must contain at least 3 of: lowercase, uppercase, numbers, special characters');
        }

        return true;
    }

    // Convert KAS to Sompi (smallest unit)
    kasToSompi(kas) {
        return Math.floor(kas * 100000000); // 1 KAS = 100,000,000 Sompi
    }

    // Convert Sompi to KAS
    sompiToKas(sompi) {
        return sompi / 100000000;
    }

    // Format balance for display
    formatBalance(sompi) {
        const kas = this.sompiToKas(sompi);
        return Math.round(kas * 100000000) / 100000000; // Round to 8 decimal places
    }

    determineTransactionStatus(tx) {
        if (tx.confirmations === undefined || tx.confirmations === null) {
            return 'pending';
        }

        if (tx.confirmations === 0) {
            return 'pending';
        } else if (tx.confirmations < 10) {
            return 'confirming';
        } else {
            return 'confirmed';
        }
    }

    // Generate a secure mnemonic phrase (for wallet creation)
    generateMnemonic() {
        // This is a simplified version - in production, use a proper BIP39 library
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
            // ... (in production, use the full BIP39 wordlist)
        ];

        const mnemonic = [];
        for (let i = 0; i < 12; i++) {
            const randomIndex = crypto.randomInt(0, words.length);
            mnemonic.push(words[randomIndex]);
        }

        return mnemonic.join(' ');
    }

    // Sanitize wallet data for logging (remove sensitive info)
    sanitizeWalletData(data) {
        const sanitized = { ...data };
        
        // Remove sensitive fields
        delete sanitized.password;
        delete sanitized.mnemonic;
        delete sanitized.privateKey;
        
        // Mask addresses partially
        if (sanitized.addresses) {
            sanitized.addresses = sanitized.addresses.map(addr => 
                addr ? `${addr.substring(0, 8)}...${addr.substring(addr.length - 8)}` : addr
            );
        }
        
        if (sanitized.primaryAddress) {
            const addr = sanitized.primaryAddress;
            sanitized.primaryAddress = `${addr.substring(0, 8)}...${addr.substring(addr.length - 8)}`;
        }

        return sanitized;
    }
}

module.exports = WalletManager;