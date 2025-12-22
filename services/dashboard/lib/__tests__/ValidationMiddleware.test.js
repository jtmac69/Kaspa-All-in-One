const {
    isValidKaspaAddress,
    isValidServiceName,
    sanitizers,
    schemas,
    validateSchema
} = require('../ValidationMiddleware');

describe('ValidationMiddleware', () => {
    describe('isValidKaspaAddress', () => {
        test('should validate correct Kaspa addresses', () => {
            const validAddresses = [
                'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5',
                'kaspa:qr1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc'
            ];

            validAddresses.forEach(address => {
                expect(isValidKaspaAddress(address)).toBe(true);
            });
        });

        test('should reject invalid Kaspa addresses', () => {
            const invalidAddresses = [
                'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                'kaspa:invalid',
                'kaspa:',
                'not-an-address',
                '',
                null,
                undefined,
                123
            ];

            invalidAddresses.forEach(address => {
                expect(isValidKaspaAddress(address)).toBe(false);
            });
        });
    });

    describe('isValidServiceName', () => {
        test('should validate correct service names', () => {
            const validServices = [
                'kaspa-node',
                'kasia-app',
                'k-social',
                'indexer-db'
            ];

            validServices.forEach(service => {
                expect(isValidServiceName(service)).toBe(true);
            });
        });

        test('should reject invalid service names', () => {
            const invalidServices = [
                'invalid-service',
                'kaspa node', // spaces not allowed
                'kaspa@node', // special chars not allowed
                '',
                null,
                undefined,
                123
            ];

            invalidServices.forEach(service => {
                expect(isValidServiceName(service)).toBe(false);
            });
        });
    });

    describe('sanitizers', () => {
        describe('sanitizeHtml', () => {
            test('should remove HTML tags', () => {
                const input = '<script>alert("xss")</script>Hello World';
                const result = sanitizers.sanitizeHtml(input);
                expect(result).toBe('Hello World');
            });

            test('should handle non-string input', () => {
                expect(sanitizers.sanitizeHtml(123)).toBe(123);
                expect(sanitizers.sanitizeHtml(null)).toBe(null);
            });
        });

        describe('sanitizeLogContent', () => {
            test('should mask passwords in logs', () => {
                const input = 'User login with password=secret123 failed';
                const result = sanitizers.sanitizeLogContent(input);
                expect(result).toBe('User login with password=*** failed');
            });

            test('should mask tokens in logs', () => {
                const input = 'API call with token=abc123def456 succeeded';
                const result = sanitizers.sanitizeLogContent(input);
                expect(result).toBe('API call with token=*** succeeded');
            });

            test('should mask multiple sensitive fields', () => {
                const input = 'Config: password=secret key=mykey token=abc123';
                const result = sanitizers.sanitizeLogContent(input);
                expect(result).toContain('password=***');
                expect(result).toContain('key=***');
                expect(result).toContain('token=***');
            });
        });

        describe('sanitizeConfig', () => {
            test('should mask sensitive configuration fields', () => {
                const config = {
                    DATABASE_URL: 'postgresql://user:pass@host:5432/db',
                    API_KEY: 'secret-key-123',
                    PASSWORD: 'mypassword',
                    PUBLIC_URL: 'https://example.com'
                };

                const result = sanitizers.sanitizeConfig(config);
                
                expect(result.API_KEY).toBe('***');
                expect(result.PASSWORD).toBe('***');
                expect(result.PUBLIC_URL).toBe('https://example.com');
            });

            test('should handle nested objects', () => {
                const config = {
                    database: {
                        password: 'secret',
                        host: 'localhost'
                    },
                    api: {
                        key: 'secret-key',
                        url: 'https://api.example.com'
                    }
                };

                const result = sanitizers.sanitizeConfig(config);
                
                expect(result.database.password).toBe('***');
                expect(result.database.host).toBe('localhost');
                expect(result.api.key).toBe('***');
                expect(result.api.url).toBe('https://api.example.com');
            });
        });

        describe('sanitizeWalletInfo', () => {
            test('should mask sensitive wallet fields', () => {
                const walletInfo = {
                    address: 'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5',
                    balance: 1000,
                    privateKey: 'private-key-data',
                    seed: 'seed-phrase-data'
                };

                const result = sanitizers.sanitizeWalletInfo(walletInfo);
                
                expect(result.balance).toBe(1000);
                expect(result.privateKey).toBe('***');
                expect(result.seed).toBe('***');
            });
        });
    });

    describe('schemas', () => {
        describe('serviceName schema', () => {
            test('should validate correct service names', () => {
                const { error } = schemas.serviceName.validate('kaspa-node');
                expect(error).toBeUndefined();
            });

            test('should reject invalid service names', () => {
                const { error } = schemas.serviceName.validate('invalid service');
                expect(error).toBeDefined();
                expect(error.details[0].message).toContain('alphanumeric characters');
            });

            test('should reject empty service names', () => {
                const { error } = schemas.serviceName.validate('');
                expect(error).toBeDefined();
            });

            test('should reject too long service names', () => {
                const longName = 'a'.repeat(51);
                const { error } = schemas.serviceName.validate(longName);
                expect(error).toBeDefined();
            });
        });

        describe('kaspaAddress schema', () => {
            test('should validate correct Kaspa addresses', () => {
                const address = 'kaspa:qz4wk9g6fu0n0zu3rg8e5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5';
                const { error } = schemas.kaspaAddress.validate(address);
                expect(error).toBeUndefined();
            });

            test('should reject invalid Kaspa addresses', () => {
                const { error } = schemas.kaspaAddress.validate('invalid-address');
                expect(error).toBeDefined();
                expect(error.details[0].message).toContain('Invalid Kaspa address format');
            });
        });

        describe('transactionAmount schema', () => {
            test('should validate correct amounts', () => {
                const { error } = schemas.transactionAmount.validate(100.5);
                expect(error).toBeUndefined();
            });

            test('should reject negative amounts', () => {
                const { error } = schemas.transactionAmount.validate(-10);
                expect(error).toBeDefined();
                expect(error.details[0].message).toContain('positive');
            });

            test('should reject amounts exceeding max supply', () => {
                const { error } = schemas.transactionAmount.validate(30000000000);
                expect(error).toBeDefined();
                expect(error.details[0].message).toContain('maximum possible value');
            });
        });

        describe('logQuery schema', () => {
            test('should validate safe log queries', () => {
                const { error } = schemas.logQuery.validate('error 404');
                expect(error).toBeUndefined();
            });

            test('should reject queries with dangerous characters', () => {
                const { error } = schemas.logQuery.validate('error && rm -rf /');
                expect(error).toBeDefined();
            });

            test('should reject too long queries', () => {
                const longQuery = 'a'.repeat(201);
                const { error } = schemas.logQuery.validate(longQuery);
                expect(error).toBeDefined();
            });
        });
    });

    describe('validateSchema middleware', () => {
        test('should create middleware that validates request body', () => {
            const middleware = validateSchema(schemas.serviceName, 'body');
            expect(typeof middleware).toBe('function');
            expect(middleware.length).toBe(3); // req, res, next
        });

        test('should pass validation for valid data', (done) => {
            const middleware = validateSchema(schemas.serviceName, 'body');
            const req = { body: 'kaspa-node' };
            const res = {};
            const next = () => {
                expect(req.body).toBe('kaspa-node');
                done();
            };

            middleware(req, res, next);
        });

        test('should return error for invalid data', (done) => {
            const middleware = validateSchema(schemas.serviceName, 'body');
            const req = { body: 'invalid service' };
            const res = {
                status: (code) => {
                    expect(code).toBe(400);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Validation failed');
                            expect(data.details).toBeDefined();
                            done();
                        }
                    };
                }
            };
            const next = () => {};

            middleware(req, res, next);
        });
    });
});