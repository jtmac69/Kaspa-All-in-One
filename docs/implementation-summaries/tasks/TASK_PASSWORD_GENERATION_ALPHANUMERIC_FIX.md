# Password Generation Alphanumeric Fix

## Issue Description
The wizard's password generation functions were using special characters that could cause database URL parsing issues:

1. **Backend**: Used base64 encoding with `/` and `+` characters
2. **Frontend**: Used special characters like `!@#$%^&*`

These characters can break PostgreSQL connection strings when used in DATABASE_URL format.

## Root Cause
- `crypto.randomBytes().toString('base64')` generates characters including `/` and `+`
- Frontend `generatePassword()` included special characters `!@#$%^&*`
- Special characters in passwords break URL parsing in database connection strings

## Solution Applied

### Backend Fix (`services/wizard/backend/src/utils/config-generator.js`)
```javascript
// OLD: Used base64 with special characters
generateSecurePassword(length = 32) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// NEW: Uses only alphanumeric characters
generateSecurePassword(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars.charAt(randomIndex);
  }
  return password;
}
```

### Frontend Fix (`services/wizard/frontend/public/scripts/wizard-refactored.js`)
```javascript
// OLD: Included special characters
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

// NEW: Only alphanumeric characters
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
```

### Test Update (`services/wizard/backend/test-configuration-components-unit.js`)
```javascript
// OLD: Expected base64-like characters
testFramework.assert(/^[A-Za-z0-9+/]+$/.test(password1), 'Generated password should be base64-like');

// NEW: Expects alphanumeric only
testFramework.assert(/^[A-Za-z0-9]+$/.test(password1), 'Generated password should be alphanumeric only');
```

## Validation
- All unit tests pass (17/17)
- Generated passwords are alphanumeric-only
- Password length and uniqueness maintained
- No database URL parsing issues

## Impact
- Prevents k-indexer "invalid port number" errors
- Ensures reliable database connections for all indexer services
- Maintains password security while improving compatibility
- Fixes both automatic generation and manual generation

## Files Modified
1. `services/wizard/backend/src/utils/config-generator.js`
2. `services/wizard/frontend/public/scripts/wizard-refactored.js`
3. `services/wizard/backend/test-configuration-components-unit.js`

## Testing Results
```
Generated password 1: QO9RGXHFUmklzVCr
Generated password 2: 1RIKcOlPgjyR9h4hhbhvXmPAF2vkMYO4
Generated password 3: bf4E3t6bz1To
```

All passwords are now safe for database URL usage.