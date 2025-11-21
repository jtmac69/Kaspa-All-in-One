# Documentation Organizer

A comprehensive tool for organizing documentation files in the Kaspa All-in-One repository. This tool automatically categorizes, moves, and maintains references to documentation files, keeping the repository root clean and documentation easy to find.

## Features

- **Automatic Categorization**: Categorizes files based on naming patterns
- **Safe File Moving**: Creates backups before moving files
- **Reference Updates**: Automatically updates all references to moved files
- **Index Generation**: Creates a master documentation index
- **Error Handling**: Comprehensive error handling with detailed reports
- **Rollback Support**: Can restore files from backup if needed
- **Dry Run Mode**: Preview changes without modifying files

## Components

### FileCategorizer
Analyzes documentation files and determines their appropriate category based on filename patterns.

**Categories:**
- Essential Root Files (README.md, CONTRIBUTING.md, etc.)
- Spec Task Files (TEST_*_TASKS.md)
- Implementation Summaries (wizard, dashboard, testing, rollback, integrations, infrastructure, tasks)
- Work Session Logs (SESSION_SUMMARY_*, WORK_SUMMARY_*)
- Quick Reference Guides (*_QUICK_REFERENCE.md, *_QUICK_START.md)

### FileMover
Handles moving files to their new locations with backup creation and verification.

### ReferenceUpdater
Scans markdown files for references to moved files and updates paths automatically.

### IndexGenerator
Creates a comprehensive documentation index organized by category.

### RollbackManager
Provides rollback capability to restore files from backup.

## Usage

### Running the Reorganization

```bash
# Preview changes without modifying files
node scripts/doc-organizer/reorganize.js --dry-run

# Run with detailed output
node scripts/doc-organizer/reorganize.js --verbose

# Run the reorganization
node scripts/doc-organizer/reorganize.js
```

### Options

- `--dry-run`: Preview changes without modifying files
- `--verbose`, `-v`: Show detailed output
- `--no-backup`: Skip creating backups (not recommended)
- `--help`, `-h`: Show help message

### Rollback

If you need to undo the reorganization:

```bash
# List available backups
node scripts/doc-organizer/rollback.js --list

# Rollback to the latest backup
node scripts/doc-organizer/rollback.js --latest

# Rollback to a specific backup
node scripts/doc-organizer/rollback.js --backup .backup/reorganize-2024-11-21
```

## Directory Structure

After reorganization, the repository will have this structure:

```
kaspa-aio/
├── README.md                    # Essential files stay at root
├── CONTRIBUTING.md
├── LICENSE
├── QUICK_START.md
├── .backup/                     # Backups and logs
│   ├── reorganize-*/            # Backup directories
│   └── reorganize-log-*.json    # Transaction logs
└── docs/
    ├── DOCUMENTATION_INDEX.md   # Master index
    ├── implementation-summaries/
    │   ├── wizard/
    │   ├── dashboard/
    │   ├── testing/
    │   ├── rollback/
    │   ├── integrations/
    │   ├── infrastructure/
    │   └── tasks/
    ├── work-logs/
    └── quick-references/
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test file
node --test FileCategorizer.test.js
node --test FileMover.test.js
node --test ReferenceUpdater.test.js
node --test IndexGenerator.test.js
node --test reorganize.test.js
```

## How It Works

1. **Backup**: Creates a timestamped backup of all markdown files
2. **Scan**: Finds all markdown files in the root directory
3. **Categorize**: Determines the appropriate category for each file
4. **Move**: Moves files to their new locations
5. **Update References**: Scans all markdown files and updates references to moved files
6. **Generate Index**: Creates a master documentation index
7. **Log**: Creates a detailed transaction log

## Error Handling

If errors occur during reorganization:

1. An error report is generated in `.backup/error-report-*.md`
2. The transaction log contains details of all operations
3. You can rollback using the backup created before reorganization

## Categorization Rules

Files are categorized based on these patterns (in order of precedence):

1. **Essential Root**: README.md, CONTRIBUTING.md, LICENSE, QUICK_START.md
2. **Spec Tasks**: TEST_*_TASKS.md
3. **Quick References**: *_QUICK_REFERENCE.md, *_QUICK_START.md (highest priority)
4. **Work Logs**: SESSION_SUMMARY_*, WORK_SUMMARY_*
5. **Wizard**: WIZARD_*.md
6. **Dashboard**: DASHBOARD_*.md
7. **Testing**: TESTING_*, *_TESTING_*
8. **Rollback**: ROLLBACK_*.md
9. **Infrastructure**: TIMESCALEDB_*, REMOTE_NODE_*
10. **Integrations**: K_SOCIAL_*, KASIA_*, SIMPLY_KASPA_*, KASPA_STRATUM_*, *_INTEGRATION_*
11. **Tasks**: TASK_*.md

## Requirements

- Node.js >= 18.0.0
- fast-check (for property-based testing)

## Development

The tool uses property-based testing to ensure correctness:

- **Property 1**: File categorization consistency
- **Property 2**: Task file to spec mapping
- **Property 3**: Reference update completeness
- **Property 4**: Implementation summary categorization
- **Property 5**: Work log file placement
- **Property 6**: Quick reference file placement
- **Property 7**: Index completeness
- **Property 8**: Reference preservation

## License

Part of the Kaspa All-in-One project.
