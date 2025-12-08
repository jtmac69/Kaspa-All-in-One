# File Editing Best Practices

## Purpose
This steering rule provides guidance on how to reliably edit files, especially when dealing with large insertions or modifications. Following these practices prevents common editing failures and ensures successful file updates.

## The strReplace Tool

### How It Works
The `strReplace` tool requires:
1. **Exact matching**: The `oldStr` parameter must match the file content EXACTLY
2. **Complete replacement**: Both `oldStr` and `newStr` parameters are required
3. **Whitespace sensitivity**: Every space, tab, and line ending must match perfectly

### Common Failure Causes

#### 1. Large Text Blocks
**Problem**: Trying to match 30+ lines of text increases the chance of mismatch
```markdown
❌ BAD: Matching 50 lines of text
oldStr: "#### Next Steps\n\n- Want to test more?...[45 more lines]...Thank you!"
```

**Solution**: Use small, precise anchor points (4-10 lines)
```markdown
✅ GOOD: Matching 4 lines of text
oldStr: "#### Next Steps\n\n- Want to test more? Try Scenario 5\n- Found a bug?"
```

#### 2. Whitespace Mismatches
**Problem**: Invisible differences in spaces, tabs, or line endings
```markdown
❌ BAD: Assuming whitespace
oldStr: "Hello  World"  # Two spaces
File:   "Hello World"   # One space - NO MATCH!
```

**Solution**: Copy exact text from file using readFile
```markdown
✅ GOOD: Use exact text from readFile output
1. Read the file section with readFile
2. Copy the EXACT text including all whitespace
3. Use that as oldStr
```

#### 3. Missing newStr Parameter
**Problem**: Forgetting to provide the replacement text
```markdown
❌ BAD: Only providing oldStr
strReplace(path="file.md", oldStr="old text")
# Error: missing newStr parameter
```

**Solution**: Always provide both parameters
```markdown
✅ GOOD: Provide both oldStr and newStr
strReplace(
  path="file.md",
  oldStr="old text",
  newStr="new text"
)
```

## Best Practices for Different Scenarios

### Scenario 1: Large Insertions (Adding 100+ lines)

**Approach**: Find a small, unique anchor point near the insertion location

**Steps**:
1. Use `readFile` to find a unique 4-10 line section near where you want to insert
2. Use `strReplace` with that small section as `oldStr`
3. Include the original text PLUS your new content in `newStr`

**Example**:
```markdown
# Want to add 500 lines after "## Section Title"

# Step 1: Find small anchor
readFile to get:
"## Section Title\n\nSome intro text\nMore text\n\n## Next Section"

# Step 2: Use small anchor (just 2 lines)
oldStr: "## Section Title\n\nSome intro text"
newStr: "## Section Title\n\nSome intro text\n\n[YOUR 500 NEW LINES HERE]"
```

### Scenario 2: Small Edits (Changing a few words)

**Approach**: Include surrounding context for uniqueness

**Steps**:
1. Include 2-3 lines before and after the change
2. Make the change in the middle
3. Ensure the section is unique in the file

**Example**:
```markdown
# Want to change "coming soon" to a link

oldStr: "- Want to test more? Try Scenario 5 (coming soon)\n- Found a bug?"
newStr: "- Want to test more? Try [Scenario 5](#scenario-5)\n- Found a bug?"
```

### Scenario 3: Multiple Edits in Same File

**Approach**: Make edits sequentially, not in parallel

**Steps**:
1. Make first edit with `strReplace`
2. Make second edit with `strReplace` (using updated file content)
3. Continue sequentially

**Why**: Each edit changes the file, so subsequent edits must use the NEW content

### Scenario 4: Appending to End of File

**Approach**: Use `fsAppend` instead of `strReplace`

**When to use**:
- Adding content to the end of a file
- No need to modify existing content
- Simpler and more reliable than strReplace

**Example**:
```markdown
✅ GOOD: Use fsAppend for end-of-file additions
fsAppend(path="file.md", text="\n\n## New Section\n\nNew content here")
```

## Troubleshooting Failed Edits

### If strReplace Fails

1. **Read the exact section again**:
   ```bash
   readFile(path="file.md", start_line=X, end_line=Y)
   ```

2. **Check for whitespace differences**:
   - Look for extra spaces at line ends
   - Check for tabs vs spaces
   - Verify line ending characters

3. **Reduce the oldStr size**:
   - Try matching fewer lines
   - Find a more unique section
   - Include distinctive text patterns

