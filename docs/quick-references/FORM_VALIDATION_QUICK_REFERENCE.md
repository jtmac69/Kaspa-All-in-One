# Form Validation Quick Reference

Quick reference for the wizard's form validation system.

## Validation Rules

### External IP Address
- **Format**: IPv4 (e.g., 192.168.1.100)
- **Required**: No (optional)
- **Pattern**: `/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/`
- **Error**: "Please enter a valid IPv4 address"

### Database Password
- **Min Length**: 16 characters
- **Required**: Yes (when explorer or prod profiles selected)
- **Error**: "Password must be at least 16 characters long"

### Custom Environment Variables
- **Format**: `KEY=value` (one per line)
- **Key Rules**:
  - Must start with letter or underscore
  - Only uppercase letters, numbers, underscore
- **Required**: No (optional)
- **Error**: "Invalid environment variable format. Use KEY=value format"

## Usage

### Setup Validation
```javascript
import { setupFormValidation } from './modules/configure.js';

// Call when entering configure step
setupFormValidation();
```

### Validate Configuration
```javascript
import { validateConfiguration } from './modules/configure.js';

// Returns true if valid, false if invalid
const isValid = await validateConfiguration();
```

### Manual Field Validation
```javascript
// Trigger validation on a specific field
const field = document.getElementById('external-ip');
field.dispatchEvent(new Event('blur'));
```

## Testing

### Run Automated Tests
```bash
# Start backend
cd services/wizard/backend
npm start

# Run tests (in another terminal)
node services/wizard/backend/test-form-validation.js
```

### Manual Testing
Open `http://localhost:3000/test-form-validation.html` in browser

## API Endpoint

**POST** `/api/config/validate`

**Request**:
```json
{
  "EXTERNAL_IP": "192.168.1.100",
  "POSTGRES_PASSWORD": "securepassword123456"
}
```

**Response**:
```json
{
  "valid": true,
  "config": { ... },
  "errors": []
}
```

## CSS Classes

### Error State
- `.field-error` - Applied to invalid fields
- `.field-error-message` - Error message element

### Example
```html
<input type="text" id="external-ip" class="form-input field-error" />
<div class="field-error-message">Please enter a valid IPv4 address</div>
```

## Common Issues

### Validation Not Working
1. Check if `setupFormValidation()` was called
2. Verify field IDs match validation rules
3. Check browser console for errors

### Server Validation Failing
1. Ensure backend is running on port 3000
2. Check network tab for API errors
3. Verify request payload format

### Navigation Not Blocked
1. Check if validation is called in `nextStep()`
2. Verify validation returns false for invalid data
3. Check console for validation errors

## Files

- **Validation Logic**: `services/wizard/frontend/public/scripts/modules/configure.js`
- **Validation Styles**: `services/wizard/frontend/public/styles/wizard.css`
- **Navigation Integration**: `services/wizard/frontend/public/scripts/modules/navigation.js`
- **Test Suite**: `services/wizard/backend/test-form-validation.js`
- **Manual Tests**: `services/wizard/frontend/test-form-validation.html`

## Related Documentation

- [Form Validation Implementation](../implementation-summaries/wizard/FORM_VALIDATION_IMPLEMENTATION.md)
- [Configuration Loading](../implementation-summaries/wizard/CONFIGURATION_LOADING_IMPLEMENTATION.md)
