# Wizard-Dashboard Integration Test Procedure

## Overview

End-to-end test covering the full coordination cycle between wizard and dashboard:
install templates via wizard → verify services in dashboard → stop/restart from dashboard → remove via wizard reconfiguration → verify removal in dashboard.

**Estimated Total Time**: 60-90 minutes for T1-T7
**Tools**: Playwright MCP (browser_run_code, browser_evaluate, browser_snapshot, browser_take_screenshot)
**Execution Model**: Plan with Opus, execute with Sonnet 4.6

---

## Environment Setup (Phase 0)

### Prerequisites
- Docker and Docker Compose installed
- Node.js >= 18
- Ports 3000 and 8080 available

### Steps

```
P0.1  Kill stale processes on ports 3000 and 8080
      $ fuser -k 3000/tcp 2>/dev/null; fuser -k 8080/tcp 2>/dev/null

P0.2  Ensure clean state — remove installation-state.json if present
      $ rm -f services/installation-state.json
      $ docker compose down --remove-orphans 2>/dev/null

P0.3  Start wizard backend
      $ cd services/wizard/backend && npm run dev &
      Wait for "Server listening on port 3000"

P0.4  Start dashboard
      $ cd services/dashboard && node server.js &
      Wait for "Dashboard listening on port 8080"

P0.5  Verify both accessible
      browser_navigate: http://localhost:3000?build-mode=test&mode=initial
      browser_navigate: http://localhost:8080
```

**Result**: PASS / FAIL / SKIP

---

## Common Helper Procedures

### RESET_WIZARD

Clear browser state and navigate to fresh install mode.

```
1. browser_evaluate: localStorage.clear(); sessionStorage.clear();
2. browser_navigate: http://localhost:3000?build-mode=test&mode=initial
3. browser_wait_for: text "Welcome" (timeout 10s)
4. Verify: step-1 (Welcome) is visible
```

### RESET_DASHBOARD

Navigate to dashboard and wait for load.

```
1. browser_navigate: http://localhost:8080
2. browser_wait_for: text "Kaspa" or ".dashboard-header" (timeout 10s)
3. Optional: click #refresh-services to force data reload
```

### INSTALL_TEMPLATE(template_id)

Full wizard flow from welcome through complete step.

```
1. RESET_WIZARD
2. Click continue on Welcome step (click button in #step-1 that advances)
3. Wait for System Check step (#step-2) — click continue/skip
4. Wait for Templates step (#step-3)
5. Find template card: .template-card[data-template-id="{template_id}"]
6. Click .template-btn-primary on that card
7. Wait for Configure step (#step-4) — click continue (defaults are fine for test)
8. Wait for Review step (#step-5) — click "Install" button
9. Wait for Install step (#step-6):
   - Monitor #install-progress-percentage for "100%" (timeout 10 MINUTES)
   - Or monitor for completion text/button
10. Wait for Complete step (#step-7) — verify success message
```

**Important Notes**:
- `?build-mode=test` enables `autoEnableContinueButtons` and `allowManualStepNavigation`
- Docker image pulls on first run add significant time; cached runs are much faster
- Use `browser_run_code` for the install monitoring loop

### VERIFY_DASHBOARD_SERVICES(expected_services[])

Check service cards exist and statuses are not "stopped".

```
1. RESET_DASHBOARD
2. Wait 15 seconds for auto-refresh to populate services
3. For each service in expected_services:
   a. browser_evaluate: document.querySelector('.service-card[data-service="{name}"]')
   b. Verify card exists (not null)
   c. Read .status-badge text
   d. Accept: "healthy", "unhealthy", "running" (NOT "stopped", NOT missing)
4. Record actual statuses in results
```

**Known Limitations**:
- ~~kasia-app may show "unhealthy" due to architecture mismatch~~ Fixed — multi-platform images (amd64+arm64) now published
- Indexer services may show "unhealthy" because dashboard runs on host, can't reach Docker-internal URLs
- Accept "unhealthy" as valid — it means the container IS running

### STOP_SERVICE(service_name)

Stop a service from the dashboard and verify.

