# Kaspa All-in-One Test Release - Tester Guide

## Welcome Testers! 👋

Thank you for helping test the Kaspa All-in-One Installation Wizard. This guide will help you get started and provide valuable feedback.

**Test Release Version**: 0.9.0-beta  
**Date**: November 21, 2025  
**Estimated Testing Time**: 1-2 hours

---

## What You're Testing

The **Kaspa All-in-One Installation Wizard** - a web-based tool that helps anyone install and run Kaspa blockchain infrastructure with minimal technical knowledge.

### Key Features to Test

1. **Installation Wizard** - Step-by-step guided installation
2. **Profile Selection** - Choose what services to run
3. **Configuration** - Customize settings
4. **Error Recovery** - Rollback and retry when things go wrong
5. **Help System** - Interactive glossary and guides

---

## Prerequisites

### What You Need

- **Computer**: Mac, Linux, or Windows with WSL2
- **RAM**: At least 4GB available
- **Disk Space**: At least 20GB free
- **Internet**: Stable connection
- **Docker**: Installed (we'll help you install if needed)
- **Browser**: Chrome, Firefox, or Safari (latest version)

### What You DON'T Need

- ❌ Blockchain experience
- ❌ Command line expertise
- ❌ Docker knowledge
- ❌ Programming skills

**This wizard is designed for non-technical users!**

---

## Getting Started

### Step 1: Get the Code

```bash
# Clone the repository
git clone https://github.com/[repo-url]/kaspa-all-in-one.git
cd kaspa-all-in-one
```

### Step 2: Start the Wizard

```bash
# Navigate to wizard backend
cd services/wizard/backend

# Install dependencies (first time only)
npm install

# Start the wizard
npm start
```

**Expected Output**:
```
Kaspa Installation Wizard backend running on port 3000
Frontend: http://localhost:3000
API: http://localhost:3000/api
```

### Step 3: Open the Wizard

1. Open your web browser
2. Go to: **http://localhost:3000**
3. You should see the Kaspa Installation Wizard welcome screen

**If you see the wizard** → You're ready to test! 🎉  
**If you don't** → See Troubleshooting section below

---

## What to Test

### 1. Complete Installation Flow (30-45 minutes)

**Goal**: Install Kaspa All-in-One using the wizard

**Steps**:
1. Click "Get Started" on welcome screen
2. Complete pre-installation checklist
3. Run system check
4. Select a profile (recommend "Core" for testing)
5. Configure settings
6. Review configuration
7. Start installation
8. Verify installation completes

**What to Note**:
- Did each step make sense?
- Were instructions clear?
- Did you get stuck anywhere?
- How long did it take?
- Did installation succeed?

### 2. Error Recovery (15-20 minutes)

**Goal**: Test rollback and recovery features

**Tests**:

**A. Undo Configuration Changes**
1. Make a configuration change
2. Look for "Undo" button (bottom-right)
3. Click "Undo"
4. Verify configuration reverts

**B. Start Over**
1. Click "Start Over" button (top-right)
2. Review confirmation dialog
3. Try with different options
4. Verify wizard resets

**C. Resume Installation**
1. Start installation
2. Refresh page mid-installation
3. Check if prompted to resume
4. Test resume functionality

**What to Note**:
- Was undo button easy to find?
- Did rollback work correctly?
- Was start over clear?
- Did resume work?

### 3. Help System (10-15 minutes)

**Goal**: Test glossary and help features

**Tests**:
1. Click floating help button (bottom-right)
2. Search for terms in glossary
3. Click on glossary terms in wizard text
4. Read concept explainers
5. Try "Help Me Choose" quiz

**What to Note**:
- Was glossary helpful?
- Were explanations clear?
- Did tooltips work?
- Was quiz useful?

### 4. Different Profiles (Optional, 20-30 minutes each)

**Goal**: Test different installation profiles

**Profiles to Try**:
- **Core**: Basic Kaspa node + dashboard
- **Production**: Adds messaging and social apps
- **Explorer**: Adds blockchain indexing
- **Mining**: Adds mining support

**What to Note**:
- Were profile descriptions clear?
- Did installation work for each?
- Were resource warnings accurate?
- Did services start correctly?

---

## How to Provide Feedback

### What We Want to Know

#### 1. Installation Success
- ☐ Installation completed successfully
- ☐ Installation failed (describe what happened)
- ☐ Installation partially worked (which parts?)

#### 2. User Experience
- How clear were the instructions? (1-5 scale)
- How easy was the wizard to use? (1-5 scale)
- Did you feel confident during installation? (1-5 scale)
- What was confusing or unclear?
- What was helpful or well-done?

#### 3. Errors Encountered
- What errors did you see?
- At what step did they occur?
- Were error messages helpful?
- Did recovery options work?

#### 4. Time Taken
- How long did installation take?
- Which steps took longest?
- Was time estimate accurate?

#### 5. Suggestions
- What would make this better?
- What features are missing?
- What should be changed?

### Where to Submit Feedback

**Option 1: GitHub Issues** (Preferred)
- Go to: [GitHub Issues URL]
- Click "New Issue"
- Use "Test Feedback" template
- Include all details

**Option 2: Feedback Form**
- Go to: [Feedback Form URL]
- Fill out form
- Submit

**Option 3: Discord**
- Join: [Discord Server URL]
- Post in #testing channel
- Tag @testers

---

## Troubleshooting

### Wizard Won't Start

**Problem**: `npm start` fails

**Solutions**:
```bash
# Check Node.js version (need 16+)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try different port
WIZARD_PORT=3001 npm start
```

### Page Won't Load

**Problem**: Browser shows "Can't connect"

**Solutions**:
- Verify backend is running (check terminal)
- Try different browser
- Clear browser cache
- Check firewall settings

### Docker Not Installed

**Problem**: System check fails for Docker

**Solutions**:
- Click "How to Install Docker" in wizard
- Follow OS-specific guide
- Restart wizard after installing

### Installation Fails

**Problem**: Installation errors out

**Solutions**:
- Click "Export Diagnostic Report"
- Try "Undo Last Change"
- Try "Start Over" with different profile
- Check error message for specific issue

### Wizard Freezes

**Problem**: Wizard becomes unresponsive

**Solutions**:
- Check browser console for errors
- Refresh page (progress should be saved)
- Try different browser
- Restart backend server

---

## Known Limitations

### Current Test Release

**What Works**:
- ✅ Complete installation wizard
- ✅ All 6 profiles
- ✅ Error recovery and rollback
- ✅ Interactive glossary
- ✅ Diagnostic export

**What's Limited**:
- ⚠️ No video tutorials yet (scripts available)
- ⚠️ Basic dashboard only (advanced features coming)
- ⚠️ Manual Docker installation required
- ⚠️ Limited mobile optimization

**What's Not Included**:
- ❌ Automatic updates (coming soon)
- ❌ Cloud deployment (future)
- ❌ Advanced monitoring (future)

---

## Testing Tips

### Do's ✅
- ✅ Test on your actual hardware
- ✅ Try to break things (we want to find bugs!)
- ✅ Take screenshots of errors
- ✅ Note exact steps that caused issues
- ✅ Test error recovery features
- ✅ Try different profiles
- ✅ Be honest in feedback

### Don'ts ❌
- ❌ Don't skip steps in wizard
- ❌ Don't test on production systems
- ❌ Don't share test release publicly yet
- ❌ Don't expect everything to be perfect
- ❌ Don't hesitate to ask questions

---

## FAQ

### Q: How long should installation take?
**A**: 10-30 minutes depending on profile and internet speed. Blockchain sync takes longer (2-24 hours).

### Q: Can I test multiple profiles?
**A**: Yes! Use "Start Over" to reset and try different profiles.

### Q: What if I find a bug?
**A**: Great! Document it and submit via GitHub Issues or feedback form.

### Q: Can I use this on my main computer?
**A**: Yes, but recommend testing on non-critical system first.

### Q: Will this delete my existing data?
**A**: No, unless you explicitly choose to in "Start Over" options.

### Q: Can I stop testing anytime?
**A**: Absolutely! Your feedback is valuable at any stage.

### Q: What happens to my test installation?
**A**: You can keep it running or use "Start Over" to clean up.

---

## Support

### Need Help?

**During Testing**:
- Check this guide first
- Use wizard's help system
- Check glossary for terms
- Export diagnostic report

**Still Stuck?**:
- Post in Discord #testing channel
- Create GitHub issue
- Email: [support email]

### Emergency Stop

If something goes wrong:

```bash
# Stop all services
cd /path/to/kaspa-all-in-one
docker-compose down

# Remove everything (if needed)
docker-compose down -v
```

---

## Thank You! 🙏

Your testing helps make Kaspa All-in-One better for everyone. We appreciate your time and feedback!

### What Happens Next

1. We review all feedback
2. Fix critical issues
3. Improve based on suggestions
4. Release updated version
5. You get early access to final release!

---

## Quick Reference

### Start Wizard
```bash
cd services/wizard/backend
npm start
```
Then open: http://localhost:3000

### Stop Wizard
Press `Ctrl+C` in terminal

### Clean Up
```bash
cd /path/to/kaspa-all-in-one
docker-compose down -v
```

### Get Help
- Discord: [URL]
- GitHub: [URL]
- Email: [email]

---

**Happy Testing!** 🚀

If you have any questions, don't hesitate to reach out. We're here to help!
