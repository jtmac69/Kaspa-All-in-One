# Test Release Package Checklist

## Overview

This document provides a comprehensive checklist for creating the Kaspa All-in-One test release package (v0.9.0-test). Follow this checklist to ensure all necessary files are included and sensitive data is excluded.

**Target Version**: v0.9.0-test  
**Package Name**: `kaspa-aio-v0.9.0-test.tar.gz`  
**Release Type**: Pre-release (for testing only)

---

## Files to Include in Package

### ✅ Root Level Scripts (Essential)

These are the primary entry points for testers:

- [ ] `start-test.sh` - Main entry point for starting the wizard
- [ ] `restart-services.sh` - Restart all Docker services
- [ ] `stop-services.sh` - Stop services without removing data
- [ ] `fresh-start.sh` - Remove containers and start fresh
- [ ] `status.sh` - Display service status
- [ ] `cleanup-test.sh` - Complete cleanup script
- [ ] `install.sh` - Original installation script (for reference)

### ✅ Root Level Documentation (Essential)

- [ ] `README.md` - Updated with test release banner
- [ ] `TESTING.md` - Complete testing instructions and scenarios
- [ ] `KNOWN_ISSUES.md` - Known bugs and limitations
- [ ] `CONTRIBUTING.md` - Contribution guidelines
- [ ] `LICENSE` - Project license
- [ ] `QUICK_START.md` - Quick start guide

### ✅ Docker Configuration Files

- [ ] `docker-compose.yml` - Main Docker Compose configuration
- [ ] `docker-compose.test.yml` - Test environment configuration
- [ ] `.env.example` - Example environment variables (template)
- [ ] `.gitignore` - Git ignore rules

### ✅ GitHub Templates

- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` - Bug report template
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` - Feature request template
- [ ] `.github/workflows/` - CI/CD workflows (if any)

### ✅ Configuration Directory (`config/`)

- [ ] `config/nginx.conf` - Nginx configuration
- [ ] `config/postgres/init/` - PostgreSQL initialization scripts
  - [ ] `01-create-databases.sql`
  - [ ] `02-k-social-timescaledb.sql`
  - [ ] `03-simply-kaspa-timescaledb.sql`
- [ ] `config/postgres/archive-init/` - Archive database scripts
  - [ ] `01-create-archive-database.sql`
- [ ] `config/ssl/` - SSL directory (empty, for user certificates)

### ✅ Services Directory (`services/`)

#### Dashboard Service
- [ ] `services/dashboard/Dockerfile`
- [ ] `services/dashboard/package.json`
- [ ] `services/dashboard/server.js`
- [ ] `services/dashboard/public/` - All frontend files
  - [ ] `index.html`
  - [ ] `script.js`
  - [ ] `styles.css`
  - [ ] `scripts/` - All dashboard scripts

#### Wizard Service
- [ ] `services/wizard/Dockerfile`
- [ ] `services/wizard/README.md`
- [ ] `services/wizard/INTEGRATION.md`
- [ ] `services/wizard/QUICKSTART.md`
- [ ] `services/wizard/TESTING.md`
- [ ] `services/wizard/backend/` - Complete backend
  - [ ] `package.json`
  - [ ] `package-lock.json`
  - [ ] `src/` - All source files
  - [ ] All test files (`test-*.js`)
- [ ] `services/wizard/frontend/` - Complete frontend
  - [ ] `public/` - All public assets
  - [ ] All HTML, CSS, JS files

#### K-Indexer Service
- [ ] `services/k-indexer/Dockerfile`
- [ ] `services/k-indexer/README.md`
- [ ] `services/k-indexer/build.sh`
- [ ] `services/k-indexer/*.toml` - All configuration files
- [ ] `services/k-indexer/wait-for-db.sh`

#### K-Social Service
- [ ] `services/k-social/Dockerfile`
- [ ] `services/k-social/README.md`
- [ ] `services/k-social/build.sh`
- [ ] `services/k-social/nginx.conf`

#### Kasia Service
- [ ] `services/kasia/Dockerfile`
- [ ] `services/kasia/README.md`
- [ ] `services/kasia/build.sh`
- [ ] `services/kasia/INTEGRATION_SUMMARY.md`

#### Kasia Indexer Service
- [ ] `services/kasia-indexer/README.md`

