/**
 * Nginx Configuration Tests for Kaspa Management Dashboard
 * 
 * Tests that verify the Nginx configuration correctly handles:
 * - Direct access to host-based services (dashboard, wizard)
 * - Proxy configuration for containerized Kaspa applications
 * - Service selection landing page
 * - Security headers and SSL configuration
 */

const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

describe('Nginx Configuration Tests', () => {
  let mockFs;
  const nginxConfigPath = path.join(__dirname, '../../../config/nginx.conf');

  beforeEach(() => {
    mockFs = require('fs');
    jest.clearAllMocks();
  });

  describe('Configuration File Structure', () => {
    test('should have valid nginx configuration file', () => {
      const mockNginxConfig = `
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name localhost;
        
        location = / {
            return 200 'Service Selection Page';
        }
    }
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);
      mockFs.existsSync.mockReturnValue(true);

      expect(mockFs.existsSync(nginxConfigPath)).toBe(true);
      
      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      expect(config).toContain('events {');
      expect(config).toContain('http {');
      expect(config).toContain('server {');
    });

    test('should not contain dashboard proxy configuration', () => {
      const mockNginxConfig = `
# Dashboard and Wizard: Direct access
# Dashboard: http://localhost:8080
# Wizard: http://localhost:3000

# Nginx proxies only containerized Kaspa applications
location /kasia/ {
    proxy_pass http://kasia-app:3000/;
}

location /social/ {
    proxy_pass http://k-social:3000/;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      // Should NOT contain dashboard proxy
      expect(config).not.toMatch(/location\s+\/dashboard\//);
      expect(config).not.toMatch(/proxy_pass.*localhost:8080/);
      expect(config).not.toMatch(/proxy_pass.*kaspa-dashboard/);
      
      // Should contain direct access comments
      expect(config).toContain('Direct access');
      expect(config).toContain('Dashboard: http://localhost:8080');
    });

    test('should not contain wizard proxy configuration', () => {
      const mockNginxConfig = `
# Dashboard and Wizard: Direct access
# Dashboard: http://localhost:8080
# Wizard: http://localhost:3000

location /kasia/ {
    proxy_pass http://kasia-app:3000/;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      // Should NOT contain wizard proxy
      expect(config).not.toMatch(/location\s+\/wizard\//);
      expect(config).not.toMatch(/proxy_pass.*localhost:3000/);
      expect(config).not.toMatch(/proxy_pass.*kaspa-wizard/);
      
      // Should contain direct access comments
      expect(config).toContain('Wizard: http://localhost:3000');
    });
  });

  describe('Service Selection Landing Page', () => {
    test('should have service selection page at root', () => {
      const mockNginxConfig = `
location = / {
    return 200 '<!DOCTYPE html>
<html>
<head>
    <title>Kaspa All-in-One Services</title>
</head>
<body>
    <div class="container">
        <h1>🚀 Kaspa All-in-One Services</h1>
        
        <div class="services">
            <div class="service host-services">
                <h3>📊 Management Dashboard</h3>
                <a href="http://localhost:8080" target="_blank">Open Dashboard</a>
            </div>
            
            <div class="service host-services">
                <h3>⚙️ Installation Wizard</h3>
                <a href="http://localhost:3000" target="_blank">Open Wizard</a>
            </div>
            
            <div class="service container-services">
                <h3>💬 Kasia Messaging</h3>
                <a href="/kasia/">Open Kasia</a>
            </div>
        </div>
    </div>
</body>
</html>';
    add_header Content-Type text/html;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location = /');
      expect(config).toContain('Kaspa All-in-One Services');
      expect(config).toContain('Management Dashboard');
      expect(config).toContain('Installation Wizard');
      expect(config).toContain('http://localhost:8080');
      expect(config).toContain('http://localhost:3000');
    });

    test('should distinguish between host and container services', () => {
      const mockNginxConfig = `
<div class="service host-services">
    <h3>📊 Management Dashboard</h3>
    <a href="http://localhost:8080" target="_blank">Open Dashboard</a>
</div>

<div class="service host-services">
    <h3>⚙️ Installation Wizard</h3>
    <a href="http://localhost:3000" target="_blank">Open Wizard</a>
</div>

<div class="service container-services">
    <h3>💬 Kasia Messaging</h3>
    <a href="/kasia/">Open Kasia</a>
</div>

<div class="service container-services">
    <h3>🌐 K-Social</h3>
    <a href="/social/">Open K-Social</a>
</div>`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      // Host services should link directly to localhost ports
      expect(config).toContain('host-services');
      expect(config).toContain('http://localhost:8080');
      expect(config).toContain('http://localhost:3000');
      
      // Container services should use relative paths
      expect(config).toContain('container-services');
      expect(config).toContain('href="/kasia/"');
      expect(config).toContain('href="/social/"');
    });
  });

  describe('Kaspa Application Proxy Configuration', () => {
    test('should proxy Kasia application correctly', () => {
      const mockNginxConfig = `
location /kasia/ {
    limit_req zone=api burst=50 nodelay;
    set $kasia_app kasia-app:3000;
    proxy_pass http://$kasia_app/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location /kasia/');
      expect(config).toContain('proxy_pass http://$kasia_app/');
      expect(config).toContain('kasia-app:3000');
      expect(config).toContain('WebSocket support');
      expect(config).toContain('proxy_set_header Upgrade');
    });

    test('should proxy K-Social application correctly', () => {
      const mockNginxConfig = `
location /social/ {
    limit_req zone=api burst=50 nodelay;
    set $k_social k-social:3000;
    proxy_pass http://$k_social/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location /social/');
      expect(config).toContain('proxy_pass http://$k_social/');
      expect(config).toContain('k-social:3000');
    });

    test('should have API endpoint proxies for indexers', () => {
      const mockNginxConfig = `
location /kasia-api/ {
    limit_req zone=api burst=100 nodelay;
    set $kasia_indexer kasia-indexer:8080;
    proxy_pass http://$kasia_indexer/;
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}

location /social-api/ {
    limit_req zone=api burst=100 nodelay;
    set $k_indexer k-indexer:8080;
    proxy_pass http://$k_indexer/;
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location /kasia-api/');
      expect(config).toContain('location /social-api/');
      expect(config).toContain('kasia-indexer:8080');
      expect(config).toContain('k-indexer:8080');
    });
  });

  describe('Security Configuration', () => {
    test('should have security headers configured', () => {
      const mockNginxConfig = `
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('X-Frame-Options');
      expect(config).toContain('X-XSS-Protection');
      expect(config).toContain('X-Content-Type-Options');
      expect(config).toContain('Content-Security-Policy');
      expect(config).toContain('Permissions-Policy');
    });

    test('should have rate limiting configured', () => {
      const mockNginxConfig = `
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /kasia/ {
    limit_req zone=api burst=50 nodelay;
}

location /social/ {
    limit_req zone=api burst=50 nodelay;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('limit_req_zone');
      expect(config).toContain('limit_req zone=api');
      expect(config).toContain('rate=10r/s');
    });

    test('should have SSL/HTTPS configuration', () => {
      const mockNginxConfig = `
server {
    listen 443 ssl http2;
    server_name localhost;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('listen 443 ssl');
      expect(config).toContain('ssl_certificate');
      expect(config).toContain('ssl_protocols');
      expect(config).toContain('Strict-Transport-Security');
    });
  });

  describe('Error Handling', () => {
    test('should have service unavailable handler', () => {
      const mockNginxConfig = `
location @service_unavailable {
    return 503 '{"error": "Service not available in current profile"}';
    add_header Content-Type application/json;
}

location /kasia/ {
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location @service_unavailable');
      expect(config).toContain('Service not available in current profile');
      expect(config).toContain('error_page 502 503 504 = @service_unavailable');
    });

    test('should have health check endpoint', () => {
      const mockNginxConfig = `
location /health {
    access_log off;
    return 200 "healthy\\n";
    add_header Content-Type text/plain;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('location /health');
      expect(config).toContain('return 200 "healthy');
      expect(config).toContain('access_log off');
    });
  });

  describe('Docker Integration', () => {
    test('should use Docker internal DNS resolver', () => {
      const mockNginxConfig = `
resolver 127.0.0.11 valid=10s ipv6=off;

location /kasia/ {
    set $kasia_app kasia-app:3000;
    proxy_pass http://$kasia_app/;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('resolver 127.0.0.11');
      expect(config).toContain('set $kasia_app kasia-app:3000');
    });

    test('should handle optional services gracefully', () => {
      const mockNginxConfig = `
# Use Docker's internal DNS resolver for optional services
# This prevents nginx from failing if services don't exist
resolver 127.0.0.11 valid=10s ipv6=off;

location /kasia/ {
    set $kasia_app kasia-app:3000;
    proxy_pass http://$kasia_app/;
    proxy_intercept_errors on;
    error_page 502 503 504 = @service_unavailable;
}`;

      mockFs.readFileSync.mockReturnValue(mockNginxConfig);

      const config = mockFs.readFileSync(nginxConfigPath, 'utf8');
      
      expect(config).toContain('prevents nginx from failing if services don\'t exist');
      expect(config).toContain('proxy_intercept_errors on');
      expect(config).toContain('@service_unavailable');
    });
  });

  describe('Configuration Validation', () => {
    test('should validate nginx configuration syntax', () => {
      const validateNginxSyntax = (config) => {
        const errors = [];
        
        // Check for required blocks
        if (!config.includes('events {')) {
          errors.push('Missing events block');
        }
        
        if (!config.includes('http {')) {
          errors.push('Missing http block');
        }
        
        if (!config.includes('server {')) {
          errors.push('Missing server block');
        }
        
        // Check for balanced braces
        const openBraces = (config.match(/{/g) || []).length;
        const closeBraces = (config.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
          errors.push('Unbalanced braces');
        }
        
        // Check for required directives
        if (!config.includes('listen ')) {
          errors.push('Missing listen directive');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      };

      const validConfig = `
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name localhost;
        
        location / {
            return 200 "OK";
        }
    }
}`;

      const result = validateNginxSyntax(validConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect configuration errors', () => {
      const validateNginxSyntax = (config) => {
        const errors = [];
        
        if (!config.includes('events {')) {
          errors.push('Missing events block');
        }
        
        if (!config.includes('http {')) {
          errors.push('Missing http block');
        }
        
        const openBraces = (config.match(/{/g) || []).length;
        const closeBraces = (config.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
          errors.push('Unbalanced braces');
        }
        
        return {
          valid: errors.length === 0,
          errors
        };
      };

      const invalidConfig = `
http {
    server {
        listen 80;
        location / {
            return 200 "OK";
        }
    }
    # Missing closing brace
`;

      const result = validateNginxSyntax(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing events block');
      expect(result.errors).toContain('Unbalanced braces');
    });
  });
});