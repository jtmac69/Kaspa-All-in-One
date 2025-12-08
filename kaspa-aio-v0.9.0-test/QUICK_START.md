# Kaspa All-in-One - Quick Start

## 🚀 Your Setup (Remote Node Mode)

```bash
# Access Dashboard
open http://localhost:8080

# Run Tests
./test-dashboard.sh --skip-sync-tests

# Check Status
docker compose ps
```

## 📝 Key Commands

### Dashboard
```bash
docker compose up -d dashboard      # Start
docker compose stop dashboard       # Stop
docker compose restart dashboard    # Restart
docker logs dashboard --follow      # View logs
```

### Testing
```bash
./test-dashboard.sh --skip-sync-tests              # Quick test
./test-dashboard.sh --use-remote-node              # Force remote
./test-dashboard.sh --use-local-node               # Force local
./test-dashboard.sh --help                         # All options
```

### Switch Modes
```bash
# Edit .env file:
KASPA_NODE_MODE=remote    # Use public node (current)
KASPA_NODE_MODE=local     # Use local node (needs 8GB+ RAM)
```

## 🔧 Configuration

**Current Setup** (in `.env`):
- Mode: `remote`
- Node: `https://api.kaspa.org`
- Dashboard: `http://localhost:8080`

## 📊 What's Running

```bash
docker compose ps
```

Should show:
- ✅ kaspa-dashboard (port 8080)
- ⏹️ kaspa-node (stopped - using remote)

## 🎯 Quick Links

- Dashboard: http://localhost:8080
- Health Check: http://localhost:8080/health
- API Status: http://localhost:8080/api/status

## 💡 Tips

- **Low Memory?** Keep using remote node (current setup)
- **Want Local Node?** Need 8GB+ RAM, edit `.env` to `KASPA_NODE_MODE=local`
- **Test Changes?** Run `./test-dashboard.sh --skip-sync-tests`
- **See Logs?** Use `docker logs dashboard --follow`

## 📚 Documentation

- `docs/implementation-summaries/infrastructure/REMOTE_NODE_SETUP_COMPLETE.md` - Full setup guide
- `docs/uncategorized/KASPA_NODE_MEMORY_ISSUE.md` - Why we use remote node
- `docs/dashboard-testing.md` - Testing documentation
- `.env.example` - All configuration options

## ✅ You're All Set!

Your dashboard is running with a remote Kaspa node. No memory issues, instant access! 🎉
