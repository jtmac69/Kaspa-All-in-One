/**
 * ServiceValidator Tests
 * 
 * Tests for the 8-profile architecture with legacy profile support
 */

const ServiceValidator = require('../src/utils/service-validator');
const { PROFILE_ID_MIGRATION, LEGACY_PROFILE_IDS, NEW_PROFILE_IDS } = require('../src/utils/service-validator');

describe('ServiceValidator', () => {
  let validator;
  
  beforeEach(() => {
    validator = new ServiceValidator();
  });

  describe('Constants Export', () => {
    test('exports PROFILE_ID_MIGRATION', () => {
      expect(PROFILE_ID_MIGRATION).toBeDefined();
      expect(PROFILE_ID_MIGRATION['core']).toBe('kaspa-node');
    });

    test('exports LEGACY_PROFILE_IDS', () => {
      expect(LEGACY_PROFILE_IDS).toBeDefined();
      expect(LEGACY_PROFILE_IDS).toContain('core');
      expect(LEGACY_PROFILE_IDS.length).toBe(5);
    });

    test('exports NEW_PROFILE_IDS', () => {
      expect(NEW_PROFILE_IDS).toBeDefined();
      expect(NEW_PROFILE_IDS).toContain('kaspa-node');
      expect(NEW_PROFILE_IDS.length).toBe(8);
    });
  });

  describe('Profile Migration', () => {
    test('migrates core to kaspa-node', () => {
      expect(validator.migrateProfileId('core')).toBe('kaspa-node');
    });
    
    test('migrates kaspa-user-applications to array', () => {
      const result = validator.migrateProfileId('kaspa-user-applications');
      expect(result).toEqual(['kasia-app', 'k-social-app']);
    });

    test('migrates indexer-services to array', () => {
      const result = validator.migrateProfileId('indexer-services');
      expect(result).toEqual(['kasia-indexer', 'k-indexer-bundle']);
    });

    test('migrates archive-node to kaspa-archive-node', () => {
      expect(validator.migrateProfileId('archive-node')).toBe('kaspa-archive-node');
    });

    test('migrates mining to kaspa-stratum', () => {
      expect(validator.migrateProfileId('mining')).toBe('kaspa-stratum');
    });
    
    test('returns new profile ID unchanged', () => {
      expect(validator.migrateProfileId('kaspa-node')).toBe('kaspa-node');
      expect(validator.migrateProfileId('kasia-app')).toBe('kasia-app');
      expect(validator.migrateProfileId('kaspa-stratum')).toBe('kaspa-stratum');
    });
    
    test('migrateProfileIds flattens and deduplicates', () => {
      const result = validator.migrateProfileIds(['core', 'kaspa-user-applications']);
      expect(result).toContain('kaspa-node');
      expect(result).toContain('kasia-app');
      expect(result).toContain('k-social-app');
      expect(new Set(result).size).toBe(result.length);
    });

    test('migrateProfileIds handles mixed legacy and new IDs', () => {
      const result = validator.migrateProfileIds(['core', 'kasia-app']);
      expect(result).toContain('kaspa-node');
      expect(result).toContain('kasia-app');
      expect(result.length).toBe(2);
    });
  });

  describe('Legacy Profile Detection', () => {
    test('identifies legacy profile IDs', () => {
      expect(validator.isLegacyProfileId('core')).toBe(true);
      expect(validator.isLegacyProfileId('kaspa-user-applications')).toBe(true);
      expect(validator.isLegacyProfileId('indexer-services')).toBe(true);
      expect(validator.isLegacyProfileId('archive-node')).toBe(true);
      expect(validator.isLegacyProfileId('mining')).toBe(true);
    });

    test('identifies new profile IDs as not legacy', () => {
      expect(validator.isLegacyProfileId('kaspa-node')).toBe(false);
      expect(validator.isLegacyProfileId('kasia-app')).toBe(false);
      expect(validator.isLegacyProfileId('kaspa-stratum')).toBe(false);
    });
  });

  describe('Profile Validation', () => {
    test('validates new profile IDs', () => {
      const result = validator.validateProfileSelection(['kaspa-node', 'kasia-app']);
      expect(result.errors.length).toBe(0);
    });
    
    test('warns about legacy profile IDs', () => {
      const result = validator.validateProfileSelection(['core']);
      expect(result.warnings.some(w => w.type === 'legacy_profile_id')).toBe(true);
      expect(result.hasLegacyProfiles).toBe(true);
    });

    test('returns migrated profiles', () => {
      const result = validator.validateProfileSelection(['core', 'kaspa-user-applications']);
      expect(result.migratedProfiles).toContain('kaspa-node');
      expect(result.migratedProfiles).toContain('kasia-app');
      expect(result.migratedProfiles).toContain('k-social-app');
    });
    
    test('detects kaspa-node/kaspa-archive-node conflict', () => {
      const result = validator.validateProfileSelection(['kaspa-node', 'kaspa-archive-node']);
      expect(result.errors.some(e => e.type === 'profile_conflict')).toBe(true);
    });

    test('does not duplicate conflict errors', () => {
      const result = validator.validateProfileSelection(['kaspa-node', 'kaspa-archive-node']);
      const conflictErrors = result.errors.filter(e => e.type === 'profile_conflict');
      expect(conflictErrors.length).toBe(1);
    });
    
    test('errors when kaspa-stratum selected without node', () => {
      const result = validator.validateProfileSelection(['kaspa-stratum']);
      expect(result.errors.some(e => e.type === 'missing_dependency')).toBe(true);
    });
    
    test('passes when kaspa-stratum selected with kaspa-node', () => {
      const result = validator.validateProfileSelection(['kaspa-node', 'kaspa-stratum']);
      expect(result.errors.filter(e => e.type === 'missing_dependency').length).toBe(0);
    });

    test('passes when kaspa-stratum selected with kaspa-archive-node', () => {
      const result = validator.validateProfileSelection(['kaspa-archive-node', 'kaspa-stratum']);
      expect(result.errors.filter(e => e.type === 'missing_dependency').length).toBe(0);
    });

    test('errors on empty profile selection', () => {
      const result = validator.validateProfileSelection([]);
      expect(result.errors.some(e => e.type === 'no_profiles')).toBe(true);
    });

    test('errors on invalid profile', () => {
      const result = validator.validateProfileSelection(['invalid-profile']);
      expect(result.errors.some(e => e.type === 'invalid_profile')).toBe(true);
    });
  });

  describe('Soft Dependencies (Prerequisites)', () => {
    test('warns when kasia-indexer selected without node', () => {
      const result = validator.validateProfileSelection(['kasia-indexer']);
      expect(result.warnings.some(w => w.type === 'prerequisite_suggestion')).toBe(true);
    });

    test('warns when k-indexer-bundle selected without node', () => {
      const result = validator.validateProfileSelection(['k-indexer-bundle']);
      expect(result.warnings.some(w => w.type === 'prerequisite_suggestion')).toBe(true);
    });

    test('warns when kaspa-explorer-bundle selected without node', () => {
      const result = validator.validateProfileSelection(['kaspa-explorer-bundle']);
      expect(result.warnings.some(w => w.type === 'prerequisite_suggestion')).toBe(true);
    });

    test('no warning when indexer selected with node', () => {
      const result = validator.validateProfileSelection(['kaspa-node', 'kasia-indexer']);
      expect(result.warnings.filter(w => w.type === 'prerequisite_suggestion').length).toBe(0);
    });

    test('warns about apps without local services', () => {
      const result = validator.validateProfileSelection(['kasia-app']);
      expect(result.warnings.some(w => w.type === 'remote_dependency_info')).toBe(true);
    });
  });

  describe('Service Mapping', () => {
    test('k-social-app maps to k-social container', () => {
      const services = validator.getServicesForProfile('k-social-app');
      expect(services).toContain('k-social');
    });
    
    test('kaspa-explorer-bundle includes 3 services', () => {
      const services = validator.getServicesForProfile('kaspa-explorer-bundle');
      expect(services).toContain('kaspa-explorer');
      expect(services).toContain('simply-kaspa-indexer');
      expect(services).toContain('timescaledb-explorer');
      expect(services.length).toBe(3);
    });

    test('k-indexer-bundle includes 2 services', () => {
      const services = validator.getServicesForProfile('k-indexer-bundle');
      expect(services).toContain('k-indexer');
      expect(services).toContain('timescaledb-kindexer');
      expect(services.length).toBe(2);
    });
    
    test('legacy profile returns migrated services', () => {
      const services = validator.getServicesForProfile('core');
      expect(services).toContain('kaspa-node');
    });

    test('getAllServicesForProfiles returns unique services', () => {
      const services = validator.getAllServicesForProfiles(['kaspa-node', 'kasia-app']);
      expect(services).toContain('kaspa-node');
      expect(services).toContain('kasia-app');
      expect(new Set(services).size).toBe(services.length);
    });
  });

  describe('Service Presence Validation', () => {
    const validDockerCompose = `
version: '3.8'
services:
  kaspa-node:
    container_name: kaspa-node
    image: kaspa-node:latest
  kasia-app:
    container_name: kasia-app
    image: kasia-app:latest
`;

    test('validates present services', () => {
      const result = validator.validateServicePresence(validDockerCompose, ['kaspa-node', 'kasia-app']);
      expect(result.valid).toBe(true);
      expect(result.missingServices.length).toBe(0);
    });

    test('detects missing services', () => {
      const result = validator.validateServicePresence(validDockerCompose, ['kaspa-node', 'kaspa-stratum']);
      expect(result.missingServices.some(m => m.service === 'kaspa-stratum')).toBe(true);
    });

    test('returns expected services list', () => {
      const result = validator.validateServicePresence(validDockerCompose, ['kaspa-node']);
      expect(result.expectedServices).toContain('kaspa-node');
    });

    test('returns migrated profiles', () => {
      const result = validator.validateServicePresence(validDockerCompose, ['core']);
      expect(result.migratedProfiles).toContain('kaspa-node');
    });
  });

  describe('Profile-Service Relationship', () => {
    test('getProfilesRequiringService returns correct profiles', () => {
      const profiles = validator.getProfilesRequiringService('kaspa-node', ['kaspa-node', 'kasia-app']);
      expect(profiles).toContain('kaspa-node');
      expect(profiles).not.toContain('kasia-app');
    });

    test('getProfileForService returns correct profile', () => {
      expect(validator.getProfileForService('kaspa-node')).toBe('kaspa-node');
      expect(validator.getProfileForService('k-social')).toBe('k-social-app');
      expect(validator.getProfileForService('kaspa-explorer')).toBe('kaspa-explorer-bundle');
    });

    test('getProfileForService returns null for unknown service', () => {
      expect(validator.getProfileForService('unknown-service')).toBeNull();
    });
  });

  describe('Validation Summary', () => {
    const validDockerCompose = `
version: '3.8'
services:
  kaspa-node:
    container_name: kaspa-node
    image: kaspa-node:latest
`;

    test('returns healthy status for valid config', () => {
      const summary = validator.getValidationSummary(validDockerCompose, ['kaspa-node']);
      expect(summary.valid).toBe(true);
      expect(summary.status).toBe('healthy');
    });

    test('returns issues_detected for invalid config', () => {
      const summary = validator.getValidationSummary(validDockerCompose, ['kaspa-stratum']);
      expect(summary.valid).toBe(false);
      expect(summary.status).toBe('issues_detected');
    });

    test('includes migration info', () => {
      const summary = validator.getValidationSummary(validDockerCompose, ['core']);
      expect(summary.hasLegacyProfiles).toBe(true);
      expect(summary.migratedProfiles).toContain('kaspa-node');
    });
  });

  describe('Diagnostic Report', () => {
    const validDockerCompose = `
version: '3.8'
services:
  kaspa-node:
    container_name: kaspa-node
    image: kaspa-node:latest
`;

    test('generates report with timestamp', () => {
      const report = validator.generateDiagnosticReport(validDockerCompose, ['kaspa-node']);
      expect(report.timestamp).toBeDefined();
    });

    test('includes migrated profiles in configuration', () => {
      const report = validator.generateDiagnosticReport(validDockerCompose, ['core']);
      expect(report.configuration.migratedProfiles).toContain('kaspa-node');
    });

    test('generates quick fixes for conflicts', () => {
      const report = validator.generateDiagnosticReport(validDockerCompose, ['kaspa-node', 'kaspa-archive-node']);
      expect(report.quickFixes.some(f => f.type === 'profile_conflict_resolution')).toBe(true);
    });

    test('generates quick fixes for missing dependencies', () => {
      const report = validator.generateDiagnosticReport(validDockerCompose, ['kaspa-stratum']);
      expect(report.quickFixes.some(f => f.type === 'add_dependency')).toBe(true);
    });
  });

  describe('Specific Service Validation', () => {
    const dockerCompose = `
version: '3.8'
services:
  kaspa-node:
    container_name: kaspa-node
    image: kaspa-node:latest
  incomplete-service:
    image: some-image:latest
`;

    test('validates existing service', () => {
      const result = validator.validateSpecificService('kaspa-node', dockerCompose);
      expect(result.exists).toBe(true);
      expect(result.hasContainerName).toBe(true);
      expect(result.configured).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    test('detects missing service', () => {
      const result = validator.validateSpecificService('missing-service', dockerCompose);
      expect(result.exists).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('detects missing container name', () => {
      const result = validator.validateSpecificService('incomplete-service', dockerCompose);
      expect(result.exists).toBe(true);
      expect(result.hasContainerName).toBe(false);
      expect(result.issues.some(i => i.includes('Container name missing'))).toBe(true);
    });
  });
});
