# CLAUDE.md — Kaspa All-in-One

## Project Overview

Kaspa All-in-One (AIO) is a Docker-based deployment system for the Kaspa blockchain ecosystem. It provides a web-based installation wizard, a management dashboard, and orchestrates 11+ containerized services (node, indexers, apps, explorer, mining). The project targets self-hosted operators who want to run various combinations of Kaspa infrastructure on their own hardware.

- **Version**: 0.9.0-test (pre-production)
- **License**: MIT
- **Primary languages**: JavaScript (Node.js), Bash, with Rust and Go services pulled as Docker images
- **Node.js requirement**: >= 18.0.0

## Repository Structure

```
Kaspa-All-in-One/
├── services/                  # All service source code
│   ├── wizard/                # Installation wizard (Express + Socket.IO)
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   │   ├── server.js          # Main Express server entry point
│   │   │   │   ├── api/               # REST API route modules (30+ files)
│   │   │   │   ├── config/            # Build config, configuration field definitions
│   │   │   │   ├── middleware/         # Express middleware
│   │   │   │   ├── utils/             # Utility functions
│   │   │   │   └── validators/        # Input validation (Joi)
│   │   │   ├── package.json
│   │   │   └── start-local.sh         # Local development launcher
│   │   ├── frontend/
│   │   │   └── public/
│   │   │       ├── index.html         # Single-page wizard UI
│   │   │       ├── scripts/wizard.js  # Client-side wizard logic
│   │   │       ├── styles/wizard.css  # Kaspa-branded styling
│   │   │       └── assets/            # Brand assets, icons
│   │   └── Dockerfile
│   ├── dashboard/             # Management dashboard (Express, host-based)
│   │   ├── server.js          # Main server (monolithic, ~116KB)
│   │   ├── lib/               # Business logic modules (PascalCase classes)
│   │   │   ├── ServiceController.js
│   │   │   ├── ServiceMonitor.js
│   │   │   ├── KaspaNodeClient.js
│   │   │   ├── WalletManager.js
│   │   │   ├── ResourceMonitor.js
│   │   │   ├── AlertManager.js
│   │   │   ├── LogManager.js
│   │   │   ├── SecurityMiddleware.js
│   │   │   └── ... (20+ modules)
│   │   ├── public/            # Static frontend assets
│   │   ├── test/              # Jest integration tests
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── kaspa-dashboard.service    # Systemd service file
│   ├── shared/                # Shared library (@kaspa-aio/shared)
│   │   └── lib/
│   │       ├── index.js               # Main exports
│   │       ├── state-manager.js       # Installation state management
│   │       ├── port-fallback.js       # Port conflict resolution
│   │       ├── service-detector.js    # Running service detection
│   │       ├── cross-launch.js        # Cross-service launching
│   │       └── error-display.js       # Unified error display
│   ├── kasia/                 # Kasia messaging app (Dockerfile)
│   ├── kasia-indexer/         # Kasia indexer (Dockerfile, no src - uses pre-built image)
│   ├── k-social/              # K-Social platform (Dockerfile)
│   ├── k-indexer/             # K-Social indexer (Dockerfile)
│   ├── kaspa-explorer/        # Block explorer (Dockerfile)
│   ├── kaspa-stratum/         # Mining stratum bridge (Dockerfile)
│   └── simply-kaspa-indexer/  # Blockchain indexer (Dockerfile)
├── config/
│   ├── nginx.conf             # Reverse proxy config (rate limiting, security headers)
│   └── postgres/              # PostgreSQL init scripts per service
│       ├── init/              # Shared initialization
│       ├── archive-init/      # Archive database setup
│       ├── k-social-init/     # K-Social database setup
│       └── simply-kaspa-init/ # Simply Kaspa database setup
├── scripts/                   # Management utilities
│   ├── manage.sh              # CLI service management (start/stop/restart/backup)
│   ├── health-check.sh        # System diagnostics with JSON output
│   ├── wizard.sh              # Wizard launcher
│   └── verify-system.sh       # Pre-flight system checks
├── docs/                      # Extensive documentation (100+ files)
│   ├── architecture/          # Architecture decision docs
│   ├── guides/                # User and developer guides
│   ├── quick-references/      # Quick reference cards
│   ├── future-enhancements/   # Planned features
│   ├── testing/               # Test documentation
│   └── release/               # Release management
├── docker-compose.yml         # Main orchestration (profile-based)
├── docker-compose.test.yml    # Test-specific compose
├── .env.example               # Environment variable template
├── install.sh                 # Main installer script
├── start-test.sh              # Test release launcher
├── fresh-start.sh             # Clean reset script
├── test-*.sh                  # ~40 test scripts (integration, profiles, services)
├── TESTING.md                 # Comprehensive testing guide
├── KNOWN_ISSUES.md            # Tracked issues for current release
├── CONTRIBUTING.md            # Contribution guidelines
├── QUICK_START.md             # Quick start guide
└── README.md                  # Full project documentation
```

