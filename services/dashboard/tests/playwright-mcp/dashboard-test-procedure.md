# Dashboard Playwright MCP Test Procedure

## Overview
End-to-end browser tests for the Kaspa AIO Dashboard using Playwright MCP tools.
Template: `kasia-suite` (installs kasia-app + kasia-indexer, uses public wRPC).

## Prerequisites
- Wizard backend running on port 3000
- Dashboard backend running on port 8080
- kasia-suite installed via wizard

---

## Phase 0: Environment Setup

### E01: Kill stale processes
- Kill any processes on ports 3000 and 8080
- Verify ports are free

### E02: Start wizard backend
- `cd services/wizard/backend && npm run dev`
- Verify port 3000 responds

### E03: Start dashboard backend
- `cd services/dashboard && npm run dev`
- Verify port 8080 responds

---

## Phase 1: Wizard Installation (kasia-suite)

### W01: Navigate to wizard
- Navigate to `http://localhost:3000?build-mode=test&mode=initial`
- Clear localStorage/sessionStorage first
- Verify wizard loads (title contains "Kaspa")

### W02: Pass Welcome step
- Click Continue on Welcome step

### W03: Pass System Check step
- Wait for system check, click Continue

### W04: Select kasia-suite template
- Click the kasia-suite template card
- Confirm selection in modal
- Click Continue

### W05: Complete installation
- Configure step: click Continue (defaults)
- Review step: click Install/Continue
- Wait for installation to complete
- Verify Complete step reached

---

## Phase 2: Dashboard Loading

### D01: Navigate to dashboard
- Navigate to `http://localhost:8080`
- Verify page title contains "Dashboard"

### D02: WebSocket connection
- Wait up to 10s for connection status to show "Connected"
- Check `#connection-status .text` content

### D03: Main sections present
- Verify these sections exist in DOM:
  - `.overview` (Overview Cards)
  - `.services` (Services Status)
  - `.applications` (Application Access)
  - `.actions` (Quick Actions)
  - `.resources` (System Resources)

### D04: Header elements
- Verify header contains:
  - `h1` with "Kaspa All-in-One Dashboard"
  - `#profile-filter` (select dropdown)
  - `#updates-btn` (updates button)
  - `#config-btn` (config button)
  - `#theme-toggle` (theme toggle)
  - `#connection-status` (connection indicator)
  - `#wizard-link` (wizard nav link)
  - `#reconfigure-btn` (reconfigure button)

---

## Phase 3: Kaspa Network

### D05: Network stats populated
- Check `#network-tps`, `#network-bps`, `#hash-rate` have non-"-" values
- Wait up to 15s for data to load from public API

### D06: Local node section shows unavailable
- Since kasia-suite has no local node, verify:
  - `#sync-status` shows "Unavailable" or similar
  - Node stats show "-" placeholders

---

## Phase 4: Service Cards

### D07: Service cards rendered
- Check `#services-grid` contains `.service-card` elements
- Expected: at least 2 cards (kasia-app, kasia-indexer)

### D08: Service card anatomy
- For each service card, verify:
  - `.service-header h3` (display name)
  - `.status-badge` (status text)
  - `.service-type-badge` (type badge)
  - `.service-actions` with Start/Stop/Restart/Logs buttons

### D09: Card data attributes
- Verify `data-service` attributes exist:
  - `[data-service="kasia-app"]` or similar
  - `[data-service="kasia-indexer"]` or similar

### D10: Status badge consistency
- Each `.status-badge` text should be one of: "healthy", "unhealthy", "stopped", "syncing"
- Badge class should match text

---

## Phase 5: Service Controls

### D11: Stop a service
- Find a running (healthy) service card
- Pre-accept the confirm dialog via `browser_handle_dialog`
- Click its Stop button (`[data-action="stop"]`)
- Wait 3s, verify status changes

