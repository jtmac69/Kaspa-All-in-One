# Kaspa All-in-One Frequently Asked Questions (FAQ)

This FAQ addresses common questions about the Kaspa All-in-One system, covering installation, configuration, operation, and troubleshooting.

## 🚀 Getting Started

### What is Kaspa All-in-One?

Kaspa All-in-One is a comprehensive Docker-based solution for running a complete Kaspa blockchain ecosystem on a single machine or distributed across multiple machines. It includes:

- Kaspa full node
- Multiple indexing services (Kasia, K-Social, Simply Kaspa)
- User applications (messaging, social media)
- Mining capabilities
- Management dashboard
- Database infrastructure

### What hardware do I need?

**Minimum Requirements:**
- CPU: 4 cores (AMD Ryzen 5 or Intel equivalent)
- RAM: 16GB
- Storage: 500GB SSD
- Network: 100Mbps internet

**Recommended Configuration:**
- CPU: AMD Ryzen 7 7735HS (8 cores, 16 threads)
- RAM: 32GB DDR5
- Storage: 1TB NVMe SSD
- Network: Gigabit Ethernet

**Recommended Hardware:** Beelink SER7 7735HS mini PC (~$400-450)

### Which operating systems are supported?

**Officially Supported:**
- Ubuntu Desktop 22.04 LTS (Recommended)
- Ubuntu Desktop 24.04 LTS

**Planned Support:**
- Arch-based distributions
- Debian 12
- Other Linux distributions with Docker support

### How long does installation take?

- **Installation script**: 5-10 minutes
- **Initial Docker image downloads**: 10-20 minutes
- **Kaspa node sync**: 2-6 hours (depending on network speed)
- **Indexer sync**: 1-4 hours after node sync

**Total time to full operation**: 4-10 hours

### Can I run this on a Raspberry Pi?

Not recommended. While technically possible, Raspberry Pi lacks the CPU power and RAM needed for smooth operation. The Kaspa node alone requires significant resources, and adding indexers would make it impractical.

## 🔧 Installation and Setup

### How do I install Kaspa All-in-One?

**One-line installation:**
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/kaspa-aio/main/install.sh | bash
```

**Manual installation:**
```bash
git clone https://github.com/your-repo/kaspa-aio.git
cd kaspa-aio
./install.sh
```

### Do I need to install Docker first?

No, the installation script will detect if Docker is missing and offer to install it for you. However, you can install Docker manually beforehand if preferred.

### What profiles should I enable?

It depends on your use case:

- **Core only**: Just want to run a Kaspa node
- **+ prod**: Want to use messaging and social apps
- **+ explorer**: Want to index blockchain data
- **+ archive**: Need long-term data retention
- **+ development**: Developing or debugging
- **+ mining**: Want to mine Kaspa

**Most common setup:**
```bash
docker compose --profile prod --profile explorer up -d
```

### Can I change profiles after installation?

Yes! You can start and stop profiles at any time:

```bash
# Add explorer profile
docker compose --profile explorer up -d

# Remove prod profile
docker compose --profile prod down

# Change active profiles
docker compose --profile prod --profile explorer up -d
```

### How do I update to the latest version?

```bash
# Pull latest code
cd kaspa-aio
git pull

# Update Docker images
docker compose pull

# Restart services
docker compose up -d

# Verify update
./scripts/health-check.sh
```

## 🌐 Network and Connectivity

### Do I need to open ports on my router?

**For basic operation**: No, the system works fine without port forwarding.

**For public node operation**: Yes, forward port 16110 (TCP) to your machine's local IP.

**For mining**: Yes, forward port 5555 (TCP) if accepting external miners.

See [docs/public-node-setup.md](public-node-setup.md) for detailed instructions.

### Can I use a remote Kaspa node instead of running my own?

Yes! You can configure indexers and applications to use any accessible Kaspa node:

```bash
# In .env file
REMOTE_KASPA_NODE_URL=http://public-node.example.com:16111
KASPA_NODE_WBORSH_URL=ws://public-node.example.com:17110
```

This reduces resource requirements and eliminates sync time.

### How do I check if my node is publicly accessible?

```bash
# Run the node test script
./test-kaspa-node.sh

# Or manually test
curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"ping","params":{}}' \
     http://YOUR_PUBLIC_IP:16111
