# Kaspa All-in-One Maintenance Guide

This guide provides comprehensive maintenance procedures, schedules, and best practices for keeping your Kaspa All-in-One system running smoothly.

## 📅 Maintenance Schedule

### Daily Maintenance (Automated)

These tasks should run automatically via cron or systemd timers:

```bash
# Add to crontab: crontab -e
# Run health check daily at 2 AM
0 2 * * * /path/to/kaspa-aio/scripts/health-check.sh >> /var/log/kaspa-health.log 2>&1

# Check disk space daily at 3 AM
0 3 * * * df -h | grep -E "/$|/var/lib/docker" >> /var/log/kaspa-disk.log 2>&1

# Monitor service status daily at 4 AM
0 4 * * * cd /path/to/kaspa-aio && docker compose ps >> /var/log/kaspa-status.log 2>&1
```

**Manual Daily Checks:**
```bash
# Quick health check
./scripts/health-check.sh

# Check service status
docker compose ps

# Monitor resource usage
docker stats --no-stream
```

### Weekly Maintenance

**Every Sunday at 3 AM:**

```bash
# Add to crontab
0 3 * * 0 /path/to/kaspa-aio/scripts/weekly-maintenance.sh
```

Create `scripts/weekly-maintenance.sh`:
```bash
#!/bin/bash
set -e

echo "=== Weekly Maintenance: $(date) ==="

# Backup databases
echo "Creating database backups..."
docker compose exec -T indexer-db pg_dumpall -U indexer | gzip > \
  backups/weekly-db-$(date +%Y%m%d).sql.gz

# Clean old logs
echo "Cleaning old logs..."
find logs/ -name "*.log" -mtime +30 -delete

# Prune old Docker images
echo "Pruning old Docker images..."
docker image prune -a -f --filter "until=168h"

# Check for updates
echo "Checking for updates..."
cd /path/to/kaspa-aio
git fetch origin
git status

echo "Weekly maintenance complete!"
```

### Monthly Maintenance

**First Sunday of each month:**

```bash
# Add to crontab
0 4 1-7 * 0 /path/to/kaspa-aio/scripts/monthly-maintenance.sh
```

Create `scripts/monthly-maintenance.sh`:
```bash
#!/bin/bash
set -e

echo "=== Monthly Maintenance: $(date) ==="

# Full system backup
echo "Creating full system backup..."
./scripts/manage.sh backup

# Database optimization
echo "Optimizing databases..."
docker compose exec -T indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM FULL ANALYZE;"
docker compose exec -T indexer-db psql -U indexer -d ksocial -c "VACUUM FULL ANALYZE;"
docker compose exec -T indexer-db psql -U indexer -d simply_kaspa -c "VACUUM FULL ANALYZE;"

# Check and apply updates
echo "Checking for system updates..."
sudo apt update
sudo apt list --upgradable

# Security audit
echo "Running security audit..."
docker scan kaspanet/rusty-kaspad:latest || true

# Generate monthly report
echo "Generating monthly report..."
./scripts/health-check.sh -v > reports/monthly-$(date +%Y%m).txt

echo "Monthly maintenance complete!"
```

### Quarterly Maintenance

**Every 3 months:**

- Review and update security configurations
- Audit access logs and user permissions
- Test disaster recovery procedures
- Review and optimize resource allocation
- Update documentation
- Plan capacity upgrades if needed

## 🔄 Update Procedures

### Updating Docker Images

**Safe update procedure:**

```bash
# 1. Create backup before updating
./scripts/manage.sh backup

# 2. Check current versions
docker compose images

# 3. Pull latest images
docker compose pull

# 4. Review changes
docker compose images

# 5. Update services one at a time
docker compose up -d kaspa-node
sleep 60  # Wait for node to stabilize

docker compose up -d indexer-db
sleep 30

docker compose up -d kasia-indexer k-indexer simply-kaspa-indexer
sleep 60

docker compose up -d kasia-app k-social

# 6. Verify all services are healthy
./scripts/health-check.sh

# 7. Monitor logs for errors
docker compose logs --tail=100 -f
```

