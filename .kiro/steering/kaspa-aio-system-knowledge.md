---
inclusion: fileMatch
fileMatchPattern: '**/{kaspa,wizard,dashboard,all-in-one}*'
---

# Kaspa All-in-One System Knowledge

When working on any Kaspa All-in-One related tasks, reference the comprehensive knowledge base only when needed:
`docs/KASPA_ALL_IN_ONE_COMPREHENSIVE_KNOWLEDGE_BASE.md`

**Use lightweight knowledge from kaspa-aio-lightweight-knowledge.md for most tasks.**

## Key Architecture Reminders

- **Host-based Management**: Wizard (port 3000) and Dashboard (port 8080) run on HOST, not in containers
- **Direct Access**: Services accessed directly by port, Nginx only proxies containerized Kaspa apps  
- **Profile Dependencies**: Mining requires Core/Archive, others have fallback strategies
- **Shared Database**: Single TimescaleDB with separate databases per indexer
- **Integration Flow**: Dashboard detects → suggests → launches Wizard → applies changes

## Critical Implementation Points

1. Configuration changes always go through the wizard
2. Dashboard focuses on monitoring and suggestions
3. Services can fallback to public endpoints if local services fail
4. Installation state is shared between wizard and dashboard via `.kaspa-aio/installation-state.json`
5. Both management tools run as systemd services on the host system

Always consult the full knowledge base for complete architectural context before making changes.