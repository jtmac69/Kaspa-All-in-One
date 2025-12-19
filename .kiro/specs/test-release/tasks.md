# Test Release Implementation Tasks

## Overview

This task list implements the test release requirements and design. The goal is to create a downloadable package that testers can use to validate the Kaspa All-in-One system.

**Target**: Test Release v0.9.0  
**First Tester**: You (on this machine)  
**Timeline**: 1-2 weeks to prepare, 2 weeks testing period

---

## Phase 1: Quick Start Scripts ⭐ HIGH PRIORITY

### 1.1 Create start-test.sh script
- [x] Create `start-test.sh` in project root
- [x] Implement platform detection (Linux, macOS, Windows/WSL)
- [x] Implement prerequisite checking (Docker, Docker Compose, Node.js)
- [x] Add platform-specific installation instructions for missing prerequisites
- [x] Implement wizard dependency installation (`npm install --production`)
- [x] Implement wizard startup with background process
- [x] Implement browser auto-open functionality
- [x] Add welcome banner and instructions
- [x] Test on current machine
- **FILE**: `start-test.sh`
- _Requirements: 2, 3, 10, 14_

### 1.2 Create cleanup-test.sh script
- [x] Create `cleanup-test.sh` in project root
- [x] Implement confirmation prompt
- [x] Stop wizard process (using PID file)
- [x] Stop all Docker containers (`docker-compose down -v`)
- [x] Implement data removal with user confirmation
- [x] Remove temporary files and logs
- [x] Add option to preserve user data
- [x] Test cleanup process
- **FILE**: `cleanup-test.sh`
- _Requirements: 8, 15_

### 1.3 Create restart-services.sh script
- [x] Create `restart-services.sh` in project root
- [x] Implement graceful service stop (`docker-compose down`)
- [x] Implement service restart (`docker-compose up -d`)
- [x] Add health check wait period
- [x] Display service status after restart
- [x] Add helpful output messages
- [x] Test restart process
- **FILE**: `restart-services.sh`
- _Requirements: 19_

### 1.4 Create stop-services.sh script
- [x] Create `stop-services.sh` in project root
- [x] Implement graceful service stop (`docker-compose stop`)
- [x] Stop wizard process (using PID file)
- [x] Preserve all data and configuration
- [x] Display confirmation message
- [x] Add instructions for restarting
- [x] Test stop process
- **FILE**: `stop-services.sh`
- _Requirements: 19_

### 1.5 Create fresh-start.sh script
- [x] Create `fresh-start.sh` in project root
- [x] Implement confirmation prompts
- [x] Add option to preserve or remove volumes
- [x] Stop and remove all containers
- [x] Preserve wizard state and configuration files
- [x] Display clear instructions for next steps
- [x] Test fresh start process with both volume options
- **FILE**: `fresh-start.sh`
- _Requirements: 20_

### 1.6 Create status.sh script
- [x] Create `status.sh` in project root
- [x] Check and display wizard status (PID check)
- [x] Display Docker service status (`docker-compose ps`)
- [x] Show resource usage (`docker stats`)
- [x] Show ports in use (netstat/ss)
- [x] Handle cases where services aren't running
- [x] Format output clearly with sections
- [x] Test status display in various states
- **FILE**: `status.sh`
- _Requirements: 21_

---

## Phase 2: Test Documentation ⭐ HIGH PRIORITY

### 2.1 Create TESTING.md
- [x] Write welcome section for testers
- [x] Document prerequisites clearly
- [x] Write quick start instructions
- [x] Create Scenario 1: Core Profile Installation (step-by-step)
- [x] Create Scenario 2: Kaspa User Applications (step-by-step)
- [x] Create Scenario 3: Indexer Services (step-by-step)
- [x] Create Scenario 4: Error Handling (step-by-step)
- [x] Create Scenario 5: Reconfiguration (step-by-step)
- [x] Add "Service Management" section with restart/stop/fresh-start/status instructions
- [x] Document how to report bugs (with links)
- [x] Document how to suggest features (with links)
- [x] Add "Getting Help" section
- [x] Add glossary of terms
- [ ] Test instructions by following them yourself
- **FILE**: `TESTING.md`
- _Requirements: 4, 11, 16, 19, 20, 21_

### 2.2 Create KNOWN_ISSUES.md
- [x] Document node sync time (high priority)
- [x] Document Windows/WSL requirement (medium priority)
- [x] Document port conflict possibilities (low priority)
- [x] List all current limitations
- [x] Provide workarounds where available
- [x] Categorize by severity (Critical, High, Medium, Low)
- [x] Keep updated as issues are discovered
- **FILE**: `KNOWN_ISSUES.md`
- _Requirements: 12_

