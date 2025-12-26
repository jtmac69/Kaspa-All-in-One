const ResourceMonitor = require('../ResourceMonitor');

describe('ResourceMonitor', () => {
  let resourceMonitor;

  beforeEach(() => {
    resourceMonitor = new ResourceMonitor();
  });

  describe('checkAlertThresholds', () => {
    it('should generate critical CPU alert', () => {
      const metrics = {
        cpu: 95,
        memory: 50,
        disk: 30,
        loadAverage: { '1min': 5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      const cpuAlert = alerts.find(alert => alert.type === 'cpu');
      
      expect(cpuAlert).toBeDefined();
      expect(cpuAlert.level).toBe('critical');
      expect(cpuAlert.action).toBe('emergency_stop_available');
    });

    it('should generate warning memory alert', () => {
      const metrics = {
        cpu: 50,
        memory: 87,
        disk: 30,
        loadAverage: { '1min': 5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      const memoryAlert = alerts.find(alert => alert.type === 'memory');
      
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert.level).toBe('warning');
    });

    it('should generate critical memory alert', () => {
      const metrics = {
        cpu: 50,
        memory: 92,
        disk: 30,
        loadAverage: { '1min': 5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      const memoryAlert = alerts.find(alert => alert.type === 'memory');
      
      expect(memoryAlert).toBeDefined();
      expect(memoryAlert.level).toBe('critical');
      expect(memoryAlert.action).toBe('emergency_stop_available');
    });

    it('should generate disk usage alerts', () => {
      const metrics = {
        cpu: 50,
        memory: 50,
        disk: 85,
        loadAverage: { '1min': 5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      const diskAlert = alerts.find(alert => alert.type === 'disk');
      
      expect(diskAlert).toBeDefined();
      expect(diskAlert.level).toBe('warning');
    });

    it('should generate load average alerts', () => {
      const metrics = {
        cpu: 50,
        memory: 50,
        disk: 30,
        loadAverage: { '1min': 12.5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      const loadAlert = alerts.find(alert => alert.type === 'load');
      
      expect(loadAlert).toBeDefined();
      expect(loadAlert.level).toBe('critical');
      expect(loadAlert.action).toBe('emergency_stop_available');
    });

    it('should not generate alerts for normal metrics', () => {
      const metrics = {
        cpu: 50,
        memory: 60,
        disk: 40,
        loadAverage: { '1min': 3.5 }
      };

      const alerts = resourceMonitor.checkAlertThresholds(metrics);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('calculateTrend', () => {
    it('should detect increasing trend', () => {
      const trend = resourceMonitor.calculateTrend(70, 85);
      expect(trend).toBe('increasing');
    });

    it('should detect decreasing trend', () => {
      const trend = resourceMonitor.calculateTrend(85, 70);
      expect(trend).toBe('decreasing');
    });

    it('should detect stable trend', () => {
      const trend = resourceMonitor.calculateTrend(75, 77);
      expect(trend).toBe('stable');
    });

    it('should handle zero old value', () => {
      const trend = resourceMonitor.calculateTrend(0, 50);
      expect(trend).toBe('increasing');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(resourceMonitor.formatBytes(0)).toBe('0 B');
      expect(resourceMonitor.formatBytes(1024)).toBe('1 KB');
      expect(resourceMonitor.formatBytes(1048576)).toBe('1 MB');
      expect(resourceMonitor.formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(resourceMonitor.formatBytes(1536)).toBe('1.5 KB');
      expect(resourceMonitor.formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('formatUptime', () => {
    it('should format uptime with days', () => {
      const seconds = 2 * 86400 + 5 * 3600 + 30 * 60; // 2 days, 5 hours, 30 minutes
      expect(resourceMonitor.formatUptime(seconds)).toBe('2d 5h 30m');
    });

    it('should format uptime with hours only', () => {
      const seconds = 3 * 3600 + 15 * 60; // 3 hours, 15 minutes
      expect(resourceMonitor.formatUptime(seconds)).toBe('3h 15m');
    });

    it('should format uptime with minutes only', () => {
      const seconds = 45 * 60; // 45 minutes
      expect(resourceMonitor.formatUptime(seconds)).toBe('45m');
    });

    it('should handle zero uptime', () => {
      expect(resourceMonitor.formatUptime(0)).toBe('0m');
    });
  });
});