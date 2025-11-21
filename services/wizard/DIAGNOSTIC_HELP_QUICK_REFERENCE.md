# Diagnostic Export and Help System - Quick Reference

## Overview

The Diagnostic Export and Help System provides users with comprehensive troubleshooting tools, including:
- Searchable common issues database
- Automated diagnostic report generation
- Community resource links
- GitHub issue creation with diagnostic data

## Features

### 1. Search Issues Tab

**Purpose**: Help users find solutions to common problems quickly

**Features**:
- Free-text search across issue database
- Category-based browsing (Docker, Network, Resources, Permissions)
- Keyword matching with relevance scoring
- Plain language solutions with step-by-step instructions

**Common Issues Covered**:
- Docker not running
- Port conflicts
- Insufficient memory/disk space
- Permission denied errors
- Network connectivity issues
- Image pull failures
- Service health check failures
- Slow blockchain sync
- Docker Compose version issues

### 2. Diagnostic Report Tab

**Purpose**: Generate comprehensive system diagnostic information for troubleshooting

**Information Collected**:
- **System Information**: OS, CPU, memory, disk space, uptime
- **Docker Information**: Version, containers, images, volumes, networks
- **Service Status**: Running services, health status, ports
- **Configuration**: Active profiles, environment variables (sanitized)
- **Error History**: Recent error logs from containers
- **Network Connectivity**: Interface info, connectivity tests

**Security Features**:
- Automatic redaction of sensitive information
- Passwords, API keys, tokens, secrets removed
- Safe to share publicly

**Actions**:
- Generate report (one-click)
- Copy to clipboard
- Download as text file
- Include in GitHub issues

### 3. Community Help Tab

**Purpose**: Connect users with community resources and support channels

**Resources**:
- **Discord Community**: Real-time help and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Complete guides and references
- **Kaspa Forum**: Community Q&A and experiences

## API Endpoints

### Diagnostic Collection

```bash
# Collect all diagnostic information (JSON)
GET /api/diagnostic/collect

# Generate human-readable report (text)
GET /api/diagnostic/report

# Generate JSON diagnostic report
GET /api/diagnostic/report/json
```

### Issue Search

```bash
# Get all common issues
GET /api/diagnostic/issues

# Filter by category
GET /api/diagnostic/issues?category=docker

# Search by keywords
GET /api/diagnostic/issues?search=port

# Get specific issue
GET /api/diagnostic/issues/:id

# Get categories list
GET /api/diagnostic/categories

# Search by error message
POST /api/diagnostic/search
{
  "query": "Docker not running",
  "errorMessage": "connection refused"
}
```

## Usage Examples

### Opening the Help Dialog

```javascript
// From anywhere in the wizard
helpSystem.open();
```

### Searching for Issues

```javascript
// Search by text
await helpSystem.searchIssues();

// Search by category
await helpSystem.searchByCategory('docker');
```

### Generating Diagnostic Report

```javascript
// Generate report
await helpSystem.generateDiagnostic();

// Copy to clipboard
await helpSystem.copyDiagnostic();

// Download as file
helpSystem.downloadDiagnostic();
```

### Creating GitHub Issue

```javascript
// Opens GitHub with pre-filled diagnostic data
await helpSystem.createGitHubIssue();
```

## Integration Points

### Wizard Integration

The help system is integrated into all wizard steps:
- "Need Help?" button in step footers
- Accessible at any point during installation
- Context-aware (can search based on current step)

### Error Remediation Integration

Works alongside the error remediation system:
- Error remediation provides automatic fixes
- Help system provides manual solutions and explanations
- Diagnostic reports include error history

### Safety System Integration

Complements the safety system:
- Safety system prevents problems
- Help system solves problems when they occur
- Diagnostic reports help understand what went wrong

## File Structure

```
services/wizard/backend/src/
├── utils/
│   └── diagnostic-collector.js      # Diagnostic data collection
└── api/
    └── diagnostic.js                 # API endpoints

services/wizard/frontend/public/
├── scripts/
│   └── wizard.js                     # Help system UI (appended)
└── styles/
    └── wizard.css                    # Help dialog styles (appended)
```

## Common Issues Database

The system includes 10 pre-configured common issues:

