# Kaspa All-in-One v0.10.0 - Testing Quick Reference

## Quick Start Commands

### Essential Commands
```bash
# Extract and start testing
tar -xzf kaspa-aio-v0.10.0-internal-test.tar.gz
cd kaspa-aio-v0.10.0-internal-test
./start-internal-test.sh

# Access services
# Wizard: http://localhost:3000
# Dashboard: http://localhost:8080
```

### Core Testing Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `start-internal-test.sh` | Start testing environment | `./start-internal-test.sh` |
| `stop-internal-test.sh` | Stop all services | `./stop-internal-test.sh` |
| `status-internal-test.sh` | Check service status | `./status-internal-test.sh` |
| `cleanup-internal-test.sh` | Complete cleanup | `./cleanup-internal-test.sh` |
| `logs-internal-test.sh` | View logs | `./logs-internal-test.sh [service] [lines]` |
| `test-scenarios-v0.10.0.sh` | Automated testing | `./test-scenarios-v0.10.0.sh [scenario]` |

## Log Management

### View Specific Logs
```bash
./logs-internal-test.sh wizard        # Wizard logs
./logs-internal-test.sh dashboard     # Dashboard logs
./logs-internal-test.sh docker        # Container logs
./logs-internal-test.sh all           # All logs
```

### Specify Log Lines
```bash
./logs-internal-test.sh wizard 100    # Last 100 wizard lines
./logs-internal-test.sh dashboard 50  # Last 50 dashboard lines
```

## Automated Testing

### Run All Tests
```bash
./test-scenarios-v0.10.0.sh all       # Complete test suite
```

### Individual Test Scenarios
```bash
./test-scenarios-v0.10.0.sh 1         # Service availability
./test-scenarios-v0.10.0.sh 2         # System requirements
./test-scenarios-v0.10.0.sh 3         # Profile configuration
./test-scenarios-v0.10.0.sh 4         # Docker integration
./test-scenarios-v0.10.0.sh 5         # Dashboard discovery
./test-scenarios-v0.10.0.sh 6         # WebSocket connectivity
./test-scenarios-v0.10.0.sh 7         # Configuration persistence
./test-scenarios-v0.10.0.sh 8         # Resource monitoring
./test-scenarios-v0.10.0.sh 9         # Error handling
./test-scenarios-v0.10.0.sh 10        # Performance baseline
```

### Test by Name
```bash
./test-scenarios-v0.10.0.sh availability
./test-scenarios-v0.10.0.sh docker
./test-scenarios-v0.10.0.sh performance
```

## Status Monitoring

### Quick Status Check
```bash
./status-internal-test.sh              # Full status report
```

### Manual Health Checks
```bash
curl http://localhost:3000/api/health  # Wizard health
curl http://localhost:8080/api/health  # Dashboard health
```

### Process Monitoring
```bash
ps aux | grep -E "(wizard|dashboard)"  # Check processes
netstat -tulpn | grep -E ":(3000|8080)" # Check ports
```

## Docker Management

### Container Status
```bash
docker ps                              # Running containers
docker ps -a                           # All containers
docker stats                           # Resource usage
```

### Container Logs
```bash
docker logs kaspa-node                 # Specific container
docker logs -f kaspa-node              # Follow logs
```

### Container Management
```bash
docker-compose ps                      # Compose status
docker-compose logs                    # All compose logs
docker-compose down                    # Stop all containers
```

## Troubleshooting Commands

### System Diagnostics
```bash
# Check prerequisites
docker --version
docker-compose --version
node --version

# Check Docker daemon
docker info

# Check port availability
netstat -tulpn | grep -E ":(3000|8080)"

# Check disk space
df -h
du -sh .kaspa-aio/
```

### Service Diagnostics
```bash
# Check service processes
./status-internal-test.sh

# Check recent logs
./logs-internal-test.sh all

# Test API endpoints
curl -v http://localhost:3000/api/health
curl -v http://localhost:8080/api/health
```

### Reset Environment
```bash
# Complete reset
./cleanup-internal-test.sh

# Fresh start
./start-internal-test.sh
```

## Testing Workflows

### Basic Testing Workflow
```bash
# 1. Start environment
./start-internal-test.sh

# 2. Verify services
./status-internal-test.sh

# 3. Run automated tests
./test-scenarios-v0.10.0.sh

# 4. Manual testing
# Open http://localhost:3000 and http://localhost:8080

# 5. Check logs
./logs-internal-test.sh all

# 6. Cleanup
./cleanup-internal-test.sh
```

### Continuous Testing Workflow
```bash
# Start services
./start-internal-test.sh

# Run specific tests repeatedly
while true; do
  ./test-scenarios-v0.10.0.sh availability
  sleep 30
done

# Monitor in another terminal
./logs-internal-test.sh wizard
```

