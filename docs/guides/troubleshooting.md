# Kaspa All-in-One Troubleshooting Guide

This comprehensive guide helps you diagnose and resolve common issues with the Kaspa All-in-One system.

## 🔍 Quick Diagnostics

### Run Automated Health Check
```bash
# Basic health check
./scripts/health-check.sh

# Verbose output with detailed diagnostics
./scripts/health-check.sh -v

# JSON output for automation
./scripts/health-check.sh -j
```

### Check Service Status
```bash
# View all running services
docker compose ps

# Check specific profile services
docker compose --profile prod ps
docker compose --profile explorer ps

# View service logs
docker compose logs [service-name]
docker compose logs -f --tail=100 [service-name]
```

## 🚨 Common Installation Issues

### Issue 1: Docker Not Installed or Not Running

**Symptoms:**
- `docker: command not found`
- `Cannot connect to the Docker daemon`
- Installation script fails immediately

**Diagnosis:**
```bash
# Check if Docker is installed
docker --version

# Check if Docker daemon is running
sudo systemctl status docker
```

**Solution:**
```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker run hello-world
```

### Issue 2: Insufficient Disk Space

**Symptoms:**
- `no space left on device`
- Services fail to start
- Database initialization fails

**Diagnosis:**
```bash
# Check disk space
df -h

# Check Docker disk usage
docker system df

# Check specific volumes
docker volume ls
docker volume inspect kaspa-aio_kaspa-data
```

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove specific volumes (CAUTION: data loss)
docker volume rm kaspa-aio_old-volume-name

# Expand disk space or move Docker data directory
# See: https://docs.docker.com/config/daemon/#daemon-data-directory
```

### Issue 3: Port Conflicts

**Symptoms:**
- `port is already allocated`
- Services fail to start with bind errors
- Cannot access web interfaces

**Diagnosis:**
```bash
# Check which process is using a port
sudo lsof -i :8080
sudo netstat -tulpn | grep :8080

# Check all Kaspa All-in-One ports
for port in 8080 16110 16111 3001 3002 3003 3004 3005 5432; do
    echo "Port $port:"
    sudo lsof -i :$port
done
```

**Solution:**
```bash
# Option 1: Stop conflicting service
sudo systemctl stop [conflicting-service]

# Option 2: Change port in .env file
nano .env
# Modify: DASHBOARD_PORT=8081 (or other available port)

# Option 3: Kill process using port (use with caution)
sudo kill -9 $(sudo lsof -t -i:8080)

