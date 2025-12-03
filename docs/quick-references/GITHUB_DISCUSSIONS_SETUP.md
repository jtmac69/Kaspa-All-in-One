# GitHub Discussions Setup Guide

## Overview

This guide provides step-by-step instructions for enabling and configuring GitHub Discussions for the Kaspa All-in-One test release. GitHub Discussions provides a space for testers to ask questions, share feedback, and engage with the community.

## Prerequisites

- Repository admin access
- GitHub account with appropriate permissions

## Step 1: Enable GitHub Discussions

GitHub Discussions must be enabled through the repository settings:

1. Navigate to your repository on GitHub
2. Click on **Settings** (top navigation bar)
3. Scroll down to the **Features** section
4. Check the box next to **Discussions**
5. Click **Set up discussions** if prompted

**Note**: Once enabled, a new "Discussions" tab will appear in your repository navigation.

## Step 2: Create "Test Release Feedback" Category

After enabling Discussions, create a dedicated category for test release feedback:

1. Go to the **Discussions** tab in your repository
2. Click on the **Categories** section (or the pencil icon to edit categories)
3. Click **New category**
4. Configure the category:
   - **Name**: `Test Release Feedback`
   - **Description**: `Share your experience testing Kaspa All-in-One v0.9.0`
   - **Discussion Format**: Choose "Open-ended discussion"
   - **Emoji**: 🧪 (test tube) or 💬 (speech balloon)
5. Click **Create**

## Step 3: Create Pinned Welcome Post

Create a welcoming post to guide testers:

1. Go to the **Discussions** tab
2. Click **New discussion**
3. Select the **Test Release Feedback** category
4. Use the following template:

### Title
```
Welcome Testers! - Kaspa All-in-One v0.9.0 Test Release
```

### Body
```markdown
# Welcome to Kaspa All-in-One Test Release! 🎉

Thank you for participating in testing Kaspa All-in-One v0.9.0. Your feedback is invaluable in making this project better for everyone.

## 📋 What to Test

Please follow the testing scenarios in [TESTING.md](../TESTING.md):
- Scenario 1: Core Profile Installation
- Scenario 2: Kaspa User Applications
- Scenario 3: Indexer Services
- Scenario 4: Error Handling
- Scenario 5: Reconfiguration

## 🐛 How to Provide Feedback

### Report Bugs
Found a bug? Please [create a bug report](../../issues/new?template=bug_report.md)

### Suggest Features
Have an idea? Please [submit a feature request](../../issues/new?template=feature_request.md)

### General Feedback
Use this discussion thread to share:
- Your overall testing experience
- Installation time and success
- Documentation clarity
- Suggestions for improvement
- Questions about the system

## 📖 Resources

- [Testing Guide](../TESTING.md) - Detailed testing instructions
- [Known Issues](../KNOWN_ISSUES.md) - Current limitations
- [Quick Start](../QUICK_START.md) - Getting started guide

## ✅ Success Criteria

We're aiming for:
- 90% installation success rate
- Zero critical bugs
- <15 minute average install time
- 80% positive feedback

## 🙏 Thank You!

Your participation helps ensure Kaspa All-in-One is ready for production release. We appreciate your time and effort!

---

**Test Release Version**: v0.9.0-test  
**Testing Period**: [Start Date] - [End Date]  
**Target Release**: v1.0.0
```

5. Click **Start discussion**
6. Pin the discussion:
   - Click on the discussion you just created
   - Click the **Pin** button (📌) in the top right
   - Select "Pin to category" or "Pin to repository"

## Step 4: Update TESTING.md with Discussion Link

Add a link to the GitHub Discussions in TESTING.md:

The link format will be:
```
https://github.com/[username]/[repository]/discussions
```

Or for the specific category:
```
https://github.com/[username]/[repository]/discussions/categories/test-release-feedback
```

## Step 5: Verify Setup

Confirm everything is working:

- [ ] Discussions tab is visible in repository navigation
- [ ] "Test Release Feedback" category exists
- [ ] Welcome post is created and pinned
- [ ] TESTING.md links to discussions
- [ ] Links work correctly from external sources

## Additional Configuration (Optional)

### Create Additional Categories

Consider creating these additional categories:

1. **Q&A** - For questions and answers
   - Format: Q&A
   - Description: "Ask questions about installation and usage"

2. **Show and Tell** - For sharing setups
   - Format: Open-ended
   - Description: "Share your Kaspa All-in-One setup and configurations"

3. **Ideas** - For feature suggestions
   - Format: Open-ended
   - Description: "Propose new features and improvements"

### Configure Discussion Settings

1. Go to **Settings** → **Discussions**
2. Configure:
   - **Allow users to create discussions**: ✓ Enabled
   - **Require approval for new discussions**: Optional (recommended: disabled for test release)
   - **Lock discussions after inactivity**: Optional

## Troubleshooting

### Discussions Tab Not Appearing
- Ensure you have admin access to the repository
- Refresh the page after enabling
- Check that the feature is enabled in Settings → Features

### Cannot Create Categories
- Ensure Discussions is fully enabled
- Try refreshing the page
- Check browser console for errors

### Links Not Working
- Verify the repository URL is correct
- Ensure the discussion/category is public
- Check that the discussion hasn't been deleted

## Integration with Test Release

Once GitHub Discussions is set up, it will be referenced in:

1. **TESTING.md** - Links to discussion for general feedback
2. **README.md** - Links to discussion in test release section
3. **Wizard UI** - Links to discussion for feedback (Phase 4)
4. **Release Notes** - Links to discussion for community engagement

## Maintenance During Testing Period

During the 2-week testing period:

- [ ] Monitor discussions daily
- [ ] Respond to questions promptly
- [ ] Thank testers for their feedback
- [ ] Move bug reports to Issues if needed
- [ ] Update pinned post with important announcements
- [ ] Collect metrics on engagement

## Success Metrics

Track these metrics for the test release:

- Number of discussion participants
- Number of discussion posts
- Response time to questions
- Sentiment of feedback (positive/negative/neutral)
- Common themes in feedback

## After Test Release

Once testing is complete:

1. Create a summary post with findings
2. Thank all participants
3. Announce next steps (v1.0 timeline)
4. Keep discussions open for ongoing feedback
5. Archive or lock test-release-specific discussions if needed

## Related Documentation

- [TESTING.md](../../TESTING.md) - Testing instructions
- [KNOWN_ISSUES.md](../../KNOWN_ISSUES.md) - Known limitations
- [Bug Report Template](../../.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request Template](../../.github/ISSUE_TEMPLATE/feature_request.md)

---

**Note**: This is a manual process that requires GitHub web interface access. It cannot be automated through code or scripts.
