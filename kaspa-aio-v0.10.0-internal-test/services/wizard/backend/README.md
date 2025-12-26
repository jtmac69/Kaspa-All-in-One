# Kaspa Wizard Backend

Backend API server for the Kaspa All-in-One Installation Wizard.

## Starting the Server

### IMPORTANT: Host-Based Execution

**The wizard ALWAYS runs on the host system, never in a container.**

This design choice is intentional:
- Can install Docker if not present (chicken-and-egg problem)
- Direct access to system resources for validation
- Can modify docker-compose files and .env directly
- Simpler PROJECT_ROOT handling (always repository root)
- No container overhead

### Production & Development

Use the `start-local.sh` script which automatically sets `PROJECT_ROOT` to the repository root:

```bash
# From repository root
./services/wizard/backend/start-local.sh

# Or using npm script
cd services/wizard/backend
npm run start:local
```

This script:
- Detects the repository root automatically
- Sets `PROJECT_ROOT` environment variable
- Starts the server with correct paths

**DO NOT** use `node src/server.js` or `npm start` directly for testing, as they won't set PROJECT_ROOT correctly!

## Running Tests

Tests should be run with the server started using `start-local.sh`:

```bash
# Terminal 1: Start server
./services/wizard/backend/start-local.sh

# Terminal 2: Run tests
node services/wizard/backend/test-update-mode.js

# Or using npm
cd services/wizard/backend
npm test
```

## PROJECT_ROOT Explained

The wizard needs to know where the repository root is to access configuration files:

- `.env` - Environment variables
- `docker-compose.yml` - Service definitions  
- `.kaspa-aio/installation-state.json` - Installation state
- `.kaspa-backups/` - Configuration backups

### How PROJECT_ROOT is Determined

1. **Environment Variable** (if set): `process.env.PROJECT_ROOT`
2. **Auto-Detection** (fallback): `path.resolve(__dirname, '../../../..')` (4 levels up from server.js)
3. **start-local.sh** (recommended): Explicitly sets PROJECT_ROOT to repository root

```
PROJECT_ROOT=/home/user/kaspa-aio (auto-detected or set by start-local.sh)
Repository at: /home/user/kaspa-aio
```

The wizard code now defaults to auto-detecting the repository root, so it works correctly whether started with `start-local.sh` or directly with `node src/server.js`.

## Common Issues

### Issue: Tests fail with "No installation state found"

**Cause**: Server started without PROJECT_ROOT set correctly

**Solution**: Use `start-local.sh` instead of `node src/server.js`

```bash
# ❌ Wrong
node services/wizard/backend/src/server.js

# ✅ Correct
./services/wizard/backend/start-local.sh
```

### Issue: Server can't find configuration files

**Cause**: PROJECT_ROOT pointing to wrong directory

**Solution**: Check that start-local.sh is being used and PROJECT_ROOT is set:

```bash
# Check PROJECT_ROOT in server output
./services/wizard/backend/start-local.sh
# Should show: PROJECT_ROOT: /path/to/kaspa-aio
```

### Issue: Port 3000 already in use

**Cause**: Another wizard instance is running

**Solution**: Kill existing process

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or stop wizard container
./scripts/wizard.sh stop
```

## API Endpoints

### Update Mode Endpoints

- `GET /api/wizard/updates/available` - Check for available updates
- `POST /api/wizard/updates/apply` - Apply selected updates
- `POST /api/wizard/updates/rollback` - Rollback failed updates
- `GET /api/wizard/updates/changelog/:service/:version` - Get changelog

See [UPDATE_MODE_QUICK_REFERENCE.md](../../../docs/quick-references/UPDATE_MODE_QUICK_REFERENCE.md) for detailed API documentation.

## Development Workflow

1. **Start server for development**
   ```bash
   ./services/wizard/backend/start-local.sh
   ```

2. **Make code changes**
   - Edit files in `src/`
   - Server needs manual restart (or use nodemon)

3. **Run tests**
   ```bash
   node services/wizard/backend/test-update-mode.js
   ```

4. **Test in browser**
   ```bash
   open http://localhost:3000
   ```

5. **Stop server**
   ```bash
   # Ctrl+C in terminal, or:
   lsof -ti:3000 | xargs kill
   ```

## File Structure

```
services/wizard/backend/
├── src/
│   ├── api/              # API route handlers
│   │   ├── update.js     # Update mode endpoints
│   │   ├── reconfigure.js
│   │   └── ...
│   ├── utils/            # Utility modules
│   ├── middleware/       # Express middleware
│   └── server.js         # Main server file
├── start-local.sh        # Local development start script
├── test-update-mode.js   # Update mode tests
├── package.json
└── README.md             # This file
```

## Environment Variables

- `PROJECT_ROOT` - Repository root path (auto-set by start-local.sh)
- `WIZARD_PORT` - Server port (default: 3000)
- `WIZARD_MODE` - Wizard mode: install, reconfigure, update
- `NODE_ENV` - Environment: development, production

## Related Documentation

- [Update Mode Implementation](../../../docs/implementation-summaries/wizard/UPDATE_MODE_IMPLEMENTATION.md)
- [Update Mode Quick Reference](../../../docs/quick-references/UPDATE_MODE_QUICK_REFERENCE.md)
- [Wizard Integration Guide](../../../docs/wizard-integration.md)
