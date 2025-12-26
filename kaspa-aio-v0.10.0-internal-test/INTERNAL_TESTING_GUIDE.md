# Kaspa All-in-One v0.10.0 - Internal Testing Guide

## Overview

This is an internal testing package for end-to-end testing of the Kaspa All-in-One wizard and dashboard integration. It provides a complete testing environment for validating the installation workflow and service management capabilities.

## Quick Start

```bash
# Extract the package
tar -xzf kaspa-aio-v0.10.0-internal-test.tar.gz
cd kaspa-aio-v0.10.0-internal-test

# Start testing environment
./start-internal-test.sh

# Access interfaces
# Wizard: http://localhost:3000
# Dashboard: http://localhost:8080
```

## Testing Scripts

### Core Scripts

- **`start-internal-test.sh`** - Start wizard and dashboard for testing
- **`stop-internal-test.sh`** - Stop all testing services
- **`status-internal-test.sh`** - Check status of all components
- **`cleanup-internal-test.sh`** - Complete cleanup for fresh start
- **`logs-internal-test.sh`** - View and analyze logs

### Log Management

```bash
# View specific logs
./logs-internal-test.sh wizard      # Wizard logs
./logs-internal-test.sh dashboard   # Dashboard logs
./logs-internal-test.sh docker      # Container logs
./logs-internal-test.sh all         # All logs

# Specify number of lines
./logs-internal-test.sh wizard 100  # Last 100 wizard log lines
```

## End-to-End Testing Workflow

### 1. Initial Setup Testing

1. **Start Environment**
   ```bash
   ./start-internal-test.sh
   ```

2. **Verify Services**
   ```bash
   ./status-internal-test.sh
   ```

3. **Check Logs**
   ```bash
   ./logs-internal-test.sh all
   ```

### 2. Wizard Installation Testing

1. **Access Wizard**: http://localhost:3000
2. **Test Installation Flow**:
   - System requirements check
   - Profile selection
   - Configuration setup
   - Installation progress
   - Completion verification

3. **Monitor Installation**:
   ```bash
   # In another terminal
   ./logs-internal-test.sh wizard
   ```

### 3. Dashboard Monitoring Testing

1. **Access Dashboard**: http://localhost:8080
2. **Test Monitoring Features**:
   - Service status display
   - Resource monitoring
   - Log viewing
   - Service controls

3. **Verify Integration**:
   - Dashboard detects wizard-installed services
   - Service states are accurate
   - Controls work properly

### 4. Reconfiguration Testing

1. **From Dashboard**: Click "Reconfigure" or "Add Services"
2. **Verify Handoff**: Should redirect to wizard
3. **Test Modification**: Add/remove services
4. **Verify Updates**: Dashboard should reflect changes

### 5. Error Scenario Testing

1. **Service Failures**:
   ```bash
   # Stop a service manually
   docker stop kaspa-node
   
   # Check dashboard response
   # Verify error handling
   ```

2. **Resource Constraints**:
   - Test with limited resources
   - Verify warnings and fallbacks

3. **Network Issues**:
   - Test with network interruptions
   - Verify reconnection handling

## Testing Scenarios

### Scenario 1: Fresh Installation (Core Profile)
- Start with clean environment
- Install Core profile through wizard
- Verify dashboard shows correct services
- Test basic service management

### Scenario 2: Service Addition
- Start with Core profile
- Use dashboard to add Production profile
- Verify wizard handles existing installation
- Confirm all services work together

### Scenario 3: Service Removal
- Start with multiple profiles
- Remove services through wizard
- Verify clean removal
- Check dashboard updates correctly

### Scenario 4: Error Recovery
- Simulate service failures
- Test automatic recovery
- Verify error reporting
- Test manual intervention

### Scenario 5: Configuration Changes
- Modify service settings
- Test configuration validation
- Verify service restarts
- Check persistence across restarts

## Log Analysis

### Key Log Locations

- **Wizard**: `test-logs/wizard.log`
- **Dashboard**: `test-logs/dashboard.log`
- **Docker**: Use `docker logs <container>`

### Important Log Patterns

**Wizard Success Indicators**:
```
✓ System requirements met
✓ Profile validation complete
✓ Installation started
✓ Services deployed successfully
```

**Dashboard Success Indicators**:
```
✓ Service discovery complete
✓ Health checks passing
✓ WebSocket connection established
✓ Real-time updates active
```

**Error Patterns to Watch**:
```
✗ Docker connection failed
✗ Port already in use
✗ Insufficient resources
✗ Service startup timeout
```

## Troubleshooting

### Common Issues

1. **Services Won't Start**
   ```bash
   # Check prerequisites
   docker --version
   docker-compose --version
   node --version
   
   # Check ports
   netstat -tulpn | grep -E ':(3000|8080)'
   ```

2. **Wizard/Dashboard Not Responding**
   ```bash
   # Check processes
   ./status-internal-test.sh
   
   # Check logs
   ./logs-internal-test.sh all
   ```

3. **Docker Issues**
   ```bash
   # Check Docker status
   docker info
   
   # Clean Docker environment
   ./cleanup-internal-test.sh
   ```

### Reset Environment

```bash
# Complete reset
./cleanup-internal-test.sh

# Fresh start
./start-internal-test.sh
```

## Performance Testing

### Resource Monitoring

```bash
# Monitor system resources
htop

# Monitor Docker resources
docker stats

# Monitor disk usage
df -h
du -sh .kaspa-aio/
```

### Load Testing

1. **Multiple Concurrent Installations**
2. **Rapid Service Start/Stop Cycles**
3. **Large Configuration Changes**
4. **Extended Runtime Testing**

## Reporting Issues

When reporting issues, include:

1. **Environment Info**:
   ```bash
   ./status-internal-test.sh > status-report.txt
   ```

2. **Complete Logs**:
   ```bash
   ./logs-internal-test.sh all > full-logs.txt
   ```

3. **System Information**:
   ```bash
   docker info > docker-info.txt
   docker ps -a > containers.txt
   ```

4. **Steps to Reproduce**
5. **Expected vs Actual Behavior**

## Advanced Testing

### Custom Configurations

1. **Modify `.env` file** for custom settings
2. **Test edge cases** with unusual configurations
3. **Validate error handling** with invalid inputs

### Integration Testing

1. **External Services**: Test with real Kaspa network
2. **Network Conditions**: Test with various network speeds
3. **Hardware Variations**: Test on different hardware configs

### Automation

Create automated test scripts for:
- Repeated installation cycles
- Configuration validation
- Service health monitoring
- Performance benchmarking

## Success Criteria

A successful test should demonstrate:

1. **✓ Smooth Installation**: Wizard completes without errors
2. **✓ Accurate Monitoring**: Dashboard shows correct service states
3. **✓ Seamless Integration**: Wizard ↔ Dashboard handoff works
4. **✓ Reliable Management**: Service controls work consistently
5. **✓ Proper Error Handling**: Graceful failure and recovery
6. **✓ Clean Cleanup**: Complete removal when needed

## Next Steps

After successful internal testing:

1. **Document Issues**: Create detailed issue reports
2. **Performance Analysis**: Analyze resource usage patterns
3. **User Experience**: Note UX improvements needed
4. **Stability Assessment**: Evaluate long-term stability
5. **Release Readiness**: Determine if ready for external testing

---

**Happy Testing!** 🚀

Your thorough testing helps ensure a smooth experience for all users.