### 2.3 Update README.md for test release
- [x] Add "TEST RELEASE" banner at top
- [x] Add test release version number
- [x] Add quick start for testers section
- [x] Link to TESTING.md
- [x] Link to KNOWN_ISSUES.md
- [x] Add feedback links (issues, discussions)
- [x] Add disclaimer about pre-production status
- [x] Keep existing content but mark as test release
- **FILE**: `README.md`
- _Requirements: 6, 16_

---

## Phase 3: Feedback Mechanisms ⭐ HIGH PRIORITY

### 3.1 Create bug report template
- [x] Create `.github/ISSUE_TEMPLATE/` directory
- [x] Create `bug_report.md` template
- [x] Include sections: Description, Steps to Reproduce, Expected/Actual Behavior
- [x] Request system information (OS, Docker version, Node.js version)
- [x] Request logs and screenshots
- [x] Add test-release label automatically
- **FILE**: `.github/ISSUE_TEMPLATE/bug_report.md`
- _Requirements: 5, 17_

### 3.2 Create feature request template
- [x] Create `feature_request.md` template
- [x] Include sections: Description, Use Case, Proposed Solution
- [x] Include "Alternatives Considered" section
- [x] Add enhancement label automatically
- **FILE**: `.github/ISSUE_TEMPLATE/feature_request.md`
- _Requirements: 5, 17_

### 3.3 Set up GitHub Discussions
- [x] Enable GitHub Discussions on repository
- [x] Create "Test Release Feedback" category
- [x] Create pinned welcome post with instructions
- [x] Link from TESTING.md
- _Requirements: 5_

---

## Phase 4: Wizard UI Updates 🟡 MEDIUM PRIORITY

### 4.1 Add test release banner to wizard
- [x] Create test release banner component
- [x] Add to wizard UI (top of page)
- [x] Include version number (v0.9.0-test)
- [x] Link to KNOWN_ISSUES.md
- [x] Link to bug report page
- [x] Style with warning colors (orange/yellow)
- [x] Make dismissible but persistent
- **FILE**: `services/wizard/frontend/public/index.html`
- **FILE**: `services/wizard/frontend/public/styles/wizard.css`
- _Requirements: 6_

### 4.2 Add feedback links to wizard
- [x] Add "Report Bug" button to wizard footer
- [x] Add "Suggest Feature" button to wizard footer
- [x] Add "View Known Issues" link
- [x] Open links in new tab
- [x] Style consistently with wizard theme
- **FILE**: `services/wizard/frontend/public/index.html`
- _Requirements: 5, 17_

---

## Phase 5: Package Preparation 🟡 MEDIUM PRIORITY

### 5.1 Create .gitignore for test release
- [x] Exclude `node_modules/`
- [x] Exclude `.env` files (keep `.env.example`)
- [x] Exclude build artifacts
- [x] Exclude test data
- [x] Exclude personal configuration
- [x] Keep all source code and documentation
- **FILE**: `.gitignore` (verify/update)
- _Requirements: 1_

### 5.2 Create release checklist
- [x] Document all files to include in package
- [x] Document all files to exclude
- [x] Create verification checklist
- [x] Document package creation process
- [x] Document upload process
- **FILE**: `docs/RELEASE_CHECKLIST.md`
- _Requirements: 1_

### 5.3 Test package creation
- [x] Create test package archive
- [x] Extract in clean directory
- [x] Verify all files present
- [x] Verify no sensitive data included
- [x] **REBUILT**: Fixed nginx configuration syntax errors (kaspa-explorer-nginx-fix spec)
- [x] **REBUILT**: Used `./build-test-release.sh` script for proper packaging
- [x] **VERIFIED**: New package contains fixed nginx.conf with proper `add_header` placement
- **FILE**: `kaspa-aio-v0.9.0-test.tar.gz` (2.0M, SHA256: e94290d43bb4417f656ee683ba6c93532ef21f9559fe0cde5002b86f129de0ae)
- **NOTE**: Functional testing of scripts is done in Phase 6.1 (Smoke Test)
- _Requirements: 1, 10_

---

## Phase 6: Internal Testing (You as First Tester) ⭐ CRITICAL

