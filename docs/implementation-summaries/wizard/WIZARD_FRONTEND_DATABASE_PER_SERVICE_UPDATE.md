# Wizard Frontend Database-Per-Service Architecture Update

## Overview

Updated the Installation Wizard **frontend** to display and handle the new Database-Per-Service Architecture with separate database password fields and service verification for both databases.

## Problem Statement

The wizard frontend was still showing:
- ❌ Only 1 "Database Password" field
- ❌ Service verification showing only 4 services (missing 2nd database)
- ❌ Configuration validation errors for new password fields
- ❌ Review screen showing old service list

## Solution Implemented

### 1. HTML Template Updated (`index.html`)

**Old Configuration Form:**
```html
<div class="form-group">
    <label for="db-password">Database Password</label>
    <input type="password" id="db-password" />
    <button onclick="generatePassword('db-password')">Generate</button>
</div>
```

**New Configuration Form:**
```html
<div class="form-group">
    <label for="k-social-db-password">K-Social Database Password</label>
    <input type="password" id="k-social-db-password" />
    <button onclick="generatePassword('k-social-db-password')">Generate</button>
</div>
<div class="form-group">
    <label for="simply-kaspa-db-password">Simply Kaspa Database Password</label>
    <input type="password" id="simply-kaspa-db-password" />
    <button onclick="generatePassword('simply-kaspa-db-password')">Generate</button>
</div>
```

### 2. Configuration Module Updated (`configure.js`)

**Changes Made:**

#### A. Field Population
```javascript
// OLD: Single database password
const dbPasswordInput = document.getElementById('db-password');
if (dbPasswordInput && config.POSTGRES_PASSWORD) {
    dbPasswordInput.value = config.POSTGRES_PASSWORD;
}

// NEW: Two separate database passwords
const kSocialDbPasswordInput = document.getElementById('k-social-db-password');
if (kSocialDbPasswordInput && config.K_SOCIAL_DB_PASSWORD) {
    kSocialDbPasswordInput.value = config.K_SOCIAL_DB_PASSWORD;
}

const simplyKaspaDbPasswordInput = document.getElementById('simply-kaspa-db-password');
if (simplyKaspaDbPasswordInput && config.SIMPLY_KASPA_DB_PASSWORD) {
    simplyKaspaDbPasswordInput.value = config.SIMPLY_KASPA_DB_PASSWORD;
}
```

#### B. Validation Rules
```javascript
// OLD: Single password validation
'db-password': {
    minLength: 16,
    message: 'Password must be at least 16 characters long',
    required: false
}

// NEW: Two password validations
'k-social-db-password': {
    minLength: 12,
    message: 'Password must be at least 12 characters long',
    required: false
},
'simply-kaspa-db-password': {
    minLength: 12,
    message: 'Password must be at least 12 characters long',
    required: false
}
```

#### C. Required Field Validation
```javascript
// OLD: Check single password
if (needsDatabase) {
    const dbPasswordField = document.getElementById('db-password');
    if (!dbPasswordField.value) {
        isValid = false;
        showFieldError('db-password', 'Database password is required');
    }
}

// NEW: Check both passwords
if (needsDatabase) {
    const kSocialDbPasswordField = document.getElementById('k-social-db-password');
    if (!kSocialDbPasswordField.value) {
        isValid = false;
        showFieldError('k-social-db-password', 'K-Social Database Password is required');
    }
    
    const simplyKaspaDbPasswordField = document.getElementById('simply-kaspa-db-password');
    if (!simplyKaspaDbPasswordField.value) {
        isValid = false;
        showFieldError('simply-kaspa-db-password', 'Simply Kaspa Database Password is required');
    }
}
```

#### D. Configuration Gathering
```javascript
// OLD: Gather single password
const dbPasswordInput = document.getElementById('db-password');
if (dbPasswordInput && dbPasswordInput.value) {
    config.POSTGRES_PASSWORD = dbPasswordInput.value;
}

// NEW: Gather both passwords
const kSocialDbPasswordInput = document.getElementById('k-social-db-password');
if (kSocialDbPasswordInput && kSocialDbPasswordInput.value) {
    config.K_SOCIAL_DB_PASSWORD = kSocialDbPasswordInput.value;
}

const simplyKaspaDbPasswordInput = document.getElementById('simply-kaspa-db-password');
if (simplyKaspaDbPasswordInput && simplyKaspaDbPasswordInput.value) {
    config.SIMPLY_KASPA_DB_PASSWORD = simplyKaspaDbPasswordInput.value;
}
```

### 3. Review Module Updated (`review.js`)

**Old Service List:**
```javascript
services: ['timescaledb', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']
```

