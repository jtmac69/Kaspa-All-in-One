const {
    corsOptions,
    rateLimiters,
    validateRequest,
    createIPWhitelist,
    securityLogger
} = require('../SecurityMiddleware');

describe('SecurityMiddleware', () => {
    describe('CORS configuration', () => {
        test('should allow localhost origins', (done) => {
            const origin = 'http://localhost:3000';
            corsOptions.origin(origin, (err, allowed) => {
                expect(err).toBeNull();
                expect(allowed).toBe(true);
                done();
            });
        });

        test('should allow 127.0.0.1 origins', (done) => {
            const origin = 'http://127.0.0.1:8080';
            corsOptions.origin(origin, (err, allowed) => {
                expect(err).toBeNull();
                expect(allowed).toBe(true);
                done();
            });
        });

        test('should reject unauthorized origins in production', (done) => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const origin = 'http://malicious-site.com';
            corsOptions.origin(origin, (err, allowed) => {
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toContain('Not allowed by CORS');
                process.env.NODE_ENV = originalEnv;
                done();
            });
        });

        test('should allow requests with no origin', (done) => {
            corsOptions.origin(undefined, (err, allowed) => {
                expect(err).toBeNull();
                expect(allowed).toBe(true);
                done();
            });
        });
    });

    describe('validateRequest middleware', () => {
        test('should pass valid requests', (done) => {
            const req = {
                url: '/api/status',
                get: (header) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined,
                ip: '127.0.0.1'
            };
            const res = {};
            const next = () => {
                done();
            };

            validateRequest(req, res, next);
        });

        test('should reject requests with path traversal', (done) => {
            const req = {
                url: '/api/../../../etc/passwd',
                get: (header) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined,
                ip: '127.0.0.1'
            };
            const res = {
                status: (code) => {
                    expect(code).toBe(400);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Invalid request');
                            expect(data.message).toContain('suspicious patterns');
                            done();
                        }
                    };
                }
            };
            const next = () => {};

            validateRequest(req, res, next);
        });

        test('should reject requests with XSS attempts', (done) => {
            const req = {
                url: '/api/status?q=<script>alert("xss")</script>',
                get: (header) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined,
                ip: '127.0.0.1'
            };
            const res = {
                status: (code) => {
                    expect(code).toBe(400);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Invalid request');
                            done();
                        }
                    };
                }
            };
            const next = () => {};

            validateRequest(req, res, next);
        });

        test('should reject requests that are too large', (done) => {
            const req = {
                url: '/api/status',
                get: (header) => {
                    if (header === 'User-Agent') return 'Mozilla/5.0';
                    if (header === 'Content-Length') return '20971520'; // 20MB
                    return undefined;
                },
                ip: '127.0.0.1'
            };
            const res = {
                status: (code) => {
                    expect(code).toBe(413);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Request too large');
                            done();
                        }
                    };
                }
            };
            const next = () => {};

            validateRequest(req, res, next);
        });

        test('should warn about suspicious user agents', (done) => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const req = {
                url: '/api/status',
                get: (header) => header === 'User-Agent' ? 'Bot' : undefined,
                ip: '192.168.1.100'
            };
            const res = {};
            const next = () => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('Suspicious user agent: Bot from IP: 192.168.1.100')
                );
                consoleSpy.mockRestore();
                done();
            };

            validateRequest(req, res, next);
        });
    });

    describe('createIPWhitelist middleware', () => {
        test('should allow localhost IPs', (done) => {
            const whitelist = createIPWhitelist([]);
            const req = { ip: '127.0.0.1' };
            const res = {};
            const next = () => {
                done();
            };

            whitelist(req, res, next);
        });

        test('should allow whitelisted IPs', (done) => {
            const whitelist = createIPWhitelist(['192.168.1.100']);
            const req = { ip: '192.168.1.100' };
            const res = {};
            const next = () => {
                done();
            };

            whitelist(req, res, next);
        });

        test('should reject non-whitelisted IPs', (done) => {
            const whitelist = createIPWhitelist(['192.168.1.100']);
            const req = { ip: '10.0.0.1' };
            const res = {
                status: (code) => {
                    expect(code).toBe(403);
                    return {
                        json: (data) => {
                            expect(data.error).toBe('Access denied');
                            expect(data.message).toContain('not authorized');
                            done();
                        }
                    };
                }
            };
            const next = () => {};

            whitelist(req, res, next);
        });
    });

    describe('securityLogger middleware', () => {
        test('should log security-relevant requests', (done) => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const req = {
                method: 'POST',
                path: '/api/services/kaspa-node/start',
                ip: '127.0.0.1',
                get: (header) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined
            };
            const res = {
                json: function(data) {
                    expect(consoleSpy).toHaveBeenCalledWith(
                        expect.stringContaining('[SECURITY] POST /api/services/kaspa-node/start from 127.0.0.1')
                    );
                    consoleSpy.mockRestore();
                    done();
                    return this;
                }
            };
            const next = () => {
                res.json({ success: true });
            };

            securityLogger(req, res, next);
        });

        test('should not log non-security requests', (done) => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const req = {
                method: 'GET',
                path: '/health',
                ip: '127.0.0.1',
                get: (header) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined
            };
            const res = {
                json: function(data) {
                    expect(consoleSpy).not.toHaveBeenCalled();
                    consoleSpy.mockRestore();
                    done();
                    return this;
                }
            };
            const next = () => {
                res.json({ status: 'healthy' });
            };

            securityLogger(req, res, next);
        });
    });

    describe('rate limiters', () => {
        test('should have general rate limiter configured', () => {
            expect(rateLimiters.general).toBeDefined();
            expect(typeof rateLimiters.general).toBe('function');
        });

        test('should have service control rate limiter configured', () => {
            expect(rateLimiters.serviceControl).toBeDefined();
            expect(typeof rateLimiters.serviceControl).toBe('function');
        });

        test('should have wallet operations rate limiter configured', () => {
            expect(rateLimiters.walletOperations).toBeDefined();
            expect(typeof rateLimiters.walletOperations).toBe('function');
        });

        test('should have auth rate limiter configured', () => {
            expect(rateLimiters.auth).toBeDefined();
            expect(typeof rateLimiters.auth).toBe('function');
        });

        test('should have logs rate limiter configured', () => {
            expect(rateLimiters.logs).toBeDefined();
            expect(typeof rateLimiters.logs).toBe('function');
        });
    });
});