### Updating Configuration

**When updating .env or docker-compose.yml:**

```bash
# 1. Backup current configuration
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup

# 2. Make changes
nano .env

# 3. Validate configuration
docker compose config

# 4. Apply changes
docker compose up -d

# 5. Verify services restarted correctly
docker compose ps
./scripts/health-check.sh
```

### Rolling Back Updates

**If update causes issues:**

```bash
# 1. Stop services
docker compose down

# 2. Restore configuration
cp .env.backup .env
cp docker-compose.yml.backup docker-compose.yml

# 3. Restore data if needed
docker volume rm kaspa-aio_kaspa-data
docker volume create kaspa-aio_kaspa-data
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/kaspa-backup-latest.tar.gz -C /data

# 4. Start services
docker compose up -d

# 5. Verify rollback
./scripts/health-check.sh
```

## 💾 Backup Strategies

### Automated Backup System

Create comprehensive backup automation:

```bash
# Create backup script: scripts/automated-backup.sh
#!/bin/bash
set -e

BACKUP_DIR="/path/to/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

echo "Starting automated backup: $DATE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Docker volumes
echo "Backing up Docker volumes..."
docker run --rm \
  -v kaspa-aio_kaspa-data:/kaspa-data:ro \
  -v kaspa-aio_kasia-indexer-data:/kasia-data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/volumes-$DATE.tar.gz" \
  -C / kaspa-data kasia-data

# Backup databases
echo "Backing up databases..."
docker compose exec -T indexer-db pg_dumpall -U indexer | \
  gzip > "$BACKUP_DIR/databases-$DATE.sql.gz"

# Backup configuration
echo "Backing up configuration..."
tar czf "$BACKUP_DIR/config-$DATE.tar.gz" \
  .env docker-compose.yml config/ scripts/

# Create backup manifest
echo "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest-$DATE.txt" <<EOF
Backup Date: $DATE
Hostname: $(hostname)
Docker Version: $(docker --version)
Services: $(docker compose ps --services | tr '\n' ' ')
Volume Sizes:
$(docker system df -v | grep kaspa-aio)
EOF

# Remove old backups
echo "Cleaning old backups..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "manifest-*.txt" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $DATE"
```

**Schedule automated backups:**
```bash
# Daily backups at 1 AM
0 1 * * * /path/to/kaspa-aio/scripts/automated-backup.sh >> /var/log/kaspa-backup.log 2>&1
```

### Backup Verification

**Regularly test backup restoration:**

```bash
# Create test restoration script: scripts/test-restore.sh
#!/bin/bash
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

echo "Testing backup restoration: $BACKUP_FILE"

# Create test environment
docker compose -f docker-compose.test.yml down -v
docker volume create kaspa-aio-test_kaspa-data

# Restore backup to test volume
docker run --rm \
  -v kaspa-aio-test_kaspa-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf "/backup/$BACKUP_FILE" -C /data

# Start test services
docker compose -f docker-compose.test.yml up -d

# Wait for services
sleep 30

# Verify restoration
docker compose -f docker-compose.test.yml exec kaspa-node \
  ls -la /data

# Cleanup
docker compose -f docker-compose.test.yml down -v

echo "Backup restoration test complete!"
```

### Off-site Backup

**Sync backups to remote location:**

```bash
# Using rsync
rsync -avz --delete \
  /path/to/backups/ \
  user@backup-server:/backups/kaspa-aio/

# Using rclone (for cloud storage)
rclone sync /path/to/backups/ remote:kaspa-backups/

# Using AWS S3
aws s3 sync /path/to/backups/ s3://my-bucket/kaspa-backups/
```

## 🗄️ Database Maintenance

### Regular Database Optimization

**Weekly database maintenance:**

