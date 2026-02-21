const UpdateMonitor = require('../UpdateMonitor');
const axios = require('axios');
const fs = require('fs').promises;

jest.mock('axios');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('UpdateMonitor', () => {
  let updateMonitor;

  beforeEach(() => {
    updateMonitor = new UpdateMonitor();
    jest.clearAllMocks();
  });

  describe('cleanVersion', () => {
    it('should remove v prefix', () => {
      expect(updateMonitor.cleanVersion('v1.2.3')).toBe('1.2.3');
    });

    it('should remove version- prefix', () => {
      expect(updateMonitor.cleanVersion('version-1.2.3')).toBe('1.2.3');
    });

    it('should handle version without prefix', () => {
      expect(updateMonitor.cleanVersion('1.2.3')).toBe('1.2.3');
    });
  });

  describe('parseVersion', () => {
    it('should parse semantic version', () => {
      const version = updateMonitor.parseVersion('1.2.3');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
    });

    it('should handle version with pre-release', () => {
      const version = updateMonitor.parseVersion('2.0.0-beta.1');
      expect(version.major).toBe(2);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });

    it('should handle malformed version', () => {
      const version = updateMonitor.parseVersion('invalid');
      expect(version.major).toBe(0);
      expect(version.minor).toBe(0);
      expect(version.patch).toBe(0);
    });
  });

  describe('isNewer', () => {
    it('should detect newer major version', () => {
      expect(updateMonitor.isNewer('2.0.0', '1.9.9')).toBe(true);
    });

    it('should detect newer minor version', () => {
      expect(updateMonitor.isNewer('1.5.0', '1.4.9')).toBe(true);
    });

    it('should detect newer patch version', () => {
      expect(updateMonitor.isNewer('1.2.4', '1.2.3')).toBe(true);
    });

    it('should detect same version', () => {
      expect(updateMonitor.isNewer('1.2.3', '1.2.3')).toBe(false);
    });

    it('should detect older version', () => {
      expect(updateMonitor.isNewer('1.2.2', '1.2.3')).toBe(false);
    });

    it('should suppress update for unknown current version (avoid false positives on fresh installs)', () => {
      expect(updateMonitor.isNewer('1.2.3', 'unknown')).toBe(false);
    });

    it('should handle latest current version', () => {
      expect(updateMonitor.isNewer('1.2.3', 'latest')).toBe(true);
    });
  });

  describe('detectBreakingChanges', () => {
    it('should detect breaking changes in changelog', () => {
      const release = {
        changelog: 'This release contains breaking changes to the API'
      };
      expect(updateMonitor.detectBreakingChanges(release)).toBe(true);
    });

    it('should detect breaking keyword', () => {
      const release = {
        changelog: 'BREAKING: Updated authentication system'
      };
      expect(updateMonitor.detectBreakingChanges(release)).toBe(true);
    });

    it('should not detect breaking changes in normal changelog', () => {
      const release = {
        changelog: 'Fixed minor bugs and improved performance'
      };
      expect(updateMonitor.detectBreakingChanges(release)).toBe(false);
    });

    it('should handle empty changelog', () => {
      const release = { changelog: '' };
      expect(updateMonitor.detectBreakingChanges(release)).toBe(false);
    });
  });

  describe('calculateUpdatePriority', () => {
    it('should assign high priority to security updates', () => {
      const release = {
        changelog: 'Security vulnerability fix for CVE-2023-1234'
      };
      const priority = updateMonitor.calculateUpdatePriority(release);
      expect(priority).toBe('high');
    });

    it('should assign critical priority to security + breaking changes', () => {
      const release = {
        changelog: 'BREAKING: Security fix that changes API'
      };
      const priority = updateMonitor.calculateUpdatePriority(release);
      expect(priority).toBe('critical');
    });

    it('should assign medium priority for regular updates (minimum floor)', () => {
      const release = {
        changelog: 'Regular update with improvements'
      };
      const priority = updateMonitor.calculateUpdatePriority(release);
      expect(priority).toBe('medium');
    });
  });

  describe('truncateChangelog', () => {
    it('should truncate long changelog', () => {
      const longChangelog = 'a'.repeat(300);
      const truncated = updateMonitor.truncateChangelog(longChangelog, 200);
      expect(truncated.length).toBe(203); // 200 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short changelog', () => {
      const shortChangelog = 'Short changelog';
      const truncated = updateMonitor.truncateChangelog(shortChangelog, 200);
      expect(truncated).toBe(shortChangelog);
    });
  });

  describe('getPriorityBadge', () => {
    it('should return correct badge for each priority', () => {
      expect(updateMonitor.getPriorityBadge('critical')).toBe('🚨 Critical');
      expect(updateMonitor.getPriorityBadge('high')).toBe('🔴 High');
      expect(updateMonitor.getPriorityBadge('medium')).toBe('🟡 Medium');
      expect(updateMonitor.getPriorityBadge('low')).toBe('🟢 Low');
      expect(updateMonitor.getPriorityBadge('unknown')).toBe('⚪ Unknown');
    });
  });
});