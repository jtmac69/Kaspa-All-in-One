# Wizard Quick Reference Card

## Essential Commands

### Starting the Wizard

```bash
# First-time installation
./scripts/wizard.sh start

# Modify existing configuration
./scripts/wizard.sh reconfigure

# Check status
./scripts/wizard.sh status

# View logs
./scripts/wizard.sh logs

# Stop wizard
./scripts/wizard.sh stop
```

### Testing

```bash
# Run all tests
./test-wizard-integration.sh

# Verbose output
./test-wizard-integration.sh --verbose

# Skip cleanup (debugging)
./test-wizard-integration.sh --no-cleanup
```

## Wizard URL

**Default:** http://localhost:3000

**Custom port:**
```bash
export WIZARD_PORT=8888
./scripts/wizard.sh start
```

## Profiles at a Glance

| Profile | RAM | Disk | Services |
|---------|-----|------|----------|
| **Core** | 4GB | 100GB | Node, Dashboard, Nginx |
| **Production** | 8GB | 200GB | Core + Apps |
| **Explorer** | 16GB | 500GB | Core + Indexers |
| **Archive** | 32GB | 1TB+ | Explorer + Archive DB |
| **Mining** | 4GB | 100GB | Core + Stratum |
| **Development** | 16GB | 500GB | All + Dev Tools |

## Common Issues

### Wizard Won't Start
```bash
# Check port
lsof -i :3000

# Check Docker
docker ps

# View logs
docker logs kaspa-wizard

# Rebuild
docker compose --profile wizard build wizard
```

### Installation Fails
```bash
# Check disk space
df -h

# Check logs
docker logs kaspa-wizard

# Retry
./scripts/wizard.sh restart install
```

### Can't Access Dashboard
```bash
# Check if running
docker ps | grep dashboard

# Check logs
docker logs kaspa-dashboard

# Check port
docker port kaspa-dashboard
```

## API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# System check
curl http://localhost:3000/api/system-check

# Profiles
curl http://localhost:3000/api/profiles

# Wizard mode
curl http://localhost:3000/api/wizard/mode
```

## Service Management

```bash
# Start services
docker compose --profile core up -d

# Stop services
docker compose down

# View logs
docker logs kaspa-node

# Restart service
docker compose restart kaspa-node

# Check status
docker ps
```

## Backup and Restore

```bash
# Backup configuration
cp .env .env.backup.$(date +%Y%m%d)

# Restore configuration
cp .env.backup.20241120 .env
docker compose down
docker compose --profile core up -d

# List backups
ls -la .env.backup.*
```

## Troubleshooting Steps

1. **Check wizard status:** `./scripts/wizard.sh status`
2. **View logs:** `docker logs kaspa-wizard`
3. **Run tests:** `./test-wizard-integration.sh`
4. **Check Docker:** `docker ps`
5. **Check disk space:** `df -h`
6. **Restart wizard:** `./scripts/wizard.sh restart install`

## Getting Help

- **User Guide:** [docs/wizard-user-guide.md](wizard-user-guide.md)
- **Testing Guide:** [docs/wizard-testing-guide.md](wizard-testing-guide.md)
- **Quick Start:** [services/wizard/QUICKSTART.md](../services/wizard/QUICKSTART.md)
- **Integration:** [services/wizard/INTEGRATION.md](../services/wizard/INTEGRATION.md)

## Test Coverage

**Total Tests:** 44

- Basic Integration: 15 tests
- Profile Testing: 18 tests (6 profiles × 3 tests)
- Reconfiguration: 3 tests
- Error Handling: 8 tests

**Expected Pass Rate:** 100%

## Security Reminders

✅ Stop wizard after configuration  
✅ Use auto-generated passwords  
✅ Keep configuration backed up  
✅ Don't expose wizard port publicly  
✅ Use HTTPS in production  

## Next Steps After Installation

1. Access dashboard: http://localhost:8080
2. Check services: `docker ps`
3. View logs: `docker logs kaspa-node`
4. Stop wizard: `./scripts/wizard.sh stop`
5. Monitor sync: `docker logs -f kaspa-node`

---

**Quick Links:**
- [Complete User Guide](wizard-user-guide.md)
- [Testing Guide](wizard-testing-guide.md)
- [Main README](../README.md)
