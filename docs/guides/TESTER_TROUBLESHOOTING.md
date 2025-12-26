# Tester Troubleshooting Guide

## Common Issues and Solutions

### Issue: Wizard Jumps to Step 3 (System Check)

**Symptoms:**
- When you open the wizard, it briefly shows step 1, then jumps to step 3
- The system check page shows spinning indicators that never complete
- You can't get back to the welcome page

**Why This Happens:**
The wizard detected configuration files from a previous test run (`.env` and `docker-compose.override.yml`). When these files exist, the wizard thinks you're reconfiguring an existing installation and skips the welcome/checklist steps.

**Solution 1: Restart Wizard with Reset (Recommended)**

Use the restart script with reset option:

```bash
./restart-wizard.sh
```

When prompted "Reset to fresh state?", answer **y** (yes).

Then in your browser:
1. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac) to hard refresh
2. Or open DevTools (F12), right-click the refresh button, and select "Empty Cache and Hard Reload"

**Solution 2: Manual Cleanup**

If the restart script doesn't work, manually remove the configuration files:

```bash
# Stop the wizard
kill $(cat /tmp/kaspa-wizard.pid)

# Remove configuration files
rm -f .env docker-compose.override.yml

# Restart wizard
./start-test.sh
```

Then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R).

**Solution 3: Full Cleanup**

For a complete fresh start:

```bash
./cleanup-test.sh
```

Answer **y** to all prompts, then:

```bash
./start-test.sh
```

---

### Issue: System Check Stuck Spinning

**Symptoms:**
- System check page shows all checks with spinning indicators
- Checks never complete (even after several minutes)
- Continue button stays disabled

**Why This Happens:**
This was a bug in the wizard where the system check function wasn't being called due to a step ID mismatch. This has been fixed, but you need to restart the wizard to pick up the fix.

**Solution:**

```bash
./restart-wizard.sh
```

Answer **y** to reset, then hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R).

The system checks should now complete within 2-3 seconds.

---

### Issue: Changes to Code Not Showing Up

**Symptoms:**
- You updated wizard code but don't see changes
- Bug fixes aren't taking effect
- Old behavior persists

**Why This Happens:**
The wizard backend serves the JavaScript files, and your browser caches them. You need to restart the server AND clear the browser cache.

**Solution:**

```bash
./restart-wizard.sh
```

Then in your browser, do a **hard refresh**:
- **Windows/Linux**: Ctrl+Shift+R
- **Mac**: Cmd+Shift+R
- **Alternative**: Open DevTools (F12), right-click refresh button, select "Empty Cache and Hard Reload"

---

### Issue: "Start Over" Button Doesn't Work

**Symptoms:**
- Clicking "Start Over" in the wizard doesn't reset to step 1
- Wizard still shows previous progress
- Configuration is still loaded

**Why This Happens:**
The "Start Over" button clears browser localStorage but doesn't remove the configuration files on disk. The wizard detects these files and enters reconfiguration mode.

**Solution:**

Use the restart script instead:

```bash
./restart-wizard.sh
```

Answer **y** to reset, then hard refresh your browser.

---

### Issue: Wizard Won't Start

**Symptoms:**
- `./start-test.sh` fails
- Error message about port already in use
- Can't access http://localhost:3000

**Solution 1: Check if Wizard is Already Running**

```bash
# Check if wizard is running
curl http://localhost:3000/api/health

# If it responds, wizard is already running
# Just open http://localhost:3000 in your browser
```

**Solution 2: Kill Existing Process**

```bash
# Stop any existing wizard
kill $(cat /tmp/kaspa-wizard.pid) 2>/dev/null

# Wait a moment
sleep 2

# Start fresh
./start-test.sh
```

**Solution 3: Check for Port Conflicts**

```bash
# See what's using port 3000
lsof -i :3000

# Or on some systems
netstat -tulpn | grep 3000

# Kill the process using port 3000
kill <PID>
```

