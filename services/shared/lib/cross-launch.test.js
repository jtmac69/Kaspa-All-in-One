const CrossLaunchNavigator = require('./cross-launch.js');
const fc = require('fast-check');

describe('CrossLaunchNavigator', () => {
  let navigator;

  beforeEach(() => {
    navigator = new CrossLaunchNavigator();
  });

  describe('Basic functionality', () => {
    test('should generate wizard URL without context', () => {
      const url = navigator.getWizardUrl();
      expect(url).toBe('http://localhost:3000');
    });

    test('should generate dashboard URL', () => {
      const url = navigator.getDashboardUrl();
      expect(url).toBe('http://localhost:8080');
    });

    test('should return null when parsing empty URL', () => {
      const context = navigator.parseContext('http://localhost:3000');
      expect(context).toBeNull();
    });

    test('should parse simple context correctly', () => {
      const url = 'http://localhost:3000?action=add&profile=mining';
      const context = navigator.parseContext(url);
      expect(context).toEqual({
        action: 'add',
        profile: 'mining'
      });
    });
  });

  describe('Helper methods', () => {
    test('should generate add profile URL', () => {
      const url = navigator.getAddProfileUrl('mining');
      expect(url).toContain('action=add');
      expect(url).toContain('profile=mining');
      expect(url).toContain('returnUrl=');
    });

    test('should generate modify profile URL', () => {
      const url = navigator.getModifyProfileUrl('core');
      expect(url).toContain('action=modify');
      expect(url).toContain('profile=core');
    });

    test('should generate remove profile URL', () => {
      const url = navigator.getRemoveProfileUrl('archive');
      expect(url).toContain('action=remove');
      expect(url).toContain('profile=archive');
    });

    test('should generate reconfigure URL', () => {
      const url = navigator.getReconfigureUrl();
      expect(url).toContain('action=modify');
      expect(url).toContain('returnUrl=');
    });
  });

  describe('Edge cases', () => {
    test('should handle invalid action in context', () => {
      const url = 'http://localhost:3000?action=invalid&profile=mining';
      const context = navigator.parseContext(url);
      expect(context).toEqual({
        profile: 'mining'
      });
    });

    test('should handle malformed URL gracefully', () => {
      const context = navigator.parseContext('not-a-url');
      expect(context).toBeNull();
    });

    test('should handle URL with encoded return URL', () => {
      const returnUrl = 'http://localhost:8080/dashboard';
      const encodedReturnUrl = encodeURIComponent(returnUrl);
      const url = `http://localhost:3000?action=add&returnUrl=${encodedReturnUrl}`;
      const context = navigator.parseContext(url);
      expect(context.returnUrl).toBe(returnUrl);
    });
  });

  describe('Property-based tests', () => {
    /**
     * Property 12: Cross-Launch Context Preservation
     * For any valid launch context, encoding then parsing should produce equivalent context
     * **Validates: Requirements 6.2, 6.6, 6.7**
     */
    test('Property 12: Cross-Launch Context Preservation - round-trip encoding/decoding', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary launch contexts
          fc.record({
            action: fc.constantFrom('add', 'modify', 'remove', 'view'),
            profile: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
            service: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
            returnUrl: fc.option(fc.webUrl())
          }, { requiredKeys: ['action'] }),
          (context) => {
            // Remove undefined values to match expected behavior
            const cleanContext = Object.fromEntries(
              Object.entries(context).filter(([_, value]) => value !== null && value !== undefined)
            );

            // Generate URL with context
            const url = navigator.getWizardUrl(cleanContext);
            
            // Parse context back from URL
            const parsedContext = navigator.parseContext(url);
            
            // Should get back equivalent context
            expect(parsedContext).toEqual(cleanContext);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: URL generation consistency
     * For any context, generated URLs should be valid and parseable
     */
    test('Property: URL generation consistency', () => {
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constantFrom('add', 'modify', 'remove', 'view'),
            profile: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
            service: fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)),
            returnUrl: fc.option(fc.webUrl())
          }, { requiredKeys: ['action'] }),
          (context) => {
            // Remove undefined values
            const cleanContext = Object.fromEntries(
              Object.entries(context).filter(([_, value]) => value !== null && value !== undefined)
            );

            // Generate URL
            const url = navigator.getWizardUrl(cleanContext);
            
            // URL should be valid
            expect(() => new URL(url)).not.toThrow();
            
            // URL should start with expected base
            expect(url).toMatch(/^http:\/\/localhost:3000/);
            
            // If context has properties, URL should have query parameters
            if (Object.keys(cleanContext).length > 0) {
              expect(url).toContain('?');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Context parsing robustness
     * For any URL with query parameters, parsing should not crash
     */
    test('Property: Context parsing robustness', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.record({
            action: fc.option(fc.string()),
            profile: fc.option(fc.string()),
            service: fc.option(fc.string()),
            returnUrl: fc.option(fc.string())
          }),
          (baseUrl, params) => {
            // Build URL with arbitrary parameters
            const url = new URL(baseUrl);
            Object.entries(params).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                url.searchParams.set(key, value);
              }
            });
            
            // Parsing should not throw
            expect(() => navigator.parseContext(url.toString())).not.toThrow();
            
            // Result should be either null or an object
            const result = navigator.parseContext(url.toString());
            expect(result === null || typeof result === 'object').toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Helper method consistency
     * Helper methods should generate URLs that parse back to expected contexts
     */
    test('Property: Helper method consistency', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          (profileName) => {
            // Test add profile URL
            const addUrl = navigator.getAddProfileUrl(profileName);
            const addContext = navigator.parseContext(addUrl);
            expect(addContext.action).toBe('add');
            expect(addContext.profile).toBe(profileName);
            expect(addContext.returnUrl).toBe(navigator.getDashboardUrl());

            // Test modify profile URL
            const modifyUrl = navigator.getModifyProfileUrl(profileName);
            const modifyContext = navigator.parseContext(modifyUrl);
            expect(modifyContext.action).toBe('modify');
            expect(modifyContext.profile).toBe(profileName);
            expect(modifyContext.returnUrl).toBe(navigator.getDashboardUrl());

            // Test remove profile URL
            const removeUrl = navigator.getRemoveProfileUrl(profileName);
            const removeContext = navigator.parseContext(removeUrl);
            expect(removeContext.action).toBe('remove');
            expect(removeContext.profile).toBe(profileName);
            expect(removeContext.returnUrl).toBe(navigator.getDashboardUrl());
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Custom host/port configuration
     * Navigator should work with custom host and port settings
     */
    test('Property: Custom host/port configuration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 65535 }),
          fc.integer({ min: 1000, max: 65535 }),
          fc.domain(),
          fc.domain(),
          (wizardPort, dashboardPort, wizardHost, dashboardHost) => {
            const customNavigator = new CrossLaunchNavigator({
              wizardPort,
              dashboardPort,
              wizardHost,
              dashboardHost
            });

            // URLs should use custom settings
            const wizardUrl = customNavigator.getWizardUrl();
            expect(wizardUrl).toBe(`http://${wizardHost}:${wizardPort}`);

            const dashboardUrl = customNavigator.getDashboardUrl();
            expect(dashboardUrl).toBe(`http://${dashboardHost}:${dashboardPort}`);

            // Context should still work with custom URLs
            const context = { action: 'add', profile: 'test' };
            const urlWithContext = customNavigator.getWizardUrl(context);
            const parsedContext = customNavigator.parseContext(urlWithContext);
            expect(parsedContext).toEqual(context);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});