# GitHub Release Creation Instructions

## Overview

This document provides step-by-step instructions for creating the GitHub release for Kaspa All-in-One v0.9.0-test. The git tag has already been created and pushed, and the release package is ready for upload.

## Prerequisites

✅ **Already Complete:**
- [x] Git tag `v0.9.0-test` created and pushed to GitHub
- [x] Release package `kaspa-aio-v0.9.0-test.tar.gz` built (2.1M)
- [x] Checksum file `kaspa-aio-v0.9.0-test.tar.gz.sha256` generated
- [x] Release notes prepared in `docs/RELEASE_NOTES_v0.9.0.md`

**Package Details:**
- **File**: `kaspa-aio-v0.9.0-test.tar.gz`
- **Size**: 2.1M
- **SHA256**: `d95a091552e3138f3597877a31ce2d79035543a819b181ba9c35062dc2fa2307`

## Step-by-Step Instructions

### Step 1: Navigate to GitHub Releases

1. Go to the repository: https://github.com/jtmac69/Kaspa-All-in-One
2. Click on "Releases" in the right sidebar (or go to https://github.com/jtmac69/Kaspa-All-in-One/releases)
3. Click "Create a new release" button

### Step 2: Configure Release Settings

**Tag Selection:**
- In the "Choose a tag" dropdown, select `v0.9.0-test`
- The tag should already exist and be available in the dropdown

**Release Title:**
```
Kaspa All-in-One v0.9.0 - Test Release
```

**Pre-release Settings:**
- ✅ **IMPORTANT**: Check the "Set as a pre-release" checkbox
- This marks it as a test release, not a production release

### Step 3: Add Release Description

Copy the entire content from `docs/RELEASE_NOTES_v0.9.0.md` into the release description field. The content includes:

- ⚠️ Test release warning
- Comprehensive release description
- What's new section
- Quick start instructions
- Prerequisites
- Feedback links
- Known issues summary
- Thank you message

**Note**: The release notes are comprehensive (5000+ words) and provide everything testers need to know.

### Step 4: Upload Release Assets

Click "Attach binaries by dropping them here or selecting them" and upload:

1. **Primary Package**: `kaspa-aio-v0.9.0-test.tar.gz`
   - This is the main test release package (2.1M)
   
2. **Checksum File**: `kaspa-aio-v0.9.0-test.tar.gz.sha256`
   - This allows users to verify package integrity

**Upload Process:**
- Drag and drop both files into the upload area
- Wait for upload to complete (should be quick, only 2.1M total)
- Verify both files appear in the assets list

### Step 5: Final Review

Before publishing, verify:

- ✅ Tag: `v0.9.0-test` is selected
- ✅ Title: "Kaspa All-in-One v0.9.0 - Test Release"
- ✅ Pre-release: Checkbox is checked
- ✅ Description: Complete release notes from RELEASE_NOTES_v0.9.0.md
- ✅ Assets: Both .tar.gz and .sha256 files uploaded
- ✅ Repository: jtmac69/Kaspa-All-in-One

### Step 6: Publish Release

1. Click "Publish release" button
2. The release will be created and immediately available
3. GitHub will send notifications to watchers
4. The release will appear at: https://github.com/jtmac69/Kaspa-All-in-One/releases/tag/v0.9.0-test

## Post-Release Verification

After publishing, verify:

1. **Release Page**: Visit the release URL and confirm all information is correct
2. **Download Test**: Download the package and verify the checksum:
   ```bash
   wget https://github.com/jtmac69/Kaspa-All-in-One/releases/download/v0.9.0-test/kaspa-aio-v0.9.0-test.tar.gz
   wget https://github.com/jtmac69/Kaspa-All-in-One/releases/download/v0.9.0-test/kaspa-aio-v0.9.0-test.tar.gz.sha256
   sha256sum -c kaspa-aio-v0.9.0-test.tar.gz.sha256
   ```
3. **Pre-release Badge**: Confirm the release shows "Pre-release" badge
4. **Assets**: Confirm both files are downloadable

## Next Steps After Release

Once the GitHub release is published:

1. **Update Task Status**: Mark task 7.2 as complete in tasks.md
2. **Proceed to Task 7.3**: Announce test release in GitHub Discussions
3. **Monitor Feedback**: Watch for issues and discussions from testers
4. **Update Documentation**: Based on initial tester feedback

## Troubleshooting

**If Tag Not Found:**
- Verify tag exists: `git tag -l | grep v0.9.0-test`
- Verify tag is pushed: `git ls-remote --tags origin | grep v0.9.0-test`
- If missing, recreate and push the tag

**If Upload Fails:**
- Check file sizes (should be small, 2.1M total)
- Try uploading files one at a time
- Refresh the page and try again

**If Release Notes Too Long:**
- GitHub has a character limit for release descriptions
- If needed, summarize and link to full RELEASE_NOTES_v0.9.0.md file

## Package Contents Verification

The release package contains:
- All source code and configuration files
- Installation wizard (frontend and backend)
- Service management scripts (start-test.sh, restart-services.sh, etc.)
- Documentation (TESTING.md, KNOWN_ISSUES.md, etc.)
- GitHub issue templates
- Docker configurations
- All necessary files for testing

**Excluded from package:**
- .git directory
- node_modules directories
- Build artifacts
- Personal configuration files
- Test data

## Success Criteria

The GitHub release is successful when:
- ✅ Release is published and accessible
- ✅ Pre-release badge is visible
- ✅ Both package files are downloadable
- ✅ Checksum verification works
- ✅ Release notes are complete and formatted correctly
- ✅ Download links work from external sources

## Contact

If you encounter issues creating the release:
- Check GitHub's release documentation
- Verify repository permissions
- Contact repository maintainers if needed

---

**Ready to create the release?** Follow the steps above to publish Kaspa All-in-One v0.9.0-test!