#### Kaspa Stratum Service
- [ ] `services/kaspa-stratum/Dockerfile`
- [ ] `services/kaspa-stratum/README.md`
- [ ] `services/kaspa-stratum/build.sh`

#### Simply Kaspa Indexer Service
- [ ] `services/simply-kaspa-indexer/Dockerfile`
- [ ] `services/simply-kaspa-indexer/README.md`
- [ ] `services/simply-kaspa-indexer/QUICK_START.md`
- [ ] `services/simply-kaspa-indexer/build.sh`
- [ ] `services/simply-kaspa-indexer/*.toml` - All configuration files
- [ ] `services/simply-kaspa-indexer/wait-for-db.sh`

### ✅ Scripts Directory (`scripts/`)

- [ ] `scripts/health-check.sh` - Health check script
- [ ] `scripts/manage.sh` - Management script
- [ ] `scripts/verify-system.sh` - System verification
- [ ] `scripts/wizard.sh` - Wizard launcher
- [ ] `scripts/doc-organizer/` - Documentation organization tools (optional)

### ✅ Documentation Directory (`docs/`)

#### Essential Documentation
- [ ] `docs/BUILD_MODES.md`
- [ ] `docs/DOCUMENTATION_INDEX.md`
- [ ] `docs/TESTER_TROUBLESHOOTING.md`
- [ ] `docs/component-matrix.md`
- [ ] `docs/deployment-profiles.md`
- [ ] `docs/faq.md`
- [ ] `docs/infrastructure-testing.md`
- [ ] `docs/installation-testing.md`
- [ ] `docs/maintenance.md`
- [ ] `docs/public-node-setup.md`
- [ ] `docs/quick-reference.md`
- [ ] `docs/service-dependencies.md`
- [ ] `docs/timescaledb-integration.md`
- [ ] `docs/troubleshooting.md`
- [ ] `docs/wizard-integration.md`
- [ ] `docs/wizard-quick-reference.md`
- [ ] `docs/wizard-testing-guide.md`
- [ ] `docs/wizard-user-guide.md`

#### Quick References
- [ ] `docs/quick-references/` - All quick reference guides

#### Implementation Summaries (Optional for testers)
- [ ] `docs/implementation-summaries/` - Development history (optional)

#### Future Enhancements (Optional)
- [ ] `docs/future-enhancements/` - Future plans (optional)

#### PR Proposals (Optional)
- [ ] `docs/pr-proposals/` - Upstream PR documentation (optional)

---

## Files to EXCLUDE from Package

### ❌ Environment and Secrets

- [ ] `.env` - Local environment variables (NEVER include)
- [ ] `.env.local` - Local overrides
- [ ] `.env.production` - Production settings
- [ ] `.env.staging` - Staging settings
- [ ] `.env.backup.*` - All backup files
- [ ] `services/.env` - Service-specific env files
- [ ] `services/.env.backup.*` - Service env backups

### ❌ Dependencies and Build Artifacts

- [ ] `node_modules/` - All Node.js dependencies (will be installed by users)
- [ ] `services/wizard/backend/node_modules/`
- [ ] `dist/` - Build output
- [ ] `build/` - Build output
- [ ] `out/` - Build output
- [ ] `target/` - Rust build artifacts
- [ ] `vendor/` - Go vendor directory
- [ ] `*.tgz` - NPM packages
- [ ] `*.tar.gz` - Archive files

### ❌ Logs and Runtime Data

- [ ] `logs/` - All log directories
- [ ] `*.log` - All log files
- [ ] `npm-debug.log*`
- [ ] `yarn-debug.log*`
- [ ] `/tmp/kaspa-wizard.log`
- [ ] `/tmp/kaspa-wizard.pid`
- [ ] `*.pid` - Process ID files
- [ ] `*.seed` - Seed files

### ❌ Data and Volumes

- [ ] `data/` - Runtime data
- [ ] `volumes/` - Docker volumes
- [ ] `.kaspa-aio/` - User data directory
- [ ] `.kaspa-backups/` - Backup directory
- [ ] `*.db` - Database files
- [ ] `*.sqlite` - SQLite databases

### ❌ Test Artifacts

- [ ] `test-results/` - Test output
- [ ] `screenshots/` - Test screenshots
- [ ] `videos/` - Test videos
- [ ] `coverage/` - Code coverage
- [ ] `.nyc_output` - Coverage data
- [ ] `test-checklist-page.html` - Test files

