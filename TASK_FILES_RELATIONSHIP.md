# Task Files Relationship - Explanation

## Overview

There are **two task files** in this project that can cause confusion:

1. **Main Tasks** (`.kiro/specs/kaspa-all-in-one-project/tasks.md`)
2. **Web Installation Wizard Tasks** (`.kiro/specs/web-installation-wizard/tasks.md`)

## Which File to Use?

### Use the **Main Tasks.md** for:
- ✅ **Primary task execution** - This is the main task list for the entire project
- ✅ **"Start Task" buttons** - All tasks here are actionable in Kiro IDE
- ✅ **Project-wide tracking** - Tracks all phases and features
- ✅ **High-level implementation** - Task 6 and subtasks (6.1-6.4) for wizard

### The **Web Installation Wizard Tasks.md** is:
- 📚 **Reference documentation** - Detailed breakdown of wizard implementation
- 📋 **Granular detail** - More specific subtasks for wizard feature
- 🔗 **Linked from main tasks** - Referenced by Task 6 in main tasks.md
- ⚠️ **Not for execution** - Use main tasks.md instead

## Task Mapping

### Main Tasks.md → Web Installation Wizard Tasks.md

| Main Tasks | Wizard Tasks | Status |
|------------|--------------|--------|
| Task 6.1: Build wizard backend API | Phase 2.0-2.6 | ✅ Complete |
| Task 6.2: Build wizard frontend UI | Phase 2.1-2.9 | ✅ Complete |
| Task 6.3: Integrate wizard with main system | Phase 3.1-3.5 | ✅ Complete |
| Task 6.4: Complete wizard testing and documentation | Phase 4.5 (partial) | ✅ Complete |

## Why Two Files?

The web-installation-wizard tasks.md was created as a **detailed spec** for the wizard feature following the spec-driven development workflow:

1. **Requirements** → `web-installation-wizard/requirements.md`
2. **Design** → `web-installation-wizard/design.md`
3. **Tasks** → `web-installation-wizard/tasks.md` (detailed breakdown)

The main tasks.md then **references** this detailed spec but provides the **actionable tasks** for implementation.

## Current Status

### Main Tasks.md
- ✅ Task 6: Implement web-based installation wizard - **COMPLETE**
- ✅ Task 6.1: Build wizard backend API - **COMPLETE**
- ✅ Task 6.2: Build wizard frontend UI - **COMPLETE**
- ✅ Task 6.3: Integrate wizard with main system - **COMPLETE**
- ✅ Task 6.4: Complete wizard testing and documentation - **COMPLETE**

### Web Installation Wizard Tasks.md
- ✅ Phase 2: Node.js Backend - **COMPLETE**
- ✅ Phase 2: Frontend User Interface - **COMPLETE**
- ✅ Phase 3: Integration and Polish - **COMPLETE**
- 📋 Phase 4: Testing and Documentation - **PLANNED** (optional enhancements)
- 📋 Phase 5: Advanced Features - **FUTURE** (optional enhancements)

## Recommendation

**Always use the Main Tasks.md** (`.kiro/specs/kaspa-all-in-one-project/tasks.md`) for:
- Starting new tasks
- Tracking progress
- Understanding what needs to be done next

**Use the Web Installation Wizard Tasks.md** only for:
- Understanding detailed implementation steps
- Reference during wizard development
- Seeing granular breakdown of wizard features

## Next Steps

The wizard is **complete** (Task 6 ✅). The next priority is:

**Phase 6.5: Non-Technical User Support** (in main tasks.md)
- Task 6.5.1: Integrate resource checker into wizard backend
- Task 6.5.2: Plain language content rewrite
- Task 6.5.3: Pre-installation checklist page
- Task 6.5.4: Dependency installation guides
- Task 6.5.5: Auto-remediation for common errors
- ... (13 tasks total)

These tasks are now properly formatted with "Start Task" buttons in the main tasks.md file.

## Summary

- ✅ **Main tasks.md** = Primary task list (use this!)
- 📚 **Web-installation-wizard tasks.md** = Reference documentation
- ✅ **Wizard is complete** (Task 6 and all subtasks)
- 🎯 **Next priority** = Phase 6.5 (Non-Technical User Support)