```

### Can I run services on different machines?

Yes! The system supports distributed deployment:

**Machine 1 (Node):**
```bash
docker compose up -d kaspa-node dashboard
```

**Machine 2 (Indexers):**
```bash
# Point to remote node
REMOTE_KASPA_NODE_URL=http://machine1:16111
docker compose --profile explorer up -d
```

**Machine 3 (Applications):**
```bash
# Point to remote indexers
REMOTE_KASIA_INDEXER_URL=http://machine2:3002
docker compose --profile prod up -d
```

## 💾 Data and Storage

### How much disk space do I need?

**Current requirements (as of November 2024):**
- Kaspa node: ~150GB (growing ~1GB/day)
- Kasia indexer: ~5GB
- K-Social indexer: ~10GB
- Simply Kaspa indexer: ~50GB (full mode)
- Databases: ~20GB

**Total**: ~250GB minimum, 500GB recommended for growth

### Where is data stored?

Data is stored in Docker volumes:
- `kaspa-aio_kaspa-data`: Kaspa node blockchain data
- `kaspa-aio_kasia-indexer-data`: Kasia indexer data
- `kaspa-aio_indexer-db-data`: PostgreSQL database
- `kaspa-aio_archive-db-data`: Archive database

View volumes:
```bash
docker volume ls | grep kaspa-aio
```

### How do I backup my data?

**Automated backup:**
```bash
./scripts/manage.sh backup
```

**Manual backup:**
```bash
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/kaspa-backup-$(date +%Y%m%d).tar.gz -C /data .
```

See [docs/maintenance.md](maintenance.md) for comprehensive backup strategies.

### Can I move data to a different drive?

Yes, you can move Docker's data directory:

```bash
# Stop Docker
sudo systemctl stop docker

# Move data
sudo mv /var/lib/docker /new/location/docker

# Update Docker configuration
sudo nano /etc/docker/daemon.json
# Add: {"data-root": "/new/location/docker"}

# Start Docker
sudo systemctl start docker
```

## 🔍 Operation and Management

### How do I check if everything is working?

```bash
# Quick health check
./scripts/health-check.sh

# Check service status
docker compose ps

# View dashboard
open http://localhost:8080
```

### How do I view logs?

```bash
# All services
docker compose logs

# Specific service
docker compose logs kaspa-node
docker compose logs kasia-indexer

# Follow logs in real-time
docker compose logs -f kaspa-node

# Last 100 lines
docker compose logs --tail=100 kaspa-node
```

### How do I restart a service?

```bash
# Restart specific service
docker compose restart kaspa-node

# Restart all services
docker compose restart

# Stop and start (full restart)
docker compose down
docker compose up -d
```

### How do I stop everything?

```bash
# Stop all services (keeps data)
docker compose down

# Stop and remove volumes (DELETES DATA)
docker compose down -v

# Stop specific profile
docker compose --profile explorer down
```

### Can I access services from other computers on my network?

Yes, services are accessible from your local network by default. Access them using your machine's local IP:

- Dashboard: `http://192.168.1.X:8080`
- Kasia App: `http://192.168.1.X:3001`
- K Social: `http://192.168.1.X:3003`

To restrict access, configure firewall rules or modify docker-compose.yml port bindings.

## 🔧 Troubleshooting

### Services won't start

**Common causes:**
1. Port conflicts - another service using the same port
2. Insufficient resources - not enough RAM or disk space
3. Docker not running - Docker daemon stopped
4. Permission issues - user not in docker group

**Solutions:**
```bash
# Check Docker status
sudo systemctl status docker

# Check disk space
df -h

# Check for port conflicts
sudo netstat -tulpn | grep :8080

# Check logs
docker compose logs
```

See [docs/troubleshooting.md](troubleshooting.md) for detailed solutions.

### Kaspa node won't sync

**Common causes:**
1. Firewall blocking P2P port (16110)
2. No peer connections
3. Corrupted blockchain data
4. Network connectivity issues

**Solutions:**
```bash
# Check peer connections
docker compose logs kaspa-node | grep -i peer

# Open firewall port
sudo ufw allow 16110/tcp

# Resync from scratch (if corrupted)
docker compose down
docker volume rm kaspa-aio_kaspa-data
docker compose up -d kaspa-node
```

### Indexers are not syncing

**Common causes:**
1. Kaspa node not fully synced
2. Database connection issues
3. Configuration errors
4. Insufficient resources

**Solutions:**
```bash
# Check node sync status
curl -X POST -H "Content-Type: application/json" \
     -d '{"method":"getBlockDagInfo","params":{}}' \
     http://localhost:16111

# Check indexer logs
docker compose logs kasia-indexer

# Restart indexer
docker compose restart kasia-indexer
```

### High resource usage

**Common causes:**
1. Initial sync in progress
2. Multiple profiles running
3. Insufficient hardware
4. Database not optimized

**Solutions:**
```bash
# Check resource usage
docker stats

# Disable unnecessary profiles
docker compose --profile explorer down

# Optimize database
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM ANALYZE;"

# Adjust resource limits in docker-compose.yml
```

### Cannot access dashboard

**Common causes:**
1. Dashboard service not running
2. Port conflict
3. Nginx configuration error
4. Firewall blocking port