### ❌ IDE and Editor Files

- [ ] `.vscode/` - VS Code settings
- [ ] `.idea/` - IntelliJ settings
- [ ] `*.swp` - Vim swap files
- [ ] `*.swo` - Vim swap files
- [ ] `*~` - Editor backup files
- [ ] `.DS_Store` - macOS files
- [ ] `Thumbs.db` - Windows files

### ❌ Git and Version Control

- [ ] `.git/` - Git repository (use git archive instead)
- [ ] `.gitattributes` - Git attributes (optional)

### ❌ SSL Certificates

- [ ] `config/ssl/*.pem` - Private keys
- [ ] `config/ssl/*.key` - Private keys
- [ ] `config/ssl/*.crt` - Certificates

### ❌ Local Configuration Overrides

- [ ] `docker-compose.local.yml` - Local overrides
- [ ] `config/local.conf` - Local config
- [ ] `config/*.local.*` - Local overrides

### ❌ Cache and Temporary Files

- [ ] `.cache/` - Cache directories
- [ ] `.parcel-cache/` - Parcel cache
- [ ] `.npm` - NPM cache
- [ ] `.eslintcache` - ESLint cache
- [ ] `tmp/` - Temporary files
- [ ] `temp/` - Temporary files
- [ ] `*.tmp` - Temporary files
- [ ] `*.bak` - Backup files
- [ ] `*.backup` - Backup files

### ❌ Python Cache (if present)

- [ ] `__pycache__/` - Python cache
- [ ] `*.pyc` - Python compiled
- [ ] `*.pyo` - Python optimized

---

## Package Creation Process

### Step 1: Pre-Creation Verification

Before creating the package, verify:

- [ ] All Phase 1-4 tasks are complete
- [ ] All scripts are tested and working
- [ ] All documentation is up to date
- [ ] Test release banner is visible in wizard
- [ ] Feedback links are functional
- [ ] GitHub issue templates are created
- [ ] TESTING.md is complete with all scenarios
- [ ] KNOWN_ISSUES.md is up to date
- [ ] README.md has test release banner

### Step 2: Clean the Repository

```bash
# Remove all excluded files and directories
rm -rf node_modules/
rm -rf services/wizard/backend/node_modules/
rm -rf .kaspa-aio/
rm -rf .kaspa-backups/
rm -rf logs/
rm -f .env
rm -f .env.backup.*
rm -f services/.env.backup.*
rm -f /tmp/kaspa-wizard.*

# Stop any running services
docker-compose down -v

# Verify no sensitive data
grep -r "password" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "secret" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "api_key" . --exclude-dir=node_modules --exclude-dir=.git
```

### Step 3: Create Archive Using Git

The cleanest way to create the package is using `git archive`:

```bash
# Create archive from current branch
git archive --format=tar.gz \
  --prefix=kaspa-aio-v0.9.0-test/ \
  -o kaspa-aio-v0.9.0-test.tar.gz \
  HEAD

# Verify archive contents
tar -tzf kaspa-aio-v0.9.0-test.tar.gz | head -20
```

**Why use git archive?**
- Automatically excludes `.git/` directory
- Respects `.gitignore` rules
- Creates clean, reproducible archives
- Adds consistent directory prefix

### Step 4: Verify Package Contents

Extract and verify the package:

```bash
# Create test directory
mkdir -p /tmp/test-release
cd /tmp/test-release

# Extract archive
tar -xzf /path/to/kaspa-aio-v0.9.0-test.tar.gz

# Verify structure
cd kaspa-aio-v0.9.0-test
ls -la

# Check for essential files
test -f start-test.sh && echo "✓ start-test.sh present"
test -f TESTING.md && echo "✓ TESTING.md present"
test -f README.md && echo "✓ README.md present"
test -f docker-compose.yml && echo "✓ docker-compose.yml present"

# Check for excluded files (should not exist)
test ! -f .env && echo "✓ .env excluded"
test ! -d node_modules && echo "✓ node_modules excluded"
test ! -d .git && echo "✓ .git excluded"
test ! -d .kaspa-aio && echo "✓ .kaspa-aio excluded"

# Check file count
find . -type f | wc -l
```

### Step 5: Test the Package

Run through the smoke test:

