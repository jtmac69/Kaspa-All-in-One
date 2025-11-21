# Task List Correlation and Priority Guide

## Overview

We have three task documents tracking different aspects of the project. This document clarifies which list to use and how they relate.

**Date**: November 21, 2025  
**Purpose**: Provide single source of truth for test release progress

---

## The Three Task Lists

### 1. `.kiro/specs/kaspa-all-in-one-project/tasks.md`
**Purpose**: Overall project implementation plan  
**Scope**: All phases (1-9) including infrastructure, services, testing, documentation  
**Use For**: High-level project status, completed work, long-term planning  
**Status**: Phases 1-5 complete, Phase 6 in progress

### 2. `.kiro/specs/web-installation-wizard/tasks.md`
**Purpose**: Detailed wizard specification tasks  
**Scope**: Wizard backend, frontend, and features (from spec)  
**Use For**: Wizard feature completeness, spec compliance  
**Status**: Backend complete, frontend partially complete

### 3. `TEST_RELEASE_TASKS.md` ⭐ **USE THIS FOR TEST RELEASE**
**Purpose**: Focused test release readiness tasks  
**Scope**: Only critical tasks needed for test release  
**Use For**: Day-to-day test release progress tracking  
**Status**: Active development, updated daily

---

## 🎯 Which List Should You Use?

### For Test Release Work: `TEST_RELEASE_TASKS.md` ⭐

**This is your primary working document for reaching test release.**

It contains only the 4 critical tasks needed:
1. ✅ Rollback UI Integration (IN PROGRESS - refactoring complete)
2. 📋 Complete Wizard Frontend Steps
3. 📋 End-to-End Wizard Testing
4. 📋 Documentation Updates

**Why use this list?**
- Focused on test release goals
- Daily progress tracking
- Clear priorities
- Actionable subtasks
- No distractions from completed work

### For Overall Project Status: `.kiro/specs/kaspa-all-in-one-project/tasks.md`

**Use this for understanding what's been completed and long-term planning.**

Contains all 9 phases of the project.

### For Wizard Spec Compliance: `.kiro/specs/web-installation-wizard/tasks.md`

**Use this to verify wizard meets spec requirements.**

Contains detailed wizard specification tasks.

---

## Task Correlation Map

Here's how the tasks relate across all three lists:

### TEST_RELEASE_TASKS.md → Main tasks.md

| Test Release Task | Main tasks.md Reference | Status |
|-------------------|------------------------|--------|
| **Task 1: Rollback UI Integration** | Task 6.5.12 (Rollback and recovery) | 🔄 IN PROGRESS |
| **Task 2: Complete Wizard Steps** | Task 6.2 (Build wizard frontend UI) | 📋 PLANNED |
| **Task 3: E2E Testing** | Task 6.4 (Complete wizard testing) | 📋 PLANNED |
| **Task 4: Documentation** | Task 4.1, 4.2 (Documentation) | 📋 PLANNED |

### TEST_RELEASE_TASKS.md → Wizard tasks.md

| Test Release Task | Wizard tasks.md Reference | Status |
|-------------------|---------------------------|--------|
| **Task 1: Rollback UI** | Phase 4.12 (Rollback and recovery) | 🔄 IN PROGRESS |
| **Task 2: Complete Steps** | Phase 2.1-2.9 (Frontend UI) | 📋 PLANNED |
| **Task 3: E2E Testing** | Phase 5 (Testing and validation) | 📋 PLANNED |
| **Task 4: Documentation** | Phase 6 (Documentation) | 📋 PLANNED |

---

## Current Status Across All Lists

### Main tasks.md Status
```
Phase 1: Core Infrastructure          ✅ 100% Complete
Phase 2: Service Integration           ✅ 100% Complete
Phase 3: Testing Framework             ✅ 100% Complete
Phase 4: Documentation                 ✅ 100% Complete
Phase 4.5: TimescaleDB Integration     ✅ 100% Complete
Phase 5: Service Repository Integration ✅ 100% Complete
Phase 6: Web-Based Installation Wizard 🔄 85% Complete
  ├─ 6.1 Backend API                   ✅ Complete
  ├─ 6.2 Frontend UI                   🔄 70% Complete
  ├─ 6.3 Integration                   ✅ Complete
  ├─ 6.4 Testing                       📋 Planned
  └─ 6.5 Non-Technical User Support    🔄 92% Complete
      ├─ 6.5.1-6.5.11                  ✅ Complete
      ├─ 6.5.12 Rollback               🔄 Backend complete, frontend in progress
      └─ 6.5.13 User testing           📋 Planned
Phase 7: Dashboard Enhancement         📋 Planned
Phase 8: Documentation Completion      📋 Planned
Phase 9: Advanced Features             📋 Future
```

### Wizard tasks.md Status
```
Phase 2.0-2.6: Backend                 ✅ 100% Complete
Phase 2.1-2.9: Frontend                🔄 70% Complete
Phase 3: Integration                   ✅ 100% Complete
Phase 4: Non-Technical Support         🔄 75% Complete
Phase 5: Testing                       📋 Planned
Phase 6: Documentation                 📋 Planned
```

