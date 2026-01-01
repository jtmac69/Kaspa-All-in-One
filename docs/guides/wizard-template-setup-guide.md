# Kaspa All-in-One Template-First Setup Guide

This guide explains the new template-first approach in the Kaspa All-in-One Installation Wizard, helping you choose the right template and understand the setup process.

## 🎯 Template-First Approach

The Installation Wizard now uses a **template-first approach** that simplifies setup by providing pre-configured templates for common use cases. This eliminates the confusion of manual service selection while still offering full customization for advanced users.

### Why Templates?

**Before (Profile-Based)**:
- Users had to understand individual services (Core, Indexer Services, etc.)
- Complex combinations and dependencies
- Easy to misconfigure or miss important services
- Confusing navigation between profile and configuration steps

**Now (Template-First)**:
- Choose from pre-configured templates that "just work"
- Templates automatically include all necessary services
- Clear use-case descriptions (Home Node, Public Node, etc.)
- Streamlined navigation: Template → Configuration → Installation

## 📋 Available Templates

### 🏠 Home Node Template
**Perfect for personal use and learning about Kaspa**

**What's Included:**
- Kaspa Node (core blockchain functionality)
- Management Dashboard (monitoring and control)
- Kasia Messaging App (decentralized messaging)

**Best For:**
- First-time users learning about Kaspa
- Personal blockchain node for wallet connectivity
- Decentralized messaging enthusiasts
- Users with limited hardware resources

**Requirements:**
- **CPU**: 2+ cores
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 100GB available
- **Network**: Stable internet connection

**Estimated Setup Time**: 15-30 minutes

### 🌐 Public Node Template
**For supporting the Kaspa network and community**

**What's Included:**
- Kaspa Node with public P2P access
- Management Dashboard
- K Social App (decentralized social platform)
- Nginx reverse proxy with security headers

**Best For:**
- Users who want to support the Kaspa network
- Community members running public infrastructure
- Social media enthusiasts interested in decentralization
- Users with moderate hardware resources

**Requirements:**
- **CPU**: 4+ cores
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 250GB available (SSD recommended)
- **Network**: 100Mbps+ internet with stable connection

**Estimated Setup Time**: 20-40 minutes

### 🔍 Explorer Template
**For blockchain data analysis and indexing**

**What's Included:**
- All Home Node components
- Kasia Indexer (message indexing with RocksDB)
- K Social Indexer (social content indexing)
- Simply Kaspa Indexer (general blockchain indexing)
- TimescaleDB (time-series optimized database)

**Best For:**
- Developers building on Kaspa
- Data analysts studying blockchain patterns
- Users running blockchain explorers
- Advanced users with high-performance hardware

**Requirements:**
- **CPU**: 8+ cores (16+ threads recommended)
- **RAM**: 16GB minimum (32GB recommended)
- **Storage**: 500GB+ available (NVMe SSD required)
- **Network**: Gigabit ethernet preferred

**Estimated Setup Time**: 45-90 minutes

### ⛏️ Mining Template
**For solo mining operations**

**What's Included:**
- Kaspa Node optimized for mining
- Kaspa Stratum Bridge (solo mining support)
- Management Dashboard
- Mining-specific monitoring tools

**Best For:**
- Solo miners who want full control
- Mining pool operators
- Users with dedicated mining hardware
- Advanced miners optimizing performance

**Requirements:**
- **CPU**: 8+ cores for node operation
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 100GB available (SSD recommended)
- **Network**: Low-latency internet connection
- **Additional**: Compatible mining hardware (ASICs, GPUs)

**Estimated Setup Time**: 20-45 minutes

### ⚙️ Custom Setup
**For advanced users who want full control**

**What's Included:**
- Choose any combination of available services
- Full configuration control over each service
- Advanced networking and resource options

**Available Services:**
- Kaspa Node (required)
- Management Dashboard (recommended)
- Kasia Messaging App
- K Social App
- Kasia Indexer
- K Social Indexer
- Simply Kaspa Indexer
- TimescaleDB
- Kaspa Stratum Bridge
- Development tools (Portainer, pgAdmin)

**Best For:**
- Experienced users who understand service dependencies
- Developers testing specific combinations
- Users with unique requirements not covered by templates
- System administrators managing distributed deployments

**Requirements:**
- Varies based on selected services
- **Minimum**: 4GB RAM, 100GB storage
- **Recommended**: 16GB+ RAM, 500GB+ SSD storage