```
1. RESET_DASHBOARD
2. Find service card: .service-card[data-service="{service_name}"]
3. Use browser_run_code to handle confirm dialog:
   page.once('dialog', d => d.accept());
   await page.click('.service-card[data-service="{service_name}"] .btn-stop');
4. Wait 10 seconds for status update
5. Verify .status-badge text is "stopped" or "exited"
```

**Note**: Stop/restart buttons trigger `confirm()` dialogs — must use `page.once('dialog')` pattern.

**Known Limitation**: `timescaledb-*` and some services may not be in the dashboard's `isValidServiceName` whitelist — could cause 400 errors on stop. If so, choose a different service.

### START_SERVICE(service_name)

Start a stopped service from the dashboard and verify.

```
1. Find service card: .service-card[data-service="{service_name}"]
2. Use browser_run_code to handle potential dialog:
   page.once('dialog', d => d.accept());
   await page.click('.service-card[data-service="{service_name}"] .btn-start');
3. Wait 15 seconds for container startup
4. Verify .status-badge text is NOT "stopped" (accept healthy/unhealthy/running)
```

### REMOVE_ALL_PROFILES

Remove all installed profiles via wizard reconfiguration mode.

```
1. browser_evaluate: localStorage.clear(); sessionStorage.clear();
2. browser_navigate: http://localhost:3000?build-mode=test
   (no mode=initial — enters reconfig mode automatically)
3. Wait for reconfiguration landing page
4. Click "Remove Profiles" action: #remove-profiles-action
5. Wait for profile removal interface
6. For each installed profile:
   a. Click .btn-remove on the profile row
   b. Wait for #profile-removal-dialog to appear
   c. Verify default radio input[name="data-handling"] value is "keep"
   d. Click confirm button (calls window.confirmProfileRemoval())
   e. Wait for POST /wizard/profiles/remove to complete
   f. Verify success notification appears
7. After all profiles removed, verify empty state
```

### VERIFY_SERVICES_GONE

Confirm dashboard shows no services after removal.

```
1. RESET_DASHBOARD
2. Wait 15 seconds for auto-refresh
3. browser_evaluate: document.querySelectorAll('.service-card').length
4. Verify count is 0 or dashboard shows empty/no-installation state
5. Alternatively: verify "No services" message or empty grid
```

### CLEAN_STATE

Manual fallback to reset everything between template cycles.

```
1. docker compose down --remove-orphans
2. rm -f services/installation-state.json
3. Verify: docker ps shows no kaspa-aio containers
```

---

## Template Test Order

| # | Template ID | Profiles | Expected Dashboard Services |
|---|-------------|----------|---------------------------|
| T1 | kasia-lite | kasia-app | kasia-app |
| T2 | k-social-lite | k-social-app | k-social |
| T3 | kaspa-node | kaspa-node | kaspa-node |
| T4 | quick-start | kasia-app, k-social-app | kasia-app, k-social |
| T5 | kasia-suite | kasia-app, kasia-indexer | kasia-app, kasia-indexer |
| T6 | k-social-suite | k-social-app, k-indexer-bundle | k-social, k-indexer, timescaledb-kindexer |
| T7 | block-explorer | kaspa-explorer-bundle | kaspa-explorer, simply-kaspa-indexer, timescaledb-explorer |
| T8 | kaspa-sovereignty | All profiles | All 9 services (OPTIONAL) |

**Skipped**: `solo-miner`, `archival-node`, `archival-miner` (per user request), `custom-setup` (special flow)

### Service to Stop/Start Per Template

| Template | Service to Test Stop/Start |
|----------|--------------------------|
| T1 kasia-lite | kasia-app |
| T2 k-social-lite | k-social |
| T3 kaspa-node | kaspa-node |
| T4 quick-start | kasia-app |
| T5 kasia-suite | kasia-indexer |
| T6 k-social-suite | k-indexer |
| T7 block-explorer | kaspa-explorer |

---

## Phase 1: T1 — kasia-lite

### T1.1 — Install via Wizard
```
INSTALL_TEMPLATE("kasia-lite")
Expected: Installation completes successfully
Screenshot: t1-install-complete.png
```

