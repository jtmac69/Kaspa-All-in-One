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
- **FILE**: `kaspa-aio-v0.9.0-test.tar.gz`, `kaspa-aio-v0.9.0-test.tar.gz.sha256`
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
- [ ] Test Scenario 3: Indexer Services (follow TESTING.md)
- [ ] Test Scenario 4: Error Handling (follow TESTING.md)
- [ ] Test Scenario 5: Reconfiguration (follow TESTING.md)
- [x] Document time taken for each scenario
- [x] Document any issues or confusion
- [x] Update TESTING.md based on findings
- [ ] Update KNOWN_ISSUES.md with new issues
- _Requirements: 4, 11, 13, 14_

### 6.3 Documentation validation (1 hour)
- [ ] Read TESTING.md as a new user
- [ ] Verify all instructions are clear
- [ ] Test all links work correctly
- [ ] Verify prerequisites are accurate
- [ ] Check for typos and errors
- [ ] Update documentation as needed
- [ ] Have someone else review if possible
- _Requirements: 4, 16_

### 6.4 Create test report
- [ ] Document what worked well
- [ ] Document what needs improvement
- [ ] List all bugs found
- [ ] Estimate installation times
- [ ] Rate documentation clarity
- [ ] Provide recommendations for improvements
- **FILE**: `docs/TEST_REPORT_INTERNAL.md`
- _Requirements: 13_

---

## Phase 7: GitHub Release Preparation 🟡 MEDIUM PRIORITY

### 7.1 Create release notes
- [ ] Write release title
- [ ] Write release description
- [ ] List new features
- [ ] List known issues (link to KNOWN_ISSUES.md)
- [ ] Add quick start instructions
- [ ] Add prerequisites
- [ ] Add feedback links
- [ ] Add thank you message
- **FILE**: `docs/RELEASE_NOTES_v0.9.0.md`
- _Requirements: 1, 6_

### 7.2 Create GitHub release
- [ ] Create git tag: `v0.9.0-test`
- [ ] Push tag to GitHub
- [ ] Create GitHub release from tag
- [ ] Mark as "Pre-release" ✓
- [ ] Upload package archive
- [ ] Add release notes
- [ ] Publish release
- _Requirements: 1, 6_

### 7.3 Announce test release
- [ ] Create announcement in GitHub Discussions
- [ ] Explain purpose of test release
- [ ] Link to TESTING.md
- [ ] Request testers
- [ ] Set expectations (2 week testing period)
- [ ] Thank testers in advance
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
- ✅ Internal testing complete
- ✅ All documentation finalized
- ✅ GitHub release created
- ✅ Feedback mechanisms in place
- ✅ You're confident in the package

### Test Release Successful When:
- ✅ 90% installation success rate
- ✅ Zero critical bugs
- ✅ <15 minute average install time
- ✅ 80% positive feedback
- ✅ All platforms tested
- ✅ Ready to proceed to v1.0

---

## Current Status

**Phase 1**: Not started  
**Phase 2**: Not started  
**Phase 3**: Not started  
**Phase 4**: Not started  
**Phase 5**: Not started  
**Phase 6**: Not started (waiting for Phases 1-5)  
**Phase 7**: Not started (waiting for Phase 6)  
**Phase 8**: Not started (waiting for Phase 7)  
**Phase 9**: Not started (waiting for Phase 8)

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
