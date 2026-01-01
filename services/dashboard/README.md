# Kaspa All-in-One Management Dashboard

A host-based web interface for monitoring and managing Kaspa All-in-One services, with integrated support for the template-first Installation Wizard and comprehensive service management capabilities.

## 🎯 Overview

The Management Dashboard is a **host-based service** (not containerized) that provides:
- **Real-time Service Monitoring**: Monitor all deployed services across templates
- **Template-Aware Management**: Understand and manage template-based deployments
- **Wizard Integration**: Seamless integration with the Installation Wizard
- **System Resource Monitoring**: Track CPU, RAM, storage, and network usage
- **Service Control**: Start, stop, restart, and configure individual services
- **Health Monitoring**: Comprehensive health checks and alerting

## 🏗️ Architecture

### Host-Based Design
The dashboard runs directly on the host system for several important reasons:

**Advantages of Host-Based Architecture:**
- **Independent Operation**: Continues working even when Docker has issues
- **Full System Access**: Can manage Docker containers and host resources
- **Reliable Monitoring**: Always available for troubleshooting
- **Resource Efficiency**: Lower overhead than containerized alternatives
- **Integration Capability**: Easy integration with system services and the Installation Wizard

**Integration Points:**
- **Installation Wizard**: Detects wizard availability and provides launch/configuration options
- **Docker Management**: Full control over container lifecycle and resource allocation
- **System Monitoring**: Direct access to host system metrics and logs
- **Configuration Management**: Manages `.env` files and service configurations

## 🚀 Key Features

### Template-Aware Service Management
- **Template Recognition**: Automatically detects template-based deployments
- **Template-Specific Views**: Customized dashboards for each template type
- **Service Grouping**: Groups services by template for easier management
- **Template Migration**: Supports switching between templates through wizard integration

### Real-Time Monitoring
- **Service Status**: Live status updates for all services
- **Resource Usage**: Real-time CPU, memory, and storage monitoring
- **Network Monitoring**: Track network usage and connectivity
- **Performance Metrics**: Historical performance data and trends

### Integrated Management
- **Service Control**: Start, stop, restart services individually or by template
- **Configuration Management**: Edit service configurations through web interface
- **Log Viewing**: Centralized log viewing with filtering and search
- **Health Checks**: Automated health monitoring with alerting

### Wizard Integration
- **Launch Wizard**: One-click access to Installation Wizard for reconfiguration
- **Configuration Sync**: Automatic synchronization with wizard configurations
- **Template Suggestions**: Suggests template changes based on usage patterns
- **Migration Support**: Assists with template migrations and service changes

## 📊 Dashboard Sections

### 🏠 Home Dashboard
**Template-based overview of your deployment**
- **Template Information**: Shows current template(s) and included services
- **System Overview**: High-level system health and resource usage
- **Quick Actions**: Common management tasks and wizard access
- **Recent Activity**: Recent service changes and events
- **Alerts**: Important notifications and warnings

### 🔧 Service Management
**Detailed service control and monitoring**
- **Service Grid**: Visual grid showing all services with status indicators
- **Template Groups**: Services organized by template for easier management
- **Individual Controls**: Start, stop, restart, configure each service
- **Bulk Operations**: Manage multiple services simultaneously
- **Service Dependencies**: Visual representation of service relationships

### 📈 System Monitoring
**Comprehensive system resource monitoring**
- **Resource Usage**: Real-time CPU, RAM, storage, and network graphs
- **Historical Data**: Performance trends and usage patterns
- **Capacity Planning**: Recommendations for resource optimization
- **Alert Configuration**: Set up alerts for resource thresholds
- **Performance Analysis**: Identify bottlenecks and optimization opportunities

### 🌐 Network Status
**Network connectivity and public access monitoring**
- **Public Node Status**: Monitor public P2P and RPC accessibility
- **Port Status**: Check all configured ports and their accessibility
- **Network Performance**: Monitor network latency and throughput
- **External Connectivity**: Test connectivity to external services
- **Firewall Status**: Check firewall configuration and recommendations

### 📋 Logs and Diagnostics
**Centralized logging and diagnostic tools**
- **Service Logs**: View logs from all services with filtering and search
- **System Logs**: Host system logs relevant to Kaspa services
- **Error Tracking**: Automatic error detection and categorization
- **Diagnostic Tools**: Built-in tools for troubleshooting common issues
- **Export Capabilities**: Export logs and diagnostic data for support

### ⚙️ Configuration
**Service and system configuration management**
- **Template Configuration**: Modify template-specific settings
- **Service Configuration**: Individual service configuration editing
- **Environment Variables**: Manage `.env` files through web interface
- **Resource Allocation**: Adjust CPU and memory limits for services
- **Security Settings**: Configure access controls and security options

