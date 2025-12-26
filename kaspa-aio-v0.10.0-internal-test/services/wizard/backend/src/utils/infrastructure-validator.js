/**
 * Infrastructure Validator
 * 
 * Executes infrastructure test scripts (test-nginx.sh, test-timescaledb.sh)
 * and parses their output to provide comprehensive validation results.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.7
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

class InfrastructureValidator {
  constructor() {
    // Use PROJECT_ROOT env var if available (when running in container)
    // Otherwise calculate relative path (for local development)
    this.projectRoot = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../..');
    
    // Test script paths
    this.testScripts = {
      nginx: path.join(this.projectRoot, 'test-nginx.sh'),
      timescaledb: path.join(this.projectRoot, 'test-timescaledb.sh')
    };
  }

  /**
   * Execute infrastructure validation tests based on selected profiles
   * @param {string[]} profiles - Array of selected profile IDs
   * @returns {Promise<Object>} Infrastructure validation results
   */
  async validateInfrastructure(profiles) {
    const results = {
      nginx: {
        tested: false,
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
      },
      timescaledb: {
        tested: false,
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
      },
      overallStatus: 'healthy',
      timestamp: new Date().toISOString()
    };

    // Nginx is tested for all profiles (always present)
    try {
      results.nginx = await this.validateNginx();
    } catch (error) {
      results.nginx = {
        tested: true,
        totalTests: 0,
        passed: 0,
        failed: 1,
        warnings: 0,
        tests: [{
          category: 'execution',
          name: 'Test Script Execution',
          status: 'fail',
          message: `Failed to execute nginx tests: ${error.message}`
        }]
      };
    }

    // TimescaleDB is only tested if indexer-services or archive-node profile is selected
    const needsTimescaleDB = profiles.some(p => 
      ['indexer-services', 'archive-node'].includes(p)
    );

    if (needsTimescaleDB) {
      try {
        results.timescaledb = await this.validateTimescaleDB();
      } catch (error) {
        results.timescaledb = {
          tested: true,
          totalTests: 0,
          passed: 0,
          failed: 1,
          warnings: 0,
          tests: [{
            category: 'execution',
            name: 'Test Script Execution',
            status: 'fail',
            message: `Failed to execute TimescaleDB tests: ${error.message}`
          }]
        };
      }
    }

    // Determine overall status
    const totalFailed = results.nginx.failed + results.timescaledb.failed;
    const totalWarnings = results.nginx.warnings + results.timescaledb.warnings;

    if (totalFailed > 0) {
      results.overallStatus = 'unhealthy';
    } else if (totalWarnings > 0) {
      results.overallStatus = 'degraded';
    } else {
      results.overallStatus = 'healthy';
    }

    return results;
  }

  /**
   * Execute nginx infrastructure tests
   * @returns {Promise<Object>} Nginx test results
   */
  async validateNginx() {
    const result = {
      tested: true,
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };

    try {
      // Execute test-nginx.sh with --no-cleanup flag to avoid stopping services
      const { stdout, stderr } = await execAsync(
        `bash ${this.testScripts.nginx} --no-cleanup`,
        {
          cwd: this.projectRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 120000 // 2 minute timeout
        }
      );

      // Parse test output
      const parsed = this.parseTestOutput(stdout + stderr, 'nginx');
      Object.assign(result, parsed);

    } catch (error) {
      // Even if script exits with error, parse what we can from output
      if (error.stdout || error.stderr) {
        const parsed = this.parseTestOutput(error.stdout + error.stderr, 'nginx');
        Object.assign(result, parsed);
      } else {
        throw error;
      }
    }

    return result;
  }

  /**
   * Execute TimescaleDB infrastructure tests
   * @returns {Promise<Object>} TimescaleDB test results
   */
  async validateTimescaleDB() {
    const result = {
      tested: true,
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };

    try {
      // Execute test-timescaledb.sh with --no-cleanup flag
      const { stdout, stderr } = await execAsync(
        `bash ${this.testScripts.timescaledb} --no-cleanup`,
        {
          cwd: this.projectRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 120000 // 2 minute timeout
        }
      );

      // Parse test output
      const parsed = this.parseTestOutput(stdout + stderr, 'timescaledb');
      Object.assign(result, parsed);

    } catch (error) {
      // Even if script exits with error, parse what we can from output
      if (error.stdout || error.stderr) {
        const parsed = this.parseTestOutput(error.stdout + error.stderr, 'timescaledb');
        Object.assign(result, parsed);
      } else {
        throw error;
      }
    }

    return result;
  }

  /**
   * Parse test script output to extract test results
   * @param {string} output - Raw test script output
   * @param {string} type - Test type ('nginx' or 'timescaledb')
   * @returns {Object} Parsed test results
   */
  parseTestOutput(output, type) {
    const result = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };

    // Split output into lines
    const lines = output.split('\n');

    // Parse test results (looking for ✓, ✗, ⚠ symbols)
    for (const line of lines) {
      // Match test result lines
      const passMatch = line.match(/✓\s+([^:]+):\s+(.+)/);
      const failMatch = line.match(/✗\s+([^:]+):\s+(.+)/);
      const warnMatch = line.match(/⚠\s+([^:]+):\s+(.+)/);

      if (passMatch) {
        result.totalTests++;
        result.passed++;
        result.tests.push({
          category: this.categorizeTest(passMatch[1], type),
          name: passMatch[1].trim(),
          status: 'pass',
          message: passMatch[2].trim()
        });
      } else if (failMatch) {
        result.totalTests++;
        result.failed++;
        result.tests.push({
          category: this.categorizeTest(failMatch[1], type),
          name: failMatch[1].trim(),
          status: 'fail',
          message: failMatch[2].trim(),
          remediation: this.getRemediation(failMatch[1].trim(), type)
        });
      } else if (warnMatch) {
        result.totalTests++;
        result.warnings++;
        result.tests.push({
          category: this.categorizeTest(warnMatch[1], type),
          name: warnMatch[1].trim(),
          status: 'warn',
          message: warnMatch[2].trim()
        });
      }
    }

    // Parse summary if available
    const summaryMatch = output.match(/Total Tests:\s+(\d+)/);
    const passedMatch = output.match(/Passed:\s+(\d+)/);
    const failedMatch = output.match(/Failed:\s+(\d+)/);
    const warningsMatch = output.match(/Warnings:\s+(\d+)/);

    if (summaryMatch) result.totalTests = parseInt(summaryMatch[1], 10);
    if (passedMatch) result.passed = parseInt(passedMatch[1], 10);
    if (failedMatch) result.failed = parseInt(failedMatch[1], 10);
    if (warningsMatch) result.warnings = parseInt(warningsMatch[1], 10);

    return result;
  }

  /**
   * Categorize test by name and type
   * @param {string} testName - Name of the test
   * @param {string} type - Test type ('nginx' or 'timescaledb')
   * @returns {string} Test category
   */
  categorizeTest(testName, type) {
    const name = testName.toLowerCase();

    if (type === 'nginx') {
      if (name.includes('config') || name.includes('syntax')) {
        return 'configuration';
      } else if (name.includes('security') || name.includes('header') || name.includes('ssl') || name.includes('tls')) {
        return 'security';
      } else if (name.includes('rate') || name.includes('gzip') || name.includes('compression') || name.includes('resource')) {
        return 'performance';
      } else if (name.includes('routing') || name.includes('connectivity') || name.includes('upstream')) {
        return 'routing';
      } else {
        return 'general';
      }
    } else if (type === 'timescaledb') {
      if (name.includes('extension') || name.includes('database') || name.includes('initialization')) {
        return 'configuration';
      } else if (name.includes('hypertable') || name.includes('compression') || name.includes('aggregate') || name.includes('chunk')) {
        return 'database';
      } else if (name.includes('performance') || name.includes('query') || name.includes('resource')) {
        return 'performance';
      } else if (name.includes('backup') || name.includes('restore')) {
        return 'backup';
      } else {
        return 'general';
      }
    }

    return 'general';
  }

  /**
   * Get remediation steps for failed tests
   * @param {string} testName - Name of the failed test
   * @param {string} type - Test type ('nginx' or 'timescaledb')
   * @returns {string} Remediation steps
   */
  getRemediation(testName, type) {
    const name = testName.toLowerCase();

    if (type === 'nginx') {
      if (name.includes('config') || name.includes('syntax')) {
        return 'Check nginx configuration file for syntax errors. Run: docker exec kaspa-nginx nginx -t';
      } else if (name.includes('security header')) {
        return 'Add missing security headers to nginx configuration. See docs/infrastructure-testing.md for examples.';
      } else if (name.includes('ssl') || name.includes('tls')) {
        return 'Ensure SSL certificates are properly configured. Check certificate paths in nginx.conf.';
      } else if (name.includes('rate limiting')) {
        return 'Configure rate limiting in nginx.conf to prevent abuse. See nginx documentation for limit_req_zone.';
      } else if (name.includes('upstream')) {
        return 'Check that upstream services are running and accessible. Verify service names in docker-compose.yml.';
      } else if (name.includes('connectivity')) {
        return 'Ensure nginx container is running and ports are properly exposed. Check docker-compose.yml port mappings.';
      } else {
        return 'Review nginx logs for more details: docker logs kaspa-nginx';
      }
    } else if (type === 'timescaledb') {
      if (name.includes('extension')) {
        return 'Ensure TimescaleDB extension is installed. Run: docker exec timescaledb psql -U kaspa -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"';
      } else if (name.includes('database')) {
        return 'Check database initialization scripts in config/postgres/init/. Ensure databases are created properly.';
      } else if (name.includes('hypertable')) {
        return 'Verify hypertable creation in database initialization scripts. Check timescaledb_information.hypertables view.';
      } else if (name.includes('compression')) {
        return 'Enable compression policies for hypertables. See docs/timescaledb-integration.md for configuration.';
      } else if (name.includes('backup')) {
        return 'Ensure pg_dump is available and database is accessible. Check container permissions.';
      } else if (name.includes('connection')) {
        return 'Verify database connection parameters. Check POSTGRES_USER, POSTGRES_PASSWORD in .env file.';
      } else {
        return 'Review TimescaleDB logs for more details: docker logs timescaledb';
      }
    }

    return 'Review test output and logs for more information.';
  }

  /**
   * Retry failed infrastructure tests
   * @param {string[]} profiles - Array of selected profile IDs
   * @param {string[]} failedTests - Array of failed test names to retry
   * @returns {Promise<Object>} Retry results
   */
  async retryFailedTests(profiles, failedTests = []) {
    // For now, re-run all tests
    // In the future, could implement selective test execution
    return await this.validateInfrastructure(profiles);
  }

  /**
   * Get infrastructure validation summary
   * @param {Object} validationResults - Full validation results
   * @returns {Object} Summary of validation results
   */
  getValidationSummary(validationResults) {
    const totalTests = validationResults.nginx.totalTests + validationResults.timescaledb.totalTests;
    const totalPassed = validationResults.nginx.passed + validationResults.timescaledb.passed;
    const totalFailed = validationResults.nginx.failed + validationResults.timescaledb.failed;
    const totalWarnings = validationResults.nginx.warnings + validationResults.timescaledb.warnings;

    return {
      overallStatus: validationResults.overallStatus,
      totalTests,
      totalPassed,
      totalFailed,
      totalWarnings,
      passRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
      components: {
        nginx: {
          status: validationResults.nginx.failed === 0 ? 'healthy' : 'unhealthy',
          tested: validationResults.nginx.tested,
          passRate: validationResults.nginx.totalTests > 0 
            ? Math.round((validationResults.nginx.passed / validationResults.nginx.totalTests) * 100) 
            : 0
        },
        timescaledb: {
          status: validationResults.timescaledb.failed === 0 ? 'healthy' : 'unhealthy',
          tested: validationResults.timescaledb.tested,
          passRate: validationResults.timescaledb.totalTests > 0 
            ? Math.round((validationResults.timescaledb.passed / validationResults.timescaledb.totalTests) * 100) 
            : 0
        }
      },
      timestamp: validationResults.timestamp
    };
  }
}

module.exports = InfrastructureValidator;