```bash
# Vacuum and analyze all databases
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM ANALYZE;"
docker compose exec indexer-db psql -U indexer -d ksocial -c "VACUUM ANALYZE;"
docker compose exec indexer-db psql -U indexer -d simply_kaspa -c "VACUUM ANALYZE;"

# Check database sizes
docker compose exec indexer-db psql -U indexer -c "
SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datname NOT IN ('template0', 'template1', 'postgres')
ORDER BY pg_database_size(datname) DESC;
"

# Check table sizes
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

### TimescaleDB Compression

**Enable and monitor compression:**

```bash
# Check compression status
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT hypertable_name, 
       pg_size_pretty(before_compression_total_bytes) AS before,
       pg_size_pretty(after_compression_total_bytes) AS after,
       round(100 - (after_compression_total_bytes::numeric / before_compression_total_bytes::numeric * 100), 2) AS compression_ratio
FROM timescaledb_information.compression_settings
JOIN timescaledb_information.hypertables USING (hypertable_name);
"

# Manually compress chunks
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT compress_chunk(i) FROM show_chunks('blocks') i;
"

# Update compression policies
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT add_compression_policy('blocks', INTERVAL '1 hour');
SELECT add_compression_policy('transactions', INTERVAL '1 hour');
"
```

### Database Cleanup

**Remove old data (if retention policies are set):**

```bash
# Check retention policies
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';
"

# Add retention policy (example: keep 90 days)
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT add_retention_policy('blocks', INTERVAL '90 days');
"

# Manually drop old chunks
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT drop_chunks('blocks', INTERVAL '180 days');
"
```

### Database Performance Monitoring

**Monitor query performance:**

```bash
# Enable pg_stat_statements
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
"

# View slow queries
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT query, calls, total_exec_time, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Check index usage
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;
"
```

## 🧹 System Cleanup

### Docker Cleanup

**Regular Docker maintenance:**

```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (CAUTION: may delete data)
docker volume prune -f

# Remove unused networks
docker network prune -f

# Complete cleanup (CAUTION: removes everything unused)
docker system prune -a --volumes -f

# Check space saved
docker system df
```

### Log Management

**Rotate and clean logs:**

```bash
# Configure Docker log rotation
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json

# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker

# Manual log cleanup
docker compose logs --tail=0 -f > /dev/null &
sleep 5
kill %1

# Clean old log files
find logs/ -name "*.log" -mtime +30 -delete
```

### Disk Space Management

**Monitor and manage disk usage:**

```bash
# Check disk space
df -h

# Check Docker disk usage
docker system df -v

# Find large files
du -h /var/lib/docker | sort -rh | head -20

# Clean package cache (Ubuntu)
sudo apt clean
sudo apt autoclean
sudo apt autoremove

# Clean journal logs
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=500M
```

## 🔒 Security Maintenance

### Security Updates

**Regular security updates:**

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Update Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Scan Docker images for vulnerabilities
docker scan kaspanet/rusty-kaspad:latest
docker scan kkluster/kasia-indexer:main

# Update base images
docker compose pull
docker compose up -d
```

### Access Control Review

**Monthly access audit:**

```bash
# Review Docker group members
getent group docker

# Check SSH access logs
sudo grep "Accepted" /var/log/auth.log | tail -50

# Review firewall rules
sudo ufw status numbered

# Check open ports
sudo netstat -tulpn | grep LISTEN
```

### Certificate Management

**SSL/TLS certificate renewal:**

```bash
# Check certificate expiration
openssl x509 -in /path/to/cert.pem -noout -dates

# Renew Let's Encrypt certificates (if using)
sudo certbot renew

# Update nginx configuration
docker compose restart nginx
```

## 📊 Monitoring and Alerting

### Health Monitoring

**Set up continuous monitoring:**