## 🎯 Template-Specific Features

### Home Node Template Dashboard
- **Node Status**: Kaspa node sync status and network information
- **Messaging**: Kasia messaging app status and usage statistics
- **Resource Usage**: Optimized for home node resource monitoring
- **Wallet Connectivity**: Information for connecting wallets to your node

### Public Node Template Dashboard
- **Public Access**: Monitor external accessibility and connection counts
- **Network Contribution**: Statistics on network support and peer connections
- **Social Apps**: K-Social app status and user activity
- **Performance Metrics**: Public node performance and reliability statistics

### Explorer Template Dashboard
- **Indexer Status**: Status of all blockchain indexers (Kasia, K-Social, Simply Kaspa)
- **Database Health**: TimescaleDB performance and storage usage
- **Data Processing**: Indexing progress and processing statistics
- **Query Performance**: Database query performance and optimization suggestions

### Mining Template Dashboard
- **Mining Status**: Stratum bridge status and mining pool connections
- **Hash Rate**: Mining performance and hash rate statistics
- **Node Optimization**: Mining-specific node performance metrics
- **Profitability**: Mining profitability calculations and recommendations

### Custom Setup Dashboard
- **Service Overview**: Status of all manually selected services
- **Dependency Visualization**: Visual representation of service dependencies
- **Resource Optimization**: Recommendations for custom service combinations
- **Configuration Validation**: Ensure custom configurations are optimal

## 🔧 Installation and Setup

### Automatic Installation
The dashboard is automatically installed when you use the Installation Wizard:
1. **Wizard Installation**: Dashboard is included in all templates
2. **Host-Based Deployment**: Automatically deployed as systemd service
3. **Configuration**: Automatically configured based on your template/custom setup
4. **Integration**: Automatically integrated with wizard and services

### Manual Installation
If you need to install the dashboard separately:

```bash
# Navigate to dashboard directory
cd services/dashboard

# Run installation script
sudo ./install.sh

# Verify installation
sudo systemctl status kaspa-dashboard

# Access dashboard
open http://localhost:8080
```

### Configuration
The dashboard is configured through environment variables in `/opt/kaspa-dashboard/.env`:

```bash
# Basic Configuration
NODE_ENV=production
PORT=8080
KASPA_NODE_URL=http://localhost:16111

# Template Integration
WIZARD_URL=http://localhost:3000
TEMPLATE_CONFIG_PATH=/opt/kaspa-aio/.template-config

# Security Settings
CORS_ORIGIN=http://localhost:3000,http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Settings
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_DAYS=30
LOG_LEVEL=info
```

## 🎛️ Service Management

### Basic Service Operations
```bash
# Dashboard service management
sudo systemctl start kaspa-dashboard    # Start dashboard
sudo systemctl stop kaspa-dashboard     # Stop dashboard
sudo systemctl restart kaspa-dashboard  # Restart dashboard
sudo systemctl status kaspa-dashboard   # Check status

# View dashboard logs
sudo journalctl -u kaspa-dashboard -f   # Follow logs
sudo journalctl -u kaspa-dashboard -n 50 # Last 50 lines
```

### Web Interface Operations
Access the dashboard at `http://localhost:8080` for:
- **Service Control**: Start/stop/restart services through web interface
- **Configuration**: Modify service settings without command line
- **Monitoring**: Real-time monitoring of all services and system resources
- **Wizard Access**: Launch Installation Wizard for reconfiguration

## 🔗 Integration with Installation Wizard

### Seamless Integration
The dashboard provides seamless integration with the Installation Wizard:

**From Dashboard to Wizard:**
- **Reconfigure Button**: One-click access to wizard for template changes
- **Add Services**: Launch wizard to add services to current template
- **Template Migration**: Use wizard to switch between templates
- **Configuration Updates**: Modify template configurations through wizard

**From Wizard to Dashboard:**
- **Post-Installation**: Automatic redirect to dashboard after successful installation
- **Service Verification**: Dashboard confirms all wizard-installed services are running
- **Configuration Sync**: Dashboard automatically reflects wizard configuration changes
- **Monitoring Setup**: Dashboard automatically configures monitoring for new services

### Template Migration Support
The dashboard assists with template migrations:
1. **Current State Analysis**: Analyzes current template and service configuration
2. **Migration Planning**: Suggests optimal migration paths and potential issues
3. **Wizard Launch**: Launches wizard with current configuration pre-loaded
4. **Migration Monitoring**: Monitors migration progress and service health
5. **Rollback Support**: Provides rollback options if migration fails

## 📊 Monitoring and Alerting

### Real-Time Monitoring
- **Service Health**: Continuous monitoring of all service health endpoints
- **Resource Usage**: Real-time tracking of CPU, memory, storage, and network
- **Performance Metrics**: Response times, throughput, and error rates
- **Network Connectivity**: Monitor external connectivity and peer connections

