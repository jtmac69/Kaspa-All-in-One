# Wizard UI/UX Test Procedure (Playwright MCP)

> **Purpose**: A step-by-step test runbook for Claude Code to execute using Playwright MCP browser tools against the live Kaspa AIO wizard.
>
> **Total Tests**: 31 across 5 phases
>
> **Results File**: `services/wizard/tests/playwright-mcp/test-results.md`

---

## Prerequisites & Setup

### 1. Start the Wizard Backend

```bash
cd services/wizard/backend && npm run dev
```

Wizard will be available at `http://localhost:3000`.

### 2. Test URL

- **Default**: `http://localhost:3000?build-mode=test`
  - If kaspa-node (or any service) is currently installed, the wizard auto-detects **reconfiguration mode**
  - If no services are installed, the wizard starts in **fresh install mode**
- **Force reconfigure**: `http://localhost:3000?mode=reconfigure&build-mode=test`

The `?build-mode=test` parameter enables:
- `autoEnableContinueButtons` — continue buttons auto-enable without waiting for async checks
- `allowManualStepNavigation` — allows clicking progress bar steps directly

### 3. Initialize Test Results File

Before starting, create `test-results.md` in this directory with the test run header.

---

## Common Helpers

These are reusable procedures referenced by name in test cases below.

### RESET

Clear browser state and navigate to the wizard:

1. `browser_evaluate` → `() => { localStorage.clear(); sessionStorage.clear(); }`
2. `browser_navigate` → `http://localhost:3000?build-mode=test`
3. `browser_wait_for` → time: 3 (allow page load and mode detection)
4. `browser_snapshot` → verify page loaded

### WAIT_AND_SNAPSHOT(seconds)

1. `browser_wait_for` → time: {seconds}
2. `browser_snapshot` → capture current state

### NAVIGATE_FRESH_TO_TEMPLATES

Navigate from Welcome through to the Templates step (assumes fresh install mode):

1. Execute **RESET**
2. Verify snapshot shows "Welcome to Kaspa All-in-One" heading
3. `browser_click` → "Get Started" button (in `#step-welcome`, button with text "Get Started")
4. `browser_wait_for` → time: 2
5. `browser_snapshot` → verify "Pre-Installation Checklist" heading visible
6. `browser_click` → `#checklist-continue` button
7. `browser_wait_for` → time: 3 (system checks run and auto-enable continues in test mode)
8. `browser_snapshot` → verify "System Requirements Check" heading
9. `browser_wait_for` → time: 2 (wait for checks to complete)
10. `browser_snapshot` → look for the continue/next button in the navigation footer
11. `browser_click` → continue/next button
12. `browser_wait_for` → time: 2
13. `browser_snapshot` → verify "Choose Your Setup Method" heading visible

### SELECT_AND_APPLY_TEMPLATE(template_id)

On the Templates step, select and apply a specific template:

1. `browser_snapshot` → find the template card with `data-template-id="{template_id}"`
2. `browser_click` → the template card
3. `browser_wait_for` → time: 1 (allow selection animation)
4. `browser_snapshot` → verify the card shows selected state
5. Look for "Use Template" or primary action button on the selected card
6. `browser_click` → the "Use Template" / action button
7. `browser_wait_for` → time: 3 (API calls: validate + apply, then 1500ms auto-navigate)
8. `browser_snapshot` → verify now on Configure step ("Configure Your Services" heading)

### COMPLETE_FLOW_TO_INSTALL

From the Configure step, proceed through Review to Install:

1. `browser_snapshot` → verify on Configure step
2. `browser_click` → continue/next button (in step-actions or navigation footer)
3. `browser_wait_for` → time: 2
4. `browser_snapshot` → verify "Review Your Configuration" heading
5. Verify review sections: profiles, resource requirements, network config, warning section
6. `browser_click` → "Start Installation" button (text "Start Installation" in `#step-review`)
7. `browser_wait_for` → time: 2
8. `browser_snapshot` → verify "Installing Kaspa All-in-One" heading, progress bar visible

### RECORD_RESULT(test_id, status, notes)

Append test result to `test-results.md`. For failures:
1. `browser_take_screenshot` → save as `{test_id}-failure.png`
2. `browser_console_messages` → level: "error" → capture errors
3. `browser_snapshot` → save snapshot text
4. Record all in test-results.md

