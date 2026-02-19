# Wizard-Dashboard Integration Test Results

**Date**: ____-__-__
**Tester**: ________________
**Environment**: ________________
**Wizard URL**: http://localhost:3000
**Dashboard URL**: http://localhost:8080

---

## Phase 0: Environment Setup

| ID | Test | Result | Notes |
|----|------|--------|-------|
| P0 | Environment setup (ports, clean state, servers) | | |

---

## Phase 1: T1 — kasia-lite

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T1.1 | Install kasia-lite via wizard | | |
| T1.2 | Verify kasia-app in dashboard | | |
| T1.3 | Stop kasia-app from dashboard | | |
| T1.4 | Start kasia-app from dashboard | | |
| T1.5 | Remove via wizard reconfiguration | | |
| T1.6 | Verify dashboard empty | | |

**Phase 1 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 2: T2 — k-social-lite

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T2.1 | Install k-social-lite via wizard | | |
| T2.2 | Verify k-social in dashboard | | |
| T2.3 | Stop k-social from dashboard | | |
| T2.4 | Start k-social from dashboard | | |
| T2.5 | Remove via wizard reconfiguration | | |
| T2.6 | Verify dashboard empty | | |

**Phase 2 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 3: T3 — kaspa-node

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T3.1 | Install kaspa-node via wizard | | |
| T3.2 | Verify kaspa-node in dashboard | | |
| T3.3 | Stop kaspa-node from dashboard | | |
| T3.4 | Start kaspa-node from dashboard | | |
| T3.5 | Remove via wizard reconfiguration | | |
| T3.6 | Verify dashboard empty | | |

**Phase 3 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 4: T4 — quick-start

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T4.1 | Install quick-start via wizard | | |
| T4.2 | Verify kasia-app + k-social in dashboard | | |
| T4.3 | Stop kasia-app from dashboard | | |
| T4.4 | Start kasia-app from dashboard | | |
| T4.5 | Remove all profiles via wizard reconfiguration | | |
| T4.6 | Verify dashboard empty | | |

**Phase 4 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 5: T5 — kasia-suite

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T5.1 | Install kasia-suite via wizard | | |
| T5.2 | Verify kasia-app + kasia-indexer in dashboard | | |
| T5.3 | Stop kasia-indexer from dashboard | | |
| T5.4 | Start kasia-indexer from dashboard | | |
| T5.5 | Remove all profiles via wizard reconfiguration | | |
| T5.6 | Verify dashboard empty | | |

**Phase 5 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 6: T6 — k-social-suite

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T6.1 | Install k-social-suite via wizard | | |
| T6.2 | Verify k-social + k-indexer + timescaledb-kindexer in dashboard | | |
| T6.3 | Stop k-indexer from dashboard | | |
| T6.4 | Start k-indexer from dashboard | | |
| T6.5 | Remove all profiles via wizard reconfiguration | | |
| T6.6 | Verify dashboard empty | | |

**Phase 6 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 7: T7 — block-explorer

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T7.1 | Install block-explorer via wizard | | |
| T7.2 | Verify kaspa-explorer + simply-kaspa-indexer + timescaledb-explorer in dashboard | | |
| T7.3 | Stop kaspa-explorer from dashboard | | |
| T7.4 | Start kaspa-explorer from dashboard | | |
| T7.5 | Remove all profiles via wizard reconfiguration | | |
| T7.6 | Verify dashboard empty | | |

**Phase 7 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 8: T8 — kaspa-sovereignty (OPTIONAL)

| ID | Test | Result | Notes |
|----|------|--------|-------|
| T8.1 | Install kaspa-sovereignty via wizard | | |
| T8.2 | Verify all 9 services in dashboard | | |
| T8.3 | Stop kaspa-node from dashboard | | |
| T8.4 | Start kaspa-node from dashboard | | |
| T8.5 | Remove all profiles via wizard reconfiguration | | |
| T8.6 | Verify dashboard empty | | |

**Phase 8 Summary**: __/6 PASS
**Bugs Found**:

---

## Phase 9: Edge Cases

| ID | Test | Result | Notes |
|----|------|--------|-------|
| E1 | Dashboard auto-refresh after wizard install | | |
| E2 | Wizard reconfig detection after dashboard stop | | |
| E3 | Consecutive installs without manual clean | | |
| E4 | Dashboard notification when wizard active | | |

**Phase 9 Summary**: __/4 PASS
**Bugs Found**:

---

## Overall Summary

| Phase | Template | Pass | Fail | Skip | Total |
|-------|----------|------|------|------|-------|
| 1 | kasia-lite | | | | 6 |
| 2 | k-social-lite | | | | 6 |
| 3 | kaspa-node | | | | 6 |
| 4 | quick-start | | | | 6 |
| 5 | kasia-suite | | | | 6 |
| 6 | k-social-suite | | | | 6 |
| 7 | block-explorer | | | | 6 |
| 8 | kaspa-sovereignty (OPT) | | | | 6 |
| 9 | Edge cases | | | | 4 |
| **Total** | | | | | **52** |

**Overall**: __/52 PASS
**Total Bugs Found**: __
**Total Time**: __ minutes

---

## Bugs Found

| # | Phase | Test ID | Severity | Description | Status |
|---|-------|---------|----------|-------------|--------|
| | | | | | |

---

## Screenshots

| Test ID | Filename | Description |
|---------|----------|-------------|
| | | |

---

## Notes

-