```bash
# Create monitoring script: scripts/continuous-monitor.sh
#!/bin/bash

ALERT_EMAIL="admin@example.com"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=85
ALERT_THRESHOLD_DISK=90

while true; do
    # Check CPU usage
    CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" kaspa-node | sed 's/%//')
    if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        echo "ALERT: High CPU usage: $CPU_USAGE%" | mail -s "Kaspa Node Alert" $ALERT_EMAIL
    fi
    
    # Check memory usage
    MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" kaspa-node | sed 's/%//')
    if (( $(echo "$MEM_USAGE > $ALERT_THRESHOLD_MEM" | bc -l) )); then
        echo "ALERT: High memory usage: $MEM_USAGE%" | mail -s "Kaspa Node Alert" $ALERT_EMAIL
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt $ALERT_THRESHOLD_DISK ]; then
        echo "ALERT: High disk usage: $DISK_USAGE%" | mail -s "Kaspa Node Alert" $ALERT_EMAIL
    fi
    
    # Check service health
    if ! ./scripts/health-check.sh > /dev/null 2>&1; then
        echo "ALERT: Health check failed" | mail -s "Kaspa Node Alert" $ALERT_EMAIL
    fi
    
    sleep 300  # Check every 5 minutes
done
```

### Performance Metrics

**Collect and analyze metrics:**

```bash
# Create metrics collection script
#!/bin/bash

METRICS_FILE="metrics/metrics-$(date +%Y%m%d).csv"

# Collect metrics
echo "timestamp,service,cpu,memory,network_in,network_out" > $METRICS_FILE

docker stats --no-stream --format \
  "{{.Name}},{{.CPUPerc}},{{.MemPerc}},{{.NetIO}}" | \
  while IFS=, read name cpu mem net; do
    echo "$(date +%s),$name,$cpu,$mem,$net" >> $METRICS_FILE
  done

# Analyze trends
echo "=== Resource Usage Trends ==="
echo "Average CPU usage:"
awk -F, '{sum+=$3; count++} END {print sum/count "%"}' $METRICS_FILE

echo "Average Memory usage:"
awk -F, '{sum+=$4; count++} END {print sum/count "%"}' $METRICS_FILE
```

### Alert Configuration

**Set up alerting system:**

```bash
# Install monitoring tools
sudo apt install mailutils ssmtp

# Configure email alerts
sudo nano /etc/ssmtp/ssmtp.conf

# Add:
root=admin@example.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES

# Test alerts
echo "Test alert" | mail -s "Kaspa Alert Test" admin@example.com
```

## 🔄 Disaster Recovery

### Recovery Procedures

**Complete system recovery:**

```bash
# 1. Install fresh system
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Clone repository
git clone https://github.com/your-repo/kaspa-aio.git
cd kaspa-aio

# 3. Restore configuration
cp /backup/config-latest.tar.gz .
tar xzf config-latest.tar.gz

# 4. Restore volumes
docker volume create kaspa-aio_kaspa-data
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/volumes-latest.tar.gz -C /data

# 5. Restore databases
docker compose up -d indexer-db
sleep 30
gunzip < /backup/databases-latest.sql.gz | \
  docker compose exec -T indexer-db psql -U indexer

# 6. Start all services
docker compose up -d

# 7. Verify recovery
./scripts/health-check.sh
```

### Testing Recovery Procedures

**Quarterly disaster recovery test:**

```bash
# Create test environment
mkdir -p /tmp/dr-test
cd /tmp/dr-test

# Simulate recovery
git clone https://github.com/your-repo/kaspa-aio.git
cd kaspa-aio

# Restore from backup
# ... follow recovery procedures ...

# Verify functionality
./scripts/health-check.sh

# Document results
echo "DR Test Results: $(date)" > dr-test-results.txt
docker compose ps >> dr-test-results.txt

# Cleanup
cd /
rm -rf /tmp/dr-test
```

## 📈 Capacity Planning

### Resource Monitoring

**Track resource trends:**