## Architecture: Templates, Profiles, and Services

The system uses a **two-tier configuration model**:

```
Templates (12, user-facing)  →  Profiles (8, Docker Compose)  →  Services (11, containers)
```

### 12 Installation Templates (user selects one)
`quick-start`, `kaspa-node`, `kasia-suite`, `k-social-suite`, `kaspa-explorer`, `solo-miner`, `archive-historian`, `pool-operator`, `public-infrastructure`, `developer`, `kaspa-sovereignty`, `custom-setup`

### 8 Docker Compose Profiles
`kaspa-node`, `kaspa-archive-node`, `kasia-app`, `k-social-app`, `kasia-indexer`, `k-indexer-bundle`, `kaspa-explorer-bundle`, `kaspa-stratum`

### 11 Services
| Service | Technology | Default Port(s) |
|---------|-----------|-----------------|
| kaspa-node | rusty-kaspad Docker image | 16110 (RPC), 16111 (P2P), 17110 (Borsh) |
| wizard | Node.js 18 + Express + Socket.IO | 3000 |
| dashboard | Node.js 18 + Express (host-based) | 8080 |
| kasia (app) | Node.js 20 | 3001 |
| kasia-indexer | Rust (pre-built image) | 3002 |
| k-social (app) | Node.js 20 | 3003 |
| k-indexer | Rust | 3004/3005 |
| simply-kaspa-indexer | Docker (pre-built) | 3006 |
| kaspa-explorer | Node.js 18 | 3008 |
| kaspa-stratum | Go 1.23 | 16112 |
| timescaledb | PostgreSQL + TimescaleDB | 5432 |

## Key Technical Details

### Wizard Backend (`services/wizard/backend/`)
- **Entry point**: `src/server.js`
- **Framework**: Express.js with Socket.IO for real-time progress updates
- **API modules** in `src/api/`: Each file exports route handlers for a feature area (profiles, templates, system-check, install, reconfigure, config, diagnostics, etc.)
- **Validation**: Joi schemas in `src/validators/`
- **Template-first approach**: The wizard walks users through 7 steps (Welcome → System Check → Template → Config → Review → Install → Complete)
- **Dev server**: `npm run dev` (nodemon) or `./start-local.sh`

### Dashboard (`services/dashboard/`)
- **Entry point**: `server.js` (monolithic, large file)
- **Library modules** in `lib/`: PascalCase class files (e.g., `ServiceController.js`, `KaspaNodeClient.js`)
- **Runs on host** (not containerized) for direct Docker socket and system access
- **Testing**: Jest with supertest — `npm test`, `npm run test:coverage`
- **Systemd integration**: `kaspa-dashboard.service` file provided

### Shared Library (`services/shared/`)
- **Package**: `@kaspa-aio/shared`
- **Module system**: CommonJS (`"type": "commonjs"`)
- **Key exports**: `state-manager`, `port-fallback`, `service-detector`, `cross-launch`, `error-display`
- **Tests**: Co-located with source (e.g., `state-manager.test.js` alongside `state-manager.js`)

### Docker Compose
- Uses **Docker Compose profiles** to selectively start services
- The wizard dynamically generates/modifies `docker-compose.yml` based on template selection
- Services connect via the `kaspa-network` bridge network
- Named volumes for data persistence (`kaspa-data`, `wizard-state`, etc.)

## Development Workflow

### Prerequisites
- Docker and Docker Compose
- Node.js >= 18
- Git

### Local Development Setup
```bash
cp .env.example .env
# Edit .env as needed

# Wizard backend development:
cd services/wizard/backend
npm install
npm run dev              # Starts with nodemon on port 3000

# Dashboard development:
cd services/dashboard
npm install
npm run dev              # Starts with nodemon on port 8080
```

### Running Services via Docker
```bash
# Start specific profile
docker compose --profile core up -d           # Just kaspa-node
docker compose --profile wizard up -d         # Installation wizard

# Use management script
./scripts/manage.sh start <profile>
./scripts/manage.sh status
./scripts/manage.sh stop
```

### Testing

**Dashboard tests (Jest)**:
```bash
cd services/dashboard
npm test                 # Run all tests
npm run test:coverage    # With coverage report
```

**Shared library tests (Jest)**:
```bash
cd services/shared
npm test
```

**Integration/system tests** — root-level shell scripts:
```bash
./test-wizard-core-profile.sh        # Wizard core profile flow
./test-dashboard.sh                  # Dashboard functionality
./test-e2e.sh                        # End-to-end tests
./test-service-dependencies.sh       # Service dependency chain
./test-kasia-indexer.sh              # Kasia indexer
# ... ~40 test scripts for various scenarios
```

**Mock variants** exist for several tests (e.g., `test-wizard-core-profile-mock.sh`) that don't require running services.

### Health Checks
```bash
./scripts/health-check.sh           # Full system diagnostics
./status.sh                         # Quick service status
```

## Code Conventions

