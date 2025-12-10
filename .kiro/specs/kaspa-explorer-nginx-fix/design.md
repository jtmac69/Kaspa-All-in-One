# Kaspa Explorer Nginx Configuration Fix Design

## Overview

This design addresses the critical nginx configuration syntax error in the Kaspa Explorer service that prevents the kaspa-user-applications profile from starting successfully. The issue stems from `add_header` directives being placed at the server level, which violates nginx syntax rules. The solution involves restructuring the nginx configuration to place all header directives within appropriate location blocks while maintaining the intended CORS functionality.

## Architecture

The fix maintains the existing nginx-based architecture for the Kaspa Explorer service but corrects the configuration structure:

```
┌─────────────────────────────────────────┐
│           Docker Container              │
│  ┌─────────────────────────────────────┐│
│  │            Nginx Server             ││
│  │  ┌─────────────────────────────────┐││
│  │  │        Server Block             │││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │     Location Blocks         ││││
│  │  │  │  - / (SPA routing)          ││││
│  │  │  │  - /api/ (API proxy)        ││││
│  │  │  │  - Static assets            ││││
│  │  │  │  [CORS headers here]        ││││
│  │  │  └─────────────────────────────┘│││
│  │  │  [NO headers at server level]   │││
│  │  └─────────────────────────────────┘││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## Components and Interfaces

### Nginx Configuration Structure

**Server Block**
- Contains basic server configuration (listen, server_name, root, index)
- Includes gzip compression settings
- NO `add_header` directives at this level

**Location Blocks**
- `/` - SPA routing with CORS headers for HTML responses
- `/api/` - API proxy configuration with comprehensive CORS handling
- Static assets pattern - Caching and CORS headers for assets
- Global CORS handling for all requests

### Header Management Strategy

**CORS Headers Distribution**
- Static asset headers: Applied in static asset location block
- API headers: Applied in API location block  
- Global headers: Applied in root location block
- Preflight handling: Dedicated logic within location blocks

## Data Models

### Nginx Configuration Sections

```nginx
server {
    # Basic server configuration only
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    # Compression settings (allowed at server level)
    gzip on;
    gzip_vary on;
    # ... other gzip settings
    
    # Location blocks with headers
    location / {
        # Headers allowed here
        add_header Access-Control-Allow-Origin "*" always;
        # ... other headers
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        # CORS handling with headers
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*" always;
            # ... other preflight headers
            return 204;
        }
        # ... API configuration
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        # Asset-specific headers
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*" always;
        expires 1y;
    }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Nginx configuration syntax validation**
*For any* nginx configuration file generated for the kaspa-explorer service, running `nginx -t` should pass without syntax errors
**Validates: Requirements 1.1, 1.2, 3.3**

**Property 2: Service startup and health**
*For any* deployment of the kaspa-user-applications profile, the kaspa-explorer container should start successfully and maintain a "running" status without restarts
**Validates: Requirements 1.3, 1.5**

**Property 3: HTTP accessibility**
*For any* HTTP request to localhost:3004, the kaspa-explorer service should respond with successful HTTP status codes (200-299 range)
**Validates: Requirements 1.4**

**Property 4: Static asset CORS headers**
*For any* request to static assets (js, css, images, fonts), the response should include appropriate CORS headers (Access-Control-Allow-Origin)
**Validates: Requirements 2.1**

**Property 5: CORS preflight handling**
*For any* OPTIONS request to API endpoints, the response should include all necessary CORS preflight headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers)
**Validates: Requirements 2.2, 2.5**

**Property 6: Cross-origin request headers**
*For any* cross-origin request, the response should include necessary Access-Control headers
**Validates: Requirements 2.4**

**Property 7: Header directive placement**
*For any* nginx configuration, all add_header directives should be located within location blocks, not at the server level
**Validates: Requirements 3.1**

**Property 8: No duplicate headers**
*For any* nginx configuration, there should be no conflicting or duplicate header definitions that would cause nginx warnings
**Validates: Requirements 3.2**

**Property 9: Security headers presence**
*For any* HTTP response, security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection) should be present when appropriate
**Validates: Requirements 3.4**

## Error Handling

### Configuration Validation Errors
- **Syntax Errors**: Nginx configuration syntax validation should be performed before deployment
- **Header Conflicts**: Duplicate or conflicting header definitions should be detected and resolved
- **Missing Directives**: Essential CORS and security headers should be validated for presence

### Runtime Errors
- **Service Startup Failures**: Container restart loops should be detected and diagnosed
- **HTTP Request Failures**: Failed requests should be logged with appropriate error codes
- **CORS Violations**: Cross-origin request failures should be handled gracefully

### Recovery Strategies
- **Configuration Rollback**: Ability to revert to previous working configuration
- **Service Restart**: Graceful service restart after configuration fixes
- **Health Monitoring**: Continuous monitoring of service health status

## Testing Strategy

### Unit Testing
- Nginx configuration syntax validation tests
- Header presence and correctness verification
- CORS policy compliance testing
- Security header validation

### Property-Based Testing
The testing approach will use **nginx-test** framework for nginx configuration testing, configured to run a minimum of 100 iterations per property test.

Each property-based test will be tagged with comments explicitly referencing the correctness property from this design document using the format: **Feature: kaspa-explorer-nginx-fix, Property {number}: {property_text}**

**Property Test Requirements:**
- Property 1: Generate various nginx configurations and validate syntax
- Property 2: Test service deployment across different container states
- Property 3: Generate various HTTP requests and verify response codes
- Property 4: Test static asset requests with different file types and verify CORS headers
- Property 5: Generate various OPTIONS requests and verify preflight responses
- Property 6: Test cross-origin requests from different origins
- Property 7: Parse nginx configurations and verify header directive placement
- Property 8: Analyze configurations for header conflicts and duplicates
- Property 9: Test HTTP responses for required security headers

### Integration Testing
- End-to-end service deployment testing
- Browser-based CORS functionality testing
- Multi-service profile deployment validation
- Real-world usage scenario testing

### Performance Testing
- Service startup time measurement
- HTTP response time validation
- Resource usage monitoring
- Concurrent request handling

## Implementation Notes

### Critical Fix Priority
This is a **CRITICAL** fix that blocks the test release. The kaspa-user-applications profile cannot function without this fix, making it the highest priority for immediate implementation.

### Backward Compatibility
The fix maintains all existing CORS functionality while correcting the nginx syntax. No breaking changes to the API or user experience are introduced.

### Deployment Strategy
1. Fix the nginx configuration file
2. Rebuild the kaspa-explorer Docker image
3. Test the fix with the kaspa-user-applications profile
4. Validate all CORS functionality remains intact
5. Update the test release package

### Configuration Management
The corrected nginx configuration should be validated against nginx best practices and tested across different nginx versions to ensure compatibility.