```bash
# Create capacity planning report
#!/bin/bash

REPORT_FILE="reports/capacity-$(date +%Y%m).txt"

echo "=== Capacity Planning Report ===" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Current resource usage
echo "=== Current Resource Usage ===" >> $REPORT_FILE
docker stats --no-stream >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Disk usage trends
echo "=== Disk Usage ===" >> $REPORT_FILE
df -h >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Database sizes
echo "=== Database Sizes ===" >> $REPORT_FILE
docker compose exec indexer-db psql -U indexer -c "\l+" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Volume sizes
echo "=== Volume Sizes ===" >> $REPORT_FILE
docker system df -v | grep kaspa-aio >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Growth projections
echo "=== Growth Projections ===" >> $REPORT_FILE
echo "Based on current trends:" >> $REPORT_FILE
# Add custom growth calculations
echo "" >> $REPORT_FILE

echo "Report saved to: $REPORT_FILE"
```

### Scaling Recommendations

**When to scale:**

- **CPU Usage > 80%** consistently: Add more CPU cores or upgrade processor
- **Memory Usage > 85%** consistently: Add more RAM
- **Disk Usage > 90%**: Add more storage or implement data retention
- **Network Bandwidth > 80%**: Upgrade network connection
- **Database Query Time > 1s**: Optimize queries or add read replicas

### Upgrade Planning

**Hardware upgrade checklist:**

```markdown
## Pre-Upgrade
- [ ] Create full system backup
- [ ] Document current configuration
- [ ] Test backup restoration
- [ ] Schedule maintenance window
- [ ] Notify users of downtime

## During Upgrade
- [ ] Stop all services gracefully
- [ ] Perform hardware upgrade
- [ ] Verify new hardware detection
- [ ] Restore configuration and data
- [ ] Start services incrementally

## Post-Upgrade
- [ ] Run health checks
- [ ] Monitor performance metrics
- [ ] Verify all functionality
- [ ] Update documentation
- [ ] Remove old backups after verification
```

## 📝 Maintenance Logs

### Log Template

Create standardized maintenance logs:

```bash
# Create log entry: scripts/log-maintenance.sh
#!/bin/bash

LOG_FILE="maintenance-logs/$(date +%Y).log"
mkdir -p maintenance-logs

cat >> $LOG_FILE <<EOF
=== Maintenance Entry ===
Date: $(date)
Performed by: $USER
Type: $1
Description: $2
Services affected: $3
Downtime: $4
Issues encountered: $5
Resolution: $6
Verification: $7
===========================

EOF

echo "Maintenance logged to: $LOG_FILE"
```

**Usage:**
```bash
./scripts/log-maintenance.sh \
  "Database Optimization" \
  "Ran VACUUM FULL on all databases" \
  "indexer-db" \
  "15 minutes" \
  "None" \
  "N/A" \
  "All services healthy after restart"
```

## 🎯 Best Practices

### Maintenance Best Practices

1. **Always backup before changes**: Never skip backups before updates or configuration changes
2. **Test in staging first**: If possible, test changes in a non-production environment
3. **Document everything**: Keep detailed logs of all maintenance activities
4. **Monitor after changes**: Watch logs and metrics closely after any changes
5. **Have rollback plan**: Always know how to revert changes if something goes wrong
6. **Schedule maintenance windows**: Perform major updates during low-usage periods
7. **Automate routine tasks**: Use cron jobs for regular maintenance tasks
8. **Keep systems updated**: Regularly apply security updates and patches
9. **Review logs regularly**: Check logs for warnings and errors proactively
10. **Test disaster recovery**: Regularly test backup restoration procedures

### Maintenance Checklist

**Before any maintenance:**
- [ ] Create backup
- [ ] Review change plan
- [ ] Notify stakeholders
- [ ] Prepare rollback procedure
- [ ] Schedule maintenance window

**During maintenance:**
- [ ] Follow documented procedures
- [ ] Log all actions taken
- [ ] Monitor for errors
- [ ] Test incrementally
- [ ] Document any issues

**After maintenance:**
- [ ] Run health checks
- [ ] Verify functionality
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Notify completion

---

**Regular maintenance keeps your Kaspa All-in-One system running smoothly and prevents issues before they occur! 🔧**