### Commit Messages
Follow **Conventional Commits**:
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: wizard, dashboard, shared, etc.
```
Examples from history:
- `feat: Implement comprehensive wallet security (Phase 6)`
- `fix: correct kaspa-node configuration fields in settings modification`
- `feat(wizard): Phase 4 - Reconfiguration mode banner`

### File Naming
- **Wizard API modules**: `kebab-case.js` (e.g., `system-check.js`, `error-remediation.js`)
- **Dashboard lib modules**: `PascalCase.js` (e.g., `ServiceController.js`, `KaspaNodeClient.js`)
- **Shared lib modules**: `kebab-case.js` (e.g., `state-manager.js`, `port-fallback.js`)
- **Test files**: Co-located or in `test/` directories, named `*.test.js` or `test-*.js`
- **Shell scripts**: `kebab-case.sh`

### JavaScript Style
- CommonJS modules (`require`/`module.exports`) throughout
- Express.js route handlers and middleware pattern
- Dashboard uses class-based architecture in `lib/`
- Wizard API uses functional module pattern
- Joi for request validation

### Docker Conventions
- Alpine-based images preferred for small size
- Non-root container execution
- Health checks included in service definitions
- Services use environment variables from `.env` with defaults via `${VAR:-default}` syntax

### Environment Variables
- Defined in `.env` (gitignored), templated in `.env.example`
- Port variables follow pattern: `SERVICE_NAME_PORT`
- Database credentials: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Modes: `KASPA_NODE_MODE` (local/remote), `WIZARD_MODE` (install/reconfigure)

## Important Files to Know

| File | Why It Matters |
|------|---------------|
| `docker-compose.yml` | Main service orchestration — dynamically modified by wizard |
| `.env.example` | All configurable environment variables |
| `services/wizard/backend/src/server.js` | Wizard backend entry point |
| `services/wizard/backend/src/api/` | All wizard REST endpoints |
| `services/wizard/frontend/public/scripts/wizard.js` | Client-side wizard logic |
| `services/dashboard/server.js` | Dashboard entry point (large monolithic file) |
| `services/dashboard/lib/` | Dashboard business logic modules |
| `services/shared/lib/` | Shared utilities used by both wizard and dashboard |
| `config/nginx.conf` | Nginx reverse proxy with security headers |
| `config/postgres/` | Database initialization SQL scripts |
| `scripts/manage.sh` | CLI for service management |
| `KNOWN_ISSUES.md` | Current known issues — check before investigating bugs |

## Things to Watch Out For

1. **The wizard modifies `docker-compose.yml` at runtime** — it's generated, not purely hand-written. Be careful with manual edits. Do NOT commit `docker-compose.yml` — it's runtime state.
2. **Dashboard runs on the host**, not in Docker. It needs direct access to Docker socket and system metrics.
3. **The dashboard `server.js` is ~116KB** — it's a large monolithic file. Changes there should be careful and targeted.
4. **No CI/CD pipeline** — there are no GitHub Actions. Testing is done locally via shell scripts.
5. **Pre-production state** — the project is at v0.9.0-test. Expect rough edges and check `KNOWN_ISSUES.md`.
6. **Some services use pre-built Docker images** (kasia-indexer, simply-kaspa-indexer, kaspa-node) while others build from Dockerfiles in the repo.
7. **Port conflicts** are a real concern — the shared library includes `port-fallback.js` specifically for this.
8. **`.env` files are gitignored** — never commit credentials. The `.env.example` is the template.
9. **40+ shell test scripts at the repo root** — these are integration tests, not unit tests. Many require running Docker services.
10. **The `services/` directory contains `installation-config.json`** which tracks the currently installed template/profile state.
11. **`simply-kaspa-indexer` uses CLI args only** — NOT environment variables. The service generator must use a `command:` directive with `--rpc-url`, `--database-url`, `--listen 0.0.0.0:8080`, `--network`. Env vars are silently ignored and the container prints help text and exits.
12. **`isValidServiceName()` in `ValidationMiddleware.js`** is a hardcoded whitelist — adding new services to the system requires adding them here too, or start/stop/restart API calls will return 400. Current valid services include: `kaspa-explorer`, `timescaledb-explorer`, `timescaledb-kindexer`, `k-social`, `k-indexer`, etc.
13. **TimescaleDB data volumes persist across installs** — if a container was previously initialized with an empty/different password and the volume still exists, re-deploying with a new generated password will cause auth failures. Either clear the volume (`sudo rm -rf /var/lib/kaspa-aio/<service>/`) or update the password in-place via `docker exec ... psql ... ALTER USER`.
14. **Joi schema `stripUnknown: true` in `validateConfig()`** — any config key not in the Joi schema in `config-generator.js` is silently stripped before reaching `generateEnvFile`. When adding new service config fields (e.g. passwords), they MUST be added to the schema first.
15. **Wizard install uses WebSocket `install:start` event**, not the REST `POST /api/install/start` endpoint. Fixes to the install flow must be applied to the socket handler in `server.js`, not just `api/install.js`.