### TEST_RELEASE_TASKS.md Status
```
Task 1: Rollback UI Integration        🔄 30% Complete
  ├─ Refactoring                       ✅ Complete
  ├─ Rollback module                   ✅ Complete
  ├─ HTML integration                  📋 Next
  └─ UI components                     📋 Next

Task 2: Complete Wizard Steps          📋 0% Complete
Task 3: E2E Testing                    📋 0% Complete
Task 4: Documentation                  📋 0% Complete
```

---

## Recommended Workflow

### Daily Work Process

1. **Check**: `TEST_RELEASE_TASKS.md` for today's priorities
2. **Work**: Complete subtasks from TEST_RELEASE_TASKS.md
3. **Update**: Mark subtasks complete in TEST_RELEASE_TASKS.md
4. **Sync**: Update main tasks.md when major milestones complete

### Weekly Review Process

1. **Review**: TEST_RELEASE_TASKS.md progress
2. **Update**: Main tasks.md with completed work
3. **Sync**: Wizard tasks.md if spec-related work done
4. **Plan**: Next week's priorities in TEST_RELEASE_TASKS.md

---

## Task Synchronization Rules

### When to Update Main tasks.md

Update when:
- ✅ Complete a major phase or task (e.g., Task 6.5.12)
- ✅ Reach significant milestone (e.g., wizard frontend complete)
- ✅ Complete a full phase (e.g., Phase 6)

Don't update for:
- ❌ Individual subtasks
- ❌ Daily progress
- ❌ Work in progress

### When to Update Wizard tasks.md

Update when:
- ✅ Complete a wizard-specific feature
- ✅ Implement a spec requirement
- ✅ Finish a wizard phase

Don't update for:
- ❌ Implementation details
- ❌ Refactoring work
- ❌ Bug fixes

### When to Update TEST_RELEASE_TASKS.md

Update:
- ✅ Daily progress
- ✅ Every subtask completion
- ✅ Blockers encountered
- ✅ Time estimates
- ✅ Daily log entries

---

## Current Priority: TEST_RELEASE_TASKS.md

### What to Focus On Now

**Primary Document**: `TEST_RELEASE_TASKS.md`

**Current Task**: Task 1 - Rollback UI Integration

**Next Steps**:
1. Update HTML to use refactored modules
2. Add rollback UI components
3. Test rollback functionality
4. Move to Task 2 (Complete wizard steps)

**Daily Updates**: Add to TEST_RELEASE_TASKS.md daily log

**Milestone Updates**: Update main tasks.md when Task 1 complete

---

## Quick Reference

### "What should I work on today?"
→ Check `TEST_RELEASE_TASKS.md` - Current Task section

### "What's the overall project status?"
→ Check `.kiro/specs/kaspa-all-in-one-project/tasks.md`

### "Does the wizard meet spec requirements?"
→ Check `.kiro/specs/web-installation-wizard/tasks.md`

### "When is test release ready?"
→ Check `TEST_RELEASE_TASKS.md` - Overall Progress

### "What's been completed?"
→ Check `.kiro/specs/kaspa-all-in-one-project/tasks.md` - Phases 1-5

---

## Test Release Completion Criteria

Track in `TEST_RELEASE_TASKS.md`:

- [ ] Task 1: Rollback UI Integration (30% complete)
- [ ] Task 2: Complete Wizard Steps (0% complete)
- [ ] Task 3: E2E Testing (0% complete)
- [ ] Task 4: Documentation Updates (0% complete)

**When all 4 tasks complete** → Update main tasks.md:
- Mark Task 6.5.12 complete
- Mark Task 6.2 complete
- Mark Task 6.4 complete
- Update Phase 6 status to "Ready for Test Release"

---

## Summary

### Use This List for Test Release Work:
**`TEST_RELEASE_TASKS.md`** ⭐

### Update These Lists at Milestones:
- `.kiro/specs/kaspa-all-in-one-project/tasks.md` (major milestones)
- `.kiro/specs/web-installation-wizard/tasks.md` (spec compliance)

### Current Focus:
**Task 1: Rollback UI Integration** in `TEST_RELEASE_TASKS.md`

### Next Milestone:
Complete Task 1, update main tasks.md to mark 6.5.12 complete

---

## Action Items

### Immediate (Today)
- [x] Create task correlation document
- [ ] Continue Task 1 in TEST_RELEASE_TASKS.md
- [ ] Update HTML to use refactored modules
- [ ] Add rollback UI components

### This Week
- [ ] Complete Task 1 (Rollback UI)
- [ ] Start Task 2 (Complete wizard steps)
- [ ] Update main tasks.md when Task 1 complete

### Next Week
- [ ] Complete Task 2 (Wizard steps)
- [ ] Complete Task 3 (E2E testing)
- [ ] Complete Task 4 (Documentation)
- [ ] Prepare test release package

---

## Conclusion

**For test release work, use `TEST_RELEASE_TASKS.md` as your primary working document.**

It's focused, actionable, and updated daily. The other task lists provide context and track overall progress, but TEST_RELEASE_TASKS.md is your day-to-day guide to reaching test release readiness.

**Current Status**: 30% complete (refactoring done, UI integration next)  
**Estimated Completion**: 5-7 days  
**Next Action**: Update HTML to use refactored modules
