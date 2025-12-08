# Wizard Bootstrap Strategy - Zero-Dependency Design

## Problem Statement

The Kaspa All-in-One installation wizard faces a classic "chicken-and-egg" problem:

- **Users need the wizard** to install Docker and configure the system
- **But the wizard itself** shouldn't require complex dependencies
- **Non-technical users** may not have Node.js, Python, or other runtimes installed

## Solution: Hybrid Multi-Runtime Approach

We implement a **graceful degradation strategy** with three runtime modes, prioritized by capability:

### Runtime Modes (Best to Basic)

```
┌─────────────────────────────────────────────────────────┐
│  1. Node.js Backend (Full Featured) 🚀                  │
│     - WebSocket streaming                                │
│     - Full automation                                    │
│     - Advanced error handling                            │
│     - Docker API integration                             │
└─────────────────────────────────────────────────────────┘
                         ↓ Falls back to
┌─────────────────────────────────────────────────────────┐
│  2. Python Backend (Enhanced) 🐍                         │
│     - HTTP server                                        │
│     - Command automation                                 │
│     - Progress polling                                   │
│     - Good error handling                                │
└─────────────────────────────────────────────────────────┘
                         ↓ Falls back to
┌─────────────────────────────────────────────────────────┐
│  3. Static HTML (Zero Dependencies) ✅                   │
│     - Pure HTML/CSS/JS                                   │
│     - Manual command execution                           │
│     - Copy/paste workflow                                │
│     - Works everywhere                                   │
└─────────────────────────────────────────────────────────┘
```

## Mode 1: Static HTML (Zero Dependencies) ✅

### Overview
- **Priority**: PRIMARY (always available)
- **Dependencies**: None (just a web browser)
- **Use Case**: First-time installation, non-technical users

### Technical Details
```
services/wizard/
├── index.html          # Pure HTML5, no build step
├── wizard.js           # Vanilla JavaScript (ES6+)
├── wizard.css          # Pure CSS3 with Kaspa branding
└── assets/             # Images, logos, icons
```

