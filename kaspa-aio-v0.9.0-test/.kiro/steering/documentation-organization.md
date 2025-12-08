# Documentation Organization Guidelines

## Purpose
This steering rule ensures all documentation files are created in the proper organized structure, keeping the repository root clean and documentation easy to find.

## File Placement Rules

### Essential Root Files ONLY
The following files should remain at the repository root:
- `README.md` - Project overview
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - License file
- `QUICK_START.md` - Quick start guide

**All other documentation must be placed in organized subdirectories.**

### Implementation Summaries
Place in `docs/implementation-summaries/{category}/`:

- **Wizard**: `docs/implementation-summaries/wizard/`
  - Files: `WIZARD_*.md`
  - Example: `../../docs/implementation-summaries/wizard/WIZARD_IMPLEMENTATION_COMPLETE.md`

- **Dashboard**: `docs/implementation-summaries/dashboard/`
  - Files: `DASHBOARD_*.md`
  - Example: `../../docs/implementation-summaries/dashboard/DASHBOARD_ENHANCEMENT_SUMMARY.md`

- **Testing**: `docs/implementation-summaries/testing/`
  - Files: `TESTING_*.md`, `*_TESTING_*.md`
  - Example: `../../docs/implementation-summaries/testing/TESTING_COVERAGE_AUDIT.md`, `../../docs/implementation-summaries/testing/INFRASTRUCTURE_TESTING_IMPLEMENTATION.md`

- **Rollback**: `docs/implementation-summaries/rollback/`
  - Files: `ROLLBACK_*.md`
  - Example: `../../docs/implementation-summaries/rollback/ROLLBACK_CLEANUP_SUMMARY.md`

- **Integrations**: `docs/implementation-summaries/integrations/`
  - Files: `*_INTEGRATION_*.md`, `K_SOCIAL_*.md`, `KASIA_*.md`, `SIMPLY_KASPA_*.md`, `KASPA_STRATUM_*.md`
  - Example: `../../docs/implementation-summaries/integrations/KASIA_INTEGRATION_SUMMARY.md`

- **Infrastructure**: `docs/implementation-summaries/infrastructure/`
  - Files: `TIMESCALEDB_*.md`, `REMOTE_NODE_*.md`
  - Example: `../../docs/implementation-summaries/infrastructure/TIMESCALEDB_INTEGRATION_UPDATE.md`

- **Tasks**: `docs/implementation-summaries/tasks/`
  - Files: `TASK_*.md` (individual task completion summaries)
  - Example: `../../docs/implementation-summaries/tasks/TASK_2.3_COMPLETION_SUMMARY.md`

### Work Session Logs
Place in `docs/work-logs/`:
- Files: `SESSION_SUMMARY_*.md`, `WORK_SUMMARY_*.md`
- Example: `../../docs/work-logs/SESSION_SUMMARY_2025-11-13.md`, `../../docs/work-logs/WORK_SUMMARY_2024-11-13.md`

### Quick Reference Guides
Place in `docs/quick-references/`:
- Files: `*_QUICK_REFERENCE.md`, `*_QUICK_START.md`
- Example: `../../docs/quick-references/TESTING_QUICK_REFERENCE.md`, `../../docs/quick-references/ROLLBACK_QUICK_START.md`
- **Note**: Quick reference pattern takes precedence over other patterns (e.g., `../../docs/quick-references/ROLLBACK_QUICK_START.md` goes to quick-references, not rollback)

### Spec-Related Task Files
Place in `.kiro/specs/{feature-name}/`:
- Files: `TEST_*_TASKS.md`, `tasks.md`
- Example: `.kiro/specs/kaspa-all-in-one-project/TEST_RELEASE_TASKS.md`

## When Creating New Documentation

### Before Creating a File
1. Determine the file's category based on its purpose
2. Use the appropriate naming pattern for that category
3. Place it in the correct subdirectory

### Naming Conventions
- Use UPPERCASE for major words in filenames
- Use underscores to separate words
- Include descriptive suffixes: `_SUMMARY`, `_COMPLETE`, `_IMPLEMENTATION`, etc.
- Always use `.md` extension

### Examples

**✅ Correct:**
```
docs/implementation-summaries/wizard/WIZARD_DARK_MODE_UPDATE.md
docs/work-logs/SESSION_SUMMARY_2025-11-21.md
docs/quick-references/INSTALLATION_QUICK_REFERENCE.md
.kiro/specs/web-installation-wizard/tasks.md
```

**❌ Incorrect:**
```
WIZARD_DARK_MODE_UPDATE.md (at root)
SESSION_SUMMARY_2025-11-21.md (at root)
INSTALLATION_QUICK_REFERENCE.md (at root)
TEST_RELEASE_TASKS.md (at root)
```

## When Updating Existing Documentation

If you need to reference or update existing documentation files:
1. Check if they're in the organized structure
2. If they're still at the root, note that they should be moved
3. Use the correct path when creating references

## Directory Structure Reference

```
kaspa-aio/
├── README.md                    # Essential
├── CONTRIBUTING.md              # Essential
├── LICENSE                      # Essential
├── QUICK_START.md              # Essential
├── .kiro/
│   └── specs/
│       └── {feature-name}/
│           ├── requirements.md
│           ├── design.md
│           ├── tasks.md
│           └── TEST_*_TASKS.md
└── docs/
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

## Enforcement

When asked to create documentation:
- **Always** check the file type and determine the correct location
- **Never** create documentation files at the repository root unless they are essential files
- **Always** create the necessary subdirectories if they don't exist
- **Suggest** moving files if you notice documentation at the root during your work

## Related Tools

The repository includes tools for organizing documentation:
- `scripts/doc-organizer/FileCategorizer.js` - Categorizes files by pattern
- `scripts/doc-organizer/FileMover.js` - Moves files to correct locations

These tools can be used to reorganize existing documentation that hasn't been placed correctly.