**Solutions:**
```bash
# Check if dashboard is running
docker compose ps dashboard nginx

# Check logs
docker compose logs dashboard nginx

# Test direct access
curl http://localhost:8080

# Restart services
docker compose restart dashboard nginx
```

## ⛏️ Mining

### Can I mine Kaspa with this setup?

Yes! The system includes a mining stratum bridge for solo mining:

```bash
# Enable mining profile
docker compose --profile mining up -d

# Configure your miner to connect to:
# Host: your-ip-address
# Port: 5555
# Address: your-kaspa-wallet-address
```

### Is solo mining profitable?

Solo mining profitability depends on:
- Your hash rate
- Network difficulty
- Electricity costs
- Hardware efficiency

For most users, pool mining is more profitable due to consistent payouts. Solo mining is better for large operations or those who want to support network decentralization.

### Can I connect external miners?

Yes, configure port forwarding for port 5555 and point your miners to your public IP address.

### What mining software is compatible?

Popular Kaspa miners that work with the stratum bridge:
- lolMiner
- BzMiner
- GMiner
- Team Red Miner
- SRBMiner

Example configuration:
```bash
lolMiner --algo KASPA --pool YOUR_IP:5555 --user YOUR_WALLET_ADDRESS
```

## 🗄️ Database

### What database does the system use?

The system uses **TimescaleDB** (PostgreSQL with time-series extensions) for:
- K-Social indexer
- Simply Kaspa indexer

**Kasia indexer** uses file-based storage (RocksDB) and doesn't require PostgreSQL.

### How do I access the database?

```bash
# Using psql
docker compose exec indexer-db psql -U indexer -d kaspa_indexers

# Using pgAdmin (if development profile enabled)
open http://localhost:9001
```

### How do I backup the database?

```bash
# Backup all databases
docker compose exec indexer-db pg_dumpall -U indexer | gzip > db-backup.sql.gz

# Backup specific database
docker compose exec indexer-db pg_dump -U indexer kaspa_indexers | gzip > kaspa-indexers-backup.sql.gz

# Restore database
gunzip < db-backup.sql.gz | docker compose exec -T indexer-db psql -U indexer
```

### How do I optimize database performance?

```bash
# Run VACUUM ANALYZE
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM ANALYZE;"

# Enable compression (TimescaleDB)
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "
SELECT add_compression_policy('blocks', INTERVAL '1 hour');
"

# Check database size
docker compose exec indexer-db psql -U indexer -c "\l+"
```

## 🔒 Security

### Is this system secure?

The system implements several security best practices:
- Non-root containers
- Network isolation
- Security headers
- Rate limiting
- Regular security updates

However, you should also:
- Keep system updated
- Use strong passwords
- Configure firewall properly
- Limit exposed ports
- Monitor logs regularly

### Should I expose services to the internet?

**Recommended to expose:**
- Kaspa node P2P port (16110) - for public node operation
- Mining stratum port (5555) - if accepting external miners

**NOT recommended to expose:**
- Dashboard (8080) - use VPN or SSH tunnel
- Database ports (5432, 5433) - internal use only
- Indexer APIs (3002-3006) - unless needed for external apps

### How do I secure the dashboard?

```bash
# Option 1: Use SSH tunnel
ssh -L 8080:localhost:8080 user@your-server

# Option 2: Configure nginx authentication
# Add to nginx.conf:
auth_basic "Restricted Access";
auth_basic_user_file /etc/nginx/.htpasswd;

# Option 3: Use VPN (recommended for remote access)
```

### How do I change database passwords?

```bash
# Stop services
docker compose down

# Edit .env file
nano .env
# Change: POSTGRES_PASSWORD=new_secure_password

# Remove old database volume
docker volume rm kaspa-aio_indexer-db-data

# Start services (will recreate with new password)
docker compose up -d
```

## 🚀 Performance

### How can I improve performance?

**Hardware upgrades:**
- Add more RAM (32GB+ recommended)
- Use NVMe SSD instead of SATA SSD
- Upgrade to faster CPU
- Use wired Gigabit Ethernet

**Software optimizations:**
- Enable database compression
- Use light indexer mode
- Disable unnecessary profiles
- Optimize Docker resource limits
- Use SSD for Docker data directory

### Why is initial sync so slow?

Initial sync is resource-intensive because:
- Downloading entire blockchain history
- Validating all blocks and transactions
- Building UTXO set
- Creating database indexes

This is normal and only happens once. Subsequent startups are much faster.

### Can I speed up the sync?

```bash
# Use more CPU cores (edit docker-compose.yml)
deploy:
  resources:
    limits:
      cpus: '8'

# Increase database shared_buffers
# Add to indexer-db command:
-c shared_buffers=4GB

# Use bootstrap (if available)
# Download pre-synced data and restore
```

