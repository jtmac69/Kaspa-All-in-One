# Explorer Profile Test Quick Reference

**Quick guide for running the Explorer profile end-to-end test**

## Quick Start

```bash
# Run the test
./test-wizard-explorer-profile.sh

# With verbose output
./test-wizard-explorer-profile.sh --verbose

# Keep services running after test
./test-wizard-explorer-profile.sh --no-cleanup
```

## What It Tests

The test validates the complete wizard installation workflow for the Explorer profile:

1. ✅ Docker and Docker Compose prerequisites
2. ✅ Wizard service startup
3. ✅ Frontend loads correctly
4. ✅ System check API works
5. ✅ Explorer profile is available
6. ✅ Configuration generation (with dependency)
7. ✅ Installation completes successfully
8. ✅ Services are validated
9. ✅ Explorer services running (timescaledb, indexer)
10. ✅ Core dependency services running
11. ✅ TimescaleDB is accessible

## Explorer Profile Services

- **timescaledb** - PostgreSQL with TimescaleDB extension
- **simply-kaspa-indexer** - Blockchain indexer

**Plus Core dependency** (automatically installed):
- **kaspa-node** - Kaspa blockchain node
- **dashboard** - Web monitoring dashboard
- **nginx** - Reverse proxy

## Requirements

- Docker installed and running
- Docker Compose available
- 8GB RAM minimum (16GB recommended)
- 500GB disk minimum (2TB recommended)
- Ports available: 5432, 3006, 16110, 16111, 3001, 80, 443, 8080

## Command Options

```bash
--verbose, -v      Enable detailed output
--no-cleanup       Keep services running after test
--port PORT        Wizard port (default: 3000)
--timeout SEC      Installation timeout (default: 600)
--help, -h         Show help message
```

## Expected Duration

- **Typical**: 5-10 minutes
- **First run**: 10-15 minutes (image downloads + database init)

## Success Indicators

✅ All 11 tests pass  
✅ Explorer services running  
✅ Core services running (dependency)  
✅ TimescaleDB accessible on port 5432  
✅ No errors during installation

## Troubleshooting

### Docker Not Running
```bash
# Check Docker status
docker ps

# Start Docker daemon
sudo systemctl start docker  # Linux
# or use Docker Desktop on Mac/Windows
```

### Port Conflicts
```bash
# Check if port 5432 is in use
lsof -i :5432

# Use different wizard port
./test-wizard-explorer-profile.sh --port 3001
```

### Installation Timeout
```bash
# Increase timeout to 15 minutes
./test-wizard-explorer-profile.sh --timeout 900
```

### TimescaleDB Not Ready
```bash
# Check database logs
docker compose logs timescaledb

# Wait longer for initialization
# Database can take 2-3 minutes to fully start
```

### View Logs
```bash
# Wizard logs
docker compose logs wizard

# TimescaleDB logs
docker compose logs timescaledb

# Indexer logs
docker compose logs simply-kaspa-indexer

# All services
docker compose logs
```

## After Testing

### Keep Services Running
```bash
# Run test without cleanup
./test-wizard-explorer-profile.sh --no-cleanup

# Access dashboard
open http://localhost:8080

# Connect to database
psql -h localhost -U kaspa -d simply_kaspa
```

### Stop Services
```bash
# Stop Explorer profile services
docker compose --profile explorer down

# Stop all services (including Core)
docker compose --profile explorer --profile core down

# Stop wizard
docker compose --profile wizard down
```

### Clean Up
```bash
# Remove all containers and volumes
docker compose down -v
```

## Validation Without Docker

If Docker is not available, validate the test script structure:

```bash
# Run mock validation
./test-wizard-explorer-profile-mock.sh
```

This validates:
- Test script exists and is executable
- All required functions present (11 functions)
- Error handling configured
- API endpoints covered
- Explorer services covered
- Core dependency checked
- Documentation present

## Database Access

After successful installation:

```bash
# Connect to TimescaleDB
psql -h localhost -U kaspa -d simply_kaspa

# Check tables
\dt

# Check hypertables (time-series tables)
SELECT * FROM timescaledb_information.hypertables;

# Query indexed data
SELECT * FROM blocks LIMIT 10;
```

## Files

- `test-wizard-explorer-profile.sh` - Main test script
- `test-wizard-explorer-profile-mock.sh` - Mock validation
- `docs/implementation-summaries/testing/EXPLORER_PROFILE_TEST_IMPLEMENTATION.md` - Full documentation

## Next Steps

After Explorer profile test passes:
1. Test Production profile (depends on Core + Explorer)
2. Test Archive profile (depends on Core + Explorer)
3. Test Mining profile (depends on Core)
4. Test Development profile (depends on Core)
5. Run error scenario tests (Task 2.2)
6. Test wizard navigation (Task 2.3)

## Related Documentation

- [Explorer Profile Test Implementation](../implementation-summaries/testing/EXPLORER_PROFILE_TEST_IMPLEMENTATION.md)
- [Core Profile Test](CORE_PROFILE_TEST_QUICK_REFERENCE.md)
- [Testing Quick Reference](TESTING_QUICK_REFERENCE.md)
- [Wizard Testing Guide](../wizard-testing-guide.md)

## Key Differences from Core Profile

- **Longer timeout**: 600s vs 300s (database initialization)
- **More services**: 5 total (2 Explorer + 3 Core)
- **Database check**: TimescaleDB accessibility test
- **Dependency test**: Verifies Core profile is installed

## Support

If tests fail:
1. Check prerequisites (Docker, resources)
2. Review logs (wizard, timescaledb, indexer)
3. Verify system requirements (8GB RAM minimum)
4. Check port availability (especially 5432)
5. Increase timeout if needed (--timeout 900)
6. Wait for database initialization (can take 2-3 minutes)

For persistent issues, run with `--verbose` and save output for debugging.
