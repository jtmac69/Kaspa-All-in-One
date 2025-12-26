#!/bin/bash

# Documentation Cleanup Script
# Helps maintain organized documentation structure

echo "🧹 Documentation Cleanup Script"
echo "================================"

# Check for files in docs/ root that should be moved
echo "📋 Checking for misplaced files in docs/ root..."

MISPLACED_FILES=()

# Check for files that should be in subdirectories
for file in docs/*.md; do
    if [[ -f "$file" ]]; then
        basename_file=$(basename "$file")
        
        # Skip if it's the comprehensive knowledge base (special case)
        if [[ "$basename_file" == "KASPA_ALL_IN_ONE_COMPREHENSIVE_KNOWLEDGE_BASE.md" ]]; then
            continue
        fi
        
        # All other .md files in docs/ root should be moved
        MISPLACED_FILES+=("$file")
    fi
done

if [[ ${#MISPLACED_FILES[@]} -gt 0 ]]; then
    echo "⚠️  Found ${#MISPLACED_FILES[@]} files that should be moved:"
    for file in "${MISPLACED_FILES[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "💡 Consider moving these files to appropriate subdirectories:"
    echo "   - docs/guides/ (user guides, troubleshooting)"
    echo "   - docs/architecture/ (system design, dependencies)"
    echo "   - docs/testing/ (testing documentation)"
    echo "   - docs/release/ (release-related files)"
    echo "   - docs/meta/ (documentation about documentation)"
else
    echo "✅ No misplaced files found in docs/ root"
fi

# Check for empty files
echo ""
echo "📋 Checking for empty files..."
EMPTY_FILES=$(find docs/ -name "*.md" -size 0 2>/dev/null)

if [[ -n "$EMPTY_FILES" ]]; then
    echo "⚠️  Found empty files:"
    echo "$EMPTY_FILES"
    echo ""
    echo "💡 Consider deleting these empty placeholder files"
else
    echo "✅ No empty files found"
fi

# Check uncategorized directory
echo ""
echo "📋 Checking uncategorized directory..."
if [[ -d "docs/uncategorized" ]]; then
    UNCATEGORIZED_COUNT=$(find docs/uncategorized -name "*.md" | wc -l)
    if [[ $UNCATEGORIZED_COUNT -gt 0 ]]; then
        echo "⚠️  Found $UNCATEGORIZED_COUNT files in docs/uncategorized/"
        echo "💡 These files need proper categorization"
    else
        echo "✅ No files in uncategorized directory"
    fi
else
    echo "✅ No uncategorized directory found"
fi

# Show current organization
echo ""
echo "📊 Current documentation organization:"
echo "======================================"

for dir in docs/*/; do
    if [[ -d "$dir" ]]; then
        dir_name=$(basename "$dir")
        file_count=$(find "$dir" -name "*.md" | wc -l)
        echo "📁 $dir_name: $file_count files"
    fi
done

echo ""
echo "🎯 Cleanup complete! Review suggestions above."