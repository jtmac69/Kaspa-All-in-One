# Deployment Profiles Reference

## Profile Architecture

Kaspa All-in-One uses **8 deployment profiles** that group related services. Profiles are the low-level Docker Compose service groupings that define which containers run together.

## Profile Definitions

### kaspa-node

**Purpose**: Standard pruning Kaspa node for network participation

| Property | Value |
|----------|-------|
| Services | `kaspa-node` |
| Dependencies | None |
| Conflicts | `kaspa-archive-node` |
| Min Memory | 4GB |
| Min Disk | 100GB |
| Ports | 16110 (P2P), 16111 (gRPC), 17110 (wRPC) |

**Configuration Keys**:
- `KASPA_NETWORK` — Network selection (mainnet/testnet)
- `PUBLIC_NODE` — Enable public node mode
- `EXTERNAL_IP` — Public IP for P2P
- `WALLET_ENABLED` — Enable wallet functionality

---

### kaspa-archive-node

**Purpose**: Full blockchain history archive node

| Property | Value |
|----------|-------|
| Services | `kaspa-node` (archive mode) |
| Dependencies | None |
| Conflicts | `kaspa-node` |
| Min Memory | 16GB |
| Min Disk | 500GB+ |
| Ports | 16110, 16111, 17110 |

---

### kasia-app

**Purpose**: Kasia decentralized messaging application

| Property | Value |
|----------|-------|
| Services | `kasia-app` |
| Dependencies | External node or `kaspa-node` |
| Conflicts | None |
| Min Memory | 2GB |
| Ports | 3001 (HTTP), 3002 (API) |

---

### k-social-app

**Purpose**: K-Social decentralized social platform

| Property | Value |
|----------|-------|
| Services | `k-social-app` |
| Dependencies | External node or `kaspa-node` |
| Conflicts | None |
| Min Memory | 2GB |
| Ports | 3003 |

---

### kasia-indexer

**Purpose**: Index Kasia messages for search/history

| Property | Value |
|----------|-------|
| Services | `kasia-indexer`, `timescaledb` |
| Dependencies | `kasia-app` (required) |
| Conflicts | None |
| Min Memory | 4GB |
| Ports | 3004 |

---

### k-indexer-bundle

**Purpose**: Index K-Social data for enhanced features

| Property | Value |
|----------|-------|
| Services | `k-indexer`, `timescaledb` |
| Dependencies | `k-social-app` (required) |
| Conflicts | None |
| Min Memory | 4GB |
| Ports | 3005 |

---

### kaspa-explorer-bundle

**Purpose**: Blockchain explorer with indexing

| Property | Value |
|----------|-------|
| Services | `simply-kaspa-indexer`, `kaspa-explorer`, `timescaledb` |
| Dependencies | `kaspa-node` OR `kaspa-archive-node` |
| Conflicts | None |
| Min Memory | 8GB |
| Ports | 3006 (indexer), 3008 (explorer) |

---

### kaspa-stratum

**Purpose**: Mining stratum bridge for solo/pool mining

| Property | Value |
|----------|-------|
| Services | `kaspa-stratum` |
| Dependencies | `kaspa-node` OR `kaspa-archive-node` (required) |
| Conflicts | None |
| Min Memory | 2GB |
| Ports | 16112 (stratum) |

**Configuration Keys**:
- `MINING_ADDRESS` — Kaspa wallet address for rewards (required)
- `STRATUM_PORT` — Stratum listening port

---

## Profile Combinations

### Valid Combinations

| Use Case | Profiles | Min RAM |
|----------|----------|---------|
| Basic node | `kaspa-node` | 4GB |
| Node + Kasia | `kaspa-node`, `kasia-app` | 6GB |
| Full Kasia stack | `kaspa-node`, `kasia-app`, `kasia-indexer` | 8GB |
| Full K-Social stack | `kaspa-node`, `k-social-app`, `k-indexer-bundle` | 8GB |
| Mining setup | `kaspa-node`, `kaspa-stratum` | 6GB |
| Explorer | `kaspa-node`, `kaspa-explorer-bundle` | 12GB |
| Apps only (remote node) | `kasia-app`, `k-social-app` | 2GB |
| Everything | All except conflicting profiles | 32GB+ |

### Invalid Combinations

- ❌ `kaspa-node` + `kaspa-archive-node` — Mutually exclusive
- ❌ `kasia-indexer` without `kasia-app` — Dependency not met
- ❌ `k-indexer-bundle` without `k-social-app` — Dependency not met
- ❌ `kaspa-stratum` without any node — Dependency not met

## Profile Selection Guide

### By Use Case

**I want to...**
- Try Kaspa apps → `kasia-app`, `k-social-app`
- Run my own node → `kaspa-node`
- Use Kasia messaging → `kaspa-node`, `kasia-app`, `kasia-indexer`
- Use K-Social → `kaspa-node`, `k-social-app`, `k-indexer-bundle`
- Explore blockchain → `kaspa-node`, `kaspa-explorer-bundle`
- Mine Kaspa → `kaspa-node`, `kaspa-stratum`
- Support the network → `kaspa-archive-node`
- Run public services → `kaspa-archive-node`, `kaspa-explorer-bundle`

### By Available RAM

- **2GB**: `kasia-app`, `k-social-app` (remote node)
- **4GB**: `kaspa-node`
- **6GB**: `kaspa-node` + one app
- **8GB**: `kaspa-node` + app + indexer
- **12GB**: `kaspa-node` + `kaspa-explorer-bundle`
- **16GB**: `kaspa-archive-node`
- **24GB**: `kaspa-archive-node` + `kaspa-explorer-bundle`
- **32GB+**: All profiles

## See Also

- [Component Matrix](component-matrix.md) - Complete service overview
- [Service Dependencies](service-dependencies.md) - Detailed dependency mapping
- [Troubleshooting Guide](../guides/troubleshooting.md) - Common issues