```bash
# Make scripts executable
chmod +x *.sh

# Test start script
./start-test.sh

# Verify wizard opens in browser
# Complete a basic installation
# Test other scripts

# Test cleanup
./cleanup-test.sh
```

### Step 6: Calculate Package Size and Checksum

```bash
# Get package size
ls -lh kaspa-aio-v0.9.0-test.tar.gz

# Calculate SHA256 checksum
sha256sum kaspa-aio-v0.9.0-test.tar.gz > kaspa-aio-v0.9.0-test.tar.gz.sha256

# Display checksum
cat kaspa-aio-v0.9.0-test.tar.gz.sha256
```

---

## GitHub Release Upload Process

### Step 1: Create Git Tag

```bash
# Create annotated tag
git tag -a v0.9.0-test -m "Test Release v0.9.0 - Pre-release for testing"

# Push tag to GitHub
git push origin v0.9.0-test
```

### Step 2: Create GitHub Release

1. Go to: `https://github.com/[your-repo]/releases/new`
2. Select tag: `v0.9.0-test`
3. Release title: `Kaspa All-in-One v0.9.0 - Test Release`
4. Check: ✅ **This is a pre-release**
5. Add release notes (see template below)
6. Upload files:
   - `kaspa-aio-v0.9.0-test.tar.gz`
   - `kaspa-aio-v0.9.0-test.tar.gz.sha256`

### Step 3: Release Notes Template

```markdown
# Kaspa All-in-One v0.9.0 - Test Release

## ⚠️ This is a Test Release

This is a pre-production version for testing purposes. **Do not use in production.**

## What's New

- ✨ Web-based installation wizard
- 🔧 Multiple deployment profiles (Core, Explorer, Mining, etc.)
- 📊 Real-time installation progress tracking
- 🔄 Reconfiguration support
- 💾 Automatic backup system
- 🌐 Integrated management dashboard
- 🛡️ Error handling and recovery

## Quick Start for Testers

1. **Download** the archive below
2. **Extract**: `tar -xzf kaspa-aio-v0.9.0-test.tar.gz`
3. **Navigate**: `cd kaspa-aio-v0.9.0-test`
4. **Run**: `./start-test.sh`
5. **Follow** the wizard in your browser
6. **Test** using scenarios in TESTING.md
7. **Report** bugs and feedback

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- 4GB RAM minimum
- 20GB disk space minimum

## Testing Instructions

See [TESTING.md](TESTING.md) for detailed testing scenarios and instructions.

## Known Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current limitations and workarounds.

## Feedback

We need your feedback to make this better!

- 🐛 **Report bugs**: [Create Bug Report](https://github.com/[repo]/issues/new?template=bug_report.md)
- 💡 **Suggest features**: [Create Feature Request](https://github.com/[repo]/issues/new?template=feature_request.md)
- 💬 **Discuss**: [GitHub Discussions](https://github.com/[repo]/discussions)

## Package Verification

**SHA256 Checksum**: (see .sha256 file)

Verify your download:
```bash
sha256sum -c kaspa-aio-v0.9.0-test.tar.gz.sha256
```

## Testing Period

- **Start**: [Date]
- **End**: [Date + 2 weeks]
- **Target**: 10-15 testers
- **Goal**: 90% installation success rate

## Thank You!

Thank you for helping test Kaspa All-in-One. Your feedback is invaluable in making this project better for everyone.

---

**Note**: This is a test release. Features and functionality may change before v1.0.
```

### Step 4: Announce Release

After publishing the GitHub release:

1. **Create Discussion Post**:
   - Go to GitHub Discussions
   - Create post in "Test Release Feedback" category
   - Link to release
   - Explain testing goals
   - Request testers

2. **Update README.md** (if needed):
   - Add link to latest release
   - Update download instructions

3. **Notify Potential Testers**:
   - Discord/Telegram announcements
   - Email to interested parties
   - Social media posts

---

## Verification Checklist

Before publishing the release, verify:

### Package Contents
- [ ] All essential scripts present and executable
- [ ] All documentation files present
- [ ] All service directories complete
- [ ] Configuration files present
- [ ] GitHub templates present
- [ ] No `.env` files included
- [ ] No `node_modules/` included
- [ ] No `.git/` directory included
- [ ] No sensitive data included
- [ ] No personal configuration included