### T1.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kasia-app"])
Expected: kasia-app card visible, status healthy/unhealthy
Screenshot: t1-dashboard-services.png
```

### T1.3 — Stop Service from Dashboard
```
STOP_SERVICE("kasia-app")
Expected: kasia-app status changes to "stopped"
Screenshot: t1-service-stopped.png
```

### T1.4 — Start Service from Dashboard
```
START_SERVICE("kasia-app")
Expected: kasia-app status returns to healthy/unhealthy
Screenshot: t1-service-started.png
```

### T1.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: kasia-app profile removed, success notification
Screenshot: t1-removal-complete.png
```

### T1.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
Screenshot: t1-dashboard-empty.png
```

---

## Phase 2: T2 — k-social-lite

### T2.1 — Install via Wizard
```
INSTALL_TEMPLATE("k-social-lite")
Expected: Installation completes successfully
```

### T2.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["k-social"])
Expected: k-social card visible, status healthy/unhealthy
```

### T2.3 — Stop Service from Dashboard
```
STOP_SERVICE("k-social")
Expected: k-social status changes to "stopped"
```

### T2.4 — Start Service from Dashboard
```
START_SERVICE("k-social")
Expected: k-social status returns to healthy/unhealthy
```

### T2.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: k-social-app profile removed, success notification
```

### T2.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 3: T3 — kaspa-node

### T3.1 — Install via Wizard
```
INSTALL_TEMPLATE("kaspa-node")
Expected: Installation completes successfully
Note: kaspa-node may take longer due to image size
```

### T3.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kaspa-node"])
Expected: kaspa-node card visible, status healthy/unhealthy
```

### T3.3 — Stop Service from Dashboard
```
STOP_SERVICE("kaspa-node")
Expected: kaspa-node status changes to "stopped"
```

### T3.4 — Start Service from Dashboard
```
START_SERVICE("kaspa-node")
Expected: kaspa-node status returns to healthy/unhealthy
Note: Node startup may take 15-30 seconds
```

### T3.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: kaspa-node profile removed, success notification
```

### T3.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 4: T4 — quick-start

### T4.1 — Install via Wizard
```
INSTALL_TEMPLATE("quick-start")
Expected: Installation completes successfully
```

### T4.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kasia-app", "k-social"])
Expected: Both cards visible, statuses healthy/unhealthy
```

### T4.3 — Stop Service from Dashboard
```
STOP_SERVICE("kasia-app")
Expected: kasia-app status changes to "stopped"
Note: k-social should remain unaffected
```

### T4.4 — Start Service from Dashboard
```
START_SERVICE("kasia-app")
Expected: kasia-app status returns to healthy/unhealthy
```

### T4.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: Both kasia-app and k-social-app profiles removed
Note: Remove each profile individually via the removal dialog
```

### T4.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 5: T5 — kasia-suite

### T5.1 — Install via Wizard
```
INSTALL_TEMPLATE("kasia-suite")
Expected: Installation completes successfully
```

### T5.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kasia-app", "kasia-indexer"])
Expected: Both cards visible, statuses healthy/unhealthy
```

### T5.3 — Stop Service from Dashboard
```
STOP_SERVICE("kasia-indexer")
Expected: kasia-indexer status changes to "stopped"
```

### T5.4 — Start Service from Dashboard
```
START_SERVICE("kasia-indexer")
Expected: kasia-indexer status returns to healthy/unhealthy
```

### T5.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: Both kasia-app and kasia-indexer profiles removed
```

### T5.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 6: T6 — k-social-suite

### T6.1 — Install via Wizard
```
INSTALL_TEMPLATE("k-social-suite")
Expected: Installation completes successfully
Note: Includes TimescaleDB — may take extra time for DB initialization
```

### T6.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["k-social", "k-indexer", "timescaledb-kindexer"])
Expected: All 3 cards visible
Note: timescaledb-kindexer may not be in isValidServiceName whitelist — document if missing
```

### T6.3 — Stop Service from Dashboard
```
STOP_SERVICE("k-indexer")
Expected: k-indexer status changes to "stopped"
Fallback: If k-indexer not in whitelist, try k-social instead
```

### T6.4 — Start Service from Dashboard
```
START_SERVICE("k-indexer")
Expected: k-indexer status returns to healthy/unhealthy
```

### T6.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: k-social-app and k-indexer-bundle profiles removed
Note: TimescaleDB should be cleaned up as dependency
```

### T6.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible (including timescaledb-kindexer gone)
```

---

