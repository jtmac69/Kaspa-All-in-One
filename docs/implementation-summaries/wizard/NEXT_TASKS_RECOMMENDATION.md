# Next Tasks Recommendation - Architecture Alignment

**Date:** November 24, 2025  
**Status:** Ready to Implement  
**Current Progress:** Wizard Phase 6.6 started (1/6 tasks complete)

## 📊 Current Status

### Web Installation Wizard
- **Phase 6.6** (Profile Architecture): 🚀 IN PROGRESS - 1/6 tasks complete
  - ✅ Task 6.6.1: Profile definitions updated
  - ⏳ Task 6.6.2: Dependency validation (NEXT)
  - ⏳ Tasks 6.6.3-6.6.6: Remaining
- **Phase 6.7** (Node Synchronization): 📋 PLANNED - Not started
- **Phase 6.8** (Wizard-Dashboard Integration): 📋 PLANNED - Not started

### Kaspa All-in-One Project
- **Phase 10** (Profile Architecture): 📋 PLANNED - Not started
- **Phase 11** (Update Management): 📋 PLANNED - Not started
- **Phase 12** (Wizard-Dashboard Integration): 📋 PLANNED - Not started

---

## 🎯 Recommended Next Tasks

### IMMEDIATE PRIORITY: Complete Wizard Phase 6.6

The wizard has already started Phase 6.6 with task 6.6.1 complete. We should finish this phase before moving to infrastructure changes.

#### Task 6.6.2: Implement Dependency Resolution System ⭐ DO THIS NEXT

**Why this task:**
- Builds on completed task 6.6.1 (profile definitions)
- Foundation for remaining Phase 6.6 tasks
- Critical for profile selection validation
- Already has clear specifications in design doc

**What to implement:**
```
File: services/wizard/backend/src/utils/dependency-validator.js

Features:
1. Circular dependency detection algorithm
2. Prerequisite validation (Mining requires Core OR Archive)
3. Startup order calculation
4. Dependency graph builder
5. Conflict detection

API: POST /api/profiles/validate-selection
```

**Estimated Time:** 2-3 days

**Success Criteria:**
- [ ] Can detect circular dependencies
- [ ] Validates prerequisites correctly
- [ ] Calculates correct startup order
- [ ] API endpoint works and returns validation results
- [ ] Unit tests pass

---

#### Task 6.6.3: Implement Resource Calculation with Deduplication

**Why this task:**
- Depends on task 6.6.2 (needs validated profile selection)
- Critical for user experience (warns about insufficient resources)
- Builds on existing resource-checker.js

**What to implement:**
```
File: services/wizard/backend/src/utils/resource-checker.js (update)

Features:
1. Calculate combined resources across selected profiles
2. Deduplicate shared resources (TimescaleDB)
3. Compare against available system resources
4. Generate warnings when insufficient
5. Create optimization recommendations

API: POST /api/resource-check/calculate-combined
```

**Estimated Time:** 2-3 days

**Success Criteria:**
- [ ] Correctly calculates combined resources
- [ ] Deduplicates TimescaleDB (used by multiple indexers)
- [ ] Warns when system resources insufficient
- [ ] Provides optimization recommendations
- [ ] API endpoint works correctly

---

#### Task 6.6.4: Implement Fallback Strategies

**Why this task:**
- Independent of other tasks (can be done in parallel)
- Critical for reliability (handles node failures)
- Needed for docker-compose configuration

**What to implement:**
```
File: services/wizard/backend/src/utils/fallback-manager.js (new)

Features:
1. Node failure detection
2. User choice dialog (Continue/Troubleshoot/Retry)
3. Automatic fallback to public Kaspa network
4. Indexer fallback to public endpoints
5. Generate fallback configuration

API: POST /api/config/configure-fallback
```

**Estimated Time:** 2-3 days

**Success Criteria:**
- [ ] Detects node failures correctly
- [ ] Presents user with clear choices
- [ ] Configures fallback to public network
- [ ] Generates correct docker-compose config
- [ ] API endpoint works correctly

---

#### Task 6.6.5: Implement Developer Mode Toggle

**Why this task:**
- Independent of other tasks (can be done in parallel)
- Adds valuable feature for developers
- Relatively straightforward implementation

**What to implement:**
```
Files:
- services/wizard/frontend/public/scripts/modules/configure.js
- services/wizard/backend/src/utils/config-generator.js

Features:
1. Developer Mode checkbox in UI
2. Apply developer features to selected profiles
3. Configure debug logging (LOG_LEVEL=debug)
4. Expose additional ports
5. Add Portainer and pgAdmin services
6. Generate docker-compose.override.yml
```

**Estimated Time:** 2-3 days

**Success Criteria:**
- [ ] Developer Mode toggle appears in UI
- [ ] Generates docker-compose.dev.yml correctly
- [ ] Adds Portainer and pgAdmin when enabled
- [ ] Configures debug logging
- [ ] Exposes additional ports

---

#### Task 6.6.6: Update Frontend Profile Selection UI

**Why this task:**
- Depends on all previous Phase 6.6 tasks
- Makes new features visible to users
- Completes Phase 6.6

**What to implement:**
```
Files:
- services/wizard/frontend/public/index.html
- services/wizard/frontend/public/scripts/modules/configure.js
- services/wizard/frontend/public/styles/wizard.css

Features:
1. Update profile card names
2. Add Developer Mode toggle with explanation
3. Display dependency warnings
4. Show startup order visualization
5. Display combined resource requirements
6. Add prerequisite indicators
```