### Package Functionality
- [ ] Package extracts without errors
- [ ] `start-test.sh` runs successfully
- [ ] Wizard opens in browser
- [ ] Can complete basic installation
- [ ] `restart-services.sh` works
- [ ] `stop-services.sh` works
- [ ] `fresh-start.sh` works
- [ ] `status.sh` works
- [ ] `cleanup-test.sh` works

### Documentation
- [ ] README.md has test release banner
- [ ] TESTING.md is complete
- [ ] KNOWN_ISSUES.md is up to date
- [ ] All links work correctly
- [ ] Prerequisites are accurate
- [ ] Instructions are clear

### GitHub Setup
- [ ] Bug report template exists
- [ ] Feature request template exists
- [ ] GitHub Discussions enabled
- [ ] Test Release Feedback category created
- [ ] Release notes prepared

### Testing
- [ ] Internal smoke test passed
- [ ] All test scenarios validated
- [ ] Documentation tested by following it
- [ ] No critical bugs remaining

---

## Post-Release Monitoring

After releasing the package:

### Daily Tasks
- [ ] Check GitHub Issues for new bug reports
- [ ] Check GitHub Discussions for questions
- [ ] Respond to tester questions promptly
- [ ] Triage bugs by severity
- [ ] Update KNOWN_ISSUES.md as needed

### Weekly Tasks
- [ ] Review all feedback
- [ ] Identify common issues
- [ ] Plan fixes for critical bugs
- [ ] Update documentation based on feedback
- [ ] Consider releasing v0.9.1-test if needed

### Metrics to Track
- [ ] Number of downloads
- [ ] Number of successful installations
- [ ] Number of bug reports (by severity)
- [ ] Number of feature requests
- [ ] Average installation time (from feedback)
- [ ] Platform distribution (Linux/macOS/Windows)

---

## Success Criteria

The test release is successful when:

- ✅ **90%+ installation success rate**
- ✅ **Zero critical bugs** (system-breaking issues)
- ✅ **<15 minute average install time** (Core Profile)
- ✅ **80%+ positive feedback** from testers
- ✅ **All platforms tested** (Linux, macOS, Windows/WSL)
- ✅ **Documentation validated** (85%+ clarity rating)

When these criteria are met, proceed to v1.0 planning.

---

## Troubleshooting Package Creation

### Issue: Package too large

**Solution**: Verify no large files included
```bash
# Find large files
tar -tzf kaspa-aio-v0.9.0-test.tar.gz | \
  xargs -I {} sh -c 'tar -xzOf kaspa-aio-v0.9.0-test.tar.gz {} | wc -c | \
  awk "{print \$1, \"{}\"}"' | \
  sort -rn | head -20
```

### Issue: Sensitive data in package

**Solution**: Search and remove
```bash
# Search for sensitive patterns
tar -xzf kaspa-aio-v0.9.0-test.tar.gz
cd kaspa-aio-v0.9.0-test
grep -r "password\|secret\|api_key" . --exclude-dir=node_modules
```

### Issue: Missing files

**Solution**: Check .gitignore
```bash
# Verify files are tracked by git
git ls-files | grep "missing-file"

# If not tracked, add to git
git add missing-file
git commit -m "Add missing file for release"
```

---

## Notes

- **Always test the package** before publishing
- **Never include sensitive data** (.env files, keys, passwords)
- **Use git archive** for clean, reproducible packages
- **Verify checksums** to ensure download integrity
- **Mark as pre-release** to prevent production use
- **Monitor feedback** actively during testing period
- **Iterate quickly** on critical bugs

---

## Quick Command Reference

```bash
# Create package
git archive --format=tar.gz --prefix=kaspa-aio-v0.9.0-test/ \
  -o kaspa-aio-v0.9.0-test.tar.gz HEAD

# Calculate checksum
sha256sum kaspa-aio-v0.9.0-test.tar.gz > kaspa-aio-v0.9.0-test.tar.gz.sha256

# Create and push tag
git tag -a v0.9.0-test -m "Test Release v0.9.0"
git push origin v0.9.0-test

# Test extraction
mkdir test-dir && cd test-dir
tar -xzf ../kaspa-aio-v0.9.0-test.tar.gz
cd kaspa-aio-v0.9.0-test
./start-test.sh
```

---

**Last Updated**: [Date]  
**Version**: 1.0  
**Status**: Ready for use