## Phase 7: T7 — block-explorer

### T7.1 — Install via Wizard
```
INSTALL_TEMPLATE("block-explorer")
Expected: Installation completes successfully
Note: Includes explorer + indexer + TimescaleDB — heaviest non-sovereignty template
```

### T7.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kaspa-explorer", "simply-kaspa-indexer", "timescaledb-explorer"])
Expected: All 3 cards visible
Note: timescaledb-explorer may not be in isValidServiceName whitelist
```

### T7.3 — Stop Service from Dashboard
```
STOP_SERVICE("kaspa-explorer")
Expected: kaspa-explorer status changes to "stopped"
```

### T7.4 — Start Service from Dashboard
```
START_SERVICE("kaspa-explorer")
Expected: kaspa-explorer status returns to healthy/unhealthy
```

### T7.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: kaspa-explorer-bundle profile removed
Note: TimescaleDB and indexer should be cleaned up as dependencies
```

### T7.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 8: T8 — kaspa-sovereignty (OPTIONAL)

### T8.1 — Install via Wizard
```
INSTALL_TEMPLATE("kaspa-sovereignty")
Expected: Installation completes successfully
Note: Installs ALL services — expect 10-15 minute install time
```

### T8.2 — Verify Dashboard Services
```
VERIFY_DASHBOARD_SERVICES(["kaspa-node", "kasia-app", "kasia-indexer", "k-social", "k-indexer", "kaspa-explorer", "simply-kaspa-indexer", "timescaledb-kindexer", "timescaledb-explorer"])
Expected: All 9 service cards visible
```

### T8.3 — Stop Service from Dashboard
```
STOP_SERVICE("kaspa-node")
Expected: kaspa-node status changes to "stopped"
Note: Other services may become unhealthy due to node dependency
```

### T8.4 — Start Service from Dashboard
```
START_SERVICE("kaspa-node")
Expected: kaspa-node status returns to healthy/unhealthy
```

### T8.5 — Remove via Wizard Reconfiguration
```
REMOVE_ALL_PROFILES
Expected: All profiles removed (may require multiple removal dialogs)
Note: Order matters — remove dependent profiles first
```

### T8.6 — Verify Dashboard Empty
```
VERIFY_SERVICES_GONE
Expected: No service cards visible
```

---

## Phase 9: Edge Case Tests

### E1 — Dashboard Auto-Refresh After Wizard Install
```
1. Install any template via wizard (e.g., kasia-lite)
2. Have dashboard already open in another tab
3. Wait 15 seconds (auto-refresh interval is 10s)
4. Verify dashboard shows new services WITHOUT manual refresh
Expected: Services appear automatically
```

### E2 — Wizard Reconfig Detection After Dashboard Stop
```
1. Install a template, stop a service from dashboard
2. Open wizard (reconfig mode)
3. Verify wizard still shows the profile as installed (stopped ≠ uninstalled)
Expected: Wizard shows profile as installed regardless of running state
```

### E3 — Consecutive Installs Without Manual Clean
```
1. Install kasia-lite, then immediately install k-social-lite (without removing first)
2. Check: Does wizard handle the transition? Does dashboard show both?
Expected: Document behavior (may require removal first)
```

### E4 — Dashboard Notification When Wizard Active
```
1. Have dashboard open
2. Start wizard installation in another tab
3. Check if dashboard shows any indication of ongoing installation
Expected: Document behavior
```

---

## Environment Teardown

```
1. docker compose down --remove-orphans
2. rm -f services/installation-state.json
3. Kill wizard: fuser -k 3000/tcp
4. Kill dashboard: fuser -k 8080/tcp
```

---

## Known Limitations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| ~~kasia-app "unhealthy" on some architectures~~ | Fixed — multi-platform images published | — |
| Indexers "unhealthy" from host network | Dashboard can't reach Docker-internal health URLs | Accept "unhealthy" as valid |
| timescaledb-* not in isValidServiceName | 400 error on stop/start API calls | Skip stop/start for timescaledb, test other service |
| First-run Docker pulls slow | T1 may take 10+ minutes | Subsequent templates use cached images |
| Dashboard state file changes cause nodemon restarts | Dashboard crashes/restarts mid-test | Use `node server.js` directly, NOT nodemon |