### 6.1 Smoke test (30 minutes)
- [x] Extract test package in clean directory
- [x] Run `./start-test.sh` (tests script from package)
- [x] Verify wizard opens in browser
- [x] Complete Core Profile installation
- [x] Verify services start correctly with `docker ps`
- [x] Run `./cleanup-test.sh` (tests script from package)
- [x] Verify cleanup completes
- [x] Document any issues found
- [x] **CRITICAL FIX**: Resolved nginx configuration syntax errors causing service startup failures
- [x] **VERIFIED**: kaspa-user-applications profile now starts successfully (all 3 services running)
- [x] **TESTED**: New test release package works without "Failed to start services" error
- **NOTE**: This task validates the package created in 5.3 works correctly
- **NOTE**: Dashboard is not included in this test release - use `docker ps` and `docker logs` to monitor services
- _Requirements: 7, 14_

### 6.2 Full scenario testing (2-3 hours)
- [x] Test Scenario 1: Core Profile (follow TESTING.md)
- [x] Test Scenario 2: Kaspa User Applications (follow TESTING.md)
  - [x] Fixed TESTING.md to match actual wizard configuration pages
  - [x] Fixed review page to show profile-specific configuration
  - [x] Removed nginx from kaspa-user-applications profile (not needed)
  - [x] Fixed wizard completion page to not show nginx
  - [x] Rebuilt test release with all fixes
