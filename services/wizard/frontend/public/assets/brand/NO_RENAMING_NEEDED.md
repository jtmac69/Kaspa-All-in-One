# No Manual Renaming Needed! 🎉

## ✅ Just Download and Run the Script

**You do NOT need to rename files manually!**

The `setup-assets.sh` script automatically detects and renames files from the Kaspa media kit, regardless of their original names.

## 📥 Simple Process

### Step 1: Download
Visit https://kaspa.org/media-kit/ and download the logo pack

### Step 2: Extract
Extract the ZIP file - you'll get files with names like:
- `Kaspa-LDSP-Dark-Full-Color.svg`
- `Kaspa-LDSP-Dark-White.svg`
- `Kaspa-Icon-Full-Color.svg`
- `Kaspa-Icon-White.svg`
- etc.

### Step 3: Place Files
Move ALL the extracted files into this folder (`assets/brand/`)

```bash
# Just copy everything here - don't rename anything!
cp ~/Downloads/kaspa-media-kit/* .
```

### Step 4: Run Script
```bash
./setup-assets.sh
```

**That's it!** The script will:
- ✅ Detect the actual file names from the media kit
- ✅ Automatically rename them to the correct format
- ✅ Move them to the correct folders
- ✅ Verify everything is in place

## 🔍 What the Script Handles

The script recognizes these file name patterns from the media kit:

### Logos
- `Kaspa-LDSP-Dark-Full-Color.svg` → `logos/svg/kaspa-logo-light.svg`
- `Kaspa-LDSP-Dark-White.svg` → `logos/svg/kaspa-logo-dark.svg`
- `Kaspa-Logo-Full-Color.svg` → `logos/svg/kaspa-logo-light.svg`
- `Kaspa-Logo-White.svg` → `logos/svg/kaspa-logo-dark.svg`
- And many other variations...

### Icons
- `Kaspa-Icon-Full-Color.svg` → `icons/svg/kaspa-icon-light.svg`
- `Kaspa-Icon-White.svg` → `icons/svg/kaspa-icon-dark.svg`
- `Kaspa-LDSP-Icon-Full-Color.svg` → `icons/svg/kaspa-icon-light.svg`
- `Kaspa-LDSP-Icon-White.svg` → `icons/svg/kaspa-icon-dark.svg`
- And other variations...

### PNG Icons
- `Kaspa-Icon-512.png` → `icons/png/kaspa-icon-512.png`
- `Kaspa-Icon-256.png` → `icons/png/kaspa-icon-256.png`
- `Kaspa-Icon-32.png` → `icons/png/kaspa-icon-32.png`
- `Kaspa-Icon-16.png` → `icons/png/kaspa-icon-16.png`
- etc.

## 💡 Example Workflow

```bash
# 1. Download from media kit
# (Downloads to ~/Downloads/kaspa-media-kit/)

# 2. Navigate to brand assets folder
cd services/wizard/frontend/public/assets/brand

# 3. Copy all files here (no renaming!)
cp ~/Downloads/kaspa-media-kit/*.svg .
cp ~/Downloads/kaspa-media-kit/*.png .

# 4. Run the setup script
./setup-assets.sh

# Output:
# 🎨 Kaspa Brand Assets Setup
# ==============================
# 
# 📁 Creating directory structure...
# ✓ Directories created
# 
# 🔍 Checking for downloaded files...
# ✓ Found: Kaspa-LDSP-Dark-Full-Color.svg
# ✓ Found: Kaspa-LDSP-Dark-White.svg
# ✓ Found: Kaspa-Icon-Full-Color.svg
# 
# 🔄 Organizing files...
# ✓ Moved: Kaspa-LDSP-Dark-Full-Color.svg → logos/svg/kaspa-logo-light.svg
# ✓ Moved: Kaspa-LDSP-Dark-White.svg → logos/svg/kaspa-logo-dark.svg
# ✓ Moved: Kaspa-Icon-Full-Color.svg → icons/svg/kaspa-icon-light.svg
# ✓ Moved: Kaspa-Icon-White.svg → icons/svg/kaspa-icon-dark.svg
# 
# ✅ Setup complete!
# 
# 🔍 Verifying essential files...
# ✓ Found: logos/svg/kaspa-logo-light.svg
# ✓ Found: logos/svg/kaspa-logo-dark.svg
# ✓ Found: icons/svg/kaspa-icon-light.svg
# ✓ Found: icons/svg/kaspa-icon-dark.svg
# 
# 🎉 All essential files are in place!
```

## 🎯 Key Points

1. **Don't rename manually** - The script does it for you
2. **Just download and extract** - Keep original file names
3. **Copy everything to brand/ folder** - All files at once
4. **Run ./setup-assets.sh** - Automatic organization
5. **Done!** - Files are renamed and organized correctly

## ❓ What If File Names Are Different?

The script tries multiple name patterns. If your files have different names:

1. Run the script anyway - it might still detect them
2. If not detected, the script will tell you which files are missing
3. You can then manually rename just those files, or
4. Update the script to include your specific file names

## 🔧 Manual Fallback

If the script doesn't detect your files, you can manually place them:

```bash
# Only if automatic detection fails:
mv YourFileName.svg logos/svg/kaspa-logo-light.svg
mv YourOtherFile.svg logos/svg/kaspa-logo-dark.svg
# etc.
```

But try the script first - it handles most variations!

## 📚 More Info

- **ASSET_ORGANIZATION_GUIDE.md** - Complete organization guide
- **QUICK_REFERENCE.md** - Quick reference
- **setup-assets.sh** - The automated script (view source to see all patterns)

---

**TL;DR: Download, extract, copy to brand/ folder, run `./setup-assets.sh` - no manual renaming needed! 🚀**