### Alert System
- **Threshold Alerts**: Configurable alerts for resource usage thresholds
- **Service Alerts**: Notifications when services go down or become unhealthy
- **Performance Alerts**: Alerts for performance degradation or bottlenecks
- **Security Alerts**: Notifications for security-related events

### Historical Data
- **Performance Trends**: Historical performance data and trend analysis
- **Usage Patterns**: Identify usage patterns and optimization opportunities
- **Capacity Planning**: Recommendations for resource scaling and optimization
- **Report Generation**: Generate reports for system performance and usage

## 🔒 Security Features

### Access Control
- **Host-Based Security**: Leverages host system security and user management
- **CORS Protection**: Configurable CORS origins for secure web access
- **Rate Limiting**: Protection against abuse and excessive requests
- **Secure Headers**: Security headers for web interface protection

### Audit Logging
- **Action Logging**: Log all management actions and configuration changes
- **Access Logging**: Track dashboard access and user activities
- **Security Events**: Log security-related events and potential threats
- **Compliance**: Support for compliance requirements and audit trails

## 🛠️ Troubleshooting

### Common Issues

#### Dashboard Won't Start
```bash
# Check service status
sudo systemctl status kaspa-dashboard

# Check logs for errors
sudo journalctl -u kaspa-dashboard -n 50

# Verify Node.js installation
node --version

# Check port availability
sudo netstat -tulpn | grep :8080
```

#### Can't Access Web Interface
```bash
# Check if service is running
curl -f http://localhost:8080/health

# Check firewall settings
sudo ufw status

# Verify network configuration
netstat -tulpn | grep :8080
```

#### Services Not Showing in Dashboard
```bash
# Check Docker connectivity
sudo -u kaspa-dashboard docker ps

# Verify user permissions
groups kaspa-dashboard

# Check configuration
cat /opt/kaspa-dashboard/.env
```

### Diagnostic Tools
The dashboard includes built-in diagnostic tools:
- **System Health Check**: Comprehensive system and service health analysis
- **Configuration Validator**: Validates all service configurations
- **Network Diagnostics**: Tests network connectivity and port accessibility
- **Performance Analyzer**: Identifies performance bottlenecks and optimization opportunities

## 📚 Documentation

### User Guides
- **Template Setup Guide**: [../../docs/guides/wizard-template-setup-guide.md](../../docs/guides/wizard-template-setup-guide.md)
- **Template vs Custom Guide**: [../../docs/guides/template-vs-custom-guide.md](../../docs/guides/template-vs-custom-guide.md)
- **Error Recovery Guide**: [../../docs/guides/wizard-error-recovery-guide.md](../../docs/guides/wizard-error-recovery-guide.md)

### Technical Documentation
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md) - Host-based deployment instructions
- **Service Management**: [SERVICE_MANAGEMENT.md](SERVICE_MANAGEMENT.md) - Detailed service management guide
- **Environment Variables**: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - Configuration options

### API Documentation
- **REST API**: Complete REST API documentation for programmatic access
- **WebSocket API**: Real-time WebSocket API for live updates
- **Integration API**: API endpoints for wizard and external tool integration

## 🔮 Future Enhancements

### Planned Features
- **Mobile App**: Native mobile app for remote monitoring and management
- **Multi-Node Management**: Manage multiple Kaspa All-in-One deployments
- **Advanced Analytics**: Machine learning-based performance optimization
- **Template Marketplace**: Community-contributed templates and configurations
- **Automated Scaling**: Automatic resource scaling based on usage patterns

### Community Features
- **Plugin System**: Support for community-developed plugins and extensions
- **Custom Dashboards**: User-customizable dashboard layouts and widgets
- **Shared Configurations**: Share and import dashboard configurations
- **Community Templates**: Community-contributed monitoring templates

## 📞 Support

### Built-in Help
- **Help System**: Comprehensive help system with searchable documentation
- **Diagnostic Reports**: One-click diagnostic report generation
- **Troubleshooting Guides**: Step-by-step troubleshooting for common issues
- **Community Links**: Direct access to community support resources

### Community Support
- **Discord**: Real-time help and discussions
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and configuration sharing
- **Documentation**: Comprehensive documentation and guides

### Professional Support
- **Enterprise Support**: Professional support for business deployments
- **Custom Development**: Professional development of custom features
- **Training**: Professional training for dashboard management and optimization
- **Consulting**: Architecture and deployment consulting services

---

**Ready to monitor and manage your Kaspa All-in-One deployment?** The Management Dashboard is automatically included with all templates and provides comprehensive monitoring and management capabilities for your Kaspa services.

Access your dashboard at: `http://localhost:8080`