- [x] Test Scenario 3: Indexer Services (follow TESTING.md)
  - [x] **CRITICAL BUG FOUND**: Indexer Services profile showing incorrect network configuration
  - [x] **ROOT CAUSE**: Frontend logic incorrectly included indexer-services in network config visibility
  - [x] **FIXED**: Removed indexer-services from network configuration checks in configure.js and review.js
  - [x] **FIXED**: Updated configuration-fields.js to remove indexer-services from EXTERNAL_IP visibility
  - [x] **UPDATED**: TESTING.md Scenario 3 to document correct configuration and include bug reporting instructions
  - [x] **DOCUMENTED**: Created TASK_6.2_INDEXER_SERVICES_CONFIGURATION_FIX.md implementation summary
  - [x] **CRITICAL BUG FOUND**: Installation failure - k-indexer service missing from Docker Compose generation
  - [x] **ROOT CAUSE**: k-indexer referenced everywhere but missing from config-generator.js Docker Compose generation
  - [x] **FIXED**: Added complete k-indexer service definition to Docker Compose generation
  - [x] **FIXED**: Added k-indexer-data volume and TimescaleDB health check
  - [x] **DOCUMENTED**: Created TASK_6.2_INDEXER_SERVICES_MISSING_K_INDEXER_FIX.md implementation summary
  - [x] **DOCUMENTATION BUG FOUND**: TESTING.md referenced dashboard that's not in test release
  - [x] **FIXED**: Updated Scenario 3 to use Docker commands instead of dashboard for verification
  - [x] **ENHANCED**: Added comprehensive Docker-based service verification steps
  - [x] **DOCUMENTED**: Created TASK_6.2_TESTING_DOCUMENTATION_DASHBOARD_REALITY_UPDATE.md
  - [x] **CRITICAL ARCHITECTURE BUG FOUND**: Indexer Services forced unnecessary kaspa-node deployment
  - [x] **ROOT CAUSE**: indexer-services incorrectly included in nodeProfiles array
  - [x] **FIXED**: Removed indexer-services from automatic kaspa-node deployment logic
  - [x] **FIXED**: Removed hard dependencies on kaspa-node from indexer services
  - [x] **FIXED**: Updated default endpoints to use public Kaspa API (https://api.kaspa.org)
  - [x] **ENHANCED**: Added comprehensive health checks to all indexer services
  - [x] **DOCUMENTED**: Created TASK_6.2_INDEXER_SERVICES_ARCHITECTURE_FIX.md
  - [x] **REBUILDING**: Test release package with all indexer services fixes and architectural improvements
  - [x] **DATABASE INITIALIZATION BUG FOUND**: k-indexer failing with "relation k_vars does not exist" errors
  - [x] **ROOT CAUSE**: Database initialization scripts missing k_vars configuration table required by k-indexer
  - [x] **FIXED**: Created k_vars table manually and populated with required configuration (network=mainnet)
  - [x] **FIXED**: Updated database initialization scripts to create k_vars table automatically
  - [x] **FIXED**: Corrected user permissions in all init scripts from 'indexer' to 'kaspa'
  - [x] **VERIFIED**: k-indexer health endpoint now responds successfully, database errors eliminated
  - [x] **DOCUMENTED**: Created TASK_INDEXER_DB_INITIALIZATION_FIX.md implementation summary
  - [x] **ARCHITECTURE REDESIGN**: Implemented Database-Per-Service architecture to eliminate all conflicts
  - [x] **ROOT CAUSE**: Shared database approach caused irreconcilable schema and naming conflicts
  - [x] **SOLUTION**: Separate TimescaleDB containers for each indexer service
  - [x] **IMPLEMENTED**: k-social-db (port 5433) for k-indexer, simply-kaspa-db (port 5434) for simply-kaspa-indexer
  - [x] **BENEFITS**: Complete isolation, independent scaling, fault tolerance, schema freedom
  - [x] **DOCUMENTED**: Created DATABASE_PER_SERVICE_ARCHITECTURE.md comprehensive design document
  - [x] **SPEC UPDATES**: Updated all relevant specs with new database architecture
  - [x] **TESTING UPDATED**: Updated TESTING.md Scenario 3 with new verification procedures
  - [x] **CROSS-SPEC SYNC**: Documented changes across kaspa-all-in-one, web-installation-wizard, management-dashboard, and test-release specs
  - [x] **IMPLEMENTATION SUMMARY**: Created TASK_DATABASE_PER_SERVICE_ARCHITECTURE_IMPLEMENTATION.md
- [x] Test Scenario 4: Error Handling (follow TESTING.md)
- [x] Test Scenario 5: Reconfiguration (follow TESTING.md)
- [x] Document time taken for each scenario
- [x] Document any issues or confusion
- [x] Update TESTING.md based on findings
- [x] Update KNOWN_ISSUES.md with new issues
- _Requirements: 4, 11, 13, 14_

### 6.3 Documentation validation (1 hour)
- [x] Read TESTING.md as a new user
- [x] Verify all instructions are clear
- [x] Test all links work correctly
- [x] Verify prerequisites are accurate
- [x] Check for typos and errors
- [x] Update documentation as needed
- [x] Have someone else review if possible
- _Requirements: 4, 16_

### 6.4 Create test report
- [X] Document what worked well
- [X] Document what needs improvement
- [X] List all bugs found
- [X] Estimate installation times
- [X] Rate documentation clarity
- [X] Provide recommendations for improvements
- **FILE**: `docs/TEST_REPORT_INTERNAL.md`
- _Requirements: 13_

---

## Phase 7: GitHub Release Preparation 🟡 MEDIUM PRIORITY

### 7.1 Create release notes
- [x] Write release title
- [x] Write release description
- [x] List new features
- [x] List known issues (link to KNOWN_ISSUES.md)
- [x] Add quick start instructions
- [x] Add prerequisites (refer to TESTING.md for content)
- [x] Add feedback links
- [x] Add thank you message (Can refer to the TETING.md file for content)
- **FILE**: `docs/RELEASE_NOTES_v0.9.0.md`
- _Requirements: 1, 6_

### 7.2 Create GitHub release
- [x] Create git tag: `v0.9.0-test`
- [x] Push tag to GitHub
- [x] Create GitHub release from tag (note existance of the build-test-release script)
- [x] Mark as "Pre-release" ✓
- [x] Upload package archive
- [x] Add release notes
- [x] Publish release
- _Requirements: 1, 6_

### 7.3 Announce test release
- [x] Create announcement in GitHub Discussions and also a post for X social and other direct messaging platforms (i.e. Telegram)
- [x] Explain purpose of test release
- [ ] Link to TESTING.md
- [x] Request testers
- [x] Set expectations (2 week testing period)
- [x] Thank testers in advance
- _Requirements: 18_

---

## Phase 8: External Testing Support 🟢 LOW PRIORITY

### 8.1 Monitor feedback
- [ ] Check GitHub Issues daily
- [ ] Check GitHub Discussions daily
- [ ] Respond to questions promptly
- [ ] Triage bugs by severity
- [ ] Track common issues
- _Requirements: 5, 18_

### 8.2 Update documentation
- [ ] Update KNOWN_ISSUES.md as issues are found
- [ ] Update TESTING.md if instructions unclear
- [ ] Update README.md if needed
- [ ] Keep changelog of updates
- _Requirements: 12, 18_

### 8.3 Release updates if needed
- [ ] Fix critical bugs
- [ ] Create v0.9.1-test if necessary
- [ ] Notify testers of updates
- [ ] Document what changed
- _Requirements: 18_

---

## Phase 9: Success Evaluation 🟢 LOW PRIORITY

### 9.1 Collect metrics
- [ ] Count successful installations
- [ ] Count reported bugs (by severity)
- [ ] Count feature requests
- [ ] Calculate average installation time
- [ ] Calculate installation success rate
- **FILE**: `docs/TEST_METRICS.md`
- _Requirements: 13_

### 9.2 Analyze feedback
- [ ] Review all bug reports
- [ ] Review all feature requests
- [ ] Review discussion feedback
- [ ] Identify common themes
- [ ] Prioritize improvements
- **FILE**: `docs/FEEDBACK_ANALYSIS.md`
- _Requirements: 13, 17_

### 9.3 Determine readiness for v1.0
- [ ] Verify success criteria met (90% success rate)
- [ ] Verify zero critical bugs
- [ ] Verify documentation clarity (85%+)
- [ ] Verify average install time (<15 min)
- [ ] Verify platform coverage
- [ ] Create go/no-go decision document
- **FILE**: `docs/V1_READINESS.md`
- _Requirements: 13, 18_

---

## Success Criteria

### Phase 6 (Internal Testing) Complete When:
- ✅ All smoke tests pass
- ✅ All scenarios tested successfully
- ✅ Documentation validated
- ✅ Test report created
- ✅ All critical issues fixed

### Ready for External Testing When:
- 🔄 Internal testing complete (Phase 6.2-6.4 remaining)
- ✅ All documentation finalized
- ⏳ GitHub release created (Phase 7)
- ✅ Feedback mechanisms in place
- ✅ You're confident in the package (critical issues resolved)

### Test Release Successful When:
- ✅ 90% installation success rate
- ✅ Zero critical bugs
- ✅ <15 minute average install time
- ✅ 80% positive feedback
- ✅ All platforms tested
- ✅ Ready to proceed to v1.0

---

## Current Status

**Phase 1**: ✅ **COMPLETE** - All quick start scripts created and tested  
**Phase 2**: ✅ **COMPLETE** - All testing documentation created  
**Phase 3**: ✅ **COMPLETE** - Feedback mechanisms set up  
**Phase 4**: ✅ **COMPLETE** - Wizard UI updated with test release banner  
**Phase 5**: ✅ **COMPLETE** - Package prepared and rebuilt with nginx fix  
**Phase 6**: 🔄 **IN PROGRESS** - Smoke test complete, full scenario testing in progress  
**Phase 7**: ⏳ **WAITING** - Ready to start (waiting for Phase 6 completion)  
**Phase 8**: ⏳ **WAITING** - Ready to start (waiting for Phase 7)  
**Phase 9**: ⏳ **WAITING** - Ready to start (waiting for Phase 8)

### 🎉 Major Milestone: Critical Service Startup Issue RESOLVED
- **Issue**: kaspa-user-applications profile failing with "Failed to start services"
- **Root Cause**: nginx syntax errors in `services/kaspa-explorer/nginx.conf`
- **Solution**: Moved all `add_header` directives from server level to location blocks
- **Result**: All services now start successfully, test release package rebuilt and verified

---

## Next Steps

1. **Start with Phase 1**: Create the quick start scripts
2. **Then Phase 2**: Write the testing documentation
3. **Then Phase 3**: Set up feedback mechanisms
4. **Then Phase 4**: Update wizard UI
5. **Then Phase 5**: Prepare the package
6. **Then Phase 6**: YOU test it yourself
7. **Fix any issues found**
8. **Repeat Phase 6 until satisfied**
9. **Then Phase 7**: Create GitHub release
10. **Then Phase 8**: Support external testers

**Estimated Time to Phase 6**: 1-2 weeks  
**Phase 6 Duration**: 1 day  
**External Testing**: 2 weeks

---

## Files to Create/Update

### New Files
- [ ] `start-test.sh`
- [ ] `restart-services.sh`
- [ ] `stop-services.sh`
- [ ] `fresh-start.sh`
- [ ] `status.sh`
- [ ] `cleanup-test.sh`
- [ ] `TESTING.md`
- [ ] `KNOWN_ISSUES.md`
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] `docs/RELEASE_CHECKLIST.md`
- [ ] `docs/RELEASE_NOTES_v0.9.0.md`
- [ ] `docs/TEST_REPORT_INTERNAL.md`
- [ ] `docs/TEST_METRICS.md`
- [ ] `docs/FEEDBACK_ANALYSIS.md`
- [ ] `docs/V1_READINESS.md`

### Updated Files
- [ ] `README.md` (add test release banner)
- [ ] `services/wizard/frontend/public/index.html` (add banner and feedback links)
- [ ] `services/wizard/frontend/public/styles/wizard.css` (banner styles)
- [ ] `.gitignore` (verify exclusions)

---

## Notes

- **You are the first tester**: This ensures quality before external release
- **Iterate as needed**: Don't rush to external testing
- **Document everything**: Your experience guides other testers
- **Be thorough**: Better to find issues now than during external testing
