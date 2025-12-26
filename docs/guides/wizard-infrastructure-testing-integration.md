# Wizard Infrastructure Testing Integration

## Overview

This document describes how the Web Installation Wizard integrates comprehensive infrastructure testing to validate nginx and TimescaleDB configurations beyond basic service health checks.

## Purpose

The infrastructure testing integration ensures that:

1. **Nginx is properly configured** - routing, security headers, rate limiting, SSL/TLS
2. **TimescaleDB is optimized** - hypertables, compression, continuous aggregates
3. **Users have confidence** - detailed validation results show everything works
4. **Issues are caught early** - problems are identified immediately after installation
5. **Troubleshooting is easier** - specific test failures guide remediation

## Architecture

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Wizard Frontend                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Validation Results Step                                │ │
│  │  - Service Health Checks                                │ │
│  │  - Infrastructure Test Results ← NEW                    │ │
│  │  - Categorized Test Display                             │ │
│  │  - Detailed Test Reports                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Wizard Backend (Node.js)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Validation Engine                                      │ │
│  │  - Service Health Checks                                │ │
│  │  - Infrastructure Test Executor ← NEW                   │ │
│  │  - Test Output Parser ← NEW                             │ │
│  │  - Result Aggregator ← NEW                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Execute Scripts
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Scripts                                    │
│  - test-nginx.sh (25+ tests)                                │
│  - test-timescaledb.sh (25+ tests)                          │
└─────────────────────────────────────────────────────────────┘
```

## Test Scripts

### test-nginx.sh

**Executed**: After nginx container starts (all profiles)

**Test Categories**:
- Configuration Tests (3 tests)
- Connectivity Tests (4 tests)
- Security Tests (7 tests)
- Feature Tests (4 tests)
- Infrastructure Tests (7 tests)

**Total**: 25+ comprehensive tests

**Example Output**:
```
[SUCCESS] ✓ Nginx Config Syntax: Configuration syntax is valid
[SUCCESS] ✓ HTTP Connectivity: HTTP port 80 is accessible
[SUCCESS] ✓ X-Frame-Options Header: X-Frame-Options header is present
[WARN] ⚠ Rate Limiting: Rate limiting may not be configured
[ERROR] ✗ SSL Certificates: SSL certificates not found
```

### test-timescaledb.sh

**Executed**: After TimescaleDB starts (explorer profile only)

**Test Categories**:
- Extension & Initialization (3 tests)
- TimescaleDB Features (7 tests)
- Data Operations (4 tests)
- Backup & Restore (3 tests)
- Monitoring & Performance (4 tests)
- Infrastructure (4 tests)

**Total**: 25+ comprehensive tests

**Example Output**:
```
[SUCCESS] ✓ TimescaleDB Extension: TimescaleDB extension is installed
[SUCCESS] ✓ K-Social Hypertables: K-Social hypertables are configured
[SUCCESS] ✓ Compression Policies: Compression is enabled
[WARN] ⚠ Continuous Aggregates: No continuous aggregates found
```

## Backend Implementation

### Test Script Executor

```typescript
// services/wizard/backend/src/validators/infrastructure-validator.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class InfrastructureValidator {
  private readonly TEST_TIMEOUT = 120000; // 2 minutes
  
  async executeTestScript(scriptPath: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(
        `bash ${scriptPath} --no-cleanup`,
        { timeout: this.TEST_TIMEOUT }
      );
      
      return stdout + stderr;
    } catch (error) {
      if (error.killed) {
        throw new Error(`Test script timed out after ${this.TEST_TIMEOUT}ms`);
      }
      throw error;
    }
  }
  
  async validateNginx(): Promise<TestResult> {
    const output = await this.executeTestScript('./test-nginx.sh');
    return this.parseTestOutput(output, 'nginx');
  }
  
  async validateTimescaleDB(): Promise<TestResult> {
    const output = await this.executeTestScript('./test-timescaledb.sh');
    return this.parseTestOutput(output, 'timescaledb');
  }
  
  async validateAll(profiles: string[]): Promise<InfrastructureValidationResult> {
    const results: InfrastructureValidationResult = {
      nginx: await this.validateNginx(),
      timescaledb: {
        tested: false,
        skipped: true,
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
      },
      overallStatus: 'healthy'
    };
    
    // Only test TimescaleDB for explorer profile
    if (profiles.includes('explorer')) {
      results.timescaledb = await this.validateTimescaleDB();
      results.timescaledb.tested = true;
      results.timescaledb.skipped = false;
    }
    
    // Calculate overall status
    results.overallStatus = this.calculateOverallStatus(results);
    
    return results;
  }
  
  private parseTestOutput(output: string, component: string): TestResult {
    const tests: Test[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse lines like: [SUCCESS] ✓ Test Name: Message
      const successMatch = line.match(/\[SUCCESS\]\s*✓\s*([^:]+):\s*(.+)/);
      const errorMatch = line.match(/\[ERROR\]\s*✗\s*([^:]+):\s*(.+)/);
      const warnMatch = line.match(/\[WARN\]\s*⚠\s*([^:]+):\s*(.+)/);
      
      if (successMatch) {
        tests.push({
          category: this.categorizeTest(successMatch[1]),
          name: successMatch[1].trim(),
          status: 'pass',
          message: successMatch[2].trim()
        });
      } else if (errorMatch) {
        tests.push({
          category: this.categorizeTest(errorMatch[1]),
          name: errorMatch[1].trim(),
          status: 'fail',
          message: errorMatch[2].trim()
        });
      } else if (warnMatch) {
        tests.push({
          category: this.categorizeTest(warnMatch[1]),
          name: warnMatch[1].trim(),
          status: 'warn',
          message: warnMatch[2].trim()
        });
      }
    }
    
    return {
      tested: true,
      totalTests: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length,
      warnings: tests.filter(t => t.status === 'warn').length,
      tests
    };
  }
  
  private categorizeTest(testName: string): string {
    // Categorize tests based on name patterns
    if (testName.includes('Config') || testName.includes('Configuration')) {
      return 'Configuration';
    } else if (testName.includes('Security') || testName.includes('Header') || testName.includes('SSL')) {
      return 'Security';
    } else if (testName.includes('Performance') || testName.includes('Response Time')) {
      return 'Performance';
    } else if (testName.includes('Database') || testName.includes('TimescaleDB') || testName.includes('Hypertable')) {
      return 'Database';
    } else if (testName.includes('Connectivity') || testName.includes('Routing')) {
      return 'Connectivity';
    } else {
      return 'Infrastructure';
    }
  }
  
  private calculateOverallStatus(results: InfrastructureValidationResult): 'healthy' | 'degraded' | 'unhealthy' {
    const totalFailed = results.nginx.failed + results.timescaledb.failed;
    const totalWarnings = results.nginx.warnings + results.timescaledb.warnings;
    
    if (totalFailed > 0) {
      return 'unhealthy';
    } else if (totalWarnings > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}
```

### API Endpoint

```typescript
// services/wizard/backend/src/routes/validation.ts

import { Router } from 'express';
import { InfrastructureValidator } from '../validators/infrastructure-validator';

const router = Router();
const validator = new InfrastructureValidator();

router.post('/api/wizard/validate/infrastructure', async (req, res) => {
  try {
    const { profiles } = req.body;
    
    if (!profiles || !Array.isArray(profiles)) {
      return res.status(400).json({ error: 'Invalid profiles parameter' });
    }
    
    const results = await validator.validateAll(profiles);
    
    res.json(results);
  } catch (error) {
    console.error('Infrastructure validation error:', error);
    res.status(500).json({ 
      error: 'Infrastructure validation failed',
      details: error.message 
    });
  }
});

export default router;
```

## Frontend Implementation

### Validation Results Component

```typescript
// services/wizard/frontend/src/components/steps/Validation.tsx

interface InfrastructureTestResultsProps {
  results: InfrastructureValidationResult;
}

function InfrastructureTestResults({ results }: InfrastructureTestResultsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const renderTestSuite = (name: string, suite: TestResult) => {
    if (!suite.tested) {
      return (
        <div className="test-suite skipped">
          <h3>{name} (Skipped)</h3>
          <p>Not applicable for selected profiles</p>
        </div>
      );
    }
    
    const categories = groupTestsByCategory(suite.tests);
    
    return (
      <div className="test-suite">
        <div className="test-suite-header">
          <h3>{name}</h3>
          <div className="test-counts">
            <span className="passed">{suite.passed} passed</span>
            {suite.failed > 0 && <span className="failed">{suite.failed} failed</span>}
            {suite.warnings > 0 && <span className="warnings">{suite.warnings} warnings</span>}
          </div>
        </div>
        
        {Object.entries(categories).map(([category, tests]) => (
          <div key={category} className="test-category">
            <div 
              className="category-header"
              onClick={() => toggleCategory(`${name}-${category}`)}
            >
              <span className="category-name">{category}</span>
              <span className="category-count">
                {tests.filter(t => t.status === 'pass').length}/{tests.length}
              </span>
              <span className="expand-icon">
                {expandedCategories.has(`${name}-${category}`) ? '▼' : '▶'}
              </span>
            </div>
            
            {expandedCategories.has(`${name}-${category}`) && (
              <div className="test-list">
                {tests.map((test, idx) => (
                  <div key={idx} className={`test-item ${test.status}`}>
                    <span className="test-icon">
                      {test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '⚠'}
                    </span>
                    <span className="test-name">{test.name}</span>
                    <span className="test-message">{test.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="infrastructure-test-results">
      <h2>Infrastructure Validation</h2>
      
      <div className="overall-status" data-status={results.overallStatus}>
        {results.overallStatus === 'healthy' && '✓ All infrastructure tests passed'}
        {results.overallStatus === 'degraded' && '⚠ Infrastructure has warnings'}
        {results.overallStatus === 'unhealthy' && '✗ Infrastructure has failures'}
      </div>
      
      {renderTestSuite('Nginx Configuration', results.nginx)}
      {renderTestSuite('TimescaleDB Configuration', results.timescaledb)}
    </div>
  );
}

function groupTestsByCategory(tests: Test[]): Record<string, Test[]> {
  return tests.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, Test[]>);
}
```

## User Experience

### Validation Flow

1. **Installation Completes** → Services are started
2. **Basic Health Checks** → Verify services are responding
3. **Infrastructure Testing** → Run comprehensive tests
4. **Results Display** → Show categorized test results
5. **User Actions** → View details, retry failed tests, or proceed

### Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Validation                                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ✓ Service Health Checks (5/5 services healthy)              │
│                                                               │
│ Infrastructure Validation                                    │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ✓ Nginx Configuration                    25/25 passed │  │
│ │                                                         │  │
│ │   ▶ Configuration Tests                        3/3    │  │
│ │   ▶ Security Tests                             7/7    │  │
│ │   ▶ Performance Tests                          4/4    │  │
│ │   ▼ Infrastructure Tests                       7/7    │  │
│ │       ✓ Nginx Config Syntax: Valid                    │  │
│ │       ✓ HTTP Connectivity: Port 80 accessible         │  │
│ │       ✓ Dashboard Upstream: Reachable                 │  │
│ │       ✓ Nginx Logs: No errors                         │  │
│ │       ✓ Resource Usage: CPU 2%, Memory 45MB           │  │
│ │       ✓ Nginx Reload: Successful                      │  │
│ │       ✓ Container Status: Running                     │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ✓ TimescaleDB Configuration              25/25 passed │  │
│ │                                                         │  │
│ │   ▶ Extension & Initialization                 3/3    │  │
│ │   ▶ Hypertables & Compression                  7/7    │  │
│ │   ▶ Data Operations                            4/4    │  │
│ │   ▶ Backup & Restore                           3/3    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│ [View Detailed Report] [Retry Failed Tests] [Continue]      │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

### For Users

1. **Confidence**: Know that everything is properly configured
2. **Transparency**: See exactly what was tested and results
3. **Troubleshooting**: Clear guidance when tests fail
4. **Learning**: Understand what makes a healthy installation

### For Developers

1. **Early Detection**: Catch configuration issues immediately
2. **Comprehensive**: 50+ tests cover all critical components
3. **Maintainable**: Test scripts are separate and reusable
4. **Extensible**: Easy to add more tests as needed

### For Support

1. **Diagnostics**: Detailed test results help identify issues
2. **Reproducible**: Same tests run consistently
3. **Documentation**: Test results serve as validation proof
4. **Automation**: Reduces manual verification steps

## Implementation Timeline

### Phase 1: Backend Integration (Week 1)
- Implement test script executor
- Create output parser
- Build result aggregator
- Add API endpoint

### Phase 2: Frontend Display (Week 2)
- Create validation results component
- Implement categorized test display
- Add expandable test details
- Style with Kaspa branding

### Phase 3: Testing & Refinement (Week 3)
- Test with all profiles
- Handle edge cases
- Optimize performance
- Add error handling

## Related Documentation

- [Infrastructure Testing](infrastructure-testing.md) - Test script documentation
- [Wizard Design](.kiro/specs/web-installation-wizard/design.md) - Overall wizard design
- [Wizard Tasks](.kiro/specs/web-installation-wizard/tasks.md) - Implementation tasks

## Future Enhancements

1. **Historical Results**: Store test results for comparison
2. **Performance Trends**: Track test execution time over versions
3. **Custom Tests**: Allow users to add custom validation tests
4. **Export Results**: Download test results as JSON/PDF
5. **Automated Remediation**: Auto-fix common issues