**New Service List:**
```javascript
services: ['k-social-db', 'simply-kaspa-db', 'kasia-indexer', 'k-indexer', 'simply-kaspa-indexer']
```

### 4. Complete Module (No Changes Needed)

The `complete.js` module dynamically displays services from the backend response, so it automatically shows the correct services without code changes:
- ✅ Dynamically formats service names
- ✅ No hardcoded service lists
- ✅ Will automatically display `k-social-db` and `simply-kaspa-db`

## Expected Results

### Step 5: Configuration Screen
**Before:**
- ❌ 1 "Database Password" field
- ❌ Validation errors for missing fields

**After:**
- ✅ "K-Social Database Password" field with Generate button
- ✅ "Simply Kaspa Database Password" field with Generate button
- ✅ Both fields show validation errors if empty
- ✅ Both fields support password visibility toggle
- ✅ Both fields support auto-generation

### Step 6: Review Screen
**Before:**
- ❌ Shows 4 services: timescaledb, kasia-indexer, k-indexer, simply-kaspa-indexer

**After:**
- ✅ Shows 5 services: k-social-db, simply-kaspa-db, kasia-indexer, k-indexer, simply-kaspa-indexer

### Step 7: Installation Progress
- ✅ Shows progress for both database containers
- ✅ Displays "Pulling timescale/timescaledb:latest-pg16" (used by both)
- ✅ Shows "Starting k-social-db..."
- ✅ Shows "Starting simply-kaspa-db..."

### Step 8: Service Verification
**Before:**
- ❌ Shows 4 services
- ❌ Shows "Indexer Db"

**After:**
- ✅ Shows 5 services
- ✅ Shows "K Social Db" (formatted from k-social-db)
- ✅ Shows "Simply Kaspa Db" (formatted from simply-kaspa-db)
- ✅ Shows "Kasia Indexer"
- ✅ Shows "K Indexer"
- ✅ Shows "Simply Kaspa Indexer"

## User Experience Improvements

### Clear Separation
- Users now see two distinct database password fields
- Clear labels indicate which database each password is for
- Tooltips explain the purpose of each database

### Independent Password Generation
- Each database can have its own generated password
- Users can generate passwords independently
- Password visibility can be toggled per field

### Better Understanding
- Review screen shows 5 services instead of 4
- Service names clearly indicate separate databases
- Architecture is more transparent to users

## Files Modified

### Frontend Files
- `services/wizard/frontend/public/index.html` - Added 2nd password field
- `services/wizard/frontend/public/scripts/modules/configure.js` - Updated field handling
- `services/wizard/frontend/public/scripts/modules/review.js` - Updated service list

### Backend Files (Already Updated)
- `services/wizard/backend/src/config/configuration-fields.js`
- `services/wizard/backend/src/utils/docker-manager.js`
- `services/wizard/backend/src/utils/service-validator.js`
- `services/wizard/backend/src/utils/config-generator.js`
- `services/wizard/backend/src/api/reconfigure.js`

## Testing Checklist

### Configuration Screen (Step 5)
- [ ] Two password fields are visible
- [ ] Both fields show "Auto-generated" placeholder
- [ ] Generate button works for both fields
- [ ] Password visibility toggle works for both fields
- [ ] Validation shows errors if fields are empty
- [ ] Validation accepts passwords >= 12 characters

### Review Screen (Step 6)
- [ ] Shows 5 services in the list
- [ ] Service names include both databases
- [ ] Resource estimates are accurate

### Installation (Step 7)
- [ ] Progress shows both database containers starting
- [ ] No errors during database initialization
- [ ] Both databases reach healthy status

### Service Verification (Step 8)
- [ ] Shows 5 services with status
- [ ] Both databases show "Running" status
- [ ] Service names are properly formatted
- [ ] All services show green checkmarks

## Implementation Status

- ✅ **HTML Template**: Updated with 2 password fields
- ✅ **Configuration Module**: Updated field handling and validation
- ✅ **Review Module**: Updated service list
- ✅ **Complete Module**: No changes needed (dynamic)
- ✅ **Backend Integration**: Already updated in previous step
- ⏳ **Testing**: Requires rebuild and fresh installation test

## Next Steps

1. **Rebuild Test Release Package** - Include all wizard updates
2. **Test Configuration Screen** - Verify 2 password fields appear
3. **Test Password Generation** - Ensure both fields can generate passwords
4. **Test Installation** - Verify 5 containers are created
5. **Test Service Verification** - Confirm all 5 services are shown

The wizard frontend is now fully synchronized with the Database-Per-Service Architecture! 🚀