## 🔄 Updates and Maintenance

### How often should I update?

**Recommended schedule:**
- **Security updates**: Weekly
- **Docker images**: Monthly
- **System packages**: Monthly
- **Major version updates**: Quarterly

### Will updates delete my data?

No, updates preserve your data. However, always backup before major updates:

```bash
# Backup before update
./scripts/manage.sh backup

# Update
docker compose pull
docker compose up -d
```

### How do I rollback an update?

```bash
# Stop services
docker compose down

# Restore previous version
git checkout HEAD~1

# Restore data if needed
docker run --rm -v kaspa-aio_kaspa-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/kaspa-backup-latest.tar.gz -C /data

# Start services
docker compose up -d
```

### What maintenance is required?

**Daily:**
- Monitor service health
- Check disk space

**Weekly:**
- Review logs
- Backup databases
- Clean old Docker images

**Monthly:**
- Full system backup
- Database optimization
- Security updates
- Review resource usage

See [docs/maintenance.md](maintenance.md) for detailed procedures.

## 🤝 Community and Support

### Where can I get help?

**Documentation:**
- [README.md](../README.md) - Overview and quick start
- [docs/troubleshooting.md](troubleshooting.md) - Common issues
- [docs/maintenance.md](maintenance.md) - Maintenance procedures
- [PROJECT_STRUCTURE.md](uncategorized/PROJECT_STRUCTURE.md) - Architecture details

**Community:**
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and ideas
- Discord - Real-time community support
- Kaspa Community - General Kaspa questions

### How can I contribute?

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Report bugs and issues
- Suggest features and improvements
- Submit pull requests
- Improve documentation
- Help other users
- Test new features

### Is there a roadmap?

Yes! Check the project roadmap in:
- GitHub Issues (labeled "enhancement")
- GitHub Discussions
- [.kiro/specs/kaspa-all-in-one-project/tasks.md](../.kiro/specs/kaspa-all-in-one-project/tasks.md)

### How do I report a bug?

1. Check if issue already exists in GitHub Issues
2. Gather diagnostic information:
   ```bash
   ./scripts/health-check.sh -v > diagnostic.txt
   docker compose logs > logs.txt
   ```
3. Create detailed issue with:
   - Description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - System information
   - Relevant logs

### Can I request features?

Yes! Create a feature request in GitHub Issues or Discussions. Include:
- Use case and benefits
- Proposed implementation (if any)
- Willingness to contribute

## 💡 Advanced Topics

### Can I run this in the cloud?

Yes, the system works on cloud providers:
- AWS EC2
- Google Cloud Compute Engine
- Azure Virtual Machines
- DigitalOcean Droplets
- Linode

**Recommended instance types:**
- AWS: t3.xlarge or larger
- GCP: n2-standard-4 or larger
- Azure: Standard_D4s_v3 or larger

### Can I use Kubernetes?

Kubernetes support is planned for future releases. Current Docker Compose setup can be converted to Kubernetes manifests, but this requires manual work.

### Can I customize the configuration?

Yes! The system is highly customizable:

**Environment variables** (.env):
- Port configurations
- Resource limits
- Feature flags
- Remote connections

**Docker Compose** (docker-compose.yml):
- Service definitions
- Resource limits
- Network configuration
- Volume mounts

**Service configs**:
- Nginx configuration
- Database settings
- Indexer modes

### How do I add custom services?

Add services to docker-compose.yml:

```yaml
my-custom-service:
  image: my-image:latest
  profiles: ["custom"]
  depends_on:
    - kaspa-node
  environment:
    - KASPA_NODE_URL=http://kaspa-node:16111
  networks:
    - kaspa-network
```

Start with custom profile:
```bash
docker compose --profile custom up -d
```

### Can I use this for development?

Yes! Enable the development profile:

```bash
docker compose --profile development up -d
```

This provides:
- Portainer (container management)
- pgAdmin (database management)
- Direct access to all services
- Hot-reload capabilities (for custom services)

### How do I monitor with Prometheus/Grafana?

Add monitoring stack to docker-compose.yml:

```yaml
prometheus:
  image: prom/prometheus:latest
  profiles: ["monitoring"]
  volumes:
    - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  profiles: ["monitoring"]
  ports:
    - "3000:3000"
  depends_on:
    - prometheus
```

Configure Prometheus to scrape metrics from services.

---

## 📚 Additional Resources

- **Official Kaspa Website**: https://kaspa.org
- **Kaspa Documentation**: https://docs.kaspa.org
- **Kaspa Discord**: https://discord.gg/kaspa
- **GitHub Repository**: https://github.com/your-repo/kaspa-aio

---

**Have a question not answered here? Create a GitHub Discussion or ask in Discord! 💬**