**Estimated Time:** 3-4 days

**Success Criteria:**
- [ ] All profile names updated in UI
- [ ] Developer Mode toggle visible and functional
- [ ] Dependency warnings display correctly
- [ ] Startup order visualization clear
- [ ] Resource requirements show warnings
- [ ] Prerequisites clearly indicated

---

## 📅 Recommended Implementation Schedule

### Week 1: Complete Wizard Phase 6.6

**Days 1-3:** Task 6.6.2 (Dependency Resolution)
- Implement dependency validator
- Add circular dependency detection
- Create API endpoint
- Write tests

**Days 4-6:** Task 6.6.3 (Resource Calculation)
- Update resource checker
- Add deduplication logic
- Create API endpoint
- Write tests

**Days 7-9:** Task 6.6.4 (Fallback Strategies)
- Create fallback manager
- Implement node failure detection
- Create API endpoint
- Write tests

**Days 10-12:** Task 6.6.5 (Developer Mode)
- Add UI toggle
- Update config generator
- Generate docker-compose.dev.yml
- Test functionality

**Days 13-16:** Task 6.6.6 (Frontend UI Update)
- Update profile cards
- Add dependency warnings
- Add startup order visualization
- Add resource warnings
- Test complete flow

### Week 2-3: Start All-in-One Phase 10

Once Wizard Phase 6.6 is complete, start infrastructure updates:

**Task 10.1:** Rename profiles in docker-compose.yml (1 day)
**Task 10.2:** Implement TimescaleDB shared database (2 days)
**Task 10.3:** Configure service startup order (2 days)
**Task 10.4:** Implement fallback strategies (2 days)
**Task 10.5:** Add Developer Mode support (2 days)
**Task 10.6:** Update documentation (1 day)

---

## 🔄 Parallel vs Sequential

### Can Be Done in Parallel

These tasks are independent and can be worked on simultaneously:

**Wizard:**
- Task 6.6.4 (Fallback Strategies)
- Task 6.6.5 (Developer Mode)

**All-in-One:**
- Task 10.1 (Rename profiles)
- Task 10.5 (Developer Mode support)

### Must Be Sequential

These tasks have dependencies:

**Wizard:**
1. Task 6.6.1 ✅ (Complete)
2. Task 6.6.2 ⏳ (Next - depends on 6.6.1)
3. Task 6.6.3 (Depends on 6.6.2)
4. Task 6.6.6 (Depends on all previous)

**All-in-One:**
1. Task 10.1 (Rename profiles first)
2. Task 10.2 (TimescaleDB - depends on profile names)
3. Task 10.3 (Startup order - depends on profiles)
4. Task 10.4 (Fallback - depends on startup order)

---

## ✅ Success Metrics

### Phase 6.6 Complete When:
- [ ] All 6 tasks marked complete
- [ ] Dependency validation works correctly
- [ ] Resource calculation shows warnings
- [ ] Fallback strategies configured
- [ ] Developer Mode functional
- [ ] Frontend UI updated with all features
- [ ] All tests passing
- [ ] Documentation updated

### Ready for Phase 6.7 When:
- [ ] Phase 6.6 complete
- [ ] Profile architecture stable
- [ ] No blocking bugs
- [ ] Team ready for node sync work

---

## 🚀 Quick Start

### To Start Task 6.6.2 Right Now:

1. **Review the design document:**
   - `.kiro/specs/web-installation-wizard/design.md`
   - Section: "Dependency Resolution"
   - Look for TypeScript interfaces and algorithms

2. **Create the file:**
   ```bash
   touch services/wizard/backend/src/utils/dependency-validator.js
   ```

3. **Implement the class:**
   ```javascript
   class DependencyValidator {
     validateSelection(profiles) {
       // Check for circular dependencies
       // Validate prerequisites
       // Calculate startup order
       // Return validation result
     }
     
     detectCycles(graph) {
       // Implement cycle detection
     }
   }
   ```

4. **Create the API endpoint:**
   - File: `services/wizard/backend/src/api/profiles.js`
   - Add: `POST /api/profiles/validate-selection`

5. **Write tests:**
   ```bash
   touch services/wizard/backend/test-dependency-validator.js
   ```

6. **Test manually:**
   ```bash
   node services/wizard/backend/test-dependency-validator.js
   ```

---

## 📝 Notes

- **Focus on Wizard first:** Complete Phase 6.6 before starting All-in-One Phase 10
- **Test incrementally:** Test each task as you complete it
- **Update docs:** Keep documentation in sync with code
- **Ask questions:** Better to clarify than implement incorrectly

---

## 🔗 Related Documents

- `.kiro/specs/web-installation-wizard/tasks.md` - Full wizard task list
- `.kiro/specs/kaspa-all-in-one-project/tasks.md` - Full all-in-one task list
- `.kiro/specs/web-installation-wizard/design.md` - Technical specifications
- `docs/implementation-summaries/wizard/IMPLEMENTATION_ROADMAP.md` - Overall roadmap

---

## 🎯 Bottom Line

**START HERE:** Task 6.6.2 - Implement Dependency Resolution System

This is the logical next step that builds on completed work and unblocks remaining tasks in Phase 6.6.