1. **docker-not-running**: Docker daemon not running
2. **port-conflict**: Port already in use
3. **insufficient-memory**: Not enough RAM
4. **disk-space**: Insufficient disk space
5. **permission-denied**: Docker permission issues
6. **network-connectivity**: Network/DNS problems
7. **image-pull-failed**: Cannot download images
8. **service-unhealthy**: Service failing health checks
9. **sync-slow**: Blockchain sync taking too long
10. **compose-version**: Docker Compose incompatible

Each issue includes:
- Title and description
- Keywords for search matching
- Category classification
- Step-by-step solution
- Command examples

## Diagnostic Report Format

```markdown
# Kaspa All-in-One Diagnostic Report

Generated: 2025-11-20T12:00:00.000Z

## System Information
- Platform: darwin arm64
- OS Release: 23.1.0
- CPU: 8 cores (Apple M1)
- Memory: 16.00 GB total, 8.50 GB free
- Disk: 500GB total, 250GB available (50% used)

## Docker Information
- Docker Version: Docker version 24.0.6
- Docker Compose Version: v2.23.0
- Running: Yes
- Containers: 5
- Images: 12

### Containers
- kaspa-node: Up 2 hours (healthy)
- dashboard: Up 2 hours (healthy)
...

## Services
- kaspa-node: running (Health: healthy)
- dashboard: running (Health: healthy)
...

## Configuration
Active Profiles: core, prod

## Recent Errors
No recent errors found

## Network Connectivity
- Internet: OK
- Docker Hub: OK
- GitHub: OK

---
*Note: Sensitive information has been redacted.*
```

## Testing

### Manual Testing

1. **Open Help Dialog**:
   - Click "Need Help?" button
   - Verify dialog opens with 3 tabs

2. **Search Issues**:
   - Enter "docker" in search
   - Verify relevant results appear
   - Click category buttons
   - Verify filtered results

3. **Generate Diagnostic**:
   - Switch to Diagnostic tab
   - Click "Generate Report"
   - Verify report appears
   - Test copy and download buttons

4. **Community Links**:
   - Switch to Community tab
   - Verify all links are correct
   - Test GitHub issue creation

### API Testing

```bash
# Test diagnostic collection
curl http://localhost:3000/api/diagnostic/collect

# Test report generation
curl http://localhost:3000/api/diagnostic/report

# Test issue search
curl http://localhost:3000/api/diagnostic/issues?category=docker

# Test search endpoint
curl -X POST http://localhost:3000/api/diagnostic/search \
  -H "Content-Type: application/json" \
  -d '{"query": "docker not running"}'
```

## Best Practices

### For Users

1. **Search First**: Use the search function before generating diagnostics
2. **Be Specific**: Include error messages in search queries
3. **Share Diagnostics**: Include diagnostic reports when asking for help
4. **Check Community**: Browse Discord/Forum before creating GitHub issues

### For Developers

1. **Add New Issues**: Update `commonIssues` array in `diagnostic.js`
2. **Test Sanitization**: Verify sensitive data is redacted
3. **Update Keywords**: Keep issue keywords current and comprehensive
4. **Monitor Searches**: Track common searches to add new issues

## Troubleshooting

### Help Dialog Won't Open

- Check browser console for errors
- Verify `helpSystem` object exists
- Check if dialog HTML was created

### Diagnostic Generation Fails

- Verify Docker is running
- Check API endpoint is accessible
- Review backend logs for errors

### Search Returns No Results

- Check issue database is loaded
- Verify search query is not empty
- Try different keywords or categories

## Future Enhancements

Potential improvements for future versions:

1. **AI-Powered Search**: Use LLM to match errors to solutions
2. **Telemetry**: Anonymous error tracking to improve issue database
3. **Video Tutorials**: Embed solution videos in issue cards
4. **Live Chat**: Real-time support integration
5. **Diagnostic History**: Save and compare diagnostic reports
6. **Auto-Remediation**: Link diagnostic findings to auto-fix actions

## Related Documentation

- **Error Remediation**: `../../docs/quick-references/ERROR_REMEDIATION_QUICK_REFERENCE.md`
- **Safety System**: `../../docs/quick-references/SAFETY_SYSTEM_QUICK_REFERENCE.md`
- **Installation Guides**: `../../docs/quick-references/INSTALLATION_GUIDES_QUICK_REFERENCE.md`
- **Plain Language Content**: `PLAIN_LANGUAGE_STYLE_GUIDE.md`

## Support

For issues with the help system itself:
- GitHub: https://github.com/argonmining/KaspaAllInOne/issues
- Discord: https://discord.gg/kaspa
- Forum: https://forum.kaspa.org
