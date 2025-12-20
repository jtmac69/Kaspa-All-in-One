# Resource Monitoring Quick Reference

## Overview
This guide provides quick commands and tools to monitor and manage system resources for Kaspa AIO to prevent system freezes and crashes.

## Quick Commands

### System Resource Monitoring
```bash
# Real-time resource monitoring
./scripts/monitoring/resource-monitor.sh

# Emergency stop all resource-intensive containers
./scripts/monitoring/emergency-stop.sh

# Check current system resources
free -h && uptime

# Check Docker container resources
docker stats --no-stream
```

### Container Management
```bash
# Stop indexer services (most resource intensive)
docker-compose --profile indexer-services down

# Start indexer services with resource limits
docker-compose --profile indexer-services up -d

# Restart a specific problematic container
docker restart kasia-indexer

# Check container logs for issues
docker logs kasia-indexer --tail 50
```

## Resource Limits Configured

### Container Resource Limits
| Container | CPU Limit | Memory Limit | Purpose |
|-----------|-----------|--------------|---------|
| kasia-indexer | 4.0 cores | 2GB | Main indexer service |
| k-indexer | 2.0 cores | 1GB | K-Social indexer |
| simply-kaspa-indexer | 2.0 cores | 1GB | Simply Kaspa indexer |
| k-social-db | 2.0 cores | 2GB | K-Social database |
| simply-kaspa-db | 2.0 cores | 2GB | Simply Kaspa database |

### Alert Thresholds
- **CPU Usage**: Alert at 80%
- **Memory Usage**: Alert at 85%
- **Load Average**: Alert at 10.0

## Warning Signs of System Stress

### High Resource Usage Indicators
- Load average > 10
- CPU usage > 80% sustained
- Memory usage > 85%
- Container CPU > 100% (multiple cores)
- Unresponsive keyboard/mouse
- Screen not waking up

### Container-Specific Issues
- **kasia-indexer**: Often consumes 1000%+ CPU
- **Database containers**: High I/O causing system lag
- **Multiple indexers**: Competing for resources

## Emergency Procedures

### If System Becomes Unresponsive
1. **SSH from another machine** (if possible):
   ```bash
   ssh user@your-kaspa-server
   ./scripts/monitoring/emergency-stop.sh
   ```

2. **Physical access required**:
   - Press Ctrl+Alt+F2 to switch to terminal
   - Login and run emergency stop
   - If completely frozen, power cycle

### Preventing Future Freezes
1. **Always monitor when starting indexers**:
   ```bash
   # Start monitoring first
   ./scripts/monitoring/resource-monitor.sh &
   
   # Then start services
   docker-compose --profile indexer-services up -d
   ```

2. **Use resource limits** (already configured in docker-compose.yml)

3. **Regular monitoring**:
   ```bash
   # Add to crontab for regular checks
   */5 * * * * /path/to/kaspa-aio/scripts/monitoring/resource-monitor.sh --check-only
   ```

## Troubleshooting Common Issues

### High CPU Usage
```bash
# Identify problematic container
docker stats --no-stream | sort -k3 -hr

# Restart high-CPU container
docker restart <container-name>

# Check container logs
docker logs <container-name> --tail 100
```

### High Memory Usage
```bash
# Check memory usage by container
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Clear system cache (if safe)
sudo sync && sudo sysctl vm.drop_caches=3
```

### Database Performance Issues
```bash
# Check database connections
docker exec k-social-db psql -U k_social_user -d ksocial -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database if needed
docker restart k-social-db
```

## Monitoring Tools

### Built-in Scripts
- `./scripts/monitoring/resource-monitor.sh` - Real-time monitoring with alerts
- `./scripts/monitoring/emergency-stop.sh` - Quick stop for emergencies

### System Commands
```bash
# CPU and memory
htop                    # Interactive process viewer
top -p $(docker inspect --format='{{.State.Pid}}' kasia-indexer)

# I/O monitoring
iotop                   # I/O usage by process
iostat -x 1            # I/O statistics

# Network monitoring
nethogs                 # Network usage by process
```

### Docker-specific
```bash
# Container resource usage
docker stats

# Container processes
docker exec kasia-indexer ps aux

# Container resource limits
docker inspect kasia-indexer | grep -A 10 "Resources"
```

## Best Practices

### Before Starting Indexer Services
1. Check available resources: `free -h && uptime`
2. Start monitoring: `./scripts/monitoring/resource-monitor.sh &`
3. Start services: `docker-compose --profile indexer-services up -d`
4. Monitor for first 10 minutes

### During Operation
- Check resources every 30 minutes
- Watch for load average > 5
- Monitor container logs for errors
- Keep emergency stop script ready

### If Leaving System Unattended
- Set up monitoring alerts
- Consider stopping resource-intensive services
- Ensure system has adequate cooling
- Test emergency procedures

## Recovery Procedures

### After System Freeze/Reboot
1. **Check system integrity**:
   ```bash
   dmesg | grep -i error
   journalctl --since "1 hour ago" | grep -i error
   ```

2. **Check Docker state**:
   ```bash
   docker ps -a
   docker system df
   ```

3. **Restart services gradually**:
   ```bash
   # Start databases first
   docker-compose up -d k-social-db simply-kaspa-db
   
   # Wait for healthy status
   docker-compose ps
   
   # Start indexers one by one
   docker-compose up -d k-indexer
   # Monitor before starting next
   docker-compose up -d simply-kaspa-indexer
   # Monitor before starting next
   docker-compose up -d kasia-indexer
   ```

## Contact Information

### Log Locations
- Resource monitor logs: `logs/resource-monitor.log`
- Docker logs: `docker logs <container-name>`
- System logs: `/var/log/syslog`

### Useful Commands for Support
```bash
# System information
uname -a
free -h
df -h
docker --version
docker-compose --version

# Current resource usage
uptime
docker stats --no-stream
ps aux --sort=-%cpu | head -10
```

## Quick Reference Card

| Action | Command |
|--------|---------|
| Start monitoring | `./scripts/monitoring/resource-monitor.sh` |
| Emergency stop | `./scripts/monitoring/emergency-stop.sh` |
| Check resources | `free -h && uptime` |
| Container stats | `docker stats --no-stream` |
| Stop indexers | `docker-compose --profile indexer-services down` |
| Start indexers | `docker-compose --profile indexer-services up -d` |
| Restart container | `docker restart <name>` |
| Check logs | `docker logs <name> --tail 50` |