---

## Phase 1: Reconfiguration Mode (Current State — kaspa-node installed)

> **Precondition**: kaspa-node is currently installed and running.

### Test P1.1: Reconfiguration Landing Page

**Steps**:
1. Execute **RESET**
2. `browser_wait_for` → time: 3
3. `browser_snapshot`

**Verify**:
- `#step-reconfigure-landing` is the visible/active step
- Heading: "Reconfigure Your Installation"
- Description text about modifying existing installation
- Current Installation Summary section with `#installation-summary-text`
- Status indicator showing "Checking..." then resolving
- 3 option cards in `.reconfiguration-options-grid`:
  - "Add or Remove Services" card (📦 icon)
  - "Modify Service Settings" card (⚙️ icon)
  - "View Dashboard" card (📊 icon)
- "Fresh Installation" button at bottom
- "Continue" button (`#reconfigure-continue-btn`) — should be **disabled** initially
- Build mode indicator (`#build-mode-indicator`) shows "TEST BUILD"

**Record**: RECORD_RESULT("P1.1", status, notes)

---

### Test P1.2: Installation Summary Details

**Steps**:
1. Continue from P1.1 (or re-execute RESET)
2. `browser_wait_for` → time: 5 (allow API calls to load installation details)
3. `browser_snapshot`

**Verify**:
- `#installation-summary-text` shows information about installed kaspa-node
- `#installation-details` section becomes visible with detail grid:
  - Installation date (`#installation-date`)
  - Last modified date (`#last-modified-date`)
  - Running services count (`#running-services-count`)
  - Version (`#installation-version`)
- Status indicator shows resolved state (not "Checking...")

**Record**: RECORD_RESULT("P1.2", status, notes)

---

### Test P1.3: Modify Settings Flow

**Steps**:
1. Execute **RESET**, wait for reconfig landing to load
2. `browser_wait_for` → time: 3
3. `browser_snapshot`
4. `browser_click` → "Modify Service Settings" card (the card with ⚙️ icon and "Edit Settings" button)
5. `browser_wait_for` → time: 3
6. `browser_snapshot`

**Verify**:
- `#step-settings-modification` is now visible
- Heading: "Modify Service Settings"
- Description: "Update configuration parameters for your installed services"
- `#settings-mod-container` is present and populated with kaspa-node settings
- Back/navigation controls are available

**Record**: RECORD_RESULT("P1.3", status, notes)

---

### Test P1.4: Add Services Flow (UI Only)

**Steps**:
1. Execute **RESET**, wait for reconfig landing
2. `browser_wait_for` → time: 3
3. `browser_snapshot`
4. `browser_click` → "Add or Remove Services" card (📦 icon, "Manage Services" button)
5. `browser_wait_for` → time: 1
6. `browser_snapshot` → verify the card is selected/highlighted
7. `browser_click` → "Continue" button (`#reconfigure-continue-btn`) — should now be enabled
8. `browser_wait_for` → time: 3
9. `browser_snapshot`

**Verify**:
- After clicking option card, Continue button becomes enabled
- After clicking Continue, navigates to profile/template selection in reconfiguration context
- Reconfiguration navigation breadcrumbs or context indicator visible
- Available profiles/templates are shown

**Record**: RECORD_RESULT("P1.4", status, notes)

---

## Phase 2: Service Removal (Remove kaspa-node)

> **Goal**: Remove kaspa-node so the wizard enters fresh install mode on next load.

### Test P2.1: Enter Remove Flow

**Steps**:
1. Execute **RESET**, wait for reconfig landing
2. `browser_wait_for` → time: 3
3. `browser_snapshot`
4. Look for the removal option — either:
   - Click "Add or Remove Services" → Continue → look for remove option on the profiles page
   - Or look for a dedicated remove action
5. `browser_snapshot` after each navigation step

**Verify**:
- kaspa-node appears as an installed profile with a remove/uninstall option
- Removal UI elements are accessible (remove button, confirmation dialog if any)

**Record**: RECORD_RESULT("P2.1", status, notes)

---

### Test P2.2: Remove Kaspa-Node