# Restart services
docker compose down
docker compose up -d
```

### Issue 4: Permission Denied Errors

**Symptoms:**
- `permission denied` when running scripts
- Cannot access Docker socket
- Volume mount permission errors

**Diagnosis:**
```bash
# Check script permissions
ls -la install.sh scripts/*.sh

# Check Docker group membership
groups $USER

# Check volume permissions
docker compose exec kaspa-node ls -la /data
```

**Solution:**
```bash
# Make scripts executable
chmod +x install.sh
chmod +x scripts/*.sh
chmod +x cleanup-tests.sh
chmod +x test-*.sh

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login for changes to take effect

# Fix volume permissions (if needed)
docker compose down
sudo chown -R $USER:$USER ./data
docker compose up -d
```

## 🔧 Service-Specific Issues

### Kaspa Node Issues

#### Node Won't Sync

**Symptoms:**
- Node stuck at low block height
- No peer connections
- Sync progress not advancing

**Diagnosis:**
```bash
# Check node status
curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"getBlockDagInfo","params":{}}' \
     http://localhost:16111

# Check peer connections
docker compose logs kaspa-node | grep -i "peer\|connection"

# Check network connectivity
docker compose exec kaspa-node ping -c 3 8.8.8.8
```

**Solution:**
```bash
# Restart node
docker compose restart kaspa-node

# Check firewall settings
sudo ufw status
sudo ufw allow 16110/tcp  # P2P port

# Verify external IP detection
docker compose logs kaspa-node | grep -i "external"

# If sync is corrupted, resync from scratch
docker compose down
docker volume rm kaspa-aio_kaspa-data
docker compose up -d kaspa-node
```

#### Node High Resource Usage

**Symptoms:**
- High CPU usage (>80%)
- High memory usage
- System becomes unresponsive

**Diagnosis:**
```bash
# Monitor resource usage
docker stats kaspa-node

# Check node configuration
docker compose logs kaspa-node | head -50
```

**Solution:**
```bash
# Adjust resource limits in docker-compose.yml
# Add under kaspa-node service:
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G

# Restart with new limits
docker compose up -d kaspa-node

# Consider hardware upgrade if consistently high
```

#### Node Not Publicly Accessible

**Symptoms:**
- Cannot connect from external network
- Port forwarding not working
- Public node tests fail

**Diagnosis:**
```bash
# Test local connectivity
curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"ping","params":{}}' \
     http://localhost:16111

# Check if port is listening
sudo netstat -tulpn | grep 16110

# Test from external network
# Use online port checker: https://www.yougetsignal.com/tools/open-ports/
```

**Solution:**
```bash
# Configure router port forwarding
# Forward external port 16110 to internal IP:16110

# Check firewall
sudo ufw allow 16110/tcp
sudo ufw status

# Verify PUBLIC_NODE setting in .env
PUBLIC_NODE=true

# Restart services
docker compose restart kaspa-node nginx

# See docs/public-node-setup.md for detailed guide
```

### Database Issues

#### Database Won't Start

**Symptoms:**
- `database system is shut down`
- Indexers cannot connect
- Initialization scripts fail

**Diagnosis:**
```bash
# Check database status
docker compose ps indexer-db archive-db

# Check database logs
docker compose logs indexer-db
docker compose logs archive-db

# Check disk space
df -h
```

**Solution:**
```bash
# Restart database
docker compose restart indexer-db

# Check for corruption
docker compose exec indexer-db pg_isready -U indexer

# If corrupted, restore from backup
docker compose down
docker volume rm kaspa-aio_indexer-db-data
docker compose up -d indexer-db

# Wait for initialization
sleep 30
docker compose logs indexer-db
```

#### Database Connection Errors

**Symptoms:**
- Indexers show `connection refused`
- `password authentication failed`
- `database does not exist`

**Diagnosis:**
```bash
# Test database connectivity
docker compose exec indexer-db pg_isready -U indexer -d kaspa_indexers

# Check credentials
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "SELECT 1;"

# List databases
docker compose exec indexer-db psql -U indexer -l
```

**Solution:**
```bash
# Verify credentials in .env
cat .env | grep POSTGRES

# Recreate database if missing
docker compose exec indexer-db psql -U indexer -c "CREATE DATABASE kaspa_indexers;"
docker compose exec indexer-db psql -U indexer -c "CREATE DATABASE ksocial;"
docker compose exec indexer-db psql -U indexer -c "CREATE DATABASE simply_kaspa;"

# Run initialization scripts manually
docker compose exec -T indexer-db psql -U indexer -d ksocial < config/postgres/init/02-k-social-timescaledb.sql
docker compose exec -T indexer-db psql -U indexer -d simply_kaspa < config/postgres/init/03-simply-kaspa-timescaledb.sql

# Restart indexers
docker compose restart k-indexer simply-kaspa-indexer
```

#### Database Performance Issues

**Symptoms:**
- Slow query performance
- High disk I/O
- Indexers lag behind blockchain

**Diagnosis:**
```bash
# Check database size
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "\l+"

# Check table sizes
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "\dt+"

# Check active connections
docker compose exec indexer-db psql -U indexer -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor query performance
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Solution:**
```bash
# Enable TimescaleDB compression (if not already enabled)
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT add_compression_policy('blocks', INTERVAL '2 hours');
SELECT add_compression_policy('transactions', INTERVAL '2 hours');
"

# Vacuum and analyze
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM ANALYZE;"

# Increase shared_buffers (requires restart)
# Edit docker-compose.yml, add to indexer-db command:
# -c shared_buffers=2GB -c effective_cache_size=6GB

# Restart database
docker compose restart indexer-db
```

### Indexer Issues

#### Kasia Indexer Not Syncing

**Symptoms:**
- Indexer stuck at low block height
- WebSocket connection errors
- No data in API responses

**Diagnosis:**
```bash
# Check indexer status
curl http://localhost:3002/health
curl http://localhost:3002/metrics

# Check logs
docker compose logs kasia-indexer | tail -100

# Test WebSocket connection to node
docker compose exec kasia-indexer curl http://kaspa-node:17110
```

**Solution:**
```bash
# Verify WebSocket URL in configuration
docker compose exec kasia-indexer env | grep KASPA

# Restart indexer
docker compose restart kasia-indexer

# If data is corrupted, resync
docker compose down kasia-indexer
docker volume rm kaspa-aio_kasia-indexer-data
docker compose up -d kasia-indexer

# Monitor sync progress
docker compose logs -f kasia-indexer
```

#### K-indexer Database Errors

**Symptoms:**
- `relation does not exist`
- Schema migration failures
- Data insertion errors

**Diagnosis:**
```bash
# Check if database exists
docker compose exec indexer-db psql -U indexer -l | grep ksocial

# Check tables
docker compose exec indexer-db psql -U indexer -d ksocial -c "\dt"

# Check indexer logs
docker compose logs k-indexer | grep -i "error\|database"
```

**Solution:**
```bash
# Recreate database and schema
docker compose exec indexer-db psql -U indexer -c "DROP DATABASE IF EXISTS ksocial;"
docker compose exec indexer-db psql -U indexer -c "CREATE DATABASE ksocial;"
docker compose exec -T indexer-db psql -U indexer -d ksocial < config/postgres/init/02-k-social-timescaledb.sql

# Restart indexer
docker compose restart k-indexer

# Monitor for errors
docker compose logs -f k-indexer
```

#### Simply Kaspa Indexer Performance Issues

**Symptoms:**
- Indexer cannot keep up with blockchain
- High memory usage
- Slow API responses

**Diagnosis:**
```bash
# Check indexer mode
docker compose logs simply-kaspa-indexer | grep -i "mode\|config"

# Check resource usage
docker stats simply-kaspa-indexer

# Check database performance
docker compose exec indexer-db psql -U indexer -d simply_kaspa -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Solution:**
```bash
# Switch to light mode for better performance
# Edit docker-compose.yml or use environment variable
SIMPLY_INDEXER_MODE=light docker compose up -d simply-kaspa-indexer

# Enable compression for older data
docker compose exec indexer-db psql -U indexer -d simply_kaspa -c "
SELECT add_compression_policy('blocks', INTERVAL '1 hour');
SELECT add_compression_policy('transactions', INTERVAL '1 hour');
"

# Increase resource limits
# Edit docker-compose.yml under simply-kaspa-indexer:
deploy:
  resources:
    limits:
      memory: 4G
    reservations:
      memory: 2G

docker compose up -d simply-kaspa-indexer
```

### Application Issues

#### Kasia App Cannot Connect to Indexer

**Symptoms:**
- App loads but shows no messages
- Connection errors in browser console
- `KASIA_INDEXER_URL` errors

**Diagnosis:**
```bash
# Check if indexer is running
curl http://localhost:3002/health

# Check app logs
docker compose logs kasia-app | grep -i "indexer\|connection"

# Test connectivity from app container
docker compose exec kasia-app curl http://kasia-indexer:3000/health
```

**Solution:**
```bash
# Verify KASIA_INDEXER_URL in .env
cat .env | grep KASIA_INDEXER_URL

# Ensure indexer is started before app
docker compose up -d kasia-indexer
sleep 30  # Wait for indexer to be ready
docker compose up -d kasia-app

# Check service dependencies in docker-compose.yml
# kasia-app should have: depends_on: kasia-indexer

# Restart both services
docker compose restart kasia-indexer kasia-app
```

#### K Social App Shows No Content

**Symptoms:**
- App loads but feed is empty
- API errors in browser console
- Cannot load user profiles

**Diagnosis:**
```bash
# Check if K-indexer is running and synced
curl http://localhost:3004/health
curl http://localhost:3004/api/get-posts-watching

# Check app logs
docker compose logs k-social | grep -i "error\|api"

# Test connectivity
docker compose exec k-social curl http://k-indexer:3000/health
```

**Solution:**
```bash
# Verify apiBaseUrl configuration
docker compose exec k-social cat /app/config.json | grep apiBaseUrl

# Ensure K-indexer is fully synced
docker compose logs k-indexer | tail -50

# Restart services in order
docker compose restart k-indexer
sleep 30
docker compose restart k-social

# Clear browser cache and reload
```

#### Mining Stratum Bridge Connection Issues

**Symptoms:**
- Miners cannot connect
- `connection refused` errors
- No shares being submitted

**Diagnosis:**
```bash
# Check stratum bridge status
docker compose logs kaspa-stratum | tail -50

# Test port accessibility
telnet localhost 5555

# Check node connectivity from stratum
docker compose exec kaspa-stratum curl http://kaspa-node:16111
```

**Solution:**
```bash
# Verify stratum configuration
docker compose logs kaspa-stratum | grep -i "config\|address"

# Ensure mining port is open
sudo ufw allow 5555/tcp

# Restart stratum bridge
docker compose restart kaspa-stratum

# Test with mining software
# Example: lolMiner --algo KASPA --pool 127.0.0.1:5555 --user YOUR_ADDRESS
```

## 🌐 Network and Connectivity Issues

### Cannot Access Dashboard

**Symptoms:**
- `connection refused` when accessing http://localhost:8080
- Dashboard page doesn't load
- Nginx errors

**Diagnosis:**
```bash
# Check if dashboard is running
docker compose ps dashboard nginx

# Check dashboard logs
docker compose logs dashboard nginx

# Test direct dashboard access (bypass nginx)
curl http://localhost:8080
```

**Solution:**
```bash
# Restart dashboard and nginx
docker compose restart dashboard nginx

# Check port configuration in .env
cat .env | grep DASHBOARD_PORT

# Verify nginx configuration
docker compose exec nginx nginx -t

# If port conflict, change in .env and restart
DASHBOARD_PORT=8081 docker compose up -d dashboard nginx
```

### Firewall Blocking Connections

**Symptoms:**
- External connections fail
- Port forwarding doesn't work
- Services work locally but not remotely

**Diagnosis:**
```bash
# Check firewall status
sudo ufw status verbose

# Check which ports are listening
sudo netstat -tulpn | grep LISTEN

# Test from external network
# Use: https://www.yougetsignal.com/tools/open-ports/
```

**Solution:**
```bash
# Allow required ports
sudo ufw allow 16110/tcp  # Kaspa P2P
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 5555/tcp   # Mining (if enabled)

# Reload firewall
sudo ufw reload

# Verify rules
sudo ufw status numbered

# Configure router port forwarding
# See docs/public-node-setup.md for details
```

### DNS Resolution Issues

**Symptoms:**
- Services cannot resolve hostnames
- `could not resolve host` errors
- External connections fail

**Diagnosis:**
```bash
# Test DNS from containers
docker compose exec kaspa-node ping -c 3 google.com
docker compose exec kasia-indexer nslookup kaspa-node

# Check Docker DNS settings
docker network inspect kaspa-aio_default | grep -A 5 "DNS"
```

**Solution:**
```bash
# Add custom DNS to docker-compose.yml
# Under each service:
dns:
  - 8.8.8.8
  - 8.8.4.4

# Or configure Docker daemon DNS
sudo nano /etc/docker/daemon.json
# Add:
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

# Restart Docker
sudo systemctl restart docker

# Restart services
docker compose down
docker compose up -d
```

## 💾 Data and Storage Issues

### Volume Mount Errors

**Symptoms:**
- `no such file or directory`
- Permission denied on volumes
- Data not persisting

**Diagnosis:**
```bash
# List volumes
docker volume ls | grep kaspa-aio

# Inspect volume
docker volume inspect kaspa-aio_kaspa-data

# Check volume contents
docker run --rm -v kaspa-aio_kaspa-data:/data alpine ls -la /data
```

**Solution:**
```bash
# Fix permissions
docker compose down
docker run --rm -v kaspa-aio_kaspa-data:/data alpine chown -R 1000:1000 /data
docker compose up -d

# If volume is corrupted, recreate
docker compose down
docker volume rm kaspa-aio_kaspa-data
docker compose up -d

# Restore from backup if available
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/kaspa-backup.tar.gz -C /data
```

### Backup and Restore Issues

**Symptoms:**
- Backup script fails
- Cannot restore from backup
- Corrupted backup files

**Diagnosis:**
```bash
# Test backup creation
./scripts/manage.sh backup

# Verify backup file
tar -tzf kaspa-backup-*.tar.gz | head -20

# Check available space
df -h
```

**Solution:**
```bash
# Create manual backup
docker compose down
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/manual-backup-$(date +%Y%m%d).tar.gz -C /data .
docker compose up -d

# Restore from backup
docker compose down
docker volume rm kaspa-aio_kaspa-data
docker volume create kaspa-aio_kaspa-data
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/kaspa-backup-20241110.tar.gz -C /data
docker compose up -d
```

### Database Backup and Recovery

**Symptoms:**
- Database backup fails
- Cannot restore database
- Data loss after restart

**Diagnosis:**
```bash
# Check database size
docker compose exec indexer-db psql -U indexer -c "\l+"

# Test backup
docker compose exec indexer-db pg_dump -U indexer kaspa_indexers > test-backup.sql

# Check backup file
ls -lh test-backup.sql
head -50 test-backup.sql
```

**Solution:**
```bash
# Create database backup
docker compose exec indexer-db pg_dump -U indexer kaspa_indexers | gzip > indexer-backup-$(date +%Y%m%d).sql.gz

# Backup all databases
docker compose exec indexer-db pg_dumpall -U indexer | gzip > all-databases-$(date +%Y%m%d).sql.gz

# Restore database
gunzip < indexer-backup-20241110.sql.gz | docker compose exec -T indexer-db psql -U indexer kaspa_indexers

# Restore all databases
gunzip < all-databases-20241110.sql.gz | docker compose exec -T indexer-db psql -U indexer

# Verify restoration
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "SELECT count(*) FROM blocks;"
```

## 🔄 Update and Upgrade Issues

### Docker Image Pull Failures

**Symptoms:**
- `error pulling image`
- `manifest unknown`
- Update script fails

**Diagnosis:**
```bash
# Test Docker Hub connectivity
docker pull hello-world

# Check image availability
docker pull kaspanet/rusty-kaspad:latest

# Check Docker login status
docker login
```

**Solution:**
```bash
# Retry with specific tag
docker pull kaspanet/rusty-kaspad:0.14.0

# Use mirror or alternative registry
# Edit docker-compose.yml to use specific image versions

# Clear Docker cache
docker system prune -a

# Pull images manually
docker compose pull
docker compose up -d
```

### Service Update Failures

**Symptoms:**
- Services won't start after update
- Configuration incompatibilities
- Data migration errors

**Diagnosis:**
```bash
# Check service versions
docker compose images

# Check logs for errors
docker compose logs | grep -i "error\|failed"

# Compare configurations
git diff docker-compose.yml
```

**Solution:**
```bash
# Rollback to previous version
docker compose down
git checkout HEAD~1 docker-compose.yml
docker compose up -d

# Or use specific image tags
# Edit docker-compose.yml, change:
# image: kaspanet/rusty-kaspad:latest
# to:
# image: kaspanet/rusty-kaspad:0.13.0

# Restart services
docker compose up -d

# If data migration needed, backup first
./scripts/manage.sh backup
docker compose down
# Run migration scripts
docker compose up -d
```

## 🔍 Diagnostic Procedures

### Complete System Diagnostic

Run this comprehensive diagnostic when troubleshooting complex issues:

```bash
#!/bin/bash
# Save as: diagnostic-report.sh

echo "=== Kaspa All-in-One Diagnostic Report ===" > diagnostic-report.txt
echo "Generated: $(date)" >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== System Information ===" >> diagnostic-report.txt
uname -a >> diagnostic-report.txt
cat /etc/os-release >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== Docker Version ===" >> diagnostic-report.txt
docker --version >> diagnostic-report.txt
docker compose version >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== Disk Space ===" >> diagnostic-report.txt
df -h >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== Docker Disk Usage ===" >> diagnostic-report.txt
docker system df >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== Running Services ===" >> diagnostic-report.txt
docker compose ps >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "=== Service Health ===" >> diagnostic-report.txt
./scripts/health-check.sh >> diagnostic-report.txt 2>&1
echo "" >> diagnostic-report.txt

echo "=== Recent Logs (Last 50 lines per service) ===" >> diagnostic-report.txt
for service in kaspa-node dashboard kasia-indexer k-indexer simply-kaspa-indexer; do
    echo "--- $service ---" >> diagnostic-report.txt
    docker compose logs --tail=50 $service >> diagnostic-report.txt 2>&1
    echo "" >> diagnostic-report.txt
done

echo "=== Network Connectivity ===" >> diagnostic-report.txt
curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"ping","params":{}}' \
     http://localhost:16111 >> diagnostic-report.txt 2>&1
echo "" >> diagnostic-report.txt

echo "=== Port Status ===" >> diagnostic-report.txt
sudo netstat -tulpn | grep -E ":(8080|16110|16111|3001|3002|3003|3004|3005|5432)" >> diagnostic-report.txt
echo "" >> diagnostic-report.txt

echo "Diagnostic report saved to: diagnostic-report.txt"
```

### Performance Profiling

When experiencing performance issues:

```bash
# Monitor resource usage
docker stats --no-stream > resource-usage.txt

# Check system load
uptime
top -b -n 1 | head -20

# Check I/O wait
iostat -x 1 5

# Check network usage
iftop -t -s 5

# Profile specific service
docker compose exec kaspa-node top -b -n 1
```
