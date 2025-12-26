#!/bin/bash

# Kaspa Brand Assets Setup Script
# This script helps organize downloaded brand assets from https://kaspa.org/media-kit/

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🎨 Kaspa Brand Assets Setup"
echo "=============================="
echo ""
echo "Working directory: $SCRIPT_DIR"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p logos/svg logos/png
mkdir -p icons/svg icons/png
mkdir -p wordmarks/svg wordmarks/png

echo -e "${GREEN}✓${NC} Directories created"
echo ""

# Check if user has downloaded files
echo "📥 Download Instructions:"
echo "1. Visit https://kaspa.org/media-kit/"
echo "2. Download the logo pack (ZIP file)"
echo "3. Extract the ZIP file"
echo "4. Place extracted files in this directory (assets/brand/)"
echo ""

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Missing: $1"
        return 1
    fi
}

# Check for common file names from media kit
echo "🔍 Checking for downloaded files..."
echo ""

FOUND_FILES=0

# Check for various possible file names from media kit (with spaces!)
if check_file "Kaspa-LDSP-Dark Full Color.svg" || check_file "Kaspa-LDSP-Dark-Full-Color.svg" || \
   check_file "Kaspa-Logo-Full-Color.svg" || check_file "Kaspa_Logo.svg" || \
   check_file "kaspa-logo.svg" || check_file "logo.svg"; then
    ((FOUND_FILES++))
fi

if check_file "Kaspa-LDSP-White.svg" || check_file "Kaspa-LDSP-Dark-White.svg" || \
   check_file "Kaspa-Logo-White.svg" || check_file "Kaspa_Logo_White.svg" || \
   check_file "kaspa-logo-white.svg" || check_file "logo-white.svg"; then
    ((FOUND_FILES++))
fi

if check_file "Kaspa-Icon-Green on White.svg" || check_file "Kaspa-Icon-Full-Color.svg" || \
   check_file "Kaspa-LDSP-Icon-Full-Color.svg" || check_file "Kaspa_Icon.svg" || \
   check_file "kaspa-icon.svg" || check_file "icon.svg"; then
    ((FOUND_FILES++))
fi

if check_file "Kaspa-Icon-White.svg" || check_file "Kaspa-Icon-Green on Black.svg" || \
   check_file "Kaspa-LDSP-Icon-White.svg" || check_file "Kaspa_Icon_White.svg" || \
   check_file "kaspa-icon-white.svg"; then
    ((FOUND_FILES++))
fi

echo ""

if [ $FOUND_FILES -eq 0 ]; then
    echo -e "${RED}✗${NC} No brand assets found!"
    echo ""
    echo "Please download assets from https://kaspa.org/media-kit/ first."
    echo "Then run this script again."
    exit 1
fi

echo "🔄 Organizing files..."
echo ""

# Function to move and rename file
organize_file() {
    local source=$1
    local dest=$2
    
    if [ -f "$source" ]; then
        mv "$source" "$dest"
        echo -e "${GREEN}✓${NC} Moved: $source → $dest"
        return 0
    fi
    return 1
}

# Organize logo files - trying various possible names from media kit
# Full color logo (for light backgrounds)
organize_file "Kaspa-LDSP-Dark Full Color.svg" "logos/svg/kaspa-logo-light.svg" || \
organize_file "Kaspa-LDSP-Dark-Full-Color.svg" "logos/svg/kaspa-logo-light.svg" || \
organize_file "Kaspa-Logo-Full-Color.svg" "logos/svg/kaspa-logo-light.svg" || \
organize_file "Kaspa_Logo.svg" "logos/svg/kaspa-logo-light.svg" || \
organize_file "kaspa-logo.svg" "logos/svg/kaspa-logo-light.svg" || \
organize_file "logo.svg" "logos/svg/kaspa-logo-light.svg"

# White logo (for dark backgrounds)  
organize_file "Kaspa-LDSP-White.svg" "logos/svg/kaspa-logo-dark.svg" || \
organize_file "Kaspa-LDSP-Dark-White.svg" "logos/svg/kaspa-logo-dark.svg" || \
organize_file "Kaspa-Logo-White.svg" "logos/svg/kaspa-logo-dark.svg" || \
organize_file "Kaspa_Logo_White.svg" "logos/svg/kaspa-logo-dark.svg" || \
organize_file "kaspa-logo-white.svg" "logos/svg/kaspa-logo-dark.svg" || \
organize_file "logo-white.svg" "logos/svg/kaspa-logo-dark.svg"

# Horizontal variants
organize_file "Kaspa-Logo-Horizontal-Full-Color.svg" "logos/svg/kaspa-logo-horizontal-light.svg" || \
organize_file "Kaspa_Logo_Horizontal.svg" "logos/svg/kaspa-logo-horizontal-light.svg" || \
organize_file "kaspa-logo-horizontal.svg" "logos/svg/kaspa-logo-horizontal-light.svg"

organize_file "Kaspa-Logo-Horizontal-White.svg" "logos/svg/kaspa-logo-horizontal-dark.svg" || \
organize_file "Kaspa_Logo_Horizontal_White.svg" "logos/svg/kaspa-logo-horizontal-dark.svg"

# Vertical variants
organize_file "Kaspa-Logo-Vertical-Full-Color.svg" "logos/svg/kaspa-logo-vertical-light.svg" || \
organize_file "Kaspa_Logo_Vertical.svg" "logos/svg/kaspa-logo-vertical-light.svg" || \
organize_file "kaspa-logo-vertical.svg" "logos/svg/kaspa-logo-vertical-light.svg"

