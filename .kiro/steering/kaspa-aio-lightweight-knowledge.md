# Kaspa All-in-One Lightweight System Knowledge

## Core Architecture (Essential Context Only)

**Hybrid Architecture**: Host-based management + containerized services

### Management Tools (Host-Based)
- **Installation Wizard**: Port 3000, Node.js, handles configuration
- **Management Dashboard**: Port 8080, Node.js, monitors services
- **Integration**: Dashboard detects → suggests → launches Wizard → applies changes

### Key Principles
1. **Host-based Management**: Wizard and Dashboard run on HOST, not in containers
2. **Direct Access**: Services accessed directly by port, Nginx only proxies containerized Kaspa apps  
3. **Profile Dependencies**: Mining requires Core/Archive, others have fallback strategies
4. **Shared Database**: Single TimescaleDB with separate databases per indexer
5. **Configuration Flow**: All changes go through wizard, dashboard monitors

### Critical Implementation Points
- Installation state shared via `.kaspa-aio/installation-state.json`
- Both management tools run as systemd services
- Services can fallback to public endpoints if local services fail
- Configuration changes always go through the wizard
- Dashboard focuses on monitoring and suggestions

## When You Need More Detail
For comprehensive architecture, service definitions, and detailed implementation guidance, reference:
`docs/KASPA_ALL_IN_ONE_COMPREHENSIVE_KNOWLEDGE_BASE.md`

Only load the full knowledge base when working on complex architectural changes or need detailed service specifications.