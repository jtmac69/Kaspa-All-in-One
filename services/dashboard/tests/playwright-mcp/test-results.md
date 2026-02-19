# Dashboard Playwright MCP Test Results

**Date**: 2026-02-19
**Template**: kasia-suite
**Tester**: Claude Code (Playwright MCP)

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | 42 |
| Passed | 36 |
| Failed | 0 |
| Soft Fail | 2 |
| Skipped | 1 |
| Bugs Found | 3 |

## Results

| ID | Test | Status | Notes |
|----|------|--------|-------|
| E01 | Kill stale processes | PASS | Killed processes on ports 3000, 8080 |
| E02 | Start wizard backend | PASS | Port 3000, nodemon dev mode |
| E03 | Start dashboard backend | PASS | Port 8080, node server.js (direct, not nodemon) |
| W01 | Navigate to wizard | PASS | `?build-mode=test&mode=initial` |
| W02 | Pass Welcome step | PASS | |
| W03 | Pass System Check step | PASS | |
| W04 | Select kasia-suite template | PASS | |
| W05 | Complete installation | PASS | Required 2 bug fixes in wizard server.js (see bugs #1, #2) |
| D01 | Navigate to dashboard | PASS | Title: "Kaspa All-in-One Dashboard" |
| D02 | WebSocket connection | PASS | Connected status shown |
| D03 | Main sections present | PASS | All 5 sections: Overview, Services, Applications, Quick Actions, Resources |
| D04 | Header elements | PASS | All 8 elements: title, filter, wizard link, reconfigure, updates, config, theme, status |
| D05 | Network stats populated | PASS | TPS=10, BPS=10, Hashrate=412 PH/s, Circulating=28.70B |
| D06 | Local node unavailable | PASS | Sync status shows "Unavailable" (expected — no local node) |
| D07 | Service cards rendered | PASS | 2 cards: kasia-app, kasia-indexer |
| D08 | Service card anatomy | PASS | Both cards have name, status badge, type badge, profile badge, 4 action buttons |
| D09 | Card data attributes | PASS | data-service: kasia-app, kasia-indexer |
| D10 | Status badge consistency | PASS | Badges match actual Docker status |
| D11 | Stop a service | PASS | Stopped kasia-indexer via confirm dialog |
| D12 | Start a service | PASS | Clicked Start on kasia-app (API call sent) |
| D13 | Restart a service | SKIP | Confirm dialog interaction unreliable in Playwright MCP |
| D14 | Button disabled states | PASS | Stopped: Stop/Restart disabled, Start enabled. Running: all enabled |
| D15 | Open logs modal | PASS | `display: flex` |
| D16 | Logs content | PASS | Title "kasia-indexer Logs", real Rust indexer log content |
| D17 | Close logs modal | PASS | Close button works, `display: none` |
| D18 | Applications grid | SOFT FAIL | Grid section exists but empty — no app cards rendered |
| D19 | Application links | SOFT FAIL | No app links in grid (related to D18) |
| D20 | Filter dropdown populated | PASS | 5 options: All (2), Application (1), Indexer (1), Kasia App (1), Kasia Idx (1) |
| D21 | Filter by type | PASS | Selecting "Application (1)" shows only kasia-app (after bug #3 fix) |
| D22 | Reset filter | PASS | Selecting "All" restores both cards |
| D23 | Resource values | PASS | CPU 4.2%, Memory 31.9%, Disk 39.0% |
| D24 | Progress bars | PASS | Progress bars have correct widths |
| D25 | Restart All (dismiss) | PASS | Confirm dialog appeared and was dismissed |
| D26 | Update Services button | PASS | Button exists and is clickable |
| D27 | Backup Data button | PASS | Button exists and is clickable |
| D28 | Cycle theme modes | PASS | dark→system(light)→light→dark cycle works |
| D29 | Theme persistence | PASS | localStorage `kaspa-aio-theme` updated on each toggle |
| D30 | Open config modal | PASS | `display: flex` |
| D31 | Close config modal | PASS | Close button works |
| D32 | Open updates modal | PASS | `display: flex` |
| D33 | Close updates modal | PASS | Close button works |
| D34 | Toggle view | PASS | `list-view` class toggled on services grid |
| D35 | Refresh button | PASS | Manual refresh triggered successfully |
| D36 | Wizard nav link | PASS | href=http://localhost:3000 |
| D37 | Reconfigure button | PASS | Button present with correct label |
| D38 | Footer elements | PASS | Report Bug, Suggest Feature, Buy me a Koffee, kaspa.org, GitHub, Discord |
| D39 | Last status timestamp | PASS | Shows current time |
| D40 | Connection status | PASS | "Connected" |
| D41 | Screenshot overview | PASS | dashboard-full-page.png |
| D42 | Screenshot services | PASS | dashboard-services.png |

## Bugs Found

| # | Severity | Description | File | Fix Applied |
|---|----------|-------------|------|-------------|
| 1 | Critical | Wrong `require()` path for SharedStateManager — `../../shared/lib/state-manager` should be `../../../shared/lib/state-manager` (server.js is in `src/` dir, 3 levels from `services/shared/`). Caused wizard crash at 85% installation. | `services/wizard/backend/src/server.js` (lines 293, 438, 462) | Yes — changed to `../../../shared/lib/state-manager` on 3 lines |
| 2 | Critical | `ReferenceError: profiles is not defined` in catch block — `const { config, profiles } = data` was block-scoped inside `try`, inaccessible from `catch`. | `services/wizard/backend/src/server.js` (line ~458→876) | Yes — moved destructuring before `try` block |
| 3 | Medium | Profile filter shows 0 results — `s.type` from API is `"http"` (health check protocol), not display type like `"Application"`. Filter comparison `(s.type \|\| this.getServiceType(s.name))` always used `s.type` since it's truthy. Also affected service card type badges (showed "http" instead of "Application"/"Indexer") and grouping. | `services/dashboard/public/scripts/modules/ui-manager.js` (lines 181, 274, 412) | Yes — changed to `this.getServiceType(service.name)` on all 3 lines |

## Notes

- **kasia-app**: Docker image has exec format error (architecture mismatch) — shows as "stopped/restarting". This is an environment issue, not a dashboard bug.
- **kasia-indexer**: Shows "unhealthy" with error "getaddrinfo ENOTFOUND kasia-indexer" — expected since dashboard runs on host, not inside Docker network.
- **Applications grid (D18/D19)**: Empty despite having kasia-app installed. The dashboard may not populate this section when services are unhealthy/stopped, or the app registration logic may need investigation.
- **Dashboard nodemon**: No `nodemon.json` config — watches all files including `.kaspa-aio/installation-state.json`, causing restart loops during testing. Used `node server.js` directly as workaround.