### Features
- ✅ Opens directly in browser (file:// or simple HTTP server)
- ✅ Multi-step wizard interface
- ✅ Client-side validation
- ✅ Configuration file generation
- ✅ Command generation with copy/paste
- ✅ Manual progress tracking
- ✅ Works offline after initial load

### User Flow
```
1. User downloads Kaspa All-in-One
2. Opens services/wizard/index.html in browser
3. Wizard guides through system checks (user confirms)
4. User selects profiles and configuration
5. Wizard generates installation commands
6. User copies commands to terminal
7. User runs commands manually
8. User confirms completion in wizard
9. Wizard validates and shows success
```

### Limitations
- ⚠️ No automatic command execution
- ⚠️ No real-time progress updates
- ⚠️ Manual validation required
- ⚠️ Copy/paste workflow

## Mode 2: Python Backend (Enhanced) 🐍

### Overview
- **Priority**: OPTIONAL (if Python available)
- **Dependencies**: Python 3.7+ (usually pre-installed on Linux/macOS)
- **Use Case**: Technical users, better UX

### Technical Details
```
services/wizard/backend/
├── server.py           # Flask or FastAPI
├── requirements.txt    # Minimal dependencies
├── system_checker.py   # System validation
├── command_executor.py # Safe command execution
└── config_manager.py   # Configuration handling
```

### Features
- ✅ Automatic command execution
- ✅ Real-time progress via polling
- ✅ Better error handling
- ✅ Docker API integration
- ✅ Automatic validation
- ✅ Falls back to static mode if Python unavailable

### User Flow
```
1. User downloads Kaspa All-in-One
2. Runs: ./start-wizard.sh
3. Script detects Python, starts server
4. Browser opens to http://localhost:3000
5. Wizard checks system automatically
6. User selects profiles
7. Wizard executes commands automatically
8. Progress updates via polling (every 2 seconds)
9. Wizard validates automatically
10. Success! Redirects to dashboard
```

### Advantages over Static
- ✅ Automated command execution
- ✅ Better progress tracking
- ✅ Automatic validation
- ✅ Better error messages

## Mode 3: Node.js Backend (Full Featured) 🚀

### Overview
- **Priority**: ADVANCED (if Node.js available)
- **Dependencies**: Node.js 18+ and npm
- **Use Case**: Development, advanced users, post-installation

### Technical Details
```
services/wizard/backend/
├── server.js           # Express.js server
├── package.json        # Node.js dependencies
├── src/
│   ├── api/           # REST API endpoints
│   ├── engine/        # Installation engine
│   ├── websocket/     # WebSocket server
│   └── docker/        # Docker API integration
└── Dockerfile         # For post-installation mode
```

### Features
- ✅ WebSocket real-time streaming
- ✅ Full automation
- ✅ Advanced error handling
- ✅ Docker API integration (dockerode)
- ✅ Live log streaming
- ✅ Auto-remediation
- ✅ Can run as Docker container post-installation

### User Flow
```
1. User downloads Kaspa All-in-One
2. Runs: ./start-wizard.sh
3. Script detects Node.js, starts server
4. Browser opens to http://localhost:3000
5. WebSocket connects for real-time updates
6. Wizard checks system, shows live results
7. User selects profiles or clicks "Auto-Configure"
8. Wizard installs automatically
9. Live log streaming shows all activity
10. Wizard validates in real-time
11. Success! Dashboard opens automatically
```

### Advantages over Python
- ✅ WebSocket real-time updates (no polling)
- ✅ Better performance
- ✅ More advanced features
- ✅ Can run as Docker container

## Smart Launcher

### start-wizard.sh

The smart launcher automatically detects available runtimes and launches the best mode:

```bash
#!/bin/bash
# start-wizard.sh - Smart wizard launcher

echo "🎯 Kaspa All-in-One Installation Wizard"
echo ""

# Try Node.js first (best experience)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js detected: $NODE_VERSION"
    echo "🚀 Starting wizard with Node.js backend (full features)..."
    echo ""
    cd services/wizard/backend
    npm install --silent
    node server.js
    exit 0
fi

# Fall back to Python (good experience)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python detected: $PYTHON_VERSION"
    echo "🐍 Starting wizard with Python backend (enhanced)..."
    echo ""
    cd services/wizard/backend
    pip3 install -q -r requirements.txt
    python3 server.py
    exit 0
fi

# Fall back to static HTML (basic experience)
echo "📄 No backend runtime detected (Node.js or Python)"
echo "🌐 Opening wizard in browser (static mode)..."
echo ""
echo "The wizard will guide you through manual installation steps."
echo ""

# Try to open browser automatically
WIZARD_PATH="file://$(pwd)/services/wizard/index.html"

if command -v xdg-open &> /dev/null; then
    xdg-open "$WIZARD_PATH"
elif command -v open &> /dev/null; then
    open "$WIZARD_PATH"
else
    echo "Please open this file in your browser:"
    echo "$WIZARD_PATH"
fi
```

### Launcher Behavior

| Runtime Available | Mode Selected | Features |
|-------------------|---------------|----------|
| Node.js | Node.js Backend | Full automation, WebSocket, live logs |
| Python (no Node.js) | Python Backend | Automation, polling, good UX |
| Neither | Static HTML | Manual, copy/paste, basic UX |

## Feature Comparison

| Feature | Static HTML | Python Backend | Node.js Backend |
|---------|-------------|----------------|-----------------|
| **Dependencies** | None | Python 3.7+ | Node.js 18+ |
| **Startup Time** | Instant | ~2 seconds | ~3 seconds |
| **System Checks** | Manual | Automated | Automated |
| **Command Execution** | Copy/Paste | Automated | Automated |
| **Progress Updates** | Manual | Polling (2s) | WebSocket (real-time) |
| **Log Streaming** | No | Limited | Full streaming |
| **Error Handling** | Basic | Good | Advanced |
| **Auto-Remediation** | No | Limited | Full |
| **Docker Integration** | No | Basic | Full API |
| **Post-Install Mode** | No | No | Yes (Docker container) |
| **Browser Support** | All modern | All modern | All modern |
| **Offline Support** | Yes | No | No |

## Implementation Priority

### Phase 0: Static HTML (Week 1-2) - CRITICAL ✅
**Goal**: Zero-dependency wizard that works everywhere

**Deliverables**:
- Pure HTML/CSS/JS wizard
- Multi-step interface
- Configuration generation
- Command generation
- Manual workflow

**Success Criteria**:
- Works on any system with a browser
- No installation required
- Complete installation guidance
- 100% of users can use it

### Phase 1: Python Backend (Week 3-4) - HIGH PRIORITY 🐍
**Goal**: Enhanced UX with automation

**Deliverables**:
- Python Flask/FastAPI server
- Automated command execution
- Progress polling
- Better error handling
- Graceful fallback to static

**Success Criteria**:
- Works on Linux/macOS (Python pre-installed)
- Automated installation
- 80% of users get enhanced experience

### Phase 2: Node.js Backend (Week 5-6) - MEDIUM PRIORITY 🚀
**Goal**: Best-in-class UX

**Deliverables**:
- Express.js server with TypeScript
- WebSocket real-time streaming
- Full Docker API integration
- Advanced automation
- Can run as Docker container

**Success Criteria**:
- Real-time progress updates
- Advanced error handling
- Can run post-installation
- 50% of users get full experience

## Cross-Platform Support

### Linux
- **Static**: ✅ Works (any browser)
- **Python**: ✅ Usually pre-installed (Python 3)
- **Node.js**: ⚠️ May need installation
- **Recommended**: Python backend

### macOS
- **Static**: ✅ Works (Safari, Chrome, Firefox)
- **Python**: ✅ Pre-installed (Python 3)
- **Node.js**: ⚠️ May need installation (Homebrew)
- **Recommended**: Python backend

### Windows
- **Static**: ✅ Works (Edge, Chrome, Firefox)
- **Python**: ⚠️ Usually not pre-installed
- **Node.js**: ⚠️ May need installation
- **Recommended**: Static mode

### Windows WSL
- **Static**: ✅ Works
- **Python**: ✅ Usually available
- **Node.js**: ⚠️ May need installation
- **Recommended**: Python backend

## Testing Strategy

### Static HTML Mode
- ✅ Test in all major browsers (Chrome, Firefox, Safari, Edge)
- ✅ Test file:// protocol
- ✅ Test with simple HTTP server
- ✅ Test offline functionality
- ✅ Test on mobile browsers

### Python Backend Mode
- ✅ Test on Linux (Ubuntu, Debian, CentOS)
- ✅ Test on macOS (multiple versions)
- ✅ Test fallback to static mode
- ✅ Test with Python 3.7, 3.8, 3.9, 3.10, 3.11
- ✅ Test command execution safety

### Node.js Backend Mode
- ✅ Test on Linux, macOS, Windows
- ✅ Test WebSocket connections
- ✅ Test Docker API integration
- ✅ Test fallback to Python/static
- ✅ Test as Docker container

## Security Considerations

### Static HTML Mode
- ✅ No server-side code execution
- ✅ No network requests (can work offline)
- ✅ User controls all command execution
- ✅ Configuration files generated client-side

### Python Backend Mode
- ⚠️ Command execution requires validation
- ⚠️ File system access needs permissions
- ⚠️ HTTP server needs port binding
- ✅ Runs locally (localhost only)

### Node.js Backend Mode
- ⚠️ Docker API access requires permissions
- ⚠️ WebSocket connections need validation
- ⚠️ File system access needs permissions
- ✅ Runs locally (localhost only)
- ✅ Can run in Docker container (isolated)

## Success Metrics

### Static HTML Mode
- **Adoption**: 100% of users can use it
- **Success Rate**: 70% complete installation
- **Time to Complete**: 15-20 minutes
- **Support Requests**: Moderate

### Python Backend Mode
- **Adoption**: 80% of Linux/macOS users
- **Success Rate**: 85% complete installation
- **Time to Complete**: 10-15 minutes
- **Support Requests**: Low

### Node.js Backend Mode
- **Adoption**: 50% of technical users
- **Success Rate**: 95% complete installation
- **Time to Complete**: 5-10 minutes
- **Support Requests**: Very Low

## Conclusion

The hybrid multi-runtime approach ensures:

1. ✅ **Universal Access**: Everyone can use the wizard (static HTML)
2. ✅ **Enhanced UX**: Most users get automation (Python backend)
3. ✅ **Best Experience**: Technical users get full features (Node.js backend)
4. ✅ **Graceful Degradation**: Always falls back to working mode
5. ✅ **Zero Barriers**: No installation required to start

This strategy solves the bootstrap problem while providing the best possible experience for each user's environment.

---

**Next Steps**:
1. Implement Phase 0 (Static HTML) - Week 1-2
2. Implement Phase 1 (Python Backend) - Week 3-4
3. Implement Phase 2 (Node.js Backend) - Week 5-6
4. Test all modes on all platforms
5. Document user flows for each mode