### Performance Testing Workflow
```bash
# Start environment
./start-internal-test.sh

# Run performance baseline
./test-scenarios-v0.10.0.sh performance

# Monitor resources
htop &
docker stats &

# Run load tests
for i in {1..10}; do
  curl http://localhost:3000/api/profiles &
done
wait

# Check results
./logs-internal-test.sh all
```

## File Locations

### Log Files
```
test-logs/
├── wizard.log          # Wizard service logs
└── dashboard.log       # Dashboard service logs
```

### Test Results
```
test-results/
├── test-report.md      # Comprehensive test report
├── scenario-results.log # Test execution log
├── system-requirements.json
├── profiles.json
├── docker-status.json
├── discovered-services.json
└── performance-baseline.txt
```

### Configuration Files
```
.env                    # Environment configuration
.kaspa-aio/            # Installation state
docker-compose.yml     # Container configuration
```

## API Endpoints

### Wizard APIs
```
GET  /api/health                    # Health check
GET  /api/system/requirements       # System requirements
GET  /api/profiles                  # Available profiles
GET  /api/docker/status            # Docker status
POST /api/install                  # Start installation
GET  /api/install/status           # Installation status
```

### Dashboard APIs
```
GET  /api/health                    # Health check
GET  /api/services                  # Discovered services
GET  /api/system/resources          # System resources
GET  /api/system/disk              # Disk usage
GET  /api/system/memory            # Memory usage
POST /api/services/restart         # Restart service
```

## Common Issues & Solutions

### Services Won't Start
```bash
# Check prerequisites
./status-internal-test.sh

# Check ports
netstat -tulpn | grep -E ":(3000|8080)"

# Check Docker
docker info

# Check logs
./logs-internal-test.sh all
```

### API Not Responding
```bash
# Check service status
./status-internal-test.sh

# Test connectivity
curl -v http://localhost:3000/api/health

# Check firewall
sudo ufw status
```

### Docker Issues
```bash
# Check Docker daemon
systemctl status docker

# Check user permissions
groups $USER | grep docker

# Restart Docker
sudo systemctl restart docker
```

### Performance Issues
```bash
# Check system resources
htop
docker stats

# Run performance tests
./test-scenarios-v0.10.0.sh performance

# Check for resource leaks
./logs-internal-test.sh all | grep -i "memory\|cpu\|disk"
```

## Environment Variables

### Testing Configuration
```bash
export WIZARD_PORT=3000            # Wizard port
export DASHBOARD_PORT=8080         # Dashboard port
export BUILD_MODE=internal-test    # Testing mode
export NODE_ENV=production         # Node environment
```

### Docker Configuration
```bash
export DOCKER_HOST=unix:///var/run/docker.sock
export COMPOSE_PROJECT_NAME=kaspa-aio-test
```

## Success Indicators

### Healthy Environment
- ✅ All services respond to health checks
- ✅ APIs return expected responses
- ✅ WebSocket connections establish
- ✅ Docker containers start successfully
- ✅ No error messages in logs

### Test Success Criteria
- ✅ All automated tests pass
- ✅ Response times under 5 seconds
- ✅ No memory leaks detected
- ✅ Clean startup and shutdown
- ✅ Configuration persists correctly

## Advanced Usage

### Custom Configuration
```bash
# Modify ports
export WIZARD_PORT=3001
export DASHBOARD_PORT=8081
./start-internal-test.sh

# Custom log levels
export LOG_LEVEL=debug
./start-internal-test.sh
```

### Parallel Testing
```bash
# Run multiple test instances
WIZARD_PORT=3000 DASHBOARD_PORT=8080 ./start-internal-test.sh &
WIZARD_PORT=3001 DASHBOARD_PORT=8081 ./start-internal-test.sh &
```

### Integration with CI/CD
```bash
# Automated testing script
#!/bin/bash
set -e

./start-internal-test.sh
./test-scenarios-v0.10.0.sh all
TEST_RESULT=$?
./cleanup-internal-test.sh

exit $TEST_RESULT
```

---

## Quick Command Reference Card

```bash
# Start/Stop
./start-internal-test.sh           # Start testing
./stop-internal-test.sh            # Stop services
./cleanup-internal-test.sh         # Complete cleanup

# Monitor
./status-internal-test.sh          # Check status
./logs-internal-test.sh all        # View all logs

# Test
./test-scenarios-v0.10.0.sh        # Run all tests
./test-scenarios-v0.10.0.sh 1      # Run specific test

# URLs
http://localhost:3000              # Wizard
http://localhost:8080              # Dashboard
```

**Happy Testing!** 🚀