4. **Use grepSearch to find unique text**:
   ```bash
   grepSearch(query="unique phrase", includePattern="file.md")
   ```

5. **Consider alternative approaches**:
   - Can you use `fsAppend` instead?
   - Can you split into multiple smaller edits?
   - Can you rewrite the entire section?

## Common Patterns That Work Well

### Pattern 1: Anchor on Section Headers
```markdown
✅ GOOD: Section headers are usually unique
oldStr: "## Service Management\n\nDuring testing, you may need"
newStr: "## Service Management\n\n[NEW CONTENT]\n\nDuring testing, you may need"
```

### Pattern 2: Anchor on Distinctive Lists
```markdown
✅ GOOD: Lists with specific items
oldStr: "- **Want to test more?** Try Scenario 5\n- **Found a critical bug?**"
newStr: "- **Want to test more?** Try [Scenario 5](#link)\n- **Found a critical bug?**"
```

### Pattern 3: Anchor on Unique Phrases
```markdown
✅ GOOD: Unique phrases that appear once
oldStr: "Thank you for testing!\n\n---\n\n## Service Management"
newStr: "Thank you for testing!\n\n---\n\n[NEW SECTION]\n\n---\n\n## Service Management"
```

## When to Use Each Tool

| Scenario | Tool to Use | Why |
|----------|-------------|-----|
| Add to end of file | `fsAppend` | Simpler, no matching needed |
| Small edit (1-10 lines) | `strReplace` with context | Precise, safe |
| Large insertion (100+ lines) | `strReplace` with small anchor | Reliable with small anchor |
| Replace entire file | `fsWrite` | Clean slate approach |
| Multiple small edits | Sequential `strReplace` calls | Each edit builds on previous |

## Real-World Example: Adding Scenario 5

**Task**: Add 500 lines of "Scenario 5" content to TESTING.md

**❌ Failed Approach**:
```markdown
# Tried to match 30 lines
oldStr: "#### Next Steps\n\n- Want to test more?...[28 more lines]...Thank you!"
newStr: "#### Next Steps\n\n- Want to test more?...[528 lines total]"
# Result: Failed - whitespace mismatch in the 30 lines
```

**✅ Successful Approach**:
```markdown
# Step 1: Found small unique anchor (4 lines)
oldStr: "- **Want to test more?** Try Scenario 5 (coming soon)\n- **Found a critical bug?**\n- **Short on time?**\n- **Want to test normal scenarios?**"

# Step 2: Replaced with link
newStr: "- **Want to test more?** Try [Scenario 5](#scenario-5)\n- **Found a critical bug?**\n- **Short on time?**\n- **Want to test normal scenarios?**"

# Step 3: Found another small anchor (3 lines) before target section
oldStr: "---\n\n## Service Management\n\nDuring testing, you may need"

# Step 4: Inserted 500 lines before that anchor
newStr: "---\n\n### Scenario 5: Reconfiguration\n\n[500 lines of content]\n\n---\n\n## Service Management\n\nDuring testing, you may need"

# Result: Success! Both edits worked perfectly
```

## Key Takeaways

1. **Small is reliable**: Match 4-10 lines, not 30-50 lines
2. **Exact is critical**: Copy text exactly from readFile output
3. **Unique is important**: Choose sections that appear only once
4. **Sequential is safe**: Make one edit at a time
5. **Context helps**: Include surrounding lines for uniqueness
6. **Test first**: Read the section before attempting to replace it
7. **Have alternatives**: Know when to use fsAppend or fsWrite instead

## Quick Reference

**Before using strReplace, ask yourself**:
- [ ] Is my `oldStr` less than 10 lines? (Smaller is better)
- [ ] Did I copy the exact text from `readFile`? (No assumptions)
- [ ] Is this section unique in the file? (Use grepSearch to verify)
- [ ] Do I have both `oldStr` and `newStr`? (Both required)
- [ ] Could I use `fsAppend` instead? (Simpler for end-of-file)

**If strReplace fails**:
1. Read the section again with `readFile`
2. Reduce the size of `oldStr`
3. Check for whitespace differences
4. Try a different anchor point
5. Consider using `fsAppend` or sequential smaller edits

## Remember

> "The smaller and more precise your anchor point, the more likely your edit will succeed."

> "When in doubt, read the file again to get the exact text."

> "Sequential small edits are more reliable than one large edit."
