const ErrorDisplay = require('./error-display.js');
const fc = require('fast-check');

describe('ErrorDisplay', () => {
  let errorDisplay;

  beforeEach(() => {
    errorDisplay = new ErrorDisplay();
  });

  describe('Unit Tests', () => {
    test('should create ErrorDisplay instance', () => {
      expect(errorDisplay).toBeInstanceOf(ErrorDisplay);
      expect(errorDisplay.getErrorCategories()).toBeDefined();
    });

    test('should handle known error types', () => {
      const knownTypes = ['NO_INSTALLATION', 'DOCKER_UNAVAILABLE', 'KASPA_NODE_UNAVAILABLE', 'SERVICE_NOT_FOUND', 'STATE_FILE_CORRUPT', 'API_ERROR'];
      
      knownTypes.forEach(type => {
        const result = errorDisplay.show({ type, details: { test: 'data' } });
        expect(result).toHaveProperty('userMessage');
        expect(result).toHaveProperty('recoveryAction');
        expect(result).toHaveProperty('consoleLogged', true);
        expect(result).toHaveProperty('errorType', type);
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
      });
    });

    test('should handle unknown error types gracefully', () => {
      const result = errorDisplay.show({ type: 'UNKNOWN_ERROR_TYPE', details: { test: 'data' } });
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('recoveryAction', 'retry');
      expect(result).toHaveProperty('consoleLogged', true);
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    test('should show service unavailable placeholder', () => {
      const result = errorDisplay.showServiceUnavailable('test-service');
      expect(result).toHaveProperty('userMessage', 'test-service: Service Unavailable');
      expect(result).toHaveProperty('placeholder');
      expect(result).toHaveProperty('serviceName', 'test-service');
      expect(result).toHaveProperty('consoleLogged', true);
      expect(result.placeholder).toContain('test-service');
      expect(result.placeholder).toContain('Service Unavailable');
    });

    test('should show Docker unavailable message', () => {
      const result = errorDisplay.showDockerUnavailable();
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('recoveryAction', 'retry_30s');
      expect(result).toHaveProperty('remediationSteps');
      expect(result).toHaveProperty('consoleLogged', true);
      expect(Array.isArray(result.remediationSteps)).toBe(true);
      expect(result.remediationSteps.length).toBeGreaterThan(0);
    });

    test('should show API error', () => {
      const testError = new Error('Test API error');
      const result = errorDisplay.showApiError('test-operation', testError);
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('recoveryAction');
      expect(result).toHaveProperty('consoleLogged', true);
      expect(result).toHaveProperty('errorType', 'API_ERROR');
    });

    test('should show state file error', () => {
      const testError = new Error('Test state file error');
      const result = errorDisplay.showStateFileError('corrupt', testError);
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('recoveryAction');
      expect(result).toHaveProperty('consoleLogged', true);
      expect(result).toHaveProperty('errorType', 'STATE_FILE_CORRUPT');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 15: Graceful Error Handling
     * For any error condition (service unavailable, Docker unavailable, API failure), 
     * the Dashboard SHALL display a user-friendly message, log detailed error to console, 
     * and continue operating without crashing.
     * 
     * **Feature: wizard-dashboard-unification, Property 15: Graceful Error Handling**
     * **Validates: Requirements 9.1, 9.4, 9.5, 9.6, 9.7**
     */
    test('Property 15: Graceful Error Handling - should handle any error condition gracefully without crashing', () => {
      // Generator for error types (both known and unknown)
      const errorTypeArb = fc.oneof(
        // Known error types
        fc.constantFrom('NO_INSTALLATION', 'DOCKER_UNAVAILABLE', 'KASPA_NODE_UNAVAILABLE', 'SERVICE_NOT_FOUND', 'STATE_FILE_CORRUPT', 'API_ERROR'),
        // Unknown error types (random strings)
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `UNKNOWN_${s.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`)
      );

      // Generator for error details (various data types and structures)
      const errorDetailsArb = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.record({
          message: fc.option(fc.string()),
          code: fc.option(fc.integer()),
          timestamp: fc.option(fc.string()),
          operation: fc.option(fc.string()),
          error: fc.option(fc.string()),
          stack: fc.option(fc.string())
        }),
        fc.array(fc.string()),
        fc.object()
      );

      // Generator for service names (including edge cases)
      const serviceNameArb = fc.oneof(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('', 'test-service', 'kaspa-node', 'dashboard', 'very-long-service-name-that-might-cause-issues'),
        fc.string().filter(s => s.includes(' ') || s.includes('-') || s.includes('_'))
      );

      // Generator for original errors (simulating various error objects)
      const originalErrorArb = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.record({
          message: fc.option(fc.string()),
          name: fc.option(fc.string()),
          stack: fc.option(fc.string()),
          code: fc.option(fc.string())
        }).map(obj => {
          const error = new Error(obj.message || 'Test error');
          if (obj.name) error.name = obj.name;
          if (obj.code) error.code = obj.code;
          return error;
        }),
        fc.string().map(msg => new Error(msg))
      );

      // Property test for show() method
      fc.assert(fc.property(errorTypeArb, errorDetailsArb, (errorType, errorDetails) => {
        let result;
        let threwError = false;
        
        try {
          result = errorDisplay.show({ type: errorType, details: errorDetails });
        } catch (error) {
          threwError = true;
        }
        
        // Should never crash (Requirement 9.5)
        expect(threwError).toBe(false);
        
        // Should always return a valid result object
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        
        // Should always have required properties (Requirement 9.1, 9.6)
        expect(result).toHaveProperty('userMessage');
        expect(result).toHaveProperty('recoveryAction');
        expect(result).toHaveProperty('consoleLogged', true);
        
        // User message should be user-friendly (Requirement 9.1)
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
        expect(result.userMessage).not.toMatch(/Error:|Exception:|Stack trace:/i); // Should not contain technical error terms
        
        // Recovery action should be provided (Requirement 9.6)
        expect(typeof result.recoveryAction).toBe('string');
        expect(result.recoveryAction.length).toBeGreaterThan(0);
        
        // Should log to console (Requirement 9.4)
        expect(result.consoleLogged).toBe(true);
      }), { numRuns: 100 });

      // Property test for showServiceUnavailable() method
      fc.assert(fc.property(serviceNameArb, (serviceName) => {
        let result;
        let threwError = false;
        
        try {
          result = errorDisplay.showServiceUnavailable(serviceName);
        } catch (error) {
          threwError = true;
        }
        
        // Should never crash (Requirement 9.5)
        expect(threwError).toBe(false);
        
        // Should always return a valid result object
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        
        // Should always have required properties (Requirement 9.6)
        expect(result).toHaveProperty('userMessage');
        expect(result).toHaveProperty('placeholder');
        expect(result).toHaveProperty('serviceName');
        expect(result).toHaveProperty('consoleLogged', true);
        
        // User message should be user-friendly (Requirement 9.1)
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
        expect(result.userMessage).toContain('Service Unavailable');
        
        // Placeholder should be provided (Requirement 9.6)
        expect(typeof result.placeholder).toBe('string');
        expect(result.placeholder.length).toBeGreaterThan(0);
        
        // Should preserve service name
        expect(result.serviceName).toBe(serviceName);
        
        // Should log to console (Requirement 9.4)
        expect(result.consoleLogged).toBe(true);
      }), { numRuns: 100 });

      // Property test for showApiError() method
      fc.assert(fc.property(fc.string(), originalErrorArb, (operation, originalError) => {
        let result;
        let threwError = false;
        
        try {
          result = errorDisplay.showApiError(operation, originalError);
        } catch (error) {
          threwError = true;
        }
        
        // Should never crash (Requirement 9.5)
        expect(threwError).toBe(false);
        
        // Should always return a valid result object
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        
        // Should always have required properties (Requirement 9.1)
        expect(result).toHaveProperty('userMessage');
        expect(result).toHaveProperty('recoveryAction');
        expect(result).toHaveProperty('consoleLogged', true);
        expect(result).toHaveProperty('errorType', 'API_ERROR');
        
        // User message should be user-friendly (Requirement 9.1)
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
        
        // Should log to console (Requirement 9.4)
        expect(result.consoleLogged).toBe(true);
      }), { numRuns: 100 });

      // Property test for showStateFileError() method
      fc.assert(fc.property(
        fc.constantFrom('not_found', 'corrupt', 'permission_denied', 'invalid_format'),
        originalErrorArb,
        (issue, originalError) => {
          let result;
          let threwError = false;
          
          try {
            result = errorDisplay.showStateFileError(issue, originalError);
          } catch (error) {
            threwError = true;
          }
          
          // Should never crash (Requirement 9.5)
          expect(threwError).toBe(false);
          
          // Should always return a valid result object
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
          
          // Should always have required properties (Requirement 9.1)
          expect(result).toHaveProperty('userMessage');
          expect(result).toHaveProperty('recoveryAction');
          expect(result).toHaveProperty('consoleLogged', true);
          expect(result).toHaveProperty('errorType');
          
          // User message should be user-friendly (Requirement 9.1)
          expect(typeof result.userMessage).toBe('string');
          expect(result.userMessage.length).toBeGreaterThan(0);
          
          // Should map issue types correctly
          if (issue === 'not_found') {
            expect(result.errorType).toBe('NO_INSTALLATION');
          } else {
            expect(result.errorType).toBe('STATE_FILE_CORRUPT');
          }
          
          // Should log to console (Requirement 9.4)
          expect(result.consoleLogged).toBe(true);
        }
      ), { numRuns: 100 });

      // Property test for showDockerUnavailable() method
      fc.assert(fc.property(fc.constant(null), () => {
        let result;
        let threwError = false;
        
        try {
          result = errorDisplay.showDockerUnavailable();
        } catch (error) {
          threwError = true;
        }
        
        // Should never crash (Requirement 9.5)
        expect(threwError).toBe(false);
        
        // Should always return a valid result object
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
        
        // Should always have required properties (Requirement 9.1, 9.6)
        expect(result).toHaveProperty('userMessage');
        expect(result).toHaveProperty('recoveryAction', 'retry_30s');
        expect(result).toHaveProperty('remediationSteps');
        expect(result).toHaveProperty('consoleLogged', true);
        
        // User message should be user-friendly (Requirement 9.1)
        expect(typeof result.userMessage).toBe('string');
        expect(result.userMessage.length).toBeGreaterThan(0);
        expect(result.userMessage).toContain('Docker');
        
        // Remediation steps should be provided (Requirement 9.6)
        expect(Array.isArray(result.remediationSteps)).toBe(true);
        expect(result.remediationSteps.length).toBeGreaterThan(0);
        result.remediationSteps.forEach(step => {
          expect(typeof step).toBe('string');
          expect(step.length).toBeGreaterThan(0);
        });
        
        // Should log to console (Requirement 9.4)
        expect(result.consoleLogged).toBe(true);
      }), { numRuns: 50 });
    });

    /**
     * Property test for error message consistency across different error patterns
     * Validates that similar error conditions produce consistent user-friendly messages
     */
    test('Property: Error message consistency - similar errors should produce consistent patterns', () => {
      // Test that all Docker-related errors contain "Docker" in the message
      const dockerErrorTypes = ['DOCKER_UNAVAILABLE'];
      dockerErrorTypes.forEach(errorType => {
        const result = errorDisplay.show({ type: errorType, details: {} });
        expect(result.userMessage.toLowerCase()).toContain('docker');
      });

      // Test that all node-related errors contain "Node" or "Kaspa" in the message
      const nodeErrorTypes = ['KASPA_NODE_UNAVAILABLE'];
      nodeErrorTypes.forEach(errorType => {
        const result = errorDisplay.show({ type: errorType, details: {} });
        expect(result.userMessage.toLowerCase()).toMatch(/node|kaspa/);
      });

      // Test that all service-related errors are handled consistently
      fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 50 }), (serviceName) => {
        const result = errorDisplay.showServiceUnavailable(serviceName);
        expect(result.userMessage).toContain('Service Unavailable');
        expect(result.placeholder).toContain(serviceName);
      }), { numRuns: 50 });
    });

    /**
     * Property test for console logging behavior
     * Validates that all error handling methods properly log to console (Requirement 9.4)
     */
    test('Property: Console logging consistency - all error methods should log to console', () => {
      // Mock console methods to verify logging
      const originalConsoleInfo = console.info;
      const originalConsoleWarn = console.warn;
      const originalConsoleError = console.error;
      const originalConsoleLog = console.log;
      
      let loggedMessages = [];
      
      console.info = jest.fn((...args) => loggedMessages.push({ level: 'info', args }));
      console.warn = jest.fn((...args) => loggedMessages.push({ level: 'warn', args }));
      console.error = jest.fn((...args) => loggedMessages.push({ level: 'error', args }));
      console.log = jest.fn((...args) => loggedMessages.push({ level: 'log', args }));

      try {
        fc.assert(fc.property(
          fc.oneof(
            fc.constantFrom('NO_INSTALLATION', 'DOCKER_UNAVAILABLE', 'KASPA_NODE_UNAVAILABLE', 'SERVICE_NOT_FOUND', 'STATE_FILE_CORRUPT', 'API_ERROR'),
            fc.string().map(s => `UNKNOWN_${s}`)
          ),
          fc.object(),
          (errorType, errorDetails) => {
            loggedMessages = []; // Reset for each test
            
            const result = errorDisplay.show({ type: errorType, details: errorDetails });
            
            // Should have logged something (Requirement 9.4)
            expect(loggedMessages.length).toBeGreaterThan(0);
            
            // Should indicate that logging occurred
            expect(result.consoleLogged).toBe(true);
            
            // Log message should contain ErrorDisplay identifier
            const hasErrorDisplayLog = loggedMessages.some(log => 
              log.args.some(arg => typeof arg === 'string' && arg.includes('ErrorDisplay'))
            );
            expect(hasErrorDisplayLog).toBe(true);
          }
        ), { numRuns: 50 });

        // Test service unavailable logging
        fc.assert(fc.property(fc.string({ minLength: 1 }), (serviceName) => {
          loggedMessages = []; // Reset for each test
          
          const result = errorDisplay.showServiceUnavailable(serviceName);
          
          // Should have logged something (Requirement 9.4)
          expect(loggedMessages.length).toBeGreaterThan(0);
          expect(result.consoleLogged).toBe(true);
        }), { numRuns: 30 });

        // Test Docker unavailable logging
        loggedMessages = [];
        const result = errorDisplay.showDockerUnavailable();
        expect(loggedMessages.length).toBeGreaterThan(0);
        expect(result.consoleLogged).toBe(true);

      } finally {
        // Restore original console methods
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
      }
    });
  });
});