organize_file "Kaspa-Logo-Vertical-White.svg" "logos/svg/kaspa-logo-vertical-dark.svg" || \
organize_file "Kaspa_Logo_Vertical_White.svg" "logos/svg/kaspa-logo-vertical-dark.svg"

# Organize icon files - trying various possible names
# Full color icon (for light backgrounds) - using "Green on White" version
organize_file "Kaspa-Icon-Green on White.svg" "icons/svg/kaspa-icon-light.svg" || \
organize_file "Kaspa-Icon-Full-Color.svg" "icons/svg/kaspa-icon-light.svg" || \
organize_file "Kaspa-LDSP-Icon-Full-Color.svg" "icons/svg/kaspa-icon-light.svg" || \
organize_file "Kaspa_Icon.svg" "icons/svg/kaspa-icon-light.svg" || \
organize_file "kaspa-icon.svg" "icons/svg/kaspa-icon-light.svg" || \
organize_file "icon.svg" "icons/svg/kaspa-icon-light.svg"

# White icon (for dark backgrounds)
organize_file "Kaspa-Icon-White.svg" "icons/svg/kaspa-icon-dark.svg" || \
organize_file "Kaspa-Icon-Green on Black.svg" "icons/svg/kaspa-icon-dark.svg" || \
organize_file "Kaspa-LDSP-Icon-White.svg" "icons/svg/kaspa-icon-dark.svg" || \
organize_file "Kaspa_Icon_White.svg" "icons/svg/kaspa-icon-dark.svg" || \
organize_file "kaspa-icon-white.svg" "icons/svg/kaspa-icon-dark.svg" || \
organize_file "icon-white.svg" "icons/svg/kaspa-icon-dark.svg"

# Organize PNG files if present (various sizes)
organize_file "Kaspa-Icon-512.png" "icons/png/kaspa-icon-512.png" || \
organize_file "Kaspa_Icon_512.png" "icons/png/kaspa-icon-512.png" || \
organize_file "kaspa-icon-512.png" "icons/png/kaspa-icon-512.png"

organize_file "Kaspa-Icon-256.png" "icons/png/kaspa-icon-256.png" || \
organize_file "Kaspa_Icon_256.png" "icons/png/kaspa-icon-256.png" || \
organize_file "kaspa-icon-256.png" "icons/png/kaspa-icon-256.png"

organize_file "Kaspa-Icon-128.png" "icons/png/kaspa-icon-128.png" || \
organize_file "Kaspa_Icon_128.png" "icons/png/kaspa-icon-128.png" || \
organize_file "kaspa-icon-128.png" "icons/png/kaspa-icon-128.png"

organize_file "Kaspa-Icon-64.png" "icons/png/kaspa-icon-64.png" || \
organize_file "Kaspa_Icon_64.png" "icons/png/kaspa-icon-64.png" || \
organize_file "kaspa-icon-64.png" "icons/png/kaspa-icon-64.png"

organize_file "Kaspa-Icon-32.png" "icons/png/kaspa-icon-32.png" || \
organize_file "Kaspa_Icon_32.png" "icons/png/kaspa-icon-32.png" || \
organize_file "kaspa-icon-32.png" "icons/png/kaspa-icon-32.png"

organize_file "Kaspa-Icon-16.png" "icons/png/kaspa-icon-16.png" || \
organize_file "Kaspa_Icon_16.png" "icons/png/kaspa-icon-16.png" || \
organize_file "kaspa-icon-16.png" "icons/png/kaspa-icon-16.png"

echo ""
echo "✅ Setup complete!"
echo ""

# Verify essential files
echo "🔍 Verifying essential files..."
echo ""

MISSING=0

if [ ! -f "logos/svg/kaspa-logo-light.svg" ]; then
    echo -e "${RED}✗${NC} Missing: logos/svg/kaspa-logo-light.svg"
    ((MISSING++))
else
    echo -e "${GREEN}✓${NC} Found: logos/svg/kaspa-logo-light.svg"
fi

if [ ! -f "logos/svg/kaspa-logo-dark.svg" ]; then
    echo -e "${YELLOW}⚠${NC} Missing: logos/svg/kaspa-logo-dark.svg (optional for dark mode)"
else
    echo -e "${GREEN}✓${NC} Found: logos/svg/kaspa-logo-dark.svg"
fi

if [ ! -f "icons/svg/kaspa-icon-light.svg" ]; then
    echo -e "${RED}✗${NC} Missing: icons/svg/kaspa-icon-light.svg"
    ((MISSING++))
else
    echo -e "${GREEN}✓${NC} Found: icons/svg/kaspa-icon-light.svg"
fi

if [ ! -f "icons/svg/kaspa-icon-dark.svg" ]; then
    echo -e "${YELLOW}⚠${NC} Missing: icons/svg/kaspa-icon-dark.svg (optional for dark mode)"
else
    echo -e "${GREEN}✓${NC} Found: icons/svg/kaspa-icon-dark.svg"
fi

echo ""

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}🎉 All essential files are in place!${NC}"
    echo ""
    echo "You can now view the wizard with proper branding:"
    echo "  cd ../../.."
    echo "  python3 -m http.server 3000"
    echo "  Open http://localhost:3000"
else
    echo -e "${YELLOW}⚠ Some essential files are missing.${NC}"
    echo "Please download them from https://kaspa.org/media-kit/"
fi

echo ""
echo "📚 For more information, see:"
echo "  - ASSET_ORGANIZATION_GUIDE.md"
echo "  - README.md"
