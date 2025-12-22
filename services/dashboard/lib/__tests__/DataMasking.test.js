const {
    isSensitiveField,
    maskString,
    maskConfiguration,
    maskWalletInfo,
    sanitizeLogContent,
    createMaskedCopy,
    createToggleableData,
    SENSITIVE_PATTERNS,
    MASKING_CONFIG
} = require('../DataMasking');

describe('DataMasking', () => {
    describe('isSensitiveField', () => {
        test('should identify password fields', () => {
            const passwordFields = [
                'password',
                'PASSWORD',
                'user_password',
                'db_passwd',
                'admin_pwd'
            ];

            passwordFields.forEach(field => {
                expect(isSensitiveField(field)).toBe(true);
            });
        });

        test('should identify wallet fields', () => {
            const walletFields = [
                'privateKey',
                'private_key',
                'seed',
                'mnemonic',
                'xprv'
            ];

            walletFields.forEach(field => {
                expect(isSensitiveField(field)).toBe(true);
            });
        });

        test('should identify API key fields', () => {
            const apiFields = [
                'api_key',
                'apiKey',
                'access_token',
                'bearer_token',
                'jwt_token'
            ];

            apiFields.forEach(field => {
                expect(isSensitiveField(field)).toBe(true);
            });
        });

        test('should not identify safe fields', () => {
            const safeFields = [
                'username',
                'email',
                'url',
                'port',
                'timeout',
                'version'
            ];

            safeFields.forEach(field => {
                expect(isSensitiveField(field)).toBe(false);
            });
        });

        test('should handle non-string input', () => {
            expect(isSensitiveField(null)).toBe(false);
            expect(isSensitiveField(undefined)).toBe(false);
            expect(isSensitiveField(123)).toBe(false);
        });
    });

    describe('maskString', () => {
        test('should completely mask short strings', () => {
            const result = maskString('short', 'complete');
            expect(result).toBe(MASKING_CONFIG.completeMask);
        });

        test('should partially mask long strings', () => {
            const longString = 'this-is-a-very-long-string-for-testing';
            const result = maskString(longString, 'partial');
            
            expect(result).toContain('this');
            expect(result).toContain('ting');
            expect(result).toContain('***');
        });

        test('should mask addresses appropriately', () => {
            const address = 'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5';
            const result = maskString(address, 'address');
            
            expect(result).toContain('kaspa:qz');
            expect(result).toContain('r5r5');
            expect(result).toContain('***');
        });

        test('should handle empty strings', () => {
            expect(maskString('', 'complete')).toBe('');
            expect(maskString('', 'partial')).toBe('');
        });

        test('should handle non-string input', () => {
            expect(maskString(null, 'complete')).toBe(null);
            expect(maskString(123, 'complete')).toBe(123);
        });
    });

    describe('maskConfiguration', () => {
        test('should mask sensitive configuration fields', () => {
            const config = {
                DATABASE_URL: 'postgresql://user:pass@host:5432/db',
                API_KEY: 'secret-api-key-123',
                PASSWORD: 'mypassword',
                PUBLIC_URL: 'https://example.com',
                PORT: 8080
            };

            const masked = maskConfiguration(config);

            expect(masked.API_KEY).toBe(MASKING_CONFIG.completeMask);
            expect(masked.PASSWORD).toBe(MASKING_CONFIG.completeMask);
            expect(masked.PUBLIC_URL).toBe('https://example.com');
            expect(masked.PORT).toBe(8080);
        });

        test('should handle nested objects', () => {
            const config = {
                database: {
                    password: 'secret',
                    host: 'localhost',
                    port: 5432
                },
                api: {
                    key: 'secret-key',
                    url: 'https://api.example.com'
                }
            };

            const masked = maskConfiguration(config);

            expect(masked.database.password).toBe(MASKING_CONFIG.completeMask);
            expect(masked.database.host).toBe('localhost');
            expect(masked.database.port).toBe(5432);
            expect(masked.api.key).toBe(MASKING_CONFIG.completeMask);
            expect(masked.api.url).toBe('https://api.example.com');
        });

        test('should handle arrays', () => {
            const config = {
                servers: [
                    { host: 'server1', password: 'secret1' },
                    { host: 'server2', password: 'secret2' }
                ]
            };

            const masked = maskConfiguration(config);

            expect(masked.servers[0].host).toBe('server1');
            expect(masked.servers[0].password).toBe(MASKING_CONFIG.completeMask);
            expect(masked.servers[1].host).toBe('server2');
            expect(masked.servers[1].password).toBe(MASKING_CONFIG.completeMask);
        });

        test('should handle null and undefined values', () => {
            expect(maskConfiguration(null)).toBe(null);
            expect(maskConfiguration(undefined)).toBe(undefined);
        });
    });

    describe('maskWalletInfo', () => {
        test('should mask sensitive wallet fields', () => {
            const walletInfo = {
                address: 'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5',
                balance: 1000.5,
                privateKey: 'private-key-data-here',
                seed: 'seed phrase words here',
                publicKey: 'public-key-data-here'
            };

            const masked = maskWalletInfo(walletInfo);

            expect(masked.balance).toBe(1000.5);
            expect(masked.privateKey).toBe(MASKING_CONFIG.completeMask);
            expect(masked.seed).toBe(MASKING_CONFIG.completeMask);
            expect(masked.address).toContain('kaspa:qz');
            expect(masked.address).toContain('***');
        });

        test('should mask transaction addresses', () => {
            const walletInfo = {
                transactions: [
                    {
                        txId: 'tx123',
                        amount: 100,
                        from: ['kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5'],
                        to: ['kaspa:qr1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc']
                    }
                ]
            };

            const masked = maskWalletInfo(walletInfo);

            expect(masked.transactions[0].txId).toBe('tx123');
            expect(masked.transactions[0].amount).toBe(100);
            expect(masked.transactions[0].from[0]).toContain('kaspa:qz');
            expect(masked.transactions[0].from[0]).toContain('***');
            expect(masked.transactions[0].to[0]).toContain('kaspa:qr');
            expect(masked.transactions[0].to[0]).toContain('***');
        });

        test('should handle null wallet info', () => {
            expect(maskWalletInfo(null)).toBe(null);
            expect(maskWalletInfo(undefined)).toBe(undefined);
        });
    });

    describe('sanitizeLogContent', () => {
        test('should mask passwords in logs', () => {
            const logContent = 'User authentication failed with password=secret123';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toBe('User authentication failed with password=***');
        });

        test('should mask tokens in logs', () => {
            const logContent = 'API request with bearer=abc123def456 was successful';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toBe('API request with bearer=*** was successful');
        });

        test('should mask connection strings', () => {
            const logContent = 'Connecting to postgresql://user:pass@host:5432/db';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toBe('Connecting to postgresql://***:***@***:***/**');
        });

        test('should mask Kaspa addresses', () => {
            const logContent = 'Payment sent to kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5';
            const sanitized = sanitizeLogContent(logContent);
            // The address should be masked using address masking (8 chars start, 8 chars end)
            expect(sanitized).toContain('kaspa:qz');
            expect(sanitized).toContain('***');
            expect(sanitized).toContain('r5r5r5r5');
        });

        test('should mask email addresses', () => {
            const logContent = 'User john.doe@example.com logged in successfully';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toBe('User jo***@example.com logged in successfully');
        });

        test('should mask credit card numbers', () => {
            const logContent = 'Payment with card 4532-1234-5678-9012 processed';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toBe('Payment with card ****-****-****-**** processed');
        });

        test('should handle multiple sensitive patterns', () => {
            const logContent = 'Login: password=secret token=abc123 key=mykey';
            const sanitized = sanitizeLogContent(logContent);
            expect(sanitized).toContain('password=***');
            expect(sanitized).toContain('token=***');
            expect(sanitized).toContain('key=***');
        });

        test('should handle non-string input', () => {
            expect(sanitizeLogContent(null)).toBe(null);
            expect(sanitizeLogContent(123)).toBe(123);
        });
    });

    describe('createMaskedCopy', () => {
        test('should create masked copy for wallet context', () => {
            const data = {
                address: 'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5',
                privateKey: 'secret-key'
            };

            const masked = createMaskedCopy(data, 'wallet');
            expect(masked.privateKey).toBe(MASKING_CONFIG.completeMask);
        });

        test('should create masked copy for config context', () => {
            const data = {
                API_KEY: 'secret-key',
                PUBLIC_URL: 'https://example.com'
            };

            const masked = createMaskedCopy(data, 'config');
            expect(masked.API_KEY).toBe(MASKING_CONFIG.completeMask);
            expect(masked.PUBLIC_URL).toBe('https://example.com');
        });

        test('should handle arrays', () => {
            const data = [
                { password: 'secret1' },
                { password: 'secret2' }
            ];

            const masked = createMaskedCopy(data, 'config');
            expect(masked[0].password).toBe(MASKING_CONFIG.completeMask);
            expect(masked[1].password).toBe(MASKING_CONFIG.completeMask);
        });

        test('should handle primitive values', () => {
            expect(createMaskedCopy('string')).toBe('string');
            expect(createMaskedCopy(123)).toBe(123);
            expect(createMaskedCopy(null)).toBe(null);
        });
    });

    describe('createToggleableData', () => {
        test('should return masked data when showSensitive is false', () => {
            const data = { password: 'secret', username: 'user' };
            const result = createToggleableData(data, false);
            
            expect(result.password).toBe(MASKING_CONFIG.completeMask);
            expect(result.username).toBe('user');
        });

        test('should return original data when showSensitive is true', () => {
            const data = { password: 'secret', username: 'user' };
            const result = createToggleableData(data, true);
            
            expect(result.password).toBe('secret');
            expect(result.username).toBe('user');
        });
    });

    describe('SENSITIVE_PATTERNS', () => {
        test('should contain password patterns', () => {
            expect(SENSITIVE_PATTERNS.passwords).toContain('password');
            expect(SENSITIVE_PATTERNS.passwords).toContain('secret');
            expect(SENSITIVE_PATTERNS.passwords).toContain('key');
        });

        test('should contain wallet patterns', () => {
            expect(SENSITIVE_PATTERNS.wallet).toContain('privatekey');
            expect(SENSITIVE_PATTERNS.wallet).toContain('seed');
            expect(SENSITIVE_PATTERNS.wallet).toContain('mnemonic');
        });

        test('should contain API key patterns', () => {
            expect(SENSITIVE_PATTERNS.apiKeys).toContain('api_key');
            expect(SENSITIVE_PATTERNS.apiKeys).toContain('access_token');
            expect(SENSITIVE_PATTERNS.apiKeys).toContain('jwt');
        });
    });

    describe('MASKING_CONFIG', () => {
        test('should have default mask character', () => {
            expect(MASKING_CONFIG.maskChar).toBe('*');
        });

        test('should have complete mask string', () => {
            expect(MASKING_CONFIG.completeMask).toBe('***');
        });

        test('should have partial mask configuration', () => {
            expect(MASKING_CONFIG.partialMask.start).toBe(4);
            expect(MASKING_CONFIG.partialMask.end).toBe(4);
            expect(MASKING_CONFIG.partialMask.minLength).toBe(12);
        });

        test('should have address mask configuration', () => {
            expect(MASKING_CONFIG.addressMask.start).toBe(8);
            expect(MASKING_CONFIG.addressMask.end).toBe(8);
            expect(MASKING_CONFIG.addressMask.minLength).toBe(20);
        });
    });
});