---

### Issue: Browser Shows Old Cached Version

**Symptoms:**
- Wizard looks different than expected
- Missing features or buttons
- Old styling

**Solution:**

Do a **hard refresh** to clear browser cache:

1. **Windows/Linux**: Press Ctrl+Shift+R
2. **Mac**: Press Cmd+Shift+R
3. **Alternative Method**:
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

4. **Nuclear Option** (if above doesn't work):
   - Open DevTools (F12)
   - Go to Application tab (Chrome) or Storage tab (Firefox)
   - Click "Clear storage" or "Clear site data"
   - Reload the page

---

## Quick Reference Commands

### Restart Wizard (Keep State)
```bash
./restart-wizard.sh
# Answer 'n' when asked to reset
```

### Restart Wizard (Fresh Start)
```bash
./restart-wizard.sh
# Answer 'y' when asked to reset
# Then hard refresh browser (Ctrl+Shift+R)
```

### Complete Cleanup
```bash
./cleanup-test.sh
# Answer 'y' to all prompts
./start-test.sh
```

### Check Wizard Status
```bash
# Check if wizard is running
curl http://localhost:3000/api/health

# Check wizard mode
curl http://localhost:3000/api/wizard/mode | jq .

# View wizard logs
tail -f /tmp/kaspa-wizard.log
```

### Manual Wizard Control
```bash
# Stop wizard
kill $(cat /tmp/kaspa-wizard.pid)

# Start wizard manually
cd services/wizard/backend
node src/server.js
```

---

## Browser Developer Tools Tips

### Open DevTools
- **Windows/Linux**: F12 or Ctrl+Shift+I
- **Mac**: Cmd+Option+I

### View Console Logs
1. Open DevTools (F12)
2. Click "Console" tab
3. Look for errors (red text) or warnings (yellow text)

### Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button (while DevTools is open)
3. Select "Empty Cache and Hard Reload"

### Disable Cache (for testing)
1. Open DevTools (F12)
2. Click "Network" tab
3. Check "Disable cache" checkbox
4. Keep DevTools open while testing

---

## Getting Help

If none of these solutions work:

1. **Check the logs**:
   ```bash
   tail -50 /tmp/kaspa-wizard.log
   ```

2. **Check browser console**:
   - Open DevTools (F12)
   - Look for errors in Console tab

3. **Report the issue**:
   - Include the error message
   - Include steps to reproduce
   - Include your OS and browser version
   - Include relevant log snippets

4. **Ask in GitHub Discussions**:
   - [Link to discussions]

5. **Open a bug report**:
   - [Link to issues]

---

## Prevention Tips

### For Testers

1. **Always hard refresh after restarting wizard**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

2. **Use restart-wizard.sh instead of manually killing processes**
   - It handles cleanup properly
   - It prompts for state reset

3. **Check wizard mode before testing**
   ```bash
   curl http://localhost:3000/api/wizard/mode | jq .mode
   ```
   - Should be "initial" for fresh installation testing
   - Will be "reconfigure" if config files exist

4. **Keep DevTools open with cache disabled during testing**
   - Prevents cache-related issues
   - Shows console errors immediately

---

## Understanding Wizard Modes

The wizard has different modes based on what it detects:

### Initial Mode
- **When**: No configuration files exist
- **Behavior**: Starts from step 1 (Welcome)
- **Use Case**: First-time installation

### Reconfigure Mode
- **When**: Configuration files exist (`.env`, `docker-compose.override.yml`)
- **Behavior**: Jumps to step 3 (skips welcome/checklist)
- **Use Case**: Modifying existing installation

### Update Mode
- **When**: Installation state exists with specific phase
- **Behavior**: Resumes from last step
- **Use Case**: Continuing interrupted installation

**For testing fresh installations**, you want **Initial Mode**. Use `./restart-wizard.sh` with reset to ensure this.

---

**Last Updated**: November 26, 2024  
**Version**: v0.9.0-test
