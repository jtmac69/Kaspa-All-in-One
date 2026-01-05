/**
 * Property-Based Test: CSS Variable Consistency
 * 
 * Validates Requirements 2.1, 2.4:
 * - Dashboard SHALL use the same CSS variables as the Wizard
 * - Shared_Design_System SHALL be implemented as a common CSS file that both services import
 * 
 * Property 5: CSS Variable Consistency
 * For any CSS variable defined in the shared design system, both the Wizard and Dashboard 
 * SHALL use the same value for that variable.
 */

const fs = require('fs').promises;
const path = require('path');
const fc = require('fast-check');

describe('CSS Variable Consistency Property Tests', () => {
  let sharedVariables = {};
  let wizardVariables = {};

  beforeAll(async () => {
    // Read shared CSS variables
    const sharedCssPath = path.join(__dirname, '../styles/variables.css');
    const sharedCss = await fs.readFile(sharedCssPath, 'utf8');
    sharedVariables = extractCssVariables(sharedCss);

    // Read wizard CSS variables
    const wizardCssPath = path.join(__dirname, '../../wizard/frontend/public/styles/core/variables.css');
    const wizardCss = await fs.readFile(wizardCssPath, 'utf8');
    wizardVariables = extractCssVariables(wizardCss);
  });

  /**
   * Extract CSS custom properties from CSS content
   * @param {string} cssContent - CSS file content
   * @returns {Object} Map of variable names to values
   */
  function extractCssVariables(cssContent) {
    const variables = {};
    
    // Match CSS custom properties: --variable-name: value;
    const variableRegex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
    let match;
    
    while ((match = variableRegex.exec(cssContent)) !== null) {
      const [, name, value] = match;
      // Normalize whitespace and remove comments
      const normalizedValue = value.trim().replace(/\/\*.*?\*\//g, '').trim();
      variables[name] = normalizedValue;
    }
    
    return variables;
  }

  /**
   * Property Test: CSS Variable Consistency
   * Feature: wizard-dashboard-unification, Property 5: CSS Variable Consistency
   */
  test('Property 5: For any CSS variable defined in shared design system, both Wizard and Dashboard use same value', () => {
    fc.assert(
      fc.property(
        // Generate test cases from actual shared variables
        fc.constantFrom(...Object.keys(sharedVariables)),
        (variableName) => {
          // Property: If variable exists in shared, it must exist in wizard with same value
          const sharedValue = sharedVariables[variableName];
          const wizardValue = wizardVariables[variableName];

          // Both should have the variable defined
          expect(wizardValue).toBeDefined();
          expect(wizardValue).not.toBeNull();

          // Values should be identical (after normalization)
          expect(normalizeValue(wizardValue)).toBe(normalizeValue(sharedValue));

          return true;
        }
      ),
      { 
        numRuns: Math.min(100, Object.keys(sharedVariables).length),
        verbose: true
      }
    );
  });

  /**
   * Property Test: No Extra Variables in Wizard
   * Ensures wizard doesn't have variables not defined in shared system
   */
  test('Property 5a: Wizard should not define variables not in shared system', () => {
    const wizardOnlyVariables = Object.keys(wizardVariables).filter(
      name => !sharedVariables.hasOwnProperty(name)
    );

    // If there are wizard-only variables, this indicates inconsistency
    expect(wizardOnlyVariables).toEqual([]);
  });

  /**
   * Property Test: All Shared Variables Present in Wizard
   * Ensures wizard has all variables from shared system
   */
  test('Property 5b: All shared variables must be present in wizard', () => {
    const missingInWizard = Object.keys(sharedVariables).filter(
      name => !wizardVariables.hasOwnProperty(name)
    );

    expect(missingInWizard).toEqual([]);
  });

  /**
   * Property Test: Variable Value Format Consistency
   * Ensures variable values follow consistent formatting patterns
   */
  test('Property 5c: Variable values follow consistent formatting', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(sharedVariables)),
        (variableName) => {
          const sharedValue = sharedVariables[variableName];
          const wizardValue = wizardVariables[variableName];

          // Both values should have consistent formatting
          // (no leading/trailing whitespace, consistent spacing)
          expect(sharedValue.trim()).toBe(sharedValue);
          expect(wizardValue.trim()).toBe(wizardValue);

          // Color values should follow consistent format
          if (isColorValue(sharedValue)) {
            expect(isColorValue(wizardValue)).toBe(true);
            expect(normalizeColorValue(sharedValue)).toBe(normalizeColorValue(wizardValue));
          }

          return true;
        }
      ),
      { 
        numRuns: Math.min(100, Object.keys(sharedVariables).length),
        verbose: true
      }
    );
  });

  /**
   * Unit Test: Critical Brand Colors Consistency
   * Validates specific Kaspa brand colors are identical
   */
  test('Critical Kaspa brand colors are identical between shared and wizard', () => {
    const criticalColors = [
      'kaspa-blue',
      'kaspa-dark', 
      'kaspa-light',
      'kaspa-purple',
      'success',
      'warning',
      'error'
    ];

    criticalColors.forEach(colorName => {
      expect(sharedVariables[colorName]).toBeDefined();
      expect(wizardVariables[colorName]).toBeDefined();
      expect(wizardVariables[colorName]).toBe(sharedVariables[colorName]);
    });
  });

  /**
   * Unit Test: Typography Variables Consistency
   * Validates font and text size variables are identical
   */
  test('Typography variables are identical between shared and wizard', () => {
    const typographyVars = Object.keys(sharedVariables).filter(name => 
      name.startsWith('font-') || name.startsWith('text-')
    );

    typographyVars.forEach(varName => {
      expect(wizardVariables[varName]).toBeDefined();
      expect(wizardVariables[varName]).toBe(sharedVariables[varName]);
    });
  });

  /**
   * Unit Test: Spacing System Consistency
   * Validates spacing variables are identical
   */
  test('Spacing system variables are identical between shared and wizard', () => {
    const spacingVars = Object.keys(sharedVariables).filter(name => 
      name.startsWith('space-')
    );

    spacingVars.forEach(varName => {
      expect(wizardVariables[varName]).toBeDefined();
      expect(wizardVariables[varName]).toBe(sharedVariables[varName]);
    });
  });

  // Helper functions
  function normalizeValue(value) {
    return value
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\/\*.*?\*\//g, '')  // Remove comments
      .trim();
  }

  function isColorValue(value) {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) || 
           /^rgb\(/.test(value) || 
           /^rgba\(/.test(value) ||
           /^hsl\(/.test(value) ||
           /^hsla\(/.test(value);
  }

  function normalizeColorValue(value) {
    // Convert hex colors to lowercase for comparison
    if (value.startsWith('#')) {
      return value.toLowerCase();
    }
    return value;
  }
});