**Estimated Setup Time**: 30-120 minutes (depending on complexity)

## 🚀 Template Selection Process

### Step 1: Access the Installation Wizard

```bash
# Start the wizard
docker compose --profile wizard up -d

# Open in your browser
open http://localhost:3000
```

### Step 2: Complete System Check

The wizard will automatically:
- Verify Docker installation
- Check available resources (CPU, RAM, storage)
- Test network connectivity
- Identify your operating system

### Step 3: Choose Your Setup Method

You'll see two main options:

#### 🚀 Use a Template (Recommended)
- **Quick Setup**: Pre-configured templates that "just work"
- **Smart Recommendations**: Wizard suggests templates based on your hardware
- **Compatibility Ratings**: See which templates work best on your system
- **One-Click Application**: Templates automatically configure all services

#### ⚙️ Build Custom (Advanced)
- **Full Control**: Select individual services à la carte
- **Service Grid**: Visual interface showing all available services
- **Dependency Management**: Wizard handles service dependencies
- **Advanced Configuration**: Full control over all settings

### Step 4: Template Selection

If you chose "Use a Template":

1. **View Template Cards**: Each template shows:
   - Description and use case
   - Included services
   - Hardware requirements
   - Compatibility rating for your system

2. **Check Compatibility**: Templates are marked as:
   - ✅ **Optimal**: Perfect match for your hardware
   - ⚠️ **Recommended**: Will work well with minor limitations
   - ⚡ **Possible**: Will work but may have performance issues
   - ❌ **Not Recommended**: Insufficient resources

3. **Select Template**: Click "Use Template" on your chosen option

### Step 5: Configuration

Based on your template selection:

1. **Template-Specific Options**: Configure settings relevant to your template
2. **Smart Defaults**: Pre-filled values optimized for your template and hardware
3. **Resource Allocation**: Automatic resource distribution among services
4. **Network Configuration**: External IP detection and port configuration
5. **Security Settings**: Secure password generation and access controls

### Step 6: Review and Install

1. **Template Summary**: Review your selected template and included services
2. **Resource Estimates**: See expected CPU, RAM, and storage usage
3. **Installation Time**: Estimated time based on your template and hardware
4. **Final Confirmation**: Confirm your choices before installation begins

## 🔄 Template vs Custom: When to Choose What

### Choose a Template When:
- ✅ You're new to Kaspa All-in-One
- ✅ You want a quick, reliable setup
- ✅ Your use case matches a template description
- ✅ You prefer tested, optimized configurations
- ✅ You want automatic service dependency management

### Choose Custom Setup When:
- ⚙️ You need a specific combination of services not covered by templates
- ⚙️ You're experienced with Docker and service management
- ⚙️ You're testing or developing new configurations
- ⚙️ You have unique hardware or network requirements
- ⚙️ You're managing a distributed deployment across multiple machines

## 🛠️ Template Customization

Even after selecting a template, you can customize:

### During Installation
- **Service Configuration**: Adjust settings for included services
- **Resource Limits**: Modify CPU and memory allocations
- **Network Settings**: Change ports and external access
- **Security Options**: Customize passwords and access controls

### After Installation
- **Add Services**: Use the Management Dashboard to add additional services
- **Modify Configuration**: Update service settings through the dashboard
- **Scale Resources**: Adjust resource allocations as needed
- **Switch Templates**: Reconfigure using a different template

## 🔧 Advanced Template Features

### Template Validation
The wizard validates templates before application:
- **Service Compatibility**: Ensures all services work together
- **Resource Requirements**: Verifies sufficient hardware resources
- **Dependency Checking**: Confirms all dependencies are met
- **Configuration Validation**: Checks for configuration conflicts

### Error Recovery
If template application fails:
- **Automatic Fallback**: Option to switch to Custom Setup
- **Partial Recovery**: Continue with successfully applied services
- **Rollback Option**: Return to template selection
- **Detailed Error Messages**: Clear explanation of what went wrong

### Template Migration
Moving between templates:
- **Data Preservation**: Existing data is preserved when possible
- **Service Migration**: Smooth transition between different service sets
- **Configuration Merging**: Intelligent merging of existing and new configurations
- **Backup Creation**: Automatic backup before major changes

## 📊 Template Performance Optimization

