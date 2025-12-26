const ConfigurationAnalyzer = require('../ConfigurationAnalyzer');

describe('ConfigurationAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ConfigurationAnalyzer();
  });

  describe('calculateSuggestionScore', () => {
    it('should calculate score for critical high-impact low-effort suggestion', () => {
      const suggestion = {
        priority: 'critical',
        impact: 'high',
        effort: 'low'
      };
      
      const score = analyzer.calculateSuggestionScore(suggestion);
      expect(score).toBe(150); // 100 + 30 + 20
    });

    it('should calculate score for low priority suggestion', () => {
      const suggestion = {
        priority: 'low',
        impact: 'low',
        effort: 'high'
      };
      
      const score = analyzer.calculateSuggestionScore(suggestion);
      expect(score).toBe(40); // 25 + 10 + 5
    });

    it('should handle missing priority/impact/effort', () => {
      const suggestion = {};
      const score = analyzer.calculateSuggestionScore(suggestion);
      expect(score).toBe(0);
    });
  });

  describe('addSuggestion', () => {
    it('should add suggestion with calculated score and category', () => {
      const suggestion = {
        id: 'test-suggestion',
        type: 'performance',
        title: 'Test Suggestion',
        description: 'Test description',
        impact: 'high',
        effort: 'low'
      };

      analyzer.addSuggestion(suggestion);
      
      expect(analyzer.suggestions).toHaveLength(1);
      expect(analyzer.suggestions[0].category).toBe('Performance');
      expect(analyzer.suggestions[0].score).toBeGreaterThan(0);
      expect(analyzer.suggestions[0].timestamp).toBeDefined();
    });

    it('should use suggestion type priority if not specified', () => {
      const suggestion = {
        id: 'test-suggestion',
        type: 'security',
        title: 'Test Security Suggestion'
      };

      analyzer.addSuggestion(suggestion);
      
      expect(analyzer.suggestions[0].priority).toBe('critical');
    });
  });

  describe('groupSuggestionsByCategory', () => {
    it('should group suggestions by category', () => {
      analyzer.addSuggestion({
        id: 'perf-1',
        type: 'performance',
        title: 'Performance Suggestion 1'
      });
      
      analyzer.addSuggestion({
        id: 'perf-2',
        type: 'performance',
        title: 'Performance Suggestion 2'
      });
      
      analyzer.addSuggestion({
        id: 'sec-1',
        type: 'security',
        title: 'Security Suggestion 1'
      });

      const grouped = analyzer.groupSuggestionsByCategory();
      
      expect(grouped['Performance']).toHaveLength(2);
      expect(grouped['Security']).toHaveLength(1);
    });

    it('should handle empty suggestions', () => {
      const grouped = analyzer.groupSuggestionsByCategory();
      expect(grouped).toEqual({});
    });
  });

  describe('getSuggestionsByCategory', () => {
    beforeEach(() => {
      analyzer.addSuggestion({
        id: 'perf-1',
        type: 'performance',
        title: 'Performance Suggestion'
      });
      
      analyzer.addSuggestion({
        id: 'sec-1',
        type: 'security',
        title: 'Security Suggestion'
      });
    });

    it('should return suggestions for specified category', () => {
      const perfSuggestions = analyzer.getSuggestionsByCategory('Performance');
      expect(perfSuggestions).toHaveLength(1);
      expect(perfSuggestions[0].title).toBe('Performance Suggestion');
    });

    it('should return empty array for non-existent category', () => {
      const suggestions = analyzer.getSuggestionsByCategory('NonExistent');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getSuggestionsByPriority', () => {
    beforeEach(() => {
      analyzer.addSuggestion({
        id: 'high-1',
        type: 'performance',
        priority: 'high',
        title: 'High Priority Suggestion'
      });
      
      analyzer.addSuggestion({
        id: 'low-1',
        type: 'optimization',
        priority: 'low',
        title: 'Low Priority Suggestion'
      });
    });

    it('should return suggestions for specified priority', () => {
      const highPriority = analyzer.getSuggestionsByPriority('high');
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].title).toBe('High Priority Suggestion');
    });

    it('should return empty array for non-existent priority', () => {
      const suggestions = analyzer.getSuggestionsByPriority('nonexistent');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('clearCache', () => {
    it('should clear analysis cache', () => {
      analyzer.analysisCache.set('test', { data: 'test', timestamp: Date.now() });
      expect(analyzer.analysisCache.size).toBe(1);
      
      analyzer.clearCache();
      expect(analyzer.analysisCache.size).toBe(0);
    });
  });

  describe('checkForDefaultPasswords', () => {
    it('should detect default passwords', () => {
      const envConfig = {
        'DB_PASSWORD': 'password',
        'ADMIN_PASS': 'admin',
        'SECRET_KEY': 'mysecret',
        'API_PASSWORD': '123456'
      };

      const defaultPasswords = analyzer.checkForDefaultPasswords(envConfig);
      expect(defaultPasswords).toContain('DB_PASSWORD');
      expect(defaultPasswords).toContain('ADMIN_PASS');
      expect(defaultPasswords).toContain('API_PASSWORD');
      expect(defaultPasswords).not.toContain('SECRET_KEY');
    });

    it('should handle empty config', () => {
      const defaultPasswords = analyzer.checkForDefaultPasswords({});
      expect(defaultPasswords).toHaveLength(0);
    });
  });
});