**Steps**:
1. Continue from P2.1
2. Click the remove/uninstall action for kaspa-node
3. If confirmation dialog appears, accept it (`browser_handle_dialog` or click confirm button)
4. `browser_wait_for` → time: 30 (removal involves stopping Docker containers)
5. `browser_snapshot` at intervals to monitor progress

**Verify**:
- Removal progresses with visible feedback (progress indicator or status messages)
- Upon completion, confirmation message that kaspa-node was removed
- System now has no installed services

**Post-condition check**:
1. `browser_navigate` → `http://localhost:3000?build-mode=test`
2. `browser_wait_for` → time: 3
3. `browser_snapshot`
4. Verify wizard now shows Welcome step (fresh install mode) — NOT reconfiguration landing

**Record**: RECORD_RESULT("P2.2", status, notes)

---

## Phase 3: Fresh Installation — All 12 Templates

> **Precondition**: No services installed. Wizard starts in fresh install mode.

### Test P3.1: Quick Start Template (FULL INSTALL)

> This is the only template test that performs a full installation to completion.

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("quick-start")**
3. `browser_snapshot` → verify Configure step

**Verify Configure step**:
- Heading: "Configure Your Services"
- Network Configuration section visible with:
  - External IP field (`#external-ip`)
  - Public Node toggle (`#public-node`)
