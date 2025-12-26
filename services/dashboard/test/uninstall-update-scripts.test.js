const path = require('path');

// Unmock fs for this test since we need to read actual script files
jest.unmock('fs');
const fs = require('fs');

// Unmock child_process for this test since we need to execute actual scripts
jest.unmock('child_process');
const { execSync } = require('child_process');

describe('Uninstall and Update Scripts', () => {
    const scriptsDir = path.join(__dirname, '..', 'scripts');
    const uninstallScript = path.join(scriptsDir, 'uninstall.sh');
    const updateScript = path.join(scriptsDir, 'update.sh');

    describe('Script Files', () => {
        test('uninstall script exists and is executable', () => {
            expect(fs.existsSync(uninstallScript)).toBe(true);
            
            const stats = fs.statSync(uninstallScript);
            expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check executable bits
        });

        test('update script exists and is executable', () => {
            expect(fs.existsSync(updateScript)).toBe(true);
            
            const stats = fs.statSync(updateScript);
            expect(stats.mode & parseInt('111', 8)).toBeTruthy(); // Check executable bits
        });
    });

    describe('Script Content Validation', () => {
        test('uninstall script has required functions', () => {
            const content = fs.readFileSync(uninstallScript, 'utf8');
            
            // Check for essential functions
            expect(content).toMatch(/check_root\(\)/);
            expect(content).toMatch(/confirm_uninstall\(\)/);
            expect(content).toMatch(/stop_service\(\)/);
            expect(content).toMatch(/remove_systemd_service\(\)/);
            expect(content).toMatch(/remove_dashboard_files\(\)/);
            expect(content).toMatch(/remove_dashboard_user\(\)/);
            expect(content).toMatch(/verify_removal\(\)/);
            
            // Check for safety features
            expect(content).toMatch(/FORCE_UNINSTALL/);
            expect(content).toMatch(/CREATE_BACKUP/);
            expect(content).toMatch(/--dry-run/);
        });

        test('update script has required functions', () => {
            const content = fs.readFileSync(updateScript, 'utf8');
            
            // Check for essential functions
            expect(content).toMatch(/check_root\(\)/);
            expect(content).toMatch(/check_prerequisites\(\)/);
            expect(content).toMatch(/create_backup\(\)/);
            expect(content).toMatch(/stop_dashboard\(\)/);
            expect(content).toMatch(/prepare_update\(\)/);
            expect(content).toMatch(/apply_update\(\)/);
            expect(content).toMatch(/update_dependencies\(\)/);
            expect(content).toMatch(/start_dashboard\(\)/);
            expect(content).toMatch(/verify_update\(\)/);
            expect(content).toMatch(/rollback_update\(\)/);
            
            // Check for configuration options
            expect(content).toMatch(/UPDATE_SOURCE/);
            expect(content).toMatch(/UPDATE_REPO/);
            expect(content).toMatch(/UPDATE_BRANCH/);
            expect(content).toMatch(/SKIP_BACKUP/);
        });
    });

    describe('Configuration Variables', () => {
        test('scripts use consistent configuration', () => {
            const uninstallContent = fs.readFileSync(uninstallScript, 'utf8');
            const updateContent = fs.readFileSync(updateScript, 'utf8');
            
            // Both should use same service name
            expect(uninstallContent).toMatch(/SERVICE_NAME="kaspa-dashboard"/);
            expect(updateContent).toMatch(/SERVICE_NAME="kaspa-dashboard"/);
            
            // Both should use same user
            expect(uninstallContent).toMatch(/DASHBOARD_USER="kaspa-dashboard"/);
            expect(updateContent).toMatch(/DASHBOARD_USER="kaspa-dashboard"/);
            
            // Both should use same home directory
            expect(uninstallContent).toMatch(/DASHBOARD_HOME="\/opt\/kaspa-dashboard"/);
            expect(updateContent).toMatch(/DASHBOARD_HOME="\/opt\/kaspa-dashboard"/);
        });
    });

    describe('Script Safety Features', () => {
        test('scripts require root privileges', () => {
            const uninstallContent = fs.readFileSync(uninstallScript, 'utf8');
            const updateContent = fs.readFileSync(updateScript, 'utf8');
            
            // Both scripts should check for root
            expect(uninstallContent).toMatch(/EUID.*-ne.*0/);
            expect(updateContent).toMatch(/EUID.*-ne.*0/);
            
            // Both should have error messages for non-root
            expect(uninstallContent).toMatch(/must be run as root/);
            expect(updateContent).toMatch(/must be run as root/);
        });

        test('update script has backup functionality', () => {
            const content = fs.readFileSync(updateScript, 'utf8');
            
            // Check backup creation
            expect(content).toMatch(/create_backup\(\)/);
            expect(content).toMatch(/BACKUP_DIR/);
            expect(content).toMatch(/tar.*gz/);
            
            // Check rollback functionality
            expect(content).toMatch(/rollback_update\(\)/);
            expect(content).toMatch(/BACKUP_FILE/);
        });
    });

    describe('Error Handling', () => {
        test('scripts handle unknown options', () => {
            const uninstallContent = fs.readFileSync(uninstallScript, 'utf8');
            const updateContent = fs.readFileSync(updateScript, 'utf8');
            
            // Both should handle unknown options
            expect(uninstallContent).toMatch(/Unknown option/);
            expect(updateContent).toMatch(/Unknown option/);
            
            // Both should suggest help
            expect(uninstallContent).toMatch(/Use --help/);
            expect(updateContent).toMatch(/Use --help/);
        });

        test('update script has prerequisite checks', () => {
            const content = fs.readFileSync(updateScript, 'utf8');
            
            // Should check for required tools
            expect(content).toMatch(/command -v git/);
            expect(content).toMatch(/command -v rsync/);
            expect(content).toMatch(/command -v npm/);
            
            // Should check if dashboard is installed
            expect(content).toMatch(/dashboard not found/);
            expect(content).toMatch(/service not found/);
        });
    });

    describe('Logging and Output', () => {
        test('scripts have consistent logging functions', () => {
            const uninstallContent = fs.readFileSync(uninstallScript, 'utf8');
            const updateContent = fs.readFileSync(updateScript, 'utf8');
            
            // Both should have logging functions
            const logFunctions = ['log_info', 'log_success', 'log_warning', 'log_error'];
            
            logFunctions.forEach(func => {
                expect(uninstallContent).toMatch(new RegExp(`${func}\\(\\)`));
                expect(updateContent).toMatch(new RegExp(`${func}\\(\\)`));
            });
            
            // Both should use colors
            expect(uninstallContent).toMatch(/RED=.*033/);
            expect(updateContent).toMatch(/RED=.*033/);
        });

        test('update script has comprehensive logging', () => {
            const content = fs.readFileSync(updateScript, 'utf8');
            
            // Should log to file
            expect(content).toMatch(/UPDATE_LOG/);
            expect(content).toMatch(/update\.log/);
            
            // Should have update history
            expect(content).toMatch(/update_history\.log/);
            expect(content).toMatch(/Updated from.*to/);
        });
    });
});