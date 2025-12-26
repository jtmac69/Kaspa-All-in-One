# Nginx Configuration for Kaspa Applications

## Overview

This document describes the updated Nginx configuration that serves **only containerized Kaspa applications**, following the simplified architecture where the Management Dashboard and Installation Wizard run directly on the host system without proxy.

## Architecture Decision: Direct Access for Host Services

Based on architectural review, the system now uses **Option 1: Direct Access** approach:

- **Dashboard**: Direct access at `http://localhost:8080`
- **Wizard**: Direct access at `http://localhost:3000` 
- **Kaspa Apps**: Proxied through Nginx at `http://localhost/kasia`, etc.

This provides:
- ✅ Simpler architecture
- ✅ No proxy overhead for host services
- ✅ Direct WebSocket connections for dashboard
- ✅ Dashboard works even if Docker is down
- ✅ Easier debugging and development

## Implementation Summary

### Configuration Changes

**File Modified**: `config/nginx.conf`

#### 1. Removed Dashboard Proxy

- Removed dashboard upstream configuration
- Removed dashboard location blocks
- Removed dashboard-specific error handlers
- Removed dashboard API health check proxy

#### 2. Service Selection Landing Page

Added a helpful landing page at `http://localhost/` that provides links to all services:

```html
🚀 Kaspa All-in-One Services

📊 Management Dashboard (Host Service)
   Monitor and manage your Kaspa services
   → http://localhost:8080

⚙️ Installation Wizard (Host Service)  
   Configure profiles and settings
   → http://localhost:3000

💬 Kasia Messaging (Container Service)
   Decentralized messaging on Kaspa
   → /kasia/

🌐 K-Social (Container Service)
   Social networking on Kaspa
   → /social/
```

#### 3. Focused on Container Services Only

Nginx now only handles:
- **Kasia Messaging App** (`/kasia/`)
- **Kasia Indexer API** (`/kasia-api/`)
- **K-Social App** (`/social/`)
- **K-Social Indexer API** (`/social-api/`)
- **Kaspa Node RPC** (`/kaspa-rpc/`) - restricted access

#### 4. Enhanced Security Headers

Maintained security headers for containerized services:
- X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- Content Security Policy with WebSocket support
- Permissions Policy and HSTS for HTTPS

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Host System                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Management      │    │ Installation    │                │
│  │ Dashboard       │    │ Wizard          │                │
│  │ :8080          │    │ :3000           │                │
│  └─────────────────┘    └─────────────────┘                │
│           ▲                       ▲                         │
│           │                       │                         │
│  ┌─────────────────────────────────────────┐               │
│  │           Docker Engine                  │               │
│  │  ┌──────────────────────────────────────┐│               │
│  │  │ Nginx Container :80/:443             ││               │
│  │  │ ┌────────────────────────────────────┤│               │
│  │  │ │ /kasia/ → kasia-app:3000           ││               │
│  │  │ │ /social/ → k-social:3000           ││               │
│  │  │ │ /kasia-api/ → kasia-indexer:8080   ││               │
│  │  │ │ /social-api/ → k-indexer:8080      ││               │
│  │  │ └────────────────────────────────────┤│               │
│  │  └──────────────────────────────────────┘│               │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ External Client │
                    │ (Web Browser)   │
                    └─────────────────┘
```

## User Experience

### Service Access Points

1. **http://localhost/** - Service selection page with links to all services
2. **http://localhost:8080** - Management Dashboard (direct)
3. **http://localhost:3000** - Installation Wizard (direct)
4. **http://localhost/kasia/** - Kasia Messaging App (proxied)
5. **http://localhost/social/** - K-Social App (proxied)

### Cross-Service Integration

The Dashboard and Wizard can now easily link to each other and to the Kaspa applications:

**Dashboard Links**:
- "Open Wizard" → `http://localhost:3000`
- "Open Kasia" → `http://localhost/kasia/`
- "Open K-Social" → `http://localhost/social/`

**Wizard Links**:
- "Go to Dashboard" → `http://localhost:8080`
- Application links → `http://localhost/app-name/`

## Benefits of This Architecture

### 1. Simplified Development
- Dashboard and Wizard can be developed/debugged independently
- No proxy configuration needed for host services
- Direct WebSocket connections for real-time features

### 2. Improved Reliability
- Dashboard works even when Docker is down
- Can monitor and restart Docker services from dashboard
- No circular dependencies (dashboard monitoring Docker through Docker)

### 3. Better Performance
- No proxy overhead for dashboard/wizard
- Direct connections reduce latency
- WebSocket connections are more stable

### 4. Easier Deployment
- Host services managed by systemd
- Container services managed by Docker Compose
- Clear separation of concerns

## SSL/TLS Configuration

The HTTPS server block is configured but commented out. To enable:

1. **Place SSL certificates** in `./ssl/` directory
2. **Uncomment HTTPS server block** in nginx.conf
3. **Update docker-compose.yml** to mount SSL certificates:
   ```yaml
   nginx:
     volumes:
       - ./ssl:/etc/nginx/ssl:ro
   ```

Note: Dashboard and Wizard would need separate SSL configuration if HTTPS is required for host services.

## Testing

### Manual Testing Steps

1. **Start Host Services**:
   ```bash
   # Start Dashboard
   cd services/dashboard && npm start &
   
   # Start Wizard  
   cd services/wizard/backend && npm start &
   ```

2. **Start Container Services**:
   ```bash
   docker-compose up nginx kasia-app k-social
   ```

3. **Test Service Access**:
   ```bash
   # Service selection page
   curl http://localhost/
   
   # Direct host services
   curl http://localhost:8080/health
   curl http://localhost:3000/health
   
   # Proxied container services
   curl http://localhost/kasia/
   curl http://localhost/social/
   ```

## Requirements Satisfied

✅ **Simplified Architecture**: Removed unnecessary proxy complexity
✅ **Direct Access**: Dashboard and Wizard accessible without proxy
✅ **Container Proxy**: Kaspa applications still proxied through Nginx
✅ **Security Headers**: Maintained for container services
✅ **SSL/TLS Support**: Available for container services
✅ **Service Integration**: Easy cross-linking between services

## Files Modified

- `config/nginx.conf` - Completely rewritten for container-only proxy
- Removed dashboard proxy configuration
- Added service selection landing page
- Maintained security and SSL configuration for containers

## Related Documentation

- Management Dashboard Design: `.kiro/specs/management-dashboard/design.md`
- Dashboard Deployment: `services/dashboard/DEPLOYMENT.md`
- Installation Wizard: `services/wizard/README.md`