# Node Sync Strategy Quick Reference

## Overview

Node synchronization strategy system that gives users 3 options for handling Kaspa node blockchain sync during installation.

## Three Strategies

### 1. Wait for Sync ⏱️
**When**: Sync < 5 minutes  
**Behavior**: Wizard blocks, shows progress  
**Use case**: Quick sync, user wants to wait

### 2. Continue in Background ⭐ (Recommended)
**When**: Sync 5-60 minutes  
**Behavior**: Wizard proceeds, node syncs in background  
**Use case**: Medium sync, user wants to continue

### 3. Skip and Use Public Network 🌐
**When**: Sync > 1 hour  
**Behavior**: No sync, use public nodes permanently  
**Use case**: Long sync, user doesn't need local node

## Quick Start

### Backend Usage

```javascript
const NodeSyncManager = require('./src/utils/node-sync-manager');
const manager = new NodeSyncManager();

// Check sync and get options
const result = await manager.handleNodeSync({ host: 'localhost', port: 16110 });

if (result.action === 'needs-sync') {
  // Show dialog to user, get choice
  const choice = await getUserChoice(result.options);
  
  // Execute strategy
  const config = await manager.executeSyncStrategy(choice, { host: 'localhost', port: 16110 });
}
```

### Frontend Usage

```javascript
import { showSyncStrategyDialog, handleNodeSyncEvent } from './modules/install.js';

// Show dialog
const choice = await showSyncStrategyDialog(syncData);

// Or handle event
await handleNodeSyncEvent(data);
```

## Testing

```bash
# Backend tests
node services/wizard/backend/test-sync-strategy.js

# Frontend tests
open services/wizard/frontend/test-sync-strategy-ui.html
```

## Files

- Backend: `services/wizard/backend/src/utils/node-sync-manager.js`
- Frontend: `services/wizard/frontend/public/scripts/modules/install.js`
- Tests: `test-sync-strategy.js`, `test-sync-strategy-ui.html`