### Resource Allocation
Templates automatically optimize resource allocation:
- **CPU Distribution**: Balanced CPU allocation among services
- **Memory Management**: Optimal memory limits to prevent conflicts
- **Storage Planning**: Efficient storage allocation and growth planning
- **Network Optimization**: Optimized internal networking between services

### Hardware-Specific Optimizations
Templates adapt to your hardware:
- **SSD Detection**: Optimized configurations for SSD storage
- **Multi-Core Optimization**: Better utilization of multi-core systems
- **Memory Scaling**: Automatic scaling based on available RAM
- **Network Adaptation**: Optimized for your network capabilities

## 🚨 Troubleshooting Templates

### Common Issues

#### Template Won't Apply
**Symptoms**: Template selection fails or hangs
**Solutions**:
1. Check system resources meet template requirements
2. Verify Docker is running and accessible
3. Ensure no port conflicts with existing services
4. Try the Custom Setup option as fallback

#### Services Won't Start After Template Application
**Symptoms**: Template applies but services fail to start
**Solutions**:
1. Check the Management Dashboard for service status
2. Review service logs for specific error messages
3. Verify network connectivity and port availability
4. Use the wizard's diagnostic tools for detailed analysis

#### Performance Issues
**Symptoms**: Services start but run slowly or crash
**Solutions**:
1. Verify your hardware meets template requirements
2. Check resource usage in the Management Dashboard
3. Consider switching to a lighter template
4. Optimize resource allocation in service configuration

### Getting Help

#### Built-in Help System
The wizard includes comprehensive help:
- **Search Common Issues**: Database of solutions for frequent problems
- **Diagnostic Reports**: One-click system diagnostics with automatic data redaction
- **Template-Specific Help**: Guidance specific to your chosen template
- **Community Links**: Direct access to Discord, GitHub, and forums

#### Error Recovery Procedures
When things go wrong:
1. **Use Diagnostic Tools**: Generate detailed system reports
2. **Check Service Logs**: Review logs for specific error messages
3. **Try Template Switching**: Switch to a different template if needed
4. **Fallback to Custom**: Use Custom Setup for maximum control
5. **Community Support**: Share diagnostic reports with the community

## 🎓 Template Best Practices

### Choosing the Right Template
1. **Start Small**: Begin with Home Node template if you're new
2. **Match Your Use Case**: Choose templates that align with your goals
3. **Consider Hardware**: Respect compatibility ratings
4. **Plan for Growth**: Consider future needs when selecting templates

### Optimizing Template Performance
1. **Monitor Resources**: Use the Management Dashboard to track usage
2. **Regular Updates**: Keep templates and services updated
3. **Backup Regularly**: Create backups before making changes
4. **Scale Gradually**: Add services incrementally rather than all at once

### Template Maintenance
1. **Regular Health Checks**: Use built-in health monitoring
2. **Log Monitoring**: Review service logs periodically
3. **Resource Monitoring**: Watch for resource exhaustion
4. **Security Updates**: Keep all components updated

## 🔮 Future Template Features

### Planned Enhancements
- **Template Marketplace**: Community-contributed templates
- **Template Versioning**: Track and manage template versions
- **Template Sharing**: Export and import custom template configurations
- **Template Analytics**: Performance metrics and optimization suggestions
- **Template Automation**: Scheduled updates and maintenance

### Community Templates
- **Validator Node Template**: For Kaspa network validators
- **Developer Template**: Optimized for Kaspa development
- **Analytics Template**: Specialized for blockchain analysis
- **Enterprise Template**: High-availability enterprise deployment

## 📞 Support and Resources

### Documentation
- **Template Reference**: Detailed documentation for each template
- **Service Documentation**: Individual service configuration guides
- **API Documentation**: Management Dashboard and wizard APIs
- **Troubleshooting Guide**: Comprehensive problem-solving guide

### Community Support
- **Discord**: Real-time help and discussions
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and template sharing
- **Kaspa Forum**: Community Q&A and template discussions

### Professional Support
- **Enterprise Support**: Professional support for business deployments
- **Custom Templates**: Professional template development services
- **Training**: Template management and optimization training
- **Consulting**: Architecture and deployment consulting

---

**Ready to get started with templates?** Launch the Installation Wizard and experience the simplified, template-first approach to Kaspa All-in-One deployment!

```bash
git clone https://github.com/jtmac69/Kaspa-All-in-One.git
cd KaspaAllInOne
docker compose --profile wizard up -d
# Open http://localhost:3000
```