### D12: Start a service
- Find the stopped service card
- Click Start button (`[data-action="start"]`)
- Wait 5s, verify status changes back

### D13: Restart a service
- Find a running service
- Pre-accept confirm dialog
- Click Restart button (`[data-action="restart"]`)
- Wait 5s, verify service is still running

### D14: Button disabled states
- When service is "healthy": Start button should be disabled
- When service is "stopped": Stop and Restart buttons should be disabled

---

## Phase 6: Logs Modal

### D15: Open logs modal
- Click Logs button on any service card (`[data-action="logs"]`)
- Verify `#logs-modal` becomes visible (`display: flex`)

### D16: Logs content
- Verify `#logs-title` contains service name
- Verify `#logs-content` has text content (not empty or "Loading logs...")

### D17: Close logs modal
- Click close button (`#close-logs-btn`)
- Verify modal hidden (`display: none`)

---

## Phase 7: App Access

### D18: Applications grid
- Check `#applications-grid` for content
- Record whether apps are populated or placeholder

### D19: Application links
- If populated, verify links have valid href with port numbers

---

## Phase 8: Profile Filter

### D20: Filter dropdown populated
- Check `#profile-filter` has more than 1 option
- Record option values and text

### D21: Filter by type
- Select a non-"all" option
- Verify service grid updates (card count may change)

### D22: Reset filter
- Select "All Services" option
- Verify all service cards reappear

---

## Phase 9: System Resources

### D23: Resource values
- Check `#cpu-text`, `#memory-text`, `#disk-text` have percentage values
- Values should contain "%" character

### D24: Progress bars
- Check `#cpu-progress`, `#memory-progress`, `#disk-progress` have non-zero width

---

## Phase 10: Quick Actions

### D25: Restart All button
- Click `#restart-all-btn`
- Pre-dismiss confirm dialog (cancel)
- Verify no crash

### D26: Update Services button
- Click `#update-services-btn`
- Verify updates modal opens or notification appears

### D27: Backup Data button
- Click `#backup-data-btn`
- Verify notification appears

---

## Phase 11: Theme Toggle

### D28: Cycle theme modes
- Click `#theme-toggle`
- Check `data-theme` attribute changes on `<html>`
- Click again, check it cycles

### D29: Theme persistence
- Note current theme
- Reload page
- Verify theme persists via `data-theme` attribute

---

## Phase 12: Config Modal

### D30: Open config modal
- Click `#config-btn`
- Verify `#config-modal` visible

### D31: Close config modal
- Click `#close-config-btn`
- Verify modal hidden

---

## Phase 13: Updates Modal + Misc

### D32: Open updates modal
- Click `#updates-btn`
- Verify `#updates-modal` visible

### D33: Close updates modal
- Click `#close-updates-btn`
- Verify modal hidden

### D34: Toggle view button
- Click `#toggle-view`
- Verify `#services-grid` toggles `list-view` class

### D35: Refresh button
- Click `#refresh-services`
- Verify notification or timestamp updates

### D36: Wizard navigation link
- Verify `#wizard-link` has `href="http://localhost:3000"`

### D37: Reconfigure button exists
- Verify `#reconfigure-btn` is present and clickable

### D38: Footer elements
- Verify footer contains:
  - `#report-bug-btn`
  - `#suggest-feature-btn`
  - `#donate-btn`
  - Links to kaspa.org, GitHub, Discord

### D39: Last status timestamp
- Verify `#last-status-timestamp` is not "-"
- Should contain a time string

### D40: Connection status indicator
- Verify `#connection-status` has class "connected" or contains "Connected" text

### D41: Screenshot - Dashboard overview
- Take full-page screenshot for documentation

### D42: Screenshot - Services section
- Take screenshot of services area

---

## Failure Protocol
- **Soft failure**: Screenshot, record FAIL in results, continue
- **Hard failure**: Screenshot + console errors, investigate, fix if possible, re-run
- Results tracked in `test-results.md`
