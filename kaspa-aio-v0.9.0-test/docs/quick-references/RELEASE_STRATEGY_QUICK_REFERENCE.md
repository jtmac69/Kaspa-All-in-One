# Release Strategy Quick Reference

## Overview

The Kaspa All-in-One project uses a two-tier release strategy:

1. **Test Releases** - Simple, git-based distribution for testing
2. **Production Releases** - Automated, packaged releases with full distribution

## Test Releases

**Purpose**: Get feedback from testers before production release

**Spec Location**: `.kiro/specs/test-release/`

**Distribution Method**: Git clone

**Process**:
1. Complete wizard functionality
2. Run end-to-end tests
3. Update documentation
4. Create GitHub pre-release tag
5. Share with testers via git clone

**Advantages**:
- Fast to deploy
- Easy to iterate
- No packaging overhead
- Direct access to latest code

**Disadvantages**:
- Requires git knowledge
- No versioned packages
- No checksum verification
- Manual installation

**When to Use**:
- Alpha/beta testing
- Internal testing
- Quick feedback cycles
- Pre-production validation

## Production Releases

**Purpose**: Distribute stable, versioned releases to end users

**Spec Location**: `.kiro/specs/release-management/`

**Distribution Method**: Packaged downloads via GitHub Releases

**Process**:
1. Run automated release script
2. Create versioned packages (tar.gz, zip)
3. Generate checksums and signatures
4. Create GitHub release with assets
5. Generate release notes
6. Publish to distribution channels

**Features**:
- Semantic versioning
- Packaged downloads
- Checksum verification
- GPG signatures (optional)
- Automated release notes
- Platform-specific packages
- Security scanning
- Rollback capability

**Advantages**:
- Professional distribution
- Easy for end users
- Verifiable integrity
- Multiple platforms
- Automated process

**Disadvantages**:
- More complex setup
- Longer release cycle
- Requires automation infrastructure

**When to Use**:
- Stable releases
- Public distribution
- Production deployments
- Version milestones

## Comparison

| Feature | Test Release | Production Release |
|---------|-------------|-------------------|
| **Distribution** | Git clone | Packaged downloads |
| **Versioning** | Git tags | Semantic versions |
| **Packaging** | None | tar.gz, zip |
| **Checksums** | No | Yes (SHA256) |
| **Signatures** | No | Yes (GPG optional) |
| **Release Notes** | Manual | Automated |
| **Platforms** | All (source) | Linux, macOS, Windows |
| **Automation** | Minimal | Full |
| **Target Audience** | Testers | End users |
| **Setup Time** | Minutes | Hours (one-time) |
| **Release Time** | Minutes | 10-15 minutes |

## Workflow

### Test Release Workflow

```
Development → Testing → Test Release Tag → Tester Feedback → Iterate
                                                                  ↓
                                                          Production Release
```

### Production Release Workflow

```
Development → Testing → Test Release → Feedback → Fixes → Production Release
                                                                    ↓
                                                            Distribution
                                                                    ↓
                                                              End Users
```

## File Locations

### Test Release Files

```
.kiro/specs/test-release/
├── requirements.md          # (Not created - simple process)
├── design.md               # (Not created - simple process)
└── tasks.md                # Test release tasks

docs/
└── TESTING.md              # Tester instructions (to be created)

.github/
└── ISSUE_TEMPLATE/
    ├── test-feedback.md    # Test feedback template (to be created)
    └── bug-report.md       # Bug report template (to be created)
```

### Production Release Files

```
.kiro/specs/release-management/
├── requirements.md         # ✅ Complete release requirements
├── design.md              # ✅ Complete release design
└── tasks.md               # ✅ Complete implementation tasks

scripts/release/
├── release.sh             # Main release script (to be created)
├── lib/                   # Release modules (to be created)
├── templates/             # Release templates (to be created)
└── config/                # Release configuration (to be created)

docs/
└── RELEASE_PROCESS.md     # Release documentation (to be created)
```

## Current Status

### Test Release
- **Status**: In Progress
- **Completion**: ~50%
- **Next Steps**: Complete wizard steps, testing, documentation
- **Timeline**: 5-7 days

### Production Release
- **Status**: Planned
- **Completion**: 0% (spec complete, implementation pending)
- **Next Steps**: Implement after test release
- **Timeline**: 10-13 days (after test release)

## Decision Tree

**Should I create a test release or production release?**

```
Is this the first public release?
├─ Yes → Start with test release
└─ No → Continue below

Is the software stable and tested?
├─ No → Use test release
└─ Yes → Continue below

Do you need tester feedback?
├─ Yes → Use test release
└─ No → Continue below

Are you ready for public distribution?
├─ Yes → Use production release
└─ No → Use test release
```

## Best Practices

### For Test Releases

1. **Clear Communication**
   - Mark as "test release" or "pre-release"
   - Set expectations with testers
   - Provide clear feedback channels

2. **Documentation**
   - Create TESTING.md with clear instructions
   - List known issues
   - Provide support channels

3. **Feedback Collection**
   - Use GitHub issues
   - Create feedback templates
   - Respond to feedback quickly

4. **Iteration**
   - Fix issues quickly
   - Create new test releases as needed
   - Keep testers informed

### For Production Releases

1. **Quality Assurance**
   - Run all tests
   - Complete security scan
   - Verify all features work

2. **Documentation**
   - Complete release notes
   - Update installation docs
   - Create upgrade guide

3. **Verification**
   - Test installation from packages
   - Verify checksums
   - Test on multiple platforms

4. **Communication**
   - Announce release
   - Highlight key changes
   - Provide support

## Migration Path

**From Test Release to Production Release:**

1. Complete test release cycle
2. Gather and address feedback
3. Fix critical issues
4. Implement release-management spec
5. Create first production release
6. Continue with production releases for stable versions

## Questions?

- **Test Release Questions**: See `.kiro/specs/test-release/tasks.md`
- **Production Release Questions**: See `.kiro/specs/release-management/`
- **General Release Questions**: See `CONTRIBUTING.md` release section

## Related Documentation

- **Test Release Tasks**: `.kiro/specs/test-release/tasks.md`
- **Release Management Requirements**: `.kiro/specs/release-management/requirements.md`
- **Release Management Design**: `.kiro/specs/release-management/design.md`
- **Release Management Tasks**: `.kiro/specs/release-management/tasks.md`
- **Contributing Guide**: `CONTRIBUTING.md`
