# Steering File: File Editing Best Practices - Created

## Overview

**Created**: December 3, 2024  
**File**: `.kiro/steering/file-editing-best-practices.md`  
**Purpose**: Provide guidance for future AI sessions on how to reliably edit files

## Why This Was Created

During the implementation of Scenario 5 for the test-release spec, we encountered multiple `strReplace` failures when trying to insert large blocks of content. This steering file documents the lessons learned and provides best practices to prevent similar issues in future sessions.

## What's Included

The steering file covers:

### 1. Understanding strReplace
- How the tool works
- Requirements (exact matching, whitespace sensitivity)
- Common failure causes

### 2. Common Failure Causes
- **Large text blocks**: Matching 30+ lines increases failure risk
- **Whitespace mismatches**: Invisible differences in spaces/tabs/line endings
- **Missing parameters**: Forgetting to provide newStr

### 3. Best Practices by Scenario
- **Large insertions** (100+ lines): Use small anchor points
- **Small edits** (1-10 lines): Include surrounding context
- **Multiple edits**: Make changes sequentially
- **Appending**: Use fsAppend instead of strReplace

### 4. Troubleshooting Guide
- Steps to take when strReplace fails
- How to identify whitespace issues
- When to use alternative approaches

### 5. Real-World Example
- Documents the actual Scenario 5 implementation
- Shows failed approach vs successful approach
- Demonstrates the small anchor point technique

### 6. Quick Reference
- Checklist before using strReplace
- Decision tree for choosing the right tool
- Key takeaways and reminders

## Key Principles Documented

1. **Small is reliable**: Match 4-10 lines, not 30-50 lines
2. **Exact is critical**: Copy text exactly from readFile output
3. **Unique is important**: Choose sections that appear only once
4. **Sequential is safe**: Make one edit at a time
5. **Context helps**: Include surrounding lines for uniqueness

## The Successful Pattern

For large insertions (like adding 500 lines):

```markdown
# Step 1: Find a small, unique anchor point (4-10 lines)
oldStr: "---\n\n## Service Management\n\nDuring testing"

# Step 2: Include original text + new content in newStr
newStr: "---\n\n[NEW 500 LINES]\n\n---\n\n## Service Management\n\nDuring testing"
```

This approach succeeded where matching 30+ lines failed.

## Tool Selection Guide

| Scenario | Tool | Why |
|----------|------|-----|
| Add to end of file | `fsAppend` | Simpler, no matching |
| Small edit (1-10 lines) | `strReplace` | Precise, safe |
| Large insertion (100+ lines) | `strReplace` with small anchor | Reliable |
| Replace entire file | `fsWrite` | Clean slate |
| Multiple edits | Sequential `strReplace` | Builds on previous |

## Impact

This steering file will help future AI sessions:
- ✅ Avoid common strReplace failures
- ✅ Choose the right editing tool for each scenario
- ✅ Troubleshoot editing issues more effectively
- ✅ Complete file editing tasks more reliably

## Location

The file is located at:
```
.kiro/steering/file-editing-best-practices.md
```

This location ensures it will be automatically included in future AI sessions as steering guidance.

## Related Files

- `.kiro/steering/documentation-organization.md` - File organization guidance
- `docs/implementation-summaries/tasks/TASK_2.1_SCENARIO_5_COMPLETE.md` - The task that prompted this guidance

## Notes

The steering file uses the real-world example from Scenario 5 implementation to illustrate the concepts, making it concrete and actionable rather than abstract.

Future sessions will automatically receive this guidance and should have fewer file editing failures as a result.
