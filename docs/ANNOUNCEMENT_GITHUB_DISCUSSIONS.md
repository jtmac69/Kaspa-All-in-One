# Kaspa All-in-One v0.9.0 Test Release - We Need Your Help! 🚀

## Welcome Testers!

We're excited to announce the **Kaspa All-in-One v0.9.0 Test Release** - and we need your help to make it production-ready!

After months of development, we've created a revolutionary web-based installation wizard that makes deploying Kaspa infrastructure as simple as running a single command. But before we release v1.0 to the broader community, we need testers like you to validate it across different platforms and configurations.

---

## 🎯 What is Kaspa All-in-One?

Kaspa All-in-One is a comprehensive deployment system that enables anyone to run Kaspa infrastructure on their own hardware. Whether you're a node operator, developer, or community member, this system provides everything you need to participate in the Kaspa network.

**Key Features:**
- 🧙‍♂️ **Web-based installation wizard** - Intuitive browser interface guides you through every step
- 🚀 **One-command start** - Just run `./start-test.sh` and you're testing!
- 🎯 **Multiple deployment profiles** - Core Node, User Applications, Indexer Services, and more
- 🔧 **Advanced service management** - Easy restart, stop, status checking, and fresh start capabilities
- 📊 **Real-time monitoring** - Live progress tracking and service health monitoring

---

## ⚡ Quick Start (< 5 Minutes)

**Step 1: Download**
Download `kaspa-aio-v0.9.0-test.tar.gz` from the [GitHub Release](https://github.com/[repo]/releases/tag/v0.9.0-test)

**Step 2: Extract and Run**
```bash
tar -xzf kaspa-aio-v0.9.0-test.tar.gz
cd kaspa-aio-v0.9.0-test/
./start-test.sh
```

**Step 3: Follow the Wizard**
Your browser will open automatically to http://localhost:3000 - just follow the guided setup!

**That's it!** The wizard handles everything else.

---

## 🧪 What We Need You to Test

We've prepared **5 comprehensive testing scenarios** in the included TESTING.md file:

1. **Scenario 1: Core Profile** (15 min) - Basic Kaspa node installation
2. **Scenario 2: Kaspa User Applications** (20 min) - User-facing apps (Kasia, K-Social, Explorer)
3. **Scenario 3: Indexer Services** (25 min) - High-performance blockchain indexing
4. **Scenario 4: Error Handling** - Test wizard error recovery
5. **Scenario 5: Reconfiguration** - Modify existing installations

**Don't have time for all scenarios?** Even testing just one scenario is incredibly valuable!

---

## 📋 Prerequisites

Before you start, you'll need:
- **Docker 20.10+** and **Docker Compose 2.0+**
- **Node.js 18+**
- **4GB RAM** and **20GB disk space** available
- **Stable internet connection**

The `start-test.sh` script will check these automatically and provide installation instructions if anything is missing.

**Supported Platforms:**
- ✅ Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+)
- ✅ macOS (11.0+)
- ✅ Windows via WSL2

---

## 🐛 How to Provide Feedback

Your feedback is crucial! Here's how to help:

### Report Bugs
Found something broken? [Open a bug report](https://github.com/[repo]/issues/new?template=bug_report.md)

**Please include:**
- What you were trying to do
- What happened vs. what you expected
- Your OS and Docker/Node.js versions
- Any error messages or logs

### Suggest Features
Have ideas for improvements? [Submit a feature request](https://github.com/[repo]/issues/new?template=feature_request.md)

### General Feedback
Questions, observations, or just want to chat? **Reply to this discussion thread!**

We're particularly interested in:
- Installation experience (smooth or confusing?)
- Documentation clarity (were instructions clear?)
- Error handling (did error messages help?)
- Performance (how long did installations take?)
- Feature requests (what would make this more useful?)

---

## ⚠️ Known Limitations

This is a **test release** with some known limitations:

**Expected Behaviors:**
- Node sync takes 4-8 hours (normal blockchain synchronization)
- Kasia app build takes 5-10 minutes (Rust compilation)
- Windows requires WSL2 (native Windows not yet supported)

**Features Not Ready:**
- Archival Node & Mining Stratum profiles (visible but untested)
- Management dashboard (not included in test release)
- Advanced reconfiguration (basic functionality only)

See [KNOWN_ISSUES.md](https://github.com/[repo]/blob/main/KNOWN_ISSUES.md) for complete details.

---

## 🎯 Testing Goals & Timeline

**Testing Period:** 2 weeks from today

**Success Criteria:**
- 90% installation success rate across all platforms
- Zero critical bugs
- Average installation time under 15 minutes
- Positive feedback from 80% of testers

**Your Impact:**
Every bug you find, every suggestion you make, and every question you ask directly shapes the v1.0 release. Your testing determines when we're ready for production!

---

## 📚 Documentation

Everything you need is included in the test package:

- **TESTING.md** - Comprehensive testing scenarios and instructions
- **KNOWN_ISSUES.md** - Known limitations and workarounds
- **README.md** - Quick start and overview
- **Service management scripts** - `restart-services.sh`, `stop-services.sh`, `status.sh`, etc.

---

## 🆘 Need Help?

**If something goes wrong:**
1. Check `./status.sh` to see what's running
2. Try `./restart-services.sh` to restart services
3. Use `./fresh-start.sh` for a clean slate
4. Check [KNOWN_ISSUES.md](https://github.com/[repo]/blob/main/KNOWN_ISSUES.md)
5. Ask in this discussion thread!

**For detailed help:**
- Review the included TESTING.md file
- Search existing [GitHub Issues](https://github.com/[repo]/issues)
- Ask questions in this discussion

---

## 🙏 Thank You!

Thank you for helping test Kaspa All-in-One! Your participation is invaluable in making this project better for everyone in the Kaspa community.

Whether you:
- Complete just one scenario or test everything
- Find critical bugs or minor improvements
- Provide detailed feedback or quick observations
- Test on Linux, macOS, or Windows/WSL2

**Your contribution matters and is deeply appreciated.**

Together, we're building the foundation for Kaspa's decentralized future. Thank you for being part of this journey! 🚀

---

## 🔗 Quick Links

- **Download:** [v0.9.0-test Release](https://github.com/[repo]/releases/tag/v0.9.0-test)
- **Report Bugs:** [Bug Report Template](https://github.com/[repo]/issues/new?template=bug_report.md)
- **Suggest Features:** [Feature Request Template](https://github.com/[repo]/issues/new?template=feature_request.md)
- **Documentation:** [TESTING.md](https://github.com/[repo]/blob/main/TESTING.md) | [KNOWN_ISSUES.md](https://github.com/[repo]/blob/main/KNOWN_ISSUES.md)

---

**Ready to start testing?** Download the release and run `./start-test.sh` - we can't wait to hear your feedback!