- Indexer Endpoints section (`#indexer-endpoints-section`) may be visible for quick-start (uses public indexers)
- No Kaspa Node Configuration section (quick-start doesn't include node)

**Continue to Review**:
4. `browser_click` → continue/next button
5. `browser_wait_for` → time: 2
6. `browser_snapshot`

**Verify Review step**:
- Heading: "Review Your Configuration"
- `#review-profiles` lists kasia-app and k-social-app (or similar Quick Start profiles)
- `#review-service-count` shows service count
- Resource requirements (CPU, RAM, Disk) populated
- Warning section "Before You Continue" visible
- "Start Installation" button available

**Start Installation**:
7. `browser_click` → "Start Installation" button
8. `browser_wait_for` → time: 2
9. `browser_snapshot`

**Verify Install step starts**:
- Heading: "Installing Kaspa All-in-One"
- Progress bar (`#install-progress-bar`) at 0% or starting
- Status title (`#install-status-title`) shows "Initializing..."
- 4 install steps visible: env, pull, start, health
- Cancel button (`#cancel-install-btn`) present

**Wait for Installation**:
10. Monitor progress — take snapshots every 30 seconds:
    - `browser_wait_for` → time: 30
    - `browser_snapshot` → check progress percentage and current stage
    - Repeat until install completes or 10 minutes elapsed
11. `browser_wait_for` → text: "Installation Complete" (or timeout after 600s)

**Verify Complete step**:
12. `browser_snapshot`

- Heading: "🎉 Installation Complete!"
- Checkmark SVG (`.checkmark-svg`) visible
- Confetti animation container present
- Tour prompt with "Want a quick tour?" text
- Step description about system being up and running

**Record**: RECORD_RESULT("P3.1", status, notes)

---

### Test P3.2: Kaspa Node Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("kaspa-node")**
3. `browser_snapshot`

**Verify Configure step**:
- Kaspa Node Configuration section (`#kaspa-node-config-section`) is **visible**
- Network selector (`#kaspa-network`) with options: Mainnet (selected), Testnet
- Port Configuration display showing RPC Port: 16110, P2P Port: 16111
- "Configure Ports" button available

4. Execute **COMPLETE_FLOW_TO_INSTALL**

**Verify Review step**:
- `#review-profiles` shows kaspa-node profile

**Verify Install step loads, then cancel**:
5. `browser_snapshot` → verify install UI elements present
6. `browser_click` → `#cancel-install-btn` ("Cancel Installation")
7. `browser_wait_for` → time: 2
8. `browser_snapshot` → verify cancellation handled

**Record**: RECORD_RESULT("P3.2", status, notes)

---

### Test P3.3: Kasia Lite Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("kasia-lite")**
3. `browser_snapshot`

**Verify Configure step**:
- Indexer Endpoints section visible (uses public indexer)
- Kasia Indexer URL field (`#kasia-indexer-url`) with default `https://api.kasia.io/`
- Kaspa Node WS URL field (`#kaspa-node-ws-url`)
- No Kaspa Node Configuration section (no local node)

4. Execute **COMPLETE_FLOW_TO_INSTALL**
5. Verify install UI, then `browser_click` → `#cancel-install-btn`

**Record**: RECORD_RESULT("P3.3", status, notes)

---

### Test P3.4: K-Social Lite Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("k-social-lite")**
3. `browser_snapshot`

**Verify Configure step**:
- Indexer Endpoints section visible
- K-Social Indexer URL field (`#ksocial-indexer-url`) with default `https://indexer0.kaspatalk.net/`
- No Kaspa Node Configuration section

4. Execute **COMPLETE_FLOW_TO_INSTALL**
5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.4", status, notes)

---

### Test P3.5: Kasia Suite Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("kasia-suite")**
3. `browser_snapshot`

**Verify Configure step**:
- Kasia-specific configuration fields visible
- Local indexer configuration (not public indexer endpoints)
- Database configuration section may appear for indexer

4. Execute **COMPLETE_FLOW_TO_INSTALL**
5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.5", status, notes)

---

### Test P3.6: K-Social Suite Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("k-social-suite")**
3. `browser_snapshot`

**Verify Configure step**:
- K-Social indexer configuration fields
- TimescaleDB/PostgreSQL database configuration section visible
- Database password fields present

4. Execute **COMPLETE_FLOW_TO_INSTALL**
5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.6", status, notes)

---

### Test P3.7: Solo Miner Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("solo-miner")**
3. `browser_snapshot`

**Verify Configure step**:
- Kaspa Node Configuration section visible (includes kaspa-node)
- Mining/Stratum configuration section visible
- Mining address field (required)
- Stratum port configuration

4. Execute **COMPLETE_FLOW_TO_INSTALL**

**Verify Review step**:
- `#review-profiles` shows kaspa-node and kaspa-stratum

5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.7", status, notes)

---

### Test P3.8: Kaspa Explorer Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("kaspa-explorer")**
3. `browser_snapshot`

**Verify Configure step**:
- Explorer-specific configuration fields
- Simply-Kaspa indexer configuration

4. Execute **COMPLETE_FLOW_TO_INSTALL**
5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.8", status, notes)

---

### Test P3.9: Kaspa Sovereignty Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("kaspa-sovereignty")**
3. `browser_snapshot`

**Verify Configure step**:
- All configuration sections visible (largest template, includes everything)
- Kaspa Node Configuration section
- Indexer Endpoints section
- Database configuration
- Mining configuration (if stratum included)
- Most configuration fields of any template

4. Execute **COMPLETE_FLOW_TO_INSTALL**

**Verify Review step**:
- Multiple profiles listed
- Highest resource requirements (CPU, RAM, Disk)

5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.9", status, notes)

---

### Test P3.10: Archive Historian Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("archive-historian")**
3. `browser_snapshot`

**Verify Configure step**:
- Kaspa Node Configuration section visible
- Network selector present
- Large disk requirement noted (archive = non-pruning)

4. Execute **COMPLETE_FLOW_TO_INSTALL**

**Verify Review step**:
- `#review-profiles` shows kaspa-archive-node (NOT kaspa-node)
- `#review-disk` shows large disk requirement

5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.10", status, notes)

---

### Test P3.11: Pool Operator Template

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("pool-operator")**
3. `browser_snapshot`

**Verify Configure step**:
- Kaspa Node Configuration section (archive node)
- Mining/Stratum configuration with mining address field
- Stratum port configuration

4. Execute **COMPLETE_FLOW_TO_INSTALL**

**Verify Review step**:
- `#review-profiles` shows kaspa-archive-node and kaspa-stratum

5. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.11", status, notes)

---

### Test P3.12: Custom Setup (Manual Profile Selection)

> This test uses the custom path instead of a pre-defined template.

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. `browser_snapshot` → verify on Templates step
3. `browser_click` → `#custom-method-card` ("Build Custom" card)
4. `browser_wait_for` → time: 1
5. `browser_snapshot` → verify custom template section (`#custom-template-section`) becomes visible
6. `browser_click` → `#build-custom-btn` ("Build Custom Setup" button)
7. `browser_wait_for` → time: 2
8. `browser_snapshot`

**Verify Profiles step (Step 5)**:
- `#step-profiles` is the active step
- Heading: "Select Your Deployment Profile" (or similar)
- Profile cards visible — each with checkbox/selection control
- Available profiles include: kaspa-node, kasia-app, k-social-app, etc.

**Select profiles**:
9. `browser_click` → profile card for `kaspa-node` (`.profile-card[data-profile="kaspa-node"]` or similar)
10. `browser_wait_for` → time: 1
11. `browser_click` → profile card for `kasia-app`
12. `browser_wait_for` → time: 1
13. `browser_snapshot`

**Verify profile selection**:
- Both kaspa-node and kasia-app cards show selected state
- Resource requirements update dynamically
- No dependency warnings (kaspa-node satisfies kasia-app's node requirement)

**Continue to Configure**:
14. `browser_click` → continue/next button
15. `browser_wait_for` → time: 2
16. `browser_snapshot`

**Verify Configure step**:
- Shows configuration fields for both kaspa-node and kasia-app
- Kaspa Node Configuration section visible
- Indexer configuration may show local URLs instead of public ones

17. Execute **COMPLETE_FLOW_TO_INSTALL**
18. Verify install UI, then cancel

**Record**: RECORD_RESULT("P3.12", status, notes)

---

## Phase 4: Reconfiguration After Installation

> **Precondition**: Quick Start was installed in P3.1 (kasia-app + k-social-app running).

### Test P4.1: Verify Reconfig Mode Activates

**Steps**:
1. Execute **RESET** (clears localStorage, navigates to wizard)
2. `browser_wait_for` → time: 5 (allow mode detection and API calls)
3. `browser_snapshot`

**Verify**:
- Wizard detects installed Quick Start services
- `#step-reconfigure-landing` is active
- Heading: "Reconfigure Your Installation"
- Installation summary shows Quick Start profiles (kasia-app, k-social-app)
- Status shows services as running/installed

**Record**: RECORD_RESULT("P4.1", status, notes)

---

### Test P4.2: Add Profile (kaspa-node)

**Steps**:
1. Continue from P4.1 (or RESET and wait for reconfig landing)
2. `browser_click` → "Add or Remove Services" card
3. `browser_wait_for` → time: 1
4. `browser_click` → "Continue" button (`#reconfigure-continue-btn`)
5. `browser_wait_for` → time: 3
6. `browser_snapshot`

**Navigate to profile selection**:
7. Look for kaspa-node as an available (not-installed) profile
8. `browser_click` → kaspa-node profile card/option to add it
9. `browser_wait_for` → time: 2
10. `browser_snapshot`

**Verify**:
- kaspa-node is available for addition
- Existing profiles (kasia-app, k-social-app) shown as already installed
- After selecting kaspa-node, it shows as selected/pending addition

**Continue through flow**:
11. Navigate through configure/review steps if applicable
12. Verify the addition flow progresses correctly

**Record**: RECORD_RESULT("P4.2", status, notes)

---

### Test P4.3: Modify Settings

**Steps**:
1. Execute **RESET**, wait for reconfig landing
2. `browser_wait_for` → time: 3
3. `browser_snapshot`
4. `browser_click` → "Modify Service Settings" card (⚙️)
5. `browser_wait_for` → time: 3
6. `browser_snapshot`

**Verify settings form loads**:
- `#step-settings-modification` is active
- `#settings-mod-container` contains settings for installed services
- Current configuration values are pre-populated

**Modify a setting**:
7. Find an editable field (e.g., a port or URL setting)
8. `browser_type` or `browser_fill_form` → change the value
9. `browser_snapshot` → verify value changed
10. Look for an "Apply" or "Save" button
11. `browser_click` → apply/save if available
12. `browser_wait_for` → time: 2
13. `browser_snapshot`

**Verify**:
- Setting change is accepted (success message or updated display)

**Record**: RECORD_RESULT("P4.3", status, notes)

---

## Phase 5: UI/UX & Edge Cases

### Test D1: Back Navigation (Template Path)

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. Execute **SELECT_AND_APPLY_TEMPLATE("quick-start")**
3. Verify on Configure step
4. `browser_snapshot` → note current step
5. `browser_click` → "Back" button (button with text "Back" and ← icon in `.step-actions`)
6. `browser_wait_for` → time: 2
7. `browser_snapshot`

**Verify**:
- Returns to **Templates step** (step 4) — NOT Profiles step
- Template path skips Profiles step in both directions
- "Choose Your Setup Method" heading visible

**Record**: RECORD_RESULT("D1", status, notes)

---

### Test D2: Back Navigation (Custom Path)

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. `browser_click` → `#custom-method-card`
3. `browser_wait_for` → time: 1
4. `browser_click` → `#build-custom-btn`
5. `browser_wait_for` → time: 2
6. `browser_snapshot` → verify on Profiles step
7. Select a profile (e.g., kaspa-node)
8. `browser_click` → continue/next button to go to Configure
9. `browser_wait_for` → time: 2
10. `browser_snapshot` → verify on Configure step
11. `browser_click` → "Back" button
12. `browser_wait_for` → time: 2
13. `browser_snapshot`

**Verify**:
- Returns to **Profiles step** (step 5) — NOT Templates step
- Custom path includes Profiles step in navigation
- Profile selections are preserved

**Record**: RECORD_RESULT("D2", status, notes)

---

### Test D3: State Persistence Across Reload

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. `browser_snapshot` → verify on Templates step
3. `browser_evaluate` → `() => JSON.stringify(Object.keys(localStorage))` → note stored keys
4. `browser_navigate` → `http://localhost:3000?build-mode=test` (reload)
5. `browser_wait_for` → time: 3
6. `browser_snapshot`

**Verify**:
- Wizard resumes at the same step or close to it
- localStorage contains state data from previous session
- Navigation history is preserved

**Record**: RECORD_RESULT("D3", status, notes)

---

### Test D4: Mobile Responsiveness (375x812)

**Steps**:
1. `browser_resize` → width: 375, height: 812
2. Execute **RESET**
3. `browser_wait_for` → time: 3
4. `browser_take_screenshot` → filename: "D4-mobile-welcome.png"
5. `browser_snapshot`

**Verify Welcome**:
- No horizontal scrollbar/overflow
- Hero content stacks vertically
- "Get Started" button is full-width or easily tappable
- Feature items stack vertically

6. `browser_click` → "Get Started" → navigate to Checklist
7. `browser_take_screenshot` → filename: "D4-mobile-checklist.png"

**Verify Checklist**:
- Checklist items are full-width
- Expandable sections work
- Buttons are touch-friendly

8. Continue to Templates step
9. `browser_take_screenshot` → filename: "D4-mobile-templates.png"

**Verify Templates**:
- Template cards stack in single column
- Category tabs are scrollable or wrap
- Cards are fully visible without horizontal scroll

10. `browser_resize` → width: 1280, height: 800 (restore)

**Record**: RECORD_RESULT("D4", status, notes)

---

### Test D5: Tablet Responsiveness (768x1024)

**Steps**:
1. `browser_resize` → width: 768, height: 1024
2. Execute **RESET**
3. `browser_wait_for` → time: 3
4. `browser_take_screenshot` → filename: "D5-tablet-welcome.png"
5. Navigate to Templates step
6. `browser_take_screenshot` → filename: "D5-tablet-templates.png"
7. `browser_snapshot`

**Verify**:
- Template cards in 2-column grid (or adjusted layout)
- Navigation is usable
- Form fields are appropriately sized
- No content overflow

8. `browser_resize` → width: 1280, height: 800 (restore)

**Record**: RECORD_RESULT("D5", status, notes)

---

### Test D6: Desktop Full Width (1920x1080)

**Steps**:
1. `browser_resize` → width: 1920, height: 1080
2. Execute **RESET**
3. `browser_wait_for` → time: 3
4. `browser_take_screenshot` → filename: "D6-desktop-welcome.png"
5. Navigate to Templates step
6. `browser_take_screenshot` → filename: "D6-desktop-templates.png"
7. `browser_snapshot`

**Verify**:
- Full multi-column layout utilized
- Template cards in 3+ column grid
- Content is well-centered, not stretched edge-to-edge
- Good visual hierarchy

8. `browser_resize` → width: 1280, height: 800 (restore)

**Record**: RECORD_RESULT("D6", status, notes)

---

### Test D7: Category Tab Filtering

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. `browser_snapshot` → count visible template cards (should be all 12 with "All Templates" active)

3. `browser_click` → "Beginner" tab (`.category-tab[data-category="beginner"]`)
4. `browser_wait_for` → time: 1
5. `browser_snapshot` → count visible templates

**Verify Beginner**: ~4 templates (quick-start, kaspa-node, kasia-lite, k-social-lite)

6. `browser_click` → "Intermediate" tab
7. `browser_wait_for` → time: 1
8. `browser_snapshot`

**Verify Intermediate**: ~4 templates (kasia-suite, k-social-suite, solo-miner, kaspa-explorer)

9. `browser_click` → "Advanced" tab
10. `browser_wait_for` → time: 1
11. `browser_snapshot`

**Verify Advanced**: ~4 templates (kaspa-sovereignty, archive-historian, pool-operator)

12. `browser_click` → "All Templates" tab
13. `browser_wait_for` → time: 1
14. `browser_snapshot`

**Verify All**: All 12 templates visible again

**Record**: RECORD_RESULT("D7", status, notes)

---

### Test D8: Template Details Modal

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES**
2. `browser_snapshot` → find a template card (e.g., quick-start)
3. Look for a "Details" or secondary button on the template card (`.template-btn-secondary`)
4. `browser_click` → the details button
5. `browser_wait_for` → time: 1
6. `browser_snapshot`

**Verify Modal Opens**:
- `#template-details-modal` is visible (not `display: none`)
- Modal overlay covers background
- `#template-modal-title` shows the template name
- `#template-details-content` contains:
  - Template description
  - Features list
  - Resource requirements
- Modal footer has "Cancel" button and "Use This Template" (`#apply-template-btn`) button

**Test Cancel**:
7. `browser_click` → "Cancel" button in modal
8. `browser_wait_for` → time: 1
9. `browser_snapshot`

**Verify Modal Closes**:
- `#template-details-modal` is hidden
- Templates step still visible

**Test Use This Template**:
10. Re-open modal (click details on same template)
11. `browser_click` → "Use This Template" (`#apply-template-btn`)
12. `browser_wait_for` → time: 3
13. `browser_snapshot`

**Verify**:
- Template is applied
- Wizard navigates to Configure step

**Record**: RECORD_RESULT("D8", status, notes)

---

### Test D9: Test Mode Indicator

**Steps**:
1. Execute **RESET**
2. `browser_wait_for` → time: 2
3. `browser_snapshot`

**Verify**:
- `#build-mode-indicator` element is present in the DOM
- Contains text "TEST BUILD" (or "TEST" in uppercase)
- Positioned fixed at bottom-right of viewport
- Has distinctive styling (background color, monospace font)

4. `browser_evaluate` → `() => { const el = document.getElementById('build-mode-indicator'); return el ? { text: el.textContent, display: getComputedStyle(el).display, position: getComputedStyle(el).position } : null; }`

**Verify computed values**:
- text contains "TEST"
- display is not "none"
- position is "fixed"

**Record**: RECORD_RESULT("D9", status, notes)

---

### Test D10: Visual Baseline Screenshots

> Capture reference screenshots at each major step for future visual comparison.

**Steps**:
1. Execute **NAVIGATE_FRESH_TO_TEMPLATES** (captures Welcome, Checklist, System Check along the way)

At each step, take a screenshot:

2. After Welcome loads: `browser_take_screenshot` → filename: "baseline-01-welcome.png"
3. After Checklist: `browser_take_screenshot` → filename: "baseline-02-checklist.png"
4. After System Check: `browser_take_screenshot` → filename: "baseline-03-system-check.png"
5. At Templates: `browser_take_screenshot` → filename: "baseline-04-templates.png"

Navigate to custom path for Profiles:
6. `browser_click` → `#custom-method-card`
7. `browser_click` → `#build-custom-btn`
8. `browser_wait_for` → time: 2
9. `browser_take_screenshot` → filename: "baseline-05-profiles.png"

Select a profile and continue:
10. Select kaspa-node, continue to Configure
11. `browser_take_screenshot` → filename: "baseline-06-configure.png"

Continue to Review:
12. `browser_click` → continue
13. `browser_wait_for` → time: 2
14. `browser_take_screenshot` → filename: "baseline-07-review.png"

Start Install:
15. `browser_click` → "Start Installation"
16. `browser_wait_for` → time: 2
17. `browser_take_screenshot` → filename: "baseline-08-install.png"
18. `browser_click` → `#cancel-install-btn`

Navigate to reconfig mode:
19. `browser_navigate` → `http://localhost:3000?mode=reconfigure&build-mode=test`
20. `browser_wait_for` → time: 3
21. `browser_take_screenshot` → filename: "baseline-09-reconfig-landing.png"

**Record**: RECORD_RESULT("D10", status, notes) with list of saved screenshot filenames

---

## Appendix: Element Reference

Quick lookup for MCP tool `ref` parameters (use `browser_snapshot` to get exact refs at runtime):

| Element | HTML ID / Selector | Notes |
|---------|-------------------|-------|
| Welcome step | `#step-welcome` | First active step |
| Get Started | Button with "Get Started" text | `onclick="nextStep()"` |
| Checklist step | `#step-checklist` | |
| Checklist continue | `#checklist-continue` | May be disabled until checks pass |
| System check step | `#step-system-check` | |
| Check items | `.check-item` (4 total) | Docker, Compose, Resources, Ports |
| Templates step | `#step-templates` | |
| Template method: Use Template | `#template-method-card` | Has `.recommended` class |
| Template method: Build Custom | `#custom-method-card` | |
| Build Custom button | `#build-custom-btn` | Inside `#custom-template-section` |
| Category tabs | `.category-tab[data-category="X"]` | all, beginner, intermediate, advanced, custom |
| Template grid | `#template-grid` | Cards loaded dynamically |
| Template details modal | `#template-details-modal` | `display: none` by default |
| Modal title | `#template-modal-title` | |
| Apply template (modal) | `#apply-template-btn` | "Use This Template" |
| Profiles step | `#step-profiles` | Only visible on custom path |
| Configure step | `#step-configure` | |
| External IP | `#external-ip` | Text input |
| Public Node toggle | `#public-node` | Checkbox |
| Kaspa Node config | `#kaspa-node-config-section` | `display: none` by default |
| Network select | `#kaspa-network` | mainnet/testnet |
| Indexer endpoints | `#indexer-endpoints-section` | `display: none` by default |
| Review step | `#step-review` | |
| Review profiles | `#review-profiles` | |
| Review service count | `#review-service-count` | |
| Review CPU/RAM/Disk | `#review-cpu`, `#review-ram`, `#review-disk` | |
| Install step | `#step-install` | |
| Progress bar | `#install-progress-bar` | Width percentage = progress |
| Progress % text | `#install-progress-percentage` | |
| Status title | `#install-status-title` | |
| Status message | `#install-status-message` | |
| Install stages | `.install-step[data-step="X"]` | env, pull, start, health |
| Install logs | `#install-logs-content` | Hidden by default |
| Cancel install | `#cancel-install-btn` | |
| Install continue | `#install-continue-btn` | Disabled until complete |
| Complete step | `#step-complete` | |
| Checkmark SVG | `.checkmark-svg` | Success icon |
| Reconfig landing | `#step-reconfigure-landing` | `display: none` by default |
| Reconfig options grid | `.reconfiguration-options-grid` | 3 cards |
| Reconfig continue | `#reconfigure-continue-btn` | Disabled initially |
| Fresh install button | Button with "Fresh Installation" text | `onclick="goToInitialMode()"` |
| Settings mod step | `#step-settings-modification` | `display: none` by default |
| Settings container | `#settings-mod-container` | |
| Build mode indicator | `#build-mode-indicator` | Fixed position, test mode only |

---

## Failure Handling Protocol

### Classification

| Type | Action |
|------|--------|
| **Soft failure** (cosmetic, non-blocking) | Record in test-results.md with screenshot, continue testing |
| **Hard bug** (blocks test continuation) | Record, read source code, fix the bug, re-run failed test, then continue |
| **Environment issue** (backend down, Docker unavailable) | Record, attempt recovery, skip dependent tests |

### For Hard Bugs

1. Take screenshot and snapshot of the failure
2. Capture console errors: `browser_console_messages` → level: "error"
3. Read the relevant source file(s) to diagnose
4. Make the **minimal fix** to unblock
5. Re-run the specific failing test to confirm
6. Continue with remaining tests
7. Document all fixes in test-results.md summary
