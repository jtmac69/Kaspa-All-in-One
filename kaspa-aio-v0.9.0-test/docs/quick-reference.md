# Kaspa All-in-One Quick Reference

Quick reference guide for common commands and operations.

## 🚀 Essential Commands

### Service Management
```bash
# Start all services
docker compose up -d

# Start with specific profiles
docker compose --profile prod --profile explorer up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart kaspa-node

# View service status
docker compose ps
```

### Health and Monitoring
```bash
# Run health check
./scripts/health-check.sh

# View logs
docker compose logs [service-name]
docker compose logs -f --tail=100 kaspa-node

# Monitor resources
docker stats

# Check disk space
df -h
docker system df
```

### Maintenance
```bash
# Create backup
./scripts/manage.sh backup

# Update services
docker compose pull
docker compose up -d

# Clean Docker resources
docker system prune -a

# Database optimization
docker compose exec indexer-db psql -U indexer -d kaspa_indexers -c "VACUUM ANALYZE;"
```

## 🔍 Troubleshooting Quick Fixes

### Services Won't Start
```bash
sudo systemctl status docker
df -h
docker compose logs
```

### Node Won't Sync
```bash
sudo ufw allow 16110/tcp
docker compose restart kaspa-node
docker compose logs kaspa-node | grep -i peer
```

### High Resource Usage
```bash
docker stats
docker compose --profile explorer down  # Disable heavy services
```

### Database Issues
```bash
docker compose exec indexer-db pg_isready -U indexer
docker compose restart indexer-db
```

## 📊 Service Endpoints

- **Dashboard**: http://localhost:8080
- **Kaspa Node RPC**: http://localhost:16111
- **Kasia App**: http://localhost:3001
- **Kasia Indexer**: http://localhost:3002
- **K Social App**: http://localhost:3003
- **K-indexer**: http://localhost:3004
- **Simply Kaspa Indexer**: http://localhost:3005
- **Portainer**: http://localhost:9000
- **pgAdmin**: http://localhost:9001

## 📚 Documentation Index

### Essential Documentation
- **[README.md](../README.md)** - Overview and quick start
- **[QUICK_START.md](../QUICK_START.md)** - Quick start guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Complete documentation index

### Core Documentation
- **[Troubleshooting Guide](troubleshooting.md)** - Problem diagnosis and solutions
- **[Maintenance Guide](maintenance.md)** - Maintenance schedules and procedures
- **[FAQ](faq.md)** - Frequently asked questions
- **[Deployment Profiles](deployment-profiles.md)** - Profile-based deployment
- **[Service Dependencies](service-dependencies.md)** - Service relationships
- **[Public Node Setup](public-node-setup.md)** - Network configuration
- **[Project Structure](uncategorized/PROJECT_STRUCTURE.md)** - Architecture details

### Quick Reference Guides
- **[Checklist Page](quick-references/CHECKLIST_PAGE_QUICK_REFERENCE.md)** - Checklist page features
- **[Error Remediation](quick-references/ERROR_REMEDIATION_QUICK_REFERENCE.md)** - Error fixing guide
- **[Installation Guides](quick-references/INSTALLATION_GUIDES_QUICK_REFERENCE.md)** - OS-specific installation
- **[Post-Installation Tour](quick-references/POST_INSTALLATION_TOUR_QUICK_REFERENCE.md)** - Getting started
- **[Rollback Quick Start](quick-references/ROLLBACK_QUICK_START.md)** - Rollback features
- **[Rollback Recovery](quick-references/ROLLBACK_RECOVERY_QUICK_START.md)** - Recovery procedures
- **[Safety System](quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md)** - Safety features
- **[Testing Quick Reference](quick-references/TESTING_QUICK_REFERENCE.md)** - Testing guide
- **[Testing Quick Start](quick-references/TESTING_QUICK_START.md)** - Testing quick start

### Implementation Summaries
See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for a complete categorized list of all implementation summaries, work logs, and other documentation.

## 🆘 Getting Help

1. Check [FAQ](faq.md) for common questions
2. Review [Troubleshooting Guide](troubleshooting.md) for solutions
3. Run diagnostic: `./scripts/health-check.sh -v`
4. Check logs: `docker compose logs`
5. Create GitHub Issue with diagnostic information
6. Ask in Discord for community support

---

**Keep this reference handy for quick access to common operations! 📖**
