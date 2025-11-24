# Core Profile Test Quick Reference

**Quick guide for running the Core profile end-to-end test**

## Quick Start

```bash
# Run the test
./test-wizard-core-profile.sh

# With verbose output
./test-wizard-core-profile.sh --verbose

# Keep services running after test
./test-wizard-core-profile.sh --no-cleanup
```

## What It Tests

The test validates the complete wizard installation workflow for the Core profile:

1. ✅ Docker and Docker Compose prerequisites
2. ✅ Wizard service startup
3. ✅ Frontend loads correctly
4. ✅ System check API works
5. ✅ Core profile is available
6. ✅ Configuration generation
7. ✅ Installation completes successfully
8. ✅ Services are validated
9. ✅ Docker containers are running
10. ✅ Dashboard is accessible

## Core Profile Services

- **kaspa-node** - Kaspa blockchain node
- **dashboard** - Web monitoring dashboard
- **nginx** - Reverse proxy

## Requirements

- Docker installed and running
- Docker Compose available
- 4GB RAM minimum (8GB recommended)
- 100GB disk minimum (500GB recommended)
- Ports available: 16110, 16111, 3001, 80, 443, 8080

## Command Options

```bash
--verbose, -v      Enable detailed output
--no-cleanup       Keep services running after test
--port PORT        Wizard port (default: 3000)
--timeout SEC      Installation timeout (default: 300)
--help, -h         Show help message
```

## Expected Duration

- **Typical**: 3-5 minutes
- **First run**: 5-10 minutes (image downloads)

## Success Indicators

✅ All 10 tests pass  
✅ Core services running  
✅ Dashboard accessible at http://localhost:8080  
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
# Use different wizard port
./test-wizard-core-profile.sh --port 3001
```

### Installation Timeout
```bash
# Increase timeout to 10 minutes
./test-wizard-core-profile.sh --timeout 600
```

### View Logs
```bash
# Wizard logs
docker compose logs wizard

# Service logs
docker compose logs kaspa-node
docker compose logs dashboard
```

## After Testing

### Keep Services Running
```bash
# Run test without cleanup
./test-wizard-core-profile.sh --no-cleanup

# Access dashboard
open http://localhost:8080
```

### Stop Services
```bash
# Stop Core profile services
docker compose --profile core down

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
./test-wizard-core-profile-mock.sh
```

This validates:
- Test script exists and is executable
- All required functions present
- Error handling configured
- API endpoints covered
- Documentation present

## Files

- `test-wizard-core-profile.sh` - Main test script
- `test-wizard-core-profile-mock.sh` - Mock validation
- `docs/implementation-summaries/testing/CORE_PROFILE_TEST_IMPLEMENTATION.md` - Full documentation

## Next Steps

After Core profile test passes:
1. Test other profiles (Production, Explorer, Archive, Mining, Development)
2. Run error scenario tests (Task 2.2)
3. Test wizard navigation (Task 2.3)
4. Create comprehensive test script (Task 2.4)

## Related Documentation

- [Core Profile Test Implementation](../implementation-summaries/testing/CORE_PROFILE_TEST_IMPLEMENTATION.md)
- [Testing Quick Reference](TESTING_QUICK_REFERENCE.md)
- [Wizard Testing Guide](../wizard-testing-guide.md)

## Support

If tests fail:
1. Check prerequisites (Docker, resources)
2. Review logs (wizard, services)
3. Verify system requirements
4. Check port availability
5. Increase timeout if needed

For persistent issues, run with `--verbose` and save output for debugging.
